# GNSS Jeodezik Nivelman Ağı Dengelemesi

Tek girdi olarak bir **nokta listesi** (Y, X, Z ve isteğe bağlı GNSS h/N)
alan; nivelman ölçülerini, hatları, en küçük kareler dengelemesini ve
kroki/profil görselleştirmesini bu listeden tamamen otomatik türeten,
tarayıcıda çalışan istemci taraflı bir web uygulaması. Sunucu gerektirmez
ve internet bağlantısı olmadan da çalışır; Excel içe/dışa aktarma için
kullanılan tek üçüncü parti kütüphane (SheetJS) dahi yerel olarak
paketlenmiştir. Tüm hesap JavaScript ile tarayıcıda yapılır, veri hiçbir
zaman bir sunucuya gönderilmez.

## Kullanım

`index.html` dosyasını bir tarayıcıda açmanız yeterlidir (veya basit bir
statik dosya sunucusu ile servis edebilirsiniz, örn. `python3 -m http.server`).

**Noktalar** tablosu, uygulamadaki TEK elle düzenlenebilir tablodur:

1. Her satıra bir nokta girin: **Nokta adı**, **Tür** (Sabit/Bilinmeyen),
   **Y** (Doğu), **X** (Kuzey), **Z** (Kot) ve isteğe bağlı **h**/**N**
   (GNSS elipsoidal yükseklik / jeoit ondülasyonu).
2. Sabit (mesnet) noktalarda Z, bilinen kesin yüksekliktir ve dengelemede
   değişmeyen referans olarak kullanılır. Diğer noktalarda Z, saha kotudur.
3. **Noktaların sırası güzergahı belirler**: listede ardışık her nokta
   çifti arasında otomatik bir nivelman ölçüsü üretilir (Δh = Z farkı,
   mesafe = Y/X koordinatlarından düz hat). Ardışık iki sabit nokta
   arasındaki bölüm otomatik olarak bir "hat" sayılır.
4. Bir noktada hem h hem N girilmişse, o nokta için bağımsız bir GNSS
   ölçüsü (`H = h − N`) otomatik olarak dengelemeye eklenir.

Excel/CSV ile kendi nokta listenizi içe aktarabilir ("Proje" araç çubuğu),
şablonu indirebilir, sonucu dışa aktarabilir ya da örnek veriyle
başlayabilirsiniz. **Nivelman ölçüleri, hatlar, dengeleme ve kroki dahil
her şey otomatiktir** — Noktalar tablosu dışında elle müdahale gerektiren
başka bir menü yoktur; ayrı bir "Hesapla" adımı da yoktur, sayfa ilk
açıldığında ve her değişiklikte dengeleme kendiliğinden yeniden çalışır
(bkz. "⟳/✓ Dengeleme otomatik olarak hesaplanır/güncellendi" göstergesi).

## Yöntem

Dengeleme, **dolaylı ölçüler (parametrik) yöntemi** ile en küçük kareler
prensibine göre yapılır.

**Bilinmeyenler:** sabit olmayan noktaların ortometrik yükseklikleri.

**Otomatik türetilen ölçü denklemleri:**

- Nivelman ölçüsü (Noktalar listesindeki her ardışık çift için):
  `H_varış − H_kalkış = Δh_ölçü`, `Δh_ölçü = Z_varış − Z_kalkış`,
  ağırlık `w = 1/σ²`, `σ = k·√S` (S: Y/X'ten hesaplanan km cinsinden mesafe,
  k sabit bir varsayılan katsayıdır, bkz. "Sabitler" altında).
- GNSS sözde ölçüsü (h VE N birlikte girilen her nokta için):
  `H_nokta = h − N`, ağırlık `w = 1/σ_GNSS²`.

Tüm ölçü denklemleri `A x = l` biçiminde birleştirilir ve normal denklemler
`N = AᵀPA`, `n = AᵀPl` kurularak `x̂ = N⁻¹n` çözülür (P: köşegen ağırlık
matrisi).

**İstatistiksel değerlendirme:**

- Kalanlar: `v = A x̂ − l`
- Birim ağırlıklı ölçü hatası (a posteriori varyans faktörü):
  `σ₀² = (vᵀPv) / (n_ölçü − u_bilinmeyen)`
- Bilinmeyenlerin kovaryans matrisi: `Cxx = σ₀² · N⁻¹`
- Her nokta için standart sapma: `σ_H = √Cxx[i][i]`
- %95 güven aralığı: `H ± 1.96·σ_H`
- Normalleştirilmiş kalanlar (`v·√w`) mutlak değerce 2'den büyükse uyarı,
  3'ten büyükse olası kaba hata olarak işaretlenir.

### Önemli matematiksel sınırlama: neden GNSS olmadan "dengeleme" bir şey değiştirmez

Δh her zaman iki komşu noktanın KENDİ girilen Z'lerinin farkından
türetildiği için, bir nivelman ölçüsünün bir ucu sabitse, o kenarın
denklemi cebirsel olarak `H_bilinmeyen = Z_bilinmeyen` şeklinde sadeleşir
(sabit noktanın değeri denklemden sadeleşerek çıkar). Aynı şekilde, iki
sabit nokta arasındaki bütün bir hat boyunca ardışık farkların toplamı,
ara noktaların değerlerinden bağımsız olarak **matematiksel bir özdeşlikle**
her zaman iki ucun Z farkına eşit çıkar (teleskopik toplam). Bu, sadece bu
uygulamaya özgü bir kısıtlama değil, **tek bir Z değeri + ardışık farklarla
tanımlanan herhangi bir sistemin kaçınılmaz cebirsel sonucudur**: gerçek bir
hata tespiti/dengeleme için bağımsız/fazla ölçü gerekir, ve tek bir sıralı
nokta listesi (dallanma ya da tekrar ölçü olmadan) böyle bir fazlalık
içermez.

**Sonuç:** GNSS (h, N) verisi girilmeyen bir ağda dengeleme, girdiğiniz Z
değerlerini neredeyse aynen yansıtır (arayüzde bu durumda bir uyarı notu
gösterilir). Ağınızda gerçek bir bağımsız kontrol/düzeltme istiyorsanız,
en azından bazı noktalara GNSS h/N girin — bu, nivelman zincirinden tamamen
bağımsız bir ikinci ölçüm kaynağı olduğu için gerçek bir dengeleme/hata
tespiti sağlar (yukarıdaki GNSS kalanları tablosunda görülebilir).

### Sabitler

Nivelman hassasiyet katsayısı (`k = 0.003` m/√km) ve varsayılan GNSS
standart sapması (`σ_GNSS = 0.02` m), basitlik için `js/app.js` dosyasının
başındaki `DEFAULT_K` / `DEFAULT_SIGMA_GNSS` sabitleri olarak kodlanmıştır
(arayüzde düzenlenmez). Farklı bir yönetmelik/hassasiyet düzeyi
kullanmanız gerekiyorsa bu sabitleri kaynak koddan değiştirin.

## Excel içe/dışa aktarma

- **Şablonu İndir**: Beklenen sütun başlıklarını gösteren örnek bir `.xlsx`
  dosyası indirir.
- **Excel'den İçe Aktar**: `.xlsx`, `.xls` veya `.csv` dosyası yükleyin.
  Yalnızca bir "Noktalar" sayfası/tablosu beklenir: **Nokta**, **Tür**
  (Sabit/Bilinmeyen), **Y (Doğu)**, **X (Kuzey)**, **Z (Kot)** ve isteğe
  bağlı **h**, **N**. Sütun başlıkları Türkçe karakter/boşluk/birim
  farklarına (`Nokta`/`Ad`/`Point`, `Tür`/`Tip`/`Type`, `Z`/`Kot`/
  `Yükseklik` vb.) karşı toleranslıdır; sıra önemli değildir. İçe aktarma,
  mevcut nokta listesinin **tamamının yerine geçer**.
- **Excel Olarak Dışa Aktar**: O anki nokta listesini bir `.xlsx` dosyasına
  yazar — saklamak, paylaşmak ya da başka bir oturumda geri yüklemek için
  kullanılabilir.
- **Örnek Veriyi Yükle (Rize)** / **Tümünü Temizle**: Sırasıyla dahili test
  verisini geri yükler ya da nokta listesini boşaltarak sıfırdan başlamayı
  sağlar.

**Doğruluk güvencesi:** Dengeleme motoru (`js/adjustment.js`), veri hangi
yoldan geldiğine bakılmaksızın (örnek veri, elle giriş ya da Excel içe
aktarma) hesaba başlamadan önce girdileri doğrular — sabit bir noktanın
yüksekliği eksikse ya da bir Δh/GNSS ölçüsü geçersizse, hesap sessizce
yanlış/`NaN` bir sonuç üretmez; açık ve nokta/ölçü adını belirten bir hata
verir.

## Dengelenmiş noktaları indirme

Sonuçlar bölümündeki "TXT", "CSV", "NCN (NetCAD)" butonları, dengeleme
sonrası TÜM noktaların (sabit + dengeli bilinmeyen) nihai Y, X, Z
değerlerini içeren bir dosya indirir:

- **CSV**: `Nokta,Tur,Y,X,Z` başlıklı, virgülle ayrılmış.
- **TXT**: Sekmeyle ayrılmış düz metin (`Nokta  Y  X  Z`).
- **NCN**: NetCAD "Nokta Cetveli" biçimi — başlıksız,
  `NoktaNo,Y,X,Z,Kod` düzeninde virgülle ayrılmış satırlar.

## Görselleştirme (otomatik)

- **Ölçekli ağ krokisi**: Noktalar arasındaki gerçek mesafeyle orantılı
  (ölçekli) plan görünüşü. Ölçü çizgisi rengi, dengeleme sonrası
  normalleştirilmiş kalana göre uygun (yeşil) / uyarı (turuncu) / kritik
  (kırmızı) olarak kodlanır; ölçek çubuğu, kuzey oku ve lejant içerir;
  nokta ve çizgiler üzerine gelindiğinde ayrıntı gösterir.
- **Yükseklik profili**: Sabit noktalar kare, bilinmeyen (dengeli) noktalar
  %95 güven aralığı çubuğuyla birlikte daire olarak gösterilir.

## Dosya yapısı

```
index.html          Arayüz (HTML) — tek düzenlenebilir tablo: Noktalar
css/style.css        Görsel stil
js/matrix.js         Genel matris işlemleri (çarpım, transpoz, Gauss-Jordan tersi)
js/adjustment.js      Dengeleme hesap motoru (en küçük kareler)
js/viz.js             Ölçekli ağ krokisi ve yükseklik profili SVG görselleştirmeleri
js/io.js              Excel içe/dışa aktarma ve şablon oluşturma (SheetJS üzerine)
js/vendor/            SheetJS (xlsx) kütüphanesi — yerel, üçüncü parti (Apache-2.0)
js/app.js             Nokta listesinden otomatik ölçü/hat türetme, dengeleme tetikleme,
                      arayüz durumu ve sonuç indirme
```

## Notlar / sınırlamalar

- Güven aralıkları normal dağılım varsayımı ile (z = 1.96) hesaplanır;
  küçük serbestlik derecelerinde t-dağılımı daha uygun olabilir.
- "Otomatik hatlar" raporu yalnızca bilgi amaçlıdır (hat uzunluğu, toplam
  Δh); bir kapanma hatası/tolerans karşılaştırması İFADE ETMEZ — yukarıdaki
  "Önemli matematiksel sınırlama" bölümünde açıklanan nedenle, yalnızca
  Z'den türetilen bir hat için böyle bir kontrol anlamsız olurdu.
- Sabit bir noktada girilen GNSS (h, N) verisi yalnızca bilgi amaçlıdır,
  dengelemeye katılmaz (yalnızca bilinmeyen noktalarda katılır).
- Bu araç eğitim ve ön değerlendirme amaçlıdır; resmi jeodezik üretimlerde
  ilgili ulusal standartlar ve yönetmeliklerin güncel ve resmi metni esas
  alınmalıdır.
