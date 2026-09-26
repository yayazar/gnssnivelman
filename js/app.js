// Uygulama durumu ve arayüz mantığı
//
// TASARIM: Tek kullanıcı girdisi "Noktalar" listesidir. Yöntem, klasik GNSS
// nivelmanı iş akışıdır: RS (sabit) noktalarda hem GNSS ile ölçülen
// elipsoidal yükseklik (h) hem de bilinen ortometrik yükseklik (H) girilir;
// bu ikisinden jeoit ondülasyonu N = h − H hesaplanır. Yeni (bilinmeyen)
// noktalarda yalnızca h girilir. RS noktalarındaki N değerlerine bir eğik
// düzlem (trend yüzeyi) en küçük kareler ile oturtulur ve bu yüzeyden her
// yeni noktanın konumundaki N enterpole edilerek H = h − N hesaplanır. Bkz.
// js/adjustment.js. Noktalar tablosu dışında elle müdahale gerektiren başka
// hiçbir menü yoktur.

// RS noktalarının Rize bölgesinde çalışma alanını çevreleyecek şekilde
// dağıtıldığı, gerçekçi bir örnek/test veri seti. Koordinatlar ve
// yükseklikler GERÇEK/RESMİ DEĞİLDİR, yalnızca ölçek ve işlevsellik testi
// amaçlıdır. h değerleri, RS noktalarındaki bilinen H'ye kasıtlı olarak
// düzlemsel olmayan (küçük dalgalı) bir jeoit modeli eklenerek üretilmiştir;
// bu yüzden düzlem oturtması sıfır olmayan küçük bir RMS ile sonuçlanır —
// gerçekçi bir enterpolasyon örneği gösterir.
function getSampleState() {
  return {
    points: [
      { name: "RS1", type: "fixed", y: 548000, x: 4480000, h: 117.1198, H: 80.6 },
      { name: "RS2", type: "fixed", y: 556000, x: 4480500, h: 134.3617, H: 97.9 },
      { name: "RS3", type: "fixed", y: 555500, x: 4486000, h: 72.3838, H: 35.9 },
      { name: "RS4", type: "fixed", y: 548500, x: 4485500, h: 55.9342, H: 19.4 },
      { name: "N1", type: "unknown", y: 550200, x: 4481200, h: 107.9602 },
      { name: "N2", type: "unknown", y: 553400, x: 4481600, h: 112.552 },
      { name: "N3", type: "unknown", y: 554600, x: 4483400, h: 95.2717 },
      { name: "N4", type: "unknown", y: 552800, x: 4484800, h: 75.4379 },
      { name: "N5", type: "unknown", y: 550600, x: 4484200, h: 74.8469 },
      { name: "N6", type: "unknown", y: 552000, x: 4482600, h: 96.4426 },
      { name: "N7", type: "unknown", y: 549200, x: 4483000, h: 83.5153 },
      { name: "N8", type: "unknown", y: 554000, x: 4485200, h: 75.1907 },
    ],
  };
}

let state = getSampleState();
let lastResult = null; // { plane, perPoint }
// Girdiler değiştirildiğinde (ya da henüz hiç hesaplanmadığında) true olur;
// sonuçların o an tabloda görünen verilerle güncel olup olmadığını izler.
// YALNIZCA calculate() başarıyla tamamlandığında false'a döner — otomatik
// hesaplama YOKTUR, kullanıcı her zaman "Hesapla" butonuna basmalıdır.
let isDirty = true;

function fmt(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(d);
}

function markDirty() {
  isDirty = true;
  updateCalcStatus();
}

function updateCalcStatus() {
  const el = document.getElementById("calc-status");
  const btn = document.getElementById("calculate");
  const resultsSection = document.getElementById("results-section");
  const vizSection = document.getElementById("viz-section");

  if (isDirty && !lastResult) {
    el.textContent = "Hesaplamak için yukarıdaki noktaları girin ve Hesapla'ya basın.";
    el.className = "calc-status pending";
    btn.classList.add("needs-calc");
  } else if (isDirty && lastResult) {
    el.textContent = "⚠ Girdiler değişti — aşağıdaki sonuçlar artık güncel değil. Yeniden hesaplamak için Hesapla'ya basın.";
    el.className = "calc-status stale";
    btn.classList.add("needs-calc");
  } else {
    el.textContent = "✓ Sonuçlar güncel verilerinize göre hesaplandı.";
    el.className = "calc-status fresh";
    btn.classList.remove("needs-calc");
  }

  resultsSection.classList.toggle("stale-results", isDirty && !!lastResult);
  vizSection.classList.toggle("stale-results", isDirty && !!lastResult);
}

