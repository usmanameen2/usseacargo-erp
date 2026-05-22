const state = {
  loggedIn: false,
  user: 'Usman',
  module: 'list',
  tab: 'jobs',
  selectedStatus: 'ALL',
  selectedRow: null,
  rows: [],
  loading: false,
  error: '',
  editMode: false,
  form: {},
  apiBase: localStorage.getItem('gem_api_base') || 'http://localhost:3000',
  token: localStorage.getItem('erp_token') || '',
};

const dock = [
  { key: 'home', icon: '🏠', title: 'Dashboard' },
  { key: 'list', icon: '📋', title: 'Jobs List' },
  { key: 'create', icon: '🧾', title: 'Create / Edit' },
  { key: 'dispatch', icon: '🚚', title: 'Dispatch' },
  { key: 'tracking', icon: '📍', title: 'Tracking' },
  { key: 'docs', icon: '📄', title: 'Documents' },
  { key: 'settings', icon: '⚙️', title: 'Settings' }
];

const tabs = [
  { key: 'jobs', label: 'Jobs', path: '/api/china-dubai/shipments', id: 'id' },
  { key: 'containers', label: 'Containers', path: '/api/china-dubai/containers', id: 'id' },
  { key: 'hbl', label: 'HBL', path: '/api/hbl-tracking', id: 'id' },
  { key: 'expenses', label: 'Expenses', path: '/api/shipping-expenses', id: 'id' }
];

const formFields = {
  jobs: [
    ['shipment_no','Ref No'],['client','Client'],['agent','Agent'],['shipment_type','Shipment Type'],['mode','Mode'],['port_of_loading','POL'],['port_of_discharge','POD'],['etd_pol','ETD'],['eta_jebel_ali','ETA'],['carrier','Carrier'],['status','Status'],['cost','Cost'],['revenue','Revenue'],['profit','Profit'],['margin','Margin'],['internal_remarks','Remarks']
  ],
  containers: [
    ['shipment_id','Shipment ID'],['container_no','Container No'],['seal_no','Seal No'],['size','Size'],['type','Type'],['weight','Weight'],['status','Status']
  ],
  hbl: [
    ['hbl_no','HBL No'],['customer_name','Customer'],['customer_company','Company'],['container_no','Container No'],['container_size','Container Size'],['packages_count','Packages'],['weight','Weight'],['pol','POL'],['pod','POD'],['vessel_name','Vessel'],['eta','ETA'],['status','Status'],['remarks','Remarks']
  ],
  expenses: [
    ['expense_no','Expense No'],['job_id','Job ID'],['job_type','Job Type'],['category','Category'],['amount','Amount'],['currency','Currency'],['date','Date'],['description','Description'],['status','Status']
  ]
};

