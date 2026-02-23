const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all equipment
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM equipment ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one equipment
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Equipment not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { name, category, serial_number, manufacturer, model, location, status, quantity, unit, expiration_date, calibration_due_date, notes } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    const stmt = db.prepare(`
      INSERT INTO equipment (name, category, serial_number, manufacturer, model, location, status, quantity, unit, expiration_date, calibration_due_date, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const params = [name, category, serial_number || null, manufacturer || null, model || null,
      location || null, status || 'Available', quantity || 1, unit || 'unit',
      expiration_date || null, calibration_due_date || null, notes || null];
    const info = stmt.run(...params);
    const created = db.prepare('SELECT * FROM equipment WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { name, category, serial_number, manufacturer, model, location, status, quantity, unit, expiration_date, calibration_due_date, notes } = req.body;
    const existing = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Equipment not found' });
    db.prepare(`
      UPDATE equipment SET
        name = ?, category = ?, serial_number = ?, manufacturer = ?, model = ?,
        location = ?, status = ?, quantity = ?, unit = ?, expiration_date = ?,
        calibration_due_date = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, category, serial_number || null, manufacturer || null, model || null,
      location || null, status || 'Available', quantity || 1, unit || 'unit',
      expiration_date || null, calibration_due_date || null, notes || null, req.params.id);
    const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Equipment not found' });
    db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
    res.json({ message: 'Equipment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
