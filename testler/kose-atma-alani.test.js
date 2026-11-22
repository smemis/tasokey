import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  degiskenleriTopla, ifadeHesapla, kuralGovdeleri, sozlukleriBirlestir, varCoz, yorumlariAt,
} from './yardimci/css-olcu.js';
import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';

// tasokey#63 (sınıf K) — Sahip'in `tasokey#47`e düzeltmesi:
// "Rakip oyuncuya atılacak taşın bırakılacağı alan, oyuncunun ıstakası ile rakibin ıstakasının
//  ARASINDAKİ BOŞ ALAN olsun; taş bırakılınca bu boş alanın ORTASINDA konumlansın."
// `tasokey#47` köşeyi ızgara hücresini dolduracak biçimde büyütmüştü, ama hücrenin kendisi dar
// kalıyordu: ızgara `auto 1fr auto` sütunlarıyla kurulduğu için köşe sütunu TAŞ ölçüsündeydi ve
// boş alanın tamamı ortadaki `1fr` sütununda kalıyordu (Sahip ölçümü, 800x360: köşe 35x101 px,
// boş bölge ~430x100 px). Aynı şey satırlarda da vardı: üst köşe satırı rakip çubuğunun
// kalınlığı kadardı.
//
// Düzeltme: ızgara masayı "ıstakaların kapladığı orta şerit + dört köşe dikdörtgeni" olarak böler
// (`1fr auto 1fr` sütun, `1fr var(--masa-orta-satir) 1fr` satır), dört ıstaka kendi kenarına
// yapışır ve dikey çubuk satırının TAMAMIDIR. Böylece köşe hücresi = iki komşu ıstaka arasındaki
// boş dikdörtgen eksi birer ızgara boşluğu; kural dört köşe için tektir (ADR-010 simetrisi).
//
// Ölçüm: DOM yürütmesi yok (bu projenin arayüz testleri deseni) — ızgara iz ölçüleri CSS
// değişkenlerinden GERÇEKTEN hesaplanır ("find the size of an fr" döngüsü dahil). Yazı ölçüsüne
// bağlı yükseklikler için alt/üst sınır kullanılır; sınırlar oranın ALEYHİNE seçilir, bu yüzden
// hesaplanan kapsama oranı gerçeğin ALT SINIRIDIR. Gerçek tarayıcı ölçümü: is/tasokey-63/ekran/.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const YORUMSUZ_STIL = yorumlariAt(STIL_CSS);

// Sahip'in kabul ölçütü: boş bölgenin en az %80'i atma alanı olacak.
const EN_AZ_KAPSAMA = 0.8;

// Yazı ölçüsüne bağlı, burada ölçülemeyen yükseklikler için sınırlar:
// #ustCubuk + #durumSatiri birlikte en çok bu kadar yer kaplar (masa yüksekliğinden düşülür).
const KABUK_YUKSEKLIGI_UST_SINIRI_PX = 160;
// Tek satır metnin (başlık, sayaç, ipucu — 0,75…1,1rem) kaplayabileceği en büyük yükseklik.
const METIN_SATIRI_UST_SINIRI_PX = 32;
// #rafAlani ve #merkez içindeki dikey boşlukların üst sınırı (stil.css: 8px / 6px, dar kademede 4px).
const IC_BOSLUK_UST_SINIRI_PX = 16;

const OLCUM_BOYUTLARI = [
  { ad: '1920x1080 (masaüstü)', genislik: 1920, yukseklik: 1080 },
  { ad: '1280x800 (dizüstü)', genislik: 1280, yukseklik: 800 },
  { ad: '1180x820 (tablet yatay)', genislik: 1180, yukseklik: 820 },
  { ad: '844x390 (telefon yatay)', genislik: 844, yukseklik: 390 },
  { ad: '800x360 (telefon yatay — Sahip ölçümü)', genislik: 800, yukseklik: 360 },
];

