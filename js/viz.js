// Ölçekli ağ krokisi ve yükseklik profili görselleştirmeleri (bağımlılıksız SVG)

const VIZ_COLORS = {
  fixed: "#2a78d6", // kategorik slot 1 (mavi) — sabit nokta
  unknown: "#eb6834", // kategorik slot 2 (turuncu) — bilinmeyen nokta
  good: "#0ca30c",
  serious: "#ec835a",
  critical: "#d03b3b",
  ink: "#0b0b0b",
  secondaryInk: "#52514e",
  mutedInk: "#898781",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#fcfcfb",
};

function vizEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function statusColorForNormalizedResidual(vNorm) {
  const a = Math.abs(vNorm);
  if (a > 3) return VIZ_COLORS.critical;
  if (a > 2) return VIZ_COLORS.serious;
  return VIZ_COLORS.good;
}

function statusLabelForNormalizedResidual(vNorm) {
  const a = Math.abs(vNorm);
  if (a > 3) return "Kritik";
  if (a > 2) return "Uyarı";
  return "Uygun";
}

// "Güzel" bir yuvarlak ölçek çubuğu uzunluğu seçer (1/2/5 x 10^n metre)
function niceScaleLength(targetMeters) {
  if (targetMeters <= 0) return 1;
  const exp = Math.floor(Math.log10(targetMeters));
  const base = Math.pow(10, exp);
  const candidates = [1, 2, 5, 10].map((m) => m * base);
  let best = candidates[0];
  for (const c of candidates) {
    if (c <= targetMeters) best = c;
  }
  return best;
}

let vizTooltipEl = null;
function ensureVizTooltip() {
  if (vizTooltipEl) return vizTooltipEl;
  vizTooltipEl = document.createElement("div");
  vizTooltipEl.className = "viz-tooltip hidden";
  document.body.appendChild(vizTooltipEl);
  return vizTooltipEl;
}

function showVizTooltip(evt, html) {
  const el = ensureVizTooltip();
  el.innerHTML = html;
  el.classList.remove("hidden");
  moveVizTooltip(evt);
}

function moveVizTooltip(evt) {
  if (!vizTooltipEl || vizTooltipEl.classList.contains("hidden")) return;
  const pad = 14;
  vizTooltipEl.style.left = evt.clientX + pad + "px";
  vizTooltipEl.style.top = evt.clientY + pad + "px";
}

