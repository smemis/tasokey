# MIMARI ayrıntı eki: Taş Okey

> Bu dosya `MIMARI.md`'nin **ayrıntı ekidir** (ADR-026, `tasokey#78`): belge bir **dizin** oldu,
> tablo hücrelerinin ve bölüm gövdelerinin yürürlükteki tam metni buraya **birebir** taşındı
> (bayt farkı 0 ölçüldü: `node testler/ayrinti-tasima.olcum.js`). Tablodaki satır, numarası ve
> kimliği `MIMARI.md`'de **duruyor**; hücrede tek cümle + buraya bağlantı kaldı.
>
> Bu dosya **yürürlükteki** ayrıntıdır (tarihsel gerekçe ve ölçüm günlüğü
> [DEGISIKLIK.md](DEGISIKLIK.md)'de, karar gövdeleri [adr/](adr/ADR-026-mimari-dizin-ayrinti-eki.md)'de).
> Güncel dizin: [MIMARI.md](MIMARI.md).

## Ek 1 — §3 modül hücrelerinin ayrıntısı

### cekirdek/dizilim.js (ADR-017) — sorumluluk

Per (seri + sayı peri) ve çift (birebir aynı taş) geçerliliği; **okey (joker)** eksik taşın yerine geçer, **sahte okey geçmez** — o, `dagitim.js` → `tasDegeri`den sorulan kendi değerindeki (o elin okeyi) sıradan taştır (ADR-027, `tasokey#81`). Ardışık sayı pencerelerinin tek kapısı (`ardisikPencereUret`): dönüşlü seri ayarını (ADR-008/1) yalnız burası okur, çözücü ve bot buradan sorar

### cekirdek/cozucu.js (ADR-017) — sorumluluk

"Bu el bitirilebilir mi?" — iki ayrı arama: elin tamamen per gruplarına bölünmesi **ya da** tam 7 birebir çift olması. Ayrıca **el dökümü** (`elDokumu` + `dokumSirasi` + `dokumGruplari`, `tasokey#39` / `tasokey#85`): elin en çok taşı kapsayan per bölümü + kalanın birebir çiftleri + per dışı taşlar; el sonu gösteriminin (dizilim ve sayılar) ve ıstakayı gruplu dizmenin tek kaynağı. Dökümün **önceliği** seçenektir (ADR-028 `DOKUM_ONCELIGI`: `per` varsayılan, `cift` çiftleri elin tamamından ayırır). Bitiş kararından ayrıdır — döküm bitmemiş eli de böler

### cekirdek/puan.js — sorumluluk

El sonucu ve puan: kalan taş sayıları + oyuncu başına döküm (`dokumler`: per / çift / per olmayan / okey sayıları — `tasokey#39` ek bilgisi)

### bot/bot.js (ADR-018 + ADR-013) — sorumluluk

`bot/` katmanının **tek girişi**: `botTurOyna(durum, oyuncu, kademe, secenekler)`. Hangi taşı çeker / atar (sezgisel): bitiş yolunu seçer, en izole taşı atar, atılandan yalnız gerçek tamamlamada çeker. Üç zorluk kademesi (kolay/orta/zor) aynı sezgiselin üç ayarıdır (`KADEME_AYARI` tek kaynak); kolay kademenin zayıflatma zarı `karma.js`'in tohumlu üretecinden gelir, tohum durumdan türetilir. Kural sorularını `dizilim.js`/`cozucu.js`'in saf işlevlerine sorar, kendi per/çift tanımını yazmaz; hamleyi `el.js`'e onaylatır

### arayuz/ekran.js — sorumluluk

Masa, raf, atılan taş yığını; olay bağlama. Hangi panelin görünür olduğunu ve botların hangi kademeyle oynadığını kendisi karar vermez: `kabuk.js`'e sorar (ADR-016); ıstaka yuvalarının yerleşimini de kendisi hesaplamaz: `raf.js`e sorar (ADR-019)

### arayuz/kabuk.js (ADR-016) — sorumluluk

