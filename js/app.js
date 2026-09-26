// Uygulama durumu ve arayüz mantığı

// Örnek/test verisi: Rize (Karadeniz) bölgesinde, sahilden yaylaya çıkan
// ~16 km'lik bir hat nivelmanını temsil eder. Koordinatlar (Y=Doğu, X=Kuzey)
// UTM benzeri gerçeğe yakın değerlerdir; GERÇEK/RESMİ NİRENGİ-RÖPER
// KOORDİNATLARI DEĞİLDİR, yalnızca ölçek ve performans testi amaçlıdır.
const state = {
  // Noktalar kasıtlı olarak güzergah (hat) sırasıyla listelenmiştir; bu sıra
  // hem noktalar tablosunda hem de yükseklik profilinde okunabilirliği artırır.
  points: [
    { name: "RP1", type: "fixed", height: 4.235, y: 548250, x: 4487600 },
    { name: "N1", type: "unknown", height: null, y: 548500, x: 4486800 },
    { name: "N2", type: "unknown", height: null, y: 548950, x: 4485950 },
    { name: "N3", type: "unknown", height: null, y: 549400, x: 4485000 },
    { name: "N4", type: "unknown", height: null, y: 549250, x: 4483950 },
    { name: "RP2", type: "fixed", height: 63.87, y: 549600, x: 4482900 },
    { name: "N5", type: "unknown", height: null, y: 549300, x: 4481700 },
    { name: "N6", type: "unknown", height: null, y: 549750, x: 4480650 },
    { name: "N7", type: "unknown", height: null, y: 549500, x: 4479500 },
    { name: "N8", type: "unknown", height: null, y: 549900, x: 4478400 },
    { name: "RP3", type: "fixed", height: 270.955, y: 549650, x: 4477250 },
    { name: "N9", type: "unknown", height: null, y: 550000, x: 4476150 },
    { name: "N10", type: "unknown", height: null, y: 549800, x: 4475000 },
    { name: "N11", type: "unknown", height: null, y: 550150, x: 4473900 },
    { name: "N12", type: "unknown", height: null, y: 549950, x: 4472750 },
  ],
  leveling: [
    { from: "RP1", to: "N1", dh: 5.395, dist: 0.84, sigma: null },
    { from: "N1", to: "N2", dh: 8.235, dist: 0.96, sigma: null },
    { from: "N2", to: "N3", dh: 11.565, dist: 1.05, sigma: null },
    { from: "N3", to: "N4", dh: 15.205, dist: 1.06, sigma: null },
    { from: "N4", to: "RP2", dh: 19.247, dist: 1.11, sigma: null },
    { from: "RP1", to: "RP2", dh: 59.658, dist: 4.89, sigma: null },
    { from: "RP2", to: "N5", dh: 31.395, dist: 1.24, sigma: null },
    { from: "N5", to: "N6", dh: 37.435, dist: 1.14, sigma: null },
    { from: "N6", to: "N7", dh: 42.375, dist: 1.18, sigma: null },
    { from: "N7", to: "N8", dh: 46.395, dist: 1.17, sigma: null },
    { from: "N8", to: "RP3", dh: 49.52, dist: 1.18, sigma: null },
    { from: "RP3", to: "N9", dh: 47.44, dist: 1.15, sigma: null },
    { from: "N9", to: "N10", dh: 51.315, dist: 1.17, sigma: null },
    { from: "N10", to: "N11", dh: 45.47, dist: 1.15, sigma: null },
    { from: "N11", to: "N12", dh: 47.35, dist: 1.17, sigma: null },
  ],
  gnss: [
    { point: "N2", h: 50.43, N: 32.6, sigma: null },
    { point: "N4", h: 77.275, N: 32.65, sigma: null },
    { point: "N6", h: 165.35, N: 32.75, sigma: null },
    { point: "N8", h: 254.17, N: 32.85, sigma: null },
    { point: "N9", h: 351.325, N: 32.95, sigma: null },
    { point: "N11", h: 448.24, N: 33.05, sigma: null },
  ],
  params: {
    k: 0.003, // m / sqrt(km) - nivelman hassasiyet katsayısı
    sigmaGnss: 0.02, // m - GNSS'ten türetilen yükseklik için varsayılan standart sapma
  },
  // Yönetmelik toleransı sınıfları — AŞAĞIDAKİ KATSAYILAR ÖRNEK/VARSAYILAN
  // DEĞERLERDİR. Yürürlükteki Büyük Ölçekli Harita ve Harita Bilgileri Üretim
  // Yönetmeliği (BÖHHBÜY) metninden güncel değerleri teyit ederek düzenleyin.
  accuracyClasses: [
    { name: "I. Derece (Hassas) Nivelman", closureCoeff: 3, gnssMaxSigmaMm: 10, pointMaxStdevMm: 5 },
    { name: "II. Derece Nivelman", closureCoeff: 8, gnssMaxSigmaMm: 20, pointMaxStdevMm: 10 },
    { name: "III. Derece (Teknik) Nivelman", closureCoeff: 24, gnssMaxSigmaMm: 30, pointMaxStdevMm: 20 },
  ],
  activeClassIndex: 1,
  devreler: [
    { name: "Devre-1 (kapalı: RP1-N1-N2-N3-N4-RP2-RP1)", path: "RP1,N1,N2,N3,N4,RP2,RP1" },
    { name: "Hat-1 (mesnetli: RP1→RP2)", path: "RP1,N1,N2,N3,N4,RP2" },
    { name: "Hat-2 (mesnetli: RP2→RP3)", path: "RP2,N5,N6,N7,N8,RP3" },
  ],
};

