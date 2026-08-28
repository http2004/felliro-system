// Global Helper Functions for Admin Portal
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `hz-toast hz-toast-${type}`;
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    background: #FFFFFF;
    color: #1B2559;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 14px;
    box-shadow: 0px 18px 40px rgba(112, 144, 176, 0.22);
    border-left: 4px solid ${type === 'success' ? '#01B574' : type === 'error' ? '#EE5D50' : '#4318FF'};
    pointer-events: auto;
    animation: hzToastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  `;

  const iconSvg = type === 'success'
    ? `<svg style="width: 20px; height: 20px; stroke: #01B574;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : type === 'error'
      ? `<svg style="width: 20px; height: 20px; stroke: #EE5D50;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`
      : `<svg style="width: 20px; height: 20px; stroke: #4318FF;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;

  toast.innerHTML = `
    <span style="display: flex; align-items: center;">${iconSvg}</span>
    <div style="flex: 1;">${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
window.showToast = showToast;

// Format Currency
function formatLKR(amount) {
  if (amount === undefined || amount === null) return 'Rs. 0.00';
  return 'Rs. ' + parseFloat(amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format Date & Time
function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

// Format Date Only
function formatDateOnly(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function getAuthToken() {
  return localStorage.getItem('felliro_token');
}

function checkAdminAuth() {
  const token = getAuthToken();
  if (!token && !window.location.pathname.includes('/login')) {
    window.location.href = '/admin/login';
  }
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
}

function adminLogout() {
  localStorage.removeItem('felliro_token');
  localStorage.removeItem('felliro_user');
  window.location.href = '/admin/login';
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// Global Edit, Stock, Delete Product & Order Handlers
async function editProductModal(id) {
  try {
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json();
    if (data.success && data.product) {
      const p = data.product;
      document.getElementById('product-id').value = p.id;
      document.getElementById('product-name').value = p.name || '';
      document.getElementById('product-price').value = p.price || '';
      document.getElementById('product-cost').value = p.cost_price || '';
      document.getElementById('product-category').value = p.category_id || 1;
      document.getElementById('product-qty').value = p.quantity || 0;

      // Initialize Variants
      renderVariants(p.variants || []);

      document.getElementById('product-min-stock').value = p.min_stock_alert || 5;
      document.getElementById('product-image-url').value = '';
      document.getElementById('product-desc').value = p.description || '';
      document.getElementById('product-trending').checked = Boolean(p.is_trending);
      
      const modalTitle = document.getElementById('product-modal-title');
      if (modalTitle) modalTitle.textContent = `Edit Product: ${p.name}`;

      const feedback = document.getElementById('upload-feedback');
      if (feedback) feedback.style.display = 'none';

      openModal('product-modal');
    }
  } catch (err) {
    console.error('Error fetching product for edit:', err);
    showToast('Failed to load product details', 'error');
  }
}

async function quickStockModal(id, currentQty) {
  // Since stock is now managed at the variant level, 
  // redirecting to the full edit modal is the safest way to ensure variations are updated correctly.
  editProductModal(id);
}

async function deleteProductModal(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from stock?`)) return;

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Product "${name}" deleted successfully`, 'success');
      if (typeof window.loadAdminProducts === 'function') {
        window.loadAdminProducts();
      }
      if (document.getElementById('admin-dashboard-view') && typeof initAdminDashboard === 'function') {
        initAdminDashboard();
      }
    } else {
      showToast(data.message || 'Failed to delete product', 'error');
    }
  } catch (err) {
    console.error('Delete product error:', err);
    showToast('Error deleting product', 'error');
  }
}

async function deleteOrderModal(id, orderNumber) {
  if (!confirm(`Are you sure you want to delete order #${orderNumber}? This will permanently remove the order record and restore any deducted item stock.`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || `Order #${orderNumber} deleted!`, 'success');
      if (document.getElementById('admin-orders-view')) initAdminOrders();
      if (document.getElementById('admin-dashboard-view')) initAdminDashboard();
    } else {
      showToast(data.message || 'Failed to delete order', 'error');
    }
  } catch (err) {
    console.error('Delete order error:', err);
    showToast('Error deleting order', 'error');
  }
}

// Sri Lanka 9 Provinces & 25 Districts Mapping with Default Courier Charges
const slProvincesAndDistricts = {
  "Western": [
    { name: "Colombo", charge: 350 },
    { name: "Gampaha", charge: 400 },
    { name: "Kalutara", charge: 400 }
  ],
  "Central": [
    { name: "Kandy", charge: 450 },
    { name: "Matale", charge: 450 },
    { name: "Nuwara Eliya", charge: 500 }
  ],
  "Southern": [
    { name: "Galle", charge: 450 },
    { name: "Matara", charge: 450 },
    { name: "Hambantota", charge: 500 }
  ],
  "Northern": [
    { name: "Jaffna", charge: 500 },
    { name: "Kilinochchi", charge: 500 },
    { name: "Mannar", charge: 500 },
    { name: "Vavuniya", charge: 500 },
    { name: "Mullaitivu", charge: 500 }
  ],
  "Eastern": [
    { name: "Trincomalee", charge: 500 },
    { name: "Batticaloa", charge: 500 },
    { name: "Ampara", charge: 500 }
  ],
  "North Western": [
    { name: "Kurunegala", charge: 450 },
    { name: "Puttalam", charge: 450 }
  ],
  "North Central": [
    { name: "Anuradhapura", charge: 450 },
    { name: "Polonnaruwa", charge: 450 }
  ],
  "Uva": [
    { name: "Badulla", charge: 500 },
    { name: "Monaragala", charge: 500 }
  ],
  "Sabaragamuwa": [
    { name: "Ratnapura", charge: 450 },
    { name: "Kegalle", charge: 450 }
  ]
};

window.onPosProvinceChange = function () {
  const provinceSelect = document.getElementById('pos-province');
  const districtSelect = document.getElementById('pos-city');
  if (!provinceSelect || !districtSelect) return;

  const province = provinceSelect.value;
  const districts = slProvincesAndDistricts[province] || slProvincesAndDistricts["Western"];

  districtSelect.innerHTML = districts.map((d, idx) => `
    <option value="${d.name}" ${idx === 0 ? 'selected' : ''} data-charge="${d.charge}">${d.name} District (Charge: LKR ${d.charge})</option>
  `).join('');

  onPosDistrictChange();
};

window.onPosDistrictChange = function () {
  const districtSelect = document.getElementById('pos-city');
  const deliveryFeeInput = document.getElementById('pos-delivery-fee');
  if (!districtSelect || !deliveryFeeInput) return;

  const selectedOpt = districtSelect.options[districtSelect.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.charge) {
    deliveryFeeInput.value = selectedOpt.dataset.charge;
    if (window.renderPosCart) window.renderPosCart();
  }
};

window.onEditProvinceChange = function (selectedDistrict = '') {
  const provinceSelect = document.getElementById('edit-province');
  const districtSelect = document.getElementById('edit-city');
  if (!provinceSelect || !districtSelect) return;

  const province = provinceSelect.value;
  const districts = slProvincesAndDistricts[province] || slProvincesAndDistricts["Western"];

  districtSelect.innerHTML = districts.map(d => `
    <option value="${d.name}" ${d.name === selectedDistrict ? 'selected' : ''}>${d.name} District</option>
  `).join('');
};

// Global POS Product & Cascading Region Filter State
window.allPosProducts = [];
window.posCart = [];

async function openPosOrderModal() {
  const searchInput = document.getElementById('pos-product-search');

  if (searchInput) searchInput.value = '';
  window.posCart = [];
  renderPosCart();
  onPosProvinceChange();

  try {
    const res = await fetch('/api/admin/products', { headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      window.allPosProducts = data.products.filter(p => p.status === 'active' && p.quantity > 0);
      filterPosProducts();
    }

  } catch (err) {
    console.error('Error opening POS modal:', err);
  }

  openModal('pos-modal');
}

function filterPosProducts() {
  const searchInput = document.getElementById('pos-product-search');
  const selectEl = document.getElementById('pos-product-id');
  const labelEl = document.getElementById('pos-product-count-label');
  if (!selectEl) return;

  const term = searchInput ? searchInput.value.toLowerCase() : '';
  const filtered = window.allPosProducts.filter(p =>
    p.name.toLowerCase().includes(term) ||
    (p.category_name && p.category_name.toLowerCase().includes(term))
  );

  if (filtered.length === 0) {
    selectEl.innerHTML = '<option value="" disabled>No products matching your search term</option>';
    if (labelEl) labelEl.textContent = '0 items found matching search.';
    return;
  }

  selectEl.innerHTML = filtered.map((p, idx) => `
    <option value="${p.id}" ${idx === 0 ? 'selected' : ''}>
      ${p.name} (Price: ${formatLKR(p.price)} | Total Stock: ${p.quantity})
    </option>
  `).join('');

  if (labelEl) labelEl.textContent = `Showing ${filtered.length} available item(s). Click to select.`;

  // Trigger variant population for the first item
  if (window.onPosProductSelect) {
    window.onPosProductSelect();
  }
}

window.onPosProductSelect = function () {
  const selectEl = document.getElementById('pos-product-id');
  const sizeSelect = document.getElementById('pos-size');
  const colorSelect = document.getElementById('pos-color');

  if (!selectEl || !sizeSelect || !colorSelect) return;

  const productId = parseInt(selectEl.value);
  const product = window.allPosProducts.find(p => p.id === productId);

  if (!product || !product.variants || product.variants.length === 0) {
    sizeSelect.innerHTML = '<option value="-">-</option>';
    colorSelect.innerHTML = '<option value="-">-</option>';
    return;
  }

  // Get unique sizes and colors that have stock
  const availableVariants = product.variants.filter(v => v.quantity > 0);

  if (availableVariants.length === 0) {
    sizeSelect.innerHTML = '<option value="" disabled>Out of Stock</option>';
    colorSelect.innerHTML = '<option value="" disabled>Out of Stock</option>';
    return;
  }

  const sizes = [...new Set(availableVariants.map(v => v.size))];
  const colors = [...new Set(availableVariants.map(v => v.color))];

  sizeSelect.innerHTML = sizes.map((s, idx) => `<option value="${s}" ${idx === 0 ? 'selected' : ''}>${s}</option>`).join('');
  colorSelect.innerHTML = colors.map((c, idx) => `<option value="${c}" ${idx === 0 ? 'selected' : ''}>${c}</option>`).join('');

  if (window.updatePosQtyLimit) window.updatePosQtyLimit();
}

window.updatePosQtyLimit = function () {
  const selectEl = document.getElementById('pos-product-id');
  const sizeSelect = document.getElementById('pos-size');
  const colorSelect = document.getElementById('pos-color');
  const qtyInput = document.getElementById('pos-quantity');

  if (!selectEl || !sizeSelect || !colorSelect || !qtyInput) return;

  const productId = parseInt(selectEl.value);
  const size = sizeSelect.value;
  const color = colorSelect.value;

  const product = window.allPosProducts.find(p => p.id === productId);
  if (!product || !product.variants) return;

  const variant = product.variants.find(v => v.size === size && v.color === color);
  if (variant) {
    qtyInput.max = variant.quantity;
    if (parseInt(qtyInput.value) > variant.quantity) {
      qtyInput.value = variant.quantity;
    }
  } else {
    qtyInput.max = 1;
    qtyInput.value = 1;
  }
}

window.addToPosCart = function () {
  const selectEl = document.getElementById('pos-product-id');
  const sizeSelect = document.getElementById('pos-size');
  const colorSelect = document.getElementById('pos-color');
  const qtyInput = document.getElementById('pos-quantity');

  if (!selectEl || !selectEl.value || !sizeSelect.value || !colorSelect.value) {
    showToast('Please select a product and valid size/color.', 'error');
    return;
  }

  const productId = parseInt(selectEl.value);
  const size = sizeSelect.value;
  const color = colorSelect.value;
  const qty = parseInt(qtyInput.value) || 1;

  if (qty <= 0) {
    showToast('Quantity must be at least 1.', 'error');
    return;
  }

  const product = window.allPosProducts.find(p => p.id === productId);
  if (!product) return;

  const variant = product.variants.find(v => v.size === size && v.color === color);
  if (!variant || variant.quantity < qty) {
    showToast(`Not enough stock. Available: ${variant ? variant.quantity : 0}`, 'error');
    return;
  }

  const existingIdx = window.posCart.findIndex(item => item.product_id === productId && item.size === size && item.color === color);

  if (existingIdx >= 0) {
    const newQty = window.posCart[existingIdx].quantity + qty;
    if (variant.quantity < newQty) {
      showToast(`Cannot add more. Total stock: ${variant.quantity}`, 'error');
      return;
    }
    window.posCart[existingIdx].quantity = newQty;
    window.posCart[existingIdx].total = newQty * window.posCart[existingIdx].price;
  } else {
    window.posCart.push({
      product_id: productId,
      name: product.name,
      size: size,
      color: color,
      price: product.price,
      quantity: qty,
      total: product.price * qty
    });
  }

  showToast('Added to order', 'success');
  qtyInput.value = 1;
  renderPosCart();
}

window.removeFromPosCart = function (index) {
  window.posCart.splice(index, 1);
  renderPosCart();
}

window.renderPosCart = function () {
  const cartBody = document.getElementById('pos-cart-body');
  const subtotalEl = document.getElementById('pos-subtotal');
  const deliveryDisplayEl = document.getElementById('pos-delivery-display');
  const grandTotalEl = document.getElementById('pos-grand-total');
  const deliveryFeeInput = document.getElementById('pos-delivery-fee');

  if (!cartBody) return;

  const deliveryFee = deliveryFeeInput ? parseFloat(deliveryFeeInput.value) || 0 : 0;

  if (window.posCart.length === 0) {
    cartBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Cart is empty. Add items above.</td></tr>';
    if (subtotalEl) subtotalEl.textContent = 'LKR 0.00';
    if (deliveryDisplayEl) deliveryDisplayEl.textContent = formatLKR(deliveryFee);
    if (grandTotalEl) grandTotalEl.textContent = formatLKR(deliveryFee);
    return;
  }

  let itemsSubtotal = 0;
  cartBody.innerHTML = window.posCart.map((item, idx) => {
    itemsSubtotal += item.total;
    return `
      <tr>
        <td><strong>${item.name}</strong><br><small style="color:#64748b;">Size: ${item.size} | Color: ${item.color}</small></td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatLKR(item.price)}</td>
        <td style="text-align: right;"><strong>${formatLKR(item.total)}</strong></td>
        <td style="text-align: center;">
          <button type="button" onclick="removeFromPosCart(${idx})" style="background:none; border:none; color:#EF4444; cursor:pointer; display:inline-flex; align-items:center;">
            <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const grandTotal = itemsSubtotal + deliveryFee;
  if (subtotalEl) subtotalEl.textContent = formatLKR(itemsSubtotal);
  if (deliveryDisplayEl) deliveryDisplayEl.textContent = formatLKR(deliveryFee);
  if (grandTotalEl) grandTotalEl.textContent = formatLKR(grandTotal);
}

window.handlePosSubmit = async function (event) {
  event.preventDefault();

  if (window.posCart.length === 0) {
    showToast('Cannot complete order. Cart is empty! Please add at least one product.', 'error');
    return;
  }

  const customerName = document.getElementById('pos-customer-name').value;
  const customerPhone = document.getElementById('pos-customer-phone').value;
  const customerEmail = document.getElementById('pos-customer-email') ? document.getElementById('pos-customer-email').value : '';
  const customerAddress = document.getElementById('pos-customer-address').value;
  const cityInput = document.getElementById('pos-city');
  const provinceInput = document.getElementById('pos-province');
  const city = cityInput ? cityInput.value.trim() : 'Colombo';
  const province = provinceInput ? provinceInput.value.trim() : 'Western';
  const deliveryFeeInput = document.getElementById('pos-delivery-fee');
  const deliveryFee = deliveryFeeInput ? parseFloat(deliveryFeeInput.value) || 0 : 450;

  const payload = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    customer_address: customerAddress,
    city: city,
    province: province,
    payment_method: 'bank_transfer',
    delivery_fee: deliveryFee,
    items: window.posCart.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      size: i.size,
      color: i.color
    }))
  };

  try {
    const submitBtn = document.getElementById('pos-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Order...';
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Order #${data.order.order_number} created successfully!`, 'success');
      closeModal('pos-modal');
      const formEl = document.getElementById('pos-form');
      if (formEl) formEl.reset();
      window.posCart = [];

      // If in Orders Page, refresh table
      if (typeof window.loadOrders === 'function') {
        window.loadOrders();
      } else if (document.getElementById('admin-orders-view')) {
        initAdminOrders();
      }

      // If in Live Chats Page, refresh active chat & CRM panel
      if (typeof window.fetchChatData === 'function' && window.activePhone) {
        window.fetchChatData(window.activePhone);
      }
      if (typeof window.loadChats === 'function') {
        window.loadChats(false);
      }

      // Open print invoice if available
      if (typeof printInvoice === 'function' && data.order && data.order.id) {
        setTimeout(() => {
          printInvoice(data.order.id);
        }, 600);
      }
    } else {
      showToast(data.message || 'Failed to create order', 'error');
    }
  } catch (err) {
    console.error('POS submit error:', err);
    showToast('Error creating order', 'error');
  } finally {
    const submitBtn = document.getElementById('pos-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete & Create Order';
    }
  }
};

// ─────────────────────────────────────────────
// 1-Click AI POS Order Modal Helper
// ─────────────────────────────────────────────
window.openAiPosModal = async function (phone = '', customText = '') {
  const targetPhone = phone || window.activePhone || '';
  showToast('🤖 Analyzing chat conversation with AI...', 'info');

  try {
    // 1. Ensure POS products catalog is loaded
    if (!window.allPosProducts || window.allPosProducts.length === 0) {
      const pRes = await fetch('/api/admin/products', { headers: authHeaders() });
      const pData = await pRes.json();
      if (pData.success) {
        window.allPosProducts = pData.products.filter(p => p.status === 'active' && p.quantity > 0);
      }
    }

    // 2. Call AI extraction endpoint
    const aiRes = await fetch('/api/whatsapp/ai-extract-order', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phone: targetPhone, text: customText })
    });
    const aiData = await aiRes.json();

    if (!aiData.success || !aiData.orderData) {
      showToast(aiData.message || 'AI could not extract enough details from this chat', 'error');
      openPosOrderModal();
      return;
    }

    const o = aiData.orderData;

    // 3. Pre-fill customer inputs
    const nameEl = document.getElementById('pos-customer-name');
    const phoneEl = document.getElementById('pos-customer-phone');
    const addressEl = document.getElementById('pos-customer-address');
    const provinceEl = document.getElementById('pos-province');
    const cityEl = document.getElementById('pos-city');
    const feeEl = document.getElementById('pos-delivery-fee');

    if (nameEl) nameEl.value = o.customer_name || '';
    if (phoneEl) phoneEl.value = o.customer_phone || (targetPhone ? targetPhone.replace(/[^0-9]/g, '') : '');
    if (addressEl) addressEl.value = o.customer_address || '';

    if (provinceEl && o.province) {
      provinceEl.value = o.province;
      if (window.onPosProvinceChange) window.onPosProvinceChange();
    }

    if (cityEl && o.city) {
      const matchOpt = Array.from(cityEl.options).find(opt => 
        opt.value.toLowerCase() === o.city.toLowerCase() ||
        opt.textContent.toLowerCase().includes(o.city.toLowerCase())
      );
      if (matchOpt) {
        cityEl.value = matchOpt.value;
      } else {
        const newOpt = document.createElement('option');
        newOpt.value = o.city;
        newOpt.textContent = `${o.city} (Detected)`;
        newOpt.selected = true;
        cityEl.appendChild(newOpt);
      }
    }

    if (feeEl) feeEl.value = o.delivery_fee || 450;

    // 4. Pre-fill cart with AI-matched items
    window.posCart = [];
    if (Array.isArray(o.items) && o.items.length > 0) {
      for (const item of o.items) {
        const prod = (window.allPosProducts || []).find(p => 
          p.id === item.product_id || 
          p.name.toLowerCase().includes((item.name || '').toLowerCase()) ||
          (item.name && item.name.toLowerCase().includes(p.name.toLowerCase()))
        );

        if (prod) {
          const qty = parseInt(item.quantity) || 1;
          const unitPrice = parseFloat(item.price) || parseFloat(prod.price);
          const size = item.size || (prod.variants && prod.variants[0] ? prod.variants[0].size : '-');
          const color = item.color || (prod.variants && prod.variants[0] ? prod.variants[0].color : '-');

          window.posCart.push({
            product_id: prod.id,
            name: prod.name,
            size: size,
            color: color,
            price: unitPrice,
            quantity: qty,
            total: unitPrice * qty
          });
        }
      }
    }

    filterPosProducts();
    renderPosCart();
    openModal('pos-modal');

    const itemsCount = window.posCart.length;
    showToast(`✨ AI detected customer details and ${itemsCount} product(s)!`, 'success');
  } catch (err) {
    console.error('Error during AI POS extract:', err);
    showToast('Failed to analyze chat with AI', 'error');
    openPosOrderModal();
  }
};

