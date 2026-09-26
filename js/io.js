// Excel (.xlsx/.xls/.csv) içe/dışa aktarma ve şablon oluşturma.
// SheetJS (js/vendor/xlsx.full.min.js) kütüphanesini kullanır; tamamen
// istemci tarafında çalışır, hiçbir veri sunucuya gönderilmez.

const IO_SHEET_ALIASES = {
  points: ["noktalar", "points"],
  leveling: ["nivelman", "leveling"],
  gnss: ["gnss"],
  params: ["parametreler", "params", "parametre"],
  classes: ["dogrulukSiniflari", "dogruluksiniflari", "siniflar", "classes"],
  routes: ["devreler", "routes"],
};

function ioNormalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/σ/g, "sigma")
    .replace(/δ/g, "d")
    .replace(/[ıİ]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

function ioFindKey(rowObj, aliases) {
  const normalizedMap = {};
  Object.keys(rowObj).forEach((k) => (normalizedMap[ioNormalizeHeader(k)] = k));
  for (const alias of aliases) {
    const norm = ioNormalizeHeader(alias);
    if (norm in normalizedMap) return normalizedMap[norm];
  }
  return null;
}

function ioGetField(row, aliases, { number = false } = {}) {
  const key = ioFindKey(row, aliases);
  if (key === null) return null;
  const raw = row[key];
  if (raw === undefined || raw === null || raw === "") return null;
  if (number) {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return String(raw).trim();
}

function ioParsePointsRows(rows) {
  return rows
    .map((row, i) => {
      const name = ioGetField(row, ["nokta", "noktaadi", "ad", "name", "point", "id"]) ?? `P${i + 1}`;
      const typeRaw = (ioGetField(row, ["tur", "tip", "type"]) || "").toLowerCase();
      const type = /sabit|mesnet|fixed|bilinen/.test(typeRaw) ? "fixed" : "unknown";
      const height = ioGetField(row, ["z", "kot", "yukseklik", "h", "height"], { number: true });
      const y = ioGetField(row, ["y", "dogu", "easting"], { number: true });
      const x = ioGetField(row, ["x", "kuzey", "northing"], { number: true });
      return { name, type, height, y, x };
    })
    .filter((p) => p.name);
}

function ioParseLevelingRows(rows) {
  return rows
    .map((row) => ({
      from: ioGetField(row, ["kalkis", "kalkisnoktasi", "from", "baslangic"]),
      to: ioGetField(row, ["varis", "varisnoktasi", "to", "bitis"]),
      dh: ioGetField(row, ["dh", "yukseklikfarki", "kotfarki", "deltah"], { number: true }),
      dist: ioGetField(row, ["mesafe", "mesafekm", "uzunluk", "distancekm", "s"], { number: true }),
      sigma: ioGetField(row, ["sigma", "sigmam", "standartsapma"], { number: true }),
    }))
    .filter((o) => o.from && o.to);
}

function ioParseGnssRows(rows) {
  return rows
    .map((row) => ({
      point: ioGetField(row, ["nokta", "point", "ad"]),
      h: ioGetField(row, ["h", "elipsoidalyukseklik", "ellipsoidalheight"], { number: true }),
      N: ioGetField(row, ["n", "jeoidondulasyonu", "geoidundulation", "ondulasyon"], { number: true }),
      sigma: ioGetField(row, ["sigma", "sigmam", "standartsapma"], { number: true }),
    }))
    .filter((o) => o.point);
}

function ioParseParamsRows(rows) {
  const params = {};
  rows.forEach((row) => {
    const key = (ioGetField(row, ["parametre", "param", "ad", "name"]) || "").toLowerCase();
    const val = ioGetField(row, ["deger", "value"], { number: true });
    if (val === null) return;
    if (/^k$|hassasiyet/.test(key)) params.k = val;
    else if (/sigmagnss|gnss/.test(key)) params.sigmaGnss = val;
  });
  return params;
}

function ioParseClassesRows(rows) {
  const classes = [];
  let activeIndex = 0;
  rows.forEach((row, i) => {
    const name = ioGetField(row, ["sinifadi", "sinif", "ad", "name"]) ?? `Sınıf ${i + 1}`;
    const closureCoeff = ioGetField(row, ["kapanmakatsayisi", "closurecoeff", "katsayi"], { number: true }) ?? 8;
    const gnssMaxSigmaMm = ioGetField(row, ["gnsssigmasiniri", "gnssmaxsigmamm", "gnsssinir"], { number: true }) ?? 20;
    const pointMaxStdevMm = ioGetField(row, ["noktasigmasiniri", "pointmaxstdevmm", "noktasinir"], { number: true }) ?? 10;
    const activeRaw = (ioGetField(row, ["aktif", "active"]) || "").toLowerCase();
    if (/evet|yes|1|true/.test(activeRaw)) activeIndex = i;
    classes.push({ name, closureCoeff, gnssMaxSigmaMm, pointMaxStdevMm });
  });
  return { classes, activeIndex };
}

function ioParseRoutesRows(rows) {
  return rows
    .map((row, i) => ({
      name: ioGetField(row, ["ad", "devreadi", "name"]) ?? `Devre ${i + 1}`,
      path: ioGetField(row, ["yol", "noktayolu", "path"]) ?? "",
    }))
    .filter((d) => d.path);
}

function ioReadWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(XLSX.read(new Uint8Array(e.target.result), { type: "array" }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Dosya okunamadı."));
    reader.readAsArrayBuffer(file);
  });
}

function ioFindSheet(wb, aliases) {
  for (const alias of aliases) {
    const hit = wb.SheetNames.find((n) => ioNormalizeHeader(n) === ioNormalizeHeader(alias));
    if (hit) return wb.Sheets[hit];
  }
  return null;
}

function ioSheetRows(ws) {
  return ws ? XLSX.utils.sheet_to_json(ws, { defval: null, raw: true }) : [];
}

async function ioImportWorkbook(file) {
  const wb = await ioReadWorkbookFile(file);
  const pointsWs = ioFindSheet(wb, IO_SHEET_ALIASES.points) || wb.Sheets[wb.SheetNames[0]];
  const points = ioParsePointsRows(ioSheetRows(pointsWs));
  if (points.length === 0) {
    throw new Error("Excel dosyasında geçerli bir 'Noktalar' sayfası bulunamadı ya da sayfa boş.");
  }

  const leveling = ioParseLevelingRows(ioSheetRows(ioFindSheet(wb, IO_SHEET_ALIASES.leveling)));
  const gnss = ioParseGnssRows(ioSheetRows(ioFindSheet(wb, IO_SHEET_ALIASES.gnss)));
  const params = ioParseParamsRows(ioSheetRows(ioFindSheet(wb, IO_SHEET_ALIASES.params)));
  const classesWs = ioFindSheet(wb, IO_SHEET_ALIASES.classes);
  const classesParsed = classesWs ? ioParseClassesRows(ioSheetRows(classesWs)) : null;
  const routes = ioParseRoutesRows(ioSheetRows(ioFindSheet(wb, IO_SHEET_ALIASES.routes)));

  return { points, leveling, gnss, params, classesParsed, routes };
}

function ioBuildWorkbookFromState(state) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.points.map((p) => ({
        Nokta: p.name,
        Tür: p.type === "fixed" ? "Sabit" : "Bilinmeyen",
        "Y (Doğu)": p.y ?? "",
        "X (Kuzey)": p.x ?? "",
        "Z (Kot)": p.height ?? "",
      }))
    ),
    "Noktalar"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.leveling.map((o) => ({
        Kalkış: o.from,
        Varış: o.to,
        "Δh (m)": o.dh,
        "Mesafe S (km)": o.dist,
        "σ (m)": o.sigma ?? "",
      }))
    ),
    "Nivelman"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.gnss.map((o) => ({
        Nokta: o.point,
        "h (m)": o.h,
        "N (m)": o.N,
        "σ (m)": o.sigma ?? "",
      }))
    ),
    "GNSS"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Parametre: "k", Değer: state.params.k },
      { Parametre: "sigmaGnss", Değer: state.params.sigmaGnss },
    ]),
    "Parametreler"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.accuracyClasses.map((c, i) => ({
        "Sınıf Adı": c.name,
        "Kapanma Katsayısı (mm/√km)": c.closureCoeff,
        "GNSS σ Sınırı (mm)": c.gnssMaxSigmaMm,
        "Nokta σ Sınırı (mm)": c.pointMaxStdevMm,
        Aktif: i === state.activeClassIndex ? "Evet" : "Hayır",
      }))
    ),
    "DogrulukSiniflari"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(state.devreler.map((d) => ({ Ad: d.name, Yol: d.path }))),
    "Devreler"
  );

  return wb;
}