Arayüz kabuğunun **tek durum makinesi**: hangi ekran açık (`baslangic` → `masa` → `sonuc` → `baslangic`), hangi zorluk kademesi oynanıyor, bekleyen bir onay sorusu (`onay`: "Oyunu bitir", `tasokey#43`) ya da bilgilendirme penceresi (`bilgi`: "okey atıldı", `tasokey#50`) var mı ve sonuç penceresinin döküm bölümü açık mı (`dokumAcik`, `tasokey#50`). Geçişler yalnız burada tanımlı; kayıttan gelen bozuk/eski zorluk değeri burada varsayılana düşer; bot turu kabuğun zorluğuyla `bot/bot.js`'in tek girişine iletilir (`botTurunuOynat`); bot sırasının koşulu ve zamanlayıcıyla bekleyen bir bot turunun hâlâ geçerli olup olmadığı da burada (`botSirasiMi`, `bekleyenBotTuruGecerliMi`, `tasokey#43`/`#50`)

### arayuz/surukle.js — sorumluluk

Sürükleme hareketi (Pointer Events): raftan sürükleyip rafa dizme ya da raf dışı hedefe bırakma; **desteden/köşe yığınından ıstakaya sürükleyerek çekme** (`tasokey#40`). Hangi hareketin hangi eyleme karşılık geldiğini `etkilesim.js`e sorar; bırakılan ıstaka yuvasının `slotIndex`'ini (`tasokey#48`, ADR-019) karara karıştırmadan yukarı bildirir. **Sürüklemenin görsel dilinin tek kapısıdır** (ADR-021): parmağı taşın **kopyası** izler (`surukleKopyasi`, kendi derleyici katmanında — `tasokey#59`), asıl taş kaynağında **görünmez** olur ama yerini korur ve eylem üretmeyen her bırakmada yeniden görünür; gizleme sınıfının adı (`SURUKLENIYOR_SINIFI`) buradan dışa verilir, görünüm kuralı `stil.css`tedir. Sürüklenen taşın kimliğini `ekran.js`e bildirir (gizleme yeniden çizimde yaşasın) ama çizim İSTEMEZ

### arayuz/raf.js (ADR-019) — sorumluluk

Istakanın (rafın) yuva sayıları (`RAF_SATIR_SAYISI`/`RAF_SUTUN_SAYISI`/`RAF_SLOT_SAYISI` — CSS `--raf-sutun-sayisi` de buradan okunur) ve **bütün yerleşim kuralları**: yeni ele göre tazeleme (`rafYerlesimiGuncelle`; çekilen taş bırakıldığı yuvaya ya da yuva verilmezse ilk boş yuvaya), bırakma (`tasiYuvayaTasi`: yer değiştirme yok, taş kendine yer açar — hedef doluysa sıra içinde en yakın boşluğa doğru itme, eşitlikte sağa, sıra doluysa taşan taş diğer sıranın ilk boş yuvasına, iki sıra doluysa değişiklik yok) yeni el kurma (`yerlesimKur`) ve **gruplu dizme** (`yerlesimDiz`, ADR-028: bloklar soldan sağa, aralarında tam bir boş yuva, blok satır içinde bölünmez, aralıklı dizim 24 yuvaya sığmazsa boşluksuz paketlenir). Blokların içeriğine ve sırasına karar vermez — onun kaynağı `cozucu.js` `dokumGruplari`dır. Oyun kuralı değildir (GDD §2: dizme motora hiç gitmez); girdisini değiştirmez, hep yeni yerleşim döner

### arayuz/yerlesim.js (ADR-012) — sorumluluk

Dört kenar/köşe ızgarası: sıra yönüne göre hangi oyuncunun hangi kenarda, hangi köşe yığınının hangi oyuncuya ait olduğunu hesaplar; sonucu grid-area adı olarak döner. Izgaranın **iz ölçüleri** (hangi izin esnediği) bu modülde değil `docs/arayuz/stil.css`tedir ve kuralın parçasıdır (ADR-012 "Sonuçlar", `tasokey#63`): dış izler esnek → köşe = iki komşu ıstaka arasındaki boş bölge; bu yüzden `#masa` yüksekliğini **kaptan** alır (`flex: 1 1 0` + `min-height: 0`), kendi içeriğinden değil — yoksa masa viewport'u taşırır (R-014)

### arayuz/etkilesim.js (ADR-010/012) — sorumluluk

