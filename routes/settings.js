const express = require('express');
const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun } = require('../database/db');
const router = express.Router();

const getUserId = (req) => req.user.id;

// GET /api/settings/company
router.get('/company', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM company_settings WHERE user_id = ?', [getUserId(req)]);
    if (!row) return res.status(404).json({ success: false, message: 'Company settings not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings/company
router.put('/company', async (req, res) => {
  try {
    const { company_name, address, phone, email, website, tax_id, registration_number, base_currency, vat_rate } = req.body;
    await dbRun(`UPDATE company_settings SET company_name = ?, address = ?, phone = ?, email = ?, website = ?, tax_id = ?, registration_number = ?, base_currency = ?, vat_rate = ? WHERE user_id = ?`,
      [company_name, address, phone, email, website, tax_id, registration_number, base_currency || 'AED', vat_rate || 5, getUserId(req)]);
    res.json({ success: true, message: 'Company settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/users
router.get('/users', async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/users
router.post('/users', async (req, res) => {
  try {
    const { username, password, email, full_name, role, company_name } = req.body;
    if (!username || !password || !email || !full_name) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ success: false, message: 'Username already taken' });

    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun(
      `INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, email, full_name, role || 'staff', company_name, initials]
    );
    res.json({ success: true, data: { id: result.lastID, username, email, full_name, role, avatar_initials: initials } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { role, is_active } = req.body;
    await dbRun('UPDATE users SET role = ?, is_active = ? WHERE id = ?', [role, is_active ? 1 : 0, req.params.id]);
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