function fmt(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(d);
}

function pointOptions(selected) {
  return state.points
    .map((p) => {
      const name = vizEscape(p.name);
      return `<option value="${name}" ${p.name === selected ? "selected" : ""}>${name}</option>`;
    })
    .join("");
}

function renderPointsTable() {
  const tbody = document.querySelector("#points-table tbody");
  tbody.innerHTML = "";
  state.points.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${vizEscape(p.name)}" data-idx="${i}" data-field="name" class="pt-input" /></td>
      <td>
        <select data-idx="${i}" data-field="type" class="pt-input">
          <option value="fixed" ${p.type === "fixed" ? "selected" : ""}>Sabit (mesnet)</option>
          <option value="unknown" ${p.type === "unknown" ? "selected" : ""}>Bilinmeyen</option>
        </select>
      </td>
      <td><input type="number" step="any" value="${p.height ?? ""}" data-idx="${i}" data-field="height" class="pt-input" ${p.type === "unknown" ? "placeholder='—' " : ""} /></td>
      <td><input type="number" step="any" value="${p.y ?? ""}" placeholder="—" data-idx="${i}" data-field="y" class="pt-input" /></td>
      <td><input type="number" step="any" value="${p.x ?? ""}" placeholder="—" data-idx="${i}" data-field="x" class="pt-input" /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-point">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAccuracyClassesTable() {
  const tbody = document.querySelector("#accuracy-table tbody");
  tbody.innerHTML = "";
  state.accuracyClasses.forEach((c, i) => {
    const tr = document.createElement("tr");
    tr.className = i === state.activeClassIndex ? "active-class-row" : "";
    tr.innerHTML = `
      <td><input type="radio" name="active-class" ${i === state.activeClassIndex ? "checked" : ""} data-idx="${i}" data-action="select-class" /></td>
      <td><input type="text" value="${vizEscape(c.name)}" data-idx="${i}" data-field="name" class="ac-input" /></td>
      <td><input type="number" step="any" value="${c.closureCoeff}" data-idx="${i}" data-field="closureCoeff" class="ac-input" /></td>
      <td><input type="number" step="any" value="${c.gnssMaxSigmaMm}" data-idx="${i}" data-field="gnssMaxSigmaMm" class="ac-input" /></td>
      <td><input type="number" step="any" value="${c.pointMaxStdevMm}" data-idx="${i}" data-field="pointMaxStdevMm" class="ac-input" /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-class">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDevrelerTable() {
  const tbody = document.querySelector("#devreler-table tbody");
  tbody.innerHTML = "";
  state.devreler.forEach((d, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${vizEscape(d.name)}" data-idx="${i}" data-field="name" class="dv-input" /></td>
      <td><input type="text" value="${vizEscape(d.path)}" placeholder="ör: R1,N1,N2,R1" data-idx="${i}" data-field="path" class="dv-input" /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-devre">Sil</button></td>
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
  renderAccuracyClassesTable();
  renderDevrelerTable();
}

function attachTableListeners() {
  document.querySelector("#points-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    if (field === "height" || field === "y" || field === "x") {
      state.points[idx][field] = t.value === "" ? null : Number(t.value);
    } else if (field === "name") {
      // Tabloyu her tuş vuruşunda yeniden çizmek input'un odağını kaybettirir;
      // bu yüzden isim değişince hemen renderAll() çağrılmıyor (aşağıdaki
      // "focusout" dinleyicisi bağımlı seçim kutularını odak kaybolduğunda günceller).
      const oldName = state.points[idx].name;
      const newName = t.value;
      state.points[idx].name = newName;
      if (oldName !== newName) {
        state.leveling.forEach((o) => {
          if (o.from === oldName) o.from = newName;
          if (o.to === oldName) o.to = newName;
        });
        state.gnss.forEach((o) => {
          if (o.point === oldName) o.point = newName;
        });
      }
    } else {
      state.points[idx][field] = t.value;
      if (field === "type" && t.value === "unknown") state.points[idx].height = null;
      renderAll();
    }
  });

  document.querySelector("#points-table tbody").addEventListener("focusout", (e) => {
    if (e.target.dataset.field === "name") renderAll();
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

  document.querySelector("#accuracy-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    state.accuracyClasses[idx][field] = field === "name" ? t.value : Number(t.value);
  });

  document.querySelector("#accuracy-table tbody").addEventListener("click", (e) => {
    const t = e.target;
    if (t.dataset.action === "select-class") {
      state.activeClassIndex = Number(t.dataset.idx);
      renderAccuracyClassesTable();
    } else if (t.dataset.action === "remove-class") {
      const idx = Number(t.dataset.idx);
      state.accuracyClasses.splice(idx, 1);
      if (state.activeClassIndex >= state.accuracyClasses.length) {
        state.activeClassIndex = Math.max(0, state.accuracyClasses.length - 1);
      }
      renderAccuracyClassesTable();
    }
  });

  document.getElementById("add-class").addEventListener("click", () => {
    state.accuracyClasses.push({ name: "Yeni sınıf", closureCoeff: 12, gnssMaxSigmaMm: 25, pointMaxStdevMm: 15 });
    renderAccuracyClassesTable();
  });

  document.querySelector("#devreler-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    state.devreler[idx][t.dataset.field] = t.value;
  });

  document.querySelector("#devreler-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-devre") {
      state.devreler.splice(Number(e.target.dataset.idx), 1);
      renderDevrelerTable();
    }
  });

  document.getElementById("add-devre").addEventListener("click", () => {
    state.devreler.push({ name: `Devre-${state.devreler.length + 1}`, path: "" });
    renderDevrelerTable();
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
    document.getElementById("viz-section").classList.add("hidden");
  }
}

function renderResults(result) {
  document.getElementById("results-section").classList.remove("hidden");
  document.getElementById("viz-section").classList.remove("hidden");

  document.getElementById("stat-nobs").textContent = result.obsCount;
  document.getElementById("stat-unknowns").textContent = result.unknownCount;
  document.getElementById("stat-redundancy").textContent = result.redundancy;
  document.getElementById("stat-sigma0").textContent = fmt(result.sigma0, 5) + " m";

  const activeClass = state.accuracyClasses[state.activeClassIndex];

  const heightsBody = document.querySelector("#heights-table tbody");
  heightsBody.innerHTML = "";
  result.results.forEach((r) => {
    const stdevMm = r.stdev * 1000;
    const cls = classifyByStdev(stdevMm, state.accuracyClasses, "pointMaxStdevMm");
    const meetsActive = activeClass && stdevMm <= activeClass.pointMaxStdevMm;
    const tr = document.createElement("tr");
    if (activeClass) tr.className = meetsActive ? "" : "flag-warn";
    tr.innerHTML = `
      <td>${vizEscape(r.name)}</td>
      <td>${fmt(r.H, 4)}</td>
      <td>±${fmt(r.stdev, 4)} (${fmt(stdevMm, 1)} mm)</td>
      <td>[${fmt(r.ciLow, 4)}, ${fmt(r.ciHigh, 4)}]</td>
      <td>${vizEscape(cls)}</td>
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
      <td>${vizEscape(r.label)}</td>
      <td>${r.kind}</td>
      <td>${fmt(r.raw, 4)}</td>
      <td>±${fmt(r.sigma, 4)}</td>
      <td>${fmt(r.v, 4)}</td>
      <td>${fmt(r.vNormalized, 2)}</td>
    `;
    resBody.appendChild(tr);
  });

  renderDevreResults(activeClass);
  renderGnssComplianceNote(activeClass);

  // Kroki tooltip'lerinde dengeli yükseklikleri gösterebilmek için, state'i
  // değiştirmeden bilinmeyen noktaların H'sini dengeleme sonucuyla birleştir.
  const adjustedHeightByName = {};
  result.results.forEach((r) => (adjustedHeightByName[r.name] = r.H));
  const pointsForViz = state.points.map((p) =>
    p.type === "unknown" && p.name in adjustedHeightByName
      ? { ...p, height: adjustedHeightByName[p.name] }
      : p
  );

  const residualByLabel = {};
  result.residualRows.forEach((r) => (residualByLabel[r.label] = r));
  renderNetworkSketch(document.getElementById("network-sketch"), pointsForViz, state.leveling, residualByLabel);
  renderHeightProfile(document.getElementById("height-profile"), state.points, result.results);
}

function renderDevreResults(activeClass) {
  const body = document.querySelector("#devre-results-table tbody");
  body.innerHTML = "";
  state.devreler.forEach((d) => {
    const pathNames = (d.path || "").split(",").map((s) => s.trim()).filter(Boolean);
    const res = evaluateRoute(d.name, pathNames, state.points, state.leveling);
    const tr = document.createElement("tr");
    if (res.error) {
      tr.innerHTML = `<td>${vizEscape(res.name)}</td><td colspan="5" class="flag-bad">${vizEscape(res.error)}</td>`;
      body.appendChild(tr);
      return;
    }
    const tol = activeClass ? toleranceMm(activeClass.closureCoeff, res.lengthKm) : null;
    const within = tol !== null ? Math.abs(res.misclosureMm) <= tol : null;
    if (within === false) tr.className = "flag-bad";
    tr.innerHTML = `
      <td>${vizEscape(res.name)} <span class="viz-legend-item" style="font-weight:400;color:var(--muted)">(${vizEscape(res.kind)})</span></td>
      <td>${fmt(res.lengthKm, 3)}</td>
      <td>${fmt(res.misclosureMm, 2)} mm</td>
      <td>${tol !== null ? "±" + fmt(tol, 2) + " mm" : "—"}</td>
      <td>${within === null ? "—" : within ? "Uygun" : "Sınır Aşıldı"}</td>
    `;
    body.appendChild(tr);
  });
}

function renderGnssComplianceNote(activeClass) {
  const box = document.getElementById("gnss-compliance");
  if (!activeClass) {
    box.innerHTML = "";
    return;
  }
  const rows = state.gnss.map((o) => {
    const sigmaMm = (o.sigma && o.sigma > 0 ? o.sigma : state.params.sigmaGnss) * 1000;
    const ok = sigmaMm <= activeClass.gnssMaxSigmaMm;
    return `<li class="${ok ? "" : "flag-bad"}">${vizEscape(o.point)}: σ = ${fmt(sigmaMm, 1)} mm ${ok ? "(uygun)" : `(sınıf sınırı ${activeClass.gnssMaxSigmaMm} mm aşıldı)`}</li>`;
  });
  box.innerHTML = `<p class="panel-desc">Aktif sınıf: <strong>${vizEscape(activeClass.name)}</strong> — GNSS yükseklik σ sınırı: ${activeClass.gnssMaxSigmaMm} mm</p><ul>${rows.join("")}</ul>`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  attachTableListeners();
  calculate();
});
