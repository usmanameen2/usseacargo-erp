const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, dbGet, dbRun } = require('../database/db');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name } = req.body;
    if (!username || !password || !email || !full_name) {
      return res.status(400).json({ success: false, message: 'Username, password, email and full name are required' });
    }
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ success: false, message: 'Username already exists' });

    const hash = bcrypt.hashSync(password, 10);
    const initials = full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const result = await dbRun(
      `INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, email, full_name, 'admin', company_name || 'USSeaCargo', initials]
    );

    await dbRun(`INSERT INTO company_settings (user_id, company_name, base_currency, timezone, vat_rate) VALUES (?, ?, 'AED', 'Asia/Dubai', 5)`,
      [result.lastID, company_name || 'USSeaCargo']);

    const token = jwt.sign({ userId: result.lastID, username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, user: { id: result.lastID, username, email, full_name, role: 'admin', company_name, avatar_initials: initials } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username or password' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid username or password' });

    await dbRun("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, company_name: user.company_name, avatar_initials: user.avatar_initials }
      }
    });
  } catch (err) {
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
    const user = await dbGet('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials FROM users WHERE id = ?', [decoded.userId]);
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

    const user = await dbGet('SELECT password_hash FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Old password is incorrect' });

    const newHash = bcrypt.hashSync(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, decoded.userId]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
