// tasokey#68 (üst iş tasokey#64) — SIĞDIRMA BÜTÇESİ: planın §4'ündeki iki eşitsizliğin saf
// karşılığı + ölçülen masa içerik kutusu tablosu. ADR-022/5: kademe başına `--istaka-olcek`
// SEÇİLMEZ, ÖLÇÜLÜR — bu dosya o ölçünün tek kaynağıdır.
//
// Formül (plan §4; `w`/`h` görünen taş ölçüsü, `N` = RAF_SUTUN_SAYISI, `W`/`H` = #masa'nın
// İÇERİK kutusu):
//   yatay:  N·w + 2·panel-dolgu + 2·(w + 2·kose-kaydirma) + 2·masa-bosluk ≤ W
//   dikey:  4·h + raf-bosluk + 2·panel-dolgu + 4·kose-kaydirma + 2·masa-bosluk
//           + --sigdirma-metin-payi ≤ H
// Terimlerin HEPSİ CSS değişkenidir (öz-test onları `css-olcu.js` ile okur, sayı yazmaz); tek
// istisna `W`/`H`, çünkü masa yüksekliği esnek kaptan gelir (tasokey#63) ve CSS'ten okunamaz →
// aşağıdaki tabloda ÖLÇÜLÜ durur.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

/**
 * Masanın İÇERİK kutusu ve o boyutta kazanan kademenin taban taş ölçüsü — `tasokey#68` 1. çekim
 * turunda, ofisin penceresiz tarayıcısıyla ÖLÇÜLDÜ (en kötü metin durumu, `durum=el`;
 * `is/tasokey-68/ekran/olcum-el-*.png` yazı katmanındaki `BUTCE` satırları).
 *
 * Niçin tabloda: `W`/`H` masanın kendi içeriğinden değil esnek kaptan gelir (tasokey#63) — üst
 * çubuk, durum satırı ve ahşap çerçeve çıkarıldıktan sonra KALAN yerdir. Bu yüzden taş ölçüsünden
 * (ve ölçekten) bağımsızdır: ölçek araması boyunca sabit kaldığı aynı turda ölçüldü.
 * `taban` sütunu ayrıca statik çözümleyicinin denetimidir: "bu boyutta hangi `@media` kazanıyor?"
 * sorusunun tarayıcıdaki yanıtı budur (öz-test `boyutSozlugu` ile aynı sayıyı bulmak zorunda).
 *
 * `bant` sütunu (tasokey#72 1. çekim turu, `BUTCE-V bant=` satırı): `#masa`nın ÇÖZÜLEN
 * `grid-template-rows` ölçüleri. Kısa yatay düzen varyantının (tasokey#71) hangi boyutlarda ETKİN
 * olduğunun DOĞRUDAN kanıtıdır — varsayım değil ölçüm: dört bant = varyant, üç bant = paylaşılan
 * düzen. Bant ölçüleri ölçekten BAĞIMSIZDIR (üst çubuk bandı `auto` = çubuğun kalınlığı, kalan üç
 * bant `1fr 2fr 1fr`), bu yüzden ölçek araması boyunca da sabit kalırlar.
 */
export const OLCULEN_MASA_KUTUSU = Object.freeze([
  Object.freeze({
    ad: 'masaustu', boyut: [1920, 1080], masaIc: [1860, 945], taban: [58, 82],
    bant: Object.freeze([224.25, 448.5, 224.25]),
  }),
  Object.freeze({
    ad: 'dizustu', boyut: [1280, 800], masaIc: [1226, 671], taban: [50, 72],
    bant: Object.freeze([158.75, 317.5, 158.75]),
  }),
  Object.freeze({
    ad: 'tablet', boyut: [1180, 820], masaIc: [1126, 691], taban: [50, 72],
    bant: Object.freeze([163.75, 327.5, 163.75]),
  }),
  Object.freeze({
    ad: 'kademe-900', boyut: [900, 600], masaIc: [864, 489], taban: [42, 60],
    bant: Object.freeze([8, 109.75, 219.5, 109.75]),
  }),
  Object.freeze({
    ad: 'telefon-yatay', boyut: [844, 390], masaIc: [828, 311], taban: [25, 36],
    bant: Object.freeze([8, 71.25, 142.5, 71.25]),
  }),
  Object.freeze({
    ad: 'telefon-kucuk', boyut: [800, 360], masaIc: [784, 281], taban: [25, 36],
    bant: Object.freeze([8, 63.75, 127.5, 63.75]),
  }),
]);

