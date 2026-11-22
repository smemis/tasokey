# MIMARI: Taş Okey

> Şablon kaynağı: `kit\sablonlar\MIMARI.md` · `ofis-sistem-rehberi.md` Bölüm 3, 6, 12, D-6.
> **K1 onayı alındı** (Sahip, 2026-11-19, toplu onay — bütün sorular önerilen seçenekle): kural seti, yığın,
> barındırma, 4 kural ayrıntısı ve görsel ton onaylı; ADR durumları ve karar verenler [ayrıntı](MIMARI-AYRINTI.md#başlıktaki-k1-onayı-bloğu--tam-metin).

> **Son sürüm: 26** (`tasokey#78`, 2026-11-22) — **ADR-026**: `MIMARI.md` **dizindir**; tablo
> hücrelerinin ve bölüm gövdelerinin yürürlükteki ayrıntısı [MIMARI-AYRINTI.md](MIMARI-AYRINTI.md)'de,
> karar gövdeleri `adr/`de, tarihsel gerekçe [DEGISIKLIK.md](DEGISIKLIK.md#sürüm-26--tasokey78)'de.

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| Mimari karar sürümü | `26` (**ADR-026** `MIMARI.md` dizindir; ayrıntı [MIMARI-AYRINTI.md](MIMARI-AYRINTI.md), 2026-11-22, tasokey#78 — eski zincir: [DEGISIKLIK.md](DEGISIKLIK.md#sürüm-26--tasokey78)) |
| Bağlı PRD sürümü | `3` (`tasokey#36`, R-004/R-005 kural düzeltmesi) |
| Profil | `kit\profiller\` içinde yok → `profil-oyun-web-taslak.md` (bu klasör; kit'e girmesi Sahip onayı ister, D-26) |
| Hazırlayan | Mimar, 2026-11-19 |

## 1. Genel bakış

Taş Okey: tarayıcıda çalışan, **sunucusuz** (yalnız statik dosya) tek kişilik **Klasik Okey** — 1 oyuncu + 3 bot [ayrıntı](MIMARI-AYRINTI.md#1-genel-bakış--giriş).

```
  cekirdek/   saf kural motoru (DOM yok, rastgelelik dışarıdan verilir)  ← npm test burayı test eder
  bot/        karar verici; cekirdek'i kullanır, kuralı kendi yorumlamaz
  arayuz/     DOM + CSS: masa, raf, sürükleme, dil, kayıt
```

Tek yönlü bağımlılık: `arayuz → bot → cekirdek`; bot ve insan **aynı** kural motorunu kullanır [ayrıntı](MIMARI-AYRINTI.md#1-genel-bakış--bağımlılık-yönü).

## 2. Teknoloji yığını (ADR-001 — K1'de Sahip onayladı)

| Katman | Seçim | Gerekçe | ADR |
|---|---|---|---|
| Dil | Standart JavaScript, ES2022 modülleri (`import`/`export`) | Derleme ve paketleme adımı yok; tarayıcı dosyayı doğrudan çalıştırır | ADR-001 |
| Kütüphane / çatı | **Yok** (sıfır bağımlılık) | [ayrıntı](MIMARI-AYRINTI.md#yığın-2--gerekçe) | ADR-001 |
| Sunum | DOM + CSS (her taş bir HTML öğesi) | [ayrıntı](MIMARI-AYRINTI.md#yığın-3--gerekçe) | ADR-001 |
| Test | Node yerleşik test koşucusu | **Ölçüldü** (2026-11-19): `node v22.20.0`, `npm 10.9.3` kurulu → `node --test` ek paket istemiyor | ADR-004 |
| Tek test komutu | `npm test` | Profil kuralı: testler tek komuttan çalışır | ADR-004 |
| Geliştirme sunucusu | `python -m http.server 8777` (**ölçüldü**: Python 3.12.10 kurulu) | ES modülleri `file://` üzerinden çalışmaz; yerel statik sunucu şart. Port manifestte yazılı olmalı (profil) | ADR-004 |
| Barındırma | GitHub Pages, statik; `kraftdcm/tasokey` deposunun `docs/` klasörü | Sunucu yok (tek kişilik, bota karşı); adres standardı korunur | ADR-005 |
| Kayıt | `localStorage`, şema sürümlü | Hesap yok, kişisel veri yok (PRD §8) | ADR-006 |
| Dil | `diller/tr.json`, `diller/en.json` + anahtar taraması | Sabit metin yasak (CLAUDE.md, R-008) | ADR-007 |
| Kural ayrıntıları | 4 çelişkili noktada K1 varsayılanları; tek yerde ayar olarak | Kaynaklar çelişiyor (ARASTIRMA §2); değiştirmesi ucuz kalmalı | ADR-008 |
| Android kabuğu (**ürün kapsamı Sahip'te**) | Tek `Activity` + kendi yazdığı varlık sunuculu WebView; **sıfır dış kütüphane** (`androidx`/`android.support` kaynaklarda hiç geçmez), `uses-permission` **0 satır** | [ayrıntı](MIMARI-AYRINTI.md#yığın-11--gerekçe) | ADR-020 |
| Android derleme zinciri | Unity kurulumunun içindeki JDK + Android SDK araçları (`aapt2` → `javac` → `d8` → `zipalign` → `apksigner`); **Gradle ve Android Studio yok** [ayrıntı](MIMARI-AYRINTI.md#yığın-12--seçim) | [ayrıntı](MIMARI-AYRINTI.md#yığın-12--gerekçe) | ADR-020 |

Değerlendirilen ama önerilmeyen yollar ADR-001'in "Seçenekler" satırında. Android için değerlendirilip
reddedilenler (`file://`, `androidx.webkit`, yeniden yazmak, Gradle) ADR-020'nin "Seçenekler" satırında.

## 3. Modüller ve sınırlar

| Modül | Sorumluluk | Bağımlı olduğu | Saf mantık mı (test edilebilir) |
|---|---|---|---|
| `cekirdek/tas.js` | Taş kimliği (renk + sayı + nüsha), 106'lık setin kurulması | — | evet |
| `cekirdek/karma.js` | Tohumlu (deterministik) karıştırıcı | — | evet |
| `cekirdek/kural.js` | K1 kural varsayılanları (ADR-008) tek nesnede; motorun okuduğu tek kural kaynağı | — | evet |
| `cekirdek/dagitim.js` | 15/14/14/14 dağıtım, gösterge açma, o elin okey taşını belirleme | tas, karma, kural | evet |
| `cekirdek/dizilim.js` (ADR-017) | Per (seri + sayı peri) ve çift geçerliliği; ardışık sayı pencerelerinin tek kapısı (`ardisikPencereUret`) | tas, kural | evet |
| `cekirdek/cozucu.js` (ADR-017) | "Bu el bitirilebilir mi?" kararı ve **el dökümü**nün (`elDokumu`) tek kaynağı — ikisi ayrıdır | dizilim | evet |
| `cekirdek/el.js` | El durumu, sıra, hamle doğrulama (çek/at), el sonu koşulları | dagitim, cozucu, kural | evet |
| `cekirdek/puan.js` | El sonucu ve puan: kalan taş sayıları + oyuncu başına döküm (`dokumler`) | el, cozucu, kural | evet |
| `bot/bot.js` (ADR-018 + ADR-013) | `bot/` katmanının **tek girişi** (`botTurOyna`): çekme/atma sezgiseli ve üç zorluk kademesi | cekirdek (dizilim, cozucu, el, kural, tas, dagitim, karma) | evet |
| `arayuz/ekran.js` | Masa, raf ve atılan taş yığınının çizimi + olay bağlama (kararı kendisi vermez) | cekirdek, dil, yerlesim, kabuk, raf | hayır (DOM) |
| `arayuz/kabuk.js` (ADR-016) | Arayüz kabuğunun **tek durum makinesi**: hangi ekran açık, hangi zorluk, bekleyen pencere | bot (kademe adları), cekirdek (`EL_SONUCU`) | evet |
| `arayuz/surukle.js` | Sürükleme hareketi (Pointer Events) ve **sürüklemenin görsel dilinin tek kapısı** (ADR-021) | ekran, etkilesim | hayır (DOM) |
| `arayuz/raf.js` (ADR-019) | Istakanın yuva sayıları ve **bütün yerleşim kuralları** (tazeleme, bırakma, yeni el kurma) | — | evet |
| `arayuz/yerlesim.js` (ADR-012) | Dört kenar/köşe ızgarasının eşlemesi; iz ölçüleri `stil.css`tedir ve kuralın parçasıdır | cekirdek (kural — sıra yönü) | evet |
| `arayuz/etkilesim.js` (ADR-010/012) | Sürükleme/dokunmanın **hedefinin** ve **kaynağının** hangi oyun eylemine karşılık geldiği | cekirdek, yerlesim | evet |
| `dil/cevir.js` | Anahtar → metin; eksik anahtarda görünür hata | — | evet |
| `kayit/depo.js` | `localStorage` sarmalayıcı + şema sürümü (**2**) ve kayıtta duran alanların tek listesi (`ALANLAR`) | — | hayır (tarayıcı API) |
| `android/` (ADR-020) | Android kabuğu ve APK zinciri — oyunun **dışında** duran ayrı ağaç; sınır tek yönlü (`android → docs`) | — (yalnız derleme anında `docs/` kopyası) | kısmen |

Hücrelerin kısaltılmış metninin tam karşılığı, tablodaki sırayla [Ek 1](MIMARI-AYRINTI.md#ek-1--3-modül-hücrelerinin-ayrıntısı)'de.

Sınır kuralı: `cekirdek/` ve `bot/` altında `document`, `window`, `localStorage`, `Math.random` **geçmez**. Bu bir öz-test ile
ölçülür (kaynak taraması), tahminle değil (iş 1'in kabul ölçütü).

## 4. Veri ve kayıt

Tek anahtar `tasokey.kayit` (JSON), şema **sürüm 2** (ADR-016/`tasokey#42`): **yalnız** `dilKodu` ve `zorluk`;
şema dışı alan okunmaz ve yazılmaz, sürüm uyuşmazsa kayıt atılır (taşıma kodu yok). Kişisel veri, çerez,
analitik ve dışarıya istek **yok** (PRD §8). Yayından sonra kayıt şeması **donmuş alandır** (R sınıfı,
Masa'da). Şemanın, kaydın atılma kuralının ve gerekçelerinin tam metni: [ayrıntı](MIMARI-AYRINTI.md#4-veri-ve-kayıt--tam-metin).

## 5. Mimari kararlar (ADR) — dizin

Karar gövdeleri `adr/` klasöründe, her karar **tek** dosyada (ADR-025). Bu tablo dizindir: bağlayıcı metin dosyanın kendisidir; her satırın
"tek satır karar" hatırlatması [ayrıntı ekinde](MIMARI-AYRINTI.md#ek-4--5-dizininin-tek-satır-karar-sütunu).
Yeni karar = yeni dosya + bir satır.

| # | Başlık | Durum | Dosya |
|---|---|---|---|
| 001 | Sıfır bağımlılık düz JavaScript + DOM | **kabul** (K1) | [dosya](adr/ADR-001-sifir-bagimlilik-js-dom.md) |
| 002 | Saf kural motoru; bot ve insan aynı motoru kullanır | kabul\* | [dosya](adr/ADR-002-saf-kural-motoru.md) |
| 003 | Rastgelelik tohumlu ve enjekte edilir | kabul\* | [dosya](adr/ADR-003-tohumlu-rastgelelik.md) |
| 004 | Tek komut test ve yerel sunucu | kabul\* (sürüm 2) | [dosya](adr/ADR-004-tek-komut-test-ve-sunucu.md) |
| 005 | Barındırma — kraftdcm hesabında ayrı proje deposu + GitHub Pages | kabul\* | [dosya](adr/ADR-005-barindirma-github-pages.md) |
| 006 | Kayıt — localStorage + şema sürümü, taşıma yok | kabul\* | [dosya](adr/ADR-006-kayit-localstorage-sema.md) |
| 007 | Dil dosyası ve yazı tipi — dışarıya istek yok | kabul\* | [dosya](adr/ADR-007-dil-dosyasi-ve-yazi-tipi.md) |
| 008 | Kural seti Klasik Okey; çelişkili 4 ayrıntı tek yerde ayar | kabul\* (sürüm 3) | [dosya](adr/ADR-008-kural-seti-klasik-okey.md) |
| 009 | Görsel tonda kumar/para çağrışımı yok | kabul\* | [dosya](adr/ADR-009-kumar-cagrisimi-yok.md) |
| 010 | Atılan taş — oyuncu başına ayrı köşe yığını | kabul\* | [dosya](adr/ADR-010-kose-yiginlari.md) |
| 011 | Taş gövdesi SVG + DOM rakam katmanı | kabul\* | [dosya](adr/ADR-011-tas-govdesi-svg.md) |
| 012 | Dört kenar grid yerleşimi + telefon dikey uyarısı | kabul\* | [dosya](adr/ADR-012-dort-kenar-grid-yerlesim.md) |
| 013 | Bot zorluk kademeleri aynı sezgiselin üç ayarıdır; `bot/` tek girişten oynar | kabul\* | [dosya](adr/ADR-013-bot-zorluk-kademeleri.md) |
| 014 | Bırakma/tıklama hedef alanı taş ölçüsünden bağımsız, tek değişkenden | kabul\* | [dosya](adr/ADR-014-hedef-alani-tek-degisken.md) |
| 015 | Yığılma kademeleri tek kaynak; kalıcı pencere her zaman en üstte | kabul\* | [dosya](adr/ADR-015-yigilma-kademeleri.md) |
| 016 | Arayüz tek durum makinesine bağlanır; zorluk seçimi kayıt şemasında | kabul\* | [dosya](adr/ADR-016-arayuz-durum-makinesi.md) |
| 017 | Bitiş iki ayrı denetimin VEYA'sı; per = seri + sayı peri, çift = birebir aynı taş | kabul\* | [dosya](adr/ADR-017-bitis-denetimi-per-cift.md) |
| 018 | Bot kuralı kopyalamaz, `cekirdek`'e sorar; el sonlanması sezgisele bağlı değildir | kabul\* | [dosya](adr/ADR-018-bot-cekirdege-sorar.md) |
| 019 | Istaka yerleşimi tek saf modülde; yer değiştirme yok, taş kendine yer açar | kabul\* | [dosya](adr/ADR-019-istaka-yerlesimi-raf.md) |
| 020 | Android kabuğu — izinsiz tek WebView, varlıklar APK içinden https kökeniyle sunulur | **koşullu kabul** | [dosya](adr/ADR-020-android-webview-kabugu.md) |
| 021 | Sürükleme görsel dili tek kapıdan — parmağı kopya izler, asıl taş kaynağında görünmez | kabul\* | [dosya](adr/ADR-021-surukleme-gorsel-dili.md) |
| 022 | Oyuncunun ıstakası ve taşları tek ölçek değişkeninden büyür; değer kademe başına ölçülür | kabul\* (sürüm 3) | [dosya](adr/ADR-022-istaka-olcek-degiskeni.md) |
| 023 | Ofis içi arayüz ölçümü plan + `ekran_gerek` yolundan alınır; sürücünün tarayıcı kipi Masa yoludur | kabul\* | [dosya](adr/ADR-023-ofis-arayuz-olcumu.md) |
| 024 | Kısa yatay ekranlarda masa, ayrı bir düzen varyantı kullanır: dikey zincir en çok üç taş boyu taşır | **kabul** (Mimar-K2) | [dosya](adr/ADR-024-kisa-yatay-duzen-varyanti.md) |
| 025 | Her mimari karar kendi dosyasında; MIMARI.md dizindir | **kabul** (Mimar-K2) | [dosya](adr/ADR-025-adr-dosya-basina.md) |
| 026 | MIMARI.md dizindir; hücre ayrıntısı MIMARI-AYRINTI.md'de | **kabul** (Mimar-K2) | [dosya](adr/ADR-026-mimari-dizin-ayrinti-eki.md) |

`*` Bu kararların dosyasında ayrı bir **Durum** satırı yok; yürürlükteki kararlar arasında duruyorlar.

## 6. Test yaklaşımı

| Tür | Ne ile | Tek komut |
|---|---|---|
| Öz-test / birim (`cekirdek/`, `bot/`, `dil/`) | Node yerleşik koşucu | `npm test` |
| Katman sınırı denetimi (DOM/`Math.random` sızıntısı) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Dil anahtarı taraması (anahtarsız metin = 0) | Kaynak taraması, aynı koşucu içinde | aynı komut |
| Bot dayanıklılığı | Sabit tohumlarla tam el koşusu, **üç kademe** (orta 200 el, kolay/zor 100 el — ADR-013 süre gerekçesi) | aynı komut (uzun test etiketiyle) |
| Bot zorluk kademesi gücü (kazanma oranı) | Kademe başına 200 el, koltuk 0 ölçülen kademe + koltuk 1-3 orta | `node testler/bot-zorluk.olcum.js` [ayrıntı](MIMARI-AYRINTI.md#kanıt-5--tek-komut) |
| Android kabuğu kaynak denetimi (ADR-020 maddeleri) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-6--ne-ile) | `npm test` — **JDK, SDK, emülatör ve cihaz istemez** |
| Android araç zinciri ve derleme betiğinin mantığı | [ayrıntı](MIMARI-AYRINTI.md#kanıt-7--ne-ile) | aynı komut |
| APK içeriği ve depo hijyeni | Sentetik APK üzerinde `dogrula.ps1` mantığı + depo taramaları (`testler/android-apk.test.js`) | aynı komut [ayrıntı](MIMARI-AYRINTI.md#kanıt-8--tek-komut) |
| Arayüz denemesi — **ofis yolu** (ADR-023) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-9--ne-ile) | `node testler/<ad>.olcum.js --plan <dosya>` [ayrıntı](MIMARI-AYRINTI.md#kanıt-9--tek-komut) |
| Arayüz denemesi — **Masa yolu** (ADR-023) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-10--ne-ile) | `node testler/<ad>.olcum.js --cikti <klasor>` [ayrıntı](MIMARI-AYRINTI.md#kanıt-10--tek-komut) |
| Sürükle-bırak hedefleri | [ayrıntı](MIMARI-AYRINTI.md#kanıt-11--ne-ile) | `npm test` [ayrıntı](MIMARI-AYRINTI.md#kanıt-11--tek-komut) |
| Kısa yatay düzen varyantı (ADR-024) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-12--ne-ile) | `npm test` |
| Sürükle-bırak hedefleri **yeni düzende** (ADR-024) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-13--ne-ile) | `npm test` [ayrıntı](MIMARI-AYRINTI.md#kanıt-13--tek-komut) |
| Yerleşim çakışması (öğe çiftleri, kesişim alanı, taşma) | [ayrıntı](MIMARI-AYRINTI.md#kanıt-14--ne-ile) | `npm test` [ayrıntı](MIMARI-AYRINTI.md#kanıt-14--tek-komut) |

Kısaltılan "Tür" hücrelerinin tam metni, tablodaki sırayla [Ek 12](MIMARI-AYRINTI.md#ek-12--6-kanıt-satırlarının-tür-hücresi)'de.

Ekran görüntüsü kanıtı — sabit 4 boyut + 1 uyarı kanıtı (profilin "3 oran + tablet" karşılığı; ADR-012'den sonra set
**yatay** yönlüdür, çünkü oyun alanı zaten yalnız yatayda gösterilir — R-014):
**1920×1080** (geniş masaüstü) · **1280×800** (dar masaüstü) · **1180×820** (tablet yatay) · **844×390** (telefon yatay, dört
kenar düzeni sığdırılmış) · **390×844** (telefon **dikey**, uyarı kanıtı — oyun alanı değil, "telefonu yan çevir" dil anahtarlı
uyarısı görünür, R-014).

## 7. Bilinen riskler ve doğrulanacaklar

| # | Konu | Durum | Nasıl ölçülecek |
|---|---|---|---|
| 1 | **Bitirilebilirlik çözücüsü** işin en zor parçası; bot her turda çağırdığı için maliyet çarpılır | **ölçüldü** (tasokey#37, ADR-018 → [gerekçe](DEGISIKLIK.md#risk-1)) | İş 5 ve iş 7 kabul ölçütü: ölçülen süre rapora yazılır; tahmin tutmazsa önbellek/budama ayrı iş olur |
| 2 | Deste tükenmesi (kural boşluğu) | **kapandı** (ADR-008/4: el berabere) | İş 6'nın öz-testi bu durumu kapsar; bot koşusunda "0 sonlanmayan el" ölçülür |
| 3 | `12-13-1` geçişi, gösterge sahte okey çıkması, okey atma | **kapandı** (ADR-008/1-3 → [gerekçe](DEGISIKLIK.md#risk-3)) | İş 3, 4, 6 tablo testleri + `tasokey#50`, `tasokey#66` iki yönlü ölçümleri |
| 4 | Mobil dikeyde 15 taşlık raf + masa + atılan yığın sığmayabilir | **kapandı** (R-014, ADR-012 → [gerekçe](DEGISIKLIK.md#risk-4)) | [ayrıntı](MIMARI-AYRINTI.md#risk-4--nasıl-ölçülecek) |
| 5 | Sürükleyerek dizmenin dokunmatikte çalışması (tarayıcı işaretçi olayları) | **kısmen ölçüldü, açık** (tasokey#64, tasokey#69 → [gerekçe](DEGISIKLIK.md#risk-5)) | [ayrıntı](MIMARI-AYRINTI.md#risk-5--nasıl-ölçülecek) |
| 6 | Arayüz işlerinin manifesti: 8777 portu ve tarayıcı sürücüsü yazılı değilse ölçüm sürücüsünün tek komutlu kipi ofiste koşmaz | **kapandı** (ADR-023, tasokey#67 → [gerekçe](DEGISIKLIK.md#risk-6)) | [ayrıntı](MIMARI-AYRINTI.md#risk-6--nasıl-ölçülecek) |
| 7 | `kraftdcm/tasokey` uzak deposu ve Pages ayarı ofisten görülemez; `git remote` boş (**ölçüldü**) | **Masa'da** | Sahip depoyu açar/Pages'i açar; ofis yalnız `docs/` üretir |
| 8 | Kit'te "web oyunu" profili yok (D-26) | **eksik** | `profil-oyun-web-taslak.md` yazıldı; kit'e girmesi Sahip onayı ister (kit değişikliği) |
| 10 | ADR-014'ün hedef payı ızgara boşluğunun yarısı olduğundan en dar kademede (`844×390`) yalnız 3 px: parmakla oynanan en küçük ekranda kazanç en az | **bilinen sınır** (ölçüldü: `--masa-bosluk: 6px`) | Masa boşluğunu/kenar paylarını telefon yatayda büyütmek ayrı düzen işidir; ölçüt gerçek dokunmayla denemedir (Sahip) |
| 11 | Bot **kademe seçimi arayüzde yok** (ADR-013): arayüz sabit orta kademeyi çağırıyordu | **kapandı** (ADR-016, tasokey#42 → [gerekçe](DEGISIKLIK.md#risk-11)) | [ayrıntı](MIMARI-AYRINTI.md#risk-11--nasıl-ölçülecek) |
| 9 | 844×390'da sonuç penceresi, el bitince açılan üst rakibin ıstakasını örtüyor | **Masa'da / Sahip kararı** (ADR-015 → [gerekçe](DEGISIKLIK.md#risk-9)) | [ayrıntı](MIMARI-AYRINTI.md#risk-9--nasıl-ölçülecek) |
| 12 | Unity'nin JDK/SDK araç yolları ve sürümleri `tasokey#52` planında **tahmin**di | **ölçüldü** (tasokey#53 → [gerekçe](DEGISIKLIK.md#risk-12)) | [ayrıntı](MIMARI-AYRINTI.md#risk-12--nasıl-ölçülecek) |
| 13 | `classes.dex`i APK'ya ekleme yolu: build-tools'ta `aapt` v1 (`add`) var mı, yoksa .NET `ZipArchive` mi kullanılacak | **ölçüldü** (tasokey#53 → [gerekçe](DEGISIKLIK.md#risk-13)) | [ayrıntı](MIMARI-AYRINTI.md#risk-13--nasıl-ölçülecek) |
| 14 | `javac -source 8 -target 8` desteği (yeni JDK'lar 8'i kaldırıyor); desteklemezse `--release 11` + `d8` desugar denenecekti | **ölçüldü** (tasokey#53 → [gerekçe](DEGISIKLIK.md#risk-14)) | [ayrıntı](MIMARI-AYRINTI.md#risk-14--nasıl-ölçülecek) |
| 15 | "Ses dokunma gerektirmeden çalabilsin" ayarı (`setMediaPlaybackRequiresUserGesture(false)`, ADR-020/7) **bugün doğrulanamıyor**: oyunda ses yok (ölçüldü — `docs/` altında ses çalma çağrısı **0**). Ayar yazıldı ama etkisi gözlenemiyor | **doğrulanamaz (bugün)** | Ses işi açılınca cihazda deneme (Sahip). O güne kadar kaynak taraması yalnız **ayarın yazılı olduğunu** ölçer, çaldığını değil (`testler/android-kabuk.test.js`) |
| 16 | Cihaz denemesi ofiste **yapılamaz** (kayıtlı cihaz ve emülatör yok): kurulum, oyunun açılması, dokunmayla oynanması, döndürmede elin sürmesi, geri tuşu sorusu, kaydın kalıcılığı, çentik. `apksigner verify` "paket bozulmadı" der, **"oyun açılır" demez** — bu ayrımın bedeli ölçüldü (`tasokey#56`: imzası doğrulanmış APK'nın içinde varlık adları yanlış ayraçla yazılıydı, cihazda hiçbir varlık bulunamazdı) | **Sahip'te** | Sahip APK'yı **kayıtlı** bir cihaza kurar (Sahip'in telefonuna kurulum yapılmaz); adımlar `android/OKU.md` §6/8. Ofisin ölçebildiği en uç nokta: `powershell -File android/dogrula.ps1 -Apk <yol>` → `eşleşen 32/32 · eksik 0 · fazla 0 · boyut farkı 0` (`tasokey#57` gerçek koşusu) |
| 17 | `derle.ps1`in Drive kopyalama kolu ofiste **denenmedi**: `G:` ofis manifestinde yok, deneme koşuları `-DriveYok` ile yapıldı | **Masa'da** | [ayrıntı](MIMARI-AYRINTI.md#risk-17--nasıl-ölçülecek) |
| 18 | Ofis deneme eki çelişkisi: kit `yayin\google-play.md` §5 `.ofis` / "(Ofis)" diyor, Sahip bu işte `.deneme` / " (Deneme)" istedi; `derle.ps1` Sahip'in sözcüğünü uyguluyor | **çelişki duruyor (öneri)** | Kit metnini değiştirmek **Sahip kararıdır** (kit değişikliği; ofis ajanı kit'e yazamaz). Öneri `tasokey#52` raporu §8'de ve `tasokey#58` raporunda duruyor; karar gelene kadar tek kaynak `derle.ps1`in ek bloğudur |
| 19 | Yayın durumu "yok"tan çıkınca paket adı, imza, sürüm kodu ve SDK sayıları **donar** | **bilinen sınır** (ADR-020/4 → [gerekçe](DEGISIKLIK.md#risk-19)) | [ayrıntı](MIMARI-AYRINTI.md#risk-19--nasıl-ölçülecek) |
| 20 | Mağaza paketi (**AAB**) bu zincirle üretilmiyor | **Masa'da** (tasokey#53 → [gerekçe](DEGISIKLIK.md#risk-20)) | [ayrıntı](MIMARI-AYRINTI.md#risk-20--nasıl-ölçülecek) |
| 21 | Varlık sunucusunun saf mantığı (`VarlikSunucusu.varlikYolu`, `mimeTuru`) bugün **kaynak taramasıyla** ölçülüyor, gerçek girdilerle değil — ADR-020 "Sonuçlar" (c) maddesi bu riskin §7'ye girmesini söz verdi. Kabuk `tasokey#56`'da gerçekten derlendi ve imzalı APK çıktı (yani sözdizimi artık doğrulandı), ama bu iki metot hiç **çağrılmadı** | **açık** | `javac` zinciri elde (`ARACLAR.md` §4): iki metot test çatısı gerektirmeyen küçük bir Java koşucusuyla gerçek girdilerle (`..`, boş segment, `%2e`/`%2f`/`%5c`, ters bölü, `:`, bilinmeyen uzantı, kök `/`) ölçülebilir — **ayrı iş**; bugünkü taramanın maddeleri gerçekten ölçtüğü mutasyonla kanıtlandı (`tasokey#54`: 21/21 kırmızı) |
| 22 | Yazılım katmanı (ADR-020/12) WebView'in GPU hızlandırmasını kapatır: başka cihazda ya da ileride animasyon eklendiğinde bedeli (kare süresi, pil, ısınma) **ölçülmedi**; ofiste cihaz yok. Kabuk bu işte **derlenmedi** de (`tasokey#61`: araç izni yok), yani çağrının çalışma zamanı etkisi değil yalnız **yazılı olduğu** ölçüldü | **Sahip'te** | Sahip cihazda deneme; ofis yalnız ayarın yazılı olduğunu ölçer (risk 15 ile aynı sınır). Bedel görülürse `OyunEtkinligi.WEBVIEW_YAZILIM_KATMANI` **kapatılır** (tek satır; kapalı kol `LAYER_TYPE_NONE`) ve oyun tarafındaki `tasokey#59` çözümü tek başına denenir |
| 23 | Aynı belirti (sürüklemede boyama/iz bozulması) iki katmanda çözülü: oyun tarafında taşın kopyası (`tasokey#59`), kabukta yazılım katmanı (ADR-020/12). Hangisinin tek başına yettiği **ölçülmedi** | **açık** | Cihazda iki kombinasyon denenerek ölçülür (Sahip; anahtar kapatılıp bir kez daha denemek bu soruyu kapatır); karar gelene kadar ikisi de durur — ikisi de ayrı ayrı zararsızdır |
| 24 | Ölçüm sürücülerinin **Masa yolu** (ADR-023/2) ofiste **hiç koşturulmadı** | **Masa'da** | [ayrıntı](MIMARI-AYRINTI.md#risk-24--nasıl-ölçülecek) |
| 25 | ADR-024'ün dayandığı "dikey zincir **4 taş boyu**" teşhisi (plan §2) **hesaptı** | **ölçüldü, teşhis doğrulandı** (tasokey#71, tasokey#73 → [gerekçe](DEGISIKLIK.md#risk-25)) | [ayrıntı](MIMARI-AYRINTI.md#risk-25--nasıl-ölçülecek) |
| 26 | Varyant **istenmeyen bir boyutta** devreye girip masaüstü düzenini bozabilir (eşik bir sayıdır, sessizce kayabilir) | **kapandı** (tasokey#68, ADR-024/7 → [gerekçe](DEGISIKLIK.md#risk-26)) | [ayrıntı](MIMARI-AYRINTI.md#risk-26--nasıl-ölçülecek) |
| 27 | Durum satırının **en uzun** metni iki satıra sarıp yeni (üç taş boylu) zinciri taşırabilir — şerit `tasokey#73`te daraltıldı | **ölçüldü, sınır yazılı** (tasokey#73 → [gerekçe](DEGISIKLIK.md#risk-27)) | [ayrıntı](MIMARI-AYRINTI.md#risk-27--nasıl-ölçülecek) |
| 28 | Mevcut ızgara savları varyantın **dört bandını** reddedebilir ya da tersi | **kapandı** (tasokey#74 → [gerekçe](DEGISIKLIK.md#risk-28)) | [ayrıntı](MIMARI-AYRINTI.md#risk-28--nasıl-ölçülecek) |
| 29 | `istaka.svg` / `tas-govde.svg` varyantta 1,45-1,65 kat gerilir: bulanıklık riski yok (vektör) ama **görsel beğeni** ölçülemez | **Sahip'te (K4)** | Ekran görüntüleri her turda raporda (`is/tasokey-71…74/ekran/`); beğeni kararı Sahip'in, V işi planlanmadı |
| 30 | Sahip'in **"ıstaka en az 1,6 kat büyüsün"** ölçütü yalnız 844x390'da karşılandı: 800x360'ta ölçülen tavan **1,45**, 900x600'de **1,25**. Metin kaldırmadan (ADR-022 Seçenek D'ye gitmeden) daha fazlası ölçülemedi | **Sahip kararı bekliyor** (ürün/erişilebilirlik) | 800x360'ta bağlayıcı terim `durum=rakip` sayfa taşması, 900x600'de yatay sayfa taşması (`#kenarSagAd` + `#kenarSag`, 13-15 px). Daha fazla ölçek isteniyorsa iki yol var: (a) metin etiketlerini kaldırmak — **Sahip kararı**, (b) kenar şeritlerinin yatay payını düzenlemek — ayrı düzen işi |

Kapanmış/Masa'da/ölçülmüş satırların kısaltılmış "Konu" hücrelerinin tam metni, tablodaki sırayla [Ek 6](MIMARI-AYRINTI.md#ek-6--7-risk-satırlarının-konu-hücresi)'da; "Nasıl ölçülecek" hücreleri satır başına bağlantıyla [Ek 2](MIMARI-AYRINTI.md#ek-2--7-risk-satırlarının-nasıl-ölçülecek-hücresi)'de. Açık 10 riskin (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) üç hücresi yukarıda **tam** metinle duruyor.
