// Masa ızgarasının İZ/BANT ÖLÇÜSÜ modeli: `stil.css` metninden (DOM yürütmesi yok — bu projenin
// arayüz testleri deseni, MIMARI.md §6) bir görünüm ölçüsünde geçerli iz adlarını, alan şablonunu,
// bant ölçülerini, köşe hücrelerini ve yan çubuk bandının uzunluğunu hesaplar.
//
// Kaynağı `kose-atma-alani.test.js` (tasokey#63): orada ÜÇ izli ızgara varsayımıyla yazılmıştı.
// tasokey#71'de buraya taşındı ve N bant'a genelleştirildi, çünkü kısa yatay düzen varyantı masayı
// DÖRT banda ayırıyor (tasokey#70 planı §3, karar maddesi 2) ve aynı modele iki test birden
// dayanıyor: köşe atma alanı oranı (tasokey#63) ve ince sırt oranı (varyantta --rakip-raf-uzunluk
// değil, ÖLÇÜLEN bant uzunluğuyla). Aynı iş iki dosyada yazılmasın (tek kaynak).
//
// Yazı ölçüsüne bağlı, burada ölçülemeyen uzunluklar için ALT/ÜST SINIR kullanılır; sınırlar
// iddianın ALEYHİNE seçilir, yani hesaplanan kapsama oranı gerçeğin ALT SINIRIDIR.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import {
  boyutSozlugu, ifadeHesapla, kuralGovdeleri, medyaBloklari, medyaSorgusuUyuyor, varCoz, yorumlariAt,
} from './css-olcu.js';

/** #ustCubuk + #durumSatiri birlikte en çok bu kadar yer kaplar (masa yüksekliğinden düşülür). */
export const KABUK_YUKSEKLIGI_UST_SINIRI_PX = 160;
/**
 * Aynı kabuğun ALT sınırı: düğme dolgusu (2x4px) + tek satır metin + durum satırı dolgusu.
 * "Masa viewport'a sığıyor mu?" sorusunda bu kullanılır — kabuk küçük varsayılınca masaya en çok
 * yer kalır, yani taşma iddiası en TEMKİNLİ biçimde kurulur (yanlış alarm vermez).
 */
export const KABUK_YUKSEKLIGI_ALT_SINIRI_PX = 48;
/** Tek satır metnin (başlık, sayaç, ipucu — 0,75…1,1rem) kaplayabileceği en büyük yükseklik. */
export const METIN_SATIRI_UST_SINIRI_PX = 32;
/** #rafAlani ve #merkez içindeki dikey boşlukların üst sınırı (stil.css: 8px / 6px, dar 4px). */
export const IC_BOSLUK_UST_SINIRI_PX = 16;
/**
 * Kısa yatay varyantta ıstaka başlığı ("Istakam" / "My rack", <= 0,8rem) taşların YANINA geçer ve
 * orta sütunu kendi genişliği kadar büyütür (karar maddesi 4). Yazı genişliği burada ölçülemez →
 * ÜST SINIR yazılır: orta sütun en geniş, köşe sütunları en dar varsayılır, yani köşe kapsama
 * oranı iddiası en temkinli hâliyle kurulur. Gerçek değer tarayıcı ölçümünde görünür.
 */
export const YAN_BASLIK_GENISLIK_UST_SINIRI_PX = 80;

/** Masa ızgarasının dokuz alan adı (ADR-012 dört kenar + dört köşe + merkez). */
export const MASA_ALANLARI = Object.freeze([
  'solUst', 'ust', 'sagUst', 'sol', 'merkez', 'sag', 'solAlt', 'alt', 'sagAlt',
]);

/* ------------------------------------------------------------------ CSS kademesi (boyuta göre) */

