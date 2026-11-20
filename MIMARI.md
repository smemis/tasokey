# MIMARI: Taş Okey

> Şablon kaynağı: `kit\sablonlar\MIMARI.md` · `ofis-sistem-rehberi.md` Bölüm 3, 6, 12, D-6.
> **K1 onayı alındı** (Sahip, 2026-11-19, toplu onay — bütün sorular önerilen seçenekle): kural seti **Klasik Okey**,
> yığın **sıfır bağımlılık düz JavaScript + DOM**, barındırma **kendi deposu + GitHub Pages**, 4 kural ayrıntısı
> **önerilen varsayılanlarla sabit**, görsel tonda **kumar/para çağrışımı yok**. ADR-001, ADR-005, ADR-008, ADR-009
> durumu **kabul** (karar veren Sahip-K1); ADR-002, ADR-003, ADR-004, ADR-006, ADR-007 durumu **kabul** (karar veren
> Mimar-K2, K1 kapsamında onaylı yığın/akışın ayrıntısı).
>
> **Sürüm 3** (`tasokey#24`, Geliştirici, 2026-11-20): ADR-010 (oyuncu başına atılan yığın), ADR-011 (taş gövdesi SVG +
> DOM rakam katmanı), ADR-012 (dört kenar grid + telefon dikey uyarısı) eklendi; durumu **kabul** (karar veren Mimar-K2).
> Kaynak: `GDD.md` §6 "Bulgu" (tasokey#22), `PRD.md` R-011/R-012/R-014/R-015, `STIL.md` §4-5, `docs/gorsel/tas-01.svg`
> (ölçüldü: rakam şu an sabit SVG `<path>`, gerçek yazı tipi glifi değil). Bu iş yalnız belge; `arayuz/`, `cekirdek/` kodu
> değişmedi.
>
> **Sürüm 4** (`tasokey#37`, Geliştirici, 2026-11-20): ADR-017 (bitiş iki ayrı denetimin VEYA'sı; per = seri + sayı peri,
> çift = birebir aynı taş) eklendi; karar Sahip'in (`tasokey#35`), bu iş kodu yazdı. Kaynak: `GDD.md` v3 §1 kural 6, 7, 13.
> ADR-013 ve ADR-016 numaraları kullanılmadı — 017 numarası GDD/PRD v3'te bu karara verilmişti.
> ADR-014 ve ADR-015 boş kalan numaralardandı: ADR-015 `tasokey#38`'de (Mimar hakemliği),
> ADR-014 `tasokey#39`'da (Sahip'in isteği bu numarayı adlandırarak geldi) yazıldı — aşağıda §5.
>
> **Sürüm 5** (`tasokey#37`, Mimar kararı + Geliştirici uygulaması, 2026-11-20): ADR-018 (bot kuralı kopyalamaz,
> `cekirdek`'e sorar; el sonlanması sezgisele bağlı değildir) eklendi; durumu **kabul** (karar veren Mimar-K2).
> Kaynak: ADR-017'nin ölçülen yan etkisi (200 elin 20'si sonlanmıyordu) ve `GDD.md` §4 "Karar yöntemi"nin
> Mimar/Geliştirici'ye bıraktığı algoritma ayrıntısı. `GDD.md`, `PRD.md` gereksinim metinleri ve `kural.js` değişmedi.
>
> **Sürüm 6** (`tasokey#38`, Mimar kararı + Geliştirici uygulaması, 2026-11-20): ADR-015 (yığılma kademeleri tek
> kaynak, kalıcı pencere her zaman en üstte) eklendi; durumu **kabul** (karar veren Mimar-K2). Kaynak: Sahip'in
> `tasokey#38` isteği ("sonuç penceresi her zaman en üstte") ve belirti görüntüsü `is/tasokey-35/ekler/image-2.png`.
> Karar `tasokey#38`'de uygulanmıştı ama belgeye yazılmamıştı (Denetçi "güncel mimari karara uyuyor mu" maddesini
> bu yüzden ölçemedi); bu sürüm yalnız belge + yeni ADR atıf taraması testidir, `docs/` kodu değişmedi.
>
> **Sürüm 7** (`tasokey#39`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-20): ADR-014 (bırakma/tıklama
> hedef alanı taş ölçüsünden bağımsız, tek değişkenden) eklendi; durumu **kabul**. Kaynak: Sahip'in `tasokey#39`
> isteği ("Taş atma ve çekme hedef alanları büyütülsün (ADR-014)") — numara istekte verildi.
> Aynı işin ek bilgileri (el bitince rakip ıstakasının **dizili** açılması, sonuç penceresinde per / çift /
> per olmayan / okey sayılarının **ayrı** yazılması) arayüz-sunum ayrıntısıdır, ADR gerektirmedi; karşılığı
> `cekirdek/cozucu.js` `elDokumu` saf işlevidir (§3).

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| Mimari karar sürümü | `7` (ADR-014 eklendi, Sahip isteği + Geliştirici uygulaması, 2026-11-20, tasokey#39; önceki: ADR-015 sürüm 6, aynı gün, tasokey#38) |
| Bağlı PRD sürümü | `3` (`tasokey#36`, R-004/R-005 kural düzeltmesi) |
| Profil | `kit\profiller\` içinde yok → `profil-oyun-web-taslak.md` (bu klasör; kit'e girmesi Sahip onayı ister, D-26) |
| Hazırlayan | Mimar, 2026-11-19 |

## 1. Genel bakış

Taş Okey, tarayıcıda çalışan, **sunucusuz** (yalnız statik dosya) bir tek kişilik masa oyunu: 1 gerçek oyuncu + 3 bilgisayar
rakip. Kural seti **Klasik Okey** (tek el; per/çift yalnız el biterken açılır). Sistem üç katmandır:

```
  cekirdek/   saf kural motoru (DOM yok, rastgelelik dışarıdan verilir)  ← npm test burayı test eder
  bot/        karar verici; cekirdek'i kullanır, kuralı kendi yorumlamaz
  arayuz/     DOM + CSS: masa, raf, sürükleme, dil, kayıt
```

Tek yönlü bağımlılık: `arayuz → bot → cekirdek`. `cekirdek` hiçbir şeye bağlı değildir; bu yüzden tarayıcı açmadan,
tek komutla test edilebilir. Bot ve insan oyuncu **aynı** kural motorunu kullanır (GDD §4 değişmezi: bot asla kurala
aykırı hamle yapamaz — çünkü hamleyi onaylayan kod insan oyuncununkiyle aynı).

## 2. Teknoloji yığını (ADR-001 — K1'de Sahip onayladı)

| Katman | Seçim | Gerekçe | ADR |
|---|---|---|---|
| Dil | Standart JavaScript, ES2022 modülleri (`import`/`export`) | Derleme ve paketleme adımı yok; tarayıcı dosyayı doğrudan çalıştırır | ADR-001 |
| Kütüphane / çatı | **Yok** (sıfır bağımlılık) | Paket kurulumu izin istemidir (profil: "yeni paket ya da araç kurulumu izin istemidir"; manifestte ağ yok). Sıfır bağımlılık = kurulum beklemesi yok, güvenlik yüzeyi yok, sürüm bakımı yok | ADR-001 |
| Sunum | DOM + CSS (her taş bir HTML öğesi) | Okey 2B bir masa oyunu; tuval/3B gerekmiyor. Duyarlı düzen (R-009), sürükleme ve metin ölçeklemesi CSS ile bedava gelir — tuvalde elle yazılması gerekir | ADR-001 |
| Test | Node yerleşik test koşucusu | **Ölçüldü** (2026-11-19): `node v22.20.0`, `npm 10.9.3` kurulu → `node --test` ek paket istemiyor | ADR-004 |
| Tek test komutu | `npm test` | Profil kuralı: testler tek komuttan çalışır | ADR-004 |
| Geliştirme sunucusu | `python -m http.server 8777` (**ölçüldü**: Python 3.12.10 kurulu) | ES modülleri `file://` üzerinden çalışmaz; yerel statik sunucu şart. Port manifestte yazılı olmalı (profil) | ADR-004 |
| Barındırma | GitHub Pages, statik; `kraftdcm/tasokey` deposunun `docs/` klasörü | Sunucu yok (tek kişilik, bota karşı); adres standardı korunur | ADR-005 |
| Kayıt | `localStorage`, şema sürümlü | Hesap yok, kişisel veri yok (PRD §8) | ADR-006 |
| Dil | `diller/tr.json`, `diller/en.json` + anahtar taraması | Sabit metin yasak (CLAUDE.md, R-008) | ADR-007 |
| Kural ayrıntıları | 4 çelişkili noktada K1 varsayılanları; tek yerde ayar olarak | Kaynaklar çelişiyor (ARASTIRMA §2); değiştirmesi ucuz kalmalı | ADR-008 |

Değerlendirilen ama önerilmeyen yollar ADR-001'in "Seçenekler" satırında.

## 3. Modüller ve sınırlar

| Modül | Sorumluluk | Bağımlı olduğu | Saf mantık mı (test edilebilir) |
|---|---|---|---|
| `cekirdek/tas.js` | Taş kimliği (renk + sayı + nüsha), 106'lık setin kurulması | — | evet |
| `cekirdek/karma.js` | Tohumlu (deterministik) karıştırıcı | — | evet |
| `cekirdek/kural.js` | K1 kural varsayılanları (ADR-008) tek nesnede; motorun okuduğu tek kural kaynağı | — | evet |
| `cekirdek/dagitim.js` | 15/14/14/14 dağıtım, gösterge açma, o elin okey taşını belirleme | tas, karma, kural | evet |
| `cekirdek/dizilim.js` (ADR-017) | Per (seri + sayı peri) ve çift (birebir aynı taş) geçerliliği; okey/sahte okey yerine geçme | tas, kural | evet |
| `cekirdek/cozucu.js` (ADR-017) | "Bu el bitirilebilir mi?" — iki ayrı arama: elin tamamen per gruplarına bölünmesi **ya da** tam 7 birebir çift olması. Ayrıca **el dökümü** (`elDokumu` + `dokumSirasi`, `tasokey#39`): elin en çok taşı kapsayan per bölümü + kalanın birebir çiftleri + per dışı taşlar; el sonu gösteriminin (dizilim ve sayılar) tek kaynağı. Bitiş kararından ayrıdır — döküm bitmemiş eli de böler | dizilim | evet |
| `cekirdek/el.js` | El durumu, sıra, hamle doğrulama (çek/at), el sonu koşulları | dagitim, cozucu, kural | evet |
| `cekirdek/puan.js` | El sonucu ve puan: kalan taş sayıları + oyuncu başına döküm (`dokumler`: per / çift / per olmayan / okey sayıları — `tasokey#39` ek bilgisi) | el, cozucu, kural | evet |
| `bot/kolay.js` (ADR-018) | Hangi taşı çeker / atar (sezgisel): bitiş yolunu seçer, en izole taşı atar, atılandan yalnız gerçek tamamlamada çeker. Kural sorularını `dizilim.js`/`cozucu.js`'in saf işlevlerine sorar, kendi per/çift tanımını yazmaz; hamleyi `el.js`'e onaylatır | cekirdek (dizilim, cozucu, el, kural, tas, dagitim) | evet |
| `arayuz/ekran.js` | Masa, raf, atılan taş yığını; olay bağlama | cekirdek, dil, yerlesim | hayır (DOM) |
| `arayuz/surukle.js` | Taş seçme ve rafta sürükleyerek dizme | ekran, etkilesim | hayır (DOM) |
| `arayuz/yerlesim.js` (ADR-012) | Dört kenar/köşe ızgarası: sıra yönüne göre hangi oyuncunun hangi kenarda, hangi köşe yığınının hangi oyuncuya ait olduğunu hesaplar; sonucu grid-area adı olarak döner | cekirdek (kural — sıra yönü) | evet |
| `arayuz/etkilesim.js` (ADR-010/012) | Sürükleme/dokunma hedefinin (deste, köşe yığını, raf konumu) hangi oyun eylemine (çek/at/bitir) karşılık geldiğini saf mantıkla çözer; hamleyi yine `cekirdek/el.js` onaylar | cekirdek, yerlesim | evet |
| `dil/cevir.js` | Anahtar → metin; eksik anahtarda görünür hata | — | evet |
| `kayit/depo.js` | `localStorage` sarmalayıcı + şema sürümü kontrolü | — | hayır (tarayıcı API) |

Sınır kuralı: `cekirdek/` ve `bot/` altında `document`, `window`, `localStorage`, `Math.random` **geçmez**. Bu bir öz-test ile
ölçülür (kaynak taraması), tahminle değil (iş 1'in kabul ölçütü).

## 4. Veri ve kayıt

- Tek anahtar: `tasokey.kayit` (JSON) + içinde `surum` alanı. İçerik: dil seçimi, ses açık/kapalı, (varsa) yarım kalmış el.
- Şema sürümü uyuşmazsa M1-M3'te **kayıt atılır ve yeniden başlatılır** (taşıma kodu yazılmaz; oyun yayınlanmadığı için
  taşınacak kullanıcı verisi yok). Yayından sonra kayıt şeması **donmuş alandır**: değişikliği R sınıfıdır, Masa'da yapılır.
- Kişisel veri, çerez, sayaç, analitik **yok** (PRD §8). Dışarıya ağ isteği yok (üçüncü taraf yazı tipi/CDN dahil → ADR-007).

## 5. Mimari kararlar (ADR)

### ADR-001: Sıfır bağımlılık düz JavaScript + DOM
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 |
| Durum | **kabul** (K1, Sahip onayı 2026-11-19) |
| Karar veren | Sahip (K1) |
| Bağlam | Tarayıcıda çalışan, sunucusuz, tek kişilik 2B masa oyunu. Ofisin manifestinde ağ erişimi yok; paket kurulumu izin istemi. Testler tek komuttan çalışmak zorunda |
| Karar | ES2022 modülleriyle düz JavaScript; sunum DOM + CSS; derleme, paketleme ve dış kütüphane yok |
| Seçenekler | **B) TypeScript + Vite:** tip güvenliği ve otomatik yeniden yükleme kazandırır, ama `npm install` (ağ + izin istemi), `node_modules`, derleme adımı ve sürüm bakımı getirir — her iş bir kurulum kapısına takılabilir. **C) Phaser / Three.js:** oyun çatısı; taş dizme, metin ölçekleme ve duyarlı düzeni DOM'un bedava verdiği yerde elle yazdırır, yerel kopyalanması gereken ~1 MB kütüphane ekler, 2B masa oyunu için kazancı yok. **D) Tuval (canvas) + düz JS:** kütüphanesiz ama metin/dil/erişilebilirlik ve 4 ekran boyutunu elle çizmek gerekir |
| Sonuçlar | Kolaylaştırır: her iş kurulum beklemeden başlar; test ve ekran görüntüsü kanıtı tek komut; dağıtım = dosyaları kopyalamak. Zorlaştırır: tip denetimi yok (karşılığı: `cekirdek/` için geniş öz-test ve JSDoc tipleri), arayüz büyüdükçe elle yazılan kod artar |
| Etkilenen gereksinimler | R-001…R-010 (hepsi) |

