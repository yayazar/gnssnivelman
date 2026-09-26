// Excel (.xlsx/.xls/.csv) içe/dışa aktarma ve şablon oluşturma.
// SheetJS (js/vendor/xlsx.full.min.js) kütüphanesini kullanır; tamamen
// istemci tarafında çalışır, hiçbir veri sunucuya gönderilmez.
//
// Uygulamanın TEK girdisi Noktalar listesidir (Nokta, Tür, Y, X, h, H); GNSS
// elipsoidal yükseklik (h) ve jeoit ondülasyonu (N) enterpolasyonu ile
// hesap tamamen bu listeden otomatik türetilir (bkz. app.js, adjustment.js).

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

// "h" (elipsoidal) ve "H" (bilinen ortometrik), normalize edildiğinde
// (küçük harfe çevrildiğinde) birbirinden ayırt edilemez hale gelir. Bu
// yüzden önce sütun başlığının HAM (büyük/küçük harf duyarlı) haline göre
// bire bir "h"/"H" eşleşmesi aranır — bu, sahada yaygın kullanılan kısa
// başlık biçimidir. Eşleşmezse, daha açıklayıcı takma adlarla (aşağıda)
// genel (harf duyarsız) eşleştirmeye geri dönülür.
function ioGetRawExactColumn(row, exact) {
  const key = Object.keys(row).find((k) => String(k).trim() === exact);
  return key ? row[key] : undefined;
}

function ioToNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function ioParsePointsRows(rows) {
  return rows
    .map((row, i) => {
      const name = ioGetField(row, ["nokta", "noktaadi", "ad", "name", "point", "id"]) ?? `P${i + 1}`;
      const typeRaw = (ioGetField(row, ["tur", "tip", "type"]) || "").toLowerCase();
      const type = /sabit|mesnet|fixed|rs/.test(typeRaw) ? "fixed" : "unknown";

      const hRaw = ioGetRawExactColumn(row, "h");
      const h = hRaw !== undefined ? ioToNumber(hRaw) : ioGetField(row, ["h", "elipsoidal", "ellipsoidal", "gnss"], { number: true });

      const HRaw = ioGetRawExactColumn(row, "H");
      const H =
        HRaw !== undefined
          ? ioToNumber(HRaw)
          : ioGetField(row, ["hbilinen", "hresmi", "ortometrik", "orthometric", "kot", "z"], { number: true });

      const y = ioGetField(row, ["y", "dogu", "easting"], { number: true });
      const x = ioGetField(row, ["x", "kuzey", "northing"], { number: true });
      return { name, type, h, H, y, x };
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
        h: p.h ?? "",
        H: p.type === "fixed" ? p.H ?? "" : "",
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
      ["Nokta", "Tür", "Y (Doğu)", "X (Kuzey)", "h", "H"],
      ["RS1", "Sabit", 548000, 4480000, 117.1198, 80.6],
      ["RS2", "Sabit", 556000, 4480500, 134.3617, 97.9],
      ["RS3", "Sabit", 555500, 4486000, 72.3838, 35.9],
      ["N1", "Bilinmeyen", 550200, 4481200, 107.9602, ""],
    ]),
    "Noktalar"
  );
  XLSX.writeFile(wb, "gnss-nivelman-sablon.xlsx");
}
