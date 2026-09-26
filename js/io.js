// Excel (.xlsx/.xls/.csv) içe/dışa aktarma ve şablon oluşturma.
// SheetJS (js/vendor/xlsx.full.min.js) kütüphanesini kullanır; tamamen
// istemci tarafında çalışır, hiçbir veri sunucuya gönderilmez.
//
// Uygulamanın TEK girdisi Noktalar listesidir (Nokta, Tür, Y, X, Z ve isteğe
// bağlı GNSS h/N); nivelman ölçüleri, hatlar ve dengeleme tamamen bu
// listeden otomatik türetilir (bkz. app.js).

const IO_POINTS_SHEET_ALIASES = ["noktalar", "points"];

function ioNormalizeHeader(h) {
  return String(h ?? "")
    .trim()
    // Sondaki parantezli birim/etiket kısmını at, ör. "Y (Doğu)" -> "Y",
    // "h (GNSS, opsiyonel)" -> "h". Böylece kısa takma adlar, dışa aktarılan
    // başlıklarla (birimler dahil) yeniden BİREBİR eşleşir.
    .replace(/\s*\([^)]*\)\s*$/, "")
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
  const entries = Object.keys(rowObj).map((k) => [ioNormalizeHeader(k), k]);
  // 1) Birebir eşleşme (yukarıdaki birim/etiket temizliğinden sonra).
  for (const alias of aliases) {
    const normAlias = ioNormalizeHeader(alias);
    const hit = entries.find(([norm]) => norm === normAlias);
    if (hit) return hit[1];
  }
  // 2) Alt dize eşleşmesi: örn. "Mesafe S (km)" -> "mesafes" gibi, birim
  // parantezinden önce başka bir kelime/sembol daha barındıran başlıklar
  // için yedek. Yanlış eşleşmeyi önlemek için yalnızca 3+ karakterlik
  // takma adlarda uygulanır.
  for (const alias of aliases) {
    const normAlias = ioNormalizeHeader(alias);
    if (normAlias.length < 3) continue;
    const hit = entries.find(([norm]) => norm.includes(normAlias));
    if (hit) return hit[1];
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
      const height = ioGetField(row, ["z", "kot", "yukseklik", "height"], { number: true });
      const y = ioGetField(row, ["y", "dogu", "easting"], { number: true });
      const x = ioGetField(row, ["x", "kuzey", "northing"], { number: true });
      const h = ioGetField(row, ["h", "elipsoidalyukseklik", "ellipsoidalheight"], { number: true });
      const N = ioGetField(row, ["n", "jeoidondulasyonu", "geoidundulation", "ondulasyon"], { number: true });
      return { name, type, height, y, x, h, N };
    })
    .filter((p) => p.name);
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
  const pointsWs = ioFindSheet(wb, IO_POINTS_SHEET_ALIASES) || wb.Sheets[wb.SheetNames[0]];
  const points = ioParsePointsRows(ioSheetRows(pointsWs));
  if (points.length === 0) {
    throw new Error("Excel dosyasında geçerli bir 'Noktalar' sayfası bulunamadı ya da sayfa boş.");
  }
  return { points };
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
        "h (GNSS, opsiyonel)": p.h ?? "",
        "N (GNSS, opsiyonel)": p.N ?? "",
      }))
    ),
    "Noktalar"
  );
  return wb;
}

function ioDownloadTemplate() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nokta", "Tür", "Y (Doğu)", "X (Kuzey)", "Z (Kot)", "h (GNSS, opsiyonel)", "N (GNSS, opsiyonel)"],
      ["RP1", "Sabit", 548250, 4487600, 4.235, "", ""],
      ["N1", "Bilinmeyen", 548500, 4486800, 9.63, "", ""],
      ["N2", "Bilinmeyen", 548950, 4485950, 17.865, 50.45, 32.6],
      ["RP2", "Sabit", 549600, 4482900, 63.87, "", ""],
    ]),
    "Noktalar"
  );
  XLSX.writeFile(wb, "nivelman-sablon.xlsx");
}