### ADR-002: Saf kural motoru; bot ve insan aynı motoru kullanır
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | GDD §4: botun asla kurala aykırı hamle yapmaması değişmez. İki ayrı kural yorumu (biri arayüzde, biri botta) bu değişmezi ölçülemez kılar ve aynı işi iki yerde yapar (CLAUDE.md §6 "tek kapı / tek kaynak") |
| Karar | Bütün kural bilgisi `cekirdek/` altında; `arayuz/` ve `bot/` yalnız **hamle önerir**, geçerliliğe `cekirdek/el.js` karar verir. `cekirdek/` ve `bot/` tarayıcı API'si kullanamaz (kaynak taramasıyla ölçülür) |
| Seçenekler | Arayüzde ayrı doğrulama (hızlı görünür geri bildirim verir ama kuralı ikileştirir) — reddedildi; arayüz anlık ipucu için `cekirdek`'in saf işlevlerini çağırır |
| Sonuçlar | Kural tarayıcı açmadan test edilir; bot hatası kural hatasından ayrışır. Her arayüz etkileşimi bir motor çağrısına bağlanmak zorunda |
| Etkilenen gereksinimler | R-003, R-004, R-005, R-006 |

### ADR-003: Rastgelelik tohumlu ve enjekte edilir
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | Karıştırma ve bot kararları rastgele. `Math.random` doğrudan çağrılırsa hata tekrar üretilemez, test tekrarlanabilir olmaz (A9: ölç, tahmin etme) |
| Karar | `cekirdek/karma.js` içinde küçük, tohumlu bir sayı üreteci (ör. 32-bit xorshift); tohum motora **parametre olarak** verilir. Oyunda tohum `Date.now()`'dan, testte sabit sayıdan gelir. Hata raporunda tohum yazılır → el birebir yeniden oynanır |
| Seçenekler | `Math.random` (basit ama tekrar üretilemez; hata işinde "önce kırmızı test" yazılamaz) — reddedildi. `crypto.getRandomValues` (gerek yok; kumar/para yok, kriptografik rastgelelik gereksiz) |
| Sonuçlar | Her hata tohumla yeniden üretilebilir; bot koşusu tekrarlanabilir. Üretecin kendisi test edilmeli (aynı tohum → aynı dizi) |
| Etkilenen gereksinimler | R-001, R-006 |

