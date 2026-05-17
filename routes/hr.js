const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ========== EMPLOYEES ==========

router.get('/employees', (req, res) => {
  try {
    const { search, status, department } = req.query;
    let sql = `SELECT e.*, m.first_name || ' ' || m.last_name as manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.id WHERE e.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (department) { sql += ' AND e.department = ?'; params.push(department); }
    if (search) { sql += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY e.last_name, e.first_name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Employees retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Employees] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load employees.', data: null });
  }
});

router.get('/employees/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT e.*, m.first_name || ' ' || m.last_name as manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.id WHERE e.id = ? AND e.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Employee not found.', data: null });
    return res.json({ success: true, message: 'Employee retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load employee.', data: null });
  }
});

router.post('/employees', (req, res) => {
  try {
    const { employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials } = req.body;
    const result = db.prepare(
      `INSERT INTO employees (user_id, employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, employee_id, first_name, last_name, email, phone, department, position, manager_id || null, join_date, salary, status || 'active', avatar_initials);

    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Employee created.', data: row });
  } catch (error) {
    console.error('[HR Employees Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create employee.', data: null });
  }
});

router.put('/employees/:id', (req, res) => {
  try {
    const { employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials } = req.body;
    db.prepare(
      `UPDATE employees SET employee_id=?, first_name=?, last_name=?, email=?, phone=?, department=?, position=?, manager_id=?, join_date=?, salary=?, status=?, avatar_initials=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(employee_id, first_name, last_name, email, phone, department, position, manager_id, join_date, salary, status, avatar_initials, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Employee updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update employee.', data: null });
  }
});

router.delete('/employees/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM employees WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Employee deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete employee.', data: null });
  }
});

// ========== ATTENDANCE ==========

router.get('/attendance', (req, res) => {
  try {
    const { employee_id, date_from, date_to, status } = req.query;
    let sql = `SELECT a.*, e.first_name || ' ' || e.last_name as employee_name FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE a.user_id = ?`;
    const params = [req.user.id];

    if (employee_id) { sql += ' AND a.employee_id = ?'; params.push(employee_id); }
    if (date_from) { sql += ' AND a.date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND a.date <= ?'; params.push(date_to); }
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    sql += ' ORDER BY a.date DESC, e.last_name';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Attendance records retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Attendance] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load attendance.', data: null });
  }
});

// Attendance calendar data
router.get('/attendance-calendar', (req, res) => {
  try {
    const { month, year } = req.query;
    const y = year || '2025';
    const m = month || '06';
    const startDate = `${y}-${m}-01`;
    const endDate = `${y}-${m}-31`;

    const rows = db.prepare(
      `SELECT a.*, e.first_name || ' ' || e.last_name as employee_name 
       FROM attendance a 
       LEFT JOIN employees e ON a.employee_id = e.id 
       WHERE a.user_id = ? AND a.date >= ? AND a.date <= ?
       ORDER BY a.date, e.last_name`
    ).all(req.user.id, startDate, endDate);

    return res.json({ success: true, message: 'Attendance calendar retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Attendance Calendar] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load attendance calendar.', data: null });
  }
});

router.get('/attendance/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT a.*, e.first_name || ' ' || e.last_name as employee_name FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE a.id = ? AND a.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Attendance record not found.', data: null });
    return res.json({ success: true, message: 'Attendance record retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load attendance record.', data: null });
  }
});

router.post('/attendance', (req, res) => {
  try {
    const { employee_id, date, status, check_in, check_out, hours_worked, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO attendance (user_id, employee_id, date, status, check_in, check_out, hours_worked, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, employee_id, date, status, check_in, check_out, hours_worked, notes);

    const row = db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Attendance record created.', data: row });
  } catch (error) {
    console.error('[HR Attendance Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create attendance record.', data: null });
  }
});

router.put('/attendance/:id', (req, res) => {
  try {
    const { employee_id, date, status, check_in, check_out, hours_worked, notes } = req.body;
    db.prepare(
      `UPDATE attendance SET employee_id=?, date=?, status=?, check_in=?, check_out=?, hours_worked=?, notes=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(employee_id, date, status, check_in, check_out, hours_worked, notes, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM attendance WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Attendance record updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update attendance record.', data: null });
  }
});

router.delete('/attendance/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM attendance WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Attendance record deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete attendance record.', data: null });
  }
});

// ========== LEAVE REQUESTS ==========

router.get('/leave-requests', (req, res) => {
  try {
    const { employee_id, status, leave_type } = req.query;
    let sql = `SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name, a.first_name || ' ' || a.last_name as approver_name FROM leave_requests lr LEFT JOIN employees e ON lr.employee_id = e.id LEFT JOIN employees a ON lr.approved_by = a.id WHERE lr.user_id = ?`;
    const params = [req.user.id];

    if (employee_id) { sql += ' AND lr.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND lr.status = ?'; params.push(status); }
    if (leave_type) { sql += ' AND lr.leave_type = ?'; params.push(leave_type); }
    sql += ' ORDER BY lr.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Leave requests retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Leave] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load leave requests.', data: null });
  }
});

router.get('/leave-requests/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name FROM leave_requests lr LEFT JOIN employees e ON lr.employee_id = e.id WHERE lr.id = ? AND lr.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Leave request not found.', data: null });
    return res.json({ success: true, message: 'Leave request retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load leave request.', data: null });
  }
});