function hideVizTooltip() {
  if (vizTooltipEl) vizTooltipEl.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Ağ krokisi (plan görünüş, ölçekli)
// ---------------------------------------------------------------------------
function renderNetworkSketch(container, points, levelingObs, residualByLabel) {
  const coordPts = points.filter(
    (p) => Number.isFinite(p.y) && Number.isFinite(p.x)
  );
  const usable = new Set(coordPts.map((p) => p.name));
  const edges = levelingObs.filter((o) => usable.has(o.from) && usable.has(o.to));

  if (coordPts.length < 2 || edges.length === 0) {
    container.innerHTML =
      '<p class="panel-desc">Kroki çizmek için en az iki noktanın Y (Doğu) ve X (Kuzey) koordinatı girilmeli ve aralarında bir nivelman ölçüsü tanımlanmalı olması gerekir.</p>';
    return;
  }

  const width = 760;
  const height = 480;
  const pad = 60;

  const ys = coordPts.map((p) => p.y);
  const xs = coordPts.map((p) => p.x);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const spanY = Math.max(maxY - minY, 1e-6);
  const spanX = Math.max(maxX - minX, 1e-6);

  const scale = Math.min((width - 2 * pad) / spanY, (height - 2 * pad) / spanX);
  const metersPerPx = 1 / scale;

  // Ekran: sağ = Doğu (+Y), yukarı = Kuzey (+X) — SVG y ekseni aşağı büyüdüğü için X ters çevrilir
  const drawW = spanY * scale;
  const drawH = spanX * scale;
  const offX = pad + (width - 2 * pad - drawW) / 2;
  const offY = pad + (height - 2 * pad - drawH) / 2;

  function toScreen(p) {
    return {
      sx: offX + (p.y - minY) * scale,
      sy: offY + drawH - (p.x - minX) * scale,
    };
  }

  const pointByName = {};
  coordPts.forEach((p) => (pointByName[p.name] = p));

  let hasControlEdge = false;
  const edgeSvgParts = [];
  const edgeHitParts = [];
  edges.forEach((o) => {
    const a = toScreen(pointByName[o.from]);
    const b = toScreen(pointByName[o.to]);
    const label = `${o.from} → ${o.to}`;
    const res = residualByLabel[label];
    // Her iki ucu da sabit (mesnet) olan ölçüler dengelemeye katılmaz (bkz. adjustment.js);
    // bunlar yalnızca bağımsız bir kontrol/devre ölçüsüdür ve kesikli çizgiyle ayırt edilir.
    const isControlEdge = !res && pointByName[o.from].type === "fixed" && pointByName[o.to].type === "fixed";
    if (isControlEdge) hasControlEdge = true;
    const color = res ? statusColorForNormalizedResidual(res.vNormalized) : VIZ_COLORS.mutedInk;
    const dash = isControlEdge ? ' stroke-dasharray="6 5"' : "";
    edgeSvgParts.push(
      `<line x1="${a.sx.toFixed(1)}" y1="${a.sy.toFixed(1)}" x2="${b.sx.toFixed(1)}" y2="${b.sy.toFixed(1)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"${dash} />`
    );
    const tip = res
      ? `<strong>${vizEscape(label)}</strong><br/>Δh = ${res.raw.toFixed(4)} m · S = ${(o.dist ?? 0).toFixed(2)} km<br/>Kalan v = ${res.v.toFixed(4)} m (${statusLabelForNormalizedResidual(res.vNormalized)})`
      : isControlEdge
      ? `<strong>${vizEscape(label)}</strong><br/>Δh = ${o.dh.toFixed(4)} m · S = ${(o.dist ?? 0).toFixed(2)} km<br/>İki ucu da sabit: dengelemeye katılmaz, yalnızca bağımsız kontrol/devre ölçüsüdür.`
      : `<strong>${vizEscape(label)}</strong><br/>Δh = ${o.dh.toFixed(4)} m`;
    edgeHitParts.push(
      `<line x1="${a.sx.toFixed(1)}" y1="${a.sy.toFixed(1)}" x2="${b.sx.toFixed(1)}" y2="${b.sy.toFixed(1)}" stroke="transparent" stroke-width="14" data-tip="${vizEscape(tip)}" class="viz-hit" />`
    );
  });

  const pointSvgParts = [];
  coordPts.forEach((p) => {
    if (!edges.some((o) => o.from === p.name || o.to === p.name)) return; // sadece bağlantılı noktaları çiz
    const s = toScreen(p);
    const color = p.type === "fixed" ? VIZ_COLORS.fixed : VIZ_COLORS.unknown;
    const heightLabel = p.type === "fixed" ? `H = ${p.height?.toFixed(4)} m (sabit)` : `H = ${p.height != null ? p.height.toFixed(4) + " m (dengeli)" : "—"}`;
    pointSvgParts.push(`
      <circle cx="${s.sx.toFixed(1)}" cy="${s.sy.toFixed(1)}" r="7" fill="${color}" stroke="${VIZ_COLORS.surface}" stroke-width="2"
        class="viz-hit" data-tip="${vizEscape(`<strong>${p.name}</strong><br/>${heightLabel}`)}" />
      <text x="${(s.sx + 10).toFixed(1)}" y="${(s.sy - 8).toFixed(1)}" font-size="12" fill="${VIZ_COLORS.ink}" font-weight="600">${vizEscape(p.name)}</text>
    `);
  });

  // Ölçek çubuğu: çizim genişliğinin ~%18'ine karşılık gelen "güzel" bir yuvarlak uzunluk seç
  const targetBarMeters = (width - 2 * pad) * 0.18 * metersPerPx;
  const barMeters = niceScaleLength(targetBarMeters);
  const barPx = barMeters / metersPerPx;
  const barX = pad;
  const barY = height - 24;

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Ölçekli nivelman ağı krokisi" class="viz-svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${VIZ_COLORS.surface}" />
      ${edgeSvgParts.join("\n")}
      ${pointSvgParts.join("\n")}
      ${edgeHitParts.join("\n")}
      <g>
        <line x1="${barX}" y1="${barY}" x2="${barX + barPx}" y2="${barY}" stroke="${VIZ_COLORS.ink}" stroke-width="2" />
        <line x1="${barX}" y1="${barY - 5}" x2="${barX}" y2="${barY + 5}" stroke="${VIZ_COLORS.ink}" stroke-width="2" />
        <line x1="${barX + barPx}" y1="${barY - 5}" x2="${barX + barPx}" y2="${barY + 5}" stroke="${VIZ_COLORS.ink}" stroke-width="2" />
        <text x="${barX}" y="${barY + 18}" font-size="12" fill="${VIZ_COLORS.secondaryInk}">${barMeters} m</text>
      </g>
      <g transform="translate(${width - 40}, 40)">
        <line x1="0" y1="24" x2="0" y2="0" stroke="${VIZ_COLORS.ink}" stroke-width="2" marker-end="url(#viz-arrow)" />
        <text x="0" y="-6" font-size="12" text-anchor="middle" fill="${VIZ_COLORS.ink}" font-weight="700">K</text>
      </g>
      <defs>
        <marker id="viz-arrow" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
          <path d="M0,-4 L4,0 L0,4 Z" fill="${VIZ_COLORS.ink}" />
        </marker>
      </defs>
    </svg>
  `;

  container.innerHTML = `
    ${svg}
    <div class="viz-legend">
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.fixed}"></span>Sabit nokta</span>
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.unknown}"></span>Bilinmeyen nokta</span>
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.good}"></span>Uygun ölçü</span>
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.serious}"></span>Uyarı</span>
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.critical}"></span>Kritik</span>
      ${hasControlEdge ? `<span class="viz-legend-item"><span class="viz-swatch viz-swatch-dashed" style="background:${VIZ_COLORS.mutedInk}"></span>Kontrol ölçüsü (dengelemeye dahil değil)</span>` : ""}
    </div>
  `;

  attachVizHoverHandlers(container);
}

// ---------------------------------------------------------------------------
// Yükseklik profili
// ---------------------------------------------------------------------------
function renderHeightProfile(container, points, adjustedResults) {
  const adjustedByName = {};
  adjustedResults.forEach((r) => (adjustedByName[r.name] = r));

  const items = points
    .filter((p) => p.type === "fixed" || adjustedByName[p.name])
    .map((p) => {
      if (p.type === "fixed") {
        return { name: p.name, type: "fixed", H: p.height, stdev: 0, ciLow: p.height, ciHigh: p.height };
      }
      const r = adjustedByName[p.name];
      return { name: p.name, type: "unknown", H: r.H, stdev: r.stdev, ciLow: r.ciLow, ciHigh: r.ciHigh };
    });

  if (items.length === 0) {
    container.innerHTML = '<p class="panel-desc">Profil için önce dengelemeyi hesaplayın.</p>';
    return;
  }

  const width = 760;
  const height = 420;
  const padL = 70, padR = 30, padT = 30, padB = 60;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const allLows = items.map((i) => i.ciLow);
  const allHighs = items.map((i) => i.ciHigh);
  let minH = Math.min(...allLows);
  let maxH = Math.max(...allHighs);
  const span = Math.max(maxH - minH, 0.01);
  minH -= span * 0.15;
  maxH += span * 0.15;

  function yOf(h) {
    return padT + plotH - ((h - minH) / (maxH - minH)) * plotH;
  }
  function xOf(i) {
    const step = plotW / items.length;
    return padL + step * (i + 0.5);
  }

  // Yatay ızgara + eksen etiketleri (5 kademe)
  const ticks = 5;
  const gridParts = [];
  for (let t = 0; t <= ticks; t++) {
    const h = minH + (span * 1.3 * t) / ticks;
    const y = yOf(h);
    gridParts.push(
      `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(width - padR).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${VIZ_COLORS.grid}" stroke-width="1" />`,
      `<text x="${padL - 10}" y="${(y + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${VIZ_COLORS.mutedInk}">${h.toFixed(2)}</text>`
    );
  }

  const marks = [];
  const hits = [];
  items.forEach((it, i) => {
    const x = xOf(i);
    const yC = yOf(it.H);
    const color = it.type === "fixed" ? VIZ_COLORS.fixed : VIZ_COLORS.unknown;

    if (it.type === "unknown") {
      const yLow = yOf(it.ciLow);
      const yHigh = yOf(it.ciHigh);
      marks.push(
        `<line x1="${x}" y1="${yLow.toFixed(1)}" x2="${x}" y2="${yHigh.toFixed(1)}" stroke="${color}" stroke-width="2" />`,
        `<line x1="${x - 6}" y1="${yLow.toFixed(1)}" x2="${x + 6}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="2" />`,
        `<line x1="${x - 6}" y1="${yHigh.toFixed(1)}" x2="${x + 6}" y2="${yHigh.toFixed(1)}" stroke="${color}" stroke-width="2" />`,
        `<circle cx="${x}" cy="${yC.toFixed(1)}" r="6" fill="${color}" stroke="${VIZ_COLORS.surface}" stroke-width="2" />`
      );
    } else {
      marks.push(
        `<rect x="${x - 6}" y="${(yC - 6).toFixed(1)}" width="12" height="12" fill="${color}" stroke="${VIZ_COLORS.surface}" stroke-width="2" />`
      );
    }

    marks.push(`<text x="${x}" y="${height - padB + 20}" font-size="12" text-anchor="middle" fill="${VIZ_COLORS.ink}">${vizEscape(it.name)}</text>`);

    const tip =
      it.type === "fixed"
        ? `<strong>${vizEscape(it.name)}</strong><br/>H = ${it.H.toFixed(4)} m (sabit)`
        : `<strong>${vizEscape(it.name)}</strong><br/>H = ${it.H.toFixed(4)} m ± ${it.stdev.toFixed(4)} m<br/>%95 GA: [${it.ciLow.toFixed(4)}, ${it.ciHigh.toFixed(4)}]`;
    hits.push(`<rect x="${x - 16}" y="${padT}" width="32" height="${plotH}" fill="transparent" class="viz-hit" data-tip="${vizEscape(tip)}" />`);
  });

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Nokta yükseklikleri profili" class="viz-svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${VIZ_COLORS.surface}" />
      ${gridParts.join("\n")}
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="${VIZ_COLORS.baseline}" stroke-width="1.5" />
      <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="${VIZ_COLORS.baseline}" stroke-width="1.5" />
      <text x="${padL - 50}" y="${padT - 10}" font-size="11" fill="${VIZ_COLORS.mutedInk}">H (m)</text>
      ${marks.join("\n")}
      ${hits.join("\n")}
    </svg>
  `;

  container.innerHTML = `
    ${svg}
    <div class="viz-legend">
      <span class="viz-legend-item"><span class="viz-swatch viz-swatch-square" style="background:${VIZ_COLORS.fixed}"></span>Sabit nokta</span>
      <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.unknown}"></span>Dengeli (bilinmeyen) — %95 güven aralığı ile</span>
    </div>
  `;

  attachVizHoverHandlers(container);
}

function attachVizHoverHandlers(container) {
  container.querySelectorAll(".viz-hit").forEach((el) => {
    el.addEventListener("mouseenter", (e) => showVizTooltip(e, el.dataset.tip));
    el.addEventListener("mousemove", moveVizTooltip);
    el.addEventListener("mouseleave", hideVizTooltip);
  });
}
