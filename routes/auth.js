const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middleware/auth');
const db = require('../database/db');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user/company
 */
router.post('/register', (req, res) => {
  try {
    const { username, password, email, full_name, company_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
        data: null
      });
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists.',
        data: null
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const avatarInitials = full_name
      ? full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : username.substring(0, 2).toUpperCase();

    const result = db.prepare(
      `INSERT INTO users (username, password_hash, email, full_name, role, company_name, avatar_initials, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(username, passwordHash, email || null, full_name || null, 'admin', company_name || null, avatarInitials, 1);

    const userId = result.lastInsertRowid;

    // Create default company settings
    db.prepare(
      `INSERT OR IGNORE INTO company_settings (user_id, company_name, base_currency, decimal_places)
       VALUES (?, ?, ?, ?)`
    ).run(userId, company_name || username, 'USD', 2);

    // Create default notification settings
    const categories = ['sales', 'purchasing', 'inventory', 'finance', 'hr', 'projects', 'logistics', 'system'];
    const insertNotif = db.prepare(
      `INSERT INTO notification_settings (user_id, category, email_enabled, in_app_enabled, push_enabled)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const cat of categories) {
      insertNotif.run(userId, cat, 1, 1, 0);
    }

    const token = generateToken(userId, username, 'admin');

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        token,
        user: {
          id: userId,
          username,
          email: email || null,
          full_name: full_name || null,
          role: 'admin',
          company_name: company_name || null,
          avatar_initials: avatarInitials
        }
      }
    });
  } catch (error) {
    console.error('[Auth Register] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
      data: null
    });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
        data: null
      });
    }

    const user = db.prepare(
      'SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, password_hash FROM users WHERE username = ?'
    ).get(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
        data: null
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
        data: null
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
        data: null
      });
    }

    const token = generateToken(user.id, user.username, user.role);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          company_name: user.company_name,
          phone: user.phone,
          avatar_initials: user.avatar_initials
        }
      }
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Login failed.',
      data: null
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare(
      'SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'User retrieved successfully.',
      data: { user }
    });
  } catch (error) {
    console.error('[Auth Me] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user.',
      data: null
    });
  }
});

module.exports = router;
