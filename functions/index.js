const crypto = require("node:crypto");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");
const { defineSecret, defineString } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const PRODUCTS = require("./catalog");

admin.initializeApp();
setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

const db = admin.firestore();
const RAZORPAY_KEY_ID = defineString("RAZORPAY_KEY_ID");
const SHOP_EMAIL = defineString("SHOP_EMAIL");
const SHOP_WHATSAPP = defineString("SHOP_WHATSAPP");
const RESEND_FROM_EMAIL = defineString("RESEND_FROM_EMAIL");
const WHATSAPP_PHONE_NUMBER_ID = defineString("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_TEMPLATE_NAME = defineString("WHATSAPP_TEMPLATE_NAME", {
  default: "order_payment_confirmed"
});
const WHATSAPP_TEMPLATE_LANGUAGE = defineString("WHATSAPP_TEMPLATE_LANGUAGE", {
  default: "en_US"
});
const WHATSAPP_GRAPH_API_VERSION = defineString("WHATSAPP_GRAPH_API_VERSION", {
  default: "v23.0"
});
const PUBLIC_SITE_ORIGINS = defineString("PUBLIC_SITE_ORIGINS");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const WHATSAPP_ACCESS_TOKEN = defineSecret("WHATSAPP_ACCESS_TOKEN");

function applyCors(request, response) {
  const allowedOrigins = PUBLIC_SITE_ORIGINS.value()
    .split(",")
    .map(function (origin) {
      return origin.trim();
    })
    .filter(Boolean);
  const origin = request.get("origin");

  if (!allowedOrigins.length) {
    response.status(503).json({ error: "Payment API allowed origins are not configured." });
    return false;
  }
  if (origin && !allowedOrigins.includes(origin)) {
    response.status(403).json({ error: "This website is not allowed to use the payment API." });
    return false;
  }
  if (origin) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
  }
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.set("Access-Control-Max-Age", "3600");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return false;
  }
  if (request.method !== "POST") {
    response.status(405).json({ error: "Only POST requests are supported." });
    return false;
  }
  return true;
}

async function requireUser(request) {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw Object.assign(new Error("Missing Firebase authentication token."), {
      statusCode: 401,
      publicMessage: "Please sign in again to view your orders."
    });
  }
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    throw Object.assign(new Error("Invalid Firebase authentication token.", { cause: error }), {
      statusCode: 401,
      publicMessage: "Your session has expired. Please sign in again."
    });
  }
}

function sendFailure(response, error, message) {
  console.error(message, error);
  response.status(error.statusCode || 500).json({
    error: error.publicMessage || "We couldn’t complete the payment request. Please try again."
  });
}

