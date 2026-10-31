// App logic: hash-based router + order dialog
var app=document.getElementById("app"),dlg=document.getElementById("dlg"),toastEl=document.getElementById("toast");
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function byId(id){return CATS.filter(function(c){return c.id===id})[0]}
function toast(t){toastEl.textContent=t;toastEl.classList.add("show");setTimeout(function(){toastEl.classList.remove("show")},2200)}
function ph(o,c){return '<div class="ph" style="background:var('+c.bg+')">'+(o.image?'<img src="'+esc(o.image)+'" alt="" loading="lazy">':c.icon)+'</div>'}
function catCard(c){return '<a class="card" href="#'+c.id+'">'+ph(c,c)+'<h3>'+esc(c.name)+'</h3><p>'+esc(c.blurb)+'</p></a>'}

var views={
 home:function(){return '<div class="wrap hero"><div><h1>Little things, made with love.</h1><p>Handmade crochet gifts, everyday bags, cute bag charms, tea coasters and hair accessories. Each stitch is made with care.</p><div class="row"><a class="btn" href="#shop">Explore the collection</a><a class="btn alt" href="#order">How to order</a></div></div><div class="swatch" aria-hidden="true"><div><span>✿</span>Made slowly.<br>Loved forever.</div></div></div>'
  +'<div class="ticker">Thoughtfully handmade · Custom colours available · Packed with care</div>'
  +'<section class="block"><div class="wrap"><h2>Shop by category</h2><div class="grid">'+CATS.slice(0,4).map(catCard).join("")+'</div><p style="margin-top:24px"><a class="btn alt" href="#shop">See all categories</a></p></div></section>'},
 shop:function(){return '<div class="wrap"><div class="page-head" style="padding-top:40px"><h1>Shop by category</h1><p>Browse the collection and find a handmade favourite.</p></div><div class="grid">'+CATS.map(catCard).join("")+'</div></div>'},
 about:function(){return '<div class="wrap"><section class="block"><div class="about"><div><h1>Not factory-made. Heart-made.</h1><p>At yarnity_nest, every piece begins with yarn, patience and a little imagination. From cheerful crochet blooms to tiny gifts and cozy home accents, each creation is made stitch by stitch.</p><p>Thank you for supporting handmade and helping small creative businesses grow.</p><p><a class="btn" href="#order">Say hello</a></p></div><div class="swatch" aria-hidden="true"><div><span>♡</span>Made by hand<br>with heart</div></div></div>'
  +'<div class="trio"><div><h3>✿ Made with care</h3><p>Handmade in small batches, with attention to every detail.</p></div><div><h3>♡ Thoughtful details</h3><p>Small handmade pieces, created stitch by stitch.</p></div><div><h3>✉ Easy ordering</h3><p>Message us directly to confirm availability, delivery and payment.</p></div></div></section></div>'},
 order:function(){return '<div class="wrap"><section class="block" style="max-width:640px"><h1>Order with us</h1><p>Every piece is made to order in small batches. Message us on Instagram with what you like, your preferred colours and your delivery city. We will confirm availability, delivery and payment with you.</p><p><a class="btn" href="https://www.instagram.com/yarnity_nest/" target="_blank" rel="noopener">Message on Instagram</a></p><p><button class="btn alt" data-order="">Write a message first</button></p></section></div>'},
 cat:function(c){return '<div class="wrap"><div class="crumb"><a href="#shop">Shop</a> / '+esc(c.name)+'</div><div class="page-head"><h1>'+c.icon+' '+esc(c.name)+'</h1><p>'+esc(c.blurb)+'</p></div><div class="notice">Product previews. Photos and prices will be added as the shop grows, so message us to confirm what is available.</div><div class="tools" role="group" aria-label="Browse categories">'+CATS.map(function(x){return '<a class="chip" href="#'+x.id+'" '+(x.id===c.id?'aria-pressed="true"':'aria-pressed="false"')+' style="text-decoration:none">'+esc(x.name)+'</a>'}).join("")+'</div><div class="grid">'+c.items.map(function(it){var n=typeof it==='string'?{name:it}:it;return '<div class="card item">'+ph(n,c)+'<h3>'+esc(n.name)+'</h3>'+(n.price?'<strong>'+esc(n.price)+'</strong>':'')+'<span class="tag">Custom colours available</span><button class="btn" data-order="'+esc(n.name)+'">Ask about this</button></div>'}).join("")+'</div></div>'}
};

function route(){
  var h=(location.hash||"#home").slice(1),c=byId(h),key=c?"cat":(views[h]&&h!=="cat"?h:"home");
  app.innerHTML=c?views.cat(c):views[key]();
  document.title=(c?c.name:key==="home"?"Handmade Crochet":key==="shop"?"Shop":key==="about"?"Our story":"Order")+" | yarnity_nest";
  var nav=c?"shop":key;
  document.querySelectorAll("[data-nav]").forEach(function(a){if(a.dataset.nav===nav)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-order]");
  if(!b)return;
  var n=b.dataset.order;
  document.getElementById("dlgTitle").textContent=n?"Ask about "+n:"Write your message";
  document.getElementById("dlgSub").textContent="Copy this message, then send it to us on Instagram.";
  document.getElementById("msg").value="Hi yarnity_nest! "+(n?"I would love to order: "+n+". ":"I would love to place an order. ")+"My preferred colours: \nDelivery city: ";
  dlg.showModal();
});
document.getElementById("closeBtn").onclick=function(){dlg.close()};
document.getElementById("copyBtn").onclick=function(){
  var t=document.getElementById("msg");
  t.select();
  try{(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(function(){toast("Message copied")},function(){document.execCommand("copy");toast("Message copied")})}catch(x){toast("Select the text and copy it")}
};
route();
