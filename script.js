
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
  upiId: "9674961450@ybl",
  upiPayeeName: "Kaushal Kumar",
  instagramUrl: "https://www.instagram.com/yarnity_nest/"
};

let imagePreviewScrollPosition = 0;
let cartItems = [];
let cartToastTimer;
let upiFallbackTimer;

const CATEGORIES = [
  {
    name: "Flowers",
    emoji: "🌸",
    description: "Cheerful crochet blooms that never wilt.",
    bg: "#f7dfe5",
    accent: "#d94e7c"
  },
  {
    name: "Plushies",
    emoji: "🧸",
    description: "Tiny soft friends, stitched one loop at a time.",
    bg: "#fff0bd",
    accent: "#b78338"
  },
  {
    name: "Gifts",
    emoji: "🎁",
    description: "Small handmade pieces for people you love.",
    bg: "#dfe8d8",
    accent: "#71816a"
  },
  {
    name: "Keychains",
    emoji: "🔑",
    description: "Pocket-sized crochet that clips on anywhere.",
    bg: "#dce9f2",
    accent: "#6b8fa8"
  },
  {
    name: "Bags",
    emoji: "👜",
    description: "Everyday bags with a handmade texture.",
    bg: "#f7dfe5",
    accent: "#b56f69"
  },
  {
    name: "Bag charms",
    emoji: "🍒",
    description: "Cute charms to dress up any bag.",
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
    category: "Bag charms",
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
    category: "Bag charms",
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
    category: "Bag charms",
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
    category: "Bag charms",
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
    category: "Bag charms",
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
  });

  for (let index = 1; index <= 5; index += 1) {
    PRODUCTS.push({
      name: `${categoryName} idea ${index}`,
      price: "Add price",
      description: `Add a short description for this handmade ${categoryName.toLowerCase()}.`,
      emoji: category.emoji,
      tag: categoryName,
      category: categoryName,
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
  if (!itemsContainer) {
    return;
  }

  if (cartItems.length === 0) {
    itemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  itemsContainer.innerHTML = cartItems.map(function (item) {
    const product = PRODUCTS[item.productIndex];
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
          <button class="cart-remove" type="button" data-cart-remove="${item.productIndex}">Remove</button>
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
  const payLinks = document.querySelectorAll("#upi-pay-link");
  const paymentMessageLink = document.getElementById("payment-instagram-message");
  const upiIdElement = document.getElementById("payment-upi-id");
  const payeeNameElement = document.getElementById("payment-payee-name");
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
  if (upiIdElement) {
    upiIdElement.textContent = STORE.upiId;
  }
  if (payeeNameElement) {
    payeeNameElement.textContent = STORE.upiPayeeName;
  }
  if (emptyNotice) {
    emptyNotice.hidden = amount > 0;
  }
  const parameters = new URLSearchParams({
      pa: STORE.upiId,
      pn: STORE.upiPayeeName,
      am: amount.toFixed(2),
      cu: "INR",
      tn: `${STORE.brandName} order`
    });
  payLinks.forEach(function (link) {
    link.href = amount > 0 ? `upi://pay?${parameters.toString()}` : "#payment";
    link.setAttribute("aria-disabled", String(amount <= 0));
    link.tabIndex = amount > 0 ? 0 : -1;
    link.classList.toggle("is-disabled", amount <= 0);
  });
  if (paymentMessageLink) {
    paymentMessageLink.href = amount > 0
      ? STORE.instagramUrl
      : "#payment";
    paymentMessageLink.setAttribute("aria-disabled", String(amount <= 0));
    paymentMessageLink.classList.toggle("is-disabled", amount <= 0);
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

const appRoutes = ["home", "shop", "about", "order", "payment"];
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
    productHeading.hidden = Boolean(routeCategory);
  }
  if (productGrid) {
    productGrid.hidden = !routeCategory;
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
  }
}

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
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

document.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const upiPayLink = event.target.closest("#upi-pay-link");
  if (upiPayLink) {
    if (upiPayLink.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      showCartToast("Add a product to your cart before proceeding to payment.");
      return;
    }

    window.clearTimeout(upiFallbackTimer);
    upiFallbackTimer = window.setTimeout(function () {
      if (!document.hidden) {
        showCartToast("If no UPI app opened, use the UPI ID and amount shown on this page.");
      }
    }, 1800);
    return;
  }

  const addButton = event.target.closest("[data-cart-add]");
  if (addButton) {
    const productIndex = Number(addButton.dataset.cartAdd);
    if (!Number.isInteger(productIndex) || !PRODUCTS[productIndex]) {
      console.error("Could not add an unknown product to the cart.");
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
  if (event.target.closest("#account-open")) {
    document.getElementById("account-dialog")?.showModal();
    return;
  }
  if (event.target.closest("#account-close")) {
    document.getElementById("account-dialog")?.close();
    return;
  }
  if (event.target.closest("#account-login")) {
    showCartToast("Sign-in is unavailable because no authentication provider is configured.");
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

  if (event.target.closest("#payment-copy-upi")) {
    copyPaymentText(STORE.upiId, "UPI ID copied.");
    return;
  }
  const paymentMessageLink = event.target.closest("#payment-instagram-message");
  if (paymentMessageLink && paymentMessageLink.getAttribute("aria-disabled") === "true") {
    event.preventDefault();
    showCartToast("Add a product to your cart before messaging about payment.");
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

function copyPaymentText(text, successMessage) {
  function showCopyFallback() {
    const copyField = document.createElement("textarea");
    copyField.value = text;
    copyField.setAttribute("readonly", "");
    copyField.style.position = "fixed";
    copyField.style.opacity = "0";
    document.body.appendChild(copyField);
    copyField.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      copyField.remove();
    }

    if (copied) {
      showCartToast(successMessage);
    } else {
      showCartToast("Copy failed. Select and copy the payment details manually.");
    }
  }

  if (!navigator.clipboard?.writeText) {
    showCopyFallback();
    return;
  }

  navigator.clipboard.writeText(text).then(function () {
    showCartToast(successMessage);
  }).catch(function () {
    showCopyFallback();
  });
}

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    window.clearTimeout(upiFallbackTimer);
  }
});

// Start the storefront.
updateBrand();
renderCategories();
renderCategoryTabs();
renderProducts("Flowers");
renderCart();
if (routeFromHash() === "home" && window.location.hash.slice(1) !== "home") {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#home`
  );
}
renderRoute();
