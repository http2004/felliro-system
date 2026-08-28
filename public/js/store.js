// ==========================================
// FelliRo Public Store JavaScript
// ==========================================

// Global Toast Function
function showToast(message, type = 'info') {
  let container = document.getElementById('store-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'store-toast-container';
    container.className = 'store-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `store-toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span style="margin-left:8px;">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// Format Currency
function formatLKR(amount) {
  return 'Rs. ' + parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==========================================
// Delivery Region Logic
// ==========================================
let publicRegions = [];
let currentDeliveryFee = 0;

async function fetchPublicRegions() {
  try {
    const res = await fetch('/api/regions?t=' + new Date().getTime());
    const data = await res.json();
    if (data.success) {
      publicRegions = data.regions;
      
      const uniqueProvinces = [...new Set(publicRegions.map(r => r.province))];
      const provSelect = document.getElementById('checkout-province');
      if (provSelect) {
        provSelect.innerHTML = '<option value="">Select Province *</option>' + 
          uniqueProvinces.map(p => `<option value="${p}">${p}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load regions:', err);
  }
}

window.updateDistricts = function() {
  const provSelect = document.getElementById('checkout-province');
  const distSelect = document.getElementById('checkout-district');
  const province = provSelect.value;
  
  if (!province) {
    distSelect.innerHTML = '<option value="">Select District *</option>';
    currentDeliveryFee = 0;
    renderCartDrawer();
    return;
  }
  
  const districts = publicRegions.filter(r => r.province === province);
  distSelect.innerHTML = '<option value="">Select District *</option>' + 
    districts.map(d => `<option value="${d.name}" data-fee="${d.delivery_charge}">${d.name}</option>`).join('');
    
  currentDeliveryFee = 0;
  renderCartDrawer();
};

window.updateDeliveryFee = function() {
  const distSelect = document.getElementById('checkout-district');
  const selectedOption = distSelect.options[distSelect.selectedIndex];
  
  if (selectedOption && selectedOption.value) {
    currentDeliveryFee = parseFloat(selectedOption.getAttribute('data-fee')) || 0;
  } else {
    currentDeliveryFee = 0;
  }
  renderCartDrawer();
};

// ==========================================
// Cart Management
// ==========================================
let cart = JSON.parse(localStorage.getItem('felliro_store_cart') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCartDrawer();
});
function saveCart() {
  localStorage.setItem('felliro_store_cart', JSON.stringify(cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badges.forEach(badge => {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'inline-block' : 'none';
  });
}

let storeProductsCache = null;
async function getProductStock(productId, size, color) {
    if (!storeProductsCache) {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            storeProductsCache = data.products || [];
        } catch(e) {
            console.error("Failed to fetch stock", e);
            return 999;
        }
    }
    const p = storeProductsCache.find(x => x.id === productId);
    if (!p) return 999;
    if (p.variants && p.variants.length > 0) {
        const v = p.variants.find(x => x.size === size && x.color === color);
        return v ? v.quantity : 0;
    }
    return 999;
}

window.addToCart = async function(productId, name, price, image, size = 'M', color = 'Default') {
  const maxQty = await getProductStock(productId, size, color);
  const existing = cart.find(item => item.productId === productId && item.size === size && item.color === color);
  
  if (existing) {
    if (existing.quantity + 1 > maxQty) {
      showToast(`Sorry, only ${maxQty} available in stock!`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    if (1 > maxQty) {
      showToast(`Out of stock!`, 'warning');
      return;
    }
    cart.push({ productId, name, price: parseFloat(price), image, size, color, quantity: 1 });
  }
  saveCart();
  showToast(`Added '${name}' to your cart!`, 'success');
  openCart();
};

window.updateCartQty = async function(index, change) {
  if (cart[index]) {
    if (change > 0) {
      const item = cart[index];
      const maxQty = await getProductStock(item.productId, item.size, item.color);
      if (item.quantity + change > maxQty) {
        showToast(`Sorry, only ${maxQty} available in stock!`, 'warning');
        return;
      }
    }
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  }
};

window.removeFromCart = function(index) {
  if (cart[index]) {
    cart.splice(index, 1);
    saveCart();
  }
};

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">
        <div style="margin-bottom: 1rem;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
        <p>Your cart is beautifully empty.</p>
      </div>
    `;
    document.getElementById('cart-subtotal').textContent = formatLKR(0);
    document.getElementById('cart-delivery').textContent = 'Rs. 0.00';
    document.getElementById('cart-grand-total').textContent = formatLKR(0);
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null; this.src='/images/placeholder.svg';">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">${item.size} | ${item.color}</div>
          <div style="font-family: 'Outfit'; font-weight:600; color: var(--secondary); margin-bottom:0.5rem;">${formatLKR(item.price)}</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="cart-qty-ctrl">
              <button onclick="updateCartQty(${idx}, -1)">-</button>
              <span>${item.quantity}</span>
              <button onclick="updateCartQty(${idx}, 1)">+</button>
            </div>
            <button onclick="removeFromCart(${idx})" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cart-subtotal').textContent = formatLKR(subtotal);
  document.getElementById('cart-delivery').textContent = currentDeliveryFee > 0 ? formatLKR(currentDeliveryFee) : 'FREE';
  document.getElementById('cart-grand-total').textContent = formatLKR(subtotal + currentDeliveryFee);
}

window.openCart = function() {
  document.getElementById('cart-drawer-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
};
window.closeCart = function() {
  document.getElementById('cart-drawer-overlay').classList.remove('active');
  document.body.style.overflow = 'auto';
};

// ==========================================
// WhatsApp Checkout
// ==========================================
window.checkoutWhatsApp = async function() {
  if (cart.length === 0) return showToast('Your cart is empty', 'error');

  const name = document.getElementById('checkout-name')?.value.trim();
  const email = document.getElementById('checkout-email')?.value.trim();
  const phone = document.getElementById('checkout-phone')?.value.trim();
  const province = document.getElementById('checkout-province')?.value;
  const city = document.getElementById('checkout-district')?.value;
  const address = document.getElementById('checkout-address')?.value.trim();

  if (!name || !phone || !province || !city || !address) {
    return showToast('Please fill in all delivery details (Email is optional)', 'error');
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = subtotal + currentDeliveryFee;
  
  const itemsFormatted = cart.map((item, idx) => {
    const sizeStr = item.size && item.size !== '-' ? ` | Size: ${item.size}` : '';
    const colorStr = item.color && item.color !== '-' ? ` | Color: ${item.color}` : '';
    return `${idx + 1}️⃣ *${item.name}* [ID:${item.productId}]\n   ▫️ Qty: ${item.quantity}${sizeStr}${colorStr}\n   ▫️ Price: ${formatLKR(item.price * item.quantity)}`;
  }).join('\n\n');

  const waText = 
`🌸 *FELLIRO CLOTHING — NEW ORDER REQUEST* 🌸
━━━━━━━━━━━━━━━━━━━━

👤 *CUSTOMER INFORMATION*
• *Name:* ${name}
• *Contact:* ${phone}${email ? `\n• *Email:* ${email}` : ''}
• *Address:* ${address}
• *City / District:* ${city} (${province})

🛍️ *ORDERED ITEMS*
${itemsFormatted}

━━━━━━━━━━━━━━━━━━━━
📦 *Subtotal:* ${formatLKR(subtotal)}
🚚 *Delivery (Fardar Express):* ${currentDeliveryFee > 0 ? formatLKR(currentDeliveryFee) : 'FREE'}
💰 *Grand Total:* *${formatLKR(grandTotal)}*
━━━━━━━━━━━━━━━━━━━━

💬 _Hi Shasha, I would like to place this order. Please share the bank payment details to confirm!_ 💕`;

  const waUrl = `https://wa.me/94729985368?text=${encodeURIComponent(waText)}`;
  
  cart = [];
  saveCart();
  closeCart();

  showToast(`Redirecting to WhatsApp...`, 'success');
  setTimeout(() => window.open(waUrl, '_blank'), 1000);
};

// ==========================================
// Initializations & Animations
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  fetchPublicRegions();
  
  // Scroll Reveal Animation (Intersection Observer)
  window.observeReveals = () => {
    const reveals = document.querySelectorAll('.reveal:not(.observed)');
    if (reveals.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(reveal => {
      reveal.classList.add('observed');
      observer.observe(reveal);
    });
  };

  // Run on load
  observeReveals();
  initRandomBackgroundAnimation();

  // Mobile menu close on outside click
  document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (navLinks && navLinks.classList.contains('active')) {
      if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        navLinks.classList.remove('active');
      } else if (e.target === navLinks && e.offsetX < 0) {
        // Clicked on the ::before pseudo-element backdrop
        navLinks.classList.remove('active');
      }
    }
  });
});

function initRandomBackgroundAnimation() {
  const container = document.createElement('div');
  container.className = 'bg-animation-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const svgs = [
    // Shirt
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><g transform='translate(50, 50)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.9'><path d='M 50,40 Q 30,60 10,70 L 90,70 Q 70,60 50,40' /><path d='M 50,40 C 50,20 65,20 65,30 C 65,40 50,45 50,50' /></g></svg>`,
    // Pants
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><g transform='translate(200, 200)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.7'><rect x='20' y='30' width='50' height='60' rx='5' /><path d='M 30,30 C 30,10 60,10 60,30' /></g></svg>`,
    // Dress
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 350 350'><g transform='translate(100, 100)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.8'><path d='M 35,20 L 25,40 L 35,45 L 30,90 L 70,90 L 65,45 L 75,40 L 65,20 Z' /><path d='M 35,20 C 50,30 65,20 65,20' /></g></svg>`,
    // Handbag
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><g transform='translate(100, 50)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.85'><rect x='25' y='40' width='50' height='45' rx='6' /><path d='M 35,40 C 35,15 65,15 65,40' /><path d='M 45,60 L 55,60' /></g></svg>`,
    // Shoe/Sneaker
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 350 350'><g transform='translate(100, 100)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.75'><path d='M 20,70 L 80,70 C 90,70 95,60 85,50 L 55,50 C 45,50 35,45 25,35 L 20,35 Z' /><path d='M 30,55 L 45,55' /><path d='M 35,62 L 50,62' /></g></svg>`,
    // Hat
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><g transform='translate(80, 80)' fill='none' stroke='#ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' opacity='0.9'><path d='M 30,60 C 30,25 70,25 70,60 Z' /><path d='M 10,60 C 10,68 90,68 90,60' /><circle cx='50' cy='25' r='3' fill='#ffffff' /></g></svg>`
  ];

  const numParticles = 20;
  const particles = [];

  for (let i = 0; i < numParticles; i++) {
    const el = document.createElement('div');
    el.innerHTML = svgs[Math.floor(Math.random() * svgs.length)];
    const size = Math.random() * 150 + 150; // 150px to 300px
    el.style.position = 'absolute';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    
    let x = Math.random() * window.innerWidth;
    let y = Math.random() * window.innerHeight;
    let vx = (Math.random() - 0.5) * 1.5;
    let vy = (Math.random() - 0.5) * 1.5;
    // ensure they move at least a bit
    if (Math.abs(vx) < 0.2) vx += 0.5 * Math.sign(vx || 1);
    if (Math.abs(vy) < 0.2) vy += 0.5 * Math.sign(vy || 1);

    el.style.transform = `translate(${x}px, ${y}px)`;
    container.appendChild(el);

    particles.push({ el, x, y, vx, vy, size });
  }

  function animate() {
    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x > window.innerWidth) p.x = -p.size;
      else if (p.x < -p.size) p.x = window.innerWidth;
      
      if (p.y > window.innerHeight) p.y = -p.size;
      else if (p.y < -p.size) p.y = window.innerHeight;

      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    requestAnimationFrame(animate);
  }

  animate();
}
