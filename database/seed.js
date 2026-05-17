/**
 * ERP Flow - Database Seeder
 * Populates all tables with realistic demo data
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const DB_FILE = path.join(__dirname, 'erp.db');

async function seed() {
  // Delete existing database to start fresh
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('[Seed] Removed existing database file.');
  }

  // Initialize database
  await db.init();
  console.log('[Seed] Database initialized.');

// ============================================================
// SEED DATA
// ============================================================

// --- 1. Users ---
const passwordHash = bcrypt.hashSync('admin123', 10);
db.prepare(
  `INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run('admin', passwordHash, 'admin@erpflow.com', 'System Administrator', 'admin', 'ERP Flow Demo Inc.', '+1-555-0100', 'AD', 1);
// sql.js doesn't support last_insert_rowid(), so query for the user
const userRow = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
const userId = userRow.id;
console.log(`[Seed] Created admin user (id=${userId})`);

// --- 2. Chart of Accounts ---
const coaData = [
  [userId, '1000', 'Cash and Equivalents', 'asset', 'Current Asset', null, 125000, 1],
  [userId, '1010', 'Petty Cash', 'asset', 'Current Asset', 1, 2500, 1],
  [userId, '1100', 'Accounts Receivable', 'asset', 'Current Asset', null, 87500, 1],
  [userId, '1200', 'Inventory', 'asset', 'Current Asset', null, 156000, 1],
  [userId, '1210', 'Raw Materials', 'asset', 'Current Asset', 4, 68000, 1],
  [userId, '1220', 'Finished Goods', 'asset', 'Current Asset', 4, 88000, 1],
  [userId, '1500', 'Equipment', 'asset', 'Fixed Asset', null, 45000, 1],
  [userId, '1510', 'Accumulated Depreciation', 'asset', 'Fixed Asset', null, -15000, 1],
  [userId, '1600', 'Office Furniture', 'asset', 'Fixed Asset', null, 12000, 1],
  [userId, '1700', 'Vehicles', 'asset', 'Fixed Asset', null, 35000, 1],
  [userId, '2000', 'Accounts Payable', 'liability', 'Current Liability', null, 62000, 1],
  [userId, '2100', 'Short-term Loans', 'liability', 'Current Liability', null, 25000, 1],
  [userId, '2200', 'Accrued Expenses', 'liability', 'Current Liability', null, 18000, 1],
  [userId, '2300', 'Taxes Payable', 'liability', 'Current Liability', null, 22000, 1],
  [userId, '2500', 'Long-term Debt', 'liability', 'Long-term Liability', null, 75000, 1],
  [userId, '3000', "Owner's Equity", 'equity', 'Equity', null, 150000, 1],
  [userId, '3100', 'Retained Earnings', 'equity', 'Equity', null, 115500, 1],
  [userId, '3200', 'Common Stock', 'equity', 'Equity', null, 50000, 1],
  [userId, '4000', 'Sales Revenue', 'revenue', 'Operating Revenue', null, 0, 1],
  [userId, '4100', 'Service Revenue', 'revenue', 'Operating Revenue', null, 0, 1],
  [userId, '4200', 'Consulting Revenue', 'revenue', 'Operating Revenue', null, 0, 1],
  [userId, '4900', 'Other Income', 'revenue', 'Non-operating', null, 0, 1],
  [userId, '5000', 'Cost of Goods Sold', 'expense', 'Direct Cost', null, 0, 1],
  [userId, '6000', 'Salaries and Wages', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6100', 'Rent Expense', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6200', 'Utilities', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6300', 'Office Supplies', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6400', 'Depreciation Expense', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6500', 'Marketing Expense', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6600', 'Travel Expense', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '6700', 'Insurance Expense', 'expense', 'Operating Expense', null, 0, 1],
  [userId, '7000', 'Interest Expense', 'expense', 'Non-operating', null, 0, 1],
];

const insertCOA = db.prepare(`INSERT INTO chart_of_accounts (user_id, account_code, account_name, account_type, category, parent_id, balance, is_active) VALUES (?,?,?,?,?,?,?,?)`);
for (const row of coaData) insertCOA.run(row);
console.log(`[Seed] ${coaData.length} chart of accounts created.`);

// --- 3. Customers ---
const customerData = [
  [userId, 'Acme Corporation', 'Acme Corp', 'acme@example.com', '+1-555-0101', '123 Main St', 'New York', 'USA', 'active', 125000, 'Key enterprise client'],
  [userId, 'Globex Industries', 'Globex', 'contact@globex.com', '+1-555-0102', '456 Oak Ave', 'Chicago', 'USA', 'active', 87000, 'Manufacturing partner'],
  [userId, 'Soylent Corp', 'Soylent', 'info@soylent.com', '+1-555-0103', '789 Pine Rd', 'San Francisco', 'USA', 'active', 45000, 'Food tech startup'],
  [userId, 'Initech LLC', 'Initech', 'support@initech.com', '+1-555-0104', '321 Elm St', 'Austin', 'USA', 'active', 63000, 'Software services'],
  [userId, 'Umbrella Corp', 'Umbrella', 'procurement@umbrella.com', '+44-555-0105', '100 Biotech Way', 'London', 'UK', 'active', 210000, 'Pharmaceutical giant'],
  [userId, 'Stark Industries', 'Stark', 'pepper@stark.com', '+1-555-0106', '200 Malibu Point', 'Malibu', 'USA', 'active', 340000, 'Defense contractor'],
  [userId, 'Wayne Enterprises', 'Wayne Ent', 'ceo@wayne.com', '+1-555-0107', '1 Wayne Tower', 'Gotham', 'USA', 'active', 180000, 'Conglomerate'],
  [userId, 'Cyberdyne Systems', 'Cyberdyne', 'sales@cyberdyne.com', '+1-555-0108', 'Skynet Blvd', 'Palo Alto', 'USA', 'active', 78000, 'AI research'],
  [userId, 'Massive Dynamic', 'Massive', 'nina@massivedynamic.com', '+1-555-0109', 'Technology Park', 'Boston', 'USA', 'active', 95000, 'Advanced tech'],
  [userId, 'Oceanic Airlines', 'Oceanic', 'cargo@oceanic.com', '+61-555-0110', 'Airport Rd', 'Sydney', 'Australia', 'active', 54000, 'Air freight'],
  [userId, 'Dharma Initiative', 'Dharma', 'station@dharma.com', '+1-555-0111', 'The Island', 'Pacific', 'USA', 'inactive', 12000, 'Research project'],
  [userId, 'Tyrell Corp', 'Tyrell', 'eldon@tyrell.com', '+31-555-0112', 'Tower Block', 'Amsterdam', 'Netherlands', 'active', 67000, 'Biotechnology'],
  [userId, 'Weyland-Yutani', 'Weyland', 'contracts@weyland.com', '+1-555-0113', 'Space Station', 'Houston', 'USA', 'active', 145000, 'Space exploration'],
  [userId, 'Aperture Science', 'Aperture', 'cave@aperture.com', '+1-555-0114', 'Test Facility', 'Cleveland', 'USA', 'active', 38000, 'Research labs'],
  [userId, 'Black Mesa', 'Black Mesa', 'admin@blackmesa.com', '+1-555-0115', 'Anomalous Materials', 'New Mexico', 'USA', 'active', 92000, 'Research facility'],
];
const insertCust = db.prepare(`INSERT INTO customers (user_id, name, company, email, phone, address, city, country, status, total_spent, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of customerData) insertCust.run(row);
console.log(`[Seed] ${customerData.length} customers created.`);

// --- 4. Suppliers ---
const supplierData = [
  [userId, 'TechSource Distribution', 'John Smith', 'john@techsource.com', '+1-555-0201', '100 Tech Blvd, Dallas, TX', 'Electronics', 4.5, 'active', 45],
  [userId, 'Global Freight Partners', 'Maria Garcia', 'maria@gfp.com', '+1-555-0202', '500 Port Way, Miami, FL', 'Logistics', 4.2, 'active', 120],
  [userId, 'Pacific Manufacturing', 'Chen Wei', 'wei@pacificmfg.com', '+86-555-0203', 'Industrial Zone, Shenzhen', 'Manufacturing', 4.0, 'active', 78],
  [userId, 'EuroPackaging Solutions', 'Hans Mueller', 'hans@europack.eu', '+49-555-0204', 'PackStrasse 10, Hamburg', 'Packaging', 3.8, 'active', 34],
  [userId, 'Raw Materials Plus', 'Sarah Johnson', 'sarah@rmp.com', '+1-555-0205', '250 Mine Rd, Denver, CO', 'Raw Materials', 4.7, 'active', 92],
  [userId, 'CloudTech Services', 'David Lee', 'david@cloudtech.io', '+1-555-0206', '1 Cloud Way, Seattle, WA', 'IT Services', 4.3, 'active', 56],
  [userId, 'Office Supplies Direct', 'Linda Brown', 'linda@osd.com', '+1-555-0207', 'Office Park, Atlanta, GA', 'Office', 3.5, 'active', 67],
  [userId, 'Safety First Equipment', 'Robert Wilson', 'rob@safetyfirst.com', '+1-555-0208', 'Safety Lane, Detroit, MI', 'Safety', 4.6, 'active', 23],
  [userId, 'Energy Solutions Inc', 'Patricia Martinez', 'pat@energysol.com', '+1-555-0209', 'Green Blvd, Phoenix, AZ', 'Energy', 4.1, 'active', 41],
  [userId, 'PrintCraft Ltd', 'James Taylor', 'james@printcraft.com', '+44-555-0210', 'Print House, Manchester', 'Printing', 3.9, 'active', 19],
  [userId, 'SteelWorks Corp', 'Michael Chang', 'mike@steelworks.com', '+1-555-0211', 'Steel Mill Rd, Pittsburgh, PA', 'Steel', 4.4, 'active', 55],
  [userId, 'AgriSupply Co', 'Emma Davis', 'emma@agrisupply.com', '+1-555-0212', 'Farm Rd, Des Moines, IA', 'Agriculture', 4.0, 'active', 38],
];
const insertSupp = db.prepare(`INSERT INTO suppliers (user_id, name, contact_person, email, phone, address, category, rating, status, total_orders) VALUES (?,?,?,?,?,?,?,?,?,?)`);
for (const row of supplierData) insertSupp.run(row);
console.log(`[Seed] ${supplierData.length} suppliers created.`);

// --- 5. Warehouses ---
const warehouseData = [
  [userId, 'Main Distribution Center', 'New York, NY', 'Robert Johnson', 5000, '+1-555-0301'],
  [userId, 'West Coast Warehouse', 'Los Angeles, CA', 'Amanda Chen', 3500, '+1-555-0302'],
  [userId, 'South Regional Hub', 'Houston, TX', 'Carlos Mendez', 2800, '+1-555-0303'],
  [userId, 'Midwest Storage', 'Chicago, IL', 'Jennifer Walsh', 4200, '+1-555-0304'],
];
const insertWH = db.prepare(`INSERT INTO warehouses (user_id, name, location, manager, capacity_sqm, contact_phone) VALUES (?,?,?,?,?,?)`);
for (const row of warehouseData) insertWH.run(row);
console.log(`[Seed] ${warehouseData.length} warehouses created.`);

// --- 6. Products ---
const productData = [
  [userId, 'SKU-001', 'Laptop Pro X1', 'Electronics', 1, 150, 25, 850, 1299, 'Business laptop', 'in_stock'],
  [userId, 'SKU-002', 'Desktop Elite', 'Electronics', 1, 80, 15, 650, 999, 'High-performance desktop', 'in_stock'],
  [userId, 'SKU-003', 'Wireless Mouse', 'Accessories', 1, 500, 100, 15, 35, 'Ergonomic wireless mouse', 'in_stock'],
  [userId, 'SKU-004', 'USB-C Hub', 'Accessories', 2, 200, 50, 25, 55, '7-in-1 USB-C hub', 'in_stock'],
  [userId, 'SKU-005', 'Mechanical Keyboard', 'Accessories', 2, 120, 30, 45, 89, 'RGB mechanical keyboard', 'in_stock'],
  [userId, 'SKU-006', '27-inch Monitor', 'Electronics', 2, 60, 20, 200, 349, '4K UHD monitor', 'low_stock'],
  [userId, 'SKU-007', 'Webcam HD Pro', 'Electronics', 1, 90, 25, 60, 129, '1080p webcam', 'in_stock'],
  [userId, 'SKU-008', 'Office Chair Ergo', 'Furniture', 3, 40, 10, 180, 399, 'Ergonomic office chair', 'in_stock'],
  [userId, 'SKU-009', 'Standing Desk', 'Furniture', 3, 25, 8, 320, 649, 'Electric standing desk', 'low_stock'],
  [userId, 'SKU-010', 'Filing Cabinet', 'Furniture', 4, 30, 10, 120, 249, '3-drawer filing cabinet', 'in_stock'],
  [userId, 'SKU-011', 'Printer All-in-One', 'Electronics', 1, 45, 15, 130, 229, 'Laser printer/scanner', 'in_stock'],
  [userId, 'SKU-012', 'Paper A4 (500 sheets)', 'Supplies', 4, 1000, 200, 3, 7, 'Premium A4 copy paper', 'in_stock'],
  [userId, 'SKU-013', 'Toner Cartridge Black', 'Supplies', 1, 200, 50, 35, 65, 'Compatible toner', 'in_stock'],
  [userId, 'SKU-014', 'Server Rack 42U', 'Infrastructure', 3, 8, 3, 800, 1499, '42U server cabinet', 'low_stock'],
  [userId, 'SKU-015', 'Network Switch 48P', 'Infrastructure', 1, 15, 5, 400, 699, '48-port managed switch', 'in_stock'],
  [userId, 'SKU-016', 'UPS 3000VA', 'Infrastructure', 1, 10, 4, 550, 999, '3000VA UPS backup', 'low_stock'],
  [userId, 'SKU-017', 'Cable Cat6 (305m)', 'Infrastructure', 2, 50, 15, 80, 149, 'Cat6 ethernet cable box', 'in_stock'],
  [userId, 'SKU-018', 'Whiteboard 48x36', 'Furniture', 4, 20, 8, 45, 89, 'Magnetic whiteboard', 'in_stock'],
  [userId, 'SKU-019', 'Projector 4K', 'Electronics', 2, 12, 5, 450, 899, '4K conference projector', 'low_stock'],
  [userId, 'SKU-020', 'Conference Phone', 'Electronics', 1, 35, 12, 150, 299, 'IP conference phone', 'in_stock'],
];
const insertProd = db.prepare(`INSERT INTO products (user_id, sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, description, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of productData) insertProd.run(row);
console.log(`[Seed] ${productData.length} products created.`);

// --- 7. Employees ---
const employeeData = [
  [userId, 'EMP-001', 'Robert', 'Johnson', 'robert@erpflow.com', '+1-555-0401', 'Executive', 'CEO', null, '2019-01-15', 150000, 'active', 'RJ'],
  [userId, 'EMP-002', 'Sarah', 'Williams', 'sarah@erpflow.com', '+1-555-0402', 'Executive', 'CFO', 1, '2019-02-01', 135000, 'active', 'SW'],
  [userId, 'EMP-003', 'Michael', 'Chen', 'michael@erpflow.com', '+1-555-0403', 'Executive', 'CTO', 1, '2019-03-10', 140000, 'active', 'MC'],
  [userId, 'EMP-004', 'Emily', 'Davis', 'emily@erpflow.com', '+1-555-0404', 'Sales', 'Sales Director', 1, '2020-01-20', 95000, 'active', 'ED'],
  [userId, 'EMP-005', 'James', 'Wilson', 'james@erpflow.com', '+1-555-0405', 'Sales', 'Account Manager', 4, '2020-06-15', 72000, 'active', 'JW'],
  [userId, 'EMP-006', 'Lisa', 'Anderson', 'lisa@erpflow.com', '+1-555-0406', 'Marketing', 'Marketing Manager', 1, '2020-08-01', 78000, 'active', 'LA'],
  [userId, 'EMP-007', 'David', 'Thompson', 'david@erpflow.com', '+1-555-0407', 'Engineering', 'Lead Developer', 3, '2021-01-10', 105000, 'active', 'DT'],
  [userId, 'EMP-008', 'Amanda', 'Garcia', 'amanda@erpflow.com', '+1-555-0408', 'Engineering', 'Software Engineer', 7, '2021-09-01', 85000, 'active', 'AG'],
  [userId, 'EMP-009', 'Christopher', 'Martinez', 'chris@erpflow.com', '+1-555-0409', 'HR', 'HR Manager', 1, '2020-04-15', 70000, 'active', 'CM'],
  [userId, 'EMP-010', 'Jessica', 'Robinson', 'jessica@erpflow.com', '+1-555-0410', 'Finance', 'Senior Accountant', 2, '2021-03-01', 68000, 'active', 'JR'],
  [userId, 'EMP-011', 'Daniel', 'Lee', 'daniel@erpflow.com', '+1-555-0411', 'Operations', 'Operations Manager', 1, '2020-11-15', 80000, 'on_leave', 'DL'],
  [userId, 'EMP-012', 'Michelle', 'Taylor', 'michelle@erpflow.com', '+1-555-0412', 'Operations', 'Logistics Coordinator', 11, '2022-01-05', 55000, 'active', 'MT'],
];
const insertEmp = db.prepare(`INSERT INTO employees (user_id, employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of employeeData) insertEmp.run(row);
console.log(`[Seed] ${employeeData.length} employees created.`);

// --- 8. Attendance ---
const attendanceStatuses = ['present', 'present', 'present', 'present', 'present', 'absent', 'late', 'leave'];
const insertAtt = db.prepare(`INSERT INTO attendance (user_id, employee_id, date, status, check_in, check_out, hours_worked, notes) VALUES (?,?,?,?,?,?,?,?)`);
for (let empId = 1; empId <= 12; empId++) {
  for (let d = 1; d <= 15; d++) {
    const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
    const checkIn = status === 'absent' ? null : `0${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
    const checkOut = status === 'absent' ? null : `${15 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
    const hours = checkIn && checkOut ? (parseInt(checkOut) - parseInt(checkIn)) + Math.random() : null;
    insertAtt.run(userId, empId, `2025-06-${String(d).padStart(2, '0')}`, status, checkIn, checkOut, hours ? hours.toFixed(2) : null, null);
  }
}
console.log('[Seed] Attendance records created (12 employees x 15 days).');

// --- 9. Leave Requests ---
const leaveData = [
  [userId, 4, 'annual', '2025-07-01', '2025-07-05', 5, 'Summer vacation', 'approved', 9],
  [userId, 5, 'sick', '2025-06-10', '2025-06-11', 2, 'Flu', 'approved', 9],
  [userId, 6, 'annual', '2025-08-15', '2025-08-25', 10, 'Family trip to Europe', 'pending', null],
  [userId, 7, 'unpaid', '2025-09-01', '2025-09-07', 7, 'Personal sabbatical', 'pending', null],
  [userId, 8, 'sick', '2025-06-20', '2025-06-21', 2, 'Medical procedure', 'approved', 9],
  [userId, 10, 'annual', '2025-07-15', '2025-07-20', 5, 'Visiting family', 'approved', 9],
  [userId, 11, 'maternity', '2025-10-01', '2026-01-15', 75, 'Maternity leave', 'approved', 9],
  [userId, 12, 'emergency', '2025-06-18', '2025-06-19', 2, 'Family emergency', 'approved', 9],
  [userId, 5, 'annual', '2025-12-20', '2025-12-31', 8, 'Holiday vacation', 'pending', null],
  [userId, 7, 'sick', '2025-05-28', '2025-05-29', 2, 'Food poisoning', 'rejected', 9],
];
const insertLeave = db.prepare(`INSERT INTO leave_requests (user_id, employee_id, leave_type, from_date, to_date, days, reason, status, approved_by) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of leaveData) insertLeave.run(row);
console.log(`[Seed] ${leaveData.length} leave requests created.`);

// --- 10. Payroll Records ---
const insertPayroll = db.prepare(`INSERT INTO payroll_records (user_id, employee_id, month, year, base_salary, overtime, bonus, tax, deductions, net_pay, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
for (let empId = 1; empId <= 12; empId++) {
  const emp = employeeData[empId - 1];
  const base = emp[10];
  const overtime = Math.floor(Math.random() * 2000);
  const bonus = Math.floor(Math.random() * 5000);
  const tax = base * 0.22;
  const deductions = base * 0.08 + 200;
  const net = base + overtime + bonus - tax - deductions;
  insertPayroll.run(userId, empId, 6, 2025, base, overtime, bonus, tax.toFixed(2), deductions.toFixed(2), net.toFixed(2), 'processed');
}
console.log('[Seed] 12 payroll records created.');

// --- 11. Recruitment Candidates ---
const recruitData = [
  [userId, 'Alex Turner', 'alex@email.com', '+1-555-0501', 'Senior Developer', 'interview', '2025-05-15', 8, 'Strong React/Node background'],
  [userId, 'Bethany Clark', 'beth@email.com', '+1-555-0502', 'UX Designer', 'offer', '2025-05-01', 5, 'Excellent portfolio'],
  [userId, 'Charles Nguyen', 'charles@email.com', '+1-555-0503', 'DevOps Engineer', 'screening', '2025-06-10', 6, 'AWS certified'],
  [userId, 'Diana Patel', 'diana@email.com', '+1-555-0504', 'Financial Analyst', 'applied', '2025-06-18', 3, 'CPA candidate'],
  [userId, 'Eric Stevenson', 'eric@email.com', '+1-555-0505', 'Sales Representative', 'hired', '2025-04-20', 4, 'Previous B2B experience'],
  [userId, 'Fiona Wright', 'fiona@email.com', '+1-555-0506', 'Marketing Specialist', 'interview', '2025-06-05', 3, 'Digital marketing expert'],
  [userId, 'George Kim', 'george@email.com', '+1-555-0507', 'Data Analyst', 'applied', '2025-06-20', 2, 'Python/SQL proficient'],
  [userId, 'Hannah Brooks', 'hannah@email.com', '+1-555-0508', 'HR Coordinator', 'rejected', '2025-05-25', 4, 'Lacked required experience'],
  [userId, 'Ian Murphy', 'ian@email.com', '+1-555-0509', 'Product Manager', 'interview', '2025-06-12', 7, 'Agile/Scrum certified'],
  [userId, 'Julia Santos', 'julia@email.com', '+1-555-0510', 'QA Engineer', 'screening', '2025-06-15', 4, 'Selenium expert'],
  [userId, 'Kevin Adams', 'kevin@email.com', '+1-555-0511', 'Network Administrator', 'applied', '2025-06-22', 6, 'CCNA certified'],
  [userId, 'Laura Mitchell', 'laura@email.com', '+1-555-0512', 'Content Writer', 'offer', '2025-06-08', 3, 'Strong SEO background'],
];
const insertRecruit = db.prepare(`INSERT INTO recruitment_candidates (user_id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of recruitData) insertRecruit.run(row);
console.log(`[Seed] ${recruitData.length} recruitment candidates created.`);

// --- 12. Projects ---
const projectData = [
  [userId, 'Website Redesign', 'Acme Corp', 'Complete overhaul of corporate website', 4, 85000, 42500, 50, 'active', '2025-01-15', '2025-09-30'],
  [userId, 'ERP Implementation', 'Internal', 'Deploy new ERP system across all departments', 7, 150000, 120000, 80, 'active', '2024-06-01', '2025-12-31'],
  [userId, 'Mobile App Development', 'Globex Industries', 'Native iOS and Android app', 8, 120000, 36000, 30, 'active', '2025-03-01', '2026-02-28'],
  [userId, 'Cloud Migration', 'Internal', 'Migrate on-premise servers to AWS', 7, 75000, 67500, 90, 'active', '2025-02-01', '2025-08-15'],
  [userId, 'Q3 Marketing Campaign', 'Internal', 'Multi-channel marketing push', 6, 45000, 15000, 33, 'active', '2025-05-01', '2025-09-30'],
  [userId, 'Warehouse Automation', 'Internal', 'Implement barcode scanning and robotics', 11, 200000, 180000, 85, 'on_hold', '2024-09-01', '2025-12-01'],
  [userId, 'Customer Portal', 'Soylent Corp', 'Self-service client portal', 4, 60000, 6000, 10, 'active', '2025-06-01', '2026-01-31'],
  [userId, 'Data Analytics Platform', 'Internal', 'BI dashboard and reporting system', 7, 95000, 19000, 20, 'active', '2025-04-01', '2025-11-30'],
  [userId, 'Office Renovation', 'Internal', 'Redesign HQ workspace', 9, 50000, 50000, 100, 'completed', '2024-10-01', '2025-05-31'],
  [userId, 'Security Audit', 'Stark Industries', 'Penetration testing and hardening', 3, 35000, 28000, 80, 'active', '2025-05-15', '2025-10-15'],
];
const insertProj = db.prepare(`INSERT INTO projects (user_id, project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of projectData) insertProj.run(row);
console.log(`[Seed] ${projectData.length} projects created.`);

// --- 13. Tasks ---
const taskData = [
  // Website Redesign
  [userId, 1, 'Design mockups', 'Create Figma wireframes for all pages', 8, 'done', 'high', '2025-02-28', JSON.stringify(['design', 'ui'])],
  [userId, 1, 'Frontend development', 'Build React components', 7, 'in_progress', 'high', '2025-06-30', JSON.stringify(['dev', 'react'])],
  [userId, 1, 'Content migration', 'Transfer existing content', 6, 'todo', 'medium', '2025-07-31', JSON.stringify(['content'])],
  // ERP Implementation
  [userId, 2, 'Module configuration', 'Configure finance and inventory modules', 7, 'in_progress', 'high', '2025-08-15', JSON.stringify(['config'])],
  [userId, 2, 'Data migration', 'Migrate legacy data', 10, 'in_progress', 'high', '2025-09-30', JSON.stringify(['data'])],
  [userId, 2, 'User training', 'Train department heads', 9, 'todo', 'medium', '2025-10-31', JSON.stringify(['training'])],
  [userId, 2, 'Go-live preparation', 'Final checks and rollout plan', 11, 'review', 'high', '2025-11-15', JSON.stringify(['deployment'])],
  // Mobile App
  [userId, 3, 'API design', 'Design REST API endpoints', 7, 'done', 'high', '2025-04-15', JSON.stringify(['api', 'backend'])],
  [userId, 3, 'iOS development', 'Build native iOS app', 8, 'in_progress', 'high', '2025-10-31', JSON.stringify(['ios', 'mobile'])],
  [userId, 3, 'Android development', 'Build native Android app', 7, 'todo', 'high', '2025-12-31', JSON.stringify(['android', 'mobile'])],
  // Cloud Migration
  [userId, 4, 'AWS account setup', 'Configure VPC, IAM, security groups', 7, 'done', 'high', '2025-03-15', JSON.stringify(['aws', 'infrastructure'])],
  [userId, 4, 'Server migration', 'Move application servers', 7, 'done', 'high', '2025-06-30', JSON.stringify(['migration'])],
  [userId, 4, 'Database migration', 'Move to RDS PostgreSQL', 8, 'in_progress', 'high', '2025-07-31', JSON.stringify(['database', 'aws'])],
  // Q3 Marketing
  [userId, 5, 'Social media strategy', 'Plan Q3 social content calendar', 6, 'in_progress', 'medium', '2025-06-30', JSON.stringify(['social'])],
  [userId, 5, 'Email campaigns', 'Design nurture sequences', 6, 'todo', 'medium', '2025-07-15', JSON.stringify(['email'])],
  // Warehouse Automation
  [userId, 6, 'Barcode system', 'Install and configure scanners', 11, 'done', 'high', '2025-03-31', JSON.stringify(['hardware'])],
  [userId, 6, 'Software integration', 'Connect with existing ERP', 7, 'in_progress', 'high', '2025-10-01', JSON.stringify(['integration'])],
  // Customer Portal
  [userId, 7, 'Requirements gathering', 'Collect client requirements', 4, 'done', 'medium', '2025-06-30', JSON.stringify(['analysis'])],
  [userId, 7, 'Backend development', 'Build API and services', 7, 'todo', 'high', '2025-10-31', JSON.stringify(['backend'])],
  // Data Analytics
  [userId, 8, 'Dashboard design', 'Create dashboard mockups', 6, 'in_progress', 'medium', '2025-07-15', JSON.stringify(['design'])],
  [userId, 8, 'ETL pipeline', 'Build data extraction pipeline', 7, 'todo', 'high', '2025-09-30', JSON.stringify(['data', 'etl'])],
  // Security Audit
  [userId, 10, 'Vulnerability scan', 'Run automated security scans', 7, 'done', 'high', '2025-06-30', JSON.stringify(['security'])],
  [userId, 10, 'Penetration testing', 'Manual penetration tests', 8, 'in_progress', 'high', '2025-09-15', JSON.stringify(['security'])],
  [userId, 10, 'Remediation', 'Fix identified vulnerabilities', 7, 'todo', 'high', '2025-10-15', JSON.stringify(['security'])],
];
const insertTask = db.prepare(`INSERT INTO tasks (user_id, project_id, task_name, description, assignee_id, stage, priority, due_date, tags) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of taskData) insertTask.run(row);
console.log(`[Seed] ${taskData.length} tasks created.`);

// --- 14. Timesheets ---
const timesheetDescriptions = ['Development work', 'Code review', 'Testing', 'Documentation', 'Client meeting', 'Research', 'Bug fixes', 'Planning'];
const insertTS = db.prepare(`INSERT INTO timesheets (user_id, employee_id, project_id, task_id, date, hours, description) VALUES (?,?,?,?,?,?,?)`);
let tsCount = 0;
for (let empId = 1; empId <= 12; empId++) {
  for (let d = 1; d <= 10; d++) {
    const projectId = [1,2,3,4,5,6,7,8,10][Math.floor(Math.random() * 9)];
    const taskId = Math.floor(Math.random() * 24) + 1;
    const hours = 2 + Math.floor(Math.random() * 7);
    const desc = timesheetDescriptions[Math.floor(Math.random() * timesheetDescriptions.length)];
    insertTS.run(userId, empId, projectId, taskId, `2025-06-${String(d).padStart(2, '0')}`, hours, desc);
    tsCount++;
  }
}
console.log(`[Seed] ${tsCount} timesheet entries created.`);

// --- 15. Milestones ---
const milestoneData = [
  [userId, 1, 'Design Approval', 'Client approves final designs', '2025-03-15', 'completed', '2025-03-10'],
  [userId, 1, 'Beta Launch', 'Internal beta release', '2025-07-01', 'in_progress', null],
  [userId, 1, 'Go Live', 'Production launch', '2025-09-30', 'not_started', null],
  [userId, 2, 'Phase 1 Complete', 'Core modules live', '2025-08-01', 'in_progress', null],
  [userId, 2, 'Full Deployment', 'All departments onboarded', '2025-12-31', 'not_started', null],
  [userId, 3, 'MVP Release', 'Minimum viable product', '2025-06-30', 'completed', '2025-06-25'],
  [userId, 3, 'App Store Launch', 'Published to App/Play Store', '2026-02-28', 'not_started', null],
  [userId, 4, 'Infrastructure Ready', 'All AWS resources provisioned', '2025-05-01', 'completed', '2025-04-28'],
  [userId, 4, 'Cutover Complete', 'All traffic on AWS', '2025-08-15', 'in_progress', null],
  [userId, 9, 'Demolition', 'Old furniture removed', '2024-11-01', 'completed', '2024-10-31'],
  [userId, 9, 'Furniture Install', 'New furniture installed', '2025-03-01', 'completed', '2025-02-28'],
  [userId, 9, 'Final Inspection', 'Sign-off from facilities', '2025-05-31', 'completed', '2025-05-30'],
];
const insertMS = db.prepare(`INSERT INTO milestones (user_id, project_id, milestone_name, description, due_date, status, completed_date) VALUES (?,?,?,?,?,?,?)`);
for (const row of milestoneData) insertMS.run(row);
console.log(`[Seed] ${milestoneData.length} milestones created.`);

// --- 16. Shipping Documents ---
const shippingDocData = [
  [userId, 'MBL', 'MBL-SHA-2025-001', 'SHPT-001', '2025-06-01', 'EVER GLORY V.2512E', 'TechSource Distribution', 'Acme Corporation', 'Shanghai', 'Los Angeles', 'approved', '/docs/mbl-001.pdf'],
  [userId, 'HBL', 'HBL-APL-2025-0042', 'SHPT-001', '2025-06-01', null, 'TechSource Distribution', 'Acme Corporation', 'Shanghai', 'Los Angeles', 'approved', '/docs/hbl-042.pdf'],
  [userId, 'CI', 'CI-2025-10891', 'SHPT-001', '2025-06-01', null, 'TechSource Distribution', 'Acme Corporation', 'Shanghai', 'Los Angeles', 'approved', '/docs/ci-10891.pdf'],
  [userId, 'PL', 'PL-2025-10891', 'SHPT-001', '2025-06-01', null, 'TechSource Distribution', 'Acme Corporation', 'Shanghai', 'Los Angeles', 'approved', '/docs/pl-10891.pdf'],
  [userId, 'CO', 'CO-CN-2025-0045', 'SHPT-001', '2025-06-01', null, null, null, 'Shanghai', 'Los Angeles', 'submitted', '/docs/co-0045.pdf'],
  [userId, 'MBL', 'MBL-NRT-2025-089', 'SHPT-002', '2025-06-05', 'ONE COMPETENCE V.076W', 'Pacific Manufacturing', 'Stark Industries', 'Tokyo', 'Long Beach', 'approved', '/docs/mbl-089.pdf'],
  [userId, 'SI', 'SI-2025-0045', 'SHPT-002', '2025-06-04', 'ONE COMPETENCE V.076W', 'Pacific Manufacturing', 'Stark Industries', 'Tokyo', 'Long Beach', 'approved', '/docs/si-045.pdf'],
  [userId, 'CI', 'CI-2025-20456', 'SHPT-002', '2025-06-05', null, 'Pacific Manufacturing', 'Stark Industries', 'Tokyo', 'Long Beach', 'approved', '/docs/ci-20456.pdf'],
  [userId, 'BE', 'BE-US-2025-4421', 'SHPT-002', '2025-06-10', null, null, null, 'Tokyo', 'Long Beach', 'submitted', '/docs/be-4421.pdf'],
  [userId, 'MBL', 'MBL-BRE-2025-156', 'SHPT-003', '2025-06-08', 'MAERSK HORSBURGH V.351S', 'EuroPackaging Solutions', 'Wayne Enterprises', 'Bremerhaven', 'New York', 'approved', '/docs/mbl-156.pdf'],
  [userId, 'HBL', 'HBL-DHL-2025-091', 'SHPT-003', '2025-06-08', null, 'EuroPackaging Solutions', 'Wayne Enterprises', 'Bremerhaven', 'New York', 'approved', '/docs/hbl-091.pdf'],
  [userId, 'DO', 'DO-NYK-2025-334', 'SHPT-003', '2025-06-15', null, null, 'Wayne Enterprises', 'Bremerhaven', 'New York', 'draft', '/docs/do-334.pdf'],
  [userId, 'NOC', 'NOC-2025-088', 'SHPT-003', '2025-06-12', null, null, null, 'Bremerhaven', 'New York', 'submitted', '/docs/noc-088.pdf'],
  [userId, 'MFT', 'MFT-2025-2211', 'SHPT-003', '2025-06-07', 'MAERSK HORSBURGH V.351S', null, null, 'Bremerhaven', 'New York', 'approved', '/docs/mft-2211.pdf'],
  [userId, 'MBL', 'MBL-BUS-2025-203', 'SHPT-004', '2025-06-12', 'COSCO SHANGHAI V.028E', 'Raw Materials Plus', 'Globex Industries', 'Busan', 'Seattle', 'submitted', '/docs/mbl-203.pdf'],
  [userId, 'PL', 'PL-2025-4402', 'SHPT-004', '2025-06-12', null, 'Raw Materials Plus', 'Globex Industries', 'Busan', 'Seattle', 'draft', '/docs/pl-4402.pdf'],
  [userId, 'SI', 'SI-2025-0098', 'SHPT-004', '2025-06-11', 'COSCO SHANGHAI V.028E', 'Raw Materials Plus', 'Globex Industries', 'Busan', 'Seattle', 'approved', '/docs/si-098.pdf'],
  [userId, 'MBL', 'MBL-SIN-2025-312', 'SHPT-005', '2025-06-15', 'CMA CGM MARCO POLO V.045N', 'SteelWorks Corp', 'Umbrella Corp', 'Singapore', 'Rotterdam', 'approved', '/docs/mbl-312.pdf'],
  [userId, 'CO', 'CO-US-2025-0156', 'SHPT-005', '2025-06-15', null, null, null, 'Singapore', 'Rotterdam', 'draft', '/docs/co-0156.pdf'],
  [userId, 'BE', 'BE-NL-2025-8823', 'SHPT-005', '2025-06-22', null, null, null, 'Singapore', 'Rotterdam', 'draft', '/docs/be-8823.pdf'],
  [userId, 'HBL', 'HBL-2025-1167', 'SHPT-005', '2025-06-15', null, 'SteelWorks Corp', 'Umbrella Corp', 'Singapore', 'Rotterdam', 'approved', '/docs/hbl-1167.pdf'],
  [userId, 'MBL', 'MBL-HCM-2025-445', 'SHPT-006', '2025-06-18', 'EVERGREEN EVER AXLE V.089S', 'Pacific Manufacturing', 'Cyberdyne Systems', 'Ho Chi Minh', 'Oakland', 'draft', '/docs/mbl-445.pdf'],
  [userId, 'CI', 'CI-2025-33009', 'SHPT-006', '2025-06-18', null, 'Pacific Manufacturing', 'Cyberdyne Systems', 'Ho Chi Minh', 'Oakland', 'draft', '/docs/ci-33009.pdf'],
  [userId, 'SI', 'SI-2025-0142', 'SHPT-006', '2025-06-17', 'EVERGREEN EVER AXLE V.089S', 'Pacific Manufacturing', 'Cyberdyne Systems', 'Ho Chi Minh', 'Oakland', 'submitted', '/docs/si-142.pdf'],
  [userId, 'MBL', 'MBL-MUM-2025-678', 'SHPT-007', '2025-06-20', 'MSC GULSUN V.127E', 'CloudTech Services', 'Massive Dynamic', 'Mumbai', 'Savannah', 'draft', '/docs/mbl-678.pdf'],
  [userId, 'PL', 'PL-2025-7712', 'SHPT-007', '2025-06-20', null, 'CloudTech Services', 'Massive Dynamic', 'Mumbai', 'Savannah', 'draft', '/docs/pl-7712.pdf'],
  [userId, 'MBL', 'MBL-GUA-2025-901', 'SHPT-008', '2025-06-22', 'HMM ALGECIRAS V.201W', 'AgriSupply Co', 'Oceanic Airlines', 'Guangzhou', 'Melbourne', 'draft', '/docs/mbl-901.pdf'],
  [userId, 'CI', 'CI-2025-55601', 'SHPT-008', '2025-06-22', null, 'AgriSupply Co', 'Oceanic Airlines', 'Guangzhou', 'Melbourne', 'draft', '/docs/ci-55601.pdf'],
  [userId, 'MBL', 'MBL-ANT-2025-234', 'SHPT-009', '2025-06-25', 'ZIM MOUNT RAINIER V.445E', 'PrintCraft Ltd', 'Tyrell Corp', 'Antwerp', 'Amsterdam', 'draft', '/docs/mbl-234.pdf'],
  [userId, 'HBL', 'HBL-2025-0301', 'SHPT-009', '2025-06-25', null, 'PrintCraft Ltd', 'Tyrell Corp', 'Antwerp', 'Amsterdam', 'draft', '/docs/hbl-0301.pdf'],
  [userId, 'MBL', 'MBL-DUB-2025-556', 'SHPT-010', '2025-06-28', 'OOCL BERLIN V.338W', 'Safety First Equipment', 'Weyland-Yutani', 'Dubai', 'Houston', 'draft', '/docs/mbl-556.pdf'],
  [userId, 'NOC', 'NOC-2025-156', 'SHPT-010', '2025-06-28', null, null, null, 'Dubai', 'Houston', 'draft', '/docs/noc-156.pdf'],
];
const insertSD = db.prepare(`INSERT INTO shipping_docs (user_id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status, file_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of shippingDocData) insertSD.run(row);
console.log(`[Seed] ${shippingDocData.length} shipping documents created.`);

// --- 17. Shipments ---
const shipmentData = [
  [userId, 'BKG-2025-0001', 'ROT-001', 'EVER GLORY', 'EGLV', 'TechSource Distribution', 'Acme Corporation', 'FCL', '40HQ', 2, 'Shanghai', 'Los Angeles', '2025-06-01T08:00:00', '2025-06-18T14:00:00', 'delivered', 'FOB'],
  [userId, 'BKG-2025-0002', 'ROT-002', 'ONE COMPETENCE', 'ONEY', 'Pacific Manufacturing', 'Stark Industries', 'FCL', '40GP', 1, 'Tokyo', 'Long Beach', '2025-06-05T10:00:00', '2025-06-22T09:00:00', 'customs', 'CIF'],
  [userId, 'BKG-2025-0003', 'ROT-003', 'MAERSK HORSBURGH', 'MAEU', 'EuroPackaging Solutions', 'Wayne Enterprises', 'FCL', '20GP', 3, 'Bremerhaven', 'New York', '2025-06-08T06:00:00', '2025-06-25T16:00:00', 'at_port', 'DDP'],
  [userId, 'BKG-2025-0004', 'ROT-004', 'COSCO SHANGHAI', 'COSU', 'Raw Materials Plus', 'Globex Industries', 'LCL', null, 1, 'Busan', 'Seattle', '2025-06-12T09:00:00', '2025-06-28T12:00:00', 'in_transit', 'FOB'],
  [userId, 'BKG-2025-0005', 'ROT-005', 'CMA CGM MARCO POLO', 'CMAU', 'SteelWorks Corp', 'Umbrella Corp', 'FCL', '40HQ', 4, 'Singapore', 'Rotterdam', '2025-06-15T14:00:00', '2025-07-05T08:00:00', 'in_transit', 'CIF'],
  [userId, 'BKG-2025-0006', 'ROT-006', 'EVERGREEN EVER AXLE', 'EGLV', 'Pacific Manufacturing', 'Cyberdyne Systems', 'FCL', '20GP', 1, 'Ho Chi Minh', 'Oakland', '2025-06-18T11:00:00', '2025-07-08T10:00:00', 'booking_confirmed', 'FOB'],
  [userId, 'BKG-2025-0007', 'ROT-007', 'MSC GULSUN', 'MSCU', 'CloudTech Services', 'Massive Dynamic', 'FCL', '40HQ', 2, 'Mumbai', 'Savannah', '2025-06-20T07:00:00', '2025-07-12T15:00:00', 'booking_confirmed', 'CIF'],
  [userId, 'BKG-2025-0008', 'ROT-008', 'HMM ALGECIRAS', 'HMMU', 'AgriSupply Co', 'Oceanic Airlines', 'FCL', '20GP', 1, 'Guangzhou', 'Melbourne', '2025-06-22T13:00:00', '2025-07-10T11:00:00', 'booking_confirmed', 'EXW'],
  [userId, 'BKG-2025-0009', 'ROT-009', 'ZIM MOUNT RAINIER', 'ZIMU', 'PrintCraft Ltd', 'Tyrell Corp', 'LCL', null, 1, 'Antwerp', 'Amsterdam', '2025-06-25T08:00:00', '2025-06-28T14:00:00', 'booking_confirmed', 'DDP'],
  [userId, 'BKG-2025-0010', 'ROT-010', 'OOCL BERLIN', 'OOLU', 'Safety First Equipment', 'Weyland-Yutani', 'FCL', '40GP', 2, 'Dubai', 'Houston', '2025-06-28T06:00:00', '2025-07-18T09:00:00', 'booking_confirmed', 'CIF'],
  [userId, 'BKG-2025-0011', 'ROT-011', 'EVER FORWARD', 'EGLV', 'Energy Solutions Inc', 'Aperture Science', 'FCL', '20GP', 1, 'Shenzhen', 'Los Angeles', '2025-07-01T10:00:00', '2025-07-20T08:00:00', 'booking_confirmed', 'FOB'],
  [userId, 'BKG-2025-0012', 'ROT-012', 'MSC DIANA', 'MSCU', 'Office Supplies Direct', 'Black Mesa', 'LCL', null, 1, 'Hong Kong', 'Long Beach', '2025-07-03T08:00:00', '2025-07-22T12:00:00', 'booking_confirmed', 'EXW'],
  [userId, 'BKG-2025-0013', 'ROT-013', 'MAERSK EDINBURGH', 'MAEU', 'Raw Materials Plus', 'Initech LLC', 'FCL', '40HQ', 2, 'Qingdao', 'Seattle', '2025-07-05T06:00:00', '2025-07-25T14:00:00', 'booking_confirmed', 'CIF'],
  [userId, 'BKG-2025-0014', 'ROT-014', 'COSCO NINGBO', 'COSU', 'Pacific Manufacturing', 'Soylent Corp', 'FCL', '20GP', 1, 'Ningbo', 'Oakland', '2025-07-08T09:00:00', '2025-07-28T10:00:00', 'booking_confirmed', 'FOB'],
  [userId, 'BKG-2025-0015', 'ROT-015', 'ONE TRIUMPH', 'ONEY', 'TechSource Distribution', 'Stark Industries', 'FCL', '40HQ', 3, 'Kaohsiung', 'Los Angeles', '2025-07-10T11:00:00', '2025-07-30T08:00:00', 'booking_confirmed', 'DDP'],
];
const insertShip = db.prepare(`INSERT INTO shipments (user_id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of shipmentData) insertShip.run(row);
console.log(`[Seed] ${shipmentData.length} shipments created.`);

// --- 18. Charges ---
const chargeData = [
  [userId, 'OFC-20', 'Ocean Freight 20GP', 'Base ocean freight for 20ft container', 'per_container', 1200, 'FCL_20GP', 'USD'],
  [userId, 'OFC-40', 'Ocean Freight 40GP', 'Base ocean freight for 40ft container', 'per_container', 2200, 'FCL_40GP', 'USD'],
  [userId, 'OFC-40H', 'Ocean Freight 40HQ', 'Base ocean freight for 40ft high cube', 'per_container', 2400, 'FCL_40HQ', 'USD'],
  [userId, 'THC-20', 'Terminal Handling 20ft', 'Port handling charges 20ft', 'per_container', 350, 'FCL_20GP', 'USD'],
  [userId, 'THC-40', 'Terminal Handling 40ft', 'Port handling charges 40ft', 'per_container', 550, 'FCL_40GP', 'USD'],
  [userId, 'DOC', 'Documentation Fee', 'Bill of lading and documentation', 'per_shipment', 85, 'all', 'USD'],
  [userId, 'CUS', 'Customs Clearance', 'Import customs clearance', 'per_shipment', 150, 'all', 'USD'],
  [userId, 'DDC', 'Destination Delivery', 'Inland delivery to warehouse', 'per_container', 450, 'all', 'USD'],
];
const insertCharge = db.prepare(`INSERT INTO charges (user_id, charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency) VALUES (?,?,?,?,?,?,?,?)`);
for (const row of chargeData) insertCharge.run(row);
console.log(`[Seed] ${chargeData.length} charge types created.`);

// --- 19. Company Settings ---
db.prepare(`INSERT INTO company_settings (user_id, company_name, logo_url, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
  .run(userId, 'ERP Flow Demo Inc.', '/logo.png', '123 Business Ave, Suite 100, New York, NY 10001', '+1-555-0100', 'admin@erpflow.com', 'https://erpflow.demo', 'US-123456789', 'DE-987654321', '01-01', 'USD', 2);
console.log('[Seed] Company settings created.');

// --- 20. Notification Settings ---
const notifCategories = ['sales', 'purchasing', 'inventory', 'finance', 'hr', 'projects', 'logistics', 'system'];
const insertNotif = db.prepare(`INSERT INTO notification_settings (user_id, category, email_enabled, in_app_enabled, push_enabled) VALUES (?,?,?,?,?)`);
for (const cat of notifCategories) {
  insertNotif.run(userId, cat, 1, 1, 0);
}
console.log(`[Seed] ${notifCategories.length} notification settings created.`);

// --- 21. Journal Entries ---
const jeData = [
  [userId, 'JE-2025-0001', '2025-06-01', 'Initial capital investment', 'Capital', 150000, 150000, 'posted', JSON.stringify([{account_id:1,debit:150000,credit:0,description:'Cash deposit'},{account_id:16,debit:0,credit:150000,description:'Owner equity'}])],
  [userId, 'JE-2025-0002', '2025-06-02', 'Purchase inventory on account', 'PO-001', 68000, 68000, 'posted', JSON.stringify([{account_id:4,debit:68000,credit:0,description:'Raw materials'},{account_id:11,debit:0,credit:68000,description:'AP-Raw Materials Plus'}])],
  [userId, 'JE-2025-0003', '2025-06-03', 'Sales to Acme Corp', 'INV-001', 25980, 25980, 'posted', JSON.stringify([{account_id:3,debit:25980,credit:0,description:'AR-Acme'},{account_id:19,debit:0,credit:22000,description:'Sales'},{account_id:14,debit:0,credit:3980,description:'Tax payable'}])],
  [userId, 'JE-2025-0004', '2025-06-05', 'Monthly rent payment', 'RENT-JUN', 8500, 8500, 'posted', JSON.stringify([{account_id:24,debit:8500,credit:0,description:'Office rent'},{account_id:1,debit:0,credit:8500,description:'Cash'}])],
  [userId, 'JE-2025-0005', '2025-06-07', 'Payroll semi-monthly', 'PAY-001', 42500, 42500, 'posted', JSON.stringify([{account_id:23,debit:42500,credit:0,description:'Salaries'},{account_id:1,debit:0,credit:34000,description:'Net payroll'},{account_id:14,debit:0,credit:8500,description:'Tax withheld'}])],
  [userId, 'JE-2025-0006', '2025-06-10', 'Service revenue - Initech', 'INV-002', 15000, 15000, 'posted', JSON.stringify([{account_id:3,debit:15000,credit:0,description:'AR-Initech'},{account_id:20,debit:0,credit:15000,description:'Service revenue'}])],
  [userId, 'JE-2025-0007', '2025-06-12', 'Utility bills', 'UTIL-JUN', 3200, 3200, 'posted', JSON.stringify([{account_id:25,debit:3200,credit:0,description:'Electricity'},{account_id:1,debit:0,credit:3200,description:'Cash'}])],
  [userId, 'JE-2025-0008', '2025-06-15', 'Marketing campaign payment', 'MKT-001', 7500, 7500, 'posted', JSON.stringify([{account_id:28,debit:7500,credit:0,description:'Q3 marketing'},{account_id:1,debit:0,credit:7500,description:'Cash'}])],
  [userId, 'JE-2025-0009', '2025-06-18', 'Equipment purchase', 'EQ-001', 15000, 15000, 'posted', JSON.stringify([{account_id:7,debit:15000,credit:0,description:'New servers'},{account_id:1,debit:0,credit:5000,description:'Down payment'},{account_id:15,debit:0,credit:10000,description:'Long-term loan'}])],
  [userId, 'JE-2025-0010', '2025-06-20', 'Sales to Umbrella Corp', 'INV-003', 45000, 45000, 'posted', JSON.stringify([{account_id:3,debit:45000,credit:0,description:'AR-Umbrella'},{account_id:19,debit:0,credit:38000,description:'Product sales'},{account_id:14,debit:0,credit:7000,description:'Tax payable'}])],
  [userId, 'JE-2025-0011', '2025-06-22', 'Insurance premium', 'INS-001', 5000, 5000, 'posted', JSON.stringify([{account_id:30,debit:5000,credit:0,description:'Annual insurance'},{account_id:1,debit:0,credit:5000,description:'Cash'}])],
  [userId, 'JE-2025-0012', '2025-06-24', 'Consulting - Stark Industries', 'INV-004', 25000, 25000, 'posted', JSON.stringify([{account_id:3,debit:25000,credit:0,description:'AR-Stark'},{account_id:21,debit:0,credit:25000,description:'Consulting revenue'}])],
  [userId, 'JE-2025-0013', '2025-06-25', 'Office supplies purchase', 'OS-001', 1250, 1250, 'posted', JSON.stringify([{account_id:26,debit:1250,credit:0,description:'Supplies'},{account_id:1,debit:0,credit:1250,description:'Cash'}])],
  [userId, 'JE-2025-0014', '2025-06-27', 'Loan interest payment', 'INT-001', 750, 750, 'posted', JSON.stringify([{account_id:31,debit:750,credit:0,description:'Loan interest'},{account_id:1,debit:0,credit:750,description:'Cash'}])],
  [userId, 'JE-2025-0015', '2025-06-28', 'Travel expenses', 'TRV-001', 4200, 4200, 'draft', JSON.stringify([{account_id:29,debit:4200,credit:0,description:'Client visit'},{account_id:1,debit:0,credit:4200,description:'Cash'}])],
];
const insertJE = db.prepare(`INSERT INTO journal_entries (user_id, entry_number, date, description, reference, total_debit, total_credit, status, lines) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of jeData) insertJE.run(row);
console.log(`[Seed] ${jeData.length} journal entries created.`);

// --- 22. Quotations ---
const quoteData = [
  [userId, 'QT-2025-001', 1, '2025-06-01', '2025-07-01', JSON.stringify([{item:'Laptop Pro X1',qty:20,price:1299,total:25980},{item:'USB-C Hub',qty:50,price:55,total:2750}]), 28730, 4597, 33327, 'accepted', 'Enterprise deployment'],
  [userId, 'QT-2025-002', 6, '2025-06-03', '2025-07-03', JSON.stringify([{item:'Server Rack 42U',qty:5,price:1499,total:7495},{item:'UPS 3000VA',qty:5,price:999,total:4995}]), 12490, 1998, 14488, 'sent', 'Data center expansion'],
  [userId, 'QT-2025-003', 3, '2025-06-05', '2025-07-05', JSON.stringify([{item:'Standing Desk',qty:30,price:649,total:19470}]), 19470, 3115, 22585, 'sent', 'Office wellness program'],
  [userId, 'QT-2025-004', 10, '2025-06-08', '2025-07-08', JSON.stringify([{item:'Conference Phone',qty:10,price:299,total:2990},{item:'Webcam HD Pro',qty:20,price:129,total:2580}]), 5570, 891, 6461, 'draft', 'Conference room setup'],
  [userId, 'QT-2025-005', 5, '2025-06-10', '2025-07-10', JSON.stringify([{item:'27-inch Monitor',qty:50,price:349,total:17450},{item:'Mechanical Keyboard',qty:50,price:89,total:4450}]), 21900, 3504, 25404, 'sent', 'Staff equipment refresh'],
  [userId, 'QT-2025-006', 2, '2025-06-12', '2025-07-12', JSON.stringify([{item:'Desktop Elite',qty:15,price:999,total:14985}]), 14985, 2398, 17383, 'draft', 'Design team upgrade'],
  [userId, 'QT-2025-007', 8, '2025-06-15', '2025-07-15', JSON.stringify([{item:'Network Switch 48P',qty:8,price:699,total:5592},{item:'Cable Cat6',qty:10,price:149,total:1490}]), 7082, 1133, 8215, 'rejected', 'Network infrastructure - declined'],
  [userId, 'QT-2025-008', 14, '2025-06-18', '2025-07-18', JSON.stringify([{item:'Printer All-in-One',qty:12,price:229,total:2748},{item:'Toner Cartridge',qty:50,price:65,total:3250}]), 5998, 960, 6958, 'sent', 'Print station setup'],
  [userId, 'QT-2025-009', 7, '2025-06-20', '2025-07-20', JSON.stringify([{item:'Whiteboard 48x36',qty:15,price:89,total:1335}]), 1335, 214, 1549, 'draft', 'Meeting rooms'],
  [userId, 'QT-2025-010', 13, '2025-06-22', '2025-07-22', JSON.stringify([{item:'Projector 4K',qty:6,price:899,total:5394}]), 5394, 863, 6257, 'accepted', 'Boardroom AV upgrade'],
];
const insertQuote = db.prepare(`INSERT INTO quotations (user_id, quote_number, customer_id, date, valid_until, items, subtotal, tax, total, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of quoteData) insertQuote.run(row);
console.log(`[Seed] ${quoteData.length} quotations created.`);

// --- 23. Sales Orders ---
const soData = [
  [userId, 'SO-2025-001', 1, '2025-06-01', JSON.stringify([{item:'Laptop Pro X1',qty:20,price:1299,total:25980},{item:'USB-C Hub',qty:50,price:55,total:2750}]), 28730, 4597, 33327, 'delivered'],
  [userId, 'SO-2025-002', 6, '2025-06-03', JSON.stringify([{item:'Server Rack 42U',qty:3,price:1499,total:4497},{item:'UPS 3000VA',qty:3,price:999,total:2997}]), 7494, 1199, 8693, 'shipped'],
  [userId, 'SO-2025-003', 5, '2025-06-05', JSON.stringify([{item:'27-inch Monitor',qty:30,price:349,total:10470},{item:'Mechanical Keyboard',qty:30,price:89,total:2670}]), 13140, 2102, 15242, 'processing'],
  [userId, 'SO-2025-004', 2, '2025-06-08', JSON.stringify([{item:'Desktop Elite',qty:10,price:999,total:9990}]), 9990, 1598, 11588, 'pending'],
  [userId, 'SO-2025-005', 9, '2025-06-10', JSON.stringify([{item:'Conference Phone',qty:8,price:299,total:2392},{item:'Webcam HD Pro',qty:16,price:129,total:2064}]), 4456, 713, 5169, 'processing'],
  [userId, 'SO-2025-006', 4, '2025-06-12', JSON.stringify([{item:'Standing Desk',qty:15,price:649,total:9735}]), 9735, 1558, 11293, 'pending'],
  [userId, 'SO-2025-007', 13, '2025-06-15', JSON.stringify([{item:'Projector 4K',qty:4,price:899,total:3596}]), 3596, 575, 4171, 'shipped'],
  [userId, 'SO-2025-008', 15, '2025-06-18', JSON.stringify([{item:'Printer All-in-One',qty:10,price:229,total:2290},{item:'Toner Cartridge',qty:40,price:65,total:2600}]), 4890, 782, 5672, 'pending'],
  [userId, 'SO-2025-009', 3, '2025-06-20', JSON.stringify([{item:'Office Chair Ergo',qty:25,price:399,total:9975}]), 9975, 1596, 11571, 'processing'],
  [userId, 'SO-2025-010', 10, '2025-06-22', JSON.stringify([{item:'Network Switch 48P',qty:5,price:699,total:3495},{item:'Cable Cat6',qty:5,price:149,total:745}]), 4240, 678, 4918, 'pending'],
  [userId, 'SO-2025-011', 7, '2025-06-24', JSON.stringify([{item:'Laptop Pro X1',qty:8,price:1299,total:10392}]), 10392, 1663, 12055, 'cancelled'],
  [userId, 'SO-2025-012', 12, '2025-06-26', JSON.stringify([{item:'Desktop Elite',qty:12,price:999,total:11988}]), 11988, 1918, 13906, 'pending'],
];
const insertSO = db.prepare(`INSERT INTO sales_orders (user_id, order_number, customer_id, date, items, subtotal, tax, total, status) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of soData) insertSO.run(row);
console.log(`[Seed] ${soData.length} sales orders created.`);

// --- 24. Invoices ---
const invData = [
  [userId, 'INV-2025-001', 1, 1, '2025-06-03', '2025-07-03', JSON.stringify([{item:'Laptop Pro X1',qty:20,price:1299,total:25980},{item:'USB-C Hub',qty:50,price:55,total:2750}]), 28730, 4597, 33327, 33327, 'paid', 'Net 30'],
  [userId, 'INV-2025-002', 6, 2, '2025-06-05', '2025-07-05', JSON.stringify([{item:'Server Rack 42U',qty:3,price:1499,total:4497},{item:'UPS 3000VA',qty:3,price:999,total:2997}]), 7494, 1199, 8693, 8693, 'paid', 'Net 30'],
  [userId, 'INV-2025-003', 5, 3, '2025-06-08', '2025-07-08', JSON.stringify([{item:'27-inch Monitor',qty:30,price:349,total:10470},{item:'Mechanical Keyboard',qty:30,price:89,total:2670}]), 13140, 2102, 15242, 10000, 'overdue', 'Net 30'],
  [userId, 'INV-2025-004', 2, 4, '2025-06-10', '2025-07-10', JSON.stringify([{item:'Desktop Elite',qty:10,price:999,total:9990}]), 9990, 1598, 11588, 0, 'sent', 'Net 30'],
  [userId, 'INV-2025-005', 9, 5, '2025-06-12', '2025-07-12', JSON.stringify([{item:'Conference Phone',qty:8,price:299,total:2392},{item:'Webcam HD Pro',qty:16,price:129,total:2064}]), 4456, 713, 5169, 0, 'sent', 'Net 15'],
  [userId, 'INV-2025-006', 4, 6, '2025-06-15', '2025-07-15', JSON.stringify([{item:'Standing Desk',qty:15,price:649,total:9735}]), 9735, 1558, 11293, 11293, 'paid', 'Net 30'],
  [userId, 'INV-2025-007', 13, 7, '2025-06-18', '2025-07-18', JSON.stringify([{item:'Projector 4K',qty:4,price:899,total:3596}]), 3596, 575, 4171, 2000, 'overdue', 'Net 30'],
  [userId, 'INV-2025-008', 15, 8, '2025-06-20', '2025-07-20', JSON.stringify([{item:'Printer All-in-One',qty:10,price:229,total:2290},{item:'Toner Cartridge',qty:40,price:65,total:2600}]), 4890, 782, 5672, 0, 'sent', 'Net 30'],
  [userId, 'INV-2025-009', 3, 9, '2025-06-22', '2025-07-22', JSON.stringify([{item:'Office Chair Ergo',qty:25,price:399,total:9975}]), 9975, 1596, 11571, 11571, 'paid', 'Net 30'],
  [userId, 'INV-2025-010', 10, 10, '2025-06-24', '2025-07-24', JSON.stringify([{item:'Network Switch 48P',qty:5,price:699,total:3495},{item:'Cable Cat6',qty:5,price:149,total:745}]), 4240, 678, 4918, 0, 'draft', 'Net 30'],
  [userId, 'INV-2025-011', 6, null, '2025-06-25', '2025-07-25', JSON.stringify([{item:'Service - Consulting',qty:40,price:250,total:10000}]), 10000, 0, 10000, 0, 'sent', 'Net 15 - Consulting'],
  [userId, 'INV-2025-012', 14, null, '2025-06-26', '2025-07-26', JSON.stringify([{item:'Server Rack 42U',qty:2,price:1499,total:2998}]), 2998, 480, 3478, 0, 'sent', 'Net 30'],
  [userId, 'INV-2025-013', 8, null, '2025-06-27', '2025-07-27', JSON.stringify([{item:'Network Switch 48P',qty:8,price:699,total:5592}]), 5592, 895, 6487, 6487, 'paid', 'Net 30'],
  [userId, 'INV-2025-014', 11, null, '2025-06-28', '2025-07-28', JSON.stringify([{item:'Office Supplies Bundle',qty:1,price:3500,total:3500}]), 3500, 0, 3500, 0, 'draft', 'On hold'],
  [userId, 'INV-2025-015', 7, null, '2025-06-28', '2025-07-28', JSON.stringify([{item:'Whiteboard 48x36',qty:15,price:89,total:1335}]), 1335, 0, 1335, 1335, 'paid', 'Net 15'],
];
const insertInv = db.prepare(`INSERT INTO invoices (user_id, invoice_number, customer_id, order_id, date, due_date, items, subtotal, tax, total, amount_paid, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const row of invData) insertInv.run(row);
console.log(`[Seed] ${invData.length} invoices created.`);

// --- 25. Pipeline Deals ---
const pipelineData = [
  [userId, 'Acme Corp - Enterprise License', 1, 'closed_won', 125000, '2025-06-30', 100, 'Annual enterprise software license', 'James Wilson'],
  [userId, 'Stark Industries - Hardware Refresh', 6, 'negotiation', 340000, '2025-08-15', 75, '500+ laptop deployment', 'Emily Davis'],
  [userId, 'Umbrella Corp - Pharma Compliance', 5, 'proposal', 210000, '2025-09-01', 50, 'Regulatory compliance module', 'James Wilson'],
  [userId, 'Globex Industries - Q3 Upgrade', 2, 'qualified', 87000, '2025-07-30', 40, 'Factory automation consulting', 'Emily Davis'],
  [userId, 'Initech - Support Renewal', 4, 'closed_won', 45000, '2025-06-15', 100, 'Annual support contract', 'James Wilson'],
  [userId, 'Wayne Enterprises - Security Audit', 7, 'proposal', 180000, '2025-08-30', 60, 'Full security assessment', 'Emily Davis'],
  [userId, 'Cyberdyne - AI Integration', 8, 'qualified', 78000, '2025-09-15', 35, 'AI module integration', 'James Wilson'],
  [userId, 'Massive Dynamic - Research Platform', 9, 'lead', 95000, '2025-10-01', 20, 'Research data platform', 'Emily Davis'],
  [userId, 'Oceanic Airlines - Logistics Suite', 10, 'negotiation', 54000, '2025-07-20', 70, 'Freight management system', 'James Wilson'],
  [userId, 'Tyrell Corp - Biotech Module', 12, 'proposal', 67000, '2025-09-30', 45, 'Specialized biotech features', 'Emily Davis'],
  [userId, 'Weyland-Yutani - Space Ops', 13, 'lead', 145000, '2025-11-01', 15, 'Space logistics module', 'James Wilson'],
  [userId, 'Aperture Science - Testing Framework', 14, 'qualified', 38000, '2025-08-01', 30, 'QA automation tools', 'Emily Davis'],
  [userId, 'Black Mesa - Research Portal', 15, 'closed_lost', 92000, '2025-06-01', 0, 'Declined - budget constraints', 'James Wilson'],
  [userId, 'Soylent Corp - Supply Chain', 3, 'negotiation', 45000, '2025-07-15', 65, 'Supply chain optimization', 'James Wilson'],
  [userId, 'New Lead - Fortune 500', null, 'lead', 250000, '2025-12-31', 10, 'Inbound inquiry from unnamed client', 'Emily Davis'],
];
const insertPipe = db.prepare(`INSERT INTO pipeline_deals (user_id, deal_name, customer_id, stage, value, expected_close_date, probability, notes, assigned_to) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const row of pipelineData) insertPipe.run(row);
console.log(`[Seed] ${pipelineData.length} pipeline deals created.`);

// --- 26. Purchase Orders ---
const poData = [
  [userId, 'PO-2025-001', 5, '2025-06-01', '2025-06-15', JSON.stringify([{item:'Raw Material A',qty:500,price:45,total:22500},{item:'Raw Material B',qty:300,price:38,total:11400}]), 33900, 5424, 39324, 'received'],
  [userId, 'PO-2025-002', 1, '2025-06-03', '2025-06-20', JSON.stringify([{item:'Laptop Pro X1',qty:50,price:850,total:42500}]), 42500, 0, 42500, 'received'],
  [userId, 'PO-2025-003', 11, '2025-06-05', '2025-06-25', JSON.stringify([{item:'Steel Beams 6m',qty:200,price:120,total:24000}]), 24000, 0, 24000, 'partial'],
  [userId, 'PO-2025-004', 3, '2025-06-08', '2025-07-05', JSON.stringify([{item:'Circuit Boards',qty:1000,price:15,total:15000},{item:'LED Panels',qty:500,price:8,total:4000}]), 19000, 0, 19000, 'sent'],
  [userId, 'PO-2025-005', 7, '2025-06-10', '2025-07-10', JSON.stringify([{item:'Toner Cartridge (Bulk)',qty:200,price:35,total:7000},{item:'A4 Paper (Pallet)',qty:50,price:85,total:4250}]), 11250, 0, 11250, 'sent'],
  [userId, 'PO-2025-006', 6, '2025-06-12', '2025-07-12', JSON.stringify([{item:'Cloud Services Annual',qty:1,price:48000,total:48000}]), 48000, 0, 48000, 'sent'],
  [userId, 'PO-2025-007', 2, '2025-06-15', '2025-07-15', JSON.stringify([{item:'Freight - Asia Route',qty:12,price:2200,total:26400}]), 26400, 0, 26400, 'partial'],
  [userId, 'PO-2025-008', 4, '2025-06-18', '2025-07-20', JSON.stringify([{item:'Packaging Boxes',qty:5000,price:2.5,total:12500}]), 12500, 0, 12500, 'sent'],
  [userId, 'PO-2025-009', 8, '2025-06-20', '2025-07-25', JSON.stringify([{item:'Safety Helmets',qty:100,price:25,total:2500},{item:'Safety Vests',qty:200,price:15,total:3000}]), 5500, 0, 5500, 'sent'],
  [userId, 'PO-2025-010', 9, '2025-06-22', '2025-07-30', JSON.stringify([{item:'Solar Panels 300W',qty:50,price:180,total:9000}]), 9000, 0, 9000, 'draft'],
  [userId, 'PO-2025-011', 10, '2025-06-24', '2025-08-01', JSON.stringify([{item:'Brochure Print Run',qty:10000,price:0.8,total:8000}]), 8000, 0, 8000, 'draft'],
  [userId, 'PO-2025-012', 12, '2025-06-26', '2025-08-05', JSON.stringify([{item:'Seeds - Premium Mix',qty:200,price:45,total:9000}]), 9000, 0, 9000, 'draft'],
  [userId, 'PO-2025-013', 1, '2025-06-27', '2025-07-15', JSON.stringify([{item:'Desktop Elite',qty:30,price:650,total:19500}]), 19500, 0, 19500, 'sent'],
  [userId, 'PO-2025-014', 5, '2025-06-28', '2025-07-20', JSON.stringify([{item:'Aluminum Sheets',qty:400,price:85,total:34000}]), 34000, 0, 34000, 'sent'],
  [userId, 'PO-2025-015', 3, '2025-06-28', '2025-08-10', JSON.stringify([{item:'Memory Modules DDR5',qty:200,price:65,total:13000}]), 13000, 0, 13000, 'sent'],
];
const insertPO = db.prepare(`INSERT INTO purchase_orders (user_id, po_number, supplier_id, date, expected_delivery, items, subtotal, tax, total, status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
for (const row of poData) insertPO.run(row);
console.log(`[Seed] ${poData.length} purchase orders created.`);

// --- 27. Activity Log ---
const activityData = [
  [userId, 'CREATE', 'invoice', 1, 'Created invoice INV-2025-001'],
  [userId, 'UPDATE', 'sales_order', 1, 'Updated SO-2025-001 status to delivered'],
  [userId, 'CREATE', 'journal_entry', 1, 'Posted journal entry JE-2025-0001'],
  [userId, 'CREATE', 'purchase_order', 1, 'Created purchase order PO-2025-001'],
  [userId, 'UPDATE', 'pipeline_deal', 1, 'Closed deal: Acme Corp - Enterprise License'],
  [userId, 'CREATE', 'shipment', 1, 'Created shipment BKG-2025-0001'],
  [userId, 'CREATE', 'employee', 12, 'Onboarded new employee: Michelle Taylor'],
  [userId, 'UPDATE', 'project', 2, 'ERP Implementation reached 80%'],
  [userId, 'CREATE', 'quotation', 1, 'Sent quotation QT-2025-001 to Acme Corp'],
  [userId, 'UPDATE', 'invoice', 3, 'Marked INV-2025-003 as overdue'],
  [userId, 'CREATE', 'leave_request', 7, 'New maternity leave request from Daniel Lee'],
  [userId, 'UPDATE', 'task', 10, 'Completed: API design for Mobile App'],
  [userId, 'CREATE', 'shipping_doc', 1, 'Uploaded MBL-SHA-2025-001'],
  [userId, 'UPDATE', 'product', 6, '27-inch Monitor stock level low - reorder triggered'],
  [userId, 'CREATE', 'recruitment', 5, 'Hired: Eric Stevenson as Sales Representative'],
];
const insertActivity = db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id, description) VALUES (?,?,?,?,?)`);
for (const row of activityData) insertActivity.run(row);
console.log(`[Seed] ${activityData.length} activity log entries created.`);

// Final persist
db.persist();
console.log('\n========================================');
console.log('[Seed] Database seeded successfully!');
console.log(`Admin user: username=admin, password=admin123`);
console.log('========================================\n');
}

// Run the seeder
seed().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