/** Ölçülen bant sayısından: bu boyutta kısa yatay DÜZEN VARYANTI etkin mi (dört bant)? */
export function olculenVaryant(ad) {
  return olculenBoyut(ad).bant.length > 3;
}

/**
 * Kademe başına KABUL boyutları (plan §4): seçilen ölçek, kendi kademesinin BÜTÜN kabul
 * boyutlarında eşitsizliği sağlamak zorundadır — bağlayıcı olan en dar boyuttur.
 * `@media (max-width: 480px)` listede yoktur: o kademe yalnız telefon DİKEYde geçerlidir ve
 * orada oyun alanı hiç çizilmez (ADR-012, "telefonu yan çevir" uyarısı) → sığdırılacak masa yok.
 * Anahtarlar `css-olcu.js`in kademe adlarıdır (`@media` sorgusu birebir).
 *
 * tasokey#72: kısa yatay DÜZEN VARYANTININ blokları da listeye girdi, çünkü ölçeği artık ORADA
 * yazılı (varyantın kazancı ölçülebilir hâle geldi). Kabul boyutları, ölçeği KAZANAN bloğa göre
 * gruplanır ve varyantın her dilimi kendi TEK kabul boyutunu taşır: 800x360 birinci bloktan,
 * 844x390 ikinci (361…700 px) bloktan, 900x600 üçüncü (501…700 px) bloktan okur. Kademenin
 * bölünme sebebi ÖLÇÜMDÜR (ADR-022 madde 9): 800x360 ile 844x390 farklı tavan ölçtü (1,30 ↔ 1,50),
 * yani tek blokta kalsalardı geniş olan dar olanın bedelini öderdi.
 * Taban kademelerin (`max-width: 900px`, `max-height: 500px`) kendi değerleri VARYANTSIZ hâlin
 * ölçüsü olarak durur — kapatma anahtarı — ve artık hiçbir kabul boyutunda kazanmaz.
 */
export const KADEME_KABUL_BOYUTLARI = Object.freeze({
  'temel (:root)': Object.freeze(['masaustu']),
  '@media (max-width: 1300px)': Object.freeze(['dizustu', 'tablet']),
  '@media (orientation: landscape) and (max-height: 700px)': Object.freeze(['telefon-kucuk']),
  '@media (orientation: landscape) and (min-height: 361px) and (max-height: 700px)': Object.freeze([
    'telefon-yatay',
  ]),
  '@media (orientation: landscape) and (min-height: 501px) and (max-height: 700px)': Object.freeze([
    'kademe-900',
  ]),
});

/** Ölçek merdiveninin basamağı (ölçüm aracının `olcekAramasi` basamağıyla aynı). */
export const OLCEK_BASAMAGI = 0.05;

