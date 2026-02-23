const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all vehicles
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM vehicles ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one vehicle
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { vehicle_id, registration_number, model, year, status, driver_id, oxygen_level, fuel_level, last_maintenance, notes } = req.body;
    if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id is required' });
    const stmt = db.prepare(`
      INSERT INTO vehicles (vehicle_id, registration_number, model, year, status, driver_id, oxygen_level, fuel_level, last_maintenance, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(vehicle_id, registration_number || null, model || null, year || null, status || 'Active', driver_id || null, oxygen_level != null ? oxygen_level : 100, fuel_level != null ? fuel_level : 100, last_maintenance || null, notes || null);
    const created = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { vehicle_id, registration_number, model, year, status, driver_id, oxygen_level, fuel_level, last_maintenance, notes } = req.body;
    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
    db.prepare(`
      UPDATE vehicles SET
        vehicle_id = ?, registration_number = ?, model = ?, year = ?, status = ?,
        driver_id = ?, oxygen_level = ?, fuel_level = ?, last_maintenance = ?,
        notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(vehicle_id, registration_number || null, model || null, year || null, status || 'Active', driver_id || null, oxygen_level != null ? oxygen_level : 100, fuel_level != null ? fuel_level : 100, last_maintenance || null, notes || null, req.params.id);
    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
