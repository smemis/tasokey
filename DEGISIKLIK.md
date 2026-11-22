# DEĞİŞİKLİK — MIMARI.md sürüm notları

> Bu dosya `MIMARI.md`'nin sürüm notu **geçmişidir** (ADR-025 madde 4; taşıma `tasokey#77`).
> Notlar **birebir** taşındı, sıra **artan**: Sürüm 3…25 (21 not; **17** ve **23** numaralarının kendi notu hiç yazılmamıştı — numara geri alınmaz,
> `tasokey#38`'in dersi). Her sürümün sabit bir çapası var, ör. `## Sürüm 24 — tasokey#74`.
> Güncel belge ve özet tablo: [MIMARI.md](MIMARI.md).

**Son sürüm: 25** (`tasokey#76`, 2026-11-22) → [Sürüm 25](#sürüm-25--tasokey76)

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

## Ek — özet tablodan taşınan sürüm zinciri

> `MIMARI.md` özet tablosunun "Mimari karar sürümü" hücresinde duran geçmiş zincir, birebir
> (hücrede yalnız son sürüm ve bu dosyaya bağlantı kaldı — ADR-025 madde 4):

önceki: `24` **ADR-024** kısa yatay düzen varyantı — dikey zincir en çok üç taş boyu taşır; karar metni Mimar-K2'nin `tasokey#70` planı §3'ünden olduğu gibi, ölçülen sayılar ayrı satırda. **ADR-022 sürüm 3**'ün Sonuçlar (e) maddesi **düzeltildi** (maddeler değişmedi); ADR-012/ADR-014 "Sonuçlar"a `tasokey#70` ölçümü, §6'ya iki kanıt satırı, §7'ye risk 25-30, 2026-11-22, tasokey#74; önceki: `23` **ADR-022 sürüm 3** — muaf açık el yığını oyun oynanırken geçerli ölçeği aşağı çekmez, kendi ölçeği kademe başına küçülür; ölçek tavanı üç **ÖLÇÜLEN** terimin en küçüğüdür ve sayfa taşması tavanı tabloya girer; **madde 10** (Masa kararı, Sahip adına) el bitince `#merkez` gizlenir ve ölçüt duruma göre **ayrılır** — gevşemez, 2026-11-22, tasokey#72; önceki: `22` **ADR-022** §0'a geçti — oyuncunun ıstakası ve taşları tek ölçek değişkeninden büyür, değer kademe başına **ölçülür**; karar `tasokey#68`te §5'e yazılmış ama sürüm sayısı güncellenmemişti. Ayrıca sürükle-bırak hedefleri yeni ölçekte ölçüldü: **yeni ADR açılmadı**, ADR-012 ve ADR-014 "Sonuçlar"a `tasokey#64` ölçümü, §6'ya kanıt satırı, §7 risk 5 güncellendi, 2026-11-22, tasokey#69 · `20` **ADR-023** ofis içi arayüz ölçümü `--plan` + `ekran_gerek` yolundan alınır, sürücünün sunucu + Edge/CDP kipi **Masa yolu**dur; §6 kanıt tablosunda iki yol ayrıldı, §7 risk 6 **kapandı** ve risk 24 açıldı, 2026-11-22, tasokey#67 · `19` ADR-012 "Sonuçlar"a ızgara **iz kuralı** — esnek iz köşelerde, orta şerit ıstakaların boyunda; ADR-014 "Sonuçlar"a `tasokey#63` ölçümü; masa yüksekliği esnek **kaptan** gelir, 2026-11-22, tasokey#63 · `18` **ADR-021** sürükleme görsel dili: parmağı kopya izler, asıl taş kaynağında görünmez olur ama yerini korur; §3 `arayuz/surukle.js` satırı güncellendi, 2026-11-22, tasokey#62 · `17` ADR-020 **madde 12** WebView yazılım katmanı — kabukta tek açma/kapama sabiti, §7'ye risk 22-23, 2026-11-22, tasokey#61 · `16` kabuk ve derleme zinciri §2/§3/§6/§7'ye yazıldı + ADR-020'nin etkilenen gereksinimleri onay bekleyen R-016…R-019 olarak işaretlendi, 2026-11-22, tasokey#58 · `15` ADR-020 **madde 11** uygulama simgesi, 2026-11-21, tasokey#55 · `14` ADR-020 Android kabuğu, **koşullu kabul**, Mimar hakemliği, 2026-11-21, tasokey#54
