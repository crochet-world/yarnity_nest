
/*
  yarnity_nest — Storefront script

  To set up later:
  1. Set the contact email and WhatsApp number in STORE.
  2. Edit the PRODUCTS list with real product names and prices.
  3. Add photos in your images folder and set each product's image path.

  WhatsApp number format: country code + number, digits only.
  Example for India: 919876543210
*/

const STORE = {
  brandName: "yarnity_nest",
  whatsappNumber: "918726064563",
  orderWhatsappNumber: "918726064563",
  instagramUrl: "https://www.instagram.com/yarnity_nest/"
};

let imagePreviewScrollPosition = 0;
let cartItems = [];
let cartUserId = "";
const CART_STORAGE_KEY = "yarnity-nest-cart";
let cartToastTimer;
let pendingConfirmation = null;
let pendingCartReturn = null;

function loadCartItems(uid) {
  try {
    const userCartKey = `${CART_STORAGE_KEY}:${uid}`;
    let storedCart = window.localStorage.getItem(userCartKey);
    if (storedCart === null) {
      storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart !== null) {
        window.localStorage.setItem(userCartKey, storedCart);
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
    if (!storedCart) {
      return [];
    }
    const savedItems = JSON.parse(storedCart);
    if (!Array.isArray(savedItems)) {
      throw new Error("Saved cart data is invalid.");
    }
    const itemsByProduct = new Map();
    savedItems.forEach(function (item) {
      if (!item || !Number.isInteger(item.productIndex) ||
        item.productIndex < 0 || item.productIndex >= PRODUCTS.length ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        return;
      }
      const existing = itemsByProduct.get(item.productIndex);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        itemsByProduct.set(item.productIndex, {
          productIndex: item.productIndex,
          quantity: item.quantity
        });
      }
    });
    return Array.from(itemsByProduct.values());
  } catch (error) {
    console.error("Could not restore the saved cart.", error);
    return [];
  }
}

function persistCartItems() {
  if (!currentAuthUser || cartUserId !== currentAuthUser.uid) {
    return;
  }
  try {
    window.localStorage.setItem(`${CART_STORAGE_KEY}:${cartUserId}`, JSON.stringify(cartItems));
  } catch (error) {
    console.error("Could not save the cart on this device.", error);
    showCartToast("Your cart couldn’t be saved on this device.");
  }
}

const CATEGORIES = [
  {
    name: "Flowers",
    emoji: "🌸",
    description: "Cheerful crochet blooms that never wilt.",
    bg: "#f7dfe5",
    accent: "#d94e7c"
  },
  {
    name: "Gifts",
    emoji: "🎁",
    description: "Small handmade pieces for people you love.",
    bg: "#dfe8d8",
    accent: "#71816a"
  },
  {
    name: "Bags",
    emoji: "👜",
    description: "Everyday bags with a handmade texture.",
    bg: "#f7dfe5",
    accent: "#b56f69"
  },
  {
    name: "Keychains & Bag Charms",
    emoji: "🍒",
    description: "Crochet keychains and cute charms for your bag.",
    bg: "#fff0bd",
    accent: "#b78338"
  },
  {
    name: "Tea Coasters",
    emoji: "☕",
    description: "Cozy touches for your cup and table.",
    bg: "#dfe8d8",
    accent: "#71816a"
  },
  {
    name: "Hair Accessories",
    emoji: "🎀",
    description: "Scrunchies, clips and bows made by hand.",
    bg: "#dce9f2",
    accent: "#6b8fa8"
  }
];

