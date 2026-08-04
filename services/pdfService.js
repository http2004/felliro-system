const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Generate Invoice PDF using lightweight, high-performance PDFKit
 * @param {Object} order - Order record
 * @param {Array} items - Order items list
 * @returns {Promise<string>} File path to generated PDF
 */
exports.generateInvoice = async (order, items = []) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../public/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filePath = path.join(invoicesDir, `Invoice_${order.order_number}.pdf`);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- Colors & Styling ---
      const primaryColor = '#EC4899'; // FelliRo Pink
      const textColor = '#0F172A';
      const mutedColor = '#64748B';
      const lightBg = '#F8FAFC';

      // --- Header Brand & Info ---
      doc.rect(40, 40, 515, 60).fill(lightBg);
      
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('FelliRo', 55, 55);

      doc.fillColor(mutedColor)
         .fontSize(9)
         .font('Helvetica')
         .text('Premium Sri Lankan Fashion Boutique', 55, 82);

      doc.fillColor(textColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('INVOICE', 420, 52, { align: 'right', width: 120 });

      doc.fillColor(mutedColor)
         .fontSize(9)
         .font('Helvetica')
         .text(`Order: #${order.order_number}`, 360, 72, { align: 'right', width: 180 })
         .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 360, 85, { align: 'right', width: 180 });

      // --- Customer Information Box ---
      let startY = 120;
      doc.rect(40, startY, 515, 75).fill('#F1F5F9');

      doc.fillColor(textColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('CUSTOMER / BILL TO:', 55, startY + 12);

      doc.fillColor(textColor)
         .fontSize(9)
         .font('Helvetica')
         .text(`Name: ${order.customer_name || 'Valued Customer'}`, 55, startY + 28)
         .text(`Phone: ${order.customer_phone || '-'}`, 55, startY + 42)
         .text(`Address: ${order.customer_address || 'Store Pickup'}, ${order.city || ''} (${order.province || ''})`, 55, startY + 56);

      doc.text(`Payment: ${(order.payment_method || 'Bank Transfer').toUpperCase()}`, 360, startY + 28, { align: 'right', width: 180 })
         .text(`Status: ${(order.payment_status || 'Paid').toUpperCase()}`, 360, startY + 42, { align: 'right', width: 180 });

      // --- Table Header ---
      startY = 215;
      doc.rect(40, startY, 515, 24).fill(primaryColor);

      doc.fillColor('#FFFFFF')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('ITEM DESCRIPTION', 50, startY + 7)
         .text('QTY', 310, startY + 7, { width: 40, align: 'center' })
         .text('UNIT PRICE', 360, startY + 7, { width: 85, align: 'right' })
         .text('TOTAL', 455, startY + 7, { width: 90, align: 'right' });

      // --- Table Rows ---
      startY += 24;
      let currentY = startY;

      items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, currentY, 515, 26).fill(rowBg);

        const sizeStr = (item.size && item.size !== '-') ? ` | Size: ${item.size}` : '';
        const colorStr = (item.color && item.color !== '-') ? ` | Color: ${item.color}` : '';
        const itemTitle = `${item.product_name || 'Fashion Item'}${sizeStr}${colorStr}`;
        const unitPrice = parseFloat(item.price || 0);
        const itemQty = parseInt(item.quantity || 1);
        const itemTotal = parseFloat(item.total || (unitPrice * itemQty));

        doc.fillColor(textColor)
           .fontSize(8.5)
           .font('Helvetica')
           .text(itemTitle, 50, currentY + 8, { width: 250, ellipsis: true })
           .text(itemQty.toString(), 310, currentY + 8, { width: 40, align: 'center' })
           .text(`Rs. ${unitPrice.toFixed(2)}`, 360, currentY + 8, { width: 85, align: 'right' })
           .text(`Rs. ${itemTotal.toFixed(2)}`, 455, currentY + 8, { width: 90, align: 'right' });

        currentY += 26;
      });

      // --- Bottom Border ---
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();

      // --- Summary Section ---
      currentY += 15;
      const totalAmount = parseFloat(order.total_amount || 0);
      const deliveryFee = parseFloat(order.delivery_fee || 0);
      const subtotal = Math.max(0, totalAmount - deliveryFee);

      doc.fillColor(mutedColor)
         .fontSize(9)
         .font('Helvetica')
         .text('Items Subtotal:', 340, currentY, { width: 105, align: 'right' });
      doc.fillColor(textColor)
         .text(`Rs. ${subtotal.toFixed(2)}`, 455, currentY, { width: 90, align: 'right' });

      currentY += 16;
      doc.fillColor(mutedColor)
         .text('Delivery (Fardar Express):', 300, currentY, { width: 145, align: 'right' });
      doc.fillColor(textColor)
         .text(`Rs. ${deliveryFee.toFixed(2)}`, 455, currentY, { width: 90, align: 'right' });

      currentY += 20;
      doc.rect(340, currentY - 5, 215, 28).fill('#FDF2F8');
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Grand Total:', 350, currentY + 3, { width: 95, align: 'left' })
         .text(`Rs. ${totalAmount.toFixed(2)}`, 450, currentY + 3, { width: 95, align: 'right' });

      // --- Footer ---
      doc.fillColor(mutedColor)
         .fontSize(8.5)
         .font('Helvetica')
         .text('Thank you for choosing FelliRo! For a better version of you.', 40, 760, { align: 'center', width: 515 })
         .text('Hotline: +94 71 771 6005 | Website: https://felliro.lk', 40, 775, { align: 'center', width: 515 });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      console.error('PDF Generation Error:', err);
      reject(err);
    }
  });
};
