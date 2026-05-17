const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ========== CUSTOMERS ==========

router.get('/customers', (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM customers WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Customers retrieved.', data: rows });
  } catch (error) {
    console.error('[SalesCRM Customers] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load customers.', data: null });
  }
});

router.get('/customers/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Customer not found.', data: null });
    return res.json({ success: true, message: 'Customer retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load customer.', data: null });
  }
});

router.post('/customers', (req, res) => {
  try {
    const { name, company, email, phone, address, city, country, status, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO customers (user_id, name, company, email, phone, address, city, country, status, total_spent, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(req.user.id, name, company, email, phone, address, city, country, status || 'active', notes);

    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Customer created.', data: row });
  } catch (error) {
    console.error('[SalesCRM Customers Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create customer.', data: null });
  }
});

router.put('/customers/:id', (req, res) => {
  try {
    const { name, company, email, phone, address, city, country, status, notes } = req.body;
    db.prepare(
      `UPDATE customers SET name=?, company=?, email=?, phone=?, address=?, city=?, country=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(name, company, email, phone, address, city, country, status, notes, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Customer updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update customer.', data: null });
  }
});

router.delete('/customers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Customer deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete customer.', data: null });
  }
});

// ========== QUOTATIONS ==========

router.get('/quotations', (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    let sql = `SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND q.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND q.customer_id = ?'; params.push(customer_id); }
    if (search) { sql += ' AND (q.quote_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY q.date DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.items) r.items = JSON.parse(r.items); });
    return res.json({ success: true, message: 'Quotations retrieved.', data: rows });
  } catch (error) {
    console.error('[SalesCRM Quotations] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load quotations.', data: null });
  }
});

router.get('/quotations/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ? AND q.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Quotation not found.', data: null });
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Quotation retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load quotation.', data: null });
  }
});

router.post('/quotations', (req, res) => {
  try {
    const { quote_number, customer_id, date, valid_until, items, subtotal, tax, total, status, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO quotations (user_id, quote_number, customer_id, date, valid_until, items, subtotal, tax, total, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, quote_number, customer_id, date, valid_until, JSON.stringify(items || []), subtotal, tax, total, status || 'draft', notes);

    const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(result.lastInsertRowid);
    if (row.items) row.items = JSON.parse(row.items);
    return res.status(201).json({ success: true, message: 'Quotation created.', data: row });
  } catch (error) {
    console.error('[SalesCRM Quotations Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create quotation.', data: null });
  }
});

router.put('/quotations/:id', (req, res) => {
  try {
    const { quote_number, customer_id, date, valid_until, items, subtotal, tax, total, status, notes } = req.body;
    db.prepare(
      `UPDATE quotations SET quote_number=?, customer_id=?, date=?, valid_until=?, items=?, subtotal=?, tax=?, total=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(quote_number, customer_id, date, valid_until, JSON.stringify(items || []), subtotal, tax, total, status, notes, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Quotation updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update quotation.', data: null });
  }
});

router.delete('/quotations/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM quotations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Quotation deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete quotation.', data: null });
  }
});

// ========== SALES ORDERS ==========

router.get('/sales-orders', (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    let sql = `SELECT so.*, c.name as customer_name FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id WHERE so.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND so.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND so.customer_id = ?'; params.push(customer_id); }
    if (search) { sql += ' AND (so.order_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY so.date DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.items) r.items = JSON.parse(r.items); });
    return res.json({ success: true, message: 'Sales orders retrieved.', data: rows });
  } catch (error) {
    console.error('[SalesCRM SO] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load sales orders.', data: null });
  }
});

router.get('/sales-orders/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT so.*, c.name as customer_name FROM sales_orders so LEFT JOIN customers c ON so.customer_id = c.id WHERE so.id = ? AND so.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Sales order not found.', data: null });
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Sales order retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load sales order.', data: null });
  }
});

router.post('/sales-orders', (req, res) => {
  try {
    const { order_number, customer_id, date, items, subtotal, tax, total, status } = req.body;
    const result = db.prepare(
      `INSERT INTO sales_orders (user_id, order_number, customer_id, date, items, subtotal, tax, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, order_number, customer_id, date, JSON.stringify(items || []), subtotal, tax, total, status || 'pending');

    const row = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(result.lastInsertRowid);
    if (row.items) row.items = JSON.parse(row.items);
    return res.status(201).json({ success: true, message: 'Sales order created.', data: row });
  } catch (error) {
    console.error('[SalesCRM SO Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create sales order.', data: null });
  }
});

router.put('/sales-orders/:id', (req, res) => {
  try {
    const { order_number, customer_id, date, items, subtotal, tax, total, status } = req.body;
    db.prepare(
      `UPDATE sales_orders SET order_number=?, customer_id=?, date=?, items=?, subtotal=?, tax=?, total=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(order_number, customer_id, date, JSON.stringify(items || []), subtotal, tax, total, status, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(req.params.id);
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Sales order updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update sales order.', data: null });
  }
});

router.delete('/sales-orders/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sales_orders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Sales order deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete sales order.', data: null });
  }
});

