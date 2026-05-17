const express = require('express');
const { dbAll, dbGet } = require('../database/db');
const router = express.Router();

const getUserId = (req) => req.user.id;

router.get('/financial', async (req, res) => {
  try {
    const userId = getUserId(req);
    const revenueByMonth = await dbAll(`SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total), 0) as revenue FROM invoices WHERE user_id = ? AND status = ? GROUP BY month ORDER BY month DESC LIMIT 12`, [userId, 'paid']);
    const expenseByMonth = await dbAll(`SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(total), 0) as expenses FROM purchase_orders WHERE user_id = ? AND status = ? GROUP BY month ORDER BY month DESC LIMIT 12`, [userId, 'received']);
    res.json({ success: true, data: { revenueByMonth, expenseByMonth } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const userId = getUserId(req);
    const topCustomers = await dbAll('SELECT customer_name, COALESCE(SUM(total), 0) as total FROM invoices WHERE user_id = ? GROUP BY customer_name ORDER BY total DESC LIMIT 10', [userId]);
    const byStatus = await dbAll(`SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE user_id = ? GROUP BY status`, [userId]);
    res.json({ success: true, data: { topCustomers, byStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const userId = getUserId(req);
    const byStatus = await dbAll(`SELECT status, COUNT(*) as count FROM products WHERE user_id = ? GROUP BY status`, [userId]);
    const stockValue = await dbGet(`SELECT COALESCE(SUM(quantity * unit_cost), 0) as total FROM products WHERE user_id = ?`, [userId]);
    res.json({ success: true, data: { byStatus, stockValue: stockValue.total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