/** `@media` blokları çıkarılmış CSS (yalnız taban kurallar). */
export function medyasizCss(metin) {
  let sonuc = '';
  let i = 0;
  for (let bas = metin.indexOf('@media'); bas !== -1; bas = metin.indexOf('@media', i)) {
    sonuc += metin.slice(i, bas);
    let derinlik = 0;
    i = metin.indexOf('{', bas);
    for (; i < metin.length; i += 1) {
      if (metin[i] === '{') derinlik += 1;
      else if (metin[i] === '}' && (derinlik -= 1) === 0) { i += 1; break; }
    }
  }
  return sonuc + metin.slice(i);
}

/** Bu boyutta geçerli CSS kaynakları: taban + uyan `@media` gövdeleri (geliş sırasıyla). */
export function gecerliKaynaklar(css, boyut) {
  const yorumsuz = yorumlariAt(css);
  return [
    medyasizCss(yorumsuz),
    ...medyaBloklari(css).filter((b) => medyaSorgusuUyuyor(b.sorgu, boyut)).map((b) => b.govde),
  ];
}

/** Seçicinin bu boyutta GEÇERLİ (en son kazanan) bildirimi; yoksa null. */
export function bildirim(css, secici, ozellik, boyut) {
  let sonuc = null;
  for (const kaynak of gecerliKaynaklar(css, boyut)) {
    for (const govde of kuralGovdeleri(kaynak, secici)) {
      const eslesme = new RegExp(`(?:^|;)\\s*${ozellik}\\s*:\\s*([^;]+)`).exec(govde);
      if (eslesme) sonuc = eslesme[1].trim();
    }
  }
  return sonuc;
}

/* ------------------------------------------------------------------------- iz / alan çözümleme */

/**
 * `grid-template-rows` / `grid-template-columns` değerini iz adlarına ayırır: değişkenler çözülür
 * (`var(--masa-orta-satir)` → `2fr`), parantezler ayraç sayılır.
 * `'auto 1fr var(--masa-orta-satir) 1fr'` → `['auto', '1fr', '2fr', '1fr']`.
 */
export function izlerCoz(ham, sozluk) {
  if (!ham) throw new Error('izlerCoz: iz listesi boş');
  return varCoz(ham, sozluk).replace(/[()]/g, ' ').trim().split(/\s+/);
}

/**
 * `grid-template-areas` değerini satır satır alan adlarına ayırır:
 * `'"solUst ust sagUst" "sol . sag"'` → `[['solUst','ust','sagUst'], ['sol','.','sag']]`.
 */
export function alanSablonu(ham) {
  if (!ham) throw new Error('alanSablonu: şablon boş');
  const satirlar = [...ham.matchAll(/"([^"]*)"/g)].map(([, satir]) => satir.trim().split(/\s+/));
  if (satirlar.length === 0) throw new Error(`alanSablonu: tırnaklı satır yok: "${ham}"`);
  return satirlar;
}

/** Alan adının kapladığı bant (satır) indeksleri — şablonda hiç yoksa boş dizi. */
export function alanSatirlari(sablon, alanAdi) {
  return sablon.flatMap((satir, sira) => (satir.includes(alanAdi) ? [sira] : []));
}

/** Alan adının kapladığı sütun indeksleri — şablonda hiç yoksa boş dizi. */
export function alanSutunlari(sablon, alanAdi) {
  const sutunlar = new Set();
  for (const satir of sablon) {
    satir.forEach((ad, sira) => { if (ad === alanAdi) sutunlar.add(sira); });
  }
  return [...sutunlar].sort((a, b) => a - b);
}

/** Ardışık `indeksler` bantlarının birlikte kapladığı ölçü (aradaki ızgara boşlukları dahil). */
export function bantlarinOlcusu(olculer, indeksler, bosluk) {
  if (indeksler.length === 0) throw new Error('bantlarinOlcusu: bant listesi boş');
  const toplam = indeksler.reduce((t, i) => t + olculer[i], 0);
  return toplam + (indeksler.length - 1) * bosluk;
}

/* --------------------------------------------------------------------------- iz ölçüsü modeli */

