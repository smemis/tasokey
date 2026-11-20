# MIMARI: Taş Okey

> Şablon kaynağı: `kit\sablonlar\MIMARI.md` · `ofis-sistem-rehberi.md` Bölüm 3, 6, 12, D-6.
> **K1 onayı alındı** (Sahip, 2026-11-19, toplu onay — bütün sorular önerilen seçenekle): kural seti **Klasik Okey**,
> yığın **sıfır bağımlılık düz JavaScript + DOM**, barındırma **kendi deposu + GitHub Pages**, 4 kural ayrıntısı
> **önerilen varsayılanlarla sabit**, görsel tonda **kumar/para çağrışımı yok**. ADR-001, ADR-005, ADR-008, ADR-009
> durumu **kabul** (karar veren Sahip-K1); ADR-002, ADR-003, ADR-004, ADR-006, ADR-007 durumu **kabul** (karar veren
> Mimar-K2, K1 kapsamında onaylı yığın/akışın ayrıntısı).

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| Mimari karar sürümü | `2` (K1 onaylı; ADR-004 sürüm 2, Mimar-K2, 2026-11-19, tasokey#3) |
| Bağlı PRD sürümü | `1` (K1 onaylı, `PRD.md`) |
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
| `cekirdek/dizilim.js` | Per ve çift geçerliliği; okey/sahte okey yerine geçme | tas, kural | evet |
| `cekirdek/cozucu.js` | "Bu el bitirilebilir mi?" — elin tamamını geçerli gruplara tam bölme araması | dizilim | evet |
| `cekirdek/el.js` | El durumu, sıra, hamle doğrulama (çek/at), el sonu koşulları | dagitim, cozucu, kural | evet |
| `cekirdek/puan.js` | El sonucu ve puan | el | evet |
| `bot/kolay.js` | Hangi taşı çeker / atar (sezgisel); hamleyi `el.js`'e onaylatır | cekirdek | evet |
| `arayuz/ekran.js` | Masa, raf, atılan taş yığını; olay bağlama | cekirdek, dil | hayır (DOM) |
| `arayuz/surukle.js` | Taş seçme ve rafta sürükleyerek dizme | ekran | hayır (DOM) |
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

## 6. Test yaklaşımı

| Tür | Ne ile | Tek komut |
|---|---|---|
| Öz-test / birim (`cekirdek/`, `bot/`, `dil/`) | Node yerleşik koşucu | `npm test` |
| Katman sınırı denetimi (DOM/`Math.random` sızıntısı) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Dil anahtarı taraması (anahtarsız metin = 0) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Bot dayanıklılığı | 200 el × sabit tohumlarla tam el koşusu | aynı komut (uzun test etiketiyle) |
| Arayüz / kilometre taşı denemesi | `python -m http.server 8777` + başsız Edge/CDP ekran görüntüsü | işin raporunda komut + görüntü |

Ekran görüntüsü kanıtı — sabit 4 boyut (profilin "3 oran + tablet" karşılığı):
**1920×1080** (geniş masaüstü) · **1280×800** (dar masaüstü / tablet yatay) · **820×1180** (tablet dikey) · **390×844** (mobil dikey).

## 7. Bilinen riskler ve doğrulanacaklar

| # | Konu | Durum | Nasıl ölçülecek |
|---|---|---|---|
| 1 | **Bitirilebilirlik çözücüsü** (eli per/çift gruplarına tam bölme, 2 okey + 2 sahte okey joker olarak) işin en zor parçası; geri izlemeli arama yanlış ya da yavaş olabilir. Bot her turda çağırdığı için maliyet çarpılır | **tahmin**: tek el kontrolü ≤ 20 ms, 200 el koşusu ≤ 60 s | İş 5 ve iş 7 kabul ölçütü: ölçülen süre rapora yazılır; tahmin tutmazsa önbellek/budama ayrı iş olur |
| 2 | Deste tükenmesi (kural boşluğu) | **kapandı** (ADR-008/4: el berabere) | İş 6'nın öz-testi bu durumu kapsar; bot koşusunda "0 sonlanmayan el" ölçülür |
| 3 | `12-13-1` geçişi, gösterge sahte okey çıkması, okey atma | **kapandı** (ADR-008/1-3) | İş 3, 4, 6 tablo testleri |
| 4 | Mobil dikeyde 15 taşlık raf + masa + atılan yığın sığmayabilir | **doğrulanacak** | İş 11: 390×844 ekran görüntüsü; taş/düğme kesilmiyor ve okunur |
| 5 | Sürükleyerek dizmenin dokunmatikte çalışması (tarayıcı işaretçi olayları) | **doğrulanacak** | İş 8: mobil boyutta işaretçi olaylarıyla deneme + ekran görüntüsü |
| 6 | Arayüz işlerinin manifesti: 8777 portu ve tarayıcı sürücüsü yazılı değilse iş `izin_gerek` döner | **bilinen eksik** | Çekirdek iş 8'i açarken manifeste port + sürücü yazar |
| 7 | `kraftdcm/tasokey` uzak deposu ve Pages ayarı ofisten görülemez; `git remote` boş (**ölçüldü**) | **Masa'da** | Sahip depoyu açar/Pages'i açar; ofis yalnız `docs/` üretir |
| 8 | Kit'te "web oyunu" profili yok (D-26) | **eksik** | `profil-oyun-web-taslak.md` yazıldı; kit'e girmesi Sahip onayı ister (kit değişikliği) |