### ADR-004: Tek komut test ve yerel sunucu

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

### ADR-005: Barındırma — kraftdcm hesabında ayrı proje deposu + GitHub Pages
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K1, Sahip onayı 2026-11-19; PRD §9 Soru 5'in karşılığı) |
| Karar veren | Sahip (K1 + yayın kapısı) |
| Bağlam | KraftDcm standardı `https://kraftdcm.github.io/<oyunadi>/` (`D:\KraftDcm\web-sitesi.md`). O adres bugün `kraftdcm/kraftdcm.github.io` deposundaki **yasal sayfalar** için kullanılıyor ve yükleme yalnız `kraftdcm` hesabından, web arayüzünden yapılıyor. `web-sitesi.md` satır 49-50'deki açık nokta ("ikinci oyunda ana sayfanın tek kaynağı neresi") bu projede ilk kez karşımıza çıkıyor. **Ölçüldü** (2026-11-19): `repo\tasokey` deposunun tanımlı uzak adresi **yok** (`git remote -v` boş) |
| Karar | Oyun, `kraftdcm` hesabındaki **kendi deposundan** (`kraftdcm/tasokey`) GitHub Pages ile `docs/` klasöründen yayınlanır. Adres: `https://kraftdcm.github.io/tasokey/`. Site deposuna dokunulmaz; yasal sayfalar da aynı depoda `docs/gizlilik.html`, `docs/sartlar.html` olarak üretilir ve `/tasokey/gizlilik.html` adresinden görünür |
| Seçenekler | **B) Site deposuna (`kraftdcm.github.io`) oyunun dosyalarını yüklemek:** aynı adresi verir ama her sürümde elle çok dosya yüklemek gerekir ve yasal sayfalarla aynı klasörde çakışma riski doğar. **C) Ayrı domain + sunucu:** gerekmez (sunucusuz oyun), ücret ve bakım getirir, K3 açar |
| Sonuçlar | Yayın "ofisin işi değildir": depoyu `kraftdcm` hesabında açmak, Pages'i açmak ve ilk yüklemeyi yapmak **Masa'daki** adımlardır (Sahip). Ofis yalnız `docs/` içeriğini PR olarak üretir. Kaynak düzeni bu karara uyar: oyunun çalışan dosyaları doğrudan `docs/` altında durur (ayrı kopyalama adımı olmasın), `testler/` ve belgeler depo kökünde kalır |
| Etkilenen gereksinimler | R-009 (dağıtım biçimi), PRD §8 (site adresi) |
| Doğrulanmadı | `kraftdcm` hesabında `tasokey` adlı uzak deponun var olup olmadığı ve Pages ayarı ofisten görülemez (ağ yok) |

### ADR-006: Kayıt — localStorage + şema sürümü, taşıma yok
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | Hesap ve sunucu yok; yalnız dil/ses tercihi ve istenirse yarım el saklanacak. Profil: "veri şeması sürümleme baştan kurulur" |
| Karar | Tek anahtar `tasokey.kayit`, içinde `surum` alanı. Okurken sürüm uyuşmazsa kayıt atılır ve varsayılana dönülür (yayın öncesi). Yayından sonra şema değişikliği R sınıfıdır |
| Seçenekler | Sürümsüz kayıt (ilk şema değişikliğinde sessiz bozulma) — reddedildi. IndexedDB (bu veri hacmi için gereksiz karmaşıklık) — reddedildi |
| Sonuçlar | Şema değişimi ilk sürümlerde bedava; yayından sonra kapı gerektirir. Kullanıcı tercihinin silinmesi yayın öncesi kabul edilir |
| Etkilenen gereksinimler | R-008, R-010 |

