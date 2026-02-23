const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all approvals
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM approval_requests ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one approval
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Approval request not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', (req, res) => {
  try {
    const { request_id, type, requested_by, item_id, item_name, quantity, notes } = req.body;
    if (!request_id || !type) return res.status(400).json({ error: 'request_id and type are required' });
    const stmt = db.prepare(`
      INSERT INTO approval_requests (request_id, type, requested_by, item_id, item_name, quantity, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const info = stmt.run(request_id, type, requested_by || null, item_id || null, item_name || null, quantity || 1, notes || null);
    const created = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/status - update approval status
router.put('/:id/status', (req, res) => {
  try {
    const { status, clinical_approver_id, fulfilled_by_id, notes } = req.body;
    const existing = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Approval request not found' });

    let clinically_approved_at = existing.clinically_approved_at;
    let fulfilled_at = existing.fulfilled_at;
    let rejected_at = existing.rejected_at;

    if (status === 'Clinically Approved') clinically_approved_at = new Date().toISOString();
    if (status === 'Fulfilled')           fulfilled_at            = new Date().toISOString();
    if (status === 'Rejected')            rejected_at             = new Date().toISOString();

    db.prepare(`
      UPDATE approval_requests SET
        status = ?, clinical_approver_id = ?, fulfilled_by_id = ?, notes = ?,
        clinically_approved_at = ?, fulfilled_at = ?, rejected_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status,
      clinical_approver_id != null ? clinical_approver_id : existing.clinical_approver_id,
      fulfilled_by_id      != null ? fulfilled_by_id      : existing.fulfilled_by_id,
      notes                != null ? notes                : existing.notes,
      clinically_approved_at,
      fulfilled_at,
      rejected_at,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', (req, res) => {
  try {
    const { request_id, type, requested_by, item_id, item_name, quantity, status, notes, clinical_approver_id, fulfilled_by_id } = req.body;
    const existing = db.prepare('SELECT id FROM approval_requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Approval request not found' });
    db.prepare(`
      UPDATE approval_requests SET
        request_id = ?, type = ?, requested_by = ?, item_id = ?, item_name = ?,
        quantity = ?, status = ?, notes = ?, clinical_approver_id = ?, fulfilled_by_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(request_id, type, requested_by || null, item_id || null, item_name || null, quantity || 1, status || 'Pending', notes || null, clinical_approver_id || null, fulfilled_by_id || null, req.params.id);
    const updated = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM approval_requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Approval request not found' });
    db.prepare('DELETE FROM approval_requests WHERE id = ?').run(req.params.id);
    res.json({ message: 'Approval request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
