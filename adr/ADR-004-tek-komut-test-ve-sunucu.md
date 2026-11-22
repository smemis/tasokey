# ADR-004: Tek komut test ve yerel sunucu

**Sürüm 1 (2026-11-19, Mimar-K2) — geçersiz, bkz. sürüm 2.**
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **geçersiz** (bkz. sürüm 2, tasokey#3) |
| Bağlam | Profil: testler tek komuttan çalışır, komut proje kaydında durur, raporda komut + sonuç yazılır. Ek paket kurulumu izin istemidir |
| Karar | Test komutu: Node'un `--test` bayrağına doğrudan `testler` klasör yolu veren bir komut dizesi (Node v22.20.0 **ölçüldü**, yerleşik koşucu, paket yok). Arayüz denemesi ve ekran görüntüsü için yerel statik sunucu: `python -m http.server 8777` (Python 3.12.10 **ölçüldü**). Tarayıcı: ayrı, boş profilli başsız Edge/Chromium + CDP (ofiste kurulu yol; Sahip'in tarayıcısına dokunulmaz). **Manifest gereği:** 8777 portu ve tarayıcı sürücüsü arayüz işlerinin (iş 8-11, 14) manifestine yazılmalı; yazılı değilse o işler `izin_gerek` döner |
| Seçenekler | `npm test` + jest/vitest (kurulum + ağ + bakım) — reddedildi. Tarayıcı içi test sayfası (tek komut değil, otomatikleştirilemez) — reddedildi |
| Sonuçlar | Geçersiz kılınma nedeni: bu sürümün komut dizesi bu Node sürümünde klasör yolunu CommonJS modülü sanıp `require` ediyor → `MODULE_NOT_FOUND` (ölçüldü, tasokey#3, kanıt: `is\tasokey-3\test-gunlugu-basarisiz-komut.txt`) |
| Etkilenen gereksinimler | R-001…R-010 (kanıt yolu) |

**Sürüm 2 (2026-11-19, Mimar-K2, tasokey#3) — kabul.**
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K2 — Mimar) |
| Bağlam | Sürüm 1'in klasör yolu veren komut dizesi bu Node sürümünde dizin argümanını özyinelemeli taramıyor; dizin modül sanılıp çöküyor (ölçüldü, kanıt: `is\tasokey-3\test-gunlugu-basarisiz-komut.txt`). Argümansız çağrı ve glob desenleri doğru çalışıyor; hata komut dizesinde, proje dosyalarında değil |
| Karar | Tek test komutu: **`npm test`** → `node --test "testler/**/*.test.js"` (`package.json` → `scripts.test`). Node'un yerleşik koşucusu; ek paket yok (`node v22.20.0`, `npm 10.9.3` **ölçüldü**). Arayüz denemesi ve ekran görüntüsü için yerel statik sunucu: `python -m http.server 8777` (Python 3.12.10 **ölçüldü**). Tarayıcı: ayrı, boş profilli başsız Edge/Chromium + CDP (ofiste kurulu yol; Sahip'in tarayıcısına dokunulmaz). **Manifest gereği:** 8777 portu ve tarayıcı sürücüsü arayüz işlerinin (iş 8-11, 14) manifestine yazılmalı; yazılı değilse o işler `izin_gerek` döner |
| Seçenekler | Çıplak (tırnaksız) glob dizesi yazmak — reddedildi (PowerShell glob genişletmediği için kabuğa bağımlı kalır). Node sürümünü yükseltmek — reddedildi (ölçülmüş bir sürüm sorunu yok, dize sorunu var; yükseltme ayrı izin ve doğrulama yükü getirir) |
| Sonuçlar | Hiçbir iş kurulum kapısına takılmaz; test çıktısı rapora doğrudan yazılır; komutun tek kaynağı `package.json` olur. Tarayıcı testi ayrı adım olarak kalır (M2). Geri alma yolu: `npm` erişilemezse eşdeğer çıplak komut `node --test "testler/**/*.test.js"` (ölçüldü, 15/15) |
| Etkilenen gereksinimler | R-001…R-010 (kanıt yolu) |
