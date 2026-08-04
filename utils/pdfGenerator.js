const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF bill and saves it to a temporary file.
 * @param {Object} orderData - Information about the order.
 * @param {string} customerPhone - The customer's WhatsApp phone number.
 * @returns {Promise<string>} The path to the generated PDF.
 */
const generateBillPDF = (orderData, customerPhone) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      const fileName = `bill_${Date.now()}_${customerPhone}.pdf`;
      const tempDir = path.join(__dirname, '..', 'public', 'temp');
      
      // Ensure temp dir exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filePath = path.join(tempDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);
      
      // Header
      doc.fontSize(20).text('FelliRo Clothing', { align: 'center' });
      doc.fontSize(12).text('Payment Receipt / Bill', { align: 'center' });
      doc.moveDown();
      
      // Bill Info
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Customer WhatsApp: ${customerPhone}`);
      doc.text(`Order ID: ${orderData.orderId || 'N/A'}`);
      doc.moveDown();
      
      // Items (Mock logic, can be expanded to array mapping)
      doc.fontSize(14).text('Order Details', { underline: true });
      doc.fontSize(12).text(`Item: ${orderData.item || 'Custom Order'}`);
      doc.text(`Total Paid: Rs. ${orderData.amount || '0.00'}`);
      doc.moveDown();
      
      doc.text('Payment Status: PAID', { stroke: true });
      doc.moveDown(2);
      
      // Footer
      doc.fontSize(10).text('Thank you for shopping with FelliRo Clothing!', { align: 'center' });
      
      doc.end();
      
      writeStream.on('finish', () => {
        resolve(filePath);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateBillPDF
};
