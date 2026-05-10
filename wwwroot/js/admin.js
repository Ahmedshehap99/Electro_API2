// ══════════════════════════════
// CONFIG
// ══════════════════════════════
const API = "https://localhost:44351/api";
let token = localStorage.getItem("token") || "";
let allOrders = [];
let allProducts = [];

// ══════════════════════════════
// INIT
// ══════════════════════════════
window.onload = async () => {
    loadTheme();

    if (!token) { window.location.href = "/login.html"; return; }

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const name = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const isAdmin = payload["IsAdmin"];
        document.getElementById("adminName").textContent = name || "Admin";
        if (isAdmin !== "True") {
            alert("Access denied. Admins only!");
            window.location.href = "/login.html";
            return;
        }
    } catch (e) { window.location.href = "/login.html"; return; }

    await loadDashboard();
};

// ══════════════════════════════
// HEADERS
// ══════════════════════════════
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    };
}

// ══════════════════════════════
// SAFE FETCH — returns {ok, data, text}
// ══════════════════════════════
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, { ...options, headers: headers() });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch { }
        return { ok: res.ok, status: res.status, data, text };
    } catch (e) {
        return { ok: false, status: 0, data: null, text: e.message };
    }
}

// ══════════════════════════════
// SECTIONS
// ══════════════════════════════
function showSection(name, el) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById("sec-" + name).classList.add("active");
    el.classList.add("active");

    const titles = { dashboard: "Dashboard", products: "Products", orders: "Orders", customers: "Customers", categories: "Categories" };
    document.getElementById("pageTitle").textContent = titles[name] || name;

    if (name === "products") loadProducts();
    if (name === "orders") loadOrders();
    if (name === "customers") loadCustomers();
    if (name === "categories") loadCategories();
}

// ══════════════════════════════
// DASHBOARD
// ══════════════════════════════
async function loadDashboard() {
    const r = await apiFetch(`${API}/Admin/stats`);
    if (r.ok && r.data) {
        const s = r.data;
        document.getElementById("sTotalCustomers").textContent = s.totalCustomers ?? 0;
        document.getElementById("sTotalProducts").textContent = s.totalProducts ?? 0;
        document.getElementById("sTotalOrders").textContent = s.totalOrders ?? 0;
        document.getElementById("sTotalRevenue").textContent = Number(s.totalRevenue ?? 0).toLocaleString() + " EGP";
        document.getElementById("sPendingOrders").textContent = s.pendingOrders ?? 0;
        document.getElementById("sLowStock").textContent = s.lowStockProducts ?? 0;
    }

    // Recent orders
    const ro = await apiFetch(`${API}/Admin/orders`);
    if (ro.ok && ro.data) {
        const list = ro.data.slice(0, 5);
        document.getElementById("recentOrdersList").innerHTML = list.length
            ? list.map(o => `
                <div class="mini-row">
                    <span>#${o.orderId} — <strong>${o.customerName}</strong></span>
                    <span class="badge b-${(o.status || "pending").toLowerCase()}">${o.status}</span>
                </div>`).join("")
            : "<p style='color:var(--muted);font-size:13px;padding:10px 0'>No orders yet</p>";
    }

    // Low stock
    const rp = await apiFetch(`${API}/Products`);
    if (rp.ok && rp.data) {
        const low = rp.data.filter(p => (p.stockQuantity ?? 0) <= 5).slice(0, 5);
        document.getElementById("lowStockList").innerHTML = low.length
            ? low.map(p => `
                <div class="mini-row">
                    <strong>${p.name}</strong>
                    <span style="color:var(--danger);font-weight:700">${p.stockQuantity} left</span>
                </div>`).join("")
            : "<p style='color:var(--muted);font-size:13px;padding:10px 0'>✅ All products well stocked</p>";
    }
}

