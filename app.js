/* ==========================================================================
   Aura Cafe POS - Application Core Logic (Supabase + Local Mock Fallback)
   ========================================================================== */

// --- CONFIGURATION & DATABASE STATE ---
let dbMode = localStorage.getItem('aura_pos_db_mode') || 'supabase'; // 'offline' or 'supabase'
let supabaseUrl = localStorage.getItem('aura_pos_supabase_url') || 'https://vtrhwyfhiryhsnswirej.supabase.co';
let supabaseKey = localStorage.getItem('aura_pos_supabase_key') || 'sb_publishable_pb6u1jEKzJXbbjhaQnXemQ_GtpqULWo';
let supabase = null;
let currentTheme = localStorage.getItem('aura_pos_theme') || 'dark';
let gaMeasurementId = localStorage.getItem('aura_pos_ga_id') || 'G-AURACOFFEE';

// --- APP STATE ---
let currentEmployee = null;
let currentView = 'pos-view';
let products = [];
let customers = [];
let cart = [];
let selectedCustomer = null;
let redeemedDiscount = 0;
let pointsToRedeem = 0;
let ordersHistory = [];

// Chart instances
let salesChartInstance = null;
let categoryChartInstance = null;

// --- INITIALIZE ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initGoogleAnalytics();
    initDatabase();
    initEventListeners();
    initMockDatabase();
    checkExistingSession();
    updateConnectionStatusBadge();
    
    // Initialize Lucide icons
    lucide.createIcons();
});

// --- DATABASE SETUP ---
function initDatabase() {
    if (dbMode === 'supabase' && supabaseUrl && supabaseKey) {
        try {
            // Initialize Supabase Client
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            showToast('เชื่อมต่อ Supabase สำเร็จ', 'success');
        } catch (e) {
            console.error('Supabase Init Error:', e);
            dbMode = 'offline';
            showToast('เชื่อมต่อ Supabase ล้มเหลว! เข้าสู่โหมดจำลองออฟไลน์', 'danger');
        }
    } else {
        supabase = null;
        dbMode = 'offline';
    }
}

// --- THEME MANAGEMENT (LIGHT/DARK) ---
function initTheme() {
    const body = document.body;
    const toggleIcon = document.getElementById('theme-toggle-icon');
    const toggleText = document.getElementById('theme-toggle-text');
    
    if (currentTheme === 'light') {
        body.classList.add('light-mode');
        if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'moon');
        if (toggleText) toggleText.innerText = 'โหมดมืด (Dark Mode)';
    } else {
        body.classList.remove('light-mode');
        if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'sun');
        if (toggleText) toggleText.innerText = 'โหมดสว่าง (Light Mode)';
    }
    if (window.lucide) window.lucide.createIcons();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('aura_pos_theme', currentTheme);
    initTheme();
    trackGAEvent('theme_toggle', 'Settings', currentTheme);
    showToast(`สลับเป็น${currentTheme === 'light' ? 'โหมดสว่าง' : 'โหมดมืด'}แล้ว`, 'success');
}

// --- GOOGLE ANALYTICS SERVICE ---
function initGoogleAnalytics() {
    if (!gaMeasurementId) return;
    
    // Remove existing GA script tags if any to prevent duplicate calls
    const existingScripts = document.querySelectorAll('script[src*="googletagmanager"]');
    existingScripts.forEach(s => s.remove());
    
    // Create new script tag dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaMeasurementId, {
        'page_title': 'Aura Cafe POS',
        'cookie_flags': 'SameSite=None;Secure'
    });
    
    console.log(`[GA Init] Google Analytics initialized with ID: ${gaMeasurementId}`);
}

function trackGAEvent(action, category, label, value) {
    if (window.gtag) {
        window.gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
        console.log(`[GA Track] Event: ${action}, Category: ${category}, Label: ${label}, Value: ${value}`);
    }
}

