// Global Toast Function
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Format Currency
function formatLKR(amount) {
  return 'Rs. ' + parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Global Delivery State for Public Cart
let publicRegions = [];
let currentDeliveryFee = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('cart-drawer-modal')) {
    await fetchPublicRegions();
  }
});

async function fetchPublicRegions() {
  try {
    const res = await fetch('/api/regions?t=' + new Date().getTime());
    const data = await res.json();
    if (data.success) {
      publicRegions = data.regions;

      const uniqueProvinces = [...new Set(publicRegions.map(r => r.province))];
      const provSelect = document.getElementById('checkout-customer-province');
      if (provSelect) {
        provSelect.innerHTML = '<option value="">Select Province *</option>' +
          uniqueProvinces.map(p => `<option value="${p}">${p}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load regions:', err);
  }
}

window.updatePublicDistricts = function () {
  const provSelect = document.getElementById('checkout-customer-province');
  const distSelect = document.getElementById('checkout-customer-district');
  const province = provSelect.value;

  if (!province) {
    distSelect.innerHTML = '<option value="">Select District *</option>';
    currentDeliveryFee = 0;
    renderCartDrawer();
    return;
  }

  const districts = publicRegions.filter(r => r.province === province);
  distSelect.innerHTML = '<option value="">Select District *</option>' +
    districts.map(d => `<option value="${d.name || d.city}" data-fee="${d.delivery_charge}">${d.name || d.city}</option>`).join('');

  currentDeliveryFee = 0;
  renderCartDrawer();
};

window.updatePublicDeliveryFee = function () {
  const distSelect = document.getElementById('checkout-customer-district');
  const selectedOption = distSelect.options[distSelect.selectedIndex];

  if (selectedOption && selectedOption.value) {
    currentDeliveryFee = parseFloat(selectedOption.getAttribute('data-fee')) || 0;
  } else {
    currentDeliveryFee = 0;
  }

  renderCartDrawer();
};

// Local Cart Management
let cart = JSON.parse(localStorage.getItem('felliro_cart') || '[]');

function saveCart() {
  localStorage.setItem('felliro_cart', JSON.stringify(cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge-count');
  if (badge) {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  }
}

function addToCart(productId, name, price, image, size = 'M', color = 'Default') {
  const existing = cart.find(item => item.productId === productId && item.size === size && item.color === color);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ productId, name, price: parseFloat(price), image, size, color, quantity: 1 });
  }
  saveCart();
  showToast(`Added '${name}' to your cart!`, 'success');
}

function updateCartQty(index, change) {
  if (cart[index]) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  }
}

function removeFromCart(index) {
  if (cart[index]) {
    cart.splice(index, 1);
    saveCart();
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const grandTotalEl = document.getElementById('cart-grand-total');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛍️</div>
        <h4>Your Shopping Cart is Empty</h4>
        <p style="font-size: 0.85rem; margin-top: 0.4rem;">Explore our catalog and add your favorite items!</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = formatLKR(0);
    if (grandTotalEl) grandTotalEl.textContent = formatLKR(0);
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div style="display: flex; gap: 12px; padding: 1rem 0; border-bottom: 1px solid #E2E8F0; align-items: center;">
        <img src="${item.image}" alt="${item.name}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 10px;" onerror="this.onerror=null; this.src='/images/placeholder.svg';">
        <div style="flex-grow: 1;">
          <h4 style="font-size: 0.95rem; font-weight: 700; line-height: 1.2;">${item.name}</h4>
          <div style="font-size: 0.78rem; color: #64748b;">Size: ${item.size} | Color: ${item.color}</div>
          <div style="font-weight: 800; color: var(--primary); font-size: 0.95rem; margin-top: 2px;">${formatLKR(item.price)}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button onclick="updateCartQty(${idx}, -1)" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid #CBD5E1; background: #FFF; cursor: pointer;">-</button>
          <span style="font-weight: 700; font-size: 0.9rem; min-width: 18px; text-align: center;">${item.quantity}</span>
          <button onclick="updateCartQty(${idx}, 1)" style="width: 26px; height: 26px; border-radius: 6px; border: 1px solid #CBD5E1; background: #FFF; cursor: pointer;">+</button>
        </div>
        <button onclick="removeFromCart(${idx})" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #EF4444; margin-left: 6px;">🗑️</button>
      </div>
    `;
  }).join('');

  const deliveryFeeEl = document.getElementById('cart-delivery-fee');

  if (subtotalEl) subtotalEl.textContent = formatLKR(subtotal);
  if (deliveryFeeEl) deliveryFeeEl.textContent = currentDeliveryFee > 0 ? formatLKR(currentDeliveryFee) : 'FREE';
  if (grandTotalEl) grandTotalEl.textContent = formatLKR(subtotal + currentDeliveryFee);
}

// Multi-Item WhatsApp Checkout
async function checkoutCartWhatsApp() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'warning');
    return;
  }

  const nameInput = document.getElementById('checkout-customer-name');
  const phoneInput = document.getElementById('checkout-customer-phone');
  const provSelect = document.getElementById('checkout-customer-province');
  const distSelect = document.getElementById('checkout-customer-district');
  const addressInput = document.getElementById('checkout-customer-address');

  const customerName = nameInput ? nameInput.value.trim() : '';
  const customerPhone = phoneInput ? phoneInput.value.trim() : '';
  const province = provSelect ? provSelect.value : '';
  const city = distSelect ? distSelect.value : '';
  const customerAddress = addressInput ? addressInput.value.trim() : '';

  if (!customerName || !customerPhone || !province || !city || !customerAddress) {
    showToast('Please fill in all required Customer & Delivery details', 'warning');
    return;
  }

  const payload = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    province: province,
    city: city,
    delivery_fee: currentDeliveryFee,
    payment_method: 'whatsapp',
    items: cart.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }))
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      const orderNum = data.order.order_number;
      let itemsListText = cart.map(item => `• *${item.name}* (Size: ${item.size}, Color: ${item.color}) x ${item.quantity} = ${formatLKR(item.price * item.quantity)}`).join('\n');

      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const trackingUrl = `${window.location.origin}/tracking?order=${orderNum}`;
      const waText = `✨ *FelliRo New WhatsApp Order*\nInvoice #: *${orderNum}*\n\n👤 *Customer:* ${customerName}\n📞 *Phone:* ${customerPhone}\n📍 *Address:* ${customerAddress}\n🗺️ *Region:* ${city}, ${province}\n\n🛍️ *Items Ordered:*\n${itemsListText}\n\n🚚 *Delivery Charge:* ${currentDeliveryFee > 0 ? formatLKR(currentDeliveryFee) : 'FREE'}\n💳 *Grand Total: ${formatLKR(subtotal + currentDeliveryFee)}*\n\n🔗 Live Order Tracking Link: ${trackingUrl}\n\nPlease confirm my order. Thank you!`;

      const waUrl = `https://wa.me/94729985368?text=${encodeURIComponent(waText)}`;

      cart = [];
      saveCart();
      closeModal('cart-drawer-modal');

      showToast(`Order ${orderNum} created! Redirecting to WhatsApp...`, 'success');
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 1000);
    } else {
      showToast(data.message || 'Checkout failed', 'error');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Failed to connect to checkout service', 'error');
  }
}

