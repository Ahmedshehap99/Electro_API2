// ══════════════════════════════
// CONFIG
// ══════════════════════════════
const API = "https://localhost:44351/api";
let token = localStorage.getItem("token") || "";
let allOrders = [];

// ══════════════════════════════
// INIT
// ══════════════════════════════
window.onload = async () => {
    loadTheme();

    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    // Show admin name from token
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const name = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const isAdmin = payload["IsAdmin"];
        document.getElementById("adminName").textContent = name || "Admin";

        if (isAdmin !== "True") {
            showToast("⛔ Access denied. Admins only!", "error");
            setTimeout(() => window.location.href = "../login.html", 2000);
            return;
        }
    } catch { }

    await loadDashboard();
};

// ══════════════════════════════
// AUTH HEADER
// ══════════════════════════════
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

// ══════════════════════════════
// SECTIONS
// ══════════════════════════════
function showSection(name, el) {
    event.preventDefault();
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById(`section-${name}`).classList.add("active");
    el.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        products: "Products",
        orders: "Orders",
        customers: "Customers",
        categories: "Categories"
    };
    document.getElementById("pageTitle").textContent = titles[name] || name;

    // Load data when switching
    if (name === "products") loadProducts();
    if (name === "orders") loadOrders();
    if (name === "customers") loadCustomers();
    if (name === "categories") loadCategories();
}

// ══════════════════════════════
// DASHBOARD
// ══════════════════════════════
async function loadDashboard() {
    try {
        const res = await fetch(`${API}/Admin/stats`, { headers: headers() });
        const stats = await res.json();

        document.getElementById("totalCustomers").textContent = stats.totalCustomers ?? 0;
        document.getElementById("totalProducts").textContent = stats.totalProducts ?? 0;
        document.getElementById("totalOrders").textContent = stats.totalOrders ?? 0;
        document.getElementById("totalRevenue").textContent = Number(stats.totalRevenue ?? 0).toLocaleString() + " EGP";
        document.getElementById("pendingOrders").textContent = stats.pendingOrders ?? 0;
        document.getElementById("lowStock").textContent = stats.lowStockProducts ?? 0;

    } catch {
        showToast("Failed to load stats", "error");
    }

    // Load recent orders
    try {
        const res = await fetch(`${API}/Admin/orders`, { headers: headers() });
        const orders = await res.json();
        const recent = orders.slice(0, 5);
        document.getElementById("recentOrders").innerHTML = recent.map(o => `
            <div class="mini-row">
                <span>#${o.orderId} — <strong>${o.customerName}</strong></span>
                <span class="status-badge status-${o.status?.toLowerCase()}">${o.status}</span>
            </div>`).join("") || "<p style='color:var(--text-muted);font-size:13px'>No orders yet</p>";
    } catch { }

    // Load low stock products
    try {
        const res = await fetch(`${API}/Products`, { headers: headers() });
        const products = await res.json();
        const low = products.filter(p => (p.stockQuantity ?? 0) <= 5).slice(0, 5);
        document.getElementById("lowStockList").innerHTML = low.map(p => `
            <div class="mini-row">
                <strong>${p.name}</strong>
                <span style="color:var(--danger);font-weight:600">${p.stockQuantity} left</span>
            </div>`).join("") || "<p style='color:var(--text-muted);font-size:13px'>All products well stocked ✅</p>";
    } catch { }
}

// ══════════════════════════════
// PRODUCTS
// ══════════════════════════════
async function loadProducts() {
    document.getElementById("productsBody").innerHTML =
        `<tr><td colspan="7" class="loading-row">Loading products...</td></tr>`;
    try {
        const res = await fetch(`${API}/Products`, { headers: headers() });
        const products = await res.json();
        renderProducts(products);
    } catch {
        showToast("Failed to load products", "error");
    }
}

function renderProducts(products) {
    const body = document.getElementById("productsBody");
    if (!products.length) {
        body.innerHTML = `<tr><td colspan="7" class="loading-row">No products found</td></tr>`;
        return;
    }
    body.innerHTML = products.map(p => `
        <tr>
            <td>#${p.productId}</td>
            <td><img class="product-thumb" src="${p.imageUrl || 'https://placehold.co/48x48/1e1e1e/888?text=?'}"
                onerror="this.src='https://placehold.co/48x48/1e1e1e/888?text=?'" alt="${p.name}"/></td>
            <td><strong style="color:var(--text)">${p.name}</strong></td>
            <td>${p.categoryName ?? "—"}</td>
            <td style="color:var(--accent);font-weight:600">${Number(p.unitPrice).toLocaleString()} EGP</td>
            <td>
                <span style="color:${p.stockQuantity <= 5 ? 'var(--danger)' : 'var(--success)'}; font-weight:600">
                    ${p.stockQuantity}
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-edit" onclick="openProductModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
                    <button class="btn-delete" onclick="deleteProduct(${p.productId})">Delete</button>
                </div>
            </td>
        </tr>`).join("");
}

