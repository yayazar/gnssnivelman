// EPSG kodundan proj4 tanım dizesi üretir — yalnızca haritada (OpenStreetMap
// altlığı üzerinde) noktaların GERÇEK konumunu göstermek içindir; hesaplanan
// H değerlerini ETKİLEMEZ (o hesap her zaman girilen Y/X'in düz/projeksiyonlu
// metre koordinatları olduğu varsayımıyla yapılır).
//
// En yaygın durumları (WGS84 UTM ve ED50 UTM dilimleri) EPSG kod aralığına
// göre GENEL FORMÜLLE üretir; TUREF/ITRF koordinatları harita gösterimi için
// pratikte WGS84 ile aynı kabul edilir (aradaki fark santimetre mertebesinde
// olup harita ölçeğinde görünmez). Bu, tam bir EPSG kayıt veritabanı değildir
// — desteklenmeyen bir kod girilirse açık bir hata verir.

const TUREF_ZONE_MERIDIANS = { 5253: 27, 5254: 30, 5255: 33, 5256: 36, 5257: 39, 5258: 42 };

// EPSG kodunu tanır ve { proj4Def, name } döner; tanınmayan bir kod için null.
function resolveEpsg(code) {
  if (code === 4326) {
    // WGS84 coğrafi — bu durumda Y=boylam, X=enlem girildiği varsayılır.
    return { proj4Def: "+proj=longlat +datum=WGS84 +no_defs", name: "WGS84 coğrafi (Enlem/Boylam)" };
  }
  // WGS84 UTM — kuzey yarımküre (326xx: zone 01–60)
  if (code >= 32601 && code <= 32660) {
    const zone = code - 32600;
    return { proj4Def: `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, name: `WGS84 / UTM ${zone}N` };
  }
  // WGS84 UTM — güney yarımküre (327xx)
  if (code >= 32701 && code <= 32760) {
    const zone = code - 32700;
    return {
      proj4Def: `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`,
      name: `WGS84 / UTM ${zone}S`,
    };
  }
  // ED50 UTM (230xx, Avrupa/Türkiye'de yaygın eski dilimler) — ED50→WGS84
  // için yaklaşık 3 parametreli (Molodensky-Badekas) dönüşüm katsayıları
  // kullanılır; santimetre değil metre mertebesinde bir yaklaşıklıktır,
  // yalnızca harita gösterimi için yeterlidir.
  if (code >= 23028 && code <= 23038) {
    const zone = code - 23000;
    return {
      proj4Def: `+proj=utm +zone=${zone} +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs`,
      name: `ED50 / UTM ${zone}N`,
    };
  }
  // TUREF / ITRF tabanlı Türkiye Ulusal TM dilimleri (5253–5258, 3 derecelik
  // dilimler) — WGS84 ile pratikte özdeş kabul edilir (bkz. yukarıdaki not).
  if (code in TUREF_ZONE_MERIDIANS) {
    const lon0 = TUREF_ZONE_MERIDIANS[code];
    return {
      proj4Def: `+proj=tmerc +lat_0=0 +lon_0=${lon0} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`,
      name: `TUREF / TM${lon0}`,
    };
  }
  return null;
}

function epsgToProj4Def(codeInput) {
  const digits = String(codeInput ?? "").replace(/[^0-9]/g, "");
  const code = Number(digits);
  if (!Number.isFinite(code)) {
    throw new Error(`Geçersiz EPSG kodu: "${codeInput}". Sayısal bir EPSG kodu girin (ör. 32637).`);
  }
  const resolved = resolveEpsg(code);
  if (!resolved) {
    throw new Error(
      `Desteklenmeyen EPSG kodu: ${code}. Desteklenenler: 4326 (WGS84 coğrafi), ` +
        "32601–32660 / 32701–32760 (WGS84 UTM), 23028–23038 (ED50 UTM), " +
        "5253–5258 (TUREF/TM dilimleri)."
    );
  }
  return resolved.proj4Def;
}

// Girilen EPSG kodunun okunabilir adını döner (ör. "WGS84 / UTM 37N"),
// tanınmıyorsa null — arayüzde canlı geri bildirim göstermek için kullanılır.
function epsgDisplayName(codeInput) {
  const digits = String(codeInput ?? "").replace(/[^0-9]/g, "");
  const code = Number(digits);
  if (!Number.isFinite(code) || digits === "") return null;
  const resolved = resolveEpsg(code);
  return resolved ? resolved.name : null;
}

// [Y (Doğu/easting), X (Kuzey/northing)] → [boylam, enlem] (WGS84, derece).
function projectToWgs84(epsgCode, y, x) {
  const def = epsgToProj4Def(epsgCode);
  if (Number(String(epsgCode).replace(/[^0-9]/g, "")) === 4326) {
    return [y, x];
  }
  return proj4(def, "EPSG:4326", [y, x]);
}