// Single Item WhatsApp Order Link
window.orderDirectWhatsApp = function (productId, name, price, size = 'M', color = 'Default') {
  const phone = '94729985368'; // Official WhatsApp Number
  const text = `Hi FelliRo! I would like to order:\n\n👗 *${name}*\n💰 Price: ${formatLKR(price)}\n📏 Size: ${size}\n🎨 Color: ${color}\n\nPlease confirm availability and payment details. Thank you!`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// Modal Helpers for Public Pages
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// Quick View Modal Opener
async function openQuickView(productId) {
  const modalContent = document.getElementById('quick-view-content');
  if (!modalContent) return;

  modalContent.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading details...</div>';
  openModal('quick-view-modal');

  try {
    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();

    if (data.success && data.product) {
      const p = data.product;
      const img = p.images && p.images.length > 0 ? p.images[0].image_url : 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80';

      let uniqueColors = [];
      let uniqueSizes = [];
      let variants = p.variants || [];
      
      variants.forEach(v => {
        if (v.color && !uniqueColors.includes(v.color)) uniqueColors.push(v.color);
        if (v.size && !uniqueSizes.includes(v.size)) uniqueSizes.push(v.size);
      });
      
      if (uniqueColors.length === 0) uniqueColors.push(p.color || 'Default');
      if (uniqueSizes.length === 0) uniqueSizes.push(p.size || 'M');

      window.currentProductVariants = variants;
      window.currentDefaultImg = img;
      window.currentSelectedSize = uniqueSizes[0];
      window.currentSelectedColor = uniqueColors[0];
      window.currentProductId = p.id;
      window.currentProductName = p.name.replace(/'/g, "\\'");
      window.currentProductPrice = p.price;

      const colorBtns = uniqueColors.map(c => 
        `<button class="variant-btn color-btn ${c === window.currentSelectedColor ? 'active' : ''}" onclick="selectVariantColor('${c}')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; margin-right: 5px; background: ${c === window.currentSelectedColor ? 'var(--primary)' : '#fff'}; color: ${c === window.currentSelectedColor ? '#fff' : '#333'};">${c}</button>`
      ).join('');

      const sizeBtns = uniqueSizes.map(s => 
        `<button class="variant-btn size-btn ${s === window.currentSelectedSize ? 'active' : ''}" onclick="selectVariantSize('${s}')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; margin-right: 5px; background: ${s === window.currentSelectedSize ? 'var(--primary)' : '#fff'}; color: ${s === window.currentSelectedSize ? '#fff' : '#333'};">${s}</button>`
      ).join('');

      modalContent.innerHTML = `
        <div style="border-radius: 16px; overflow: hidden; height: 350px;">
          <img id="qv-main-image" src="${img}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/images/placeholder.svg';">
        </div>
        <div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 0.4rem;">
            ${p.category_name || 'Fashion'}
          </div>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.6rem;">${p.name}</h2>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--dark); margin-bottom: 1rem;">
            ${formatLKR(p.price)}
          </div>
          <p style="color: #64748b; font-size: 0.92rem; margin-bottom: 1.2rem; line-height: 1.5;">
            ${p.description || 'Premium Sri Lankan crafted fashion item designed for durability, comfort, and style.'}
          </p>
          <div style="margin-bottom: 1rem;">
            <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">Colors:</div>
            <div id="qv-colors-container">${colorBtns}</div>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 5px;">Sizes:</div>
            <div id="qv-sizes-container">${sizeBtns}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="btn btn-outline" id="qv-add-cart-btn" onclick="addToCart(window.currentProductId, window.currentProductName, window.currentProductPrice, document.getElementById('qv-main-image').src, window.currentSelectedSize, window.currentSelectedColor); closeModal('quick-view-modal');" ${p.quantity <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              <svg style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> Add To Cart
            </button>
            <button class="btn btn-whatsapp" id="qv-buy-wa-btn" onclick="openWhatsAppInquiry(window.currentProductName, window.currentProductPrice, window.currentSelectedSize, window.currentSelectedColor)" ${p.quantity <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed; background-color: #64748b;"' : ''}>
              <svg style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Buy WhatsApp
            </button>
          </div>
        </div>
      `;
      // Trigger initial image update if the first selected color has a variant image
      selectVariantColor(window.currentSelectedColor, false);
    }
  } catch (err) {
    console.error('Error opening quick view:', err);
  }
}

window.selectVariantColor = function(color, updateButtons = true) {
  window.currentSelectedColor = color;
  
  if (updateButtons) {
    const btns = document.querySelectorAll('.color-btn');
    btns.forEach(b => {
      if (b.innerText === color) {
        b.classList.add('active');
        b.style.background = 'var(--primary)';
        b.style.color = '#fff';
      } else {
        b.classList.remove('active');
        b.style.background = '#fff';
        b.style.color = '#333';
      }
    });
  }

  // Find variant with this color and check if it has an image
  const variant = window.currentProductVariants.find(v => v.color === color);
  const mainImage = document.getElementById('qv-main-image');
  if (mainImage) {
    if (variant && variant.image_url && variant.image_url !== 'null' && variant.image_url.trim() !== '') {
      mainImage.src = variant.image_url;
    } else {
      mainImage.src = window.currentDefaultImg;
    }
  }
}

window.selectVariantSize = function(size) {
  window.currentSelectedSize = size;
  
  const btns = document.querySelectorAll('.size-btn');
  btns.forEach(b => {
    if (b.innerText === size) {
      b.classList.add('active');
      b.style.background = 'var(--primary)';
      b.style.color = '#fff';
    } else {
      b.classList.remove('active');
      b.style.background = '#fff';
      b.style.color = '#333';
    }
  });
}

// Reset Filters Function
function resetPublicFilters() {
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  const priceRange = document.getElementById('price-range');
  const priceDisplay = document.getElementById('price-range-val');
  const sortSelect = document.getElementById('sort-filter');
  const sizePills = document.querySelectorAll('.size-pill');

  if (searchInput) searchInput.value = '';
  if (categorySelect) categorySelect.value = '';
  if (priceRange) priceRange.value = 15000;
  if (priceDisplay) priceDisplay.textContent = formatLKR(15000);
  if (sortSelect) sortSelect.value = 'newest';
  sizePills.forEach(p => p.classList.remove('active'));

  if (document.getElementById('public-products-container')) {
    initProductsPage();
  }
}

// App Controller
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('scroll', handleNavbarScroll);

  if (document.getElementById('product-list')) {
    loadProducts();
  }

  updateCartBadge();
  renderCartDrawer();

  if (document.getElementById('public-products-container')) {
    initProductsPage();
  }

  if (document.getElementById('featured-products-container')) {
    initLandingPage();
  }

  if (document.getElementById('tracking-form')) {
    initTrackingPage();
  }
});

