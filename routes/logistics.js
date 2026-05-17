const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ========== SHIPPING DOCUMENTS ==========

router.get('/shipping-docs', (req, res) => {
  try {
    const { search, status, doc_type } = req.query;
    let sql = 'SELECT * FROM shipping_docs WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (doc_type) { sql += ' AND doc_type = ?'; params.push(doc_type); }
    if (search) { sql += ' AND (doc_number LIKE ? OR shipper LIKE ? OR consignee LIKE ? OR reference LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Shipping documents retrieved.', data: rows });
  } catch (error) {
    console.error('[Logistics Docs] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load shipping documents.', data: null });
  }
});

// GET /api/logistics/docs-by-type
router.get('/docs-by-type', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT doc_type, COUNT(*) as count, status
       FROM shipping_docs
       WHERE user_id = ?
       GROUP BY doc_type, status
       ORDER BY doc_type`
    ).all(req.user.id);

    // Group by doc_type
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.doc_type]) grouped[r.doc_type] = { type: r.doc_type, total: 0, statuses: {} };
      grouped[r.doc_type].statuses[r.status] = r.count;
      grouped[r.doc_type].total += r.count;
    });

    return res.json({ success: true, message: 'Documents by type retrieved.', data: Object.values(grouped) });
  } catch (error) {
    console.error('[Logistics DocsByType] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load docs by type.', data: null });
  }
});

router.get('/shipping-docs/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM shipping_docs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Shipping document not found.', data: null });
    return res.json({ success: true, message: 'Shipping document retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load shipping document.', data: null });
  }
});

router.post('/shipping-docs', (req, res) => {
  try {
    const { doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status, file_url } = req.body;
    const result = db.prepare(
      `INSERT INTO shipping_docs (user_id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status, file_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status || 'draft', file_url);

    const row = db.prepare('SELECT * FROM shipping_docs WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Shipping document created.', data: row });
  } catch (error) {
    console.error('[Logistics Docs Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create shipping document.', data: null });
  }
});

router.put('/shipping-docs/:id', (req, res) => {
  try {
    const { doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status, file_url } = req.body;
    db.prepare(
      `UPDATE shipping_docs SET doc_type=?, doc_number=?, reference=?, date=?, vessel_voyage=?, shipper=?, consignee=?, port_of_loading=?, port_of_discharge=?, status=?, file_url=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(doc_type, doc_number, reference, date, vessel_voyage, shipper, consignee, port_of_loading, port_of_discharge, status, file_url, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM shipping_docs WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Shipping document updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update shipping document.', data: null });
  }
});

router.delete('/shipping-docs/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shipping_docs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Shipping document deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete shipping document.', data: null });
  }
});

// ========== SHIPMENTS ==========

router.get('/shipments', (req, res) => {
  try {
    const { search, status, incoterm, mode } = req.query;
    let sql = 'SELECT * FROM shipments WHERE user_id = ?';
    const params = [req.user.id];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (incoterm) { sql += ' AND incoterm = ?'; params.push(incoterm); }
    if (mode) { sql += ' AND mode = ?'; params.push(mode); }
    if (search) { sql += ' AND (booking_number LIKE ? OR vessel_name LIKE ? OR shipper LIKE ? OR consignee LIKE ? OR origin LIKE ? OR destination LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY etd DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Shipments retrieved.', data: rows });
  } catch (error) {
    console.error('[Logistics Shipments] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load shipments.', data: null });
  }
});

// GET /api/logistics/active-shipments
router.get('/active-shipments', (req, res) => {
  try {
    const activeStatuses = ['booking_confirmed', 'in_transit', 'at_port', 'customs'];
    const rows = db.prepare(
      `SELECT * FROM shipments WHERE user_id = ? AND status IN ('booking_confirmed', 'in_transit', 'at_port', 'customs') ORDER BY etd`
    ).all(req.user.id);

    const byStatus = {};
    rows.forEach(s => { if (!byStatus[s.status]) byStatus[s.status] = []; byStatus[s.status].push(s); });

    return res.json({
      success: true,
      message: 'Active shipments retrieved.',
      data: {
        count: rows.length,
        shipments: rows,
        byStatus
      }
    });
  } catch (error) {
    console.error('[Logistics ActiveShipments] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load active shipments.', data: null });
  }
});

router.get('/shipments/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM shipments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Shipment not found.', data: null });
    return res.json({ success: true, message: 'Shipment retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load shipment.', data: null });
  }
});

router.post('/shipments', (req, res) => {
  try {
    const { booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm } = req.body;
    const result = db.prepare(
      `INSERT INTO shipments (user_id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status || 'booking_confirmed', incoterm);

    const row = db.prepare('SELECT * FROM shipments WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Shipment created.', data: row });
  } catch (error) {
    console.error('[Logistics Shipments Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create shipment.', data: null });
  }
});

