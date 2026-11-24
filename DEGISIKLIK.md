# DEĞİŞİKLİK — MIMARI.md sürüm notları

> Bu dosya `MIMARI.md`'nin sürüm notu **geçmişidir** (ADR-025 madde 4; taşıma `tasokey#77`).
> Notlar **birebir** taşındı, sıra **artan**: Sürüm 3…25 (21 not; **17** ve **23** numaralarının kendi notu hiç yazılmamıştı — numara geri alınmaz,
> `tasokey#38`'in dersi). Her sürümün sabit bir çapası var, ör. `## Sürüm 24 — tasokey#74`.
> Güncel belge ve özet tablo: [MIMARI.md](MIMARI.md).
> Dosyanın sonunda iki ek var: özet tablodan taşınan **sürüm zinciri** ve `tasokey#78`'de taşınan
> **§7 risk gerekçeleri** ([Ek](#ek--mimarimd-7-risk-gerekçeleri); risk satırları `MIMARI.md`'de duruyor).
> Burada **tarihsel** gerekçe durur; tablo hücrelerinin **yürürlükteki** ayrıntısı
> [MIMARI-AYRINTI.md](MIMARI-AYRINTI.md)'de, karar gövdeleri [adr/](adr/ADR-026-mimari-dizin-ayrinti-eki.md)'dedir (ADR-026).

**Son sürüm: 27** (`tasokey#81`, 2026-11-24) → [Sürüm 27](#sürüm-27--tasokey81)

> *Birleştirme notu (Masa, 2026-11-22):* `tasokey#66` (main) ile `tasokey#64` zinciri aynı anda ilerlediği için ikisi de "sürüm 20" yazmıştı. Birleştirmede sıraya konuldu: **20** = `tasokey#66`, **21** = `tasokey#67` (ADR-023), **22** = `tasokey#69` (ADR-022 §0). Metinlerdeki "20 numarası ADR-023'e verilmişti, bu yüzden 21" ifadesi bu sıralamadan önce yazıldı.

## Sürüm 3 — tasokey#24

> **Sürüm 3** (`tasokey#24`, Geliştirici, 2026-11-20): ADR-010 (oyuncu başına atılan yığın), ADR-011 (taş gövdesi SVG +
> DOM rakam katmanı), ADR-012 (dört kenar grid + telefon dikey uyarısı) eklendi; durumu **kabul** (karar veren Mimar-K2).
> Kaynak: `GDD.md` §6 "Bulgu" (tasokey#22), `PRD.md` R-011/R-012/R-014/R-015, `STIL.md` §4-5, `docs/gorsel/tas-01.svg`
> (ölçüldü: rakam şu an sabit SVG `<path>`, gerçek yazı tipi glifi değil). Bu iş yalnız belge; `arayuz/`, `cekirdek/` kodu
> değişmedi.

## Sürüm 4 — tasokey#37

> **Sürüm 4** (`tasokey#37`, Geliştirici, 2026-11-20): ADR-017 (bitiş iki ayrı denetimin VEYA'sı; per = seri + sayı peri,
> çift = birebir aynı taş) eklendi; karar Sahip'in (`tasokey#35`), bu iş kodu yazdı. Kaynak: `GDD.md` v3 §1 kural 6, 7, 13.
> ADR-016 numarası o gün boş bırakıldı — 017 numarası GDD/PRD v3'te bu karara verilmişti
> (ADR-013 o gün boştu, `tasokey#41`'de bot zorluk kademeleri kararına verildi; ADR-016 `tasokey#42`'de
> arayüz kabuğuna verildi — ikisi de aşağıda §5).
> ADR-014 ve ADR-015 boş kalan numaralardandı: ADR-015 `tasokey#38`'de (Mimar hakemliği),
> ADR-014 `tasokey#39`'da (Sahip'in isteği bu numarayı adlandırarak geldi) yazıldı — aşağıda §5.

## Sürüm 5 — tasokey#37

> **Sürüm 5** (`tasokey#37`, Mimar kararı + Geliştirici uygulaması, 2026-11-20): ADR-018 (bot kuralı kopyalamaz,
> `cekirdek`'e sorar; el sonlanması sezgisele bağlı değildir) eklendi; durumu **kabul** (karar veren Mimar-K2).
> Kaynak: ADR-017'nin ölçülen yan etkisi (200 elin 20'si sonlanmıyordu) ve `GDD.md` §4 "Karar yöntemi"nin
> Mimar/Geliştirici'ye bıraktığı algoritma ayrıntısı. `GDD.md`, `PRD.md` gereksinim metinleri ve `kural.js` değişmedi.

## Sürüm 6 — tasokey#38

> **Sürüm 6** (`tasokey#38`, Mimar kararı + Geliştirici uygulaması, 2026-11-20): ADR-015 (yığılma kademeleri tek
> kaynak, kalıcı pencere her zaman en üstte) eklendi; durumu **kabul** (karar veren Mimar-K2). Kaynak: Sahip'in
> `tasokey#38` isteği ("sonuç penceresi her zaman en üstte") ve belirti görüntüsü `is/tasokey-35/ekler/image-2.png`.
> Karar `tasokey#38`'de uygulanmıştı ama belgeye yazılmamıştı (Denetçi "güncel mimari karara uyuyor mu" maddesini
> bu yüzden ölçemedi); bu sürüm yalnız belge + yeni ADR atıf taraması testidir, `docs/` kodu değişmedi.

## Sürüm 7 — tasokey#39

> **Sürüm 7** (`tasokey#39`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-20): ADR-014 (bırakma/tıklama
> hedef alanı taş ölçüsünden bağımsız, tek değişkenden) eklendi; durumu **kabul**. Kaynak: Sahip'in `tasokey#39`
> isteği ("Taş atma ve çekme hedef alanları büyütülsün (ADR-014)") — numara istekte verildi.
> Aynı işin ek bilgileri (el bitince rakip ıstakasının **dizili** açılması, sonuç penceresinde per / çift /
> per olmayan / okey sayılarının **ayrı** yazılması) arayüz-sunum ayrıntısıdır, ADR gerektirmedi; karşılığı
> `cekirdek/cozucu.js` `elDokumu` saf işlevidir (§3).

## Sürüm 8 — tasokey#41

> **Sürüm 8** (`tasokey#41`, Mimar/Geliştirici kararı + uygulama, 2026-11-21): ADR-013 (bot zorluk
> kademeleri aynı sezgiselin üç ayarıdır; `bot/` tek girişten oynar) eklendi; durumu **kabul**.
> Kaynak: `GDD.md` §7 Soru 3'ün kararı açıkça Mimar/Geliştirici'ye bırakması ve `tasokey#41`
> isteği. `GDD.md` §4 "Zorluk kademeleri" satırı ile §7 Soru 3 ("kapandı — B") bu işte güncellendi;
> `kural.js`, `PRD.md` gereksinim metinleri ve kayıt şeması değişmedi.
> Düzeltme (Denetçi bulgusu, aynı iş): §7 risk 1'e kanıtsız yazılan çözücü süreleri (0,47 / 0,49 ms)
> deponun ölçüm betikleriyle yeniden ölçülüp üreten komutla birlikte yazıldı.
> Düzeltme 2 (Denetçi bulgusu tur 2, aynı iş): ADR-013 "Seçenekler" E maddesindeki geri çekilmiş
> "~0,5 ms" rakamı da aynı ölçümlerle (üreten komut + günlük yolu) değiştirildi; artık §7 risk 1 ile
> aynı sayıları söylüyor.

## Sürüm 9 — tasokey#42

> **Sürüm 9** (`tasokey#42`, Geliştirici uygulaması, 2026-11-21): ADR-016 (arayüz tek durum makinesine
> bağlanır: `baslangic` → `masa` → `sonuc`; zorluk seçimi kayıt şemasında, sürüm 1 → 2) eklendi;
> durumu **kabul**. Kaynak: Sahip'in `tasokey#42` isteği ("Başlangıç ekranı: Yeni oyun düğmesi ve
> Kolay/Orta/Zor seçimi (ADR-016)" — numara istekte verildi) ve §7 risk 11 ("bot kademe seçimi
> arayüzde yok"). `cekirdek/` ve `bot/` kodu değişmedi; `kural.js` ve PRD gereksinim metinleri
> değişmedi, kayıt şeması değişti (§4).

## Sürüm 10 — tasokey#43

> **Sürüm 10** (`tasokey#43`, Geliştirici uygulaması, 2026-11-21): ADR-016 **genişletildi** (madde 7):
> üst çubuktaki "Oyunu bitir" düğmesinin onay sorusu ayrı bir ekran değil, aynı durum makinesinin
> `onay` alanıdır. Yeni ADR numarası açılmadı — ADR-016 madde 6 zaten "ileride başlangıç/onay
> pencereleri" diyordu. Kaynak: Sahip'in `tasokey#43` isteği ("Üst çubukta Oyunu bitir / Çık
> düğmesi"). Masadan yeni bir çıkış yolu açıldığı için bot sırasının koşulu da aynı makineye
> alındı (`botSirasiMi`) ve zamanlayıcıyla bekleyen bot turu artık **el neslini** doğrular
> (Denetçi bulgusu, tur 1). `cekirdek/` ve `bot/` kodu, kural metinleri ve **kayıt şeması değişmedi** (bekleyen onay
> kaydedilmez; sürüm 2 olduğu gibi kaldı).

## Sürüm 11 — tasokey#47

> **Sürüm 11** (`tasokey#47`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-21): yeni ADR açılmadı;
> ADR-014 "Sonuçlar" satırına **ölçülmüş** ek sayı yazıldı. Köşe (`.kose`) artık ızgara hücresini
> doldurduğu (iki ıstaka arasındaki boş alan) ve yığın hücrenin ortasında durduğu için ADR-014'ün
> hedef halkası aynı payla daha büyük bir kutunun çevresine oturuyor. Karar katmanı değişmedi:
> pay yine `--hedef-pay`, taş ölçüsü ve dört kenar düzeni (ADR-012) aynı, kural dört köşede tek
> (ADR-010). Kaynak: Sahip'in `tasokey#47` isteği ve `is/tasokey-47/ekran/` ölçümü.
> `cekirdek/`, `bot/`, `arayuz/` JS'i ve kayıt şeması değişmedi; yalnız `docs/arayuz/stil.css`.

## Sürüm 12 — tasokey#48

> **Sürüm 12** (`tasokey#48`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-21): ADR-019 (ıstaka
> yerleşimi tek saf modülde — `arayuz/raf.js`; yer değiştirme yok, taş kendine yer açar; sürükleyerek
> çekilen taş bırakıldığı yuvada kalır) eklendi; durumu **kabul**. Kaynak: Sahip'in `tasokey#48` isteği
> ("Istakaya sürükleme: taş kendine yer açar, çekilen taş bırakıldığı yuvada kalır (ADR-019)" — numara
> istekte verildi). `ekran.js`in `rafYerlesimiGuncelle`/`tasiYuvayaTasi` işlevleri ve `RAF_*` sabitleri
> yeni modüle taşındı (§3); `surukle.js` çekme yolunda bırakılan yuvayı iletiyor. `cekirdek/`, `bot/`,
> `etkilesim.js`in çekme kararı, kural metinleri ve **kayıt şeması değişmedi**.

## Sürüm 13 — tasokey#50

> **Sürüm 13** (`tasokey#50`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-21): **ADR-008
> sürüm 2** — kural 2'nin varsayılanı döndü: okey ve sahte okey **atılabilir**, hamle engellenmez
> ve ceza yoktur; ayar (`cekirdek/kural.js` `okeyVeSahteOkeyAtmaYasak`) **kapatma anahtarı** olarak
> duruyor ve `true` yapıldığında motorun ret yolu, çözücünün aday filtresi ve botun atılabilir
> havuzu yasağı yine uygular (iki yönlü testler: `testler/el.test.js`,
> `testler/el-bitiren-taslar.test.js`, `testler/bot-kolay.test.js`). **ADR-016 madde 8** eklendi:
> kabuk `{ ekran, zorluk, onay, bilgi, dokumAcik }` tutar; insan oyuncunun kendi joker atışında
> bilgilendirme penceresi açılır (`BILGI_GOSTER`/`BILGI_KAPAT`), pencere açıkken bot oynamaz.
> Yeni ADR numarası açılmadı — ikisi de var olan kararların sürümü/maddesidir. Kaynak: Sahip'in
> `tasokey#50` isteği ve iki ek bilgisi (sonuç penceresindeki taş sayıları bölümü açılır/kapanır ve
> ilk açılışta kapalı; pencere içeriğine göre boyutlanır, sabit en/boy yok). `GDD.md` v5 §1 kural 10,
> `PRD.md` §10; **kayıt şeması değişmedi** (`bilgi` ve `dokumAcik` kayda yazılmaz, sürüm 2 kaldı).
> ADR-013 "Sonuçlar" satırındaki kazanma oranları bu değişiklikten sonra yeniden ölçüldü.

## Sürüm 14 — tasokey#54

> **Sürüm 14** (`tasokey#54`, Mimar hakemliği, 2026-11-21): ADR-020 (Android kabuğu — izinsiz tek WebView,
> varlıklar APK içinden `appassets.androidplatform.net` üzerinden) eklendi; durumu **koşullu kabul**
> (karar veren Mimar-K2; ürün kapsamı `PRD.md` §6'da hâlâ kapsam dışı — PRD farkı + R numarası Sahip'te,
> üst iş `tasokey#52`). Kaynak: `android/kabuk/` (`tasokey#54`), `android/ARACLAR.md` (`tasokey#53`).
> ADR atıf taraması bu işte `.java/.xml` kaynaklarını da kapsar hâle geldi.

## Sürüm 15 — tasokey#55

> **Sürüm 15** (`tasokey#55`, Mimar kararı + Varlık uygulaması, 2026-11-21): ADR-020'ye **madde 11**
> (uygulama simgesi tek kaynaktan türer: iki vektör drawable + aynı geometriden türetilmiş beş PNG,
> renk köprüsü `colors.xml` ↔ `stil.css`, `pathData` yalnız mutlak `M L C Z`, uygulama adı iki dilde
> `Taş Okey`, XML yorumunda iki tire yasak) eklendi; **yeni ADR açılmadı** — simge kabuğun kaynak
> düzeninin parçasıdır, ayrı numara kavramı bölerdi. ADR-020'nin durumu **değişmedi** (koşullu kabul;
> ürün kapsamı `PRD.md` §6'da hâlâ kapsam dışı). Kaynak: `android/kabuk/res/` simge kaynakları +
> `android/SIMGE.md` (`tasokey#55`); ölçüm `testler/android-simge.test.js`.

## Sürüm 16 — tasokey#58

> **Sürüm 16** (`tasokey#58`, Geliştirici uygulaması, 2026-11-22): **yeni ADR açılmadı** ve ADR-020'nin
> durumu **değişmedi** (koşullu kabul; ürün kapsamı Sahip'te). Bu sürüm kabuğun ve derleme zincirinin
> belgedeki **yerini** tamamlıyor: §2 yığın tablosuna "Android kabuğu" + "Android derleme zinciri"
> satırları, §3 modül tablosuna `android/` satırı (tek yön `android → docs`, o da yalnız **derleme
> anında kopyalayarak**; ters yön yok), §6 test tablosuna kabuk/araç zinciri/APK öz-testleri, §7'ye
> `tasokey#52` planının **risk 12-20'si** — her satırın durumu plandaki hâliyle değil **bugünkü
> ölçümle** yazıldı (12, 13, 14 `tasokey#53`'te ölçüldü; 20'de `bundletool` beklenenin tersine
> bulundu ama AAB adımı yazılmadı) — ve ADR-020'nin "Sonuçlar" (c) maddesinin §7'ye girmesini söz
> verdiği **risk 21**. Aynı işte `PRD.md`'ye `tasokey#52` §6'daki PRD farkı **"Sahip onayı bekliyor"**
> damgasıyla girdi (R-016…R-019 numaraları **ayrıldı**, R-001…R-015 metinleri **değişmedi**, PRD
> sürümü **3 kaldı**) → ADR-020'nin "Etkilenen gereksinimler" satırı artık boş değil, onay bekleyen
> numaraları gösteriyor. `docs/`, `android/` ve `testler/` kaynakları **değişmedi** (yalnız belge).

## Sürüm 18 — tasokey#62

> **Sürüm 18** (`tasokey#62`, Mimar planı (`tasokey#60`) + Geliştirici uygulaması, 2026-11-22):
> **ADR-021** açıldı (sürükleme görsel dili tek kapıdan — parmağı kopya izler, asıl taş kaynağında
> **görünmez** olur ama yerini korur). Gerekçe `tasokey#59`un yan etkisidir: kopya çözümü asıl taşı
> yerinde, saydamlıksız bırakınca taş sürüklenirken **iki yerde** görünüyordu (Sahip'in görüntüsü,
> `is/tasokey-60/ekler/`) ve bu karar hiçbir belgede değildi, yalnız kaynak yorumlarındaydı —
> `tasokey#38`'in belirtisi. §3 modül tablosundaki `arayuz/surukle.js` satırına kopya/gizleme
> cümlesi eklendi. ADR-019 (ıstaka yerleşimi) ve ADR-002 (karar katmanı) **değişmedi**: `display:
> none` bu yüzden reddedildi. `PRD.md` **değişmedi** (hata/düzeltme işi, PRD sürümü `3` kaldı).

## Sürüm 19 — tasokey#63

> **Sürüm 19** (`tasokey#63`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-22): yeni ADR
> açılmadı — karar ADR-012'nin (dört kenar ızgarası) **iz ölçüsü** ayrıntısıdır, ADR-014'ün hedef
> payı ve ADR-010'un dört köşede tek kural ilkesi değişmedi. Kaynak: Sahip'in `tasokey#63` isteği
> ("atılacak taş, oyuncunun ıstakası ile rakibin ıstakası arasındaki boş alana bırakılsın, boş
> alanın ortasında konumlansın") ve `tasokey#47`in yetmediğini gösteren ölçümü. ADR-012'nin
> "Sonuçlar" satırına ızgara **iz kuralı**, ADR-014'ün "Sonuçlar" satırına `tasokey#63` ölçümü
> yazıldı. Ayrıca masa yüksekliğinin **kaptan** geldiği (içeriğinden değil) kuralı §3'ün masa
> satırına girdi: esnek köşe satırları `#masa`'nın esneme tabanı `auto` kaldığı sürece masayı
> kendi içeriğine göre büyütüyor, oyuncunun ıstakası ekran dışında kalıyordu (R-014 ihlali, aynı
> işte ölçülerek bulundu ve düzeltildi). `cekirdek/`, `bot/`, `arayuz/` JS'i ve kayıt şeması
> **değişmedi**; yalnız `docs/arayuz/stil.css` + `testler/`. `PRD.md` değişmedi (R-011 ve R-014
> metinleri aynı, PRD sürümü `3` kaldı).

## Sürüm 20 — tasokey#66

> **Sürüm 20** (`tasokey#66`, Sahip'in isteği + Geliştirici uygulaması, 2026-11-22): yeni ADR
> açılmadı — **ADR-008 sürüm 3**: kural 1'in varsayılanı döndü, `12-13-1` geçişi **per sayılır**
> (seri 13'ten 1'e döner). Kaynak: Sahip'in `tasokey#66` isteği ("12-13-1 de per olarak kabul
> edilsin"). Ayar (`cekirdek/kural.js` `onUcBirGecisiPerSayilir`) **kapatma anahtarı** olarak
> duruyor; ayarı okuyan tek kapı `cekirdek/dizilim.js` `ardisikPencereUret` olduğu için çözücü ve
> bot kuralı kendileri yeniden yazmadan dönüşlü seriyi kullanıyor (iki yönlü testler:
> `testler/kural.test.js`, `testler/dizilim.test.js`, `testler/cozucu.test.js`). Aynı dosyada iki
> ölçülmüş ayrıntı: pencere üreteci sayı aralığından **uzun pencere üretmiyor** (yoksa "13 taş +
> joker" seri sayılırdı) ve pencere tablosu **önbelleğe** alındı (dayanıklılık koşusu 43,3 s →
> 50,5 s → 43,2 s). ADR-013'ün kademe ölçümü yeniden yapıldı ("Sonuçlar" satırı): eller kısaldı,
> beraberlik düştü, kademe sırası korundu. `bot/`, `arayuz/` ve kayıt şeması **değişmedi**;
> `PRD.md` değişmedi (R-004 metni aynı, PRD sürümü `3` kaldı), `GDD.md` **v6** (§1 kural 6a + §7
> Soru 1'in cevabı A → B).

## Sürüm 21 — tasokey#67

> **Sürüm 21** (`tasokey#67`, Mimar yönlendirmesi + Geliştirici uygulaması, 2026-11-22):
> **ADR-023** açıldı (ofis içi arayüz ölçümü `--plan` + `ekran_gerek` yolundan alınır; ölçüm
> sürücüsünün yerel sunucu + başsız Edge/CDP kipi **Masa yolu** olarak kalır). Gerekçe
> `tasokey#67`te ölçüldü: ölçüm aracı yazıldı ve ölçüm alındı, ama "araç tek komutla koşuyor"
> kabulü ofiste **doğrulanamadı** — ajan sunucu/tarayıcı açamaz ve bu makinede boş profille açılan
> tarayıcının eşitleme belirtisi yüzünden izin de **istenmiyor**. Karar iki yolu adlandırıyor:
> ofis yolu plan + çekirdeğin penceresiz tarayıcısı, Masa yolu sürücünün kendi tek komutu; ölçüm
> **kuralı** iki yolda da tek kaynaktır (saf çekirdek sayfaya gömülerek koşar). §6 kanıt tablosunda
> "arayüz denemesi" satırı ikiye ayrıldı ve yerleşim çakışması satırı eklendi; §7'nin **6. riski
> kapandı** (çözümü manifeste port yazmak değil, plan yolunu kullanmaktır — manifest eklemesi
> Sahip kararı) ve yerine **risk 24** açıldı (Masa yolu ofiste hiç koşturulmadı). Numara 022 bu
> işte **yazılmadı**: ADR numarasını Mimar verir, bu iş yönlendirmede yazılı olan 023'ü yazar.
> `docs/` (ürün kodu), kayıt şeması ve donmuş alanlar **değişmedi**; `PRD.md` değişmedi (R-009 ve
> R-014 metinleri aynı, PRD sürümü `3` kaldı), yalnız `MIMARI.md` + `testler/`.

## Sürüm 22 — tasokey#69

> **Sürüm 22** (`tasokey#69` — üst iş `tasokey#64`, Geliştirici uygulaması, 2026-11-22): iki parça.
> (1) **ADR-022 §0'a geçti.** Karar `tasokey#68`te §5'e yazıldı (sürüm 1 kademeli ölçek + tek kaynaklı
> bütçe; sürüm 2 madde 6 rakip açık el taşlarının muafiyeti) ama bu bölümün sürüm notu ve üstteki
> **sürüm sayısı hiç güncellenmedi** — yani belge kendi sürümünü yanlış söylüyordu. Numara 022'nin
> karşılığı: oyuncunun ıstakası ve taşları tek ölçek değişkeninden büyür, değer kademe başına
> **ölçülür** (`:root` 1,85 · `≤1300px` 1,35 · `≤900px` 1,05 · yatay+kısa 1). İşin metni bu sürümü
> "20" diye adlandırıyordu; 20 numarası `tasokey#67`te ADR-023'e verilmişti, bu yüzden **21** yazıldı
> (numara geri alınmaz — `tasokey#38`'in dersi).
> (2) **Sürükle-bırak hedefleri yeni ölçekte ölçüldü** — yeni ADR açılmadı, çünkü ölçüm iki var olan
> kararın (**ADR-012** ızgara iz kuralı, **ADR-014** hedef payı) ölçekten sonra hâlâ geçerli olduğunu
> gösteriyor; ikisinin "Sonuçlar" satırına `tasokey#64` ölçümü eklendi. Beş yol (ıstakaya bırakma
> ADR-019, geçersiz bırakma ADR-021, köşe atma alanı ADR-012, çekme R-012, bitirme hedefi R-013)
> **800×360** ve **1920×1080**'de gerçek Pointer Events ile koşturuldu: `yol=5 gecti=5 kaldi=0` iki
> boyutta da. §6 kanıt tablosuna "sürükle-bırak hedefleri" satırı girdi; §7'nin **5. riski** ölçülen
> hâliyle güncellendi (sentetik işaretçiyle ölçüldü, **gerçek dokunmayla değil** — risk kapanmadı).
> `docs/` (ürün kodu), kayıt şeması ve donmuş alanlar **değişmedi**; `PRD.md`'de yalnız R-009 ve
> R-014'ün kanıt sütunu güncellendi (gereksinim metinleri aynı, PRD sürümü `3` kaldı).

## Sürüm 24 — tasokey#74

> **Sürüm 24** (`tasokey#74` — üst iş `tasokey#70`, plan §6.4; Geliştirici uygulaması, 2026-11-22):
> **ADR-024** §5'e yazıldı — *kısa yatay ekranlarda masa ayrı bir **düzen varyantı** kullanır, dikey
> zincir en çok **üç taş boyu** taşır*. Karar metni `tasokey#70` planı §3'ten **olduğu gibi** alındı
> (Mimar-K2); uygulamada ölçülen sayılar (eşik 700 px, ölçekler 1,45 / 1,65 / 1,25) kararın metnini
> değiştirmediği için ayrı bir **"Ölçülen sonuç"** satırında durur. Karar `tasokey#71`…`#73`te
> uygulanmıştı ama numarası yoktu: kod ve testler plan maddesine atıf yapıyordu, çünkü atıf taraması
> belgede karşılığı olmayan numarayı haklı olarak reddeder (`adr-atif-tarama.test.js`, `tasokey#38`'in
> dersi). Bu sürümle numara **yazıldı** ve atıflar ADR-024'e çevrildi.
> Ayrıca: **ADR-022 sürüm 3**'ün "Sonuçlar **(e)**" maddesi **düzeltildi** (yargı ölçümle çürüdü —
> telefon kademesinde kazanç var ve metin kaldırmak gerekmedi); ADR-022'nin **maddeleri değişmedi**,
> sürüm 3 kaldı. **Yeni ADR açılmadı** diğer kararlar için: ADR-012 ve ADR-014'ün "Sonuçlar"ına
> `tasokey#70` zincirinin ölçümü eklendi, §6 kanıt tablosuna iki satır girdi, §7'ye plan §8'in
> riskleri **25-30** olarak yazıldı. `PRD.md`'de yalnız **R-014**, **R-009** ve **R-013**'ün kanıt
> sütunları güncellendi (gereksinim **metinleri değişmedi, gevşetilmedi**, PRD sürümü `3` kaldı).
> `tasarim/referans/MASA-DUZENI.md`'ye **dokunulmadı** (Sahip'in referans belgesi — ADR-024 Sonuçlar (f)).
> *Numara notu:* plan bu sürümü "22" diye adlandırıyordu (yazıldığı gün belge 21'deydi); arada
> `tasokey#69` **22**'yi, `tasokey#72` **23**'ü aldı (23 yalnız aşağıdaki tablo satırına yazılmış,
> kendi sürüm notu yok), bu yüzden **24** yazıldı — numara geri alınmaz (`tasokey#38`'in dersi).

## Sürüm 25 — tasokey#76

> **Sürüm 25** (`tasokey#76` — üst iş `tasokey#75`, plan §4 iş 1; Geliştirici uygulaması, 2026-11-22):
> **ADR-025** yazıldı — *her mimari karar kendi dosyasında (`adr/ADR-0NN-kisa-ad.md`), `MIMARI.md` §5
> yalnız **dizindir***; karar metni `tasokey#75` planı §3'ten olduğu gibi (Mimar-K2). Var olan
> **24 ADR'nin gövdesi** `adr/` dosyalarına **birebir** taşındı — tek fark başlık düzeyi
> (`### ADR-0NN:` → `# ADR-0NN:`), ölçüm `node testler/adr-tasima.olcum.js` → **bayt farkı 0**.
> Belge **180.899 → 67.649 bayt** (LF). Yeni öz-testler: `adr-dosyalari.test.js` (dizin ↔ dosya kümesi
> birebir) ve `belge-baglanti.test.js` (**ölü bağlantı 0**); `adr-atif-tarama.test.js` belgelenen
> numaraları artık `adr/`den okuyor, `adr/` de taranıyor (`tasokey#38`/`#54` dersleri korundu).
> `docs/`, `android/`, `tasarim/` ve kayıt şeması **değişmedi**. Sürüm notu geçmişi ve tarihsel
> gerekçeler bu işte taşınmadı — planın iş 2 ve iş 3'ü.

## Sürüm 26 — tasokey#78

> **Sürüm 26** (`tasokey#78` — üst iş `tasokey#75`; Mimar-K2 planı + Geliştirici uygulaması, 2026-11-22):
> **ADR-026** yazıldı — *`MIMARI.md` **dizindir**; tablo hücrelerinin yürürlükteki ayrıntısı
> `MIMARI-AYRINTI.md`'de* (üç ev ayrıdır: yürürlükteki ayrıntı ekte, karar gövdesi `adr/`de, tarihsel
> gerekçe burada). **13 adım** sırayla ve her adımdan **sonra ölçülerek** uygulandı: §3'ün 12 uzun modül
> hücresi + `android/` "saf mantık mı" hücresi · §7'nin kapanmış satırlarındaki 16 "Nasıl ölçülecek" ve
> 8 "Konu" hücresi · §6'nın 8 "Ne ile", 9 "Tek komut" ve 5 "Tür" hücresi · §5'in **"Tek satır karar"
> sütunu** (25 satır) · §2'nin 9 "Gerekçe" ve 1 "Seçim" hücresi · §4'ün gövdesi · §1'in iki paragrafı
> (katman şeması belgede **kaldı**) · başlıktaki **K1 onayı bloğu** — toplam **92 hücre/blok**, hepsi
> **birebir** (`node testler/ayrinti-tasima.olcum.js` → bayt farkı 0, ölü çapa 0; ekteki bir bölüm
> ADR-026'nın bu işte **yazılan** satırıdır, tabanda karşılığı yoktur). §3 ve §7'de satır başına bağlantı
> yerine tablonun altına **tek not** kondu (satır başına ~45 bayt kazanç).
> Belge **40.000 → 25.250 bayt** (LF) / **25.435 bayt** (CRLF checkout), ek dosya 25.604 bayt. Satır
> sayıları korundu: ADR dizini **26** (ADR-026 eklendi), modül **18**, kanıt **14**, risk **30**; açık 10
> riskin (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) üç hücresi taban ile birebir.
> Sahip'in **25.600 bayt** hedefi **tuttu** (pay 165 bayt, iki ölçüde de). Planın ilk dört adımı tek başına
> 30.293 baytta kalıyordu (taşınabilir dört hücre grubu 14.237 B, gereken azalma 14.400 B); hedef ancak
> kalan dokuz adımla sağlandı. İlk turda ölçülen seçenekler ve **alt sınır 22.234 bayt** `tasokey#78`
> raporunda duruyor. `docs/`, `android/`, kayıt şeması ve `adr/`deki 25 eski gövde **değişmedi**.

## Sürüm 27 — tasokey#81

> **Sürüm 27** (`tasokey#81` — üst iş `tasokey#80`; Sahip kural kararı + Mimar planı + Geliştirici
> uygulaması, 2026-11-24): **ADR-027** yazıldı — *sahte okey joker **değildir**; o elin okey taşının
> renk+sayı **değerini** alır ve her yerde o değerdeki sıradan taş gibi davranır.* Belirti Sahip'in
> ekran görüntüsündeydi (`is/tasokey-80/ekler/9703a20f-image.png`): gösterge kırmızı 10, ıstakada
> yıldızlı sahte okey + kırmızı 11 varken üst çubuk "Elini bitirebilirsin" diyordu, oysa el bitmiyor.
> Kök neden ölçüldü, tahmin edilmedi: `cekirdek/dagitim.js` → `tasOkeyMi` sahte okeye koşulsuz `true`
> dönüyordu (K1, 2026-11-19 — GDD §1 kural 4'ün o günkü yazımı) ve `[siyah-10, siyah-11, ★]` üçlüsü
> "siyah 12" okunuyordu. Önce **kırmızı** gerileme testi yazıldı (`el-bitiren-taslar.test.js` (f)):
> bugünkü kodda `elBitirenTaslar` = `siyah-6-1, sari-5-1, mavi-4-1` — plandaki ölçümle birebir;
> düzeltmeden sonra `[]` ve `elBitirilebilirMi` = `false`. Sahip'in ilk teşhisi ("gösterge taşı okey
> gibi davranıyor") kodda **üretilemedi**: göstergenin eldeki kopyası zaten sıradan taştı.
> Çekirdekte üç ayrı kapı açıldı ve kural başka hiçbir dosyada yeniden yazılmadı: `tasOkeyMi`
> ("joker mi"), `tasDegeri` ("renk+sayı değeri ne"), `tasOzelMi` ("okey ya da sahte okey mi").
> `okeyVeSahteOkeyAtmaYasak` **anlamını korudu** (açıkken ikisi de atılamaz) çünkü atma kısıtı ve
> arayüzün bilgilendirme penceresi artık `tasOzelMi`'ye soruluyor — iki ayar bağımsız.
> Kapatma anahtarı: `kural.js` → `sahteOkeyJokerGibiDavranir` (varsayılan `false`); etkilenen testler
> iki yönlü yazıldı (ADR-008 sürüm 2/3 deseni). Ölçülen sonuç (`is/tasokey-81/olcum-sikligi.mjs`):
> dağıtılan 15 taşlık elin kendiliğinden bitirilebilir çıkması 5000 tohumda **7 → 1**, aynı taramanın
> süresi **11,3 s → 5,0 s** (arama uzayı küçüldü). Ölçüm sahnesinin sabit tohumu bu yüzden yenilendi
> (`BITIRME_TOHUMU` 537 → **2447**; `HEDEF_TOHUMU` 1 değişmedi, yeni kuralda da bitirici taşsız).
> `GDD.md` **v7** (kural 4 yeniden yazıldı, kural 6-7 ve bitiş paragrafı düzeltildi).
> Arayüzün sahte okeyi kendi kimliğiyle çizmesi ve metinlerin ayrışması (`tasokey#80` planı İş 2) ile
> bot kademelerinin yeniden ölçümü (İş 3) bu işe **konmadı**; kayıt şeması ve `android/` değişmedi.

## Ek — özet tablodan taşınan sürüm zinciri

> `MIMARI.md` özet tablosunun "Mimari karar sürümü" hücresinde duran geçmiş zincir, birebir
> (hücrede yalnız son sürüm ve bu dosyaya bağlantı kaldı — ADR-025 madde 4):

önceki: `24` **ADR-024** kısa yatay düzen varyantı — dikey zincir en çok üç taş boyu taşır; karar metni Mimar-K2'nin `tasokey#70` planı §3'ünden olduğu gibi, ölçülen sayılar ayrı satırda. **ADR-022 sürüm 3**'ün Sonuçlar (e) maddesi **düzeltildi** (maddeler değişmedi); ADR-012/ADR-014 "Sonuçlar"a `tasokey#70` ölçümü, §6'ya iki kanıt satırı, §7'ye risk 25-30, 2026-11-22, tasokey#74; önceki: `23` **ADR-022 sürüm 3** — muaf açık el yığını oyun oynanırken geçerli ölçeği aşağı çekmez, kendi ölçeği kademe başına küçülür; ölçek tavanı üç **ÖLÇÜLEN** terimin en küçüğüdür ve sayfa taşması tavanı tabloya girer; **madde 10** (Masa kararı, Sahip adına) el bitince `#merkez` gizlenir ve ölçüt duruma göre **ayrılır** — gevşemez, 2026-11-22, tasokey#72; önceki: `22` **ADR-022** §0'a geçti — oyuncunun ıstakası ve taşları tek ölçek değişkeninden büyür, değer kademe başına **ölçülür**; karar `tasokey#68`te §5'e yazılmış ama sürüm sayısı güncellenmemişti. Ayrıca sürükle-bırak hedefleri yeni ölçekte ölçüldü: **yeni ADR açılmadı**, ADR-012 ve ADR-014 "Sonuçlar"a `tasokey#64` ölçümü, §6'ya kanıt satırı, §7 risk 5 güncellendi, 2026-11-22, tasokey#69 · `20` **ADR-023** ofis içi arayüz ölçümü `--plan` + `ekran_gerek` yolundan alınır, sürücünün sunucu + Edge/CDP kipi **Masa yolu**dur; §6 kanıt tablosunda iki yol ayrıldı, §7 risk 6 **kapandı** ve risk 24 açıldı, 2026-11-22, tasokey#67 · `19` ADR-012 "Sonuçlar"a ızgara **iz kuralı** — esnek iz köşelerde, orta şerit ıstakaların boyunda; ADR-014 "Sonuçlar"a `tasokey#63` ölçümü; masa yüksekliği esnek **kaptan** gelir, 2026-11-22, tasokey#63 · `18` **ADR-021** sürükleme görsel dili: parmağı kopya izler, asıl taş kaynağında görünmez olur ama yerini korur; §3 `arayuz/surukle.js` satırı güncellendi, 2026-11-22, tasokey#62 · `17` ADR-020 **madde 12** WebView yazılım katmanı — kabukta tek açma/kapama sabiti, §7'ye risk 22-23, 2026-11-22, tasokey#61 · `16` kabuk ve derleme zinciri §2/§3/§6/§7'ye yazıldı + ADR-020'nin etkilenen gereksinimleri onay bekleyen R-016…R-019 olarak işaretlendi, 2026-11-22, tasokey#58 · `15` ADR-020 **madde 11** uygulama simgesi, 2026-11-21, tasokey#55 · `14` ADR-020 Android kabuğu, **koşullu kabul**, Mimar hakemliği, 2026-11-21, tasokey#54

## Ek — MIMARI.md §7 risk gerekçeleri

> `MIMARI.md` §7'nin **kapanmış / Masa'da / ölçülmüş** risk satırlarının durum hücresindeki tarihsel
> gerekçe ve ölçüm günlüğü metni, `tasokey#78`'de buraya **birebir** taşındı. Tablodaki satır, numarası ve
> konusu belgede **duruyor**; durum hücresi artık etiket + atıflar + buraya bağlantıdır (ADR-025 madde 4).
> Risk numarası **yeniden kullanılmaz**; açık riskler (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) `MIMARI.md`'de
> tam metinle durur.

### Risk 1

**ölçüldü** (tasokey#37): tek el kontrolü ort. 0,0295 ms, `elBitirenTaslar` ort. 1,2777 ms (bütçe 20 ms); 200 ellik bot koşusu 17,6 s (bütçe 60 s, ADR-018 sonrası). tasokey#41 (yeniden ölçüldü; günlük `is/tasokey-41/cozucu-maliyet.log`): `node testler/el-bitiren-taslar.olcum.js` → `elBitirenTaslar` ort. **1,2306 ms** (en yavaş tek çağrı 13,74 ms), `node testler/el-dokumu.olcum.js` → `elDokumu` ort. **0,3492 ms** (en yavaş 3,94 ms) — ikisi de 20 ms bütçesinin altında. Zor kademe tur başına bir çözücü + bir döküm çağrısı daha ekliyor; bedeli el başına ölçüldü (`node --test testler/bot-dayaniklilik.test.js`): orta 200 el 17,1 s (**~86 ms/el**), zor 100 el 15,7 s (**~157 ms/el**, orta'nın ~1,8 katı), kolay 100 el 7,3 s (~73 ms/el); üç kademe toplam **40,7 s** (bütçe 60 s; ADR-013'teki 41,4 s aynı koşunun önceki çalıştırmasıdır)

### Risk 3

**kapandı** (ADR-008/1-3; `12-13-1` sürüm 3'te, okey atma sürüm 2'de Sahip'in isteğiyle **döndü** — ayarlar kapatma anahtarı olarak duruyor)

### Risk 4

**kapandı** (R-014 ile: dikeyde sığdırma denenmez, oyun alanı yerine dil anahtarlı uyarı gösterilir; bkz. ADR-012)

### Risk 5

**kısmen ölçüldü, açık** (`tasokey#64`/`tasokey#69`, 2026-11-22): beş yol (ıstakaya bırakma, geçersiz bırakma, köşe atma alanı, çekme, bitirme hedefi) **800×360** ve **1920×1080**'de `PointerEvent` dizisiyle (`pointerdown` → ara `pointermove`ler → `pointerup`) koşturuldu — iki boyutta da `yol=5 gecti=5 kaldi=0`, köşe isabeti dört köşede `25/25` (%100). Bu, sürükleme **yolunun** işaretçi olaylarıyla uçtan uca çalıştığını ölçer. Açık kalan parça **dokunmatiğin kendisidir**: olaylar `dispatchEvent` ile **sentetik** üretildi ve `pointerType` `'mouse'`, çünkü sentetik işaretçi etkin değildir → `setPointerCapture` ölçümde **devre dışı** bırakılmak zorunda kaldı. Gerçek parmağa özgü davranışlar (tarayıcının kendi kaydırma/yakınlaştırma jesti, `touch-action` çekişmesi, işaretçi yakalamasının kopması, gecikme, parmak altında kalan hedef) ofiste **ölçülemez**

### Risk 6

**kapandı** (ADR-023, 2026-11-22, `tasokey#67`): çözüm manifeste port + sürücü yazmak **değil**, ofis içi ölçümü `--plan` + `ekran_gerek` yolundan almaktır. Ajan sunucu/tarayıcı açmaz ve bunun için izin istemez; sürücünün tarayıcı kipi Masa yolu olarak durur

### Risk 9

**Masa'da / Sahip kararı** (pencere konumu ya da kapatılabilirlik ürün kararı; ADR-015 kademe sırası değişmez)

### Risk 11

**kapandı** (ADR-016, `tasokey#42`: başlangıç ekranında Kolay/Orta/Zor seçimi, kayıt şeması sürüm 2)

### Risk 12

**ölçüldü** (`tasokey#53`; Unity klasörüne okuma + çalıştırma izni Sahip tarafından verildi): JDK **17.0.9** (`java`/`javac`/`keytool`), build-tools **36.0.0** (kurulu tek sürüm), `aapt2` **2.20**, `platforms/android-36/android.jar` **var**. `d8`/`zipalign`/`apksigner` sürümünü **bildirmiyor** → paketten türetilir ve `UYARI` yazılır (yoldaki klasör adı sürüm sanılmaz). Hiçbir betiğe yol ya da sürüm yazılmaz

### Risk 13

**ölçüldü** (`tasokey#53`): `aapt` v1 **var** (0.2) → seçilen yol `aapt-add`; yedek `zip-archive` de kullanılabilir durumda. Ders koda yazıldı: PowerShell 5.1'de bu iş için **iki** derleme yüklenmeli, yalnız `System.IO.Compression.FileSystem` yetmiyor

### Risk 14

**ölçüldü** (`tasokey#53`): **destekliyor** (`javac 17.0.9`) → yedek yola gerek kalmadı. JDK 24+ bu makinede **ölçülmedi** (kurulu değil); orada çözücünün `invalid source release` kolu yakalar ve `UYARI` yazar, çıkış kodunu bozmaz

### Risk 19

**bilinen sınır** (bugün paket adı depodaki manifestte varsayılan olarak **yazılı** ve öz-testle sabit; derlemede zorunlu `-Kimlik` parametresi üzerine yazar. İmza depoda hiç durmaz, parametredir; en düşük/hedef Android sürümü ile sürüm formülü ise `derle.ps1`in ayar bloğunda sabit — ADR-020/4)

### Risk 20

**Masa'da** — `bundletool` planda "yok" varsayılmıştı, `tasokey#53` tersini ölçtü: **var**, **1.17.2** (`…\AndroidPlayer\Tools\bundletool-all-1.17.2.jar`). Ama AAB adımı hiçbir betiğe yazılmadı: `derle.ps1` yalnız APK üretir

### Risk 25

**ölçüldü, teşhis doğrulandı** (`tasokey#71`…`#73`): zincir üçe inince ölçek telefon boyutlarında `1` → **1,45 / 1,65** oldu ve ölçek 1'de bile var olan iki çakışma (`#rafAlani ∩ #merkez`, `∩ #gosterge`) **gitti**. Yan/üst açık taş aileleri: `durum=rakip` ölçümünde **yeni çakışma 0** — kalan tek çift (`#ustCubuk ∩ #sonucKutusu`) **taban dalda da vardı** ve varyant boyutlarında `135×30` → `118×22`'ye küçüldü (`tasokey#73` §5.1). Sütun sayısı (`--rakip-acik-sutun-dikey`) ve muafın ölçeği (ADR-022/8, alt sınır 0,45) ölçülerek seçildi

### Risk 26

**kapandı** (öz-testle bağlı): eşik `max-height: 700px`; `kisa-yatay-varyant.test.js` kabul-c varyantın 800x360 · 844x390 · 900x600'te **etkin**, 1280x800 · 1180x820 · 1920x1080'de **etkin değil** olduğunu medya sorgusunu değerlendirerek ölçer; kabul-a/b ayrıca blok dışı bildirimlerin ve masaüstü kademe sözlüğünün `tasokey#68` sürümüyle **birebir** aynı kaldığını ölçer (ADR-024/7 yalıtımı)

### Risk 27

**ölçüldü, sınır yazılı** (`tasokey#73` §5.2): iki dilin en uzun durum metni (45 karakter) 800 / 844 / 900 / 1280 px genişliklerin **hiçbirinde sarmıyor**; sarma ancak metin yapay olarak tekrarlanarak zorlanabildi ve orada da kutu içerikle büyüdü, metin **kırpılmadı** (`kaydırma == iç`), sayfa taşması 0

### Risk 28

**kapandı** (sav gevşetilmedi, kapsam genişledi): `kose-atma-alani.test.js` bant listesini **düzen başına** ölçer (paylaşılan düzende tam 3 iz, varyantta tam 4 bant + üst köşeler ilk iki bandı kaplar) ve `tasokey#74`ten sonra her düzeni **kendi bütün kabul boyutlarında** (3 + 3 = 6 boyut) ölçülen bant tablosuyla denetler; `.kose` ve `grid-area` savları hiç değişmedi. Ayrıca aynı dosyaya `ASIL KABUL (a3)` eklendi: statik iz modelinin **tarayıcıda ölçülen** köşe kutusunu birebir ürettiği (`TARAYICI_OLCUMU` tablosu, üç boyut × iki köşe, `±1 px`) ölçülür — model gerçekten sessizce ayrışırsa öbür beş kabul artık var olmayan bir masayı ölçerdi
