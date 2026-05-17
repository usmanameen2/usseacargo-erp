const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const router = express.Router();

const DB_PATH = path.join(__dirname, '..', 'database', 'erp.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');

// Helper: get or create database
function getDb() {
  const needsSchema = !fs.existsSync(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);
  db.run('PRAGMA journal_mode = WAL');

  if (needsSchema && fs.existsSync(SCHEMA_PATH)) {
    console.log('[Auth] Creating database schema...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('[Auth] Schema created.');
  }
  return db;
}

// Helper: run SQL with promise
function dbRun(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// POST /api/auth/login - with AUTO-CREATE admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const db = getDb();

    // Check if any users exist - if not, auto-create admin
    const userCount = await dbGet(db, 'SELECT COUNT(*) as c FROM users');

    if (!userCount || userCount.c === 0) {
      console.log('[Auth] No users found - auto-creating admin user...');

      const adminHash = bcrypt.hashSync('admin123', 10);
      const result = await dbRun(db,
        'INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        ['admin', adminHash, 'admin@usseacargo.com', 'System Administrator', 'admin', 'USSeaCargo Inc.', '+971-4-123-4567', 'AD']
      );

      // Create company settings
      await dbRun(db,
        'INSERT INTO company_settings (user_id, company_name, address, phone, email, website, tax_id, registration_number, base_currency, timezone, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [result.lastID, 'USSeaCargo Inc.', 'Jebel Ali Free Zone, Dubai, UAE', '+971-4-123-4567', 'info@usseacargo.com', 'https://usseacargo.com', 'TRN-1234567890123', 'JAFZA-REG-2024-001', 'AED', 'Asia/Dubai', 5]
      );

      console.log('[Auth] Admin user auto-created! Login: admin / admin123');
    }

    // Now try to login
    const user = await dbGet(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      db.close();
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      db.close();
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Update last login
    await dbRun(db, "UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
    db.close();

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company_name: user.company_name,
          avatar_initials: user.avatar_initials
        }
      }
    });
  } catch (err) {
    console.error('[Auth/Login Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name } = req.body;
    if (!username || !password || !email || !full_name) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const db = getDb();
    const existing = await dbGet(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      db.close();
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun(db,
      'INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [username, hash, email, full_name, 'admin', company_name || 'USSeaCargo', initials]
    );

    await dbRun(db,
      'INSERT INTO company_settings (user_id, company_name, base_currency, timezone, vat_rate) VALUES (?, ?, ?, ?, ?)',
      [result.lastID, company_name || 'USSeaCargo', 'AED', 'Asia/Dubai', 5]
    );

    db.close();
    const token = jwt.sign({ userId: result.lastID, username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: { token, user: { id: result.lastID, username, email, full_name, role: 'admin', company_name, avatar_initials: initials } }
    });
  } catch (err) {
    console.error('[Auth/Register Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = await dbGet(db, 'SELECT id, username, email, full_name, role, company_name, phone, avatar_initials FROM users WHERE id = ?', [decoded.userId]);
    db.close();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid token' });
  }
});

// PUT /api/auth/password
router.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: 'Old and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const db = getDb();
    const user = await dbGet(db, 'SELECT password_hash FROM users WHERE id = ?', [decoded.userId]);
    if (!user) { db.close(); return res.status(404).json({ success: false, message: 'User not found' }); }

    const valid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!valid) { db.close(); return res.status(400).json({ success: false, message: 'Old password is incorrect' }); }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await dbRun(db, 'UPDATE users SET password_hash = ? WHERE id = ?', [newHash, decoded.userId]);
    db.close();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