function renderPointsTable() {
  const tbody = document.querySelector("#points-table tbody");
  tbody.innerHTML = "";
  state.points.forEach((p, i) => {
    const tr = document.createElement("tr");
    const isFixed = p.type === "fixed";
    tr.innerHTML = `
      <td><input type="text" value="${vizEscape(p.name)}" data-idx="${i}" data-field="name" class="pt-input" /></td>
      <td>
        <select data-idx="${i}" data-field="type" class="pt-input">
          <option value="fixed" ${p.type === "fixed" ? "selected" : ""}>Sabit (RS)</option>
          <option value="unknown" ${p.type === "unknown" ? "selected" : ""}>Bilinmeyen (yeni)</option>
        </select>
      </td>
      <td><input type="number" step="any" value="${p.y ?? ""}" placeholder="—" data-idx="${i}" data-field="y" class="pt-input" /></td>
      <td><input type="number" step="any" value="${p.x ?? ""}" placeholder="—" data-idx="${i}" data-field="x" class="pt-input" /></td>
      <td><input type="number" step="any" value="${p.h ?? ""}" placeholder="—" data-idx="${i}" data-field="h" class="pt-input" /></td>
      <td><input type="number" step="any" value="${isFixed ? p.H ?? "" : ""}" placeholder="${isFixed ? "—" : "hesaplanacak"}" data-idx="${i}" data-field="H" class="pt-input" ${isFixed ? "" : "disabled"} /></td>
      <td><button class="danger" data-idx="${i}" data-action="remove-point">Sil</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Noktalar tablosu girildikten sonra hesaplama YALNIZCA "Hesapla" butonuna
// basıldığında yapılır — girdiler değiştikçe otomatik yeniden hesaplanmaz.
function attachTableListeners() {
  document.querySelector("#points-table tbody").addEventListener("input", (e) => {
    const t = e.target;
    if (!t.dataset.field) return;
    const idx = Number(t.dataset.idx);
    const field = t.dataset.field;
    if (["y", "x", "h", "H"].includes(field)) {
      state.points[idx][field] = t.value === "" ? null : Number(t.value);
      markDirty();
    } else if (field === "name") {
      // Tabloyu her tuş vuruşunda yeniden çizmek input'un odağını kaybettirir;
      // isim değişince hemen renderPointsTable() çağrılmıyor (aşağıdaki
      // "focusout" dinleyicisi odak kaybolduğunda tabloyu tazeler).
      state.points[idx].name = t.value;
      markDirty();
    } else {
      state.points[idx][field] = t.value;
      renderPointsTable();
      markDirty();
    }
  });

  document.querySelector("#points-table tbody").addEventListener("focusout", (e) => {
    if (e.target.dataset.field === "name") renderPointsTable();
  });

  document.querySelector("#points-table tbody").addEventListener("click", (e) => {
    if (e.target.dataset.action === "remove-point") {
      state.points.splice(Number(e.target.dataset.idx), 1);
      renderPointsTable();
      markDirty();
    }
  });

  document.getElementById("add-point").addEventListener("click", () => {
    const n = state.points.length + 1;
    state.points.push({ name: `P${n}`, type: "unknown", h: null, H: null, y: null, x: null });
    renderPointsTable();
    markDirty();
  });

  document.getElementById("calculate").addEventListener("click", calculate);
}

function calculate() {
  const errorBox = document.getElementById("error-box");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  try {
    const result = runGnssGeoidAdjustment(state.points);
    lastResult = result;
    isDirty = false;
    renderResults(result);
  } catch (err) {
    lastResult = null;
    errorBox.textContent = "Hata: " + err.message;
    errorBox.classList.remove("hidden");
    document.getElementById("results-section").classList.add("hidden");
    document.getElementById("viz-section").classList.add("hidden");
  }
  updateCalcStatus();
}

function renderResults(result) {
  document.getElementById("results-section").classList.remove("hidden");
  document.getElementById("viz-section").classList.remove("hidden");

  const fixedCount = result.perPoint.filter((p) => p.type === "fixed").length;
  const unknownCount = result.perPoint.filter((p) => p.type === "unknown").length;

  document.getElementById("stat-nobs").textContent = fixedCount;
  document.getElementById("stat-unknowns").textContent = unknownCount;
  document.getElementById("stat-redundancy").textContent = result.plane.redundancy;
  document.getElementById("stat-sigma0").textContent =
    result.plane.sigma0 != null ? fmt(result.plane.sigma0 * 1000, 1) + " mm" : "—";

  const extrapolationCount = result.perPoint.filter((p) => p.isExtrapolation).length;

  const noteEl = document.getElementById("redundancy-note");
  let note;
  if (result.plane.sigma0 == null) {
    note =
      "Not: Tam olarak 3 RS noktası girildiği için jeoit düzlemi bu üç noktadan tam geçer (fazla ölçü yok) — " +
      "birim ağırlıklı ölçü hatası (σ₀) ve dolayısıyla her noktanın standart sapması istatistiksel olarak " +
      "hesaplanamaz (aşağıda '—' ile gösterilir). Standart sapma/güven aralığı elde etmek için alanı çevreleyen " +
      "en az 4 RS noktası kullanmanız gerekir.";
  } else {
    note =
      `Not: Jeoit düzlemi ${fixedCount} RS noktasına dolaylı ölçüler yöntemiyle en küçük kareler ile oturtulmuştur ` +
      `(birim ağırlıklı ölçü hatası σ₀ = ${fmt(result.plane.sigma0 * 1000, 1)} mm, fazla ölçü = ${result.plane.redundancy}). ` +
      "Her yeni noktanın H'sindeki standart sapma ve %95 güven aralığı, düzlem parametrelerinin kovaryans " +
      "matrisinden hata yayılma kanunuyla o noktanın KONUMUNA göre hesaplanmıştır — RS noktalarının merkezine " +
      "yakın noktalarda küçük, uzak/dış noktalarda büyük çıkar. (GNSS h ölçümünün kendi hata payı ayrıca " +
      "modellenmemiştir; yalnızca jeoit düzlemi modelinin kesinliğini yansıtır.)";
  }
  if (extrapolationCount > 0) {
    note +=
      ` ⚠ ${extrapolationCount} yeni nokta, RS noktalarının çevrelediği alanın DIŞINDA kalıyor — bu noktalarda ` +
      "jeoit düzlemi enterpolasyon değil ekstrapolasyon yapıyor (standart sapmalarının belirgin şekilde büyük " +
      "çıktığına dikkat edin; aşağıdaki tabloda ve krokide ayrıca işaretlenmiştir).";
  }
  noteEl.textContent = note;
  noteEl.classList.remove("hidden");

  const heightsBody = document.querySelector("#heights-table tbody");
  heightsBody.innerHTML = "";
  result.perPoint.forEach((p) => {
    const tr = document.createElement("tr");
    if (p.isExtrapolation) tr.classList.add("flag-warn");
    const durum = p.type === "fixed"
      ? "Sabit (RS, bilinen H)"
      : p.isExtrapolation
      ? "⚠ Ekstrapolasyon (RS alanı dışında)"
      : "Hesaplanan (GNSS + jeoit enterpolasyonu)";
    const stdevText = p.type === "fixed" ? "—" : p.stdevH != null ? "±" + fmt(p.stdevH * 1000, 1) + " mm" : "—";
    const ciText = p.type === "fixed" ? "—" : p.ciLow != null ? `[${fmt(p.ciLow, 4)}, ${fmt(p.ciHigh, 4)}]` : "—";
    tr.innerHTML = `
      <td>${vizEscape(p.name)}</td>
      <td>${fmt(p.h, 4)}</td>
      <td>${fmt(p.N, 4)}</td>
      <td>${fmt(p.H, 4)}</td>
      <td>${stdevText}</td>
      <td>${ciText}</td>
      <td>${durum}</td>
    `;
    heightsBody.appendChild(tr);
  });

  renderPlaneReport(result);

  const isExtrapolationByName = {};
  const hByName = {};
  result.perPoint.forEach((p) => {
    isExtrapolationByName[p.name] = p.isExtrapolation;
    hByName[p.name] = p.H;
  });
  const pointsForViz = state.points.map((p) => ({
    ...p,
    H: hByName[p.name] ?? p.H,
    isExtrapolation: isExtrapolationByName[p.name] ?? false,
  }));
  renderNetworkSketch(document.getElementById("network-sketch"), pointsForViz, result.plane);
  renderHeightProfile(document.getElementById("height-profile"), result.perPoint);
}

function renderPlaneReport(result) {
  const body = document.querySelector("#leveling-report-table tbody");
  body.innerHTML = "";
  result.plane.residuals.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${vizEscape(r.name)}</td>
      <td>${fmt(r.residualM * 1000, 1)} mm</td>
    `;
    body.appendChild(tr);
  });
  const rmsRow = document.createElement("tr");
  rmsRow.innerHTML = `<td><strong>RMS</strong></td><td><strong>${fmt(result.plane.rms * 1000, 1)} mm</strong></td>`;
  body.appendChild(rmsRow);
}