// --- MOCK DATABASE (LOCAL STORAGE) ---
const MOCK_PRODUCTS = [
    { id: 'p1', name: 'Espresso', category: 'coffee', price: 55.00, image_url: 'https://images.unsplash.com/photo-1510707513156-46c59d997b72?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p2', name: 'Americano', category: 'coffee', price: 60.00, image_url: 'https://images.unsplash.com/photo-1551046713-247a329c2d1b?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p3', name: 'Latte', category: 'coffee', price: 65.00, image_url: 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p4', name: 'Cappuccino', category: 'coffee', price: 65.00, image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p5', name: 'Matcha Latte', category: 'coffee', price: 75.00, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p6', name: 'Caramel Macchiato', category: 'coffee', price: 80.00, image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p7', name: 'Butter Croissant', category: 'bakery', price: 65.00, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p8', name: 'Chocolate Fudge Cake', category: 'bakery', price: 85.00, image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p9', name: 'Blueberry Cheesecake', category: 'bakery', price: 95.00, image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: 'p10', name: 'Almond Brownie', category: 'bakery', price: 55.00, image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
];

const MOCK_EMPLOYEES = [
    { id: 'e1', username: 'admin', password_hash: 'admin1234', name: 'Admin Manager', role: 'admin' },
    { id: 'e2', username: 'cashier1', password_hash: 'cashier1234', name: 'John Cashier', role: 'cashier' }
];

const MOCK_CUSTOMERS = [
    { id: 'c1', name: 'สมชาย ดีใจ', phone: '0812345678', points: 25, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'c2', name: 'สมหญิง มีสุข', phone: '0898765432', points: 8, created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'c3', name: 'กิตติ เก่งกาจ', phone: '0855556666', points: 105, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
];

function initMockDatabase() {
    if (!localStorage.getItem('aura_mock_products')) {
        localStorage.setItem('aura_mock_products', JSON.stringify(MOCK_PRODUCTS));
    }
    if (!localStorage.getItem('aura_mock_employees')) {
        localStorage.setItem('aura_mock_employees', JSON.stringify(MOCK_EMPLOYEES));
    }
    if (!localStorage.getItem('aura_mock_customers')) {
        localStorage.setItem('aura_mock_customers', JSON.stringify(MOCK_CUSTOMERS));
    }
    if (!localStorage.getItem('aura_mock_orders')) {
        // Generate some sample orders for dashboard analytics
        const sampleOrders = generateSampleOrders();
        localStorage.setItem('aura_mock_orders', JSON.stringify(sampleOrders));
    }
}

function generateSampleOrders() {
    const list = [];
    const today = new Date();
    // Create 15 orders scattered over the past 5 days
    for (let i = 0; i < 25; i++) {
        const orderDate = new Date(today);
        orderDate.setDate(today.getDate() - Math.floor(Math.random() * 6));
        orderDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
        
        const finalAmt = 50 + Math.floor(Math.random() * 400);
        list.push({
            id: 'ord-' + Math.random().toString(36).substr(2, 9),
            total_amount: finalAmt,
            discount: 0,
            final_amount: finalAmt,
            points_earned: Math.floor(finalAmt / 50),
            points_redeemed: 0,
            employee_name: 'John Cashier',
            customer_name: Math.random() > 0.5 ? 'สมชาย ดีใจ' : 'ทั่วไป',
            created_at: orderDate.toISOString(),
            items: [
                { name: 'Latte', quantity: 1, price: 65, options: 'เย็น, M, หวาน 50%' }
            ]
        });
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// --- SESSION MANAGEMENT ---
function checkExistingSession() {
    const savedUser = sessionStorage.getItem('aura_pos_user');
    if (savedUser) {
        currentEmployee = JSON.parse(savedUser);
        enterApplication();
    }
}

function updateConnectionStatusBadge() {
    const badge = document.getElementById('connection-status-badge');
    const text = badge.querySelector('.status-text');
    if (dbMode === 'supabase') {
        badge.className = 'badge badge-online';
        text.innerText = 'Supabase Cloud';
    } else {
        badge.className = 'badge badge-offline';
        text.innerText = 'โหมดจำลอง (Offline)';
    }
}

// --- NAVIGATION & VIEWS ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === viewId) {
            nav.classList.add('active');
        }
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        currentView = viewId;
    }
    
    // Log GA View Switch event
    trackGAEvent('view_switch', 'Navigation', viewId);
    
    // View specific hooks
    if (viewId === 'pos-view') {
        loadPOSProducts();
    } else if (viewId === 'loyalty-view') {
        loadLoyaltyMembers();
    } else if (viewId === 'dashboard-view') {
        loadDashboardData();
    } else if (viewId === 'settings-view') {
        loadSettingsData();
    }
}

// --- LOGIN SERVICE ---
async function handleLogin(username, password) {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>กำลังเข้าสู่ระบบ...</span><div class="status-dot animate-pulse"></div>';

    try {
        if (dbMode === 'supabase' && supabase) {
            // Supabase Authentication
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('username', username)
                .eq('password_hash', password) // ในระบบจริงควรแฮช แต่สำหรับการจำลองจะเทียบตรง
                .single();
                
            if (error || !data) {
                showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Supabase)', 'danger');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>เข้าสู่ระบบ</span><i data-lucide="arrow-right"></i>';
                lucide.createIcons();
                return;
            }
            
            currentEmployee = data;
        } else {
            // Offline Mock Authentication
            const mockEmps = JSON.parse(localStorage.getItem('aura_mock_employees') || '[]');
            const emp = mockEmps.find(e => e.username === username && e.password_hash === password);
            
            if (!emp) {
                showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Offline)', 'danger');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>เข้าสู่ระบบ</span><i data-lucide="arrow-right"></i>';
                lucide.createIcons();
                return;
            }
            
            currentEmployee = emp;
        }
        
        // Save to Session Storage
        sessionStorage.setItem('aura_pos_user', JSON.stringify(currentEmployee));
        showToast(`ยินดีต้อนรับคุณ ${currentEmployee.name}`, 'success');
        
        // Log GA Login Event
        trackGAEvent('login', 'Authentication', currentEmployee.username);
        
        enterApplication();
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการล็อกอิน', 'danger');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>เข้าสู่ระบบ</span><i data-lucide="arrow-right"></i>';
        lucide.createIcons();
    }
}

function enterApplication() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-container').classList.add('active');
    
    // Set user UI
    document.getElementById('sidebar-user-name').innerText = currentEmployee.name;
    document.getElementById('sidebar-user-role').innerText = currentEmployee.role === 'admin' ? 'ผู้จัดการร้าน (Admin)' : 'พนักงาน (Cashier)';
    document.getElementById('user-avatar-initial').innerText = currentEmployee.name.charAt(0).toUpperCase();
    
    // Default view
    switchView('pos-view');
}

function handleLogout() {
    sessionStorage.removeItem('aura_pos_user');
    currentEmployee = null;
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    
    // Reset login form
    document.getElementById('login-form').reset();
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>เข้าสู่ระบบ</span><i data-lucide="arrow-right"></i>';
    lucide.createIcons();
}

// --- POS & PRODUCT CATALOG ---
async function loadPOSProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">กำลังโหลดเมนูอาหาร...</div>';
    
    try {
        if (dbMode === 'supabase' && supabase) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('status', 'available');
                
            if (error) throw error;
            products = data;
        } else {
            products = JSON.parse(localStorage.getItem('aura_mock_products') || '[]');
        }
        
        renderProducts(products);
        
    } catch (err) {
        console.error(err);
        showToast('ไม่สามารถโหลดข้อมูลสินค้าได้', 'danger');
    }
}

function renderProducts(items) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    if (items.length === 0) {
        productsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">ไม่พบสินค้าในระบบ</div>';
        return;
    }
    
    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image-wrapper">
                <img class="product-img" src="${p.image_url || 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=300'}" alt="${p.name}">
                <span class="product-category-tag">${p.category === 'coffee' ? 'เครื่องดื่ม' : 'เบเกอรี่'}</span>
            </div>
            <div class="product-info">
                <h4 class="product-name">${p.name}</h4>
                <div class="product-footer">
                    <span class="product-price">฿${parseFloat(p.price).toFixed(2)}</span>
                    <button class="btn-add-item"><i data-lucide="plus" style="width:16px;height:16px"></i></button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            handleProductClick(p);
        });
        
        productsGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