// ══════════════════════════════
// PRODUCTS
// ══════════════════════════════
async function loadProducts() {
    document.getElementById("prodTbody").innerHTML = `<tr><td colspan="7" class="tbl-loading">Loading...</td></tr>`;
    const r = await apiFetch(`${API}/Products`);
    if (!r.ok) { showToast("Failed to load products", "err"); return; }
    allProducts = r.data || [];
    renderProducts(allProducts);
}

function renderProducts(list) {
    const body = document.getElementById("prodTbody");
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="7" class="tbl-loading">No products found</td></tr>`;
        return;
    }
    body.innerHTML = list.map(p => {
        const img = p.imageUrl
            ? `<img class="prod-thumb" src="${p.imageUrl}" onerror="this.src='https://placehold.co/44x44/eee/999?text=?'" alt="${p.name}"/>`
            : `<div style="width:44px;height:44px;border-radius:8px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid var(--border)">📦</div>`;
        const stockColor = (p.stockQuantity ?? 0) <= 5 ? "var(--danger)" : "var(--success)";
        // Encode product data safely
        const pData = encodeURIComponent(JSON.stringify(p));
        return `
        <tr>
            <td>#${p.productId}</td>
            <td>${img}</td>
            <td><strong style="color:var(--text)">${p.name}</strong></td>
            <td>${p.categoryName ?? "—"}</td>
            <td style="color:var(--accent);font-weight:700">${Number(p.unitPrice ?? 0).toLocaleString()} EGP</td>
            <td style="color:${stockColor};font-weight:700">${p.stockQuantity ?? 0}</td>
            <td>
                <div class="act-cell">
                    <button class="btn-edit" onclick="editProduct('${pData}')">Edit</button>
                    <button class="btn-del"  onclick="deleteProduct(${p.productId})">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join("");
}

function editProduct(encoded) {
    const p = JSON.parse(decodeURIComponent(encoded));
    openProductModal(p);
}

function openProductModal(product = null) {
    // Clear all fields first
    document.getElementById("prodId").value = "";
    document.getElementById("pName").value = "";
    document.getElementById("pCatId").value = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pStock").value = "";
    document.getElementById("pDesc").value = "";
    document.getElementById("pImg").value = "";
    document.getElementById("imgPreviewWrap").style.display = "none";
    document.getElementById("imgPreview").src = "";
    document.getElementById("prodModalTitle").textContent = product ? "Edit Product" : "Add Product";

    if (product) {
        document.getElementById("prodId").value = product.productId ?? product.id ?? "";
        document.getElementById("pName").value = product.name ?? "";
        document.getElementById("pCatId").value = product.categoryId ?? "";
        document.getElementById("pPrice").value = product.unitPrice ?? product.price ?? "";
        document.getElementById("pStock").value = product.stockQuantity ?? "";
        document.getElementById("pDesc").value = product.description ?? "";
        document.getElementById("pImg").value = product.imageUrl ?? "";

        if (product.imageUrl) {
            document.getElementById("imgPreview").src = product.imageUrl;
            document.getElementById("imgPreviewWrap").style.display = "block";
        }
    }

    document.getElementById("prodModal").classList.add("open");
}

function previewImg(url) {
    const wrap = document.getElementById("imgPreviewWrap");
    const img = document.getElementById("imgPreview");
    if (url && url.trim()) {
        img.src = url.trim();
        wrap.style.display = "block";
    } else {
        wrap.style.display = "none";
    }
}

