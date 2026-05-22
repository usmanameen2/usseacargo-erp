const state = {
  loggedIn: false,
  user: 'Usman',
  module: 'list',
  tab: 'jobs',
  selectedRow: null,
  rows: [],
  loading: false,
  error: ''
};

const dock = [
  { key: 'home', icon: '🏠', title: 'Dashboard' },
  { key: 'list', icon: '📋', title: 'Jobs List' },
  { key: 'create', icon: '🧾', title: 'Create / Edit Job' },
  { key: 'dispatch', icon: '🚚', title: 'Dispatch Board' },
  { key: 'tracking', icon: '📍', title: 'Tracking' },
  { key: 'docs', icon: '📄', title: 'Documents' },
  { key: 'settings', icon: '⚙️', title: 'Settings' }
];

const tabs = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'containers', label: 'Containers' },
  { key: 'hbl', label: 'HBL' },
  { key: 'expenses', label: 'Expenses' }
];

async function api(path) {
  const token = localStorage.getItem('erp_token');
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function loadRows() {
  state.loading = true;
  state.error = '';
  mount();
  try {
    let data = [];
    if (state.tab === 'jobs') data = (await api('/api/china-dubai/shipments')).data || [];
    if (state.tab === 'containers') data = (await api('/api/china-dubai/containers')).data || [];
    if (state.tab === 'hbl') data = (await api('/api/hbl-tracking')).data || [];
    if (state.tab === 'expenses') data = (await api('/api/shipping-expenses')).data || [];
    state.rows = data;
    state.selectedRow = data[0] || null;
  } catch (e) {
    state.error = 'Unable to load live API data. Showing demo rows.';
    state.rows = demoRows();
    state.selectedRow = state.rows[0] || null;
  } finally {
    state.loading = false;
    mount();
  }
}

function demoRows() {
  return [
    { shipment_no: 'SHP-24051', client: 'BlueWave Trading', mode: 'Sea', port_of_loading: 'Shanghai', port_of_discharge: 'Jebel Ali', carrier: 'MSC', status: 'IN TRANSIT', eta: '2026-05-29', container_type: '40HC', value: 4200 },
    { shipment_no: 'SHP-24050', client: 'Al Noor Tech', mode: 'Sea', port_of_loading: 'Ningbo', port_of_discharge: 'Dubai', carrier: 'CMA', status: 'BOOKED', eta: '2026-05-27', container_type: '20GP', value: 2180 },
    { shipment_no: 'SHP-24049', client: 'Madar Foods', mode: 'Air', port_of_loading: 'Shenzhen', port_of_discharge: 'Abu Dhabi', carrier: 'EK', status: 'ARRIVED', eta: '2026-05-24', container_type: 'AWB', value: 1620 }
  ];
}

function fmt(v) { return (v ?? '').toString(); }

function loginView() {
  return `<div class="login-wrap"><div class="login-card"><div class="brand">GEM-TMS</div><div class="sub">Same-style clone from competitor video</div>
  <div class="field"><label class="label">Username</label><input id="u" class="input" value="Usman" /></div>
  <div class="field"><label class="label">Password</label><input id="p" class="input" type="password" value="Year2025%" /></div>
  <button id="login" class="login-btn">Sign In</button><div class="hint">Uses your ERP token for live data if available.</div></div></div>`;
}

function topRibbon() {
  return `<div class="top-ribbon"><div>GEM-TMS | UAE Branch | ${new Date().toLocaleDateString()} | User: ${state.user}</div>
  <div class="ribbon-icons"><span class="rb-icon i1">N</span><span class="rb-icon i2">C</span><span class="rb-icon i3">B</span><span class="rb-icon i4">D</span><span class="rb-icon i5">I</span><span class="rb-icon i6">R</span><span class="rb-icon i7">S</span><span class="rb-icon i8">A</span><span class="rb-icon i9">U</span></div></div>`;
}

function dockView() {
  return dock.map(d => `<button title="${d.title}" class="dock-btn ${state.module===d.key?'active':''}" data-module="${d.key}">${d.icon}</button>`).join('');
}

function filterStrip() {
  return `<div class="strip">
  <div class="fld"><label>From Date</label><input type="date" value="2026-05-01"></div>
  <div class="fld"><label>To Date</label><input type="date" value="2026-05-31"></div>
  <div class="fld"><label>Branch</label><select><option>UAE</option><option>KSA</option></select></div>
  <div class="fld"><label>Mode</label><select><option>All</option><option>Sea</option><option>Air</option></select></div>
  <div class="fld"><label>Status</label><select><option>All</option><option>BOOKED</option><option>IN TRANSIT</option><option>ARRIVED</option></select></div>
  <div class="fld"><label>Search</label><input placeholder="Ref / Client / BL"></div>
  </div>`;
}

function tabsView() {
  return `<div class="tabs">${tabs.map(t=>`<button class="tab ${state.tab===t.key?'active':''}" data-tab="${t.key}">${t.label}</button>`).join('')}</div>`;
}

function rowsTable() {
  const cols = ['REF','CLIENT','MODE','POL','POD','CARRIER','STATUS','ETA','UNIT','AMOUNT'];
  const body = state.rows.map((r,i)=>{
    const ref = r.shipment_no || r.job_no || r.hbl_no || r.expense_no || r.id;
    const client = r.client || r.customer_name || r.customer_company || r.supplier || '-';
    const mode = r.mode || r.shipment_type || r.job_type || '-';
    const pol = r.port_of_loading || r.pol || '-';
    const pod = r.port_of_discharge || r.pod || '-';
    const carrier = r.carrier || r.vessel_name || r.agent || '-';
    const status = r.status || '-';
    const eta = r.eta || r.date || '-';
    const unit = r.container_type || r.size || r.container_size || '-';
    const amount = r.value || r.amount || r.total || '-';
    return `<tr data-row="${i}" class="${state.selectedRow===r?'selected-row':''}"><td>${fmt(ref)}</td><td>${fmt(client)}</td><td>${fmt(mode)}</td><td>${fmt(pol)}</td><td>${fmt(pod)}</td><td>${fmt(carrier)}</td><td>${fmt(status)}</td><td>${fmt(eta)}</td><td>${fmt(unit)}</td><td>${fmt(amount)}</td></tr>`;
  }).join('');
  return `<div class="grid-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${body || '<tr><td colspan="10">No rows</td></tr>'}</tbody></table></div>`;
}

function detailPanel() {
  const r = state.selectedRow || {};
  return `<div class="form-layout">
  <div class="card"><h4>Booking Details</h4><div class="body"><div class="form-grid">
  <div><label>Ref No</label><input value="${fmt(r.shipment_no || r.job_no || '')}"></div><div><label>Booking Date</label><input type="date" value="${fmt(r.created_at || '').slice(0,10)}"></div>
  <div><label>Client</label><input value="${fmt(r.client || r.customer_name || '')}"></div><div><label>Agent</label><input value="${fmt(r.agent || '')}"></div>
  <div><label>Shipment Type</label><input value="${fmt(r.shipment_type || r.job_type || '')}"></div><div><label>Mode</label><input value="${fmt(r.mode || '')}"></div>
  <div><label>POL</label><input value="${fmt(r.port_of_loading || r.pol || '')}"></div><div><label>POD</label><input value="${fmt(r.port_of_discharge || r.pod || '')}"></div>
  <div><label>ETD</label><input value="${fmt(r.etd || r.etd_pol || '')}"></div><div><label>ETA</label><input value="${fmt(r.eta || r.eta_jebel_ali || '')}"></div>
  </div></div></div>
  <div class="card"><h4>Container / Cargo</h4><div class="body"><div class="form-grid">
  <div><label>Container No</label><input value="${fmt(r.container_no || '')}"></div><div><label>Seal No</label><input value="${fmt(r.seal_no || '')}"></div>
  <div><label>Size</label><input value="${fmt(r.container_size || r.size || r.container_type || '')}"></div><div><label>Packages</label><input value="${fmt(r.packages_count || r.pieces || '')}"></div>
  <div><label>Gross Wt</label><input value="${fmt(r.weight || '')}"></div><div><label>CBM</label><input value="${fmt(r.cbm || '')}"></div>
  <div class="full"><label>Description</label><textarea>${fmt(r.description || r.product || r.cargo || '')}</textarea></div>
  </div></div></div>
  <div class="card"><h4>Commercial</h4><div class="body"><div class="form-grid">
  <div><label>Currency</label><input value="${fmt(r.currency || 'USD')}"></div><div><label>Freight</label><input value="${fmt(r.value || r.amount || '')}"></div>
  <div><label>Cost</label><input value="${fmt(r.cost || '')}"></div><div><label>Revenue</label><input value="${fmt(r.revenue || '')}"></div>
  <div><label>Profit</label><input value="${fmt(r.profit || '')}"></div><div><label>Margin</label><input value="${fmt(r.margin || '')}"></div>
  <div class="full"><label>Internal Remarks</label><textarea>${fmt(r.internal_remarks || r.remarks || '')}</textarea></div>
  </div></div></div></div>`;
}

function listModule() {
  return `${tabsView()}${filterStrip()}${state.loading?'<div class="notice">Loading...</div>':''}${state.error?`<div class="notice warn">${state.error}</div>`:''}${rowsTable()}${detailPanel()}`;
}

function homeModule() {
  return `<div class="grid-wrap"><table class="table"><thead><tr><th>KPI</th><th>TODAY</th><th>THIS WEEK</th><th>THIS MONTH</th></tr></thead><tbody>
  <tr><td>Total Jobs</td><td>14</td><td>62</td><td>248</td></tr><tr><td>Dispatch Open</td><td>9</td><td>38</td><td>120</td></tr><tr><td>Delivered</td><td>11</td><td>55</td><td>210</td></tr><tr><td>Pending Invoices</td><td>7</td><td>29</td><td>83</td></tr>
  </tbody></table></div>`;
}

function createModule() { return `${tabsView()}${detailPanel()}<div class="preview">Document Preview Pane (Invoice / Delivery Note / Cargo Manifest)</div>`; }
function docsModule() { return `<div class="preview">PDF Preview Workflow (same as video) | Left thumbnails | main page | print actions</div>`; }

function moduleContent() {
  if (state.module === 'home') return homeModule();
  if (state.module === 'create') return createModule();
  if (state.module === 'docs') return docsModule();
  return listModule();
}

function appView() {
  return `<div class="app-shell">${topRibbon()}<div class="workspace">
  <aside class="left-dock">${dockView()}</aside>
  <main class="main-area"><div class="toolbar"><div class="title">Shipment Management</div><div class="actions"><button class="btn" id="refresh">Refresh</button><button class="btn">Export</button><button class="btn primary">Save</button><button class="btn" id="logout">Logout</button></div></div><div class="module">${moduleContent()}</div></main>
  <aside class="right-strip"><div class="status-pill s1">HOLD</div><div class="status-pill s2">PENDING</div><div class="status-pill s3">BOOKED</div><div class="status-pill s4">DELIVERED</div><div class="status-pill s5">IN TRANSIT</div><div class="status-pill s6">BILLING</div><div class="status-pill s7">CLOSED</div><div class="status-pill s8">ARCHIVE</div></aside>
  </div></div>`;
}

function bindAppEvents() {
  document.querySelectorAll('[data-module]').forEach(el => el.addEventListener('click', () => { state.module = el.getAttribute('data-module'); mount(); if (state.module==='list' || state.module==='create') loadRows(); }));
  document.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', () => { state.tab = el.getAttribute('data-tab'); loadRows(); }));
  document.querySelectorAll('[data-row]').forEach(el => el.addEventListener('click', () => { const idx = Number(el.getAttribute('data-row')); state.selectedRow = state.rows[idx] || null; mount(); }));
  document.getElementById('refresh')?.addEventListener('click', loadRows);
  document.getElementById('logout')?.addEventListener('click', () => { state.loggedIn = false; state.module = 'list'; mount(); });
}

function mount() {
  const app = document.getElementById('app');
  app.innerHTML = state.loggedIn ? appView() : loginView();
  if (!state.loggedIn) {
    document.getElementById('login')?.addEventListener('click', async () => {
      state.user = document.getElementById('u')?.value || 'Usman';
      state.loggedIn = true;
      mount();
      await loadRows();
    });
    return;
  }
  bindAppEvents();
}

mount();

