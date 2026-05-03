// =====================
// CONFIG
// =====================
const API = "https://localhost:44351/api";
let currentProduct = null;
let quantity = 1;

// =====================
// LOAD PRODUCT ON PAGE LOAD
// =====================
window.onload = async () => {
    loadTheme();
    updateCartCount();

    // Get product ID from URL => ?id=5
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    if (!productId) {
        showToast("⚠️ No product selected!");
        return;
    }

    await loadProduct(productId);
    await loadRelated();
};

// =====================
// LOAD PRODUCT
// =====================
async function loadProduct(id) {
    try {
        const res = await fetch(`${API}/Products/${id}`);
        if (!res.ok) throw new Error("Not found");
        const p = await res.json();
        currentProduct = p;
        renderProduct(p);
    } catch {
        showToast("⚠️ Product not found!");
    }
}

// =====================
// RENDER PRODUCT
// =====================
function renderProduct(p) {
    const name = p.name ?? p.Name ?? "Unknown Product";
    const price = Number(p.unitPrice ?? p.price ?? 0);
    const stock = p.stockQuantity ?? p.StockQuantity ?? 0;
    const category = p.categoryName ?? p.category ?? "—";
    const desc = p.description ?? p.Description ?? "No description available for this product.";
    const addedDate = p.addedDate ? new Date(p.addedDate).toLocaleDateString() : "—";
    const productId = p.productId ?? p.id ?? "—";
    const imageUrl = p.imageUrl ?? p.ImageUrl ?? "";

    // Breadcrumb
    document.getElementById("breadcrumbName").textContent = name;
    document.title = `Electro — ${name}`;

    // Main image
    const mainImg = document.getElementById("mainImg");
    mainImg.src = imageUrl || `https://placehold.co/600x600/1e1e1e/888?text=${encodeURIComponent(name)}`;
    mainImg.alt = name;

    // Thumbnails — show main image + 3 placeholder angles
    const thumbRow = document.getElementById("thumbRow");
    const thumbImgs = [
        imageUrl || `https://placehold.co/200x200/1e1e1e/888?text=${encodeURIComponent(name)}`,
        `https://placehold.co/200x200/222/666?text=View+2`,
        `https://placehold.co/200x200/1a1a1a/555?text=View+3`,
        `https://placehold.co/200x200/252525/444?text=View+4`,
    ];

    thumbRow.innerHTML = thumbImgs.map((src, i) => `
    <div class="thumb ${i === 0 ? 'active' : ''}" onclick="switchImage('${src}', this)">
      <img src="${src}" alt="view ${i + 1}" onerror="this.src='https://placehold.co/200x200/1e1e1e/888?text=No+Image'"/>
    </div>
  `).join("");

    // Info fields
    document.getElementById("productCategory").textContent = category;
    document.getElementById("productName").textContent = name;
    document.getElementById("productPrice").textContent = price.toLocaleString() + " EGP";
    document.getElementById("productDesc").textContent = desc;
    document.getElementById("productStock").textContent = stock > 0 ? `${stock} in stock` : "Out of stock";
    document.getElementById("productCatMeta").textContent = category;
    document.getElementById("productDate").textContent = addedDate;
    document.getElementById("productId").textContent = `#${productId}`;

    // Old price (show 15% higher as "original")
    const oldPrice = Math.round(price * 1.15);
    document.getElementById("productOldPrice").textContent = oldPrice.toLocaleString() + " EGP";

    const discount = document.getElementById("badgeDiscount");
    discount.textContent = "15% OFF";
    discount.style.display = "inline-block";

    // Specs table
    document.getElementById("specName").textContent = name;
    document.getElementById("specCategory").textContent = category;
    document.getElementById("specPrice").textContent = price.toLocaleString() + " EGP";
    document.getElementById("specStock").textContent = stock;
    document.getElementById("specDate").textContent = addedDate;
    document.getElementById("specId").textContent = `#${productId}`;

    // Description tab
    document.getElementById("tabDesc").textContent = desc;

    // Stock badge
    if (stock === 0) {
        document.querySelector(".btn-cart").textContent = "Out of Stock";
        document.querySelector(".btn-cart").disabled = true;
        document.querySelector(".btn-cart").style.opacity = "0.5";
    }
}

// =====================
// SWITCH IMAGE
// =====================
function switchImage(src, el) {
    document.getElementById("mainImg").src = src;
    document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
}

// =====================
// QUANTITY
// =====================
function changeQty(delta) {
    quantity = Math.max(1, quantity + delta);
    document.getElementById("qtyVal").textContent = quantity;
}

// =====================
// ADD TO CART
// =====================
function addToCart() {
    if (!currentProduct) return;

    const id = currentProduct.productId ?? currentProduct.id;
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    for (let i = 0; i < quantity; i++) cart.push(id);

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    showToast(`🛒 "${currentProduct.name}" × ${quantity} added to cart!`);

    // Animate button
    const btn = document.querySelector(".btn-cart");
    btn.textContent = "✅ Added!";
    setTimeout(() => btn.textContent = "🛒 Add to Cart", 2000);
}

// =====================
// WISHLIST
// =====================
function addToWishlist() {
    if (!currentProduct) return;
    showToast(`♡ "${currentProduct.name}" saved to wishlist!`);
    const btn = document.querySelector(".btn-wish");
    btn.textContent = "❤️";
    btn.style.color = "var(--error)";
}

// =====================
// LOAD RELATED PRODUCTS
// =====================
async function loadRelated() {
    try {
        const res = await fetch(`${API}/Products`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        // Pick 4 random products (excluding current)
        const currentId = currentProduct?.productId ?? currentProduct?.id;
        const others = data.filter(p => (p.productId ?? p.id) !== currentId);
        const picked = others.sort(() => Math.random() - 0.5).slice(0, 4);

        const grid = document.getElementById("relatedGrid");
        grid.innerHTML = picked.map(p => {
            const id = p.productId ?? p.id;
            const name = p.name ?? "Product";
            const price = Number(p.unitPrice ?? 0).toLocaleString();
            const img = p.imageUrl ?? `https://placehold.co/300x300/1e1e1e/888?text=${encodeURIComponent(name)}`;
            const cat = p.categoryName ?? "";
            return `
        <div class="rel-card" onclick="goToProduct(${id})">
          <img class="rel-img" src="${img}" alt="${name}" onerror="this.src='https://placehold.co/300x300/1e1e1e/888?text=No+Image'"/>
          <div class="rel-body">
            <p class="rel-cat">${cat}</p>
            <p class="rel-name">${name}</p>
            <p class="rel-price">${price} EGP</p>
          </div>
        </div>`;
        }).join("");

    } catch {
        document.getElementById("relatedGrid").innerHTML = "<p style='color:var(--muted)'>Could not load related products.</p>";
    }
}

// =====================
// GO TO PRODUCT
// =====================
function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// =====================
// TABS
// =====================
function showTab(tabId, el) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`tab-${tabId}`).classList.add("active");
    el.classList.add("active");
}

// =====================
// CART COUNT
// =====================
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const el = document.getElementById("cartCount");
    if (el) el.textContent = cart.length;
}

// =====================
// TOAST
// =====================
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// =====================
// THEME
// =====================
function toggleTheme() {
    document.body.classList.toggle("light");
    const btn = document.getElementById("themeBtn");
    const isLight = document.body.classList.contains("light");
    btn.textContent = isLight ? "☀️" : "🌙";
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

// =====================
// LOGOUT
// =====================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "../login.html";
}