const express = require('express');
const { all, get, run } = require('../database/db');
const socketUtils = require('../utils/socket');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════

router.get('/projects', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM projects ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/projects', async (req, res) => {
  try {
    const { id, name, description, progress, due, budget, spent, status, priority, pm, client, team, startDate, endDate } = req.body;
    const teamStr = Array.isArray(team) ? team.join(',') : team;
    const result = await run(
      `INSERT INTO projects (id, name, description, progress, due_date, budget, spent, status, priority, pm, client, team, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `prj-${Date.now()}`, name, description, progress || 0, due, budget || 0, spent || 0, status || 'Planning', priority || 'Medium', pm, client, teamStr, startDate, endDate]
    );
    const row = await get('SELECT * FROM projects WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'projects', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const { name, description, progress, due, budget, spent, status, priority, pm, client, team, startDate, endDate } = req.body;
    const teamStr = Array.isArray(team) ? team.join(',') : team;
    await run(
      `UPDATE projects SET name = ?, description = ?, progress = ?, due_date = ?, budget = ?, spent = ?, status = ?, priority = ?, pm = ?, client = ?, team = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [name, description, progress, due, budget, spent, status, priority, pm, client, teamStr, startDate, endDate, req.params.id]
    );
    const row = await get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'projects', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    await run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'projects', req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════

router.get('/tasks', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM tasks ORDER BY due_date');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/tasks', async (req, res) => {
  try {
    const { id, title, project, due, assignee, priority, status, likes, comments, attachments, completed, tags } = req.body;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const result = await run(
      `INSERT INTO tasks (id, title, project, due_date, assignee, priority, status, likes, comments, attachments, completed, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || `t-${Date.now()}`, title, project, due, assignee, priority || 'Medium', status || 'To Do', likes || 0, comments || 0, attachments || 0, completed, tagsStr]
    );
    const row = await get('SELECT * FROM tasks WHERE id = ?', [id || result.id]);
    socketUtils.emitCreated(req.user.userId, 'tasks', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, project, due, assignee, priority, status, likes, comments, attachments, completed, tags } = req.body;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    await run(
      `UPDATE tasks SET title = ?, project = ?, due_date = ?, assignee = ?, priority = ?, status = ?, likes = ?, comments = ?, attachments = ?, completed = ?, tags = ? WHERE id = ?`,
      [title, project, due, assignee, priority, status, likes, comments, attachments, completed, tagsStr, req.params.id]
    );
    const row = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    socketUtils.emitUpdated(req.user.userId, 'tasks', row);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    socketUtils.emitDeleted(req.user.userId, 'tasks', req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
