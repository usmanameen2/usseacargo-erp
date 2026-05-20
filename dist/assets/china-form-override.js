(() => {
  const STYLE_ID = "china-form-override-style";
  const MODAL_ID = "chinaFormModal";
  const OVERLAY_ID = "chinaFormOverlay";
  const TABLE_BODY_ID = "containerRows";
  const COUNT_ID = "containerCount";

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
          ${selectField("Job Type", "jobType", ["SELECT JOB TYPE", "Import", "Export", "Transshipment"], { required: true, value: "SELECT JOB TYPE" })}
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
          const rows = Array.from(document.querySelectorAll(`#${TABLE_BODY_ID} tr`));
          for (const tr of rows) {
            const values = Array.from(tr.querySelectorAll("input,select")).map((el) => el.value);
            const [
              , // checkbox
              containerNo,
              sealNo,
              size,
              type,
              shipType,
              ediCode,
              ctg,
              rowStatus,
              pkgs,
              gwt,
              cbm,
              principal,
              slot,
              yard,
              pod,
              containerDestination,
            ] = values;

            const containerPayload = {
              shipmentId,
              containerNo,
              sealNo,
              size,
              type,
              weight: Number(gwt || 0),
              status: rowStatus || "active",
            };
            if (!containerPayload.containerNo && !containerPayload.sealNo) continue;
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
        hideModal();
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
      },
      true
    );
  }

  injectStyles();
  bindGlobalEvents();
})();