/* ---------------------------------------------------------------- CSS kademesi (boyuta göre) */

/** `@media` blokları çıkarılmış CSS (yalnız taban kurallar). */
function medyasizCss(metin) {
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

/** `@media` bloklarının `{ sorgu, govde }` listesi (geliş sırasıyla). */
function medyaBloklariSirali(metin) {
  const bloklar = [];
  for (let bas = metin.indexOf('@media'); bas !== -1; bas = metin.indexOf('@media', bas + 1)) {
    const acilis = metin.indexOf('{', bas);
    if (acilis === -1) break;
    let derinlik = 0;
    let son = acilis;
    for (; son < metin.length; son += 1) {
      if (metin[son] === '{') derinlik += 1;
      else if (metin[son] === '}' && (derinlik -= 1) === 0) break;
    }
    bloklar.push({
      sorgu: metin.slice(bas, acilis).trim().replace(/\s+/g, ' '),
      govde: metin.slice(acilis + 1, son),
    });
  }
  return bloklar;
}

const TABAN_CSS = medyasizCss(YORUMSUZ_STIL);
const MEDYA_BLOKLARI = medyaBloklariSirali(YORUMSUZ_STIL);

function sorguUyuyor(sorgu, { genislik, yukseklik }) {
  const yon = genislik >= yukseklik ? 'landscape' : 'portrait';
  for (const [, ozellik, ham] of sorgu.matchAll(/\(\s*([a-z-]+)\s*:\s*([^)]+)\)/g)) {
    const sayi = Number.parseFloat(ham);
    if (ozellik === 'max-width' && !(genislik <= sayi)) return false;
    if (ozellik === 'min-width' && !(genislik >= sayi)) return false;
    if (ozellik === 'max-height' && !(yukseklik <= sayi)) return false;
    if (ozellik === 'min-height' && !(yukseklik >= sayi)) return false;
    if (ozellik === 'orientation' && ham.trim() !== yon) return false;
  }
  return true;
}

/** Bu boyutta geçerli CSS kaynakları: taban + uyan `@media` gövdeleri (geliş sırasıyla). */
function gecerliKaynaklar(boyut) {
  return [TABAN_CSS, ...MEDYA_BLOKLARI.filter((b) => sorguUyuyor(b.sorgu, boyut)).map((b) => b.govde)];
}

/** Bu boyutta geçerli değişken sözlüğü (kademe geçersiz kılmaları uygulanmış). */
function sozlukAl(boyut) {
  const sozlukler = gecerliKaynaklar(boyut).map((kaynak) => {
    const kokBasi = kaynak.indexOf(':root');
    if (kokBasi === -1) return new Map();
    return degiskenleriTopla(kaynak.slice(kokBasi, kaynak.indexOf('}', kokBasi)));
  });
  // --raf-sutun-sayisi CSS'te değil `arayuz/raf.js`te tanımlıdır (ADR-019, tek kaynak).
  return sozlukleriBirlestir(...sozlukler, new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]));
}

/** Seçicinin bu boyutta GEÇERLİ (en son kazanan) bildirimi; yoksa null. */
function bildirim(secici, ozellik, boyut) {
  let sonuc = null;
  for (const kaynak of gecerliKaynaklar(boyut)) {
    for (const govde of kuralGovdeleri(kaynak, secici)) {
      const eslesme = new RegExp(`(?:^|;)\\s*${ozellik}\\s*:\\s*([^;]+)`).exec(govde);
      if (eslesme) sonuc = eslesme[1].trim();
    }
  }
  return sonuc;
}

/** Uzunluk ölçüsü (px); değişkenler çözülür, calc() gerçekten hesaplanır. Birimsiz sıfır geçerlidir. */
function px(ifade, sozluk) {
  const sonuc = ifadeHesapla(varCoz(ifade, sozluk));
  assert.ok(
    sonuc.birim === 'px' || sonuc.sayi === 0,
    `"${ifade}" px uzunluk vermiyor (${sonuc.sayi}${sonuc.birim})`,
  );
  return sonuc.sayi;
}