// --- OPTION SELECTOR MODAL ---
let selectedDrinkForModal = null;

function handleProductClick(product) {
    if (product.category === 'coffee') {
        // Show drink options modal
        selectedDrinkForModal = product;
        document.getElementById('option-drink-name').innerText = product.name;
        
        // Reset modal pill buttons
        resetPillButtons('drink-type-group', 'ร้อน');
        resetPillButtons('drink-size-group', 'M');
        resetPillButtons('drink-sweet-group', '50%');
        
        calculateModalPrice();
        
        document.getElementById('drink-options-modal').classList.add('active');
    } else {
        // Bakery or others - add directly to cart
        addToCart(product, 1, null, parseFloat(product.price));
    }
}

function resetPillButtons(groupId, defaultValue) {
    const container = document.getElementById(groupId);
    container.querySelectorAll('.pill-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-value') === defaultValue) {
            btn.classList.add('active');
        }
    });
}

function calculateModalPrice() {
    if (!selectedDrinkForModal) return;
    let base = parseFloat(selectedDrinkForModal.price);
    
    // Add extra price from type
    const activeType = document.querySelector('#drink-type-group .pill-btn.active');
    const typeAdd = activeType ? parseFloat(activeType.getAttribute('data-price-add')) : 0;
    
    // Add extra price from size
    const activeSize = document.querySelector('#drink-size-group .pill-btn.active');
    const sizeAdd = activeSize ? parseFloat(activeSize.getAttribute('data-price-add')) : 0;
    
    const final = base + typeAdd + sizeAdd;
    document.getElementById('modal-calculated-price').innerText = `฿${final.toFixed(2)}`;
    return final;
}

