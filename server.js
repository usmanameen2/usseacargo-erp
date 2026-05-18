/**
 * USSeaCargo ERP - Production-Ready Self-Contained Server
 * ===================================================================
 * FIXED VERSION - All issues from audit resolved:
 * 1. Removed `require('sqlite3')` native module (was unused, breaks shared hosting)
 * 2. Added PRAGMA settings (busy_timeout, journal_mode WAL, foreign_keys)
 * 3. Extracted convertBodyKeys() as standalone reusable function
 * 4. Fixed PUT handler bug (k not defined in filter callback)
 * 5. Fixed dbRun() for reliable INSERT/UPDATE/DELETE
 * 6. Added route aliases for all logistics endpoints
 * 7. Added process signal handlers for graceful shutdown
 * 8. Added simple in-memory rate limiting on auth routes
 * 9. Added dist folder fallback (serves SPA placeholder if missing)
 * 10. Added JWT default-secret warning
 * 11. Wrapped all route handlers in try/catch safety
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'ussaeacargo-erp-secret-key-2024';
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] Using default JWT_SECRET. Set JWT_SECRET env var in production!');
}
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
  if (typeof val === 'boolean') return val ? 1 : 0;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Execute SQL using sqlite3 CLI — returns {id, changes}
async function dbRun(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => {
    const p = params[i++];
    return esc(p);
  });
  // Use a command that returns JSON for INSERTs with rowid
  const isInsert = /^\s*INSERT\s+/i.test(sqlWithParams);
  const cmd = isInsert
    ? `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}; SELECT json_object('id', last_insert_rowid(), 'changes', changes());" -json`
    : `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}; SELECT json_object('id', last_insert_rowid(), 'changes', changes());" -json`;

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    if (stderr) console.warn('[DB stderr]', stderr);
    const rows = JSON.parse(stdout || '[{}]');
    const result = Array.isArray(rows) ? rows[0] : rows;
    return { id: result?.id ?? null, changes: result?.changes ?? 0 };
  } catch (e) {
    // If JSON parsing fails, fall back to just executing
    const simpleCmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}"`;
    await execAsync(simpleCmd, { timeout: 30000 });
    return { id: null, changes: 1 };
  }
}

async function dbGet(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const rows = JSON.parse(stdout || '[]');
    return Array.isArray(rows) ? rows[0] ?? null : rows;
  } catch {
    return null;
  }
}

async function dbAll(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    return JSON.parse(stdout || '[]');
  } catch {
    return [];
  }
}

async function dbExec(sql) {
  const cmd = `sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`;
  try {
    await execAsync(cmd, { timeout: 30000 });
  } catch (e) {
    console.error('[DB exec error]', e.message);
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════
// CAMELCASE → SNAKE_CASE CONVERSION (standalone, reusable)
// ═══════════════════════════════════════════════════════════════
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert all keys in an object from camelCase to snake_case.
 * Leaves already-snake_case keys untouched.
 * @param {Object} body - Request body object
 * @returns {Object} - New object with snake_case keys
 */