router.post('/leave-requests', (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date, days, reason } = req.body;
    const result = db.prepare(
      `INSERT INTO leave_requests (user_id, employee_id, leave_type, from_date, to_date, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(req.user.id, employee_id, leave_type, from_date, to_date, days, reason);

    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Leave request submitted.', data: row });
  } catch (error) {
    console.error('[HR Leave Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.', data: null });
  }
});

// Approve leave
router.put('/leave-requests/:id/approve', (req, res) => {
  try {
    const { approved_by } = req.body;
    db.prepare(`UPDATE leave_requests SET status='approved', approved_by=?, updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(approved_by, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Leave request approved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to approve leave.', data: null });
  }
});

// Reject leave
router.put('/leave-requests/:id/reject', (req, res) => {
  try {
    db.prepare(`UPDATE leave_requests SET status='rejected', updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Leave request rejected.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject leave.', data: null });
  }
});

router.put('/leave-requests/:id', (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date, days, reason, status, approved_by } = req.body;
    db.prepare(
      `UPDATE leave_requests SET employee_id=?, leave_type=?, from_date=?, to_date=?, days=?, reason=?, status=?, approved_by=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(employee_id, leave_type, from_date, to_date, days, reason, status, approved_by, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Leave request updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update leave request.', data: null });
  }
});

router.delete('/leave-requests/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM leave_requests WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Leave request deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete leave request.', data: null });
  }
});

// ========== PAYROLL ==========

router.get('/payroll', (req, res) => {
  try {
    const { employee_id, month, year, status } = req.query;
    let sql = `SELECT pr.*, e.first_name || ' ' || e.last_name as employee_name FROM payroll_records pr LEFT JOIN employees e ON pr.employee_id = e.id WHERE pr.user_id = ?`;
    const params = [req.user.id];

    if (employee_id) { sql += ' AND pr.employee_id = ?'; params.push(employee_id); }
    if (month) { sql += ' AND pr.month = ?'; params.push(month); }
    if (year) { sql += ' AND pr.year = ?'; params.push(year); }
    if (status) { sql += ' AND pr.status = ?'; params.push(status); }
    sql += ' ORDER BY pr.year DESC, pr.month DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Payroll records retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Payroll] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load payroll.', data: null });
  }
});

router.get('/payroll/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT pr.*, e.first_name || ' ' || e.last_name as employee_name FROM payroll_records pr LEFT JOIN employees e ON pr.employee_id = e.id WHERE pr.id = ? AND pr.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Payroll record not found.', data: null });
    return res.json({ success: true, message: 'Payroll record retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load payroll record.', data: null });
  }
});

router.post('/payroll', (req, res) => {
  try {
    const { employee_id, month, year, base_salary, overtime, bonus, tax, deductions, net_pay, status } = req.body;
    const result = db.prepare(
      `INSERT INTO payroll_records (user_id, employee_id, month, year, base_salary, overtime, bonus, tax, deductions, net_pay, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, employee_id, month, year, base_salary, overtime || 0, bonus || 0, tax || 0, deductions || 0, net_pay, status || 'draft');

    const row = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Payroll record created.', data: row });
  } catch (error) {
    console.error('[HR Payroll Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create payroll record.', data: null });
  }
});

router.put('/payroll/:id', (req, res) => {
  try {
    const { employee_id, month, year, base_salary, overtime, bonus, tax, deductions, net_pay, status } = req.body;
    db.prepare(
      `UPDATE payroll_records SET employee_id=?, month=?, year=?, base_salary=?, overtime=?, bonus=?, tax=?, deductions=?, net_pay=?, status=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(employee_id, month, year, base_salary, overtime, bonus, tax, deductions, net_pay, status, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Payroll record updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update payroll record.', data: null });
  }
});

router.delete('/payroll/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM payroll_records WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Payroll record deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete payroll record.', data: null });
  }
});

// ========== RECRUITMENT ==========

router.get('/recruitment', (req, res) => {
  try {
    const { search, stage, position } = req.query;
    let sql = 'SELECT * FROM recruitment_candidates WHERE user_id = ?';
    const params = [req.user.id];

    if (stage) { sql += ' AND stage = ?'; params.push(stage); }
    if (position) { sql += ' AND position = ?'; params.push(position); }
    if (search) { sql += ' AND (candidate_name LIKE ? OR email LIKE ? OR position LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY applied_date DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Recruitment candidates retrieved.', data: rows });
  } catch (error) {
    console.error('[HR Recruitment] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load recruitment.', data: null });
  }
});

router.get('/recruitment/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM recruitment_candidates WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Candidate not found.', data: null });
    return res.json({ success: true, message: 'Candidate retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load candidate.', data: null });
  }
});

router.post('/recruitment', (req, res) => {
  try {
    const { candidate_name, email, phone, position, stage, applied_date, experience_years, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO recruitment_candidates (user_id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, candidate_name, email, phone, position, stage || 'applied', applied_date, experience_years, notes);

    const row = db.prepare('SELECT * FROM recruitment_candidates WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Candidate added.', data: row });
  } catch (error) {
    console.error('[HR Recruitment Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to add candidate.', data: null });
  }
});

router.put('/recruitment/:id', (req, res) => {
  try {
    const { candidate_name, email, phone, position, stage, applied_date, experience_years, notes } = req.body;
    db.prepare(
      `UPDATE recruitment_candidates SET candidate_name=?, email=?, phone=?, position=?, stage=?, applied_date=?, experience_years=?, notes=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(candidate_name, email, phone, position, stage, applied_date, experience_years, notes, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM recruitment_candidates WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Candidate updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update candidate.', data: null });
  }
});

router.delete('/recruitment/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM recruitment_candidates WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Candidate deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete candidate.', data: null });
  }
});

module.exports = router;