### ADR-007: Dil dosyası ve yazı tipi — dışarıya istek yok
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar); yazı tipinin **görünüşü** Sahip'te (STIL) |
| Bağlam | Oyun içi her metin dil dosyasından gelir (sabit metin yasak). STIL §5 "lisanslı yazı tipi" diyor; dışarıdan yazı tipi çekmek ağ isteği, ücretli olabilir (K3) ve çevrimdışı açılışı bozar |
| Karar | `diller/tr.json` + `diller/en.json`; `dil/cevir.js` eksik anahtarda görünür hata basar. Varsayılan yazı tipi: **sistem yazı tipi yığını** (ör. `system-ui`), indirme ve lisans yok. Sayıların ayırt edilebilirliği (6/9, 1/7) ekran görüntüsüyle doğrulanır; Sahip isterse STIL'de lisanslı bir yazı tipi seçilir ve dosyası depoya konur (ayrı iş + gerekiyorsa K3) |
| Seçenekler | Google Fonts/CDN (dış istek, gizlilik ve çevrimdışı sorunu) — reddedildi |
| Sonuçlar | Çevrimdışı açılır, dış istek yok, lisans masrafı yok. Yazı tipi işletim sistemine göre biraz değişir; sayı okunurluğu ekran görüntüsüyle ölçülür |
| Etkilenen gereksinimler | R-008, R-009 |

### ADR-008: Kural seti Klasik Okey; çelişkili 4 ayrıntı tek yerde ayar
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K1, Sahip onayı 2026-11-19) |
| Karar veren | Sahip (K1) |
| Bağlam | Kaynaklar 4 noktada çelişiyor (ARASTIRMA §2) ve bir nokta hiç tanımlı değildi (deste tükenmesi → bot koşusu sonsuz dönebilir). Kural seti seçimi (Klasik Okey ↔ 101 Okey) kural motorunun büyüklüğünü belirler |
| Karar | **Kural seti: Klasik Okey** — tek el, per/çift yalnız el biterken açılır, masaya açma ve kümülatif skor yok. Dört ayrıntı aşağıdaki varsayılanlarla sabit: (1) `12-13-1` geçişi **per değildir** (per 1→13 düz sıradır); (2) okey ve sahte okey atmak **yasaktır**, motor bu hamleyi engeller (ceza puanı yok — tek elde ceza tablosunun yeri yok); (3) gösterge taşı sahte okey çıkarsa taş desteye karışır ve **gösterge yeniden açılır**; (4) yerdeki taşlar kimse bitirmeden tükenirse **el berabere sayılır** ve yeni el başlar. Bu dördü `cekirdek/kural.js` içinde **tek nesnede ayar** olarak durur; motorun başka hiçbir yerinde bu kurallar yeniden yazılmaz |
| Seçenekler | 101 Okey (masaya açma + el devri + kümülatif puan = üç ek alt sistem, plan ~4 iş büyür) — reddedildi, istenirse ayrı PRD farkıyla gelir. İki kural setini birlikte taşımak — M1'de reddedildi. Dört ayrıntıyı tek tek sormak — plan bu noktada duracaktı; Sahip toplu varsayılanı seçti |
| Sonuçlar | M1 çekirdeği 7 işte çıkar; iş 3, 4 ve 6 beklemeden başlar. Sahip M2 denemesinde (K4) bir ayrıntıyı yanlış bulursa `cekirdek/kural.js`'te tek satır değişir ve ilgili tablo testi güncellenir — mimari değişmez. Kural setinin değişmesi (101 Okey) PRD farkı ister |
| Etkilenen gereksinimler | R-002, R-003, R-004, R-005, R-006, R-007 |

### ADR-009: Görsel tonda kumar/para çağrışımı yok
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K1, Sahip onayı 2026-11-19) |
| Karar veren | Sahip (K1) |
| Bağlam | Okey'in kahvehane/kumar çağrışımı marka algısı ve mağaza/yasal değerlendirme açısından risk. Gerçek para ve kumar unsurunun yokluğu zaten sabit karardı (soru değildi); sorulan, **görsel tonun** da kısıtlanması |
| Karar | Görselde nakit, jeton-para benzetmesi, zar/rulet imgesi ve bahis dili kullanılmaz; yalnız geleneksel okey taşı ve masa görseli. Bu kısıt `STIL.md` §4'ün bağlayıcı maddesidir ve iş 13'ün (V sınıfı) şartnamesine girer |
| Seçenekler | Kısıtlama yok — reddedildi (güvenli taraf seçildi) |
| Sonuçlar | İş 13'ün varlık listesi sadeleşir; "jeton" benzeri yer tutucu görsel üretilmez. Metinde de bahis/kumar sözcükleri dil dosyasına girmez |
| Etkilenen gereksinimler | R-009 |

### ADR-010: Atılan taş — oyuncu başına ayrı köşe yığını
| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: kabul (K2 — Mimar) |
| Bağlam | `GDD.md` §6 "Bulgu" (tasokey#22): `cekirdek/el.js` atılan taşı tek ortak `atilanYigin` dizisinde tutuyor, oyuncu başına ayrılmış bir yığın yok (ölçüldü, satır 41/77-80/103). `PRD.md` R-011 arayüzde dört ayrı köşe yığını, R-012 çekme kaynağının yalnız "önceki oyuncunun köşesi" olmasını istiyor; motor şu an hangi taşı hangi oyuncunun attığını ayrı ayrı bilmiyor |
| Karar | `cekirdek/el.js`'teki atılan taş modeli, oyuncu başına ayrı yığın (ya da her taşa "atan oyuncu" etiketi) tutacak şekilde genişletilir; motor hâlâ tek kaynaktır (ADR-002), arayüz yalnız bu modeli görüntüler. Kodun kendisi bu işte (`tasokey#24`, belge güncellemesi) **değişmez** — ayrı bir Geliştirici işi (R-011 notu) |
| Seçenekler | B) Arayüzde tek ortak diziyi görsel olarak dört köşeye bölüştürmek (atan oyuncuyu DOM tarafında sıra düzeninden tahmin ederek) — reddedildi: ADR-002'nin "tek kaynak" ilkesini bozar, R-012'nin "başka köşeden çekilemez" kısıtını motor doğrulayamaz, tahmin kuralla senkron kalmayabilir |
| Sonuçlar | Kolaylaştırır: 4 köşe yığını ve R-012'nin çekme kaynağı kısıtı motor tarafından doğrulanabilir hâle gelir. Zorlaştırır: `cekirdek/el.js` veri şekli değişir → bu alanı kullanan öz-testler (`el.test.js`, `dizilim.test.js`) güncellenmeli; kayıt şemasına (ADR-006) etkisi varsa (yarım el saklanıyorsa) o iş ayrıca değerlendirilir |
| Etkilenen gereksinimler | R-011, R-012 |