window.parseSmartTextWithAi = async function () {
  const pasteInput = document.getElementById('pos-smart-paste-input');
  if (!pasteInput || !pasteInput.value.trim()) {
    showToast('Please paste customer chat or message text first.', 'error');
    return;
  }
  await window.openAiPosModal('', pasteInput.value.trim());
};




// // Customer Returns Overview & Restocking Handler
window.allAdminReturns = [];

async function initAdminReturns() {
  const tableBody = document.getElementById('admin-returns-table-body');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/returns', { headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      window.allAdminReturns = data.returns || [];

      // Calculate 4 Horizon KPI Metrics
      const totalCount = window.allAdminReturns.length;
      let restockedUnits = 0;
      let damagedUnits = 0;
      let totalUnits = 0;

      window.allAdminReturns.forEach(r => {
        const qty = parseInt(r.quantity) || 1;
        totalUnits += qty;
        if (r.return_type === 'restock') {
          restockedUnits += qty;
        } else if (r.return_type === 'damage') {
          damagedUnits += qty;
        }
      });

      const statTotalEl = document.getElementById('stat-returns-total');
      if (statTotalEl) statTotalEl.textContent = totalCount;

      const statRestockedEl = document.getElementById('stat-returns-restocked');
      if (statRestockedEl) statRestockedEl.textContent = restockedUnits;

      const statDamagedEl = document.getElementById('stat-returns-damaged');
      if (statDamagedEl) statDamagedEl.textContent = damagedUnits;

      const statUnitsEl = document.getElementById('stat-returns-units');
      if (statUnitsEl) statUnitsEl.textContent = totalUnits;

      filterReturnsTable();
    }
  } catch (err) {
    console.error('Error loading returns list:', err);
  }
}

function renderReturnsTable(returnsList) {
  const tableBody = document.getElementById('admin-returns-table-body');
  if (!tableBody) return;

  if (!returnsList || returnsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--hz-gray-sub); padding: 3.5rem 1rem;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <svg style="width: 36px; height: 36px; color: #CBD5E1;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--hz-navy);">No customer return logs found</div>
            <div style="font-size: 0.8rem; color: var(--hz-gray-sub);">Try adjusting your search criteria or log a new return above.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = returnsList.map(r => {
    const hasVariant = (r.size && r.size !== '-') || (r.color && r.color !== '-');
    const variantHtml = hasVariant
      ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
           ${r.size && r.size !== '-' ? `<span class="hz-variant-badge">Size: ${r.size}</span>` : ''}
           ${r.color && r.color !== '-' ? `<span class="hz-variant-badge">Color: ${r.color}</span>` : ''}
         </div>`
      : '';

    const typePill = r.return_type === 'restock'
      ? `<span class="hz-status-pill hz-status-delivered" title="Item returned and added back to inventory stock"><span class="hz-status-dot"></span>Restocked</span>`
      : `<span class="hz-status-pill hz-status-cancelled" title="Item marked as damaged and written off"><span class="hz-status-dot"></span>Damaged / Write-Off</span>`;

    const reasonFormatted = (r.reason || 'other').replace(/_/g, ' ');
    const noteHtml = r.description ? `<div style="font-size: 0.75rem; color: var(--hz-gray-sub); margin-top: 2px;">Note: ${r.description}</div>` : '';

    return `
      <tr>
        <td>
          <span class="hz-sku-badge">#${r.order_number}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.88rem;">${r.product_name}</div>
          ${variantHtml}
        </td>
        <td>
          <span style="display: inline-block; background: #F4F7FE; color: var(--hz-navy); font-weight: 800; font-size: 0.85rem; padding: 3px 10px; border-radius: 8px;">
            ${r.quantity} pcs
          </span>
        </td>
        <td>
          <span style="font-weight: 600; color: var(--hz-navy); text-transform: capitalize; font-size: 0.84rem;">
            ${reasonFormatted}
          </span>
          ${noteHtml}
        </td>
        <td>
          ${typePill}
        </td>
        <td>
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--hz-gray-sub);">
            ${formatDateTime(r.created_at)}
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; justify-content: flex-end;">
            <button class="hz-action-pill hz-action-del" onclick="deleteReturnLog(${r.id})" title="Delete this return record">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterReturnsTable = function () {
  const searchInput = document.getElementById('return-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const typeFilter = document.getElementById('return-type-filter') ? document.getElementById('return-type-filter').value : 'all';

  if (!window.allAdminReturns) return;

  const filtered = window.allAdminReturns.filter(r => {
    // Type matching
    if (typeFilter !== 'all' && r.return_type !== typeFilter) {
      return false;
    }

    // Search query matching
    if (query) {
      const orderNum = (r.order_number || '').toLowerCase();
      const prodName = (r.product_name || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase().replace(/_/g, ' ');
      const desc = (r.description || '').toLowerCase();
      const size = (r.size || '').toLowerCase();
      const color = (r.color || '').toLowerCase();

      const matches = orderNum.includes(query) ||
        prodName.includes(query) ||
        reason.includes(query) ||
        desc.includes(query) ||
        size.includes(query) ||
        color.includes(query);

      if (!matches) return false;
    }

    return true;
  });

  renderReturnsTable(filtered);
};

window.refreshReturnsData = async function () {
  const icon = document.getElementById('refresh-returns-icon');
  if (icon) {
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 400);
  }

  await initAdminReturns();
  showToast('Returns & restock inventory data refreshed!', 'info');
};

window.deleteReturnLog = async function (id) {
  if (!confirm('Are you sure you want to delete this customer return log?')) return;

  try {
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast('Return record deleted successfully!', 'success');
      initAdminReturns();
    } else {
      showToast(data.message || 'Failed to delete return record', 'error');
    }
  } catch (err) {
    console.error('Delete return log error:', err);
    showToast('Error deleting return record', 'error');
  }
};

// Dynamic Return Processing Handlers
window.openProcessReturnModal = async function () {
  const orderSelect = document.getElementById('return-order-id');
  if (!orderSelect) return;

  try {
    const res = await fetch('/api/admin/orders', { headers: authHeaders() });
    const data = await res.json();

    if (data.success && data.orders.length > 0) {
      const validOrders = data.orders.filter(o => o.order_status !== 'cancelled');
      if (validOrders.length > 0) {
        orderSelect.innerHTML = validOrders.map((o, idx) => `
          <option value="${o.id}" ${idx === 0 ? 'selected' : ''}>
            Order #${o.order_number} - ${o.customer_name} (${formatLKR(o.total_amount)}) [${o.order_status.replace(/_/g, ' ').toUpperCase()}]
          </option>
        `).join('');
        loadReturnOrderProducts();
      } else {
        orderSelect.innerHTML = '<option value="" disabled>No active orders available for return</option>';
        document.getElementById('return-product-id').innerHTML = '';
      }
    } else {
      orderSelect.innerHTML = '<option value="" disabled>No orders available in database</option>';
    }
  } catch (err) {
    console.error('Error fetching orders for return:', err);
  }

  openModal('return-modal');
};

window.currentReturnOrderItems = [];

async function loadReturnOrderProducts() {
  const orderId = document.getElementById('return-order-id').value;
  const productSelect = document.getElementById('return-product-id');
  if (!orderId || !productSelect) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/invoice`, { headers: authHeaders() });
    const data = await res.json();

    if (data.success && data.invoice && data.invoice.items && data.invoice.items.length > 0) {
      window.currentReturnOrderItems = data.invoice.items;
      productSelect.innerHTML = data.invoice.items.map((item, idx) => `
        <option value="${item.product_id}" data-idx="${idx}" ${idx === 0 ? 'selected' : ''}>
          ${item.product_name} (Size: ${item.size || 'M'}, Color: ${item.color || 'Default'}, Qty Bought: ${item.quantity})
        </option>
      `).join('');
      if (window.updateReturnQuantityMax) window.updateReturnQuantityMax();
    } else {
      window.currentReturnOrderItems = [];
      const prodRes = await fetch('/api/admin/products', { headers: authHeaders() });
      const prodData = await prodRes.json();
      if (prodData.success) {
        productSelect.innerHTML = prodData.products.map((p, idx) => `
          <option value="${p.id}" data-idx="${idx}">${p.name} (${formatLKR(p.price)})</option>
        `).join('');
      }
      document.getElementById('return-quantity').removeAttribute('max');
    }
  } catch (err) {
    console.error('Error loading order products for return:', err);
  }
}

window.updateReturnQuantityMax = function () {
  const productSelect = document.getElementById('return-product-id');
  const qtyInput = document.getElementById('return-quantity');
  if (!productSelect || !qtyInput) return;

  const selectedOpt = productSelect.options[productSelect.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.idx !== undefined) {
    const idx = selectedOpt.dataset.idx;
    if (window.currentReturnOrderItems[idx]) {
      const maxQty = window.currentReturnOrderItems[idx].quantity;
      qtyInput.max = maxQty;
      if (parseInt(qtyInput.value) > maxQty) {
        qtyInput.value = maxQty;
      }
    }
  }
}

async function handleReturnSubmit(e) {
  e.preventDefault();
  const order_id = document.getElementById('return-order-id').value;
  const productSelect = document.getElementById('return-product-id');
  const product_id = productSelect.value;
  const selectedOpt = productSelect.options[productSelect.selectedIndex];
  const itemIdx = selectedOpt ? selectedOpt.dataset.idx : undefined;

  let size = '-';
  let color = '-';
  if (itemIdx !== undefined && window.currentReturnOrderItems[itemIdx]) {
    size = window.currentReturnOrderItems[itemIdx].size || '-';
    color = window.currentReturnOrderItems[itemIdx].color || '-';
  }

  const quantity = document.getElementById('return-quantity').value;
  const return_type = document.getElementById('return-type').value;
  const reason = document.getElementById('return-reason').value;
  const description = document.getElementById('return-desc').value;

  try {
    const res = await fetch('/api/admin/returns', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ order_id, product_id, quantity, size, color, reason, description, return_type })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Return processed and inventory stock updated successfully!', 'success');
      closeModal('return-modal');
      document.getElementById('return-form').reset();
      initAdminReturns();
      if (document.getElementById('admin-products-view')) initAdminProducts();
      if (document.getElementById('admin-dashboard-view')) initAdminDashboard();
    } else {
      showToast(data.message || 'Failed to process return', 'error');
    }
  } catch (err) {
    console.error('Process return error:', err);
    showToast('Error processing customer return', 'error');
  }
}
// Delivery City & Charges Management (Add, Edit & Delete)
async function openCityManagementModal() {
  resetCityForm();
  loadCityManagementTable();
  openModal('city-modal');
}

async function loadCityManagementTable() {
  const tableBody = document.getElementById('city-table-body');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/regions');
    const data = await res.json();

    if (data.success) {
      if (data.regions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--hz-gray-sub); padding: 1.5rem;">No delivery cities found. Add one above.</td></tr>';
        return;
      }
      tableBody.innerHTML = data.regions.map(r => `
        <tr>
          <td><strong style="color: var(--hz-navy);">${r.name}</strong></td>
          <td><span style="font-size: 0.82rem; font-weight: 600; color: var(--hz-gray-sub);">${r.province || 'General'}</span></td>
          <td><span style="font-weight: 800; color: var(--hz-brand); font-size: 0.9rem;">${formatLKR(r.delivery_charge)}</span></td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button class="hz-action-pill hz-action-edit" onclick="editCityForm(${r.id}, '${r.name.replace(/'/g, "\\'")}', '${(r.province || 'Western').replace(/'/g, "\\'")}', ${r.delivery_charge})">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Edit
              </button>
              <button class="hz-action-pill hz-action-del" onclick="deleteCity(${r.id}, '${r.name.replace(/'/g, "\\'")}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading delivery cities:', err);
  }
}