function degisken(ad, sozluk) {
  return px(`var(${ad})`, sozluk);
}

/* ------------------------------------------------------------------- ızgara iz ölçüsü modeli */

/** `grid-template-*` değerini üç ize ayırır (`1fr auto 1fr` → ['1fr','auto','1fr']). */
function izler(secici, ozellik, boyut, sozluk) {
  const ham = bildirim(secici, ozellik, boyut);
  assert.ok(ham, `${secici} ${ozellik} tanımlamıyor`);
  const parcalar = varCoz(ham, sozluk).replace(/[()]/g, ' ').trim().split(/\s+/);
  assert.equal(parcalar.length, 3, `${secici} ${ozellik} üç iz tanımlamıyor: "${ham}"`);
  return parcalar;
}

/**
 * Üç izli bir ızgara ekseninin iz ölçüleri. `auto` iz içeriğine oturur, `Nfr` izler kalanı
 * paylaşır; bir esnek izin payı kendi içerik tabanından küçük kalırsa o iz dondurulup paylaşım
 * yeniden yapılır (CSS Grid "find the size of an fr" döngüsü).
 */
function izOlculeri(izAdlari, { toplamOlcu, bosluk, icerikler }) {
  const serbest = toplamOlcu - 2 * bosluk;
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
 * Bir boyutta masanın ölçüleri: köşe kutusu, köşeyi çevreleyen boş bölge ve yığın merkezleri.
 * Yazı ölçüsüne bağlı yükseklikler `altSinir`/`ustSinir` ile verilir; `altSinir` seçildiğinde
 * köşe kutusu en küçük, boş bölge en büyük çıkar (oranın aleyhine → sonuç alt sınırdır).
 */
function masaOlcusu(boyut) {
  const sozluk = sozlukAl(boyut);
  const bosluk = degisken('--masa-bosluk', sozluk);
  const dolgu = degisken('--masa-dolgu', sozluk);
  const cerceve = degisken('--masa-cerceve-kalinlik', sozluk);
  const tasGenislik = degisken('--tas-genislik', sozluk);
  const tasYukseklik = degisken('--tas-yukseklik', sozluk);
  const kaydirma = degisken('--kose-kaydirma', sozluk);
  const cubukKalinlik = degisken('--rakip-raf-kalinlik', sozluk);
  const panelDolgu = degisken('--panel-dolgu', sozluk);
  // Orta sütunun içeriği: oyuncunun ıstakası = üst rakibin çubuğu (aynı formül, tek kaynak).
  const istakaGenislik = degisken('--rakip-ust-genislik', sozluk);

  const koseEnKucukGenislik = tasGenislik + 2 * kaydirma;
  const koseEnKucukYukseklik = tasYukseklik + 2 * kaydirma;
  const masaIcGenislik = boyut.genislik - 2 * (dolgu + cerceve);
  const masaIcYukseklik = boyut.yukseklik - KABUK_YUKSEKLIGI_UST_SINIRI_PX - 2 * (dolgu + cerceve);

  // Satır içerikleri (alt sınır = en küçük olabileceği, üst sınır = en büyük olabileceği).
  const istakaYukseklikAlt = 2 * tasYukseklik + 2 * panelDolgu;
  const istakaYukseklikUst = istakaYukseklikAlt + IC_BOSLUK_UST_SINIRI_PX + METIN_SATIRI_UST_SINIRI_PX;
  const merkezYukseklikAlt = tasYukseklik;
  const merkezYukseklikUst = tasYukseklik + 4 * METIN_SATIRI_UST_SINIRI_PX + 3 * IC_BOSLUK_UST_SINIRI_PX;
  const cubukTaban = px(bildirim('.kenar-raf-dikey', 'min-height', boyut), sozluk);

  const sutunIcerik = [
    Math.max(koseEnKucukGenislik, cubukKalinlik),
    istakaGenislik,
    Math.max(koseEnKucukGenislik, cubukKalinlik),
  ];
  const satirIcerikAlt = [
    Math.max(koseEnKucukYukseklik, cubukKalinlik),
    Math.max(cubukTaban, merkezYukseklikAlt),
    Math.max(koseEnKucukYukseklik, istakaYukseklikAlt),
  ];
  const satirIcerikUst = [
    Math.max(koseEnKucukYukseklik, cubukKalinlik),
    Math.max(cubukTaban, merkezYukseklikUst),
    Math.max(koseEnKucukYukseklik, istakaYukseklikUst),
  ];

  const sutunlar = izOlculeri(izler('#masa', 'grid-template-columns', boyut, sozluk), {
    toplamOlcu: masaIcGenislik, bosluk, icerikler: sutunIcerik,
  });
  const satirAdlari = izler('#masa', 'grid-template-rows', boyut, sozluk);
  // Her satırın ALT SINIRI: o satırın içeriği en küçük, ÖBÜR satırlarınki en büyük alındığında
  // çıkan ölçü (iz ölçüsü kendi içeriğinde artan, komşu içeriklerde azalandır).
  const satirAltSiniri = [0, 1, 2].map((i) => izOlculeri(satirAdlari, {
    toplamOlcu: masaIcYukseklik,
    bosluk,
    icerikler: satirIcerikUst.map((deger, k) => (k === i ? satirIcerikAlt[k] : deger)),
  })[i]);

  // Dikey çubuğun uzunluğu: orta satırın yüzdesi (ya da taban uzunluğu). Çubuk satırı tam
  // doldurmuyorsa satırın iki ucunda artan boşluk, köşenin DIŞINDA kalan boş alandır.
  const cubukYuzde = Number.parseFloat(bildirim('.kenar-raf-dikey', 'height', boyut)) / 100;
  const ortaSatir = satirAltSiniri[1];
  const cubukUzunluk = Math.max(Math.min(ortaSatir, cubukYuzde * ortaSatir), cubukTaban);
  const satirArtigi = Math.max(0, (ortaSatir - cubukUzunluk) / 2);

  // Boş bölge (masa kenarından komşu ıstakaya kadar): yatayda ıstaka masada ortalandığı için
  // kenardan uzaklığı şablondan bağımsız tek formülle çıkar; dikeyde köşe satırı + ızgara
  // boşluğu + çubuğun satır içinde bıraktığı artık.
  const bosBolgeGenislik = (masaIcGenislik - istakaGenislik) / 2;
  return {
    bosluk,
    // Bırakma hedefi kutudan her yana --hedef-pay kadar taşar (ADR-014 halkası). Boş bölgenin
    // İÇİNDE kalan taşma yalnız ıstakaya bakan yandır; masa kenarına bakan yan zaten bölgenin
    // dışına (masa dolgusuna) düşer.
    hedefPayi: degisken('--hedef-pay', sozluk),
    koseGenislik: sutunlar[0],
    bosBolgeGenislik,
    koseler: [
      { ad: 'üst', yukseklik: satirAltSiniri[0], bosBolgeYukseklik: satirAltSiniri[0] + bosluk + satirArtigi },
      { ad: 'alt', yukseklik: satirAltSiniri[2], bosBolgeYukseklik: satirAltSiniri[2] + bosluk + satirArtigi },
    ],
  };
}

/* ------------------------------------------------------------------------------- ASIL KABUL */

test('ASIL KABUL (a): atma alanı, iki komşu ıstaka arasındaki boş bölgenin en az %80\'i', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    for (const kose of olcu.koseler) {
      // Atma alanı = köşenin bırakma hedefi: kutu + ADR-014 halkasının bölge İÇİNDE kalan payı.
      const hedefGenislik = Math.min(olcu.koseGenislik + olcu.hedefPayi, olcu.bosBolgeGenislik);
      const hedefYukseklik = Math.min(kose.yukseklik + olcu.hedefPayi, kose.bosBolgeYukseklik);
      const bosAlan = olcu.bosBolgeGenislik * kose.bosBolgeYukseklik;
      const oran = (hedefGenislik * hedefYukseklik) / bosAlan;
      assert.ok(
        oran >= EN_AZ_KAPSAMA,
        `${boyut.ad} ${kose.ad} köşe: atma alanı boş bölgenin yalnız %${(oran * 100).toFixed(1)}'i `
        + `(hedef ${hedefGenislik.toFixed(0)}x${hedefYukseklik.toFixed(0)} px, kutu `
        + `${olcu.koseGenislik.toFixed(0)}x${kose.yukseklik.toFixed(0)} px, boş bölge `
        + `${olcu.bosBolgeGenislik.toFixed(0)}x${kose.bosBolgeYukseklik.toFixed(0)} px) — en az %80 olmalı`,
      );
    }
  }
});

