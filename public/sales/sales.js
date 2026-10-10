/* WorkflowStacks digital products — shared sales-page behaviour for /get/<slug>.
   Reads the product config from <script type="application/json" id="product-config">
   (written by lib/digital-products/render.js), so one script serves every product.

   Measurement: loads the site's Google Tag Manager container when gtmId is set
   (GA4 and the Meta Pixel are configured inside GTM). Events always go to
   window.dataLayer, named after GA4 ecommerce so GTM can map them to Meta:
     view_item        page view of a product      -> Meta ViewContent
     begin_checkout   a buy button was clicked    -> Meta InitiateCheckout
     whatsapp_open    buy via WhatsApp (no checkout URL yet)
     demo_view, faq_open   engagement on the page
   The Purchase event fires on the checkout platform, not here. */
(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    var o = { event: name };
    if (params) for (var k in params) o[k] = params[k];
    window.dataLayer.push(o);
  }
  function loadGtm(id) {
    if (!/^GTM-[A-Z0-9]{4,12}$/.test(id || "")) return;
    (function (w, d, s, l, i) { w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" }); var f = d.getElementsByTagName(s)[0], j = d.createElement(s); j.async = true; j.src = "https://www.googletagmanager.com/gtm.js?id=" + i; f.parentNode.insertBefore(j, f); })(window, document, "script", "dataLayer", id);
  }

  /* Store index (/get): list view and which product card was opened. */
  var store = document.getElementById("store-config");
  if (store) {
    var sc;
    try { sc = JSON.parse(store.textContent); } catch (e) { return; }
    loadGtm(sc.gtmId);
    track("view_item_list", { ecommerce: { item_list_name: "AI Kits", items: sc.items } });
    Array.prototype.forEach.call(document.querySelectorAll(".pcard[data-item]"), function (a) {
      a.addEventListener("click", function () { track("select_item", { ecommerce: { item_list_name: "AI Kits", items: sc.items.filter(function (x) { return x.item_id === a.getAttribute("data-item"); }) } }); });
    });
    return;
  }

  var el = document.getElementById("product-config");
  if (!el) return;
  var cfg;
  try { cfg = JSON.parse(el.textContent); } catch (e) { return; }
  document.documentElement.classList.add("js");
  loadGtm(cfg.gtmId);

  var item = { item_id: cfg.slug, item_name: cfg.name, price: cfg.price, quantity: 1 };
  var ecommerce = { currency: cfg.currency, value: cfg.price, items: [item] };
  track("view_item", { ecommerce: ecommerce });

  /* Carry the ad's UTM / click ids through to the checkout so a sale can be tied
     back to the campaign. First touch wins for the session. */
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
  var attr = {};
  try { attr = JSON.parse(sessionStorage.getItem("ws_sales_attr") || "{}"); } catch (e) { attr = {}; }
  var qs = new URLSearchParams(window.location.search);
  if (!Object.keys(attr).length) {
    KEYS.forEach(function (k) { var v = qs.get(k); if (v) attr[k] = v.slice(0, 100); });
    try { sessionStorage.setItem("ws_sales_attr", JSON.stringify(attr)); } catch (e) {}
  }

  function checkoutHref() {
    var u;
    try { u = new URL(cfg.checkoutUrl); } catch (e) { return ""; }
    Object.keys(attr).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, attr[k]); });
    return u.toString();
  }
  function whatsappHref() {
    var text = cfg.whatsappText + (attr.utm_campaign ? " (ref: " + attr.utm_campaign + ")" : "");
    return "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(text);
  }
  var mode = cfg.checkoutUrl ? "checkout" : "whatsapp";
  var href = mode === "checkout" ? checkoutHref() : whatsappHref();
  if (!href) { mode = "whatsapp"; href = whatsappHref(); }

  Array.prototype.forEach.call(document.querySelectorAll("[data-buy]"), function (a) {
    a.setAttribute("href", href);
    if (mode === "whatsapp") { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener"); }
    a.addEventListener("click", function () {
      track("begin_checkout", { ecommerce: ecommerce, placement: a.getAttribute("data-buy"), method: mode });
      if (mode === "whatsapp") track("whatsapp_open", { product: cfg.slug, placement: a.getAttribute("data-buy") });
    });
  });
  /* Microcopy must match how the purchase actually happens. */
  Array.prototype.forEach.call(document.querySelectorAll("[data-mode-text]"), function (n) {
    var t = n.getAttribute(mode === "checkout" ? "data-checkout-text" : "data-whatsapp-text");
    if (t) n.textContent = t;
  });

  /* Hero chat: play the sequence once it is on screen. */
  var seq = document.querySelector(".seq");
  if (seq) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { seq.classList.add("play"); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(seq);
    } else { seq.classList.add("play"); }
  }

  /* Demo tabs (WAI-ARIA tabs pattern). */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function activate(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      var p = document.getElementById(x.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    if (focus) t.focus();
    track("demo_view", { product: cfg.slug, demo: t.getAttribute("data-demo") });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { activate(t, false); });
    t.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      activate(tabs[(n + tabs.length) % tabs.length], true);
    });
  });

  /* FAQ opens: which objections people actually have. */
  Array.prototype.forEach.call(document.querySelectorAll(".faq details"), function (d) {
    d.addEventListener("toggle", function () { if (d.open) track("faq_open", { product: cfg.slug, q: (d.querySelector("summary") || {}).textContent }); });
  });

  /* Sticky buy bar on phones: shown once the hero button has scrolled away,
     hidden again while the offer box (which has its own button) is on screen. */
  var bar = document.querySelector(".sticky"), heroCta = document.querySelector('[data-buy="hero"]'), offer = document.getElementById("offer");
  if (bar && heroCta && "IntersectionObserver" in window) {
    var heroGone = false, offerOn = false;
    var barLink = bar.querySelector("a");
    function sync() {
      var show = heroGone && !offerOn;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", String(!show));
      if (barLink) barLink.tabIndex = show ? 0 : -1;
    }
    new IntersectionObserver(function (es) { heroGone = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; sync(); }).observe(heroCta);
    if (offer) new IntersectionObserver(function (es) { offerOn = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(offer);
  }
})();