function categoryRoute(categoryName) {
  return categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Five editable placeholders for each category.
const PRODUCTS = [
  // GIFTS — 5 placeholders
  {
    name: "Gift idea 1",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "🎁",
    tag: "Gifts",
    category: "Gifts",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Gift idea 2",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "♡",
    tag: "Gifts",
    category: "Gifts",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Gift idea 3",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "✿",
    tag: "Gifts",
    category: "Gifts",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },
  {
    name: "Gift idea 4",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "❋",
    tag: "Gifts",
    category: "Gifts",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Gift idea 5",
    price: "Add price",
    description: "Add a short description for this handmade gift.",
    emoji: "☆",
    tag: "Gifts",
    category: "Gifts",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },

  // BAGS — 5 placeholders
  {
    name: "Crochet bag 1",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "▱",
    tag: "Bags",
    category: "Bags",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Crochet bag 2",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "👜",
    tag: "Bags",
    category: "Bags",
    bg: "#e9d8cb",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Crochet bag 3",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "♡",
    tag: "Bags",
    category: "Bags",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Crochet bag 4",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "✿",
    tag: "Bags",
    category: "Bags",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Crochet bag 5",
    price: "Add price",
    description: "Add a description, size and details for this bag.",
    emoji: "❋",
    tag: "Bags",
    category: "Bags",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },

  // BAG CHARMS & KEYCHAINS — 5 placeholders
  {
    name: "Bag charm / keychain 1",
    price: "₹300",
    description: "Add a short description for this little accessory.",
    emoji: "♡",
    tag: "Bag charms & keychains",
    category: "Keychains & Bag Charms",
    bg: "#e6ddec",
    accent: "#92749e",
    image: "images/KeyRing1.jpeg"
  },
  {
    name: "Bag charm / keychain 2",
    price: "₹350",
    description: "Add a short description for this little accessory.",
    emoji: "✿",
    tag: "Bag charms & keychains",
    category: "Keychains & Bag Charms",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: "images/Key_Ring2.jpeg"
  },
  {
    name: "Bag charm / keychain 3",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "☆",
    tag: "Bag charms & keychains",
    category: "Keychains & Bag Charms",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Bag charm / keychain 4",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "❋",
    tag: "Bag charms & keychains",
    category: "Keychains & Bag Charms",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Bag charm / keychain 5",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "☁",
    tag: "Bag charms & keychains",
    category: "Keychains & Bag Charms",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },

  // TEA COASTERS — 5 placeholders
  {
    name: "Tea coaster 1",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "❋",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#dce3d5",
    accent: "#71816a",
    image: "images/Tea_Coaster1.jpeg"
  },
  {
    name: "Tea coaster 2",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "✿",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  },
  {
    name: "Tea coaster 3",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "☼",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Tea coaster 4",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "♡",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },
  {
    name: "Tea coaster 5",
    price: "Add price",
    description: "Add a description, colour and shape for this coaster.",
    emoji: "❀",
    tag: "Tea coasters",
    category: "Tea Coasters",
    bg: "#e9d8cb",
    accent: "#a9814f",
    image: ""
  },

  // HAIR ACCESSORIES — 5 placeholders
  {
    name: "Hair accessory 1",
    price: "₹250",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "✿",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: "images/HairItems1.jpeg"
  },
  {
    name: "Hair accessory 2",
    price: "₹200",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "❀",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#e6ddec",
    accent: "#92749e",
    image: "images/HairItems2.jpeg"
  },
  {
    name: "Hair accessory 3",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "♡",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Hair accessory 4",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "☆",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#dce3d5",
    accent: "#71816a",
    image: ""
  },
  {
    name: "Hair accessory 5",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "❋",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#eee2c9",
    accent: "#a9814f",
    image: ""
  }
];

["Flowers", "Plushies", "Keychains"].forEach(function (categoryName) {
  const category = CATEGORIES.find(function (item) {
    return item.name === categoryName;
  }) || (categoryName === "Keychains"
    ? {
      emoji: "🔑",
      bg: "#dce9f2",
      accent: "#6b8fa8"
    }
    : {
      emoji: "🧸",
      bg: "#fff0bd",
      accent: "#b78338"
    });
  const productCategory = categoryName === "Keychains"
    ? "Keychains & Bag Charms"
    : categoryName;

  for (let index = 1; index <= 5; index += 1) {
    PRODUCTS.push({
      name: `${categoryName} idea ${index}`,
      price: "Add price",
      description: `Add a short description for this handmade ${categoryName.toLowerCase()}.`,
      emoji: category.emoji,
      tag: productCategory,
      category: productCategory,
      bg: category.bg,
      accent: category.accent,
      image: ""
    });
  }
});

PRODUCTS.forEach(function (product) {
  if (product.price === "Add price") {
    product.price = "₹400";
  }
});

function whatsappUrl(message, whatsappNumber) {
  const number = whatsappNumber.replace(/\D/g, "");

  if (!number) {
    return "";
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function setupLink(element, message, whatsappNumber) {
  const href = whatsappUrl(message, whatsappNumber || STORE.whatsappNumber);

  if (href) {
    element.href = href;
    element.target = "_blank";
    element.rel = "noreferrer";
  } else {
    element.href = "#shop";
    element.title =
      "Add your WhatsApp number in script.js to enable WhatsApp ordering";

    element.addEventListener("click", function (event) {
      event.preventDefault();
      alert(
        "WhatsApp ordering isn't connected yet. Add your number in script.js when you're ready."
      );
    });
  }
}

function updateBrand() {
  document.title = `${STORE.brandName} | Handmade Crochet`;

  [
    "brand-name",
    "footer-brand-name",
    "copyright-name"
  ].forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = STORE.brandName;
    }
  });

  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  const instagramLink = document.getElementById("instagram-link");

  if (instagramLink) {
    instagramLink.href = STORE.instagramUrl;
  }

  const generalMessage =
    `Hi ${STORE.brandName}! I'd like to know more about your crochet products.`;

  document.querySelectorAll(".order-whatsapp").forEach(function (link) {
    setupLink(link, generalMessage, STORE.orderWhatsappNumber);
  });

  [
    "story-whatsapp",
    "footer-whatsapp"
  ].forEach(function (id) {
    const element = document.getElementById(id);

    if (element) {
      setupLink(element, generalMessage);
    }
  });
}

function renderCategories() {
  const grid = document.getElementById("category-grid");

  if (!grid) {
    return;
  }

  grid.innerHTML = CATEGORIES.map(function (category, index) {
    const activeClass = index === 0 ? " is-active" : "";
    const pressed = index === 0 ? "true" : "false";

    return `
      <button
        class="category-card${activeClass}"
        type="button"
        data-category="${category.name}"
        aria-pressed="${pressed}"
      >
        <span
          class="category-art"
          style="--category-bg:${category.bg};--category-accent:${category.accent}"
        >${category.emoji}</span>

        <span class="category-card-copy">
          <strong>${category.name}</strong>
          <small>${category.description}</small>
        </span>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".category-card").forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedCategory = button.dataset.category;
      const route = categoryRoute(selectedCategory);

      if (window.location.hash.slice(1) !== route) {
        window.history.pushState(null, "", `#${route}`);
      }

      renderRoute();
    });
  });
}