test('ASIL KABUL (a2): köşe KUTUSU boş bölgenin ucuna dayanır (açık yalnız bir ızgara boşluğu)', () => {
  // Kutunun boş bölgeden eksik kalan payı yapısal olarak tam bir ızgara boşluğudur (komşu ıstaka
  // hücresiyle arasındaki `gap`); yazı ölçüsünden bağımsız, her kademede aynı. Bu açığın yarısını
  // ADR-014 halkası zaten kapatır (yukarıdaki kabul a).
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    const yatayAcik = olcu.bosBolgeGenislik - olcu.koseGenislik;
    assert.ok(
      yatayAcik >= 0 && yatayAcik <= olcu.bosluk + 0.5,
      `${boyut.ad}: köşe kutusu ile ıstaka arasında ${yatayAcik.toFixed(0)} px boşluk kaldı `
      + `(en çok bir ızgara boşluğu = ${olcu.bosluk} px olmalı)`,
    );
    for (const kose of olcu.koseler) {
      const dikeyAcik = kose.bosBolgeYukseklik - kose.yukseklik;
      assert.ok(
        dikeyAcik >= 0 && dikeyAcik <= olcu.bosluk + 0.5,
        `${boyut.ad} ${kose.ad} köşe: kutu ile komşu çubuk arasında ${dikeyAcik.toFixed(0)} px `
        + `boşluk kaldı (en çok ${olcu.bosluk} px olmalı)`,
      );
    }
  }
});