### ADR-011: Taş gövdesi SVG + DOM rakam katmanı
| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: kabul (K2 — Mimar) |
| Bağlam | `tasokey#15/16`'dan gelen mevcut varlık seti sayı başına ayrı bir SVG dosyası üretiyor (`docs/gorsel/tas-01.svg`…`tas-13.svg`); rakam SVG içinde sabit bir `<path>` olarak çiziliyor (**ölçüldü**: `tas-01.svg` rakamı iki dikdörtgenden oluşan geometrik şekil, bir yazı tipi glifi değil). `STIL.md` §4-5 ve `PRD.md` R-015 rakamın **sistem/lisanslı yazı tipiyle, kalın düz** ve **6/9, 1/7 karışmadan** okunmasını istiyor; sabit path bu okunurluğu yazı tipi düzeyinde garanti etmiyor ve 13 dosyanın her biri aynı gövdeyi (fildişi renk, gölge, yuvarlak köşe) tekrarlıyor |
| Karar | Taş gövdesi (fildişi renk, gölge, yuvarlak köşe, çerçeve) **tek paylaşılan SVG** parçası olur; rakam (1-13) ve altındaki küçük daire gövdenin üstüne bindirilen bir **DOM metin katmanı** (`<span>`/`<div>` + CSS) olarak, gerçek sistem/lisanslı yazı tipiyle render edilir. Sahte okey ve kapalı taş aynı paylaşılan gövdenin rakamsız varyantı kalır |
| Seçenekler | B) 13 SVG dosyasının rakam yolunu seçilen yazı tipinden elle iz çıkararak yeniden çizmek — reddedildi: her yazı tipi/dil değişiminde 13 dosya elle güncellenir (tek kapı/tek kaynak ilkesine aykırı), gerçek metin erişilebilirliği (ekran okuyucu, seçilebilirlik) kazanılmaz. C) Rakamı SVG içine `<text>` olarak gömmek — reddedildi: CSS yazı tipi/boyut kontrolü DOM metninden daha sınırlı, kapalı/dönük taş durumunda görünürlük mantığı ekstra karmaşıklık getirir |
| Sonuçlar | Kolaylaştırır: SVG varlık sayısı 13 yüz deseninden 1 paylaşılan gövdeye iner; rakam yazı tipi `STIL.md` §5'teki seçimle birebir eşleşir, 6/9-1/7 ayrımı ekran görüntüsüyle doğrulanır (R-015). Zorlaştırır: taş artık iki katman (SVG gövde + DOM metin) hizalanmalı; önceki `tas-01.svg`…`tas-13.svg` kaldırılır (kod ve varlık değişikliği bu işte **yapılmadı**, ayrı Geliştirici işi) |
| Etkilenen gereksinimler | R-015 |