/**
 * TARAYICIDA ÖLÇÜLEN ölçek tavanı — `tasokey#68` **2. çekim turu**, `yerlesim-cakisma.olcum.js`
 * `--arama` kipi (`is/tasokey-68/ekran/olcum-*.png` yazı katmanındaki `ARAMA enCok` satırı).
 * Araç `--istaka-olcek`i satır içi geçersiz kılarak 1,05'ten 2,00'a 0,05 basamakla tarar ve her
 * basamakta YENİ çakışan çift / BÜYÜYEN mevcut çift / taşma sayar.
 *
 * - `yeni0`: yeni çakışan çift çıkmadan erişilen en büyük ölçek.
 * - `buyumez0`: ek olarak MEVCUT (taban) çiftlerin hiçbiri büyümeden erişilen en büyük ölçek;
 *   `null` ise taban zaten ihlalli ve ilk basamakta büyüyor (800x360 `el`).
 *
 * NİÇİN BU TABLO BÜTÇENİN YANINDA DURUYOR: `enCokOlcek()` bütçesi bir ÜST SINIRDIR ve her boyutta
 * gerçeğin ÜSTÜNDE kaldı (1920: bütçe 2,17 · ölçülen 1,85). Sebep ölçüldü: `#masa`nın satırları
 * `grid-template-rows: 1fr var(--masa-orta-satir) 1fr` ile KESİRLİDİR, bütçe ise masa yüksekliğini
 * tek bir toplam gibi paylaştırır. Istaka (`#rafAlani`, `align-self: end`) kendi satırını aşınca
 * yukarı taşar ve orta satırın alta yaslı içeriğini (`#merkez` → `#gosterge`) örter — bütün
 * boyutlarda bağlayıcı olan çift budur (`#rafAlani ∩ #merkez` + `#rafAlani ∩ #gosterge`).
 * ADR-022/5 gereği kademe değeri SEÇİLMEZ, ÖLÇÜLÜR → CSS'teki değerin tek dayanağı bu tablodur,
 * bütçe yalnız ikinci (daha gevşek) bir denetim olarak kalır.
 *
 * tasokey#72 (1. çekim turu, `is/tasokey-72/ekran/olcum-*.png`): tablo kısa yatay DÜZEN VARYANTI
 * (tasokey#71) ETKİNKEN YENİDEN ölçüldü. Masaüstü üç boyut BİREBİR aynı kaldı (varyant orada etkin
 * değil — gerilemesizlik kanıtı); üç varyant boyutunun hepsi yukarı çıktı:
 *   · 800x360 `el` 1 → **1,95** (tasokey#68'de taban zaten ihlalliydi, `buyumez0` yoktu)
 *   · 844x390 `el` 1,05 → **2,00** (aramanın tavanı; gerçek sınır daha yukarıda olabilir)
 *   · 900x600 `el` 1,05 → **1,25**
 * `durum=rakip` de üç boyutta birden yükseldi ve masaüstünde ADR-022/6'nın muafiyetinden sonra
 * `el` ile eşitlendi (1,85 / 1,35 / 1,40). Varyantın üç diliminde `rakip` tavanı 4. çekim turunda
 * madde 8 ve 10'dan sonra YENİDEN ölçüldü (aşağıda).
 *
 * **ÜÇÜNCÜ TERİM (tasokey#72, ADR-022 madde 9):** sayfa taşmasının başladığı basamak (`tasma0`)
 * artık tabloda ÖLÇÜLEN bir alandır. Ölçüm aracı `yeni0`/`buyumez0`u zaten taşmasız basamaklardan
 * seçer, yani sayı olarak `tasma0` çoğu kademede bağlayıcı değildir; tabloya girme sebebi
 * **tek kaynak**tır: ölçeğin tavanı üç ölçülen terimin en küçüğüdür ve üçü de burada, yan yana
 * okunur (aracın seçim kuralı değişse bile tavan yerinde kalır). Kısa yatay varyantın telefon
 * dilimlerinde bağlayıcı olan GERÇEKTEN bu terimdir: ADR-022 madde 10 çakışmayı kaldırınca geriye
 * yalnız taşma kalıyor (800x360 **1,30** · 844x390 **1,50**; taşan öğe de ölçüldü — alt iki
 * köşenin sayaç kutuları, `#koseSagAltSayac` + `#koseSolAltSayac`).
 *
 * tasokey#72 (4. ve 5. çekim turu, `is/tasokey-72/ekran/muaf-*.png` ve `son-*.png`): varyantın üç
 * boyutu `durum=rakip` için YENİDEN ölçüldü — ADR-022 madde 8 (muafın kendi ölçeği, 900x600'de
 * `--rakip-acik-olcek` 0,6 → 0,45; ölçülen merdiven madde 10 yürürlükteyken 0,50 → 1,20 ·
 * 0,45 → **1,25**) ve madde 10 (el bitince `#merkez` gizlenir) sonrası. 900x600'de iki durumun
 * tavanı da artık YATAY sayfa taşmasıdır (13 px: `#kenarSagAd` 9 + `#kenarSag` 6).
 * Masaüstü üç boyut BİREBİR aynı kaldı.
 */