function currentTab() { return tabs.find(t => t.key === state.tab); }
function fmt(v) { return v == null ? '' : String(v); }
function esc(s) { return fmt(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${state.apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || `${method} ${path} failed (${res.status})`);
  return data;
}

function demoRows() {
  if (state.tab === 'containers') return [{id:1,shipment_id:12,container_no:'MSCU4433211',seal_no:'SL889',size:'40HC',type:'GP',weight:18760,status:'active'}];
  if (state.tab === 'hbl') return [{id:1,hbl_no:'HBL-8088',customer_name:'BlueWave Trading',container_no:'MSCU4433211',pol:'SHA',pod:'JEA',status:'Active'}];
  if (state.tab === 'expenses') return [{id:1,expense_no:'EXP-5001',job_id:12,job_type:'Sea',category:'THC',amount:420,currency:'USD',date:'2026-05-23',status:'active'}];
  return [
    {id:1,shipment_no:'SHP-24051',client:'BlueWave Trading',mode:'Sea',port_of_loading:'Shanghai',port_of_discharge:'Jebel Ali',carrier:'MSC',status:'IN TRANSIT',eta_jebel_ali:'2026-05-29',size:'40HC',revenue:4200},
    {id:2,shipment_no:'SHP-24050',client:'Al Noor Tech',mode:'Sea',port_of_loading:'Ningbo',port_of_discharge:'Dubai',carrier:'CMA',status:'BOOKED',eta_jebel_ali:'2026-05-27',size:'20GP',revenue:2180}
  ];
}

async function login() {
  const username = document.getElementById('u')?.value?.trim() || 'Usman';
  const password = document.getElementById('p')?.value || '';
  state.user = username;
  try {
    const res = await api('POST', '/api/auth/login', { username, password });
    state.token = res.token || '';
    if (state.token) localStorage.setItem('erp_token', state.token);
    state.loggedIn = true;
    mount();
    await loadRows();
  } catch (e) {
    state.error = `Login failed: ${e.message}`;
    mount();
  }
}

async function loadRows() {
  state.loading = true; state.error = ''; mount();
  try {
    const t = currentTab();
    const res = await api('GET', t.path);
    state.rows = res.data || [];
    if (state.selectedStatus !== 'ALL') {
      state.rows = state.rows.filter(r => fmt(r.status).toUpperCase() === state.selectedStatus);
    }
    state.selectedRow = state.rows[0] || null;
    state.form = { ...(state.selectedRow || {}) };
    state.editMode = false;
  } catch (e) {
    state.error = `Live API unavailable (${e.message}). Showing local demo.`;
    state.rows = demoRows();
    if (state.selectedStatus !== 'ALL') state.rows = state.rows.filter(r => fmt(r.status).toUpperCase() === state.selectedStatus);
    state.selectedRow = state.rows[0] || null;
    state.form = { ...(state.selectedRow || {}) };
    state.editMode = false;
  } finally {
    state.loading = false;
    mount();
  }
}

function startNew() {
  state.editMode = true;
  state.selectedRow = null;
  state.form = {};
  mount();
}

function startEdit() {
  if (!state.selectedRow) return;
  state.editMode = true;
  state.form = { ...state.selectedRow };
  mount();
}

function cancelEdit() {
  state.editMode = false;
  state.form = { ...(state.selectedRow || {}) };
  mount();
}

function collectFormFromDom() {
  const out = { ...state.form };
  (formFields[state.tab] || []).forEach(([k]) => {
    const el = document.querySelector(`[data-f='${k}']`);
    if (!el) return;
    out[k] = el.value;
  });
  return out;
}

async function saveRow() {
  const t = currentTab();
  const payload = collectFormFromDom();
  try {
    if (state.selectedRow && state.selectedRow[t.id]) {
      await api('PUT', `${t.path}/${state.selectedRow[t.id]}`, payload);
    } else {
      await api('POST', t.path, payload);
    }
    state.editMode = false;
    await loadRows();
  } catch (e) {
    state.error = `Save failed: ${e.message}`;
    mount();
  }
}

async function deleteRow() {
  const t = currentTab();
  if (!state.selectedRow || !state.selectedRow[t.id]) return;
  try {
    await api('DELETE', `${t.path}/${state.selectedRow[t.id]}`);
    await loadRows();
  } catch (e) {
    state.error = `Delete failed: ${e.message}`;
    mount();
  }
}

function printCurrent() {
  const w = window.open('', '_blank');
  if (!w) return;
  const r = state.selectedRow || state.form || {};
  const rows = Object.entries(r).map(([k,v]) => `<tr><td style="padding:6px;border:1px solid #ccc;">${esc(k)}</td><td style="padding:6px;border:1px solid #ccc;">${esc(v)}</td></tr>`).join('');
  w.document.write(`<html><head><title>Document Preview</title></head><body><h3>Shipment Document</h3><table style="border-collapse:collapse;width:100%">${rows}</table></body></html>`);
  w.document.close();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.rows, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.tab}-export.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function loginView() {
  return `<div class="login-wrap"><div class="login-card"><div class="brand">GEM-TMS</div><div class="sub">Functional clone from competitor workflow</div>
  <div class="field"><label class="label">API Base URL</label><input id="apiBase" class="input" value="${esc(state.apiBase)}" /></div>
  <div class="field"><label class="label">Username</label><input id="u" class="input" value="Usman" /></div>
  <div class="field"><label class="label">Password</label><input id="p" class="input" type="password" value="Year2025%" /></div>
  <button id="login" class="login-btn">Sign In</button>${state.error?`<div class="hint" style="color:#b42318">${esc(state.error)}</div>`:''}</div></div>`;
}

function topRibbon() {
  return `<div class="top-ribbon"><div>GEM-TMS | UAE Branch | ${new Date().toLocaleDateString()} | User: ${esc(state.user)}</div>
  <div class="ribbon-icons"><span class="rb-icon i1">N</span><span class="rb-icon i2">C</span><span class="rb-icon i3">B</span><span class="rb-icon i4">D</span><span class="rb-icon i5">I</span><span class="rb-icon i6">R</span><span class="rb-icon i7">S</span><span class="rb-icon i8">A</span><span class="rb-icon i9">U</span></div></div>`;
}

function dockView() {
  return dock.map(d => `<button title="${esc(d.title)}" class="dock-btn ${state.module===d.key?'active':''}" data-module="${d.key}">${d.icon}</button>`).join('');
}

function tabsView() {
  return `<div class="tabs">${tabs.map(t=>`<button class="tab ${state.tab===t.key?'active':''}" data-tab="${t.key}">${t.label}</button>`).join('')}</div>`;
}

function filterStrip() {
  return `<div class="strip">
  <div class="fld"><label>From Date</label><input type="date" value="2026-05-01"></div>
  <div class="fld"><label>To Date</label><input type="date" value="2026-05-31"></div>
  <div class="fld"><label>Branch</label><select><option>UAE</option><option>KSA</option></select></div>
  <div class="fld"><label>Mode</label><select><option>All</option><option>Sea</option><option>Air</option></select></div>
  <div class="fld"><label>Status</label><select id="statusFilter"><option ${state.selectedStatus==='ALL'?'selected':''}>ALL</option><option ${state.selectedStatus==='BOOKED'?'selected':''}>BOOKED</option><option ${state.selectedStatus==='IN TRANSIT'?'selected':''}>IN TRANSIT</option><option ${state.selectedStatus==='ARRIVED'?'selected':''}>ARRIVED</option><option ${state.selectedStatus==='ACTIVE'?'selected':''}>ACTIVE</option></select></div>
  <div class="fld"><label>Search</label><input id="searchBox" placeholder="Ref / Client / BL"></div>
  </div>`;
}

function getRowView(r) {
  if (state.tab === 'containers') return [r.id, r.shipment_id, r.container_no, r.seal_no, r.size || r.container_size, r.type || r.container_type, r.weight, r.status, '', ''];
  if (state.tab === 'hbl') return [r.id, r.hbl_no, r.customer_name, r.container_no, r.pol, r.pod, r.vessel_name, r.status, r.eta, ''];
  if (state.tab === 'expenses') return [r.id, r.expense_no, r.job_id, r.job_type, r.category, r.amount, r.currency, r.status, r.date, ''];
  return [r.id, r.shipment_no || r.job_no, r.client || r.customer_name, r.mode || r.shipment_type, r.port_of_loading || r.pol, r.port_of_discharge || r.pod, r.carrier || r.agent, r.status, r.eta_jebel_ali || r.eta, r.revenue || r.amount || ''];
}

function rowsTable() {
  const cols = ['ID','REF/NO','CLIENT','MODE/TYPE','POL','POD','CARRIER/CAT','STATUS','ETA/DATE','AMOUNT'];
  const body = state.rows.map((r,i)=>`<tr data-row="${i}" class="${state.selectedRow===r?'selected-row':''}">${getRowView(r).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('');
  return `<div class="grid-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${body || '<tr><td colspan="10">No rows</td></tr>'}</tbody></table></div>`;
}

function formPanel() {
  const fields = formFields[state.tab] || [];
  const r = state.editMode ? state.form : (state.selectedRow || {});
  const controls = fields.map(([k,label]) => {
    const val = esc(r[k]);
    const textarea = /remarks|description/i.test(k);
    if (textarea) return `<div class="full"><label>${label}</label><textarea data-f="${k}" ${state.editMode?'':'disabled'}>${val}</textarea></div>`;
    return `<div><label>${label}</label><input data-f="${k}" value="${val}" ${state.editMode?'':'disabled'}></div>`;
  }).join('');
  return `<div class="form-layout"><div class="card"><h4>${state.editMode ? 'Edit Record' : 'Record Details'}</h4><div class="body"><div class="form-grid">${controls}</div></div></div></div>`;
}

function listModule() {
  return `${tabsView()}${filterStrip()}${state.loading?'<div class="notice">Loading...</div>':''}${state.error?`<div class="notice warn">${esc(state.error)}</div>`:''}${rowsTable()}${formPanel()}`;
}

function homeModule() {
  return `<div class="grid-wrap"><table class="table"><thead><tr><th>KPI</th><th>TODAY</th><th>THIS WEEK</th><th>THIS MONTH</th></tr></thead><tbody>
  <tr><td>Total Jobs</td><td>${state.rows.length || 14}</td><td>62</td><td>248</td></tr><tr><td>Dispatch Open</td><td>9</td><td>38</td><td>120</td></tr><tr><td>Delivered</td><td>11</td><td>55</td><td>210</td></tr><tr><td>Pending Invoices</td><td>7</td><td>29</td><td>83</td></tr>
  </tbody></table></div>`;
}

function docsModule() {
  return `<div class="preview">PDF / Print Preview Workspace\n\nUse Print button to preview selected row document.</div>`;
}

function settingsModule() {
  return `<div class="card"><h4>Connection Settings</h4><div class="body"><div class="form-grid">
  <div class="full"><label>API Base URL</label><input id="setApi" value="${esc(state.apiBase)}"></div>
  <div><label>Current User</label><input value="${esc(state.user)}" disabled></div>
  <div><label>Token Status</label><input value="${state.token ? 'Available' : 'Missing'}" disabled></div>
  </div><div style="margin-top:8px;"><button class="btn primary" id="saveSettings">Save Settings</button></div></div></div>`;
}

function moduleContent() {
  if (state.module === 'home') return homeModule();
  if (state.module === 'docs') return docsModule();
  if (state.module === 'settings') return settingsModule();
  return listModule();
}

function appView() {
  return `<div class="app-shell">${topRibbon()}<div class="workspace">
  <aside class="left-dock">${dockView()}</aside>
  <main class="main-area"><div class="toolbar"><div class="title">Shipment Management - ${esc(currentTab().label)}</div><div class="actions"><button class="btn" id="refresh">Refresh</button><button class="btn" id="newBtn">New</button><button class="btn" id="editBtn">Edit</button><button class="btn primary" id="saveBtn">Save</button><button class="btn" id="deleteBtn">Delete</button><button class="btn" id="printBtn">Print</button><button class="btn" id="exportBtn">Export</button><button class="btn" id="logout">Logout</button></div></div><div class="module">${moduleContent()}</div></main>
  <aside class="right-strip"><div class="status-pill s1" data-status="HOLD">HOLD</div><div class="status-pill s2" data-status="PENDING">PENDING</div><div class="status-pill s3" data-status="BOOKED">BOOKED</div><div class="status-pill s4" data-status="DELIVERED">DELIVERED</div><div class="status-pill s5" data-status="IN TRANSIT">IN TRANSIT</div><div class="status-pill s6" data-status="BILLING">BILLING</div><div class="status-pill s7" data-status="CLOSED">CLOSED</div><div class="status-pill s8" data-status="ACTIVE">ACTIVE</div></aside>
  </div></div>`;
}

function bindLoginEvents() {
  document.getElementById('login')?.addEventListener('click', async () => {
    state.apiBase = (document.getElementById('apiBase')?.value || state.apiBase).trim().replace(/\/$/, '');
    localStorage.setItem('gem_api_base', state.apiBase);
    await login();
  });
}

function bindAppEvents() {
  document.querySelectorAll('[data-module]').forEach(el => el.addEventListener('click', () => {
    state.module = el.getAttribute('data-module');
    mount();
    if (['list','create','dispatch','tracking'].includes(state.module)) loadRows();
  }));

  document.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', () => {
    state.tab = el.getAttribute('data-tab');
    loadRows();
  }));

  document.querySelectorAll('[data-row]').forEach(el => el.addEventListener('click', () => {
    const idx = Number(el.getAttribute('data-row'));
    state.selectedRow = state.rows[idx] || null;
    state.form = { ...(state.selectedRow || {}) };
    state.editMode = false;
    mount();
  }));

  document.querySelectorAll('[data-status]').forEach(el => el.addEventListener('click', () => {
    state.selectedStatus = el.getAttribute('data-status') || 'ALL';
    loadRows();
  }));

  document.getElementById('statusFilter')?.addEventListener('change', (e) => {
    state.selectedStatus = e.target.value.toUpperCase();
    loadRows();
  });

  document.getElementById('refresh')?.addEventListener('click', loadRows);
  document.getElementById('newBtn')?.addEventListener('click', startNew);
  document.getElementById('editBtn')?.addEventListener('click', startEdit);
  document.getElementById('saveBtn')?.addEventListener('click', saveRow);
  document.getElementById('deleteBtn')?.addEventListener('click', deleteRow);
  document.getElementById('printBtn')?.addEventListener('click', printCurrent);
  document.getElementById('exportBtn')?.addEventListener('click', exportJson);
  document.getElementById('logout')?.addEventListener('click', () => {
    state.loggedIn = false;
    state.token = '';
    localStorage.removeItem('erp_token');
    mount();
  });

  document.getElementById('saveSettings')?.addEventListener('click', () => {
    const v = (document.getElementById('setApi')?.value || '').trim().replace(/\/$/, '');
    if (v) {
      state.apiBase = v;
      localStorage.setItem('gem_api_base', v);
      state.error = 'API base updated.';
      mount();
    }
  });
}

function mount() {
  const app = document.getElementById('app');
  app.innerHTML = state.loggedIn ? appView() : loginView();
  if (!state.loggedIn) return bindLoginEvents();
  bindAppEvents();
}

mount();