### ADR-012: Dört kenar grid yerleşimi + telefon dikey uyarısı
| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: kabul (K2 — Mimar) |
| Bağlam | `GDD.md` §6 "Yerleşim"/"Ekran boyutları" ve `PRD.md` R-014: dört oyuncu dört kenarda (Sahip alt, botlar sol/üst/sağ), deste ortada, köşe yığınları kenarlar arasında; telefon dikey yönde oyun alanı yerine dil anahtarlı uyarı gösterilir. Mevcut `arayuz/ekran.js` tek bir raf/masa düzeni çiziyor, dört kenar + köşe konumlandırmasını ve yön tespitini henüz bilmiyor. §7 risk 4 ("mobil dikeyde sığmayabilir") bu kararla kapanır |
| Karar | Masa düzeni CSS Grid ile üç satır/üç sütunluk bir ızgara olarak tanımlanır (4 kenar + 4 köşe + merkez); hangi oyuncunun hangi kenarda/köşede olacağını (sıra yönüne bağlı) hesaplayan mantık **saf** modül `arayuz/yerlesim.js`'te durur, `arayuz/ekran.js` yalnız sonucu (grid-area adları) DOM'a uygular. Dikey yön tespit edilince (`matchMedia('(orientation: portrait)')`) ızgara gizlenir, R-014'ün dil anahtarlı uyarısı gösterilir; yatayda ızgara aynı mantıkla kurulur. Çekme/atma hedefinin hangi köşe/deste olduğunu çözen mantık ayrıca saf modül `arayuz/etkilesim.js`'te durur (R-012, R-013) |
| Seçenekler | B) Dikeyde ızgarayı küçülterek sığdırmaya çalışmak (risk 4'ün önceki "doğrulanacak" hâli) — reddedildi: 15 taşlık raf + masa + 4 köşe yığını küçük ekranda okunur kalmaz (R-015 ihlali riski); Sahip kararı doğrudan uyarıyı seçti (`MASA-DUZENI.md`). C) Yön tespitini tamamen CSS `@media` sorgusuna bırakmak — kısmen kabul: CSS uyarı/ızgara gösterme-gizlemeyi yapar, ama hangi oyuncunun hangi köşede olduğu kural ayarına (sıra yönü) bağlı olduğundan JS'te de hesaplanması gerekir (`yerlesim.js`) |
| Sonuçlar | §7 risk 4 **kapanır** (R-014 ile: sığdırma denenmez, uyarı gösterilir). Yeni saf modüller (`yerlesim.js`, `etkilesim.js`) DOM'suz test edilebilir hâle gelir. Kolaylaştırır: düzen mantığı tek yerde, öz-testle doğrulanır. Zorlaştırır: `ekran.js` artık bu iki modüle bağımlı olur; gerçek CSS Grid ve modül dosyaları bu işte **yazılmadı** (belge güncellemesi, kod değişmedi) — ayrı Geliştirici işi |
| Etkilenen gereksinimler | R-011, R-012, R-013, R-014 |

### ADR-014: Bırakma/tıklama hedef alanı taş ölçüsünden bağımsız, tek değişkenden

| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: **kabul** (karar Sahip, `tasokey#39`; numara istekte verildi) |
| Karar veren | Sahip (ürün: "hedef alanları büyütülsün") · teknik karşılık + uygulama Geliştirici |
| Bağlam | Köşe yığınının ve yer destesinin bırakma/tıklama hedefi, o öğenin **görünen** kutusuydu: köşede taş ölçüsü + `--kose-kaydirma`, destede `.yigin-tas-alani`ın `min-width/min-height`ı (ikisi de `--tas-genislik`/`--tas-yukseklik`ten). Hedef taş boyuna bağlı olduğu için dar kademelerde (telefon yatay: taş 25×36 px) isabet alanı da küçülüyordu; taşı köşenin birkaç piksel dışına bırakmak hamleyi düşürüyor (`surukle.js` `elementFromPoint` ile hedefi bulamıyor), R-012/R-013'ün dokunma yolu zorlaşıyordu. Hedefi taşı büyüterek açmak **yasak**: görünüm `STIL.md`/R-015'e bağlı (K4, Sahip kapısı) |
| Karar | (1) Hedef alanının payı `stil.css` `:root` içindeki **tek** değişkendir: `--hedef-pay`. (2) Köşe (`.kose`) ve yer destesi (`#yerDestesi`) bu payı görünmez bir sözde öğeyle (`::after`, `position: absolute`, `inset: calc(-1 * var(--hedef-pay))`) kazanır — taşın ve kutunun `width/height`ı **değişmez**, düzen kaymaz. (3) Değer `calc(var(--masa-bosluk) / 2)`: masa ızgarasının hücre boşluğunun yarısı. Komşu hücre (ıstaka paneli, kenar çubuğu, öbür köşe) o boşluğun ötesinde durduğundan halka hiçbir kademede komşunun kutusuna **girmez**, kademe değişince (`--masa-bosluk` küçülünce) kendiliğinden küçülür; kuralların içine sayı yazılmaz (ADR-015'in "tek kaynak" dili). (4) `arayuz/` JS'i değişmez: sözde öğeye yapılan isabet **sahibini** hedef verir, yani tıklama yine `.kose`/`#yerDestesi`'nde doğar ve `document.elementFromPoint(...).closest(...)` (`surukle.js`) yine onları döndürür. (5) Halkanın kendi yığılma kademesi yoktur → masa kademesinde kalır (ADR-015), kalıcı pencerenin altında |
| Seçenekler | B) Köşe/destenin kendi `min-width/min-height`ını ya da dolgusunu büyütmek — reddedildi: ızgara hücresini büyütür, dört kenar düzenini (ADR-012) ve `844×390`da zar zor sığan yerleşimi (R-014, `tasokey#32`) bozar. C) Taşı büyütmek — reddedildi: görünüm kararı Sahip'te (K4), istek açıkça "taşın görünen ölçüsü değişmez" diyor. D) `surukle.js`'te bırakma noktasına en yakın hedefi mesafeyle seçmek (JS tarafı tolerans) — reddedildi: aynı kuralı ikinci bir yerde (JS'te) tanımlar, dokunma/klavye yolunda karşılığı olmaz ve "ne kadar yakın" sayısı yine kodun içine yazılır. E) Payı her kademede elle px olarak yazmak — reddedildi: beş yerde tutulan bir sayı, `--masa-bosluk` değişince sessizce komşuya girer |
| Sonuçlar | Kolaylaştırır: isabet alanı masaüstünde ~%66 büyür (köşe 68×92 → 92×116 px) ve hedef ölçüsü tek satırdan okunur; `testler/hedef-alani.test.js` (a) ölçünün o değişkenden geldiğini, (b) her duyarlı kademede çözümlenebilir pozitif bir uzunluk olduğunu, (c) boşluğun yarısını geçmediğini (komşuyu örtmediğini), (d) taş ölçüsünün değişmediğini gerçek `calc()` hesabıyla ölçer. **Zorlaştırır / bilinen sınır:** pay boşluğa bağlı olduğundan en dar kademede (`844×390`, `--masa-bosluk: 6px`) yalnız **3 px** olur — parmakla oynanan en küçük ekranda kazanç en az; orada boşluğu büyütmek ayrı bir düzen işidir (§7 risk 10). Hedef halkası destenin başlık/sayaç/ipucu metinlerinin bir kısmını da kapsar (hepsi etkileşimsiz, görünüm değişmez): o metinlere tıklamak artık desteye tıklamak sayılır |
| Etkilenen gereksinimler | R-012, R-013 (dokunma/sürükleme yolu kolaylaştı) · R-009/R-015 (görünüm değişmedi: taş ölçüsü aynı) |

### ADR-015: Yığılma kademeleri tek kaynak; kalıcı pencere her zaman en üstte

| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: **kabul** (K2 — Mimar; uygulama `tasokey#38`, karar belgeye `tasokey#38` hakemliğinde yazıldı) |
| Karar veren | Mimar (K2; arayüz katmanının iç düzeni, Sahip'in "sonuç penceresi her zaman en üstte" isteğinin teknik karşılığı) · uygulama Geliştirici |
| Bağlam | Belirti `is/tasokey-35/ekler/image-2.png`: "El bitti!" penceresi açıkken deste taşı pencerenin metnini örtüyordu. Sebep (ölçüldü): deste taşı `ekran.js`'te JS'ten `z-index: 10` alıyordu, pencerenin z-index'i `auto` idi; aynı yığılma bağlamında konumlanmış ve pozitif z-index'li eleman `auto` elemandan sonra boyanır. `stil.css`'te ayrıca çıplak `z-index: 5` gibi sayılar vardı → aynı kural iki yerde (CSS + JS), hangi şeyin hangi şeyin üstünde olduğu hiçbir yerde okunamıyordu |
| Karar | (1) Yığılma kademelerinin **tek kaynağı** `stil.css` `:root` içindeki `--kademe-*` değişkenleridir: `--kademe-masa: 0`, `--kademe-masa-pay: 20`, `--kademe-tas-secili: 100`, `--kademe-tas-surukleniyor: 110`, `--kademe-pencere: 300`. Sıra **masa < seçili taş < sürüklenen taş < kalıcı pencere**. (2) Hiçbir CSS kuralında çıplak z-index sayısı yazılmaz; her kural `var(--kademe-*)` okur, yığın içi sıra gerekiyorsa `calc(var(--kademe-masa) + var(--yigin-sira, 0))` biçiminde hesaplanır. (3) `arayuz/ekran.js` **z-index yazmaz**; JS yalnız yığın İÇİ sırayı `--yigin-sira` özel değişkeni olarak verir — kademe kararı CSS'te kalır. (4) Kalıcı pencereler (sonuç, ileride başlangıç/onay) `--kademe-pencere` kullanır ve açıkken masadaki ya da sürüklenen hiçbir taş bunların üstüne boyanmaz. (5) Kademeler arasındaki boşluk (20/100/110/300) araya yeni kademe eklenebilsin diye bilerek geniştir; yeni kademe eklemek bu ADR'yi günceller, kuralın içine sayı yazmak değil |
| Seçenekler | B) Pencereye tek seferlik büyük bir z-index vermek (ör. `z-index: 9999`) — reddedildi: belirtiyi kapatır, sebebi (iki kaynak) kapatmaz; bir sonraki yeni katmanda aynı hata tekrarlar. C) Kademeleri JS'te bir sabit tabloda tutup DOM'a yazmak — reddedildi: sunum kararını `arayuz/ekran.js`'e taşır, kaynak CSS'ten okunamaz hâle gelir ve her çizimde yeniden yazılır. D) Pencereyi ayrı bir yığılma bağlamına/`dialog` üstüne almak — reddedildi (şimdilik): sıfır bağımlılık kısıtıyla uyumlu olsa da kademe sorununu ortadan kaldırmaz, yalnız bir örneğini gizler |
| Sonuçlar | Kolaylaştırır: "ne neyin üstünde" tek dosyadan okunur; `testler/yigilma-kademeleri.test.js` kaynak taramasıyla (a) kademelerin tek kaynaktan geldiğini, (b) pencere kademesinin sürüklenen taşınkinden büyük olduğunu, (c) JS'in z-index yazmadığını, (d) `stil.css`'te çıplak z-index kalmadığını doğrular → kural bir daha sessizce bozulamaz (ADR-002'nin kaynak taraması dilinin aynısı). Ölçüldü: `npm test` 264/264; 4 yatay boyutta (1920×1080, 1280×800, 1180×820, 844×390) ekran görüntüsü — `image-2.png`'deki belirti tekrar etmedi. **Zorlaştırır / bilinen sınır:** kural "pencere her zaman en üstte" olduğu için **844×390**'da sonuç penceresi, el bitince açılan üst rakibin ıstakasını tamamen örtüyor (ölçüldü, `is/tasokey-38/ekran/el-bitti-pencere-telefon-yatay.png`); o el pencere kapanmadan okunamaz. Küçük ekranda pencerenin konumu/kapatılabilirliği **ayrı iş** ve ürün kararıdır (Sahip), kademe sırası bu yüzden değiştirilmez (§7 risk 9) |
| Etkilenen gereksinimler | — (arayüz hatası + Sahip'in ek bilgisi: el bitince rakip ıstakaları açılır). İlgili: R-011, R-015 (okunurluk) |

### ADR-017: Bitiş iki ayrı denetimin VEYA'sı; per = seri + sayı peri, çift = birebir aynı taş
> Numara `GDD.md` v3 ve `PRD.md` v3'te (tasokey#36) bu kararı gösteriyordu; ADR-013 ve ADR-016 boş kaldı
> (ADR-015 `tasokey#38`'de, ADR-014 `tasokey#39`'da yazıldı — yukarıda).

| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: **kabul** (karar Sahip, `tasokey#35`; motor karşılığı `tasokey#37`) |
| Karar veren | Sahip (kural kararı) · uygulama Geliştirici |
| Bağlam | Motor `tasokey#6/#7`'den beri eski (yanlış) tanımla çalışıyordu: "çift = aynı sayı, 2 farklı renk" ve "bitiş = elin per/çift gruplarına herhangi bir bölünüşü". Sahip'in ekran görüntüsünde (`is/tasokey-35/ekler/image.png`) bu yüzden bitmeyen bir el "Elini bitirebilirsin" diye vurgulandı. `GDD.md` v3 kural 6, 7, 13 gerçek Klasik Okey tanımını yazdı; kod karşılığı yoktu |
| Karar | (1) `cekirdek/dizilim.js` `perGecerliMi` iki biçimi birden kabul eder: **seri** (aynı renk, ardışık ≥3) **veya sayı peri** (aynı sayının 3-4 farklı renkteki taşı; aynı renk bir perde iki kez bulunamaz). (2) `ciftGecerliMi` yalnız **birebir aynı** iki taşı kabul eder (aynı sayı **ve** aynı renk); okey/sahte okey çiftte de yerine geçer, gösterge taşının kendisi çift sayılmaz (kural 9). (3) `cekirdek/cozucu.js` `elBitirilebilirMi` **iki ayrı aramanın VEYA'sıdır**: (a) el tamamen per gruplarına bölünüyor mu, (b) el tam 7 birebir çift mi (14 taş). İki arama ayrı yürür; tek bir "grup" aramasında birleştirilmez, böylece karışık dizilim yapı gereği reddedilir. (4) Bu üçü `kural.js`'e ayar olarak **girmez** — ADR-008'in dört ayarı kaynak çelişkisiydi, bunlar kuralın kendisi |
| Seçenekler | B) Tek geri izlemeli aramaya "grup = per ya da çift" diye devam edip sonunda karışımı elemek — reddedildi: karışık çözümü önce bulup sonra atmak hem daha pahalı hem de "neden bitmedi" sorusunu kodda okunmaz kılar. C) Çifti `kural.js`'e ayar yapmak (eski/yeni tanım arasında anahtar) — reddedildi: iş metninde açıkça yasaklandı ve iki tanım aynı anda doğru olamaz; eski tanım yanlıştı, ayar değil |
| Sonuçlar | Kolaylaştırır: bitiş kuralı GDD kural 13'le birebir okunur; ekran görüntüsündeki el regresyon testi oldu (`el-bitiren-taslar.test.js` (e)). Ölçüm: tek el kontrolü ort. **0,0295 ms**, `elBitirenTaslar` ort. **1,2777 ms** (20 ms bütçesinin altında). **Zorlaştırır:** bitirmek gerçekten zorlaştı — `bot/kolay.js`'in sezgiseli hâlâ eski tanıma göre puanlıyor (aynı sayı/farklı renk = "çift adayı") ve 200 ellik dayanıklılık koşusunda 20 el tur sınırına çarpıyor (ölçüldü; 10 000 turda da bitmiyor, deste hiç boşalmıyor çünkü botlar sürekli atılandan çekiyor). Bot sezgiselinin ADR-017'ye göre yenilenmesi **ayrı iş**tir (R-006, `GDD.md` §4 "Karar yöntemi") → **ADR-018 ile kapandı** (aynı iş, Mimar hakemliğinden sonra) |
| Etkilenen gereksinimler | R-004, R-005 (karşılandı) · R-006 (ADR-018 ile karşılandı) |

