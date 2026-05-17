const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const router = express.Router();

const getUserId = (req) => req.user.id;

// GET /api/purchase-orders - List
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const { search } = req.query;
    if (search) {
      const pattern = `%${search}%`;
      const count = await dbGet(`SELECT COUNT(*) as c FROM purchase_orders WHERE user_id = ? AND (po_number LIKE ? OR supplier_name LIKE ?)`, [userId, pattern, pattern]);
      const rows = await dbAll(`SELECT id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status, created_at FROM purchase_orders WHERE user_id = ? AND (po_number LIKE ? OR supplier_name LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?`, [userId, pattern, pattern, limit, offset]);
      return res.json({ success: true, data: rows, total: count.c });
    }
    const count = await dbGet(`SELECT COUNT(*) as c FROM purchase_orders WHERE user_id = ?`, [userId]);
    const rows = await dbAll(`SELECT id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status, created_at FROM purchase_orders WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
    res.json({ success: true, data: rows, total: count.c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/purchase-orders/:id - Get one
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const row = await dbGet(`SELECT id, po_number, supplier_id, supplier_name, date, expected_delivery, items_json, subtotal, tax, total, status, created_at FROM purchase_orders WHERE user_id = ? AND id = ?`, [userId, req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    await dbRun(`DELETE FROM purchase_orders WHERE user_id = ? AND id = ?`, [userId, req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