function showImportMessage(msg, isError = false) {
  const box = document.getElementById("import-message");
  box.textContent = msg;
  box.className = "message-box " + (isError ? "error" : "success");
  box.classList.remove("hidden");
}

// Nokta listesinin TAMAMI değiştiğinde (temizleme, örnek veri, Excel içe
// aktarma) önceki hesap sonucu artık anlamsızdır — sessizce "eski" (stale)
// olarak göstermek yerine sonuçlar/kroki tamamen gizlenir ve kullanıcı
// yeniden Hesapla'ya basana kadar temiz bir durumdan başlanır.
function resetResultsForNewPointSet() {
  lastResult = null;
  document.getElementById("results-section").classList.remove("stale-results");
  document.getElementById("viz-section").classList.remove("stale-results");
  document.getElementById("results-section").classList.add("hidden");
  document.getElementById("viz-section").classList.add("hidden");
  document.getElementById("error-box").classList.add("hidden");
  markDirty();
}

function clearAllData() {
  state.points = [];
  renderPointsTable();
  resetResultsForNewPointSet();
  showImportMessage("Tüm noktalar temizlendi. Yeni noktalar girip Hesapla'ya basın.");
}

function loadSampleData() {
  state = getSampleState();
  renderPointsTable();
  resetResultsForNewPointSet();
  showImportMessage("Örnek Rize test verisi yüklendi. Sonuçları görmek için Hesapla'ya basın.");
}

