const express = require('express');
const db = require('../database/db');

const router = express.Router();

// --- Chart of Accounts ---

// GET /api/financials/accounts
router.get('/accounts', (req, res) => {
  try {
    const { type, search } = req.query;
    let sql = 'SELECT * FROM chart_of_accounts WHERE user_id = ?';
    const params = [req.user.id];

    if (type) {
      sql += ' AND account_type = ?';
      params.push(type);
    }
    if (search) {
      sql += ' AND (account_code LIKE ? OR account_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY account_code';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Accounts retrieved.', data: rows });
  } catch (error) {
    console.error('[Financials Accounts] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load accounts.', data: null });
  }
});

// POST /api/financials/accounts
router.post('/accounts', (req, res) => {
  try {
    const { account_code, account_name, account_type, category, parent_id, balance } = req.body;
    const result = db.prepare(
      `INSERT INTO chart_of_accounts (user_id, account_code, account_name, account_type, category, parent_id, balance, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(req.user.id, account_code, account_name, account_type, category || null, parent_id || null, balance || 0);

    const row = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Account created.', data: row });
  } catch (error) {
    console.error('[Financials Accounts Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create account.', data: null });
  }
});

// GET /api/financials/accounts/:id
router.get('/accounts/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Account not found.', data: null });
    return res.json({ success: true, message: 'Account retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load account.', data: null });
  }
});

// PUT /api/financials/accounts/:id
router.put('/accounts/:id', (req, res) => {
  try {
    const { account_code, account_name, account_type, category, parent_id, balance, is_active } = req.body;
    db.prepare(
      `UPDATE chart_of_accounts SET account_code=?, account_name=?, account_type=?, category=?, parent_id=?, balance=?, is_active=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(account_code, account_name, account_type, category, parent_id, balance, is_active, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Account updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update account.', data: null });
  }
});

// DELETE /api/financials/accounts/:id
router.delete('/accounts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM chart_of_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Account deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete account.', data: null });
  }
});

// --- Journal Entries ---

// GET /api/financials/journal-entries
router.get('/journal-entries', (req, res) => {
  try {
    const { status, search, from, to } = req.query;
    let sql = 'SELECT * FROM journal_entries WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND date >= ?'; params.push(from); }
    if (to) { sql += ' AND date <= ?'; params.push(to); }
    if (search) { sql += ' AND (entry_number LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY date DESC';

    const rows = db.prepare(sql).all(...params);
    // Parse JSON lines
    rows.forEach(r => { if (r.lines) r.lines = JSON.parse(r.lines); });
    return res.json({ success: true, message: 'Journal entries retrieved.', data: rows });
  } catch (error) {
    console.error('[Financials JE] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load journal entries.', data: null });
  }
});

// POST /api/financials/journal-entries
router.post('/journal-entries', (req, res) => {
  try {
    const { entry_number, date, description, reference, lines, status } = req.body;
    let totalDebit = 0, totalCredit = 0;
    if (Array.isArray(lines)) {
      lines.forEach(l => { totalDebit += l.debit || 0; totalCredit += l.credit || 0; });
    }
    const result = db.prepare(
      `INSERT INTO journal_entries (user_id, entry_number, date, description, reference, total_debit, total_credit, status, lines)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, entry_number, date, description, reference, totalDebit, totalCredit, status || 'draft', JSON.stringify(lines || []));

    const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(result.lastInsertRowid);
    if (row.lines) row.lines = JSON.parse(row.lines);
    return res.status(201).json({ success: true, message: 'Journal entry created.', data: row });
  } catch (error) {
    console.error('[Financials JE Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create journal entry.', data: null });
  }
});

// GET /api/financials/journal-entries/:id
router.get('/journal-entries/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Journal entry not found.', data: null });
    if (row.lines) row.lines = JSON.parse(row.lines);
    return res.json({ success: true, message: 'Journal entry retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load journal entry.', data: null });
  }
});

// PUT /api/financials/journal-entries/:id
router.put('/journal-entries/:id', (req, res) => {
  try {
    const { entry_number, date, description, reference, lines, status } = req.body;
    let totalDebit = 0, totalCredit = 0;
    if (Array.isArray(lines)) {
      lines.forEach(l => { totalDebit += l.debit || 0; totalCredit += l.credit || 0; });
    }
    db.prepare(
      `UPDATE journal_entries SET entry_number=?, date=?, description=?, reference=?, total_debit=?, total_credit=?, status=?, lines=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(entry_number, date, description, reference, totalDebit, totalCredit, status, JSON.stringify(lines || []), req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id);
    if (row.lines) row.lines = JSON.parse(row.lines);
    return res.json({ success: true, message: 'Journal entry updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update journal entry.', data: null });
  }
});

// DELETE /api/financials/journal-entries/:id
router.delete('/journal-entries/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Journal entry deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete journal entry.', data: null });
  }
});

// --- General Ledger ---