// ========== INVOICES ==========

router.get('/invoices', (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    let sql = `SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND i.customer_id = ?'; params.push(customer_id); }
    if (search) { sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY i.date DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.items) r.items = JSON.parse(r.items); });
    return res.json({ success: true, message: 'Invoices retrieved.', data: rows });
  } catch (error) {
    console.error('[SalesCRM Invoices] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load invoices.', data: null });
  }
});

router.get('/invoices/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found.', data: null });
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Invoice retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load invoice.', data: null });
  }
});

router.post('/invoices', (req, res) => {
  try {
    const { invoice_number, customer_id, order_id, date, due_date, items, subtotal, tax, total, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO invoices (user_id, invoice_number, customer_id, order_id, date, due_date, items, subtotal, tax, total, amount_paid, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(req.user.id, invoice_number, customer_id, order_id || null, date, due_date, JSON.stringify(items || []), subtotal, tax, total, 'draft', notes);

    const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
    if (row.items) row.items = JSON.parse(row.items);
    return res.status(201).json({ success: true, message: 'Invoice created.', data: row });
  } catch (error) {
    console.error('[SalesCRM Invoices Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create invoice.', data: null });
  }
});

router.put('/invoices/:id', (req, res) => {
  try {
    const { invoice_number, customer_id, order_id, date, due_date, items, subtotal, tax, total, amount_paid, status, notes } = req.body;
    db.prepare(
      `UPDATE invoices SET invoice_number=?, customer_id=?, order_id=?, date=?, due_date=?, items=?, subtotal=?, tax=?, total=?, amount_paid=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(invoice_number, customer_id, order_id, date, due_date, JSON.stringify(items || []), subtotal, tax, total, amount_paid, status, notes, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Invoice updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update invoice.', data: null });
  }
});

router.delete('/invoices/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Invoice deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete invoice.', data: null });
  }
});

// ========== PIPELINE DEALS ==========

router.get('/pipeline-deals', (req, res) => {
  try {
    const { search, stage, assigned_to } = req.query;
    let sql = `SELECT p.*, c.name as customer_name FROM pipeline_deals p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.user_id = ?`;
    const params = [req.user.id];

    if (stage) { sql += ' AND p.stage = ?'; params.push(stage); }
    if (assigned_to) { sql += ' AND p.assigned_to = ?'; params.push(assigned_to); }
    if (search) { sql += ' AND (p.deal_name LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY p.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Pipeline deals retrieved.', data: rows });
  } catch (error) {
    console.error('[SalesCRM Pipeline] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load pipeline deals.', data: null });
  }
});

router.get('/pipeline-deals/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT p.*, c.name as customer_name FROM pipeline_deals p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.id = ? AND p.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Deal not found.', data: null });
    return res.json({ success: true, message: 'Deal retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load deal.', data: null });
  }
});

router.post('/pipeline-deals', (req, res) => {
  try {
    const { deal_name, customer_id, stage, value, expected_close_date, probability, notes, assigned_to } = req.body;
    const result = db.prepare(
      `INSERT INTO pipeline_deals (user_id, deal_name, customer_id, stage, value, expected_close_date, probability, notes, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, deal_name, customer_id || null, stage || 'lead', value, expected_close_date, probability || 0, notes, assigned_to);

    const row = db.prepare('SELECT * FROM pipeline_deals WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Pipeline deal created.', data: row });
  } catch (error) {
    console.error('[SalesCRM Pipeline Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create deal.', data: null });
  }
});

router.put('/pipeline-deals/:id', (req, res) => {
  try {
    const { deal_name, customer_id, stage, value, expected_close_date, probability, notes, assigned_to } = req.body;
    db.prepare(
      `UPDATE pipeline_deals SET deal_name=?, customer_id=?, stage=?, value=?, expected_close_date=?, probability=?, notes=?, assigned_to=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(deal_name, customer_id, stage, value, expected_close_date, probability, notes, assigned_to, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM pipeline_deals WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Pipeline deal updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update deal.', data: null });
  }
});

router.delete('/pipeline-deals/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pipeline_deals WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Pipeline deal deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete deal.', data: null });
  }
});

module.exports = router;