Sürükleme/dokunma **hedefinin** (deste, köşe yığını, raf konumu) ve sürüklemenin **kaynağının** (deste, köşe yığını — `cekmeKararVer`, `tasokey#40`) hangi oyun eylemine (çek/at/bitir) karşılık geldiğini saf mantıkla çözer; çekme kuralı tek yerde durur (dokunma ve sürükleme yolu aynı işlevi çağırır), hamleyi yine `cekirdek/el.js` onaylar

### kayit/depo.js — sorumluluk

`localStorage` sarmalayıcı + şema sürümü kontrolü (sürüm **2**, ADR-016); kayıtta duran alanların tek listesi (`ALANLAR`: dil + zorluk), şema dışı alanı okurken de yazarken de düşürür. Zorluğu **opak dize** olarak saklar — geçerliliğine `arayuz/kabuk.js` karar verir

### android/ (ADR-020) — sorumluluk

Android kabuğu ve APK zinciri — oyunun **dışında** duran ayrı bir ağaç: `kabuk/` (tek `Activity`, varlık sunucusu, TR/EN dizeler, tema, simge), `yol-coz.ps1` (araç zincirinin tek kaynağı), `derle.ps1` (tek komutla imzalı APK), `dogrula.ps1` (APK'nın içini `docs/` ile karşılaştırır). Oyun kuralı, arayüzü, dili ve kaydı **burada değildir**. Sınır tek yönlüdür: `android → docs`, o da yalnız **derleme anında kopyalayarak** — kabuk çalışırken `docs/` altındaki bir dosyayı adıyla tanımaz (varlık kökü ve varsayılan sayfa dışında), `docs/` değişince kabuk değişmez. Ters yön **yoktur**: `docs/` kabuğu bilmez, `cekirdek/`, `bot/`, `arayuz/` hiçbir Android kaynağına bağlı değildir

### android/ (ADR-020) — saf mantık mı

kısmen: saf mantık `VarlikSunucusu.varlikYolu`/`mimeTuru`, ama bugün **kaynak taramasıyla** ölçülüyor (gerçek girdilerle değil — §7 risk 21); `.ps1` betiklerinin mantığı sahte araç ağacıyla ölçülür

## Ek 2 — §7 risk satırlarının "Nasıl ölçülecek" hücresi

### Risk 4 — nasıl ölçülecek

390×844 ekran görüntüsü: oyun alanı değil, uyarı görünür; 844×390 (yatay): dört kenar düzeni sığdırılmış görünür

### Risk 5 — nasıl ölçülecek

Ölçülen kısım her turda: `node testler/surukleme-hedefi.olcum.js --plan <dosya>` (ofis yolu) + `npm test` kuralı. Kalan kısım **Masa'da**: Sahip gerçek dokunmatik ekranda (telefon tarayıcısı ya da Android kabuğu) beş yolu dener; o güne kadar raporlarda "gerçek dokunmayla doğrulanmadı" yazılır

### Risk 6 — nasıl ölçülecek

Her arayüz işinde plan yolu kullanılır (ADR-023/1); manifest eklemesi yalnız Masa yolunu ofise taşımak istenirse gündeme gelir ve **Sahip kararıdır**

### Risk 11 — nasıl ölçülecek

Öz-test: `testler/kabuk.test.js` (seçilen kademe botun tek girişine geçiyor; zor/orta aynı durumda farklı çekiyor), `testler/kayit.test.js` (seçim kayıttan geri okunuyor), `testler/baslangic-ekrani.test.js` (arayüz kademe adı yazmıyor); ekran görüntüsü `tasokey#42` raporunda

### Risk 9 — nasıl ölçülecek

844×390 ekran görüntüsü: pencere açıkken üst kenar ıstakası görünür mü (bugün görünmüyor — `is/tasokey-38/ekran/el-bitti-pencere-telefon-yatay.png`)

### Risk 12 — nasıl ölçülecek

`powershell -File android/yol-coz.ps1 -Rapor -UnityKok "<…\PlaybackEngines\AndroidPlayer>"` → çıkış kodu **0**, `TAMAM (7/7 zorunlu araç + platform jar)`. Ham çıktı `is\tasokey-53\gercek-rapor-son.txt`, tablo `android/ARACLAR.md` §4. Unity sürümü yükseltilirse ölçüm aynı komutla yenilenir

### Risk 13 — nasıl ölçülecek

`yol-coz.ps1` raporunun "dex → APK yolu" satırı; iki kolun seçimi `testler/android-yol-coz.test.js`te sahte ağaçla ölçülüyor (`aapt` yoksa `zip-archive`e düşer)

### Risk 14 — nasıl ölçülecek

`yol-coz.ps1`in `-source 8` yoklaması (geçici dosya yazmadan; `ARACLAR.md` §2). JDK yükseltilirse aynı komut yeniden ölçer

### Risk 17 — nasıl ölçülecek

Masa'nın ilk derlemesinde dosya adı (`…\APK\<kimlik>\tasokey_yyyyMMdd_HHmm.apk`), "üstüne yazmadı" ve "hiçbir şey silmedi" kontrolü. Kolun **mantığı** sahte araç ağacıyla ölçülüyor (`testler/android-derle.test.js`); Drive yoksa atlama çıkış kodunu bozmuyor

### Risk 19 — nasıl ölçülecek

İlk Y (yayın) işinde uygunluk listesi. `android/OKU.md` §3 "Donmuş sayılar" tablosu ile `derle.ps1` ayar bloğunun **eşitliği** her `npm test`te ölçülüyor (`testler/android-apk.test.js`) — biri değişip öteki kalırsa kırmızı yanar

### Risk 20 — nasıl ölçülecek

AAB gerekirse ayrı iş: `bundletool`un gerçek koşusu ve çıktısı ölçülür (bugün yalnız varlığı ve sürümü ölçüldü). Mağazaya yükleme her durumda Sahip'te

### Risk 24 — nasıl ölçülecek

Sahip kendi makinesinde `node testler/yerlesim-cakisma.olcum.js --cikti <klasor>` koşar: 10 PNG + `olcum.json` + `once-tablosu.md` çıkar, sayıları ofisin plan yolundaki ölçümle (`is/tasokey-67/olcum.md`) karşılaştırılır. O güne kadar her raporda "ofiste doğrulanmadı" yazılır

### Risk 25 — nasıl ölçülecek

Her turda `durum=el` + `durum=rakip` ölçümü (`node testler/yerlesim-cakisma.olcum.js --plan <dosya>`): `durum=el`de çakışma 0 ve halka ∩ komşu 0, `durum=rakip`te yeni 0 / büyüyen 0, iki durumda taşma 0

### Risk 26 — nasıl ölçülecek

`npm test`; ayrıca masaüstü üç boyutta önce/sonra ölçümü (ıstaka/taş ölçüsü, çakışma, taşma birebir)

### Risk 27 — nasıl ölçülecek

Yeni dil anahtarı eklenince aynı ölçüm: en uzun TR/EN durum metni dört boyutta tek satır mı, sarıyorsa kırpılıyor mu (ekran görüntüsü)

### Risk 28 — nasıl ölçülecek

`npm test`. Varyanta yeni bant eklenirse `BEKLENEN_DUZENLER` tablosu da ölçülerek güncellenir (çıplak sayı yazılmaz); masa düzeni değişince `TARAYICI_OLCUMU` yeni çekim turundan **ölçülerek** yenilenir

## Ek 3 — §6 kanıt satırlarının "Ne ile" hücresi

### Kanıt 6 — ne ile

Kaynak taraması + PNG bayt/`pathData` ölçümü, aynı koşucu içinde: `testler/android-kabuk.test.js`, `testler/android-simge.test.js`

### Kanıt 7 — ne ile

**Sahte** Unity ağacı + gerçek araçların çıktı biçiminde davranan taslaklar (`testler/android-yol-coz.test.js`, `testler/android-derle.test.js`); hiçbir kuruluma bağlı değil, Windows dışında kendiliğinden atlanır

### Kanıt 9 — ne ile

`*.olcum.js --plan <dosya>` → `plan.json`; çekimi **çekirdeğin** penceresiz tarayıcısı yapar (`ekran_gerek` turu), ajan sunucu/tarayıcı açmaz

### Kanıt 10 — ne ile

Yerel statik sunucu (ADR-004, 8777, yalnız `127.0.0.1`) + boş profilli başsız Edge/CDP; sürücünün tek komutlu kipi, ölçümü `olcum.json` + PNG olarak yazar

### Kanıt 11 — ne ile

Saf çekirdek tablo testi (`testler/surukleme-hedefi.test.js`); aynı çekirdek sayfaya **gömülerek** ölçüm yolunda gerçek Pointer Events ile koşar — beş yolun her biri `gecti/kaldi/olculmedi` döner, köşe isabeti boş bölgeye serilen 5×5 ızgarayla ölçülür

### Kanıt 12 — ne ile

Statik CSS çözümlemesi + **tarayıcıda ÖLÇÜLEN** bant/masa kutusu tablosu (`testler/yardimci/sigdirma-butcesi.js` `OLCULEN_MASA_KUTUSU`, `testler/yardimci/masa-izleri.js` bant modeli): `testler/kisa-yatay-varyant.test.js`, `testler/kose-atma-alani.test.js` (iki düzen × kendi bütün kabul boyutları — paylaşılan düzende 3 iz, varyantta 4 bant), `testler/sigdirma-butcesi.test.js`

### Kanıt 13 — ne ile

Aynı saf çekirdek + sayfaya gömülen ölçüm; `koseAtmaAlani` yolunun `bolgeIsabetiEnAz80` denetimi oranı ölçütle karşılaştırır (`tasokey#69`da oran yalnız rapora yazılıyordu). ADR-014 **halka ∩ komşu kutu = 0** aynı turda, kendi aracıyla ölçülür (`yerlesim-cakisma` — halka çiftleri `halkaCiftleriniAyir` ile ayrı sayılır)

### Kanıt 14 — ne ile

Saf çekirdek tablo testi (`testler/yerlesim-cakisma.test.js`); aynı çekirdek sayfaya **gömülerek** ölçüm yolunda koşar, gömülenin modülle aynı sonucu verdiği ölçülür

## Ek 4 — §5 dizininin "Tek satır karar" sütunu

### ADR-001 — tek satır karar

Düz ES2022 JavaScript + DOM/CSS; derleme, paketleme, dış kütüphane yok.

### ADR-002 — tek satır karar

Kural yalnız `cekirdek/`te; hamleyi `el.js` onaylar, arayüz ve bot yorumlamaz.

### ADR-003 — tek satır karar

Rastgelelik tohumlu ve dışarıdan verilir; çekirdekte `Math.random` yok.

### ADR-004 — tek satır karar

Testler tek komutla Node koşucusundan; arayüz denemesi yerel `8777` sunucusundan.

### ADR-005 — tek satır karar

Yayın `kraftdcm/tasokey` deposunun `docs/` klasöründen GitHub Pages ile.

### ADR-006 — tek satır karar

Tek `localStorage` anahtarı + şema sürümü; uyuşmazlıkta kayıt atılır, taşıma yok.

### ADR-007 — tek satır karar

Metin dil anahtarından, yazı tipi sistemden; dışarıya hiç istek yok.

### ADR-008 — tek satır karar

Klasik Okey; kaynakların çelişkili dört ayrıntısı tek yerde ayardır.

### ADR-009 — tek satır karar

Para, jeton, zar ve bahis dili yok; yalnız okey taşı ve masa.

### ADR-010 — tek satır karar

Atılan taşlar oyuncu başına ayrı köşe yığınında; model motorda kalır.

### ADR-011 — tek satır karar

Gövde paylaşılan SVG, rakam onun üstündeki DOM metin katmanı.

### ADR-012 — tek satır karar

Masa üç satır/üç sütun CSS Grid; eşlemeyi saf `yerlesim.js` hesaplar.

### ADR-013 — tek satır karar

Üç zorluk aynı sezgiselin üç ayarı; `bot/` tek girişten oynar.

### ADR-014 — tek satır karar

Hedef payı `:root`ta tek değişken; alan sözde öğeyle büyür, düzen kaymaz.

### ADR-015 — tek satır karar

z-index yalnız `--kademe-*`ten okunur; kalıcı pencere en üstte.

### ADR-016 — tek satır karar

Arayüz tek saf durum makinesinden geçer; zorluk kayıt şemasındadır.

### ADR-017 — tek satır karar

Bitiş iki denetimin VEYA’sı: per (seri/sayı peri) veya yedi birebir çift.

### ADR-018 — tek satır karar

Bot kuralı `cekirdek`e sorar; el sonlanması sezgisele bağlı değildir.

### ADR-019 — tek satır karar

Istaka yerleşimi saf `raf.js`te; yer değiştirme yok, taş kendine yer açar.

### ADR-020 — tek satır karar

İzinsiz tek WebView; aynı `docs/` çıktısı APK içinden sunulur.

### ADR-021 — tek satır karar

Parmağı kopya izler; asıl taş görünmez olur ama yerini korur.

### ADR-022 — tek satır karar

Istaka ve taşlar tek `--istaka-olcek`ten büyür; değer kademe başına ölçülür.

### ADR-023 — tek satır karar

Ofis içi arayüz ölçümü plan + `ekran_gerek` yolundan; tarayıcı kipi Masa’da.

### ADR-024 — tek satır karar

Kısa yatay ekran ayrı düzen varyantı; dikey zincir en çok üç taş boyu.

### ADR-025 — tek satır karar

Her karar kendi `adr/` dosyasında; §5 yalnız dizin, gövde tekrarlanmaz.

### ADR-026 — tek satır karar

Tablo hücresi tek cümle + bağlantı; ayrıntı ekte, karar gövdesi `adr/`de.

### ADR-028 — tek satır karar

Gruplu dizmenin kapısı dökümün önceliğidir; dizme düğmesi ıstaka panelinin ölçülen boş payına girer, panelin kutusu büyümez.

## Ek 5 — §2 yığın tablosunun "Gerekçe" sütunu

### Yığın 2 — gerekçe

Paket kurulumu izin istemidir (profil: "yeni paket ya da araç kurulumu izin istemidir"; manifestte ağ yok). Sıfır bağımlılık = kurulum beklemesi yok, güvenlik yüzeyi yok, sürüm bakımı yok

### Yığın 3 — gerekçe

Okey 2B bir masa oyunu; tuval/3B gerekmiyor. Duyarlı düzen (R-009), sürükleme ve metin ölçeklemesi CSS ile bedava gelir — tuvalde elle yazılması gerekir

### Yığın 11 — gerekçe

Aynı `docs/` çıktısı cihazda **değişmeden** oynanır: oyunu Android için ikinci kez yazmak tek kaynak kuralını kırardı. ADR-001'in sıfır bağımlılık kuralının cihaz karşılığı; izin satırı olmadığı için çevrimdışı iddiası ölçülebilir kalır

### Yığın 12 — gerekçe

**Ölçüldü** (`tasokey#53`, `android/ARACLAR.md` §4): JDK **17.0.9**, build-tools **36.0.0**, `platforms/android-36/android.jar` var → paket kurulumu (izin istemi) ve ağ olmadan imzalı APK üretiliyor. Donmuş alanlar üç ayrı yerde durur: **paket adı** manifestte **varsayılan olarak yazılıdır** (`android/kabuk/AndroidManifest.xml` `package=`; öz-test bu değeri donmuş alan olarak sabitler) ve derlemede **zorunlu** `-Kimlik` parametresi `--rename-manifest-package` ile üzerine yazar; **imza anahtarı ve parolası** depoda **hiç durmaz**, her koşuda parametre olarak gelir; **en düşük/hedef Android sürümü ve API seviyesi** ise `derle.ps1`in **ayar bloğunda** sabittir (`$MIN_SDK`/`$HEDEF_SDK`/`$API_SEVIYESI`, tek kaynak — `android/OKU.md` §3) ve oradan `aapt2` bayrağı olarak geçer

## Ek 6 — §7 risk satırlarının "Konu" hücresi

### Risk 1 — konu

**Bitirilebilirlik çözücüsü** (eli per/çift gruplarına tam bölme; ADR-027'den beri joker yalnız **2 okey** — sahte okey kendi değerinde sıradan taştır) işin en zor parçası; geri izlemeli arama yanlış ya da yavaş olabilir. Bot her turda çağırdığı için maliyet çarpılır

### Risk 11 — konu

Bot **kademe seçimi arayüzde yok** (ADR-013): motor üç kademeyi oynatıyor, arayüz sabit `VARSAYILAN_KADEME` (orta) çağırıyor. Oyuncu kolay/zor seçemiyor

### Risk 9 — konu

844×390'da (telefon yatay) sonuç penceresi, el bitince açılan üst rakibin ıstakasını örtüyor; o el pencere kapanmadan okunamaz. İki istek (pencere her zaman en üstte + el bitince rakip ıstakaları açılsın) bu ölçüde çakışıyor

### Risk 12 — konu

Unity'nin JDK/SDK araç yolları ve sürümleri: `tasokey#52` planında **tahmin**di (manifest `C:\Program Files`'ı okumuyordu), yanlışsa bütün derleme zinciri yanlış yere bakardı

### Risk 19 — konu

Yayın durumu "yok"tan çıkınca paket adı, imza, sürüm kodu, en düşük/hedef Android sürümü **donar**; o andan sonra `derle.ps1`in sürüm formülünü ya da SDK sayılarını değiştirmek **R sınıfıdır** ve Masa'da yapılır

### Risk 24 — konu

Ölçüm sürücülerinin **Masa yolu** (ADR-023/2: yerel sunucu + başsız Edge/CDP) ofiste **hiç koşturulmadı**: sunucu başlatma, CDP istemcisi ve PNG yazımı yalnız **yazıldığı** ölçüldü, çalıştığı ölçülmedi. Ofisteki kabul "araç tek komutla koşuyor" bu yüzden açık kalır (`tasokey#67`). Ölçülebilen parçası argüman çözümüdür (tablo testi) ve dosyanın ana girişi doğrudan çağrı korumasının arkasındadır

### Risk 25 — konu

ADR-024'ün dayandığı "dikey zincir **4 taş boyu**" teşhisi (plan §2) **hesaptı**; yanlış olsa varyant beklenen kazancı vermezdi. Aynı aileden iki risk: el sonunda açılan **yan** rakip taşlarının kısalan bandı aşıp köşe hücrelerine ve ADR-014 halkasına girmesi (ADR-024/6), üst rakibin açık taşlarının **üst içerik bandındaki** deste/gösterge öbeğine çarpması (ADR-024/3)

### Risk 28 — konu

Mevcut ızgara savları (üç iz, `.kose` tek kural, `#koseSolUst` yalnız `grid-area`) varyantın **dört bandını** reddedebilir ya da tersi: sav varyanta uydurulurken **gevşetilebilir**

## Ek 7 — §4 "Veri ve kayıt" bölümünün gövdesi

### §4 Veri ve kayıt — tam metin

- Tek anahtar: `tasokey.kayit` (JSON) + içinde `surum` alanı. İçerik (şema **sürüm 2**, ADR-016/`tasokey#42`):
  **yalnız** `dilKodu` ve `zorluk`. Şema dışı alan (eski şemadan kalan ya da elle eklenmiş) okunmaz ve yazılmaz;
  ses açık/kapalı ve yarım kalmış el bugün saklanmıyor (gerektiğinde şema sürümü yine yükselir).
- Şema sürümü uyuşmazsa M1-M3'te **kayıt atılır ve yeniden başlatılır** (taşıma kodu yazılmaz; oyun yayınlanmadığı için
  taşınacak kullanıcı verisi yok). Yayından sonra kayıt şeması **donmuş alandır**: değişikliği R sınıfıdır, Masa'da yapılır.
