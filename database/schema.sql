-- =====================================================
-- ERP Flow - Complete Database Schema
-- Multi-tenant SQLite database with user_id isolation
-- =====================================================

-- -----------------------------------------------------
-- 1. Users (tenants / company accounts)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','manager','accountant','staff')),
  company_name TEXT,
  phone TEXT,
  avatar_initials TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------
-- 2. Chart of Accounts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','expense')),
  category TEXT,
  parent_id INTEGER DEFAULT NULL,
  balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_coa_user_id ON chart_of_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);

-- -----------------------------------------------------
-- 3. Journal Entries
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  entry_number TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  reference TEXT,
  total_debit REAL NOT NULL DEFAULT 0,
  total_credit REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted')),
  lines TEXT, -- JSON array of {account_id, debit, credit, description}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_je_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(date);

-- -----------------------------------------------------
-- 4. Customers
-- -----------------------------------------------------
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
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  total_spent REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cust_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_cust_status ON customers(status);

-- -----------------------------------------------------
-- 5. Quotations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  quote_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  valid_until TEXT,
  items TEXT, -- JSON array
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quote_user_id ON quotations(user_id);

-- -----------------------------------------------------
-- 6. Sales Orders
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  items TEXT, -- JSON array
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_so_user_id ON sales_orders(user_id);

-- -----------------------------------------------------
-- 7. Invoices
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  order_id INTEGER,
  date TEXT NOT NULL,
  due_date TEXT,
  items TEXT, -- JSON array
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);

-- -----------------------------------------------------
-- 8. Pipeline Deals
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  deal_name TEXT NOT NULL,
  customer_id INTEGER,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
  value REAL NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  probability INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pipe_user_id ON pipeline_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_pipe_stage ON pipeline_deals(stage);

-- -----------------------------------------------------
-- 9. Suppliers
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  rating REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  total_orders INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supp_user_id ON suppliers(user_id);

-- -----------------------------------------------------
-- 10. Purchase Orders
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  po_number TEXT NOT NULL,
  supplier_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  expected_delivery TEXT,
  items TEXT, -- JSON array
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','partial','received','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_po_user_id ON purchase_orders(user_id);

-- -----------------------------------------------------
-- 11. Warehouses
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  manager TEXT,
  capacity_sqm REAL,
  contact_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wh_user_id ON warehouses(user_id);

-- -----------------------------------------------------
-- 12. Products
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  warehouse_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK(status IN ('in_stock','low_stock','out_of_stock')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_warehouse ON products(warehouse_id);

-- -----------------------------------------------------
-- 13. Employees
-- -----------------------------------------------------
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
  salary REAL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_leave','terminated')),
  avatar_initials TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_emp_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department);

-- -----------------------------------------------------
-- 14. Attendance
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','leave','holiday','weekend')),
  check_in TEXT,
  check_out TEXT,
  hours_worked REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_att_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, date);

-- -----------------------------------------------------
-- 15. Leave Requests
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL CHECK(leave_type IN ('annual','sick','unpaid','maternity','emergency')),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  approved_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lr_user_id ON leave_requests(user_id);

-- -----------------------------------------------------
-- 16. Payroll Records
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  overtime REAL NOT NULL DEFAULT 0,
  bonus REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net_pay REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','processed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pr_user_id ON payroll_records(user_id);

-- -----------------------------------------------------
-- 17. Recruitment Candidates
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  stage TEXT NOT NULL DEFAULT 'applied' CHECK(stage IN ('applied','screening','interview','offer','hired','rejected')),
  applied_date TEXT,
  experience_years REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rc_user_id ON recruitment_candidates(user_id);

-- -----------------------------------------------------
-- 18. Projects
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  client TEXT,
  description TEXT,
  manager_id INTEGER,
  budget REAL,
  spent REAL NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_hold','completed','cancelled')),
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_proj_user_id ON projects(user_id);

-- -----------------------------------------------------
-- 19. Tasks
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER,
  task_name TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER,
  stage TEXT NOT NULL DEFAULT 'todo' CHECK(stage IN ('todo','in_progress','review','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  due_date TEXT,
  tags TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_project ON tasks(project_id);

-- -----------------------------------------------------
-- 20. Timesheets
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  project_id INTEGER,
  task_id INTEGER,
  date TEXT NOT NULL,
  hours REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ts_user_id ON timesheets(user_id);

-- -----------------------------------------------------
-- 21. Milestones
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  milestone_name TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
  completed_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ms_user_id ON milestones(user_id);

-- -----------------------------------------------------
-- 22. Shipping Documents
-- -----------------------------------------------------
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rejected')),
  file_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sd_user_id ON shipping_docs(user_id);

-- -----------------------------------------------------
-- 23. Shipments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_number TEXT NOT NULL,
  rotation_number TEXT,
  vessel_name TEXT,
  carrier_scac TEXT,
  shipper TEXT,
  consignee TEXT,
  mode TEXT CHECK(mode IN ('FCL','LCL')),
  container_type TEXT,
  container_count INTEGER DEFAULT 0,
  origin TEXT,
  destination TEXT,
  etd TEXT,
  eta TEXT,
  status TEXT NOT NULL DEFAULT 'booking_confirmed' CHECK(status IN ('booking_confirmed','in_transit','at_port','customs','released','delivered')),
  incoterm TEXT CHECK(incoterm IN ('EXW','FOB','CIF','DDP')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ship_user_id ON shipments(user_id);

-- -----------------------------------------------------
-- 24. Charges
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  charge_code TEXT NOT NULL,
  charge_name TEXT NOT NULL,
  description TEXT,
  calculation_method TEXT,
  default_rate REAL,
  applicable_to TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ch_user_id ON charges(user_id);

-- -----------------------------------------------------
-- 25. Company Settings
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  company_name TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  registration_number TEXT,
  fiscal_year_start TEXT,
  base_currency TEXT DEFAULT 'USD',
  decimal_places INTEGER DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- 26. Notification Settings
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  push_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, category)
);

-- -----------------------------------------------------
-- 27. Activity Log
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_al_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_al_created ON activity_log(created_at);
