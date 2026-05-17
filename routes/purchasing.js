const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ========== SUPPLIERS ==========

router.get('/suppliers', (req, res) => {
  try {
    const { search, status, category } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Suppliers retrieved.', data: rows });
  } catch (error) {
    console.error('[Purchasing Suppliers] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load suppliers.', data: null });
  }
});

router.get('/suppliers/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM suppliers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Supplier not found.', data: null });
    return res.json({ success: true, message: 'Supplier retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load supplier.', data: null });
  }
});

router.post('/suppliers', (req, res) => {
  try {
    const { name, contact_person, email, phone, address, category, rating, status, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO suppliers (user_id, name, contact_person, email, phone, address, category, rating, status, total_orders)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(req.user.id, name, contact_person, email, phone, address, category, rating || 0, status || 'active');

    const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Supplier created.', data: row });
  } catch (error) {
    console.error('[Purchasing Suppliers Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create supplier.', data: null });
  }
});

router.put('/suppliers/:id', (req, res) => {
  try {
    const { name, contact_person, email, phone, address, category, rating, status } = req.body;
    db.prepare(
      `UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=?, category=?, rating=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(name, contact_person, email, phone, address, category, rating, status, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Supplier updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update supplier.', data: null });
  }
});

router.delete('/suppliers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM suppliers WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Supplier deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete supplier.', data: null });
  }
});

// ========== PURCHASE ORDERS ==========

router.get('/purchase-orders', (req, res) => {
  try {
    const { search, status, supplier_id } = req.query;
    let sql = `SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND po.status = ?'; params.push(status); }
    if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(supplier_id); }
    if (search) { sql += ' AND (po.po_number LIKE ? OR s.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY po.date DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.items) r.items = JSON.parse(r.items); });
    return res.json({ success: true, message: 'Purchase orders retrieved.', data: rows });
  } catch (error) {
    console.error('[Purchasing PO] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load purchase orders.', data: null });
  }
});

router.get('/purchase-orders/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ? AND po.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Purchase order not found.', data: null });
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Purchase order retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load purchase order.', data: null });
  }
});

router.post('/purchase-orders', (req, res) => {
  try {
    const { po_number, supplier_id, date, expected_delivery, items, subtotal, tax, total, status } = req.body;
    const result = db.prepare(
      `INSERT INTO purchase_orders (user_id, po_number, supplier_id, date, expected_delivery, items, subtotal, tax, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, po_number, supplier_id, date, expected_delivery, JSON.stringify(items || []), subtotal, tax, total, status || 'draft');

    const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(result.lastInsertRowid);
    if (row.items) row.items = JSON.parse(row.items);
    return res.status(201).json({ success: true, message: 'Purchase order created.', data: row });
  } catch (error) {
    console.error('[Purchasing PO Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create purchase order.', data: null });
  }
});

router.put('/purchase-orders/:id', (req, res) => {
  try {
    const { po_number, supplier_id, date, expected_delivery, items, subtotal, tax, total, status } = req.body;
    db.prepare(
      `UPDATE purchase_orders SET po_number=?, supplier_id=?, date=?, expected_delivery=?, items=?, subtotal=?, tax=?, total=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(po_number, supplier_id, date, expected_delivery, JSON.stringify(items || []), subtotal, tax, total, status, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (row.items) row.items = JSON.parse(row.items);
    return res.json({ success: true, message: 'Purchase order updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update purchase order.', data: null });
  }
});

router.delete('/purchase-orders/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM purchase_orders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Purchase order deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete purchase order.', data: null });
  }
});

// ========== WAREHOUSES ==========

router.get('/warehouses', (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM warehouses WHERE user_id = ?';
    const params = [req.user.id];
    if (search) { sql += ' AND (name LIKE ? OR location LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Warehouses retrieved.', data: rows });
  } catch (error) {
    console.error('[Purchasing Warehouses] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load warehouses.', data: null });
  }
});

router.get('/warehouses/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM warehouses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Warehouse not found.', data: null });
    return res.json({ success: true, message: 'Warehouse retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load warehouse.', data: null });
  }
});

