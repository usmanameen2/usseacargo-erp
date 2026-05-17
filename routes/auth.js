const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');
const { get, run, all } = require('../database/db');

const router = express.Router();

// ── POST /api/auth/register ───────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, full_name, company_name } = req.body;

    if (!username || !password || !email || !full_name || !company_name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if user already exists
    const existing = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const avatar_initials = full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const result = await run(
      `INSERT INTO users (username, password_hash, email, full_name, company_name, role, avatar_initials, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [username, password_hash, email, full_name, company_name, 'admin', avatar_initials]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [result.id]);
    const token = signToken({ userId: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        role: user.role,
        avatar_initials: user.avatar_initials,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        role: user.role,
        avatar_initials: user.avatar_initials,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(authHeader.slice(7));
    const user = await get('SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