function editCityForm(id, name, province, charge) {
  document.getElementById('city-edit-id').value = id;
  document.getElementById('new-city-name').value = name;
  document.getElementById('new-city-province').value = province || 'Western';
  document.getElementById('new-city-charge').value = charge;

  document.getElementById('city-form-title').textContent = `Edit Delivery Charge for "${name}"`;
  document.getElementById('city-submit-btn').textContent = 'Update Delivery Charge';
  document.getElementById('city-cancel-edit-btn').style.display = 'inline-block';
}

function resetCityForm() {
  const form = document.getElementById('add-city-form');
  if (form) form.reset();
  const editIdInput = document.getElementById('city-edit-id');
  if (editIdInput) editIdInput.value = '';
  const titleEl = document.getElementById('city-form-title');
  if (titleEl) titleEl.textContent = '+ Add New Delivery City / District';
  const submitBtn = document.getElementById('city-submit-btn');
  if (submitBtn) submitBtn.textContent = '+ Save Delivery City';
  const cancelBtn = document.getElementById('city-cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function handleAddCitySubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('city-edit-id').value;
  const name = document.getElementById('new-city-name').value;
  const province = document.getElementById('new-city-province').value;
  const delivery_charge = document.getElementById('new-city-charge').value;

  const url = editId ? `/api/admin/regions/${editId}` : '/api/admin/regions';
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({ name, province, delivery_charge })
    });
    const data = await res.json();

    if (data.success) {
      showToast(editId ? `Delivery charge for '${name}' updated!` : `Delivery city '${name}' added!`, 'success');
      resetCityForm();
      loadCityManagementTable();
    } else {
      showToast(data.message || 'Operation failed', 'error');
    }
  } catch (err) {
    console.error('Save city error:', err);
    showToast('Error saving delivery city/charge', 'error');
  }
}

async function deleteCity(id, name) {
  if (!confirm(`Are you sure you want to delete delivery city "${name}"?`)) return;

  try {
    const res = await fetch(`/api/admin/regions/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast(`City '${name}' deleted successfully!`, 'success');
      resetCityForm();
      loadCityManagementTable();
    } else {
      showToast(data.message || 'Failed to delete city', 'error');
    }
  } catch (err) {
    console.error('Delete city error:', err);
    showToast('Error deleting city', 'error');
  }
}

// Page Routing & Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const alertBox = document.getElementById('login-alert');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('felliro_token', data.token);
          localStorage.setItem('felliro_user', JSON.stringify(data.user));
          window.location.href = '/admin/dashboard';
        } else {
          alertBox.style.display = 'block';
          alertBox.textContent = data.message || 'Login failed';
        }
      } catch (err) {
        console.error('Login error:', err);
        alertBox.style.display = 'block';
        alertBox.textContent = 'Server connection error';
      }
    });
    return;
  }

  checkAdminAuth();

  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  if (document.getElementById('admin-dashboard-view')) initAdminDashboard();
  if (document.getElementById('admin-products-view')) initAdminProducts();
  if (document.getElementById('admin-orders-view')) initAdminOrders();
  if (document.getElementById('admin-returns-view')) initAdminReturns();
  if (document.getElementById('admin-reports-view')) initAdminReports();
});

// Admin Dashboard Overview (Horizon UI)
let salesTrendChartInstance = null;
let categoryShareChartInstance = null;

async function initAdminDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard/stats', { headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      if (document.getElementById('stat-orders')) document.getElementById('stat-orders').textContent = data.stats.total_orders;
      if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = formatLKR(data.stats.total_revenue);
      if (document.getElementById('stat-products')) document.getElementById('stat-products').textContent = data.stats.total_products;
      if (document.getElementById('stat-lowstock')) document.getElementById('stat-lowstock').textContent = data.stats.low_stock_count;

      const returnsEl = document.getElementById('stat-returns');
      if (returnsEl) returnsEl.textContent = data.stats.total_returns || 0;

      // Revenue monthly growth indicator
      const trendEl = document.getElementById('stat-revenue-trend');
      if (trendEl && data.stats.monthly_growth !== undefined) {
        const isPos = data.stats.monthly_growth >= 0;
        trendEl.innerHTML = `
          <svg style="width: 13px; height: 13px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            ${isPos ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'}
          </svg>
          <span>${isPos ? '+' : ''}${data.stats.monthly_growth}% this month</span>
        `;
        trendEl.style.color = isPos ? '#01B574' : '#EE5D50';
      }

      // Recent Orders widget
      const ordersContainer = document.getElementById('dashboard-recent-orders');
      if (ordersContainer) {
        if (!data.recent_orders || data.recent_orders.length === 0) {
          ordersContainer.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: #A3AED0; font-weight: 600;">
                <div style="font-size: 1.5rem; margin-bottom: 4px;">📦</div>
                <div>No orders recorded yet</div>
              </td>
            </tr>
          `;
        } else {
          ordersContainer.innerHTML = data.recent_orders.map(o => {
            const initials = (o.customer_name || 'Guest').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            let badgeClass = 'hz-pill-brand';
            const statusLower = (o.order_status || '').toLowerCase();
            if (['paid', 'delivered', 'completed'].includes(statusLower)) badgeClass = 'hz-pill-success';
            else if (['pending', 'processing', 'handed_to_courier'].includes(statusLower)) badgeClass = 'hz-pill-warning';
            else if (['cancelled', 'returned', 'failed'].includes(statusLower)) badgeClass = 'hz-pill-danger';

            return `
              <tr style="cursor: pointer;" onclick="window.location.href='/admin/orders'">
                <td><span class="hz-order-badge">#${o.order_number}</span></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: #F4F2FF; color: #4318FF; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800;">${initials}</div>
                    <span style="font-weight: 600; color: #1B2559;">${o.customer_name}</span>
                  </div>
                </td>
                <td><strong>${formatLKR(o.total_amount)}</strong></td>
                <td><span class="hz-pill-badge ${badgeClass}">${o.order_status.replace(/_/g, ' ')}</span></td>
                <td style="color: #A3AED0; font-size: 0.82rem;">${formatDateOnly(o.created_at)}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // Low Stock widget
      const lowStockContainer = document.getElementById('dashboard-lowstock-items');
      if (lowStockContainer) {
        if (!data.low_stock_items || data.low_stock_items.length === 0) {
          lowStockContainer.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #01B574; font-weight: 700;">
              <svg style="width: 36px; height: 36px; margin-bottom: 6px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>All stock levels optimal!</div>
              <p style="font-size: 0.78rem; color: #A3AED0; font-weight: 500; margin-top: 4px;">No products below threshold</p>
            </div>
          `;
        } else {
          lowStockContainer.innerHTML = data.low_stock_items.map(p => `
            <div class="hz-stock-item" style="cursor: pointer;" onclick="window.location.href='/admin/products?search=${encodeURIComponent(p.name)}'" title="Click to view & restock">
              <div>
                <div class="hz-stock-name" style="font-weight: 700; color: #1B2559;">${p.name}</div>
                <div class="hz-stock-meta" style="color: #A3AED0; font-size: 0.75rem;">Min Alert: ${p.min_stock_alert}</div>
              </div>
              <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                <span class="hz-pill-badge hz-pill-danger">${p.quantity} Left</span>
                <span style="font-size: 0.75rem; color: #4318FF; font-weight: 700;">Restock →</span>
              </div>
            </div>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error initializing admin dashboard:', err);
  }

  // Dashboard search bar listener
  const searchInput = document.querySelector('.hz-search-input');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (!val) return;
        if (/^(#|FELLIRO|\d)/i.test(val)) {
          window.location.href = `/admin/orders?search=${encodeURIComponent(val)}`;
        } else {
          window.location.href = `/admin/products?search=${encodeURIComponent(val)}`;
        }
      }
    });

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#dashboard-recent-orders tr');
      rows.forEach(r => {
        if (!q) {
          r.style.display = '';
        } else {
          r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        }
      });
    });
  }

  if (typeof Chart !== 'undefined') {
    loadDashboardCharts();
  }
}

async function loadDashboardCharts() {
  try {
    const res = await fetch('/api/admin/dashboard/charts', { headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      // 1. Sales Trend Line Chart
      const salesCtx = document.getElementById('chart-sales-trend');
      if (salesCtx) {
        if (salesTrendChartInstance) {
          salesTrendChartInstance.destroy();
          salesTrendChartInstance = null;
        }

        const ctx = salesCtx.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(67, 24, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(67, 24, 255, 0.0)');

        salesTrendChartInstance = new Chart(salesCtx, {
          type: 'line',
          data: {
            labels: (data.salesTrends || []).map(d => new Date(d.date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })),
            datasets: [{
              label: 'Daily Revenue (LKR)',
              data: (data.salesTrends || []).map(d => d.revenue),
              borderColor: '#4318FF',
              borderWidth: 3,
              backgroundColor: gradient,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#4318FF',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1B254B',
                titleColor: '#FFFFFF',
                bodyColor: '#A3AED0',
                padding: 12,
                cornerRadius: 10,
                displayColors: false,
                callbacks: {
                  label: (ctx) => `Revenue: ${formatLKR(ctx.parsed.y)}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#A3AED0', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
              },
              y: {
                grid: { color: 'rgba(163, 174, 208, 0.15)', borderDash: [4, 4], drawBorder: false },
                ticks: { 
                  color: '#A3AED0', 
                  font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 },
                  callback: (val) => 'Rs. ' + val.toLocaleString()
                }
              }
            }
          }
        });
      }

      // 2. Category Share Doughnut Chart
      const categoryCtx = document.getElementById('chart-category-share');
      if (categoryCtx) {
        if (categoryShareChartInstance) {
          categoryShareChartInstance.destroy();
          categoryShareChartInstance = null;
        }

        const catData = data.categoryShare && data.categoryShare.length > 0 ? data.categoryShare : [
          { category_name: 'Dresses', total_sold: 1 },
          { category_name: 'Tops', total_sold: 1 },
          { category_name: 'Bottoms', total_sold: 1 }
        ];

        categoryShareChartInstance = new Chart(categoryCtx, {
          type: 'doughnut',
          data: {
            labels: catData.map(c => c.category_name),
            datasets: [{
              data: catData.map(c => Math.max(c.total_sold || 0, c.product_count || 1)),
              backgroundColor: ['#4318FF', '#3B82F6', '#01B574', '#FFB547', '#EE5D50', '#8B5CF6'],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#1B254B',
                  font: { family: 'Plus Jakarta Sans', weight: '600', size: 12 },
                  boxWidth: 12,
                  boxHeight: 12,
                  usePointStyle: true,
                  padding: 16
                }
              },
              tooltip: {
                backgroundColor: '#1B254B',
                titleColor: '#FFFFFF',
                bodyColor: '#A3AED0',
                padding: 12,
                cornerRadius: 10
              }
            }
          }
        });
      }
    }
  } catch (err) {
    console.error('Error loading charts:', err);
  }
}

// Horizon UI Admin Products Table & CRUD
let adminProductsList = [];

