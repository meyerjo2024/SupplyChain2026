const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all shifts
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.*, st.name as staff_name, st.role as staff_role
      FROM shifts s
      LEFT JOIN staff st ON s.staff_id = st.id
      ORDER BY s.start_time DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one shift
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT s.*, st.name as staff_name, st.role as staff_role
      FROM shifts s
      LEFT JOIN staff st ON s.staff_id = st.id
      WHERE s.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Shift not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { shift_id, staff_id, vehicle_id, start_time, end_time, shift_type, notes } = req.body;
    if (!shift_id || !staff_id || !start_time || !end_time || !shift_type) {
      return res.status(400).json({ error: 'shift_id, staff_id, start_time, end_time, and shift_type are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO shifts (shift_id, staff_id, vehicle_id, start_time, end_time, shift_type, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(shift_id, staff_id, vehicle_id || null, start_time, end_time, shift_type, notes || null);
    const created = db.prepare('SELECT * FROM shifts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { shift_id, staff_id, vehicle_id, start_time, end_time, shift_type, notes } = req.body;
    const existing = db.prepare('SELECT id FROM shifts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Shift not found' });
    db.prepare(`
      UPDATE shifts SET
        shift_id = ?, staff_id = ?, vehicle_id = ?, start_time = ?, end_time = ?,
        shift_type = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(shift_id, staff_id, vehicle_id || null, start_time, end_time, shift_type, notes || null, req.params.id);
    const updated = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM shifts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Shift not found' });
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Shift deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
