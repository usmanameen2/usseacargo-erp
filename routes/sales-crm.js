const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════

router.get('/customers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM customers ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/customers', async (req, res) => {
  try {
    const { id, name, company, email, phone, region, status, spent, accountSince, totalOrders, lastOrderDate, notes } = req.body;
    const result = await run(
      `INSERT INTO customers (id, name, company, email, phone, region, status, spent, account_since, total_orders, last_order_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `cust-${Date.now()}`, name, company, email, phone, region, status || 'Active', spent || 0, accountSince, totalOrders || 0, lastOrderDate, notes]
    );
    const row = await get('SELECT * FROM customers WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'customers', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, company, email, phone, region, status, spent, accountSince, totalOrders, lastOrderDate, notes } = req.body;
    await run(
      `UPDATE customers SET name = ?, company = ?, email = ?, phone = ?, region = ?, status = ?, spent = ?, account_since = ?, total_orders = ?, last_order_date = ?, notes = ? WHERE id = ?`,
      [name, company, email, phone, region, status, spent, accountSince, totalOrders, lastOrderDate, notes, req.params.id]
    );
    const row = await get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'customers', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'customers', req.params.id);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// QUOTATIONS
// ═══════════════════════════════════════════════════════════════

router.get('/quotations', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM quotations ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/quotations/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/quotations', async (req, res) => {
  try {
    const { id, quote, date, customer, customerId, amount, valid, status, items } = req.body;
    const result = await run(
      `INSERT INTO quotations (id, quote, date, customer, customer_id, amount, valid_until, status, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `qt-${Date.now()}`, quote, date, customer, customerId, amount, valid, status || 'Draft', items || 1]
    );
    const row = await get('SELECT * FROM quotations WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'quotations', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/quotations/:id', async (req, res) => {
  try {
    const { quote, date, customer, customerId, amount, valid, status, items } = req.body;
    await run(
      `UPDATE quotations SET quote = ?, date = ?, customer = ?, customer_id = ?, amount = ?, valid_until = ?, status = ?, items = ? WHERE id = ?`,
      [quote, date, customer, customerId, amount, valid, status, items, req.params.id]
    );
    const row = await get('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'quotations', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/quotations/:id', async (req, res) => {
  try {
    await run('DELETE FROM quotations WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'quotations', req.params.id);
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// SALES ORDERS
// ═══════════════════════════════════════════════════════════════

router.get('/sales-orders', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM sales_orders ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/sales-orders/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Sales order not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/sales-orders', async (req, res) => {
  try {
    const { id, order, date, customer, customerId, items, total, status } = req.body;
    const result = await run(
      `INSERT INTO sales_orders (id, order_number, date, customer, customer_id, items, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `so-${Date.now()}`, order, date, customer, customerId, items || 1, total || 0, status || 'Pending']
    );
    const row = await get('SELECT * FROM sales_orders WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'sales-orders', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/sales-orders/:id', async (req, res) => {
  try {
    const { order, date, customer, customerId, items, total, status } = req.body;
    await run(
      `UPDATE sales_orders SET order_number = ?, date = ?, customer = ?, customer_id = ?, items = ?, total = ?, status = ? WHERE id = ?`,
      [order, date, customer, customerId, items, total, status, req.params.id]
    );
    const row = await get('SELECT * FROM sales_orders WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'sales-orders', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/sales-orders/:id', async (req, res) => {
  try {
    await run('DELETE FROM sales_orders WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'sales-orders', req.params.id);
    res.json({ success: true, message: 'Sales order deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════

router.get('/invoices', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM invoices ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/invoices', async (req, res) => {
  try {
    const { id, inv, date, customer, customerId, amount, due, status } = req.body;
    const result = await run(
      `INSERT INTO invoices (id, inv_number, date, customer, customer_id, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `inv-${Date.now()}`, inv, date, customer, customerId, amount, due, status || 'Pending']
    );
    const row = await get('SELECT * FROM invoices WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'invoices', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const { inv, date, customer, customerId, amount, due, status } = req.body;
    await run(
      `UPDATE invoices SET inv_number = ?, date = ?, customer = ?, customer_id = ?, amount = ?, due_date = ?, status = ? WHERE id = ?`,
      [inv, date, customer, customerId, amount, due, status, req.params.id]
    );
    const row = await get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'invoices', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    await run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'invoices', req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE DEALS
// ═══════════════════════════════════════════════════════════════

router.get('/pipeline-deals', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM pipeline_deals ORDER BY close_date');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/pipeline-deals/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM pipeline_deals WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/pipeline-deals', async (req, res) => {
  try {
    const { id, customer, customerId, title, value, close, owner, stage, tags, reason } = req.body;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const result = await run(
      `INSERT INTO pipeline_deals (id, customer, customer_id, title, value, close_date, owner, stage, tags, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `deal-${Date.now()}`, customer, customerId, title, value, close, owner, stage || 'Lead', tagsStr, reason]
    );
    const row = await get('SELECT * FROM pipeline_deals WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'pipeline-deals', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/pipeline-deals/:id', async (req, res) => {
  try {
    const { customer, customerId, title, value, close, owner, stage, tags, reason } = req.body;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    await run(
      `UPDATE pipeline_deals SET customer = ?, customer_id = ?, title = ?, value = ?, close_date = ?, owner = ?, stage = ?, tags = ?, reason = ? WHERE id = ?`,
      [customer, customerId, title, value, close, owner, stage, tagsStr, reason, req.params.id]
    );
    const row = await get('SELECT * FROM pipeline_deals WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'pipeline-deals', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/pipeline-deals/:id', async (req, res) => {
  try {
    await run('DELETE FROM pipeline_deals WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'pipeline-deals', req.params.id);
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