// Dengeleme sonrası tüm noktaların (RS + hesaplanan yeni) nihai Y/X/H
// listesini döndürür — indirme butonları bunu kullanır.
function buildAdjustedPointsList() {
  if (!lastResult) return null;
  const hByName = {};
  lastResult.perPoint.forEach((p) => (hByName[p.name] = p.H));
  return state.points.map((p) => ({
    name: p.name,
    type: p.type,
    y: p.y,
    x: p.x,
    z: hByName[p.name] ?? p.H,
  }));
}

function downloadResults(format) {
  const rows = buildAdjustedPointsList();
  if (!rows) {
    showImportMessage("Önce geçerli bir hesap sonucu üretilmeli (nokta listesini kontrol edin).", true);
    return;
  }
  let content, mime, ext;
  if (format === "csv") {
    content =
      "Nokta,Tur,Y,X,H\n" +
      rows
        .map((r) => `${r.name},${r.type === "fixed" ? "Sabit" : "Bilinmeyen"},${r.y ?? ""},${r.x ?? ""},${fmt(r.z, 4)}`)
        .join("\n");
    mime = "text/csv;charset=utf-8";
    ext = "csv";
  } else if (format === "ncn") {
    // NetCAD Nokta Cetveli (.ncn): NoktaNo,Y,X,Z,Kod — başlıksız, virgülle ayrılmış.
    content = rows
      .map((r) => `${r.name},${r.y ?? 0},${r.x ?? 0},${fmt(r.z, 4)},${r.type === "fixed" ? "SABIT" : "GNSS"}`)
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
  a.download = `hesaplanan-noktalar.${ext}`;
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
      resetResultsForNewPointSet();
      showImportMessage(`İçe aktarıldı: ${state.points.length} nokta. Sonuçları görmek için Hesapla'ya basın.`);
    } catch (err) {
      showImportMessage("İçe aktarma hatası: " + err.message, true);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("btn-export-excel").addEventListener("click", () => {
    XLSX.writeFile(ioBuildWorkbookFromState(state), "gnss-nivelman-noktalari.xlsx");
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
  // Sayfa açıldığında OTOMATİK hesaplama yapılmaz — örnek veri tabloya
  // yüklenmiş olarak görünür, ancak sonuçlar yalnızca kullanıcı "Hesapla"ya
  // bastığında üretilir.
  updateCalcStatus();
});
