// Uygulama durumu ve arayüz mantığı
//
// TASARIM: Tek kullanıcı girdisi "Noktalar" listesidir (nokta adı, tür,
// Y, X, Z). Nivelman ölçüleri, hatlar, dengeleme ve kroki tamamen bu
// listeden — noktaların TÜRÜNE ve listedeki SIRASINA göre — otomatik
// türetilir. Başka hiçbir tabloda elle müdahale gerekmez.

// Sabit varsayılan hassasiyet katsayısı — basitlik için kodda sabittir,
// arayüzde düzenlenmez. Gerekirse burada değiştirin.
const DEFAULT_K = 0.003; // m / √km — nivelman hassasiyet katsayısı (σ = k·√S)

// Örnek/test verisi: Rize (Karadeniz) bölgesinde, sahilden yaylaya çıkan
// ~16 km'lik bir hat nivelmanını temsil eder. Koordinatlar (Y=Doğu, X=Kuzey)
// UTM benzeri gerçeğe yakın değerlerdir; GERÇEK/RESMİ NİRENGİ-RÖPER
// KOORDİNATLARI DEĞİLDİR, yalnızca ölçek ve performans testi amaçlıdır.
// Noktalar kasıtlı olarak güzergah sırasıyla listelenmiştir: otomatik
// nivelman ölçüleri, ardışık noktalar arasında bu sırayla üretilir.
function getSampleState() {
  return {
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
  };
}

let state = getSampleState();
let lastResult = null;
let lastLeveling = []; // en son hesaplamada kullanılan otomatik nivelman ölçüleri
let lastHatlar = []; // en son hesaplamada kullanılan otomatik hat listesi

function fmt(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(d);
}

function planarDistanceKm(a, b) {
  if (!Number.isFinite(a.y) || !Number.isFinite(a.x) || !Number.isFinite(b.y) || !Number.isFinite(b.x)) return null;
  return Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2) / 1000;
}

// Ardışık noktalar arasında otomatik nivelman ölçüleri üretir: Δh, iki
// komşu noktanın Z (kot) farkıdır; mesafe Y/X koordinatlarından düz hat
// olarak hesaplanır; σ = k·√S (sabit varsayılan k).
function buildLevelingFromPoints() {
  const obs = [];
  for (let i = 0; i < state.points.length - 1; i++) {
    const a = state.points[i];
    const b = state.points[i + 1];
    const dh = Number.isFinite(a.height) && Number.isFinite(b.height) ? b.height - a.height : null;
    obs.push({ from: a.name, to: b.name, dh, dist: planarDistanceKm(a, b), sigma: null });
  }
  return obs;
}

// Ardışık sabit noktalar arasındaki noktaları bir "hat" olarak gruplar —
// yalnızca bilgi/kroki amaçlı bir rapordur (uzunluk, toplam yükselti farkı).
// Kasıtlı olarak bir "kapanma hatası" hesaplamaz: Δh'ler tamamen Z'den
// türetildiği için ardışık farkların toplamı, ara noktaların değerinden
// bağımsız olarak matematiksel bir özdeşlikle her zaman iki ucun Z farkına
// eşit çıkar (teleskopik toplam) — bu, gerçek bir ölçü tutarlılığı göstermez.
function buildHatlarFromPoints() {
  const fixedIdx = [];
  state.points.forEach((p, i) => {
    if (p.type === "fixed") fixedIdx.push(i);
  });
  const hatlar = [];
  for (let k = 0; k < fixedIdx.length - 1; k++) {
    const startIdx = fixedIdx[k];
    const endIdx = fixedIdx[k + 1];
    const segment = state.points.slice(startIdx, endIdx + 1);
    let lengthKm = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const d = planarDistanceKm(state.points[i], state.points[i + 1]);
      if (Number.isFinite(d)) lengthKm += d;
    }
    const startH = state.points[startIdx].height;
    const endH = state.points[endIdx].height;
    hatlar.push({
      name: `${segment[0].name} → ${segment[segment.length - 1].name}`,
      points: segment.map((p) => p.name),
      lengthKm,
      totalDh: Number.isFinite(startH) && Number.isFinite(endH) ? endH - startH : null,
    });
  }
  return hatlar;
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

let autoCalcTimer = null;
// Girilen nokta listesi dışında her şey tamamen otomatiktir: herhangi bir
// nokta değeri değiştiğinde nivelman ölçüleri, hatlar ve dengeleme kısa bir
// gecikmeyle (art arda tuş vuruşlarını tek seferde işlemek için) yeniden
// hesaplanır — elle bir "Hesapla" adımı yoktur.
function scheduleAutoCalculate(delay = 200) {
  const statusEl = document.getElementById("auto-calc-status");
  if (statusEl) statusEl.textContent = "⟳ Hesaplanıyor…";
  if (autoCalcTimer) clearTimeout(autoCalcTimer);
  autoCalcTimer = setTimeout(() => {
    calculate();
    if (statusEl) statusEl.textContent = "✓ Dengeleme otomatik olarak güncellendi";
  }, delay);
}

