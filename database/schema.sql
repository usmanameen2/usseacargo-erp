-- USSeaCargo ERP Database Schema v3.0

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','manager','staff')),
  company_name TEXT,
  phone TEXT,
  avatar_initials TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
  notes TEXT,
  total_spent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  rating INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
  total_orders INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  warehouse_id INTEGER,
  quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'in_stock' CHECK(status IN ('in_stock','low_stock','out_of_stock')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  manager TEXT,
  capacity_sqm INTEGER DEFAULT 0,
  contact_phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Employees
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  manager_id INTEGER,
  join_date TEXT,
  salary REAL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','on_leave','terminated')),
  avatar_initials TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  employee_name TEXT,
  leave_type TEXT NOT NULL CHECK(leave_type IN ('annual','sick','unpaid','maternity','emergency')),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  approved_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 8. Recruitment Candidates
CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  stage TEXT DEFAULT 'applied' CHECK(stage IN ('applied','screening','interview','offer','hired','rejected')),
  applied_date TEXT,
  experience_years INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  manager_id INTEGER,
  budget REAL DEFAULT 0,
  spent REAL DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','on_hold','completed','cancelled')),
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 10. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  task_name TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER,
  stage TEXT DEFAULT 'todo' CHECK(stage IN ('todo','in_progress','review','done')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 11. Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quote_number TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  date TEXT,
  valid_until TEXT,
  items_json TEXT,
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 12. Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_number TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  date TEXT,
  items_json TEXT,
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 13. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  invoice_number TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  date TEXT,
  due_date TEXT,
  items_json TEXT,
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 14. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  po_number TEXT,
  supplier_id INTEGER,
  supplier_name TEXT,
  date TEXT,
  expected_delivery TEXT,
  items_json TEXT,
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','partial','received')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 15. Pipeline Deals
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  deal_name TEXT NOT NULL,
  customer_id INTEGER,
  customer_name TEXT,
  stage TEXT DEFAULT 'lead' CHECK(stage IN ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
  value REAL DEFAULT 0,
  expected_close_date TEXT,
  probability INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 16. Shipping Documents (CRITICAL - MBL, HBL, D.O., NOC, etc.)
CREATE TABLE IF NOT EXISTS shipping_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('MBL','HBL','DO','NOC','PL','CI','CO','BE','SI','MFT')),
  doc_number TEXT NOT NULL,
  reference TEXT,
  date TEXT,
  vessel_voyage TEXT,
  shipper TEXT,
  consignee TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  container_number TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rejected')),
  file_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 17. Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_number TEXT,
  rotation_number TEXT,
  vessel_name TEXT,
  carrier_scac TEXT,
  shipper TEXT,
  consignee TEXT,
  mode TEXT CHECK(mode IN ('FCL','LCL')),
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  origin TEXT,
  destination TEXT,
  etd TEXT,
  eta TEXT,
  status TEXT DEFAULT 'booking_confirmed' CHECK(status IN ('booking_confirmed','in_transit','at_port','customs','released','delivered')),
  incoterm TEXT CHECK(incoterm IN ('EXW','FOB','CIF','DDP')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 18. Charges
CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  charge_code TEXT NOT NULL,
  charge_name TEXT NOT NULL,
  description TEXT,
  calculation_method TEXT,
  rate REAL DEFAULT 0,
  applicable_to TEXT CHECK(applicable_to IN ('FCL','LCL','both')),
  currency TEXT DEFAULT 'AED',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 19. Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_name TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  registration_number TEXT,
  fiscal_year_start TEXT,
  base_currency TEXT DEFAULT 'AED',
  decimal_places INTEGER DEFAULT 2,
  timezone TEXT DEFAULT 'Asia/Dubai',
  vat_rate REAL DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 20. Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
