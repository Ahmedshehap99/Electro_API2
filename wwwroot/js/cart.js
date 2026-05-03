const API = "https://localhost:44351/api";

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let allProducts = [];   // full product list from API
let cartData = [];   // [{id, qty}]

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.onload = async () => {
    loadTheme();
    cartData = loadCartData();
    updateCartCount();

    if (cartData.length === 0) {
        showEmpty();
        return;
    }

    await fetchProducts();
    renderCart();
};

/* ══════════════════════════════════════════
   LOAD CART FROM LOCALSTORAGE
   Cart is stored as array of product IDs (can repeat)
   We convert to [{id, qty}]
══════════════════════════════════════════ */
function loadCartData() {
    const raw = JSON.parse(localStorage.getItem("cart")) || [];
    const map = {};
    raw.forEach(id => {
        map[id] = (map[id] || 0) + 1;
    });
    return Object.entries(map).map(([id, qty]) => ({ id: Number(id), qty }));
}

function saveCartToStorage() {
    const raw = [];
    cartData.forEach(item => {
        for (let i = 0; i < item.qty; i++) raw.push(item.id);
    });
    localStorage.setItem("cart", JSON.stringify(raw));
    updateCartCount();
}

/* ══════════════════════════════════════════
   FETCH PRODUCTS FROM API
══════════════════════════════════════════ */
async function fetchProducts() {
    try {
        const res = await fetch(`${API}/Products`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        allProducts = data.map(p => ({
            id: p?.productId ?? p?.id ?? 0,
            name: p?.name ?? "Unknown",
            price: Number(p?.unitPrice ?? p?.price ?? 0),
            imageUrl: p?.imageUrl ?? p?.ImageUrl ?? "",
            category: p?.categoryName ?? p?.category ?? "",
        }));
    } catch {
        // fallback: use cart IDs with placeholder data
        allProducts = cartData.map(c => ({
            id: c.id, name: `Product #${c.id}`, price: 0, imageUrl: "", category: ""
        }));
    }
}

/* ══════════════════════════════════════════
   RENDER CART
══════════════════════════════════════════ */
function renderCart() {
    const container = document.getElementById("cartItems");
    const emptyEl = document.getElementById("cartEmpty");
    const actionsEl = document.getElementById("cartActions");

    if (cartData.length === 0) {
        showEmpty();
        return;
    }

    emptyEl.style.display = "none";
    actionsEl.style.display = "flex";

    container.innerHTML = cartData.map((item, i) => {
        const product = allProducts.find(p => p.id === item.id);
        if (!product) return "";

        const img = product.imageUrl && product.imageUrl.trim()
            ? product.imageUrl
            : `https://placehold.co/200x200/0e1318/4a5568?text=${encodeURIComponent(product.name)}`;
        const subtotal = (product.price * item.qty).toLocaleString();
        const price = product.price.toLocaleString();

        return `
        <div class="cart-item" id="item-${item.id}" style="animation-delay:${i * 0.07}s">

            <!-- Product Info -->
            <div class="cart-item-product">
                <div class="cart-item-img">
                    <img src="${img}" alt="${product.name}"
                         onerror="this.src='https://placehold.co/200x200/0e1318/4a5568?text=No+Image'" />
                </div>
                <div class="cart-item-info">
                    <h4>${product.name}</h4>
                    <span class="item-price">${price} EGP</span>
                </div>
            </div>

            <!-- Quantity -->
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
            </div>

            <!-- Subtotal + Remove -->
            <div class="cart-item-subtotal">
                <span class="item-subtotal">${subtotal} EGP</span>
                <button class="remove-btn" onclick="removeItem(${item.id})" title="Remove">✕</button>
            </div>

        </div>`;
    }).join("");

    updateTotals();
}

/* ══════════════════════════════════════════
   CHANGE QUANTITY
══════════════════════════════════════════ */
function changeQty(id, delta) {
    const item = cartData.find(c => c.id === id);
    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {
        removeItem(id);
        return;
    }

    saveCartToStorage();
    renderCart();
}

/* ══════════════════════════════════════════
   REMOVE ITEM
══════════════════════════════════════════ */
function removeItem(id) {
    cartData = cartData.filter(c => c.id !== id);
    saveCartToStorage();

    if (cartData.length === 0) {
        showEmpty();
    } else {
        renderCart();
    }

    showToast("✕ Item removed from cart");
}

/* ══════════════════════════════════════════
   CLEAR CART
══════════════════════════════════════════ */
function clearCart() {
    cartData = [];
    localStorage.removeItem("cart");
    updateCartCount();
    showEmpty();
    showToast("🗑 Cart cleared");
}

/* ══════════════════════════════════════════
   UPDATE TOTALS
══════════════════════════════════════════ */
function updateTotals() {
    let total = 0;
    cartData.forEach(item => {
        const product = allProducts.find(p => p.id === item.id);
        if (product) total += product.price * item.qty;
    });

    document.getElementById("subtotal").textContent = total.toLocaleString() + " EGP";
    document.getElementById("total").textContent = total.toLocaleString() + " EGP";
}

/* ══════════════════════════════════════════
   SHOW EMPTY STATE
══════════════════════════════════════════ */
function showEmpty() {
    document.getElementById("cartItems").innerHTML = "";
    document.getElementById("cartEmpty").style.display = "block";
    document.getElementById("cartActions").style.display = "none";
    document.getElementById("subtotal").textContent = "0 EGP";
    document.getElementById("total").textContent = "0 EGP";
}

/* ══════════════════════════════════════════
   CHECKOUT
══════════════════════════════════════════ */
function checkout() {
    if (cartData.length === 0) {
        showToast("⚠ Your cart is empty!");
        return;
    }
    showToast("✓ Proceeding to checkout...");
    // TODO: redirect to checkout page
    // window.location.href = "checkout.html";
}

/* ══════════════════════════════════════════
   CART COUNT (navbar)
══════════════════════════════════════════ */
function updateCartCount() {
    const raw = JSON.parse(localStorage.getItem("cart")) || [];
    const el = document.getElementById("cartCount");
    if (el) el.textContent = raw.length;
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ══════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════ */
function toggleTheme() {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    document.getElementById("theme-icon").textContent = isLight ? "🌙" : "☀️";
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.classList.add("light");
        const icon = document.getElementById("theme-icon");
        if (icon) icon.textContent = "🌙";
    }
}

/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
function logout() {
    localStorage.removeItem("token");
    window.location.href = "../login.html";
}