// Landing Page Loader
async function initLandingPage() {
  const container = document.getElementById('featured-products-container');
  if (!container) return;

  try {
    const res = await fetch('/api/products?is_trending=true');
    const data = await res.json();

    if (data.success && data.products.length > 0) {
      container.innerHTML = data.products.map(p => renderProductCard(p)).join('');
    } else {
      container.innerHTML = '<p class="text-muted">No featured products currently available.</p>';
    }
  } catch (err) {
    console.error('Error loading featured items:', err);
  }
}

// Products Catalog Loader with Search & Filters
async function initProductsPage() {
  const container = document.getElementById('public-products-container');
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  const priceRange = document.getElementById('price-range');
  const priceDisplay = document.getElementById('price-range-val');
  const sortSelect = document.getElementById('sort-filter');
  const sizePills = document.querySelectorAll('.size-pill');

  let activeSize = '';

  sizePills.forEach(pill => {
    pill.addEventListener('click', () => {
      sizePills.forEach(p => p.classList.remove('active'));
      if (activeSize === pill.dataset.size) {
        activeSize = '';
      } else {
        pill.classList.add('active');
        activeSize = pill.dataset.size;
      }
      fetchFilteredProducts();
    });
  });

  if (priceRange && priceDisplay) {
    priceRange.addEventListener('input', (e) => {
      priceDisplay.textContent = formatLKR(e.target.value);
    });
    priceRange.addEventListener('change', fetchFilteredProducts);
  }

  if (categorySelect) categorySelect.addEventListener('change', fetchFilteredProducts);
  if (sortSelect) sortSelect.addEventListener('change', fetchFilteredProducts);

  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(fetchFilteredProducts, 400);
    });
  }

  async function fetchFilteredProducts() {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><div class="spinner">Loading products...</div></div>';

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (categorySelect && categorySelect.value) params.append('category', categorySelect.value);
    if (priceRange && priceRange.value) params.append('max_price', priceRange.value);
    if (activeSize) params.append('size', activeSize);
    if (sortSelect && sortSelect.value) params.append('sort', sortSelect.value);

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.products.length > 0) {
        container.innerHTML = data.products.map(p => renderProductCard(p)).join('');
        if (window.observeReveals) window.observeReveals();
      } else {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;">
            <h3>No products found matching your filters</h3>
            <p style="color: #64748b; margin-top: 0.5rem;">Try adjusting your search terms or clearing price & size filters.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Error fetching filtered products:', err);
      showToast('Failed to load products', 'error');
    }
  }

  fetchFilteredProducts();
}