- Kişisel veri, çerez, sayaç, analitik **yok** (PRD §8). Dışarıya ağ isteği yok (üçüncü taraf yazı tipi/CDN dahil → ADR-007).

## Ek 8 — Başlıktaki K1 onayı bloğu

### Başlıktaki K1 onayı bloğu — tam metin

> **K1 onayı alındı** (Sahip, 2026-11-19, toplu onay — bütün sorular önerilen seçenekle): kural seti **Klasik Okey**,
> yığın **sıfır bağımlılık düz JavaScript + DOM**, barındırma **kendi deposu + GitHub Pages**, 4 kural ayrıntısı
> **önerilen varsayılanlarla sabit**, görsel tonda **kumar/para çağrışımı yok**. ADR-001, ADR-005, ADR-008, ADR-009
> durumu **kabul** (karar veren Sahip-K1); ADR-002, ADR-003, ADR-004, ADR-006, ADR-007 durumu **kabul** (karar veren
> Mimar-K2, K1 kapsamında onaylı yığın/akışın ayrıntısı).

## Ek 9 — §6 kanıt satırlarının "Tek komut" hücresi

### Kanıt 5 — tek komut

`node testler/bot-zorluk.olcum.js` (elle; `npm test` kapsamında değil)

### Kanıt 8 — tek komut

