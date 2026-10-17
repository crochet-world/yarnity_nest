
/*
  yarnity_nest — Storefront script

  To set up later:
  1. Add your WhatsApp number to STORE.whatsappNumber.
  2. Edit the PRODUCTS list with real product names and prices.
  3. Add photos in your images folder and set each product's image path.

  WhatsApp number format: country code + number, digits only.
  Example for India: 919876543210
*/

const STORE = {
  brandName: "yarnity_nest",
  whatsappNumber: "",
  instagramUrl: "https://www.instagram.com/yarnity_nest/"
};

const CATEGORIES = [
  {
    name: "Gifts",
    emoji: "🎁",
    description: "Little handmade surprises",
    bg: "#f4e4e0",
    accent: "#b56f69"
  },
  {
    name: "Bags",
    emoji: "👜",
    description: "Everyday crochet companions",
    bg: "#eee2c9",
    accent: "#a9814f"
  },
  {
    name: "Bag Charms & Keychains",
    emoji: "♡",
    description: "Tiny details for your bag or keys",
    bg: "#e6ddec",
    accent: "#92749e"
  },
  {
    name: "Tea Coasters",
    emoji: "☕",
    description: "Cosy details for tea time",
    bg: "#dce3d5",
    accent: "#71816a"
  },
  {
    name: "Hair Accessories",
    emoji: "✿",
    description: "Sweet handmade finishing touches",
    bg: "#f1ddd5",
    accent: "#b56f69"
  }
];

// Five placeholders for each category: 25 products in total.
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
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "♡",
    tag: "Bag charms & keychains",
    category: "Bag Charms & Keychains",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
  },
  {
    name: "Bag charm / keychain 2",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "✿",
    tag: "Bag charms & keychains",
    category: "Bag Charms & Keychains",
    bg: "#f4e4e0",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Bag charm / keychain 3",
    price: "Add price",
    description: "Add a short description for this little accessory.",
    emoji: "☆",
    tag: "Bag charms & keychains",
    category: "Bag Charms & Keychains",
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
    category: "Bag Charms & Keychains",
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
    category: "Bag Charms & Keychains",
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
    image: ""
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
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "✿",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#f1ddd5",
    accent: "#b56f69",
    image: ""
  },
  {
    name: "Hair accessory 2",
    price: "Add price",
    description: "Add a short description for this handmade hair accessory.",
    emoji: "❀",
    tag: "Hair accessories",
    category: "Hair Accessories",
    bg: "#e6ddec",
    accent: "#92749e",
    image: ""
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

function whatsappUrl(message) {
  const number = STORE.whatsappNumber.replace(/\D/g, "");

  if (!number) {
    return "";
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function setupLink(element, message) {
  const href = whatsappUrl(message);

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

  [
    "header-whatsapp",
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

        <span class="category-arrow" aria-hidden="true">↗</span>
      </button>
    `;
  }).join("");

  grid.querySelectorAll(".category-card").forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedCategory = button.dataset.category;

      grid.querySelectorAll(".category-card").forEach(function (card) {
        const isActive = card === button;

        card.classList.toggle("is-active", isActive);
        card.setAttribute("aria-pressed", String(isActive));
      });

      const title = document.getElementById("selected-category-title");

      if (title) {
        title.textContent = selectedCategory;
      }

      renderProducts(selectedCategory);
    });
  });
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
      ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
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
            <span class="price">${product.price}</span>
            <a class="order-link product-order" href="#shop">
              Ask about this ↗
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".product-order").forEach(function (link, index) {
    const product = filteredProducts[index];

    setupLink(
      link,
      `Hi ${STORE.brandName}! I'm interested in "${product.name}" (${product.price}). Is it available?`
    );
  });
}

// Start the storefront.
updateBrand();
renderCategories();
renderProducts("Gifts");