// Render HTML Product Card
function renderProductCard(p) {
  const image = p.primary_image || 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80';
  const badge = p.quantity <= 0 ? '<span class="badge-tag" style="background: #ef4444; color: white;">Out of Stock</span>' : (p.is_trending ? '<span class="badge-tag">Trending</span>' : (p.quantity <= p.min_stock_alert ? '<span class="badge-tag hot">Low Stock</span>' : ''));

  return `
    <div class="product-card reveal">
      <div class="product-img-holder">
        ${badge}
        <img src="${image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='/images/placeholder.svg';">
      </div>
      <div class="product-info">
        <div class="product-category">${p.category_name || 'Clothing'}</div>
        <h3 class="product-name">${p.name}</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 0.5rem;">
          <span style="font-size: 0.8rem; background: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Size: ${p.size || 'M'}</span>
          <span style="font-size: 0.8rem; background: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Color: ${p.color || 'Default'}</span>
        </div>
        <div class="product-price">${formatLKR(p.price)}</div>
        <div class="product-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <button class="btn btn-outline btn-sm" onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${image}', '${p.size}', '${p.color}')" ${p.quantity <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <svg style="width: 14px; height: 14px; vertical-align: middle; margin-right: 2px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> Add
          </button>
          <button class="btn btn-primary btn-sm" onclick="openQuickView(${p.id})">
            <svg style="width: 14px; height: 14px; vertical-align: middle; margin-right: 2px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Details
          </button>
        </div>
      </div>
    </div>
  `;
}

