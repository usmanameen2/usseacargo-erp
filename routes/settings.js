const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// COMPANY PROFILE
// ═══════════════════════════════════════════════════════════════

router.get('/company', async (req, res) => {
  try {
    const row = await get('SELECT * FROM company_settings LIMIT 1');
    res.json({ success: true, data: row || {} });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/company', async (req, res) => {
  try {
    const { companyName, legalName, taxId, regNumber, email, phone, website, address, city, state, zip, country, fiscalMonth, fiscalDay, baseCurrency, timezone } = req.body;
    const existing = await get('SELECT id FROM company_settings LIMIT 1');
    if (existing) {
      await run(
        `UPDATE company_settings SET company_name = ?, legal_name = ?, tax_id = ?, reg_number = ?, email = ?, phone = ?, website = ?, address = ?, city = ?, state = ?, zip = ?, country = ?, fiscal_month = ?, fiscal_day = ?, base_currency = ?, timezone = ? WHERE id = ?`,
        [companyName, legalName, taxId, regNumber, email, phone, website, address, city, state, zip, country, fiscalMonth, fiscalDay, baseCurrency || 'AED', timezone, existing.id]
      );
    } else {
      await run(
        `INSERT INTO company_settings (company_name, legal_name, tax_id, reg_number, email, phone, website, address, city, state, zip, country, fiscal_month, fiscal_day, base_currency, timezone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyName, legalName, taxId, regNumber, email, phone, website, address, city, state, zip, country, fiscalMonth, fiscalDay, baseCurrency || 'AED', timezone]
      );
    }
    const row = await get('SELECT * FROM company_settings LIMIT 1');
    socketUtils.emitUpdated(req.user.userId, 'company', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════

router.get('/users', async (req, res) => {
  try {
    const rows = await all('SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users/:id', async (req, res) => {
  try {
    const row = await get('SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { fullName, email, companyName, role } = req.body;
    await run(
      'UPDATE users SET full_name = ?, email = ?, company_name = ?, role = ? WHERE id = ?',
      [fullName, email, companyName, role, req.params.id]
    );
    const row = await get('SELECT id, username, email, full_name, company_name, role, avatar_initials, created_at FROM users WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'users', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'users', req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// CURRENCIES
// ═══════════════════════════════════════════════════════════════

router.get('/currencies', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM currencies ORDER BY code');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/currencies/:code', async (req, res) => {
  try {
    const { name, symbol, rate } = req.body;
    await run(
      'UPDATE currencies SET name = ?, symbol = ?, rate = ?, updated = datetime("now") WHERE code = ?',
      [name, symbol, rate, req.params.code]
    );
    const row = await get('SELECT * FROM currencies WHERE code = ?', [req.params.code]);
    socketUtils.emitUpdated(req.user.userId, 'currencies', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// TAX RATES
// ═══════════════════════════════════════════════════════════════

router.get('/tax-rates', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM tax_rates ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/tax-rates', async (req, res) => {
  try {
    const { id, name, rate, type, applies, effectiveDate, status } = req.body;
    await run(
      'INSERT INTO tax_rates (id, name, rate, type, applies, effective_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id || `tax-${Date.now()}`, name, rate, type, applies, effectiveDate, status || 'Active']
    );
    const row = await get('SELECT * FROM tax_rates WHERE id = ?', [id || req.body.id]);
    socketUtils.emitCreated(req.user.userId, 'tax-rates', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/tax-rates/:id', async (req, res) => {
  try {
    const { name, rate, type, applies, effectiveDate, status } = req.body;
    await run(
      'UPDATE tax_rates SET name = ?, rate = ?, type = ?, applies = ?, effective_date = ?, status = ? WHERE id = ?',
      [name, rate, type, applies, effectiveDate, status, req.params.id]
    );
    const row = await get('SELECT * FROM tax_rates WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'tax-rates', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/tax-rates/:id', async (req, res) => {
  try {
    await run('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'tax-rates', req.params.id);
    res.json({ success: true, message: 'Tax rate deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
