// Uygulama durumu ve arayüz mantığı

const state = {
  points: [
    { name: "R1", type: "fixed", height: 250.0 },
    { name: "R2", type: "fixed", height: 255.48 },
    { name: "N1", type: "unknown", height: null },
    { name: "N2", type: "unknown", height: null },
  ],
  leveling: [
    { from: "R1", to: "N1", dh: 3.215, dist: 1.2, sigma: null },
    { from: "N1", to: "N2", dh: 2.845, dist: 1.5, sigma: null },
    { from: "N2", to: "R2", dh: -0.612, dist: 1.0, sigma: null },
    { from: "R1", to: "N2", dh: 6.045, dist: 2.4, sigma: null },
  ],
  gnss: [
    { point: "N1", h: 268.9, N: 15.66, sigma: null },
    { point: "N2", h: 271.7, N: 15.615, sigma: null },
  ],
  params: {
    k: 0.003, // m / sqrt(km) - nivelman hassasiyet katsayısı
    sigmaGnss: 0.02, // m - GNSS'ten türetilen yükseklik için varsayılan standart sapma
  },
};

function fmt(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(d);
}

function pointOptions(selected) {
  return state.points
    .map((p) => `<option value="${p.name}" ${p.name === selected ? "selected" : ""}>${p.name}</option>`)
    .join("");
}

function renderPointsTable() {
  const tbody = document.querySelector("#points-table tbody");
  tbody.innerHTML = "";
  state.points.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${p.name}" data-idx="${i}" data-field="name" class="pt-input" /></td>
      <td>
        <select data-idx="${i}" data-field="type" class="pt-input">
          <option value="fixed" ${p.type === "fixed" ? "selected" : ""}>Sabit (mesnet)</option>
          <option value="unknown" ${p.type === "unknown" ? "selected" : ""}>Bilinmeyen</option>
        </select>
      </td>
      <td><input type="number" step="any" value="${p.height ?? ""}" data-idx="${i}" data-field="height" class="pt-input" ${p.type === "unknown" ? "placeholder='—' " : ""} /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-point">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLevelingTable() {
  const tbody = document.querySelector("#leveling-table tbody");
  tbody.innerHTML = "";
  state.leveling.forEach((o, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select data-idx="${i}" data-field="from" class="lv-input">${pointOptions(o.from)}</select></td>
      <td><select data-idx="${i}" data-field="to" class="lv-input">${pointOptions(o.to)}</select></td>
      <td><input type="number" step="any" value="${o.dh}" data-idx="${i}" data-field="dh" class="lv-input" /></td>
      <td><input type="number" step="any" value="${o.dist}" data-idx="${i}" data-field="dist" class="lv-input" /></td>
      <td><input type="number" step="any" value="${o.sigma ?? ""}" placeholder="oto." data-idx="${i}" data-field="sigma" class="lv-input" /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-leveling">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderGnssTable() {
  const tbody = document.querySelector("#gnss-table tbody");
  tbody.innerHTML = "";
  state.gnss.forEach((o, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><select data-idx="${i}" data-field="point" class="gn-input">${pointOptions(o.point)}</select></td>
      <td><input type="number" step="any" value="${o.h}" data-idx="${i}" data-field="h" class="gn-input" /></td>
      <td><input type="number" step="any" value="${o.N}" data-idx="${i}" data-field="N" class="gn-input" /></td>
      <td><input type="number" step="any" value="${o.sigma ?? ""}" placeholder="oto." data-idx="${i}" data-field="sigma" class="gn-input" /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-gnss">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderParams() {
  document.getElementById("param-k").value = state.params.k;
  document.getElementById("param-sigma-gnss").value = state.params.sigmaGnss;
}

function renderAll() {
  renderPointsTable();
  renderLevelingTable();
  renderGnssTable();
  renderParams();
}

function attachTableListeners() {
  document.querySelector("#points-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    if (field === "height") {
      state.points[idx].height = t.value === "" ? null : Number(t.value);
    } else {
      state.points[idx][field] = t.value;
      if (field === "type" && t.value === "unknown") state.points[idx].height = null;
      renderAll();
    }
  });

  document.querySelector("#points-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-point") {
      state.points.splice(Number(e.target.dataset.idx), 1);
      renderAll();
    }
  });

  document.querySelector("#leveling-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    const val = ["dh", "dist", "sigma"].includes(field) ? (t.value === "" ? null : Number(t.value)) : t.value;
    state.leveling[idx][field] = val;
  });

  document.querySelector("#leveling-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-leveling") {
      state.leveling.splice(Number(e.target.dataset.idx), 1);
      renderAll();
    }
  });

  document.querySelector("#gnss-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    const val = ["h", "N", "sigma"].includes(field) ? (t.value === "" ? null : Number(t.value)) : t.value;
    state.gnss[idx][field] = val;
  });

  document.querySelector("#gnss-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-gnss") {
      state.gnss.splice(Number(e.target.dataset.idx), 1);
      renderAll();
    }
  });

  document.getElementById("add-point").addEventListener("click", () => {
    const n = state.points.length + 1;
    state.points.push({ name: `P${n}`, type: "unknown", height: null });
    renderAll();
  });

  document.getElementById("add-leveling").addEventListener("click", () => {
    const p1 = state.points[0]?.name ?? "";
    const p2 = state.points[1]?.name ?? "";
    state.leveling.push({ from: p1, to: p2, dh: 0, dist: 1, sigma: null });
    renderAll();
  });

  document.getElementById("add-gnss").addEventListener("click", () => {
    const p1 = state.points[0]?.name ?? "";
    state.gnss.push({ point: p1, h: 0, N: 0, sigma: null });
    renderAll();
  });

  document.getElementById("param-k").addEventListener("input", (e) => {
    state.params.k = Number(e.target.value);
  });
  document.getElementById("param-sigma-gnss").addEventListener("input", (e) => {
    state.params.sigmaGnss = Number(e.target.value);
  });

  document.getElementById("calculate").addEventListener("click", calculate);
}

