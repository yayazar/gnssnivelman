# GNSS Jeodezik Nivelman Ağı Dengelemesi

Nivelman (geometrik nivelman) yükseklik farkı ölçüleri ile GNSS'ten türetilen
ortometrik yükseklik ölçülerini (h − N) ortak bir en küçük kareler
dengelemesinde birleştiren, tarayıcıda çalışan istemci taraflı bir web
uygulaması. Sunucu veya harici bağımlılık gerektirmez; tüm hesap JavaScript
ile tarayıcıda yapılır.

## Kullanım

`index.html` dosyasını bir tarayıcıda açmanız yeterlidir (veya basit bir
statik dosya sunucusu ile servis edebilirsiniz, örn. `python3 -m http.server`).

1. **Noktalar**: Sabit (mesnet) noktaların yüksekliğini girin; bilinmeyen
   noktalar için yükseklik alanı boş bırakılır (dengeleme sonucunda
   hesaplanır).
2. **Nivelman ölçüleri**: Kalkış/varış noktaları, ölçülen yükseklik farkı
   (Δh) ve mesafeyi (km) girin. Standart sapma girilmezse otomatik olarak
   `σ = k·√S` formülüyle hesaplanır.
3. **GNSS ölçüleri**: Nokta, elipsoidal yükseklik (h) ve jeoit ondülasyonu
   (N) girin; ortometrik yükseklik `H = h − N` olarak hesaplanıp bir "sözde
   ölçü" olarak dengelemeye katılır.
4. **Yönetmelik doğruluk sınıfları**: Devre kapanma katsayısı (mm/√km), GNSS
   yükseklik σ sınırı (mm) ve nokta σ sınırı (mm) içeren sınıfları düzenleyin,
   hesapta kullanılacak "aktif sınıf"ı radyo düğmesiyle seçin.
5. **Nivelman devreleri/hatları**: Kapalı bir devre (ör. `R1,N1,N2,R1`) ya da
   iki sabit nokta arasındaki bir hat (ör. `R1,N1,N2,R2`) tanımlayarak ham
   ölçülerden bağımsız bir kapanma hatası kontrolü ekleyin.
6. **Parametreler**: Nivelman hassasiyet katsayısı (k) ve varsayılan GNSS
   standart sapmasını ayarlayın.
7. **Dengelemeyi Hesapla** butonuna basın.

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
  `σ = k·√S` (S kilometre cinsinden mesafe).
- GNSS sözde ölçüsü: `H_nokta = h − N`, ağırlık `w = 1/σ_GNSS²`.

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
  yoksa hata verir.
- Y/X koordinatları yalnızca krokinin çizimi içindir, dengeleme hesabını
  etkilemez.
- Bu araç eğitim ve ön değerlendirme amaçlıdır; resmi jeodezik üretimlerde
  ilgili ulusal standartlar ve yönetmeliklerin güncel ve resmi metni esas
  alınmalı, buradaki örnek katsayılar doğrudan kullanılmamalıdır.