### ADR-018: Bot kuralı kopyalamaz, `cekirdek`'e sorar; el sonlanması sezgisele bağlı değildir

| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: **kabul** (K2 — Mimar) |
| Karar veren | Mimar (K2; `GDD.md` §4 "Karar yöntemi" algoritma ayrıntısını Mimar/Geliştirici'ye bırakır) · uygulama Geliştirici (`tasokey#37`) |
| Bağlam | ADR-017 kuralı daralttı. `bot/kolay.js` kuralın **eski** tanımını sezgiseline kopyalamıştı ("aynı sayı, farklı renk = çift adayı, +4 puan"), bu yüzden kural değişince sessizce hizasız kaldı — ADR-002'nin kaynak taraması bu kopyayı göremiyordu. Aynı puan skalası çekim kaynağını da seçtiğinden (`puan >= 3` ise atılandan çek) 14 taşlı elde eşik pratikte hep aşılıyor, dört bot da sürekli atılandan çekiyor, **yer destesi hiç azalmıyordu**; `el.js`'in berabere çıkışı (GDD kural 12) yalnız deste boşalınca tetiklendiği için elin sonlanması için hiçbir mekanizma kalmıyordu. Ölçüldü: 200 elin **20'si** `TUR_SINIRI`'ne çarpıyor (tıkanan ellerde deste 19-42 taşta donuyor), 10 000 turda da bitmiyor |
| Karar | (1) `bot/` kural sorularını (`bu taşlar geçerli per mi / birebir çift mi / hangi taşı atarsam el biter`) `cekirdek/dizilim.js` ve `cekirdek/cozucu.js`'in **saf işlevlerine sorar**, kendi geçerlilik mantığını yazmaz. "İki taş aynı perde buluşabilir mi?" sorusu araya bir joker konup `perGecerliMi`'ye sorulur — cevabı kural verir, bot renk/sayı karşılaştırması yapmaz. (2) Bot el başına **tek bitiş yoluna** yönelir (`bitisYolunuSec`: elde en az 5 birebir çift varsa çift yolu, yoksa per yolu), karışık el toplamaz — ADR-017 karışık bitişi yasakladığı için karışık toplama yapısal olarak bitmeyen el üretir. (3) **Atılandan çekme yalnız kuralla doğrulanmış gerçek tamamlamada** yapılır (üst taş elin gerçek taşlarıyla tamamlanmış bir per ya da birebir çift kuruyorsa); jokerle kurulan tamamlama saymaz (joker saklanır), başka her durumda **yerden** çekilir. Böylece yer destesi monoton azalır ve el ya biter ya kural 12 ile berabere olur — sonlanma sezgisel kalibrasyonuna değil kurala bağlanır. (4) Geçerliliğe son kararı hâlâ `cekirdek/el.js` verir; bot yalnız öneri üretir (ADR-002 korunur). (5) Bu üçü `kural.js`'e **ayar olarak girmez**; bot sezgiselinin eşikleri (`CIFT_YOLU_EN_AZ_CIFT`) kural değil öneri ayrıntısıdır |
| Seçenekler | B) Puanlamayı yeniden kalibre edip eşiği elde tutmak — reddedildi: ölçüldü, tıkalı el 20 → **29** kötüleşti; sonlanma yine tek bir sihirli eşiğe bağlı kalır. C) `VARSAYILAN_MAKSIMUM_TUR`'u yükseltmek — reddedildi: ölçüldü, 500/2000/10 000'de **aynı 20 el** bitmiyor, süre 4,5 s → 88 s. D) R-006'nın "0 sonlanmayan el" ölçütünü gevşetmek — reddedildi: ürün ölçütünü düşürür (Sahip kapısı) ve kusuru gizler |
| Sonuçlar | Kolaylaştırır: kural bir daha değiştiğinde bot kendiliğinden hizalanır (tek kaynak); el sonlanması ölçülebilir hâle gelir; `bot-kolay.test.js`'in kaynak kontrolü artık **doğru şeyi** ölçer (kuralı yeniden yazmak yasak, `cekirdek`'in saf işlevini çağırmak serbest). Ölçüldü (200 el, sabit tohum 90000+): `turSiniri` **20 → 0**, ihlal 0, bitti **194**, berabere **6**, ortalama tur **103,1 → 32,7**, yer destesi tükenen el %3,5, çekim kaynağı ATILAN %33,4 / YER %66,6, çift yolu seçilen tur oranı %2,6. **Zorlaştırır:** tur başına `cekirdek` çağrısı arttı → dayanıklılık koşusu **4,5 s → 17,6 s** (bütçe 60 s; ağır çözücü çağrısı tur başına en çok bir kez, taş puanlaması ucuz `dizilim.js` çağrılarıyla). Teorik sonlanma garantisi yoktur (tamamlanan grubu bozan bir atış döngü kurabilir — **tahmin**, ölçümde görülmedi); görülürse yedek yol botun kendi içinde el başına atılandan çekme sınırıdır, kurala dokunmaz |
| Etkilenen gereksinimler | R-003, R-004, R-006 (karşılandı) |