function cleanCustomer(input) {
  const customer = input && typeof input === "object" ? input : {};
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string"
    ? customer.email.trim().toLowerCase()
    : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const digits = phone.replace(/\D/g, "");
  const rawAddress = customer.address && typeof customer.address === "object"
    ? customer.address
    : {};
  const address = {
    label: typeof rawAddress.label === "string" ? rawAddress.label.trim() : "Delivery",
    addressLine1: typeof rawAddress.addressLine1 === "string" ? rawAddress.addressLine1.trim() : "",
    addressLine2: typeof rawAddress.addressLine2 === "string" ? rawAddress.addressLine2.trim() : "",
    city: typeof rawAddress.city === "string" ? rawAddress.city.trim() : "",
    state: typeof rawAddress.state === "string" ? rawAddress.state.trim() : "",
    postalCode: typeof rawAddress.postalCode === "string" ? rawAddress.postalCode.trim() : "",
    country: typeof rawAddress.country === "string" ? rawAddress.country.trim() : ""
  };

  if (customer.notificationConsent !== true) {
    throw Object.assign(new Error("Customer did not consent to order notifications."), {
      statusCode: 400,
      publicMessage: "Please agree to receive order updates by email and WhatsApp."
    });
  }
  if (!name || name.length > 100) {
    throw Object.assign(new Error("A valid customer name is required."), {
      statusCode: 400,
      publicMessage: "Enter your name to continue."
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw Object.assign(new Error("A valid customer email is required."), {
      statusCode: 400,
      publicMessage: "Enter a valid email address."
    });
  }
  if (
    !/^[+0-9()\s-]{8,20}$/.test(phone) ||
    !phone.startsWith("+") ||
    digits.length < 8 ||
    digits.length > 15
  ) {
    throw Object.assign(new Error("A valid customer WhatsApp number is required."), {
      statusCode: 400,
      publicMessage: "Enter a valid WhatsApp number including its country code."
    });
  }
  if (
    !address.label ||
    address.label.length > 40 ||
    !address.addressLine1 ||
    address.addressLine1.length > 120 ||
    address.addressLine2.length > 120 ||
    !address.city ||
    address.city.length > 80 ||
    !address.state ||
    address.state.length > 80 ||
    !/^[A-Za-z0-9 -]{3,12}$/.test(address.postalCode) ||
    !address.country ||
    address.country.length > 60
  ) {
    throw Object.assign(new Error("A valid delivery address is required."), {
      statusCode: 400,
      publicMessage: "Enter a complete delivery address to continue."
    });
  }
  return { name: name, email: email, phone: `+${digits}`, address: address };
}

function buildOrderItems(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > PRODUCTS.length) {
    throw Object.assign(new Error("Cart items are invalid."), {
      statusCode: 400,
      publicMessage: "Your cart is empty or invalid. Return to the shop and try again."
    });
  }

  const unique = new Set();
  return input.map(function (item) {
    const productIndex = Number(item && item.productIndex);
    const quantity = Number(item && item.quantity);
    const product = PRODUCTS[productIndex];
    if (
      !Number.isInteger(productIndex) ||
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      unique.has(productIndex)
    ) {
      throw Object.assign(new Error("Cart contains invalid products or quantities."), {
        statusCode: 400,
        publicMessage: "Your cart has an invalid item. Return to the shop and try again."
      });
    }
    unique.add(productIndex);
    return {
      productIndex: product.productIndex,
      name: product.name,
      category: product.category,
      quantity: quantity,
      unitPricePaise: product.unitPricePaise,
      lineTotalPaise: product.unitPricePaise * quantity
    };
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function equalHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" ||
      !/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireConfirmationToken(order, token) {
  if (typeof token !== "string" || !equalHex(hashToken(token), order.confirmationTokenHash)) {
    throw Object.assign(new Error("Invalid confirmation token."), {
      statusCode: 403,
      publicMessage: "We couldn’t verify access to this order."
    });
  }
}

function formatAmount(amountPaise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amountPaise / 100);
}

async function setOrderPaid(orderId, payment) {
  const ref = db.collection("orders").doc(orderId);
  await db.runTransaction(async function (transaction) {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new Error("Verified payment has no matching store order.");
    }
    const order = snapshot.data();
    if (
      payment.order_id !== order.razorpayOrderId ||
      payment.amount !== order.totalPaise ||
      payment.currency !== "INR"
    ) {
      throw new Error("Verified payment does not match the stored order.");
    }
    if (order.status === "paid") {
      if (order.razorpayPaymentId !== payment.id) {
        throw new Error("A different payment is already recorded for this order.");
      }
      return;
    }
    transaction.update(ref, {
      status: "paid",
      razorpayPaymentId: payment.id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      notifications: {
        customerEmail: "pending",
        shopEmail: "pending",
        customerWhatsApp: "pending",
        shopWhatsApp: "pending"
      }
    });
  });
}

exports.createPaymentOrder = onRequest(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async function (request, response) {
    if (!applyCors(request, response)) {
      return;
    }
    try {
      const user = await requireUser(request);
      const customer = cleanCustomer(request.body && request.body.customer);
      const items = buildOrderItems(request.body && request.body.items);
      const totalPaise = items.reduce(function (total, item) {
        return total + item.lineTotalPaise;
      }, 0);
      if (totalPaise <= 0 || totalPaise > 100000000) {
        throw Object.assign(new Error("Order amount is outside supported limits."), {
          statusCode: 400,
          publicMessage: "This order total can’t be processed online."
        });
      }

      const orderRef = db.collection("orders").doc();
      const confirmationToken = crypto.randomBytes(32).toString("hex");
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID.value(),
        key_secret: RAZORPAY_KEY_SECRET.value()
      });
      const razorpayOrder = await razorpay.orders.create({
        amount: totalPaise,
        currency: "INR",
        receipt: orderRef.id,
        notes: { storeOrderId: orderRef.id }
      });
      await orderRef.set({
        ownerUid: user.uid,
        customer: customer,
        items: items,
        totalPaise: totalPaise,
        status: "created",
        razorpayOrderId: razorpayOrder.id,
        confirmationTokenHash: hashToken(confirmationToken),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      response.status(200).json({
        orderId: orderRef.id,
        confirmationToken: confirmationToken,
        razorpayOrderId: razorpayOrder.id,
        amountPaise: totalPaise,
        keyId: RAZORPAY_KEY_ID.value()
      });
    } catch (error) {
      sendFailure(response, error, "Could not create Razorpay order.");
    }
  }
);

exports.getUserOrders = onRequest(
  {},
  async function (request, response) {
    if (!applyCors(request, response)) {
      return;
    }
    try {
      const user = await requireUser(request);
      const queries = [
        db.collection("orders").where("ownerUid", "==", user.uid).get()
      ];
      if (user.email_verified && typeof user.email === "string") {
        queries.push(
          db.collection("orders")
            .where("customer.email", "==", user.email.trim().toLowerCase())
            .get()
        );
      }

      const snapshots = await Promise.all(queries);
      const ordersById = new Map();
      snapshots.forEach(function (snapshot) {
        snapshot.docs.forEach(function (document) {
          const order = document.data();
          const belongsToUser = order.ownerUid === user.uid;
          const isVerifiedLegacyOrder =
            !order.ownerUid &&
            user.email_verified &&
            typeof user.email === "string" &&
            order.customer &&
            order.customer.email === user.email.trim().toLowerCase();
          if (!belongsToUser && !isVerifiedLegacyOrder) {
            return;
          }
          ordersById.set(document.id, document);
        });
      });

      const orders = Array.from(ordersById.values()).map(function (document) {
        const order = document.data();
        return {
          orderId: document.id,
          status: order.status,
          totalPaise: order.totalPaise,
          createdAt: order.createdAt && typeof order.createdAt.toDate === "function"
            ? order.createdAt.toDate().toISOString()
            : null,
          items: Array.isArray(order.items)
            ? order.items.map(function (item) {
              return {
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                lineTotalPaise: item.lineTotalPaise
              };
            })
            : []
        };
      }).sort(function (left, right) {
        return (right.createdAt || "").localeCompare(left.createdAt || "");
      });

      response.status(200).json({ orders: orders });
    } catch (error) {
      sendFailure(response, error, "Could not load customer order history.");
    }
  }
);

exports.verifyPayment = onRequest(
  { secrets: [RAZORPAY_KEY_SECRET] },
  async function (request, response) {
    if (!applyCors(request, response)) {
      return;
    }
    try {
      const body = request.body || {};
      if (
        typeof body.orderId !== "string" ||
        typeof body.razorpayOrderId !== "string" ||
        typeof body.razorpayPaymentId !== "string" ||
        typeof body.razorpaySignature !== "string"
      ) {
        throw Object.assign(new Error("Payment verification fields are incomplete."), {
          statusCode: 400,
          publicMessage: "We couldn’t verify this payment. Please contact the shop."
        });
      }

      const orderRef = db.collection("orders").doc(body.orderId);
      const orderSnapshot = await orderRef.get();
      if (!orderSnapshot.exists) {
        throw Object.assign(new Error("Payment references an unknown order."), {
          statusCode: 404,
          publicMessage: "We couldn’t find this order."
        });
      }
      const order = orderSnapshot.data();
      requireConfirmationToken(order, body.confirmationToken);
      if (body.razorpayOrderId !== order.razorpayOrderId) {
        throw Object.assign(new Error("Razorpay order does not match."), {
          statusCode: 400,
          publicMessage: "This payment doesn’t match your order."
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET.value())
        .update(`${order.razorpayOrderId}|${body.razorpayPaymentId}`)
        .digest("hex");
      if (!equalHex(expectedSignature, body.razorpaySignature)) {
        throw Object.assign(new Error("Razorpay payment signature is invalid."), {
          statusCode: 400,
          publicMessage: "Payment verification failed. If money was deducted, contact the shop."
        });
      }

      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID.value(),
        key_secret: RAZORPAY_KEY_SECRET.value()
      });
      const payment = await razorpay.payments.fetch(body.razorpayPaymentId);
      if (payment.status !== "captured") {
        throw Object.assign(new Error(`Payment status is ${payment.status}.`), {
          statusCode: 409,
          publicMessage: "Payment is not confirmed as captured yet. Please wait a moment and retry."
        });
      }
      await setOrderPaid(body.orderId, payment);
      response.status(200).json({ verified: true, orderId: body.orderId });
    } catch (error) {
      sendFailure(response, error, "Payment verification failed.");
    }
  }
);

exports.getPaymentConfirmation = onRequest(
  {},
  async function (request, response) {
    if (!applyCors(request, response)) {
      return;
    }
    try {
      const body = request.body || {};
      if (typeof body.orderId !== "string") {
        throw Object.assign(new Error("Order reference is missing."), {
          statusCode: 400,
          publicMessage: "No order reference was provided."
        });
      }
      const snapshot = await db.collection("orders").doc(body.orderId).get();
      if (!snapshot.exists) {
        throw Object.assign(new Error("Order not found."), {
          statusCode: 404,
          publicMessage: "We couldn’t find this order."
        });
      }
      const order = snapshot.data();
      requireConfirmationToken(order, body.confirmationToken);
      if (order.status !== "paid") {
        throw Object.assign(new Error("Order is not paid."), {
          statusCode: 409,
          publicMessage: "Payment has not been verified yet. If you have just paid, wait briefly and refresh this page."
        });
      }
      response.status(200).json({
        orderId: snapshot.id,
        items: order.items.map(function (item) {
          return {
            name: item.name,
            quantity: item.quantity,
            lineTotalPaise: item.lineTotalPaise
          };
        }),
        totalPaise: order.totalPaise,
        paymentId: order.razorpayPaymentId,
        customer: { email: order.customer.email }
      });
    } catch (error) {
      sendFailure(response, error, "Could not load payment confirmation.");
    }
  }
);

exports.razorpayWebhook = onRequest(
  { secrets: [RAZORPAY_WEBHOOK_SECRET] },
  async function (request, response) {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed.");
      return;
    }
    try {
      const signature = request.get("x-razorpay-signature");
      const expected = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value())
        .update(request.rawBody)
        .digest("hex");
      if (!equalHex(expected, signature)) {
        response.status(400).send("Invalid webhook signature.");
        return;
      }

      if (request.body.event === "payment.captured") {
        const payment = request.body.payload &&
          request.body.payload.payment &&
          request.body.payload.payment.entity;
        if (
          !payment ||
          !payment.order_id ||
          !payment.id ||
          payment.status !== "captured"
        ) {
          response.status(400).send("Invalid payment event.");
          return;
        }
        const matches = await db.collection("orders")
          .where("razorpayOrderId", "==", payment.order_id)
          .limit(1)
          .get();
        if (matches.empty) {
          response.status(404).send("Store order not found.");
          return;
        }
        const orderDocument = matches.docs[0];
        await setOrderPaid(orderDocument.id, payment);
      }
      response.status(200).send("OK");
    } catch (error) {
      console.error("Razorpay webhook processing failed.", error);
      response.status(500).send("Webhook processing failed.");
    }
  }
);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character];
  });
}