// GET /api/financials/ledger/:accountId
router.get('/ledger/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    const { from, to } = req.query;

    // Get account details
    const account = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found.', data: null });

    // Get journal entry lines for this account
    let entries = [];
    const jes = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? AND status = ? ORDER BY date').all(req.user.id, 'posted');
    for (const je of jes) {
      if (!je.lines) continue;
      const lines = JSON.parse(je.lines);
      for (const line of lines) {
        if (String(line.account_id) === String(accountId)) {
          entries.push({
            entry_id: je.id,
            entry_number: je.entry_number,
            date: je.date,
            description: line.description || je.description,
            reference: je.reference,
            debit: line.debit || 0,
            credit: line.credit || 0
          });
        }
      }
    }

    if (from) entries = entries.filter(e => e.date >= from);
    if (to) entries = entries.filter(e => e.date <= to);

    // Calculate running balance
    let runningBalance = account.balance;
    // Start with opening balance, then each entry
    entries.forEach(e => {
      if (['asset', 'expense'].includes(account.account_type)) {
        runningBalance += e.debit - e.credit;
      } else {
        runningBalance += e.credit - e.debit;
      }
      e.balance = runningBalance;
    });

    return res.json({
      success: true,
      message: 'General ledger retrieved.',
      data: { account, entries, totalDebit: entries.reduce((s, e) => s + e.debit, 0), totalCredit: entries.reduce((s, e) => s + e.credit, 0) }
    });
  } catch (error) {
    console.error('[Financials Ledger] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load ledger.', data: null });
  }
});

// --- Profit & Loss ---

// GET /api/financials/profit-loss
router.get('/profit-loss', (req, res) => {
  try {
    const { year, from, to } = req.query;
    const userId = req.user.id;

    // Get revenue accounts with balances from posted journal entries
    const revenueAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'revenue' ORDER BY account_code`
    ).all(userId);

    const expenseAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'expense' ORDER BY account_code`
    ).all(userId);

    // Get COGS accounts
    const cogsAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'expense' AND (account_name LIKE '%Cost of Goods%' OR account_code LIKE '5%') ORDER BY account_code`
    ).all(userId);

    // Calculate totals from journal entries for each account
    const getAccountTotal = (accountId) => {
      let total = 0;
      const jes = db.prepare('SELECT lines FROM journal_entries WHERE user_id = ? AND status = ?').all(userId, 'posted');
      for (const je of jes) {
        if (!je.lines) continue;
        const lines = JSON.parse(je.lines);
        for (const line of lines) {
          if (line.account_id === accountId) {
            total += (line.credit || 0) - (line.debit || 0);
          }
        }
      }
      return total;
    };

    let totalRevenue = 0;
    revenueAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id); totalRevenue += a.periodTotal; });

    let totalCOGS = 0;
    cogsAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id); totalCOGS += Math.abs(a.periodTotal); });

    let totalOperatingExpenses = 0;
    expenseAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id); totalOperatingExpenses += Math.abs(a.periodTotal); });

    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalOperatingExpenses;

    return res.json({
      success: true,
      message: 'Profit & Loss statement retrieved.',
      data: {
        revenue: { accounts: revenueAccounts, total: totalRevenue },
        costOfGoodsSold: { accounts: cogsAccounts, total: totalCOGS },
        grossProfit,
        operatingExpenses: { accounts: expenseAccounts, total: totalOperatingExpenses },
        netIncome
      }
    });
  } catch (error) {
    console.error('[Financials P&L] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load P&L.', data: null });
  }
});

// --- Balance Sheet ---

// GET /api/financials/balance-sheet
router.get('/balance-sheet', (req, res) => {
  try {
    const userId = req.user.id;

    const assetAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'asset' ORDER BY account_code`
    ).all(userId);

    const liabilityAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'liability' ORDER BY account_code`
    ).all(userId);

    const equityAccounts = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? AND account_type = 'equity' ORDER BY account_code`
    ).all(userId);

    // Calculate from journal entries
    const getAccountTotal = (accountId, accountType) => {
      let total = 0;
      const jes = db.prepare('SELECT lines FROM journal_entries WHERE user_id = ? AND status = ?').all(userId, 'posted');
      for (const je of jes) {
        if (!je.lines) continue;
        const lines = JSON.parse(je.lines);
        for (const line of lines) {
          if (line.account_id === accountId) {
            if (accountType === 'asset' || accountType === 'expense') {
              total += (line.debit || 0) - (line.credit || 0);
            } else {
              total += (line.credit || 0) - (line.debit || 0);
            }
          }
        }
      }
      return total;
    };

    let totalAssets = 0;
    assetAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id, 'asset') + a.balance; totalAssets += a.periodTotal; });

    let totalLiabilities = 0;
    liabilityAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id, 'liability') + a.balance; totalLiabilities += a.periodTotal; });

    let totalEquity = 0;
    equityAccounts.forEach(a => { a.periodTotal = getAccountTotal(a.id, 'equity') + a.balance; totalEquity += a.periodTotal; });

    return res.json({
      success: true,
      message: 'Balance sheet retrieved.',
      data: {
        assets: { accounts: assetAccounts, total: totalAssets },
        liabilities: { accounts: liabilityAccounts, total: totalLiabilities },
        equity: { accounts: equityAccounts, total: totalEquity },
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      }
    });
  } catch (error) {
    console.error('[Financials Balance Sheet] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load balance sheet.', data: null });
  }
});

module.exports = router;