router.post('/warehouses', (req, res) => {
  try {
    const { name, location, manager, capacity_sqm, contact_phone } = req.body;
    const result = db.prepare(
      `INSERT INTO warehouses (user_id, name, location, manager, capacity_sqm, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, name, location, manager, capacity_sqm, contact_phone);

    const row = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Warehouse created.', data: row });
  } catch (error) {
    console.error('[Purchasing Warehouses Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create warehouse.', data: null });
  }
});

router.put('/warehouses/:id', (req, res) => {
  try {
    const { name, location, manager, capacity_sqm, contact_phone } = req.body;
    db.prepare(
      `UPDATE warehouses SET name=?, location=?, manager=?, capacity_sqm=?, contact_phone=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(name, location, manager, capacity_sqm, contact_phone, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Warehouse updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update warehouse.', data: null });
  }
});

router.delete('/warehouses/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM warehouses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Warehouse deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete warehouse.', data: null });
  }
});

// ========== PRODUCTS ==========

router.get('/products', (req, res) => {
  try {
    const { search, status, warehouse_id, category } = req.query;
    let sql = `SELECT p.*, w.name as warehouse_name FROM products p LEFT JOIN warehouses w ON p.warehouse_id = w.id WHERE p.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (warehouse_id) { sql += ' AND p.warehouse_id = ?'; params.push(warehouse_id); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (search) { sql += ' AND (p.sku LIKE ? OR p.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY p.name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Products retrieved.', data: rows });
  } catch (error) {
    console.error('[Purchasing Products] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load products.', data: null });
  }
});

// Stock level alerts
router.get('/stock-alerts', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT p.*, w.name as warehouse_name 
       FROM products p 
       LEFT JOIN warehouses w ON p.warehouse_id = w.id 
       WHERE p.user_id = ? AND (p.status = 'low_stock' OR p.status = 'out_of_stock')
       ORDER BY p.quantity ASC`
    ).all(req.user.id);
    return res.json({ success: true, message: 'Stock alerts retrieved.', data: rows });
  } catch (error) {
    console.error('[Purchasing Stock Alerts] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load stock alerts.', data: null });
  }
});

router.get('/products/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT p.*, w.name as warehouse_name FROM products p LEFT JOIN warehouses w ON p.warehouse_id = w.id WHERE p.id = ? AND p.user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Product not found.', data: null });
    return res.json({ success: true, message: 'Product retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load product.', data: null });
  }
});

router.post('/products', (req, res) => {
  try {
    const { sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, description, status } = req.body;
    const derivedStatus = status || (quantity <= 0 ? 'out_of_stock' : quantity <= reorder_level ? 'low_stock' : 'in_stock');
    const result = db.prepare(
      `INSERT INTO products (user_id, sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, sku, name, category, warehouse_id || null, quantity || 0, reorder_level || 0, unit_cost || 0, unit_price || 0, description, derivedStatus);

    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Product created.', data: row });
  } catch (error) {
    console.error('[Purchasing Products Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create product.', data: null });
  }
});

router.put('/products/:id', (req, res) => {
  try {
    const { sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, description, status } = req.body;
    const q = quantity !== undefined ? quantity : db.prepare('SELECT quantity FROM products WHERE id = ?').get(req.params.id)?.quantity;
    const rl = reorder_level !== undefined ? reorder_level : db.prepare('SELECT reorder_level FROM products WHERE id = ?').get(req.params.id)?.reorder_level;
    const derivedStatus = status || (q <= 0 ? 'out_of_stock' : q <= rl ? 'low_stock' : 'in_stock');

    db.prepare(
      `UPDATE products SET sku=?, name=?, category=?, warehouse_id=?, quantity=?, reorder_level=?, unit_cost=?, unit_price=?, description=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(sku, name, category, warehouse_id, quantity, reorder_level, unit_cost, unit_price, description, derivedStatus, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Product updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update product.', data: null });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Product deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete product.', data: null });
  }
});

module.exports = router;