aynı komut · **gerçek** APK için ayrıca `powershell -File android/dogrula.ps1 -Apk <yol>` (eksik 0 / fazla 0 / boyut farkı 0)

### Kanıt 9 — tek komut

`node testler/<ad>.olcum.js --plan <dosya>` + işin raporunda görüntü adları

### Kanıt 10 — tek komut

`node testler/<ad>.olcum.js --cikti <klasor>` — **ofiste koşmaz**, koşulmadığı raporda "ofiste doğrulanmadı" yazılır (§7 risk 24)

### Kanıt 11 — tek komut

`npm test` (kural) · `node testler/surukleme-hedefi.olcum.js --plan <dosya>` (sayfadaki gerçek hedef; **yalnız ofis yolu**, ADR-023/1)

### Kanıt 13 — tek komut

`npm test` (kural) · `node testler/surukleme-hedefi.olcum.js --plan <dosya>` + `node testler/yerlesim-cakisma.olcum.js --plan <dosya> --durum el` (ofis yolu)

### Kanıt 14 — tek komut

`npm test` (kural) · yukarıdaki iki yoldan biri (sayfadaki gerçek ölçü)

## Ek 10 — §1 "Genel bakış" bölümünün paragrafları

### §1 Genel bakış — giriş

Taş Okey, tarayıcıda çalışan, **sunucusuz** (yalnız statik dosya) bir tek kişilik masa oyunu: 1 gerçek oyuncu + 3 bilgisayar
rakip. Kural seti **Klasik Okey** (tek el; per/çift yalnız el biterken açılır). Sistem üç katmandır:

