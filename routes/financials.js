const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS (Chart of Accounts)
// ═══════════════════════════════════════════════════════════════

router.get('/accounts', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM accounts ORDER BY code');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/accounts/:code', async (req, res) => {
  try {
    const row = await get('SELECT * FROM accounts WHERE code = ?', [req.params.code]);
    if (!row) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/accounts', async (req, res) => {
  try {
    const { code, name, type, category, balance, status, bold, indent } = req.body;
    await run(
      `INSERT INTO accounts (code, name, type, category, balance, status, bold, indent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, type, category, balance || 0, status || 'Active', bold ? 1 : 0, indent || 0]
    );
    const row = await get('SELECT * FROM accounts WHERE code = ?', [code]);
    socketUtils.emitCreated(req.user.userId, 'accounts', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/accounts/:code', async (req, res) => {
  try {
    const { name, type, category, balance, status, bold, indent } = req.body;
    await run(
      `UPDATE accounts SET name = ?, type = ?, category = ?, balance = ?, status = ?, bold = ?, indent = ? WHERE code = ?`,
      [name, type, category, balance, status, bold ? 1 : 0, indent || 0, req.params.code]
    );
    const row = await get('SELECT * FROM accounts WHERE code = ?', [req.params.code]);
    socketUtils.emitUpdated(req.user.userId, 'accounts', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/accounts/:code', async (req, res) => {
  try {
    await run('DELETE FROM accounts WHERE code = ?', [req.params.code]);
    socketUtils.emitDeleted(req.user.userId, 'accounts', req.params.code);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// JOURNAL ENTRIES
// ═══════════════════════════════════════════════════════════════

router.get('/journal-entries', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM journal_entries ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/journal-entries/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Journal entry not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/journal-entries', async (req, res) => {
  try {
    const { id, entry, date, description, debits, credits, status, lines } = req.body;
    const linesJson = typeof lines === 'object' ? JSON.stringify(lines) : lines;
    const result = await run(
      `INSERT INTO journal_entries (id, entry_number, date, description, debits, credits, status, lines)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `je-${Date.now()}`, entry, date, description, debits || 0, credits || 0, status || 'Draft', linesJson]
    );
    const row = await get('SELECT * FROM journal_entries WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'journal-entries', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/journal-entries/:id', async (req, res) => {
  try {
    const { entry, date, description, debits, credits, status, lines } = req.body;
    const linesJson = typeof lines === 'object' ? JSON.stringify(lines) : lines;
    await run(
      `UPDATE journal_entries SET entry_number = ?, date = ?, description = ?, debits = ?, credits = ?, status = ?, lines = ? WHERE id = ?`,
      [entry, date, description, debits, credits, status, linesJson, req.params.id]
    );
    const row = await get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'journal-entries', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/journal-entries/:id', async (req, res) => {
  try {
    await run('DELETE FROM journal_entries WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'journal-entries', req.params.id);
    res.json({ success: true, message: 'Journal entry deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
