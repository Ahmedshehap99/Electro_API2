// ══════════════════════════════
// CONFIG
// ══════════════════════════════
const API = "https://localhost:44351/api";

let allProducts = [];
let filtered = [];
let currentPage = 1;
const perPage = 9;
let activeSort = "default";
let activeCategory = "all";
let activePriceMin = 0;
let activePriceMax = Infinity;

// ══════════════════════════════
// INIT
// ══════════════════════════════
window.onload = () => {
    loadTheme();
    updateCartCount();
    loadProducts();
};

// ══════════════════════════════
// LOAD PRODUCTS
// ══════════════════════════════
async function loadProducts() {
    const container = document.getElementById("products");

    // Skeleton
    container.innerHTML = Array(6).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line-sm"></div>
            <div class="skeleton skeleton-btn"></div>
        </div>`).join("");

    try {
        const res = await fetch(`${API}/Products`);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        allProducts = data.map(mapProduct);
    } catch {
        allProducts = [];
        showToast("⚠️ Could not load products");
    }

    filtered = [...allProducts];
    buildCategories();
    renderProducts();
    updateCartCount();
}

// ══════════════════════════════
// MAP PRODUCT
// ══════════════════════════════
function mapProduct(p) {
    return {
        id: p?.productId ?? p?.id ?? 0,
        name: p?.name ?? p?.Name ?? "Unnamed",
        price: Number(p?.unitPrice ?? p?.price ?? 0),
        imageUrl: p?.imageUrl ?? p?.ImageUrl ?? p?.image ?? "",
        category: p?.categoryName ?? p?.category ?? "",
        description: p?.description ?? "",
        stock: p?.stockQuantity ?? 0,
    };
}

// ══════════════════════════════
// BUILD CATEGORIES
// ══════════════════════════════
function buildCategories() {
    const cats = ["all", ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    const list = document.getElementById("categoryList");
    if (!list) return;

    list.innerHTML = cats.map(cat => `
        <li class="${cat === "all" ? "active" : ""}"
            onclick="filterByCategory('${cat}', this)">
            ${cat === "all" ? "All Products" : cat}
            <span class="count">
                ${cat === "all"
            ? allProducts.length
            : allProducts.filter(p => p.category === cat).length}
            </span>
        </li>`).join("");
}

// ══════════════════════════════
// RENDER PRODUCTS
// ══════════════════════════════
function renderProducts() {
    const container = document.getElementById("products");
    const start = (currentPage - 1) * perPage;
    const page = filtered.slice(start, start + perPage);
    const total = filtered.length;

    // Count
    const countEl = document.getElementById("productsCount");
    if (countEl) {
        countEl.textContent = total === 0
            ? "No products found"
            : `Showing ${start + 1}–${Math.min(start + page.length, total)} of ${total} products`;
    }

    if (page.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="icon">◈</div>
                <p>No products match your filters</p>
                <button onclick="resetFilters()">Reset Filters</button>
            </div>`;
        renderPagination();
        return;
    }

    container.innerHTML = page.map((p, i) => {
        const img = p.imageUrl && p.imageUrl.trim()
            ? p.imageUrl
            : `https://placehold.co/400x400/1e1e1e/888?text=${encodeURIComponent(p.name)}`;

        return `
        <div class="card" style="animation-delay:${i * 0.06}s"
             onclick="goToProduct(${p.id})">
            <div class="card-img-wrap">
                <img src="${img}" alt="${p.name}"
                     onerror="this.src='https://placehold.co/400x400/1e1e1e/888?text=No+Image'"/>
                <div class="card-overlay">
                    <button class="overlay-btn" title="Wishlist"
                        onclick="event.stopPropagation();addToWishlist(${p.id})">♡</button>
                    <button class="overlay-btn" title="Quick View"
                        onclick="event.stopPropagation();quickView(${p.id})">⊙</button>
                    <button class="overlay-btn" title="Add to Cart"
                        onclick="event.stopPropagation();addToCart(${p.id})">⊕</button>
                </div>
            </div>
            <div class="card-body">
                ${p.category ? `<p class="card-category">${p.category}</p>` : ""}
                <h3 class="card-name">${p.name}</h3>
                <p class="card-price">${Number(p.price).toLocaleString()} EGP</p>
                <button class="card-add" onclick="event.stopPropagation();addToCart(${p.id})">
                    Add to Cart
                </button>
            </div>
        </div>`;
    }).join("");

    renderPagination();
}

