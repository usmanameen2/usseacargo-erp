require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── File Upload Setup ───────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// ── Initialize Database ─────────────────────────────
require('./database/db').getDb();

// ── API Routes ──────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', authenticateToken, require('./routes/dashboard'));
app.use('/api/customers', authenticateToken, require('./routes/customers'));
app.use('/api/suppliers', authenticateToken, require('./routes/suppliers'));
app.use('/api/products', authenticateToken, require('./routes/products'));
app.use('/api/warehouses', authenticateToken, require('./routes/warehouses'));
app.use('/api/employees', authenticateToken, require('./routes/employees'));
app.use('/api/leave', authenticateToken, require('./routes/leave'));
app.use('/api/recruitment', authenticateToken, require('./routes/recruitment'));
app.use('/api/projects', authenticateToken, require('./routes/projects'));
app.use('/api/tasks', authenticateToken, require('./routes/tasks'));
app.use('/api/quotations', authenticateToken, require('./routes/quotations'));
app.use('/api/sales-orders', authenticateToken, require('./routes/sales-orders'));
app.use('/api/invoices', authenticateToken, require('./routes/invoices'));
app.use('/api/purchase-orders', authenticateToken, require('./routes/purchase-orders'));
app.use('/api/pipeline-deals', authenticateToken, require('./routes/pipeline'));
app.use('/api/shipping-docs', authenticateToken, require('./routes/shipping-docs'));
app.use('/api/shipments', authenticateToken, require('./routes/shipments'));
app.use('/api/charges', authenticateToken, require('./routes/charges'));
app.use('/api/settings', authenticateToken, require('./routes/settings'));
app.use('/api/reports', authenticateToken, require('./routes/reports'));

// ── File Upload Endpoint ────────────────────────────
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl, filename: req.file.filename, size: req.file.size } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'USSeaCargo API is running', data: { version: '3.0.0', currency: 'AED', timezone: 'Asia/Dubai' } });
});

// ── Static Frontend ─────────────────────────────────
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

// ── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start Server ────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  USSeaCargo Logistics ERP Server v3.0');
  console.log(`  Port: ${PORT}`);
  console.log('  Currency: AED (UAE Dirham)');
  console.log('  Timezone: Asia/Dubai');
  console.log('  Status: Running');
  console.log('========================================');
  console.log('');
});

module.exports = app;
