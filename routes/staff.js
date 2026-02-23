const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all staff
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM staff ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one staff member
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Staff not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { staff_id, name, email, role, phone, assigned_vehicle_id } = req.body;
    if (!staff_id || !name || !role) return res.status(400).json({ error: 'staff_id, name, and role are required' });
    const stmt = db.prepare(`
      INSERT INTO staff (staff_id, name, email, role, phone, assigned_vehicle_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(staff_id, name, email || null, role, phone || null, assigned_vehicle_id || null);
    const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { staff_id, name, email, role, phone, assigned_vehicle_id } = req.body;
    const existing = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Staff not found' });
    db.prepare(`
      UPDATE staff SET
        staff_id = ?, name = ?, email = ?, role = ?, phone = ?, assigned_vehicle_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(staff_id, name, email || null, role, phone || null, assigned_vehicle_id || null, req.params.id);
    const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Staff not found' });
    db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