test('ASIL KABUL (b): atılan taş yığını boş bölgenin ortasında (sapma en çok bir ızgara boşluğu)', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    // Yığın köşe kutusunun ortasındadır (.kose: `1fr auto 1fr` + justify-items: center — bkz.
    // masa-duzeni-cubuk-deste-kose.test.js kose-47-c). Kutu masanın kenarına dayandığı için
    // yığın merkezinin kenardan uzaklığı kutunun yarısıdır.
    const yatayKayma = Math.abs(olcu.bosBolgeGenislik - olcu.koseGenislik) / 2;
    assert.ok(
      yatayKayma <= olcu.bosluk,
      `${boyut.ad}: yığın merkezi boş bölgenin ortasından yatayda ${yatayKayma.toFixed(0)} px kayık `
      + `(en çok bir ızgara boşluğu = ${olcu.bosluk} px olmalı)`,
    );
    for (const kose of olcu.koseler) {
      const dikeyKayma = Math.abs(kose.bosBolgeYukseklik - kose.yukseklik) / 2;
      assert.ok(
        dikeyKayma <= olcu.bosluk,
        `${boyut.ad} ${kose.ad} köşe: yığın merkezi boş bölgenin ortasından dikeyde `
        + `${dikeyKayma.toFixed(0)} px kayık (en çok ${olcu.bosluk} px olmalı)`,
      );
    }
  }
});

/* ------------------------------------------------- yapısal kurallar (ölçümün dayandığı düzen) */

