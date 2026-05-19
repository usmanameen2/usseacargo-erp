/**
 * USSeaCargo ERP - Node.js + Express Backend
 * ============================================
 * For Hostinger Node.js VPS hosting (4GB RAM, 4 CPU)
 * Auto-deploys from GitHub
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ussaeacargo-erp-secret-key-2024';
const DB_PATH = process.env.DB_PATH || './erp.db';

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── DATABASE ────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 10000');

function initDb() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
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
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT,
      address TEXT, city TEXT, country TEXT, region TEXT,
      type TEXT DEFAULT 'client', status TEXT DEFAULT 'active',
      notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL, customer_id INTEGER, customer_name TEXT,
      amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'draft',
      issue_date TEXT, due_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT,
      address TEXT, city TEXT, country TEXT, category TEXT,
      status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_no TEXT, full_name TEXT NOT NULL, email TEXT, phone TEXT,
      department TEXT, position TEXT, salary REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', hire_date TEXT,
      status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_no TEXT, name TEXT NOT NULL, description TEXT,
      customer_id INTEGER, customer_name TEXT, status TEXT DEFAULT 'active',
      start_date TEXT, end_date TEXT, budget REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sea_import_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, mbl_no TEXT, hbl_no TEXT, vessel_name TEXT,
      voyage_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT,
      notify_party TEXT, agent TEXT, container_type TEXT,
      shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT,
      status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sea_export_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, mbl_no TEXT, hbl_no TEXT, vessel_name TEXT,
      voyage_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT,
      notify_party TEXT, agent TEXT, container_type TEXT,
      shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT,
      status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS air_import_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, awb_no TEXT, hawb_no TEXT, flight_no TEXT,
      pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT,
      agent TEXT, cargo_type TEXT, shipment_type TEXT DEFAULT 'General',
      eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS air_export_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, awb_no TEXT, hawb_no TEXT, flight_no TEXT,
      pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT,
      agent TEXT, cargo_type TEXT, shipment_type TEXT DEFAULT 'General',
      eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transshipment_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, bl_no TEXT, vessel_name TEXT, pol TEXT,
      pod TEXT, fpod TEXT, shipper TEXT, consignee TEXT, agent TEXT,
      container_type TEXT, status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS liner_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vessel_name TEXT, voyage_no TEXT, pol TEXT, pod TEXT, eta TEXT, etd TEXT,
      carrier TEXT, frequency TEXT, status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cf_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, be_no TEXT, bl_no TEXT, vessel_name TEXT,
      pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, agent TEXT,
      container_type TEXT, status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS other_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_no TEXT NOT NULL, job_type TEXT, description TEXT,
      customer_name TEXT, status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_no TEXT, customer_id INTEGER, customer_name TEXT,
      amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'draft',
      issue_date TEXT, expiry_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS pipeline_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, customer_id INTEGER, customer_name TEXT,
      stage TEXT DEFAULT 'prospecting', value REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', probability REAL DEFAULT 0,
      expected_close_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sales_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT, customer_id INTEGER, customer_name TEXT,
      amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'pending',
      order_date TEXT, delivery_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT, supplier_id INTEGER, supplier_name TEXT,
      amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0,
      currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'pending',
      order_date TEXT, delivery_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT, name TEXT, description TEXT, category TEXT,
      unit_price REAL DEFAULT 0, cost_price REAL DEFAULT 0,
      quantity REAL DEFAULT 0, unit TEXT, supplier_id INTEGER,
      status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER, employee_name TEXT, leave_type TEXT,
      start_date TEXT, end_date TEXT, days REAL DEFAULT 0,
      reason TEXT, status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS recruitment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT, department TEXT, candidate_name TEXT,
      email TEXT, phone TEXT, status TEXT DEFAULT 'applied',
      applied_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS job_containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER, job_type TEXT, container_no TEXT, seal_no TEXT,
      container_size TEXT, container_type TEXT, weight REAL DEFAULT 0,
      pieces INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS shipping_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER, doc_type TEXT, file_name TEXT, file_path TEXT,
      uploaded_by TEXT, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS china_dubai_shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_no TEXT, invoice_no TEXT, supplier TEXT, product TEXT,
      quantity REAL DEFAULT 0, value REAL DEFAULT 0, status TEXT DEFAULT 'pending',
      shipped_date TEXT, received_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gate_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass_no TEXT, gate_type TEXT, vehicle_no TEXT, driver_name TEXT,
      purpose TEXT, date TEXT, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS customs_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deposit_no TEXT, amount REAL DEFAULT 0, currency TEXT DEFAULT 'AED',
      date TEXT, reference TEXT, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS packing_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_no TEXT, shipment_id INTEGER, total_packages INTEGER DEFAULT 0,
      total_weight REAL DEFAULT 0, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS packing_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      packing_list_id INTEGER, description TEXT, quantity INTEGER DEFAULT 0,
      weight REAL DEFAULT 0, dimensions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS product_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT, name TEXT, description TEXT, category TEXT,
      hs_code TEXT, unit TEXT, unit_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0, supplier_id INTEGER,
      status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ingested_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_type TEXT, file_name TEXT, file_path TEXT,
      extracted_data TEXT, status TEXT DEFAULT 'pending',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS shipping_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_no TEXT, job_id INTEGER, job_type TEXT, category TEXT,
      amount REAL DEFAULT 0, currency TEXT DEFAULT 'AED',
      date TEXT, description TEXT, status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    db.exec(sql);
  }

  // Seed admin user
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users 
      (username, password_hash, email, full_name, company_name, role, avatar_initials, subscription_plan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('admin', hash, 'admin@usseacargo.com', 'System Admin', 'USSeaCargo', 'admin', 'SA', 'yearly');
  }
}

initDb();

// ─── HELPERS ─────────────────────────────────────────────────
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function convertBodyKeys(body) {
  if (!body || typeof body !== 'object') return body;
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const row = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.userId);
    if (!row || row.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    next();
  });
}

// ─── ROUTE ALIASES ───────────────────────────────────────────
const ROUTE_ALIASES = {
  'financials/accounts': 'chart_of_accounts',
  'financials/journal-entries': 'journal_entries',
  'sales-crm/customers': 'customers',
  'sales-crm/invoices': 'invoices',
  'sales-crm/quotations': 'quotations',
  'sales-crm/pipeline-deals': 'pipeline_deals',
  'sales-crm/sales-orders': 'sales_orders',
  'purchasing/suppliers': 'suppliers',
  'purchasing/purchase-orders': 'purchase_orders',
  'purchasing/products': 'products',
  'purchasing/stock': 'products',
  'hr/employees': 'employees',
  'hr/leave-requests': 'leave_requests',
  'hr/recruitment': 'recruitment',
  'logistics/sea-import': 'sea_import_jobs',
  'logistics/sea-export': 'sea_export_jobs',
  'logistics/air-import': 'air_import_jobs',
  'logistics/air-export': 'air_export_jobs',
  'logistics/transshipment': 'transshipment_jobs',
  'logistics/liner': 'liner_schedules',
  'logistics/cf': 'cf_jobs',
  'logistics/other': 'other_jobs',
  'logistics/containers': 'job_containers',
  'logistics/shipping-docs': 'shipping_docs',
  'china-dubai-shipments': 'china_dubai_shipments',
  'china-dubai/containers': 'shipment_containers',
  'china-dubai/line-items': 'shipment_line_items',
  'china-dubai/hs-code-products': 'hs_code_products',
  'gate-passes': 'gate_passes',
  'customs-deposits': 'customs_deposits',
  'packing-lists': 'packing_lists',
  'packing-list-items': 'packing_list_items',
  'product-master': 'product_master',
  'ingested-documents': 'ingested_documents',
  'shipping-expenses': 'shipping_expenses',
};

// Direct table aliases (shorthand)
const DIRECT_TABLES = {
  'customers': true, 'invoices': true, 'suppliers': true, 'employees': true,
  'projects': true, 'quotations': true, 'pipeline_deals': true,
  'sales_orders': true, 'purchase_orders': true, 'products': true,
  'leave_requests': true, 'recruitment': true,
  'sea_import_jobs': true, 'sea_export_jobs': true,
  'air_import_jobs': true, 'air_export_jobs': true,
  'transshipment_jobs': true, 'liner_schedules': true,
  'cf_jobs': true, 'other_jobs': true,
  'job_containers': true, 'shipping_docs': true,
  'china_dubai_shipments': true, 'gate_passes': true,
  'customs_deposits': true, 'packing_lists': true,
  'packing_list_items': true, 'product_master': true,
  'ingested_documents': true, 'shipping_expenses': true
};

const ALL_TABLE_FIELDS = {
  'chart_of_accounts': ['code','name','type','parent_id','opening_balance','balance','currency','is_active','description'],
  'journal_entries': ['date','reference','description','debit_account','credit_account','amount','currency','notes'],
  'customers': ['name','company','email','phone','address','city','country','region','type','status','notes'],
  'invoices': ['invoice_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','due_date','notes'],
  'suppliers': ['name','company','email','phone','address','city','country','category','status'],
  'employees': ['employee_no','full_name','email','phone','department','position','salary','currency','hire_date','status'],
  'projects': ['project_no','name','description','customer_id','customer_name','status','start_date','end_date','budget','currency'],
  'quotations': ['quotation_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','expiry_date','notes'],
  'pipeline_deals': ['name','customer_id','customer_name','stage','value','currency','probability','expected_close_date','notes'],
  'sales_orders': ['order_no','customer_id','customer_name','amount','tax','total','currency','status','order_date','delivery_date','notes'],
  'purchase_orders': ['po_no','supplier_id','supplier_name','amount','tax','total','currency','status','order_date','delivery_date','notes'],
  'products': ['sku','name','description','category','unit_price','cost_price','quantity','unit','supplier_id','status'],
  'leave_requests': ['employee_id','employee_name','leave_type','start_date','end_date','days','reason','status'],
  'recruitment': ['position','department','candidate_name','email','phone','status','applied_date','notes'],
  'sea_import_jobs': ['job_no','mbl_no','hbl_no','vessel_name','voyage_no','pol','pod','shipper','consignee','notify_party','agent','container_type','shipment_type','eta','etd','status'],
  'sea_export_jobs': ['job_no','mbl_no','hbl_no','vessel_name','voyage_no','pol','pod','shipper','consignee','notify_party','agent','container_type','shipment_type','eta','etd','status'],
  'air_import_jobs': ['job_no','awb_no','hawb_no','flight_no','pol','pod','shipper','consignee','notify_party','agent','cargo_type','shipment_type','eta','etd','status'],
  'air_export_jobs': ['job_no','awb_no','hawb_no','flight_no','pol','pod','shipper','consignee','notify_party','agent','cargo_type','shipment_type','eta','etd','status'],
  'transshipment_jobs': ['job_no','bl_no','vessel_name','pol','pod','fpod','shipper','consignee','agent','container_type','status'],
  'liner_schedules': ['vessel_name','voyage_no','pol','pod','eta','etd','carrier','frequency','status'],
  'cf_jobs': ['job_no','be_no','bl_no','vessel_name','pol','pod','shipper','consignee','agent','container_type','status'],
  'other_jobs': ['job_no','job_type','description','customer_name','status'],
  'job_containers': ['job_id','job_type','container_no','seal_no','container_size','container_type','weight','pieces','status'],
  'shipping_docs': ['job_id','doc_type','file_name','file_path','uploaded_by','status'],
  'china_dubai_shipments': ['shipment_no','invoice_no','supplier','product','quantity','value','status','shipped_date','received_date'],
  'gate_passes': ['pass_no','gate_type','vehicle_no','driver_name','purpose','date','status'],
  'customs_deposits': ['deposit_no','amount','currency','date','reference','status'],
  'packing_lists': ['list_no','shipment_id','total_packages','total_weight','status'],
  'packing_list_items': ['packing_list_id','description','quantity','weight','dimensions'],
  'product_master': ['sku','name','description','category','hs_code','unit','unit_price','cost_price','supplier_id','status'],
  'ingested_documents': ['doc_type','file_name','file_path','extracted_data','status','uploaded_at'],
  'shipping_expenses': ['expense_no','job_id','job_type','category','amount','currency','date','description','status'],
};

// ─── GENERIC CRUD BUILDER ────────────────────────────────────
function buildCrud(table, fields) {
  // GET list
  app.get(`/api/${table}`, requireAuth, (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // GET single
  app.get(`/api/${table}/:id`, requireAuth, (req, res) => {
    try {
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // POST create
  app.post(`/api/${table}`, requireAuth, (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const cols = [];
      const vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v !== null && v !== undefined && k !== 'id' && (fields.length === 0 || fields.includes(k))) {
          cols.push(k);
          vals.push(v);
        }
      }
      if (cols.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      const placeholders = cols.map(() => '?').join(',');
      const result = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
      res.json({ success: true, data: row });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // PUT update
  app.put(`/api/${table}/:id`, requireAuth, (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const sets = [];
      const vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v !== null && v !== undefined && k !== 'id' && (fields.length === 0 || fields.includes(k))) {
          sets.push(`${k} = ?`);
          vals.push(v);
        }
      }
      if (sets.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      vals.push(req.params.id);
      db.prepare(`UPDATE ${table} SET ${sets.join(',')} WHERE id = ?`).run(...vals);
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // DELETE
  app.delete(`/api/${table}/:id`, requireAuth, (req, res) => {
    try {
      const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
}

// Build CRUD for all known tables
for (const [table, fields] of Object.entries(ALL_TABLE_FIELDS)) {
  buildCrud(table, fields);
}

// ─── ROUTE ALIAS HANDLER ─────────────────────────────────────
// Handle /api/sales-crm/customers → /api/customers etc.
app.use('/api', (req, res, next) => {
  const pathParts = req.path.slice(1).split('/');
  let aliasKey = pathParts.slice(0, 2).join('/');
  
  // Check for multi-part aliases
  if (!ROUTE_ALIASES[aliasKey] && pathParts.length >= 3) {
    aliasKey = pathParts.slice(0, 3).join('/');
  }
  
  const table = ROUTE_ALIASES[aliasKey];
  if (table && req.method === 'GET' && pathParts.length === 2) {
    // GET list
    try {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
      return res.json({ success: true, data: rows });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
  if (table && req.method === 'POST' && pathParts.length === 2) {
    // POST create
    try {
      const b = convertBodyKeys(req.body);
      const fields = ALL_TABLE_FIELDS[table] || [];
      const cols = [];
      const vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v !== null && v !== undefined && k !== 'id' && (fields.length === 0 || fields.includes(k))) {
          cols.push(k);
          vals.push(v);
        }
      }
      if (cols.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      const placeholders = cols.map(() => '?').join(',');
      const result = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
      return res.json({ success: true, data: row });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
  // Check for ID routes: /api/sales-crm/customers/123
  const lastPart = pathParts[pathParts.length - 1];
  const id = parseInt(lastPart);
  if (table && !isNaN(id) && pathParts.length > 2) {
    if (req.method === 'GET') {
      try {
        const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
        if (!row) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: row });
      } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
      }
    }
    if (req.method === 'PUT') {
      try {
        const b = convertBodyKeys(req.body);
        const fields = ALL_TABLE_FIELDS[table] || [];
        const sets = [];
        const vals = [];
        for (const [k, v] of Object.entries(b)) {
          if (v !== null && v !== undefined && k !== 'id' && (fields.length === 0 || fields.includes(k))) {
            sets.push(`${k} = ?`);
            vals.push(v);
          }
        }
        if (sets.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
        vals.push(id);
        db.prepare(`UPDATE ${table} SET ${sets.join(',')} WHERE id = ?`).run(...vals);
        const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
        if (!row) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: row });
      } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
      }
    }
    if (req.method === 'DELETE') {
      try {
        const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, message: 'Deleted successfully' });
      } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
      }
    }
  }
  
  next();
});

// ─── AUTH ROUTES ─────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
    
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.is_active === 0) return res.status(403).json({ success: false, message: 'Account is blocked' });
    if (user.subscription_expires && new Date(user.subscription_expires) < new Date()) {
      return res.status(403).json({ success: false, message: 'Subscription expired' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true, token,
      user: {
        id: user.id, username: user.username, email: user.email,
        full_name: user.full_name, company_name: user.company_name,
        role: user.role, avatar_initials: user.avatar_initials
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, email, full_name, company_name, phone } = req.body;
    if (!username || !password || !email || !full_name || !company_name) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
    if (existing) return res.status(409).json({ success: false, message: 'Username or email exists' });
    
    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = db.prepare(`INSERT INTO users 
      (username, password_hash, email, full_name, company_name, role, avatar_initials, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(username, hash, email, full_name, company_name, 'user', initials, phone || '');
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, company_name: user.company_name, role: user.role } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?").get(req.user.userId);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ─── DASHBOARD ───────────────────────────────────────────────
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  try {
    const kpi = {
      customers: db.prepare("SELECT COUNT(*) as count FROM customers").get().count || 0,
      invoices: db.prepare("SELECT COUNT(*) as count FROM invoices").get().count || 0,
      employees: db.prepare("SELECT COUNT(*) as count FROM employees").get().count || 0,
      projects: db.prepare("SELECT COUNT(*) as count FROM projects").get().count || 0,
      seaImports: db.prepare("SELECT COUNT(*) as count FROM sea_import_jobs").get().count || 0,
      seaExports: db.prepare("SELECT COUNT(*) as count FROM sea_export_jobs").get().count || 0,
      airImports: db.prepare("SELECT COUNT(*) as count FROM air_import_jobs").get().count || 0,
      airExports: db.prepare("SELECT COUNT(*) as count FROM air_export_jobs").get().count || 0,
    };
    res.json({ success: true, data: { kpi } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── ADMIN ───────────────────────────────────────────────────
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare("SELECT id, username, email, full_name, company_name, role, phone, is_active, subscription_plan, subscription_expires, created_at FROM users ORDER BY id DESC").all();
    res.json({ success: true, data: { users } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  try {
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'User blocked' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/admin/users/:id/unblock', requireAdmin, (req, res) => {
  try {
    db.prepare("UPDATE users SET is_active = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'User unblocked' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1").get();
    const blockedUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 0").get();
    res.json({ success: true, data: {
      totalUsers: totalUsers.count || 0,
      activeUsers: activeUsers.count || 0,
      blockedUsers: blockedUsers.count || 0
    }});
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── STATIC FILES & SPA FALLBACK ─────────────────────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'API endpoint not found' });
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run npm run build first.');
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'USSeaCargo ERP API', version: '19.0.0', message: 'Frontend dist/ folder not found. Place built frontend files in dist/ folder.' });
  });
}

// ─── ERROR HANDLER ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ success: false, message: 'Server error. Please try again.' });
});

// ─── START SERVER ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`USSeaCargo ERP v19.0.0 running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`JWT Secret: ${JWT_SECRET.substring(0, 8)}...`);
});
