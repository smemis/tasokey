# Taş Okey

KraftDcm · tarayıcıda çalışan web oyunu. Bu depo KraftOfis tarafından açıldı (ofis klonu). PRD v1 / GDD v1 / MIMARI v1
K1'de onaylandı (2026-11-19); kod işleri bu sürümlere göre ilerler.

## Belgeler
- `PRD.md` — ürün gereksinimleri (R-001…R-010), onaylı
- `GDD.md` — kural ve mekanik ayrıntısı
- `MIMARI.md` — teknoloji yığını, modüller, ADR'ler
- `STIL.md` — görsel yön (taslak, Sahip onayı bekliyor)
- `ARASTIRMA.md` — kaynak araştırması

## Klasör düzeni (`MIMARI.md` §1, §2)
```
cekirdek/   saf kural motoru (DOM yok, rastgelelik dışarıdan verilir)
bot/        bot karar vericisi (cekirdek'i kullanır)
arayuz/     DOM + CSS: masa, raf, sürükleme, dil, kayıt
diller/     dil anahtarı dosyaları (tr.json, en.json)
testler/    öz-testler (npm test burayı çalıştırır)
docs/       GitHub Pages'ten yayınlanan statik site (ADR-005); oyun dosyaları doğrudan burada durur
android/    Android kabuğu ve APK zinciri (ADR-020); oyun katmanlarına bağlı değildir
```

## Test komutu
```
npm test
```
`node --test "testler/**/*.test.js"` çalıştırır; Node'un yerleşik test koşucusu, ek paket kurulumu gerekmez (`MIMARI.md` ADR-004 sürüm 2).

## Yerel çalıştırma
```
python -m http.server 8777
```
ES modülleri `file://` üzerinden çalışmadığı için yerel statik sunucu gerekir (`MIMARI.md` ADR-004).

## Android kabuğu (**kapsam onayı bekliyor**)
`android/` klasöründe, oyunu Android'de **çevrimdışı** oynatan ince bir WebView kabuğu ve onu tek komutla imzalı APK'ya
çeviren betikler var (`MIMARI.md` ADR-020, kullanım `android/OKU.md`). Kabuk oyunu bilmez: `docs/` ağacını derleme anında
**kopyalayarak** APK'nın içine alır ve `https://appassets.androidplatform.net/` kökünden sunar; oyun kuralı, arayüzü, dili
ve kaydı web katmanında kalır, `docs/` değiştiğinde kabuk değişmez. Dış kütüphane ve izin **yok** (`androidx` geçmez,
`uses-permission` 0 satır); derleme Unity kurulumunun içindeki JDK + Android SDK araçlarıyla, **Gradle ve internet
olmadan** yapılır. Kimlik, imza anahtarı ve parola depoda **durmaz**, her koşuda parametre olarak gelir. Dikkat: Android
paketi `PRD.md` §6'da **hâlâ kapsam dışıdır** — PRD farkı ve R-016…R-019 numaraları Sahip onayını bekliyor (`PRD.md`
§5.1); onay gelmeden yayın derlemesi yapılmaz ve bu kaynaklar `main`'e birleştirilmez. Cihazda deneme ofiste yapılmadı.
