const express = require('express');
const db = require('../database/db');

const router = express.Router();

// ========== PROJECTS ==========

router.get('/projects', (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT p.*, e.first_name || ' ' || e.last_name as manager_name FROM projects p LEFT JOIN employees e ON p.manager_id = e.id WHERE p.user_id = ?`;
    const params = [req.user.id];

    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (search) { sql += ' AND (p.project_name LIKE ? OR p.client LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY p.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Projects retrieved.', data: rows });
  } catch (error) {
    console.error('[Projects] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load projects.', data: null });
  }
});

router.get('/projects/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT p.*, e.first_name || ' ' || e.last_name as manager_name FROM projects p LEFT JOIN employees e ON p.manager_id = e.id WHERE p.id = ? AND p.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found.', data: null });
    return res.json({ success: true, message: 'Project retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load project.', data: null });
  }
});

router.post('/projects', (req, res) => {
  try {
    const { project_name, client, description, manager_id, budget, start_date, end_date } = req.body;
    const result = db.prepare(
      `INSERT INTO projects (user_id, project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?)`
    ).run(req.user.id, project_name, client, description, manager_id || null, budget, start_date, end_date);

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Project created.', data: row });
  } catch (error) {
    console.error('[Projects Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create project.', data: null });
  }
});

router.put('/projects/:id', (req, res) => {
  try {
    const { project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date } = req.body;
    db.prepare(
      `UPDATE projects SET project_name=?, client=?, description=?, manager_id=?, budget=?, spent=?, progress_percent=?, status=?, start_date=?, end_date=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(project_name, client, description, manager_id, budget, spent, progress_percent, status, start_date, end_date, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Project updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update project.', data: null });
  }
});

router.delete('/projects/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Project deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete project.', data: null });
  }
});

// ========== TASKS ==========

router.get('/tasks', (req, res) => {
  try {
    const { project_id, search, stage, priority, assignee_id } = req.query;
    let sql = `SELECT t.*, p.project_name, e.first_name || ' ' || e.last_name as assignee_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN employees e ON t.assignee_id = e.id WHERE t.user_id = ?`;
    const params = [req.user.id];

    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (stage) { sql += ' AND t.stage = ?'; params.push(stage); }
    if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
    if (assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(assignee_id); }
    if (search) { sql += ' AND (t.task_name LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY t.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.tags) r.tags = JSON.parse(r.tags); });
    return res.json({ success: true, message: 'Tasks retrieved.', data: rows });
  } catch (error) {
    console.error('[Projects Tasks] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load tasks.', data: null });
  }
});

// Kanban board data
router.get('/kanban', (req, res) => {
  try {
    const { project_id } = req.query;
    let sql = `SELECT t.*, p.project_name, e.first_name || ' ' || e.last_name as assignee_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN employees e ON t.assignee_id = e.id WHERE t.user_id = ?`;
    const params = [req.user.id];
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    sql += ' ORDER BY t.priority DESC, t.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => { if (r.tags) r.tags = JSON.parse(r.tags); });

    // Group by stage
    const kanban = { todo: [], in_progress: [], review: [], done: [] };
    rows.forEach(t => { if (kanban[t.stage]) kanban[t.stage].push(t); });

    return res.json({ success: true, message: 'Kanban data retrieved.', data: kanban });
  } catch (error) {
    console.error('[Projects Kanban] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load kanban.', data: null });
  }
});

router.get('/tasks/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT t.*, p.project_name, e.first_name || ' ' || e.last_name as assignee_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN employees e ON t.assignee_id = e.id WHERE t.id = ? AND t.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Task not found.', data: null });
    if (row.tags) row.tags = JSON.parse(row.tags);
    return res.json({ success: true, message: 'Task retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load task.', data: null });
  }
});

router.post('/tasks', (req, res) => {
  try {
    const { project_id, task_name, description, assignee_id, stage, priority, due_date, tags } = req.body;
    const result = db.prepare(
      `INSERT INTO tasks (user_id, project_id, task_name, description, assignee_id, stage, priority, due_date, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, project_id || null, task_name, description, assignee_id || null, stage || 'todo', priority || 'medium', due_date, JSON.stringify(tags || []));

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    if (row.tags) row.tags = JSON.parse(row.tags);
    return res.status(201).json({ success: true, message: 'Task created.', data: row });
  } catch (error) {
    console.error('[Projects Tasks Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create task.', data: null });
  }
});

router.put('/tasks/:id', (req, res) => {
  try {
    const { project_id, task_name, description, assignee_id, stage, priority, due_date, tags } = req.body;
    db.prepare(
      `UPDATE tasks SET project_id=?, task_name=?, description=?, assignee_id=?, stage=?, priority=?, due_date=?, tags=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(project_id, task_name, description, assignee_id, stage, priority, due_date, JSON.stringify(tags || []), req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (row.tags) row.tags = JSON.parse(row.tags);
    return res.json({ success: true, message: 'Task updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update task.', data: null });
  }
});

router.delete('/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Task deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete task.', data: null });
  }
});

