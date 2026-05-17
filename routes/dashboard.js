const express = require('express');
const { dbAll, dbGet } = require('../database/db');
const router = express.Router();

const getUserId = (req) => req.user.id;

router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const customers = await dbGet('SELECT COUNT(*) as c FROM customers WHERE user_id = ?', [userId]);
    const suppliers = await dbGet('SELECT COUNT(*) as c FROM suppliers WHERE user_id = ?', [userId]);
    const invoices = await dbGet('SELECT COUNT(*) as c FROM invoices WHERE user_id = ?', [userId]);
    const totalRevenue = await dbGet('SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE user_id = ? AND status = ?', [userId, 'paid']);
    const outstanding = await dbGet('SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices WHERE user_id = ? AND status IN (?, ?)', [userId, 'sent', 'overdue']);
    const shipments = await dbGet('SELECT COUNT(*) as c FROM shipments WHERE user_id = ?', [userId]);
    const shippingDocs = await dbGet('SELECT COUNT(*) as c FROM shipping_docs WHERE user_id = ?', [userId]);
    const employees = await dbGet('SELECT COUNT(*) as c FROM employees WHERE user_id = ? AND status = ?', [userId, 'active']);
    const pendingLeave = await dbGet('SELECT COUNT(*) as c FROM leave_requests WHERE user_id = ? AND status = ?', [userId, 'pending']);
    const lowStock = await dbGet('SELECT COUNT(*) as c FROM products WHERE user_id = ? AND status = ?', [userId, 'low_stock']);
    const pipelineValue = await dbGet('SELECT COALESCE(SUM(value), 0) as total FROM pipeline_deals WHERE user_id = ? AND stage NOT IN (?, ?)', [userId, 'closed_won', 'closed_lost']);

    res.json({
      success: true,
      data: {
        customers: customers.c,
        suppliers: suppliers.c,
        invoices: invoices.c,
        totalRevenue: totalRevenue.total,
        outstanding: outstanding.total,
        shipments: shipments.c,
        shippingDocs: shippingDocs.c,
        employees: employees.c,
        pendingLeave: pendingLeave.c,
        lowStock: lowStock.c,
        pipelineValue: pipelineValue.total,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