/**
 * Bir ızgara ekseninin iz ölçüleri (N iz). `auto` iz içeriğine oturur, `Nfr` izler kalanı
 * paylaşır; bir esnek izin payı kendi içerik tabanından küçük kalırsa o iz dondurulup paylaşım
 * yeniden yapılır (CSS Grid "find the size of an fr" döngüsü).
 */
export function izOlculeri(izAdlari, { toplamOlcu, bosluk, icerikler }) {
  if (izAdlari.length !== icerikler.length) {
    throw new Error(`izOlculeri: ${izAdlari.length} iz, ${icerikler.length} içerik`);
  }
  const serbest = toplamOlcu - (izAdlari.length - 1) * bosluk;
  const olculer = icerikler.slice();
  const donmus = izAdlari.map((iz) => iz === 'auto');
  for (let tur = 0; tur < izAdlari.length + 1; tur += 1) {
    const dolu = olculer.reduce((t, o, i) => t + (donmus[i] ? o : 0), 0);
    const frToplam = izAdlari.reduce((t, iz, i) => t + (donmus[i] ? 0 : Number.parseFloat(iz)), 0);
    if (frToplam === 0) break;
    const birim = Math.max(0, serbest - dolu) / frToplam;
    const kucukKalan = izAdlari.findIndex(
      (iz, i) => !donmus[i] && Number.parseFloat(iz) * birim < icerikler[i],
    );
    if (kucukKalan === -1) {
      izAdlari.forEach((iz, i) => { if (!donmus[i]) olculer[i] = Number.parseFloat(iz) * birim; });
      break;
    }
    donmus[kucukKalan] = true;
  }
  return olculer;
}

/**
 * Aynı eksenin İÇERİK TABANLI toplam ölçüsü: kabın o eksendeki ölçüsü belirsizse (`auto`
 * yükseklikli bir kapta) tarayıcı esnek izleri serbest yerden değil İÇERİKTEN çözer — esneklik
 * birimi, esnek izlerin `içerik / pay` oranlarının EN BÜYÜĞÜDÜR (CSS Grid §12.7.2). Yani tek bir
 * dolu iz (oyuncunun ıstakası) bütün ızgarayı kendi payının katına çeker.
 */
export function izOlculeriIcerikten(izAdlari, { bosluk, icerikler }) {
  const birim = Math.max(
    ...izAdlari.map((iz, i) => (iz === 'auto' ? 0 : icerikler[i] / Number.parseFloat(iz))),
  );
  const olculer = izAdlari.map((iz, i) => (
    iz === 'auto' ? icerikler[i] : Math.max(icerikler[i], Number.parseFloat(iz) * birim)
  ));
  return olculer.reduce((toplam, olcu) => toplam + olcu, 0) + (izAdlari.length - 1) * bosluk;
}

/* ------------------------------------------------------------------------------- masa modeli */

/** Uzunluk ifadesini px olarak hesaplar (değişkenler çözülür); birimsiz sıfır geçerlidir. */
export function pxOlcu(ifade, sozluk) {
  const sonuc = ifadeHesapla(varCoz(ifade, sozluk));
  if (!(sonuc.birim === 'px' || sonuc.sayi === 0)) {
    throw new Error(`"${ifade}" px uzunluk vermiyor (${sonuc.sayi}${sonuc.birim})`);
  }
  return sonuc.sayi;
}

/**
 * Bir görünüm ölçüsünde masanın bant modeli. Dönen alanlar:
 *  · `varyant`   — kısa yatay düzen varyantı mı (bant sayısı 3'ten fazla)
 *  · `satirAdlari` / `sutunAdlari` / `sablon`
 *  · `satirOlculeri[i]` — i. bandın ALT SINIRI (kendi içeriği en küçük, ÖBÜRLERİ en büyük
 *    alındığında çıkan ölçü; iz ölçüsü kendi içeriğinde artan, komşu içeriklerde azalandır)
 *  · `koseler` — üst/alt köşe hücresi ve onu çevreleyen boş bölge
 *  · `yanBantUzunlugu` — sol/sağ çubuk bandının ölçüsü (ince sırt oranının BÖLENİ)
 *  · `cubukUzunluk` — çubuğun o bantta gerçekten kapladığı uzunluk
 */
