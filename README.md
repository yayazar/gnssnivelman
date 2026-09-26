# GNSS Jeodezik Nivelman Ağı Dengelemesi

Nivelman (geometrik nivelman) yükseklik farkı ölçüleri ile GNSS'ten türetilen
ortometrik yükseklik ölçülerini (h − N) ortak bir en küçük kareler
dengelemesinde birleştiren, tarayıcıda çalışan istemci taraflı bir web
uygulaması. Sunucu gerektirmez ve internet bağlantısı olmadan da çalışır;
Excel içe/dışa aktarma için kullanılan tek üçüncü parti kütüphane (SheetJS)
dahi yerel olarak paketlenmiştir. Tüm hesap JavaScript ile tarayıcıda yapılır,
veri hiçbir zaman bir sunucuya gönderilmez.

## Kullanım

`index.html` dosyasını bir tarayıcıda açmanız yeterlidir (veya basit bir
statik dosya sunucusu ile servis edebilirsiniz, örn. `python3 -m http.server`).

0. **Proje** (isteğe bağlı): Kendi verinizi Excel/CSV olarak içe aktarın,
   "Şablonu İndir" ile beklenen sütun başlıklarını görün, çalışmanızı Excel
   olarak dışa aktarıp saklayın/paylaşın, ya da "Örnek Veriyi Yükle" /
   "Tümünü Temizle" ile başlangıç noktası seçin. Bkz. aşağıdaki
   "Excel içe/dışa aktarma" bölümü.
1. **Noktalar**: Nokta adı, tür (Sabit/Bilinmeyen), Y (Doğu), X (Kuzey) ve
   Z (Kot) tek bir tabloda girilir. Sabit noktalarda Z, dengelemede
   değişmeyen referans olarak kullanılan bilinen kesin yüksekliktir. Diğer
   noktalarda Z, saha/ön hesap kotudur — aşağıdaki nivelman ölçüleri
   panelinde Δh'nin **varsayılan kaynağıdır**. Y/X yalnızca krokinin
   çizimi içindir.