// --- CART STATE MANAGEMENT ---
function addToCart(product, qty, options, unitPrice) {
    // Find if exact item already in cart
    const existingIndex = cart.findIndex(item => {
        if (item.product.id !== product.id) return false;
        if (!options && !item.options) return true;
        if (options && item.options) {
            return item.options.type === options.type &&
                   item.options.size === options.size &&
                   item.options.sweetness === options.sweetness;
        }
        return false;
    });
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += qty;
    } else {
        cart.push({
            id: 'cart-' + Math.random().toString(36).substr(2, 9),
            product,
            quantity: qty,
            options,
            price: unitPrice
        });
    }
    
    showToast(`เพิ่ม ${product.name} ลงในตะกร้า`, 'success');
    
    // Log GA Add to Cart Event
    trackGAEvent('add_to_cart', 'Cart', product.name, unitPrice);
    
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-state">
                <i data-lucide="shopping-bag" class="empty-icon"></i>
                <p>ไม่มีสินค้าในตะกร้า</p>
            </div>
        `;
        document.getElementById('pay-btn').disabled = true;
        updateCartTotals();
        lucide.createIcons();
        return;
    }
    
    document.getElementById('pay-btn').disabled = false;
    
    cart.forEach(item => {
        const card = document.createElement('div');
        card.className = 'cart-item';
        
        let optionStr = '';
        if (item.options) {
            optionStr = `${item.options.type} (${item.options.size}) • หวาน ${item.options.sweetness}`;
        } else {
            optionStr = 'เบเกอรี่ / สินค้าทั่วไป';
        }
        
        card.innerHTML = `
            <div class="cart-item-details">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-options">${optionStr}</div>
                <div class="cart-item-price">฿${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controller">
                    <button class="qty-btn btn-minus" data-id="${item.id}">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn btn-plus" data-id="${item.id}">+</button>
                </div>
                <button class="btn-remove-cart text-danger" data-id="${item.id}">
                    <i data-lucide="trash-2" style="width:16px;height:16px"></i>
                </button>
            </div>
        `;
        
        // Add event listeners to buttons
        card.querySelector('.btn-plus').addEventListener('click', () => updateCartQty(item.id, 1));
        card.querySelector('.btn-minus').addEventListener('click', () => updateCartQty(item.id, -1));
        card.querySelector('.btn-remove-cart').addEventListener('click', () => removeCartItem(item.id));
        
        container.appendChild(card);
    });
    
    updateCartTotals();
    lucide.createIcons();
}

function updateCartQty(id, change) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeCartItem(id);
        } else {
            renderCart();
        }
    }
}

function removeCartItem(id) {
    cart = cart.filter(x => x.id !== id);
    renderCart();
}

function updateCartTotals() {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    // Apply discount
    const discount = redeemedDiscount;
    const finalAmount = Math.max(0, subtotal - discount);
    
    // loyalty calculations
    // 1 point for every 50 THB spent (computed from finalAmount)
    const pointsEarned = Math.floor(finalAmount / 50);
    
    document.getElementById('cart-subtotal').innerText = `฿${subtotal.toFixed(2)}`;
    
    if (discount > 0) {
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('cart-discount').innerText = `-฿${discount.toFixed(2)}`;
    } else {
        document.getElementById('discount-row').style.display = 'none';
    }
    
    document.getElementById('cart-total').innerText = `฿${finalAmount.toFixed(2)}`;
    document.getElementById('cart-points-earned').innerText = `${pointsEarned} แต้ม`;
}

// --- LOYALTY & CUSTOMER SERVICE ---
async function searchCustomerByPhone(phone) {
    if (!phone) {
        showToast('กรุณากรอกเบอร์โทรศัพท์ลูกค้า', 'warning');
        return;
    }
    
    try {
        if (dbMode === 'supabase' && supabase) {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', phone)
                .maybeSingle();
                
            if (error) throw error;
            selectedCustomer = data;
        } else {
            const mockCusts = JSON.parse(localStorage.getItem('aura_mock_customers') || '[]');
            selectedCustomer = mockCusts.find(c => c.phone === phone) || null;
        }
        
        if (selectedCustomer) {
            showToast(`พบลูกค้าคุณ ${selectedCustomer.name}`, 'success');
            displaySelectedCustomer();
        } else {
            showToast('ไม่พบข้อมูลสมาชิก กรุณาสมัครใหม่', 'warning');
            selectedCustomer = null;
            document.getElementById('selected-customer-card').style.display = 'none';
        }
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการค้นหาลูกค้า', 'danger');
    }
}

function displaySelectedCustomer() {
    document.getElementById('selected-customer-name').innerText = selectedCustomer.name;
    document.getElementById('selected-customer-phone').innerText = selectedCustomer.phone;
    document.getElementById('selected-customer-points').innerText = selectedCustomer.points;
    document.getElementById('selected-customer-card').style.display = 'block';
    
    // Render redemption actions
    const redeemContainer = document.getElementById('redeem-actions-container');
    redeemContainer.innerHTML = '';
    
    // Option 1: Redeem 10 pts for ฿60 discount (approx 1 free Americano)
    if (selectedCustomer.points >= 10) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-accent';
        btn.innerHTML = 'ใช้ 10 แต้ม (ส่วนลด ฿60)';
        btn.addEventListener('click', () => applyLoyaltyRedemption(10, 60));
        redeemContainer.appendChild(btn);
    }
    
    // Option 2: Redeem 20 pts for ฿120 discount
    if (selectedCustomer.points >= 20) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-accent';
        btn.innerHTML = 'ใช้ 20 แต้ม (ส่วนลด ฿120)';
        btn.addEventListener('click', () => applyLoyaltyRedemption(20, 120));
        redeemContainer.appendChild(btn);
    }
    
    if (redeemContainer.innerHTML === '') {
        redeemContainer.innerHTML = '<span class="font-sm" style="color:var(--text-muted)">คะแนนสะสมไม่พอสำหรับการแลกสิทธิ์</span>';
    }
}

function applyLoyaltyRedemption(points, discountAmount) {
    if (pointsToRedeem > 0) {
        // Reset redemption
        pointsToRedeem = 0;
        redeemedDiscount = 0;
        showToast('ยกเลิกส่วนลดสะสมแต้ม', 'warning');
    } else {
        pointsToRedeem = points;
        redeemedDiscount = discountAmount;
        showToast(`สิทธิ์ส่วนลดสะสมแต้ม ฿${discountAmount} มีผลแล้ว`, 'success');
    }
    updateCartTotals();
    displaySelectedCustomer(); // Refresh buttons
}

function deselectCustomer() {
    selectedCustomer = null;
    pointsToRedeem = 0;
    redeemedDiscount = 0;
    document.getElementById('selected-customer-card').style.display = 'none';
    document.getElementById('phone-search-input').value = '';
    updateCartTotals();
}

async function registerNewCustomer(name, phone) {
    try {
        let newCust = null;
        if (dbMode === 'supabase' && supabase) {
            const { data, error } = await supabase
                .from('customers')
                .insert([{ name, phone, points: 0 }])
                .select()
                .single();
                
            if (error) {
                if (error.code === '23505') {
                    showToast('เบอร์โทรศัพท์นี้ถูกใช้ไปแล้ว', 'danger');
                    return;
                }
                throw error;
            }
            newCust = data;
        } else {
            const mockCusts = JSON.parse(localStorage.getItem('aura_mock_customers') || '[]');
            if (mockCusts.some(c => c.phone === phone)) {
                showToast('เบอร์โทรศัพท์นี้ถูกใช้ไปแล้ว', 'danger');
                return;
            }
            
            newCust = {
                id: 'cust-' + Math.random().toString(36).substr(2, 9),
                name,
                phone,
                points: 0,
                created_at: new Date().toISOString()
            };
            mockCusts.push(newCust);
            localStorage.setItem('aura_mock_customers', JSON.stringify(mockCusts));
        }
        
        showToast(`ลงทะเบียนคุณ ${name} สำเร็จ`, 'success');
        
        // Log GA Customer Registration Event
        trackGAEvent('customer_registered', 'Loyalty', name);
        
        document.getElementById('customer-register-modal').classList.remove('active');
        document.getElementById('customer-register-form').reset();
        
        // Auto select newly registered customer if we are in checkout flow
        selectedCustomer = newCust;
        displaySelectedCustomer();
        
        // Refresh customer list if on loyalty view
        if (currentView === 'loyalty-view') {
            loadLoyaltyMembers();
        }
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลงทะเบียนลูกค้า', 'danger');
    }
}

async function loadLoyaltyMembers() {
    const searchVal = document.getElementById('loyalty-search').value.toLowerCase();
    const tableBody = document.getElementById('loyalty-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">กำลังโหลดรายชื่อสมาชิก...</td></tr>';
    
    try {
        let members = [];
        if (dbMode === 'supabase' && supabase) {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            members = data;
        } else {
            members = JSON.parse(localStorage.getItem('aura_mock_customers') || '[]');
            members.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        // Filter values
        if (searchVal) {
            members = members.filter(m => m.name.toLowerCase().includes(searchVal) || m.phone.includes(searchVal));
        }
        
        tableBody.innerHTML = '';
        if (members.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">ไม่พบข้อมูลรายชื่อสมาชิก</td></tr>';
            return;
        }
        
        members.forEach(m => {
            const dateStr = new Date(m.created_at).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.phone}</td>
                <td><span class="badge badge-online">${m.points} แต้ม</span></td>
                <td>${dateStr}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline btn-add-points" data-id="${m.id}" data-name="${m.name}"><i data-lucide="plus"></i> เติม 10 แต้ม</button>
                </td>
            `;
            
            tr.querySelector('.btn-add-points').addEventListener('click', () => {
                adjustCustomerPoints(m.id, 10);
            });
            
            tableBody.appendChild(tr);
        });
        
        lucide.createIcons();
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการโหลดสมาชิก', 'danger');
    }
}

