/**
 * USSeaCargo - Logistics ERP Server
 * Production-ready REST API with SQLite database
 * www.usseacargo.com
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const financialsRoutes = require('./routes/financials');
const salesCrmRoutes = require('./routes/sales-crm');
const purchasingRoutes = require('./routes/purchasing');
const hrRoutes = require('./routes/hr');
const projectsRoutes = require('./routes/projects');
const reportsRoutes = require('./routes/reports');
const logisticsRoutes = require('./routes/logistics');
const settingsRoutes = require('./routes/settings');

const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Middleware ──────────────────────────────────────

// Enable CORS for all origins in development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── SEO: Block All Search Engines (Private App) ─────
// Prevents Google, Bing, and all crawlers from indexing this application
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

// Request logging (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── API Routes ──────────────────────────────────────

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (JWT required)
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/financials', authMiddleware, financialsRoutes);
app.use('/api/sales-crm', authMiddleware, salesCrmRoutes);
app.use('/api/purchasing', authMiddleware, purchasingRoutes);
app.use('/api/hr', authMiddleware, hrRoutes);
app.use('/api/projects', authMiddleware, projectsRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/logistics', authMiddleware, logisticsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// ── Health Check ────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.json({
    success: true,
    message: 'USSeaCargo API is running.',
    data: {
      status: 'healthy',
      environment: NODE_ENV,
      domain: 'usseacargo.com',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// ── Static Files & SPA Fallback ─────────────────────

// Serve static frontend files from 'public' folder
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

// ── Error Handling ──────────────────────────────────

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    data: null
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'development' ? err.message : 'Internal server error.',
    data: null
  });
});

// ── Start Server ────────────────────────────────────

async function startServer() {
  try {
    await db.init();
    console.log('[Server] Database initialized.');
  } catch (err) {
    console.error('[Server] Failed to initialize database:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  USSeaCargo - Logistics ERP Server');
    console.log(`  Environment: ${NODE_ENV}`);
    console.log(`  Port: ${PORT}`);
    console.log('========================================');
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST /api/auth/register    - Register new user');
    console.log('  POST /api/auth/login       - Login');
    console.log('  GET  /api/auth/me          - Current user');
    console.log('  GET  /api/health           - Health check');
    console.log('  GET  /api/dashboard/*      - Dashboard KPIs & charts');
    console.log('  GET  /api/financials/*     - Accounts, journal, P&L, balance sheet');
    console.log('  GET  /api/sales-crm/*      - Customers, quotes, orders, invoices, pipeline');
    console.log('  GET  /api/purchasing/*     - Suppliers, POs, warehouses, products');
    console.log('  GET  /api/hr/*             - Employees, attendance, leave, payroll');
    console.log('  GET  /api/projects/*       - Projects, tasks, timesheets, milestones');
    console.log('  GET  /api/reports/*        - Financial, sales, inventory reports');
    console.log('  GET  /api/logistics/*      - Shipping docs, shipments, charges');
    console.log('  GET  /api/settings/*       - Company, users, tax, currency');
    console.log('');
  });
}

startServer();

module.exports = { app, startServer };
