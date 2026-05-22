(() => {
  // Run only in old ERP index page, never in gem-shell prototype page.
  if (/gem-shell\.html$/i.test(window.location.pathname || '')) return;
  const BTN_ID = 'gemFnOpenBtn';
  const PANEL_ID = 'gemFnPanel';
  const STYLE_ID = 'gemFnStyle';

  const state = {
    apiBase: localStorage.getItem('gem_api_base') || 'http://localhost:3000',
    token: localStorage.getItem('erp_token') || '',
    username: 'Usman',
    tab: 'jobs',
    rows: [],
    selectedIndex: -1,
    message: '',
    loading: false,
  };

  const tabs = {
    jobs: { label: 'Jobs', path: '/api/china-dubai/shipments', cols: ['id','shipment_no','client','mode','port_of_loading','port_of_discharge','status'] },
    containers: { label: 'Containers', path: '/api/china-dubai/containers', cols: ['id','shipment_id','container_no','seal_no','size','type','status'] },
    hbl: { label: 'HBL', path: '/api/hbl-tracking', cols: ['id','hbl_no','customer_name','container_no','pol','pod','status'] },
    expenses: { label: 'Expenses', path: '/api/shipping-expenses', cols: ['id','expense_no','job_id','category','amount','currency','status'] }
  };

  function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    return fetch(`${state.apiBase}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
      .then(async (r) => {
        const t = await r.text();
        let d = {};
        try { d = t ? JSON.parse(t) : {}; } catch { d = { message: t }; }
        if (!r.ok) throw new Error(d.message || `${method} ${path} failed (${r.status})`);
        return d;
      });
  }

  function demoRows() {
    if (state.tab === 'containers') return [{id:1,shipment_id:1001,container_no:'MSCU4433211',seal_no:'SL889',size:'40HC',type:'GP',status:'active'}];
    if (state.tab === 'hbl') return [{id:1,hbl_no:'HBL-8088',customer_name:'BlueWave Trading',container_no:'MSCU4433211',pol:'SHA',pod:'JEA',status:'Active'}];
    if (state.tab === 'expenses') return [{id:1,expense_no:'EXP-5001',job_id:1001,category:'THC',amount:420,currency:'USD',status:'active'}];
    return [{id:1,shipment_no:'SHP-24051',client:'BlueWave Trading',mode:'Sea',port_of_loading:'Shanghai',port_of_discharge:'Jebel Ali',status:'IN TRANSIT'}];
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${BTN_ID}{position:fixed;right:16px;bottom:16px;z-index:100001;background:#0f4c81;color:#fff;border:none;border-radius:999px;padding:10px 14px;font:700 12px Tahoma;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}
      #${BTN_ID}.sidebar-mode{position:static;right:auto;bottom:auto;z-index:auto;display:flex;align-items:center;gap:8px;width:100%;height:38px;border-radius:8px;padding:0 10px;background:transparent;color:#9bb2d5;box-shadow:none;border:none;font:500 27px/1 Tahoma;justify-content:flex-start}
      #${BTN_ID}.sidebar-mode .gf-ico{font-size:14px;line-height:1;opacity:.9}
      #${BTN_ID}.sidebar-mode .gf-txt{font:500 27px Tahoma}
      #${BTN_ID}.sidebar-mode:hover{background:rgba(255,255,255,.06);color:#dbe8ff}
      #${PANEL_ID}{position:fixed;right:20px;top:90px;width:min(1180px,calc(100vw - 340px));height:min(82vh,820px);background:#f8fafc;border:1px solid #d7deea;border-radius:16px;z-index:100002;display:none;grid-template-rows:52px 1fr;font:13px Inter,Segoe UI,Tahoma;color:#1f2937;box-shadow:0 20px 60px rgba(15,23,42,.22)}
      #${PANEL_ID}.open{display:grid}
      .gf-head{display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:linear-gradient(180deg,#0f1f3d,#132a54);color:#fff;border-radius:16px 16px 0 0}
      .gf-head strong{font-weight:700}
      .gf-main{padding:12px;display:grid;grid-template-rows:auto auto 1fr auto;gap:10px}
      .gf-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .gf-input,.gf-sel{height:34px;border:1px solid #d1d9e6;background:#fff;border-radius:10px;padding:0 10px;font:13px Inter,Segoe UI,Tahoma;color:#1f2937}
      .gf-btn{height:34px;border:1px solid #c8d3e3;background:#fff;border-radius:10px;padding:0 12px;font:600 13px Inter,Segoe UI,Tahoma;cursor:pointer;color:#334155}
      .gf-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
      .gf-btn:hover{filter:brightness(.98)}
      .gf-grid{border:1px solid #dde5f1;background:#fff;overflow:auto;border-radius:12px}
      .gf-table{width:100%;border-collapse:collapse;min-width:980px;font:12px Inter,Segoe UI,Tahoma}
      .gf-table th,.gf-table td{border-bottom:1px solid #edf1f7;padding:8px 10px;white-space:nowrap;text-align:left}
      .gf-table th{background:#f8fbff;color:#334155;font-weight:700}
      .gf-tr.sel td{background:#eff6ff}
      .gf-form{border:1px solid #dde5f1;background:#fff;padding:10px;border-radius:12px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .gf-form label{display:block;font:700 11px Inter,Segoe UI,Tahoma;color:#475569;margin-bottom:4px}
      .gf-form input{width:100%;height:32px;border:1px solid #d6deea;border-radius:8px;padding:0 8px;font:12px Inter,Segoe UI,Tahoma}
      .gf-msg{font:12px Inter,Segoe UI,Tahoma;color:#b42318;padding:2px 4px}
      @media (max-width:1200px){
        #${PANEL_ID}{width:min(96vw,1100px);right:2vw;top:70px;height:min(84vh,860px)}
        .gf-form{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
    `;
    document.head.appendChild(s);
  }

  function render() {
    injectStyles();

    if (!document.getElementById(BTN_ID)) {
      const b = document.createElement('button');
      b.id = BTN_ID;
      b.innerHTML = '<span class="gf-ico">⚙️</span><span class="gf-txt">GEM Menu</span>';
      b.onclick = () => document.getElementById(PANEL_ID)?.classList.toggle('open');
      document.body.appendChild(b);
    }
    placeButtonInSidebar();

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    const cols = tabs[state.tab].cols;
    const selected = state.rows[state.selectedIndex] || {};

    panel.innerHTML = `
      <div class="gf-head"><div>GEM Functions | User: ${state.username}</div><button class="gf-btn" id="gfClose">Close</button></div>
      <div class="gf-main">
        <div class="gf-row">
          <input id="gfApi" class="gf-input" style="width:210px" value="${state.apiBase}" />
          <input id="gfUser" class="gf-input" style="width:120px" value="${state.username}" />
          <input id="gfPass" class="gf-input" type="password" style="width:120px" value="Year2025%" />
          <button class="gf-btn primary" id="gfLogin">Login</button>
          <button class="gf-btn" id="gfDemo">Demo</button>
        </div>
        <div class="gf-row">
          ${Object.keys(tabs).map(k=>`<button class="gf-btn ${k===state.tab?'primary':''}" data-tab="${k}">${tabs[k].label}</button>`).join('')}
          <button class="gf-btn" id="gfRefresh">Refresh</button>
          <button class="gf-btn" id="gfNew">New</button>
          <button class="gf-btn" id="gfSave">Save</button>
          <button class="gf-btn" id="gfDelete">Delete</button>
        </div>
        <div class="gf-grid">
          <table class="gf-table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${state.rows.map((r,i)=>`<tr class="gf-tr ${i===state.selectedIndex?'sel':''}" data-row="${i}">${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </div>
        <div>
          <div class="gf-form">${cols.map(c=>`<div><label>${c}</label><input data-f="${c}" value="${selected[c]??''}"/></div>`).join('')}</div>
          <div class="gf-msg">${state.message || ''}</div>
        </div>
      </div>`;

    panel.querySelector('#gfClose').onclick = () => panel.classList.remove('open');
    panel.querySelector('#gfApi').onchange = (e)=>{ state.apiBase = e.target.value.replace(/\/$/,''); localStorage.setItem('gem_api_base', state.apiBase); };
    panel.querySelector('#gfUser').onchange = (e)=>{ state.username = e.target.value || 'Usman'; render(); };

    panel.querySelector('#gfLogin').onclick = async () => {
      try {
        const username = panel.querySelector('#gfUser').value || 'Usman';
        const password = panel.querySelector('#gfPass').value || '';
        state.username = username;
        const r = await api('POST', '/api/auth/login', { username, password });
        state.token = r.token || '';
        if (state.token) localStorage.setItem('erp_token', state.token);
        state.message = 'Login success';
        await load();
      } catch (e) { state.message = `Login failed: ${e.message}`; render(); }
    };

    panel.querySelector('#gfDemo').onclick = () => {
      state.rows = demoRows();
      state.selectedIndex = state.rows.length ? 0 : -1;
      state.message = 'Demo data loaded';
      render();
    };

    panel.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = async () => {
      state.tab = btn.getAttribute('data-tab');
      state.selectedIndex = -1;
      await load();
    });

    panel.querySelector('#gfRefresh').onclick = load;

    panel.querySelectorAll('[data-row]').forEach(row => row.onclick = () => {
      state.selectedIndex = Number(row.getAttribute('data-row'));
      render();
    });

    panel.querySelector('#gfNew').onclick = () => {
      state.selectedIndex = -1;
      state.message = 'New mode';
      render();
    };

    panel.querySelector('#gfSave').onclick = async () => {
      try {
        const t = tabs[state.tab];
        const payload = {};
        t.cols.forEach(c => {
          const el = panel.querySelector(`[data-f='${c}']`);
          if (el) payload[c] = el.value;
        });

        if (state.selectedIndex >= 0 && state.rows[state.selectedIndex]?.id) {
          await api('PUT', `${t.path}/${state.rows[state.selectedIndex].id}`, payload);
          state.message = 'Updated';
        } else {
          await api('POST', t.path, payload);
          state.message = 'Created';
        }
        await load();
      } catch (e) { state.message = `Save failed: ${e.message}`; render(); }
    };

    panel.querySelector('#gfDelete').onclick = async () => {
      try {
        const t = tabs[state.tab];
        const row = state.rows[state.selectedIndex];
        if (!row || !row.id) throw new Error('Select a row with id');
        await api('DELETE', `${t.path}/${row.id}`);
        state.message = 'Deleted';
        await load();
      } catch (e) { state.message = `Delete failed: ${e.message}`; render(); }
    };
  }

  function placeButtonInSidebar() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;

    // Find the China -> Dubai sidebar row first.
    const chinaNode = Array.from(document.querySelectorAll('button, a, div, span'))
      .find(el => /china\s*[\u2192>\-]\s*dubai/i.test((el.textContent || '').trim()));
    const container = chinaNode ? (chinaNode.closest('li, [role="menuitem"], button, a, div') || chinaNode) : null;
    const sidebar = chinaNode?.closest('nav, aside, [class*="sidebar"], [class*="side"]');

    // Preferred: append inside China submenu list (same level as Shipments/Containers...).
    let submenuHost = null;
    if (container?.parentElement) {
      const maybeSibling = container.nextElementSibling;
      if (maybeSibling && /shipments|containers|documents|customs|hs/i.test((maybeSibling.textContent || '').toLowerCase())) {
        submenuHost = maybeSibling;
      } else {
        submenuHost = Array.from(container.parentElement.querySelectorAll('div, ul, nav'))
          .find(el => el !== container && /shipments|containers|documents|customs|hs/i.test((el.textContent || '').toLowerCase()));
      }
    }

    if (submenuHost) {
      btn.classList.add('sidebar-mode');
      if (btn.parentElement !== submenuHost) submenuHost.appendChild(btn);
      return;
    }

    if (container && container.parentElement) {
      // Add as sibling directly after China -> Dubai item.
      btn.classList.add('sidebar-mode');
      if (btn.parentElement !== container.parentElement) {
        container.parentElement.insertBefore(btn, container.nextSibling);
      } else if (btn.previousSibling !== container) {
        container.parentElement.insertBefore(btn, container.nextSibling);
      }
      return;
    }

    // Fallback: append near bottom of sidebar if China item is not found yet.
    if (sidebar && btn.parentElement !== sidebar) {
      btn.classList.add('sidebar-mode');
      sidebar.appendChild(btn);
      return;
    }

    // Final fallback: keep floating mode.
    btn.classList.remove('sidebar-mode');
    if (btn.parentElement !== document.body) document.body.appendChild(btn);
  }

  async function load() {
    state.loading = true;
    try {
      const t = tabs[state.tab];
      const r = await api('GET', t.path);
      state.rows = r.data || [];
      state.selectedIndex = state.rows.length ? 0 : -1;
      state.message = `Loaded ${state.rows.length} rows`;
    } catch (e) {
      state.rows = demoRows();
      state.selectedIndex = state.rows.length ? 0 : -1;
      state.message = `Live load failed: ${e.message}. Showing demo.`;
    }
    state.loading = false;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { render(); });
  } else {
    render();
  }

  // React UI can re-render sidebar; keep GEM button pinned after China menu.
  const obs = new MutationObserver(() => {
    placeButtonInSidebar();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

