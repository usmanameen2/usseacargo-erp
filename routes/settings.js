const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// ========== COMPANY SETTINGS ==========

router.get('/company', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM company_settings WHERE user_id = ?').get(req.user.id);
    if (!row) {
      // Create default settings
      db.prepare(`INSERT OR IGNORE INTO company_settings (user_id, base_currency, decimal_places) VALUES (?, 'USD', 2)`).run(req.user.id);
      const newRow = db.prepare('SELECT * FROM company_settings WHERE user_id = ?').get(req.user.id);
      return res.json({ success: true, message: 'Company settings retrieved.', data: newRow });
    }
    return res.json({ success: true, message: 'Company settings retrieved.', data: row });
  } catch (error) {
    console.error('[Settings Company] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load company settings.', data: null });
  }
});

router.put('/company', (req, res) => {
  try {
    const { company_name, logo_url, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places } = req.body;
    
    const existing = db.prepare('SELECT id FROM company_settings WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare(
        `UPDATE company_settings SET company_name=?, logo_url=?, address=?, phone=?, email=?, website=?, tax_id=?, registration_number=?, fiscal_year_start=?, base_currency=?, decimal_places=?, updated_at=datetime('now')
         WHERE user_id=?`
      ).run(company_name, logo_url, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places, req.user.id);
    } else {
      db.prepare(
        `INSERT INTO company_settings (user_id, company_name, logo_url, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(req.user.id, company_name, logo_url, address, phone, email, website, tax_id, registration_number, fiscal_year_start, base_currency, decimal_places);
    }

    const row = db.prepare('SELECT * FROM company_settings WHERE user_id = ?').get(req.user.id);
    return res.json({ success: true, message: 'Company settings updated.', data: row });
  } catch (error) {
    console.error('[Settings Company Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update company settings.', data: null });
  }
});

// ========== USERS ==========

router.get('/users', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users WHERE id = ? OR (company_name = (SELECT company_name FROM users WHERE id = ?))'
    ).all(req.user.id, req.user.id);
    return res.json({ success: true, message: 'Users retrieved.', data: rows });
  } catch (error) {
    console.error('[Settings Users] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load users.', data: null });
  }
});

router.post('/users', (req, res) => {
  try {
    const { username, password, email, full_name, role, phone } = req.body;
    const currentUser = db.prepare('SELECT company_name FROM users WHERE id = ?').get(req.user.id);

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ success: false, message: 'Username already exists.', data: null });

    const passwordHash = bcrypt.hashSync(password, 10);
    const avatarInitials = full_name
      ? full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : username.substring(0, 2).toUpperCase();

    const result = db.prepare(
      `INSERT INTO users (username, password_hash, email, full_name, role, company_name, phone, avatar_initials, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(username, passwordHash, email, full_name, role || 'staff', currentUser?.company_name, phone, avatarInitials, 1);

    const row = db.prepare('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'User invited.', data: row });
  } catch (error) {
    console.error('[Settings Users Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to invite user.', data: null });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { email, full_name, role, phone, is_active } = req.body;
    db.prepare(
      `UPDATE users SET email=?, full_name=?, role=?, phone=?, is_active=?, updated_at=datetime('now')
       WHERE id=?`
    ).run(email, full_name, role, phone, is_active, req.params.id);

    const row = db.prepare('SELECT id, username, email, full_name, role, company_name, phone, avatar_initials, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'User updated.', data: row });
  } catch (error) {
    console.error('[Settings Users Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update user.', data: null });
  }
});

// ========== PERMISSIONS ==========

router.get('/permissions', (req, res) => {
  try {
    const permissions = {
      admin: {
        name: 'Administrator',
        description: 'Full access to all modules and settings',
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings', 'approve', 'post_entries', 'export']
      },
      manager: {
        name: 'Manager',
        description: 'Can manage most modules but cannot change system settings',
        permissions: ['read', 'write', 'delete', 'approve', 'post_entries', 'export']
      },
      accountant: {
        name: 'Accountant',
        description: 'Access to financial modules and reporting',
        permissions: ['read', 'write', 'post_entries', 'export']
      },
      staff: {
        name: 'Staff',
        description: 'Limited access to assigned modules',
        permissions: ['read', 'write']
      }
    };

    return res.json({
      success: true,
      message: 'Permissions retrieved.',
      data: permissions
    });
  } catch (error) {
    console.error('[Settings Permissions] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load permissions.', data: null });
  }
});

router.put('/permissions', (req, res) => {
  try {
    // In a real app, this would persist custom permissions per role
    // For now we just return the updated structure
    const { rolePermissions } = req.body;
    return res.json({ success: true, message: 'Permissions updated.', data: rolePermissions });
  } catch (error) {
    console.error('[Settings Permissions Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update permissions.', data: null });
  }
});