function calculate() {
  const errorBox = document.getElementById("error-box");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  try {
    const result = runAdjustment(state.points, state.leveling, state.gnss, state.params);
    renderResults(result);
  } catch (err) {
    errorBox.textContent = "Hata: " + err.message;
    errorBox.classList.remove("hidden");
    document.getElementById("results-section").classList.add("hidden");
  }
}

function renderResults(result) {
  document.getElementById("results-section").classList.remove("hidden");

  document.getElementById("stat-nobs").textContent = result.obsCount;
  document.getElementById("stat-unknowns").textContent = result.unknownCount;
  document.getElementById("stat-redundancy").textContent = result.redundancy;
  document.getElementById("stat-sigma0").textContent = fmt(result.sigma0, 5) + " m";

  const heightsBody = document.querySelector("#heights-table tbody");
  heightsBody.innerHTML = "";
  result.results.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${fmt(r.H, 4)}</td>
      <td>±${fmt(r.stdev, 4)}</td>
      <td>[${fmt(r.ciLow, 4)}, ${fmt(r.ciHigh, 4)}]</td>
    `;
    heightsBody.appendChild(tr);
  });

  const resBody = document.querySelector("#residuals-table tbody");
  resBody.innerHTML = "";
  result.residualRows.forEach((r) => {
    const flag = Math.abs(r.vNormalized) > 3 ? "flag-bad" : Math.abs(r.vNormalized) > 2 ? "flag-warn" : "";
    const tr = document.createElement("tr");
    tr.className = flag;
    tr.innerHTML = `
      <td>${r.label}</td>
      <td>${r.kind}</td>
      <td>${fmt(r.raw, 4)}</td>
      <td>±${fmt(r.sigma, 4)}</td>
      <td>${fmt(r.v, 4)}</td>
      <td>${fmt(r.vNormalized, 2)}</td>
    `;
    resBody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  attachTableListeners();
  calculate();
});