// ========== TIMESHEETS ==========

router.get('/timesheets', (req, res) => {
  try {
    const { employee_id, project_id, date_from, date_to } = req.query;
    let sql = `SELECT t.*, e.first_name || ' ' || e.last_name as employee_name, p.project_name, tk.task_name FROM timesheets t LEFT JOIN employees e ON t.employee_id = e.id LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN tasks tk ON t.task_id = tk.id WHERE t.user_id = ?`;
    const params = [req.user.id];

    if (employee_id) { sql += ' AND t.employee_id = ?'; params.push(employee_id); }
    if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
    if (date_from) { sql += ' AND t.date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND t.date <= ?'; params.push(date_to); }
    sql += ' ORDER BY t.date DESC';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Timesheets retrieved.', data: rows });
  } catch (error) {
    console.error('[Projects Timesheets] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load timesheets.', data: null });
  }
});

router.get('/timesheets/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT t.*, e.first_name || ' ' || e.last_name as employee_name, p.project_name FROM timesheets t LEFT JOIN employees e ON t.employee_id = e.id LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND t.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Timesheet entry not found.', data: null });
    return res.json({ success: true, message: 'Timesheet entry retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load timesheet entry.', data: null });
  }
});

router.post('/timesheets', (req, res) => {
  try {
    const { employee_id, project_id, task_id, date, hours, description } = req.body;
    const result = db.prepare(
      `INSERT INTO timesheets (user_id, employee_id, project_id, task_id, date, hours, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, employee_id, project_id || null, task_id || null, date, hours, description);

    const row = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Timesheet entry created.', data: row });
  } catch (error) {
    console.error('[Projects Timesheets Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create timesheet entry.', data: null });
  }
});

router.put('/timesheets/:id', (req, res) => {
  try {
    const { employee_id, project_id, task_id, date, hours, description } = req.body;
    db.prepare(
      `UPDATE timesheets SET employee_id=?, project_id=?, task_id=?, date=?, hours=?, description=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(employee_id, project_id, task_id, date, hours, description, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Timesheet entry updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update timesheet entry.', data: null });
  }
});

router.delete('/timesheets/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM timesheets WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Timesheet entry deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete timesheet entry.', data: null });
  }
});

// ========== MILESTONES ==========

router.get('/milestones', (req, res) => {
  try {
    const { project_id, status } = req.query;
    let sql = `SELECT m.*, p.project_name FROM milestones m LEFT JOIN projects p ON m.project_id = p.id WHERE m.user_id = ?`;
    const params = [req.user.id];

    if (project_id) { sql += ' AND m.project_id = ?'; params.push(project_id); }
    if (status) { sql += ' AND m.status = ?'; params.push(status); }
    sql += ' ORDER BY m.due_date';

    const rows = db.prepare(sql).all(...params);
    return res.json({ success: true, message: 'Milestones retrieved.', data: rows });
  } catch (error) {
    console.error('[Projects Milestones] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load milestones.', data: null });
  }
});

router.get('/milestones/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT m.*, p.project_name FROM milestones m LEFT JOIN projects p ON m.project_id = p.id WHERE m.id = ? AND m.user_id = ?`).get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Milestone not found.', data: null });
    return res.json({ success: true, message: 'Milestone retrieved.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load milestone.', data: null });
  }
});

router.post('/milestones', (req, res) => {
  try {
    const { project_id, milestone_name, description, due_date } = req.body;
    const result = db.prepare(
      `INSERT INTO milestones (user_id, project_id, milestone_name, description, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'not_started')`
    ).run(req.user.id, project_id, milestone_name, description, due_date);

    const row = db.prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Milestone created.', data: row });
  } catch (error) {
    console.error('[Projects Milestones Create] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create milestone.', data: null });
  }
});

router.put('/milestones/:id', (req, res) => {
  try {
    const { project_id, milestone_name, description, due_date, status, completed_date } = req.body;
    db.prepare(
      `UPDATE milestones SET project_id=?, milestone_name=?, description=?, due_date=?, status=?, completed_date=?, updated_at=datetime('now')
       WHERE id=? AND user_id=?`
    ).run(project_id, milestone_name, description, due_date, status, completed_date, req.params.id, req.user.id);

    const row = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
    return res.json({ success: true, message: 'Milestone updated.', data: row });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update milestone.', data: null });
  }
});

router.delete('/milestones/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM milestones WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Milestone deleted.', data: null });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete milestone.', data: null });
  }
});

module.exports = router;