async function sendEmail(order, recipient, isShop) {
  const itemRows = order.items.map(function (item) {
    return `<li>${escapeHtml(item.name)} × ${item.quantity}: ${formatAmount(item.lineTotalPaise)}</li>`;
  }).join("");
  const address = order.customer.address || {};
  const formattedAddress = [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country
  ].filter(Boolean).map(escapeHtml).join("<br>");
  const emailBody = [
    `<p>Payment confirmed for order <strong>${escapeHtml(order.id)}</strong>.</p>`,
    `<p>Customer: ${escapeHtml(order.customer.name)} (${escapeHtml(order.customer.email)}, ${escapeHtml(order.customer.phone)})</p>`,
    `<p>Delivery address (<strong>${escapeHtml(address.label || "Delivery")}</strong>):<br>${formattedAddress}</p>`,
    `<ul>${itemRows}</ul>`,
    `<p>Total paid: <strong>${formatAmount(order.totalPaise)}</strong></p>`
  ].join("");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL.value(),
      to: [recipient],
      subject: isShop
        ? `Payment received — order ${order.id}`
        : "Your yarnity_nest payment is confirmed",
      html: emailBody,
      text: [
        `Payment confirmed for order ${order.id}.`,
        `Customer: ${order.customer.name} (${order.customer.email})`,
        `Address label: ${address.label || "Delivery"}`,
        `Delivery address: ${[
          address.addressLine1,
          address.addressLine2,
          [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
          address.country
        ].filter(Boolean).join(", ")}`,
        ...order.items.map(function (item) {
          return `${item.name} × ${item.quantity}: ${formatAmount(item.lineTotalPaise)}`;
        }),
        `Total paid: ${formatAmount(order.totalPaise)}`
      ].join("\n")
    })
  });
  if (!result.ok) {
    throw new Error(`Resend failed with HTTP ${result.status}: ${await result.text()}`);
  }
}

