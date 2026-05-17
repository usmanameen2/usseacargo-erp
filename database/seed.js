/**
 * Database Seed Script
 * Creates tables and populates with demo data using AED (UAE Dirham) currency.
 * USD amounts are converted to AED at a rate of ~3.6725 AED per 1 USD.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'erp.db');
const USD_TO_AED = 3.6725;
const aed = (usd) => Math.round(usd * USD_TO_AED * 100) / 100;

console.log('[Seed] Starting database seeding with AED currency...');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // ── Enable WAL mode ──────────────────────────────────────────────
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = OFF');

  // ── Drop existing tables ─────────────────────────────────────────
  db.run('DROP TABLE IF EXISTS users');
  db.run('DROP TABLE IF EXISTS company_settings');
  db.run('DROP TABLE IF EXISTS currencies');
  db.run('DROP TABLE IF EXISTS customers');
  db.run('DROP TABLE IF EXISTS quotations');
  db.run('DROP TABLE IF EXISTS sales_orders');
  db.run('DROP TABLE IF EXISTS invoices');
  db.run('DROP TABLE IF EXISTS pipeline_deals');
  db.run('DROP TABLE IF EXISTS suppliers');
  db.run('DROP TABLE IF EXISTS purchase_orders');
  db.run('DROP TABLE IF EXISTS products');
  db.run('DROP TABLE IF EXISTS employees');
  db.run('DROP TABLE IF EXISTS leave_requests');
  db.run('DROP TABLE IF EXISTS recruitment');
  db.run('DROP TABLE IF EXISTS projects');
  db.run('DROP TABLE IF EXISTS tasks');
  db.run('DROP TABLE IF EXISTS accounts');
  db.run('DROP TABLE IF EXISTS journal_entries');
  db.run('DROP TABLE IF EXISTS shipping_documents');
  db.run('DROP TABLE IF EXISTS shipments');
  db.run('DROP TABLE IF EXISTS tax_rates');
  db.run('PRAGMA foreign_keys = ON');
  console.log('[Seed] Dropped existing tables.');

  // ── Create tables ────────────────────────────────────────────────
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    avatar_initials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE company_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT DEFAULT 'USSeaCargo Inc.',
    legal_name TEXT DEFAULT 'USSeaCargo Technologies Inc.',
    tax_id TEXT DEFAULT '12-3456789',
    reg_number TEXT DEFAULT 'DE-987654321',
    email TEXT DEFAULT 'admin@usseacargo.com',
    phone TEXT DEFAULT '+971 (0) 000-0100',
    website TEXT DEFAULT 'www.usseacargo.com',
    address TEXT DEFAULT '1000 Enterprise Way',
    city TEXT DEFAULT 'Dubai',
    state TEXT DEFAULT 'Dubai',
    zip TEXT DEFAULT '94105',
    country TEXT DEFAULT 'AE',
    fiscal_month TEXT DEFAULT '01',
    fiscal_day TEXT DEFAULT '01',
    base_currency TEXT DEFAULT 'AED',
    timezone TEXT DEFAULT 'Asia/Dubai'
  )`);

  db.run(`CREATE TABLE currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    rate REAL NOT NULL,
    updated TEXT,
    status TEXT DEFAULT 'Active'
  )`);

  db.run(`CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    region TEXT,
    status TEXT DEFAULT 'Active',
    spent REAL DEFAULT 0,
    account_since TEXT,
    total_orders INTEGER DEFAULT 0,
    last_order_date TEXT,
    notes TEXT
  )`);

  db.run(`CREATE TABLE quotations (
    id TEXT PRIMARY KEY,
    quote TEXT NOT NULL,
    date TEXT,
    customer TEXT NOT NULL,
    customer_id TEXT,
    amount REAL DEFAULT 0,
    valid_until TEXT,
    status TEXT DEFAULT 'Draft',
    items INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE sales_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    date TEXT,
    customer TEXT NOT NULL,
    customer_id TEXT,
    items INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending'
  )`);

  db.run(`CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    inv_number TEXT NOT NULL,
    date TEXT,
    customer TEXT NOT NULL,
    customer_id TEXT,
    amount REAL DEFAULT 0,
    due_date TEXT,
    status TEXT DEFAULT 'Pending'
  )`);

  db.run(`CREATE TABLE pipeline_deals (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    customer_id TEXT,
    title TEXT NOT NULL,
    value REAL DEFAULT 0,
    close_date TEXT,
    owner TEXT,
    stage TEXT DEFAULT 'Lead',
    tags TEXT,
    reason TEXT
  )`);

  db.run(`CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    category TEXT,
    rating INTEGER DEFAULT 3,
    payment_terms TEXT,
    status TEXT DEFAULT 'Active',
    total_orders INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL,
    date TEXT,
    supplier TEXT NOT NULL,
    supplier_code TEXT,
    items INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    expected_delivery TEXT,
    status TEXT DEFAULT 'Draft'
  )`);

  db.run(`CREATE TABLE products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    warehouse TEXT,
    warehouse_code TEXT,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    stock_value REAL DEFAULT 0
  )`);

  db.run(`CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    position TEXT,
    email TEXT,
    phone TEXT,
    joined TEXT,
    status TEXT DEFAULT 'Active',
    color TEXT,
    salary REAL DEFAULT 0,
    manager TEXT,
    type TEXT DEFAULT 'Full-time',
    dob TEXT,
    gender TEXT,
    address TEXT
  )`);

  db.run(`CREATE TABLE leave_requests (
    id TEXT PRIMARY KEY,
    employee TEXT NOT NULL,
    employee_id TEXT,
    type TEXT,
    date_from TEXT,
    date_to TEXT,
    days INTEGER DEFAULT 1,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE recruitment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    applied TEXT,
    exp INTEGER DEFAULT 0,
    source TEXT,
    stage TEXT DEFAULT 'Applied',
    start_date TEXT
  )`);

  db.run(`CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0,
    due_date TEXT,
    budget REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    status TEXT DEFAULT 'Planning',
    priority TEXT DEFAULT 'Medium',
    pm TEXT,
    client TEXT,
    team TEXT,
    start_date TEXT,
    end_date TEXT
  )`);

  db.run(`CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project TEXT,
    due_date TEXT,
    assignee TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'To Do',
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    attachments INTEGER DEFAULT 0,
    completed TEXT,
    tags TEXT
  )`);

  db.run(`CREATE TABLE accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    category TEXT,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    bold INTEGER DEFAULT 0,
    indent INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT NOT NULL,
    date TEXT,
    description TEXT,
    debits REAL DEFAULT 0,
    credits REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    lines TEXT
  )`);

  db.run(`CREATE TABLE shipping_documents (
    id TEXT PRIMARY KEY,
    doc_type TEXT,
    doc_number TEXT NOT NULL,
    reference TEXT,
    date TEXT,
    status TEXT DEFAULT 'Draft',
    shipper TEXT,
    consignee TEXT,
    port TEXT
  )`);

  db.run(`CREATE TABLE shipments (
    id TEXT PRIMARY KEY,
    bl_number TEXT,
    shipper TEXT,
    consignee TEXT,
    pol TEXT,
    pod TEXT,
    vessel TEXT,
    etd TEXT,
    eta TEXT,
    status TEXT DEFAULT 'Booking',
    containers INTEGER DEFAULT 0,
    weight REAL DEFAULT 0,
    description TEXT
  )`);

  db.run(`CREATE TABLE tax_rates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL DEFAULT 0,
    type TEXT,
    applies TEXT,
    effective_date TEXT,
    status TEXT DEFAULT 'Active'
  )`);

  console.log('[Seed] Tables created.');

  // ── Insert Data ──────────────────────────────────────────────────

  // Admin user (password: admin123)
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT INTO users (username, password_hash, email, full_name, company_name, role, avatar_initials)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin', adminHash, 'admin@usseacargo.com', 'System Administrator', 'USSeaCargo Inc.', 'admin', 'SA']
  );

  // Company settings
  db.run(`INSERT INTO company_settings (company_name, legal_name, base_currency, country, timezone, city, state)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['USSeaCargo Inc.', 'USSeaCargo Technologies Inc.', 'AED', 'AE', 'Asia/Dubai', 'Dubai', 'Dubai']
  );

  // Currencies
  const currencies = [
    ['AED', 'UAE Dirham', 'د.إ', 1.0, 'Active'],
    ['USD', 'US Dollar', '$', 0.2723, 'Active'],
    ['EUR', 'Euro', '€', 0.2512, 'Active'],
    ['GBP', 'British Pound', '£', 0.2145, 'Active'],
    ['SAR', 'Saudi Riyal', '﷼', 1.0208, 'Active'],
  ];
  const curStmt = db.prepare('INSERT INTO currencies (code, name, symbol, rate, updated, status) VALUES (?, ?, ?, ?, datetime("now"), ?)');
  currencies.forEach(c => curStmt.run(c));
  curStmt.finalize();

  // Customers
  const customers = [
    ['cust-001', 'John Williams', 'TechCorp Inc.', 'john@techcorp.com', '+971 (0) 123-4567', 'Middle East', 'Active', aed(245000), 'Jan 2022', 24, 'Jun 15, 2024', 'Key enterprise client. Interested in module expansion.'],
    ['cust-002', 'Sarah Chen', 'Global Solutions Ltd.', 'sarah@globalsol.com', '+44 20 7946 0958', 'Europe', 'Active', aed(189000), 'Mar 2022', 18, 'Jun 18, 2024', 'Strong partner in EU market. Referral source for 2 new leads.'],
    ['cust-003', 'Michael Brown', 'Apex Manufacturing', 'mike@apex-mfg.com', '+971 (0) 987-6543', 'Middle East', 'Active', aed(320000), 'Feb 2021', 31, 'Jun 20, 2024', 'Largest manufacturing client. Inventory module power user.'],
    ['cust-004', 'Lisa Park', 'Digital Dynamics', 'lisa@digitaldyn.com', '+82 2 555 0199', 'Asia Pacific', 'Active', aed(156000), 'Aug 2022', 14, 'Jun 12, 2024', 'APAC market influencer. CRM module advocate.'],
    ['cust-005', 'Robert Mueller', 'EuroTech GmbH', 'robert@eurotech.de', '+49 30 255490', 'Europe', 'Prospect', 0, 'N/A', 0, 'N/A', 'New prospect from Berlin trade show. Interested in ERP implementation.'],
    ['cust-006', 'Emily Watson', 'Summit Retail Group', 'emily@summitretail.com', '+971 (0) 234-5678', 'Middle East', 'Active', aed(89000), 'Nov 2022', 11, 'Jun 08, 2024', 'Retail chain with 12 locations. POS integration opportunity.'],
    ['cust-007', 'David Kim', 'Pacific Logistics', 'david@pacificlog.com', '+65 6123 4567', 'Asia Pacific', 'Active', aed(178000), 'Apr 2022', 16, 'Jun 19, 2024', 'Singapore-based logistics firm. Full ERP suite candidate.'],
    ['cust-008', 'Anna Schmidt', 'Alpine Services AG', 'anna@alpine.ch', '+41 44 255 0199', 'Europe', 'Active', aed(67000), 'Jul 2023', 8, 'Jun 05, 2024', 'Swiss service company. Financial module primary interest.'],
    ['cust-009', 'James Taylor', 'Coastal Energy Co.', 'james@coastalenergy.com', '+971 (0) 876-5432', 'Middle East', 'Inactive', aed(45000), 'May 2021', 7, 'Mar 18, 2024', 'Inactive since Q1 2024. Budget freeze on new projects.'],
    ['cust-010', 'Maria Garcia', 'Soluciones Mexico', 'maria@soluciones.mx', '+52 55 1234 5678', 'Latin America', 'Prospect', 0, 'N/A', 0, 'N/A', 'New prospect from partner referral. Cloud migration interest.'],
    ['cust-011', 'Yuki Tanaka', 'Tokyo Innovations', 'yuki@tokyoinnov.jp', '+81 3 1234 5678', 'Asia Pacific', 'Active', aed(210000), 'Jun 2021', 22, 'Jun 22, 2024', 'Major APAC client. Asia rollout project in negotiation.'],
    ['cust-012', 'Thomas Anderson', 'Metro Systems', 'thomas@metrosys.com', '+971 (0) 345-6789', 'Middle East', 'Active', aed(134000), 'Sep 2022', 15, 'Jun 10, 2024', 'Metro area IT systems. License upgrade pending.'],
    ['cust-013', 'Karen Martinez', 'InnovateSoft LLC', 'karen@innovatesoft.com', '+971 (0) 456-7890', 'Middle East', 'Active', aed(112000), 'Dec 2022', 13, 'Jun 14, 2024', 'Software development partner. Custom integration work.'],
    ['cust-014', 'Peter Johansson', 'Nordic Tech AB', 'peter@nordictech.se', '+46 8 555 0123', 'Europe', 'Prospect', 0, 'N/A', 0, 'N/A', 'Swedish startup. Evaluating ERP options.'],
    ['cust-015', 'Rachel Lee', 'Horizon Dynamics', 'rachel@horizondyn.com', '+971 (0) 567-8901', 'Middle East', 'Active', aed(178500), 'Oct 2021', 19, 'Jun 20, 2024', 'Strategic account. Multi-module deployment.'],
  ];
  const custStmt = db.prepare('INSERT INTO customers (id, name, company, email, phone, region, status, spent, account_since, total_orders, last_order_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  customers.forEach(c => custStmt.run(c));
  custStmt.finalize();

  // Quotations
  const quotations = [
    ['qt-015', 'QT-2024-0015', '2024-06-24', 'TechCorp Inc.', 'cust-001', aed(45000), '2024-07-24', 'Sent', 3],
    ['qt-014', 'QT-2024-0014', '2024-06-22', 'Global Solutions Ltd.', 'cust-002', aed(28000), '2024-07-22', 'Accepted', 2],
    ['qt-013', 'QT-2024-0013', '2024-06-20', 'Apex Manufacturing', 'cust-003', aed(62000), '2024-07-20', 'Draft', 5],
    ['qt-012', 'QT-2024-0012', '2024-06-18', 'Digital Dynamics', 'cust-004', aed(18500), '2024-07-18', 'Sent', 1],
    ['qt-011', 'QT-2024-0011', '2024-06-15', 'EuroTech GmbH', 'cust-005', aed(34000), '2024-06-15', 'Expired', 2],
    ['qt-010', 'QT-2024-0010', '2024-06-12', 'Pacific Logistics', 'cust-007', aed(51000), '2024-07-12', 'Sent', 4],
    ['qt-009', 'QT-2024-0009', '2024-06-10', 'Summit Retail Group', 'cust-006', aed(12500), '2024-07-10', 'Accepted', 2],
    ['qt-008', 'QT-2024-0008', '2024-06-08', 'Tokyo Innovations', 'cust-011', aed(38000), '2024-07-08', 'Rejected', 3],
    ['qt-007', 'QT-2024-0007', '2024-06-05', 'Alpine Services AG', 'cust-008', aed(22000), '2024-07-05', 'Sent', 2],
    ['qt-006', 'QT-2024-0006', '2024-06-03', 'Metro Systems', 'cust-012', aed(16500), '2024-07-03', 'Draft', 1],
  ];
  const qtStmt = db.prepare('INSERT INTO quotations (id, quote, date, customer, customer_id, amount, valid_until, status, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  quotations.forEach(q => qtStmt.run(q));
  qtStmt.finalize();

  // Sales Orders
  const salesOrders = [
    ['so-092', 'SO-2024-0092', '2024-06-24', 'TechCorp Inc.', 'cust-001', 3, aed(45000), 'Processing'],
    ['so-091', 'SO-2024-0091', '2024-06-23', 'Apex Manufacturing', 'cust-003', 5, aed(62000), 'Shipped'],
    ['so-090', 'SO-2024-0090', '2024-06-22', 'Global Solutions Ltd.', 'cust-002', 2, aed(28000), 'Delivered'],
    ['so-089', 'SO-2024-0089', '2024-06-21', 'Digital Dynamics', 'cust-004', 1, aed(18500), 'Pending'],
    ['so-088', 'SO-2024-0088', '2024-06-20', 'Pacific Logistics', 'cust-007', 4, aed(51000), 'Delivered'],
    ['so-087', 'SO-2024-0087', '2024-06-18', 'Summit Retail Group', 'cust-006', 2, aed(12500), 'Shipped'],
    ['so-086', 'SO-2024-0086', '2024-06-16', 'Tokyo Innovations', 'cust-011', 3, aed(38000), 'Processing'],
    ['so-085', 'SO-2024-0085', '2024-06-15', 'Metro Systems', 'cust-012', 2, aed(22000), 'Pending'],
    ['so-084', 'SO-2024-0084', '2024-06-14', 'InnovateSoft LLC', 'cust-013', 3, aed(24000), 'Processing'],
    ['so-083', 'SO-2024-0083', '2024-06-14', 'Alpine Services AG', 'cust-008', 2, aed(12000), 'Shipped'],
    ['so-093', 'SO-2024-0093', '2024-06-25', 'Horizon Dynamics', 'cust-015', 4, aed(42000), 'Delivered'],
    ['so-082', 'SO-2024-0082', '2024-06-13', 'Coastal Energy Co.', 'cust-009', 1, aed(8000), 'Cancelled'],
  ];
  const soStmt = db.prepare('INSERT INTO sales_orders (id, order_number, date, customer, customer_id, items, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  salesOrders.forEach(s => soStmt.run(s));
  soStmt.finalize();

  // Invoices
  const invoices = [
    ['inv-042', 'INV-2024-0042', '2024-06-24', 'TechCorp Inc.', 'cust-001', aed(12500), '2024-07-24', 'Pending'],
    ['inv-041', 'INV-2024-0041', '2024-06-23', 'Apex Manufacturing', 'cust-003', aed(34000), '2024-07-23', 'Pending'],
    ['inv-040', 'INV-2024-0040', '2024-06-22', 'Global Solutions Ltd.', 'cust-002', aed(23400), '2024-07-22', 'Paid'],
    ['inv-039', 'INV-2024-0039', '2024-06-21', 'Digital Dynamics', 'cust-004', aed(15600), '2024-07-21', 'Paid'],
    ['inv-038', 'INV-2024-0038', '2024-06-20', 'Pacific Logistics', 'cust-007', aed(18900), '2024-06-20', 'Overdue'],
    ['inv-037', 'INV-2024-0037', '2024-06-18', 'Summit Retail Group', 'cust-006', aed(8700), '2024-07-18', 'Pending'],
    ['inv-036', 'INV-2024-0036', '2024-06-16', 'Tokyo Innovations', 'cust-011', aed(42000), '2024-07-16', 'Paid'],
    ['inv-035', 'INV-2024-0035', '2024-06-15', 'Metro Systems', 'cust-012', aed(11200), '2024-06-15', 'Overdue'],
    ['inv-034', 'INV-2024-0034', '2024-06-14', 'Alpine Services AG', 'cust-008', aed(5600), '2024-07-14', 'Paid'],
    ['inv-033', 'INV-2024-0033', '2024-06-12', 'TechCorp Inc.', 'cust-001', aed(28900), '2024-07-12', 'Paid'],
    ['inv-032', 'INV-2024-0032', '2024-06-10', 'Horizon Dynamics', 'cust-015', aed(18500), '2024-07-10', 'Pending'],
    ['inv-031', 'INV-2024-0031', '2024-06-08', 'InnovateSoft LLC', 'cust-013', aed(22400), '2024-07-08', 'Paid'],
    ['inv-030', 'INV-2024-0030', '2024-06-05', 'Apex Manufacturing', 'cust-003', aed(41500), '2024-07-05', 'Pending'],
    ['inv-029', 'INV-2024-0029', '2024-06-01', 'Global Solutions Ltd.', 'cust-002', aed(31200), '2024-06-01', 'Overdue'],
    ['inv-028', 'INV-2024-0028', '2024-05-28', 'Tokyo Innovations', 'cust-011', aed(27800), '2024-06-28', 'Paid'],
  ];
  const invStmt = db.prepare('INSERT INTO invoices (id, inv_number, date, customer, customer_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  invoices.forEach(i => invStmt.run(i));
  invStmt.finalize();

  // Pipeline Deals
  const pipelineDeals = [
    ['deal-001', 'EuroTech GmbH', 'cust-005', 'ERP Implementation', aed(45000), '2024-08-15', 'Sarah Chen', 'Lead', 'Software,Enterprise', ''],
    ['deal-002', 'Soluciones Mexico', 'cust-010', 'Cloud Migration', aed(28000), '2024-08-30', 'Mike Johnson', 'Lead', 'Services,Mid-Market', ''],
    ['deal-003', 'Coastal Energy Co.', 'cust-009', 'Support Contract', aed(24000), '2024-09-01', 'Lisa Park', 'Lead', 'Support,Enterprise', ''],
    ['deal-004', 'TechCorp Inc.', 'cust-001', 'Module Expansion', aed(85000), '2024-07-30', 'Sarah Chen', 'Qualified', 'Software,Enterprise', ''],
    ['deal-005', 'Apex Manufacturing', 'cust-003', 'Inventory Module', aed(42000), '2024-07-20', 'Mike Johnson', 'Qualified', 'Software,Mid-Market', ''],
    ['deal-006', 'Global Solutions Ltd.', 'cust-002', 'HR Integration', aed(38000), '2024-08-05', 'Lisa Park', 'Qualified', 'Services,Mid-Market', ''],
    ['deal-007', 'Summit Retail Group', 'cust-006', 'POS Integration', aed(38000), '2024-08-10', 'Sarah Chen', 'Qualified', 'Software,Small Business', ''],
    ['deal-008', 'Pacific Logistics', 'cust-007', 'Full ERP Suite', aed(62000), '2024-07-15', 'Mike Johnson', 'Proposal', 'Software,Enterprise', ''],
    ['deal-009', 'Digital Dynamics', 'cust-004', 'CRM Module', aed(32000), '2024-07-25', 'Lisa Park', 'Proposal', 'Software,Mid-Market', ''],
    ['deal-010', 'Alpine Services AG', 'cust-008', 'Financial Module', aed(24000), '2024-08-01', 'Sarah Chen', 'Proposal', 'Software,Small Business', ''],
    ['deal-011', 'Tokyo Innovations', 'cust-011', 'Asia Rollout', aed(51000), '2024-07-10', 'Sarah Chen', 'Negotiation', 'Services,Enterprise', ''],
    ['deal-012', 'Metro Systems', 'cust-012', 'Upgrade License', aed(25000), '2024-07-12', 'Mike Johnson', 'Negotiation', 'Software,Mid-Market', ''],
    ['deal-013', 'TechCorp Inc.', 'cust-001', 'Initial Setup', aed(58000), '2024-06-20', 'Sarah Chen', 'Closed Won', 'Software,Enterprise', ''],
    ['deal-014', 'Global Solutions Ltd.', 'cust-002', 'Consulting Project', aed(35000), '2024-06-18', 'Lisa Park', 'Closed Won', 'Services,Mid-Market', ''],
    ['deal-015', 'Coastal Energy Co.', 'cust-009', 'Data Migration', aed(28000), '2024-06-15', 'Mike Johnson', 'Closed Lost', 'Services,Mid-Market', 'Budget constraints'],
  ];
  const dealStmt = db.prepare('INSERT INTO pipeline_deals (id, customer, customer_id, title, value, close_date, owner, stage, tags, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  pipelineDeals.forEach(d => dealStmt.run(d));
  dealStmt.finalize();

  // Suppliers
  const suppliers = [
    ['1', 'Acme Supplies Co.', 'SUP-001', 'Tom Wilson', 'tom@acme.com', '+971 (0) 101-2001', '100 Industrial Way, Dubai Industrial City', 'Raw Materials', 5, 'Net 30', 'Active', 48],
    ['2', 'Global Tech Distributors', 'SUP-002', 'Rachel Green', 'rachel@globaltech.com', '+971 (0) 202-3002', '500 Innovation Dr, Dubai Silicon Oasis', 'Equipment', 4, 'Net 15', 'Active', 32],
    ['3', 'Metro Logistics Ltd.', 'SUP-003', 'Chris Martin', 'chris@metrolog.com', '+971 (0) 303-4003', '75 Commerce St, Deira, Dubai', 'Services', 4, 'Net 30', 'Active', 27],
    ['4', 'OfficeMax Pro', 'SUP-004', 'Nancy White', 'nancy@officemax.com', '+971 (0) 404-5004', '250 Office Park Blvd, Business Bay, Dubai', 'Office', 3, 'Due on Receipt', 'Active', 56],
    ['5', 'Precision Parts Inc.', 'SUP-005', 'Alex Turner', 'alex@precision.com', '+971 (0) 505-6005', '800 Manufacturing Ln, Jebel Ali', 'Raw Materials', 5, 'Net 30', 'Active', 41],
    ['6', 'CloudHost Solutions', 'SUP-006', 'Jenny Lee', 'jenny@cloudhost.io', '+971 (0) 606-7006', '1200 Cloud Way, Dubai Internet City', 'Services', 4, 'Monthly', 'Active', 18],
    ['7', 'Heavy Machinery Co.', 'SUP-007', 'Frank Miller', 'frank@heavymc.com', '+971 (0) 707-8007', '3000 Heavy Industry Rd, Jebel Ali', 'Equipment', 3, 'Net 45', 'On Hold', 15],
    ['8', 'Paper & Print Supply', 'SUP-008', 'Grace Kim', 'grace@paperprint.com', '+971 (0) 808-9008', '450 Print Shop Ave, Al Quoz, Dubai', 'Office', 4, 'Net 15', 'Active', 63],
    ['9', 'Chemical Solutions LLC', 'SUP-009', 'Bob Harris', 'bob@chemical.com', '+971 (0) 909-1009', '99 Chemical Plaza, Jebel Ali', 'Raw Materials', 2, 'Net 30', 'Inactive', 12],
    ['10', 'Swift Transport Inc.', 'SUP-010', 'Diana Ross', 'diana@swifttrans.com', '+971 (0) 010-2010', '600 Transit Blvd, Dubai South', 'Services', 4, 'Net 15', 'Active', 35],
    ['11', 'ElectroSource Corp', 'SUP-011', 'James Wang', 'james@electrosource.com', '+971 (0) 111-2111', '77 Electronics Blvd, Dubai Silicon Oasis', 'Equipment', 5, 'Net 30', 'Active', 29],
    ['12', 'Packaging Plus', 'SUP-012', 'Sarah Johnson', 'sarah@packplus.com', '+971 (0) 212-3112', '33 Box Maker St, Ras Al Khor, Dubai', 'Office', 3, 'Net 15', 'Active', 44],
  ];
  const supStmt = db.prepare('INSERT INTO suppliers (id, name, code, contact_person, email, phone, address, category, rating, payment_terms, status, total_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  suppliers.forEach(s => supStmt.run(s));
  supStmt.finalize();

  // Purchase Orders
  const purchaseOrders = [
    ['1', 'PO-2024-0025', '2024-06-24', 'Acme Supplies Co.', 'SUP-001', 5, aed(12500), '2024-07-05', 'Sent'],
    ['2', 'PO-2024-0024', '2024-06-23', 'Precision Parts Inc.', 'SUP-005', 3, aed(28500), '2024-07-01', 'Partial'],
    ['3', 'PO-2024-0023', '2024-06-22', 'Global Tech Distributors', 'SUP-002', 2, aed(8400), '2024-06-28', 'Sent'],
    ['4', 'PO-2024-0022', '2024-06-21', 'Metro Logistics Ltd.', 'SUP-003', 1, aed(3500), '2024-06-25', 'Received'],
    ['5', 'PO-2024-0021', '2024-06-20', 'OfficeMax Pro', 'SUP-004', 8, aed(2200), '2024-06-22', 'Received'],
    ['6', 'PO-2024-0020', '2024-06-19', 'Acme Supplies Co.', 'SUP-001', 4, aed(8900), '2024-06-21', 'Received'],
    ['7', 'PO-2024-0019', '2024-06-18', 'CloudHost Solutions', 'SUP-006', 1, aed(4800), '2024-06-19', 'Received'],
    ['8', 'PO-2024-0018', '2024-06-17', 'Heavy Machinery Co.', 'SUP-007', 1, aed(45000), '2024-07-15', 'Sent'],
    ['9', 'PO-2024-0017', '2024-06-16', 'Paper & Print Supply', 'SUP-008', 6, aed(1500), '2024-06-15', 'Received'],
    ['10', 'PO-2024-0016', '2024-06-15', 'Precision Parts Inc.', 'SUP-005', 2, aed(15600), '2024-06-14', 'Received'],
    ['11', 'PO-2024-0015', '2024-06-14', 'Swift Transport Inc.', 'SUP-010', 3, aed(6200), '2024-06-20', 'Sent'],
    ['12', 'PO-2024-0014', '2024-06-13', 'ElectroSource Corp', 'SUP-011', 4, aed(12800), '2024-06-27', 'Draft'],
    ['13', 'PO-2024-0013', '2024-06-12', 'Packaging Plus', 'SUP-012', 10, aed(3400), '2024-06-18', 'Partial'],
    ['14', 'PO-2024-0012', '2024-06-11', 'Acme Supplies Co.', 'SUP-001', 6, aed(18700), '2024-06-17', 'Received'],
    ['15', 'PO-2024-0011', '2024-06-10', 'Global Tech Distributors', 'SUP-002', 1, aed(22500), '2024-06-16', 'Cancelled'],
  ];
  const poStmt = db.prepare('INSERT INTO purchase_orders (id, po_number, date, supplier, supplier_code, items, total, expected_delivery, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  purchaseOrders.forEach(p => poStmt.run(p));
  poStmt.finalize();

  // Products
  const products = [
    ['1', 'SKU-1042', 'Widget Pro X', 'Widgets', 'Main Distribution Center', 'WH-001', 45, 50, aed(125), aed(5625)],
    ['2', 'SKU-1041', 'Bolt M8x30mm', 'Hardware', 'Main Distribution Center', 'WH-001', 1200, 500, aed(0.85), aed(1020)],
    ['3', 'SKU-1040', 'Circuit Board A7', 'Electronics', 'Main Distribution Center', 'WH-001', 0, 25, aed(450), 0],
    ['4', 'SKU-1039', 'Sensor Module 3000', 'Electronics', 'West Coast Facility', 'WH-002', 12, 20, aed(320), aed(3840)],
    ['5', 'SKU-1038', 'Power Supply 24V', 'Electronics', 'West Coast Facility', 'WH-002', 85, 30, aed(78), aed(6630)],
    ['6', 'SKU-1037', 'Enclosure Case L', 'Hardware', 'East Coast Hub', 'WH-003', 8, 15, aed(45), aed(360)],
    ['7', 'SKU-1036', 'Cable HDMI 6ft', 'Cables', 'East Coast Hub', 'WH-003', 340, 100, aed(12.5), aed(4250)],
    ['8', 'SKU-1035', 'Thermal Pad Set', 'Thermal', 'European DC', 'WH-004', 0, 40, aed(8.5), 0],
    ['9', 'SKU-1034', 'LED Display 7"', 'Displays', 'European DC', 'WH-004', 22, 10, aed(185), aed(4070)],
    ['10', 'SKU-1033', 'Motor Assembly 5HP', 'Motors', 'Main Distribution Center', 'WH-001', 6, 5, aed(1200), aed(7200)],
    ['11', 'SKU-1032', 'Gasket Set Type B', 'Seals', 'West Coast Facility', 'WH-002', 200, 80, aed(15), aed(3000)],
    ['12', 'SKU-1031', 'Control Panel V2', 'Electronics', 'East Coast Hub', 'WH-003', 18, 10, aed(680), aed(12240)],
    ['13', 'SKU-1030', 'Pneumatic Valve 3/8"', 'Valves', 'Main Distribution Center', 'WH-001', 55, 30, aed(95), aed(5225)],
    ['14', 'SKU-1029', 'Safety Switch EM', 'Safety', 'West Coast Facility', 'WH-002', 3, 10, aed(240), aed(720)],
    ['15', 'SKU-1028', 'Relay Module 4ch', 'Electronics', 'East Coast Hub', 'WH-003', 67, 25, aed(35), aed(2345)],
    ['16', 'SKU-1027', 'Filter Element FE-200', 'Filters', 'European DC', 'WH-004', 14, 20, aed(62), aed(868)],
    ['17', 'SKU-1026', 'Bearing 6204-2RS', 'Bearings', 'Main Distribution Center', 'WH-001', 230, 100, aed(18), aed(4140)],
    ['18', 'SKU-1025', 'Gearbox 5:1 Ratio', 'Mechanical', 'West Coast Facility', 'WH-002', 9, 8, aed(850), aed(7650)],
    ['19', 'SKU-1024', 'Limit Switch LS-01', 'Sensors', 'East Coast Hub', 'WH-003', 0, 15, aed(42), 0],
    ['20', 'SKU-1023', 'PLC Module CPU-X', 'Electronics', 'European DC', 'WH-004', 7, 5, aed(1850), aed(12950)],
  ];
  const prodStmt = db.prepare('INSERT INTO products (id, sku, name, category, warehouse, warehouse_code, quantity, reorder_level, unit_cost, stock_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  products.forEach(p => prodStmt.run(p));
  prodStmt.finalize();

  // Employees (salaries in AED)
  const employees = [
    ['EMP-001', 'Sarah Chen', 'Engineering', 'Senior Developer', 'sarah.chen@usseacargo.com', '+971 55-0101', '2021-03-15', 'Active', '#2563EB', aed(125000), 'David Kim', 'Full-time', '1990-05-12', 'Female', '123 Oak St, JLT, Dubai'],
    ['EMP-002', 'Michael Johnson', 'Sales', 'Sales Manager', 'mike.j@usseacargo.com', '+971 55-0102', '2020-06-01', 'Active', '#10B981', aed(105000), 'Amy Foster', 'Full-time', '1985-08-22', 'Male', '456 Pine Ave, Downtown Dubai'],
    ['EMP-003', 'Lisa Park', 'Marketing', 'Marketing Lead', 'lisa.park@usseacargo.com', '+971 55-0103', '2022-01-10', 'Active', '#F59E0B', aed(85000), 'Amy Foster', 'Full-time', '1992-11-03', 'Female', '789 Maple Dr, Dubai Marina'],
    ['EMP-004', 'David Kim', 'Engineering', 'DevOps Engineer', 'david.kim@usseacargo.com', '+971 55-0104', '2021-09-20', 'Active', '#8B5CF6', aed(110000), 'Sarah Chen', 'Full-time', '1988-02-17', 'Male', '321 Elm St, Business Bay, Dubai'],
    ['EMP-005', 'Emily Watson', 'HR', 'HR Specialist', 'emily.w@usseacargo.com', '+971 55-0105', '2022-04-05', 'Active', '#06B6D4', aed(70000), 'Robert Taylor', 'Full-time', '1994-07-30', 'Female', '654 Birch Ln, Mirdif, Dubai'],
    ['EMP-006', 'Robert Taylor', 'Finance', 'Financial Analyst', 'rob.t@usseacargo.com', '+971 55-0106', '2020-11-12', 'On Leave', '#F43F5E', aed(95000), 'Amy Foster', 'Full-time', '1987-04-08', 'Male', '987 Cedar Rd, DIFC, Dubai'],
    ['EMP-007', 'Jennifer Adams', 'Sales', 'Account Executive', 'jen.a@usseacargo.com', '+971 55-0107', '2023-02-28', 'Active', '#EC4899', aed(75000), 'Michael Johnson', 'Full-time', '1995-09-14', 'Female', '147 Spruce St, JBR, Dubai'],
    ['EMP-008', 'Mark Wilson', 'Engineering', 'Junior Developer', 'mark.w@usseacargo.com', '+971 55-0108', '2023-06-15', 'Active', '#14B8A6', aed(50000), 'Sarah Chen', 'Full-time', '1998-01-25', 'Male', '258 Willow Ave, Al Barsha, Dubai'],
    ['EMP-009', 'Amy Foster', 'Operations', 'Operations Manager', 'amy.f@usseacargo.com', '+971 55-0109', '2019-08-01', 'Active', '#F97316', aed(95000), 'Board', 'Full-time', '1983-12-05', 'Female', '369 Aspen Dr, Palm Jumeirah, Dubai'],
    ['EMP-010', 'Chris Martinez', 'Marketing', 'Content Strategist', 'chris.m@usseacargo.com', '+971 55-0110', '2023-09-01', 'Active', '#6366F1', aed(60000), 'Lisa Park', 'Full-time', '1996-03-18', 'Male', '753 Redwood St, City Walk, Dubai'],
    ['EMP-011', 'Daniel Lee', 'Finance', 'Accountant', 'daniel.l@usseacargo.com', '+971 55-0111', '2021-01-20', 'Terminated', '#64748B', aed(80000), 'Robert Taylor', 'Full-time', '1989-06-09', 'Male', '159 Cypress Ln, Deira, Dubai'],
    ['EMP-012', 'Rachel Green', 'Engineering', 'QA Engineer', 'rachel.g@usseacargo.com', '+971 55-0112', '2022-07-11', 'Active', '#D946EF', aed(75000), 'Sarah Chen', 'Full-time', '1993-10-27', 'Female', '357 Dogwood Rd, Dubai Silicon Oasis'],
  ];
  const empStmt = db.prepare('INSERT INTO employees (id, name, department, position, email, phone, joined, status, color, salary, manager, type, dob, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  employees.forEach(e => empStmt.run(e));
  empStmt.finalize();

  // Leave Requests
  const leaveRequests = [
    ['LEAV-001', 'Robert Taylor', 'EMP-006', 'Annual Leave', '2024-06-24', '2024-07-05', 10, 'Family vacation to Bali', 'Approved'],
    ['LEAV-002', 'Lisa Park', 'EMP-003', 'Sick Leave', '2024-06-20', '2024-06-21', 2, 'Flu - doctor confirmed', 'Approved'],
    ['LEAV-003', 'Mark Wilson', 'EMP-008', 'Annual Leave', '2024-06-28', '2024-07-02', 5, 'Personal time off', 'Pending'],
    ['LEAV-004', 'Chris Martinez', 'EMP-010', 'Sick Leave', '2024-06-22', '2024-06-22', 1, 'Dental appointment', 'Approved'],
    ['LEAV-005', 'Jennifer Adams', 'EMP-007', 'Annual Leave', '2024-07-08', '2024-07-12', 5, 'Summer break', 'Pending'],
    ['LEAV-006', 'David Kim', 'EMP-004', 'Unpaid Leave', '2024-06-17', '2024-06-18', 2, 'Personal matter', 'Approved'],
    ['LEAV-007', 'Amy Foster', 'EMP-009', 'Emergency', '2024-06-19', '2024-06-19', 1, 'Family emergency', 'Approved'],
    ['LEAV-008', 'Emily Watson', 'EMP-005', 'Annual Leave', '2024-07-15', '2024-07-19', 5, 'Visiting family', 'Pending'],
    ['LEAV-009', 'Michael Johnson', 'EMP-002', 'Sick Leave', '2024-06-10', '2024-06-11', 2, 'Migraine', 'Approved'],
    ['LEAV-010', 'Rachel Green', 'EMP-012', 'Annual Leave', '2024-08-01', '2024-08-14', 10, 'Extended holiday', 'Pending'],
  ];
  const lrStmt = db.prepare('INSERT INTO leave_requests (id, employee, employee_id, type, date_from, date_to, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  leaveRequests.forEach(l => lrStmt.run(l));
  lrStmt.finalize();

  // Recruitment
  const recruitment = [
    ['CAND-001', 'Alex Rivera', 'Senior Developer', '2024-06-24', 6, 'LinkedIn', 'Applied', ''],
    ['CAND-002', 'Priya Sharma', 'UX Designer', '2024-06-23', 4, 'Referral', 'Applied', ''],
    ['CAND-003', 'Kevin O\'Brien', 'Sales Rep', '2024-06-22', 3, 'Indeed', 'Applied', ''],
    ['CAND-004', 'Nina Petrov', 'Data Analyst', '2024-06-21', 2, 'Website', 'Applied', ''],
    ['CAND-005', 'Jason Wright', 'Senior Developer', '2024-06-18', 8, 'LinkedIn', 'Screening', ''],
    ['CAND-006', 'Sofia Reyes', 'Marketing Specialist', '2024-06-17', 5, 'Referral', 'Screening', ''],
    ['CAND-007', 'Brian Foster', 'DevOps Engineer', '2024-06-15', 7, 'LinkedIn', 'Interview', ''],
    ['CAND-008', 'Hannah Lee', 'HR Coordinator', '2024-06-14', 4, 'Indeed', 'Interview', ''],
    ['CAND-009', 'Marcus Johnson', 'Accountant', '2024-06-12', 6, 'Website', 'Interview', ''],
    ['CAND-010', 'Laura Chen', 'QA Engineer', '2024-06-10', 5, 'Referral', 'Offer', ''],
    ['CAND-011', 'Derek Smith', 'Product Manager', '2024-06-08', 9, 'LinkedIn', 'Offer', ''],
    ['CAND-012', 'Olivia Brown', 'Junior Developer', '2024-06-01', 1, 'University', 'Hired', '2024-07-01'],
  ];
  const recStmt = db.prepare('INSERT INTO recruitment (id, name, position, applied, exp, source, stage, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  recruitment.forEach(r => recStmt.run(r));
  recStmt.finalize();

  // Projects (AED budgets)
  const projects = [
    ['PRJ-001', 'Website Redesign', 'Redesign company website with modern UI/UX.', 62, '2024-07-30', aed(45000), aed(28000), 'Active', 'High', 'Sarah Chen', 'Internal', 'SC,MJ,LP,DK,RA', '2024-05-01', '2024-07-30'],
    ['PRJ-002', 'ERP Module Expansion', 'Add advanced reporting and analytics modules.', 35, '2024-09-15', aed(85000), aed(22000), 'Active', 'Critical', 'David Kim', 'Internal', 'DK,MW,SC,RA', '2024-06-01', '2024-09-15'],
    ['PRJ-003', 'Q3 Marketing Campaign', 'Multi-channel marketing campaign for Q3 launches.', 80, '2024-07-15', aed(25000), aed(20000), 'Active', 'Medium', 'Lisa Park', 'Marketing Dept', 'LP,CM', '2024-06-01', '2024-07-15'],
    ['PRJ-004', 'HR System Migration', 'Migrate HR data to new integrated HR platform.', 15, '2024-10-30', aed(35000), aed(4200), 'Planning', 'Medium', 'Emily Watson', 'HR Dept', 'EW,RJ', '2024-08-01', '2024-10-30'],
    ['PRJ-005', 'Warehouse Automation', 'Barcode scanning and automated inventory tracking.', 100, '2024-06-20', aed(60000), aed(58500), 'Completed', 'High', 'Amy Foster', 'Operations', 'AF,RJ', '2024-04-01', '2024-06-20'],
    ['PRJ-006', 'Customer Portal v2', 'Rebuild customer self-service portal with mobile app.', 50, '2024-08-30', aed(70000), aed(35000), 'Active', 'High', 'Sarah Chen', 'Product Team', 'SC,RG,DK', '2024-05-15', '2024-08-30'],
    ['PRJ-007', 'Financial Audit Prep', 'Prepare documentation for annual financial audit.', 75, '2024-07-10', aed(15000), aed(11200), 'Active', 'Critical', 'Robert Taylor', 'Finance Dept', 'RT,DL', '2024-06-01', '2024-07-10'],
    ['PRJ-008', 'Sales Training Program', 'Comprehensive sales training for new team members.', 0, '2024-08-15', aed(10000), 0, 'On Hold', 'Low', 'Michael Johnson', 'Sales Dept', 'MJ,SK', '2024-07-15', '2024-08-15'],
    ['PRJ-009', 'Mobile App Launch', 'Launch native iOS and Android apps.', 45, '2024-09-30', aed(95000), aed(38000), 'Active', 'High', 'David Kim', 'Product Team', 'DK,RG,MW,SC', '2024-05-01', '2024-09-30'],
    ['PRJ-010', 'Data Security Upgrade', 'Upgrade security infrastructure and compliance protocols.', 20, '2024-11-15', aed(55000), aed(8500), 'Planning', 'Critical', 'Mark Wilson', 'IT Security', 'MW,DL', '2024-07-01', '2024-11-15'],
  ];
  const projStmt = db.prepare('INSERT INTO projects (id, name, description, progress, due_date, budget, spent, status, priority, pm, client, team, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  projects.forEach(p => projStmt.run(p));
  projStmt.finalize();

  // Tasks
  const tasks = [
    ['T-001', 'Set up CI/CD pipeline', 'ERP Module Expansion', '2024-07-01', 'David Kim', 'High', 'To Do', 1, 0, 0, '', 'DevOps'],
    ['T-002', 'Write API documentation', 'ERP Module Expansion', '2024-07-10', 'Mark Wilson', 'Medium', 'To Do', 0, 2, 1, '', 'Documentation'],
    ['T-003', 'Create social media assets', 'Q3 Marketing Campaign', '2024-07-05', 'Lisa Park', 'High', 'To Do', 2, 1, 3, '', 'Design'],
    ['T-004', 'Design email templates', 'Q3 Marketing Campaign', '2024-07-08', 'Chris Martinez', 'Medium', 'To Do', 0, 0, 0, '', 'Design'],
    ['T-005', 'Employee data mapping', 'HR System Migration', '2024-08-01', 'Emily Watson', 'Critical', 'To Do', 1, 3, 2, '', 'Data'],
    ['T-006', 'Design homepage hero section', 'Website Redesign', '2024-07-02', 'Sarah Chen', 'High', 'In Progress', 3, 2, 1, '', 'Design'],
    ['T-007', 'Build component library', 'Website Redesign', '2024-07-10', 'Rachel Green', 'High', 'In Progress', 1, 4, 0, '', 'Development'],
    ['T-008', 'Implement analytics dashboard', 'ERP Module Expansion', '2024-07-15', 'Sarah Chen', 'Critical', 'In Progress', 2, 5, 1, '', 'Development'],
    ['T-009', 'Set up report templates', 'Financial Audit Prep', '2024-07-05', 'Robert Taylor', 'High', 'In Progress', 0, 1, 2, '', 'Reporting'],
    ['T-010', 'Homepage responsive testing', 'Website Redesign', '2024-07-03', 'David Kim', 'Medium', 'Review', 1, 2, 0, '', 'Testing'],
    ['T-011', 'Campaign performance report', 'Q3 Marketing Campaign', '2024-07-01', 'Lisa Park', 'Medium', 'Review', 0, 3, 1, '', 'Reporting'],
    ['T-012', 'Audit reconciliation sheet', 'Financial Audit Prep', '2024-07-08', 'Daniel Lee', 'Critical', 'Review', 2, 1, 4, '', 'Finance'],
    ['T-013', 'Design mockups approval', 'Website Redesign', '2024-06-15', 'Sarah Chen', 'High', 'Done', 5, 2, 3, '2024-06-14', 'Design'],
    ['T-014', 'Frontend framework setup', 'Website Redesign', '2024-06-20', 'David Kim', 'High', 'Done', 2, 1, 0, '2024-06-18', 'Development'],
    ['T-015', 'Campaign strategy doc', 'Q3 Marketing Campaign', '2024-06-25', 'Lisa Park', 'Medium', 'Done', 1, 3, 2, '2024-06-24', 'Documentation'],
    ['T-016', 'Inventory scanner config', 'Warehouse Automation', '2024-06-15', 'Amy Foster', 'High', 'Done', 3, 0, 1, '2024-06-12', 'Configuration'],
    ['T-017', 'User authentication module', 'Customer Portal v2', '2024-07-12', 'Rachel Green', 'High', 'Done', 2, 1, 0, '2024-07-08', 'Development'],
    ['T-018', 'Database schema design', 'Customer Portal v2', '2024-06-30', 'David Kim', 'Critical', 'Done', 4, 3, 1, '2024-06-28', 'Database'],
    ['T-019', 'Security audit review', 'Data Security Upgrade', '2024-07-15', 'Mark Wilson', 'Critical', 'Done', 1, 2, 2, '2024-07-05', 'Security'],
    ['T-020', 'Mobile API endpoints', 'Mobile App Launch', '2024-07-05', 'Sarah Chen', 'High', 'Done', 2, 4, 1, '2024-07-01', 'API'],
  ];
  const taskStmt = db.prepare('INSERT INTO tasks (id, title, project, due_date, assignee, priority, status, likes, comments, attachments, completed, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  tasks.forEach(t => taskStmt.run(t));
  taskStmt.finalize();

  // Accounts (AED)
  const accounts = [
    ['1000', 'Assets', 'Asset', 'Balance Sheet', aed(2847500), 'Active', 1, 0],
    ['1100', 'Cash & Equivalents', 'Asset', 'Current Asset', aed(425000), 'Active', 0, 1],
    ['1110', 'Petty Cash', 'Asset', 'Current Asset', aed(5000), 'Active', 0, 2],
    ['1120', 'Checking Account', 'Asset', 'Current Asset', aed(280000), 'Active', 0, 2],
    ['1130', 'Savings Account', 'Asset', 'Current Asset', aed(140000), 'Active', 0, 2],
    ['1200', 'Accounts Receivable', 'Asset', 'Current Asset', aed(625000), 'Active', 0, 1],
    ['1300', 'Inventory', 'Asset', 'Current Asset', aed(380000), 'Active', 0, 1],
    ['1310', 'Raw Materials', 'Asset', 'Current Asset', aed(120000), 'Active', 0, 2],
    ['1320', 'Finished Goods', 'Asset', 'Current Asset', aed(260000), 'Active', 0, 2],
    ['1400', 'Fixed Assets', 'Asset', 'Non-Current', aed(1417500), 'Active', 0, 1],
    ['1410', 'Equipment', 'Asset', 'Non-Current', aed(325000), 'Active', 0, 2],
    ['1420', 'Buildings', 'Asset', 'Non-Current', aed(950000), 'Active', 0, 2],
    ['1430', 'Accumulated Depreciation', 'Asset', 'Non-Current', -aed(142500), 'Active', 0, 2],
    ['2000', 'Liabilities', 'Liability', 'Balance Sheet', aed(875000), 'Active', 1, 0],
    ['2100', 'Accounts Payable', 'Liability', 'Current Liability', aed(320000), 'Active', 0, 1],
    ['2200', 'Short-term Loans', 'Liability', 'Current Liability', aed(150000), 'Active', 0, 1],
    ['2300', 'Long-term Debt', 'Liability', 'Non-Current', aed(405000), 'Active', 0, 1],
    ['3000', 'Equity', 'Equity', 'Balance Sheet', aed(1972500), 'Active', 1, 0],
    ['3100', 'Owner\'s Capital', 'Equity', 'Equity', aed(1200000), 'Active', 0, 1],
    ['3200', 'Retained Earnings', 'Equity', 'Equity', aed(772500), 'Active', 0, 1],
    ['4000', 'Revenue', 'Revenue', 'Income Statement', aed(1245890), 'Active', 1, 0],
    ['4100', 'Product Sales', 'Revenue', 'Operating', aed(890000), 'Active', 0, 1],
    ['4200', 'Service Revenue', 'Revenue', 'Operating', aed(310000), 'Active', 0, 1],
    ['4300', 'Other Income', 'Revenue', 'Non-Operating', aed(45890), 'Active', 0, 1],
    ['5000', 'Expenses', 'Expense', 'Income Statement', aed(487320), 'Active', 1, 0],
    ['5100', 'Salaries & Wages', 'Expense', 'Operating', aed(185000), 'Active', 0, 1],
    ['5200', 'Rent Expense', 'Expense', 'Operating', aed(45000), 'Active', 0, 1],
    ['5300', 'Marketing', 'Expense', 'Operating', aed(72000), 'Active', 0, 1],
    ['5400', 'Utilities', 'Expense', 'Operating', aed(28000), 'Active', 0, 1],
    ['5500', 'Depreciation', 'Expense', 'Operating', aed(85000), 'Active', 0, 1],
    ['5600', 'Office Supplies', 'Expense', 'Operating', aed(22000), 'Active', 0, 1],
    ['5700', 'Miscellaneous', 'Expense', 'Operating', aed(50320), 'Active', 0, 1],
  ];
  const accStmt = db.prepare('INSERT INTO accounts (code, name, type, category, balance, status, bold, indent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  accounts.forEach(a => accStmt.run(a));
  accStmt.finalize();

  // Journal Entries (AED)
  const journalEntries = [
    ['je-128', 'JE-2024-00128', '2024-06-24', 'Monthly salary payment', aed(85200), aed(85200), 'Posted', JSON.stringify([{ account: '5100 - Salaries & Wages', debit: aed(85200), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(85200) }])],
    ['je-127', 'JE-2024-00127', '2024-06-23', 'Office rent payment Q3', aed(45000), aed(45000), 'Posted', JSON.stringify([{ account: '5200 - Rent Expense', debit: aed(45000), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(45000) }])],
    ['je-126', 'JE-2024-00126', '2024-06-22', 'Marketing campaign deposit', aed(12500), aed(12500), 'Posted', JSON.stringify([{ account: '5300 - Marketing', debit: aed(12500), credit: 0 }, { account: '2100 - Accounts Payable', debit: 0, credit: aed(12500) }])],
    ['je-125', 'JE-2024-00125', '2024-06-21', 'Service revenue - TechCorp', aed(12500), aed(12500), 'Posted', JSON.stringify([{ account: '1200 - Accounts Receivable', debit: aed(12500), credit: 0 }, { account: '4200 - Service Revenue', debit: 0, credit: aed(12500) }])],
    ['je-124', 'JE-2024-00124', '2024-06-20', 'Equipment purchase', aed(65000), aed(65000), 'Draft', JSON.stringify([{ account: '1400 - Fixed Assets', debit: aed(65000), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(65000) }])],
    ['je-123', 'JE-2024-00123', '2024-06-19', 'Inventory purchase', aed(25000), aed(25000), 'Posted', JSON.stringify([{ account: '1300 - Inventory', debit: aed(25000), credit: 0 }, { account: '2100 - Accounts Payable', debit: 0, credit: aed(25000) }])],
    ['je-122', 'JE-2024-00122', '2024-06-18', 'AWS hosting services', aed(4800), aed(4800), 'Posted', JSON.stringify([{ account: '5400 - Utilities', debit: aed(4800), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(4800) }])],
    ['je-121', 'JE-2024-00121', '2024-06-17', 'Product sale - Invoice 0042', aed(12500), aed(12500), 'Posted', JSON.stringify([{ account: '1100 - Cash & Equivalents', debit: aed(12500), credit: 0 }, { account: '4100 - Product Sales', debit: 0, credit: aed(12500) }])],
    ['je-120', 'JE-2024-00120', '2024-06-16', 'Client payment received', aed(23400), aed(23400), 'Posted', JSON.stringify([{ account: '1100 - Cash & Equivalents', debit: aed(23400), credit: 0 }, { account: '1200 - Accounts Receivable', debit: 0, credit: aed(23400) }])],
    ['je-119', 'JE-2024-00119', '2024-06-15', 'Depreciation entry', aed(85000), aed(85000), 'Posted', JSON.stringify([{ account: '5500 - Depreciation', debit: aed(85000), credit: 0 }, { account: '1400 - Fixed Assets', debit: 0, credit: aed(85000) }])],
    ['je-118', 'JE-2024-00118', '2024-06-14', 'Office supplies purchase', aed(3200), aed(3200), 'Posted', JSON.stringify([{ account: '5600 - Office Supplies', debit: aed(3200), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(3200) }])],
    ['je-117', 'JE-2024-00117', '2024-06-13', 'Miscellaneous expense reimbursement', aed(1870), aed(1870), 'Posted', JSON.stringify([{ account: '5700 - Miscellaneous', debit: aed(1870), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(1870) }])],
    ['je-116', 'JE-2024-00116', '2024-06-12', 'Utility bill - electricity', aed(3400), aed(3400), 'Posted', JSON.stringify([{ account: '5400 - Utilities', debit: aed(3400), credit: 0 }, { account: '2100 - Accounts Payable', debit: 0, credit: aed(3400) }])],
    ['je-115', 'JE-2024-00115', '2024-06-11', 'Loan repayment', aed(12500), aed(12500), 'Posted', JSON.stringify([{ account: '2200 - Short-term Loans', debit: aed(12500), credit: 0 }, { account: '1100 - Cash & Equivalents', debit: 0, credit: aed(12500) }])],
    ['je-114', 'JE-2024-00114', '2024-06-10', 'Product sale - Invoice 0041', aed(28500), aed(28500), 'Posted', JSON.stringify([{ account: '1100 - Cash & Equivalents', debit: aed(28500), credit: 0 }, { account: '4100 - Product Sales', debit: 0, credit: aed(28500) }])],
  ];
  const jeStmt = db.prepare('INSERT INTO journal_entries (id, entry_number, date, description, debits, credits, status, lines) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  journalEntries.forEach(j => jeStmt.run(j));
  jeStmt.finalize();

  // Shipping Documents
  const shippingDocuments = [
    ['1', 'MBL', 'MBL-2024-0891', 'REF-4521', '2024-01-15', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
    ['2', 'MBL', 'MBL-2024-0892', 'REF-4523', '2024-01-16', 'Approved', 'Sunrise Manufacturing', 'Desert Logistics LLC', 'Jebel Ali'],
    ['3', 'MBL', 'MBL-2024-0895', 'REF-4530', '2024-01-18', 'Submitted', 'Pacific Exports Inc.', 'Al Futtaim Group', 'Khalifa Port'],
    ['4', 'MBL', 'MBL-2024-0898', 'REF-4535', '2024-01-20', 'Draft', 'EuroCargo GmbH', 'Emirates Freight', 'Jebel Ali'],
    ['5', 'MBL', 'MBL-2024-0901', 'REF-4540', '2024-01-22', 'Approved', 'AsiaTech Industries', 'Dubai Trade Co.', 'Khalifa Port'],
    ['6', 'MBL', 'MBL-2024-0904', 'REF-4545', '2024-01-24', 'Rejected', 'Global Foods Ltd.', 'Sharjah Imports', 'Zayed Port'],
    ['7', 'HBL', 'HBL-FF-240115-01', 'REF-4521', '2024-01-15', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
    ['8', 'HBL', 'HBL-FF-240116-02', 'REF-4523', '2024-01-16', 'Submitted', 'Sunrise Manufacturing', 'Desert Logistics LLC', 'Jebel Ali'],
    ['9', 'HBL', 'HBL-FF-240118-03', 'REF-4530', '2024-01-18', 'Approved', 'Pacific Exports Inc.', 'Al Futtaim Group', 'Khalifa Port'],
    ['10', 'D.O.', 'DO-2024-0156', 'REF-4521', '2024-01-18', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
    ['11', 'D.O.', 'DO-2024-0157', 'REF-4523', '2024-01-19', 'Approved', 'Sunrise Manufacturing', 'Desert Logistics LLC', 'Jebel Ali'],
    ['12', 'NOC', 'NOC-2024-0045', 'HAZ-4521', '2024-01-10', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
    ['13', 'NOC', 'NOC-2024-0046', 'HAZ-4523', '2024-01-11', 'Approved', 'Sunrise Manufacturing', 'Desert Logistics LLC', 'Jebel Ali'],
    ['14', 'P/L', 'PL-2024-0234', 'REF-4521', '2024-01-14', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
    ['15', 'C.I.', 'CI-2024-0345', 'REF-4521', '2024-01-14', 'Approved', 'ABC Electronics Ltd.', 'Gulf Trading Co.', 'Jebel Ali'],
  ];
  const docStmt = db.prepare('INSERT INTO shipping_documents (id, doc_type, doc_number, reference, date, status, shipper, consignee, port) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  shippingDocuments.forEach(d => docStmt.run(d));
  docStmt.finalize();

  // Tax Rates (UAE VAT 5%)
  const taxRates = [
    ['tax-001', 'VAT Standard', 5, 'VAT', 'All goods and services', '2018-01-01', 'Active'],
    ['tax-002', 'VAT Zero Rate', 0, 'VAT', 'Exports, education, healthcare', '2018-01-01', 'Active'],
    ['tax-003', 'VAT Exempt', 0, 'VAT', 'Financial services, residential', '2018-01-01', 'Active'],
    ['tax-004', 'Corporate Tax', 9, 'Income Tax', 'Business profits above AED 375,000', '2023-06-01', 'Active'],
  ];
  const taxStmt = db.prepare('INSERT INTO tax_rates (id, name, rate, type, applies, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  taxRates.forEach(t => taxStmt.run(t));
  taxStmt.finalize();

  console.log('[Seed] All demo data inserted with AED currency.');
  console.log('[Seed] Base currency: AED (UAE Dirham)');
  console.log('[Seed] Default admin user: username=admin, password=admin123');
  console.log('[Seed] Seed complete!');
});

// Close database after seeding
setTimeout(() => {
  db.close();
  console.log('[Seed] Database connection closed.');
  process.exit(0);
}, 1000);