test('kabul-c: masa ızgarası ortada yalnız ıstaka şeridini bırakır (dış izler esnek, simetrik)', () => {
  const sozluk = sozlukAl(OLCUM_BOYUTLARI[0]);
  for (const ozellik of ['grid-template-columns', 'grid-template-rows']) {
    const [bas, orta, son] = izler('#masa', ozellik, OLCUM_BOYUTLARI[0], sozluk);
    assert.equal(bas, son, `#masa ${ozellik}: dış izler eşit değil (${bas} / ${son}) — köşeler simetrik olmaz`);
    assert.match(bas, /fr$/, `#masa ${ozellik}: dış iz esnek değil ("${bas}") — köşe hücresi içeriği kadar kalır`);
  }
  // Orta SÜTUN içeriğe oturur: genişliğini oyuncunun ıstakası belirler, esnemez.
  const [, ortaSutun] = izler('#masa', 'grid-template-columns', OLCUM_BOYUTLARI[0], sozluk);
  assert.equal(
    ortaSutun,
    'auto',
    `#masa orta sütunu "${ortaSutun}" — ıstaka genişliğinden büyük olursa artan yer köşenin değil `
    + 'ortadaki hücrenin olur',
  );
  // Orta SATIR bir ORAN kararıdır (çubuk ~masa yüksekliğinin yarısı): esnek ve köşe satırlarından
  // büyük olmalı, yoksa çubuk kısalır (madde 1, tasokey#33).
  const [disSatir, ortaSatir] = izler('#masa', 'grid-template-rows', OLCUM_BOYUTLARI[0], sozluk);
  assert.ok(
    Number.parseFloat(ortaSatir) > Number.parseFloat(disSatir),
    `#masa orta satırı (${ortaSatir}) köşe satırlarından (${disSatir}) büyük değil — dikey ıstaka `
    + 'çubuğu masa yüksekliğinin yaklaşık yarısı kalmaz',
  );
});

test('kabul-d: dört ıstaka masanın kendi kenarına yapışır (köşe sütunu/satırı boş kalsın)', () => {
  const beklenen = [
    ['#kenarUst', 'align-self', 'start'],
    ['#rafAlani', 'align-self', 'end'],
    ['.kenar-sol', 'justify-self', 'start'],
    ['.kenar-sag', 'justify-self', 'end'],
  ];
  for (const [secici, ozellik, deger] of beklenen) {
    assert.equal(
      bildirim(secici, ozellik, OLCUM_BOYUTLARI[0]),
      deger,
      `${secici} ${ozellik}: ${deger} değil — ıstaka hücresinin ortasına kayar, köşe boş bölgeyi gösteremez`,
    );
  }
});

test('kabul-e: dikey ıstaka çubuğu satırın TAMAMIDIR (satır sınırı = boş bölgenin sınırı)', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    assert.equal(
      bildirim('.kenar-raf-dikey', 'height', boyut),
      '100%',
      `${boyut.ad}: dikey çubuk satırı tam doldurmuyor — satırın iki ucunda köşenin dışında `
      + 'kalan boş alan oluşur',
    );
  }
});

test('kabul-f: orta satır oranı tek kaynaktan (kuralın içine sayı yazılmaz)', () => {
  const ham = bildirim('#masa', 'grid-template-rows', OLCUM_BOYUTLARI[0]);
  assert.match(
    ham,
    /var\(--masa-orta-satir\)/,
    `#masa grid-template-rows orta izi değişkenden okumuyor: "${ham}"`,
  );
  const tanimlar = [...YORUMSUZ_STIL.matchAll(/--masa-orta-satir\s*:\s*([^;}]+)/g)];
  assert.equal(tanimlar.length, 1, '--masa-orta-satir birden çok kez tanımlı; tek kaynak olmalı');
  assert.match(tanimlar[0][1].trim(), /^\d+(\.\d+)?fr$/, '--masa-orta-satir bir fr payı değil');
});
