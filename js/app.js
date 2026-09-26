// Uygulama durumu ve arayüz mantığı

// Örnek/test verisi: Rize (Karadeniz) bölgesinde, sahilden yaylaya çıkan
// ~16 km'lik bir hat nivelmanını temsil eder. Koordinatlar (Y=Doğu, X=Kuzey)
// UTM benzeri gerçeğe yakın değerlerdir; GERÇEK/RESMİ NİRENGİ-RÖPER
// KOORDİNATLARI DEĞİLDİR, yalnızca ölçek ve performans testi amaçlıdır.
// "Örnek Veriyi Yükle" ve ilk açılış tarafından kullanılır; her çağrıda
// bağımsız bir kopya döndürür (state ile referans paylaşmaz).
function getSampleState() {
  return {
  // Noktalar kasıtlı olarak güzergah (hat) sırasıyla listelenmiştir; bu sıra
  // hem noktalar tablosunda hem de yükseklik profilinde okunabilirliği artırır.
  // Z (kot) sütunu artık TÜM noktalarda doludur: sabit noktalarda bilinen
  // kesin yükseklik, diğerlerinde saha/ön hesap kotu (bkz. aşağıdaki
  // "Nivelman ölçüleri" açıklaması — Δh varsayılan olarak bu Z'lerin
  // farkından türetilir).
  points: [
    { name: "RP1", type: "fixed", height: 4.235, y: 548250, x: 4487600 },
    { name: "N1", type: "unknown", height: 9.63, y: 548500, x: 4486800 },
    { name: "N2", type: "unknown", height: 17.865, y: 548950, x: 4485950 },
    { name: "N3", type: "unknown", height: 29.43, y: 549400, x: 4485000 },
    { name: "N4", type: "unknown", height: 44.635, y: 549250, x: 4483950 },
    { name: "RP2", type: "fixed", height: 63.87, y: 549600, x: 4482900 },
    { name: "N5", type: "unknown", height: 95.265, y: 549300, x: 4481700 },
    { name: "N6", type: "unknown", height: 132.7, y: 549750, x: 4480650 },
    { name: "N7", type: "unknown", height: 175.075, y: 549500, x: 4479500 },
    { name: "N8", type: "unknown", height: 221.47, y: 549900, x: 4478400 },
    { name: "RP3", type: "fixed", height: 270.955, y: 549650, x: 4477250 },
    { name: "N9", type: "unknown", height: 318.395, y: 550000, x: 4476150 },
    { name: "N10", type: "unknown", height: 369.71, y: 549800, x: 4475000 },
    { name: "N11", type: "unknown", height: 415.18, y: 550150, x: 4473900 },
    { name: "N12", type: "unknown", height: 462.53, y: 549950, x: 4472750 },
  ],
  // Ardışık noktalar arasındaki 14 satırda dh=null: Δh, Noktalar tablosundaki
  // Z farkından otomatik hesaplanır. Son iki satır (RP1↔RP2, RP2↔RP3), iki
  // sabit nokta arasında AYRICA ölçülmüş bağımsız "kontrol hattı" ölçüleridir
  // — bu yüzden dh elle (override) girilir; dengelemeye katılmazlar (iki ucu
  // da sabit) ama devre kapanma kontrolünde bağımsız artıklık sağlarlar.
  leveling: [
    { from: "RP1", to: "N1", dh: null, dist: 0.84, sigma: null },
    { from: "N1", to: "N2", dh: null, dist: 0.96, sigma: null },
    { from: "N2", to: "N3", dh: null, dist: 1.05, sigma: null },
    { from: "N3", to: "N4", dh: null, dist: 1.06, sigma: null },
    { from: "N4", to: "RP2", dh: null, dist: 1.11, sigma: null },
    { from: "RP2", to: "N5", dh: null, dist: 1.24, sigma: null },
    { from: "N5", to: "N6", dh: null, dist: 1.14, sigma: null },
    { from: "N6", to: "N7", dh: null, dist: 1.18, sigma: null },
    { from: "N7", to: "N8", dh: null, dist: 1.17, sigma: null },
    { from: "N8", to: "RP3", dh: null, dist: 1.18, sigma: null },
    { from: "RP3", to: "N9", dh: null, dist: 1.15, sigma: null },
    { from: "N9", to: "N10", dh: null, dist: 1.17, sigma: null },
    { from: "N10", to: "N11", dh: null, dist: 1.15, sigma: null },
    { from: "N11", to: "N12", dh: null, dist: 1.17, sigma: null },
    { from: "RP1", to: "RP2", dh: 59.623, dist: 4.89, sigma: null },
    { from: "RP2", to: "RP3", dh: 207.045, dist: 5.65, sigma: null },
  ],
  gnss: [
    { point: "N2", h: 50.45, N: 32.6, sigma: null },
    { point: "N4", h: 77.3, N: 32.65, sigma: null },
    { point: "N6", h: 165.435, N: 32.75, sigma: null },
    { point: "N8", h: 254.335, N: 32.85, sigma: null },
    { point: "N9", h: 351.325, N: 32.95, sigma: null },
    { point: "N11", h: 448.245, N: 33.05, sigma: null },
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
  // Not: yalnızca Z'den (oto.) türetilen kenarlardan oluşan bir hat, ardışık
  // farkların teleskopik toplamı gereği HER ZAMAN tam olarak kapanır (0 hata) —
  // bu, gerçek bir ölçü tutarlılığı göstermez. Anlamlı bir kapanma kontrolü
  // için devre, en az bir bağımsız/elle (override) ölçü içermelidir; bu yüzden
  // aşağıdaki iki devre de RP1↔RP2 ve RP2↔RP3 kontrol hatlarını kullanır.
  devreler: [
    { name: "Devre-1 (kapalı: RP1-N1-N2-N3-N4-RP2-RP1)", path: "RP1,N1,N2,N3,N4,RP2,RP1" },
    { name: "Devre-2 (kapalı: RP2-N5-N6-N7-N8-RP3-RP2)", path: "RP2,N5,N6,N7,N8,RP3,RP2" },
  ],
  };
}

let state = getSampleState();

// En son başarılı "Hesapla" çağrısının sonucu; Nivelman ölçüleri tablosundaki
// "Düzeltme" / "Dengeli Δh" sütunlarını doldurmak için kullanılır. Veriyi
// etkileyebilecek herhangi bir düzenlemede null'a çekilir ki bayat (stale)
// bir dengeleme sonucu asla güncel gibi gösterilmesin.
let lastResult = null;

function fmt(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(d);
}

function getPointHeight(name) {
  const p = state.points.find((pt) => pt.name === name);
  return p ? p.height : null;
}

// Δh'nin "varsayılan" (oto.) değeri: iki noktanın Z (kot) farkı.
function computeDhFromZ(fromName, toName) {
  const a = getPointHeight(fromName);
  const b = getPointHeight(toName);
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
}

// Dengeleme ve devre kapanma hesaplarına verilecek nihai ölçü listesi: bir
// satırda elle Δh girilmişse (override — ör. bağımsız bir kontrol hattı) o
// değer kullanılır; girilmemişse (null) Δh, Noktalar tablosundaki güncel Z
// farkından canlı olarak hesaplanır. Böylece hesap mantığı hiçbir zaman
// "unutulmuş"/bayat bir Δh alanına değil, her zaman güncel kotlara dayanır.
function resolvedLevelingObs() {
  return state.leveling.map((o) => ({
    from: o.from,
    to: o.to,
    dh: o.dh != null ? o.dh : computeDhFromZ(o.from, o.to),
    dist: o.dist,
    sigma: o.sigma,
  }));
}

function invalidateResults() {
  lastResult = null;
  updateLevelingComputedDisplays();
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
      <td><input type="number" step="any" value="${p.y ?? ""}" placeholder="—" data-idx="${i}" data-field="y" class="pt-input" /></td>
      <td><input type="number" step="any" value="${p.x ?? ""}" placeholder="—" data-idx="${i}" data-field="x" class="pt-input" /></td>
      <td><input type="number" step="any" value="${p.height ?? ""}" placeholder="—" data-idx="${i}" data-field="height" class="pt-input" /></td>
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
      <td><input type="number" step="any" value="${o.dh ?? ""}" placeholder="—" data-idx="${i}" data-field="dh" class="lv-input" /></td>
      <td><input type="number" step="any" value="${o.dist ?? ""}" placeholder="—" data-idx="${i}" data-field="dist" class="lv-input" /></td>
      <td><input type="number" step="any" value="${o.sigma ?? ""}" placeholder="oto." data-idx="${i}" data-field="sigma" class="lv-input" /></td>
      <td class="lv-correction">—</td>
      <td class="lv-adjusted">—</td>
      <td><button class="secondary" data-idx="${i}" data-action="autofill-dist" title="Noktalar tablosundaki Y/X'ten düz hat mesafesini hesaplayıp bu satırın üzerine yazar.">Mesafe</button></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-leveling">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
  updateLevelingComputedDisplays();
}

// Nivelman ölçüleri tablosundaki 3 canlı/salt-okunur alanı, satırların
// DOM'unu yeniden oluşturmadan (odak kaybı olmadan) günceller:
//  - Δh alanının "oto." placeholder'ı (elle override edilmemişse önizleme)
//  - Düzeltme (v) ve Dengeli Δh (yalnızca son başarılı hesaplama sonrasında)
function updateLevelingComputedDisplays() {
  document.querySelectorAll("#leveling-table tbody tr").forEach((tr, i) => {
    const o = state.leveling[i];
    if (!o) return;
    const dhInput = tr.querySelector('input[data-field="dh"]');
    if (dhInput) {
      const live = computeDhFromZ(o.from, o.to);
      dhInput.placeholder = live !== null ? `oto: ${fmt(live, 4)}` : "—";
    }
    const label = `${o.from} → ${o.to}`;
    const res = lastResult ? lastResult.residualRows.find((r) => r.kind === "Nivelman" && r.label === label) : null;
    const corrCell = tr.querySelector(".lv-correction");
    const adjCell = tr.querySelector(".lv-adjusted");
    if (corrCell) corrCell.textContent = res ? fmt(res.v * 1000, 2) + " mm" : "—";
    if (adjCell) adjCell.textContent = res ? fmt(res.raw + res.v, 4) : "—";
  });
}

// Noktalar tablosundaki Y/X koordinat farkından, seçili nivelman satırının
// düz hat mesafesini hesaplayıp üzerine yazar (yaklaşık; gerçek arazi
// mesafesinden farklı olabilir). Δh artık her zaman Z'den canlı türetildiği
// için burada yalnızca mesafe hesaplanır.
function autofillDistRow(idx) {
  const o = state.leveling[idx];
  if (!o) return;
  const a = state.points.find((p) => p.name === o.from);
  const b = state.points.find((p) => p.name === o.to);
  if (a && b && Number.isFinite(a.y) && Number.isFinite(a.x) && Number.isFinite(b.y) && Number.isFinite(b.x)) {
    o.dist = Math.round((Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2) / 1000) * 1000) / 1000;
    invalidateResults();
    renderLevelingTable();
  }
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
      invalidateResults(); // Δh önizlemeleri ve dengeleme sonuçları Z'ye bağlı
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
        invalidateResults();
      }
    } else {
      state.points[idx][field] = t.value;
      lastResult = null;
      renderAll();
    }
  });

  document.querySelector("#points-table tbody").addEventListener("focusout", (e) => {
    if (e.target.dataset.field === "name") renderAll();
  });

  document.querySelector("#points-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-point") {
      state.points.splice(Number(e.target.dataset.idx), 1);
      lastResult = null;
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
    invalidateResults();
  });

  document.querySelector("#leveling-table tbody").addEventListener("click", (e) => {
    const idx = Number(e.target.dataset.idx);
    if (e.target.dataset.action === "remove-leveling") {
      state.leveling.splice(idx, 1);
      lastResult = null;
      renderAll();
    } else if (e.target.dataset.action === "autofill-dist") {
      autofillDistRow(idx);
    }
  });

  document.querySelector("#gnss-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    const val = ["h", "N", "sigma"].includes(field) ? (t.value === "" ? null : Number(t.value)) : t.value;
    state.gnss[idx][field] = val;
    invalidateResults();
  });

  document.querySelector("#gnss-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-gnss") {
      state.gnss.splice(Number(e.target.dataset.idx), 1);
      lastResult = null;
      renderAll();
    }
  });

  document.getElementById("add-point").addEventListener("click", () => {
    const n = state.points.length + 1;
    state.points.push({ name: `P${n}`, type: "unknown", height: null });
    lastResult = null;
    renderAll();
  });

  document.getElementById("add-leveling").addEventListener("click", () => {
    const p1 = state.points[0]?.name ?? "";
    const p2 = state.points[1]?.name ?? "";
    state.leveling.push({ from: p1, to: p2, dh: null, dist: 1, sigma: null });
    lastResult = null;
    renderAll();
  });

  document.getElementById("add-gnss").addEventListener("click", () => {
    const p1 = state.points[0]?.name ?? "";
    state.gnss.push({ point: p1, h: 0, N: 0, sigma: null });
    lastResult = null;
    renderAll();
  });

  document.getElementById("param-k").addEventListener("input", (e) => {
    state.params.k = Number(e.target.value);
    invalidateResults();
  });
  document.getElementById("param-sigma-gnss").addEventListener("input", (e) => {
    state.params.sigmaGnss = Number(e.target.value);
    invalidateResults();
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
    const result = runAdjustment(state.points, resolvedLevelingObs(), state.gnss, state.params);
    lastResult = result;
    renderResults(result);
  } catch (err) {
    lastResult = null;
    updateLevelingComputedDisplays();
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

  // Nivelman ölçülerinin düzeltme/dengeli değerleri artık "2. Nivelman
  // ölçüleri" panelinde satır satır gösterildiği için, bu tablo yalnızca
  // GNSS kalanlarını listeler (tekrarı önlemek amacıyla).
  const resBody = document.querySelector("#residuals-table tbody");
  resBody.innerHTML = "";
  result.residualRows
    .filter((r) => r.kind === "GNSS")
    .forEach((r) => {
      const flag = Math.abs(r.vNormalized) > 3 ? "flag-bad" : Math.abs(r.vNormalized) > 2 ? "flag-warn" : "";
      const tr = document.createElement("tr");
      tr.className = flag;
      tr.innerHTML = `
        <td>${vizEscape(r.label)}</td>
        <td>${fmt(r.raw, 4)}</td>
        <td>±${fmt(r.sigma, 4)}</td>
        <td>${fmt(r.v, 4)}</td>
        <td>${fmt(r.vNormalized, 2)}</td>
      `;
      resBody.appendChild(tr);
    });

  renderDevreResults(activeClass);
  renderGnssComplianceNote(activeClass);
  updateLevelingComputedDisplays();

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
  renderNetworkSketch(document.getElementById("network-sketch"), pointsForViz, resolvedLevelingObs(), residualByLabel);
  renderHeightProfile(document.getElementById("height-profile"), state.points, result.results);
}

function renderDevreResults(activeClass) {
  const body = document.querySelector("#devre-results-table tbody");
  body.innerHTML = "";
  state.devreler.forEach((d) => {
    const pathNames = (d.path || "").split(",").map((s) => s.trim()).filter(Boolean);
    const res = evaluateRoute(d.name, pathNames, state.points, resolvedLevelingObs());
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

function showImportMessage(msg, isError = false) {
  const box = document.getElementById("import-message");
  box.textContent = msg;
  box.className = "message-box " + (isError ? "error" : "success");
  box.classList.remove("hidden");
}

function clearAllData() {
  state.points = [];
  state.leveling = [];
  state.gnss = [];
  state.devreler = [];
  renderAll();
  document.getElementById("results-section").classList.add("hidden");
  document.getElementById("viz-section").classList.add("hidden");
  document.getElementById("error-box").classList.add("hidden");
  showImportMessage("Tüm noktalar, ölçüler ve devreler temizlendi.");
}

function loadSampleData() {
  Object.assign(state, getSampleState());
  renderAll();
  calculate();
  showImportMessage("Örnek Rize test verisi yüklendi.");
}

function attachToolbarListeners() {
  document.getElementById("import-excel-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = await ioImportWorkbook(file);
      state.points = parsed.points;
      state.leveling = parsed.leveling;
      state.gnss = parsed.gnss;
      if (Number.isFinite(parsed.params.k)) state.params.k = parsed.params.k;
      if (Number.isFinite(parsed.params.sigmaGnss)) state.params.sigmaGnss = parsed.params.sigmaGnss;
      if (parsed.classesParsed && parsed.classesParsed.classes.length > 0) {
        state.accuracyClasses = parsed.classesParsed.classes;
        state.activeClassIndex = parsed.classesParsed.activeIndex;
      }
      state.devreler = parsed.routes;
      renderAll();
      calculate();
      showImportMessage(
        `İçe aktarıldı: ${state.points.length} nokta, ${state.leveling.length} nivelman ölçüsü, ${state.gnss.length} GNSS ölçüsü.`
      );
    } catch (err) {
      showImportMessage("İçe aktarma hatası: " + err.message, true);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("btn-export-excel").addEventListener("click", () => {
    XLSX.writeFile(ioBuildWorkbookFromState(state), "nivelman-projesi.xlsx");
  });

  document.getElementById("btn-download-template").addEventListener("click", ioDownloadTemplate);

  document.getElementById("btn-load-sample").addEventListener("click", () => {
    if (confirm("Mevcut veriler örnek Rize test verisiyle değiştirilecek. Emin misiniz?")) loadSampleData();
  });

  document.getElementById("btn-clear-all").addEventListener("click", () => {
    if (confirm("Tüm noktalar, ölçüler ve devreler silinecek. Emin misiniz?")) clearAllData();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  attachTableListeners();
  attachToolbarListeners();
  calculate();
});
