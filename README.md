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
4. **Parametreler**: Nivelman hassasiyet katsayısı (k) ve varsayılan GNSS
   standart sapmasını ayarlayın.
5. **Dengelemeyi Hesapla** butonuna basın.

Uygulama açılışta örnek bir test ağı ile önceden doldurulmuştur; satırları
düzenleyebilir, silebilir veya yeni satır ekleyebilirsiniz.

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

## Dosya yapısı

```
index.html          Arayüz (HTML)
css/style.css        Görsel stil
js/matrix.js         Genel matris işlemleri (çarpım, transpoz, Gauss-Jordan tersi)
js/adjustment.js      Dengeleme hesap motoru (ölçü denklemlerinin kurulması ve çözümü)
js/app.js             Arayüz durumu, tablo render'ı ve olay yönetimi
```

## Notlar / sınırlamalar

- Güven aralıkları normal dağılım varsayımı ile (z = 1.96) hesaplanır;
  küçük serbestlik derecelerinde t-dağılımı daha uygun olabilir.
- İki ucu da sabit noktalar arasındaki nivelman ölçüleri (varsa) bilinmeyen
  içermediği için dengelemeye dahil edilmez.
- Sabit bir noktada girilen GNSS ölçüsü yalnızca bilgi amaçlıdır, dengelemeye
  katılmaz.
- Bu araç eğitim ve ön değerlendirme amaçlıdır; resmi jeodezik üretimlerde
  ilgili ulusal standartlar ve yönetmelikler esas alınmalıdır.
