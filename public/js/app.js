/* ═══════════════════════════════════════════════════════════
   MedChain 2026 — SPA JavaScript
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────
let _equipment = [];
let _vehicles  = [];
let _approvals = [];
let _staff     = [];
let _shifts    = [];
let _audits    = [];

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function showSection(name) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard:  'Dashboard',
    equipment:  'Equipment',
    vehicles:   'Fleet Management',
    approvals:  'Approval Requests',
    staff:      'Staff Management',
    shifts:     'Shift Schedule',
    stockaudit: 'Stock Audits',
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;

  switch (name) {
    case 'dashboard':  loadDashboard();  break;
    case 'equipment':  loadEquipment();  break;
    case 'vehicles':   loadVehicles();   break;
    case 'approvals':  loadApprovals();  break;
    case 'staff':      loadStaff();      break;
    case 'shifts':     loadShifts();     break;
    case 'stockaudit': loadAudits();     break;
  }

  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ══════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════
function getStatusBadge(status) {
  const map = {
    'Available':          'badge-available',
    'In Use':             'badge-inuse',
    'Maintenance':        'badge-maintenance',
    'Retired':            'badge-retired',
    'Active':             'badge-active',
    'Dispatched':         'badge-dispatched',
    'Pending':            'badge-pending',
    'Clinically Approved':'badge-approved',
    'Fulfilled':          'badge-fulfilled',
    'Rejected':           'badge-rejected',
    'In Progress':        'badge-inprogress',
    'Completed':          'badge-completed',
    'Day':                'badge-day',
    'Night':              'badge-night',
    'On-Call':            'badge-oncall',
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

function getCategoryBadge(cat) {
  const map = {
    'device':      'badge-device',
    'consumable':  'badge-consumable',
    'fixed_asset': 'badge-fixedasset',
  };
  const labels = { device: 'Device', consumable: 'Consumable', fixed_asset: 'Fixed Asset' };
  return `<span class="badge ${map[cat] || ''}">${labels[cat] || cat}</span>`;
}

function getTypeBadge(type) {
  const map = { Procurement: 'badge-procurement', Dispatch: 'badge-dispatch' };
  return `<span class="badge ${map[type] || ''}">${escHtml(type)}</span>`;
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return str; }
}

function formatDateTime(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return str; }
}

function progressBar(value, label) {
  const pct = Math.max(0, Math.min(100, value));
  const cls = pct >= 60 ? 'progress-high' : pct >= 30 ? 'progress-medium' : 'progress-low';
  return `<div class="progress-wrap">
    <div class="progress-label"><span>${label}</span><span>${pct}%</span></div>
    <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
  </div>`;
}

function expiryClass(dateStr) {
  if (!dateStr) return '';
  const days = (new Date(dateStr) - new Date()) / 86400000;
  if (days < 0)   return 'expiry-warning';
  if (days < 90)  return 'expiry-soon';
  return '';
}

function staffName(id) {
  const s = _staff.find(x => x.id === id);
  return s ? escHtml(s.name) : (id ? `#${id}` : '—');
}

function generateId(prefix, list, field) {
  const max = list.reduce((m, x) => {
    const n = parseInt((x[field] || '').replace(prefix + '-', ''));
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

// ══════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalContent').innerHTML = '';
  }
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const stats = await apiFetch('/api/dashboard');
    document.getElementById('stat-equipment').textContent     = stats.totalEquipment;
    document.getElementById('stat-vehicles').textContent      = stats.activeVehicles;
    document.getElementById('stat-approvals').textContent     = stats.pendingApprovals;
    document.getElementById('stat-staff').textContent         = stats.totalStaff;
    document.getElementById('stat-audits').textContent        = stats.ongoingAudits;
    document.getElementById('stat-total-vehicles').textContent= stats.totalVehicles;

    const [vehicles, approvals, shifts, equipment] = await Promise.all([
      apiFetch('/api/vehicles'),
      apiFetch('/api/approvals'),
      apiFetch('/api/shifts'),
      apiFetch('/api/equipment'),
    ]);

    // Fleet status
    document.getElementById('dash-vehicles').innerHTML = vehicles.length
      ? `<ul class="mini-list">${vehicles.map(v => `
          <li>
            <span class="mini-item-name"><i class="fas fa-ambulance" style="color:var(--primary);margin-right:6px"></i>${escHtml(v.vehicle_id)} — ${escHtml(v.model)}</span>
            ${getStatusBadge(v.status)}
          </li>`).join('')}</ul>`
      : '<div class="empty-state"><i class="fas fa-ambulance"></i>No vehicles</div>';

    // Recent approvals
    const recent = approvals.slice(-5).reverse();
    document.getElementById('dash-approvals').innerHTML = recent.length
      ? `<ul class="mini-list">${recent.map(a => `
          <li>
            <span class="mini-item-name">${escHtml(a.request_id)} — ${escHtml(a.item_name)}</span>
            ${getStatusBadge(a.status)}
          </li>`).join('')}</ul>`
      : '<div class="empty-state"><i class="fas fa-clipboard-check"></i>No approvals</div>';

    // Today's shifts
    const today = new Date().toISOString().slice(0, 10);
    const todayShifts = shifts.filter(s => s.start_time && s.start_time.startsWith(today));
    document.getElementById('dash-shifts').innerHTML = todayShifts.length
      ? `<ul class="mini-list">${todayShifts.map(s => `
          <li>
            <span class="mini-item-name"><i class="fas fa-user-nurse" style="color:var(--primary);margin-right:6px"></i>${escHtml(s.staff_name || 'Unknown')}</span>
            ${getStatusBadge(s.shift_type)}
          </li>`).join('')}</ul>`
      : '<div class="empty-state"><i class="fas fa-calendar-alt"></i>No shifts today</div>';

    // Equipment alerts
    const alerts = [];
    const now = new Date();
    equipment.forEach(e => {
      if (e.status === 'Maintenance') alerts.push({ icon: '🔧', name: e.name, detail: 'Under maintenance', cls: 'badge-maintenance' });
      if (e.expiration_date) {
        const days = (new Date(e.expiration_date) - now) / 86400000;
        if (days < 0)   alerts.push({ icon: '⚠️', name: e.name, detail: `Expired ${formatDate(e.expiration_date)}`, cls: 'badge-rejected' });
        else if (days < 90) alerts.push({ icon: '⏰', name: e.name, detail: `Expires ${formatDate(e.expiration_date)}`, cls: 'badge-pending' });
      }
    });
    document.getElementById('dash-alerts').innerHTML = alerts.length
      ? alerts.slice(0, 6).map(a => `
          <div class="alert-item">
            <span class="alert-icon">${a.icon}</span>
            <div class="alert-text"><strong>${escHtml(a.name)}</strong><small>${escHtml(a.detail)}</small></div>
            <span class="badge ${a.cls}">Alert</span>
          </div>`).join('')
      : '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--green);opacity:1"></i><p>No active alerts</p></div>';

  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  EQUIPMENT
// ══════════════════════════════════════════════════════════
async function loadEquipment() {
  try {
    _equipment = await apiFetch('/api/equipment');
    renderEquipment(_equipment);
  } catch (err) {
    showToast('Failed to load equipment: ' + err.message, 'error');
  }
}

function renderEquipment(list) {
  const tbody = document.getElementById('equipment-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-stethoscope"></i><p>No equipment found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(e => `
    <tr>
      <td><code style="font-size:.78rem;color:var(--text-muted)">#${e.id}</code></td>
      <td><strong>${escHtml(e.name)}</strong></td>
      <td>${getCategoryBadge(e.category)}</td>
      <td>${escHtml(e.serial_number) || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${escHtml(e.manufacturer) || '—'}</td>
      <td>${escHtml(e.location) || '—'}</td>
      <td>${getStatusBadge(e.status)}</td>
      <td>${e.quantity} <small style="color:var(--text-muted)">${escHtml(e.unit)}</small></td>
      <td class="${expiryClass(e.expiration_date)}">${formatDate(e.expiration_date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="openEquipmentModal(${e.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteEquipment(${e.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterEquipment() {
  const q   = document.getElementById('equipment-search').value.toLowerCase();
  const cat = document.getElementById('equipment-filter-cat').value;
  const st  = document.getElementById('equipment-filter-status').value;
  const filtered = _equipment.filter(e =>
    (!q   || e.name.toLowerCase().includes(q) || (e.manufacturer || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q)) &&
    (!cat || e.category === cat) &&
    (!st  || e.status === st)
  );
  renderEquipment(filtered);
}

function openEquipmentModal(id = null) {
  const item = id ? _equipment.find(e => e.id === id) : null;
  const title = item ? 'Edit Equipment' : 'Add Equipment';
  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-stethoscope" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="equipment-form" class="form-grid" onsubmit="saveEquipment(event,${id || 'null'})">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" id="eq-name" required value="${escHtml(item?.name || '')}">
        </div>
        <div class="form-group">
          <label>Category *</label>
          <select id="eq-category" required>
            <option value="">— Select —</option>
            <option value="device"      ${item?.category==='device'      ?'selected':''}>Device</option>
            <option value="consumable"  ${item?.category==='consumable'  ?'selected':''}>Consumable</option>
            <option value="fixed_asset" ${item?.category==='fixed_asset' ?'selected':''}>Fixed Asset</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="eq-status">
            <option value="Available"   ${item?.status==='Available'   ?'selected':''}>Available</option>
            <option value="In Use"      ${item?.status==='In Use'      ?'selected':''}>In Use</option>
            <option value="Maintenance" ${item?.status==='Maintenance' ?'selected':''}>Maintenance</option>
            <option value="Retired"     ${item?.status==='Retired'     ?'selected':''}>Retired</option>
          </select>
        </div>
        <div class="form-group">
          <label>Serial Number</label>
          <input type="text" id="eq-serial" value="${escHtml(item?.serial_number || '')}">
        </div>
        <div class="form-group">
          <label>Manufacturer</label>
          <input type="text" id="eq-manufacturer" value="${escHtml(item?.manufacturer || '')}">
        </div>
        <div class="form-group">
          <label>Model</label>
          <input type="text" id="eq-model" value="${escHtml(item?.model || '')}">
        </div>
        <div class="form-group">
          <label>Location</label>
          <input type="text" id="eq-location" value="${escHtml(item?.location || '')}">
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input type="number" id="eq-quantity" min="0" value="${item?.quantity ?? 1}">
        </div>
        <div class="form-group">
          <label>Unit</label>
          <input type="text" id="eq-unit" value="${escHtml(item?.unit || 'unit')}">
        </div>
        <div class="form-group">
          <label>Expiration Date</label>
          <input type="date" id="eq-expiry" value="${item?.expiration_date || ''}">
        </div>
        <div class="form-group">
          <label>Calibration Due</label>
          <input type="date" id="eq-calibration" value="${item?.calibration_due_date || ''}">
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea id="eq-notes">${escHtml(item?.notes || '')}</textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEquipment(null,${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveEquipment(e, id) {
  if (e) e.preventDefault();
  const body = {
    name:                document.getElementById('eq-name').value.trim(),
    category:            document.getElementById('eq-category').value,
    status:              document.getElementById('eq-status').value,
    serial_number:       document.getElementById('eq-serial').value.trim() || null,
    manufacturer:        document.getElementById('eq-manufacturer').value.trim() || null,
    model:               document.getElementById('eq-model').value.trim() || null,
    location:            document.getElementById('eq-location').value.trim() || null,
    quantity:            parseInt(document.getElementById('eq-quantity').value) || 1,
    unit:                document.getElementById('eq-unit').value.trim() || 'unit',
    expiration_date:     document.getElementById('eq-expiry').value || null,
    calibration_due_date:document.getElementById('eq-calibration').value || null,
    notes:               document.getElementById('eq-notes').value.trim() || null,
  };
  if (!body.name || !body.category) { showToast('Name and category are required', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/equipment/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Equipment updated successfully', 'success');
    } else {
      await apiFetch('/api/equipment', { method: 'POST', body: JSON.stringify(body) });
      showToast('Equipment added successfully', 'success');
    }
    closeModal();
    loadEquipment();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteEquipment(id) {
  const item = _equipment.find(e => e.id === id);
  if (!confirm(`Delete "${item?.name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/equipment/${id}`, { method: 'DELETE' });
    showToast('Equipment deleted', 'success');
    loadEquipment();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  VEHICLES
// ══════════════════════════════════════════════════════════
async function loadVehicles() {
  try {
    _vehicles = await apiFetch('/api/vehicles');
    renderVehicles(_vehicles);
  } catch (err) {
    showToast('Failed to load vehicles: ' + err.message, 'error');
  }
}

function renderVehicles(list) {
  // Cards
  const grid = document.getElementById('vehicles-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-ambulance"></i><p>No vehicles found</p></div>';
  } else {
    grid.innerHTML = list.map(v => `
      <div class="vehicle-card ${(v.status || '').toLowerCase()}">
        <div class="vehicle-card-header">
          <span class="vehicle-id"><i class="fas fa-ambulance"></i> ${escHtml(v.vehicle_id)}</span>
          ${getStatusBadge(v.status)}
        </div>
        <div class="vehicle-model">${escHtml(v.model)} · ${v.year || '—'} · ${escHtml(v.registration_number)}</div>
        <div class="vehicle-levels">
          ${progressBar(v.oxygen_level, 'O₂ Level')}
          ${progressBar(v.fuel_level,   'Fuel')}
        </div>
        <div style="margin-top:12px;display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="openVehicleModal(${v.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteVehicle(${v.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('');
  }

  // Table
  const tbody = document.getElementById('vehicles-tbody');
  tbody.innerHTML = list.map(v => `
    <tr>
      <td><strong>${escHtml(v.vehicle_id)}</strong></td>
      <td>${escHtml(v.registration_number) || '—'}</td>
      <td>${escHtml(v.model) || '—'}</td>
      <td>${v.year || '—'}</td>
      <td>${getStatusBadge(v.status)}</td>
      <td>${progressBar(v.oxygen_level, 'O₂')}</td>
      <td>${progressBar(v.fuel_level, 'Fuel')}</td>
      <td>${formatDate(v.last_maintenance)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openVehicleModal(${v.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteVehicle(${v.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="9" class="loading">No vehicles</td></tr>';
}

function openVehicleModal(id = null) {
  const item = id ? _vehicles.find(v => v.id === id) : null;
  const title = item ? 'Edit Vehicle' : 'Add Vehicle';
  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-ambulance" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Vehicle ID *</label>
          <input type="text" id="vh-id" required value="${escHtml(item?.vehicle_id || '')}">
        </div>
        <div class="form-group">
          <label>Registration No.</label>
          <input type="text" id="vh-reg" value="${escHtml(item?.registration_number || '')}">
        </div>
        <div class="form-group">
          <label>Model</label>
          <input type="text" id="vh-model" value="${escHtml(item?.model || '')}">
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="number" id="vh-year" min="2000" max="2030" value="${item?.year || ''}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="vh-status">
            <option value="Active"      ${item?.status==='Active'      ?'selected':''}>Active</option>
            <option value="Maintenance" ${item?.status==='Maintenance' ?'selected':''}>Maintenance</option>
            <option value="Dispatched"  ${item?.status==='Dispatched'  ?'selected':''}>Dispatched</option>
          </select>
        </div>
        <div class="form-group">
          <label>Last Maintenance</label>
          <input type="date" id="vh-maintenance" value="${item?.last_maintenance ? item.last_maintenance.slice(0,10) : ''}">
        </div>
        <div class="form-group">
          <label>Oxygen Level (%)</label>
          <input type="number" id="vh-oxygen" min="0" max="100" value="${item?.oxygen_level ?? 100}">
        </div>
        <div class="form-group">
          <label>Fuel Level (%)</label>
          <input type="number" id="vh-fuel" min="0" max="100" value="${item?.fuel_level ?? 100}">
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea id="vh-notes">${escHtml(item?.notes || '')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveVehicle(${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveVehicle(id) {
  const body = {
    vehicle_id:           document.getElementById('vh-id').value.trim(),
    registration_number:  document.getElementById('vh-reg').value.trim() || null,
    model:                document.getElementById('vh-model').value.trim() || null,
    year:                 parseInt(document.getElementById('vh-year').value) || null,
    status:               document.getElementById('vh-status').value,
    last_maintenance:     document.getElementById('vh-maintenance').value || null,
    oxygen_level:         parseFloat(document.getElementById('vh-oxygen').value) ?? 100,
    fuel_level:           parseFloat(document.getElementById('vh-fuel').value) ?? 100,
    notes:                document.getElementById('vh-notes').value.trim() || null,
  };
  if (!body.vehicle_id) { showToast('Vehicle ID is required', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Vehicle updated', 'success');
    } else {
      await apiFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(body) });
      showToast('Vehicle added', 'success');
    }
    closeModal();
    loadVehicles();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteVehicle(id) {
  const v = _vehicles.find(x => x.id === id);
  if (!confirm(`Delete vehicle "${v?.vehicle_id}"?`)) return;
  try {
    await apiFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    showToast('Vehicle deleted', 'success');
    loadVehicles();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  APPROVALS
// ══════════════════════════════════════════════════════════
async function loadApprovals() {
  try {
    [_approvals, _staff] = await Promise.all([apiFetch('/api/approvals'), _staff.length ? Promise.resolve(_staff) : apiFetch('/api/staff')]);
    renderApprovals(_approvals);
  } catch (err) {
    showToast('Failed to load approvals: ' + err.message, 'error');
  }
}

function renderApprovals(list) {
  const tbody = document.getElementById('approvals-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No approval requests</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(a => `
    <tr>
      <td><code style="font-size:.78rem">${escHtml(a.request_id)}</code></td>
      <td>${getTypeBadge(a.type)}</td>
      <td><strong>${escHtml(a.item_name)}</strong></td>
      <td>${a.quantity}</td>
      <td>${staffName(a.requested_by)}</td>
      <td>${getStatusBadge(a.status)}</td>
      <td>${formatDateTime(a.requested_at)}</td>
      <td>
        <div class="action-btns" style="flex-wrap:wrap">
          ${a.status === 'Pending' ? `
            <button class="btn btn-success btn-sm" title="Approve" onclick="updateApprovalStatus(${a.id},'Clinically Approved')"><i class="fas fa-check"></i></button>
            <button class="btn btn-danger btn-sm" title="Reject" onclick="updateApprovalStatus(${a.id},'Rejected')"><i class="fas fa-times"></i></button>` : ''}
          ${a.status === 'Clinically Approved' ? `
            <button class="btn btn-primary btn-sm" title="Fulfill" onclick="updateApprovalStatus(${a.id},'Fulfilled')"><i class="fas fa-check-double"></i></button>` : ''}
          <button class="btn btn-secondary btn-sm btn-icon" title="Edit" onclick="openApprovalModal(${a.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="deleteApproval(${a.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterApprovals() {
  const st   = document.getElementById('approvals-filter-status').value;
  const type = document.getElementById('approvals-filter-type').value;
  renderApprovals(_approvals.filter(a => (!st || a.status === st) && (!type || a.type === type)));
}

function openApprovalModal(id = null) {
  const item = id ? _approvals.find(a => a.id === id) : null;
  const title = item ? 'Edit Approval Request' : 'New Approval Request';
  const newId = item ? item.request_id : generateId('REQ', _approvals, 'request_id');
  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-clipboard-check" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Request ID *</label>
          <input type="text" id="ap-id" required value="${escHtml(newId)}">
        </div>
        <div class="form-group">
          <label>Type *</label>
          <select id="ap-type">
            <option value="Procurement" ${item?.type==='Procurement'?'selected':''}>Procurement</option>
            <option value="Dispatch"    ${item?.type==='Dispatch'   ?'selected':''}>Dispatch</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Item Name *</label>
          <input type="text" id="ap-item" required value="${escHtml(item?.item_name || '')}">
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input type="number" id="ap-qty" min="1" value="${item?.quantity ?? 1}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="ap-status">
            <option value="Pending"             ${item?.status==='Pending'             ?'selected':''}>Pending</option>
            <option value="Clinically Approved" ${item?.status==='Clinically Approved' ?'selected':''}>Clinically Approved</option>
            <option value="Fulfilled"           ${item?.status==='Fulfilled'           ?'selected':''}>Fulfilled</option>
            <option value="Rejected"            ${item?.status==='Rejected'            ?'selected':''}>Rejected</option>
          </select>
        </div>
        <div class="form-group">
          <label>Requested By</label>
          <select id="ap-reqby">
            <option value="">— Select Staff —</option>
            ${_staff.map(s => `<option value="${s.id}" ${item?.requested_by===s.id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea id="ap-notes">${escHtml(item?.notes || '')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveApproval(${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveApproval(id) {
  const body = {
    request_id:   document.getElementById('ap-id').value.trim(),
    type:         document.getElementById('ap-type').value,
    item_name:    document.getElementById('ap-item').value.trim(),
    quantity:     parseInt(document.getElementById('ap-qty').value) || 1,
    status:       document.getElementById('ap-status').value,
    requested_by: parseInt(document.getElementById('ap-reqby').value) || null,
    notes:        document.getElementById('ap-notes').value.trim() || null,
  };
  if (!body.request_id || !body.item_name) { showToast('Request ID and item name are required', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/approvals/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Approval request updated', 'success');
    } else {
      await apiFetch('/api/approvals', { method: 'POST', body: JSON.stringify(body) });
      showToast('Approval request created', 'success');
    }
    closeModal();
    loadApprovals();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function updateApprovalStatus(id, status) {
  const labels = { 'Clinically Approved': 'approve', 'Rejected': 'reject', 'Fulfilled': 'fulfill' };
  if (!confirm(`${labels[status] || 'update'} this request?`)) return;
  try {
    await apiFetch(`/api/approvals/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    showToast(`Request ${status.toLowerCase()}`, 'success');
    loadApprovals();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteApproval(id) {
  const a = _approvals.find(x => x.id === id);
  if (!confirm(`Delete request "${a?.request_id}"?`)) return;
  try {
    await apiFetch(`/api/approvals/${id}`, { method: 'DELETE' });
    showToast('Approval request deleted', 'success');
    loadApprovals();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  STAFF
// ══════════════════════════════════════════════════════════
async function loadStaff() {
  try {
    _staff = await apiFetch('/api/staff');
    renderStaff(_staff);
  } catch (err) {
    showToast('Failed to load staff: ' + err.message, 'error');
  }
}

function renderStaff(list) {
  const tbody = document.getElementById('staff-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No staff found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr>
      <td><code style="font-size:.78rem">${escHtml(s.staff_id)}</code></td>
      <td><strong>${escHtml(s.name)}</strong></td>
      <td>${getRoleBadge(s.role)}</td>
      <td><a href="mailto:${escHtml(s.email)}" style="color:var(--primary)">${escHtml(s.email) || '—'}</a></td>
      <td>${escHtml(s.phone) || '—'}</td>
      <td>${s.assigned_vehicle_id ? `<span class="badge badge-dispatched">${escHtml(s.assigned_vehicle_id)}</span>` : '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openStaffModal(${s.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteStaff(${s.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function getRoleBadge(role) {
  const map = {
    'Paramedic':          'badge-inuse',
    'Driver':             'badge-active',
    'Inventory Manager':  'badge-procurement',
    'Clinical Approver':  'badge-approved',
    'Admin':              'badge-fixedasset',
  };
  return `<span class="badge ${map[role] || ''}">${escHtml(role)}</span>`;
}

function filterStaff() {
  const q    = document.getElementById('staff-search').value.toLowerCase();
  const role = document.getElementById('staff-filter-role').value;
  renderStaff(_staff.filter(s =>
    (!q    || s.name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)) &&
    (!role || s.role === role)
  ));
}

function openStaffModal(id = null) {
  const item = id ? _staff.find(s => s.id === id) : null;
  const title = item ? 'Edit Staff' : 'Add Staff';
  const newId = item ? item.staff_id : generateId('STF', _staff, 'staff_id');
  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-user-nurse" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Staff ID *</label>
          <input type="text" id="st-id" required value="${escHtml(newId)}">
        </div>
        <div class="form-group">
          <label>Role *</label>
          <select id="st-role" required>
            <option value="">— Select —</option>
            <option value="Paramedic"          ${item?.role==='Paramedic'          ?'selected':''}>Paramedic</option>
            <option value="Driver"             ${item?.role==='Driver'             ?'selected':''}>Driver</option>
            <option value="Inventory Manager"  ${item?.role==='Inventory Manager'  ?'selected':''}>Inventory Manager</option>
            <option value="Clinical Approver"  ${item?.role==='Clinical Approver'  ?'selected':''}>Clinical Approver</option>
            <option value="Admin"              ${item?.role==='Admin'              ?'selected':''}>Admin</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Full Name *</label>
          <input type="text" id="st-name" required value="${escHtml(item?.name || '')}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="st-email" value="${escHtml(item?.email || '')}">
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="st-phone" value="${escHtml(item?.phone || '')}">
        </div>
        <div class="form-group full-width">
          <label>Assigned Vehicle</label>
          <select id="st-vehicle">
            <option value="">— None —</option>
            ${_vehicles.map(v => `<option value="${escHtml(v.vehicle_id)}" ${item?.assigned_vehicle_id===v.vehicle_id?'selected':''}>${escHtml(v.vehicle_id)} (${escHtml(v.model)})</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStaff(${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveStaff(id) {
  const body = {
    staff_id:            document.getElementById('st-id').value.trim(),
    name:                document.getElementById('st-name').value.trim(),
    email:               document.getElementById('st-email').value.trim() || null,
    role:                document.getElementById('st-role').value,
    phone:               document.getElementById('st-phone').value.trim() || null,
    assigned_vehicle_id: document.getElementById('st-vehicle').value || null,
  };
  if (!body.staff_id || !body.name || !body.role) { showToast('Staff ID, name, and role are required', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Staff updated', 'success');
    } else {
      await apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(body) });
      showToast('Staff added', 'success');
    }
    closeModal();
    loadStaff();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteStaff(id) {
  const s = _staff.find(x => x.id === id);
  if (!confirm(`Delete staff "${s?.name}"?`)) return;
  try {
    await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
    showToast('Staff deleted', 'success');
    loadStaff();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  SHIFTS
// ══════════════════════════════════════════════════════════
async function loadShifts() {
  try {
    [_shifts, _staff, _vehicles] = await Promise.all([
      apiFetch('/api/shifts'),
      _staff.length    ? Promise.resolve(_staff)    : apiFetch('/api/staff'),
      _vehicles.length ? Promise.resolve(_vehicles) : apiFetch('/api/vehicles'),
    ]);
    renderShifts(_shifts);
  } catch (err) {
    showToast('Failed to load shifts: ' + err.message, 'error');
  }
}

function renderShifts(list) {
  const tbody = document.getElementById('shifts-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No shifts found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr>
      <td><code style="font-size:.78rem">${escHtml(s.shift_id)}</code></td>
      <td><strong>${escHtml(s.staff_name || staffName(s.staff_id))}</strong></td>
      <td>${getRoleBadge(s.staff_role || '')}</td>
      <td>${s.vehicle_id ? `<span class="badge badge-dispatched">${escHtml(s.vehicle_id)}</span>` : '—'}</td>
      <td>${getStatusBadge(s.shift_type)}</td>
      <td>${formatDateTime(s.start_time)}</td>
      <td>${formatDateTime(s.end_time)}</td>
      <td>${escHtml(s.notes) || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openShiftModal(${s.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteShift(${s.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterShifts() {
  const type = document.getElementById('shifts-filter-type').value;
  renderShifts(_shifts.filter(s => !type || s.shift_type === type));
}

function openShiftModal(id = null) {
  const item = id ? _shifts.find(s => s.id === id) : null;
  const title = item ? 'Edit Shift' : 'Add Shift';
  const newId = item ? item.shift_id : generateId('SHF', _shifts, 'shift_id');
  const today = new Date().toISOString().slice(0, 16);
  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-calendar-alt" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Shift ID *</label>
          <input type="text" id="sh-id" required value="${escHtml(newId)}">
        </div>
        <div class="form-group">
          <label>Shift Type *</label>
          <select id="sh-type" required>
            <option value="Day"    ${item?.shift_type==='Day'    ?'selected':''}>Day</option>
            <option value="Night"  ${item?.shift_type==='Night'  ?'selected':''}>Night</option>
            <option value="On-Call"${item?.shift_type==='On-Call'?'selected':''}>On-Call</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Staff Member *</label>
          <select id="sh-staff" required>
            <option value="">— Select Staff —</option>
            ${_staff.map(s => `<option value="${s.id}" ${item?.staff_id===s.id?'selected':''}>${escHtml(s.name)} (${escHtml(s.role)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group full-width">
          <label>Vehicle</label>
          <select id="sh-vehicle">
            <option value="">— None —</option>
            ${_vehicles.map(v => `<option value="${escHtml(v.vehicle_id)}" ${item?.vehicle_id===v.vehicle_id?'selected':''}>${escHtml(v.vehicle_id)} (${escHtml(v.model)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Start Time *</label>
          <input type="datetime-local" id="sh-start" required value="${item?.start_time ? item.start_time.slice(0,16) : today}">
        </div>
        <div class="form-group">
          <label>End Time *</label>
          <input type="datetime-local" id="sh-end" required value="${item?.end_time ? item.end_time.slice(0,16) : ''}">
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea id="sh-notes">${escHtml(item?.notes || '')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveShift(${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveShift(id) {
  const body = {
    shift_id:   document.getElementById('sh-id').value.trim(),
    staff_id:   parseInt(document.getElementById('sh-staff').value),
    vehicle_id: document.getElementById('sh-vehicle').value || null,
    start_time: document.getElementById('sh-start').value,
    end_time:   document.getElementById('sh-end').value,
    shift_type: document.getElementById('sh-type').value,
    notes:      document.getElementById('sh-notes').value.trim() || null,
  };
  if (!body.shift_id || !body.staff_id || !body.start_time || !body.end_time) { showToast('All required fields must be filled', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/shifts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Shift updated', 'success');
    } else {
      await apiFetch('/api/shifts', { method: 'POST', body: JSON.stringify(body) });
      showToast('Shift added', 'success');
    }
    closeModal();
    loadShifts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteShift(id) {
  const s = _shifts.find(x => x.id === id);
  if (!confirm(`Delete shift "${s?.shift_id}"?`)) return;
  try {
    await apiFetch(`/api/shifts/${id}`, { method: 'DELETE' });
    showToast('Shift deleted', 'success');
    loadShifts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  STOCK AUDIT
// ══════════════════════════════════════════════════════════
async function loadAudits() {
  try {
    [_audits, _staff] = await Promise.all([
      apiFetch('/api/stockaudit'),
      _staff.length ? Promise.resolve(_staff) : apiFetch('/api/staff'),
    ]);
    renderAudits(_audits);
  } catch (err) {
    showToast('Failed to load audits: ' + err.message, 'error');
  }
}

function renderAudits(list) {
  const tbody = document.getElementById('stockaudit-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-boxes"></i><p>No audits found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(a => {
    let itemCount = 0;
    try { itemCount = JSON.parse(a.items || '[]').length; } catch {}
    return `
    <tr>
      <td><code style="font-size:.78rem">${escHtml(a.audit_id)}</code></td>
      <td><strong>${escHtml(a.name)}</strong></td>
      <td>${getStatusBadge(a.status)}</td>
      <td><span class="badge badge-device">${itemCount} item${itemCount !== 1 ? 's' : ''}</span></td>
      <td>${staffName(a.created_by)}</td>
      <td>${formatDateTime(a.created_at)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openAuditModal(${a.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteAudit(${a.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterAudits() {
  const st = document.getElementById('audit-filter-status').value;
  renderAudits(_audits.filter(a => !st || a.status === st));
}

function openAuditModal(id = null) {
  const item = id ? _audits.find(a => a.id === id) : null;
  const title = item ? 'Edit Stock Audit' : 'New Stock Audit';
  const newId = item ? item.audit_id : generateId('AUD', _audits, 'audit_id');
  let itemsText = '';
  try { itemsText = JSON.stringify(JSON.parse(item?.items || '[]'), null, 2); } catch { itemsText = '[]'; }
  if (!item) itemsText = '[]';

  openModal(`
    <div class="modal-header">
      <h2><i class="fas fa-boxes" style="color:var(--primary)"></i> ${title}</h2>
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group">
          <label>Audit ID *</label>
          <input type="text" id="au-id" required value="${escHtml(newId)}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="au-status">
            <option value="Pending"     ${item?.status==='Pending'     ?'selected':''}>Pending</option>
            <option value="In Progress" ${item?.status==='In Progress' ?'selected':''}>In Progress</option>
            <option value="Completed"   ${item?.status==='Completed'   ?'selected':''}>Completed</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Audit Name *</label>
          <input type="text" id="au-name" required value="${escHtml(item?.name || '')}">
        </div>
        <div class="form-group full-width">
          <label>Created By</label>
          <select id="au-createdby">
            <option value="">— Select Staff —</option>
            ${_staff.map(s => `<option value="${s.id}" ${item?.created_by===s.id?'selected':''}>${escHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea id="au-notes">${escHtml(item?.notes || '')}</textarea>
        </div>
        <div class="form-group full-width">
          <label>Items (JSON array)</label>
          <textarea id="au-items" style="font-family:monospace;font-size:.8rem;min-height:100px">${escHtml(itemsText)}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAudit(${id || 'null'})"><i class="fas fa-save"></i> Save</button>
    </div>
  `);
}

async function saveAudit(id) {
  const itemsRaw = document.getElementById('au-items').value.trim();
  let items;
  try { items = JSON.parse(itemsRaw); } catch { showToast('Items must be valid JSON', 'warning'); return; }
  const body = {
    audit_id:   document.getElementById('au-id').value.trim(),
    name:       document.getElementById('au-name').value.trim(),
    status:     document.getElementById('au-status').value,
    created_by: parseInt(document.getElementById('au-createdby').value) || null,
    notes:      document.getElementById('au-notes').value.trim() || null,
    items,
  };
  if (!body.audit_id || !body.name) { showToast('Audit ID and name are required', 'warning'); return; }
  try {
    if (id) {
      await apiFetch(`/api/stockaudit/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Audit updated', 'success');
    } else {
      await apiFetch('/api/stockaudit', { method: 'POST', body: JSON.stringify(body) });
      showToast('Audit created', 'success');
    }
    closeModal();
    loadAudits();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteAudit(id) {
  const a = _audits.find(x => x.id === id);
  if (!confirm(`Delete audit "${a?.name}"?`)) return;
  try {
    await apiFetch(`/api/stockaudit/${id}`, { method: 'DELETE' });
    showToast('Audit deleted', 'success');
    loadAudits();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  showSection('dashboard');
});
