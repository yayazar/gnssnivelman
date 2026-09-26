// GNSS destekli nivelman — jeoit ondülasyonu (N) yüzey modeli ile hesap.
//
// Yöntem (klasik GNSS nivelmanı iş akışı):
// 1) Yüksekliği (H, ortometrik) kesin bilinen RS (röper/nivelman) noktalarında
//    GNSS ile elipsoidal yükseklik (h) ölçülür. Bu noktalarda
//    N = h − H (jeoit ondülasyonu) hesaplanır.
// 2) Yeni (bilinmeyen) noktalarda yalnızca h ölçülür.
// 3) RS noktalarındaki N değerlerine, çalışma alanını temsil eden bir eğik
//    düzlem (trend yüzeyi) en küçük kareler ile oturtulur:
//       N(Y, X) = a + b·Y + c·X
// 4) Bu düzlemden her yeni noktanın konumundaki N enterpole edilir ve
//       H = h − N(Y, X)
//    ile ortometrik yüksekliği hesaplanır.
//
// RS noktaları çalışma alanını geometrik olarak çevrelemelidir; aksi halde
// (ör. tek bir doğru üzerinde/çakışık iseler) düzlem denklemi belirsiz kalır.

// 3x3 simetrik doğrusal sistemi (normal denklemler) Cramer kuralıyla çözer.
function solve3x3(M, rhs) {
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const D = det3(M);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-9) {
    throw new Error(
      "Jeoit yüzeyi (düzlem) çözülemedi: sabit (RS) noktalar neredeyse aynı doğru üzerinde ya da " +
        "çakışık. RS noktaları çalışma alanını geometrik olarak çevreleyecek şekilde dağıtılmalı."
    );
  }
  const withCol = (col, vec) => M.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));
  const Da = det3(withCol(0, rhs));
  const Db = det3(withCol(1, rhs));
  const Dc = det3(withCol(2, rhs));
  return [Da / D, Db / D, Dc / D];
}

// Fixed (RS) noktalarının (Y, X, N) üçlülerine en küçük kareler ile
// N = a + b·Y + c·X düzlemini oturtur.
function fitGeoidPlane(fixedPts) {
  if (fixedPts.length < 3) {
    throw new Error(
      `Jeoit yüzeyi (düzlem) için en az 3 sabit (RS) nokta gerekli; şu an ${fixedPts.length} tane var.`
    );
  }
  // Sayısal kararlılık için Y/X'i alan merkezine göre kaydır.
  const yMean = fixedPts.reduce((s, p) => s + p.y, 0) / fixedPts.length;
  const xMean = fixedPts.reduce((s, p) => s + p.x, 0) / fixedPts.length;

  let Sw = 0, Sy = 0, Sx = 0, Syy = 0, Sxx = 0, Syx = 0, Sn = 0, Syn = 0, Sxn = 0;
  fixedPts.forEach((p) => {
    const y = p.y - yMean;
    const x = p.x - xMean;
    Sw += 1;
    Sy += y;
    Sx += x;
    Syy += y * y;
    Sxx += x * x;
    Syx += y * x;
    Sn += p.N;
    Syn += y * p.N;
    Sxn += x * p.N;
  });

  const M = [
    [Sw, Sy, Sx],
    [Sy, Syy, Syx],
    [Sx, Syx, Sxx],
  ];
  const rhs = [Sn, Syn, Sxn];
  const [a0, b, c] = solve3x3(M, rhs);
  // a0, kaydırılmış merkez içindir; gerçek Y/X'e göre sabit terimi geri çevir.
  const a = a0 - b * yMean - c * xMean;

  const predict = (y, x) => a + b * y + c * x;
  const residuals = fixedPts.map((p) => ({ name: p.name, residualM: p.N - predict(p.y, p.x) }));
  const rms = Math.sqrt(residuals.reduce((s, r) => s + r.residualM * r.residualM, 0) / residuals.length);

  return { a, b, c, predict, residuals, rms };
}

// Basit dışbükey zarf (Andrew monotone chain), gerçek Y/X koordinatlarında.
function convexHullXY(pts) {
  const sorted = [...pts].sort((a, b) => a.y - b.y || a.x - b.x);
  const cross = (o, a, b) => (a.y - o.y) * (b.x - o.x) - (a.x - o.x) * (b.y - o.y);
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

// Ray-casting: nokta çokgenin içinde (ya da sınırında) mı? RS noktalarının
// çevrelediği alanın dışında kalan yeni noktalar, jeoit düzleminin
// EKSTRAPOLASYON yaptığı (dolayısıyla çok daha az güvenilir olduğu)
// noktalardır — bkz. runGnssGeoidAdjustment.
function pointInPolygon(pt, poly) {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].y, xi = poly[i].x;
    const yj = poly[j].y, xj = poly[j].x;
    const onSegment =
      Math.min(yi, yj) <= pt.y && pt.y <= Math.max(yi, yj) && Math.min(xi, xj) <= pt.x && pt.x <= Math.max(xi, xj) &&
      Math.abs((xj - xi) * (pt.y - yi) - (pt.x - xi) * (yj - yi)) < 1e-9;
    if (onSegment) return true;
    const intersects = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// points: [{name, type: "fixed"|"unknown", y, x, h, H?}]
// Döner: { plane, perPoint: [{name, type, h, N, H, residualMm?, isExtrapolation?}] }
function runGnssGeoidAdjustment(points) {
  if (points.length < 1) throw new Error("En az bir nokta girilmeli.");

  points.forEach((p) => {
    if (!Number.isFinite(p.h)) {
      throw new Error(`GNSS elipsoidal yükseklik (h) girilmeli: ${p.name}`);
    }
    if (!Number.isFinite(p.y) || !Number.isFinite(p.x)) {
      throw new Error(`Y ve X koordinatları girilmeli: ${p.name}`);
    }
    if (p.type === "fixed" && !Number.isFinite(p.H)) {
      throw new Error(`Sabit (RS) nokta için bilinen ortometrik yükseklik (H) girilmeli: ${p.name}`);
    }
  });

  const fixedPts = points
    .filter((p) => p.type === "fixed")
    .map((p) => ({ name: p.name, y: p.y, x: p.x, N: p.h - p.H }));

  const plane = fitGeoidPlane(fixedPts);
  const residualByName = {};
  plane.residuals.forEach((r) => (residualByName[r.name] = r.residualM));
  const hull = convexHullXY(fixedPts);

  const perPoint = points.map((p) => {
    const Npredicted = plane.predict(p.y, p.x);
    if (p.type === "fixed") {
      return {
        name: p.name,
        type: p.type,
        h: p.h,
        N: p.h - p.H,
        Npredicted,
        H: p.H,
        residualMm: (residualByName[p.name] ?? 0) * 1000,
        isExtrapolation: false,
      };
    }
    return {
      name: p.name,
      type: p.type,
      h: p.h,
      N: Npredicted,
      Npredicted,
      H: p.h - Npredicted,
      residualMm: null,
      // RS noktalarının çevrelediği alanın dışında kalan yeni noktalarda jeoit
      // düzlemi ENTERPOLASYON değil EKSTRAPOLASYON yapar — çok daha az güvenilirdir.
      isExtrapolation: !pointInPolygon({ y: p.y, x: p.x }, hull),
    };
  });

  return { plane, perPoint, hull };
}