async function adjustCustomerPoints(customerId, pointsDelta) {
    try {
        if (dbMode === 'supabase' && supabase) {
            // Get current points
            const { data: customer, error: fetchErr } = await supabase
                .from('customers')
                .select('points')
                .eq('id', customerId)
                .single();
                
            if (fetchErr) throw fetchErr;
            
            const newPoints = Math.max(0, customer.points + pointsDelta);
            
            const { error: updateErr } = await supabase
                .from('customers')
                .update({ points: newPoints })
                .eq('id', customerId);
                
            if (updateErr) throw updateErr;
            
        } else {
            const mockCusts = JSON.parse(localStorage.getItem('aura_mock_customers') || '[]');
            const index = mockCusts.findIndex(c => c.id === customerId);
            if (index > -1) {
                mockCusts[index].points = Math.max(0, mockCusts[index].points + pointsDelta);
                localStorage.setItem('aura_mock_customers', JSON.stringify(mockCusts));
            }
        }
        
        showToast(`อัปเดตคะแนนเรียบร้อยแล้ว (+${pointsDelta})`, 'success');
        loadLoyaltyMembers();
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการปรับคะแนน', 'danger');
    }
}

// --- CHECKOUT & PAYMENT ---
let selectedPaymentMethod = 'cash';

function openPaymentModal() {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    const finalAmount = Math.max(0, subtotal - redeemedDiscount);
    
    document.getElementById('pay-modal-total').innerText = `฿${finalAmount.toFixed(2)}`;
    
    // Reset payment values
    selectedPaymentMethod = 'cash';
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.payment-method-btn[data-method="cash"]').classList.add('active');
    
    document.getElementById('payment-cash-panel').classList.add('active');
    document.getElementById('payment-promptpay-panel').classList.remove('active');
    
    document.getElementById('cash-received-input').value = '';
    document.getElementById('cash-change-amount').innerText = '฿0.00';
    
    document.getElementById('payment-modal').classList.add('active');
}

function calculateChange() {
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    const finalAmount = Math.max(0, subtotal - redeemedDiscount);
    const received = parseFloat(document.getElementById('cash-received-input').value) || 0;
    
    const change = Math.max(0, received - finalAmount);
    document.getElementById('cash-change-amount').innerText = `฿${change.toFixed(2)}`;
}

async function processOrderCheckout() {
    // Validate Cash Received if using Cash
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    const finalAmount = Math.max(0, subtotal - redeemedDiscount);
    
    if (selectedPaymentMethod === 'cash') {
        const received = parseFloat(document.getElementById('cash-received-input').value) || 0;
        if (received < finalAmount) {
            showToast('ยอดเงินที่รับมาไม่ครบถ้วน', 'warning');
            return;
        }
    }
    
    const checkoutBtn = document.getElementById('btn-complete-payment');
    checkoutBtn.disabled = true;
    checkoutBtn.innerText = 'กำลังประมวลผลออเดอร์...';
    
    try {
        const pointsEarned = Math.floor(finalAmount / 50);
        
        let newPointsBalance = 0;
        // Update Customer Points in Database
        if (selectedCustomer) {
            newPointsBalance = Math.max(0, selectedCustomer.points - pointsToRedeem + pointsEarned);
            
            if (dbMode === 'supabase' && supabase) {
                const { error: customerErr } = await supabase
                    .from('customers')
                    .update({ points: newPointsBalance })
                    .eq('id', selectedCustomer.id);
                    
                if (customerErr) throw customerErr;
            } else {
                const mockCusts = JSON.parse(localStorage.getItem('aura_mock_customers') || '[]');
                const idx = mockCusts.findIndex(c => c.id === selectedCustomer.id);
                if (idx > -1) {
                    mockCusts[idx].points = newPointsBalance;
                    localStorage.setItem('aura_mock_customers', JSON.stringify(mockCusts));
                }
            }
        }
        
        const orderId = 'ord-' + Math.random().toString(36).substr(2, 9);
        const orderData = {
            id: orderId,
            total_amount: subtotal,
            discount: redeemedDiscount,
            final_amount: finalAmount,
            points_earned: pointsEarned,
            points_redeemed: pointsToRedeem,
            employee_name: currentEmployee.name,
            customer_name: selectedCustomer ? selectedCustomer.name : 'ทั่วไป',
            created_at: new Date().toISOString(),
            items: cart.map(i => {
                let optionsText = '';
                if (i.options) {
                    optionsText = `${i.options.type}, ${i.options.size}, หวาน ${i.options.sweetness}`;
                } else {
                    optionsText = 'เบเกอรี่ / สินค้าทั่วไป';
                }
                return {
                    name: i.product.name,
                    quantity: i.quantity,
                    price: i.price,
                    options: optionsText
                };
            })
        };
        
        // Write order history
        if (dbMode === 'supabase' && supabase) {
            // Inserts into order table
            const { data: ord, error: oErr } = await supabase
                .from('orders')
                .insert([{
                    total_amount: subtotal,
                    discount: redeemedDiscount,
                    final_amount: finalAmount,
                    points_earned: pointsEarned,
                    points_redeemed: pointsToRedeem,
                    employee_id: currentEmployee.id,
                    customer_id: selectedCustomer ? selectedCustomer.id : null
                }])
                .select()
                .single();
                
            if (oErr) throw oErr;
            
            // Insert items
            const orderItemsInsert = cart.map(c => ({
                order_id: ord.id,
                product_id: c.product.id,
                quantity: c.quantity,
                price: c.price,
                options: c.options
            }));
            
            const { error: itemErr } = await supabase
                .from('order_items')
                .insert(orderItemsInsert);
                
            if (itemErr) throw itemErr;
        } else {
            const mockOrders = JSON.parse(localStorage.getItem('aura_mock_orders') || '[]');
            mockOrders.unshift(orderData);
            localStorage.setItem('aura_mock_orders', JSON.stringify(mockOrders));
        }
        
        showToast('ทำรายการชำระเงินเรียบร้อย!', 'success');
        
        // Log GA Checkout Event
        trackGAEvent('checkout_completed', 'POS', selectedPaymentMethod, finalAmount);
        
        // Close payment modal
        document.getElementById('payment-modal').classList.remove('active');
        
        // Render receipt modal
        renderReceipt(orderData);
        
        // Reset states
        cart = [];
        deselectCustomer();
        renderCart();
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการประมวลผลออเดอร์', 'danger');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'ยืนยันการชำระเงิน';
    }
}

