const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════════

router.get('/employees', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM employees ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/employees', async (req, res) => {
  try {
    const { id, name, department, position, email, phone, joined, status, color, salary, manager, type, dob, gender, address } = req.body;
    const result = await run(
      `INSERT INTO employees (id, name, department, position, email, phone, joined, status, color, salary, manager, type, dob, gender, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `emp-${Date.now()}`, name, department, position, email, phone, joined, status || 'Active', color, salary || 0, manager, type || 'Full-time', dob, gender, address]
    );
    const row = await get('SELECT * FROM employees WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'employees', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const { name, department, position, email, phone, joined, status, color, salary, manager, type, dob, gender, address } = req.body;
    await run(
      `UPDATE employees SET name = ?, department = ?, position = ?, email = ?, phone = ?, joined = ?, status = ?, color = ?, salary = ?, manager = ?, type = ?, dob = ?, gender = ?, address = ? WHERE id = ?`,
      [name, department, position, email, phone, joined, status, color, salary, manager, type, dob, gender, address, req.params.id]
    );
    const row = await get('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'employees', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await run('DELETE FROM employees WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'employees', req.params.id);
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════════

router.get('/leave-requests', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM leave_requests ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/leave-requests/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Leave request not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/leave-requests', async (req, res) => {
  try {
    const { id, employee, employeeId, type, from, to, days, reason, status } = req.body;
    const result = await run(
      `INSERT INTO leave_requests (id, employee, employee_id, type, date_from, date_to, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `leav-${Date.now()}`, employee, employeeId, type, from, to, days || 1, reason, status || 'Pending']
    );
    const row = await get('SELECT * FROM leave_requests WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'leave-requests', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/leave-requests/:id', async (req, res) => {
  try {
    const { employee, employeeId, type, from, to, days, reason, status } = req.body;
    await run(
      `UPDATE leave_requests SET employee = ?, employee_id = ?, type = ?, date_from = ?, date_to = ?, days = ?, reason = ?, status = ? WHERE id = ?`,
      [employee, employeeId, type, from, to, days, reason, status, req.params.id]
    );
    const row = await get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'leave-requests', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/leave-requests/:id', async (req, res) => {
  try {
    await run('DELETE FROM leave_requests WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'leave-requests', req.params.id);
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// RECRUITMENT
// ═══════════════════════════════════════════════════════════════

router.get('/recruitment', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM recruitment ORDER BY applied DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/recruitment/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM recruitment WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/recruitment', async (req, res) => {
  try {
    const { id, name, position, applied, exp, source, stage, startDate } = req.body;
    const result = await run(
      `INSERT INTO recruitment (id, name, position, applied, exp, source, stage, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `cand-${Date.now()}`, name, position, applied, exp || 0, source, stage || 'Applied', startDate]
    );
    const row = await get('SELECT * FROM recruitment WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'recruitment', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/recruitment/:id', async (req, res) => {
  try {
    const { name, position, applied, exp, source, stage, startDate } = req.body;
    await run(
      `UPDATE recruitment SET name = ?, position = ?, applied = ?, exp = ?, source = ?, stage = ?, start_date = ? WHERE id = ?`,
      [name, position, applied, exp, source, stage, startDate, req.params.id]
    );
    const row = await get('SELECT * FROM recruitment WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'recruitment', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/recruitment/:id', async (req, res) => {
  try {
    await run('DELETE FROM recruitment WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'recruitment', req.params.id);
    res.json({ success: true, message: 'Candidate deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
