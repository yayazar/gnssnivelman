# GNSS Nivelmanı — Jeoit Enterpolasyonu

Klasik **GNSS destekli nivelman** iş akışını uygulayan, tek girdi olarak bir
**nokta listesi** alan, tarayıcıda çalışan istemci taraflı bir web
uygulaması. Sunucu gerektirmez ve internet bağlantısı olmadan da çalışır;
Excel içe/dışa aktarma için kullanılan tek üçüncü parti kütüphane (SheetJS)
dahi yerel olarak paketlenmiştir. Tüm hesap JavaScript ile tarayıcıda
yapılır, veri hiçbir zaman bir sunucuya gönderilmez.

## Yöntem: GNSS + jeoit ondülasyonu enterpolasyonu

1. **Ağ tasarımı**: Koordinatları ve ortometrik yüksekliği (H) kesin bilinen
   en az 3, tercihen 4+ **RS (röper/nivelman) noktası** seçilir. Bu
   noktaların, GNSS ölçümü yapılacak çalışma alanını geometrik olarak
   çevrelemesi gerekir (aksi halde jeoit yüzeyi modeli güvenilir olmaz).
2. **GNSS ölçümü**: Hem RS noktalarında hem de yüksekliği belirlenecek yeni
   noktalarda GNSS ile elipsoidal yükseklik (**h**) ölçülür.
3. **Jeoit ondülasyonu**: RS noktalarında h ve bilinen H'den
   `N = h − H` hesaplanır.
4. **Yüzey modeli (enterpolasyon)**: RS noktalarındaki N değerlerine bir
   eğik düzlem en küçük kareler ile oturtulur:
   ```
   N(Y, X) = a + b·Y + c·X
   ```
   (Normal denklemler kurulup 3×3 sistem çözülerek a, b, c bulunur.)
5. **Hesaplama**: Her yeni noktanın konumundaki N, bu düzlemden enterpole
   edilir ve ortometrik yükseklik `H = h − N(Y, X)` ile hesaplanır.

**Neden düzlem (plane) ve neden en az 3 RS noktası?** Bir düzlem denklemi
3 katsayı (a, b, c) içerir; bunları belirlemek için en az 3 bağımsız
(Y, X, N) üçlüsü gerekir. RS noktaları aynı doğru üzerinde veya çakışıksa
sistem belirsiz kalır ve uygulama açık bir hata ile bunu bildirir.

### İstatistiksel değerlendirme (dolaylı ölçüler yöntemi)

Düzlem, RS noktalarındaki N ölçülerine **dolaylı ölçüler (parametrik)
yöntemiyle** en küçük kareler ile oturtulur:

- Kalanlar: `v = N_ölçülen − N_düzlem`
- Birim ağırlıklı ölçü hatası (a posteriori varyans faktörü):
  `σ₀² = (vᵀv) / (n − 3)` (n: RS nokta sayısı; `n − 3` fazla ölçü sayısıdır)
- Düzlem parametrelerinin (a, b, c) kovaryans matrisi: `Cxx = σ₀² · N⁻¹`
  (N: normal denklemler matrisi `AᵀA`)
- **Hata yayılma kanunu**: herhangi bir (Y, X) konumundaki N tahmininin
  varyansı `Var[N(Y,X)] = fᵀ·Cxx·f`, `f = [1, Y, X]ᵀ`
- Her yeni noktanın H'sindeki standart sapma: `σ_H = √Var[N(Y,X)]`
  (GNSS h ölçümünün kendi hatası ayrıca modellenmemiştir; bu yalnızca jeoit
  düzlemi modelinin kesinliğini yansıtır)
- %95 güven aralığı: `H ± 1.96·σ_H`

Bu, **kaba bir yaklaşım değil, gerçek bir kovaryans analizidir**: RS
noktalarının merkezine yakın yeni noktalarda σ_H küçük çıkar; merkeze uzak
ya da RS noktalarının çevrelediği alanın DIŞINDAKİ (ekstrapolasyon yapılan)
noktalarda σ_H belirgin şekilde büyür — bu, ekstrapolasyonun neden daha az
güvenilir olduğunu sayısal olarak da gösterir. Tam olarak 3 RS noktası
varsa fazla ölçü olmadığından (`n − 3 = 0`) σ₀ ve dolayısıyla σ_H
istatistiksel olarak hesaplanamaz; bu durumda arayüzde "—" gösterilir ve en
az 4 RS noktası kullanılması önerilir.

## Kullanım

`index.html` dosyasını bir tarayıcıda açmanız yeterlidir (veya basit bir
statik dosya sunucusu ile servis edebilirsiniz, örn. `python3 -m http.server`).

**Noktalar** tablosu, uygulamadaki TEK elle düzenlenebilir tablodur:

1. Her satıra bir nokta girin: **Nokta adı**, **Tür** (Sabit/RS ya da
   Bilinmeyen/yeni), **Y** (Doğu), **X** (Kuzey), **h** (GNSS ile ölçülen
   elipsoidal yükseklik).
2. **Sabit (RS)** noktalarda ayrıca **H** (bilinen ortometrik yükseklik)
   girilir; bu alan bilinmeyen (yeni) noktalarda devre dışıdır (otomatik
   hesaplanır).
3. Noktaları girdikten/düzenledikten sonra tablonun altındaki **Hesapla**
   butonuna basın. Sonuçlar yalnızca bu butona bastığınızda, o an tabloda
   görünen verilere göre yeniden hesaplanır.

Excel/CSV ile kendi nokta listenizi içe aktarabilir ("Proje" araç çubuğu),
şablonu indirebilir, sonucu dışa aktarabilir ya da örnek veriyle
başlayabilirsiniz.