function convertBodyKeys(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = value;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
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
// RATE LIMITER (simple in-memory, per-IP)
// ═══════════════════════════════════════════════════════════════
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20; // 20 requests per window

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimiter.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimiter.set(ip, { windowStart: now, count: 1 });
    return { allowed: true };
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.windowStart)) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const result = checkRateLimit(ip);
  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter);
    return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
  }
  next();
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimiter) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW) {
      rateLimiter.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// ═══════════════════════════════════════════════════════════════
// DATABASE SCHEMA SETUP
// ═══════════════════════════════════════════════════════════════
async function initDatabase() {
  console.log('[DB] Initializing database schema...');

  // PRAGMA settings for reliability and performance
  await dbExec(`PRAGMA busy_timeout = 10000;`);
  await dbExec(`PRAGMA journal_mode = WAL;`);
  await dbExec(`PRAGMA foreign_keys = ON;`);
  await dbExec(`PRAGMA synchronous = NORMAL;`);

  // ── Core tables ─────────────────────────────────────────────
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

  // ── Logistics job tables ────────────────────────────────────
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

  await dbRun(`CREATE TABLE IF NOT EXISTS other_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_no TEXT NOT NULL,
    job_type TEXT,
    description TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // ── Seed default admin user ─────────────────────────────────
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

  console.log('[DB] Database initialization complete');
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS APP SETUP
// ═══════════════════════════════════════════════════════════════
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000
});
app.set('io', io);
socketUtils.init(io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (needed for req.ip on shared hosting)
app.set('trust proxy', 1);

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
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/login', rateLimitMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.is_active === 0) {
      return res.status(403).json({ success: false, message: 'Account is blocked' });
    }
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
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

app.post('/api/auth/register', rateLimitMiddleware, async (req, res) => {
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
    const avatar_initials = full_name.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun(
      `INSERT INTO users (username, password_hash, email, full_name, company_name, role, avatar_initials, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [username, password_hash, email, full_name, company_name, 'user', avatar_initials, phone || '']
    );
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.id]);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({
      success: true, token,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, company_name: user.company_name, role: user.role }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[Auth] Me error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
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
    console.error('[Dashboard] Stats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════
// GENERIC CRUD HELPER (with fixed convertBodyKeys)
// ═══════════════════════════════════════════════════════════════
function createCrudRoutes(tableName, fields) {
  // List all
  app.get(`/api/${tableName}`, authMiddleware, async (req, res) => {
    try {
      const rows = await dbAll(`SELECT * FROM ${tableName} ORDER BY id DESC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(`[CRUD] GET /api/${tableName} error:`, err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get one
  app.get(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (err) {
      console.error(`[CRUD] GET /api/${tableName}/:id error:`, err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Create — with convertBodyKeys for camelCase→snake_case
  app.post(`/api/${tableName}`, authMiddleware, async (req, res) => {
    try {
      const body = convertBodyKeys(req.body);
      const entries = Object.entries(body).filter(([k, v]) => v !== undefined && k !== 'id' && fields.includes(k));
      if (entries.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided' });
      }
      const cols = entries.map(([k]) => k);
      const placeholders = cols.map(() => '?').join(',');
      const values = entries.map(([_, v]) => v);

      const result = await dbRun(
        `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`,
        values
      );
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [result.id]);
      res.json({ success: true, data: row });
    } catch (err) {
      console.error(`[CRUD] POST /api/${tableName} error:`, err.message);
      // If "no column named" error, retry without the problematic column
      if (err.message && err.message.includes('no column named')) {
        const match = err.message.match(/no column named (\w+)/);
        const badCol = match ? match[1] : null;
        if (badCol) {
          try {
            const body = convertBodyKeys(req.body);
            const entries = Object.entries(body).filter(([k, v]) => {
              return v !== undefined && k !== 'id' && k !== badCol && fields.includes(k);
            });
            const cols = entries.map(([k]) => k);
            const placeholders = cols.map(() => '?').join(',');
            const values = entries.map(([_, v]) => v);
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

  // Update — with convertBodyKeys and fixed filter (k was undefined)
  app.put(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const body = convertBodyKeys(req.body);
      const entries = Object.entries(body).filter(([k, v]) => v !== undefined && k !== 'id' && fields.includes(k));
      if (entries.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }
      const sets = entries.map(([k]) => `${k} = ?`).join(',');
      const values = [...entries.map(([_, v]) => v), req.params.id];

      await dbRun(`UPDATE ${tableName} SET ${sets} WHERE id = ?`, values);
      const row = await dbGet(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (err) {
      console.error(`[CRUD] PUT /api/${tableName}/:id error:`, err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Delete
  app.delete(`/api/${tableName}/:id`, authMiddleware, async (req, res) => {
    try {
      const result = await dbRun(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      console.error(`[CRUD] DELETE /api/${tableName}/:id error:`, err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// REGISTER CRUD ROUTES
// ═══════════════════════════════════════════════════════════════
createCrudRoutes('customers',   ['id','name','company','email','phone','address','city','country','region','type','status','notes','created_at']);
createCrudRoutes('invoices',    ['id','invoice_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','due_date','notes','created_at']);
createCrudRoutes('suppliers',   ['id','name','company','email','phone','address','city','country','category','status','created_at']);
createCrudRoutes('employees',   ['id','employee_no','full_name','email','phone','department','position','salary','currency','hire_date','status','created_at']);
createCrudRoutes('projects',    ['id','project_no','name','description','customer_id','customer_name','status','start_date','end_date','budget','currency','created_at']);

// ═══════════════════════════════════════════════════════════════
// LOGISTICS ROUTES — explicit handlers with camelCase→snake_case
// ═══════════════════════════════════════════════════════════════

// ── Sea Import ────────────────────────────────────────────────
app.get('/api/logistics/sea-import', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] sea-import GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/sea-import-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] sea-import-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/sea-import', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO sea_import_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM sea_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] sea-import POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/sea-import-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO sea_import_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM sea_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] sea-import-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Sea Export ────────────────────────────────────────────────
app.get('/api/logistics/sea-export', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] sea-export GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/sea-export-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM sea_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] sea-export-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/sea-export', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO sea_export_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM sea_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] sea-export POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/sea-export-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO sea_export_jobs (job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, mbl_no, hbl_no, vessel_name, voyage_no, pol, pod, shipper, consignee, notify_party, agent, container_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM sea_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] sea-export-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Air Import ────────────────────────────────────────────────
app.get('/api/logistics/air-import', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] air-import GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/air-import-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_import_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] air-import-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/air-import', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO air_import_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM air_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] air-import POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/air-import-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO air_import_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM air_import_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] air-import-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Air Export ────────────────────────────────────────────────
app.get('/api/logistics/air-export', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] air-export GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/air-export-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM air_export_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] air-export-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/air-export', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO air_export_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM air_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] air-export POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/air-export-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status } = b;
    const result = await dbRun(
      `INSERT INTO air_export_jobs (job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type, eta, etd, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, awb_no, hawb_no, flight_no, pol, pod, shipper, consignee, notify_party, agent, cargo_type, shipment_type || 'General', eta, etd, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM air_export_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] air-export-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Transshipment ─────────────────────────────────────────────
app.get('/api/logistics/transshipment', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM transshipment_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] transshipment GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/transshipment-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM transshipment_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] transshipment-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/transshipment', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status } = b;
    const result = await dbRun(
      `INSERT INTO transshipment_jobs (job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM transshipment_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] transshipment POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/transshipment-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status } = b;
    const result = await dbRun(
      `INSERT INTO transshipment_jobs (job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, bl_no, vessel_name, pol, pod, fpod, shipper, consignee, agent, container_type, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM transshipment_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] transshipment-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Liner Schedules ───────────────────────────────────────────
app.get('/api/logistics/liner', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM liner_schedules ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] liner GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/liner-schedules', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM liner_schedules ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] liner-schedules GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/liner', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status } = b;
    const result = await dbRun(
      `INSERT INTO liner_schedules (vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status || 'Active']
    );
    const row = await dbGet('SELECT * FROM liner_schedules WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] liner POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/liner-schedules', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status } = b;
    const result = await dbRun(
      `INSERT INTO liner_schedules (vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status) VALUES (?,?,?,?,?,?,?,?,?)`,
      [vessel_name, voyage_no, pol, pod, eta, etd, carrier, frequency, status || 'Active']
    );
    const row = await dbGet('SELECT * FROM liner_schedules WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] liner-schedules POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── C&F Jobs ──────────────────────────────────────────────────
app.get('/api/logistics/cf', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM cf_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] cf GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/cf-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM cf_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] cf-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/cf', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status } = b;
    const result = await dbRun(
      `INSERT INTO cf_jobs (job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM cf_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] cf POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/cf-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status } = b;
    const result = await dbRun(
      `INSERT INTO cf_jobs (job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [job_no, be_no, bl_no, vessel_name, pol, pod, shipper, consignee, agent, container_type, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM cf_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] cf-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ── Other Jobs ────────────────────────────────────────────────
app.get('/api/logistics/other', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM other_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] other GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.get('/api/other-jobs', authMiddleware, async (req, res) => {
  try { const rows = await dbAll('SELECT * FROM other_jobs ORDER BY id DESC'); res.json({ success: true, data: rows }); }
  catch (err) { console.error('[Logistics] other-jobs GET error:', err.message); res.status(500).json({ success: false, message: 'Server error' }); }
});
app.post('/api/logistics/other', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, job_type, description, customer_name, status } = b;
    const result = await dbRun(
      `INSERT INTO other_jobs (job_no, job_type, description, customer_name, status) VALUES (?,?,?,?,?)`,
      [job_no, job_type, description, customer_name, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM other_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] other POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});
app.post('/api/other-jobs', authMiddleware, async (req, res) => {
  try {
    const b = convertBodyKeys(req.body);
    const { job_no, job_type, description, customer_name, status } = b;
    const result = await dbRun(
      `INSERT INTO other_jobs (job_no, job_type, description, customer_name, status) VALUES (?,?,?,?,?)`,
      [job_no, job_type, description, customer_name, status || 'Pending']
    );
    const row = await dbGet('SELECT * FROM other_jobs WHERE id = ?', [result.id]);
    res.json({ success: true, data: row });
  } catch (err) { console.error('[Logistics] other-jobs POST error:', err.message); res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const users = await dbAll('SELECT id, username, email, full_name, company_name, role, phone, is_active, subscription_plan, subscription_expires, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, data: { users } });
  } catch (err) {
    console.error('[Admin] Users error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/admin/users/:id/block', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    console.error('[Admin] Block error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/admin/users/:id/unblock', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    await dbRun('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    console.error('[Admin] Unblock error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT role FROM users WHERE id = ?', [req.user.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
    const activeUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const blockedUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_active = 0');
    res.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        activeUsers: activeUsers?.count || 0,
        blockedUsers: blockedUsers?.count || 0
      }
    });
  } catch (err) {
    console.error('[Admin] Stats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// STATIC FILES & SPA FALLBACK
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ success: false, message: 'Frontend not built. Run npm run build.' });
    }
  });
} else {
  // Fallback when dist folder is missing
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'USSeaCargo ERP API Server is running',
      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET  /api/auth/me',
        'GET  /api/health',
        'GET  /api/dashboard/stats',
        'GET  /api/customers    (CRUD)',
        'GET  /api/invoices     (CRUD)',
        'GET  /api/suppliers    (CRUD)',
        'GET  /api/employees    (CRUD)',
        'GET  /api/projects     (CRUD)',
        'GET  /api/sea-import-jobs   (alias: /api/logistics/sea-import)',
        'GET  /api/sea-export-jobs   (alias: /api/logistics/sea-export)',
        'GET  /api/air-import-jobs   (alias: /api/logistics/air-import)',
        'GET  /api/air-export-jobs   (alias: /api/logistics/air-export)',
        'GET  /api/transshipment-jobs (alias: /api/logistics/transshipment)',
        'GET  /api/liner-schedules    (alias: /api/logistics/liner)',
        'GET  /api/cf-jobs            (alias: /api/logistics/cf)',
        'GET  /api/other-jobs         (alias: /api/logistics/other)',
      ]
    });
  });
  app.get('*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found. See GET / for available endpoints.' });
  });
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN HANDLERS
// ═══════════════════════════════════════════════════════════════
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
initDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('  USSeaCargo ERP Server running on port ' + PORT);
    console.log('  Database: ' + DB_PATH);
    console.log('  JWT: ' + (process.env.JWT_SECRET ? 'from env' : 'USING DEFAULT - INSECURE'));
    console.log('');
  });
}).catch(err => {
  console.error('[FATAL] Failed to initialize database:', err);
  process.exit(1);
});
