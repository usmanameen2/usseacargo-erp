require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'usseacargo-secret-key-2026';

// ── Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── File Upload ─────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadDir));

// ── Database (Embedded Schema) ──────────────────────
const DB_PATH = path.join(__dirname, 'database', 'erp.db');
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  email TEXT, full_name TEXT, role TEXT DEFAULT 'staff', company_name TEXT, phone TEXT,
  avatar_initials TEXT, is_active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, company TEXT, email TEXT, phone TEXT,
  address TEXT, city TEXT, country TEXT, status TEXT DEFAULT 'active', notes TEXT, total_spent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, contact_person TEXT, email TEXT,
  phone TEXT, address TEXT, category TEXT, rating INTEGER, status TEXT DEFAULT 'active', total_orders INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, sku TEXT, name TEXT, category TEXT,
  warehouse_id INTEGER, quantity INTEGER, reorder_level INTEGER, unit_cost REAL, unit_price REAL,
  description TEXT, status TEXT DEFAULT 'in_stock', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, location TEXT, manager TEXT,
  capacity_sqm INTEGER, contact_phone TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, employee_id TEXT, first_name TEXT, last_name TEXT,
  email TEXT, phone TEXT, department TEXT, position TEXT, manager_id INTEGER, join_date TEXT,
  salary REAL, status TEXT DEFAULT 'active', avatar_initials TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, employee_id INTEGER, employee_name TEXT,
  leave_type TEXT, from_date TEXT, to_date TEXT, days INTEGER, reason TEXT, status TEXT DEFAULT 'pending',
  approved_by TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, candidate_name TEXT, email TEXT, phone TEXT,
  position TEXT, stage TEXT DEFAULT 'applied', applied_date TEXT, experience_years INTEGER, notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, project_name TEXT, client TEXT, description TEXT,
  manager_id INTEGER, budget REAL, spent REAL, progress_percent INTEGER, status TEXT DEFAULT 'active',
  start_date TEXT, end_date TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, project_id INTEGER, task_name TEXT, description TEXT,
  assignee_id INTEGER, stage TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium', due_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, quote_number TEXT, customer_id INTEGER,
  customer_name TEXT, date TEXT, valid_until TEXT, items_json TEXT, subtotal REAL, tax REAL, total REAL,
  status TEXT DEFAULT 'draft', notes TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, order_number TEXT, customer_id INTEGER,
  customer_name TEXT, date TEXT, items_json TEXT, subtotal REAL, tax REAL, total REAL,
  status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, invoice_number TEXT, customer_id INTEGER,
  customer_name TEXT, date TEXT, due_date TEXT, items_json TEXT, subtotal REAL, tax REAL, total REAL,
  amount_paid REAL, status TEXT DEFAULT 'draft', notes TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, po_number TEXT, supplier_id INTEGER,
  supplier_name TEXT, date TEXT, expected_delivery TEXT, items_json TEXT, subtotal REAL, tax REAL, total REAL,
  status TEXT DEFAULT 'draft', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, deal_name TEXT, customer_id INTEGER,
  customer_name TEXT, stage TEXT DEFAULT 'lead', value REAL, expected_close_date TEXT, probability INTEGER,
  notes TEXT, assigned_to TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shipping_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, doc_type TEXT, doc_number TEXT, reference TEXT,
  date TEXT, vessel_voyage TEXT, shipper TEXT, consignee TEXT, port_of_loading TEXT, port_of_discharge TEXT,
  container_number TEXT, status TEXT DEFAULT 'draft', file_url TEXT, notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, booking_number TEXT, rotation_number TEXT,
  vessel_name TEXT, carrier_scac TEXT, shipper TEXT, consignee TEXT, mode TEXT, container_type TEXT,
  container_count INTEGER, origin TEXT, destination TEXT, etd TEXT, eta TEXT, status TEXT, incoterm TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, charge_code TEXT, charge_name TEXT, description TEXT,
  calculation_method TEXT, rate REAL, applicable_to TEXT, currency TEXT DEFAULT 'AED',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, company_name TEXT, logo_url TEXT, address TEXT,
  phone TEXT, email TEXT, website TEXT, tax_id TEXT, registration_number TEXT, fiscal_year_start TEXT,
  base_currency TEXT DEFAULT 'AED', decimal_places INTEGER, timezone TEXT, vat_rate REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT, entity_type TEXT, entity_id INTEGER,
  description TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`;

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const needsSchema = !fs.existsSync(DB_PATH);
    dbInstance = new sqlite3.Database(DB_PATH);
    dbInstance.run('PRAGMA journal_mode = WAL');
    if (needsSchema) {
      console.log('[DB] Creating database schema...');
      dbInstance.exec(SCHEMA);
      console.log('[DB] Schema created.');
    }
  }
  return dbInstance;
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ── AUTH Routes ─────────────────────────────────────
const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

    // Check if users exist - auto-create admin if empty
    const userCount = await dbGet('SELECT COUNT(*) as c FROM users');
    if (!userCount || userCount.c === 0) {
      console.log('[Auth] Auto-creating admin user...');
      const hash = bcrypt.hashSync('admin123', 10);
      const result = await dbRun(
        'INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['admin', hash, 'admin@usseacargo.com', 'System Administrator', 'admin', 'USSeaCargo Inc.', '+971-4-123-4567', 'AD', 1]
      );
      await dbRun(
        'INSERT INTO company_settings (user_id, company_name, address, phone, email, website, tax_id, registration_number, base_currency, timezone, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [result.lastID, 'USSeaCargo Inc.', 'Jebel Ali Free Zone, Dubai, UAE', '+971-4-123-4567', 'info@usseacargo.com', 'https://usseacargo.com', 'TRN-1234567890123', 'JAFZA-REG-2024-001', 'AED', 'Asia/Dubai', 5]
      );
      // Seed demo customers
      const customers = [
        ['Dubai Trade Centre', 'Dubai Trade', 'info@dubaitrade.ae', '+971-4-222-3333', 'Dubai, UAE', 'Dubai', 'AE', 'active', 125000],
        ['JAFZA Logistics', 'JAFZA', 'logistics@jafza.ae', '+971-4-888-7777', 'Jebel Ali, Dubai', 'Dubai', 'AE', 'active', 89000],
        ['DP World Operations', 'DP World', 'ops@dpworld.com', '+971-4-555-6666', 'Jebel Ali Port, Dubai', 'Dubai', 'AE', 'active', 234000],
        ['Emirates Shipping', 'Emirates Ship', 'contact@emirates-shipping.ae', '+971-4-444-5555', 'Port Rashid, Dubai', 'Dubai', 'AE', 'active', 67800],
        ['Sharjah Freight Solutions', 'SFS', 'info@sfscargo.ae', '+971-6-555-4444', 'Sharjah, UAE', 'Sharjah', 'AE', 'active', 34500],
      ];
      for (const c of customers) {
        await dbRun('INSERT INTO customers (user_id, name, company, email, phone, address, city, country, status, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [1, ...c]);
      }
      // Seed demo shipping docs
      const docs = [
        ['MBL', 'MAEU-DXB-2026-001', 'HLCU-DXB-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'COSCO Shanghai', 'USSeaCargo Inc.', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', 'Master B/L for FCL shipment'],
        ['HBL', 'HBL-USS-2026-001', 'MAEU-DXB-2026-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', 'House B/L for Dubai Trade'],
        ['DO', 'DO-JAFZA-2026-001', 'REF-001', '2026-01-20', 'N/A', 'JAFZA Logistics', 'JAFZA Logistics', 'N/A', 'Jebel Ali', 'MSCU-1234567', 'submitted', 'Delivery order issued'],
        ['NOC', 'NOC-CUSTOMS-001', 'APP-001', '2026-01-10', 'N/A', 'Dubai Customs', 'USSeaCargo Inc.', 'N/A', 'N/A', null, 'approved', 'No objection for customs clearance'],
        ['PL', 'PL-DTC-2026-001', 'SO-001', '2026-01-12', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'submitted', 'Electronics and machinery parts'],
      ];
      for (const d of docs) {
        await dbRun('INSERT INTO shipping_docs (user_id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, container_number, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [1, ...d]);
      }
      console.log('[Auth] Admin + demo data created!');
    }

    // Login
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username or password' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid username or password' });

    await dbRun("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, company_name: user.company_name, avatar_initials: user.avatar_initials } } });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name } = req.body;
    if (!username || !password || !email || !full_name) return res.status(400).json({ success: false, message: 'All fields required' });
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ success: false, message: 'Username already exists' });
    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun('INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', [username, hash, email, full_name, 'admin', company_name || 'USSeaCargo', initials]);
    const token = jwt.sign({ userId: result.lastID, username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, user: { id: result.lastID, username, email, full_name, role: 'admin', company_name, avatar_initials: initials } } });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

authRouter.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid token' });
  }
});

authRouter.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Auth required' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Invalid passwords' });
    const user = await dbGet('SELECT password_hash FROM users WHERE id = ?', [decoded.userId]);
    if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) return res.status(400).json({ success: false, message: 'Old password incorrect' });
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), decoded.userId]);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AUTH Middleware ─────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, username: decoded.username, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
}

// ── Generic CRUD Route Generator ────────────────────
function createCrudRoutes(table, columns, searchFields = []) {
  const router = express.Router();
  const searchCond = searchFields.length ? ' AND (' + searchFields.map(f => f + ' LIKE ?').join(' OR ') + ')' : '';
  const searchParams = searchFields.length ? searchFields.map(() => '%' + (searchFields._search || '') + '%') : [];

  router.get('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const search = req.query.search;

      if (search && searchFields.length) {
        const pattern = '%' + search + '%';
        const params = [userId, ...searchFields.map(() => pattern), limit, offset];
        const count = await dbGet(`SELECT COUNT(*) as c FROM ${table} WHERE user_id = ?${searchCond}`, params.slice(0, -2));
        const rows = await dbAll(`SELECT ${columns} FROM ${table} WHERE user_id = ?${searchCond} ORDER BY id DESC LIMIT ? OFFSET ?`, params);
        return res.json({ success: true, data: rows, total: count.c });
      }

      const count = await dbGet(`SELECT COUNT(*) as c FROM ${table} WHERE user_id = ?`, [userId]);
      const rows = await dbAll(`SELECT ${columns} FROM ${table} WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
      res.json({ success: true, data: rows, total: count.c });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const row = await dbGet(`SELECT ${columns} FROM ${table} WHERE user_id = ? AND id = ?`, [req.user.id, req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await dbRun(`DELETE FROM ${table} WHERE user_id = ? AND id = ?`, [req.user.id, req.params.id]);
      res.json({ success: true, message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const body = req.body;
      // Build dynamic INSERT from body keys
      const keys = Object.keys(body).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
      if (keys.length === 0) return res.status(400).json({ success: false, message: 'No data provided' });
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => body[k]);
      const result = await dbRun(
        `INSERT INTO ${table} (user_id, ${cols}) VALUES (?, ${placeholders})`,
        [userId, ...values]
      );
      res.status(201).json({ success: true, data: { id: result.lastID, ...body }, message: 'Created' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const userId = req.user.id;
      const body = req.body;
      const keys = Object.keys(body).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
      if (keys.length === 0) return res.status(400).json({ success: false, message: 'No data provided' });
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => body[k]);
      await dbRun(
        `UPDATE ${table} SET ${setClause} WHERE user_id = ? AND id = ?`,
        [...values, userId, req.params.id]
      );
      res.json({ success: true, message: 'Updated' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

// ── Mount All Routes ────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/customers', authenticateToken, createCrudRoutes('customers', 'id, name, company, email, phone, address, city, country, status, notes, total_spent, created_at', ['name', 'company', 'email']));
app.use('/api/suppliers', authenticateToken, createCrudRoutes('suppliers', 'id, name, contact_person, email, phone, address, category, rating, status, total_orders, created_at', ['name', 'contact_person', 'email']));
app.use('/api/products', authenticateToken, createCrudRoutes('products', 'id, sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, status, description, created_at', ['sku', 'name']));
app.use('/api/warehouses', authenticateToken, createCrudRoutes('warehouses', 'id, name, location, manager, capacity_sqm, contact_phone, created_at', ['name', 'location']));
app.use('/api/employees', authenticateToken, createCrudRoutes('employees', 'id, employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials, created_at', ['first_name', 'last_name', 'email']));
app.use('/api/leave', authenticateToken, createCrudRoutes('leave_requests', 'id, employee_id, employee_name, leave_type, from_date, to_date, days, reason, status, approved_by, created_at', ['employee_name', 'reason']));
app.use('/api/recruitment', authenticateToken, createCrudRoutes('recruitment_candidates', 'id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes, created_at', ['candidate_name', 'position', 'email']));
app.use('/api/projects', authenticateToken, createCrudRoutes('projects', 'id, project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date, created_at', ['project_name', 'client']));
app.use('/api/tasks', authenticateToken, createCrudRoutes('tasks', 'id, project_id, task_name, description, assignee_id, stage, priority, due_date, created_at', ['task_name']));
app.use('/api/quotations', authenticateToken, createCrudRoutes('quotations', 'id, quote_number, customer_id, customer_name, date, valid_until, items_json, subtotal, tax, total, status, notes, created_at', ['quote_number', 'customer_name']));
app.use('/api/sales-orders', authenticateToken, createCrudRoutes('sales_orders', 'id, order_number, customer_id, customer_name, date, items_json, subtotal, tax, total, status, created_at', ['order_number', 'customer_name']));
app.use('/api/invoices', authenticateToken, createCrudRoutes('invoices', 'id, invoice_number, customer_id, customer_name, date, due_date, items_json, subtotal, tax, total, amount_paid, status, notes, created_at', ['invoice_number', 'customer_name']));
app.use('/api/purchase-orders', authenticateToken, createCrudRoutes('purchase_orders', 'id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status, created_at', ['po_number', 'supplier_name']));
app.use('/api/pipeline-deals', authenticateToken, createCrudRoutes('pipeline_deals', 'id, deal_name, customer_id, customer_name, stage, value, expected_close_date, probability, notes, assigned_to, created_at', ['deal_name', 'customer_name']));
app.use('/api/shipping-docs', authenticateToken, createCrudRoutes('shipping_docs', 'id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, container_number, status, file_url, notes, created_at', ['doc_number', 'shipper', 'consignee']));
app.use('/api/shipments', authenticateToken, createCrudRoutes('shipments', 'id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm, created_at', ['booking_number', 'vessel_name']));
app.use('/api/charges', authenticateToken, createCrudRoutes('charges', 'id, charge_code, charge_name, description, calculation_method, rate, applicable_to, currency, created_at', ['charge_code', 'charge_name']));

// ── Route Aliases (frontend compatibility) ──────────
// Sales CRM aliases
app.use('/api/sales-crm/customers', authenticateToken, createCrudRoutes('customers', 'id, name, company, email, phone, address, city, country, status, notes, total_spent, created_at', ['name', 'company', 'email']));
app.use('/api/sales-crm/invoices', authenticateToken, createCrudRoutes('invoices', 'id, invoice_number, customer_id, customer_name, date, due_date, items_json, subtotal, tax, total, amount_paid, status, notes, created_at', ['invoice_number', 'customer_name']));
// Purchasing aliases
app.use('/api/purchasing/suppliers', authenticateToken, createCrudRoutes('suppliers', 'id, name, contact_person, email, phone, address, category, rating, status, total_orders, created_at', ['name', 'contact_person', 'email']));
app.use('/api/purchasing/purchase-orders', authenticateToken, createCrudRoutes('purchase_orders', 'id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status, created_at', ['po_number', 'supplier_name']));
// HR aliases
app.use('/api/hr/employees', authenticateToken, createCrudRoutes('employees', 'id, employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials, created_at', ['first_name', 'last_name', 'email']));
app.use('/api/hr/leave-requests', authenticateToken, createCrudRoutes('leave_requests', 'id, employee_id, employee_name, leave_type, from_date, to_date, days, reason, status, approved_by, created_at', ['employee_name', 'reason']));
app.use('/api/hr/recruitment', authenticateToken, createCrudRoutes('recruitment_candidates', 'id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes, created_at', ['candidate_name', 'position', 'email']));
// Projects aliases
app.use('/api/projects/list', authenticateToken, createCrudRoutes('projects', 'id, project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date, created_at', ['project_name', 'client']));
app.use('/api/projects/tasks', authenticateToken, createCrudRoutes('tasks', 'id, project_id, task_name, description, assignee_id, stage, priority, due_date, created_at', ['task_name']));
// Logistics aliases
app.use('/api/logistics/shipping-docs', authenticateToken, createCrudRoutes('shipping_docs', 'id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, container_number, status, file_url, notes, created_at', ['doc_number', 'shipper', 'consignee']));
app.use('/api/logistics/shipments', authenticateToken, createCrudRoutes('shipments', 'id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm, created_at', ['booking_number', 'vessel_name']));
// Settings aliases
app.use('/api/settings/users-list', authenticateToken, createCrudRoutes('users', 'id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at', ['username', 'email', 'full_name']));

// ── Settings Routes ─────────────────────────────────
const settingsRouter = express.Router();
settingsRouter.use(authenticateToken);

settingsRouter.get('/company', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM company_settings WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, data: row || {} });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

settingsRouter.put('/company', async (req, res) => {
  try {
    const { company_name, address, phone, email, website, tax_id, registration_number, base_currency, vat_rate } = req.body;
    const existing = await dbGet('SELECT id FROM company_settings WHERE user_id = ?', [req.user.id]);
    if (existing) {
      await dbRun('UPDATE company_settings SET company_name = ?, address = ?, phone = ?, email = ?, website = ?, tax_id = ?, registration_number = ?, base_currency = ?, vat_rate = ? WHERE user_id = ?',
        [company_name, address, phone, email, website, tax_id, registration_number, base_currency || 'AED', vat_rate || 5, req.user.id]);
    } else {
      await dbRun('INSERT INTO company_settings (user_id, company_name, address, phone, email, website, tax_id, registration_number, base_currency, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, company_name, address, phone, email, website, tax_id, registration_number, base_currency || 'AED', vat_rate || 5]);
    }
    res.json({ success: true, message: 'Company settings updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

settingsRouter.get('/users', async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

settingsRouter.post('/users', async (req, res) => {
  try {
    const { username, password, email, full_name, role, company_name } = req.body;
    if (!username || !password || !email || !full_name) return res.status(400).json({ success: false, message: 'All fields required' });
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ success: false, message: 'Username already taken' });
    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun('INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [username, hash, email, full_name, role || 'staff', company_name, initials]);
    res.json({ success: true, data: { id: result.lastID, username, email, full_name, role: role || 'staff', avatar_initials: initials } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.use('/api/settings', settingsRouter);

// ── Dashboard ───────────────────────────────────────
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [customers, suppliers, invoices, revenue, outstanding, shipments, docs, employees, leave, lowStock, pipeline] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM customers WHERE user_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as c FROM suppliers WHERE user_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as c FROM invoices WHERE user_id = ?', [userId]),
      dbGet('SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE user_id = ? AND status = ?', [userId, 'paid']),
      dbGet('SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices WHERE user_id = ? AND status IN (?, ?)', [userId, 'sent', 'overdue']),
      dbGet('SELECT COUNT(*) as c FROM shipments WHERE user_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as c FROM shipping_docs WHERE user_id = ?', [userId]),
      dbGet('SELECT COUNT(*) as c FROM employees WHERE user_id = ? AND status = ?', [userId, 'active']),
      dbGet('SELECT COUNT(*) as c FROM leave_requests WHERE user_id = ? AND status = ?', [userId, 'pending']),
      dbGet('SELECT COUNT(*) as c FROM products WHERE user_id = ? AND status = ?', [userId, 'low_stock']),
      dbGet('SELECT COALESCE(SUM(value), 0) as total FROM pipeline_deals WHERE user_id = ? AND stage NOT IN (?, ?)', [userId, 'closed_won', 'closed_lost']),
    ]);
    res.json({ success: true, data: { customers: customers.c, suppliers: suppliers.c, invoices: invoices.c, totalRevenue: revenue.total, outstanding: outstanding.total, shipments: shipments.c, shippingDocs: docs.c, employees: employees.c, pendingLeave: leave.c, lowStock: lowStock.c, pipelineValue: pipeline.total } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Reports ─────────────────────────────────────────
app.get('/api/reports/financial', authenticateToken, async (req, res) => {
  try {
    const revenue = await dbAll("SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total), 0) as amount FROM invoices WHERE user_id = ? AND status = ? GROUP BY month ORDER BY month DESC LIMIT 12", [req.user.id, 'paid']);
    res.json({ success: true, data: { revenueByMonth: revenue } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/reports/sales', authenticateToken, async (req, res) => {
  try {
    const topCustomers = await dbAll('SELECT customer_name, COALESCE(SUM(total), 0) as total FROM invoices WHERE user_id = ? GROUP BY customer_name ORDER BY total DESC LIMIT 10', [req.user.id]);
    res.json({ success: true, data: { topCustomers } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── File Upload ─────────────────────────────────────
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, data: { url: '/uploads/' + req.file.filename, filename: req.file.filename } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { version: '3.0.0', currency: 'AED', timezone: 'Asia/Dubai', status: 'running' } });
});

// ── Static Frontend ─────────────────────────────────
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// ── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  USSeaCargo ERP Server v3.0');
  console.log('  Port: ' + PORT);
  console.log('  Currency: AED (UAE Dirham)');
  console.log('  JWT: ' + JWT_SECRET.substring(0, 10) + '...');
  console.log('========================================');
});