## Excel içe/dışa aktarma

- **Şablonu İndir**: Beklenen sütun başlıklarını gösteren örnek bir `.xlsx`
  dosyası indirir.
- **Excel'den İçe Aktar**: `.xlsx`, `.xls` veya `.csv` dosyası yükleyin.
  Yalnızca bir "Noktalar" sayfası/tablosu beklenir: **Nokta**, **Tür**
  (Sabit/RS ya da Bilinmeyen), **Y (Doğu)**, **X (Kuzey)**, **h**, **H**.
  Sütun başlıkları için önce tam olarak `h` / `H` (büyük/küçük harf duyarlı,
  sahada yaygın kısa biçim) aranır; bulunamazsa `Elipsoidal`/`GNSS`
  (h için) ve `Ortometrik`/`Kot`/`Bilinen H` (H için) gibi daha açıklayıcı
  başlıklara harf duyarsız olarak geri dönülür. İçe aktarma, mevcut nokta
  listesinin **tamamının yerine geçer**.
- **Excel Olarak Dışa Aktar**: O anki nokta listesini bir `.xlsx` dosyasına
  yazar — saklamak, paylaşmak ya da başka bir oturumda geri yüklemek için
  kullanılabilir.
- **Örnek Veriyi Yükle (Rize)** / **Tümünü Temizle**: Sırasıyla dahili test
  verisini geri yükler ya da nokta listesini boşaltarak sıfırdan başlamayı
  sağlar.

**Doğruluk güvencesi:** Hesap motoru (`js/adjustment.js`), veri hangi
yoldan geldiğine bakılmaksızın (örnek veri, elle giriş ya da Excel içe
aktarma) hesaba başlamadan önce girdileri doğrular — bir noktanın h'si
eksikse, bir RS noktasının H'si eksikse ya da RS noktaları jeoit düzlemini
belirlemeye yetecek şekilde dağılmamışsa (aynı doğru üzerindeyse ya da 3'ten
azsa), hesap sessizce yanlış/`NaN` bir sonuç üretmez; açık ve nokta adını
belirten bir hata verir.

## Hesaplanan noktaları indirme

Sonuçlar bölümündeki "TXT", "CSV", "NCN (NetCAD)" butonları, hesap sonrası
TÜM noktaların (RS + hesaplanan yeni) nihai Y, X, H değerlerini içeren bir
dosya indirir:

- **CSV**: `Nokta,Tur,Y,X,H` başlıklı, virgülle ayrılmış.
- **TXT**: Sekmeyle ayrılmış düz metin (`Nokta  Y  X  H`).
- **NCN**: NetCAD "Nokta Cetveli" biçimi — başlıksız,
  `NoktaNo,Y,X,Z,Kod` düzeninde virgülle ayrılmış satırlar.

## Görselleştirme (otomatik)

- **Ölçekli ağ krokisi**: Noktaların gerçek konumuna göre ölçekli plan
  görünüşü. RS (sabit) noktalar kare, yeni noktalar daire olarak gösterilir;
  RS noktalarının çevrelediği dışbükey alan (jeoit modeli bölgesi) kesikli
  çizgiyle işaretlenir — bu, RS dağılımının çalışma alanını ne kadar iyi
  kapsadığını görsel olarak değerlendirmeye yarar. Ölçek çubuğu, kuzey oku
  ve lejant içerir; noktalar üzerine gelindiğinde ayrıntı gösterir.
- **Yükseklik profili**: RS noktaları kare (bilinen H), yeni noktalar daire
  (hesaplanan H) olarak gösterilir. Yeni noktalarda, hata yayılma kanunuyla
  o noktanın konumuna göre hesaplanan gerçek %95 güven aralığı çizilir (bkz.
  "İstatistiksel değerlendirme").

## Dosya yapısı

```
index.html          Arayüz (HTML) — tek düzenlenebilir tablo: Noktalar
css/style.css        Görsel stil
js/adjustment.js      Jeoit düzlemi (N = a + b·Y + c·X) en küçük kareler oturtması ve H hesabı
js/viz.js             Ölçekli ağ krokisi ve yükseklik profili SVG görselleştirmeleri
js/io.js              Excel içe/dışa aktarma ve şablon oluşturma (SheetJS üzerine)
js/vendor/            SheetJS (xlsx) kütüphanesi — yerel, üçüncü parti (Apache-2.0)
js/app.js             Uygulama durumu, hesaplama tetikleme, arayüz ve sonuç indirme
```

## Notlar / sınırlamalar

- Düzlem (plane) modeli, jeoidin bölgesel eğimini yakalar ama yerel
  dalgalanmaları (küçük ölçekli jeoit anomalilerini) modelleyemez; RS
  noktalarındaki kalanlar ve σ₀ bu sınırlamanın bir göstergesidir. Daha
  hassas bir uygulama için ulusal jeoit modeli (ör. TG-03/TG-09) ile
  birlikte kullanılması önerilir.
- Yeni noktalar için gösterilen standart sapma/%95 güven aralığı, düzlem
  parametrelerinin kovaryans matrisinden hata yayılma kanunuyla hesaplanan
  gerçek bir istatistiktir; ancak yalnızca jeoit düzlemi modelinin
  kesinliğini yansıtır — GNSS h ölçümünün kendi hata payı ayrıca
  modellenmemiştir (ayrı bir h ölçüm hassasiyeti girilmediği için).
- Bu araç eğitim ve ön değerlendirme amaçlıdır; resmi jeodezik üretimlerde
  ilgili ulusal standartlar ve yönetmeliklerin güncel ve resmi metni esas
  alınmalıdır.
