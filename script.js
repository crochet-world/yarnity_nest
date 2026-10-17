/*
  yarnity_nest QUICK SETUP:
  1. Add your WhatsApp number later in STORE.whatsappNumber.
  2. Edit PRODUCTS with your actual product names, prices and descriptions.
  3. Add photos to the images folder and set each product's image path.
  WhatsApp format: country code + number, digits only. India example: 919876543210
*/
const STORE = {
  brandName: "yarnity_nest",
  whatsappNumber: "", // Add your number later; buttons will show a setup message until then
  instagramUrl: "https://www.instagram.com/yarnity_nest/"
};

const PRODUCTS = [
  { name: "Crochet Flower Bouquet", price: "Add price", description: "A little bouquet that lasts forever.", emoji: "✿", tag: "Flowers", bg: "#f1ddd5", accent: "#b56f69", image: "" },
  { name: "Tiny Crochet Plushie", price: "Add price", description: "A soft, pocket-sized friend.", emoji: "♡", tag: "Plushies", bg: "#dce3d5", accent: "#71816a", image: "" },
  { name: "Crochet Keychain", price: "Add price", description: "A tiny handmade touch for your keys.", emoji: "❋", tag: "Little gifts", bg: "#e6ddec", accent: "#92749e", image: "" },
  { name: "Everyday Crochet Bag", price: "Add price", description: "Handmade for your everyday essentials.", emoji: "▱", tag: "Bags", bg: "#eee2c9", accent: "#a9814f", image: "" },
  { name: "Crochet Home Décor", price: "Add price", description: "A handmade accent for your favourite corner.", emoji: "⌂", tag: "Home décor", bg: "#e9d8cb", accent: "#9c7561", image: "" },
  { name: "Handmade Gift", price: "Add price", description: "A thoughtful little something for someone special.", emoji: "♡", tag: "Gifting", bg: "#f4e4e0", accent: "#b56f69", image: "" }
];

function whatsappUrl(message) {
  const number = STORE.whatsappNumber.replace(/\D/g, "");
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
function setupLink(el, message) {
  const href = whatsappUrl(message);
  if (href) {
    el.href = href; el.target = "_blank"; el.rel = "noreferrer";
  } else {
    el.href = "mailto:?subject=" + encodeURIComponent("yarnity_nest order enquiry") + "&body=" + encodeURIComponent(message);
    el.title = "Add your WhatsApp number in script.js to enable WhatsApp ordering";
    el.addEventListener("click", event => {
      event.preventDefault();
      alert("WhatsApp ordering isn't connected yet. Add your number in script.js when you're ready.");
    });
  }
}
function updateBrand() {
  document.title = `${STORE.brandName} | Handmade Crochet`;
  ["brand-name", "footer-brand-name", "copyright-name"].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = STORE.brandName;
  });
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("instagram-link").href = STORE.instagramUrl;
  const general = `Hi ${STORE.brandName}! I'd like to know more about your crochet products.`;
  ["header-whatsapp", "story-whatsapp", "custom-whatsapp", "footer-whatsapp"].forEach(id => {
    const el = document.getElementById(id);
    if (el) setupLink(el, general);
  });
}
function renderProducts() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = PRODUCTS.map((p) => {
    const media = p.image
      ? `<img src="${p.image}" alt="${p.name.replace(/"/g, "&quot;")}" loading="lazy">`
      : `<span class="product-placeholder" aria-hidden="true">${p.emoji || "✿"}</span>`;
    const message = `Hi ${STORE.brandName}! I'm interested in "${p.name}" (${p.price}). Is it available?`;
    const safeName = p.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeDesc = p.description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<article class="product-card">
      <div class="product-image" style="--product-bg:${p.bg || "#f1e5d8"};--product-accent:${p.accent || "#a66e60"}">${media}${p.tag ? `<span class="product-tag">${p.tag}</span>` : ""}</div>
      <div class="product-info"><h3>${safeName}</h3><p class="product-description">${safeDesc}</p>
      <div class="product-bottom"><span class="price">${p.price}</span><a class="order-link product-order" href="#shop">Ask / order ↗</a></div></div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".product-order").forEach((el, i) => setupLink(el, `Hi ${STORE.brandName}! I'm interested in "${PRODUCTS[i].name}" (${PRODUCTS[i].price}). Is it available?`));
}
updateBrand(); renderProducts();