function renderProductTableRows(products) {
  const tableBody = document.getElementById('admin-products-table-body');
  if (!tableBody) return;

  if (!products || products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--hz-gray-sub);">
          <svg style="width: 42px; height: 42px; stroke: #CBD5E1; margin: 0 auto 10px; display: block;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div style="font-weight: 700; font-size: 1rem; color: var(--hz-navy);">No products found</div>
          <div style="font-size: 0.82rem; margin-top: 4px;">Try adjusting your search query or category filter.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = products.map(p => {
    const isLowStock = p.quantity <= (p.min_stock_alert || 5);
    const isOutOfStock = p.quantity <= 0;
    const stockBadgeClass = isOutOfStock ? 'hz-pill-danger' : (isLowStock ? 'hz-pill-warning' : 'hz-pill-success');
    const stockText = isOutOfStock ? 'Out of Stock' : `${p.quantity} ${isLowStock ? '(Low)' : 'In Stock'}`;
    const fallbackImg = '/images/logo.png';
    const primaryImg = p.primary_image || (p.images && p.images.length > 0 ? p.images[0].image_url : fallbackImg);

    let variantsDisplay = '';
    if (p.variants && p.variants.length > 0) {
      variantsDisplay = p.variants.map(v => 
        `<span style="display: inline-block; background: #F4F7FE; border: 1px solid rgba(226, 232, 240, 0.9); padding: 2px 7px; border-radius: 6px; margin: 2px 3px 2px 0; font-size: 0.72rem; font-weight: 700; color: var(--hz-navy);">${v.size || '-'}/${v.color || '-'}: ${v.quantity}</span>`
      ).join('');
    } else {
      variantsDisplay = `<span style="font-size: 0.8rem; color: var(--hz-gray-sub);">${p.size || 'Standard'} / ${p.color || 'Default'}</span>`;
    }

    return `
      <tr>
        <td>
          <img src="${primaryImg}" class="hz-product-thumb" alt="${p.name}" onerror="this.src='${fallbackImg}'">
        </td>
        <td>
          <div class="hz-product-name">${p.name} ${p.is_trending ? '<span class="hz-pill-badge hz-pill-brand" style="font-size: 0.65rem; margin-left: 4px;">🔥 Trending</span>' : ''}</div>
          <div class="hz-product-meta">SKU: #PRD-${p.id}</div>
        </td>
        <td>
          <span class="hz-pill-badge" style="background: #F4F7FE; color: var(--hz-brand); font-weight: 700;">${p.category_name || 'General'}</span>
        </td>
        <td>
          <strong style="color: var(--hz-navy); font-size: 0.92rem;">${formatLKR(p.price)}</strong>
          ${p.cost_price ? `<div style="font-size: 0.75rem; color: var(--hz-gray-sub);">Cost: ${formatLKR(p.cost_price)}</div>` : ''}
        </td>
        <td>
          <span class="hz-pill-badge ${stockBadgeClass}">${stockText}</span>
        </td>
        <td>
          <div style="max-width: 180px;">${variantsDisplay}</div>
        </td>
        <td>
          <span class="hz-pill-badge ${p.status === 'active' ? 'hz-pill-success' : 'hz-pill-danger'}">${p.status || 'active'}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button class="hz-btn-pill" style="background: #F4F7FE; color: var(--hz-brand); padding: 0.4rem 0.8rem; font-size: 0.78rem;" onclick="editProductModal(${p.id})">
              <svg style="width: 13px; height: 13px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              Edit
            </button>
            <button class="hz-btn-pill" style="background: #FEEFEF; color: var(--hz-danger); padding: 0.4rem 0.8rem; font-size: 0.78rem;" onclick="deleteProductModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')">
              <svg style="width: 13px; height: 13px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.filterProductsTable = function() {
  const query = (document.getElementById('product-search-input')?.value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('product-category-filter')?.value || 'all';

  let filtered = adminProductsList.filter(p => {
    const matchesSearch = !query || 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query)) ||
      (p.variants && p.variants.some(v => (v.size && v.size.toLowerCase().includes(query)) || (v.color && v.color.toLowerCase().includes(query))));

    const matchesCategory = categoryFilter === 'all' || String(p.category_id) === String(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  renderProductTableRows(filtered);
};

window.handlePhotoSelect = function(input) {
  const previewContainer = document.getElementById('product-photo-previews');
  if (!previewContainer) return;
  previewContainer.innerHTML = ''; // Clear previous previews
  
  if (input.files && input.files.length > 0) {
    Array.from(input.files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '2px solid var(--hz-brand)';
          img.title = file.name;
          previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    });
  }
};

// Global function to fetch and refresh admin products table & KPI metrics
window.loadAdminProducts = async function() {
  const tableBody = document.getElementById('admin-products-table-body');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/products', { headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      adminProductsList = data.products || [];
      
      // Update 4 KPI Cards
      const totalEl = document.getElementById('stat-total-products');
      if (totalEl) totalEl.textContent = adminProductsList.length;

      const inStockEl = document.getElementById('stat-instock-products');
      if (inStockEl) inStockEl.textContent = adminProductsList.filter(p => p.quantity > 0).length;

      const lowStockEl = document.getElementById('stat-lowstock-products');
      if (lowStockEl) lowStockEl.textContent = adminProductsList.filter(p => p.quantity <= (p.min_stock_alert || 5)).length;

      // Re-apply filter so table updates cleanly preserving current filter/search
      filterProductsTable();
    }
  } catch (err) {
    console.error('Error loading admin products:', err);
  }
};

async function initAdminProducts() {
  const tableBody = document.getElementById('admin-products-table-body');
  if (!tableBody) return;

  await window.loadAdminProducts();
  await loadCategoriesForSelect();

  const productForm = document.getElementById('product-form');
  if (productForm && !productForm.dataset.initialized) {
    productForm.dataset.initialized = 'true';
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = productForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Product & Photos...';
      }

      const id = document.getElementById('product-id').value;
      const formData = new FormData();
      formData.append('name', document.getElementById('product-name').value);
      formData.append('description', document.getElementById('product-desc').value);
      formData.append('price', document.getElementById('product-price').value);
      formData.append('cost_price', document.getElementById('product-cost').value);
      formData.append('category_id', document.getElementById('product-category').value);

      const variants = getVariantsData();
      formData.append('variants', JSON.stringify(variants));

      // Append variant images
      const tbody = document.getElementById('variants-table-body');
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        let varIdx = 0;
        rows.forEach(tr => {
          const size = tr.querySelector('.var-size').value.trim();
          const color = tr.querySelector('.var-color').value.trim();
          if (size || color) {
            const imgInput = tr.querySelector('.var-image');
            if (imgInput && imgInput.files && imgInput.files.length > 0) {
              formData.append(`variant_image_${varIdx}`, imgInput.files[0]);
            }
            varIdx++;
          }
        });
      }

      formData.append('min_stock_alert', document.getElementById('product-min-stock').value);
      formData.append('is_trending', document.getElementById('product-trending').checked);
      formData.append('image_url', document.getElementById('product-image-url').value);

      const photoInput = document.getElementById('product-photos');
      if (photoInput && photoInput.files && photoInput.files.length > 0) {
        for (let i = 0; i < photoInput.files.length; i++) {
          formData.append('photos', photoInput.files[i]);
        }
      }

      const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          showToast(id ? 'Product updated successfully' : 'Product & Photos saved successfully!', 'success');
          closeModal('product-modal');
          productForm.reset();
          document.getElementById('product-id').value = '';
          const fb = document.getElementById('upload-feedback');
          if (fb) fb.style.display = 'none';
          await window.loadAdminProducts();
        } else {
          showToast(data.message || 'Operation failed', 'error');
        }
      } catch (err) {
        console.error('Save product error:', err);
        showToast('Error saving product and photos', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Product & Photos';
        }
      }
    });
  }
}

// Admin Orders Handler & Horizon Controller
let allAdminOrders = [];

function populateDateFilters() {
  const selects = [document.getElementById('order-date-filter'), document.getElementById('label-date-filter')];
  
  const now = new Date();
  let todayCycleStart = new Date(now);
  if (now.getHours() < 12) {
    todayCycleStart.setDate(todayCycleStart.getDate() - 1);
  }
  todayCycleStart.setHours(12, 0, 0, 0);

  let optionsHtml = '';
  for (let i = 0; i < 7; i++) {
    let cycleStart = new Date(todayCycleStart);
    cycleStart.setDate(cycleStart.getDate() - i);
    
    let cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 1);

    const startStr = cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    let label = '';
    if (i === 0) label = `Today (${startStr} - ${endStr})`;
    else if (i === 1) label = `Yesterday (${startStr} - ${endStr})`;
    else label = `${i} Days Ago (${startStr} - ${endStr})`;

    optionsHtml += `<option value="${i}">${label}</option>`;
  }
  optionsHtml += `<option value="ALL">All Time</option>`;

  selects.forEach(select => {
    if (select) {
      const currentVal = select.value || '0';
      select.innerHTML = optionsHtml;
      select.value = currentVal;
    }
  });
}

async function initAdminOrders() {
  populateDateFilters();
  const tableBody = document.getElementById('admin-orders-table-body');
  if (!tableBody) return;

  async function loadOrders() {
    try {
      const res = await fetch('/api/admin/orders', { headers: authHeaders() });
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        allAdminOrders = data.orders;
        if (typeof window.filterOrdersTable === 'function') {
          window.filterOrdersTable();
        } else {
          updateOrderMetrics(allAdminOrders);
          renderOrdersTable(allAdminOrders);
        }
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--hz-gray-sub); padding: 2.5rem;">No orders found.</td></tr>`;
      }
    } catch (err) {
      console.error('Error loading admin orders:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--hz-danger); padding: 2.5rem;">Error loading orders data.</td></tr>`;
    }
  }

  function updateOrderMetrics(orders) {
    const totalCountEl = document.getElementById('orders-total-count');
    const pendingCountEl = document.getElementById('orders-pending-count');
    const deliveredCountEl = document.getElementById('orders-delivered-count');
    const revenueTotalEl = document.getElementById('orders-revenue-total');

    if (totalCountEl) totalCountEl.textContent = orders.length;
    if (pendingCountEl) {
      const pending = orders.filter(o => ['pending', 'processing', 'ready_for_dispatch'].includes(o.order_status)).length;
      pendingCountEl.textContent = pending;
    }
    if (deliveredCountEl) {
      const delivered = orders.filter(o => o.order_status === 'delivered').length;
      deliveredCountEl.textContent = delivered;
    }
    if (revenueTotalEl) {
      const totalRev = orders
        .filter(o => o.order_status !== 'cancelled')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      revenueTotalEl.textContent = formatLKR(totalRev);
    }
  }

  function renderOrdersTable(orders) {
    if (!orders || orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--hz-gray-sub); padding: 2.5rem;">No matching orders found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = orders.map(o => `
      <tr>
        <td>
          <span style="display: inline-block; padding: 0.35rem 0.75rem; background: #F4F7FE; border-radius: 8px; font-weight: 800; color: var(--hz-navy); font-size: 0.82rem; letter-spacing: 0.5px;">#${o.order_number}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.9rem;">${o.customer_name || 'Guest'}</div>
          <div style="font-size: 0.78rem; color: var(--hz-gray-sub); font-weight: 500;">${o.customer_phone || ''} ${o.city ? `• <span style="color: var(--hz-navy);">${o.city}</span>` : ''}</div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--hz-navy); font-size: 0.92rem;">${formatLKR(o.total_amount)}</div>
          <div style="font-size: 0.75rem; color: var(--hz-gray-sub);">Fee: ${formatLKR(o.delivery_fee || 0)}</div>
        </td>
        <td>
          <span class="hz-status-pill hz-status-${o.order_status || 'pending'}">${(o.order_status || 'pending').replace(/_/g, ' ')}</span>
          ${o.tracking_number ? `
            <div style="margin-top: 5px;">
              <button type="button" class="hz-tracking-badge" onclick="openCourierLiveModal('${o.tracking_number}', '${o.order_number}', '${encodeURIComponent(o.customer_name || '')}')" style="background: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; border-radius: 6px; font-size: 0.72rem; font-weight: 700; padding: 2px 7px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Live track on Fardar Domestic">
                <svg style="width: 11px; height: 11px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="6" rx="2"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M17 6h3l3 4v3h-6z"/></svg>
                ${o.tracking_number} ↗
              </button>
            </div>
          ` : ''}
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--hz-navy);">${formatDateTime(o.created_at)}</div>
        </td>
        <td style="text-align: right;">
          <div class="hz-order-actions" style="justify-content: flex-end;">
            <button class="hz-action-pill hz-action-edit" title="Edit Customer & Delivery Details" onclick="openEditOrderModal(${o.id})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              Edit
            </button>
            <button class="hz-action-pill hz-action-status" title="Update Fulfillment Status" onclick="openUpdateStatusModal(${o.id}, '${o.order_status}', '${o.tracking_number || ''}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Status
            </button>
            <button class="hz-action-pill hz-action-invoice" title="Print Commercial Invoice" onclick="printInvoice(${o.id})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
              Invoice
            </button>
            <button class="hz-action-pill" title="Print Courier Shipping Address Label (A4)" onclick="printSingleAddressLabel(${o.id})" style="color: #4318FF; background: #EEF2FF;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Address
            </button>
            ${o.tracking_number ? `
            <button class="hz-action-pill" title="Live Courier Tracking (Fardar Domestic)" onclick="openCourierLiveModal('${o.tracking_number}', '${o.order_number}', '${encodeURIComponent(o.customer_name || '')}')" style="color: #0284C7; background: #E0F2FE;">
              <svg style="width: 14px; height: 14px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="13" x="1" y="6" rx="2"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M17 6h3l3 4v3h-6z"/></svg>
              Courier
            </button>` : ''}
            <button class="hz-action-pill hz-action-receipt" title="View Customer Bank Slip / Payment Receipt" onclick="openReceiptModal(${o.id}, '${o.order_number}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Receipt
            </button>
            ${o.order_status !== 'cancelled' ? `
            <button class="hz-action-pill hz-action-cancel" title="Cancel this order" onclick="cancelOrderModal(${o.id}, '${o.order_number}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
              Cancel
            </button>` : ''}
            <button class="hz-action-pill hz-action-del" title="Permanently delete order" onclick="deleteOrderModal(${o.id}, '${o.order_number}')">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Filter Orders Search & Dropdown Handler
  window.filterOrdersTable = function() {
    const searchInput = document.getElementById('order-search-input');
    const statusFilter = document.getElementById('order-status-filter');
    const dateFilterEl = document.getElementById('order-date-filter');
    
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const status = statusFilter ? statusFilter.value : 'ALL';
    const dateFilter = dateFilterEl ? dateFilterEl.value : '0';

    let filtered = allAdminOrders.filter(o => {
      // Status Filter
      if (status !== 'ALL' && o.order_status !== status) return false;
      
      // Date Filter
      if (dateFilter !== 'ALL' && o.created_at) {
        const orderDate = new Date(o.created_at);
        const offset = parseInt(dateFilter);
        
        const now = new Date();
        let cycleStart = new Date(now);
        if (now.getHours() < 12) {
          cycleStart.setDate(cycleStart.getDate() - 1);
        }
        cycleStart.setHours(12, 0, 0, 0);
        cycleStart.setDate(cycleStart.getDate() - offset);
        
        let cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleEnd.getDate() + 1);

        if (orderDate < cycleStart || orderDate >= cycleEnd) return false;
      }

      // Search Query
      if (query) {
        const orderNum = (o.order_number || '').toLowerCase();
        const custName = (o.customer_name || '').toLowerCase();
        const phone = (o.customer_phone || '').toLowerCase();
        const city = (o.city || '').toLowerCase();
        const address = (o.customer_address || '').toLowerCase();
        if (!orderNum.includes(query) && !custName.includes(query) && !phone.includes(query) && !city.includes(query) && !address.includes(query)) {
          return false;
        }
      }
      return true;
    });

    // Custom Sorting: Pending & Processing on top, then newest first
    filtered.sort((a, b) => {
      const statusWeight = { pending: 3, processing: 2 };
      const wA = statusWeight[a.order_status] || 0;
      const wB = statusWeight[b.order_status] || 0;
      
      if (wA !== wB) return wB - wA;
      return b.id - a.id;
    });

    renderOrdersTable(filtered);
    
    // Also update metrics based on filtered results
    updateOrderMetrics(filtered);
  };

  // Instant Refresh Orders Helper
  window.refreshOrdersData = async function() {
    const icon = document.getElementById('refresh-orders-icon');
    if (icon) icon.style.transform = 'rotate(360deg)';
    await loadOrders();
    showToast('Orders & sales metrics refreshed!', 'success');
    if (icon) {
      setTimeout(() => { icon.style.transform = 'none'; }, 500);
    }
  };

  loadOrders();
  window.loadOrders = loadOrders;

  const statusForm = document.getElementById('status-update-form');
  if (statusForm) {
    statusForm.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = statusForm.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      const orderId = document.getElementById('status-order-id').value;
      const payload = {
        status: document.getElementById('status-select').value,
        tracking_number: document.getElementById('status-tracking-num').value,
        note: document.getElementById('status-note').value
      };

      try {
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Order status updated successfully!', 'success');
          closeModal('status-modal');
          loadOrders();
        } else {
          showToast(data.message || 'Failed to update status', 'error');
        }
      } catch (err) {
        showToast('Failed to update order status', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Status';
        }
      }
    };
  }
}

