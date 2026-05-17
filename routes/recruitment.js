const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const router = express.Router();

const getUserId = (req) => req.user.id;

// GET /api/recruitment - List
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const { search } = req.query;
    if (search) {
      const pattern = `%${search}%`;
      const count = await dbGet(`SELECT COUNT(*) as c FROM recruitment_candidates WHERE user_id = ? AND (candidate_name LIKE ? OR position LIKE ? OR email LIKE ?)`, [userId, pattern, pattern, pattern]);
      const rows = await dbAll(`SELECT id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes, created_at FROM recruitment_candidates WHERE user_id = ? AND (candidate_name LIKE ? OR position LIKE ? OR email LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?`, [userId, pattern, pattern, pattern, limit, offset]);
      return res.json({ success: true, data: rows, total: count.c });
    }
    const count = await dbGet(`SELECT COUNT(*) as c FROM recruitment_candidates WHERE user_id = ?`, [userId]);
    const rows = await dbAll(`SELECT id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes, created_at FROM recruitment_candidates WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
    res.json({ success: true, data: rows, total: count.c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recruitment/:id - Get one
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const row = await dbGet(`SELECT id, candidate_name, email, phone, position, stage, applied_date, experience_years, notes, created_at FROM recruitment_candidates WHERE user_id = ? AND id = ?`, [userId, req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/recruitment/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    await dbRun(`DELETE FROM recruitment_candidates WHERE user_id = ? AND id = ?`, [userId, req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
