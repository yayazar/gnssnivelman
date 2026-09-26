// GNSS destekli jeodezik nivelman ağı dengelemesi
// Yöntem: Dolaylı ölçüler (parametrik) yöntemi ile en küçük kareler dengelemesi
//
// Bilinmeyenler: sabit (mesnet) olmayan noktaların ortometrik yükseklikleri (H)
// Ölçüler:
//   1) Nivelman yükseklik farkı ölçüleri:  H_to - H_from = dh_ölçü   (ağırlık: 1/sigma_lev^2, sigma_lev = k * sqrt(S_km))
//   2) GNSS ile belirlenen yükseklik (sözde ölçü):  H_nokta = h_elipsoidal - N_jeoit   (ağırlık: 1/sigma_gnss^2)
//
// Bu iki ölçü tipi ortak dengelemede birleştirilerek noktaların en olası
// (dengeli) yükseklikleri ve bunların istatistiksel kesinlikleri hesaplanır.

function z95() {
  return 1.959963985; // %95 güven aralığı için standart normal kritik değer
}

function buildPointIndex(points) {
  const unknownIndex = {};
  let idx = 0;
  points.forEach((p) => {
    if (p.type !== "fixed") {
      unknownIndex[p.name] = idx++;
    }
  });
  return { unknownIndex, u: idx };
}

function runAdjustment(points, levelingObs, gnssObs, params) {
  const { unknownIndex, u } = buildPointIndex(points);
  if (u === 0) throw new Error("En az bir bilinmeyen (sabit olmayan) nokta tanımlanmalı.");

  const pointByName = {};
  points.forEach((p) => (pointByName[p.name] = p));

  const rows = []; // { A: [...], l: value, w: weight, label, kind }

  // 1) Nivelman ölçüleri
  levelingObs.forEach((obs) => {
    const fromPt = pointByName[obs.from];
    const toPt = pointByName[obs.to];
    if (!fromPt || !toPt) throw new Error(`Nivelman ölçüsü için nokta tanımsız: ${obs.from} -> ${obs.to}`);

    let sigma;
    if (obs.sigma && obs.sigma > 0) {
      sigma = obs.sigma;
    } else {
      if (obs.dist === null || obs.dist === undefined || !Number.isFinite(obs.dist) || obs.dist <= 0) {
        throw new Error(
          `Nivelman ölçüsü için geçerli bir mesafe (S) veya elle σ girilmeli: ${obs.from} → ${obs.to}`
        );
      }
      sigma = params.k * Math.sqrt(obs.dist);
    }
    const w = 1 / (sigma * sigma);

    const row = new Array(u).fill(0);
    let rhs = obs.dh;

    // H_to katsayısı +1
    if (toPt.type === "fixed") {
      rhs -= 1 * toPt.height;
    } else {
      row[unknownIndex[toPt.name]] += 1;
    }
    // H_from katsayısı -1
    if (fromPt.type === "fixed") {
      rhs -= -1 * fromPt.height;
    } else {
      row[unknownIndex[fromPt.name]] += -1;
    }

    if (fromPt.type === "fixed" && toPt.type === "fixed") {
      // İki ucu da sabit: bilinmeyen içermiyor, kontrol ölçüsü olarak atlanıyor
      return;
    }

    rows.push({
      A: row,
      l: rhs,
      w,
      sigma,
      label: `${obs.from} → ${obs.to}`,
      kind: "Nivelman",
      raw: obs.dh,
    });
  });

  // 2) GNSS (elipsoidal yükseklik - jeoit ondülasyonu) sözde ölçüleri
  gnssObs.forEach((obs) => {
    const pt = pointByName[obs.point];
    if (!pt) throw new Error(`GNSS ölçüsü için nokta tanımsız: ${obs.point}`);
    if (pt.type === "fixed") return; // sabit noktada GNSS ölçüsü kontrol amaçlı, dengelemeye girmez

    const Hgnss = obs.h - obs.N;
    const sigma = obs.sigma && obs.sigma > 0 ? obs.sigma : params.sigmaGnss;
    const w = 1 / (sigma * sigma);

    const row = new Array(u).fill(0);
    row[unknownIndex[pt.name]] = 1;

    rows.push({
      A: row,
      l: Hgnss,
      w,
      sigma,
      label: `${obs.point} (GNSS)`,
      kind: "GNSS",
      raw: Hgnss,
    });
  });

  const nObs = rows.length;
  const redundancy = nObs - u;
  if (redundancy < 0) {
    throw new Error(
      `Sistem belirsiz (fazla bilinmeyen): ${u} bilinmeyen için en az ${u} bağımsız ölçü gerekli, sadece ${nObs} ölçü var.`
    );
  }

  const A = rows.map((r) => r.A);
  const l = rows.map((r) => [r.l]);
  const weights = rows.map((r) => r.w);

  const { N, n } = weightedNormalEquations(A, weights, l);
  const Ninv = matInverse(N);
  const xhat = matMultiply(Ninv, n); // (u x 1) dengeli yükseklikler

  // Kalanlar (residuals): v = A*xhat - l
  const Axhat = matMultiply(A, xhat);
  const v = rows.map((r, i) => Axhat[i][0] - l[i][0]);

  // Birim ağırlıklı ölçü hatası (a posteriori varyans faktörü)
  let vtPv = 0;
  for (let i = 0; i < nObs; i++) vtPv += weights[i] * v[i] * v[i];
  const sigma0sq = redundancy > 0 ? vtPv / redundancy : 0;
  const sigma0 = Math.sqrt(sigma0sq);

  // Bilinmeyenlerin kovaryans matrisi
  const Cxx = Ninv.map((row) => row.map((val) => val * sigma0sq));

  const unknownNames = Object.keys(unknownIndex);
  const results = unknownNames.map((name) => {
    const i = unknownIndex[name];
    const H = xhat[i][0];
    const stdev = Math.sqrt(Math.max(Cxx[i][i], 0));
    return {
      name,
      H,
      stdev,
      ciLow: H - z95() * stdev,
      ciHigh: H + z95() * stdev,
    };
  });

  const residualRows = rows.map((r, i) => ({
    label: r.label,
    kind: r.kind,
    raw: r.raw,
    weight: r.w,
    sigma: r.sigma,
    v: v[i],
    vNormalized: r.w > 0 ? v[i] * Math.sqrt(r.w) : 0,
  }));

  return {
    unknownCount: u,
    obsCount: nObs,
    redundancy,
    sigma0,
    sigma0sq,
    results,
    residualRows,
  };
}