2. **Nivelman ölçüleri**: Kalkış/varış noktalarını seçin ve mesafeyi (km)
   girin. **İki BİLİNMEYEN nokta arasındaki** bir ölçüde Δh alanını boş
   bırakabilirsiniz: Noktalar tablosundaki güncel Z farkından
   (`Z_varış − Z_kalkış`) canlı olarak hesaplanır ve placeholder'da "oto: …"
   şeklinde görünür — bir Z değişince bu önizleme anında güncellenir. **Bir
   sabit (mesnet) noktaya bağlanan ölçülerde Δh mutlaka elle girilmelidir**;
   uygulama bu durumda otomatik hesaplama yapmaz (placeholder "elle girin
   (sabit nokta)" gösterir) — nedeni aşağıdaki "Yöntem" bölümünde açıklanıyor.
   Standart sapma girilmezse otomatik olarak `σ = k·√S` formülüyle
   hesaplanır. Girdiğiniz veriler dışında dengeleme tamamen otomatiktir:
   herhangi bir değeri değiştirdiğinizde sonuçlar (bu tablodaki "Düzeltme (v)"
   ve "Dengeli Δh" sütunları dahil) kısa bir gecikmeyle kendiliğinden yeniden
   hesaplanır — elle bir "Hesapla" düğmesine basmanız gerekmez. "Mesafe"
   butonu Y/X koordinatlarından düz hat mesafesi önerir.
3. **GNSS ölçüleri**: Nokta, elipsoidal yükseklik (h) ve jeoit ondülasyonu
   (N) girin; ortometrik yükseklik `H = h − N` olarak hesaplanıp bir "sözde
   ölçü" olarak dengelemeye katılır.
4. **Yönetmelik doğruluk sınıfları**: Devre kapanma katsayısı (mm/√km), GNSS
   yükseklik σ sınırı (mm) ve nokta σ sınırı (mm) içeren sınıfları düzenleyin,
   hesapta kullanılacak "aktif sınıf"ı radyo düğmesiyle seçin.
5. **Nivelman devreleri/hatları**: Kapalı bir devre (ör. `R1,N1,N2,R1`) ya da
   iki sabit nokta arasındaki bir hat (ör. `R1,N1,N2,R2`) tanımlayarak ham
   ölçülerden bağımsız bir kapanma hatası kontrolü ekleyin. **Önemli:**
   yalnızca Z'den (oto.) türetilen kenarlardan oluşan bir hat, ardışık
   farkların toplamı gereği matematiksel olarak her zaman tam kapanır
   (0 hata) — bu gerçek bir tutarlılık göstermez. Anlamlı bir kapanma
   kontrolü için devre, en az bir elle girilmiş (override) bağımsız ölçü
   içermelidir (bkz. örnek veri: `RP1↔RP2`, `RP2↔RP3` kontrol hatları).
6. **Parametreler**: Nivelman hassasiyet katsayısı (k) ve varsayılan GNSS
   standart sapmasını ayarlayın.

Ayrı bir "Hesapla" adımı yoktur — dengeleme, sayfa ilk açıldığında ve her
değişiklikte otomatik olarak çalışır (bkz. sayfadaki "⟳/✓ Dengeleme otomatik
olarak hesaplanır/güncellendi" göstergesi).

Uygulama açılışta örnek bir test ağı ile önceden doldurulmuştur; satırları
düzenleyebilir, silebilir veya yeni satır ekleyebilirsiniz. Noktalara isteğe
bağlı Y (Doğu) / X (Kuzey) koordinatı girerseniz, "Görselleştirme" bölümünde
ölçekli bir ağ krokisi otomatik olarak çizilir.

## Yöntem

Dengeleme, **dolaylı ölçüler (parametrik) yöntemi** ile en küçük kareler
prensibine göre yapılır.

**Bilinmeyenler:** sabit olmayan noktaların ortometrik yükseklikleri.

**Ölçü denklemleri:**

- Nivelman ölçüsü: `H_varış − H_kalkış = Δh_ölçü`, ağırlık `w = 1/σ²`,
  `σ = k·√S` (S kilometre cinsinden mesafe). `Δh_ölçü`, elle girilmemişse
  Noktalar tablosundaki `Z_varış − Z_kalkış` farkından hesaplanır; elle
  girilmişse o değer kullanılır.
- GNSS sözde ölçüsü: `H_nokta = h − N`, ağırlık `w = 1/σ_GNSS²`.

**Neden Z'den otomatik türetme yalnızca iki bilinmeyen nokta arasında
geçerlidir:** Bir ölçünün bir ucu sabitse ve Δh, o sabit noktanın kendi
Z'sinden türetilirse (`Δh = Z_bilinmeyen − Z_sabit`), denklem
`H_bilinmeyen = Z_sabit + (Z_bilinmeyen − Z_sabit) = Z_bilinmeyen` şeklinde
cebirsel olarak sadeleşir — yani **sabit noktanın gerçek değeri sonucu hiç
etkilemez** (totoloji); sabit nokta sanki dengelemede yokmuş gibi davranır.
Bu yüzden bir sabit noktaya bağlanan her ölçüde Δh mutlaka elle (gerçek bir
ölçüm olarak) girilmelidir; otomatik türetme yalnızca iki bilinmeyen nokta
arasında (bu totoloji oluşmadığından) uygulanır.

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

## Yönetmelik (BÖHHBÜY) tolerans kontrolleri

Büyük Ölçekli Harita ve Harita Bilgileri Üretim Yönetmeliği'nin öngördüğü
tarzda üç ayrı kontrol eklenmiştir:

1. **Devre/hat kapanma toleransı**: Tanımlanan her devre/hat için ham
   ölçülerden (dengeleme kullanılmadan) kapanma hatası hesaplanır ve
   `T = katsayı(mm/√km) · √K(km)` toleransıyla karşılaştırılır.
   - Kapalı devre (ilk nokta = son nokta): beklenen kapanma 0'dır.
   - Mesnetli hat (iki ucu da sabit nokta): beklenen kapanma,
     `H_son_sabit − H_ilk_sabit` farkıdır.
2. **GNSS yükseklik σ sınırı**: Her GNSS ölçüsünün standart sapması (elle
   girilmiş ya da varsayılan) aktif sınıfın izin verdiği üst sınırla
   karşılaştırılır.
3. **Nokta doğruluk sınıfı**: Dengeleme sonrası her bilinmeyen noktanın
   standart sapması (mm), tanımlı sınıflar arasından karşılayabildiği en sıkı
   (en küçük eşikli) sınıfa atanır.

**Önemli:** Uygulamadaki varsayılan katsayılar (ör. I./II./III. derece
nivelman için 3/8/24 mm/√km) yalnızca örnektir ve düzenlenebilir. Resmi bir
üretimde kullanmadan önce yürürlükteki yönetmeliğin güncel metnindeki
sayısal değerleri mutlaka teyit edip "4. Yönetmelik doğruluk sınıfları"
tablosuna girin.

## Excel içe/dışa aktarma

Farklı kullanıcıların kendi verileriyle, kendi çalışma alanlarında dengeleme
yapabilmesi için tüm proje verisi Excel (.xlsx) dosyası olarak taşınabilir.
İçe aktarma [SheetJS](https://sheetjs.com) kütüphanesiyle (`js/vendor/`,
Apache-2.0, yerel olarak paketlenmiştir — internet bağlantısı gerekmez)
tamamen tarayıcıda yapılır; hiçbir veri sunucuya gönderilmez.

- **Şablonu İndir**: Beklenen sayfa adlarını ve sütun başlıklarını gösteren
  örnek bir `.xlsx` dosyası indirir.
- **Excel'den İçe Aktar**: `.xlsx`, `.xls` veya `.csv` dosyası yükleyin. Sayfa
  adları ve sütun başlıkları Türkçe karakter/boşluk farklarına ve yaygın
  varyasyonlara (`Nokta`/`Ad`/`Point`, `Tür`/`Tip`/`Type`, `Z`/`Kot`/
  `Yükseklik` vb.) karşı toleranslıdır; sıra önemli değildir. Beklenen
  sayfalar (yalnızca `Noktalar` zorunlu, diğerleri isteğe bağlı):
  - `Noktalar`: Nokta, Tür (Sabit/Bilinmeyen), Y (Doğu), X (Kuzey), Z (Kot)
  - `Nivelman`: Kalkış, Varış, Δh (m), Mesafe S (km), σ (m)
  - `GNSS`: Nokta, h (m), N (m), σ (m)
  - `Parametreler`: Parametre/Değer satırları (`k`, `sigmaGnss`)
  - `DogrulukSiniflari`: Sınıf Adı, Kapanma Katsayısı, GNSS σ Sınırı,
    Nokta σ Sınırı, Aktif (Evet/Hayır — aktif sınıfı işaretler)
  - `Devreler`: Ad, Yol (virgülle ayrılmış nokta listesi)
  - İçe aktarma, mevcut tabloların **tamamının yerine geçer** (ekleme değil,
    değiştirmedir).
- **Excel Olarak Dışa Aktar**: O anki tüm çalışma alanını (yukarıdaki 6
  sayfanın tamamı) tek bir `.xlsx` dosyasına yazar — saklamak, paylaşmak ya
  da başka bir oturumda geri yüklemek için kullanılabilir.
- **Örnek Veriyi Yükle (Rize)** / **Tümünü Temizle**: Sırasıyla dahili test
  verisini geri yükler ya da tüm tabloları boşaltarak sıfırdan başlamayı
  sağlar.

**Doğruluk güvencesi:** Dengeleme motoru (`js/adjustment.js`), veri hangi
yoldan geldiğine bakılmaksızın (örnek veri, elle giriş ya da Excel içe
aktarma) hesaba başlamadan önce girdileri doğrular — sabit bir noktanın
yüksekliği eksikse, bir Δh ya da GNSS ölçüsü geçersizse, hesap sessizce
yanlış/`NaN` bir sonuç üretmez; açık ve nokta/ölçü adını belirten bir hata
verir.

## Görselleştirme

- **Ölçekli ağ krokisi**: Noktaların Y (Doğu)/X (Kuzey) koordinatları
  girildiğinde, nivelman bağlantıları aralarındaki gerçek mesafeyle orantılı
  şekilde çizilir. Ölçü çizgisi rengi, dengeleme sonrası normalleştirilmiş
  kalana göre uygun (yeşil) / uyarı (turuncu) / kritik (kırmızı) olarak
  kodlanır; ölçek çubuğu, kuzey oku ve lejant içerir; nokta ve çizgiler
  üzerine gelindiğinde ayrıntı gösterir.
- **Yükseklik profili**: Sabit noktalar kare, dengeli (bilinmeyen) noktalar
  %95 güven aralığı çubuğuyla birlikte daire olarak gösterilir.

## Dosya yapısı

```
index.html          Arayüz (HTML)
css/style.css        Görsel stil
js/matrix.js         Genel matris işlemleri (çarpım, transpoz, Gauss-Jordan tersi)
js/adjustment.js      Dengeleme hesap motoru, devre kapanma kontrolü ve doğruluk sınıflandırması
js/viz.js             Ölçekli ağ krokisi ve yükseklik profili SVG görselleştirmeleri
js/io.js              Excel içe/dışa aktarma ve şablon oluşturma (SheetJS üzerine)
js/vendor/            SheetJS (xlsx) kütüphanesi — yerel, üçüncü parti (Apache-2.0)
js/app.js             Arayüz durumu, tablo render'ı ve olay yönetimi
```

## Notlar / sınırlamalar

- Güven aralıkları normal dağılım varsayımı ile (z = 1.96) hesaplanır;
  küçük serbestlik derecelerinde t-dağılımı daha uygun olabilir.
- İki ucu da sabit noktalar arasındaki nivelman ölçüleri (varsa) bilinmeyen
  içermediği için dengelemeye dahil edilmez.
- Sabit bir noktada girilen GNSS ölçüsü yalnızca bilgi amaçlıdır, dengelemeye
  katılmaz.
- Devre/hat kapanma kontrolü, ardışık iki nokta arasında doğrudan girilmiş
  bir nivelman ölçüsü arar (yön fark etmez); ara noktalar arasında ölçü
  yoksa hata verir. Yalnızca Z'den türetilen (oto.) kenarlardan oluşan bir
  hat her zaman 0 mm kapanma hatası gösterir (teleskopik toplam) — anlamlı
  bir sonuç için en az bir elle girilmiş (override) bağımsız ölçü gerekir.
- Y/X koordinatları yalnızca krokinin çizimi içindir, dengeleme hesabını
  etkilemez.
- Bu araç eğitim ve ön değerlendirme amaçlıdır; resmi jeodezik üretimlerde
  ilgili ulusal standartlar ve yönetmeliklerin güncel ve resmi metni esas
  alınmalı, buradaki örnek katsayılar doğrudan kullanılmamalıdır.