function openProductModal(product = null) {
    document.getElementById("editProductId").value = product?.productId ?? "";
    document.getElementById("pName").value = product?.name ?? "";
    document.getElementById("pCategory").value = product?.categoryId ?? "";
    document.getElementById("pPrice").value = product?.unitPrice ?? "";
    document.getElementById("pStock").value = product?.stockQuantity ?? "";
    document.getElementById("pDesc").value = product?.description ?? "";
    document.getElementById("pImage").value = product?.imageUrl ?? "";
    document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add Product";

    // Image preview
    const preview = document.getElementById("imagePreview");
    const wrap = document.getElementById("imagePreviewWrap");
    if (product?.imageUrl) {
        preview.src = product.imageUrl;
        wrap.style.display = "block";
    } else {
        wrap.style.display = "none";
    }

    document.getElementById("productModal").classList.add("open");
}

// Live image preview
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("pImage")?.addEventListener("input", function () {
        const wrap = document.getElementById("imagePreviewWrap");
        const img = document.getElementById("imagePreview");
        if (this.value) {
            img.src = this.value;
            wrap.style.display = "block";
        } else {
            wrap.style.display = "none";
        }
    });
});

async function saveProduct() {
    const id = document.getElementById("editProductId").value;
    const name = document.getElementById("pName").value.trim();
    const catId = parseInt(document.getElementById("pCategory").value);
    const price = parseFloat(document.getElementById("pPrice").value);
    const stock = parseInt(document.getElementById("pStock").value);
    const desc = document.getElementById("pDesc").value.trim();
    const image = document.getElementById("pImage").value.trim();

    if (!name || !catId || !price || isNaN(stock)) {
        showToast("Please fill all required fields", "error");
        return;
    }

    const body = { name, description: desc, unitPrice: price, stockQuantity: stock, categoryId: catId, imageUrl: image };

    try {
        let res;
        if (id) {
            res = await fetch(`${API}/Admin/products/${id}`, {
                method: "PUT",
                headers: headers(),
                body: JSON.stringify(body)
            });
        } else {
            res = await fetch(`${API}/Admin/products`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify(body)
            });
        }

        if (!res.ok) throw new Error();
        showToast(id ? "✅ Product updated!" : "✅ Product added!", "success");
        closeModal("productModal");
        loadProducts();
    } catch {
        showToast("Failed to save product", "error");
    }
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    try {
        const res = await fetch(`${API}/Admin/products/${id}`, {
            method: "DELETE",
            headers: headers()
        });
        if (!res.ok) throw new Error();
        showToast("✅ Product deleted!", "success");
        loadProducts();
    } catch {
        showToast("Failed to delete product", "error");
    }
}

// ══════════════════════════════
// ORDERS
// ══════════════════════════════
async function loadOrders() {
    document.getElementById("ordersBody").innerHTML =
        `<tr><td colspan="7" class="loading-row">Loading orders...</td></tr>`;
    try {
        const res = await fetch(`${API}/Admin/orders`, { headers: headers() });
        allOrders = await res.json();
        renderOrders(allOrders);
    } catch {
        showToast("Failed to load orders", "error");
    }
}

