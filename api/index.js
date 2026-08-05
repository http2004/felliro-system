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

// Database diagnostics endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.query('SELECT 1 + 1 AS solution, DATABASE() as db_name, USER() as db_user');
    const [users] = await db.query('SELECT id, name, email, role FROM users');
    res.json({
      success: true,
      message: 'Database connected successfully!',
      db_info: rows[0],
      users: users,
      env: {
        DB_HOST: process.env.DB_HOST ? process.env.DB_HOST : 'MISSING',
        DB_PORT: process.env.DB_PORT || 'MISSING (default 3306)',
        DB_USER: process.env.DB_USER || 'MISSING',
        DB_NAME: process.env.DB_NAME || 'MISSING',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'MISSING'
      }
    });
  } catch (err) {
    res.status(200).json({
      success: false,
      error_message: err.message,
      error_code: err.code,
      env: {
        DB_HOST: process.env.DB_HOST ? process.env.DB_HOST : 'MISSING',
        DB_PORT: process.env.DB_PORT || 'MISSING',
        DB_USER: process.env.DB_USER || 'MISSING',
        DB_NAME: process.env.DB_NAME || 'MISSING',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'MISSING'
      }
    });
  }
});

// Global error handler for API routes
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
