const API = "https://localhost:44351/api";

const DEMO_PRODUCTS = [
    { id: 1, name: "Pink Headphone", price: 1300, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80", category: "Accessories", brand: "JBL" },
    { id: 2, name: "iPhone 16", price: 130000, imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&q=80", category: "Phones", brand: "Apple" },
    { id: 3, name: "Samsung Watch", price: 13000, imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80", category: "Watches", brand: "Samsung" },
    { id: 4, name: "iPhone 17", price: 190000, imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&q=80", category: "Phones", brand: "Apple" },
    { id: 5, name: "iPad 12 Pro", price: 18000, imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80", category: "Tablets", brand: "Apple" },
    { id: 6, name: "Samsung Watch Pro", price: 2800, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80", category: "Watches", brand: "Samsung" },
    { id: 7, name: "AirPods 2 Pro", price: 2500, imageUrl: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=500&q=80", category: "Accessories", brand: "Apple" },
    { id: 8, name: "Galaxy S24 Ultra", price: 85000, imageUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80", category: "Phones", brand: "Samsung" },
    { id: 9, name: "Sony WH-1000XM5", price: 8500, imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80", category: "Accessories", brand: "Sony" },
];

function mapProduct(p) {
    return {
        id: p?.productId ?? p?.id ?? 0,
        name: p?.name ?? p?.Name ?? "Unnamed Product",
        price: Number(p?.unitPrice ?? p?.price ?? 0),
        imageUrl: p?.imageUrl ?? p?.ImageUrl ?? p?.image ?? "",
        category: p?.categoryName ?? p?.category ?? "",
        brand: p?.brand ?? p?.Brand ?? "",
        isNew: p?.isNew ?? false,
    };
}

let allProducts = [];
let filtered = [];
let currentPage = 1;
const perPage = 9;
let activeSort = "default";
let activeCategory = "all";
let activeBrand = "";
let activePriceMin = 0;
let activePriceMax = Infinity;

window.onload = () => {
    updateCartCount();
    loadProducts();
};

async function loadProducts() {
    const container = document.getElementById("products");
    container.innerHTML = `
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div><div class="skeleton skeleton-btn"></div></div>`;
    try {
        const res = await fetch(`${API}/Products`);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        allProducts = data.map(mapProduct);
    } catch {
        allProducts = DEMO_PRODUCTS.map(mapProduct);
    }
    filtered = [...allProducts];
    buildDynamicCategories();
    buildDynamicBrands();
    renderProducts();
    updateCartCount();
}

function buildDynamicCategories() {
    const cats = ["all", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const list = document.getElementById("categoryList");
    list.innerHTML = cats.map(cat => `
        <li class="${cat === "all" ? "active" : ""}" onclick="filterByCategory('${cat}', this)">
            ${cat === "all" ? "All Products" : cat}
            <span class="count">${cat === "all" ? allProducts.length : allProducts.filter(p => p.category === cat).length}</span>
        </li>`).join("");
}

function buildDynamicBrands() {
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
    const list = document.getElementById("brandList");
    if (!list) return;
    list.innerHTML = brands.map(brand => `
        <li onclick="filterByBrand('${brand}', this)">
            ${brand}
            <span class="count">${allProducts.filter(p => p.brand === brand).length}</span>
        </li>`).join("");
}

function renderProducts() {
    const container = document.getElementById("products");
    const start = (currentPage - 1) * perPage;
    const page = filtered.slice(start, start + perPage);
    const total = filtered.length;

    document.getElementById("productsCount").textContent = total === 0
        ? "No products found"
        : `Showing ${start + 1}–${Math.min(start + page.length, total)} of ${total} products`;

    if (page.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="icon">◈</div>
                <p>No products match your filters</p>
                <button onclick="resetFilters()" style="margin-top:16px;padding:10px 24px;background:var(--gold);color:#000;border:none;cursor:pointer;font-family:'Outfit',sans-serif;letter-spacing:1px;text-transform:uppercase;font-size:11px;">Reset Filters</button>
            </div>`;
        renderPagination();
        return;
    }

    container.innerHTML = page.map((p, i) => {
        const img = p.imageUrl && p.imageUrl.trim() !== ""
            ? p.imageUrl
            : `https://placehold.co/400x400/1e1e1e/888?text=${encodeURIComponent(p.name)}`;
        const price = Number(p.price || 0).toLocaleString();
        return `
        <div class="card" style="animation-delay:${i * 0.06}s">
            <div class="card-img-wrap">
                ${p.isNew ? `<span class="card-badge">New</span>` : ""}
                <img src="${img}" alt="${p.name}" onerror="this.src='https://placehold.co/400x400/1e1e1e/888?text=No+Image'" />
                <div class="card-overlay">
                    <button class="overlay-btn" onclick="event.stopPropagation();addToWishlist(${p.id})" title="Wishlist">♡</button>
                    <button class="overlay-btn" onclick="event.stopPropagation();quickView(${p.id})" title="Quick View">⊙</button>
                    <button class="overlay-btn" onclick="event.stopPropagation();addToCart(${p.id})" title="Add to Cart">⊕</button>
                </div>
            </div>
            <div class="card-body">
                ${p.category ? `<p class="card-category">${p.category}</p>` : ""}
                <h3 class="card-name">${p.name}</h3>
                <p class="card-price">${price} EGP</p>
                <button class="card-add" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>`;
    }).join("");

    renderPagination();
}

function applyFilters() {
    const q = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
    filtered = allProducts.filter(p => {
        const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
        const matchCategory = activeCategory === "all" || p.category === activeCategory;
        const matchBrand = !activeBrand || p.brand === activeBrand;
        const matchPrice = p.price >= activePriceMin && p.price <= activePriceMax;
        return matchSearch && matchCategory && matchBrand && matchPrice;
    });
    if (activeSort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    else if (activeSort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    else if (activeSort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    currentPage = 1;
    renderProducts();
}

function resetFilters() {
    activeCategory = "all"; activeBrand = ""; activePriceMin = 0; activePriceMax = Infinity; activeSort = "default";
    document.getElementById("searchInput").value = "";
    document.querySelector(".sort-select").value = "default";
    document.querySelector(".sort-select").style.borderColor = "";
    document.querySelector(".sort-select").style.color = "";
    document.querySelectorAll("#categoryList li").forEach((l, i) => l.classList.toggle("active", i === 0));
    document.querySelectorAll("#brandList li").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".price-option").forEach(o => o.classList.remove("active"));
    filtered = [...allProducts];
    currentPage = 1;
    renderProducts();
}

function sortProducts(val) {
    activeSort = val;
    const select = document.querySelector(".sort-select");
    select.style.borderColor = val === "default" ? "" : "var(--gold)";
    select.style.color = val === "default" ? "" : "var(--gold)";
    applyFilters();
}

function filterProducts() { applyFilters(); }

function filterByCategory(cat, el) {
    document.querySelectorAll("#categoryList li").forEach(l => l.classList.remove("active"));
    el.classList.add("active");
    activeCategory = cat;
    applyFilters();
}

function filterByBrand(brand, el) {
    const alreadyActive = el.classList.contains("active");
    document.querySelectorAll("#brandList li").forEach(l => l.classList.remove("active"));
    activeBrand = alreadyActive ? "" : brand;
    if (!alreadyActive) el.classList.add("active");
    applyFilters();
}

function filterByPrice(min, max, el) {
    const alreadyActive = el.classList.contains("active");
    document.querySelectorAll(".price-option").forEach(o => o.classList.remove("active"));
    if (alreadyActive) { activePriceMin = 0; activePriceMax = Infinity; }
    else { el.classList.add("active"); activePriceMin = min; activePriceMax = max; }
    applyFilters();
}

function renderPagination() {
    const total = Math.ceil(filtered.length / perPage);
    const pg = document.getElementById("pagination");
    if (total <= 1) { pg.innerHTML = ""; return; }
    let html = `<button class="page-arrow" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:.3;cursor:default"' : ""}>‹</button>`;
    for (let i = 1; i <= total; i++) html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
    html += `<button class="page-arrow" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled style="opacity:.3;cursor:default"' : ""}>›</button>`;
    pg.innerHTML = html;
}

function goPage(n) {
    const total = Math.ceil(filtered.length / perPage);
    if (n < 1 || n > total) return;
    currentPage = n;
    renderProducts();
    window.scrollTo({ top: 350, behavior: "smooth" });
}

function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.push(id);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    showToast(`🛒 "${product?.name || "Item"}" added to cart!`);
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const el = document.getElementById("cartCount");
    if (el) el.textContent = cart.length;
}

function openCart() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    showToast(`◈ ${cart.length} item${cart.length !== 1 ? "s" : ""} in cart`);
}

function addToWishlist(id) {
    const p = allProducts.find(x => x.id === id);
    if (p) showToast(`♡ "${p.name}" saved to wishlist`);
}

function quickView(id) {
    const p = allProducts.find(x => x.id === id);
    if (p) showToast(`⊙ ${p.name} — ${p.price.toLocaleString()} EGP`);
}

let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "../login.html";
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("themeBtn");

    body.classList.toggle("light");

    // حفظ الوضع في localStorage
    if (body.classList.contains("light")) {
        localStorage.setItem("theme", "light");
        btn.textContent = "☀️";
    } else {
        localStorage.setItem("theme", "dark");
        btn.textContent = "🌙";
    }
}
window.onload = () => {
    updateCartCount();
    loadProducts();


    const savedTheme = localStorage.getItem("theme");
    const btn = document.getElementById("themeBtn");

    if (savedTheme === "light") {
        document.body.classList.add("light");
        if (btn) btn.textContent = "☀️";
    }
};
