const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'erp.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('[Seed] Starting database seed...');

// Delete old database if exists
if (fs.existsSync(DB_PATH)) {
  console.log('[Seed] Removing old database...');
  fs.unlinkSync(DB_PATH);
}

// Create fresh database
const db = new sqlite3.Database(DB_PATH);

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema, (err) => {
  if (err) {
    console.error('[Seed] Schema error:', err.message);
    process.exit(1);
  }
  console.log('[Seed] Schema created.');

  // Create admin user
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.run(
    `INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['admin', adminHash, 'admin@usseacargo.com', 'System Administrator', 'admin', 'USSeaCargo Inc.', '+971-4-123-4567', 'AD', 1],
    function(err) {
      if (err) {
        console.error('[Seed] Admin error:', err.message);
        process.exit(1);
      }
      console.log('[Seed] Admin user created. ID:', this.lastID);

      // Create company settings
      db.run(
        `INSERT INTO company_settings (user_id, company_name, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places, timezone, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [this.lastID, 'USSeaCargo Inc.', 'Jebel Ali Free Zone, Dubai, UAE', '+971-4-123-4567', 'info@usseacargo.com', 'https://usseacargo.com', 'TRN-1234567890123', 'JAFZA-REG-2024-001', '01-01', 'AED', 2, 'Asia/Dubai', 5],
        (err) => {
          if (err) console.error('[Seed] Company settings error:', err.message);
          else console.log('[Seed] Company settings created.');

          // Seed 5 customers
          const customers = [
            ['Dubai Trade Centre', 'Dubai Trade', 'info@dubaitrade.ae', '+971-4-222-3333', 'Dubai, UAE', 'Dubai', 'AE', 'active', 125000],
            ['JAFZA Logistics', 'JAFZA', 'logistics@jafza.ae', '+971-4-888-7777', 'Jebel Ali, Dubai', 'Dubai', 'AE', 'active', 89000],
            ['DP World Operations', 'DP World', 'ops@dpworld.com', '+971-4-555-6666', 'Jebel Ali Port, Dubai', 'Dubai', 'AE', 'active', 234000],
            ['Emirates Shipping', 'Emirates Ship', 'contact@emirates-shipping.ae', '+971-4-444-5555', 'Port Rashid, Dubai', 'Dubai', 'AE', 'active', 67800],
            ['Sharjah Freight Solutions', 'SFS', 'info@sfscargo.ae', '+971-6-555-4444', 'Sharjah, UAE', 'Sharjah', 'AE', 'active', 34500],
          ];
          const custStmt = db.prepare('INSERT INTO customers (user_id, name, company, email, phone, address, city, country, status, total_spent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          for (const c of customers) custStmt.run(1, ...c);
          custStmt.finalize();
          console.log('[Seed] 5 customers created.');

          // Seed 3 shipping documents
          const docs = [
            ['MBL', 'MAEU-DXB-2026-001', 'HLCU-DXB-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'COSCO Shanghai', 'USSeaCargo Inc.', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', 'Master B/L for FCL shipment'],
            ['HBL', 'HBL-USS-2026-001', 'MAEU-DXB-2026-001', '2026-01-15', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'approved', 'House B/L for Dubai Trade'],
            ['DO', 'DO-JAFZA-2026-001', 'REF-001', '2026-01-20', 'N/A', 'JAFZA Logistics', 'JAFZA Logistics', 'N/A', 'Jebel Ali', 'MSCU-1234567', 'submitted', 'Delivery order issued'],
            ['NOC', 'NOC-CUSTOMS-001', 'APP-001', '2026-01-10', 'N/A', 'Dubai Customs', 'USSeaCargo Inc.', 'N/A', 'N/A', null, 'approved', 'No objection for customs clearance'],
            ['PL', 'PL-DTC-2026-001', 'SO-001', '2026-01-12', 'MAERSK HANGZHOU 426S', 'Dubai Trade Centre', 'DP World Operations', 'Shanghai', 'Jebel Ali', 'MSCU-1234567', 'submitted', 'Electronics and machinery parts'],
          ];
          const docStmt = db.prepare('INSERT INTO shipping_docs (user_id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, container_number, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          for (const d of docs) docStmt.run(1, ...d);
          docStmt.finalize();
          console.log('[Seed] 5 shipping documents created.');

          // Close database
          db.close(() => {
            console.log('');
            console.log('========================================');
            console.log('  USSeaCargo Database Seeded');
            console.log('  Login: admin / admin123');
            console.log('========================================');
            process.exit(0);
          });
        }
      );
    }
  );
});