// Order Tracking System
function initTrackingPage() {
  const form = document.getElementById('tracking-form');
  const input = document.getElementById('order-number-input');
  const resultCard = document.getElementById('tracking-result');

  const urlParams = new URLSearchParams(window.location.search);
  const directOrder = urlParams.get('order');
  if (directOrder && input) {
    input.value = directOrder;
    fetchTracking(directOrder);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const orderNum = input.value.trim();
      if (!orderNum) {
        showToast('Please enter a valid order number', 'warning');
        return;
      }
      fetchTracking(orderNum);
    });
  }

  async function fetchTracking(orderNum) {
    resultCard.innerHTML = '<div style="text-align: center; padding: 2rem;">Searching order database...</div>';

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(orderNum)}`);
      const data = await res.json();

      if (!data.success || !data.order) {
        resultCard.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #EF4444;">
            <h3>❌ Order Not Found</h3>
            <p style="color: #64748b; margin-top: 0.5rem;">Please double check your invoice number (e.g. FELLIRO-2026-001) and try again.</p>
          </div>
        `;
        return;
      }

      renderTrackingDetails(data.order);
    } catch (err) {
      console.error('Error fetching order tracking:', err);
      showToast('Error tracking order', 'error');
    }
  }

  function renderTrackingDetails(order) {
    const steps = [
      { key: 'pending', title: 'Order Received', icon: '📝' },
      { key: 'processing', title: 'Processing & Packing', icon: '📦' },
      { key: 'ready_for_dispatch', title: 'Ready for Dispatch', icon: '🏷️' },
      { key: 'handed_to_courier', title: 'Handed to Courier', icon: '🚚' },
      { key: 'in_transit', title: 'In Transit', icon: '🛣️' },
      { key: 'delivered', title: 'Delivered', icon: '🎉' }
    ];

    const currentIdx = steps.findIndex(s => s.key === order.order_status);

    let timelineHtml = steps.map((s, idx) => {
      let stateClass = '';
      if (currentIdx > idx) stateClass = 'completed';
      else if (currentIdx === idx) stateClass = 'active';

      return `
        <div class="timeline-step ${stateClass}">
          <div class="step-node">${s.icon}</div>
          <div class="step-title">${s.title}</div>
        </div>
      `;
    }).join('');

    let itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #f1f5f9;">
        <div>
          <strong>${item.product_name}</strong> (Size: ${item.size}, Color: ${item.color}) x ${item.quantity}
        </div>
        <div style="font-weight: 700;">${formatLKR(item.total)}</div>
      </div>
    `).join('');

    const cleanHistory = [];
    let lastStatus = null;
    for (const h of (order.history || [])) {
      if (h.status !== lastStatus) {
        cleanHistory.push(h);
        lastStatus = h.status;
      }
    }

    let historyHtml = cleanHistory.map(h => `
      <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 0.6rem 0;">
        <span style="font-size: 0.8rem; background: #F1F5F9; padding: 4px 10px; border-radius: 6px; font-weight: 600; min-width: 140px;">
          ${new Date(h.created_at).toLocaleString('en-LK')}
        </span>
        <div>
          <span class="status-badge status-${h.status}">${(h.status || '').replace(/_/g, ' ')}</span>
          <div style="font-size: 0.88rem; color: #475569; margin-top: 2px;">${h.note || ''}</div>
        </div>
      </div>
    `).join('');

    let courierCardHtml = '';
    if (order.tracking_number) {
      const cTrk = order.courier_tracking;
      if (cTrk && cTrk.success) {
        courierCardHtml = `
          <div style="background: #0f172a; color: #fff; padding: 1.2rem; border-radius: 12px; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Fardar Express Courier Status</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #38bdf8; margin-top: 2px;">
                ${cTrk.trackingNumber || order.tracking_number} &bull; <span style="color: #4ade80;">${cTrk.courierStatus}</span>
              </div>
              <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 4px;">Current Hub: 📍 ${cTrk.branch || 'In Transit'} ${cTrk.lastUpdate ? `| Last Update: ${cTrk.lastUpdate}` : ''}</div>
            </div>
            <a href="https://www.fdedomestic.com/" target="_blank" style="background: rgba(255,255,255,0.15); color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">
              Courier Site ↗
            </a>
          </div>
        `;
      } else {
        courierCardHtml = `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 10px; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem;">
            <div>
              <span style="font-weight: 700; color: var(--primary);">Fardar Express Waybill:</span>
              <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${order.tracking_number}</span>
            </div>
            <a href="https://www.fdedomestic.com/" target="_blank" style="color: var(--primary); font-size: 0.85rem; font-weight: 600; text-decoration: underline;">
              Track on Courier Portal ↗
            </a>
          </div>
        `;
      }
    }

    resultCard.innerHTML = `
      <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <h2>Invoice #${order.order_number}</h2>
          <span class="status-badge status-${order.order_status}" style="font-size: 1rem; padding: 0.5rem 1.2rem;">
            ${order.order_status.replace(/_/g, ' ')}
          </span>
        </div>
        <p style="color: #64748b; font-size: 0.95rem; margin-top: 0.4rem;">
          Customer: <strong>${order.customer_name}</strong> (${order.customer_phone}) | Location: ${order.city || 'Colombo'}, ${order.province || ''}
        </p>
        ${courierCardHtml}
      </div>

      <div class="timeline">
        ${timelineHtml}
      </div>

      <div style="margin-top: 2.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 14px; border: 1px solid #e2e8f0;">
          <h4 style="margin-bottom: 1rem;">Items Ordered</h4>
          ${itemsHtml}
          <div style="display: flex; justify-content: space-between; margin-top: 1rem; font-size: 1.2rem; font-weight: 800;">
            <span>Total:</span>
            <span>${formatLKR(order.total_amount)}</span>
          </div>
        </div>

        <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 14px; border: 1px solid #e2e8f0;">
          <h4 style="margin-bottom: 1rem;">Status Audit History</h4>
          ${historyHtml}
        </div>
      </div>
    `;
  }
}
