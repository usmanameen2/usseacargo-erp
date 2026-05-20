(() => {
  const STYLE_ID = "china-form-override-style";
  const MODAL_ID = "chinaFormModal";
  const OVERLAY_ID = "chinaFormOverlay";
  const TABLE_BODY_ID = "containerRows";
  const COUNT_ID = "containerCount";
  const DETAIL_MODAL_ID = "chinaShipmentDetailModal";
  const CONTAINER_BOARD_ID = "chinaContainerManifestBoard";
  const CONTAINERS_SUBMENU_PANEL_ID = "chinaContainersSubmenuPanel";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .cfo-overlay {
        position: fixed; inset: 0; background: rgba(31,41,55,.45);
        backdrop-filter: blur(2px); z-index: 9999; display: none;
      }
      .cfo-modal {
        position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: min(1240px, 96vw); max-height: 94vh; overflow: auto;
        background: #fff; border: 1px solid #d7dde8; border-radius: 18px;
        box-shadow: 0 28px 80px rgba(15,23,42,.25); z-index: 10000; display: none;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .cfo-head { display:flex; align-items:center; justify-content:space-between; padding: 18px 22px; border-bottom:1px solid #e6ebf2; }
      .cfo-title { display:flex; align-items:center; gap:12px; font-size: 34px; font-weight: 700; color:#0f172a; }
      .cfo-icon { width:44px; height:44px; border-radius: 12px; background:#e8f0ff; display:grid; place-items:center; color:#2563eb; font-size:20px; }
      .cfo-close { border:none; background:transparent; font-size:32px; line-height:1; cursor:pointer; color:#64748b; }
      .cfo-form { padding: 20px 22px 24px; }
      .cfo-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px 16px; }
      .cfo-full { grid-column: 1 / -1; }
      .cfo-label { display:block; font-size:12px; font-weight:700; color:#334155; margin: 0 0 6px; }
      .cfo-req::after { content:" *"; color:#dc2626; }
      .cfo-input,.cfo-select,.cfo-textarea {
        width:100%; height:38px; border:1px solid #d3dce8; border-radius:10px;
        background:#f8fafc; padding: 0 10px; font-size:13px; color:#0f172a; box-sizing:border-box;
      }
      .cfo-textarea { min-height: 82px; height:auto; padding:10px; resize:vertical; }
      .cfo-section {
        margin-top: 14px; border:1px solid #dbe3ef; border-radius:14px; overflow:hidden; background:#f8fafc;
      }
      .cfo-section-head {
        display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:#eef3fa; border-bottom:1px solid #dbe3ef;
      }
      .cfo-section-title { font-size:13px; font-weight:700; color:#1e293b; }
      .cfo-btn {
        height:34px; border-radius:10px; border:1px solid #c8d3e3; background:#fff;
        color:#334155; font-size:12px; font-weight:700; padding:0 12px; cursor:pointer;
      }
      .cfo-btn-primary { background:#2563eb; border-color:#2563eb; color:#fff; }
      .cfo-table-wrap { overflow:auto; background:#fff; }
      .cfo-table { width:100%; border-collapse:collapse; min-width: 1760px; font-size:12px; }
      .cfo-table th, .cfo-table td { border:1px solid #dbe3ef; padding:6px; text-align:left; vertical-align:middle; }
      .cfo-table th { background:#f3f6fb; color:#334155; font-weight:700; white-space:nowrap; }
      .cfo-cell-input,.cfo-cell-select {
        width:100%; height:30px; border:1px solid #cfd8e6; border-radius:8px; background:#fff; padding:0 8px; font-size:12px; box-sizing:border-box;
      }
      .cfo-cell-actions { display:flex; gap:6px; }
      .cfo-mini { width:30px; height:30px; border-radius:8px; border:1px solid #c7d2e3; background:#fff; cursor:pointer; font-weight:700; }
      .cfo-footer {
        position: sticky; bottom: 0; background:#fff; border-top:1px solid #e6ebf2; padding:14px 22px;
        display:flex; justify-content:flex-end; gap:10px;
      }
      .cfo-submit { height:40px; padding:0 16px; border:none; border-radius:12px; background:#2563eb; color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
      .cfo-cancel { height:40px; padding:0 16px; border:1px solid #c8d3e3; border-radius:12px; background:#fff; color:#334155; font-size:14px; font-weight:700; cursor:pointer; }
      details.cfo-details { margin-top: 12px; border:1px solid #dbe3ef; border-radius:12px; background:#fff; }
      details.cfo-details > summary { list-style:none; cursor:pointer; padding:10px 12px; font-weight:700; color:#334155; }
      details.cfo-details > summary::-webkit-details-marker { display:none; }
      .cfo-details-body { padding: 6px 12px 12px; }
      @media (max-width: 900px) {
        .cfo-grid { grid-template-columns: 1fr; }
        .cfo-modal { width: 98vw; border-radius: 12px; }
        .cfo-title { font-size: 26px; }
      }
      .china-manifest-board { margin-top:14px;border:1px solid #dbe3ef;border-radius:12px;background:#fff;overflow:hidden; }
      .china-manifest-head { display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e6ebf2;font-weight:700;color:#0f172a; }
      .china-manifest-wrap { overflow:auto; }
      .china-manifest-table { width:100%;border-collapse:collapse;min-width:900px;font-size:12px; }
      .china-manifest-table th,.china-manifest-table td { border:1px solid #e2e8f0;padding:8px;text-align:left; }
      .china-manifest-table th { background:#f8fafc;color:#334155; }
      .china-containers-submenu {
        margin-top: 12px; border:1px solid #dbe3ef; border-radius:12px; background:#fff; overflow:hidden;
      }
      .china-containers-submenu-head {
        display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #e6ebf2; font-weight:700; color:#0f172a;
      }
      .china-containers-submenu-wrap { overflow:auto; }
      .china-containers-submenu-table { width:100%; min-width:980px; border-collapse:collapse; font-size:12px; }
      .china-containers-submenu-table th,.china-containers-submenu-table td { border:1px solid #e2e8f0; padding:8px; text-align:left; }
      .china-containers-submenu-table th { background:#f8fafc; color:#334155; }
    `;
    document.head.appendChild(style);
  }

  function baseField(label, name, opts = {}) {
    const req = opts.required ? " cfo-req" : "";
    const required = opts.required ? "required" : "";
    const placeholder = opts.placeholder ? `placeholder="${opts.placeholder}"` : "";
    const value = opts.value != null ? `value="${opts.value}"` : "";
    return `
      <div class="${opts.full ? "cfo-full" : ""}">
        <label class="cfo-label${req}">${label}</label>
        <input class="cfo-input" name="${name}" ${required} ${placeholder} ${value}/>
      </div>
    `;
  }

  function selectField(label, name, items, opts = {}) {
    const req = opts.required ? " cfo-req" : "";
    const required = opts.required ? "required" : "";
    const options = items
      .map((v) => `<option value="${v}" ${opts.value === v ? "selected" : ""}>${v}</option>`)
      .join("");
    return `
      <div class="${opts.full ? "cfo-full" : ""}">
        <label class="cfo-label${req}">${label}</label>
        <select class="cfo-select" name="${name}" ${required}>${options}</select>
      </div>
    `;
  }

  function dateField(label, name, opts = {}) {
    const req = opts.required ? " cfo-req" : "";
    const required = opts.required ? "required" : "";
    return `
      <div class="${opts.full ? "cfo-full" : ""}">
        <label class="cfo-label${req}">${label}</label>
        <input class="cfo-input" type="date" name="${name}" ${required}/>
      </div>
    `;
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "cfo-overlay";

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "cfo-modal";
    modal.innerHTML = `
      <div class="cfo-head">
        <div class="cfo-title"><span class="cfo-icon">⚓</span>New Shipment</div>
        <button class="cfo-close" type="button" aria-label="Close">×</button>
      </div>
      <form class="cfo-form" id="cfoForm">
        <div class="cfo-grid">
          ${selectField("Branch", "branch", ["UAE", "KSA", "OMAN", "QATAR"], { value: "UAE" })}
          ${selectField("Job Type", "jobType", ["SELECT JOB TYPE", "FCL", "CONSOLE", "CO-LOAD", "CO-LOAD FCL", "BREAKBULK", "DIRECT-FCL", "DIRECT LCL"], { required: true, value: "SELECT JOB TYPE" })}
          ${selectField("Shipment Type", "shipmentType", ["COC", "SOC", "FCL", "LCL"], { required: true, value: "COC" })}
          ${baseField("Agent", "agent")}
          ${baseField("Port of Loading", "portOfLoading", { required: true })}
          ${dateField("ETD POL", "etdPol", { required: true })}
          ${selectField("Port of Discharge", "portOfDischarge", ["JEBEL ALI", "ABU DHABI", "SHARJAH"], { value: "JEBEL ALI" })}
          ${baseField("Vessel", "vessel", { required: true })}
          ${baseField("Voyage", "voyage", { required: true })}
          ${dateField("ETA Jebel Ali", "etaJebelAli", { required: true })}
          ${dateField("Discharge Date", "dischargeDate")}
          ${baseField("Main Line", "mainLine", { required: true })}
          ${baseField("Master B/L No", "masterBLNo", { required: true })}
          ${baseField("Empty Removed By", "emptyRemovedBy")}
          ${selectField("Terminal", "terminal", ["Terminal 1", "Terminal 2", "Terminal 3"], { value: "Terminal 1" })}
          ${selectField("Master B/L Freight Term", "masterBLFreightTerm", ["SELECT FREIGHT TERM", "PREPAID", "COLLECT"], { value: "SELECT FREIGHT TERM" })}
          ${baseField("Carrier", "carrier")}
          ${baseField("Carrier Ref", "carrierRef")}
          ${baseField("Serial Number", "serialNumber")}
          ${baseField("USD Buying Ex. Rate", "usdBuyingExRate", { value: "3.76" })}
          ${baseField("USD Selling Ex. Rate", "usdSellingExRate", { value: "3.76" })}
          ${baseField("Warehouse", "warehouse")}
          <div class="cfo-full">
            <label class="cfo-label">Warehouse Remarks</label>
            <textarea class="cfo-textarea" name="warehouseRemarks"></textarea>
          </div>
          ${baseField("Hauler / Transporter", "haulerTransporter")}
          ${baseField("Documentation By", "documentationBy")}
          ${baseField("Pre-Alert Email", "preAlertEmail")}
          ${selectField("Costing Type", "costingType", ["", "Estimated", "Actual", "Final"])}
          <div class="cfo-full">
            <label class="cfo-label">Internal Remarks</label>
            <textarea class="cfo-textarea" name="internalRemarks"></textarea>
          </div>
          ${baseField("Rotation Number", "rotationNumber")}
          ${baseField("MRN Number", "mrnNumber")}
          ${baseField("Cargo Transfer Number", "cargoTransferNumber")}
        </div>

        <div class="cfo-section">
          <div class="cfo-section-head">
            <div class="cfo-section-title">Number of Containers: <span id="${COUNT_ID}">1</span></div>
          </div>
          <div class="cfo-table-wrap">
            <table class="cfo-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Select</th>
                  <th>CNTR No</th>
                  <th>Seal No</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Ship Type</th>
                  <th>EDI Code</th>
                  <th>CTG</th>
                  <th>Status</th>
                  <th>PKGS</th>
                  <th>G.WT</th>
                  <th>CBM</th>
                  <th>Principal</th>
                  <th>Slot</th>
                  <th>Yard</th>
                  <th>POD</th>
                  <th>Destination</th>
                  <th>Add</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody id="${TABLE_BODY_ID}"></tbody>
            </table>
          </div>
        </div>

        <button type="submit" style="display:none;"></button>
      </form>
      <div class="cfo-footer">
        <button type="button" class="cfo-cancel" data-close>Cancel</button>
        <button type="button" class="cfo-submit" id="cfoSubmit">Submit</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    overlay.addEventListener("click", hideModal);
    modal.querySelector(".cfo-close").addEventListener("click", hideModal);
    modal.querySelector("[data-close]").addEventListener("click", hideModal);
    modal.querySelector("#cfoSubmit").addEventListener("click", () => {
      modal.querySelector("#cfoForm").requestSubmit();
    });
    modal.querySelector("#cfoForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = modal.querySelector("#cfoSubmit");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }
      try {
        const token = localStorage.getItem("erp_token");
        if (!token) throw new Error("Login required. Please login again.");

        const formEl = modal.querySelector("#cfoForm");
        const payload = Object.fromEntries(new FormData(formEl).entries());
        payload.cost = Number(payload.cost || 0);
        payload.revenue = Number(payload.revenue || 0);
        payload.usdBuyingExRate = Number(payload.usdBuyingExRate || 0);
        payload.usdSellingExRate = Number(payload.usdSellingExRate || 0);
        payload.profit = Number((payload.revenue || 0) - (payload.cost || 0));
        payload.margin = payload.revenue > 0 ? Number(((payload.profit / payload.revenue) * 100).toFixed(2)) : 0;
        if (!payload.shipmentNo) payload.shipmentNo = payload.reference || `SH-${Date.now()}`;
        if (!payload.status) payload.status = "draft";
        // Compatibility fields used by China->Dubai list table on this screen
        payload.reference = payload.reference || payload.masterBLNo || payload.shipmentNo;
        payload.client = payload.client || payload.agent || "Client";
        payload.cargo = payload.cargo || payload.shipmentType || "General";
        payload.origin = payload.origin || payload.portOfLoading || "";
        payload.destination = payload.destination || payload.portOfDischarge || "";
        payload.etd = payload.etd || payload.etdPol || "";
        payload.eta = payload.eta || payload.etaJebelAli || "";

        const containerRows = Array.from(document.querySelectorAll(`#${TABLE_BODY_ID} tr`)).map((tr) => {
          const inputs = tr.querySelectorAll("input,select");
          return {
            containerNo: inputs[1]?.value?.trim() || "",
            sealNo: inputs[2]?.value?.trim() || "",
            size: inputs[3]?.value || "",
            type: inputs[4]?.value || "",
            shipType: inputs[5]?.value || "",
            ediCode: inputs[6]?.value || "",
            ctg: inputs[7]?.value || "",
            rowStatus: inputs[8]?.value || "",
            pkgs: Number(inputs[9]?.value || 0),
            gwt: Number(inputs[10]?.value || 0),
            cbm: Number(inputs[11]?.value || 0),
            principal: inputs[12]?.value || "",
            slot: inputs[13]?.value || "",
            yard: inputs[14]?.value || "",
            pod: inputs[15]?.value || "",
            destination: inputs[16]?.value || "",
          };
        });
        // Save all visible rows (even when some fields are blank) because user may add rows first,
        // then complete HBL/manifest details later per container.
        const filledContainers = containerRows.length ? containerRows : [{}];
        payload.numberOfContainers = containerRows.length || 1;
        if (!payload.cargo || payload.cargo === "General") payload.cargo = `${payload.numberOfContainers} Container(s)`;

        const shipmentRes = await fetch("/api/china-dubai/shipments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const shipmentJson = await shipmentRes.json().catch(() => ({}));
        if (!shipmentRes.ok || !shipmentJson.success) {
          throw new Error(shipmentJson.message || `Shipment save failed (${shipmentRes.status})`);
        }

        const shipmentId = shipmentJson?.data?.id;
        if (shipmentId) {
          for (let i = 0; i < filledContainers.length; i++) {
            const row = filledContainers[i] || {};
            const containerPayload = {
              shipmentId,
              containerNo: row.containerNo || `ROW-${i + 1}`,
              sealNo: row.sealNo || "",
              size: row.size || "20",
              type: row.type || "GP",
              weight: Number(row.gwt || 0),
              status: row.rowStatus || "active",
            };
            await fetch("/api/china-dubai/containers", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(containerPayload),
            });
          }
        }

        alert("Shipment saved successfully.");
        localStorage.setItem("china_manifest_refresh", "1");
        showShipmentDetails(shipmentJson.data);
        hideModal();
        // Stay on China page; refresh panels in-place
        setTimeout(() => {
          renderContainerManifestBoard().catch(() => {});
          renderContainersSubmenuPanel().catch(() => {});
        }, 250);
      } catch (err) {
        alert(err?.message || "Failed to save shipment.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
      }
    });

    addRow();
  }

  function rowTemplate(idx) {
    return `
      <tr data-row="${idx}">
        <td class="row-no">${idx}</td>
        <td><input type="checkbox" checked></td>
        <td><input class="cfo-cell-input" type="text"></td>
        <td><input class="cfo-cell-input" type="text"></td>
        <td>
          <select class="cfo-cell-select">
            <option>20</option><option>40</option><option>45</option>
          </select>
        </td>
        <td>
          <select class="cfo-cell-select">
            <option>GP</option><option>HC</option><option>OT</option>
          </select>
        </td>
        <td>
          <select class="cfo-cell-select">
            <option>FCL/FCL</option><option>LCL/LCL</option><option>FCL/LCL</option>
          </select>
        </td>
        <td>
          <select class="cfo-cell-select">
            <option>20GP</option><option>40HC</option><option>45HC</option>
          </select>
        </td>
        <td>
          <select class="cfo-cell-select">
            <option>L</option><option>M</option><option>H</option>
          </select>
        </td>
        <td>
          <select class="cfo-cell-select">
            <option>LDN</option><option>PENDING</option><option>HOLD</option>
          </select>
        </td>
        <td><input class="cfo-cell-input" type="number" value="0"></td>
        <td><input class="cfo-cell-input" type="number" value="0"></td>
        <td><input class="cfo-cell-input" type="number" value="0"></td>
        <td>
          <select class="cfo-cell-select"><option></option><option>Y</option><option>N</option></select>
        </td>
        <td>
          <select class="cfo-cell-select"><option></option><option>A</option><option>B</option></select>
        </td>
        <td>
          <select class="cfo-cell-select"><option></option><option>Y1</option><option>Y2</option></select>
        </td>
        <td><input class="cfo-cell-input" type="text"></td>
        <td><input class="cfo-cell-input" type="text"></td>
        <td><button class="cfo-mini add-row" type="button">+</button></td>
        <td><button class="cfo-mini del-row" type="button">×</button></td>
      </tr>
    `;
  }

  function updateRowMeta() {
    const tbody = document.getElementById(TABLE_BODY_ID);
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((tr, i) => {
      tr.dataset.row = String(i + 1);
      const no = tr.querySelector(".row-no");
      if (no) no.textContent = String(i + 1);
    });
    const count = document.getElementById(COUNT_ID);
    if (count) count.textContent = String(rows.length);
  }

  function addRow(afterRow) {
    const tbody = document.getElementById(TABLE_BODY_ID);
    if (!tbody) return;
    const idx = tbody.querySelectorAll("tr").length + 1;
    const temp = document.createElement("tbody");
    temp.innerHTML = rowTemplate(idx);
    const row = temp.firstElementChild;
    if (afterRow && afterRow.parentNode === tbody) {
      tbody.insertBefore(row, afterRow.nextSibling);
    } else {
      tbody.appendChild(row);
    }
    updateRowMeta();
  }

  function removeRow(row) {
    const tbody = document.getElementById(TABLE_BODY_ID);
    if (!tbody || !row) return;
    const rows = tbody.querySelectorAll("tr");
    if (rows.length <= 1) return;
    row.remove();
    updateRowMeta();
  }

  function showModal() {
    createModal();
    document.getElementById(OVERLAY_ID).style.display = "block";
    document.getElementById(MODAL_ID).style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function hideModal() {
    const overlay = document.getElementById(OVERLAY_ID);
    const modal = document.getElementById(MODAL_ID);
    if (overlay) overlay.style.display = "none";
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  }

  function bindGlobalEvents() {
    document.addEventListener(
      "click",
      (e) => {
        const addBtn = e.target.closest(".add-row");
        if (addBtn) {
          e.preventDefault();
          const row = addBtn.closest("tr");
          addRow(row);
          return;
        }
        const delBtn = e.target.closest(".del-row");
        if (delBtn) {
          e.preventDefault();
          removeRow(delBtn.closest("tr"));
          return;
        }

        const newShipmentBtn = e.target.closest("button");
        if (
          newShipmentBtn &&
          newShipmentBtn.textContent &&
          newShipmentBtn.textContent.trim().toLowerCase().includes("new shipment")
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          showModal();
        }

        const menuText = (e.target.textContent || "").trim().toLowerCase();
        if (menuText === "containers") {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          renderContainersSubmenuPanel();
          return;
        }
        if (menuText === "shipments") {
          const p = document.getElementById(CONTAINERS_SUBMENU_PANEL_ID);
          if (p) p.remove();
        }
      },
      true
    );
  }

  function ensureDetailsModal() {
    if (document.getElementById(DETAIL_MODAL_ID)) return;
    const wrap = document.createElement("div");
    wrap.id = DETAIL_MODAL_ID;
    wrap.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10020;display:none;";
    wrap.innerHTML = `
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(920px,95vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid #dbe3ef;border-radius:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e6ebf2;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">Shipment Details</div>
          <button id="chinaDetailClose" type="button" style="border:none;background:transparent;font-size:28px;cursor:pointer;color:#64748b;">×</button>
        </div>
        <div id="chinaDetailBody" style="padding:14px;"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) wrap.style.display = "none";
    });
    wrap.querySelector("#chinaDetailClose").addEventListener("click", () => {
      wrap.style.display = "none";
    });
  }

  function showShipmentDetails(record) {
    ensureDetailsModal();
    const modal = document.getElementById(DETAIL_MODAL_ID);
    const body = document.getElementById("chinaDetailBody");
    if (!modal || !body) return;
    const pretty = Object.entries(record || {}).map(([k, v]) => `
      <div style="display:grid;grid-template-columns:220px 1fr;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:700;color:#334155;">${k}</div>
        <div style="color:#0f172a;word-break:break-word;">${v == null ? "" : String(v)}</div>
      </div>
    `).join("");
    body.innerHTML = pretty || "<div>No record details found.</div>";
    modal.style.display = "block";
  }

  async function loadShipmentByReference(referenceText) {
    const token = localStorage.getItem("erp_token");
    if (!token) throw new Error("Login required.");
    const res = await fetch("/api/china-dubai/shipments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to load shipments.");
    const rows = Array.isArray(json.data) ? json.data : [];
    if (!referenceText) return rows[0] || null;
    const ref = referenceText.trim().toLowerCase();
    return rows.find((r) => String(r.reference || "").trim().toLowerCase() === ref)
      || rows.find((r) => String(r.master_bl_no || "").trim().toLowerCase() === ref)
      || rows[0]
      || null;
  }

  function injectRowActions() {
    const table = document.querySelector("table");
    if (!table) return;
    const headRow = table.querySelector("thead tr");
    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    if (!headRow || !bodyRows.length) return;

    const ths = Array.from(headRow.querySelectorAll("th"));
    const hasRef = ths.some((th) => /reference/i.test(th.textContent || ""));
    const hasActions = ths.some((th) => /actions/i.test(th.textContent || ""));
    if (!hasRef) return;

    if (!hasActions) {
      const th = document.createElement("th");
      th.textContent = "ACTIONS";
      headRow.appendChild(th);
    }

    bodyRows.forEach((tr) => {
      if (tr.querySelector(".china-row-actions")) return;
      const td = document.createElement("td");
      td.className = "china-row-actions";
      td.style.whiteSpace = "nowrap";
      td.innerHTML = `
        <button type="button" class="cfo-btn" data-view-row>View</button>
        <button type="button" class="cfo-btn cfo-btn-primary" data-details-row style="margin-left:6px;">Details</button>
      `;
      tr.appendChild(td);
    });
  }

  function getMainBoardRoot() {
    const marker = Array.from(document.querySelectorAll("h1,h2,h3,div,span")).find((el) =>
      /china\s*&?\s*dubai\s*shipments/i.test((el.textContent || "").trim())
    );
    if (marker) {
      return marker.closest("section,main,article,div")?.parentElement || marker.closest("section,main,article,div");
    }
    // Fallback: anchor to app root/main area on china-dubai page.
    if (location.hash && location.hash.includes("china-dubai")) {
      const root = document.querySelector("#root");
      if (root) return root;
    }
    return null;
  }

  function getVisibleContainerAnchor() {
    // Best anchor: the shipments grid table with "REFERENCE ... ACTIONS"
    const actionsHeader = Array.from(document.querySelectorAll("th,div,span")).find((el) =>
      /\bactions\b/i.test((el.textContent || "").trim())
    );
    if (actionsHeader) {
      const rowWrap = actionsHeader.closest("table,div");
      if (rowWrap) return rowWrap.closest("div") || rowWrap;
    }
    const summary = Array.from(document.querySelectorAll("div,span,p")).find((el) =>
      /\btotal\s*:/i.test((el.textContent || "").trim())
    );
    if (summary) return summary.closest("div");
    const table = document.querySelector("table");
    if (table) return table.closest("div") || table.parentElement;
    return getMainBoardRoot();
  }

  async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("erp_token");
    if (!token) throw new Error("Login required.");
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
    return json;
  }

  async function renderContainerManifestBoard() {
    const root = getMainBoardRoot();
    if (!root) return;
    let board = document.getElementById(CONTAINER_BOARD_ID);
    if (!board) {
      board = document.createElement("div");
      board.id = CONTAINER_BOARD_ID;
      board.className = "china-manifest-board";
      board.innerHTML = `
        <div class="china-manifest-head">
          <span>Containers - Manifest HBL</span>
          <button type="button" class="cfo-btn" id="refreshManifestBoard">Refresh</button>
        </div>
        <div class="china-manifest-wrap">
          <table class="china-manifest-table">
            <thead>
              <tr><th>#</th><th>Shipment</th><th>Container No</th><th>Seal No</th><th>Size</th><th>Type</th><th>HBL</th><th>Action</th></tr>
            </thead>
            <tbody id="manifestRows"><tr><td colspan="8">Loading...</td></tr></tbody>
          </table>
        </div>
      `;
      root.appendChild(board);
    }

    const tbody = document.getElementById("manifestRows");
    if (!tbody) return;
    try {
      const containers = (await fetchWithAuth("/api/china-dubai/containers")).data || [];
      const hblRows = (await fetchWithAuth("/api/hbl-tracking")).data || [];
      if (!containers.length) {
        tbody.innerHTML = `<tr><td colspan="8">No containers found yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = containers.map((c, i) => {
        const hbl = hblRows.find((h) => String(h.container_no || "").trim().toLowerCase() === String(c.container_no || "").trim().toLowerCase());
        return `<tr>
          <td>${i + 1}</td>
          <td>${c.shipment_id || ""}</td>
          <td>${c.container_no || ""}</td>
          <td>${c.seal_no || ""}</td>
          <td>${c.size || ""}</td>
          <td>${c.type || ""}</td>
          <td>${hbl ? (hbl.hbl_no || "Created") : "-"}</td>
          <td><button type="button" class="cfo-btn cfo-btn-primary manifest-hbl-btn" data-container='${JSON.stringify(c).replace(/'/g, "&#39;")}'>Manifest HBL</button></td>
        </tr>`;
      }).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8">${err.message || "Failed to load containers."}</td></tr>`;
    }
  }

  async function createManifestForContainer(container) {
    const hblNo = prompt(`Enter HBL No for container ${container.container_no || ""}`);
    if (!hblNo) return;
    await fetchWithAuth("/api/hbl-tracking", {
      method: "POST",
      body: JSON.stringify({
        hblNo,
        customerName: "China Dubai Client",
        containerNo: container.container_no || "",
        containerSize: container.size || "",
        weight: Number(container.weight || 0),
        status: "Active",
        jobNo: container.shipment_id ? `SH-${container.shipment_id}` : "",
        remarks: `Manifest created from China->Dubai`,
      }),
    });
    alert("Manifest HBL created.");
    await renderContainerManifestBoard();
  }

  async function renderContainersSubmenuPanel() {
    if (!(location.hash || "").includes("china-dubai")) return;
    const anchor = getVisibleContainerAnchor();
    if (!anchor) return;

    let panel = document.getElementById(CONTAINERS_SUBMENU_PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = CONTAINERS_SUBMENU_PANEL_ID;
      panel.className = "china-containers-submenu";
      panel.style.marginBottom = "18px";
      panel.innerHTML = `
        <div class="china-containers-submenu-head">
          <span>China Container Tracker (All Submitted Containers)</span>
          <button type="button" class="cfo-btn" id="refreshContainersSubmenu">Refresh</button>
        </div>
        <div class="china-containers-submenu-wrap">
          <table class="china-containers-submenu-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Shipment ID</th>
                <th>Reference</th>
                <th>Container No</th>
                <th>Seal No</th>
                <th>Size</th>
                <th>Type</th>
                <th>Status</th>
                <th>Weight</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody id="containersSubmenuRows">
              <tr><td colspan="10">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      `;
      // Insert immediately after visible shipment area so user always sees it
      if (anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      } else {
        document.body.appendChild(panel);
      }
    }

    const tbody = document.getElementById("containersSubmenuRows");
    if (!tbody) return;

    try {
      const [cjson, sjson] = await Promise.all([
        fetchWithAuth("/api/china-dubai/containers"),
        fetchWithAuth("/api/china-dubai/shipments"),
      ]);
      const containers = Array.isArray(cjson.data) ? cjson.data : [];
      const shipments = Array.isArray(sjson.data) ? sjson.data : [];
      const byId = new Map(shipments.map((s) => [String(s.id), s]));

      if (!containers.length) {
        tbody.innerHTML = `<tr><td colspan="10">No containers saved yet.</td></tr>`;
        return;
      }

      // newest first, easier tracking
      const ordered = containers.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
      tbody.innerHTML = ordered.map((c, i) => {
        const ship = byId.get(String(c.shipment_id));
        return `<tr>
          <td>${i + 1}</td>
          <td>${c.shipment_id || ""}</td>
          <td>${ship?.reference || ship?.master_bl_no || ""}</td>
          <td>${c.container_no || ""}</td>
          <td>${c.seal_no || ""}</td>
          <td>${c.size || ""}</td>
          <td>${c.type || ""}</td>
          <td>${c.status || ""}</td>
          <td>${c.weight ?? 0}</td>
          <td>${c.created_at || ""}</td>
        </tr>`;
      }).join("");
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="10">${err.message || "Failed to load containers."}</td></tr>`;
    }
  }

  document.addEventListener("click", async (e) => {
    const viewBtn = e.target.closest("[data-view-row]");
    const detailsBtn = e.target.closest("[data-details-row]");
    if (!viewBtn && !detailsBtn) return;
    try {
      const tr = (viewBtn || detailsBtn).closest("tr");
      const referenceCell = tr ? tr.querySelector("td") : null;
      const record = await loadShipmentByReference(referenceCell ? referenceCell.textContent : "");
      if (!record) throw new Error("No shipment record found.");
      showShipmentDetails(record);
    } catch (err) {
      alert(err?.message || "Failed to open shipment details.");
    }

    const refreshBtn = e.target.closest("#refreshManifestBoard");
    if (refreshBtn) {
      await renderContainerManifestBoard();
      return;
    }

    const manifestBtn = e.target.closest(".manifest-hbl-btn");
    if (manifestBtn) {
      try {
        const c = JSON.parse(manifestBtn.getAttribute("data-container") || "{}");
        await createManifestForContainer(c);
      } catch (err) {
        alert(err?.message || "Failed to create Manifest HBL.");
      }
      return;
    }

    const refreshContainersSubmenu = e.target.closest("#refreshContainersSubmenu");
    if (refreshContainersSubmenu) {
      await renderContainersSubmenuPanel();
      return;
    }
  }, true);

  function autoRenderContainersPanel() {
    if (!(location.hash || "").includes("china-dubai")) return;
    renderContainersSubmenuPanel().catch(() => {});
  }

  setInterval(injectRowActions, 1200);
  setTimeout(renderContainerManifestBoard, 1200);
  setTimeout(autoRenderContainersPanel, 900);
  setInterval(autoRenderContainersPanel, 2500);
  if (localStorage.getItem("china_manifest_refresh") === "1") {
    localStorage.removeItem("china_manifest_refresh");
    setTimeout(renderContainerManifestBoard, 1800);
    setTimeout(autoRenderContainersPanel, 2000);
  }

  injectStyles();
  bindGlobalEvents();
})();