function renderReceipt(order) {
    const container = document.getElementById('receipt-modal-body');
    const itemsHtml = order.items.map(i => `
        <div class="receipt-row">
            <div>
                <strong>${i.name}</strong> x${i.quantity}
                <div style="font-size:0.75rem; color:#64748b">${i.options}</div>
            </div>
            <div>฿${(i.price * i.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="receipt-header">
            <h4>AURA CAFE</h4>
            <p>กรุงเทพมหานคร ประเทศไทย</p>
            <p>โทร. 02-123-4567</p>
            <div class="receipt-divider"></div>
            <p style="font-size:0.75rem">Receipt #: ${order.id}</p>
            <p style="font-size:0.75rem">วันที่/เวลา: ${new Date(order.created_at).toLocaleString('th-TH')}</p>
            <p style="font-size:0.75rem">พนักงาน: ${order.employee_name}</p>
        </div>
        
        <div class="receipt-items">
            ${itemsHtml}
        </div>
        
        <div class="receipt-divider"></div>
        
        <div class="receipt-row">
            <div>ยอดรวม (Subtotal)</div>
            <div>฿${parseFloat(order.total_amount).toFixed(2)}</div>
        </div>
        <div class="receipt-row" style="color:red">
            <div>ส่วนลด (Discount)</div>
            <div>-฿${parseFloat(order.discount).toFixed(2)}</div>
        </div>
        
        <div class="receipt-divider"></div>
        
        <div class="receipt-total-row">
            <div>ยอดสุทธิ (Total)</div>
            <div>฿${parseFloat(order.final_amount).toFixed(2)}</div>
        </div>
        
        <div class="receipt-divider"></div>
        
        <div class="receipt-header" style="border:none; padding:0; margin:0">
            <p><strong>- ข้อมูลคะแนนสะสมสมาชิก -</strong></p>
            <p>สมาชิก: ${order.customer_name}</p>
            <p>ได้รับแต้มครั้งนี้: +${order.points_earned} แต้ม</p>
            <p>ใช้แต้มแลกสิทธิ์: -${order.points_redeemed} แต้ม</p>
            <p style="margin-top:10px">ขอบคุณที่ใช้บริการ! ขอให้เป็นวันที่สดใส</p>
        </div>
    `;
    
    document.getElementById('order-detail-modal').classList.add('active');
}

// --- DASHBOARD & ANALYTICS ---
async function loadDashboardData() {
    let rawOrders = [];
    try {
        if (dbMode === 'supabase' && supabase) {
            // Get today's start
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            
            // For analytical flexibility, query all orders
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, total_amount, discount, final_amount, points_earned, points_redeemed, created_at,
                    employees (name),
                    customers (name),
                    order_items (
                        quantity, price,
                        products (name, category)
                    )
                `)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            // Map to unified structure
            rawOrders = data.map(o => ({
                id: o.id,
                total_amount: o.total_amount,
                discount: o.discount,
                final_amount: o.final_amount,
                points_earned: o.points_earned,
                points_redeemed: o.points_redeemed,
                employee_name: o.employees ? o.employees.name : 'Unknown',
                customer_name: o.customers ? o.customers.name : 'ทั่วไป',
                created_at: o.created_at,
                items: o.order_items.map(item => ({
                    name: item.products ? item.products.name : 'Unknown Product',
                    quantity: item.quantity,
                    price: item.price,
                    options: '',
                    category: item.products ? item.products.category : 'others'
                }))
            }));
            
        } else {
            rawOrders = JSON.parse(localStorage.getItem('aura_mock_orders') || '[]');
        }
        
        ordersHistory = rawOrders;
        renderDashboardStats();
        
    } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด', 'danger');
    }
}

function renderDashboardStats() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Filter today's orders
    const todayOrders = ordersHistory.filter(o => new Date(o.created_at) >= today);
    
    let salesTodaySum = 0;
    let ordersCountToday = todayOrders.length;
    let pointsEarnedToday = 0;
    let pointsRedeemedToday = 0;
    
    todayOrders.forEach(o => {
        salesTodaySum += parseFloat(o.final_amount);
        pointsEarnedToday += o.points_earned || 0;
        pointsRedeemedToday += o.points_redeemed || 0;
    });
    
    // Update KPI UI
    document.getElementById('dashboard-sales-today').innerText = `฿${salesTodaySum.toFixed(2)}`;
    document.getElementById('dashboard-orders-today').innerText = `${ordersCountToday} รายการ`;
    document.getElementById('dashboard-points-earned').innerText = `${pointsEarnedToday} แต้ม`;
    document.getElementById('dashboard-points-redeemed').innerText = `${pointsRedeemedToday} แต้ม`;
    
    // Render Recent Transactions Table
    const recentTableBody = document.getElementById('dashboard-orders-table-body');
    recentTableBody.innerHTML = '';
    
    const displayOrders = ordersHistory.slice(0, 5); // top 5 recent orders
    
    if (displayOrders.length === 0) {
        recentTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted)">ยังไม่มีประวัติการขายสินค้า</td></tr>';
    } else {
        displayOrders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${o.id}</strong></td>
                <td>${new Date(o.created_at).toLocaleString('th-TH')}</td>
                <td>${o.customer_name}</td>
                <td>${o.employee_name}</td>
                <td class="text-accent font-bold">฿${parseFloat(o.final_amount).toFixed(2)}</td>
                <td><button class="btn btn-sm btn-outline btn-view-receipt-history"><i data-lucide="eye" style="width:14px;height:14px"></i> ดูใบเสร็จ</button></td>
            `;
            
            tr.querySelector('.btn-view-receipt-history').addEventListener('click', () => {
                renderReceipt(o);
            });
            
            recentTableBody.appendChild(tr);
        });
    }
    
    lucide.createIcons();
    
    // Draw Charts
    renderChartsData();
}

