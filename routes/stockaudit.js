const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all audits
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM stock_audits ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one audit
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM stock_audits WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Stock audit not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { audit_id, name, created_by, status, items, notes } = req.body;
    if (!audit_id || !name) return res.status(400).json({ error: 'audit_id and name are required' });
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    const stmt = db.prepare(`
      INSERT INTO stock_audits (audit_id, name, created_by, status, items, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(audit_id, name, created_by || null, status || 'Pending', itemsJson, notes || null);
    const created = db.prepare('SELECT * FROM stock_audits WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { audit_id, name, created_by, status, items, notes } = req.body;
    const existing = db.prepare('SELECT id FROM stock_audits WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Stock audit not found' });
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    db.prepare(`
      UPDATE stock_audits SET
        audit_id = ?, name = ?, created_by = ?, status = ?, items = ?, notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(audit_id, name, created_by || null, status || 'Pending', itemsJson, notes || null, req.params.id);
    const updated = db.prepare('SELECT * FROM stock_audits WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM stock_audits WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Stock audit not found' });
    db.prepare('DELETE FROM stock_audits WHERE id = ?').run(req.params.id);
    res.json({ message: 'Stock audit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
