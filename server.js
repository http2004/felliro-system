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

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', returnRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', regionRoutes);
app.use('/api', whatsappRoutes);

// Page Routing Shortcuts
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tracking.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'products.html'));
});

app.get('/admin/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'orders.html'));
});

app.get('/admin/returns', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'returns.html'));
});

app.get('/admin/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'reports.html'));
});

app.get('/admin/chats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'chats.html'));
});

// Catch unhandled errors to prevent server crashes from internal dependencies
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('window.require is not a function')) {
    console.warn('Ignored harmless whatsapp-web.js internal polling error.');
  } else {
    console.error('Uncaught Exception:', err);
  }
});

// Start Server, then initialize WhatsApp Bot
server.listen(PORT, () => {
  console.log(`✨ FelliRo Clothing Management System running on http://localhost:${PORT}`);
  
  // Initialize WhatsApp Bot after server starts
  try {
    const botService = require('./whatsapp/baileysBotService');
    botService.initBot(io);
  } catch (err) {
    console.error('❌ WhatsApp Bot init error:', err.message);
  }
});