export const OLCULEN_OLCEK_TAVANI = Object.freeze({
  masaustu: Object.freeze({
    el: Object.freeze({ yeni0: 1.85, buyumez0: 1.85, tasma0: 2.00 }),
    rakip: Object.freeze({ yeni0: 1.85, buyumez0: 1.85, tasma0: 2.00 }),
  }),
  dizustu: Object.freeze({
    el: Object.freeze({ yeni0: 1.35, buyumez0: 1.35, tasma0: 1.65 }),
    rakip: Object.freeze({ yeni0: 1.35, buyumez0: 1.35, tasma0: 1.65 }),
  }),
  tablet: Object.freeze({
    el: Object.freeze({ yeni0: 1.40, buyumez0: 1.40, tasma0: 1.50 }),
    rakip: Object.freeze({ yeni0: 1.40, buyumez0: 1.40, tasma0: 1.50 }),
  }),
  'kademe-900': Object.freeze({
    // `el`: 1,30'da sayfa yatayda 13 px taşıyor (taşan öğe `#kenarSagAd` 9 + `#kenarSag` 6).
    el: Object.freeze({ yeni0: 1.25, buyumez0: 1.25, tasma0: 1.25 }),
    // `rakip`: ADR-022 madde 8'in muaf küçültmesinden (0,45) SONRA. 0,50'de bağlayıcı çift
    // `#rafAlani ∩ #kenarSol/SagTaslar`dı (1,20'de kalıyordu); 0,45'te o çift kalkar ve sınır
    // `el` ile aynı yere, YATAY sayfa taşmasına gelir.
    rakip: Object.freeze({ yeni0: 1.25, buyumez0: 1.25, tasma0: 1.25 }),
  }),
  'telefon-yatay': Object.freeze({
    el: Object.freeze({ yeni0: 2.00, buyumez0: 2.00, tasma0: 2.00 }),
    // `rakip`: madde 10'dan sonra çakışma sınırı kalkar (ölçümde 1,45'teki TEK yeni çift
    // `#merkez ∩ #kenarUstTaslar`tı ve 2,00'ye kadar başka çift çıkmadı) → sınır taşmadır.
    rakip: Object.freeze({ yeni0: 1.50, buyumez0: 1.50, tasma0: 1.50 }),
  }),
  'telefon-kucuk': Object.freeze({
    el: Object.freeze({ yeni0: 1.95, buyumez0: 1.95, tasma0: 1.95 }),
    // `rakip`: aynı gerekçe (ölçümde 1,25'teki TEK yeni çift `#merkez ∩ #kenarUstTaslar`).
    rakip: Object.freeze({ yeni0: 1.30, buyumez0: 1.30, tasma0: 1.30 }),
  }),
});

/**
 * Ölçümün kademeye izin verdiği en büyük ölçek: kademenin BÜTÜN kabul boyutlarında, verilen
 * durumlarda ÜÇ ÖLÇÜLEN TERİMİN en küçüğü (ADR-022 madde 9) — çakışma tavanı (`buyumez0`) ve
 * sayfa taşması tavanı (`tasma0`). `buyumez0` yoksa (taban zaten ihlalli) o boyut ölçeğin
 * büyümesine izin vermez → 1. `tasma0` her kayıtta ZORUNLUDUR: eksikse sessizce sonsuz sayılıp
 * denetimsiz kalmasın diye hata verilir.
 *
 * `durumlar` varsayılanı yalnız `el`dir; iki durumun birlikte okunduğu bağlayıcı denetim
 * `sigdirma-butcesi.test.js` kabul-d10'dadır (orada ölçek üç terimin en küçüğüne EŞİT olmalıdır).
 * `tablo` yalnız öz-testin eksik alan denetimi için vardır; üretimde tek kaynak yukarıdaki sabittir.
 */
export function olculenTavan(kademeAdi, kabulBoyutlari, durumlar = ['el'], tablo = OLCULEN_OLCEK_TAVANI) {
  let enKucuk = Infinity;
  for (const boyutAdi of kabulBoyutlari) {
    const kayit = tablo[boyutAdi];
    if (!kayit) throw new Error(`ölçülen ölçek tavanı yok: ${boyutAdi} (${kademeAdi})`);
    for (const durum of durumlar) {
      if (!kayit[durum]) throw new Error(`ölçülen durum yok: ${boyutAdi}/${durum}`);
      const { buyumez0, tasma0 } = kayit[durum];
      if (typeof tasma0 !== 'number') throw new Error(`ölçülen taşma tavanı yok: ${boyutAdi}/${durum}`);
      enKucuk = Math.min(enKucuk, buyumez0 ?? 1, tasma0);
    }
  }
  return Math.max(1, enKucuk);
}

