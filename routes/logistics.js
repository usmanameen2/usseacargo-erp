const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// SHIPPING DOCUMENTS (generic CRUD for all doc types)
// ═══════════════════════════════════════════════════════════════

router.get('/documents', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM shipping_documents ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/documents/:docType', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM shipping_documents WHERE doc_type = ? ORDER BY date DESC', [req.params.docType]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/documents', async (req, res) => {
  try {
    const { id, docType, docNumber, reference, date, status, shipper, consignee, port } = req.body;
    const result = await run(
      `INSERT INTO shipping_documents (id, doc_type, doc_number, reference, date, status, shipper, consignee, port)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `doc-${Date.now()}`, docType, docNumber, reference, date, status || 'Draft', shipper, consignee, port]
    );
    const row = await get('SELECT * FROM shipping_documents WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'documents', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/documents/:id', async (req, res) => {
  try {
    const { docType, docNumber, reference, date, status, shipper, consignee, port } = req.body;
    await run(
      `UPDATE shipping_documents SET doc_type = ?, doc_number = ?, reference = ?, date = ?, status = ?, shipper = ?, consignee = ?, port = ? WHERE id = ?`,
      [docType, docNumber, reference, date, status, shipper, consignee, port, req.params.id]
    );
    const row = await get('SELECT * FROM shipping_documents WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'documents', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    await run('DELETE FROM shipping_documents WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'documents', req.params.id);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// SHIPMENTS
// ═══════════════════════════════════════════════════════════════

router.get('/shipments', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM shipments ORDER BY etd DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/shipments/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/shipments', async (req, res) => {
  try {
    const { id, blNumber, shipper, consignee, pol, pod, vessel, etd, eta, status, containers, weight, description } = req.body;
    const result = await run(
      `INSERT INTO shipments (id, bl_number, shipper, consignee, pol, pod, vessel, etd, eta, status, containers, weight, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `ship-${Date.now()}`, blNumber, shipper, consignee, pol, pod, vessel, etd, eta, status || 'Booking', containers || 0, weight || 0, description]
    );
    const row = await get('SELECT * FROM shipments WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'shipments', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/shipments/:id', async (req, res) => {
  try {
    const { blNumber, shipper, consignee, pol, pod, vessel, etd, eta, status, containers, weight, description } = req.body;
    await run(
      `UPDATE shipments SET bl_number = ?, shipper = ?, consignee = ?, pol = ?, pod = ?, vessel = ?, etd = ?, eta = ?, status = ?, containers = ?, weight = ?, description = ? WHERE id = ?`,
      [blNumber, shipper, consignee, pol, pod, vessel, etd, eta, status, containers, weight, description, req.params.id]
    );
    const row = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'shipments', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/shipments/:id', async (req, res) => {
  try {
    await run('DELETE FROM shipments WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'shipments', req.params.id);
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
