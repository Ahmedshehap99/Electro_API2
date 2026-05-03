// =====================
// CONFIG
// =====================
const API_URL = 'https://localhost:44351/api';

let currentTab = 'login';
let currentToken = '';

// =====================
// SWITCH TABS
// =====================
function switchTab(tab, event) {
    currentTab = tab;

    const tabs = document.querySelectorAll('.tab-btn');
    const extraFields = document.getElementById('extra-fields');
    const forgotLink = document.getElementById('forgot-link');
    const submitBtn = document.getElementById('submit-btn');
    const formHeader = document.querySelector('.form-header h2');
    const formSubtitle = document.querySelector('.form-header p');

    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    hideAlert();
    document.getElementById('token-box').style.display = 'none';

    if (tab === 'register') {
        extraFields.classList.add('visible');
        forgotLink.style.display = 'none';
        submitBtn.textContent = 'Create Account';
        formHeader.textContent = 'Create account ✨';
        formSubtitle.textContent = 'Fill in your details to get started';
    } else {
        extraFields.classList.remove('visible');
        forgotLink.style.display = 'block';
        submitBtn.textContent = 'Sign In';
        formHeader.textContent = 'Welcome back 👋';
        formSubtitle.textContent = 'Enter your credentials to continue';
    }
}

// =====================
// TOGGLE PASSWORD
// =====================
function togglePassword() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// =====================
// SHOW / HIDE ALERT
// =====================
function showAlert(msg, type = 'error') {
    const alert = document.getElementById('alert');
    const alertMsg = document.getElementById('alert-msg');
    const alertIcon = document.getElementById('alert-icon');
    alert.className = `alert ${type}`;
    alertMsg.textContent = msg;
    alertIcon.textContent = type === 'error' ? '⚠️' : '✅';
}

function hideAlert() {
    const alert = document.getElementById('alert');
    alert.className = 'alert';
}

// =====================
// COPY TOKEN
// =====================
function copyToken() {
    navigator.clipboard.writeText(currentToken);
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
}

// =====================
// HANDLE SUBMIT
// =====================
async function handleSubmit(e) {
    e.preventDefault();
    hideAlert();

    const btn = document.getElementById('submit-btn');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Please wait...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        let response, data;

        if (currentTab === 'login') {
            // LOGIN
            response = await fetch(`${API_URL}/Auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            data = await response.json();

            if (!response.ok)
                throw new Error(data.message || 'Invalid email or password.');

            currentToken = data.token;
            localStorage.setItem('token', data.token);

            showAlert('Login successful! Redirecting...', 'success');
            document.getElementById('token-text').textContent = data.token;
            document.getElementById('token-box').style.display = 'block';
            window.location.href = '/pages/dashboard.html';
            ;

        } else {
            // REGISTER
            const fullName = document.getElementById('fullName').value.trim();
            const phoneNumber = document.getElementById('phone').value.trim();
            const shippingAddress = document.getElementById('address').value.trim();

            if (!fullName) throw new Error('Full name is required.');

            response = await fetch(`${API_URL}/Auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password, phoneNumber, shippingAddress })
            });

            data = await response.json();

            if (!response.ok)
                throw new Error(data.message || 'Registration failed.');

            currentToken = data.token;
            localStorage.setItem('token', data.token);

            showAlert('Account created! Redirecting...', 'success');
            document.getElementById('token-text').textContent = data.token;
            document.getElementById('token-box').style.display = 'block';

           
           window.location.href = '/pages/dashboard.html';
            
        }

    } catch (err) {
        showAlert(err.message || 'Something went wrong. Try again.');
    } finally {
        btn.classList.remove('loading');
        btn.textContent = currentTab === 'login' ? 'Sign In' : 'Create Account';
    }
}

// =====================
// CHECK IF ALREADY LOGGED IN
// =====================
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    if (token) {
        showAlert('You are already logged in!', 'success');
    }
});


// =====================
// THEME TOGGLE
// =====================
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');

    body.classList.toggle('light');

    if (body.classList.contains('light')) {
        icon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        icon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme on page start
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-icon');

    if (savedTheme === 'light') {
        document.body.classList.add('light');
        icon.textContent = '🌙';
    }

    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        showAlert('You are already logged in!', 'success');
    }
});