function renderCategoryTabs() {
  const tabs = document.getElementById("category-tabs");

  if (!tabs) {
    return;
  }

  tabs.innerHTML = CATEGORIES.map(function (category) {
    const route = categoryRoute(category.name);

    return `<a href="#${route}" data-route-link="${route}">${category.name}</a>`;
  }).join("");
}

function renderCart() {
  persistCartItems();
  const count = cartItems.reduce(function (total, item) {
    return total + item.quantity;
  }, 0);
  const cartTotal = cartItems.reduce(function (total, item) {
    return total + getPriceAmount(PRODUCTS[item.productIndex]) * item.quantity;
  }, 0);
  const countElement = document.getElementById("cart-count");
  const cartButton = document.getElementById("cart-open");
  const itemsContainer = document.getElementById("cart-items");
  const totalElement = document.getElementById("cart-total");
  const proceedButton = document.getElementById("cart-proceed-payment");
  const paymentButton = document.getElementById("razorpay-checkout-button");

  if (totalElement) {
    totalElement.textContent = formatRupees(cartTotal);
  }
  updatePaymentPage(cartTotal);
  if (countElement) {
    countElement.textContent = String(count);
  }
  if (cartButton) {
    cartButton.setAttribute(
      "aria-label",
      `Open cart, ${count} ${count === 1 ? "item" : "items"}`
    );
  }
  if (proceedButton) {
    proceedButton.disabled = count === 0;
  }
  if (paymentButton) {
    paymentButton.disabled = count === 0;
  }
  if (!itemsContainer) {
    return;
  }

  if (cartItems.length === 0) {
    itemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  itemsContainer.innerHTML = cartItems.map(function (item) {
    const product = PRODUCTS[item.productIndex];
    const isInWishlist = wishlistProductIndices.has(item.productIndex);
    const user = currentAuthUser || firebaseAuth?.currentUser;
    const isSavingWishlist = Boolean(
      user && wishlistWritesInFlight.has(wishlistOperationKey(user, item.productIndex))
    );
    return `
      <article class="cart-item">
        <div class="cart-item-info">
          <h3>${product.name}</h3>
          <p class="cart-item-meta">${product.category} · Quantity: ${item.quantity}</p>
          <p class="cart-unit-price">Unit price: <strong>${product.price}</strong></p>
        </div>
        <div class="cart-item-side">
          <strong class="cart-item-total">${formatRupees(
            getPriceAmount(product) * item.quantity
          )}</strong>
          <div class="cart-item-actions">
            <button class="cart-wishlist${isInWishlist ? " is-saved" : ""}" type="button" data-cart-wishlist="${item.productIndex}" aria-pressed="${isInWishlist}"${isSavingWishlist ? " disabled" : ""}>${isInWishlist ? "Added to Wishlist" : "Add to Wishlist"}</button>
            <button class="cart-remove" type="button" data-cart-remove="${item.productIndex}">Remove</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function getPriceAmount(product) {
  return Number(product.price.replace(/[^\d]/g, ""));
}

function formatRupees(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getCartTotal() {
  return cartItems.reduce(function (total, item) {
    return total + getPriceAmount(PRODUCTS[item.productIndex]) * item.quantity;
  }, 0);
}

function updatePaymentPage(total) {
  const amount = total === undefined ? getCartTotal() : total;
  const amountElement = document.getElementById("payment-total");
  const orderItemsElement = document.getElementById("payment-order-items");
  const itemsTotalElement = document.getElementById("payment-items-total");
  const orderTotalElement = document.getElementById("payment-order-total");
  const emptyNotice = document.getElementById("payment-empty-message");

  if (amountElement) {
    amountElement.textContent = formatRupees(amount);
  }
  if (itemsTotalElement) {
    itemsTotalElement.textContent = formatRupees(amount);
  }
  if (orderTotalElement) {
    orderTotalElement.textContent = formatRupees(amount);
  }
  if (orderItemsElement) {
    if (cartItems.length === 0) {
      orderItemsElement.innerHTML = '<p class="payment-order-empty">Your cart is empty.</p>';
    } else {
      orderItemsElement.innerHTML = cartItems.map(function (item) {
        const product = PRODUCTS[item.productIndex];
        const imageMarkup = product.image
          ? `<img src="${product.image}" alt="">`
          : `<span aria-hidden="true">${product.emoji || "✿"}</span>`;

        return `
          <article class="payment-order-item">
            <div class="payment-order-product-art">${imageMarkup}</div>
            <div class="payment-order-product-info">
              <strong>${product.name}</strong>
              <span>${product.category} · Quantity: ${item.quantity}</span>
            </div>
            <strong class="payment-order-item-price">${formatRupees(
              getPriceAmount(product) * item.quantity
            )}</strong>
          </article>
        `;
      }).join("");
    }
  }
  if (emptyNotice) {
    emptyNotice.hidden = amount > 0;
  }
}

const PAYMENT_API_BASE = (
  window.YARNITY_PAYMENT_CONFIG &&
  window.YARNITY_PAYMENT_CONFIG.functionsBaseUrl
    ? window.YARNITY_PAYMENT_CONFIG.functionsBaseUrl
    : ""
).replace(/\/+$/, "");

async function callPaymentFunction(name, payload, forceRefreshToken) {
  if (!PAYMENT_API_BASE || PAYMENT_API_BASE.includes("YOUR_FIREBASE_PROJECT_ID")) {
    throw new Error("Online payment is not configured yet. Please contact the shop.");
  }

  const headers = { "Content-Type": "application/json" };
  const user = currentAuthUser || firebaseAuth?.currentUser;
  if (user) {
    headers.Authorization = "Bearer " + await user.getIdToken(Boolean(forceRefreshToken));
  }
  let response;
  try {
    response = await fetch(`${PAYMENT_API_BASE}/${name}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
    if (name === "getUserOrders") {
      throw new Error(
        "Order history is unavailable: deploy the getUserOrders Firebase Function and add this website’s exact origin to PUBLIC_SITE_ORIGINS."
      );
    }
    throw new Error(
      "The Firebase Functions service could not be reached. Check the deployed function URL and allowed website origins."
    );
  }
  const result = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(result.error || "The payment request could not be completed.");
  }
  if (name === "createPaymentOrder" || name === "verifyPayment") {
    accountOrdersLoadedFor = "";
  }
  return result;
}

function setPaymentStatus(message, isError) {
  const status = document.getElementById("payment-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

async function startRazorpayCheckout(event) {
  event.preventDefault();
  const form = document.getElementById("checkout-contact-form");
  const button = document.getElementById("razorpay-checkout-button");
  if (!form || !button || !form.reportValidity()) {
    return;
  }
  if (cartItems.length === 0) {
    setPaymentStatus("Your cart is empty. Add a product before paying.", true);
    return;
  }
  if (typeof window.Razorpay !== "function") {
    setPaymentStatus("Razorpay Checkout could not be loaded. Check your connection and try again.", true);
    return;
  }

  const formData = new FormData(form);
  const customer = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: {
      label: document.getElementById("checkout-saved-address-select")?.selectedOptions[0]?.textContent
        ?.replace(/\s+\(Default\)$/, "") || "Delivery",
      addressLine1: String(formData.get("addressLine1") || "").trim(),
      addressLine2: String(formData.get("addressLine2") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(),
      postalCode: String(formData.get("postalCode") || "").trim(),
      country: String(formData.get("country") || "").trim()
    },
    notificationConsent: formData.get("notificationConsent") === "on"
  };
  const orderPayload = {
    customer: customer,
    items: cartItems.map(function (item) {
      return { productIndex: item.productIndex, quantity: item.quantity };
    })
  };

  button.disabled = true;
  setPaymentStatus("Preparing your secure payment…", false);
  try {
    const order = await callPaymentFunction("createPaymentOrder", orderPayload);
    pendingConfirmation = {
      orderId: order.orderId,
      confirmationToken: order.confirmationToken
    };
    try {
      sessionStorage.setItem("yarnityPendingConfirmation", JSON.stringify(pendingConfirmation));
    } catch (storageError) {
      console.warn("Could not save confirmation details for page refresh.", storageError);
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: "INR",
      name: STORE.brandName,
      description: "Handmade crochet order",
      order_id: order.razorpayOrderId,
      prefill: {
        name: customer.name,
        email: customer.email,
        contact: customer.phone
      },
      notes: { orderReference: order.orderId },
      theme: { color: "#ad315b" },
      handler: async function (paymentResponse) {
        pendingConfirmation.payment = {
          razorpayOrderId: paymentResponse.razorpay_order_id,
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpaySignature: paymentResponse.razorpay_signature
        };
        pendingConfirmation.paymentId = paymentResponse.razorpay_payment_id;
        try {
          sessionStorage.setItem(
            "yarnityPendingConfirmation",
            JSON.stringify(pendingConfirmation)
          );
        } catch (storageError) {
          console.warn("Could not save payment verification details.", storageError);
        }
        setPaymentStatus("Verifying your payment securely…", false);
        try {
          await callPaymentFunction("verifyPayment", {
            orderId: order.orderId,
            confirmationToken: order.confirmationToken,
            ...pendingConfirmation.payment
          });
          delete pendingConfirmation.payment;
          try {
            sessionStorage.setItem(
              "yarnityPendingConfirmation",
              JSON.stringify(pendingConfirmation)
            );
          } catch (storageError) {
            console.warn("Could not update saved confirmation details.", storageError);
          }
          cartItems = [];
          renderCart();
          window.location.hash = "confirmation";
        } catch (verificationError) {
          console.error("Razorpay payment verification failed.", verificationError);
          setPaymentStatus(
            `${verificationError.message} If money was deducted, contact the shop with your Razorpay payment ID.`,
            true
          );
          window.location.hash = "confirmation";
        }
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus("Payment was not completed. You can try again when ready.", false);
          button.disabled = false;
        }
      }
    });
    checkout.on("payment.failed", function (failure) {
      console.error("Razorpay reported a failed payment.", failure.error);
      setPaymentStatus(
        failure.error && failure.error.description
          ? failure.error.description
          : "Payment failed. Please try again.",
        true
      );
      button.disabled = false;
    });
    checkout.open();
  } catch (error) {
    console.error("Could not start Razorpay checkout.", error);
    setPaymentStatus(error.message, true);
    button.disabled = false;
  }
}

async function loadOrderConfirmation() {
  const status = document.getElementById("confirmation-status");
  const details = document.getElementById("confirmation-details");
  const retryButton = document.getElementById("confirmation-retry");
  if (!status || !details) {
    return;
  }

  let confirmation = pendingConfirmation;
  if (!confirmation) {
    try {
      confirmation = JSON.parse(
        sessionStorage.getItem("yarnityPendingConfirmation") || "null"
      );
    } catch (storageError) {
      console.warn("Could not load saved confirmation details.", storageError);
    }
  }
  if (!confirmation) {
    document.getElementById("confirmation-eyebrow").textContent = "PAYMENT STATUS";
    document.getElementById("confirmation-heading").textContent = "Payment not verified";
    status.textContent = "We couldn’t find a payment to confirm. If you completed payment, please contact the shop.";
    return;
  }

  status.textContent = "Checking your verified payment…";
  if (retryButton) {
    retryButton.hidden = true;
  }
  try {
    if (confirmation.payment) {
      confirmation.paymentId = confirmation.payment.razorpayPaymentId;
      await callPaymentFunction("verifyPayment", {
        orderId: confirmation.orderId,
        confirmationToken: confirmation.confirmationToken,
        ...confirmation.payment
      });
      delete confirmation.payment;
      pendingConfirmation = confirmation;
      try {
        sessionStorage.setItem(
          "yarnityPendingConfirmation",
          JSON.stringify(confirmation)
        );
      } catch (storageError) {
        console.warn("Could not update saved confirmation details.", storageError);
      }
    }
    const result = await callPaymentFunction("getPaymentConfirmation", confirmation);
    document.getElementById("confirmation-order-id").textContent = result.orderId;
    document.getElementById("confirmation-payment-id").textContent = result.paymentId;
    document.getElementById("confirmation-total").textContent =
      formatRupees(result.totalPaise / 100);
    document.getElementById("confirmation-customer-email").textContent =
      result.customer.email;
    const items = document.getElementById("confirmation-items");
    items.replaceChildren();
    result.items.forEach(function (item) {
      const row = document.createElement("p");
      row.textContent = `${item.name} × ${item.quantity} — ${formatRupees(
        item.lineTotalPaise / 100
      )}`;
      items.appendChild(row);
    });
    details.hidden = false;
    document.getElementById("confirmation-eyebrow").textContent = "PAYMENT CONFIRMED";
    document.getElementById("confirmation-heading").textContent = "Thank you for your order!";
    status.textContent = "Your payment is confirmed. We’re sending your confirmation to your email and WhatsApp.";
  } catch (error) {
    console.error("Could not load verified order confirmation.", error);
    document.getElementById("confirmation-heading").textContent = "Payment status not confirmed";
    status.textContent = confirmation.paymentId
      ? `${error.message} If money was deducted, contact the shop with payment ID ${confirmation.paymentId}.`
      : error.message;
    if (retryButton) {
      retryButton.hidden = false;
    }
  }
}

function showCartToast(message) {
  const toast = document.getElementById("cart-toast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(cartToastTimer);
  cartToastTimer = window.setTimeout(function () {
    toast.classList.remove("is-visible");
  }, 2400);
}

function renderProducts(category) {
  const grid = document.getElementById("product-grid");

  if (!grid) {
    return;
  }

  const selectedCategory = category || "Gifts";

  const filteredProducts = PRODUCTS.filter(function (product) {
    return product.category === selectedCategory;
  });

  grid.innerHTML = filteredProducts.map(function (product) {
    const media = product.image
      ? `<button class="product-photo-trigger" type="button" data-image="${product.image}" data-image-alt="${product.name}" aria-label="View larger image: ${product.name}"><img src="${product.image}" alt="" loading="lazy"></button>`
      : `<span class="product-placeholder" aria-hidden="true">${product.emoji || "✿"}</span>`;

    return `
      <article class="product-card">
        <div
          class="product-image"
          style="--product-bg:${product.bg || "#f1e5d8"};--product-accent:${product.accent || "#a66e60"}"
        >
          ${media}
          <span class="product-tag">${product.tag}</span>
        </div>

        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="product-description">${product.description}</p>

          <div class="product-bottom">
            ${product.image ? `<span class="price">${product.price}</span>` : ""}
            <div class="product-contact-links">
              <button class="product-add-to-cart" type="button" data-cart-add="${PRODUCTS.indexOf(product)}">Add to cart</button>
              <a class="order-link product-order-whatsapp" href="#" target="_blank" rel="noreferrer">Ask about this ↗</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".product-contact-links").forEach(function (links, index) {
    const product = filteredProducts[index];
    const priceDetails = product.image ? ` (${product.price})` : "";
    const message =
      `Hi ${STORE.brandName}! I'm interested in "${product.name}"${priceDetails}. Is it available?`;

    setupLink(links.querySelector(".product-order-whatsapp"), message);
  });

  grid.querySelectorAll(".product-photo-trigger").forEach(function (button) {
    button.addEventListener("click", function () {
      const dialog = document.getElementById("image-preview");
      const photo = document.getElementById("image-preview-photo");
      const caption = document.getElementById("image-preview-caption");

      if (!dialog || !photo || !caption) {
        return;
      }

      photo.src = button.dataset.image;
      photo.alt = button.dataset.imageAlt || "";
      caption.textContent = photo.alt;
      imagePreviewScrollPosition = window.scrollY;
      dialog.showModal();
    });
  });
}

function renderNewArrivals() {
  const grid = document.getElementById("new-arrivals-grid");
  if (!grid) {
    return;
  }
  const newArrivalIndices = [10, 15, 20, 21];
  grid.innerHTML = newArrivalIndices.map(function (productIndex) {
    const product = PRODUCTS[productIndex];
    if (!product) {
      return "";
    }
    const imageMarkup = product.image
      ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
      : `<span class="new-arrival-placeholder" aria-hidden="true">${product.emoji || "✿"}</span>`;
    return `
      <article class="new-arrival-card">
        <a class="new-arrival-image" href="#${categoryRoute(product.category)}" data-route-link="${categoryRoute(product.category)}" aria-label="Shop ${product.name}">
          <span class="new-arrival-badge">NEW</span>
          ${imageMarkup}
        </a>
        <div class="new-arrival-copy">
          <p>${product.category}</p>
          <h3>${product.name}</h3>
          <strong>${product.price}</strong>
        </div>
      </article>
    `;
  }).join("");
}

const imagePreview = document.getElementById("image-preview");

imagePreview?.addEventListener("click", function (event) {
  if (event.target === this) {
    this.close();
  }
});

imagePreview?.addEventListener("close", function () {
  window.scrollTo({ top: imagePreviewScrollPosition, behavior: "instant" });
});

document.querySelector(".image-preview-close")?.addEventListener("click", function () {
  imagePreview?.close();
});

document.querySelectorAll(".favorite-toggle").forEach(function (button) {
  button.addEventListener("click", function () {
    const isFavorite = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(isFavorite));
    button.textContent = isFavorite ? "♥" : "♡";
    button.setAttribute(
      "aria-label",
      `${isFavorite ? "Remove" : "Add"} ${button.dataset.favoriteName} ${isFavorite ? "from" : "to"} favourites`
    );
  });
});

const appRoutes = ["home", "shop", "about", "order", "payment", "confirmation", "account"];
let currentRoute = "";
let currentSelectedCategory = "Flowers";

function routeFromHash() {
  const route = window.location.hash.slice(1);
  const isCategoryRoute = CATEGORIES.some(function (category) {
    return categoryRoute(category.name) === route;
  });

  return appRoutes.includes(route) || isCategoryRoute ? route : "home";
}

function renderRoute() {
  const route = routeFromHash();
  const routeChanged = route !== currentRoute;
  const routeCategory = CATEGORIES.find(function (category) {
    return categoryRoute(category.name) === route;
  });
  const selectedCategory = routeCategory
    ? routeCategory.name
    : currentSelectedCategory;
  const viewRoute = routeCategory ? "shop" : route;
  currentRoute = route;

  const shopView = document.querySelector(".shop");
  if (shopView) {
    shopView.classList.toggle("is-category-view", Boolean(routeCategory));
  }

  const categoryGrid = document.getElementById("category-grid");
  if (categoryGrid) {
    categoryGrid.hidden = Boolean(routeCategory);
  }

  const categoryViewHeading = document.getElementById("category-view-heading");
  const productNotice = document.getElementById("product-notice");
  const categoryTabs = document.getElementById("category-tabs");
  const productHeading = document.querySelector(".product-heading");
  const selectedCategoryTitle = document.getElementById("selected-category-title");
  const productGrid = document.getElementById("product-grid");
  if (categoryViewHeading) {
    categoryViewHeading.hidden = !routeCategory;
  }
  if (productNotice) {
    productNotice.hidden = !routeCategory;
  }
  if (categoryTabs) {
    categoryTabs.hidden = !routeCategory;
  }
  if (productHeading) {
    productHeading.hidden = !routeCategory;
  }
  if (productGrid) {
    productGrid.hidden = !routeCategory;
  }
  if (selectedCategoryTitle) {
    selectedCategoryTitle.textContent = selectedCategory;
  }

  document.querySelectorAll("[data-route-view]").forEach(function (view) {
    view.hidden = view.dataset.routeView !== viewRoute;
  });

  document.querySelectorAll("[data-route-link]").forEach(function (link) {
    const isActive = link.dataset.routeLink === (routeCategory ? "shop" : route);
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (routeCategory) {
    currentSelectedCategory = selectedCategory;
    const categoryName = document.getElementById("category-view-name");
    const breadcrumbName = document.getElementById("category-breadcrumb-name");
    const categoryEmoji = document.getElementById("category-view-emoji");
    const categoryDescription = document.getElementById("category-view-description");

    if (categoryName) {
      categoryName.textContent = selectedCategory;
    }
    if (breadcrumbName) {
      breadcrumbName.textContent = selectedCategory;
    }
    if (categoryEmoji) {
      categoryEmoji.textContent = routeCategory.emoji;
    }
    if (categoryDescription) {
      categoryDescription.textContent = routeCategory.description;
    }

    document.querySelectorAll(".category-card").forEach(function (card) {
      const isActive = card.dataset.category === selectedCategory;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });

    document.querySelectorAll(".category-tabs a").forEach(function (tab) {
      if (tab.dataset.routeLink === route) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });

    if (routeChanged) {
      renderProducts(selectedCategory);
    }
  } else {
    document.querySelectorAll(".category-tabs a").forEach(function (tab) {
      tab.removeAttribute("aria-current");
    });
  }

  if (routeChanged) {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (route === "confirmation") {
      loadOrderConfirmation();
    }
    if (route === "account") {
      updateAccountPage();
    }
    if (route === "payment" && currentAuthUser) {
      loadAccountAddresses();
    }
  }
}

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest("#confirmation-retry")) {
    loadOrderConfirmation();
    return;
  }

  const link = event.target.closest("[data-route-link]");

  if (
    !link ||
    (!appRoutes.includes(link.dataset.routeLink) &&
      !CATEGORIES.some(function (category) {
        return categoryRoute(category.name) === link.dataset.routeLink;
      }))
  ) {
    return;
  }

  event.preventDefault();
  const route = link.dataset.routeLink;

  if (route !== currentRoute) {
    window.history.pushState(null, "", `#${route}`);
    renderRoute();
  }
});