async function saveProduct() {
    const id = document.getElementById("prodId").value.trim();
    const name = document.getElementById("pName").value.trim();
    const catId = document.getElementById("pCatId").value.trim();
    const price = document.getElementById("pPrice").value.trim();
    const stock = document.getElementById("pStock").value.trim();
    const desc = document.getElementById("pDesc").value.trim();
    const image = document.getElementById("pImg").value.trim();

    // Validation
    if (!name) { showToast("⚠️ Product name is required", "err"); return; }
    if (!price) { showToast("⚠️ Price is required", "err"); return; }
    if (!stock) { showToast("⚠️ Stock is required", "err"); return; }
    if (!id && !catId) { showToast("⚠️ Category ID is required", "err"); return; }

    const body = {
        name: name,
        description: desc || null,
        unitPrice: parseFloat(price),
        stockQuantity: parseInt(stock),
        imageUrl: image || null
    };

    if (catId) body.categoryId = parseInt(catId);

    let r;
    if (id) {
        // UPDATE — use AdminUpdateProductDto
        r = await apiFetch(`${API}/Admin/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    } else {
        // CREATE
        r = await apiFetch(`${API}/Admin/products`, {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    console.log("Save product response:", r.status, r.text);

    if (!r.ok) {
        const msg = r.data?.message || r.text || "Failed to save product";
        showToast("❌ " + msg, "err");
        return;
    }

    showToast(id ? "✅ Product updated!" : "✅ Product added!", "ok");
    closeModal("prodModal");
    loadProducts();
}

async function deleteProduct(id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const r = await apiFetch(`${API}/Admin/products/${id}`, { method: "DELETE" });
    if (!r.ok) { showToast("❌ Failed to delete product", "err"); return; }
    showToast("✅ Product deleted!", "ok");
    loadProducts();
}

// ══════════════════════════════
// ORDERS
// ══════════════════════════════
async function loadOrders() {
    document.getElementById("ordTbody").innerHTML = `<tr><td colspan="7" class="tbl-loading">Loading...</td></tr>`;
    const r = await apiFetch(`${API}/Admin/orders`);
    if (!r.ok) { showToast("Failed to load orders", "err"); return; }
    allOrders = r.data || [];
    renderOrders(allOrders);
}

function renderOrders(list) {
    const body = document.getElementById("ordTbody");
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="7" class="tbl-loading">No orders found</td></tr>`;
        return;
    }
    body.innerHTML = list.map(o => `
        <tr>
            <td>#${o.orderId}</td>
            <td>
                <strong style="color:var(--text)">${o.customerName ?? "—"}</strong><br/>
                <small style="color:var(--muted)">${o.customerEmail ?? ""}</small>
            </td>
            <td>${o.itemsCount ?? 0} item${(o.itemsCount ?? 0) !== 1 ? "s" : ""}</td>
            <td style="color:var(--accent);font-weight:700">${Number(o.totalAmount ?? 0).toLocaleString()} EGP</td>
            <td>${o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "—"}</td>
            <td><span class="badge b-${(o.status || "pending").toLowerCase()}">${o.status ?? "—"}</span></td>
            <td>
                <button class="btn-edit" onclick="openOrdModal(${o.orderId},'${o.status}')">Update</button>
            </td>
        </tr>`).join("");
}

function filterOrders(status) {
    if (!status) renderOrders(allOrders);
    else renderOrders(allOrders.filter(o => o.status === status));
}

function openOrdModal(id, status) {
    document.getElementById("ordId").value = id;
    document.getElementById("ordStatus").value = status;
    document.getElementById("ordModal").classList.add("open");
}

async function saveOrderStatus() {
    const id = document.getElementById("ordId").value;
    const status = document.getElementById("ordStatus").value;
    const r = await apiFetch(`${API}/Admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
    if (!r.ok) { showToast("❌ Failed to update order", "err"); return; }
    showToast("✅ Order updated!", "ok");
    closeModal("ordModal");
    loadOrders();
}

// ══════════════════════════════
// CUSTOMERS
// ══════════════════════════════
async function loadCustomers() {
    document.getElementById("cusTbody").innerHTML = `<tr><td colspan="8" class="tbl-loading">Loading...</td></tr>`;
    const r = await apiFetch(`${API}/Admin/customers`);
    if (!r.ok) { showToast("Failed to load customers", "err"); return; }
    renderCustomers(r.data || []);
}

function renderCustomers(list) {
    const body = document.getElementById("cusTbody");
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="8" class="tbl-loading">No customers found</td></tr>`;
        return;
    }
    body.innerHTML = list.map(c => `
        <tr>
            <td>#${c.customerId}</td>
            <td><strong style="color:var(--text)">${c.fullName}</strong></td>
            <td>${c.email}</td>
            <td>${c.phoneNumber ?? "—"}</td>
            <td>${c.totalOrders ?? 0}</td>
            <td style="color:var(--accent);font-weight:700">${Number(c.totalSpent ?? 0).toLocaleString()} EGP</td>
            <td><span class="badge ${c.isAdmin ? 'b-admin' : 'b-user'}">${c.isAdmin ? "Admin" : "User"}</span></td>
            <td>
                ${!c.isAdmin
            ? `<button class="btn-del" onclick="deleteCustomer(${c.customerId})">Delete</button>`
            : `<span style="color:var(--muted);font-size:12px">Protected</span>`}
            </td>
        </tr>`).join("");
}

async function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    const r = await apiFetch(`${API}/Admin/customers/${id}`, { method: "DELETE" });
    if (!r.ok) { showToast("❌ Failed to delete customer", "err"); return; }
    showToast("✅ Customer deleted!", "ok");
    loadCustomers();
}