window.editOrderItems = [];

async function openEditOrderModal(orderId) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/invoice`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success && data.invoice) {
      const o = data.invoice;
      document.getElementById('edit-order-id').value = o.id;
      document.getElementById('edit-customer-name').value = o.customer_name || '';
      document.getElementById('edit-customer-phone').value = o.customer_phone || '';
      document.getElementById('edit-customer-email').value = o.customer_email || '';
      document.getElementById('edit-customer-address').value = o.customer_address || '';
      document.getElementById('edit-province').value = o.province || 'Western';
      onEditProvinceChange(o.city || 'Colombo');
      document.getElementById('edit-delivery-fee').value = o.delivery_fee || 0;
      document.getElementById('edit-tracking-number').value = o.tracking_number || '';
      document.getElementById('edit-order-status').value = o.order_status || 'pending';
      document.getElementById('edit-delivery-notes').value = o.delivery_notes || '';
      
      // Load existing items
      window.editOrderItems = (o.items || []).map(item => ({
        product_id: item.product_id,
        name: item.product_name || `Product #${item.product_id}`,
        size: item.size || '-',
        color: item.color || '-',
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      }));
      renderEditOrderItems();
      
      openModal('edit-order-modal');
    } else {
      showToast('Failed to load order details', 'error');
    }
  } catch (err) {
    console.error('Error fetching order for edit:', err);
    showToast('Error loading order details', 'error');
  }
}

function renderEditOrderItems() {
  const tbody = document.getElementById('edit-order-items-tbody');
  if (!tbody) return;
  tbody.innerHTML = window.editOrderItems.map((item, index) => `
    <tr>
      <td style="padding: 8px; font-size: 0.85rem;">${item.name}</td>
      <td style="padding: 8px; font-size: 0.85rem;">${item.size} / ${item.color}</td>
      <td style="padding: 8px; font-size: 0.85rem;">Rs. ${item.price.toLocaleString()}</td>
      <td style="padding: 8px;">
        <input type="number" min="1" value="${item.quantity}" class="hz-form-input" style="padding: 4px; font-size: 0.8rem;" onchange="updateEditOrderItemQty(${index}, this.value)">
      </td>
      <td style="padding: 8px; text-align: center;">
        <button type="button" onclick="removeEditOrderItem(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.2rem;">&times;</button>
      </td>
    </tr>
  `).join('');
}

window.updateEditOrderItemQty = function(index, newQty) {
  const qty = parseInt(newQty);
  if (qty > 0 && window.editOrderItems[index]) {
    window.editOrderItems[index].quantity = qty;
  }
};

window.removeEditOrderItem = function(index) {
  window.editOrderItems.splice(index, 1);
  renderEditOrderItems();
};

window.openEditOrderProductSelector = function() {
  document.getElementById('edit-order-product-search').value = '';
  document.getElementById('edit-order-product-results').innerHTML = '<div style="text-align:center; padding:1rem;">Loading products...</div>';
  document.getElementById('edit-order-product-search-container').style.display = 'block';
  document.getElementById('edit-order-variant-selector').style.display = 'none';
  openModal('edit-order-product-modal');
  handleEditOrderProductSearch();
};

let editOrderSearchTimeout;
window.handleEditOrderProductSearch = function() {
  clearTimeout(editOrderSearchTimeout);
  editOrderSearchTimeout = setTimeout(async () => {
    const q = document.getElementById('edit-order-product-search').value.trim();
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&status=active`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const container = document.getElementById('edit-order-product-results');
        if (data.products.length === 0) {
          container.innerHTML = '<div style="text-align:center; padding:1rem; color:#64748b;">No products found.</div>';
          return;
        }
        container.innerHTML = data.products.map(p => {
          const imgUrl = p.primary_image || '/images/placeholder.svg';
          return `
          <div style="border: 1px solid var(--hz-border); padding: 0.8rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--hz-border)'" onclick="openEditOrderVariantSelector(${p.id})">
            <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" onerror="this.src='/images/placeholder.svg'">
            <div style="flex-grow: 1;">
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--hz-navy);">${p.name}</div>
              <div style="font-size: 0.8rem; color: #64748b;">Rs. ${parseFloat(p.price).toLocaleString()} | Stock: ${p.quantity}</div>
            </div>
            <div style="color: var(--primary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        `}).join('');
      }
    } catch (e) {
      console.error(e);
      document.getElementById('edit-order-product-results').innerHTML = '<div style="color:red; text-align:center;">Error loading products</div>';
    }
  }, 300);
};

window.currentEditOrderProduct = null;
window.currentEditOrderSelectedSize = null;
window.currentEditOrderSelectedColor = null;

window.openEditOrderVariantSelector = async function(id) {
  try {
    document.getElementById('edit-order-product-search-container').style.display = 'none';
    const variantContainer = document.getElementById('edit-order-variant-selector');
    variantContainer.style.display = 'block';
    variantContainer.innerHTML = '<div style="text-align:center; padding:2rem;">Loading details...</div>';
    
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json();
    if (data.success && data.product) {
      window.currentEditOrderProduct = data.product;
      window.currentEditOrderSelectedSize = null;
      window.currentEditOrderSelectedColor = null;
      
      renderEditOrderVariantSelector();
    }
  } catch (e) {
    console.error(e);
  }
};

window.renderEditOrderVariantSelector = function() {
  const p = window.currentEditOrderProduct;
  if (!p) return;
  
  const variants = p.variants || [];
  const uniqueSizes = [...new Set(variants.map(v => v.size).filter(s => s && s !== '-'))];
  const uniqueColors = [...new Set(variants.map(v => v.color).filter(c => c && c !== '-'))];
  
  let sizeHtml = '';
  if (uniqueSizes.length > 0) {
    if (!window.currentEditOrderSelectedSize) window.currentEditOrderSelectedSize = uniqueSizes[0];
    sizeHtml = `
      <div style="margin-top:1rem;">
        <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 0.5rem; color: #64748b; text-transform: uppercase;">Select Size</div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${uniqueSizes.map(s => {
            const isActive = window.currentEditOrderSelectedSize === s;
            return `<button type="button" class="hz-btn-pill" style="border: 2px solid ${isActive ? 'var(--primary)' : 'var(--hz-border)'}; background: ${isActive ? 'var(--primary)' : '#fff'}; color: ${isActive ? '#fff' : 'var(--hz-navy)'}; padding: 6px 16px; font-weight: 600;" onclick="window.currentEditOrderSelectedSize='${s}'; renderEditOrderVariantSelector()">${s}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    window.currentEditOrderSelectedSize = '-';
  }
  
  let colorHtml = '';
  if (uniqueColors.length > 0) {
    if (!window.currentEditOrderSelectedColor) window.currentEditOrderSelectedColor = uniqueColors[0];
    colorHtml = `
      <div style="margin-top:1rem;">
        <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 0.5rem; color: #64748b; text-transform: uppercase;">Select Color</div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${uniqueColors.map(c => {
            const isActive = window.currentEditOrderSelectedColor === c;
            return `<button type="button" class="hz-btn-pill" style="border: 2px solid ${isActive ? 'var(--primary)' : 'var(--hz-border)'}; background: ${isActive ? 'var(--primary)' : '#fff'}; color: ${isActive ? '#fff' : 'var(--hz-navy)'}; padding: 6px 16px; font-weight: 600;" onclick="window.currentEditOrderSelectedColor='${c}'; renderEditOrderVariantSelector()">${c}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    window.currentEditOrderSelectedColor = '-';
  }
  
  const imgUrl = p.images && p.images.length > 0 ? p.images[0].image_url : '/images/placeholder.svg';
  
  document.getElementById('edit-order-variant-selector').innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid var(--hz-border); padding-bottom: 1rem; margin-bottom: 1rem;">
      <button type="button" onclick="document.getElementById('edit-order-variant-selector').style.display='none'; document.getElementById('edit-order-product-search-container').style.display='block';" style="background:none; border:none; color:var(--primary); cursor:pointer; font-weight:600;">&larr; Back</button>
      <div style="flex-grow:1; font-weight: 800; font-size: 1.1rem; color: var(--hz-navy);">${p.name}</div>
    </div>
    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
      <img src="${imgUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--hz-border);" onerror="this.src='/images/placeholder.svg'">
      <div>
        <div style="font-size: 1.2rem; font-weight: 800; color: var(--hz-navy);">Rs. ${parseFloat(p.price).toLocaleString()}</div>
        <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Total Stock: ${p.quantity}</div>
      </div>
    </div>
    ${sizeHtml}
    ${colorHtml}
    <div style="margin-top: 2rem;">
      <button type="button" class="hz-btn-pill hz-btn-primary" style="width: 100%; padding: 12px; font-size: 1rem; font-weight: 700;" onclick="confirmAddEditOrderProduct()">Confirm & Add Item</button>
    </div>
  `;
};

window.confirmAddEditOrderProduct = function() {
  if (!window.currentEditOrderProduct) return;
  const p = window.currentEditOrderProduct;
  
  window.editOrderItems.push({
    product_id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    size: window.currentEditOrderSelectedSize || '-',
    color: window.currentEditOrderSelectedColor || '-',
    quantity: 1
  });
  renderEditOrderItems();
  closeModal('edit-order-product-modal');
};

async function handleEditOrderSubmit(event) {
  event.preventDefault();
  const orderId = document.getElementById('edit-order-id').value;
  const submitBtn = document.getElementById('edit-order-submit-btn');

  const payload = {
    customer_name: document.getElementById('edit-customer-name').value,
    customer_phone: document.getElementById('edit-customer-phone').value,
    customer_email: document.getElementById('edit-customer-email').value,
    customer_address: document.getElementById('edit-customer-address').value,
    city: document.getElementById('edit-city').value,
    province: document.getElementById('edit-province').value,
    delivery_fee: parseFloat(document.getElementById('edit-delivery-fee').value) || 0,
    tracking_number: document.getElementById('edit-tracking-number').value,
    order_status: document.getElementById('edit-order-status').value,
    delivery_notes: document.getElementById('edit-delivery-notes').value,
    items: window.editOrderItems
  };

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast('Order details updated successfully!', 'success');
      closeModal('edit-order-modal');
      if (document.getElementById('admin-orders-view')) initAdminOrders();
      if (document.getElementById('admin-dashboard-view')) initAdminDashboard();
    } else {
      showToast(data.message || 'Failed to update order', 'error');
    }
  } catch (err) {
    console.error('Edit order error:', err);
    showToast('Error updating order', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Order Changes';
    }
  }
}

function openUpdateStatusModal(id, currentStatus, trackingNo) {
  document.getElementById('status-order-id').value = id;
  document.getElementById('status-select').value = currentStatus;
  const trkInput = document.getElementById('status-tracking-num');
  if (trkInput) {
    trkInput.value = trackingNo || '';
    setTimeout(() => {
      trkInput.focus();
      trkInput.select();
    }, 150);
  }
  openModal('status-modal');
}

// ─── Receipt Modal ───
async function openReceiptModal(orderId, orderNumber) {
  // Show the receipt modal
  let modal = document.getElementById('receipt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'receipt-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <svg style="width: 20px; height: 20px; stroke: var(--primary);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Payment Receipt
          </h3>
          <button onclick="closeModal('receipt-modal')" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
        </div>
        <div id="receipt-modal-content" style="text-align: center;">Loading...</div>
        <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem;" id="receipt-action-buttons"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.dataset.orderId = orderId;
  modal.dataset.orderNumber = orderNumber;
  document.getElementById('receipt-modal-content').innerHTML = '<p style="color:#64748b;">Loading receipt...</p>';
  document.getElementById('receipt-action-buttons').innerHTML = '';
  openModal('receipt-modal');

  try {
    const res = await fetch(`/api/whatsapp/receipts/${orderId}`, { headers: authHeaders() });
    const data = await res.json();

    if (data.success && data.receipt) {
      const r = data.receipt;
      const isPdf = r.file_type === 'pdf' || (r.file_path && r.file_path.endsWith('.pdf'));
      document.getElementById('receipt-modal-content').innerHTML = isPdf
        ? `<p style="margin-bottom:1rem; color:#64748b;">Order <strong>#${orderNumber}</strong> — PDF Receipt</p>
           <a href="${r.file_path}" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
             <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
             Open PDF Receipt
           </a>`
        : `<p style="margin-bottom:1rem; color:#64748b;">Order <strong>#${orderNumber}</strong> — Payment Slip</p>
           <img src="${r.file_path}" style="max-width:100%; max-height:400px; border-radius:12px; border:1px solid #E2E8F0;" onerror="this.src=''"
                alt="Payment Receipt" />`;

      document.getElementById('receipt-action-buttons').innerHTML = `
        <button class="btn btn-primary" onclick="verifyReceipt(${orderId}, 'confirm', '${orderNumber}')" style="background: #10B981; display: inline-flex; align-items: center; gap: 6px;">
          <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Confirm Payment
        </button>
        <button class="btn btn-sm" style="background: #FEE2E2; color: #DC2626; border: none; padding: 0.7rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="verifyReceipt(${orderId}, 'cancel', '${orderNumber}')">
          <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
          Decline Receipt
        </button>
        <label class="btn btn-sm" style="background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          Replace Slip
          <input type="file" accept="image/*,application/pdf" style="display:none;" onchange="uploadReceiptForOrder(${orderId}, '${orderNumber}', this)" />
        </label>
      `;
    } else {
      document.getElementById('receipt-modal-content').innerHTML = `
        <div style="padding: 2rem; color: #64748b;">
          <div style="margin-bottom: 1rem;">
            <svg style="width: 48px; height: 48px; stroke: #CBD5E1;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M19 16v6"/><path d="M16 19h6"/></svg>
          </div>
          <p>No receipt has been uploaded for Order <strong>#${orderNumber}</strong> yet.</p>
          <p style="font-size:0.85rem; margin-bottom: 1.5rem;">Customer can send via WhatsApp or via the customer upload portal.</p>
          <label class="btn btn-primary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <svg style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Upload Slip / PDF Manually
            <input type="file" accept="image/*,application/pdf" style="display:none;" onchange="uploadReceiptForOrder(${orderId}, '${orderNumber}', this)" />
          </label>
        </div>`;
    }
  } catch (err) {
    document.getElementById('receipt-modal-content').innerHTML = '<p style="color: #EF4444;">Failed to load receipt. Please try again.</p>';
  }
}

async function uploadReceiptForOrder(orderId, orderNumber, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('orderNumber', orderNumber);

  try {
    showToast('Uploading receipt...', 'info');
    const res = await fetch(`/api/whatsapp/receipts/${orderId}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast('Receipt attached successfully!', 'success');
      openReceiptModal(orderId, orderNumber);
      if (typeof loadOrders === 'function') loadOrders();
    } else {
      showToast(data.message || 'Failed to upload receipt', 'error');
    }
  } catch (err) {
    showToast('Error uploading receipt', 'error');
  }
}
window.openReceiptModal = openReceiptModal;
window.showReceiptModal = openReceiptModal;

