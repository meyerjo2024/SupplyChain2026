const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'supplychain.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ─── Create Tables ────────────────────────────────────────────────────────────

db.exec(`
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('device','consumable','fixed_asset')),
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','In Use','Maintenance','Retired')),
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'unit',
  expiration_date TEXT,
  calibration_due_date TEXT,
  maintenance_history TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT UNIQUE NOT NULL,
  registration_number TEXT,
  model TEXT,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Maintenance','Dispatched')),
  driver_id INTEGER,
  oxygen_level REAL DEFAULT 100,
  fuel_level REAL DEFAULT 100,
  last_maintenance TEXT,
  equipment TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Procurement','Dispatch')),
  requested_by INTEGER,
  item_id INTEGER,
  item_name TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Clinically Approved','Fulfilled','Rejected')),
  notes TEXT,
  clinical_approver_id INTEGER,
  fulfilled_by_id INTEGER,
  requested_at TEXT DEFAULT (datetime('now')),
  clinically_approved_at TEXT,
  fulfilled_at TEXT,
  rejected_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('Paramedic','Driver','Inventory Manager','Clinical Approver','Admin')),
  phone TEXT,
  assigned_vehicle_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id TEXT UNIQUE NOT NULL,
  staff_id INTEGER NOT NULL,
  vehicle_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK(shift_type IN ('Day','Night','On-Call')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Completed')),
  items TEXT DEFAULT '[]',
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// ─── Seed Data ────────────────────────────────────────────────────────────────

// Equipment — only seed if table is empty
const insertEquipment = db.prepare(`
  INSERT INTO equipment
    (name, category, serial_number, manufacturer, model, location, status, quantity, unit, expiration_date, calibration_due_date)
  VALUES
    (@name, @category, @serial_number, @manufacturer, @model, @location, @status, @quantity, @unit, @expiration_date, @calibration_due_date)
`);

const equipmentSeed = [
  { name: 'Defibrillator AED Pro', category: 'device', serial_number: 'SN-001', manufacturer: 'Cardiac Science', model: 'AED Pro 3000', location: 'Ambulance Bay A', status: 'Available', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Oxygen Concentrator', category: 'device', serial_number: 'SN-002', manufacturer: 'Philips', model: 'EverFlo', location: 'ICU Ward', status: 'In Use', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Surgical Gloves (L)', category: 'consumable', serial_number: null, manufacturer: 'MedPro', model: null, location: 'Supply Room', status: 'Available', quantity: 500, unit: 'box', expiration_date: '2025-12-31', calibration_due_date: null },
  { name: 'IV Drip Sets', category: 'consumable', serial_number: null, manufacturer: 'BD Medical', model: null, location: 'Supply Room', status: 'Available', quantity: 200, unit: 'set', expiration_date: null, calibration_due_date: null },
  { name: 'Stretcher Premium', category: 'fixed_asset', serial_number: 'SN-003', manufacturer: 'Ferno', model: 'Model 35', location: 'Emergency Bay', status: 'Available', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Ventilator Model X', category: 'device', serial_number: 'SN-004', manufacturer: 'Dräger', model: 'Evita V800', location: 'ICU Ward', status: 'Maintenance', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: '2025-06-01' },
  { name: 'Blood Pressure Monitor', category: 'device', serial_number: 'SN-005', manufacturer: 'Omron', model: 'HBP-9030', location: 'Outpatient', status: 'Available', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Pulse Oximeter', category: 'device', serial_number: 'SN-006', manufacturer: 'Nonin', model: '9590', location: 'Emergency Bay', status: 'Available', quantity: 1, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Wheelchair Standard', category: 'fixed_asset', serial_number: 'SN-007', manufacturer: 'Drive Medical', model: 'Cruiser III', location: 'Lobby', status: 'Available', quantity: 3, unit: 'unit', expiration_date: null, calibration_due_date: null },
  { name: 'Morphine 10mg', category: 'consumable', serial_number: null, manufacturer: 'Pfizer', model: null, location: 'Pharmacy', status: 'Available', quantity: 100, unit: 'vial', expiration_date: '2026-12-31', calibration_due_date: null },
];

const seedEquipment = db.transaction(() => {
  if (db.prepare('SELECT COUNT(*) as c FROM equipment').get().c === 0) {
    for (const item of equipmentSeed) insertEquipment.run(item);
  }
});
seedEquipment();

// Vehicles
const insertVehicle = db.prepare(`
  INSERT OR IGNORE INTO vehicles (vehicle_id, registration_number, model, year, status, oxygen_level, fuel_level)
  VALUES (@vehicle_id, @registration_number, @model, @year, @status, @oxygen_level, @fuel_level)
`);

const vehicleSeed = [
  { vehicle_id: 'AMB-001', registration_number: 'REG-2022-001', model: 'Ford Transit',       year: 2022, status: 'Active',      oxygen_level: 80, fuel_level: 75 },
  { vehicle_id: 'AMB-002', registration_number: 'REG-2021-002', model: 'Mercedes Sprinter',  year: 2021, status: 'Dispatched',  oxygen_level: 60, fuel_level: 50 },
  { vehicle_id: 'AMB-003', registration_number: 'REG-2023-003', model: 'Toyota HiAce',       year: 2023, status: 'Maintenance', oxygen_level: 30, fuel_level: 90 },
  { vehicle_id: 'AMB-004', registration_number: 'REG-2020-004', model: 'Ford Transit',       year: 2020, status: 'Active',      oxygen_level: 95, fuel_level: 85 },
];

const seedVehicles = db.transaction(() => {
  for (const v of vehicleSeed) insertVehicle.run(v);
});
seedVehicles();

// Staff
const insertStaff = db.prepare(`
  INSERT OR IGNORE INTO staff (staff_id, name, email, role, phone, assigned_vehicle_id)
  VALUES (@staff_id, @name, @email, @role, @phone, @assigned_vehicle_id)
`);

const staffSeed = [
  { staff_id: 'STF-001', name: 'John Smith',     email: 'john.smith@medchain.com',    role: 'Paramedic',          phone: '555-0101', assigned_vehicle_id: 'AMB-001' },
  { staff_id: 'STF-002', name: 'Jane Doe',       email: 'jane.doe@medchain.com',      role: 'Driver',             phone: '555-0102', assigned_vehicle_id: 'AMB-001' },
  { staff_id: 'STF-003', name: 'Bob Johnson',    email: 'bob.johnson@medchain.com',   role: 'Inventory Manager',  phone: '555-0103', assigned_vehicle_id: null },
  { staff_id: 'STF-004', name: 'Dr. Alice Brown',email: 'alice.brown@medchain.com',   role: 'Clinical Approver',  phone: '555-0104', assigned_vehicle_id: null },
  { staff_id: 'STF-005', name: 'Mike Wilson',    email: 'mike.wilson@medchain.com',   role: 'Paramedic',          phone: '555-0105', assigned_vehicle_id: 'AMB-002' },
  { staff_id: 'STF-006', name: 'Sarah Davis',    email: 'sarah.davis@medchain.com',   role: 'Admin',              phone: '555-0106', assigned_vehicle_id: null },
];

const seedStaff = db.transaction(() => {
  for (const s of staffSeed) insertStaff.run(s);
});
seedStaff();

// Approval Requests
const insertApproval = db.prepare(`
  INSERT OR IGNORE INTO approval_requests
    (request_id, type, requested_by, item_name, quantity, status, clinical_approver_id, fulfilled_by_id)
  VALUES
    (@request_id, @type, @requested_by, @item_name, @quantity, @status, @clinical_approver_id, @fulfilled_by_id)
`);

const approvalSeed = [
  { request_id: 'REQ-001', type: 'Procurement', requested_by: 3, item_name: 'Surgical Gloves (L)', quantity: 100, status: 'Pending',            clinical_approver_id: null, fulfilled_by_id: null },
  { request_id: 'REQ-002', type: 'Dispatch',    requested_by: 1, item_name: 'AMB-001',             quantity: 1,   status: 'Clinically Approved', clinical_approver_id: 4,    fulfilled_by_id: null },
  { request_id: 'REQ-003', type: 'Procurement', requested_by: 3, item_name: 'Ventilator Model X',  quantity: 2,   status: 'Fulfilled',           clinical_approver_id: 4,    fulfilled_by_id: 3    },
  { request_id: 'REQ-004', type: 'Dispatch',    requested_by: 5, item_name: 'AMB-002',             quantity: 1,   status: 'Pending',             clinical_approver_id: null, fulfilled_by_id: null },
];

const seedApprovals = db.transaction(() => {
  for (const a of approvalSeed) insertApproval.run(a);
});
seedApprovals();

// Shifts (use today's date)
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const insertShift = db.prepare(`
  INSERT OR IGNORE INTO shifts (shift_id, staff_id, vehicle_id, start_time, end_time, shift_type)
  VALUES (@shift_id, @staff_id, @vehicle_id, @start_time, @end_time, @shift_type)
`);

const shiftSeed = [
  { shift_id: 'SHF-001', staff_id: 1, vehicle_id: 'AMB-001', start_time: `${today}T08:00:00`, end_time: `${today}T20:00:00`,    shift_type: 'Day'   },
  { shift_id: 'SHF-002', staff_id: 2, vehicle_id: 'AMB-001', start_time: `${today}T08:00:00`, end_time: `${today}T20:00:00`,    shift_type: 'Day'   },
  { shift_id: 'SHF-003', staff_id: 5, vehicle_id: 'AMB-002', start_time: `${today}T20:00:00`, end_time: `${tomorrow}T08:00:00`, shift_type: 'Night' },
];

const seedShifts = db.transaction(() => {
  for (const s of shiftSeed) insertShift.run(s);
});
seedShifts();

// Stock Audits
const insertAudit = db.prepare(`
  INSERT OR IGNORE INTO stock_audits (audit_id, name, created_by, status, items)
  VALUES (@audit_id, @name, @created_by, @status, @items)
`);

const auditSeed = [
  {
    audit_id: 'AUD-001',
    name: 'Monthly Equipment Audit',
    created_by: 3,
    status: 'In Progress',
    items: JSON.stringify([
      { equipment_id: 1, name: 'Defibrillator AED Pro',  expected: 1,   counted: null, variance: null },
      { equipment_id: 2, name: 'Oxygen Concentrator',    expected: 1,   counted: null, variance: null },
      { equipment_id: 3, name: 'Surgical Gloves (L)',    expected: 500, counted: null, variance: null },
      { equipment_id: 4, name: 'IV Drip Sets',           expected: 200, counted: null, variance: null },
      { equipment_id: 5, name: 'Stretcher Premium',      expected: 1,   counted: null, variance: null },
    ]),
  },
  {
    audit_id: 'AUD-002',
    name: 'Q1 Drug Audit',
    created_by: 3,
    status: 'Pending',
    items: JSON.stringify([
      { equipment_id: 3,  name: 'Surgical Gloves (L)', expected: 500, counted: null, variance: null },
      { equipment_id: 10, name: 'Morphine 10mg',       expected: 100, counted: null, variance: null },
    ]),
  },
];

const seedAudits = db.transaction(() => {
  for (const a of auditSeed) insertAudit.run(a);
});
seedAudits();

module.exports = db;