export function masaModeli(css, boyut, ekler = new Map(), { masaIc = null } = {}) {
  const sozluk = boyutSozlugu(css, boyut, ekler);
  const px = (ifade) => pxOlcu(ifade, sozluk);
  const degisken = (ad) => px(`var(${ad})`);
  const beyan = (secici, ozellik) => bildirim(css, secici, ozellik, boyut);

  const bosluk = degisken('--masa-bosluk');
  const dolgu = degisken('--masa-dolgu');
  const cerceve = degisken('--masa-cerceve-kalinlik');
  const tasGenislik = degisken('--tas-genislik');
  const tasYukseklik = degisken('--tas-yukseklik');
  const kaydirma = degisken('--kose-kaydirma');
  const cubukKalinlik = degisken('--rakip-raf-kalinlik');
  const panelDolgu = degisken('--panel-dolgu');
  const rafBosluk = degisken('--raf-bosluk');
  // Orta sütunun içeriği: oyuncunun ıstakası = üst rakibin çubuğu (aynı formül, tek kaynak).
  const istakaGenislik = degisken('--rakip-ust-genislik');

  const satirAdlari = izlerCoz(beyan('#masa', 'grid-template-rows'), sozluk);
  const sutunAdlari = izlerCoz(beyan('#masa', 'grid-template-columns'), sozluk);
  const sablon = alanSablonu(beyan('#masa', 'grid-template-areas'));
  if (sablon.length !== satirAdlari.length) {
    throw new Error(`#masa ${satirAdlari.length} bant tanımlıyor, şablonda ${sablon.length} satır var`);
  }
  for (const alan of MASA_ALANLARI) {
    if (alanSatirlari(sablon, alan).length === 0) throw new Error(`#masa şablonunda ${alan} alanı yok`);
  }
  const varyant = satirAdlari.length > 3;

  const koseEnKucukGenislik = tasGenislik + 2 * kaydirma;
  const koseEnKucukYukseklik = tasYukseklik + 2 * kaydirma;
  const cubukTaban = px(beyan('.kenar-raf-dikey', 'min-height'));

  // #rafAlani ve #merkez varyantta YATAY akar: başlık/sayaç/ipucu taşın yanındadır, yani
  // dikeyde metin satırı payı düşer, yatayda başlık genişliği eklenir (karar maddeleri 3-4).
  // Varyantta "Istakam" başlığı taşların YANINDA: panelin yüksekliği iki sıra taş ile başlığın
  // büyüğüdür (başlık <= 0,8rem, iki sıra taştan kısa) — dikey metin satırı ve `--raf-bosluk`
  // payı düşer, bu yüzden alt ve üst sınır AYNIDIR.
  const istakaYukseklikAlt = varyant
    ? Math.max(2 * tasYukseklik, METIN_SATIRI_UST_SINIRI_PX) + 2 * panelDolgu
    : 2 * tasYukseklik + 2 * panelDolgu;
  const istakaYukseklikUst = varyant
    ? istakaYukseklikAlt
    : istakaYukseklikAlt + IC_BOSLUK_UST_SINIRI_PX + METIN_SATIRI_UST_SINIRI_PX;
  const merkezYukseklikAlt = tasYukseklik;
  const merkezYukseklikUst = varyant
    ? Math.max(tasYukseklik, METIN_SATIRI_UST_SINIRI_PX)
    : tasYukseklik + 4 * METIN_SATIRI_UST_SINIRI_PX + 3 * IC_BOSLUK_UST_SINIRI_PX;
  const ortaSutunIcerik = varyant
    ? istakaGenislik + rafBosluk + YAN_BASLIK_GENISLIK_UST_SINIRI_PX
    : istakaGenislik;

  /**
   * Bandın içerik tabanı: YALNIZ o bandı kaplayan alanların içeriği. Birden çok bandı kaplayan
   * öğe (varyantta üst köşeler) bandın taban ölçüsünü büyütmez — esnek bir ize de uzandığı için
   * tarayıcı onu bu adımda atlar (CSS Grid §11.5). `.` (boş hücre) hiçbir şey katmaz.
   */
  const bantIcerikleri = (alanIcerik) => satirAdlari.map((_, bant) => {
    let enBuyuk = 0;
    for (const [alan, deger] of alanIcerik) {
      const satirlar = alanSatirlari(sablon, alan);
      if (satirlar.length === 1 && satirlar[0] === bant) enBuyuk = Math.max(enBuyuk, deger);
    }
    return enBuyuk;
  });

  const alanIcerikAlt = [
    ['ust', cubukKalinlik], ['sol', cubukTaban], ['sag', cubukTaban],
    ['merkez', merkezYukseklikAlt], ['alt', istakaYukseklikAlt],
    ...['solUst', 'sagUst', 'solAlt', 'sagAlt'].map((ad) => [ad, koseEnKucukYukseklik]),
  ];
  const alanIcerikUst = alanIcerikAlt.map(([ad, deger]) => {
    if (ad === 'merkez') return [ad, merkezYukseklikUst];
    if (ad === 'alt') return [ad, istakaYukseklikUst];
    return [ad, deger];
  });
  const satirIcerikAlt = bantIcerikleri(alanIcerikAlt);
  const satirIcerikUst = bantIcerikleri(alanIcerikUst);

  // Masanın İÇERİK kutusu: `masaIc` verilirse TARAYICIDA ÖLÇÜLEN değer kullanılır
  // (yardimci/sigdirma-butcesi.js OLCULEN_MASA_KUTUSU — tek kaynak, tasokey#68 1. çekim turu).
  // Verilmezse üst çubuk + durum satırı için ÜST SINIR düşülür; o tahmin kısa ekranlarda çok
  // temkinlidir (360 px yükseklikte masaya yalnız 184 px bırakır), bu yüzden bant ölçüsüne dayanan
  // savlar ölçülen kutuyu geçmek zorundadır (A9: ölç, tahmin etme).
  const cerceveVeDolgu = 2 * (dolgu + cerceve);
  const masaIcGenislik = masaIc ? masaIc[0] : boyut.genislik - cerceveVeDolgu;
  const masaIcYukseklik = masaIc
    ? masaIc[1]
    : boyut.yukseklik - KABUK_YUKSEKLIGI_UST_SINIRI_PX - cerceveVeDolgu;

  const sutunIcerik = sutunAdlari.map((_, sutun) => {
    if (sutun === 1) return ortaSutunIcerik;
    return Math.max(koseEnKucukGenislik, cubukKalinlik);
  });
  const sutunlar = izOlculeri(sutunAdlari, {
    toplamOlcu: masaIcGenislik, bosluk, icerikler: sutunIcerik,
  });

  // Her bandın ALT SINIRI: o bandın içeriği en küçük, ÖBÜR bantlarınki en büyük alındığında.
  const satirOlculeri = satirAdlari.map((_, i) => izOlculeri(satirAdlari, {
    toplamOlcu: masaIcYukseklik,
    bosluk,
    icerikler: satirIcerikUst.map((deger, k) => (k === i ? satirIcerikAlt[k] : deger)),
  })[i]);

  const yanSatirlar = alanSatirlari(sablon, 'sol');
  if (yanSatirlar.length !== 1) throw new Error(`sol/sağ çubuk ${yanSatirlar.length} bant kaplıyor (1 olmalı)`);
  const yanBantUzunlugu = satirOlculeri[yanSatirlar[0]];

  // Dikey çubuğun uzunluğu: bandın yüzdesi (ya da taban uzunluğu). Çubuk bandı tam doldurmuyorsa
  // bandın iki ucunda artan boşluk, köşenin DIŞINDA kalan boş alandır.
  const cubukYuzde = Number.parseFloat(beyan('.kenar-raf-dikey', 'height')) / 100;
  const cubukUzunluk = Math.max(Math.min(yanBantUzunlugu, cubukYuzde * yanBantUzunlugu), cubukTaban);
  const satirArtigi = Math.max(0, (yanBantUzunlugu - cubukUzunluk) / 2);

  // Boş bölge (masa kenarından komşu ıstakaya kadar): yatayda ıstaka masada ortalandığı için
  // kenardan uzaklığı şablondan bağımsız tek formülle çıkar; dikeyde köşe bantları + ızgara
  // boşluğu + çubuğun bandı içinde bıraktığı artık.
  const bosBolgeGenislik = (masaIcGenislik - ortaSutunIcerik) / 2;
  const koseKutusu = (alanAdi) => {
    const satirlar = alanSatirlari(sablon, alanAdi);
    const yukseklik = bantlarinOlcusu(satirOlculeri, satirlar, bosluk);
    return { yukseklik, bosBolgeYukseklik: yukseklik + bosluk + satirArtigi };
  };

  return {
    sozluk,
    varyant,
    bosluk,
    satirAdlari,
    sutunAdlari,
    sablon,
    satirIcerikAlt,
    satirIcerikUst,
    satirOlculeri,
    sutunlar,
    ortaSutunIcerik,
    istakaGenislik,
    cerceveVeDolgu,
    masaIcGenislik,
    masaIcYukseklik,
    cubukKalinlik,
    cubukTaban,
    cubukUzunluk,
    yanBantUzunlugu,
    hedefPayi: degisken('--hedef-pay'),
    koseGenislik: sutunlar[0],
    bosBolgeGenislik,
    koseler: [
      { ad: 'üst', ...koseKutusu('solUst') },
      { ad: 'alt', ...koseKutusu('solAlt') },
    ],
  };
}

