// GNSS destekli nivelman — jeoit ondülasyonu (N) yüzey modeli ile hesap,
// dolaylı ölçüler (parametrik) yöntemiyle en küçük kareler dengelemesi.
//
// Yöntem (klasik GNSS nivelmanı iş akışı):
// 1) Yüksekliği (H, ortometrik) kesin bilinen RS (röper/nivelman) noktalarında
//    GNSS ile elipsoidal yükseklik (h) ölçülür. Bu noktalarda
//    N = h − H (jeoit ondülasyonu) hesaplanır — bunlar "ölçü"lerdir.
// 2) Yeni (bilinmeyen) noktalarda yalnızca h ölçülür.
// 3) RS noktalarındaki N ölçülerine, çalışma alanını temsil eden bir eğik
//    düzlem (trend yüzeyi, bilinmeyenler: a, b, c) en küçük kareler ile
//    oturtulur:  N(Y, X) = a + b·Y + c·X
// 4) Bilinmeyenlerin (a, b, c) kovaryans matrisi Cxx = σ₀²·N⁻¹'den, hata
//    yayılma kanunuyla her (Y, X) konumundaki N tahmininin varyansı
//    çıkarılır: Var[N(Y,X)] = fᵀ·Cxx·f,  f = [1, Y, X]ᵀ.
// 5) Bu düzlemden her yeni noktanın konumundaki N enterpole edilir ve
//       H = h − N(Y, X)
//    ile ortometrik yükseklik ve onun standart sapması σ_H = σ_N(Y,X)
//    hesaplanır (GNSS h ölçümünün kendi hatası ayrıca modellenmemiştir —
//    bu, yalnızca jeoit düzlemi modelinin kesinliğini yansıtır).
//
// RS noktaları çalışma alanını geometrik olarak çevrelemelidir; aksi halde
// (ör. tek bir doğru üzerinde/çakışık iseler) düzlem denklemi belirsiz kalır.
// Merkeze (RS noktalarının Y/X ortalaması) yakın noktalarda σ_H küçük, uzak
// ya da alan dışındaki (ekstrapolasyon yapılan) noktalarda büyük çıkar —
// bu, ekstrapolasyonun neden daha az güvenilir olduğunu SAYISAL olarak da
// gösterir.

function z95() {
  return 1.959963985; // %95 güven aralığı için standart normal kritik değer
}

// 3x3 simetrik doğrusal sistemi (normal denklemler) Cramer kuralıyla çözer.
function det3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function solve3x3(M, rhs) {
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

// 3x3 matrisin tersini adjoint (kofaktör) yöntemiyle hesaplar — normal
// denklemler matrisi N = AᵀPA'nın tersi, kovaryans yayılımı için gerekir.
function invert3x3(M) {
  const D = det3(M);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-9) {
    throw new Error(
      "Jeoit yüzeyi (düzlem) çözülemedi: sabit (RS) noktalar neredeyse aynı doğru üzerinde ya da " +
        "çakışık. RS noktaları çalışma alanını geometrik olarak çevreleyecek şekilde dağıtılmalı."
    );
  }
  const c00 = M[1][1] * M[2][2] - M[1][2] * M[2][1];
  const c01 = -(M[1][0] * M[2][2] - M[1][2] * M[2][0]);
  const c02 = M[1][0] * M[2][1] - M[1][1] * M[2][0];
  const c10 = -(M[0][1] * M[2][2] - M[0][2] * M[2][1]);
  const c11 = M[0][0] * M[2][2] - M[0][2] * M[2][0];
  const c12 = -(M[0][0] * M[2][1] - M[0][1] * M[2][0]);
  const c20 = M[0][1] * M[1][2] - M[0][2] * M[1][1];
  const c21 = -(M[0][0] * M[1][2] - M[0][2] * M[1][0]);
  const c22 = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  // Adjoint = kofaktör matrisinin transpozu; M simetrik olduğundan sonuç da simetriktir.
  return [
    [c00 / D, c10 / D, c20 / D],
    [c01 / D, c11 / D, c21 / D],
    [c02 / D, c12 / D, c22 / D],
  ];
}

