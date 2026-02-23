const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/stockaudit', require('./routes/stockaudit'));

// Dashboard stats endpoint
app.get('/api/dashboard', (req, res) => {
  try {
    const stats = {
      totalEquipment:    db.prepare('SELECT COUNT(*) as count FROM equipment').get().count,
      activeVehicles:    db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status='Active'").get().count,
      pendingApprovals:  db.prepare("SELECT COUNT(*) as count FROM approval_requests WHERE status='Pending'").get().count,
      totalStaff:        db.prepare('SELECT COUNT(*) as count FROM staff').get().count,
      ongoingAudits:     db.prepare("SELECT COUNT(*) as count FROM stock_audits WHERE status='In Progress'").get().count,
      totalVehicles:     db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Medical Supply Chain Platform running on http://localhost:${PORT}`);
});

module.exports = app;
