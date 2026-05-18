/**
 * USSeaCargo ERP - Self-Contained Server
 * Everything inline - no external local module dependencies
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// SQLite via CLI
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'ussaeacargo-erp-secret-key-2024';
const JWT_EXPIRES_IN = '7d';
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'erp.db');

// ═══════════════════════════════════════════════════════════════
// JWT UTILITIES (inline)
// ═══════════════════════════════════════════════════════════════
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ═══════════════════════════════════════════════════════════════
// SOCKET UTILITIES (inline)
// ═══════════════════════════════════════════════════════════════
let ioInstance = null;
const socketUtils = {
  init: (socketIo) => { ioInstance = socketIo; },
  getIO: () => ioInstance,
  broadcastToUser: (userId, event, data) => {
    if (ioInstance) ioInstance.to(`user_${userId}`).emit(event, data);
  },
  broadcastAll: (event, data) => {
    if (ioInstance) ioInstance.emit(event, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// DATABASE via sqlite3 CLI (works on shared hosting without native modules)
// ═══════════════════════════════════════════════════════════════
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Escape single quotes for SQL
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Execute SQL using sqlite3 CLI
async function dbRun(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}; SELECT last_insert_rowid() as id, changes() as changes;" -json`;
  const { stdout } = await execAsync(cmd);
  const result = JSON.parse(stdout || '[{}]')[0];
  return { id: result?.id, changes: result?.changes };
}

async function dbGet(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd);
    const rows = JSON.parse(stdout || '[]');
    return Array.isArray(rows) ? rows[0] : rows;
  } catch { return null; }
}

async function dbAll(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout || '[]');
  } catch { return []; }
}

async function dbExec(sql) {
  const cmd = `sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\"')}"`;
  await execAsync(cmd);
}

// // ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE (inline)
// ═══════════════════════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    req.user = verifyToken(authHeader.slice(7));
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ═══════════════════════════════════════════════════════════════
// DATABASE SCHEMA SETUP
// ═══════════════════════════════════════════════════════════════
async function initDatabase() {
  console.log('[DB] Initializing database schema...');

  // Users table
  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    role TEXT DEFAULT 'user',
    avatar_initials TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    subscription_plan TEXT DEFAULT 'trial',
    subscription_expires TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers table
  await dbRun(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    region TEXT,
    type TEXT DEFAULT 'client',
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Invoices table
  await dbRun(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    amount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    currency TEXT DEFAULT 'AED',
    status TEXT DEFAULT 'draft',
    issue_date TEXT,
    due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Suppliers table
  await dbRun(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Products table
  await dbRun(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    description TEXT,
    category TEXT,
    unit_price REAL DEFAULT 0,
    currency TEXT DEFAULT 'AED',
    quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees table
  await dbRun(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_no TEXT,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    position TEXT,
    salary REAL DEFAULT 0,
    currency TEXT DEFAULT 'AED',
    hire_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Projects table
  await dbRun(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_no TEXT,
    name TEXT NOT NULL,
    description TEXT,
    customer_id INTEGER,
    customer_name TEXT,
    status TEXT DEFAULT 'active',
    start_date TEXT,
    end_date TEXT,
    budget REAL DEFAULT 0,
    currency TEXT DEFAULT 'AED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Sea Import Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS sea_import_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    mbl_no TEXT,
    hbl_no TEXT,
    vessel_name TEXT,
    voyage_no TEXT,
    pol TEXT,
    pod TEXT,
    shipper TEXT,
    consignee TEXT,
    notify_party TEXT,
    agent TEXT,
    container_type TEXT,
    shipment_type TEXT DEFAULT 'General',
    eta TEXT,
    etd TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Sea Export Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS sea_export_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    mbl_no TEXT,
    hbl_no TEXT,
    vessel_name TEXT,
    voyage_no TEXT,
    pol TEXT,
    pod TEXT,
    shipper TEXT,
    consignee TEXT,
    notify_party TEXT,
    agent TEXT,
    container_type TEXT,
    shipment_type TEXT DEFAULT 'General',
    eta TEXT,
    etd TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Air Import Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS air_import_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    awb_no TEXT,
    hawb_no TEXT,
    flight_no TEXT,
    pol TEXT,
    pod TEXT,
    shipper TEXT,
    consignee TEXT,
    notify_party TEXT,
    agent TEXT,
    cargo_type TEXT,
    shipment_type TEXT DEFAULT 'General',
    eta TEXT,
    etd TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Air Export Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS air_export_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    awb_no TEXT,
    hawb_no TEXT,
    flight_no TEXT,
    pol TEXT,
    pod TEXT,
    shipper TEXT,
    consignee TEXT,
    notify_party TEXT,
    agent TEXT,
    cargo_type TEXT,
    shipment_type TEXT DEFAULT 'General',
    eta TEXT,
    etd TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Transshipment Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS transshipment_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    bl_no TEXT,
    vessel_name TEXT,
    pol TEXT,
    pod TEXT,
    fpod TEXT,
    shipper TEXT,
    consignee TEXT,
    agent TEXT,
    container_type TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Liner Schedules
  await dbRun(`CREATE TABLE IF NOT EXISTS liner_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vessel_name TEXT,
    voyage_no TEXT,
    pol TEXT,
    pod TEXT,
    eta TEXT,
    etd TEXT,
    carrier TEXT,
    frequency TEXT,
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // C&F Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS cf_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    be_no TEXT,
    bl_no TEXT,
    vessel_name TEXT,
    pol TEXT,
    pod TEXT,
    shipper TEXT,
    consignee TEXT,
    agent TEXT,
    container_type TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Other Jobs
  await dbRun(`CREATE TABLE IF NOT EXISTS other_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    job_type TEXT,
    description TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shipping Docs
  await dbRun(`CREATE TABLE IF NOT EXISTS shipping_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_type TEXT NOT NULL,
    doc_no TEXT,
    job_id INTEGER,
    job_type TEXT,
    file_path TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed admin user if none exists
  const adminExists = await dbGet("SELECT id FROM users WHERE username = 'admin'");
  if (!adminExists) {
    const adminHash = await bcrypt.hash('admin123', 10);
    await dbRun(
      `INSERT INTO users (username, password_hash, email, full_name, company_name, role, avatar_initials, subscription_plan)
       VALUES ('admin', ?, 'admin@usseacargo.com', 'System Admin', 'USSeaCargo', 'admin', 'SA', 'yearly')`,
      [adminHash]
    );
    console.log('[DB] Admin user created: admin / admin123');
  }

  // Seed demo customers
  const customerCount = await dbGet("SELECT COUNT(*) as count FROM customers");
  if (customerCount && customerCount.count === 0) {
    const demoCustomers = [
      ['ABC Trading LLC', 'ABC Trading LLC', 'abc@example.com', '+971-4-1234567', 'Dubai', 'UAE', 'Middle East', 'active'],
      ['Global Shipping Co', 'Global Shipping Co', 'global@example.com', '+971-4-7654321', 'Dubai', 'UAE', 'Middle East', 'active'],
      ['Fast Forward Cargo', 'Fast Forward Cargo', 'fast@example.com', '+971-4-9876543', 'Sharjah', 'UAE', 'Middle East', 'active'],
    ];
    for (const c of demoCustomers) {
      await dbRun(
        `INSERT INTO customers (name, company, email, phone, city, country, region, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, c
      );
    }
    console.log('[DB] Demo customers seeded');
  }

  console.log('[DB] Database initialization complete');
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS APP SETUP
// ═══════════════════════════════════════════════════════════════
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);
socketUtils.init(io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
io.on('connection', (socket) => {
  console.log(`[Socket] ${socket.username} connected`);
  socket.join(`user_${socket.userId}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] ${socket.username} disconnected`);
  });
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES (inline)
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name, phone } = req.body;
    if (!username || !password || !email || !full_name || !company_name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const existing = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const avatar_initials = full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun(
      `INSERT INTO users (username, password_hash, email, full_name, company_name, role, avatar_initials, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [username, password_hash, email, full_name, company_name, 'user', avatar_initials, phone || '']
    );
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.id]);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, company_name: user.company_name, role: user.role } });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Check if account is active
    if (user.is_active === 0) {
      return res.status(403).json({ success: false, message: 'Account is blocked' });
    }
    // Check subscription expiry
    if (user.subscription_expires && new Date(user.subscription_expires) < new Date()) {
      return res.status(403).json({ success: false, message: 'Subscription expired' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken({ userId: user.id, username: user.username });
    res.json({
      success: true, token,
      user: {
        id: user.id, username: user.username, email: user.email,
        full_name: user.full_name, company_name: user.company_name,
        role: user.role, avatar_initials: user.avatar_initials
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const customers = await dbGet("SELECT COUNT(*) as count FROM customers");
    const invoices = await dbGet("SELECT COUNT(*) as count FROM invoices");
    const employees = await dbGet("SELECT COUNT(*) as count FROM employees");
    const projects = await dbGet("SELECT COUNT(*) as count FROM projects");
    const seaImports = await dbGet("SELECT COUNT(*) as count FROM sea_import_jobs");
    const seaExports = await dbGet("SELECT COUNT(*) as count FROM sea_export_jobs");
    const airImports = await dbGet("SELECT COUNT(*) as count FROM air_import_jobs");
    const airExports = await dbGet("SELECT COUNT(*) as count FROM air_export_jobs");

    res.json({
      success: true,
      data: {
        kpi: {
          customers: customers?.count || 0,
          invoices: invoices?.count || 0,
          employees: employees?.count || 0,
          projects: projects?.count || 0,
          seaImports: seaImports?.count || 0,
          seaExports: seaExports?.count || 0,
          airImports: airImports?.count || 0,
          airExports: airExports?.count || 0,
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GENERIC CRUD HELPER
// ═══════════════════════════════════════════════════════════════
function createCrudRoutes(tableName, fields) {
  // List all
  app.get(`/api/${tableName}`, authMiddleware, async (req, res) => {
    try {
      const rows = await dbAll(`SELECT * FROM ${tableName} ORDER BY id DESC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Get one
  app.get(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Create
  app.post(`/api/${tableName}`, authMiddleware, async (req, res) => {
    try {
      const body = req.body;
      // Convert camelCase keys to snake_case for DB
      const convertKey = (k) => k.replace(/([A-Z])/g, '_$1').toLowerCase();
      const entries = Object.entries(body).filter(([_, v]) => v !== undefined);
      const cols = entries.map(([k]) => {
        const sk = convertKey(k);
        return fields.includes(sk) ? sk : k;
      }).filter((v, i, a) => a.indexOf(v) === i); // dedupe

      const placeholders = cols.map(() => '?').join(',');
      const values = entries.map(([_, v]) => v);

      const result = await dbRun(
        `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`,
        values
      );
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [result.id]);
      res.json({ success: true, data: row });
    } catch (err) {
      // Retry without problematic columns
      if (err.message && err.message.includes('no column named')) {
        const match = err.message.match(/no column named (\w+)/);
        const badCol = match ? match[1] : null;
        if (badCol) {
          const body = req.body;
          const convertKey = (k) => k.replace(/([A-Z])/g, '_$1').toLowerCase();
          const entries = Object.entries(body).filter(([k, v]) => {
            const sk = convertKey(k);
            return v !== undefined && sk !== badCol && k !== badCol;
          });
          const cols = entries.map(([k]) => convertKey(k));
          const placeholders = cols.map(() => '?').join(',');
          const values = entries.map(([_, v]) => v);
          try {
            const result = await dbRun(
              `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`,
              values
            );
            const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [result.id]);
            return res.json({ success: true, data: row });
          } catch (err2) {
            return res.status(500).json({ success: false, message: err2.message });
          }
        }
      }
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Update
  app.put(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const body = req.body;
      const convertKey = (k) => k.replace(/([A-Z])/g, '_$1').toLowerCase();
      const entries = Object.entries(body).filter(([_, v]) => v !== undefined && k !== 'id');
      const sets = entries.map(([k]) => `${convertKey(k)} = ?`).join(',');
      const values = [...entries.map(([_, v]) => v), req.params.id];

      await dbRun(`UPDATE ${tableName} SET ${sets} WHERE id = ?`, values);
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Delete
  app.delete(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      await dbRun(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// REGISTER CRUD ROUTES
// ═══════════════════════════════════════════════════════════════
createCrudRoutes('customers', ['id','name','company','email','phone','address','city','country','region','type','status','notes','created_at']);
createCrudRoutes('invoices', ['id','invoice_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','due_date','notes','created_at']);
createCrudRoutes('suppliers', ['id','name','company','email','phone','address','city','country','category','status','created_at']);
createCrudRoutes('products', ['id','name','sku','description','category','unit_price','currency','quantity','status','created_at']);
createCrudRoutes('employees', ['id','employee_no','full_name','email','phone','department','position','salary','currency','hire_date','status','created_at']);
createCrudRoutes('projects', ['id','project_no','name','description','customer_id','customer_name','status','start_date','end_date','budget','currency','created_at']);
createCrudRoutes('shipping_docs', ['id','doc_type','doc_no','job_id','job_type','file_path','notes','created_at']);

// Logistics routes (mapped to tables)
app.get('/api/logistics/sea-import', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/sea-import', authMiddleware, async (req, res) => {
  try {
    const { jobNo, mblNo, hblNo, vesselName, voyageNo, pol, pod, shipper, consignee, notifyParty, agent, containerType, shipmentType, eta, etd, status } = req.body;
    const result = await dbRun(`INSERT INTO sea_import_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, mblNo, hblNo, vesselName, voyageNo, pol, pod, shipper, consignee, notifyParty, agent, containerType, shipmentType || 'General', eta, etd, status || 'Pending']);
    const row = await dbGet('SELECT * FROM sea_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/sea-export', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/sea-export', authMiddleware, async (req, res) => {
  try {
    const { jobNo, mblNo, hblNo, vesselName, voyageNo, pol, pod, shipper, consignee, notifyParty, agent, containerType, shipmentType, eta, etd, status } = req.body;
    const result = await dbRun(`INSERT INTO sea_export_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, mblNo, hblNo, vesselName, voyageNo, pol, pod, shipper, consignee, notifyParty, agent, containerType, shipmentType || 'General', eta, etd, status || 'Pending']);
    const row = await dbGet('SELECT * FROM sea_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/air-import', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/air-import', authMiddleware, async (req, res) => {
  try {
    const { jobNo, awbNo, hawbNo, flightNo, pol, pod, shipper, consignee, notifyParty, agent, cargoType, shipmentType, eta, etd, status } = req.body;
    const result = await dbRun(`INSERT INTO air_import_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, awbNo, hawbNo, flightNo, pol, pod, shipper, consignee, notifyParty, agent, cargoType, shipmentType || 'General', eta, etd, status || 'Pending']);
    const row = await dbGet('SELECT * FROM air_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/air-export', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/air-export', authMiddleware, async (req, res) => {
  try {
    const { jobNo, awbNo, hawbNo, flightNo, pol, pod, shipper, consignee, notifyParty, agent, cargoType, shipmentType, eta, etd, status } = req.body;
    const result = await dbRun(`INSERT INTO air_export_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, awbNo, hawbNo, flightNo, pol, pod, shipper, consignee, notifyParty, agent, cargoType, shipmentType || 'General', eta, etd, status || 'Pending']);
    const row = await dbGet('SELECT * FROM air_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/transshipment', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM transshipment_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/transshipment', authMiddleware, async (req, res) => {
  try {
    const { jobNo, blNo, vesselName, pol, pod, fpod, shipper, consignee, agent, containerType, status } = req.body;
    const result = await dbRun(`INSERT INTO transshipment_jobs (job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, blNo, vesselName, pol, pod, fpod, shipper, consignee, agent, containerType, status || 'Pending']);
    const row = await dbGet('SELECT * FROM transshipment_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/liner', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM liner_schedules ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/liner', authMiddleware, async (req, res) => {
  try {
    const { vesselName, voyageNo, pol, pod, eta, etd, carrier, frequency, status } = req.body;
    const result = await dbRun(`INSERT INTO liner_schedules (vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vesselName, voyageNo, pol, pod, eta, etd, carrier, frequency, status || 'Active']);
    const row = await dbGet('SELECT * FROM liner_schedules WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/cf', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM cf_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/cf', authMiddleware, async (req, res) => {
  try {
    const { jobNo, beNo, blNo, vesselName, pol, pod, shipper, consignee, agent, containerType, status } = req.body;
    const result = await dbRun(`INSERT INTO cf_jobs (job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [jobNo, beNo, blNo, vesselName, pol, pod, shipper, consignee, agent, containerType, status || 'Pending']);
    const row = await dbGet('SELECT * FROM cf_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/logistics/other', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM other_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/logistics/other', authMiddleware, async (req, res) => {
  try {
    const { jobNo, jobType, description, customerName, status } = req.body;
    const result = await dbRun(`INSERT INTO other_jobs (job_no, job_type, description, customer_name, status) VALUES (?,?,?,?,?)`,
      [jobNo, jobType, description, customerName, status || 'Pending']);
    const row = await dbGet('SELECT * FROM other_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // Verify admin
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const users = await dbAll('SELECT id, username, email, full_name, company_name, role, phone, is_active, subscription_plan, subscription_expires, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/users/:id/block', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/users/:id/unblock', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    await dbRun('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });

    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const activeUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const blockedUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_active = 0');

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        activeUsers: activeUsers.count,
        blockedUsers: blockedUsers.count
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// STATIC FILES & SPA FALLBACK
// ═══════════════════════════════════════════════════════════════
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
initDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('  USSeaCargo ERP Server running on port ' + PORT);
    console.log('  Database: ' + DB_PATH);
    console.log('  Static: ' + distPath);
    console.log('');
  });
}).catch(err => {
  console.error('[FATAL] Failed to initialize database:', err);
  process.exit(1);
});
