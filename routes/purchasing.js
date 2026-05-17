const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════

router.get('/suppliers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM suppliers ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/suppliers/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/suppliers', async (req, res) => {
  try {
    const { id, name, code, contactPerson, email, phone, address, category, rating, paymentTerms, status, totalOrders } = req.body;
    const result = await run(
      `INSERT INTO suppliers (id, name, code, contact_person, email, phone, address, category, rating, payment_terms, status, total_orders)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `sup-${Date.now()}`, name, code, contactPerson, email, phone, address, category, rating || 3, paymentTerms, status || 'Active', totalOrders || 0]
    );
    const row = await get('SELECT * FROM suppliers WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'suppliers', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, code, contactPerson, email, phone, address, category, rating, paymentTerms, status, totalOrders } = req.body;
    await run(
      `UPDATE suppliers SET name = ?, code = ?, contact_person = ?, email = ?, phone = ?, address = ?, category = ?, rating = ?, payment_terms = ?, status = ?, total_orders = ? WHERE id = ?`,
      [name, code, contactPerson, email, phone, address, category, rating, paymentTerms, status, totalOrders, req.params.id]
    );
    const row = await get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'suppliers', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    await run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'suppliers', req.params.id);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════

router.get('/purchase-orders', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM purchase_orders ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/purchase-orders', async (req, res) => {
  try {
    const { id, poNumber, date, supplier, supplierCode, items, total, expectedDelivery, status } = req.body;
    const result = await run(
      `INSERT INTO purchase_orders (id, po_number, date, supplier, supplier_code, items, total, expected_delivery, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `po-${Date.now()}`, poNumber, date, supplier, supplierCode, items || 1, total || 0, expectedDelivery, status || 'Draft']
    );
    const row = await get('SELECT * FROM purchase_orders WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'purchase-orders', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const { poNumber, date, supplier, supplierCode, items, total, expectedDelivery, status } = req.body;
    await run(
      `UPDATE purchase_orders SET po_number = ?, date = ?, supplier = ?, supplier_code = ?, items = ?, total = ?, expected_delivery = ?, status = ? WHERE id = ?`,
      [poNumber, date, supplier, supplierCode, items, total, expectedDelivery, status, req.params.id]
    );
    const row = await get('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'purchase-orders', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    await run('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'purchase-orders', req.params.id);
    res.json({ success: true, message: 'Purchase order deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════

router.get('/products', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM products ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/products', async (req, res) => {
  try {
    const { id, sku, name, category, warehouse, warehouseCode, quantity, reorderLevel, unitCost, stockValue } = req.body;
    const result = await run(
      `INSERT INTO products (id, sku, name, category, warehouse, warehouse_code, quantity, reorder_level, unit_cost, stock_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `prod-${Date.now()}`, sku, name, category, warehouse, warehouseCode, quantity || 0, reorderLevel || 0, unitCost || 0, stockValue || 0]
    );
    const row = await get('SELECT * FROM products WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'products', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { sku, name, category, warehouse, warehouseCode, quantity, reorderLevel, unitCost, stockValue } = req.body;
    await run(
      `UPDATE products SET sku = ?, name = ?, category = ?, warehouse = ?, warehouse_code = ?, quantity = ?, reorder_level = ?, unit_cost = ?, stock_value = ? WHERE id = ?`,
      [sku, name, category, warehouse, warehouseCode, quantity, reorderLevel, unitCost, stockValue, req.params.id]
    );
    const row = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'products', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'products', req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