function ioDownloadTemplate() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nokta", "Tür", "Y (Doğu)", "X (Kuzey)", "Z (Kot)"],
      ["RP1", "Sabit", 548250, 4487600, 4.235],
      ["N1", "Bilinmeyen", 548500, 4486800, ""],
    ]),
    "Noktalar"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Kalkış", "Varış", "Δh (m)", "Mesafe S (km)", "σ (m)"],
      ["RP1", "N1", 5.395, 0.84, ""],
    ]),
    "Nivelman"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nokta", "h (m)", "N (m)", "σ (m)"],
      ["N1", 50.43, 32.6, ""],
    ]),
    "GNSS"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Parametre", "Değer"],
      ["k", 0.003],
      ["sigmaGnss", 0.02],
    ]),
    "Parametreler"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Sınıf Adı", "Kapanma Katsayısı (mm/√km)", "GNSS σ Sınırı (mm)", "Nokta σ Sınırı (mm)", "Aktif"],
      ["II. Derece Nivelman", 8, 20, 10, "Evet"],
    ]),
    "DogrulukSiniflari"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Ad", "Yol"],
      ["Hat-1", "RP1,N1"],
    ]),
    "Devreler"
  );
  XLSX.writeFile(wb, "nivelman-sablon.xlsx");
}
