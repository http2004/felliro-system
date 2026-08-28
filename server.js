const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const returnRoutes = require('./routes/returnRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const regionRoutes = require('./routes/regionRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('🔌 Admin panel connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('🔌 Admin panel disconnected');
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPath = path.resolve(__dirname, 'public');

// Serve static frontend files with caching for assets
app.use(express.static(publicPath, {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    if (path.includes('/uploads/') || path.includes('/images/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', returnRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', regionRoutes);
app.use('/api', whatsappRoutes);

// Page Routing Shortcuts
const sendPage = (res, ...filePathSegments) => {
  res.sendFile(path.join(publicPath, ...filePathSegments));
};

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.get('/products', (req, res) => sendPage(res, 'products.html'));
app.get('/tracking', (req, res) => sendPage(res, 'tracking.html'));

app.get('/admin', (req, res) => sendPage(res, 'admin', 'login.html'));
app.get('/admin/login', (req, res) => sendPage(res, 'admin', 'login.html'));
app.get('/admin/dashboard', (req, res) => sendPage(res, 'admin', 'dashboard.html'));
app.get('/admin/products', (req, res) => sendPage(res, 'admin', 'products.html'));
app.get('/admin/orders', (req, res) => sendPage(res, 'admin', 'orders.html'));
app.get('/admin/returns', (req, res) => sendPage(res, 'admin', 'returns.html'));
app.get('/admin/reports', (req, res) => sendPage(res, 'admin', 'reports.html'));
app.get('/admin/chats', (req, res) => sendPage(res, 'admin', 'chats.html'));

// Catch unhandled errors to prevent server crashes from internal dependencies
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('window.require is not a function')) {
    console.warn('Ignored harmless whatsapp-web.js internal polling error.');
  } else {
    console.error('Uncaught Exception:', err);
  }
});

// Start Server locally, or export app for Vercel Serverless
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`✨ FelliRo Clothing Management System running on http://localhost:${PORT}`);
    
    // Initialize WhatsApp Bot after server starts
    try {
      const botService = require('./whatsapp/baileysBotService');
      botService.initBot(io);
    } catch (err) {
      console.error('❌ WhatsApp Bot init error:', err.message);
    }

    // Start background cron jobs (Courier sync, etc.)
    try {
      const cronService = require('./services/cronService');
      cronService.startCronJobs();
    } catch (err) {
      console.error('❌ Cron Service init error:', err.message);
    }
  });
}

module.exports = app;
