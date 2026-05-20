/**
 * USSeaCargo ERP v19.3 - Node.js + Express + sqlite3
 * Fixed: Static files served correctly, no .htaccess dependency
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ussaeacargo-erp-secret-key-2024';
const DB_PATH = process.env.DB_PATH || './erp.db';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── PROMISE WRAPPER FOR SQLITE3 ──────────────────────────────
class Database {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
  }
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const db = new Database(DB_PATH);

async function ensureTableColumns(tableName, columns) {
  const existing = await db.all(`PRAGMA table_info(${tableName})`);
  const existingNames = new Set((existing || []).map(c => c.name));
  for (const col of columns) {
    if (!existingNames.has(col.name)) {
      await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
    }
  }
}

// ─── INIT DATABASE ────────────────────────────────────────────
async function initDb() {
  await db.exec(`PRAGMA journal_mode = WAL;`);
  await db.exec(`PRAGMA foreign_keys = ON;`);
  await db.exec(`PRAGMA busy_timeout = 10000;`);

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, company_name TEXT, role TEXT DEFAULT 'user', avatar_initials TEXT, phone TEXT, is_active INTEGER DEFAULT 1, subscription_plan TEXT DEFAULT 'trial', subscription_expires TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, country TEXT, region TEXT, type TEXT DEFAULT 'client', status TEXT DEFAULT 'active', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE NOT NULL, customer_id INTEGER, customer_name TEXT, amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'draft', issue_date TEXT, due_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, country TEXT, category TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_no TEXT, full_name TEXT NOT NULL, email TEXT, phone TEXT, department TEXT, position TEXT, salary REAL DEFAULT 0, currency TEXT DEFAULT 'AED', hire_date TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, project_no TEXT, name TEXT NOT NULL, description TEXT, customer_id INTEGER, customer_name TEXT, status TEXT DEFAULT 'active', start_date TEXT, end_date TEXT, budget REAL DEFAULT 0, currency TEXT DEFAULT 'AED', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS quotations (id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_no TEXT, customer_id INTEGER, customer_name TEXT, amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'draft', issue_date TEXT, expiry_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS pipeline_deals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, customer_id INTEGER, customer_name TEXT, stage TEXT DEFAULT 'prospecting', value REAL DEFAULT 0, currency TEXT DEFAULT 'AED', probability REAL DEFAULT 0, expected_close_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sales_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, customer_id INTEGER, customer_name TEXT, amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'pending', order_date TEXT, delivery_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, po_no TEXT, supplier_id INTEGER, supplier_name TEXT, amount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, currency TEXT DEFAULT 'AED', status TEXT DEFAULT 'pending', order_date TEXT, delivery_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, description TEXT, category TEXT, unit_price REAL DEFAULT 0, cost_price REAL DEFAULT 0, quantity REAL DEFAULT 0, unit TEXT, supplier_id INTEGER, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, employee_name TEXT, leave_type TEXT, start_date TEXT, end_date TEXT, days REAL DEFAULT 0, reason TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS recruitment (id INTEGER PRIMARY KEY AUTOINCREMENT, position TEXT, department TEXT, candidate_name TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'applied', applied_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sea_import_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, mbl_no TEXT, hbl_no TEXT, vessel_name TEXT, voyage_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT, agent TEXT, container_type TEXT, shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sea_export_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, mbl_no TEXT, hbl_no TEXT, vessel_name TEXT, voyage_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT, agent TEXT, container_type TEXT, shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS air_import_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, awb_no TEXT, hawb_no TEXT, flight_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT, agent TEXT, cargo_type TEXT, shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS air_export_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, awb_no TEXT, hawb_no TEXT, flight_no TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, notify_party TEXT, agent TEXT, cargo_type TEXT, shipment_type TEXT DEFAULT 'General', eta TEXT, etd TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS transshipment_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, bl_no TEXT, vessel_name TEXT, pol TEXT, pod TEXT, fpod TEXT, shipper TEXT, consignee TEXT, agent TEXT, container_type TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS liner_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, vessel_name TEXT, voyage_no TEXT, pol TEXT, pod TEXT, eta TEXT, etd TEXT, carrier TEXT, frequency TEXT, status TEXT DEFAULT 'Active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS cf_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, be_no TEXT, bl_no TEXT, vessel_name TEXT, pol TEXT, pod TEXT, shipper TEXT, consignee TEXT, agent TEXT, container_type TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS other_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT NOT NULL, job_type TEXT, description TEXT, customer_name TEXT, status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS job_containers (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER, job_type TEXT, container_no TEXT, seal_no TEXT, container_size TEXT, container_type TEXT, weight REAL DEFAULT 0, pieces INTEGER DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS shipping_docs (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER, doc_type TEXT, file_name TEXT, file_path TEXT, uploaded_by TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS china_dubai_shipments (id INTEGER PRIMARY KEY AUTOINCREMENT, shipment_no TEXT, invoice_no TEXT, supplier TEXT, product TEXT, quantity REAL DEFAULT 0, value REAL DEFAULT 0, status TEXT DEFAULT 'pending', shipped_date TEXT, received_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS gate_passes (id INTEGER PRIMARY KEY AUTOINCREMENT, pass_no TEXT, gate_type TEXT, vehicle_no TEXT, driver_name TEXT, purpose TEXT, date TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS customs_deposits (id INTEGER PRIMARY KEY AUTOINCREMENT, deposit_no TEXT, amount REAL DEFAULT 0, currency TEXT DEFAULT 'AED', date TEXT, reference TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS packing_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, list_no TEXT, shipment_id INTEGER, total_packages INTEGER DEFAULT 0, total_weight REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS packing_list_items (id INTEGER PRIMARY KEY AUTOINCREMENT, packing_list_id INTEGER, description TEXT, quantity INTEGER DEFAULT 0, weight REAL DEFAULT 0, dimensions TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS product_master (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT, description TEXT, category TEXT, hs_code TEXT, unit TEXT, unit_price REAL DEFAULT 0, cost_price REAL DEFAULT 0, supplier_id INTEGER, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS hs_code_products (id INTEGER PRIMARY KEY AUTOINCREMENT, hs_code TEXT, product_name TEXT, description TEXT, category TEXT, duty_rate REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS shipment_containers (id INTEGER PRIMARY KEY AUTOINCREMENT, shipment_id INTEGER, container_no TEXT, seal_no TEXT, size TEXT, type TEXT, weight REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS shipment_line_items (id INTEGER PRIMARY KEY AUTOINCREMENT, shipment_id INTEGER, product_name TEXT, hs_code TEXT, quantity REAL DEFAULT 0, unit_price REAL DEFAULT 0, total_value REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS ingested_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_type TEXT, file_name TEXT, file_path TEXT, extracted_data TEXT, status TEXT DEFAULT 'pending', uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS shipping_expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, expense_no TEXT, job_id INTEGER, job_type TEXT, category TEXT, amount REAL DEFAULT 0, currency TEXT DEFAULT 'AED', date TEXT, description TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS hbl_tracking (id INTEGER PRIMARY KEY AUTOINCREMENT, hbl_no TEXT NOT NULL, customer_name TEXT NOT NULL, customer_company TEXT, container_no TEXT, container_size TEXT, packages_count INTEGER DEFAULT 0, weight REAL DEFAULT 0, description TEXT, pol TEXT, pod TEXT, vessel_name TEXT, eta TEXT, status TEXT DEFAULT 'Active', remarks TEXT, job_no TEXT, mbl_no TEXT, date_received TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
  ];

  for (const sql of tables) await db.exec(sql);

  // Backward-compatible schema upgrade for China->Dubai menu (v21 UI fields)
  await ensureTableColumns('china_dubai_shipments', [
    { name: 'reference', type: 'TEXT' },
    { name: 'client', type: 'TEXT' },
    { name: 'cargo', type: 'TEXT' },
    { name: 'origin', type: 'TEXT' },
    { name: 'destination', type: 'TEXT' },
    { name: 'mode', type: 'TEXT' },
    { name: 'etd', type: 'TEXT' },
    { name: 'eta', type: 'TEXT' },
    { name: 'cost', type: 'REAL DEFAULT 0' },
    { name: 'revenue', type: 'REAL DEFAULT 0' },
    { name: 'profit', type: 'REAL DEFAULT 0' },
    { name: 'margin', type: 'REAL DEFAULT 0' },
    { name: 'branch', type: 'TEXT' },
    { name: 'job_type', type: 'TEXT' },
    { name: 'shipment_type', type: 'TEXT' },
    { name: 'agent', type: 'TEXT' },
    { name: 'port_of_loading', type: 'TEXT' },
    { name: 'etd_pol', type: 'TEXT' },
    { name: 'port_of_discharge', type: 'TEXT' },
    { name: 'vessel', type: 'TEXT' },
    { name: 'voyage', type: 'TEXT' },
    { name: 'eta_jebel_ali', type: 'TEXT' },
    { name: 'discharge_date', type: 'TEXT' },
    { name: 'main_line', type: 'TEXT' },
    { name: 'master_bl_no', type: 'TEXT' },
    { name: 'empty_removed_by', type: 'TEXT' },
    { name: 'terminal', type: 'TEXT' },
    { name: 'master_bl_freight_term', type: 'TEXT' },
    { name: 'carrier', type: 'TEXT' },
    { name: 'carrier_ref', type: 'TEXT' },
    { name: 'serial_number', type: 'TEXT' },
    { name: 'usd_buying_ex_rate', type: 'REAL DEFAULT 0' },
    { name: 'usd_selling_ex_rate', type: 'REAL DEFAULT 0' },
    { name: 'warehouse', type: 'TEXT' },
    { name: 'warehouse_remarks', type: 'TEXT' },
    { name: 'hauler_transporter', type: 'TEXT' },
    { name: 'documentation_by', type: 'TEXT' },
    { name: 'pre_alert_email', type: 'TEXT' },
    { name: 'costing_type', type: 'TEXT' },
    { name: 'internal_remarks', type: 'TEXT' },
    { name: 'rotation_number', type: 'TEXT' },
    { name: 'mrn_number', type: 'TEXT' },
    { name: 'cargo_transfer_number', type: 'TEXT' },
    { name: 'number_of_containers', type: 'INTEGER DEFAULT 1' },
  ]);

  const admin = await db.get("SELECT id FROM users WHERE username = 'admin'");
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.run(`INSERT INTO users (username,password_hash,email,full_name,company_name,role,avatar_initials,subscription_plan) VALUES (?,?,?,?,?,?,?,?)`,
      ['admin', hash, 'admin@usseacargo.com', 'System Admin', 'USSeaCargo', 'admin', 'SA', 'yearly']);
    console.log('[DB] Admin created');
  }
  console.log('[DB] Ready');
}

// ─── HELPERS ─────────────────────────────────────────────────
function toSnakeCase(str) { return str.replace(/([A-Z])/g, '_$1').toLowerCase(); }
function convertBodyKeys(body) {
  if (!body || typeof body !== 'object') return body;
  const result = {};
  for (const [k, v] of Object.entries(body)) result[toSnakeCase(k)] = v;
  return result;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch { return res.status(401).json({ success: false, message: 'Bad token' }); }
}

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Auth required' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const row = await db.get("SELECT role FROM users WHERE id = ?", [payload.userId]);
    if (!row || row.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    req.user = payload;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
}

// ─── TABLE FIELDS ────────────────────────────────────────────
const FIELDS = {
  customers: ['name','company','email','phone','address','city','country','region','type','status','notes'],
  invoices: ['invoice_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','due_date','notes'],
  suppliers: ['name','company','email','phone','address','city','country','category','status'],
  employees: ['employee_no','full_name','email','phone','department','position','salary','currency','hire_date','status'],
  projects: ['project_no','name','description','customer_id','customer_name','status','start_date','end_date','budget','currency'],
  quotations: ['quotation_no','customer_id','customer_name','amount','tax','total','currency','status','issue_date','expiry_date','notes'],
  pipeline_deals: ['name','customer_id','customer_name','stage','value','currency','probability','expected_close_date','notes'],
  sales_orders: ['order_no','customer_id','customer_name','amount','tax','total','currency','status','order_date','delivery_date','notes'],
  purchase_orders: ['po_no','supplier_id','supplier_name','amount','tax','total','currency','status','order_date','delivery_date','notes'],
  products: ['sku','name','description','category','unit_price','cost_price','quantity','unit','supplier_id','status'],
  leave_requests: ['employee_id','employee_name','leave_type','start_date','end_date','days','reason','status'],
  recruitment: ['position','department','candidate_name','email','phone','status','applied_date','notes'],
  sea_import_jobs: ['job_no','mbl_no','hbl_no','vessel_name','voyage_no','pol','pod','shipper','consignee','notify_party','agent','container_type','shipment_type','eta','etd','status'],
  sea_export_jobs: ['job_no','mbl_no','hbl_no','vessel_name','voyage_no','pol','pod','shipper','consignee','notify_party','agent','container_type','shipment_type','eta','etd','status'],
  air_import_jobs: ['job_no','awb_no','hawb_no','flight_no','pol','pod','shipper','consignee','notify_party','agent','cargo_type','shipment_type','eta','etd','status'],
  air_export_jobs: ['job_no','awb_no','hawb_no','flight_no','pol','pod','shipper','consignee','notify_party','agent','cargo_type','shipment_type','eta','etd','status'],
  transshipment_jobs: ['job_no','bl_no','vessel_name','pol','pod','fpod','shipper','consignee','agent','container_type','status'],
  liner_schedules: ['vessel_name','voyage_no','pol','pod','eta','etd','carrier','frequency','status'],
  cf_jobs: ['job_no','be_no','bl_no','vessel_name','pol','pod','shipper','consignee','agent','container_type','status'],
  other_jobs: ['job_no','job_type','description','customer_name','status'],
  job_containers: ['job_id','job_type','container_no','seal_no','container_size','container_type','weight','pieces','status'],
  shipping_docs: ['job_id','doc_type','file_name','file_path','uploaded_by','status'],
  china_dubai_shipments: [
    'shipment_no','invoice_no','supplier','product','quantity','value','status','shipped_date','received_date',
    'reference','client','cargo','origin','destination','mode','etd','eta','cost','revenue','profit','margin',
    'branch','job_type','shipment_type','agent','port_of_loading','etd_pol','port_of_discharge','vessel','voyage',
    'eta_jebel_ali','discharge_date','main_line','master_bl_no','empty_removed_by','terminal','master_bl_freight_term',
    'carrier','carrier_ref','serial_number','usd_buying_ex_rate','usd_selling_ex_rate','warehouse','warehouse_remarks',
    'hauler_transporter','documentation_by','pre_alert_email','costing_type','internal_remarks','rotation_number',
    'mrn_number','cargo_transfer_number','number_of_containers'
  ],
  gate_passes: ['pass_no','gate_type','vehicle_no','driver_name','purpose','date','status'],
  customs_deposits: ['deposit_no','amount','currency','date','reference','status'],
  packing_lists: ['list_no','shipment_id','total_packages','total_weight','status'],
  packing_list_items: ['packing_list_id','description','quantity','weight','dimensions'],
  product_master: ['sku','name','description','category','hs_code','unit','unit_price','cost_price','supplier_id','status'],
  hs_code_products: ['hs_code','product_name','description','category','duty_rate','status'],
  shipment_containers: ['shipment_id','container_no','seal_no','size','type','weight','status'],
  shipment_line_items: ['shipment_id','product_name','hs_code','quantity','unit_price','total_value'],
  ingested_documents: ['doc_type','file_name','file_path','extracted_data','status','uploaded_at'],
  shipping_expenses: ['expense_no','job_id','job_type','category','amount','currency','date','description','status'],
  hbl_tracking: ['hbl_no','customer_name','customer_company','container_no','container_size','packages_count','weight','description','pol','pod','vessel_name','eta','status','remarks','job_no','mbl_no','date_received'],
};

// ─── BUILD CRUD ──────────────────────────────────────────────
function buildCrud(table, fields) {
  app.get(`/api/${table}`, requireAuth, async (req, res) => {
    try { res.json({ success: true, data: await db.all(`SELECT * FROM ${table} ORDER BY id DESC`) }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.get(`/api/${table}/:id`, requireAuth, async (req, res) => {
    try {
      const row = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.post(`/api/${table}`, requireAuth, async (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const cols = [], vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v != null && k !== 'id' && fields.includes(k)) { cols.push(k); vals.push(v); }
      }
      if (cols.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      const ph = cols.map(() => '?').join(',');
      const result = await db.run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`, vals);
      res.json({ success: true, data: await db.get(`SELECT * FROM ${table} WHERE id = ?`, [result.lastID]) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.put(`/api/${table}/:id`, requireAuth, async (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const sets = [], vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v != null && k !== 'id' && fields.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
      }
      if (sets.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      vals.push(req.params.id);
      await db.run(`UPDATE ${table} SET ${sets.join(',')} WHERE id = ?`, vals);
      res.json({ success: true, data: await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.delete(`/api/${table}/:id`, requireAuth, async (req, res) => {
    try {
      const result = await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

for (const [t, f] of Object.entries(FIELDS)) buildCrud(t, f);

// ─── ROUTE ALIASES ───────────────────────────────────────────
const ALIASES = {
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
  'china-dubai/shipments': 'china_dubai_shipments',
  'china-dubai/containers': 'shipment_containers',
  'china-dubai/line-items': 'shipment_line_items',
  'china-dubai/hs-code-products': 'hs_code_products',
  'hs-code-products': 'hs_code_products',
  'gate-passes': 'gate_passes',
  'customs-deposits': 'customs_deposits',
  'packing-lists': 'packing_lists',
  'packing-list-items': 'packing_list_items',
  'product-master': 'product_master',
  'ingested-documents': 'ingested_documents',
  'shipping-expenses': 'shipping_expenses',
  'hbl-tracking': 'hbl_tracking',
};

function buildAlias(alias, table, fields) {
  app.get(`/api/${alias}`, requireAuth, async (req, res) => {
    try { res.json({ success: true, data: await db.all(`SELECT * FROM ${table} ORDER BY id DESC`) }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.get(`/api/${alias}/:id`, requireAuth, async (req, res) => {
    try {
      const row = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: row });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.post(`/api/${alias}`, requireAuth, async (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const cols = [], vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v != null && k !== 'id' && fields.includes(k)) { cols.push(k); vals.push(v); }
      }
      if (cols.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      const ph = cols.map(() => '?').join(',');
      const result = await db.run(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`, vals);
      res.json({ success: true, data: await db.get(`SELECT * FROM ${table} WHERE id = ?`, [result.lastID]) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.put(`/api/${alias}/:id`, requireAuth, async (req, res) => {
    try {
      const b = convertBodyKeys(req.body);
      const sets = [], vals = [];
      for (const [k, v] of Object.entries(b)) {
        if (v != null && k !== 'id' && fields.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
      }
      if (sets.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
      vals.push(req.params.id);
      await db.run(`UPDATE ${table} SET ${sets.join(',')} WHERE id = ?`, vals);
      res.json({ success: true, data: await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
  app.delete(`/api/${alias}/:id`, requireAuth, async (req, res) => {
    try {
      const result = await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

for (const [alias, table] of Object.entries(ALIASES)) {
  buildAlias(alias, table, FIELDS[table] || []);
}

// ─── AUTH ────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.is_active === 0) return res.status(403).json({ success: false, message: 'Account blocked' });
    if (user.subscription_expires && new Date(user.subscription_expires) < new Date()) return res.status(403).json({ success: false, message: 'Subscription expired' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, company_name: user.company_name, role: user.role, avatar_initials: user.avatar_initials } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name, phone } = req.body;
    if (!username || !password || !email || !full_name || !company_name) return res.status(400).json({ success: false, message: 'All fields required' });
    const existing = await db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
    if (existing) return res.status(409).json({ success: false, message: 'Username or email exists' });
    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await db.run(`INSERT INTO users (username,password_hash,email,full_name,company_name,role,avatar_initials,phone,created_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
      [username, hash, email, full_name, company_name, 'user', initials, phone || '']);
    const user = await db.get("SELECT * FROM users WHERE id = ?", [result.lastID]);
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, company_name: user.company_name, role: user.role } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const row = await db.get("SELECT id,username,email,full_name,company_name,role,avatar_initials,created_at FROM users WHERE id = ?", [req.user.userId]);
    res.json({ success: true, data: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── HEALTH & DASHBOARD ──────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

// Graceful root API response for accidental '/api/' calls from UI.
// Some menus may temporarily resolve an empty endpoint key during startup.
app.get(['/api', '/api/'], (req, res) => {
  res.json({ success: true, data: [], message: 'API root' });
});

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const kpi = {
      customers: (await db.get("SELECT COUNT(*) as c FROM customers")).c || 0,
      invoices: (await db.get("SELECT COUNT(*) as c FROM invoices")).c || 0,
      employees: (await db.get("SELECT COUNT(*) as c FROM employees")).c || 0,
      projects: (await db.get("SELECT COUNT(*) as c FROM projects")).c || 0,
      seaImports: (await db.get("SELECT COUNT(*) as c FROM sea_import_jobs")).c || 0,
      seaExports: (await db.get("SELECT COUNT(*) as c FROM sea_export_jobs")).c || 0,
      airImports: (await db.get("SELECT COUNT(*) as c FROM air_import_jobs")).c || 0,
      airExports: (await db.get("SELECT COUNT(*) as c FROM air_export_jobs")).c || 0,
    };
    res.json({ success: true, data: { kpi } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ADMIN ───────────────────────────────────────────────────
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.all("SELECT id,username,email,full_name,company_name,role,phone,is_active,subscription_plan,subscription_expires,created_at FROM users ORDER BY id DESC");
    res.json({ success: true, data: { users } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.put('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
  await db.run("UPDATE users SET is_active = 0 WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: 'User blocked' });
});
app.put('/api/admin/users/:id/unblock', requireAdmin, async (req, res) => {
  await db.run("UPDATE users SET is_active = 1 WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: 'User unblocked' });
});
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const totalUsers = await db.get("SELECT COUNT(*) as c FROM users");
  const activeUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE is_active = 1");
  const blockedUsers = await db.get("SELECT COUNT(*) as c FROM users WHERE is_active = 0");
  res.json({ success: true, data: { totalUsers: totalUsers.c || 0, activeUsers: activeUsers.c || 0, blockedUsers: blockedUsers.c || 0 } });
});

// ─── HBL CUSTOMER REPORT ─────────────────────────────────────
// NOTE: These routes are at /api/hbl-reports/* to avoid conflict with /api/hbl-tracking/:id
app.get('/api/hbl-reports/customer', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT customer_name, customer_company,
        COUNT(*) as total_hbls,
        SUM(packages_count) as total_packages,
        COUNT(DISTINCT container_no) as total_containers,
        GROUP_CONCAT(DISTINCT hbl_no) as hbl_list
      FROM hbl_tracking
      GROUP BY customer_name
      ORDER BY total_hbls DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/hbl-reports/container', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT container_no, container_size,
        COUNT(*) as total_hbls,
        SUM(packages_count) as total_packages,
        GROUP_CONCAT(DISTINCT customer_name) as customers
      FROM hbl_tracking
      WHERE container_no IS NOT NULL AND container_no != ''
      GROUP BY container_no
      ORDER BY total_hbls DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/hbl-reports/search', requireAuth, async (req, res) => {
  try {
    const hblNo = req.query.hbl_no || '';
    if (!hblNo) return res.status(400).json({ success: false, message: 'hbl_no query required' });
    const rows = await db.all("SELECT * FROM hbl_tracking WHERE hbl_no LIKE ?", ['%' + hblNo + '%']);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── STATIC FILES (CORRECTED) ───────────────────────────────
const distPath = path.join(__dirname, 'dist');

// Serve static files with correct MIME types
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
    // Always fetch fresh app shell and override script after deploy
    if (
      filePath.endsWith(path.join('dist', 'index.html')) ||
      filePath.endsWith(path.join('assets', 'china-form-override.js'))
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  }
}));

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found: ' + req.path });
});

// SPA fallback - only for non-file requests
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── START ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`USSeaCargo ERP v21.2 on port ${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
