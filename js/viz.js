// Ölçekli/gerçek konumlu plan görünüşü — OpenStreetMap altlık haritası
// üzerinde Leaflet ile çizilir. Nokta Y/X'i (girilen projeksiyonlu metre
// koordinatları), kullanıcının seçtiği EPSG koduna göre proj4 ile WGS84
// enlem/boylama çevrilerek haritada gösterilir (bkz. js/epsg.js). Bu
// dönüşüm YALNIZCA harita gösterimi içindir — hesaplanan H değerlerini
// etkilemez, o hesap her zaman girilen Y/X'in düz metre koordinatı olduğu
// varsayımıyla yapılır.

const VIZ_COLORS = {
  fixed: "#2a78d6", // kategorik slot 1 (mavi) — sabit (RS) nokta
  unknown: "#eb6834", // kategorik slot 2 (turuncu) — yeni (bilinmeyen) nokta
  critical: "#d03b3b",
  ink: "#0b0b0b",
};

function vizEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Basit dışbükey zarf (Andrew monotone chain), enlem/boylam düzleminde —
// yalnızca haritada RS noktalarının kapsadığı alanı göstermek için kullanılır.
function convexHullLatLng(pts) {
  const sorted = [...pts].sort((a, b) => a.lon - b.lon || a.lat - b.lat);
  const cross = (o, a, b) => (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Zoom'dan bağımsız, sabit piksel boyutlu bir kare (RS) ya da daire (yeni
// nokta) ikonu — ekstrapolasyon durumunda etrafına kesikli bir uyarı halkası eklenir.
function makeMarkerIcon({ shape, color, ring }) {
  const box = 30;
  const c = box / 2;
  const ringSvg = ring
    ? `<circle cx="${c}" cy="${c}" r="13" fill="none" stroke="${VIZ_COLORS.critical}" stroke-width="1.5" stroke-dasharray="3 3" />`
    : "";
  const shapeSvg =
    shape === "square"
      ? `<rect x="${c - 7}" y="${c - 7}" width="14" height="14" fill="${color}" stroke="white" stroke-width="2" />`
      : `<circle cx="${c}" cy="${c}" r="7" fill="${color}" stroke="white" stroke-width="2" />`;
  const svg = `<svg width="${box}" height="${box}" viewBox="0 0 ${box} ${box}">${ringSvg}${shapeSvg}</svg>`;
  return L.divIcon({ html: svg, className: "gnss-marker-icon", iconSize: [box, box], iconAnchor: [c, c] });
}

let leafletMap = null;
let leafletLayerGroup = null;

function destroyLeafletMap() {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    leafletLayerGroup = null;
  }
}

// container: harita <div>'i. legendContainer: altındaki lejant <div>'i
// (Leaflet'in kendi yönettiği DOM'un dışında, ayrı bir eleman olmalı).
function renderNetworkSketch(container, legendContainer, points, epsgCode) {
  const coordPts = points.filter((p) => Number.isFinite(p.y) && Number.isFinite(p.x));

  if (coordPts.length < 1) {
    destroyLeafletMap();
    container.innerHTML =
      '<p class="panel-desc">Harita için en az bir noktanın Y (Doğu) ve X (Kuzey) koordinatı girilmelidir.</p>';
    legendContainer.innerHTML = "";
    return;
  }

  let projected;
  try {
    projected = coordPts.map((p) => {
      const [lon, lat] = projectToWgs84(epsgCode, p.y, p.x);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error("Koordinat dönüşümü geçersiz sonuç verdi.");
      return { ...p, lat, lon };
    });
  } catch (err) {
    destroyLeafletMap();
    container.innerHTML = `<p class="panel-desc">Harita gösterilemedi: ${vizEscape(err.message)}</p>`;
    legendContainer.innerHTML = "";
    return;
  }

  if (!leafletMap) {
    container.innerHTML = "";
    leafletMap = L.map(container, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanları',
    }).addTo(leafletMap);
    leafletLayerGroup = L.layerGroup().addTo(leafletMap);
  }

  leafletLayerGroup.clearLayers();

  const fixedPts = projected.filter((p) => p.type === "fixed");
  let hasExtrapolation = false;

  if (fixedPts.length >= 3) {
    const hull = convexHullLatLng(fixedPts);
    if (hull.length >= 3) {
      L.polygon(
        hull.map((p) => [p.lat, p.lon]),
        { color: VIZ_COLORS.fixed, weight: 1.5, dashArray: "5 4", fillOpacity: 0.06 }
      ).addTo(leafletLayerGroup);
    }
  }

  projected.forEach((p) => {
    const isExtrap = !!p.isExtrapolation;
    if (isExtrap) hasExtrapolation = true;
    const color = p.type === "fixed" ? VIZ_COLORS.fixed : isExtrap ? VIZ_COLORS.critical : VIZ_COLORS.unknown;
    const hLabel = Number.isFinite(p.H)
      ? p.type === "fixed"
        ? `H = ${p.H.toFixed(4)} m (bilinen)`
        : `H = ${p.H.toFixed(4)} m (hesaplanan)`
      : "H = —";
    const warnLine = isExtrap ? "<br/>⚠ RS alanı dışında: jeoit düzlemi burada ekstrapolasyon yapıyor" : "";
    const popupHtml = `<strong>${vizEscape(p.name)}</strong><br/>${hLabel}${
      Number.isFinite(p.h) ? `<br/>h (GNSS) = ${p.h.toFixed(4)} m` : ""
    }${warnLine}`;

    const marker = L.marker([p.lat, p.lon], {
      icon: makeMarkerIcon({ shape: p.type === "fixed" ? "square" : "circle", color, ring: isExtrap }),
    }).addTo(leafletLayerGroup);
    marker.bindTooltip(vizEscape(p.name), { permanent: true, direction: "right", offset: [10, 0], className: "gnss-marker-label" });
    marker.bindPopup(popupHtml);
  });

  leafletMap.invalidateSize();
  const bounds = L.latLngBounds(projected.map((p) => [p.lat, p.lon]));
  leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });

  legendContainer.innerHTML = `
    <span class="viz-legend-item"><span class="viz-swatch viz-swatch-square" style="background:${VIZ_COLORS.fixed}"></span>RS (sabit) nokta</span>
    <span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.unknown}"></span>Yeni (bilinmeyen) nokta</span>
    ${fixedPts.length >= 3 ? `<span class="viz-legend-item"><span class="viz-swatch viz-swatch-dashed" style="border-color:${VIZ_COLORS.fixed}"></span>RS noktalarının çevrelediği alan (jeoit modeli bölgesi)</span>` : ""}
    ${hasExtrapolation ? `<span class="viz-legend-item"><span class="viz-swatch" style="background:${VIZ_COLORS.critical}"></span>⚠ Ekstrapolasyon (RS alanı dışında)</span>` : ""}
  `;
}
