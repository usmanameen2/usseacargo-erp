const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

console.log('[Seed] Starting...');

try {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) {
    console.log('[Seed] Already seeded, skipping.');
    process.exit(0);
  }

  // 1. Admin user
  const adminHash = bcrypt.hashSync('admin123', 10);
  const adminResult = db.prepare(
    `INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('admin', adminHash, 'admin@usseacargo.com', 'System Administrator', 'admin', 'USSeaCargo Inc.', '+971-4-123-4567', 'AD', 1);
  console.log('[Seed] Admin user created');

  // 2. Manager users
  const mgr1Hash = bcrypt.hashSync('manager123', 10);
  db.prepare(`INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('manager1', mgr1Hash, 'manager@usseacargo.com', 'Operations Manager', 'manager', 'USSeaCargo Inc.', '+971-4-123-4568', 'OM', 1);

  const mgr2Hash = bcrypt.hashSync('staff123', 10);
  db.prepare(`INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('staff1', mgr2Hash, 'staff@usseacargo.com', 'Warehouse Staff', 'staff', 'USSeaCargo Inc.', '+971-4-123-4569', 'WS', 1);
  console.log('[Seed] Manager + Staff users created');

  // 3. Customers (Dubai-based)
  const customers = [
    ['Dubai Trade Centre', 'Dubai Trade', 'info@dubaitrade.ae', '+971-4-222-3333', 'Dubai, UAE', 'Dubai', 'AE', 'active', 'Major trade partner', 125000],
    ['JAFZA Logistics', 'JAFZA', 'logistics@jafza.ae', '+971-4-888-7777', 'Jebel Ali, Dubai', 'Dubai', 'AE', 'active', 'Free zone client', 89000],
    ['DP World Operations', 'DP World', 'ops@dpworld.com', '+971-4-555-6666', 'Jebel Ali Port, Dubai', 'Dubai', 'AE', 'active', 'Port operations', 234000],
    ['Emirates Shipping', 'Emirates Ship', 'contact@emirates-shipping.ae', '+971-4-444-5555', 'Port Rashid, Dubai', 'Dubai', 'AE', 'active', 'Shipping line', 67800],
    ['Sharjah Freight Solutions', 'SFS', 'info@sfscargo.ae', '+971-6-555-4444', 'Sharjah, UAE', 'Sharjah', 'AE', 'active', 'Regional partner', 34500],
    ['Abu Dhabi Cargo Hub', 'ADCH', 'cargo@adch.ae', '+971-2-666-7777', 'Khalifa Port, Abu Dhabi', 'Abu Dhabi', 'AE', 'active', 'Capital operations', 156000],
    ['Saudi Cargo Link', 'SCL', 'info@sclcargo.sa', '+966-11-888-9999', 'Riyadh, Saudi Arabia', 'Riyadh', 'SA', 'active', 'KSA partner', 78000],
    ['Oman Logistics Group', 'OLG', 'info@olg.om', '+968-24-555-666', 'Muscat, Oman', 'Muscat', 'OM', 'active', 'Oman partner', 45200],
    ['Bahrain Freight Co', 'BFC', 'info@bfco.bh', '+973-17-333-444', 'Manama, Bahrain', 'Manama', 'BH', 'active', 'Bahrain partner', 28900],
    ['Kuwait Shipping Lines', 'KSL', 'info@ksl.kw', '+965-22-888-999', 'Shuwaikh Port, Kuwait', 'Kuwait City', 'KW', 'inactive', 'Kuwait partner', 12300],
  ];
  const custStmt = db.prepare(`INSERT INTO customers (user_id, name, company, email, phone, address, city, country, status, notes, total_spent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of customers) custStmt.run(1, ...c);
  console.log('[Seed] 10 customers created');

  // 4. Suppliers
  const suppliers = [
    ['Maersk Line', 'Peter Andersen', 'contact@maerskline.com', '+45-33-63-33-63', 'Copenhagen, Denmark', 'Shipping Line', 5, 'active', 45],
    ['MSC Mediterranean', 'Laura Rossi', 'info@msc.com', '+41-22-703-8888', 'Geneva, Switzerland', 'Shipping Line', 4, 'active', 38],
    ['COSCO Shipping', 'Wei Li', 'wei@cosco.com', '+86-21-6549-8888', 'Shanghai, China', 'Shipping Line', 5, 'active', 52],
    ['CMA CGM Group', 'Marie Dubois', 'info@cmacgm.com', '+33-4-88-91-90-00', 'Marseille, France', 'Shipping Line', 4, 'active', 41],
    ['DHL Global Forwarding', 'Hans Mueller', 'hans@dhl.com', '+49-228-182-0', 'Bonn, Germany', 'Freight Forwarder', 5, 'active', 67],
    ['Kuehne + Nagel', 'Thomas Keller', 'info@kuehne-nagel.com', '+41-44-786-95-11', 'Schindellegi, Switzerland', 'Freight Forwarder', 5, 'active', 55],
    ['Evergreen Marine', 'Chen Ming', 'info@evergreen-marine.com', '+886-2-2501-2501', 'Taipei, Taiwan', 'Shipping Line', 4, 'active', 33],
    ['Hapag-Lloyd', 'Klaus Mueller', 'info@hapag-lloyd.com', '+49-40-3001-0', 'Hamburg, Germany', 'Shipping Line', 4, 'active', 29],
  ];
  const supStmt = db.prepare(`INSERT INTO suppliers (user_id, name, contact_person, email, phone, address, category, rating, status, total_orders)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const s of suppliers) supStmt.run(1, ...s);
  console.log('[Seed] 8 suppliers created');

  // 5. Warehouses
  const warehouses = [
    ['Jebel Ali Main Warehouse', 'Jebel Ali Free Zone, Dubai', 'Ahmed Hassan', 10000, '+971-4-881-2001'],
    ['Dubai Airport Cargo', 'Dubai Airport Free Zone', 'Fatima Al-Rashid', 5000, '+971-4-295-8888'],
    ['Sharjah Industrial Warehouse', 'Sharjah Industrial Area', 'Omar Khalil', 8000, '+971-6-533-4444'],
    ['Abu Dhabi Hub', 'Khalifa Industrial Zone, Abu Dhabi', 'Khalid Mansour', 12000, '+971-2-555-7777'],
  ];
  const whStmt = db.prepare(`INSERT INTO warehouses (user_id, name, location, manager, capacity_sqm, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?)`);
  for (const w of warehouses) whStmt.run(1, ...w);
  console.log('[Seed] 4 warehouses created');

  // 6. Products
  const products = [
    ['CONT-20GP-001', '20ft General Purpose Container', 'Container', 1, 45, 10, 1200, 1800, 'in_stock', 'Standard dry container'],
    ['CONT-40GP-001', '40ft General Purpose Container', 'Container', 1, 32, 8, 2200, 3200, 'in_stock', 'Standard 40ft dry container'],
    ['CONT-40HC-001', '40ft High Cube Container', 'Container', 1, 18, 5, 2500, 3600, 'in_stock', 'High cube for extra volume'],
    ['PALLET-WOOD-001', 'Wooden Shipping Pallet', 'Packing Material', 2, 500, 100, 15, 25, 'in_stock', 'Standard wooden pallet'],
    ['WRAP-STRETCH-001', 'Stretch Wrap Film', 'Packing Material', 2, 120, 30, 8, 15, 'in_stock', 'Industrial stretch film'],
    ['STRAP-PLASTIC-001', 'Plastic Strapping Band', 'Packing Material', 3, 85, 20, 12, 20, 'low_stock', 'Heavy duty strapping'],
  ];
  const prodStmt = db.prepare(`INSERT INTO products (user_id, sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of products) prodStmt.run(1, ...p);
  console.log('[Seed] 6 products created');

  // 7. Employees
  const employees = [
    ['EMP001', 'Ahmed', 'Hassan', 'ahmed@usseacargo.com', '+971-50-111-2222', 'Operations', 'Operations Manager', null, '2022-01-15', 18000, 'active', 'AH'],
    ['EMP002', 'Fatima', 'Al-Rashid', 'fatima@usseacargo.com', '+971-50-222-3333', 'Sales', 'Sales Manager', 1, '2022-03-01', 16000, 'active', 'FA'],
    ['EMP003', 'Omar', 'Khalil', 'omar@usseacargo.com', '+971-50-333-4444', 'Warehouse', 'Warehouse Supervisor', 1, '2022-06-15', 12000, 'active', 'OK'],
    ['EMP004', 'Sara', 'Al-Mansouri', 'sara@usseacargo.com', '+971-50-444-5555', 'Finance', 'Accountant', 1, '2022-08-01', 14000, 'active', 'SM'],
    ['EMP005', 'Mohammed', 'Al-Farsi', 'mohammed@usseacargo.com', '+971-50-555-6666', 'Logistics', 'Logistics Coordinator', 1, '2023-01-10', 10000, 'active', 'MF'],
    ['EMP006', 'Layla', 'Khalifa', 'layla@usseacargo.com', '+971-50-666-7777', 'Customer Service', 'CS Representative', 2, '2023-04-20', 8500, 'active', 'LK'],
    ['EMP007', 'Khalid', 'Mansour', 'khalid@usseacargo.com', '+971-50-777-8888', 'IT', 'IT Specialist', 1, '2023-07-01', 11000, 'active', 'KM'],
    ['EMP008', 'Aisha', 'Rahman', 'aisha@usseacargo.com', '+971-50-888-9999', 'HR', 'HR Manager', 1, '2023-09-15', 13000, 'active', 'AR'],
  ];
  const empStmt = db.prepare(`INSERT INTO employees (user_id, employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const e of employees) empStmt.run(1, ...e);
  console.log('[Seed] 8 employees created');

  // 8. Leave Requests
  const leaves = [
    [1, 1, 'Ahmed Hassan', 'annual', '2025-12-15', '2025-12-25', 10, 'Year-end vacation', 'approved', 'Admin'],
    [1, 2, 'Fatima Al-Rashid', 'sick', '2025-11-20', '2025-11-22', 2, 'Medical leave', 'approved', 'Admin'],
    [1, 3, 'Omar Khalil', 'annual', '2026-01-05', '2026-01-10', 5, 'Family visit', 'pending', null],
    [1, 4, 'Sara Al-Mansouri', 'maternity', '2026-02-01', '2026-05-01', 90, 'Maternity leave', 'pending', null],
    [1, 5, 'Mohammed Al-Farsi', 'sick', '2025-11-18', '2025-11-19', 1, 'Doctor appointment', 'rejected', null],
  ];
  const leaveStmt = db.prepare(`INSERT INTO leave_requests (user_id, employee_id, employee_name, leave_type, from_date, to_date, days, reason, status, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const l of leaves) leaveStmt.run(...l);
  console.log('[Seed] 5 leave requests created');

  // 9. Candidates
  const candidates = [
    ['Ali Hassan', 'ali.hassan@email.com', '+971-50-999-8888', 'Freight Forwarder', 'applied', '2025-10-15', 3, 'Experience in GCC logistics'],
    ['Noora Saeed', 'noora.saeed@email.com', '+971-50-888-7777', 'Sales Executive', 'screening', '2025-10-20', 2, 'Strong sales background'],
    ['Rashid Al-Zahabi', 'rashid@email.com', '+971-50-777-6666', 'Warehouse Manager', 'interview', '2025-09-01', 5, 'Warehouse automation expert'],
    ['Mariam Khalil', 'mariam@email.com', '+971-50-666-5555', 'Customs Broker', 'applied', '2025-11-01', 4, 'Licensed customs broker'],
    ['Yusuf Ibrahim', 'yusuf@email.com', '+971-50-555-4444', 'Logistics Coordinator', 'offer', '2025-08-15', 6, 'Senior coordinator'],
  ];
  const candStmt = db.prepare(`INSERT INTO recruitment_candidates (user_id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of candidates) candStmt.run(1, ...c);
  console.log('[Seed] 5 candidates created');

  // 10. Projects
  const projects = [
    ['Container Tracking RFID', 'Internal', 'Implement RFID tracking for all containers', 1, 500000, 325000, 65, 'active', '2025-01-01', '2026-06-30'],
    ['Warehouse Automation', 'Internal', 'Automate warehouse operations with robotics', 3, 750000, 150000, 20, 'active', '2025-02-01', '2026-12-31'],
    ['Customer Portal Upgrade', 'Internal', 'Upgrade client-facing web portal', 1, 300000, 280000, 93, 'active', '2025-01-15', '2025-12-15'],
    ['Dubai-Saudi Direct Line', 'External', 'New direct shipping line Dubai-Riyadh', 2, 1200000, 450000, 38, 'active', '2025-03-01', '2027-01-31'],
  ];
  const projStmt = db.prepare(`INSERT INTO projects (user_id, project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of projects) projStmt.run(1, ...p);
  console.log('[Seed] 4 projects created');

  // 11. Tasks
  const tasks = [
    [1, 'Install RFID readers at Jebel Ali', 'Install hardware at 10 gates', 3, 'in_progress', 'high', '2025-12-30'],
    [1, 'Configure tracking software', 'Setup middleware and database', 7, 'todo', 'high', '2026-01-15'],
    [1, 'Test RFID scanning', 'Integration testing', 7, 'todo', 'medium', '2026-02-01'],
    [2, 'Purchase robotic pallet movers', 'Procure 5 units', 3, 'done', 'high', '2025-11-30'],
    [2, 'Install conveyor systems', 'Section A and B', 3, 'in_progress', 'high', '2026-01-31'],
    [3, 'Design new UI mockups', 'Figma designs for portal', 2, 'done', 'medium', '2025-06-30'],
    [3, 'Develop API endpoints', 'Backend for customer portal', 7, 'in_progress', 'high', '2025-10-31'],
    [3, 'User acceptance testing', 'Beta with 5 customers', 2, 'todo', 'medium', '2025-12-15'],
  ];
  const taskStmt = db.prepare(`INSERT INTO tasks (project_id, task_name, description, assignee_id, stage, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const t of tasks) taskStmt.run(...t);
  console.log('[Seed] 8 tasks created');

  // 12. Quotations
  const quotations = [
    ['QT-2026-001', 1, 'Dubai Trade Centre', '2026-01-15', '2026-02-15', '[{"item":"FCL 40ft","qty":2,"rate":3200,"total":6400}]', 6400, 320, 6720, 'sent', 'Valid for 30 days'],
    ['QT-2026-002', 2, 'JAFZA Logistics', '2026-01-20', '2026-02-20', '[{"item":"LCL shipment","qty":5,"rate":450,"total":2250}]', 2250, 112.5, 2362.5, 'accepted', 'LCL consolidation'],
    ['QT-2026-003', 3, 'DP World Operations', '2026-02-01', '2026-03-01', '[{"item":"FCL 20ft","qty":10,"rate":1800,"total":18000}]', 18000, 900, 18900, 'sent', 'Bulk order discount'],
    ['QT-2026-004', 4, 'Emirates Shipping', '2026-02-10', '2026-03-10', '[{"item":"Warehousing 30 days","qty":1,"rate":15000,"total":15000}]', 15000, 750, 15750, 'draft', 'Warehouse storage'],
    ['QT-2026-005', 5, 'Sharjah Freight Solutions', '2026-02-15', '2026-03-15', '[{"item":"Customs clearance","qty":8,"rate":350,"total":2800}]', 2800, 140, 2940, 'sent', 'Customs brokerage'],
    ['QT-2026-006', 6, 'Abu Dhabi Cargo Hub', '2026-03-01', '2026-04-01', '[{"item":"FCL 40ft HC","qty":3,"rate":3600,"total":10800}]', 10800, 540, 11340, 'draft', 'High cube containers'],
  ];
  const qtStmt = db.prepare(`INSERT INTO quotations (user_id, quote_number, customer_id, customer_name, date, valid_until, items_json, subtotal, tax, total, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const q of quotations) qtStmt.run(1, ...q);
  console.log('[Seed] 6 quotations created');

  // 13. Sales Orders
  const orders = [
    ['SO-2026-001', 1, 'Dubai Trade Centre', '2026-01-20', '[{"item":"FCL 40ft","qty":2,"rate":3200}]', 6400, 320, 6720, 'shipped'],
    ['SO-2026-002', 2, 'JAFZA Logistics', '2026-02-05', '[{"item":"LCL shipment","qty":3,"rate":450}]', 1350, 67.5, 1417.5, 'processing'],
    ['SO-2026-003', 3, 'DP World Operations', '2026-02-15', '[{"item":"FCL 20ft","qty":5,"rate":1800}]', 9000, 450, 9450, 'pending'],
    ['SO-2026-004', 4, 'Emirates Shipping', '2026-03-01', '[{"item":"Warehousing","qty":1,"rate":15000}]', 15000, 750, 15750, 'processing'],
    ['SO-2026-005', 6, 'Abu Dhabi Cargo Hub', '2026-03-10', '[{"item":"FCL 40ft HC","qty":2,"rate":3600}]', 7200, 360, 7560, 'pending'],
  ];
  const ordStmt = db.prepare(`INSERT INTO sales_orders (user_id, order_number, customer_id, customer_name, date, items_json, subtotal, tax, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const o of orders) ordStmt.run(1, ...o);
  console.log('[Seed] 5 sales orders created');

  // 14. Invoices
  const invoices = [
    ['INV-2026-001', 1, 'Dubai Trade Centre', '2026-01-25', '2026-02-25', '[{"item":"FCL 40ft x2","qty":2,"rate":3200}]', 6400, 320, 6720, 6720, 'paid'],
    ['INV-2026-002', 2, 'JAFZA Logistics', '2026-02-10', '2026-03-10', '[{"item":"LCL x3","qty":3,"rate":450}]', 1350, 67.5, 1417.5, 0, 'sent'],
    ['INV-2026-003', 3, 'DP World Operations', '2026-02-20', '2026-03-20', '[{"item":"FCL 20ft x5","qty":5,"rate":1800}]', 9000, 450, 9450, 0, 'sent'],
    ['INV-2026-004', 4, 'Emirates Shipping', '2026-03-05', '2026-04-05', '[{"item":"Warehousing","qty":1,"rate":15000}]', 15000, 750, 15750, 0, 'draft'],
    ['INV-2026-005', 5, 'Sharjah Freight Solutions', '2026-03-15', '2026-04-15', '[{"item":"Customs x8","qty":8,"rate":350}]', 2800, 140, 2940, 2940, 'paid'],
    ['INV-2026-006', 6, 'Abu Dhabi Cargo Hub', '2026-03-20', '2026-04-20', '[{"item":"FCL 40ft HC x2","qty":2,"rate":3600}]', 7200, 360, 7560, 0, 'overdue'],
  ];
  const invStmt = db.prepare(`INSERT INTO invoices (user_id, invoice_number, customer_id, customer_name, date, due_date, items_json, subtotal, tax, total, amount_paid, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const i of invoices) invStmt.run(1, ...i);
  console.log('[Seed] 6 invoices created');

  // 15. Purchase Orders
  const pos = [
    ['PO-2026-001', 1, 'Maersk Line', '2026-01-10', '2026-02-10', '[{"item":"Container 40ft","qty":5,"rate":2200}]', 11000, 550, 11550, 'received'],
    ['PO-2026-002', 2, 'MSC Mediterranean', '2026-02-01', '2026-03-01', '[{"item":"Container 20ft","qty":10,"rate":1200}]', 12000, 600, 12600, 'sent'],
    ['PO-2026-003', 5, 'DHL Global Forwarding', '2026-02-15', '2026-03-15', '[{"item":"Air freight service","qty":1,"rate":25000}]', 25000, 1250, 26250, 'partial'],
    ['PO-2026-004', 4, 'CMA CGM Group', '2026-03-01', '2026-04-01', '[{"item":"Container 40ft HC","qty":8,"rate":2500}]', 20000, 1000, 21000, 'draft'],
    ['PO-2026-005', 3, 'COSCO Shipping', '2026-03-10', '2026-04-10', '[{"item":"Container 20ft","qty":15,"rate":1100}]', 16500, 825, 17325, 'draft'],
  ];
  const poStmt = db.prepare(`INSERT INTO purchase_orders (user_id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of pos) poStmt.run(1, ...p);
  console.log('[Seed] 5 purchase orders created');

  // 16. Pipeline Deals
  const deals = [
    ['Dubai Trade Expansion', 1, 'Dubai Trade Centre', 'lead', 250000, '2026-06-30', 25, 'New annual contract', 'Ahmed'],
    ['JAFZA Cold Storage', 2, 'JAFZA Logistics', 'qualified', 180000, '2026-05-15', 50, 'Reefer container deal', 'Fatima'],
    ['DP World Master Contract', 3, 'DP World Operations', 'proposal', 500000, '2026-04-30', 75, 'Multi-year agreement', 'Ahmed'],
    ['Emirates Reefer Line', 4, 'Emirates Shipping', 'negotiation', 350000, '2026-03-31', 90, 'Temperature controlled', 'Fatima'],
    ['Saudi Expansion', 7, 'Saudi Cargo Link', 'closed_won', 420000, '2026-02-28', 100, 'Won - starting March', 'Ahmed'],
    ['Kuwait Re-entry', 10, 'Kuwait Shipping Lines', 'closed_lost', 150000, '2026-01-31', 0, 'Lost to competitor', 'Fatima'],
  ];
  const dealStmt = db.prepare(`INSERT INTO pipeline_deals (user_id, deal_name, customer_id, customer_name, stage, value, expected_close_date, probability, notes, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of deals) dealStmt.run(1, ...d);
  console.log('[Seed] 6 pipeline deals created');

  // 17. Shipping Documents (CRITICAL - all 10 types)
  const shippingDocs = [
    ['MBL', 'MAEU-DXB-2026-001', 'HLCU-DXB-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'COSCO Shanghai', 'USSeaCargo Inc.', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', null, 'Master B/L for FCL shipment'],
    ['HBL', 'HBL-USS-2026-001', 'MAEU-DXB-2026-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', null, 'House B/L for Dubai Trade'],
    ['DO', 'DO-JAFZA-2026-001', 'REF-001', '2026-01-20', 'N/A', 'JAFZA Logistics', 'JAFZA Logistics', 'N/A', 'Jebel Ali', 'MSCU-1234567', 'submitted', null, 'Delivery order issued'],
    ['NOC', 'NOC-CUSTOMS-001', 'APP-001', '2026-01-10', 'N/A', 'Dubai Customs', 'USSeaCargo Inc.', 'N/A', 'N/A', null, 'approved', null, 'No objection for customs clearance'],
    ['PL', 'PL-DTC-2026-001', 'SO-001', '2026-01-12', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'submitted', null, 'Electronics and machinery parts'],
    ['CI', 'CI-DTC-2026-001', 'INV-001', '2026-01-12', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'submitted', null, 'Commercial invoice AED 67,200'],
    ['CO', 'CO-ORIGIN-001', 'CERT-001', '2026-01-08', 'N/A', 'Shanghai Chamber', 'Dubai Trade Centre', 'Shanghai', 'Jebel Ali', null, 'approved', null, 'Certificate of origin - China'],
    ['BE', 'BE-DUBAI-2026-001', 'DEC-001', '2026-01-18', 'MAERSK HANGZHOU 426S', 'USSeaCargo Inc.', 'Dubai Customs', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', null, 'Bill of entry filed'],
    ['SI', 'SI-COSCO-2026-001', 'BOOK-001', '2026-01-05', 'MAERSK HANGZHOU 426S', 'COSCO Shanghai', 'USSeaCargo Inc.', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'submitted', null, 'Shipping instructions provided'],
    ['MFT', 'MFT-DXB-2026-001', 'MANIFEST-001', '2026-01-14', 'MAERSK HANGZHOU 426S', 'Maersk Line', 'Dubai Trade', 'Shanghai', 'Jebel Ali', null, 'submitted', null, 'Manifest uploaded to Dubai Trade'],
  ];
  const sdStmt = db.prepare(`INSERT INTO shipping_docs (user_id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, container_number, status, file_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of shippingDocs) sdStmt.run(1, ...d);
  console.log('[Seed] 10 shipping documents created');

  // 18. Shipments
  const shipments = [
    ['BKG-2026-001', 'ROT-426S', 'MAERSK HANGZHOU', 'MAEU', 'COSCO Shanghai', 'USSeaCargo Inc.', 'FCL', '40ft GP', 2, 'Shanghai', 'Jebel Ali', '2026-01-20', '2026-02-10', 'in_transit', 'FOB'],
    ['BKG-2026-002', 'ROT-512N', 'MSC OSCAR', 'MSCU', 'DHL Hamburg', 'JAFZA Logistics', 'LCL', 'Consolidated', 1, 'Hamburg', 'Jebel Ali', '2026-02-01', '2026-02-25', 'at_port', 'CIF'],
    ['BKG-2026-003', 'ROT-318W', 'COSCO SHANGHAI', 'COSU', 'Yusuf Ibrahim', 'DP World Operations', 'FCL', '40ft HC', 1, 'Ningbo', 'Jebel Ali', '2026-02-15', '2026-03-05', 'booking_confirmed', 'CIF'],
    ['BKG-2026-004', 'ROT-891E', 'CMA CGM MARCO', 'CMCU', 'CMA Marseille', 'Emirates Shipping', 'FCL', '20ft', 3, 'Marseille', 'Jebel Ali', '2026-03-01', '2026-03-25', 'booking_confirmed', 'DDP'],
    ['BKG-2026-005', 'ROT-645R', 'EVER GRACE', 'EVGU', 'Evergreen Taipei', 'Sharjah Freight', 'LCL', 'Consolidated', 1, 'Kaohsiung', 'Jebel Ali', '2026-03-10', '2026-04-01', 'booking_confirmed', 'FOB'],
  ];
  const shipStmt = db.prepare(`INSERT INTO shipments (user_id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const s of shipments) shipStmt.run(1, ...s);
  console.log('[Seed] 5 shipments created');

  // 19. Charges
  const charges = [
    ['DDO', 'Deferred Delivery Order', 'Credit arrangement for D.O. release charges', 'fixed', 150, 'both', 'AED'],
    ['FCC', 'Freight Coordination Charge', 'Coordination fee / fuel surcharge', 'percentage', 3.5, 'both', 'AED'],
    ['FPP', 'Freight Prepaid', 'Ocean freight prepaid at origin', 'fixed', 2500, 'FCL', 'AED'],
    ['LCC', 'Local Container Charges', 'Port admin fees at destination', 'fixed', 450, 'both', 'AED'],
    ['THC', 'Terminal Handling Charges', 'Port operator fee for container handling', 'per_container', 850, 'both', 'AED'],
    ['DOC', 'Documentation Fee', 'Bill of lading and document preparation', 'fixed', 200, 'both', 'AED'],
    ['CUS', 'Customs Clearance', 'Customs processing and clearance', 'fixed', 500, 'both', 'AED'],
    ['INS', 'Insurance', 'Cargo insurance premium', 'percentage', 0.3, 'both', 'AED'],
    ['WAR', 'War Risk Surcharge', 'Additional security surcharge', 'fixed', 150, 'both', 'AED'],
    ['BUN', 'Bunker Adjustment Factor', 'Fuel cost adjustment', 'per_container', 300, 'both', 'AED'],
  ];
  const chgStmt = db.prepare(`INSERT INTO charges (user_id, charge_code, charge_name, description, calculation_method, rate, applicable_to, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of charges) chgStmt.run(1, ...c);
  console.log('[Seed] 10 charges created');

  // 20. Company Settings
  db.prepare(`INSERT INTO company_settings (user_id, company_name, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places, timezone, vat_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    1, 'USSeaCargo Inc.', 'Jebel Ali Free Zone, Dubai, UAE', '+971-4-123-4567', 'info@usseacargo.com', 'https://usseacargo.com', 'TRN-1234567890123', 'JAFZA-REG-2024-001', '01-01', 'AED', 2, 'Asia/Dubai', 5
  );
  console.log('[Seed] Company settings created');

  // 21. Activity Log
  const activities = [
    [1, 'login', 'user', 1, 'Administrator logged in'],
    [1, 'create', 'customer', 1, 'Added customer: Dubai Trade Centre'],
    [1, 'create', 'shipment', 1, 'Created shipment BKG-2026-001'],
    [1, 'create', 'invoice', 1, 'Generated invoice INV-2026-001'],
    [1, 'update', 'pipeline', 5, 'Deal Saudi Expansion moved to Closed Won'],
  ];
  const actStmt = db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id, description)
    VALUES (?, ?, ?, ?, ?)`);
  for (const a of activities) actStmt.run(...a);
  console.log('[Seed] Activity log entries created');

  console.log('');
  console.log('========================================');
  console.log('  USSeaCargo Database Seeded');
  console.log('  Currency: AED (UAE Dirham)');
  console.log('  Default Login: admin / admin123');
  console.log('  Users: admin, manager1, staff1');
  console.log('========================================');

} catch (err) {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
}