function attachTableListeners() {
  document.querySelector("#points-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    if (["y", "x", "height"].includes(field)) {
      state.points[idx][field] = t.value === "" ? null : Number(t.value);
      scheduleAutoCalculate();
    } else if (field === "name") {
      // Tabloyu her tuş vuruşunda yeniden çizmek input'un odağını kaybettirir;
      // isim değişince hemen renderPointsTable() çağrılmıyor (aşağıdaki
      // "focusout" dinleyicisi odak kaybolduğunda tabloyu tazeler). Otomatik
      // ölçüler isimlerden değil dizideki KONUMDAN türetildiği için başka
      // hiçbir yerde referans güncellemesi gerekmez.
      state.points[idx].name = t.value;
      scheduleAutoCalculate();
    } else {
      state.points[idx][field] = t.value;
      renderPointsTable();
      scheduleAutoCalculate();
    }
  });

  document.querySelector("#points-table tbody").addEventListener("focusout", (e) => {
    if (e.target.dataset.field === "name") renderPointsTable();
  });

  document.querySelector("#points-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-point") {
      state.points.splice(Number(e.target.dataset.idx), 1);
      renderPointsTable();
      scheduleAutoCalculate();
    }
  });

  document.getElementById("add-point").addEventListener("click", () => {
    const n = state.points.length + 1;
    state.points.push({ name: `P${n}`, type: "unknown", height: null, y: null, x: null });
    renderPointsTable();
    scheduleAutoCalculate();
  });
}

function calculate() {
  const errorBox = document.getElementById("error-box");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  try {
    const leveling = buildLevelingFromPoints();
    const result = runAdjustment(state.points, leveling, { k: DEFAULT_K });
    lastResult = result;
    lastLeveling = leveling;
    lastHatlar = buildHatlarFromPoints();
    renderResults(result);
  } catch (err) {
    lastResult = null;
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

  // Ardışık noktalardan otomatik türetilen nivelman ölçüleri, sabit
  // noktalara bağlandıkları kenarlarda cebirsel olarak kendi kendini
  // doğrular (Δh, ilgili noktanın kendi Z'sinden geldiği için) — bu yüzden
  // "redundancy" sıfırdan büyük görünse bile gerçek bağımsız bir kontrol
  // sağlamaz. Bu, tek bir sıralı nokta listesinin kaçınılmaz bir özelliğidir.
  const noteEl = document.getElementById("redundancy-note");
  noteEl.textContent =
    "Not: Dengeleme, ardışık noktalardan türetilen ölçülere dayanır; bu ölçüler sabit noktalara bağlandığında " +
    "cebirsel olarak kendi kendini doğrular. Bu yüzden dengeli yükseklikler, girdiğiniz Z değerlerini neredeyse " +
    "olduğu gibi yansıtır — bağımsız bir ikinci ölçüm kaynağı (ör. ayrı bir kontrol nivelmanı) olmadan gerçek bir " +
    "hata tespiti/düzeltme yapılamaz. Standart sapmalar yine de mesafeye göre hesaplanır ve göreli hassasiyeti gösterir.";
  noteEl.classList.remove("hidden");

  const heightsBody = document.querySelector("#heights-table tbody");
  heightsBody.innerHTML = "";
  result.results.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${vizEscape(r.name)}</td>
      <td>${fmt(r.H, 4)}</td>
      <td>±${fmt(r.stdev, 4)} (${fmt(r.stdev * 1000, 1)} mm)</td>
      <td>[${fmt(r.ciLow, 4)}, ${fmt(r.ciHigh, 4)}]</td>
    `;
    heightsBody.appendChild(tr);
  });

  renderLevelingReport(result);
  renderHatlarReport();

  const adjustedHeightByName = {};
  result.results.forEach((r) => (adjustedHeightByName[r.name] = r.H));
  const pointsForViz = state.points.map((p) =>
    p.type === "unknown" && p.name in adjustedHeightByName ? { ...p, height: adjustedHeightByName[p.name] } : p
  );
  const residualByLabel = {};
  result.residualRows.forEach((r) => (residualByLabel[r.label] = r));
  renderNetworkSketch(document.getElementById("network-sketch"), pointsForViz, lastLeveling, residualByLabel);
  renderHeightProfile(document.getElementById("height-profile"), state.points, result.results);
}

function renderLevelingReport(result) {
  const body = document.querySelector("#leveling-report-table tbody");
  body.innerHTML = "";
  lastLeveling.forEach((o) => {
    const label = `${o.from} → ${o.to}`;
    const res = result.residualRows.find((r) => r.kind === "Nivelman" && r.label === label);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${vizEscape(o.from)}</td>
      <td>${vizEscape(o.to)}</td>
      <td>${fmt(o.dh, 4)}</td>
      <td>${o.dist != null ? fmt(o.dist, 3) : "—"}</td>
      <td>${res ? fmt(res.v * 1000, 2) + " mm" : "—"}</td>
      <td>${res ? fmt(o.dh + res.v, 4) : "—"}</td>
    `;
    body.appendChild(tr);
  });
}

