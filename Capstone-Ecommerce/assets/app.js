/* assets/app.js
   Shared script for Capstone-Ecommerce
*/
(function () {
  // ---------- sample product data ----------
  const PRODUCTS = [
    { id: 1, name: "Smartphone X1", category: "electronics", price: 299, rating: 4.5, img: "https://picsum.photos/400/300?random=1" },
    { id: 2, name: "Laptop Pro", category: "electronics", price: 899, rating: 4.8, img: "https://picsum.photos/400/300?random=2" },
    { id: 3, name: "Headphones", category: "electronics", price: 79, rating: 4.1, img: "https://picsum.photos/400/300?random=3" },
    { id: 4, name: "Denim Jeans", category: "fashion", price: 49, rating: 4.0, img: "https://picsum.photos/400/300?random=4" },
    { id: 5, name: "T-Shirt", category: "fashion", price: 19, rating: 3.9, img: "https://picsum.photos/400/300?random=5" },
    { id: 6, name: "Classic Watch", category: "accessories", price: 120, rating: 4.3, img: "https://picsum.photos/400/300?random=6" }
  ];

  // ---------- utilities ----------
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function formatPrice(n){ return "$" + n.toFixed(2); }

  // ---------- CART (persistent via localStorage) ----------
  const STORAGE_KEY = "capstone_cart_v1";
  function getCart(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); updateCartCounts(); }
  function addToCart(productId, qty = 1){
    const cart = getCart();
    const existing = cart.find(i => i.id === productId);
    if(existing) { existing.qty += qty; }
    else { cart.push({ id: productId, qty: qty }); }
    saveCart(cart);
  }
  function updateQty(productId, qty){
    let cart = getCart();
    cart = cart.map(i => i.id === productId ? { ...i, qty } : i).filter(i => i.qty > 0);
    saveCart(cart);
  }
  function removeFromCart(productId){
    let cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);
  }
  function clearCart(){ localStorage.removeItem(STORAGE_KEY); updateCartCounts(); }

  // update cart counters in nav (multiple pages)
  function updateCartCounts(){
    const cnt = getCart().reduce((s,i)=>s+i.qty,0);
    qsa("#cart-count, #cart-count-2, #cart-count-3, #cart-count-4, #cart-count-5").forEach(el => {
      if(el) el.textContent = cnt;
    });
  }

  // ---------- PRODUCTS PAGE ----------
  function initProductsPage(){
    const productListEl = qs("#productList");
    const catSelect = qs("#filter-category");
    const priceSelect = qs("#filter-price");
    const sortSelect = qs("#sort-option");
    const searchInput = qs("#search-input");
    const clearBtn = qs("#clear-filters");

    // populate categories
    const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p=>p.category)))];
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c[0].toUpperCase() + c.slice(1);
      catSelect.appendChild(opt);
    });

    // render
    function renderProducts(list){
      productListEl.innerHTML = "";
      // if empty
      if(list.length === 0){
        productListEl.innerHTML = "<p style='grid-column:1/-1;color:#34495e'>No products found.</p>";
        return;
      }
      list.forEach(p => {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <h3>${p.name}</h3>
          <p>${p.category}</p>
          <div class="price">${formatPrice(p.price)}</div>
          <div class="card-actions">
            <button class="add-cart">Add</button>
            <button class="view-btn">Details</button>
          </div>
        `;
        // add to cart
        card.querySelector(".add-cart").addEventListener("click", ()=> {
          addToCart(p.id, 1);
          alert(`${p.name} added to cart`);
        });
        // view details simple modal (alert for simplicity)
        card.querySelector(".view-btn").addEventListener("click", ()=> {
          alert(`${p.name}\n\nPrice: ${formatPrice(p.price)}\nRating: ${p.rating}`);
        });
        productListEl.appendChild(card);
      });
    }

    // filter/sort/search chain
    function applyFilters(){
      const category = catSelect.value;
      const priceRange = priceSelect.value;
      const sort = sortSelect.value;
      const q = (searchInput.value || "").trim().toLowerCase();

      let list = PRODUCTS.slice();

      if(category !== "all") list = list.filter(p => p.category === category);

      if(priceRange !== "all"){
        const [min,max] = priceRange.split("-").map(Number);
        if(max) list = list.filter(p => p.price >= min && p.price <= max);
        else list = list.filter(p => p.price >= min);
      }

      if(q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));

      if(sort === "priceLow") list.sort((a,b)=>a.price-b.price);
      if(sort === "priceHigh") list.sort((a,b)=>b.price-a.price);
      if(sort === "rating") list.sort((a,b)=>b.rating-a.rating);

      renderProducts(list);
    }

    // event listeners
    [catSelect, priceSelect, sortSelect].forEach(el => el.addEventListener("change", applyFilters));
    searchInput.addEventListener("input", debounce(applyFilters, 250));
    clearBtn.addEventListener("click", ()=>{
      catSelect.value = "all"; priceSelect.value = "all"; sortSelect.value = "default"; searchInput.value = "";
      applyFilters();
    });

    applyFilters();
  }

  // ---------- CART PAGE ----------
  function initCartPage(){
    const cartArea = qs("#cart-area");
    const cartSummary = qs("#cart-summary");

    function renderCart(){
      const cart = getCart();
      if(cart.length === 0){
        cartArea.innerHTML = "<p>Your cart is empty. <a href='products.html'>Start shopping</a></p>";
        cartSummary.innerHTML = "";
        updateCartCounts();
        return;
      }
      // join details
      const detailed = cart.map(item => {
        const p = PRODUCTS.find(x=>x.id===item.id);
        return { ...p, qty: item.qty, subtotal: p.price * item.qty };
      });

      cartArea.innerHTML = "";
      detailed.forEach(d => {
        const node = document.createElement("div");
        node.className = "cart-item";
        node.innerHTML = `
          <img src="${d.img}" alt="${d.name}" loading="lazy">
          <div class="meta">
            <h4>${d.name}</h4>
            <p class="muted">${d.category} • ${formatPrice(d.price)}</p>
            <div class="qty-controls">
              <button data-action="dec">-</button>
              <span>${d.qty}</span>
              <button data-action="inc">+</button>
            </div>
          </div>
          <div>
            <p><strong>${formatPrice(d.subtotal)}</strong></p>
            <button class="btn btn-outline small remove" data-id="${d.id}">Remove</button>
          </div>
        `;
        cartArea.appendChild(node);

        // quantity buttons
        node.querySelector("[data-action='inc']").addEventListener("click", ()=>{
          updateQty(d.id, d.qty+1);
          renderCart();
        });
        node.querySelector("[data-action='dec']").addEventListener("click", ()=>{
          const nq = d.qty - 1;
          if(nq <= 0) removeFromCart(d.id);
          else updateQty(d.id, nq);
          renderCart();
        });
        node.querySelector(".remove").addEventListener("click", ()=> {
          removeFromCart(d.id);
          renderCart();
        });
      });

      // summary
      const total = detailed.reduce((s,d)=>s+d.subtotal,0);
      cartSummary.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>Items:</strong> ${detailed.reduce((s,d)=>s+d.qty,0)}</div>
          <div><strong>Total:</strong> ${formatPrice(total)}</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="checkout" class="btn">Checkout</button>
          <button id="clear-cart" class="btn btn-outline">Clear Cart</button>
        </div>
      `;
      qs("#checkout").addEventListener("click", ()=> {
        // simulate checkout
        alert("Checkout simulated — thank you!");
        clearCart();
        renderCart();
      });
      qs("#clear-cart").addEventListener("click", ()=> {
        if(confirm("Clear all items?")){ clearCart(); renderCart(); }
      });
      updateCartCounts();
    }

    renderCart();
  }

  // ---------- CONTACT FORM ----------
  function initContactForm(){
    const form = qs("#contactForm");
    if(!form) return;
    const feedback = qs("#contact-feedback");
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const name = qs("#cname").value.trim();
      const email = qs("#cemail").value.trim();
      const msg = qs("#cmsg").value.trim();
      if(!name || !email || !msg){ feedback.textContent = "All fields required."; feedback.style.color="crimson"; return; }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ feedback.textContent="Enter a valid email."; feedback.style.color="crimson"; return; }
      // "send" - here we just show success and reset
      feedback.textContent = "Message sent — thank you!";
      feedback.style.color = "green";
      form.reset();
    });
  }

  // ---------- small helpers ----------
  function debounce(fn, wait=200){
    let t;
    return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait); };
  }

  // ---------- init routine depending on page ----------
  function init(){
    updateCartCounts();

    const path = location.pathname.split("/").pop() || "index.html";

    if(path === "products.html"){
      initProductsPage();
    } else if(path === "cart.html"){
      initCartPage();
    } else if(path === "contact.html"){
      initContactForm();
    } else {
      // index/about pages - nothing special
    }

    // Accessibility: keyboard shortcut "c" to go to cart
    document.addEventListener("keydown", (e)=> {
      if(e.key === "c" && (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA")) {
        location.href = "cart.html";
      }
    });
  }

  // run on DOM ready
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