// ========== TAX SETTINGS ==========

router.get('/tax', (req, res) => {
  try {
    const company = db.prepare('SELECT tax_id, base_currency, decimal_places FROM company_settings WHERE user_id = ?').get(req.user.id);
    const data = company || { tax_id: '', base_currency: 'USD', decimal_places: 2 };
    // Return with default tax rates
    return res.json({
      success: true,
      message: 'Tax settings retrieved.',
      data: {
        ...data,
        default_tax_rate: 16,
        tax_rates: [
          { name: 'VAT Standard', rate: 16, type: 'vat' },
          { name: 'VAT Reduced', rate: 8, type: 'vat' },
          { name: 'Zero Rated', rate: 0, type: 'vat' },
          { name: 'Exempt', rate: 0, type: 'exempt' },
        ]
      }
    });
  } catch (error) {
    console.error('[Settings Tax] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load tax settings.', data: null });
  }
});

router.put('/tax', (req, res) => {
  try {
    const { tax_id, default_tax_rate, tax_rates } = req.body;
    db.prepare(
      `UPDATE company_settings SET tax_id=?, updated_at=datetime('now') WHERE user_id=?`
    ).run(tax_id, req.user.id);

    return res.json({
      success: true,
      message: 'Tax settings updated.',
      data: { tax_id, default_tax_rate, tax_rates }
    });
  } catch (error) {
    console.error('[Settings Tax Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update tax settings.', data: null });
  }
});

// ========== CURRENCY SETTINGS ==========

router.get('/currency', (req, res) => {
  try {
    const company = db.prepare('SELECT base_currency, decimal_places FROM company_settings WHERE user_id = ?').get(req.user.id);
    const data = company || { base_currency: 'USD', decimal_places: 2 };
    return res.json({
      success: true,
      message: 'Currency settings retrieved.',
      data: {
        ...data,
        currencies: [
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
          { code: 'GBP', name: 'British Pound', symbol: '£' },
          { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
          { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
          { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
        ]
      }
    });
  } catch (error) {
    console.error('[Settings Currency] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load currency settings.', data: null });
  }
});

router.put('/currency', (req, res) => {
  try {
    const { base_currency, decimal_places } = req.body;
    db.prepare(
      `UPDATE company_settings SET base_currency=?, decimal_places=?, updated_at=datetime('now') WHERE user_id=?`
    ).run(base_currency, decimal_places, req.user.id);

    return res.json({
      success: true,
      message: 'Currency settings updated.',
      data: { base_currency, decimal_places }
    });
  } catch (error) {
    console.error('[Settings Currency Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update currency settings.', data: null });
  }
});

// ========== NOTIFICATION SETTINGS ==========

router.get('/notifications', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM notification_settings WHERE user_id = ? ORDER BY category').all(req.user.id);
    return res.json({ success: true, message: 'Notification settings retrieved.', data: rows });
  } catch (error) {
    console.error('[Settings Notifications] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load notification settings.', data: null });
  }
});

router.put('/notifications/:id', (req, res) => {
  try {
    const { email_enabled, in_app_enabled, push_enabled } = req.body;
    db.prepare(
      `UPDATE notification_settings SET email_enabled=?, in_app_enabled=?, push_enabled=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(email_enabled, in_app_enabled, push_enabled, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM notification_settings WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Notification settings updated.', data: row });
  } catch (error) {
    console.error('[Settings Notifications Update] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update notification settings.', data: null });
  }
});

module.exports = router;