function renderOrders(orders) {
    const body = document.getElementById("ordersBody");
    if (!orders.length) {
        body.innerHTML = `<tr><td colspan="7" class="loading-row">No orders found</td></tr>`;
        return;
    }
    body.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.orderId}</td>
            <td>
                <strong style="color:var(--text)">${o.customerName}</strong><br/>
                <small>${o.customerEmail}</small>
            </td>
            <td>${o.itemsCount} item${o.itemsCount !== 1 ? "s" : ""}</td>
            <td style="color:var(--accent);font-weight:600">${Number(o.totalAmount ?? 0).toLocaleString()} EGP</td>
            <td>${o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "—"}</td>
            <td><span class="status-badge status-${o.status?.toLowerCase()}">${o.status}</span></td>
            <td>
                <button class="btn-edit" onclick="openOrderModal(${o.orderId}, '${o.status}')">Update</button>
            </td>
        </tr>`).join("");
}

function filterOrdersByStatus(status) {
    if (!status) renderOrders(allOrders);
    else renderOrders(allOrders.filter(o => o.status === status));
}

function openOrderModal(orderId, currentStatus) {
    document.getElementById("editOrderId").value = orderId;
    document.getElementById("orderStatus").value = currentStatus;
    document.getElementById("orderModal").classList.add("open");
}

async function saveOrderStatus() {
    const id = document.getElementById("editOrderId").value;
    const status = document.getElementById("orderStatus").value;
    try {
        const res = await fetch(`${API}/Admin/orders/${id}/status`, {
            method: "PATCH",
            headers: headers(),
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error();
        showToast("✅ Order status updated!", "success");
        closeModal("orderModal");
        loadOrders();
    } catch {
        showToast("Failed to update order", "error");
    }
}

// ══════════════════════════════
// CUSTOMERS
// ══════════════════════════════
async function loadCustomers() {
    document.getElementById("customersBody").innerHTML =
        `<tr><td colspan="8" class="loading-row">Loading customers...</td></tr>`;
    try {
        const res = await fetch(`${API}/Admin/customers`, { headers: headers() });
        const customers = await res.json();
        renderCustomers(customers);
    } catch {
        showToast("Failed to load customers", "error");
    }
}

function renderCustomers(customers) {
    const body = document.getElementById("customersBody");
    if (!customers.length) {
        body.innerHTML = `<tr><td colspan="8" class="loading-row">No customers found</td></tr>`;
        return;
    }
    body.innerHTML = customers.map(c => `
        <tr>
            <td>#${c.customerId}</td>
            <td><strong style="color:var(--text)">${c.fullName}</strong></td>
            <td>${c.email}</td>
            <td>${c.phoneNumber ?? "—"}</td>
            <td>${c.totalOrders}</td>
            <td style="color:var(--accent);font-weight:600">${Number(c.totalSpent ?? 0).toLocaleString()} EGP</td>
            <td>
                <span class="status-badge ${c.isAdmin ? 'status-admin' : 'status-user'}">
                    ${c.isAdmin ? "Admin" : "User"}
                </span>
            </td>
            <td>
                ${!c.isAdmin ? `<button class="btn-delete" onclick="deleteCustomer(${c.customerId})">Delete</button>` : "—"}
            </td>
        </tr>`).join("");
}

async function deleteCustomer(id) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    try {
        const res = await fetch(`${API}/Admin/customers/${id}`, {
            method: "DELETE",
            headers: headers()
        });
        if (!res.ok) throw new Error();
        showToast("✅ Customer deleted!", "success");
        loadCustomers();
    } catch {
        showToast("Failed to delete customer", "error");
    }
}

// ══════════════════════════════
// CATEGORIES
// ══════════════════════════════
async function loadCategories() {
    document.getElementById("categoriesBody").innerHTML =
        `<tr><td colspan="5" class="loading-row">Loading categories...</td></tr>`;
    try {
        const res = await fetch(`${API}/Admin/categories`, { headers: headers() });
        const cats = await res.json();
        renderCategories(cats);
    } catch {
        showToast("Failed to load categories", "error");
    }
}

function renderCategories(cats) {
    const body = document.getElementById("categoriesBody");
    if (!cats.length) {
        body.innerHTML = `<tr><td colspan="5" class="loading-row">No categories found</td></tr>`;
        return;
    }
    body.innerHTML = cats.map(c => `
        <tr>
            <td>#${c.categoryId}</td>
            <td><strong style="color:var(--text)">${c.name}</strong></td>
            <td>${c.description ?? "—"}</td>
            <td>${c.productCount} products</td>
            <td>
                <button class="btn-delete" onclick="deleteCategory(${c.categoryId})">Delete</button>
            </td>
        </tr>`).join("");
}

function openCategoryModal() {
    document.getElementById("cName").value = "";
    document.getElementById("cDesc").value = "";
    document.getElementById("categoryModal").classList.add("open");
}

async function saveCategory() {
    const name = document.getElementById("cName").value.trim();
    const desc = document.getElementById("cDesc").value.trim();
    if (!name) { showToast("Category name is required", "error"); return; }

    try {
        const res = await fetch(`${API}/Admin/categories`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ name, description: desc })
        });
        if (!res.ok) throw new Error();
        showToast("✅ Category added!", "success");
        closeModal("categoryModal");
        loadCategories();
    } catch {
        showToast("Failed to add category", "error");
    }
}

async function deleteCategory(id) {
    if (!confirm("Delete this category?")) return;
    try {
        const res = await fetch(`${API}/Admin/categories/${id}`, {
            method: "DELETE",
            headers: headers()
        });
        if (!res.ok) throw new Error();
        showToast("✅ Category deleted!", "success");
        loadCategories();
    } catch {
        showToast("Failed to delete — category may have products", "error");
    }
}

// ══════════════════════════════
// TABLE SEARCH FILTER
// ══════════════════════════════
function filterTable(tableId, query) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    const q = query.toLowerCase();
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
}

// ══════════════════════════════
// MODAL
// ══════════════════════════════
function closeModal(id) {
    document.getElementById(id).classList.remove("open");
}

// Close modal on overlay click
document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", function (e) {
        if (e.target === this) this.classList.remove("open");
    });
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
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    document.getElementById("themeBtn").textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.classList.add("light");
        const btn = document.getElementById("themeBtn");
        if (btn) btn.textContent = "☀️";
    }
}

// ══════════════════════════════
// LOGOUT
// ══════════════════════════════
function logout() {
    localStorage.removeItem("token");
    window.location.href = "../login.html";
}