/** Ölçülen boyut kaydı (ad ile); yoksa hata — sessizce `undefined` ile hesap yapılmasın. */
export function olculenBoyut(ad) {
  const kayit = OLCULEN_MASA_KUTUSU.find((satir) => satir.ad === ad);
  if (!kayit) throw new Error(`ölçülen boyut yok: ${ad}`);
  return kayit;
}

/**
 * Görünüm ölçüsüne karşılık gelen ÖLÇÜLEN masa içerik kutusu `[genislik, yukseklik]`.
 * tasokey#71: ızgara bant modeli (`yardimci/masa-izleri.js`) bunu okur — masanın yüksekliği esnek
 * kaptan gelir (tasokey#63), CSS'ten okunamaz, ve "görünüm eksi üst sınır" tahmini kısa ekranlarda
 * bandı sıfıra sıkıştırdığı için savları yanıltıyordu (A9: ölç, tahmin etme).
 */
export function olculenMasaKutusu({ genislik, yukseklik }) {
  return [...olculenKayit(genislik, yukseklik).masaIc];
}

/**
 * Aynı kaydın ÖLÇÜLEN bant (satır) ölçüleri — tasokey#72. `masa-izleri.js` bunu okur: bant modeli
 * bir ALT SINIR hesaplar (kendi içeriği en küçük, komşularınki en büyük) ve ölçek büyüdükçe o alt
 * sınır gerçeğin çok altına düşer (800x360'ta yan çubuk bandı için 36 px derken ölçülen 127,5 px).
 * Bantlar aslında ölçekten BAĞIMSIZDIR (`auto` + `1fr 2fr 1fr`), bu yüzden ölçülen sayı hem doğru
 * hem kararlıdır (A9: ölç, tahmin etme).
 */
export function olculenBantlar({ genislik, yukseklik }) {
  return [...olculenKayit(genislik, yukseklik).bant];
}

/** Görünüm ölçüsüne karşılık gelen ölçüm satırı; yoksa hata (sessiz `undefined` yok). */
function olculenKayit(genislik, yukseklik) {
  const kayit = OLCULEN_MASA_KUTUSU.find(
    (satir) => satir.boyut[0] === genislik && satir.boyut[1] === yukseklik,
  );
  if (!kayit) throw new Error(`ölçülen masa kutusu yok: ${genislik}x${yukseklik}`);
  return kayit;
}

/**
 * Yatay eşitsizlik: orta sütun ıstaka şeridi (N·w + 2·panel-dolgu), yan sütunlar köşenin en küçük
 * genişliği (w + 2·kose-kaydirma), aralarında iki ızgara boşluğu.
 * Döner: `{ pay, enCokTasGenislik }` — `pay` taşlara kalan yer, ikincisi izin verilen en büyük `w`.
 */
export function yatayButce({ masaIcGenislik, panelDolgu, koseKaydirma, masaBosluk, sutun }) {
  const pay = masaIcGenislik - 2 * panelDolgu - 4 * koseKaydirma - 2 * masaBosluk;
  return { pay, enCokTasGenislik: pay / (sutun + 2) };
}

/**
 * Dikey eşitsizlik: alt satır ıstaka (2·h + raf-bosluk + başlık + 2·panel-dolgu), üst satır ≥ köşe
 * (h + 2·kose-kaydirma), orta satır ≥ deste sütunu (h + metin satırları), iki ızgara boşluğu.
 * Istaka başlığı + deste başlığı/sayaç/ipucu + `.yigin` boşlukları `--sigdirma-metin-payi`
 * değişkeninde toplanır (rem tabanlı, CSS'te px'e çevrilemez → ÖLÇÜLÜR, ADR-022/5).
 *
 * `4·kose-kaydirma`: dikeyde köşe satırı BİR tanedir (alt satır ıstakanın kendisi), yani gerçek
 * yığın `2·kose-kaydirma` ister. Planın §4'ü yatayla aynı terimi yazar → bütçe 2·kk (en çok
 * 10 px) kadar TEMKİNLİ kalır. Formül plandaki hâliyle uygulanır (tek kaynak); temkinli olması
 * yanlış tarafa düşmez, çünkü bütçe bir ÜST SINIRDIR.
 */