/**
 * Masanın tarayıcıda KULLANACAĞI yükseklik. #masa, #uygulama'nın (sütun esnek kutu, min-height
 * 100vh) bir öğesidir:
 *  - Esneme tabanı `auto` ve en küçük yüksekliği `auto` ise öğe kendi İÇERİĞİNDEN kısa olamaz —
 *    içerik kalan yerden büyükse kap büyür ve sayfa viewport'u taşar (R-014 bozulur).
 *  - Esneme tabanı 0 ve `min-height: 0` ise yükseklik tamamen kaptan gelir (KESİN): esnek izler
 *    kalan yeri paylaşır, masa viewport'u taşmaz.
 */
export function masaKullanilanYukseklik(css, boyut, model) {
  const { bosluk, cerceveVeDolgu, satirIcerikAlt, satirAdlari } = model;
  const kullanilabilir = boyut.yukseklik - KABUK_YUKSEKLIGI_ALT_SINIRI_PX - cerceveVeDolgu;
  const esneme = (bildirim(css, '#masa', 'flex', boyut) ?? '').trim().split(/\s+/);
  const taban = esneme.length === 3 ? esneme[2] : null;
  const enKucuk = (bildirim(css, '#masa', 'min-height', boyut) ?? 'auto').trim();
  const kesin = taban !== null && Number.parseFloat(taban) === 0 && Number.parseFloat(enKucuk) === 0;
  // İçerik tabanlı yükseklik, bant içeriklerinin ALT sınırıyla hesaplanır: gerçek yükseklik
  // bundan ancak büyük olabilir, yani taşma iddiası temkinlidir.
  const icerikten = izOlculeriIcerikten(satirAdlari, { bosluk, icerikler: satirIcerikAlt });
  return {
    kullanilabilir,
    icerikten,
    satirTabanlari: satirIcerikAlt.reduce((t, o) => t + o, 0) + (satirAdlari.length - 1) * bosluk,
    kullanilan: kesin ? kullanilabilir : Math.max(kullanilabilir, icerikten),
  };
}