function renderHatlarReport() {
  const body = document.querySelector("#hatlar-table tbody");
  body.innerHTML = "";
  if (lastHatlar.length === 0) {
    body.innerHTML = '<tr><td colspan="4">En az iki sabit nokta girilmeden hat oluşturulamaz.</td></tr>';
    return;
  }
  lastHatlar.forEach((h) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${vizEscape(h.name)}</td>
      <td>${vizEscape(h.points.join(" → "))}</td>
      <td>${fmt(h.lengthKm, 3)}</td>
      <td>${h.totalDh != null ? fmt(h.totalDh, 4) : "—"}</td>
    `;
    body.appendChild(tr);
  });
}

function showImportMessage(msg, isError = false) {
  const box = document.getElementById("import-message");
  box.textContent = msg;
  box.className = "message-box " + (isError ? "error" : "success");
  box.classList.remove("hidden");
}

function clearAllData() {
  state.points = [];
  renderPointsTable();
  document.getElementById("results-section").classList.add("hidden");
  document.getElementById("viz-section").classList.add("hidden");
  document.getElementById("error-box").classList.add("hidden");
  showImportMessage("Tüm noktalar temizlendi.");
}

function loadSampleData() {
  state = getSampleState();
  renderPointsTable();
  calculate();
  showImportMessage("Örnek Rize test verisi yüklendi.");
}

// Dengeleme sonrası tüm noktaların (sabit + dengeli bilinmeyen) nihai Y/X/Z
// listesini döndürür — indirme butonları bunu kullanır.
function buildAdjustedPointsList() {
  if (!lastResult) return null;
  const adjustedByName = {};
  lastResult.results.forEach((r) => (adjustedByName[r.name] = r.H));
  return state.points.map((p) => ({
    name: p.name,
    type: p.type,
    y: p.y,
    x: p.x,
    z: p.type === "fixed" ? p.height : adjustedByName[p.name] ?? p.height,
  }));
}

function downloadResults(format) {
  const rows = buildAdjustedPointsList();
  if (!rows) {
    showImportMessage("Önce geçerli bir dengeleme sonucu üretilmeli (nokta listesini kontrol edin).", true);
    return;
  }
  let content, mime, ext;
  if (format === "csv") {
    content =
      "Nokta,Tur,Y,X,Z\n" +
      rows
        .map((r) => `${r.name},${r.type === "fixed" ? "Sabit" : "Bilinmeyen"},${r.y ?? ""},${r.x ?? ""},${fmt(r.z, 4)}`)
        .join("\n");
    mime = "text/csv;charset=utf-8";
    ext = "csv";
  } else if (format === "ncn") {
    // NetCAD Nokta Cetveli (.ncn): NoktaNo,Y,X,Z,Kod — başlıksız, virgülle ayrılmış.
    content = rows
      .map((r) => `${r.name},${r.y ?? 0},${r.x ?? 0},${fmt(r.z, 4)},${r.type === "fixed" ? "SABIT" : "NIVELMAN"}`)
      .join("\r\n");
    mime = "text/plain;charset=utf-8";
    ext = "ncn";
  } else {
    content = rows.map((r) => `${r.name}\t${r.y ?? ""}\t${r.x ?? ""}\t${fmt(r.z, 4)}`).join("\n");
    mime = "text/plain;charset=utf-8";
    ext = "txt";
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dengelenmis-noktalar.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function attachToolbarListeners() {
  document.getElementById("import-excel-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = await ioImportWorkbook(file);
      state.points = parsed.points;
      renderPointsTable();
      calculate();
      showImportMessage(`İçe aktarıldı: ${state.points.length} nokta.`);
    } catch (err) {
      showImportMessage("İçe aktarma hatası: " + err.message, true);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("btn-export-excel").addEventListener("click", () => {
    XLSX.writeFile(ioBuildWorkbookFromState(state), "nivelman-noktalari.xlsx");
  });

  document.getElementById("btn-download-template").addEventListener("click", ioDownloadTemplate);

  document.getElementById("btn-load-sample").addEventListener("click", () => {
    if (confirm("Mevcut noktalar örnek Rize test verisiyle değiştirilecek. Emin misiniz?")) loadSampleData();
  });

  document.getElementById("btn-clear-all").addEventListener("click", () => {
    if (confirm("Tüm noktalar silinecek. Emin misiniz?")) clearAllData();
  });

  document.querySelectorAll("[data-download-format]").forEach((btn) => {
    btn.addEventListener("click", () => downloadResults(btn.dataset.downloadFormat));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderPointsTable();
  attachTableListeners();
  attachToolbarListeners();
  calculate();
});