export function dikeyButce({
  masaIcYukseklik, rafBosluk, panelDolgu, koseKaydirma, masaBosluk, metinPayi,
}) {
  const pay = masaIcYukseklik
    - (rafBosluk + 2 * panelDolgu + 4 * koseKaydirma + 2 * masaBosluk + metinPayi);
  return { pay, enCokTasYukseklik: pay / 4 };
}

/* ------------------------------------------- kısa yatay DÜZEN VARYANTININ bütçesi (tasokey#72) */

/*
 * Varyant (tasokey#71, tasokey#70 planı §3) masanın BANT LİSTESİNİ değiştirir, bu yüzden planın
 * §4'ündeki iki eşitsizliğin de varyant karşılığı vardır. Paylaşılan düzende masa ÜÇ banttır
 * (köşe / orta / ıstaka) ve dikey zincir DÖRT taş boyu taşır; varyantta DÖRT banttır
 * (üst çubuk `auto` / üst içerik `1fr` / yan çubuk `2fr` / ıstaka `1fr`), üst köşeler ilk iki bandı
 * birlikte kaplar ve dikey zincir ÜÇ taş boyu taşır (üst içerik 1 + ıstaka 2). Kazanç buradan gelir.
 *
 * Metin KALDIRILMAZ, TAŞINIR (karar maddeleri 3-4; ADR-022 Seçenek D hâlâ Sahip'tedir): yığınlar ve
 * ıstaka paneli yatay akar. Bu yüzden metnin payı da dikeyden yataya geçer —
 *   · dikeyde `--sigdirma-metin-payi`nın (dört satır) yerini tek terim alır:
 *     `--sigdirma-yan-metin-payi` (yığında taş dışındaki en yüksek öğe),
 *   · yatayda orta sütuna `--raf-bosluk + --sigdirma-raf-baslik-payi` eklenir (başlık taşların
 *     yanında).
 * İkisi de rem tabanlıdır → CSS'te px'e çevrilemez, ÖLÇÜLÜR (ADR-022/5). Istaka başlığının DİKEY
 * payı da ölçüldü ve 0'dır (başlık iki sıra taştan kısa) → dikey eşitsizlikte terimi yoktur.
 */

/**
 * Varyantın YATAY eşitsizliği: orta sütun artık ıstaka şeridi + ıstaka başlığı, yan sütunlar yine
 * köşenin en küçük genişliği, aralarında iki ızgara boşluğu.
 *   N·w + 2·panel-dolgu + raf-bosluk + raf-başlık-payı + 2·(w + 2·kose-kaydirma) + 2·masa-bosluk ≤ W
 * Varyantta BAĞLAYICI yön budur (ölçüm: 900x600'de 1,30'da 13 px yatay taşma).
 */
export function varyantYatayButce({
  masaIcGenislik, panelDolgu, koseKaydirma, masaBosluk, rafBosluk, rafBaslikPayi, sutun,
}) {
  const pay = masaIcGenislik
    - (2 * panelDolgu + rafBosluk + rafBaslikPayi + 4 * koseKaydirma + 2 * masaBosluk);
  return { pay, enCokTasGenislik: pay / (sutun + 2) };
}

/**
 * Varyantın DİKEY eşitsizliği: üst çubuk bandı (`auto` = çubuğun kalınlığı) + üst içerik bandı
 * (deste/gösterge yığını, yüksekliği `max(h, yan-metin-payı)`) + ıstaka bandı (2·h + 2·panel-dolgu)
 * + alt köşe yığını payı (2·kose-kaydirma) + ÜÇ ızgara boşluğu ≤ H.
 *
 * `max(h, pay)` kapalı bir formül vermediği için üst bant `h + pay` ile yüklenir: bu, gerçeğin
 * ÜSTÜNDE kalan TEMKİNLİ bir üst sınırdır (taban formülün 2·kk temkinliliğiyle aynı tercih) ve
 * bütçe zaten bir üst sınır olduğundan yanlış tarafa düşmez. Yan çubuk bandı (`2fr`) burada terim
 * değildir: kalan yeri alır ve ÖLÇÜSÜ ayrı denetlenir (ince sırt oranı, kisa-yatay-varyant kabul-g).
 */