## 6. Test yaklaşımı

| Tür | Ne ile | Tek komut |
|---|---|---|
| Öz-test / birim (`cekirdek/`, `bot/`, `dil/`) | Node yerleşik koşucu | `npm test` |
| Katman sınırı denetimi (DOM/`Math.random` sızıntısı) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Dil anahtarı taraması (anahtarsız metin = 0) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Bot dayanıklılığı | 200 el × sabit tohumlarla tam el koşusu | aynı komut (uzun test etiketiyle) |
| Arayüz / kilometre taşı denemesi | `python -m http.server 8777` + başsız Edge/CDP ekran görüntüsü | işin raporunda komut + görüntü |

Ekran görüntüsü kanıtı — sabit 4 boyut + 1 uyarı kanıtı (profilin "3 oran + tablet" karşılığı; ADR-012'den sonra set
**yatay** yönlüdür, çünkü oyun alanı zaten yalnız yatayda gösterilir — R-014):
**1920×1080** (geniş masaüstü) · **1280×800** (dar masaüstü) · **1180×820** (tablet yatay) · **844×390** (telefon yatay, dört
kenar düzeni sığdırılmış) · **390×844** (telefon **dikey**, uyarı kanıtı — oyun alanı değil, "telefonu yan çevir" dil anahtarlı
uyarısı görünür, R-014).

## 7. Bilinen riskler ve doğrulanacaklar

| # | Konu | Durum | Nasıl ölçülecek |
|---|---|---|---|
| 1 | **Bitirilebilirlik çözücüsü** (eli per/çift gruplarına tam bölme, 2 okey + 2 sahte okey joker olarak) işin en zor parçası; geri izlemeli arama yanlış ya da yavaş olabilir. Bot her turda çağırdığı için maliyet çarpılır | **ölçüldü** (tasokey#37): tek el kontrolü ort. 0,0295 ms, `elBitirenTaslar` ort. 1,2777 ms (bütçe 20 ms); 200 ellik bot koşusu 17,6 s (bütçe 60 s, ADR-018 sonrası) | İş 5 ve iş 7 kabul ölçütü: ölçülen süre rapora yazılır; tahmin tutmazsa önbellek/budama ayrı iş olur |
| 2 | Deste tükenmesi (kural boşluğu) | **kapandı** (ADR-008/4: el berabere) | İş 6'nın öz-testi bu durumu kapsar; bot koşusunda "0 sonlanmayan el" ölçülür |
| 3 | `12-13-1` geçişi, gösterge sahte okey çıkması, okey atma | **kapandı** (ADR-008/1-3) | İş 3, 4, 6 tablo testleri |
| 4 | Mobil dikeyde 15 taşlık raf + masa + atılan yığın sığmayabilir | **kapandı** (R-014 ile: dikeyde sığdırma denenmez, oyun alanı yerine dil anahtarlı uyarı gösterilir; bkz. ADR-012) | 390×844 ekran görüntüsü: oyun alanı değil, uyarı görünür; 844×390 (yatay): dört kenar düzeni sığdırılmış görünür |
| 5 | Sürükleyerek dizmenin dokunmatikte çalışması (tarayıcı işaretçi olayları) | **doğrulanacak** | İş 8: mobil boyutta işaretçi olaylarıyla deneme + ekran görüntüsü |
| 6 | Arayüz işlerinin manifesti: 8777 portu ve tarayıcı sürücüsü yazılı değilse iş `izin_gerek` döner | **bilinen eksik** | Çekirdek iş 8'i açarken manifeste port + sürücü yazar |
| 7 | `kraftdcm/tasokey` uzak deposu ve Pages ayarı ofisten görülemez; `git remote` boş (**ölçüldü**) | **Masa'da** | Sahip depoyu açar/Pages'i açar; ofis yalnız `docs/` üretir |
| 8 | Kit'te "web oyunu" profili yok (D-26) | **eksik** | `profil-oyun-web-taslak.md` yazıldı; kit'e girmesi Sahip onayı ister (kit değişikliği) |
| 10 | ADR-014'ün hedef payı ızgara boşluğunun yarısı olduğundan en dar kademede (`844×390`) yalnız 3 px: parmakla oynanan en küçük ekranda kazanç en az | **bilinen sınır** (ölçüldü: `--masa-bosluk: 6px`) | Masa boşluğunu/kenar paylarını telefon yatayda büyütmek ayrı düzen işidir; ölçüt gerçek dokunmayla denemedir (Sahip) |
| 9 | 844×390'da (telefon yatay) sonuç penceresi, el bitince açılan üst rakibin ıstakasını örtüyor; o el pencere kapanmadan okunamaz. İki istek (pencere her zaman en üstte + el bitince rakip ıstakaları açılsın) bu ölçüde çakışıyor | **Masa'da / Sahip kararı** (pencere konumu ya da kapatılabilirlik ürün kararı; ADR-015 kademe sırası değişmez) | 844×390 ekran görüntüsü: pencere açıkken üst kenar ıstakası görünür mü (bugün görünmüyor — `is/tasokey-38/ekran/el-bitti-pencere-telefon-yatay.png`) |