router.put('/shipments/:id', (req, res) => {
  try {
    const { booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm } = req.body;
    db.prepare(
      `UPDATE shipments SET booking_number=?, rotation_number=?, vessel_name=?, carrier_scac=?, shipper=?, consignee=?, mode=?, container_type=?, container_count=?, origin=?, destination=?, etd=?, eta=?, status=?, incoterm=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(booking_number, rotation_number, vessel_name, carrier_scac, shipper, consignee, mode, container_type, container_count, origin, destination, etd, eta, status, incoterm, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Shipment updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update shipment.', data: null });
  }
});

router.delete('/shipments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shipments WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Shipment deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete shipment.', data: null });
  }
});

// ========== CHARGES ==========

router.get('/charges', (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM charges WHERE user_id = ?';
    const params = [req.user.id];
    if (search) { sql += ' AND (charge_code LIKE ? OR charge_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY charge_code';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Charges retrieved.', data: rows });
  } catch (error) {
    console.error('[Logistics Charges] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load charges.', data: null });
  }
});

router.get('/charges/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM charges WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Charge not found.', data: null });
    return res.json({ success: true, message: 'Charge retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load charge.', data: null });
  }
});

router.post('/charges', (req, res) => {
  try {
    const { charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency } = req.body;
    const result = db.prepare(
      `INSERT INTO charges (user_id, charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency || 'USD');

    const row = db.prepare('SELECT * FROM charges WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Charge created.', data: row });
  } catch (error) {
    console.error('[Logistics Charges Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create charge.', data: null });
  }
});

router.put('/charges/:id', (req, res) => {
  try {
    const { charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency } = req.body;
    db.prepare(
      `UPDATE charges SET charge_code=?, charge_name=?, description=?, calculation_method=?, default_rate=?, applicable_to=?, currency=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(charge_code, charge_name, description, calculation_method, default_rate, applicable_to, currency, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM charges WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Charge updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update charge.', data: null });
  }
});

router.delete('/charges/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM charges WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Charge deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete charge.', data: null });
  }
});

// ========== ABBREVIATIONS ==========

router.get('/abbreviations', (req, res) => {
  try {
    const abbreviations = {
      document_types: [
        { code: 'MBL', name: 'Master Bill of Lading', description: 'Primary contract of carriage between shipper and carrier' },
        { code: 'HBL', name: 'House Bill of Lading', description: 'Issued by freight forwarder to individual shippers' },
        { code: 'DO', name: 'Delivery Order', description: 'Instruction to release cargo to consignee' },
        { code: 'NOC', name: 'No Objection Certificate', description: 'Permit for cargo release' },
        { code: 'PL', name: 'Packing List', description: 'Details of cargo contents per package' },
        { code: 'CI', name: 'Commercial Invoice', description: 'Billing document for goods sold' },
        { code: 'CO', name: 'Certificate of Origin', description: 'Declares goods country of manufacture' },
        { code: 'BE', name: 'Bill of Entry', description: 'Customs declaration for imports' },
        { code: 'SI', name: 'Shipping Instructions', description: 'Details provided to carrier for B/L issuance' },
        { code: 'MFT', name: 'Manifest', description: 'Summary of all cargo on vessel' },
      ],
      cargo_modes: [
        { code: 'FCL', name: 'Full Container Load', description: 'Shipper has exclusive use of container' },
        { code: 'LCL', name: 'Less than Container Load', description: 'Cargo shares container with other shipments' },
      ],
      container_types: [
        { code: '20GP', name: '20ft General Purpose', teu: 1 },
        { code: '40GP', name: '40ft General Purpose', teu: 2 },
        { code: '40HQ', name: '40ft High Cube', teu: 2 },
        { code: '45HQ', name: '45ft High Cube', teu: 2.25 },
        { code: '20RF', name: '20ft Reefer', teu: 1 },
        { code: '40RF', name: '40ft Reefer', teu: 2 },
        { code: '20OT', name: '20ft Open Top', teu: 1 },
        { code: '40OT', name: '40ft Open Top', teu: 2 },
        { code: '20FR', name: '20ft Flat Rack', teu: 1 },
        { code: '40FR', name: '40ft Flat Rack', teu: 2 },
        { code: '20TK', name: '20ft Tank', teu: 1 },
      ],
      incoterms: [
        { code: 'EXW', name: 'Ex Works', description: 'Buyer bears all costs from seller premises' },
        { code: 'FOB', name: 'Free On Board', description: 'Seller delivers goods on board vessel' },
        { code: 'CIF', name: 'Cost Insurance Freight', description: 'Seller pays cost, insurance, freight to destination port' },
        { code: 'DDP', name: 'Delivered Duty Paid', description: 'Seller bears all costs to deliver to buyer' },
      ],
      port_operations: [
        { term: 'ETD', meaning: 'Estimated Time of Departure' },
        { term: 'ETA', meaning: 'Estimated Time of Arrival' },
        { term: 'POL', meaning: 'Port of Loading' },
        { term: 'POD', meaning: 'Port of Discharge' },
        { term: 'T/S', meaning: 'Transshipment' },
        { term: 'CY', meaning: 'Container Yard' },
        { term: 'CFS', meaning: 'Container Freight Station' },
        { term: 'DEM', meaning: 'Demurrage' },
        { term: 'DET', meaning: 'Detention' },
        { term: 'DS', meaning: 'Demurrage & Detention' },
      ]
    };

    return res.json({
      success: true,
      message: 'Abbreviations retrieved.',
      data: abbreviations
    });
  } catch (error) {
    console.error('[Logistics Abbreviations] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load abbreviations.', data: null });
  }
});

module.exports = router;