export function varyantDikeyButce({
  masaIcYukseklik, panelDolgu, koseKaydirma, masaBosluk, cubukKalinlik, yanMetinPayi,
}) {
  const pay = masaIcYukseklik
    - (cubukKalinlik + yanMetinPayi + 2 * panelDolgu + 2 * koseKaydirma + 3 * masaBosluk);
  return { pay, enCokTasYukseklik: pay / 3 };
}

/**
 * ÜST BANDIN ek yatay denetimi: üst rakibin çubuğu (`--rakip-ust-genislik` = N·w + 2·panel-dolgu,
 * ıstakayla aynı formül — tek kaynak) ıstaka başlığını TAŞIMAZ, yani orta sütundan ıstaka satırının
 * istediğinden daha azını ister. Denetim bunu ölçer: üst bant da sığmalı, ve bağlayıcı satırın
 * ıstaka satırı olduğu `fark = raf-bosluk + raf-başlık-payı` özdeşliğiyle gösterilir.
 * Döner: `{ pay, gereken, bos, fark }` — `bos` artı ise üst bant sığıyor.
 */
export function varyantUstBantYatay(girdi) {
  const { masaIcGenislik, koseKaydirma, masaBosluk, tasGenislik, ustCubukGenislik } = girdi;
  const gereken = ustCubukGenislik + 2 * (tasGenislik + 2 * koseKaydirma) + 2 * masaBosluk;
  const istakaSatiri = varyantYatayButce(girdi);
  return {
    pay: masaIcGenislik,
    gereken,
    bos: masaIcGenislik - gereken,
    fark: girdi.rafBosluk + girdi.rafBaslikPayi,
    istakaSatiriBos: istakaSatiri.enCokTasGenislik - tasGenislik,
  };
}

/**
 * İki eşitsizliğin birlikte denetimi. `bos` artı ise taş sığıyor, eksi ise bütçe aşılmış demektir
 * (hata iletisine yazılır: hangi yön, ne kadar).
 * `girdi.varyant` ise kısa yatay düzen varyantının eşitsizlikleri kullanılır (yukarı bkz.).
 */
export function butceDenetimi(girdi) {
  const yatay = girdi.varyant ? varyantYatayButce(girdi) : yatayButce(girdi);
  const dikey = girdi.varyant ? varyantDikeyButce(girdi) : dikeyButce(girdi);
  const yatayBos = yatay.enCokTasGenislik - girdi.tasGenislik;
  const dikeyBos = dikey.enCokTasYukseklik - girdi.tasYukseklik;
  return {
    yatay: { ...yatay, tas: girdi.tasGenislik, bos: yatayBos },
    dikey: { ...dikey, tas: girdi.tasYukseklik, bos: dikeyBos },
    sigar: yatayBos >= 0 && dikeyBos >= 0,
  };
}

/**
 * Bütçenin izin verdiği en büyük ölçek: `min(yatay, dikey, tavan)`, basamağa AŞAĞI yuvarlanmış
 * ve 1'in altına inmeyen (ölçek taşı küçültemez — ADR-022/3 clamp alt sınırı).
 * Bu bir ÜST SINIRDIR: gerçek çakışma ölçümü (tarayıcı) daha düşük bir değer dayatabilir.
 */
export function enCokOlcek(girdi, { tabanGenislik, tabanYukseklik, tavan, basamak = OLCEK_BASAMAGI }) {
  const yatayPay = girdi.varyant ? varyantYatayButce(girdi) : yatayButce(girdi);
  const dikeyPay = girdi.varyant ? varyantDikeyButce(girdi) : dikeyButce(girdi);
  const yatay = yatayPay.enCokTasGenislik / tabanGenislik;
  const dikey = dikeyPay.enCokTasYukseklik / tabanYukseklik;
  const ham = Math.min(yatay, dikey, tavan);
  const basamakli = Math.round(Math.floor(ham / basamak + 1e-9) * basamak * 100) / 100;
  return { yatay, dikey, ham, basamakli: Math.max(1, basamakli) };
}
