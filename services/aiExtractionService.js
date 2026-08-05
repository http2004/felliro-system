const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDummy';
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

/**
 * Extract order details from WhatsApp chat text or message list using Gemini AI
 * @param {Array<Object>|string} chatMessages - Array of chat messages or raw text transcript
 * @param {string} customerPhone - WhatsApp phone number
 * @returns {Promise<Object>}
 */
async function extractOrderFromChat(chatMessages, customerPhone = '') {
  try {
    // 1. Fetch available products with variants from database
    const [products] = await db.query(`
      SELECT p.id, p.name, p.price, p.size, p.color, p.quantity, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.quantity > 0
    `);

    const [variants] = await db.query(`
      SELECT pv.id, pv.product_id, pv.size, pv.color, pv.quantity
      FROM product_variants pv
      WHERE pv.quantity > 0
    `);

    // Format catalog for AI context
    const catalogList = products.map(p => {
      const pVariants = variants.filter(v => v.product_id === p.id);
      const varDesc = pVariants.length > 0
        ? pVariants.map(v => `Size: ${v.size}, Color: ${v.color}, Stock: ${v.quantity}`).join(' | ')
        : `Stock: ${p.quantity}`;
      return `ID: ${p.id} | Name: "${p.name}" | Price: LKR ${p.price} | Variants: [${varDesc}]`;
    }).join('\n');

    // Format conversation transcript
    let conversationText = '';
    if (Array.isArray(chatMessages)) {
      conversationText = chatMessages.map(m => {
        const sender = (m.sent_by === 'customer' || m.direction === 'incoming') ? 'Customer' : 'Agent';
        return `${sender}: ${m.message || ''}`;
      }).join('\n');
    } else if (typeof chatMessages === 'string') {
      conversationText = chatMessages;
    }

    const cleanPhone = (customerPhone || '').replace('@lid', '').replace('@s.whatsapp.net', '').replace('@c.us', '').trim();

    const prompt = `
You are an expert AI order extraction assistant for "FelliRo" fashion boutique in Sri Lanka.
Analyze the following conversation between a Customer and a Human Sales Agent.

CUSTOMER CONTACT: ${cleanPhone}

ACTIVE INVENTORY CATALOG (Products currently in stock):
${catalogList}

CONVERSATION TRANSCRIPT:
"""
${conversationText}
"""

TASK:
Extract the order information accurately into JSON format.

RULES:
1. Customer Name: Extract the customer's full name. If not found, use empty string "".
2. Customer Phone: If the customer stated a phone number in the chat, use that; otherwise use "${cleanPhone}". Format as a standard 10-digit number (e.g. "0771234567").
3. Customer Address: Extract the full street delivery address.
4. City: Extract the delivery city (e.g. "Kalutara", "Colombo", "Kandy", "Galle", "Kurunegala", "Anuradhapura", etc.).
5. Province: Match to one of: ["Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa"].
6. Items: Identify all products the customer decided to buy. Match each item to the closest product from the INVENTORY CATALOG above.
   - product_id: Integer ID from the catalog
   - name: Exact product name from the catalog
   - size: Requested size (e.g. "S", "M", "L", "XL", "Free Size") or best matching variant size
   - color: Requested color (e.g. "Blue", "Black", "Pink") or best matching variant color
   - quantity: Integer quantity (default 1)
   - price: Unit price number from catalog
7. Delivery Fee: Default 450 (LKR).
8. Payment Method: ALWAYS "bank_transfer" (FelliRo operates exclusively on Bank Transfer, NO Cash on Delivery).

Return ONLY valid JSON matching this exact structure (no markdown fences, no explanatory text):
{
  "customer_name": "...",
  "customer_phone": "...",
  "customer_address": "...",
  "city": "...",
  "province": "...",
  "delivery_fee": 450,
  "payment_method": "bank_transfer",
  "delivery_notes": "...",
  "items": [
    {
      "product_id": 1,
      "name": "...",
      "size": "M",
      "color": "Blue",
      "quantity": 1,
      "price": 3500
    }
  ]
}
`;

    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);
    parsed.payment_method = 'bank_transfer'; // Ensure strict adherence
    return { success: true, orderData: parsed };
  } catch (err) {
    console.error('AI Order Extraction Error:', err);
    return { success: false, message: 'AI failed to extract order: ' + err.message };
  }
}

module.exports = {
  extractOrderFromChat
};