async function sendWhatsApp(order, recipient, recipientName) {
  const graphVersion = WHATSAPP_GRAPH_API_VERSION.value();
  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
  const itemSummary = order.items.map(function (item) {
    return `${item.name} x ${item.quantity}`;
  }).join(", ").slice(0, 900);
  const result = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN.value()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient.replace(/\D/g, ""),
        type: "template",
        template: {
          name: WHATSAPP_TEMPLATE_NAME.value(),
          language: { code: WHATSAPP_TEMPLATE_LANGUAGE.value() },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: recipientName },
              { type: "text", text: order.id },
              { type: "text", text: formatAmount(order.totalPaise) },
              { type: "text", text: order.customer.name },
              { type: "text", text: itemSummary }
            ]
          }]
        }
      })
    }
  );
  if (!result.ok) {
    throw new Error(`WhatsApp Cloud API failed with HTTP ${result.status}: ${await result.text()}`);
  }
}

exports.notifyPaidOrder = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    retry: true,
    timeoutSeconds: 120,
    secrets: [RESEND_API_KEY, WHATSAPP_ACCESS_TOKEN]
  },
  async function (event) {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!after || before.status === "paid" || after.status !== "paid") {
      return;
    }
    const order = Object.assign({ id: event.params.orderId }, after);
    const ref = event.data.after.ref;
    const deliveries = [
      ["customerEmail", function () {
        return sendEmail(order, order.customer.email, false);
      }],
      ["shopEmail", function () {
        return sendEmail(order, SHOP_EMAIL.value(), true);
      }],
      ["customerWhatsApp", function () {
        return sendWhatsApp(order, order.customer.phone, order.customer.name);
      }],
      ["shopWhatsApp", function () {
        return sendWhatsApp(order, SHOP_WHATSAPP.value(), "yarnity_nest");
      }]
    ];

    for (const delivery of deliveries) {
      const channel = delivery[0];
      const latest = await ref.get();
      if (latest.get(`notifications.${channel}`) === "sent") {
        continue;
      }
      await delivery[1]();
      await ref.update({ [`notifications.${channel}`]: "sent" });
    }
  }
);