window.addEventListener("popstate", renderRoute);
window.addEventListener("hashchange", renderRoute);
document.addEventListener("submit", function (event) {
  if (event.target instanceof HTMLFormElement && event.target.id === "checkout-contact-form") {
    startRazorpayCheckout(event);
  }
});

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const addButton = event.target.closest("[data-cart-add]");
  if (addButton) {
    const productIndex = Number(addButton.dataset.cartAdd);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not add an unknown product to the cart.");
      return;
    }

    const signedInUser = currentAuthUser || firebaseAuth?.currentUser;
    if (!signedInUser) {
      pendingCartReturn = { route: currentRoute, productIndex: productIndex };
      const accountMessage = document.getElementById("account-dialog-message");
      if (accountMessage) {
        accountMessage.textContent = "Please log in or create an account before adding items to your cart.";
      }
      document.getElementById("account-dialog")?.showModal();
      return;
    }

    const cartItem = cartItems.find(function (item) {
      return item.productIndex === productIndex;
    });
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      cartItems.push({ productIndex: productIndex, quantity: 1 });
    }
    renderCart();
    showCartToast(`${PRODUCTS[productIndex].name} added to cart.`);
    return;
  }

  const removeButton = event.target.closest("[data-cart-remove]");
  if (removeButton) {
    const productIndex = Number(removeButton.dataset.cartRemove);
    cartItems = cartItems.filter(function (item) {
      return item.productIndex !== productIndex;
    });
    renderCart();
    return;
  }


  if (event.target.closest("#cart-open")) {
    document.getElementById("cart-dialog")?.showModal();
    return;
  }
  if (event.target.closest("#cart-close")) {
    document.getElementById("cart-dialog")?.close();
    return;
  }
  if (event.target.closest("#cart-proceed-payment")) {
    if (cartItems.length === 0) {
      showCartToast("Add a product to your cart before proceeding to payment.");
      return;
    }

    document.getElementById("cart-dialog")?.close();
    window.history.pushState(null, "", "#payment");
    renderRoute();
    return;
  }

  const link = event.target.closest(".order-start-link, .order-how-it-works");
  if (!link) {
    return;
  }

  event.preventDefault();
  if (currentRoute !== "order") {
    window.history.pushState(null, "", "#order");
    renderRoute();
  }
  const targetId = link.classList.contains("order-how-it-works")
    ? "how-it-works"
    : "start-an-order";
  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// Start the storefront.
startAccountModule();
updateBrand();
renderCategories();
renderCategoryTabs();
renderProducts("Flowers");
renderNewArrivals();
renderCart();
if (routeFromHash() === "home" && window.location.hash.slice(1) !== "home") {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#home`
  );
}
renderRoute();