// ══════════════════════════════
// CATEGORIES
// ══════════════════════════════
async function loadCategories() {
    document.getElementById("catTbody").innerHTML = `<tr><td colspan="5" class="tbl-loading">Loading...</td></tr>`;
    const r = await apiFetch(`${API}/Admin/categories`);
    if (!r.ok) { showToast("Failed to load categories", "err"); return; }
    renderCategories(r.data || []);
}

function renderCategories(list) {
    const body = document.getElementById("catTbody");
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="5" class="tbl-loading">No categories found</td></tr>`;
        return;
    }
    body.innerHTML = list.map(c => `
        <tr>
            <td>#${c.categoryId}</td>
            <td><strong style="color:var(--text)">${c.name}</strong></td>
            <td>${c.description ?? "—"}</td>
            <td>${c.productCount ?? 0} products</td>
            <td>
                <button class="btn-del" onclick="deleteCategory(${c.categoryId})">Delete</button>
            </td>
        </tr>`).join("");
}

function openCatModal() {
    document.getElementById("cName").value = "";
    document.getElementById("cDesc").value = "";
    document.getElementById("catModal").classList.add("open");
}

async function saveCategory() {
    const name = document.getElementById("cName").value.trim();
    const desc = document.getElementById("cDesc").value.trim();
    if (!name) { showToast("⚠️ Category name is required", "err"); return; }
    const r = await apiFetch(`${API}/Admin/categories`, {
        method: "POST",
        body: JSON.stringify({ name, description: desc || null })
    });
    if (!r.ok) { showToast("❌ Failed to add category", "err"); return; }
    showToast("✅ Category added!", "ok");
    closeModal("catModal");
    loadCategories();
}

async function deleteCategory(id) {
    if (!confirm("Delete this category?")) return;
    const r = await apiFetch(`${API}/Admin/categories/${id}`, { method: "DELETE" });
    if (!r.ok) { showToast("❌ Cannot delete — category may have products", "err"); return; }
    showToast("✅ Category deleted!", "ok");
    loadCategories();
}

// ══════════════════════════════
// TABLE SEARCH
// ══════════════════════════════
function searchTable(tbodyId, q) {
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    const ql = q.toLowerCase();
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(ql) ? "" : "none";
    });
}

// ══════════════════════════════
// MODAL
// ══════════════════════════════
function closeModal(id) {
    document.getElementById(id).classList.remove("open");
}

// Close on overlay click
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("overlay")) {
        e.target.classList.remove("open");
    }
});

// ══════════════════════════════
// TOAST
// ══════════════════════════════
let toastTimer;
function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

// ══════════════════════════════
// THEME
// ══════════════════════════════
function toggleTheme() {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    document.getElementById("themeBtn").textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

function loadTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
        document.body.classList.add("dark");
        const btn = document.getElementById("themeBtn");
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