// ---------------------------------------------------------------------------
// Yönetmelik toleransları: nivelman devresi/hattı kapanma kontrolü
// ---------------------------------------------------------------------------
//
// Bir devre (kapalı hat: başlangıç == bitiş noktası) veya iki mesnet noktası
// arasındaki bir hat için, ölçülen yükseklik farklarının toplamı ile
// beklenen (bilinen) değer arasındaki fark "kapanma hatası"dır. Bu fonksiyon
// yalnızca ham ölçülerle (dengeleme sonucu kullanmadan) bağımsız bir kapanma
// kontrolü yapar — yönetmeliklerde öngörülen klasik nivelman kalite kontrolü budur.
function evaluateRoute(routeName, pathNames, points, levelingObs) {
  const pointByName = {};
  points.forEach((p) => (pointByName[p.name] = p));

  if (!Array.isArray(pathNames) || pathNames.length < 2) {
    return { name: routeName, error: "Hat en az iki nokta içermeli." };
  }
  for (const name of pathNames) {
    if (!pointByName[name]) {
      return { name: routeName, error: `Nokta tanımsız: ${name}` };
    }
  }

  // Ardışık nokta çiftleri arasında (yönü fark etmeksizin) nivelman ölçüsü ara
  let sumDh = 0;
  let lengthKm = 0;
  const segments = [];
  for (let i = 0; i < pathNames.length - 1; i++) {
    const a = pathNames[i];
    const b = pathNames[i + 1];
    const fwd = levelingObs.find((o) => o.from === a && o.to === b);
    const bwd = !fwd ? levelingObs.find((o) => o.from === b && o.to === a) : null;
    if (!fwd && !bwd) {
      return { name: routeName, error: `Ölçü bulunamadı: ${a} ↔ ${b}` };
    }
    const obs = fwd || bwd;
    const dh = fwd ? obs.dh : -obs.dh;
    if (!Number.isFinite(obs.dist) || obs.dist <= 0) {
      return {
        name: routeName,
        error: `Hat uzunluğu (K) hesaplanamaz: ${a} ↔ ${b} ölçüsünde geçerli bir mesafe girilmemiş (yalnızca σ girilmiş olabilir).`,
      };
    }
    sumDh += dh;
    lengthKm += obs.dist;
    segments.push({ from: a, to: b, dh, dist: obs.dist });
  }

  const startPt = pointByName[pathNames[0]];
  const endPt = pointByName[pathNames[pathNames.length - 1]];
  const isClosedLoop = pathNames[0] === pathNames[pathNames.length - 1];

  let expected = null;
  let kind = null;
  if (isClosedLoop) {
    expected = 0;
    kind = "Kapalı devre";
  } else if (startPt.type === "fixed" && endPt.type === "fixed") {
    expected = endPt.height - startPt.height;
    kind = "Mesnetli hat";
  } else {
    return {
      name: routeName,
      error: "Kapanma hesaplanamaz: hat kapalı bir devre olmalı ya da iki ucu da sabit (mesnet) noktalarda olmalı.",
    };
  }

  const misclosureM = sumDh - expected;
  return {
    name: routeName,
    kind,
    path: pathNames,
    segments,
    lengthKm,
    sumDh,
    expected,
    misclosureM,
    misclosureMm: misclosureM * 1000,
  };
}

// Kapanma hatası toleransı: T = katsayı(mm/√km) · √K(km)
function toleranceMm(coeffMmPerSqrtKm, lengthKm) {
  return coeffMmPerSqrtKm * Math.sqrt(Math.max(lengthKm, 0));
}

// Bir standart sapma değerini (mm), tanımlı doğruluk sınıfları arasından
// karşılayabildiği en sıkı (en küçük eşikli) sınıfa atar.
function classifyByStdev(stdevMm, classes, thresholdField) {
  const eligible = classes
    .filter((c) => Number.isFinite(c[thresholdField]) && c[thresholdField] > 0 && stdevMm <= c[thresholdField])
    .sort((a, b) => a[thresholdField] - b[thresholdField]);
  return eligible.length > 0 ? eligible[0].name : "Sınıf dışı";
}
