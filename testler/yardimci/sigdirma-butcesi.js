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
 */
export const OLCULEN_MASA_KUTUSU = Object.freeze([
  Object.freeze({ ad: 'masaustu', boyut: [1920, 1080], masaIc: [1860, 945], taban: [58, 82] }),
  Object.freeze({ ad: 'dizustu', boyut: [1280, 800], masaIc: [1226, 671], taban: [50, 72] }),
  Object.freeze({ ad: 'tablet', boyut: [1180, 820], masaIc: [1126, 691], taban: [50, 72] }),
  Object.freeze({ ad: 'kademe-900', boyut: [900, 600], masaIc: [864, 489], taban: [42, 60] }),
  Object.freeze({ ad: 'telefon-yatay', boyut: [844, 390], masaIc: [828, 311], taban: [25, 36] }),
  Object.freeze({ ad: 'telefon-kucuk', boyut: [800, 360], masaIc: [784, 281], taban: [25, 36] }),
]);

/**
 * Kademe başına KABUL boyutları (plan §4): seçilen ölçek, kendi kademesinin BÜTÜN kabul
 * boyutlarında eşitsizliği sağlamak zorundadır — bağlayıcı olan en dar boyuttur.
 * `@media (max-width: 480px)` listede yoktur: o kademe yalnız telefon DİKEYde geçerlidir ve
 * orada oyun alanı hiç çizilmez (ADR-012, "telefonu yan çevir" uyarısı) → sığdırılacak masa yok.
 * Anahtarlar `css-olcu.js`in kademe adlarıdır (`@media` sorgusu birebir).
 */
export const KADEME_KABUL_BOYUTLARI = Object.freeze({
  'temel (:root)': Object.freeze(['masaustu']),
  '@media (max-width: 1300px)': Object.freeze(['dizustu', 'tablet']),
  '@media (max-width: 900px)': Object.freeze(['kademe-900']),
  '@media (orientation: landscape) and (max-height: 500px)': Object.freeze([
    'telefon-yatay', 'telefon-kucuk',
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
 */
export const OLCULEN_OLCEK_TAVANI = Object.freeze({
  masaustu: Object.freeze({
    el: Object.freeze({ yeni0: 1.85, buyumez0: 1.85 }),
    rakip: Object.freeze({ yeni0: 1.30, buyumez0: 1.30 }),
  }),
  dizustu: Object.freeze({
    el: Object.freeze({ yeni0: 1.35, buyumez0: 1.35 }),
    rakip: Object.freeze({ yeni0: 1.05, buyumez0: 1.05 }),
  }),
  tablet: Object.freeze({
    el: Object.freeze({ yeni0: 1.40, buyumez0: 1.40 }),
    rakip: Object.freeze({ yeni0: 1.10, buyumez0: 1.10 }),
  }),
  'kademe-900': Object.freeze({
    el: Object.freeze({ yeni0: 1.05, buyumez0: 1.05 }),
    rakip: Object.freeze({ yeni0: 1.05, buyumez0: null }),
  }),
  'telefon-yatay': Object.freeze({
    el: Object.freeze({ yeni0: 1.05, buyumez0: 1.05 }),
    rakip: Object.freeze({ yeni0: 1.05, buyumez0: 1.05 }),
  }),
  'telefon-kucuk': Object.freeze({
    el: Object.freeze({ yeni0: 1.15, buyumez0: null }),
    rakip: Object.freeze({ yeni0: 1.15, buyumez0: null }),
  }),
});

/**
 * Ölçümün kademeye izin verdiği en büyük ölçek: kademenin BÜTÜN kabul boyutlarında, verilen
 * durumlarda `buyumez0`un en küçüğü. `buyumez0` yoksa (taban zaten ihlalli) o boyut ölçeğin
 * büyümesine izin vermez → 1.
 *
 * `durumlar` varsayılanı yalnız `el`dir: `rakip` (el bittiğinde açılan rakip ıstakası) ölçümünde
 * bağlayıcı çiftler `#kenarSolTaslar`/`#kenarSagTaslar` ile köşe yığınlarıdır, yani ölçeğin
 * büyüttüğü `--rakip-acik-tas-*` ile ölçeğe BAĞLANMAYAN `--rakip-raf-*` kutusunun çelişkisi —
 * ADR-022/6'nın açık bırakığı sorudur, `tasokey#68` raporunda Mimar'a soruluyor.
 */
export function olculenTavan(kademeAdi, kabulBoyutlari, durumlar = ['el']) {
  let enKucuk = Infinity;
  for (const boyutAdi of kabulBoyutlari) {
    const kayit = OLCULEN_OLCEK_TAVANI[boyutAdi];
    if (!kayit) throw new Error(`ölçülen ölçek tavanı yok: ${boyutAdi} (${kademeAdi})`);
    for (const durum of durumlar) {
      if (!kayit[durum]) throw new Error(`ölçülen durum yok: ${boyutAdi}/${durum}`);
      enKucuk = Math.min(enKucuk, kayit[durum].buyumez0 ?? 1);
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
  const kayit = OLCULEN_MASA_KUTUSU.find(
    (satir) => satir.boyut[0] === genislik && satir.boyut[1] === yukseklik,
  );
  if (!kayit) throw new Error(`ölçülen masa kutusu yok: ${genislik}x${yukseklik}`);
  return [...kayit.masaIc];
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

/**
 * İki eşitsizliğin birlikte denetimi. `bos` artı ise taş sığıyor, eksi ise bütçe aşılmış demektir
 * (hata iletisine yazılır: hangi yön, ne kadar).
 */
export function butceDenetimi(girdi) {
  const yatay = yatayButce(girdi);
  const dikey = dikeyButce(girdi);
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
  const yatay = yatayButce(girdi).enCokTasGenislik / tabanGenislik;
  const dikey = dikeyButce(girdi).enCokTasYukseklik / tabanYukseklik;
  const ham = Math.min(yatay, dikey, tavan);
  const basamakli = Math.round(Math.floor(ham / basamak + 1e-9) * basamak * 100) / 100;
  return { yatay, dikey, ham, basamakli: Math.max(1, basamakli) };
}