### §1 Genel bakış — bağımlılık yönü

Tek yönlü bağımlılık: `arayuz → bot → cekirdek`. `cekirdek` hiçbir şeye bağlı değildir; bu yüzden tarayıcı açmadan,
tek komutla test edilebilir. Bot ve insan oyuncu **aynı** kural motorunu kullanır (GDD §4 değişmezi: bot asla kurala
aykırı hamle yapamaz — çünkü hamleyi onaylayan kod insan oyuncununkiyle aynı).

## Ek 11 — §2 yığın tablosunun "Seçim" hücreleri

### Yığın 12 — seçim

Unity kurulumunun içindeki JDK + Android SDK araçları: `aapt2` → `javac` → `d8` → dex ekleme → `zipalign` → `apksigner`. **Gradle ve Android Studio yok**; yollar tek kaynaktan (`android/yol-coz.ps1`)

## Ek 12 — §6 kanıt satırlarının "Tür" hücresi

### Kanıt 6 — tür

Android kabuğu kaynak denetimi (ADR-020 maddeleri: izin 0, `androidx` 0, yön kilidi yok, WebView ayar listesi, **çizim katmanı anahtarı** (madde 12), varlık yolu/MIME kararları, TR/EN anahtar kümeleri, tema türetmesi, simge geometrisi ve PNG ölçüleri)

### Kanıt 8 — tür

APK içeriği ve depo hijyeni (anahtar/parola izi 0, `android/` altında dış derleme sistemi/kütüphane/indirme adresi 0, `OKU.md`'deki donmuş sayılar `derle.ps1` ile aynı)

### Kanıt 11 — tür

Sürükle-bırak hedefleri (ıstakaya bırakma ADR-019, geçersiz bırakma ADR-021, köşe atma alanı ADR-012, çekme R-012, bitirme hedefi R-013)

### Kanıt 12 — tür

Kısa yatay düzen varyantı (ADR-024): bant listesi, köşelerin kapladığı bantlar, varyantın eşiği ve **yalıtımı** (blok dışı bildirimler ile `tasokey#68` sürümü birebir), ince sırt oranı, şerit yüksekliği

### Kanıt 13 — tür

Sürükle-bırak hedefleri **yeni düzende** (ADR-024): beş yol **üç boyutta** (1920x1080 · 900x600 · 800x360) ve köşe isabeti ölçütü (dört köşede ≥ %80, tek kaynak `EN_AZ_BOLGE_ORANI` — statik kapsama savı da onu okur)