function renderChartsData() {
    // 1. Group sales by past 7 days
    const past7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        return d;
    }).reverse();
    
    const salesData = past7Days.map(day => {
        let sum = 0;
        ordersHistory.forEach(o => {
            const ordDate = new Date(o.created_at);
            ordDate.setHours(0,0,0,0);
            if (ordDate.getTime() === day.getTime()) {
                sum += parseFloat(o.final_amount);
            }
        });
        return sum;
    });
    
    const labelsDays = past7Days.map(day => {
        return day.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
    });
    
    // 2. Category Share (Coffee vs. Bakery)
    let coffeeCount = 0;
    let bakeryCount = 0;
    
    ordersHistory.forEach(o => {
        o.items.forEach(i => {
            // Determine category
            // Fallback checking logic or default category
            const isBakery = i.name.toLowerCase().includes('croissant') || 
                             i.name.toLowerCase().includes('cake') || 
                             i.name.toLowerCase().includes('cheesecake') ||
                             i.name.toLowerCase().includes('brownie') ||
                             i.category === 'bakery';
                             
            if (isBakery) {
                bakeryCount += i.quantity;
            } else {
                coffeeCount += i.quantity;
            }
        });
    });
    
    // In case no orders exist
    if (coffeeCount === 0 && bakeryCount === 0) {
        coffeeCount = 65; // Mock defaults for chart visibility
        bakeryCount = 35;
    }
    
    // Sales Chart Drawing
    if (salesChartInstance) salesChartInstance.destroy();
    const ctxSales = document.getElementById('salesChart').getContext('2d');
    salesChartInstance = new Chart(ctxSales, {
        type: 'line',
        data: {
            labels: labelsDays,
            datasets: [{
                label: 'ยอดขายสุทธิ (บาท)',
                data: salesData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
    
    // Category Chart Drawing
    if (categoryChartInstance) categoryChartInstance.destroy();
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: ['เครื่องดื่ม (Coffee)', 'เบเกอรี่ (Bakery)'],
            datasets: [{
                data: [coffeeCount, bakeryCount],
                backgroundColor: ['#8b5cf6', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } }
            }
        }
    });
}

// --- SETTINGS CONFIG SERVICE ---
function loadSettingsData() {
    document.getElementById('db-mode-selector').value = dbMode;
    document.getElementById('supabase-url').value = supabaseUrl;
    document.getElementById('supabase-key').value = supabaseKey;
    document.getElementById('ga-measurement-id').value = gaMeasurementId;
    
    toggleSupabaseFields(dbMode);
}

function toggleSupabaseFields(mode) {
    const fields = document.getElementById('supabase-config-fields');
    const testBtn = document.getElementById('btn-test-db-connection');
    
    if (mode === 'supabase') {
        fields.style.display = 'block';
        testBtn.style.display = 'inline-flex';
    } else {
        fields.style.display = 'none';
        testBtn.style.display = 'none';
    }
}

async function testSupabaseConnection(url, key) {
    if (!url || !key) {
        showToast('กรุณากรอกข้อมูล Supabase URL และ Key ให้ครบถ้วน', 'warning');
        return false;
    }
    
    try {
        const testClient = window.supabase.createClient(url, key);
        // Simple select query to test connection
        const { error } = await testClient.from('products').select('id').limit(1);
        if (error) throw error;
        
        showToast('เชื่อมต่อฐานข้อมูล Supabase สำเร็จ!', 'success');
        return true;
    } catch (err) {
        console.error(err);
        showToast('การทดสอบเชื่อมต่อล้มเหลว ตรวจสอบ URL / Key / สิทธิ์ RLS', 'danger');
        return false;
    }
}

async function saveDatabaseSettings() {
    const mode = document.getElementById('db-mode-selector').value;
    const url = document.getElementById('supabase-url').value.trim();
    const key = document.getElementById('supabase-key').value.trim();
    const gaId = document.getElementById('ga-measurement-id').value.trim();
    
    if (mode === 'supabase') {
        const connected = await testSupabaseConnection(url, key);
        if (!connected) return;
        
        supabaseUrl = url;
        supabaseKey = key;
        localStorage.setItem('aura_pos_supabase_url', url);
        localStorage.setItem('aura_pos_supabase_key', key);
    }
    
    dbMode = mode;
    localStorage.setItem('aura_pos_db_mode', mode);
    
    // Save GA Measurement ID if changed
    if (gaId !== gaMeasurementId) {
        gaMeasurementId = gaId;
        localStorage.setItem('aura_pos_ga_id', gaId);
        initGoogleAnalytics();
        trackGAEvent('ga_id_changed', 'Settings', gaId);
    }
    
    initDatabase();
    updateConnectionStatusBadge();
    showToast('บันทึกการตั้งค่าเรียบร้อยแล้วระบบจะใช้ข้อมูลใหม่ทันที', 'success');
}

// --- APP NOTIFICATION TOASTS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'check-circle';
    if (type === 'danger') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}" style="width:18px;height:18px"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Auto dismiss
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// --- ATTACH EVENT LISTENERS ---
function initEventListeners() {
    // Nav menu switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            switchView(target);
        });
    });
    
    // Login Submission
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        handleLogin(user, pass);
    });
    
    // Quick Config from Login screen
    document.getElementById('quick-config-btn').addEventListener('click', () => {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');
        
        // Mock a login session for admin so they can set config
        currentEmployee = { name: 'Temporary Setup', role: 'admin' };
        enterApplication();
        switchView('settings-view');
        showToast('กรุณากรอกข้อมูล Supabase แล้วกดบันทึก', 'warning');
    });
    
    // Logout Click
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Theme Toggle Click
    document.getElementById('theme-toggle-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
    });
    
    // Settings DB selector toggle
    document.getElementById('db-mode-selector').addEventListener('change', (e) => {
        toggleSupabaseFields(e.target.value);
    });
    
    // Test Connection click
    document.getElementById('btn-test-db-connection').addEventListener('click', () => {
        const url = document.getElementById('supabase-url').value.trim();
        const key = document.getElementById('supabase-key').value.trim();
        testSupabaseConnection(url, key);
    });
    
    // Save DB settings
    document.getElementById('btn-save-db-settings').addEventListener('click', saveDatabaseSettings);
    
    // Search input for products in catalog
    document.getElementById('product-search').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const activeTab = document.querySelector('.category-tabs .tab-btn.active').getAttribute('data-category');
        
        let filtered = products;
        if (activeTab !== 'all') {
            filtered = filtered.filter(p => p.category === activeTab);
        }
        filtered = filtered.filter(p => p.name.toLowerCase().includes(val));
        
        renderProducts(filtered);
    });
    
    // Product tabs selection
    document.querySelectorAll('.category-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.getAttribute('data-category');
            const searchVal = document.getElementById('product-search').value.toLowerCase();
            
            let filtered = products;
            if (category !== 'all') {
                filtered = filtered.filter(p => p.category === category);
            }
            if (searchVal) {
                filtered = filtered.filter(p => p.name.toLowerCase().includes(searchVal));
            }
            
            renderProducts(filtered);
        });
    });
    
    // Drink Modal option buttons click handlers
    document.querySelectorAll('#drink-type-group .pill-btn, #drink-size-group .pill-btn, #drink-sweet-group .pill-btn')
        .forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Find parent and deselect siblings
                const group = e.target.parentElement;
                group.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                calculateModalPrice();
            });
        });
        
    // Close drink option modal
    document.getElementById('btn-close-drink-modal').addEventListener('click', () => {
        document.getElementById('drink-options-modal').classList.remove('active');
    });
    document.getElementById('btn-cancel-drink-modal').addEventListener('click', () => {
        document.getElementById('drink-options-modal').classList.remove('active');
    });
    
    // Add drink to cart from modal
    document.getElementById('btn-add-drink-cart').addEventListener('click', () => {
        if (!selectedDrinkForModal) return;
        
        const type = document.querySelector('#drink-type-group .pill-btn.active').getAttribute('data-value');
        const size = document.querySelector('#drink-size-group .pill-btn.active').getAttribute('data-value');
        const sweetness = document.querySelector('#drink-sweet-group .pill-btn.active').getAttribute('data-value');
        const calculatedPrice = calculateModalPrice();
        
        const options = { type, size, sweetness };
        addToCart(selectedDrinkForModal, 1, options, calculatedPrice);
        
        document.getElementById('drink-options-modal').classList.remove('active');
        selectedDrinkForModal = null;
    });
    
    // Customer search in POS
    document.getElementById('btn-search-customer').addEventListener('click', () => {
        const phone = document.getElementById('phone-search-input').value.trim();
        searchCustomerByPhone(phone);
    });
    document.getElementById('phone-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const phone = e.target.value.trim();
            searchCustomerByPhone(phone);
        }
    });
    
    // Deselect customer
    document.getElementById('btn-deselect-customer').addEventListener('click', deselectCustomer);
    
    // Clear cart
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        if (cart.length > 0) {
            cart = [];
            deselectCustomer();
            renderCart();
            showToast('ล้างตะกร้าเรียบร้อยแล้ว', 'warning');
        }
    });
    
    // Trigger customer registration modals
    const openCustModal = () => {
        document.getElementById('customer-register-modal').classList.add('active');
    };
    document.getElementById('btn-add-customer-pos').addEventListener('click', openCustModal);
    document.getElementById('btn-new-customer-view').addEventListener('click', openCustModal);
    
    // Close customer modal
    const closeCustModal = () => {
        document.getElementById('customer-register-modal').classList.remove('active');
    };
    document.getElementById('btn-close-customer-modal').addEventListener('click', closeCustModal);
    document.getElementById('btn-cancel-customer-modal').addEventListener('click', closeCustModal);
    
    // Submit registration form
    document.getElementById('customer-register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-customer-name').value.trim();
        const phone = document.getElementById('reg-customer-phone').value.trim();
        registerNewCustomer(name, phone);
    });
    
    // Loyalty view customer search
    document.getElementById('loyalty-search').addEventListener('input', loadLoyaltyMembers);
    
    // Pay button triggers payment modal
    document.getElementById('pay-btn').addEventListener('click', openPaymentModal);
    
    // Close payment modal
    document.getElementById('btn-close-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').classList.remove('active');
    });
    document.getElementById('btn-cancel-payment').addEventListener('click', () => {
        document.getElementById('payment-modal').classList.remove('active');
    });
    
    // Payment method selector
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            selectedPaymentMethod = btn.getAttribute('data-method');
            if (selectedPaymentMethod === 'cash') {
                document.getElementById('payment-cash-panel').classList.add('active');
                document.getElementById('payment-promptpay-panel').classList.remove('active');
            } else {
                document.getElementById('payment-cash-panel').classList.remove('active');
                document.getElementById('payment-promptpay-panel').classList.add('active');
            }
        });
    });
    
    // Cash received input keyup/change
    const cashInput = document.getElementById('cash-received-input');
    cashInput.addEventListener('input', calculateChange);
    
    // Cash shortcuts buttons
    document.querySelectorAll('.cash-shortcut-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let subtotal = 0;
            cart.forEach(item => {
                subtotal += item.price * item.quantity;
            });
            const finalAmount = Math.max(0, subtotal - redeemedDiscount);
            const val = btn.getAttribute('data-val');
            
            if (val === 'exact') {
                cashInput.value = Math.ceil(finalAmount);
            } else {
                cashInput.value = parseFloat(val);
            }
            calculateChange();
        });
    });
    
    // Complete transaction button
    document.getElementById('btn-complete-payment').addEventListener('click', processOrderCheckout);
    
    // Close order receipt modal
    const closeReceipt = () => {
        document.getElementById('order-detail-modal').classList.remove('active');
    };
    document.getElementById('btn-close-order-detail-modal').addEventListener('click', closeReceipt);
    document.getElementById('btn-close-receipt-done').addEventListener('click', closeReceipt);
}