function matVec3(M, v) {
  return M.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Fixed (RS) noktalarının (Y, X, N) üçlülerine dolaylı ölçüler yöntemiyle
// en küçük kareler ile N = a + b·Y + c·X düzlemini oturtur; bilinmeyenlerin
// kovaryans matrisini de hesaplayarak herhangi bir (Y,X) konumundaki N
// tahmininin standart sapmasını verecek predictStdev fonksiyonunu döner.
function fitGeoidPlane(fixedPts) {
  if (fixedPts.length < 3) {
    throw new Error(
      `Jeoit yüzeyi (düzlem) için en az 3 sabit (RS) nokta gerekli; şu an ${fixedPts.length} tane var.`
    );
  }
  const n = fixedPts.length;
  const u = 3; // bilinmeyen sayısı: a, b, c
  const redundancy = n - u;

  // Sayısal kararlılık için Y/X'i alan merkezine göre kaydır. Kovaryans
  // yayılımı da bu kaydırılmış (merkezlenmiş) çerçevede tutarlı yapılır.
  const yMean = fixedPts.reduce((s, p) => s + p.y, 0) / n;
  const xMean = fixedPts.reduce((s, p) => s + p.x, 0) / n;

  let Sy = 0, Sx = 0, Syy = 0, Sxx = 0, Syx = 0, Sn = 0, Syn = 0, Sxn = 0;
  fixedPts.forEach((p) => {
    const y = p.y - yMean;
    const x = p.x - xMean;
    Sy += y;
    Sx += x;
    Syy += y * y;
    Sxx += x * x;
    Syx += y * x;
    Sn += p.N;
    Syn += y * p.N;
    Sxn += x * p.N;
  });

  // Normal denklemler matrisi N_mat = AᵀA (A: her satırı [1, y, x] olan
  // n×3 tasarım matrisi; birim ağırlık, P = I).
  const Nmat = [
    [n, Sy, Sx],
    [Sy, Syy, Syx],
    [Sx, Syx, Sxx],
  ];
  const rhs = [Sn, Syn, Sxn];
  const [a0, b, c] = solve3x3(Nmat, rhs);
  const Ninv = invert3x3(Nmat);

  // a0, kaydırılmış merkez içindir; gerçek Y/X'e göre sabit terimi geri çevir.
  const a = a0 - b * yMean - c * xMean;

  const predictCentered = (yc, xc) => a0 + b * yc + c * xc;
  const predict = (y, x) => predictCentered(y - yMean, x - xMean);

  const residuals = fixedPts.map((p) => ({ name: p.name, residualM: p.N - predict(p.y, p.x) }));
  const vtv = residuals.reduce((s, r) => s + r.residualM * r.residualM, 0);
  const rms = Math.sqrt(vtv / n);
  // Birim ağırlıklı ölçü hatası (a posteriori varyans faktörü) — RMS'ten
  // farklı olarak fazla ölçü sayısına (n − u) böler, bu yüzden istatistiksel
  // olarak yansız (unbiased) bir tahmindir. Tam 3 RS noktasında fazla ölçü
  // olmadığından (redundancy = 0) tanımsızdır.
  const sigma0sq = redundancy > 0 ? vtv / redundancy : null;
  const sigma0 = sigma0sq != null ? Math.sqrt(sigma0sq) : null;
  // Bilinmeyenlerin (a, b, c) kovaryans matrisi: Cxx = σ₀²·N⁻¹.
  const Cxx = sigma0sq != null ? Ninv.map((row) => row.map((v) => v * sigma0sq)) : null;

  // Hata yayılma kanunu: Var[N(Y,X)] = fᵀ·Cxx·f, f = [1, y-yMean, x-xMean].
  // Cxx tanımsızsa (3 RS noktası, fazla ölçü yok) standart sapma verilemez.
  const predictStdev = (y, x) => {
    if (!Cxx) return null;
    const f = [1, y - yMean, x - xMean];
    const varN = dot3(f, matVec3(Cxx, f));
    return Math.sqrt(Math.max(varN, 0));
  };

  return { a, b, c, predict, predictStdev, residuals, rms, sigma0, sigma0sq, redundancy };
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
        stdevH: 0, // RS noktasının H'si bilinen/sabit değerdir, hatası yoktur.
        ciLow: p.H,
        ciHigh: p.H,
        residualMm: (residualByName[p.name] ?? 0) * 1000,
        isExtrapolation: false,
      };
    }
    // Hata yayılma kanunuyla, düzlem parametrelerinin kovaryansından bu
    // noktanın konumundaki N tahmininin standart sapması çıkarılır. GNSS h
    // ölçümünün kendi hatası ayrı modellenmediği için σ_H = σ_N(Y,X) alınır.
    const stdevH = plane.predictStdev(p.y, p.x);
    const H = p.h - Npredicted;
    return {
      name: p.name,
      type: p.type,
      h: p.h,
      N: Npredicted,
      Npredicted,
      H,
      stdevH,
      ciLow: stdevH != null ? H - z95() * stdevH : null,
      ciHigh: stdevH != null ? H + z95() * stdevH : null,
      residualMm: null,
      // RS noktalarının çevrelediği alanın dışında kalan yeni noktalarda jeoit
      // düzlemi ENTERPOLASYON değil EKSTRAPOLASYON yapar — çok daha az güvenilirdir.
      // (Bu, zaten yukarıdaki σ_H'de merkezden uzaklaştıkça büyüyerek de yansır.)
      isExtrapolation: !pointInPolygon({ y: p.y, x: p.x }, hull),
    };
  });

  return { plane, perPoint, hull };
}