async function verifyReceipt(orderId, action, orderNumber) {
  const actionLabel = action === 'confirm' ? 'CONFIRM' : 'DECLINE';
  if (!confirm(`Are you sure you want to ${actionLabel} the receipt for Order #${orderNumber}?\n\n${action === 'confirm' ? 'Order will move to Processing & Packing. Customer will be notified.' : 'Order will be cancelled. Customer will be notified to resubmit.'}`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/verify-receipt`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (data.success) {
      showToast(action === 'confirm' ? 'Receipt confirmed! Order is now Processing.' : 'Receipt declined. Order cancelled & customer notified.', 'success');
      closeModal('receipt-modal');
      if (window.loadOrders) loadOrders();
    } else {
      showToast(data.message || 'Operation failed', 'error');
    }
  } catch (err) {
    showToast('Error processing receipt', 'error');
  }
}

async function cancelOrderModal(orderId, orderNumber) {
  if (!confirm(`Are you sure you want to CANCEL Order #${orderNumber}?\n\nThis will mark the order as Cancelled and automatically RESTORE all item quantities back to stock/inventory.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        status: 'cancelled',
        note: 'Order cancelled by cashier - Stock returned to inventory'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderNumber} cancelled & stock restored!`, 'success');
      if (document.getElementById('admin-orders-view')) initAdminOrders();
      if (document.getElementById('admin-dashboard-view')) initAdminDashboard();
      if (document.getElementById('admin-products-view')) initAdminProducts();
    } else {
      showToast(data.message || 'Failed to cancel order', 'error');
    }
  } catch (err) {
    console.error('Error cancelling order:', err);
    showToast('Error cancelling order', 'error');
  }
}

// Print Invoice Handler
async function printInvoice(orderId) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/invoice`, { headers: authHeaders() });
    const data = await res.json();

    if (!data.success) {
      showToast('Invoice not found', 'error');
      return;
    }

    const o = data.invoice;
    const itemsHtml = o.items.map(item => `
      <tr>
        <td>${item.product_name} (${item.size}, ${item.color})</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatLKR(item.price)}</td>
        <td style="text-align: right;">${formatLKR(item.total)}</td>
      </tr>
    `).join('');

    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${o.order_number} - FelliRo</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #0F172A; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FF007F; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 800; color: #FF007F; }
          .bill-to { margin: 30px 0; background: #F8FAFC; padding: 20px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: left; }
          th { background: #F1F5F9; text-transform: uppercase; font-size: 12px; }
          .total-box { text-align: right; margin-top: 30px; font-size: 20px; font-weight: bold; color: #FF007F; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">FelliRo</div>
          <div>
            <h2>INVOICE</h2>
            <p><strong>Order #:</strong> ${o.order_number}</p>
            <p><strong>Date:</strong> ${formatDateOnly(o.created_at)}</p>
          </div>
        </div>
        <div class="bill-to">
          <h4>Customer Details</h4>
          <p><strong>Name:</strong> ${o.customer_name}</p>
          <p><strong>Phone:</strong> ${o.customer_phone}</p>
          <p><strong>Address:</strong> ${o.customer_address || 'Store Pickup / WhatsApp Order'}, ${o.city || ''}</p>
          <p><strong>Payment Method:</strong> ${o.payment_method.toUpperCase()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right; font-size: 14px; line-height: 1.6;">
          <div>Items Subtotal: <strong>${formatLKR(parseFloat(o.total_amount) - parseFloat(o.delivery_fee || 0))}</strong></div>
          <div>Courier / Delivery Charge: <strong>${formatLKR(o.delivery_fee || 0)}</strong></div>
          <div class="total-box" style="margin-top: 10px; font-size: 20px;">
            Total Paid / Due: ${formatLKR(o.total_amount)}
          </div>
        </div>
        <div style="margin-top: 50px; text-align: center; color: #64748b; font-size: 12px;">
          Thank you for choosing FelliRo! For a better version of you.
        </div>
      </body>
      </html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.print();
  } catch (err) {
    console.error('Invoice error:', err);
    showToast('Failed to print invoice', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// Shipping Address Label Printing Engine (A4 Grid - 4 Labels / Sheet)
// ─────────────────────────────────────────────────────────────────
let selectedAddressOrderIds = new Set();
let currentFilteredLabelOrders = [];

function escapeLabelHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.openAddressPrintModal = function() {
  const modal = document.getElementById('address-print-modal');
  if (!modal) return;

  selectedAddressOrderIds.clear();

  // If there are orders in processing or ready_for_dispatch, set default filter accordingly
  const statusFilter = document.getElementById('label-status-filter');
  const searchInput = document.getElementById('label-search-input');
  if (searchInput) searchInput.value = '';

  const hasProcessing = allAdminOrders.some(o => o.order_status === 'processing' || o.order_status === 'ready_for_dispatch');
  if (statusFilter) {
    statusFilter.value = hasProcessing ? 'processing' : 'ALL';
  }

  filterAddressPrintList();
  openModal('address-print-modal');
};

window.filterAddressPrintList = function() {
  const searchInput = document.getElementById('label-search-input');
  const statusFilter = document.getElementById('label-status-filter');
  const dateFilterEl = document.getElementById('label-date-filter');
  
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const status = statusFilter ? statusFilter.value : 'ALL';
  const dateFilter = dateFilterEl ? dateFilterEl.value : '0';

  currentFilteredLabelOrders = allAdminOrders.filter(o => {
    // Exclude cancelled orders by default unless explicitly chosen
    if (status === 'ALL') {
      if (o.order_status === 'cancelled') return false;
    } else if (o.order_status !== status) {
      return false;
    }

    // Date Filter
    if (dateFilter !== 'ALL' && o.created_at) {
      const orderDate = new Date(o.created_at);
      const offset = parseInt(dateFilter);
      
      const now = new Date();
      let cycleStart = new Date(now);
      if (now.getHours() < 12) {
        cycleStart.setDate(cycleStart.getDate() - 1);
      }
      cycleStart.setHours(12, 0, 0, 0);
      cycleStart.setDate(cycleStart.getDate() - offset);
      
      let cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleEnd.getDate() + 1);

      if (orderDate < cycleStart || orderDate >= cycleEnd) return false;
    }

    if (query) {
      const orderNum = (o.order_number || '').toLowerCase();
      const name = (o.customer_name || '').toLowerCase();
      const phone = (o.customer_phone || '').toLowerCase();
      const city = (o.city || '').toLowerCase();
      const address = (o.customer_address || '').toLowerCase();
      if (!orderNum.includes(query) && !name.includes(query) && !phone.includes(query) && !city.includes(query) && !address.includes(query)) {
        return false;
      }
    }
    return true;
  });

  renderAddressPrintList(currentFilteredLabelOrders);
};

function renderAddressPrintList(orders) {
  const tbody = document.getElementById('label-orders-table-body');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--hz-gray-sub); padding: 2rem;">No orders match the selected criteria.</td></tr>`;
    updateAddressSelectionSummary();
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const isChecked = selectedAddressOrderIds.has(o.id);
    const isCod = (o.payment_method || '').toLowerCase() === 'cod';
    return `
      <tr style="cursor: pointer; ${isChecked ? 'background: #F4F7FE;' : ''}" onclick="handleAddressRowClick(event, ${o.id})">
        <td style="text-align: center;" onclick="event.stopPropagation()">
          <input type="checkbox" class="label-order-cb" value="${o.id}" ${isChecked ? 'checked' : ''} onchange="handleAddressCheckboxToggle(${o.id}, this.checked)" style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--hz-brand);">
        </td>
        <td>
          <span style="display: inline-block; padding: 0.25rem 0.55rem; background: #F4F7FE; border-radius: 6px; font-weight: 800; color: var(--hz-navy); font-size: 0.8rem;">#${o.order_number}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.86rem;">${escapeLabelHtml(o.customer_name || 'Guest')}</div>
          <div style="font-size: 0.76rem; color: #4318FF; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            <svg style="width: 12px; height: 12px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${escapeLabelHtml(o.customer_phone || '-')}
          </div>
        </td>
        <td>
          <div style="font-size: 0.8rem; color: var(--hz-navy); max-width: 260px; line-height: 1.25;">${escapeLabelHtml(o.customer_address || 'Address not specified')}</div>
          <div style="font-size: 0.74rem; color: var(--hz-gray-sub); font-weight: 600; margin-top: 2px;">${escapeLabelHtml(o.city || '')} ${o.province ? `• ${escapeLabelHtml(o.province)}` : ''}</div>
        </td>
        <td>
          <span class="hz-status-pill hz-status-${o.order_status || 'pending'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;">${(o.order_status || 'pending').replace(/_/g, ' ')}</span>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--hz-navy); font-size: 0.84rem;">${formatLKR(o.total_amount)}</div>
          <span style="font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 4px; display: inline-block; margin-top: 2px; ${isCod ? 'background: #FEF2F2; color: #DC2626;' : 'background: #ECFDF5; color: #059669;'}">
            ${isCod ? 'COD' : 'PAID'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  updateAddressSelectionSummary();
}

window.handleAddressRowClick = function(e, orderId) {
  const cb = document.querySelector(`input.label-order-cb[value="${orderId}"]`);
  if (cb) {
    cb.checked = !cb.checked;
    handleAddressCheckboxToggle(orderId, cb.checked);
  }
};

window.handleAddressCheckboxToggle = function(orderId, checked) {
  if (checked) {
    selectedAddressOrderIds.add(orderId);
  } else {
    selectedAddressOrderIds.delete(orderId);
  }
  updateAddressSelectionSummary();
};

window.toggleSelectAllAddressLabels = function(checked) {
  currentFilteredLabelOrders.forEach(o => {
    if (checked) {
      selectedAddressOrderIds.add(o.id);
    } else {
      selectedAddressOrderIds.delete(o.id);
    }
  });

  const checkboxes = document.querySelectorAll('.label-order-cb');
  checkboxes.forEach(cb => { cb.checked = checked; });

  updateAddressSelectionSummary();
};

function updateAddressSelectionSummary() {
  const count = selectedAddressOrderIds.size;
  const sheets = Math.ceil(count / 4);
  const summaryEl = document.getElementById('label-selection-summary');
  const printBtn = document.getElementById('btn-execute-print-labels');
  const selectAllCb = document.getElementById('label-select-all-cb');

  if (summaryEl) {
    summaryEl.textContent = `${count} selected (${sheets} A4 sheet${sheets === 1 ? '' : 's'})`;
  }

  if (printBtn) {
    printBtn.disabled = (count === 0);
    printBtn.style.opacity = count === 0 ? '0.5' : '1';
    printBtn.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
  }

  if (selectAllCb && currentFilteredLabelOrders.length > 0) {
    const allFilteredSelected = currentFilteredLabelOrders.every(o => selectedAddressOrderIds.has(o.id));
    selectAllCb.checked = allFilteredSelected;
  }
}

window.executePrintSelectedAddressLabels = function() {
  if (selectedAddressOrderIds.size === 0) {
    showToast('Please select at least one order to print address labels', 'error');
    return;
  }

  const selectedOrders = allAdminOrders.filter(o => selectedAddressOrderIds.has(o.id));
  generateAndPrintAddressLabels(selectedOrders);
};

window.printSingleAddressLabel = function(orderId) {
  const order = allAdminOrders.find(o => o.id == orderId);
  if (!order) {
    showToast('Order details not found', 'error');
    return;
  }
  generateAndPrintAddressLabels([order]);
};

function generateAndPrintAddressLabels(orders) {
  if (!orders || orders.length === 0) return;

  // Group into batches of 4 for A4 Landscape 2x2 grid
  const chunks = [];
  for (let i = 0; i < orders.length; i += 4) {
    chunks.push(orders.slice(i, i + 4));
  }

  const pagesHtml = chunks.map((chunk, pageIndex) => {
    // Generate 4 card slots (if less than 4, fill remaining with empty placeholder)
    const cardsHtml = [0, 1, 2, 3].map(slotIndex => {
      const o = chunk[slotIndex];
      if (!o) {
        return `
          <div class="shipping-label-card empty-card">
            <div>[ Empty Slot ]</div>
          </div>
        `;
      }

      const isCod = (o.payment_method || '').toLowerCase() === 'cod';
      const orderTotal = parseFloat(o.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <div class="shipping-label-card">
          <!-- Top Row: Brand & Order No & Payment Status -->
          <div class="top-row">
            <div class="brand-order-group">
              <span class="brand-name">FELLIRO</span>
              <span class="order-tag">#${escapeLabelHtml(o.order_number)}</span>
            </div>
            <div class="payment-box ${isCod ? 'cod-box' : 'paid-box'}">
              ${isCod ? `COD: Rs. ${orderTotal}` : 'PAID / PREPAID'}
            </div>
          </div>

          <!-- Deliver To (Customer Section - Fills Main Area) -->
          <div class="customer-section">
            <div class="section-label">DELIVER TO:</div>
            <div class="customer-name">${escapeLabelHtml(o.customer_name || 'Customer')}</div>
            <div class="customer-address">${escapeLabelHtml(o.customer_address || 'Address Not Provided')}</div>
            <div class="customer-city">
              <svg style="width: 14px; height: 14px; display: inline-block; vertical-align: -2px; margin-right: 2px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <strong>${escapeLabelHtml(o.city || 'Colombo')}</strong>${o.province ? `, <span>${escapeLabelHtml(o.province)} Province</span>` : ''}
            </div>
            <div class="customer-phone">
              <span class="phone-tag">TEL:</span>
              <span class="phone-number">
                <svg style="width: 15px; height: 15px; display: inline-block; vertical-align: -2px; margin-right: 3px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                ${escapeLabelHtml(o.customer_phone || '-')}
              </span>
            </div>
            ${o.delivery_notes ? `<div class="customer-note"><strong>Note:</strong> ${escapeLabelHtml(o.delivery_notes)}</div>` : ''}
          </div>

          <!-- Sender / From Section -->
          <div class="sender-section">
            <div class="from-label">FROM:</div>
            <div class="from-text">
              <strong>FelliRo Pvt Ltd</strong>, Anuradhapura. | Hotline: <strong>071 771 6005</strong> | Web: <strong>felliro.com</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="a4-sheet">
        ${cardsHtml}
      </div>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    showToast('Pop-up blocked. Please allow popups to print address labels', 'error');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Shipping Address Labels (A4 Landscape) - FelliRo</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #525659;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #000000;
        }
        @media print {
          body {
            background: #FFFFFF !important;
            padding: 0 !important;
          }
        }
        .a4-sheet {
          width: 297mm;
          height: 210mm;
          margin: 0 auto 20px auto;
          background: #FFFFFF;
          display: grid;
          grid-template-columns: 148.5mm 148.5mm;
          grid-template-rows: 105mm 105mm;
          page-break-inside: avoid;
          page-break-after: always;
          box-sizing: border-box;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        @media print {
          .a4-sheet {
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
        .a4-sheet:last-child {
          page-break-after: auto;
        }
        .shipping-label-card {
          width: 148.5mm;
          height: 105mm;
          box-sizing: border-box;
          border: 1.5px dashed #475569;
          padding: 6mm 8mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #FFFFFF;
          overflow: hidden;
        }
        .empty-card {
          border: 1px dashed #E2E8F0 !important;
          background: #FAFAFA !important;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CBD5E1;
          font-size: 14px;
          font-weight: 700;
        }

        /* Top Row */
        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #000000;
          padding-bottom: 2.5mm;
        }
        .brand-order-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brand-name {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #000000;
        }
        .order-tag {
          font-size: 13.5px;
          font-weight: 900;
          background: #000000;
          color: #FFFFFF;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .payment-box {
          font-size: 13.5px;
          font-weight: 900;
          padding: 3px 10px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .cod-box {
          background: #000000;
          color: #FFFFFF;
          border: 2px solid #000000;
        }
        .paid-box {
          background: #FFFFFF;
          color: #000000;
          border: 2px solid #000000;
        }

        /* Customer / Recipient Section (Fills Main Space) */
        .customer-section {
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
          flex: 1;
          padding: 2.5mm 0;
          justify-content: center;
        }
        .section-label {
          font-size: 10px;
          font-weight: 900;
          color: #333333;
          letter-spacing: 0.5px;
        }
        .customer-name {
          font-size: 18px;
          font-weight: 900;
          color: #000000;
          line-height: 1.15;
        }
        .customer-address {
          font-size: 13.5px;
          font-weight: 600;
          color: #111111;
          line-height: 1.3;
        }
        .customer-city {
          font-size: 14px;
          font-weight: 800;
          color: #000000;
        }
        .customer-phone {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F1F5F9;
          border: 1.5px solid #000000;
          padding: 3px 8px;
          border-radius: 4px;
          width: fit-content;
          margin-top: 1mm;
        }
        .phone-tag {
          font-size: 11px;
          font-weight: 800;
          color: #333333;
        }
        .phone-number {
          font-size: 17px;
          font-weight: 900;
          color: #000000;
          letter-spacing: 0.5px;
        }
        .customer-note {
          font-size: 11px;
          font-style: italic;
          color: #444444;
          margin-top: 1mm;
        }

        /* Sender / From Section */
        .sender-section {
          border-top: 1.5px solid #000000;
          padding-top: 2mm;
          font-size: 10.5px;
          line-height: 1.25;
          color: #222222;
        }
        .from-label {
          font-size: 9px;
          font-weight: 900;
          color: #444444;
          margin-bottom: 1px;
        }
        .from-text {
          font-size: 10.5px;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}


// Admin Reports Init (Horizon UI)
async function initAdminReports() {
  try {
    const periodDropdown = document.getElementById('report-period');
    const period = periodDropdown ? periodDropdown.value : 'all';

    const res = await fetch(`/api/admin/reports?period=${period}`, { headers: authHeaders() });
    const data = await res.json();

    if (data.success && data.data) {
      // 1. Update Financial KPI Metric Cards
      const grossElem = document.getElementById('report-gross-sales');
      if (grossElem) grossElem.textContent = formatLKR(data.data.gross_sales || 0);

      const costElem = document.getElementById('report-total-cost');
      if (costElem) costElem.textContent = formatLKR(data.data.total_cost || 0);

      const profitElem = document.getElementById('report-net-profit');
      if (profitElem) profitElem.textContent = formatLKR(data.data.net_profit || 0);

      const marginElem = document.getElementById('report-profit-margin');
      if (marginElem) marginElem.textContent = (data.data.avg_profit_margin || 0) + '%';

      // 2. Top Selling Items Horizon Table
      const topItemsBody = document.getElementById('report-top-items');
      if (topItemsBody) {
        if (!data.data.top_items || data.data.top_items.length === 0) {
          topItemsBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 3rem 1rem;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--hz-gray-sub);">
                  <svg style="width: 40px; height: 40px; stroke: #CBD5E1;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.95rem;">No products sold yet</div>
                  <div style="font-size: 0.8rem; color: #A3AED0;">Sales records will appear here as orders are placed.</div>
                </div>
              </td>
            </tr>
          `;
        } else {
          topItemsBody.innerHTML = data.data.top_items.map((item, idx) => `
            <tr>
              <td style="width: 40px;">
                <span style="background: ${idx === 0 ? '#FEF08A' : idx === 1 ? '#E2E8F0' : idx === 2 ? '#FFEDD5' : '#F4F7FE'}; color: ${idx === 0 ? '#854D0E' : idx === 1 ? '#475569' : idx === 2 ? '#9A3412' : 'var(--hz-navy)'}; font-weight: 800; font-size: 0.78rem; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;">
                  #${idx + 1}
                </span>
              </td>
              <td>
                <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.9rem;">${item.product_name}</div>
              </td>
              <td>
                <span class="hz-tag-pill" style="background: #F4F7FE; color: var(--hz-brand); font-weight: 700; font-size: 0.72rem; padding: 4px 10px; border-radius: 8px;">
                  ${item.category_name || 'General'}
                </span>
              </td>
              <td style="text-align: center;">
                <span style="background: #E6FAF5; color: #01B574; font-weight: 800; padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; display: inline-block;">
                  ${item.units_sold} pcs
                </span>
              </td>
              <td style="text-align: right; font-weight: 800; color: var(--hz-navy); font-size: 0.92rem;">
                ${formatLKR(item.revenue)}
              </td>
            </tr>
          `).join('');
        }
      }

      // 3. Regional Sales Performance Horizon Table
      const regionalBody = document.getElementById('report-regional-sales');
      if (regionalBody) {
        if (!data.data.regional_sales || data.data.regional_sales.length === 0) {
          regionalBody.innerHTML = `
            <tr>
              <td colspan="3" style="text-align: center; padding: 3rem 1rem;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--hz-gray-sub);">
                  <svg style="width: 40px; height: 40px; stroke: #CBD5E1;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.95rem;">No regional sales data available</div>
                  <div style="font-size: 0.8rem; color: #A3AED0;">Provincial delivery metrics will appear once orders are confirmed.</div>
                </div>
              </td>
            </tr>
          `;
        } else {
          regionalBody.innerHTML = data.data.regional_sales.map(region => `
            <tr>
              <td>
                <div style="font-weight: 700; color: var(--hz-navy); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--hz-brand);"></span>
                  ${region.province}
                </div>
              </td>
              <td style="text-align: center;">
                <span style="background: #EFF6FF; color: #3B82F6; font-weight: 800; padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; display: inline-block;">
                  ${region.orders_count} orders
                </span>
              </td>
              <td style="text-align: right; font-weight: 800; color: #01B574; font-size: 0.92rem;">
                ${formatLKR(region.delivery_charges_collected)}
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error loading reports:', err);
    showToast('Failed to load business reports data', 'error');
  }
}
window.initAdminReports = initAdminReports;

// ==========================================
// Product Variants UI Logic
// ==========================================
let variantCounter = 0;

function addVariantRow(size = '', color = '', qty = 0, imageUrl = '') {
  if (imageUrl === null || imageUrl === 'null') imageUrl = '';
  
  const tbody = document.getElementById('variants-table-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.style.background = '#ffffff';
  tr.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
  
  const fileInputId = 'var-file-' + Math.random().toString(36).substr(2, 9);
  const previewId = 'var-preview-' + Math.random().toString(36).substr(2, 9);
  
  tr.innerHTML = `
    <td style="padding: 8px 6px; border-radius: 8px 0 0 8px;"><input type="text" class="hz-form-input var-size" value="${size}" placeholder="e.g. M" style="padding: 6px 10px; font-size: 0.85rem; border-color: #cbd5e1;"></td>
    <td style="padding: 8px 6px;"><input type="text" class="hz-form-input var-color" value="${color}" placeholder="e.g. Red" style="padding: 6px 10px; font-size: 0.85rem; border-color: #cbd5e1;"></td>
    <td style="padding: 8px 6px;"><input type="number" class="hz-form-input var-qty" value="${qty}" min="0" style="padding: 6px 10px; font-size: 0.85rem; border-color: #cbd5e1;"></td>
    <td style="padding: 8px 6px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img id="${previewId}" src="${imageUrl || '/images/placeholder.svg'}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="document.getElementById('${fileInputId}').click()" onerror="this.src='/images/placeholder.svg'">
        <input type="file" id="${fileInputId}" class="var-image" accept="image/*" style="display: none;" onchange="
          if(this.files && this.files[0]) {
            const r = new FileReader();
            r.onload = e => document.getElementById('${previewId}').src = e.target.result;
            r.readAsDataURL(this.files[0]);
          }
        ">
        <input type="hidden" class="var-image-url" value="${imageUrl}">
        <span style="font-size: 0.75rem; color: var(--hz-brand); cursor: pointer; font-weight: 600;" onclick="document.getElementById('${fileInputId}').click()">Change</span>
      </div>
    </td>
    <td style="padding: 8px 6px; text-align: center; border-radius: 0 8px 8px 0;">
      <button type="button" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px;" title="Remove" onclick="this.closest('tr').remove()">
        <svg style="width: 18px; height: 18px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

function getVariantsData() {
  const tbody = document.getElementById('variants-table-body');
  if (!tbody) return [];
  const rows = tbody.querySelectorAll('tr');
  const variants = [];
  rows.forEach(tr => {
    const size = tr.querySelector('.var-size').value.trim();
    const color = tr.querySelector('.var-color').value.trim();
    const qty = parseInt(tr.querySelector('.var-qty').value) || 0;
    const imgUrl = tr.querySelector('.var-image-url') ? tr.querySelector('.var-image-url').value : '';
    if (size || color) {
      variants.push({ size, color, quantity: qty, image_url: imgUrl });
    }
  });
  return variants;
}

function renderVariants(variants) {
  const tbody = document.getElementById('variants-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (variants && variants.length > 0) {
    variants.forEach(v => addVariantRow(v.size, v.color, v.quantity, v.image_url));
  } else {
    addVariantRow();
  }
}

// Hook up override for Add New Product button
document.addEventListener('DOMContentLoaded', () => {
  const originalAddBtn = document.querySelector('button[onclick*="openAddProductModal"]');
  if (originalAddBtn) {
    originalAddBtn.onclick = openAddProductModal;
  }

  if (document.getElementById('product-category')) {
    loadCategoriesForSelect();
  }
});

// ==========================================
// Category Management UI Logic
// ==========================================

async function loadCategoriesForSelect() {
  try {
    const res = await fetch('/api/admin/categories', { headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      const select = document.getElementById('product-category');
      if (select) {
        select.innerHTML = data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }

      const filterSelect = document.getElementById('product-category-filter');
      if (filterSelect) {
        const currentVal = filterSelect.value || 'all';
        filterSelect.innerHTML = '<option value="all">All Categories</option>' + data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        filterSelect.value = currentVal;
      }

      const statCat = document.getElementById('stat-categories-count');
      if (statCat) statCat.textContent = data.categories.length;
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

window.openCategoryModal = async function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.zIndex = '9999';
  } else {
    console.error('category-modal not found');
  }
  await loadCategoryList();
}

async function loadCategoryList() {
  try {
    const res = await fetch('/api/admin/categories', { headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      const tbody = document.getElementById('category-list-body');
      if (!tbody) return;
      if (data.categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 1.5rem; color: var(--hz-gray-sub);">No categories found</td></tr>';
        return;
      }
      tbody.innerHTML = data.categories.map(c => `
        <tr>
          <td><strong style="color: var(--hz-navy);">${c.name}</strong></td>
          <td style="text-align: right;"><button class="hz-btn-pill" style="background:#FEEFEF; color:#EE5D50; padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="deleteCategory(${c.id})"><svg style="width: 13px; height: 13px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading category list:', err);
  }
}

window.handleCategorySubmit = async function (e) {
  e.preventDefault();
  const nameInput = document.getElementById('new-category-name');
  const name = nameInput.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Category added successfully', 'success');
      nameInput.value = '';
      loadCategoryList();
      loadCategoriesForSelect();
    } else {
      showToast(data.message || 'Failed to add category', 'error');
    }
  } catch (err) {
    console.error('Error adding category:', err);
    showToast('An error occurred', 'error');
  }
}

window.deleteCategory = async function (id) {
  if (!confirm('Are you sure you want to delete this category?')) return;

  try {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Category deleted successfully', 'success');
      loadCategoryList();
      loadCategoriesForSelect();
    } else {
      showToast(data.message || 'Failed to delete category', 'error');
    }
  } catch (err) {
    console.error('Error deleting category:', err);
    showToast('An error occurred', 'error');
  }
}

function openAddProductModal() {
  const form = document.getElementById('product-form');
  if (form) form.reset();
  const idInput = document.getElementById('product-id');
  if (idInput) idInput.value = '';
  const modalTitle = document.getElementById('product-modal-title');
  if (modalTitle) modalTitle.textContent = 'Add New Product & Variations';
  const feedback = document.getElementById('upload-feedback');
  if (feedback) feedback.style.display = 'none';
  if (typeof renderVariants === 'function') renderVariants([]);
  openModal('product-modal');
}

// ==========================================
// WhatsApp Bot Status & QR Scanner Logic
// ==========================================

let qrCodeInstance = null;
let statusPollingInterval = null;

async function fetchBotStatus() {
  const badgeText = document.getElementById('wa-status-text');
  const badgeDot = document.getElementById('wa-status-dot');
  const quickBot = document.getElementById('quick-bot-status');
  if (!badgeText && !quickBot) return;

  try {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    if (data.success) {
      if (data.connected) {
        if (badgeText) badgeText.textContent = 'Bot Online';
        if (badgeDot) badgeDot.style.background = '#05CD99';
        if (quickBot) { quickBot.textContent = 'Online'; quickBot.style.color = '#05CD99'; }
        closeQrModalIfConnected();
      } else if (data.qr_available) {
        if (badgeText) badgeText.textContent = 'Scan QR Code';
        if (badgeDot) badgeDot.style.background = '#FFB547';
        if (quickBot) { quickBot.textContent = 'Scan QR'; quickBot.style.color = '#FFB547'; }
        fetchQrCode();
      } else {
        if (badgeText) badgeText.textContent = 'Disconnected';
        if (badgeDot) badgeDot.style.background = '#EE5D50';
        if (quickBot) { quickBot.textContent = 'Offline'; quickBot.style.color = '#EE5D50'; }
      }
    }
  } catch (err) {
    if (badgeText) badgeText.textContent = 'Offline';
    if (badgeDot) badgeDot.style.background = '#EE5D50';
    if (quickBot) { quickBot.textContent = 'Offline'; quickBot.style.color = '#EE5D50'; }
  }
}

async function fetchQrCode() {
  const container = document.getElementById('qrcode-container');
  if (!container) return;
  try {
    const res = await fetch('/api/whatsapp/qr', { headers: authHeaders() });
    const data = await res.json();
    if (data.connected) {
      container.innerHTML = '<div style="color: #05CD99; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 8px;"><svg style="width: 48px; height: 48px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>WhatsApp Bot is Connected!</div>';
    } else if (data.qr) {
      renderQrCode(data.qr);
    } else {
      container.innerHTML = '<div style="color: #64748b; font-weight: 600; text-align: center; padding: 20px;"><p style="margin-bottom: 10px;">Generating QR Code, please wait...</p><button class="hz-btn-pill hz-btn-primary" onclick="forceRestartBot()" style="font-size: 0.85rem;">Generate QR Code</button></div>';
    }
  } catch (e) {
    console.error('Error loading QR code', e);
  }
}

function openQrModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) {
    modal.classList.add('active');
    const container = document.getElementById('qrcode-container');
    if (container) {
      container.innerHTML = '<p style="color: #64748b; font-weight: 600;">Loading WhatsApp QR code...</p>';
    }
    fetchQrCode();
  }
}

function closeQrModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.classList.remove('active');
}

function closeQrModalIfConnected() {
  const modal = document.getElementById('qr-modal');
  if (modal && modal.classList.contains('active')) {
    modal.classList.remove('active');
    showToast('WhatsApp Bot is now Connected!', 'success');
  }
}

function renderQrCode(qrData) {
  const container = document.getElementById('qrcode-container');
  if (!container || !qrData) return;

  container.innerHTML = '';

  if (typeof qrData === 'string' && (qrData.startsWith('data:image/') || qrData.startsWith('http') || qrData.startsWith('/'))) {
    const img = document.createElement('img');
    img.src = qrData;
    img.alt = 'WhatsApp QR Code';
    img.style.maxWidth = '250px';
    img.style.width = '100%';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
    container.appendChild(img);
  } else if (typeof QRCode !== 'undefined') {
    qrCodeInstance = new QRCode(container, {
      text: qrData,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    container.innerHTML = '<span style="color: #ef4444;">Unable to render QR code</span>';
  }
}

async function forceRestartBot() {
  const container = document.getElementById('qrcode-container');
  if (container) {
    container.innerHTML = '<div style="color: var(--hz-brand, #4318FF); font-weight: 700; text-align: center; padding: 20px;"><div class="hz-spinner" style="margin: 0 auto 10px auto;"></div>Restarting WhatsApp session & generating new QR...</div>';
  }

  try {
    const res = await fetch('/api/whatsapp/restart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Bot restart initiated. QR code incoming...', 'success');
      // Poll a few times for the fresh QR code
      let attempts = 0;
      const qrInterval = setInterval(async () => {
        attempts++;
        await fetchQrCode();
        if (attempts >= 8) clearInterval(qrInterval);
      }, 1500);
    } else {
      showToast(data.message || 'Failed to restart bot', 'error');
    }
  } catch (err) {
    console.error('Restart bot error:', err);
    showToast('Failed to restart bot', 'error');
  }
}

// Instant Refresh Products Helper
window.refreshProductsData = async function() {
  const btn = document.getElementById('refresh-icon-btn');
  if (btn) btn.style.transform = 'rotate(360deg)';
  
  if (typeof window.loadAdminProducts === 'function') {
    await window.loadAdminProducts();
  }
  if (typeof loadCategoriesForSelect === 'function') {
    await loadCategoriesForSelect();
  }
  showToast('Inventory & metrics refreshed!', 'success');
  
  if (btn) {
    setTimeout(() => { btn.style.transform = 'none'; }, 500);
  }
};

// Start polling & socket connection if we're in the admin panel
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('wa-status-badge') || document.getElementById('quick-bot-status')) {
    fetchBotStatus();
    statusPollingInterval = setInterval(fetchBotStatus, 5000);
  }

  // Initialize specific page controllers
  if (document.getElementById('admin-orders-view') || document.getElementById('admin-orders-table-body')) {
    if (typeof initAdminOrders === 'function') initAdminOrders();
    if (typeof onPosProvinceChange === 'function') onPosProvinceChange();
  }

  if (document.getElementById('admin-returns-view') || document.getElementById('admin-returns-table-body')) {
    if (typeof initAdminReturns === 'function') initAdminReturns();
  }

  if (document.getElementById('admin-reports-view')) {
    if (typeof initAdminReports === 'function') initAdminReports();
  }

  // Real-time synchronization with server events
  if (typeof io !== 'undefined') {
    try {
      const socket = io();
      socket.on('new_order', () => {
        showToast('New order placed! Refreshing data...', 'info');
        if (typeof window.loadAdminProducts === 'function') window.loadAdminProducts();
        if (typeof window.loadOrders === 'function') window.loadOrders();
        if (document.getElementById('admin-dashboard-view') && typeof initAdminDashboard === 'function') initAdminDashboard();
      });

      socket.on('new_order_receipt', (data) => {
        if (data && data.reactivated) {
          showToast(`Order #${data.orderNumber} re-activated to Pending on new receipt!`, 'info');
        } else {
          showToast('New receipt uploaded! Refreshing...', 'info');
        }
        if (typeof window.loadOrders === 'function') window.loadOrders();
        if (typeof window.loadAdminProducts === 'function') window.loadAdminProducts();
        if (document.getElementById('admin-dashboard-view') && typeof initAdminDashboard === 'function') initAdminDashboard();
      });

      socket.on('order_status_updated', (data) => {
        if (typeof window.loadOrders === 'function') window.loadOrders();
        if (typeof window.loadAdminProducts === 'function') window.loadAdminProducts();
        if (document.getElementById('admin-dashboard-view') && typeof initAdminDashboard === 'function') initAdminDashboard();
      });

      socket.on('wa_status', (data) => {
        if (typeof fetchBotStatus === 'function') fetchBotStatus();
      });

      socket.on('wa_qr', (data) => {
        if (data && data.qr) {
          renderQrCode(data.qr);
          const badgeText = document.getElementById('wa-status-text');
          const badgeDot = document.getElementById('wa-status-dot');
          const quickBot = document.getElementById('quick-bot-status');
          if (badgeText) badgeText.textContent = 'Scan QR Code';
          if (badgeDot) badgeDot.style.background = '#FFB547';
          if (quickBot) { quickBot.textContent = 'Scan QR'; quickBot.style.color = '#FFB547'; }
        }
      });
    } catch (e) {
      console.log('Socket client initialization error:', e);
    }
  }
});

// ==========================================
// FARDAR EXPRESS LIVE COURIER TRACKING MODAL
// ==========================================
let currentCourierTrackingContext = null;

window.openCourierLiveModal = function(trackingNumber, orderNumber, encodedCustomerName) {
  if (!trackingNumber || trackingNumber.trim() === '') {
    showToast('No tracking number assigned to this order', 'warning');
    return;
  }

  const cleanTrk = trackingNumber.trim();
  const custName = decodeURIComponent(encodedCustomerName || 'Customer');
  currentCourierTrackingContext = { trackingNumber: cleanTrk, orderNumber, custName };

  const contentEl = document.getElementById('courier-modal-content');
  if (contentEl) {
    contentEl.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 0; color: var(--hz-gray-sub);">
        <div class="hz-spinner" style="width: 32px; height: 32px; border-width: 3px; margin: 0 auto 1rem;"></div>
        Fetching live logistics status for <strong style="color: #0284C7;">${cleanTrk}</strong> from Fardar Domestic...
      </div>
    `;
  }

  openModal('courier-live-modal');
  loadCourierLiveStatus(cleanTrk, orderNumber, custName);
};

window.refreshCurrentCourierStatus = function() {
  if (!currentCourierTrackingContext) return;
  const { trackingNumber, orderNumber, custName } = currentCourierTrackingContext;
  loadCourierLiveStatus(trackingNumber, orderNumber, custName);
};

async function loadCourierLiveStatus(trackingNumber, orderNumber, custName) {
  const contentEl = document.getElementById('courier-modal-content');
  const refreshBtn = document.getElementById('courier-refresh-btn');
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    const res = await fetch(`/api/courier-track/${encodeURIComponent(trackingNumber)}`);
    const data = await res.json();

    if (contentEl) {
      if (data && data.success) {
        const statusLower = (data.courierStatus || '').toLowerCase();
        const isDelivered = statusLower.includes('deliver');
        const isInTransit = statusLower.includes('transit') || statusLower.includes('dispatch') || statusLower.includes('way');
        const isRemoved = statusLower.includes('remove') || statusLower.includes('cancel');
        const statusBg = isDelivered ? '#E6FAF5' : isRemoved ? '#FEF2F2' : isInTransit ? '#EEF2FF' : '#FFFBEB';
        const statusColor = isDelivered ? '#01B574' : isRemoved ? '#EF4444' : isInTransit ? '#4318FF' : '#D97706';

        contentEl.innerHTML = `
          <!-- Order & Customer Header -->
          <div style="background: #F8FAFC; border: 1px solid var(--hz-border); border-radius: 12px; padding: 14px 18px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 0.72rem; color: var(--hz-gray-sub); font-weight: 700; text-transform: uppercase;">Order Reference</div>
              <div style="font-size: 1rem; font-weight: 800; color: var(--hz-navy);">#${orderNumber || '---'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: var(--hz-gray-sub); font-weight: 700; text-transform: uppercase;">Customer</div>
              <div style="font-size: 0.92rem; font-weight: 700; color: var(--hz-navy);">${custName}</div>
            </div>
          </div>

          <!-- Live Status Showcase Card -->
          <div style="background: #FFFFFF; border: 2px solid #E0F2FE; border-radius: 14px; padding: 1.2rem; margin-bottom: 0.5rem; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--hz-gray-sub); text-transform: uppercase; letter-spacing: 0.5px;">Live Courier Status</span>
              <span style="background: ${statusBg}; color: ${statusColor}; font-size: 0.85rem; font-weight: 800; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                ● ${data.courierStatus}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
              <div style="background: #F4F7FE; padding: 12px 14px; border-radius: 10px;">
                <div style="font-size: 0.72rem; color: var(--hz-gray-sub); font-weight: 700; text-transform: uppercase;">Tracking Barcode</div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #0284C7; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">
                  ${data.trackingNumber}
                </div>
              </div>
              <div style="background: #F4F7FE; padding: 12px 14px; border-radius: 10px;">
                <div style="font-size: 0.72rem; color: var(--hz-gray-sub); font-weight: 700; text-transform: uppercase;">Current Branch / Hub</div>
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--hz-navy); margin-top: 2px;">
                  📍 ${data.branch || 'Central Hub'}
                </div>
              </div>
            </div>

            ${data.lastUpdate ? `
            <div style="margin-top: 14px; font-size: 0.8rem; color: var(--hz-gray-sub); text-align: right; border-top: 1px dashed var(--hz-border); padding-top: 8px;">
              Last Updated: <strong style="color: var(--hz-navy);">${data.lastUpdate}</strong>
            </div>` : ''}
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 18px; margin-bottom: 0.5rem; text-align: center;">
            <div style="font-size: 1.8rem; margin-bottom: 8px;">📦</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #92400E;">Waybill: ${trackingNumber}</div>
            <div style="font-size: 0.82rem; color: #B45309; margin-top: 4px;">
              ${data && data.message ? data.message : 'Parcel details not found yet on Fardar Domestic.'}
            </div>
            <div style="font-size: 0.78rem; color: #78350F; margin-top: 8px;">
              Note: Tracking data becomes live once the package is scanned at the courier sorting hub.
            </div>
          </div>
        `;
      }
    }
  } catch (err) {
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 18px; text-align: center; color: #991B1B;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">⚠️</div>
          <div style="font-weight: 700;">Courier Connection Error</div>
          <div style="font-size: 0.8rem; margin-top: 4px;">Failed to reach Fardar Domestic tracking servers. Please try again.</div>
        </div>
      `;
    }
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}
