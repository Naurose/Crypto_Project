const API_URL = 'http://localhost:5000/api';

// Auth State
const isAuthenticated = () => !!localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user'));
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

// Headers
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Toast Notification
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// update Navbar
const updateNavbar = () => {
    // "Full Navbar" layout used by Store, Dashboard, Cart, etc.
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    // Helper to check for active state
    const isActive = (page) => {
        const path = window.location.pathname;
        if (page === 'index' && (path.endsWith('index.html') || path.endsWith('/'))) return 'active';
        return path.includes(page + '.html') ? 'active' : '';
    };

    if (isAuthenticated()) {
        const user = getUser();
        // Standard "Full" authenticated menu
        authLinks.innerHTML = `
            <a href="newsfeed.html" class="nav-link ${isActive('newsfeed')}">News</a>
            <a href="store.html" class="nav-link ${isActive('store')}">Store</a>
            <a href="dashboard.html" class="nav-link ${isActive('dashboard')}">Library</a>
            <a href="cart.html" class="nav-link ${isActive('cart')}">Cart</a>
            <a href="profile.html" class="nav-link profile-link ${isActive('profile')}">${user.username}</a>
            <a href="#" onclick="logout()" class="btn btn-secondary">Logout</a>

        `;
    } else {
        // Standard unauthenticated menu (Login/Register)
        // Landing page logic
        const path = window.location.pathname;
        const isLanding = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('Gamevault/') || path.endsWith('Gamevault');
        const isAuthPage = path.endsWith('login.html') || path.endsWith('register.html');

        if (isLanding) {
            authLinks.innerHTML = `
                <a href="newsfeed.html" class="nav-link ${isActive('newsfeed')}">News</a>
                <a href="store.html" class="nav-link ${isActive('store')}">Store</a>
                <span class="user-greeting">Hello, Gamer</span>
            `;
        } else if (isAuthPage) {
            authLinks.innerHTML = `
                <a href="newsfeed.html" class="nav-link ${isActive('newsfeed')}">News</a>
                <a href="store.html" class="nav-link ${isActive('store')}">Store</a>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="newsfeed.html" class="nav-link ${isActive('newsfeed')}">News</a>
                <a href="store.html" class="nav-link ${isActive('store')}">Store</a>
                <a href="login.html" class="btn btn-secondary">Login</a>
                <a href="register.html" class="btn btn-primary">Join Now</a>
            `;
        }
    }

};

// API Functions
const api = {
    getGames: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/games?${queryString}`);
        return res.json();
    },
    login: async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },
    register: async (userData) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return res.json();
    },
    addToCart: async (gameId, type = 'buy', rentDuration = null) => {
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        const user = getUser();
        const payload = { userId: user.id, gameId, type };
        if (type === 'rent' && rentDuration) {
            payload.rentDuration = rentDuration;
        }

        const res = await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        showToast(data.message);
    }
};

// Rent Modal Logic
const openRentModal = (gameId, basePrice, title) => {
    // Check if modal exists, if not create it
    let modalOverlay = document.getElementById('rentModalOverlay');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'rentModalOverlay';
        modalOverlay.className = 'rent-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="rent-modal">
                <h2 id="rentModalTitle" class="section-title" style="margin-bottom: 1rem; font-size: 1.5rem;">Rent Game</h2>
                <p>Select rental duration:</p>
                <div class="rent-options">
                    <div class="rent-option selected" onclick="selectRentOption(7)">
                        <h4>7 Days</h4>
                        <p class="rent-price" id="price7"></p>
                    </div>
                    <div class="rent-option" onclick="selectRentOption(14)">
                        <h4>14 Days</h4>
                        <p class="rent-price" id="price14"></p>
                    </div>
                    <div class="rent-option" onclick="selectRentOption(30)">
                        <h4>30 Days</h4>
                        <p class="rent-price" id="price30"></p>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="closeRentModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="confirmRent()">Confirm Rent</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);
    }

    // Update Content
    document.getElementById('rentModalTitle').textContent = `Rent ${title}`;
    
    // Calculate Prices
    const p7 = parseFloat(basePrice);
    const p14 = (p7 * 1.8).toFixed(2);
    const p30 = (p7 * 3.5).toFixed(2);

    document.getElementById('price7').textContent = `$${p7.toFixed(2)}`;
    document.getElementById('price14').textContent = `$${p14}`;
    document.getElementById('price30').textContent = `$${p30}`;

    // Store state
    window.currentRentGameId = gameId;
    window.currentRentDuration = 7; // Default
    
    // Reset selection visually
    document.querySelectorAll('.rent-option').forEach(el => el.classList.remove('selected'));
    document.querySelector('.rent-option').classList.add('selected'); // First one

    // Show
    modalOverlay.style.display = 'flex';
};

const closeRentModal = () => {
    const modal = document.getElementById('rentModalOverlay');
    if (modal) modal.style.display = 'none';
};

const selectRentOption = (days) => {
    window.currentRentDuration = days;
    document.querySelectorAll('.rent-option').forEach((el, index) => {
        el.classList.remove('selected');
        const optionDays = [7, 14, 30][index];
        if (optionDays === days) el.classList.add('selected');
    });
};

const confirmRent = () => {
    if (window.currentRentGameId) {
        api.addToCart(window.currentRentGameId, 'rent', window.currentRentDuration);
        closeRentModal();
    }
};

// Global expose for onclick
// Launch Modal Logic
const openLaunchModal = (title, image) => {
    let modal = document.getElementById('launchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'launchModal';
        modal.className = 'launch-modal-overlay';
        modal.innerHTML = `
            <div class="launch-modal">
                <img id="launchImage" class="launch-image" src="" alt="Cover">
                <h1 id="launchTitle" style="font-size: 2.5rem; margin-bottom: 0.5rem;"></h1>
                <div class="launch-status">
                    <div class="launch-spinner"></div>
                    Launching...
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('launchImage').src = image;
    document.getElementById('launchTitle').textContent = title;
    
    modal.style.display = 'flex';

    // Auto close after 3 seconds
    setTimeout(() => {
        modal.style.display = 'none';
    }, 4000); // 4 seconds for full effect
};

// Star Rating Helper
const getStarDisplayHTML = (rating, fontSize = '1rem') => {
    const r = parseFloat(rating) || 0;
    const percentage = (r / 5) * 100;
    
    return `
        <div class="star-rating-display" style="font-size: ${fontSize};" title="${r.toFixed(1)}/5">
            <div class="star-rating-display-back">★★★★★</div>
            <div class="star-rating-display-front" style="width: ${percentage}%">★★★★★</div>
        </div>
    `;
};

window.getStarDisplayHTML = getStarDisplayHTML;
window.openRentModal = openRentModal;
window.closeRentModal = closeRentModal;
window.selectRentOption = selectRentOption;
window.confirmRent = confirmRent;
window.openLaunchModal = openLaunchModal; // play animation function
window.api = api; // api is global for inline onclicks

document.addEventListener('DOMContentLoaded', updateNavbar);
