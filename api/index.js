// api/index.js - Vercel Serverless Express API Entrypoint
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('../routes/authRoutes');
const productRoutes = require('../routes/productRoutes');
const orderRoutes = require('../routes/orderRoutes');
const returnRoutes = require('../routes/returnRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const regionRoutes = require('../routes/regionRoutes');
const whatsappRoutes = require('../routes/whatsappRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', returnRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', regionRoutes);
app.use('/api', whatsappRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = app;
