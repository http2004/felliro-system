/**
 * Conversation State Manager for WhatsApp Bot
 * Tracks each customer's conversation step in memory
 */

// State machine stages
const STATES = {
  IDLE: 'idle',
  GREETING: 'greeting',
  SELECTING_CATEGORY: 'selecting_category',
  BROWSING_CATEGORY: 'browsing_category',
  CONFIGURING_ITEM: 'configuring_item',
  ASKING_MORE_OR_BILL: 'asking_more_or_bill',
  COLLECTING_DETAILS: 'collecting_details',
  CONFIRMING_ORDER: 'confirming_order',
  AWAITING_PAYMENT: 'awaiting_payment',
  AWAITING_RECEIPT: 'awaiting_receipt',
  RECEIPT_SUBMITTED: 'receipt_submitted',
  HUMAN_HANDOFF: 'human_handoff',
  DONE: 'done'
};

// In-memory store: phone -> state object
const conversations = new Map();

function getConversation(phone) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      phone,
      state: STATES.IDLE,
      cart: [],            // [{product_id, name, price, size, color, quantity, total}]
      customerData: {
        name: null,
        phone: null,
        address: null,
        province: null,
        city: null,
        deliveryFee: 0
      },
      orderId: null,
      orderNumber: null,
      lastActivity: Date.now(),
      currentCategory: null,
      pendingProduct: null,
      messageHistory: []   // [{role, content}] for Gemini context
    });
  }
  return conversations.get(phone);
}

function setState(phone, state) {
  const conv = getConversation(phone);
  conv.state = state;
  conv.lastActivity = Date.now();
}

function resetConversation(phone) {
  conversations.set(phone, {
    phone,
    state: STATES.IDLE,
    cart: [],
    customerData: { name: null, phone: null, address: null, province: null, city: null, deliveryFee: 0 },
    orderId: null,
    orderNumber: null,
    lastActivity: Date.now(),
    currentCategory: null,
    pendingProduct: null,
    messageHistory: []
  });
}

function addToCart(phone, item) {
  const conv = getConversation(phone);
  const qty = parseInt(item.quantity) || 1;
  const itemSize = (item.size || '-').trim();
  const itemColor = (item.color || '-').trim();

  const existing = conv.cart.find(c =>
    c.product_id === item.product_id &&
    (c.size || '-').toLowerCase() === itemSize.toLowerCase() &&
    (c.color || '-').toLowerCase() === itemColor.toLowerCase()
  );
  if (existing) {
    existing.quantity = qty;
    existing.total = existing.price * existing.quantity;
    existing.size = itemSize;
    existing.color = itemColor;
  } else {
    conv.cart.push({
      ...item,
      size: itemSize,
      color: itemColor,
      quantity: qty,
      total: (parseFloat(item.price) || 0) * qty
    });
  }
}

function clearCart(phone) {
  const conv = getConversation(phone);
  conv.cart = [];
}

function setCustomerData(phone, data = {}) {
  const conv = getConversation(phone);
  if (data.name) conv.customerData.name = data.name.trim();
  if (data.phone) conv.customerData.phone = data.phone.trim();
  if (data.address) conv.customerData.address = data.address.trim();
  if (data.city) conv.customerData.city = data.city.trim();
  if (data.province) conv.customerData.province = data.province.trim();
  if (data.deliveryFee !== undefined) conv.customerData.deliveryFee = parseFloat(data.deliveryFee) || 0;
}

function getCartTotal(phone) {
  const conv = getConversation(phone);
  return conv.cart.reduce((sum, item) => sum + item.total, 0);
}

function isHumanHandoff(phone) {
  const conv = getConversation(phone);
  return conv.state === STATES.HUMAN_HANDOFF;
}

function assignToHuman(phone) {
  setState(phone, STATES.HUMAN_HANDOFF);
}

function assignToBot(phone) {
  setState(phone, STATES.DONE);
}

function addMessageToHistory(phone, role, content) {
  const conv = getConversation(phone);
  if (!content) return;
  
  const lastMsg = conv.messageHistory[conv.messageHistory.length - 1];
  if (lastMsg && lastMsg.role === role && lastMsg.content === content) {
    return;
  }

  conv.messageHistory.push({ role, content: content.trim(), timestamp: Date.now() });
  if (conv.messageHistory.length > 16) {
    conv.messageHistory = conv.messageHistory.slice(-16);
  }
}

function getAllConversations() {
  return Array.from(conversations.values());
}

function cleanupOldConversations() {
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [phone, conv] of conversations.entries()) {
    if (now - conv.lastActivity > TWO_DAYS && conv.state === STATES.IDLE) {
      conversations.delete(phone);
    }
  }
}

// Cleanup every 6 hours
setInterval(cleanupOldConversations, 6 * 60 * 60 * 1000);

function addMessage(phone, role, content) {
  addMessageToHistory(phone, role, content);
}

function setHumanHandoff(phone, enabled) {
  if (enabled) assignToHuman(phone);
  else assignToBot(phone);
}

module.exports = {
  STATES,
  getConversation,
  setState,
  resetConversation,
  addToCart,
  clearCart,
  setCustomerData,
  getCartTotal,
  isHumanHandoff,
  assignToHuman,
  assignToBot,
  setHumanHandoff,
  addMessage,
  addMessageToHistory,
  getAllConversations
};