// ══════════════════════════════
// PAGINATION
// ══════════════════════════════
function renderPagination() {
    const total = Math.ceil(filtered.length / perPage);
    const pg = document.getElementById("pagination");
    if (!pg) return;
    if (total <= 1) { pg.innerHTML = ""; return; }

    let html = `<button class="page-arrow" onclick="goPage(${currentPage - 1})"
        ${currentPage === 1 ? 'disabled' : ""}>‹</button>`;

    for (let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === currentPage ? "active" : ""}"
            onclick="goPage(${i})">${i}</button>`;
    }

    html += `<button class="page-arrow" onclick="goPage(${currentPage + 1})"
        ${currentPage === total ? 'disabled' : ""}>›</button>`;

    pg.innerHTML = html;
}

function goPage(n) {
    const total = Math.ceil(filtered.length / perPage);
    if (n < 1 || n > total) return;
    currentPage = n;
    renderProducts();
    window.scrollTo({ top: 300, behavior: "smooth" });
}

// ══════════════════════════════
// FILTERS
// ══════════════════════════════
function applyFilters() {
    const q = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";

    filtered = allProducts.filter(p => {
        const matchSearch = !q || p.name.toLowerCase().includes(q)
            || p.category.toLowerCase().includes(q);
        const matchCategory = activeCategory === "all" || p.category === activeCategory;
        const matchPrice = p.price >= activePriceMin && p.price <= activePriceMax;
        return matchSearch && matchCategory && matchPrice;
    });

    if (activeSort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    else if (activeSort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    else if (activeSort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));

    currentPage = 1;
    renderProducts();
}

function filterProducts() { applyFilters(); }

function filterByCategory(cat, el) {
    document.querySelectorAll("#categoryList li").forEach(l => l.classList.remove("active"));
    el.classList.add("active");
    activeCategory = cat;
    applyFilters();
}

function filterByPrice(min, max, el) {
    const alreadyActive = el.classList.contains("active");
    document.querySelectorAll(".price-option").forEach(o => o.classList.remove("active"));
    if (alreadyActive) {
        activePriceMin = 0;
        activePriceMax = Infinity;
    } else {
        el.classList.add("active");
        activePriceMin = min;
        activePriceMax = max;
    }
    applyFilters();
}

function sortProducts(val) {
    activeSort = val;
    applyFilters();
}

function resetFilters() {
    activeCategory = "all";
    activePriceMin = 0;
    activePriceMax = Infinity;
    activeSort = "default";

    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.querySelector(".sort-select");
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "default";

    document.querySelectorAll("#categoryList li").forEach((l, i) =>
        l.classList.toggle("active", i === 0));
    document.querySelectorAll(".price-option").forEach(o =>
        o.classList.remove("active"));

    filtered = [...allProducts];
    currentPage = 1;
    renderProducts();
}

// ══════════════════════════════
// CART
// ══════════════════════════════
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

function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// ══════════════════════════════
// TOAST
// ══════════════════════════════
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// ══════════════════════════════
// THEME
// ══════════════════════════════
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById("themeBtn");
    const isLight = body.classList.toggle("light");
    if (btn) btn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
    const saved = localStorage.getItem("theme");
    const btn = document.getElementById("themeBtn");
    if (saved === "light") {
        document.body.classList.add("light");
        if (btn) btn.textContent = "☀️";
    }
}

// ══════════════════════════════
// LOGOUT
// ══════════════════════════════
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}