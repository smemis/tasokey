import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BASLAYAN_OYUNCU_EL_BOYUTU } from '../docs/cekirdek/dagitim.js';
import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';
import {
  boyutSozlugu, degiskenOlcusu, kuralGovdeleri, medyaBloklari, medyaSorgusuUyuyor, yorumlariAt,
} from './yardimci/css-olcu.js';
import { alanSatirlari, bildirim, masaModeli } from './yardimci/masa-izleri.js';
import {
  SERIT_TASOKEY_72_PX, olculenBantlar, olculenMasaKutusu, olculenSerit,
} from './yardimci/sigdirma-butcesi.js';

// tasokey#71 (üst iş tasokey#70, sınıf K) — KISA YATAY DÜZEN VARYANTININ YAPISI · R-014.
// Karar: tasokey#70 planı §3 (maddeler 1-7); kararın numarası ve metni MIMARI.md'ye aynı üst işin
// 4. işinde girer, bu yüzden burada plan maddesine atıf yapılır.
//
// Karar bir ölçü ayarı değil, KADEMEYE ÖZGÜ İKİNCİ BİR MASA DÜZENİDİR: kısa yatay ekranlarda masa
// dört banda ayrılır (üst çubuk `auto` / üst içerik `1fr` / yan çubuk `var(--masa-orta-satir)` /
// ıstaka `1fr`) ve üst köşeler ilk iki bandı birlikte kaplar. Bu dosya o kararın YAPISINI ölçer;
// bant ölçüsü modeli `yardimci/masa-izleri.js`tedir (tek kaynak — köşe atma alanı testi de onu
// okur), gerçek çakışma/taşma ölçümü tarayıcıdadır (`yerlesim-cakisma.olcum.js`).
//
// Bütün denetimler statiktir: CSS metni ayrıştırılır ve ifadeler GERÇEKTEN hesaplanır.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const YORUMSUZ = yorumlariAt(STIL_CSS);
// ADR-022 madde 10'un zinciri arayüz JS'inden başlıyor (durum sınıfı) — kaynak taramasıyla ölçülür.
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');

const EKLER = new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]);

/** Varyant bloğunu çevreleyen adlandırılmış yorum işaretleri (kapatma anahtarının çapası). */
const BAS_ISARETI = '===== KISA YATAY DÜZEN VARYANTI — BAŞLANGIÇ';
const BITIS_ISARETI = '===== KISA YATAY DÜZEN VARYANTI — BİTİŞ';

/**
 * Bant modeli: masanın İÇERİK kutusu tarayıcıda ÖLÇÜLEN değerden gelir (tasokey#68 tablosu,
 * `yardimci/sigdirma-butcesi.js`) — masa yüksekliği esnek kaptan gelir, CSS'ten okunamaz.
 */
function model(boyut) {
  return masaModeli(STIL_CSS, boyut, EKLER, {
    masaIc: olculenMasaKutusu(boyut), bant: olculenBantlar(boyut),
  });
}

/** Varyantın ETKİN olduğu kabul boyutları (plan §5) ve etkin OLMADIĞI gerilemesizlik boyutları. */
const ETKIN_BOYUTLAR = [
  { ad: '800x360', genislik: 800, yukseklik: 360, olcum: 'telefon-kucuk' },
  { ad: '844x390', genislik: 844, yukseklik: 390, olcum: 'telefon-yatay' },
  { ad: '900x600', genislik: 900, yukseklik: 600, olcum: 'kademe-900' },
];
const ETKIN_OLMAYAN_BOYUTLAR = [
  { ad: '1280x800', genislik: 1280, yukseklik: 800, olcum: 'dizustu' },
  { ad: '1180x820', genislik: 1180, yukseklik: 820, olcum: 'tablet' },
  { ad: '1920x1080', genislik: 1920, yukseklik: 1080, olcum: 'masaustu' },
];

/** Varyanta ait `@media` sorgusu mu (eşik 500px'ten büyük olan yatay+kısa sorgu)? */
function varyantSorgusuMu(sorgu) {
  return /orientation:\s*landscape/.test(sorgu) && Number.parseFloat(
    (/max-height:\s*(\d+)/.exec(sorgu) ?? [])[1] ?? '0',
  ) > 500;
}

/** Varyant bloklarının `@media` sorguları (tasokey#72'den beri üç tane: yapı + iki ölçek dilimi). */
function varyantSorgulari() {
  return medyaBloklari(STIL_CSS).map((blok) => blok.sorgu).filter(varyantSorgusuMu);
}

/**
 * Varyantın YAPI bloğu: masanın bant listesini yazan TEK blok. Kademeye özgü ikinci düzen buradan
 * gelir; bölgedeki öbür blok(lar) yalnız ölçülen değer yazar (tasokey#72).
 */
function varyantYapiBlogu() {
  const bloklar = medyaBloklari(STIL_CSS)
    .filter((blok) => varyantSorgusuMu(blok.sorgu) && /grid-template-areas\s*:/.test(blok.govde));
  assert.equal(
    bloklar.length,
    1,
    `masanın bant listesini ${bloklar.length} varyant bloğu yazıyor (tek olmalı — tek kaynak)`,
  );
  return bloklar[0];
}

/** `stil.css`in varyant bloğu ÇIKARILMIŞ hâli (kapatma anahtarı: bloğu silmek). */
function varyantsizCss() {
  const bas = STIL_CSS.indexOf('/*');
  assert.ok(bas !== -1);
  const isaretBasi = STIL_CSS.indexOf(BAS_ISARETI);
  const isaretBitisi = STIL_CSS.indexOf(BITIS_ISARETI);
  assert.ok(isaretBasi !== -1 && isaretBitisi !== -1, 'varyant yorum işaretleri bulunamadı');
  // Yorumun kendisi `/*` ile başlar, bitiş yorumu `*/` ile kapanır.
  const kesBasi = STIL_CSS.lastIndexOf('/*', isaretBasi);
  const kesSonu = STIL_CSS.indexOf('*/', isaretBitisi) + 2;
  return STIL_CSS.slice(0, kesBasi) + STIL_CSS.slice(kesSonu);
}

/**
 * El sonu durum sınıfı: `ekran.js` masaya yazar, `stil.css` okur — ad TEK yerde (ADR-022 madde 10).
 */
const EL_SONU_SINIFI = 'rakip-eli-acik';
const MERKEZ_GIZLEME_SECICISI = `#masa.${EL_SONU_SINIFI} #merkez`;

/**
 * ADR-022 madde 10 (Masa kararı, Sahip adına 2026-11-22): el bitince (`durum=rakip`) #merkez
 * gizleniyor mu ve kural varyant BÖLGESİNİN İÇİNDE mi? Kural ÖLÇÜLÜR, varsayılmaz: silinirse
 * kabul-h'nin üst yığın savı kendiliğinden eski (geometrik) hâline döner.
 */
function merkezElSonundaGizliMi() {
  const govdeler = kuralGovdeleri(YORUMSUZ, MERKEZ_GIZLEME_SECICISI);
  if (govdeler.length !== 1 || !/display\s*:\s*none/.test(govdeler[0])) return false;
  const yeri = STIL_CSS.indexOf(MERKEZ_GIZLEME_SECICISI);
  return yeri > STIL_CSS.indexOf(BAS_ISARETI) && yeri < STIL_CSS.indexOf(BITIS_ISARETI);
}

/* ---------------------------------------------------------------------------------- kabul-a */

test('kabul-a: varyantın BÜTÜN blokları adlandırılmış başlangıç/bitiş yorumunun arasındadır', () => {
  // tasokey#72: bölge artık ÜÇ blok (yapı + 361…700 ve 501…700 px dilimleri için ölçek). Kapatma
  // anahtarının ölçütü "tek blok" değil YALITIMDIR: varyanta ait her blok işaretlerin ARASINDA
  // durmalı ve bölgeyi kesmek onların HEPSİNİ birden götürmeli (yoksa silince yarım düzen kalır).
  const sorgular = varyantSorgulari();
  assert.ok(sorgular.length >= 1, 'kısa yatay varyant bloğu CSS\'te yok');
  for (const isaret of [BAS_ISARETI, BITIS_ISARETI]) {
    const sayi = STIL_CSS.split(isaret).length - 1;
    assert.equal(sayi, 1, `"${isaret}" yorumu ${sayi} kez geçiyor (tek olmalı)`);
  }
  // İşaretler blokları gerçekten SARIYOR: her biri başlangıç yorumundan sonra, bitişten önce.
  for (const sorgu of sorgular) {
    const blokBasi = STIL_CSS.indexOf(`@media ${sorgu.replace(/^@media\s*/, '')}`);
    assert.ok(blokBasi !== -1, `blok metinde bulunamadı: ${sorgu}`);
    assert.ok(
      blokBasi > STIL_CSS.indexOf(BAS_ISARETI) && blokBasi < STIL_CSS.indexOf(BITIS_ISARETI),
      `varyant bloğu bölgenin dışında: ${sorgu}`,
    );
  }
  // Bölge çıkarıldığında geride varyanta ait hiçbir iz kalmıyor (bant listesi, ölçek, işaretler).
  const kalan = varyantsizCss();
  assert.ok(
    !kalan.includes(BAS_ISARETI) && !kalan.includes(BITIS_ISARETI),
    'varyant bölgesi çıkarıldığında yorum işaretleri geride kalıyor — kesme yeri yanlış',
  );
  assert.equal(
    medyaBloklari(kalan).length,
    medyaBloklari(STIL_CSS).length - sorgular.length,
    'bölge çıkarıldığında @media sayısı varyant bloğu sayısı kadar azalmıyor',
  );
  assert.equal(
    medyaBloklari(kalan).filter((blok) => varyantSorgusuMu(blok.sorgu)).length,
    0,
    'bölge çıkarıldıktan sonra geride varyant sorgulu @media kalıyor',
  );
});

test('kabul-a2: varyantın ölçeği BÖLGENİN İÇİNDE yazılı (kapatma anahtarı ölçeği de geri verir)', () => {
  // ADR-022/5 gereği ölçek ölçülerek seçilir (tasokey#72) ama değerin geçerliliği varyantın
  // YAPISINA bağlıdır: dört bantlı düzen olmadan 800x360'ta 1,45 anlamsızdır. Bu yüzden ölçek
  // bölgenin içinde durur; bölge silinince taban kademelerin tasokey#68 değerleri (1,05 ve 1)
  // yeniden kazanır — kapatma anahtarı hem düzeni hem ölçeği geri verir.
  const kalan = varyantsizCss();
  // tasokey#72: üç dilim, üç ÖLÇÜLEN değer. tasokey#73'te şerit daralıp kalan yer masaya geçince
  // iki telefon dilimi yeniden ölçüldü (800x360 1,30 → 1,45 · 844x390 1,50 → 1,65); 900x600'de
  // tavanı YATAY taşma tuttuğu için değer 1,25'te kaldı.
  for (const { boyut, varyantli, varyantsiz } of [
    { boyut: ETKIN_BOYUTLAR[0], varyantli: 1.45, varyantsiz: 1 },
    { boyut: ETKIN_BOYUTLAR[1], varyantli: 1.65, varyantsiz: 1 },
    { boyut: ETKIN_BOYUTLAR[2], varyantli: 1.25, varyantsiz: 1.05 },
  ]) {
    assert.equal(
      degiskenOlcusu('--istaka-olcek', boyutSozlugu(STIL_CSS, boyut, EKLER)).sayi,
      varyantli,
      `${boyut.ad}: varyantlı ölçek beklenenden farklı`,
    );
    assert.equal(
      degiskenOlcusu('--istaka-olcek', boyutSozlugu(kalan, boyut, EKLER)).sayi,
      varyantsiz,
      `${boyut.ad}: bölge silinince ölçek tasokey#68 değerine dönmüyor`,
    );
  }
  // Masaüstü boyutlarında ölçek iki hâlde de AYNI (gerilemesizlik; kabul-b'nin ölçek yanı).
  for (const boyut of ETKIN_OLMAYAN_BOYUTLAR) {
    assert.equal(
      degiskenOlcusu('--istaka-olcek', boyutSozlugu(STIL_CSS, boyut, EKLER)).sayi,
      degiskenOlcusu('--istaka-olcek', boyutSozlugu(kalan, boyut, EKLER)).sayi,
      `${boyut.ad}: varyant bölgesi masaüstü ölçeğini değiştiriyor`,
    );
  }
});

/* ---------------------------------------------------------------------------------- kabul-b */

/** Varyantın etkilediği bütün seçici/özellik çiftleri (gerilemesizlik karşılaştırmasının kümesi). */
const ETKILENEN_BILDIRIMLER = [
  ['#masa', 'grid-template-rows'], ['#masa', 'grid-template-columns'], ['#masa', 'grid-template-areas'],
  ['#masa', 'flex'], ['#masa', 'min-height'], ['#masa', 'gap'], ['#masa', 'padding'],
  ['#masa', 'align-items'], ['#masa', 'justify-items'],
  ['#merkez', 'display'], ['#merkez', 'align-items'], ['#merkez', 'align-self'], ['#merkez', 'justify-self'],
  ['#merkez', 'justify-content'], ['#merkez', 'gap'],
  ['.yigin', 'flex-direction'], ['.yigin', 'align-items'], ['.yigin', 'gap'],
  ['#rafAlani', 'flex-direction'], ['#rafAlani', 'align-items'], ['#rafAlani', 'align-self'],
  ['#rafAlani', 'gap'], ['#rafAlani', 'padding'], ['#rafAlani', 'min-height'],
  ['.kenar-raf-dikey', 'height'], ['.kenar-raf-dikey', 'min-height'],
  ['.kenar-ad', 'font-size'], ['.kenar-ad', 'line-height'],
  ['.kenar-ust .kenar-taslar', 'margin-top'], ['.kenar-sol .kenar-taslar', 'margin-left'],
  ['.kenar-sag .kenar-taslar', 'margin-right'],
  ['.kose', 'min-width'], ['.kose', 'min-height'], ['.kose', 'grid-template-rows'],
  // tasokey#73 — şerit (masanın dışındaki üst çubuk + durum satırı). Değişkenler kabul-b'nin (1).
  // maddesinde zaten karşılaştırılıyor; buradaki satırlar KURAL düzeyindeki bildirimleri bağlar
  // (varyant `#durumSatiri`in satır aralığını yalnız bölgenin içinde yazar).
  ['#ustCubuk', 'padding'], ['.ust-cubuk-dugmesi', 'padding'],
  ['#durumSatiri', 'padding'], ['#durumSatiri', 'min-height'], ['#durumSatiri', 'line-height'],
  ['.kucult-dugmesi', 'font-size'], ['#sonucPaneli.kucuk #sonucKutusu', 'padding'],
  ['#sonucPaneli.kucuk #sonucKutusu', 'margin-top'],
];

test('kabul-b: varyant bloğunun DIŞI tasokey#68 ile birebir aynı (masaüstü kademeleri etkilenmiyor)', () => {
  const kalan = varyantsizCss();
  for (const boyut of ETKIN_OLMAYAN_BOYUTLAR) {
    // (1) Değişken sözlüğü: blokla ve bloksuz CSS aynı değerleri çözmeli (adı ve değeri).
    const tam = boyutSozlugu(STIL_CSS, boyut, EKLER);
    const sade = boyutSozlugu(kalan, boyut, EKLER);
    assert.deepEqual(
      [...tam.keys()].sort(),
      [...sade.keys()].sort(),
      `${boyut.ad}: varyant bloğu değişken listesini değiştiriyor`,
    );
    for (const [ad, degerler] of tam) {
      assert.deepEqual(
        degerler,
        sade.get(ad),
        `${boyut.ad}: ${ad} varyant bloğundan etkilenmiş (${degerler} / ${sade.get(ad)})`,
      );
    }
    // (2) Varyantın dokunduğu her bildirim: masaüstü boyutlarında blokla bloksuz AYNI.
    for (const [secici, ozellik] of ETKILENEN_BILDIRIMLER) {
      assert.equal(
        bildirim(STIL_CSS, secici, ozellik, boyut),
        bildirim(kalan, secici, ozellik, boyut),
        `${boyut.ad}: ${secici} { ${ozellik} } varyant bloğundan etkilenmiş`,
      );
    }
  }
  // (3) Masanın BANT LİSTESİ yalnız iki yerde yazılı: taban kural + varyant bloğu. (`#masa`
  // seçicisi üçüncü bir kuralda da geçiyor — telefon dikeyde oyun alanını gizleyen
  // `#durumSatiri, #masa { display: none }` — ama o bant listesine dokunmaz.)
  const bantliGovdeler = kuralGovdeleri(YORUMSUZ, '#masa')
    .filter((govde) => /grid-template-(rows|areas)\s*:/.test(govde));
  assert.equal(
    bantliGovdeler.length,
    2,
    `#masa bant listesi ${bantliGovdeler.length} kuralda yazılı (taban + varyant = 2 olmalı)`,
  );
  const kalanBantli = kuralGovdeleri(yorumlariAt(kalan), '#masa')
    .filter((govde) => /grid-template-(rows|areas)\s*:/.test(govde));
  assert.equal(
    kalanBantli.length,
    1,
    'varyant bloğu çıkarıldığında bant listesi tek kuralda kalmıyor — varyant bloğun dışına sızmış',
  );
});

/* ---------------------------------------------------------------------------------- kabul-c */

test('kabul-c: varyant 800x360/844x390/900x600\'te ETKİN, 1280x800/1180x820/1920x1080\'de DEĞİL', () => {
  const { sorgu } = varyantYapiBlogu();
  for (const boyut of ETKIN_BOYUTLAR) {
    assert.equal(
      medyaSorgusuUyuyor(sorgu, boyut),
      true,
      `${boyut.ad}: varyant etkin değil ("${sorgu}") — kısa yatay düzenin kabul boyutu`,
    );
    assert.equal(model(boyut).varyant, true, `${boyut.ad}: masa dört banda ayrılmıyor`);
  }
  for (const boyut of ETKIN_OLMAYAN_BOYUTLAR) {
    assert.equal(
      medyaSorgusuUyuyor(sorgu, boyut),
      false,
      `${boyut.ad}: varyant ETKİN ("${sorgu}") — masaüstü/tablet düzeni bozulur`,
    );
    const m = model(boyut);
    assert.equal(m.varyant, false, `${boyut.ad}: masa dört banda ayrılmış`);
    assert.equal(m.satirAdlari.length, 3, `${boyut.ad}: paylaşılan düzen üç iz değil`);
  }
});

/* ---------------------------------------------------------------------------------- kabul-d */

test('kabul-d: varyantta .kose kuralı ve grid-area geçersiz kılması YOK (ADR-010/012 korunur)', () => {
  // Bölgenin BÜTÜN blokları denetlenir (tasokey#72: iki blok).
  for (const blok of medyaBloklari(STIL_CSS).filter((aday) => varyantSorgusuMu(aday.sorgu))) {
    assert.doesNotMatch(
      blok.govde,
      /(^|[,}\s])\.kose\s*\{/m,
      `${blok.sorgu}: .kose kuralı yeniden tanımlanmış — dört köşe tek kuraldan okunamaz (ADR-010)`,
    );
    assert.doesNotMatch(
      blok.govde,
      /(^|;|\s)grid-area\s*:/,
      `${blok.sorgu}: bir öğenin grid-area'sı geçersiz kılınmış — dört kenar/dört köşe yerleşimi (ADR-012) kademeye göre ayrışır`,
    );
  }
  // Dokuz alanın grid-area ataması hâlâ TEK yerde (taban kurallarda) duruyor.
  for (const [secici, alan] of [
    ['#koseSolUst', 'solUst'], ['#kenarUst', 'ust'], ['#koseSagUst', 'sagUst'],
    ['#kenarSol', 'sol'], ['#merkez', 'merkez'], ['#kenarSag', 'sag'],
    ['#koseSolAlt', 'solAlt'], ['#rafAlani', 'alt'], ['#koseSagAlt', 'sagAlt'],
  ]) {
    for (const boyut of [...ETKIN_BOYUTLAR, ...ETKIN_OLMAYAN_BOYUTLAR]) {
      assert.equal(
        bildirim(STIL_CSS, secici, 'grid-area', boyut),
        alan,
        `${boyut.ad}: ${secici} grid-area'sı "${alan}" değil`,
      );
    }
  }
});

/* ---------------------------------------------------------------------------------- kabul-e */

test('kabul-e: --masa-orta-satir TEK tanım ve varyantın bant listesi onu okuyor', () => {
  const tanimlar = [...YORUMSUZ.matchAll(/--masa-orta-satir\s*:\s*([^;}]+)/g)];
  assert.equal(tanimlar.length, 1, '--masa-orta-satir birden çok kez tanımlı; tek kaynak olmalı');
  for (const boyut of [...ETKIN_BOYUTLAR, ...ETKIN_OLMAYAN_BOYUTLAR]) {
    assert.match(
      bildirim(STIL_CSS, '#masa', 'grid-template-rows', boyut),
      /var\(--masa-orta-satir\)/,
      `${boyut.ad}: bant listesi yan çubuk izini değişkenden okumuyor`,
    );
  }
});

/* ---------------------------------------------------------------------------------- kabul-f */

test('kabul-f: varyantın bant listesinde ıstaka/çubuk dışında içerikten ölçülen iz yok (ADR-012)', () => {
  // ADR-012'nin iz kuralı: içerikten ölçülen izler yalnız ıstaka/çubuk izleridir, artan boş alan
  // köşe hücrelerinin kapladığı ESNEK izlere düşer. Varyantta `auto` olan tek bant üst çubuğun
  // bandıdır (içeriği yalnız çubuğun kalınlığı); öbür üç bant esnektir.
  const KENAR_ALANLARI = ['ust', 'alt', 'sol', 'sag'];
  for (const boyut of ETKIN_BOYUTLAR) {
    const { satirAdlari, sablon } = model(boyut);
    satirAdlari.forEach((iz, bant) => {
      // O bandı YALNIZ BAŞINA kaplayan alanlar bandın içerik tabanını belirler (CSS Grid §11.5).
      const tekBantlilar = sablon[bant]
        .filter((ad) => ad !== '.' && alanSatirlari(sablon, ad).length === 1);
      if (iz === 'auto') {
        assert.deepEqual(
          [...new Set(tekBantlilar)].filter((ad) => !KENAR_ALANLARI.includes(ad)),
          [],
          `${boyut.ad}: ${bant}. bant içerikten ölçülüyor ama içinde kenar/ıstaka dışı alan var `
          + `(${tekBantlilar.join(', ')}) — artan boş alan köşenin değil o hücrenin olur`,
        );
      } else {
        assert.match(iz, /^\d+(\.\d+)?fr$/, `${boyut.ad}: ${bant}. bant ne auto ne fr ("${iz}")`);
      }
    });
    assert.equal(
      satirAdlari.filter((iz) => iz === 'auto').length,
      1,
      `${boyut.ad}: varyantta içerikten ölçülen bant sayısı 1 değil (${satirAdlari.join(' ')})`,
    );
  }
});

/* ---------------------------------------------------------------------------------- kabul-g */

test('kabul-g: ince sırt oranı (uzunluk/kalınlık >= 6) ÖLÇÜLEN bant uzunluğuyla korunuyor', () => {
  // tasokey#33 madde 1'in kuralı: rakip ıstakası ince ahşap SIRT olarak okunmalı. Çubuğun gerçek
  // uzunluğu `--rakip-raf-uzunluk` DEĞİL (o yalnız taban/min-height), ızgara bandının ölçüsüdür
  // (height: 100%, tasokey#63) — varyantta bant kısaldığı için oran burada ölçülür.
  for (const boyut of [...ETKIN_BOYUTLAR, ...ETKIN_OLMAYAN_BOYUTLAR]) {
    const { yanBantUzunlugu, cubukUzunluk, cubukKalinlik, varyant } = model(boyut);
    const oran = cubukUzunluk / cubukKalinlik;
    assert.ok(
      oran >= 6,
      `${boyut.ad}${varyant ? ' (varyant)' : ''}: çubuk oranı ${oran.toFixed(1)} < 6 — `
      + `bant ${yanBantUzunlugu.toFixed(0)} px, kalınlık ${cubukKalinlik} px`,
    );
  }
});

/* ------------------------------------------------- karar maddesi 6: el sonunda açılan taşlar */

test('kabul-h: varyantta açılan rakip taşları kendi bandına sığar (yan yığın) ve üst yığın #merkez\'e çarpmaz', () => {
  const EN_COK_EL = BASLAYAN_OYUNCU_EL_BOYUTU;
  for (const boyut of ETKIN_BOYUTLAR) {
    const m = model(boyut);
    const px = (ad) => degiskenOlcusu(ad, m.sozluk).sayi;
    const tasG = px('--rakip-acik-tas-genislik');
    const tasY = px('--rakip-acik-tas-yukseklik');
    const bosluk = px('--rakip-acik-bosluk');
    // Taşların ÇUBUKTAN uzaklığı artık boşluk değil, adın kenarından türeyen pay (kabul-i).
    const pay = px('--rakip-acik-ad-payi');
    const sutunDikey = px('--rakip-acik-sutun-dikey');
    const sutunYatay = px('--rakip-acik-sutun-yatay');

    // (1) Yan kenar: yığın yan çubuk bandını DİKEYDE aşmaz. Aşarsa köşe hücrelerine ve ADR-014'ün
    // hedef halkasına girer (tasokey#68 3. çekim turu: #kenarSol/SagTaslar ∩ #koseSol/SagAlt::after).
    const yanSatir = Math.ceil(EN_COK_EL / sutunDikey);
    const yanYukseklik = yanSatir * tasY + (yanSatir - 1) * bosluk;
    assert.ok(
      yanYukseklik <= m.yanBantUzunlugu,
      `${boyut.ad}: yan açık yığın ${yanYukseklik.toFixed(0)} px, çubuk bandı `
      + `${m.yanBantUzunlugu.toFixed(0)} px — yığın köşe hücresine girer (${sutunDikey} sütun)`,
    );
    // Yatayda yığın çubuğun masa tarafına serilir ve varyantta yan çubuk bandının orta sütunu
    // BOŞTUR → kenar sütununu aşsa bile çarpacağı bir kutu yoktur; bağlayıcı olan karşı kenarın
    // yığınıdır (ikisi masanın içinde buluşmamalı).
    const yanGenislik = pay + sutunDikey * tasG + (sutunDikey - 1) * bosluk;
    assert.ok(
      2 * (m.cubukKalinlik + yanGenislik) <= m.masaIcGenislik,
      `${boyut.ad}: sol ve sağ açık yığın masanın ortasında buluşuyor `
      + `(${(2 * (m.cubukKalinlik + yanGenislik)).toFixed(0)} px / ${m.masaIcGenislik} px)`,
    );

    // (2) Üst kenar: yığın çubuğun ALTINA, yani #merkez'in bandına sarkar. Burada DURUM AYRIMI
    // vardır (Masa kararı, Sahip adına 2026-11-22; ADR-022 madde 10) — gevşetme değil, iki ayrı
    // durumun iki ayrı kuralı:
    //   · `durum=el` (oyun oynanırken): açılan rakip taşı HİÇ YOKTUR (ekran.js kutuyu boşaltır),
    //     #merkez görünür ve çakışacak bir şey bulunmaz.
    //   · `durum=rakip` (el bitti, ıstakalar açık): yığın vardır ama #merkez GİZLİDİR, yani
    //     çakışma geometrik olarak olanaksızdır. Gizlemenin kendisi burada ÖLÇÜLÜR (aşağıdaki
    //     kural aranır); kural kalkarsa sav eski hâline döner ve yığının #merkez'e değmediğini
    //     yeniden ister.
    const ustSatir = Math.ceil(EN_COK_EL / sutunYatay);
    const ustYiginAlt = m.cubukKalinlik + pay + ustSatir * tasY + (ustSatir - 1) * bosluk;
    const ortaBant = alanSatirlari(m.sablon, 'merkez');
    assert.equal(ortaBant.length, 1, `${boyut.ad}: merkez alanı tek bant kaplamıyor`);
    const merkezYukseklik = m.satirIcerikUst[ortaBant[0]];
    const merkezUst = m.satirOlculeri[0] + m.bosluk
      + (m.satirOlculeri[ortaBant[0]] - merkezYukseklik);
    assert.ok(
      merkezElSonundaGizliMi() || ustYiginAlt < merkezUst,
      `${boyut.ad}: üst açık yığın ${ustYiginAlt.toFixed(0)} px'e kadar sarkıyor, #merkez `
      + `${merkezUst.toFixed(0)} px'te başlıyor — deste/gösterge öbeğine çarpar (${sutunYatay} sütun)`,
    );
    // Sıra Sahip'in kendi ıstakasından geniş olmamalı (üst çubuk onunla aynı genişlikte).
    const ustGenislik = sutunYatay * tasG + (sutunYatay - 1) * bosluk;
    assert.ok(
      ustGenislik <= m.istakaGenislik,
      `${boyut.ad}: üst açık sıra ${ustGenislik.toFixed(0)} px, ıstaka ${m.istakaGenislik.toFixed(0)} px`,
    );
  }
});

/* ---------------------------------------------------------------------------------- kabul-j */

test('kabul-j: el bitince #merkez gizlenir — sınıf saf karardan gelir, kural bölgenin içinde', () => {
  // ADR-022 madde 10 (Masa kararı, Sahip adına 2026-11-22). Zincir tek yönlüdür ve her halkası
  // ölçülür: saf karar (`etkilesim.js rakipEliAcikMi`) → `ekran.js` masaya durum sınıfını yazar →
  // `stil.css` o sınıfın altında #merkez'i gizler. Arayüz JS'i NEYİN gizleneceğine karar vermez
  // (düzen kuralı CSS'te, kademesinin içinde kalır).
  assert.ok(
    merkezElSonundaGizliMi(),
    `${MERKEZ_GIZLEME_SECICISI} kuralı yok, display:none değil ya da varyant bölgesinin dışında`,
  );
  assert.match(
    EKRAN_JS,
    new RegExp(`eleman\\.masa\\.classList\\.toggle\\('${EL_SONU_SINIFI}', rakipEliAcik\\)`),
    'ekran.js durum sınıfını saf karardan (rakipEliAcik) yazmıyor',
  );
  // Sınıfın adı iki dosyada da birebir aynı geçiyor (tek kaynak; yazım kayması sessizce geçmesin).
  assert.equal((EKRAN_JS.match(new RegExp(EL_SONU_SINIFI, 'g')) || []).length, 1);
  // Kapatma anahtarı: bölge silinince gizleme kuralı da gider.
  assert.equal(
    kuralGovdeleri(varyantsizCss(), MERKEZ_GIZLEME_SECICISI).length,
    0,
    'varyant bölgesi silindiğinde #merkez gizleme kuralı geride kalıyor',
  );
  // Gerilemesizlik: #merkez'i gizleyen BAŞKA bir kural yok — masaüstü/dizüstü/tablet kademelerinde
  // deste ve gösterge el bittikten sonra da görünür kalır.
  const gizleyenler = [...YORUMSUZ.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, seciciler, govde]) => /#merkez/.test(seciciler) && /display\s*:\s*none/.test(govde));
  assert.equal(gizleyenler.length, 1, '#merkez birden çok kuralda gizleniyor — tek kapı bozuldu');
});

/* ---------------------------------------------------------------------------------- kabul-k */

/**
 * ŞERİDİN (masanın dışındaki üst çubuk + durum satırı) ölçü değişkenleri ve tasokey#68/#72'de
 * geçerli olan TABAN değerleri — tasokey#73, plan §6.3. Çıplak sayılar kuralların içinden
 * değişkene taşındı; masaüstü kademelerinde ÇÖZÜLEN değer birebir aynı kalmak zorunda.
 */
const SERIT_TABAN_OLCULERI = Object.freeze([
  ['--ust-cubuk-dolgu-dikey', 8, 'px', 'daralan'],
  ['--ust-cubuk-dolgu-yatay', 16, 'px', 'degismeyen'],
  ['--ust-dugme-dolgu-dikey', 4, 'px', 'daralan'],
  ['--ust-dugme-dolgu-yatay', 10, 'px', 'degismeyen'],
  ['--durum-dolgu-dikey', 6, 'px', 'daralan'],
  ['--durum-dolgu-yatay', 16, 'px', 'degismeyen'],
  ['--durum-satir-payi', 1.4, '', 'daralan'],
  ['--sonuc-kucuk-dolgu-dikey', 2, 'px', 'daralan'],
  ['--sonuc-kucuk-dolgu-yatay', 10, 'px', 'degismeyen'],
  ['--sonuc-kucuk-ust-pay', 6, 'px', 'daralan'],
  ['--kucult-dugme-font-boyutu', 0.9, 'rem', 'cubuk-dugmesiyle-ayni'],
]);

/**
 * Şeridin YAZI ölçüleri kademe başına tasokey#68 değerlerinde KALIR: şerit dolgudan ve satır
 * payından daralır, metin küçültülerek değil (istek: hiçbir metin/düğme/dil anahtarı kalkmaz).
 */
const SERIT_YAZI_OLCULERI = Object.freeze({
  '800x360': Object.freeze([['--baslik-font-boyutu', 0.9], ['--ust-dugme-font-boyutu', 0.75], ['--durum-font-boyutu', 0.8]]),
  '844x390': Object.freeze([['--baslik-font-boyutu', 0.9], ['--ust-dugme-font-boyutu', 0.75], ['--durum-font-boyutu', 0.8]]),
  '900x600': Object.freeze([['--baslik-font-boyutu', 1.1], ['--ust-dugme-font-boyutu', 0.95], ['--durum-font-boyutu', 0.95]]),
});

/**
 * Şerit ölçülerinin taban değerinden SAPTIĞI kademeler (varyant bölgesinin DIŞINDAN, tasokey#31):
 * yatay+kısa kademe durum satırının dolgusunu zaten küçültüyordu. "Bölge silinince ne kalır?"
 * sorusunun yanıtı bu yüzden boyuta göre değişir ve burada pinlenir — yoksa (2). maddenin
 * karşılaştırma tabanı sessizce kayabilir.
 */
const SERIT_BOLGESIZ_SAPMA = Object.freeze({
  '800x360': Object.freeze([['--durum-dolgu-dikey', 3], ['--durum-dolgu-yatay', 8]]),
  '844x390': Object.freeze([['--durum-dolgu-dikey', 3], ['--durum-dolgu-yatay', 8]]),
  '900x600': Object.freeze([]),
});

/** Şeridin kısa yatayda en az bu kadar px daralması ÖLÇÜLDÜ (tasokey#73 1. çekim turu). */
const EN_AZ_SERIT_KAZANCI_PX = 10;

test('kabul-k: masanın DIŞINDAKİ şerit kısa yatayda daralır, masaüstü kademeleri birebir aynı', () => {
  // İstek (tasokey#73): "Masanın dışındaki şeridi kısa yatay kademede daraltıp kalanı #masa'ya
  // vermek; yalnız yerleşim ve ölçü değişikliği." Şerit yazı ölçüsüne bağlı satır kutularından
  // geldiği için CSS'ten hesaplanamaz (`line-height: normal` font metriğidir) → yüksekliği
  // TARAYICIDA ölçülür (aşağıdaki (3) maddesi, `masaIc` tablosundan çıkar), burada ölçülen
  // yüksekliği ÜRETEN değişkenler ve yalıtım denetlenir.
  const kalan = varyantsizCss();
  const olcu = (css, boyut, ad) => degiskenOlcusu(ad, boyutSozlugu(css, boyut, EKLER));
  const taban = (ad) => SERIT_TABAN_OLCULERI.find(([deger]) => deger === ad);

  // (1) Masaüstü/dizüstü/tablet: şeridin BÜTÜN ölçüleri taban değerinde ve varyant bölgesi
  // onlara dokunmuyor (bölgeli ve bölgesiz CSS aynı sayıyı veriyor).
  for (const boyut of ETKIN_OLMAYAN_BOYUTLAR) {
    for (const [ad, sayi, birim] of SERIT_TABAN_OLCULERI) {
      assert.deepEqual(
        olcu(STIL_CSS, boyut, ad), { sayi, birim },
        `${boyut.ad}: ${ad} tasokey#72 değerinden sapmış (masaüstü şeridi değişti)`,
      );
      assert.deepEqual(
        olcu(kalan, boyut, ad), { sayi, birim },
        `${boyut.ad}: ${ad} varyant bölgesinden etkilenmiş`,
      );
    }
  }

  // (2) Varyantın üç boyutu: dikey bileşenler KÜÇÜLDÜ, yatay bileşenler ve YAZI ölçüleri aynı.
  // Karşılaştırma tabanı "bölgesiz CSS"in aynı boyutta çözdüğü değerdir (kapatma anahtarı =
  // yalıtım): yatay+kısa kademe bazı dolguları zaten küçültüyor (SERIT_BOLGESIZ_SAPMA).
  for (const boyut of ETKIN_BOYUTLAR) {
    for (const [ad, , birim, tur] of SERIT_TABAN_OLCULERI) {
      const varyantli = olcu(STIL_CSS, boyut, ad);
      const bolgesiz = olcu(kalan, boyut, ad);
      const sapma = SERIT_BOLGESIZ_SAPMA[boyut.ad].find(([deger]) => deger === ad);
      assert.deepEqual(
        bolgesiz,
        { sayi: sapma ? sapma[1] : taban(ad)[1], birim },
        `${boyut.ad}: bölge silinince ${ad} tasokey#72 değerine dönmüyor (bildirim sızmış ya da `
        + 'taban kademe değişmiş)',
      );
      if (tur === 'daralan') {
        assert.ok(
          varyantli.sayi < bolgesiz.sayi,
          `${boyut.ad}: ${ad} ${varyantli.sayi} — bölgesiz değerden (${bolgesiz.sayi}) küçük değil `
          + '(şerit daralmıyor)',
        );
      } else if (tur === 'degismeyen') {
        assert.deepEqual(
          varyantli, bolgesiz,
          `${boyut.ad}: ${ad} değişmiş — şeridin YATAY ölçüsü bu işin kapsamı değil`,
        );
      } else {
        // Rozetin düğmesi üst çubuğun düğmesiyle AYNI ölçüyü okur (tek kaynak): rozet üst çubuğun
        // içinde kalmak zorunda, yoksa durum satırına girer (yeni çakışma).
        assert.deepEqual(
          varyantli, olcu(STIL_CSS, boyut, '--ust-dugme-font-boyutu'),
          `${boyut.ad}: ${ad} üst çubuk düğmesinin ölçüsünden ayrışmış`,
        );
      }
    }
    for (const [ad, rem] of SERIT_YAZI_OLCULERI[boyut.ad]) {
      assert.deepEqual(
        olcu(STIL_CSS, boyut, ad), { sayi: rem, birim: 'rem' },
        `${boyut.ad}: ${ad} değişmiş — şerit metin küçültülerek değil DOLGUDAN daralır`,
      );
      assert.deepEqual(
        olcu(kalan, boyut, ad), { sayi: rem, birim: 'rem' },
        `${boyut.ad}: ${ad} varyant bölgesinden etkilenmiş`,
      );
    }
  }

  // (3) ÖLÇÜLEN şerit yüksekliği (görünüm − masanın dış kutusu; `olculenSerit`): masaüstü üç
  // boyutta tasokey#72 değeri BİREBİR, varyantın üç boyutunda belirgin biçimde KÜÇÜK.
  for (const boyut of [...ETKIN_BOYUTLAR, ...ETKIN_OLMAYAN_BOYUTLAR]) {
    const m = model(boyut);
    const serit = olculenSerit(boyut.olcum, m.cerceveVeDolgu / 2);
    const once = SERIT_TASOKEY_72_PX[boyut.olcum];
    if (m.varyant) {
      assert.ok(
        serit <= once - EN_AZ_SERIT_KAZANCI_PX,
        `${boyut.ad}: ölçülen şerit ${serit} px, tasokey#72'de ${once} px — en az `
        + `${EN_AZ_SERIT_KAZANCI_PX} px daralması bekleniyordu (kazanç masaya geçmiyor)`,
      );
    } else {
      assert.equal(
        serit, once,
        `${boyut.ad}: ölçülen şerit ${serit} px, tasokey#72'de ${once} px — masaüstü şeridi değişti`,
      );
    }
  }
});

/* ---------------------------------------------------------------------------------- kabul-i */

/** `stil.css`te `html`/`body` yazı boyu yazılmaz → `rem` tarayıcı tabanıdır (16 px). */
const KOK_YAZI_PX = 16;
/**
 * `line-height: normal` yazı boyunun ~1,33 katı bir kutu verir. Ölçülen değer: 0.85rem (13,6 px)
 * yazı → 18 px kutu (tasokey#68 ve #71 çekimlerinde `#kenarXAd ∩ çubuk` kesişiminin kalınlığı
 * masaüstü boyutlarda 18 px, yani adın KENDİ kutusu). Varyantın DIŞINDA satır aralığı yazılmadığı
 * için gerilemesizlik denetimi bu ölçülen oranla yapılır; varyantın İÇİNDE `line-height: 1` var,
 * yani orada kutu tam olarak yazı boyudur ve oran kullanılmaz.
 */
const NORMAL_SATIR_ORANI = 1.33;

/** `.kenar-ad`ın TABAN kuralındaki yazı boyu (px) — varyant bloğundan önceki ilk gövde. */
function tabanAdYazisiPx() {
  const [taban] = kuralGovdeleri(YORUMSUZ, '.kenar-ad');
  const eslesme = /font-size:\s*([\d.]+)rem/.exec(taban ?? '');
  assert.ok(eslesme, '.kenar-ad taban kuralında rem cinsinden font-size yok');
  return Number.parseFloat(eslesme[1]) * KOK_YAZI_PX;
}

test('kabul-i: açılan rakip taşları rakip ADININ kutusuna girmiyor (ad çubuktan kalın olduğunda)', () => {
  // tasokey#33 madde 1: ad çubuğun ÜSTÜNE yazılır (o kesişim kasıtlıdır). Ama ad çubuktan
  // kalınsa iki yana taşar ve çubuğun masa tarafına serilen açık taşlara girer — tasokey#68
  // ölçümünde 800x360/844x390'ta 2 px'lik `#kenarXAd ∩ #kenarXTaslar` çakışması tam olarak buydu
  // ve çubuk 10 → 8 px inince 3 px'e çıkıyordu. Uzaklık artık ADIN kenarından türüyor.
  for (const boyut of ETKIN_BOYUTLAR) {
    const m = model(boyut);
    const px = (ad) => degiskenOlcusu(ad, m.sozluk).sayi;
    const adKalinlik = px('--rakip-ad-kalinlik');
    const pay = px('--rakip-acik-ad-payi');
    const bosluk = px('--rakip-acik-bosluk');

    // (1) Tek kaynak: varyantın yazdığı kalınlık `.kenar-ad`ın taban yazı boyuyla aynı px'tir ve
    // varyant o kalınlığı yazı boyu olarak GERİ YAZAR → kutu (line-height: 1) tam o kadardır.
    assert.equal(
      adKalinlik,
      tabanAdYazisiPx(),
      `--rakip-ad-kalinlik ${adKalinlik} px, .kenar-ad taban yazı boyu ${tabanAdYazisiPx()} px — `
      + 'ikisi ayrışırsa ad kutusu paydan büyük olur ve taşlara girer',
    );
    const [, varyantGovde] = kuralGovdeleri(YORUMSUZ, '.kenar-ad');
    assert.match(
      varyantGovde ?? '', /font-size:\s*var\(--rakip-ad-kalinlik\)/,
      'varyant `.kenar-ad`ın yazı boyunu --rakip-ad-kalinlik\'ten okumuyor (kutu kalınlığı tek kaynak değil)',
    );
    assert.match(
      varyantGovde ?? '', /line-height:\s*1\b/,
      'varyant `.kenar-ad`ın satır aralığını 1\'e sabitlemiyor — kutu yazı boyundan kalın kalır',
    );

    // (2) Taşmanın yarısı + taban boşluk kadar uzaklık: taşlar adın kenarına değmiyor.
    const adTasmasi = (adKalinlik - m.cubukKalinlik) / 2;
    assert.ok(
      pay >= adTasmasi + bosluk,
      `${boyut.ad}: açık taşlar çubuktan ${pay.toFixed(1)} px uzakta, ad ${adTasmasi.toFixed(1)} px `
      + 'taşıyor — taşlar adın kutusuna giriyor',
    );
    // (3) Pay taban boşluğun altına düşmüyor (çubuk addan kalın olsa bile).
    assert.ok(pay >= bosluk, `${boyut.ad}: pay (${pay} px) taban boşluktan (${bosluk} px) küçük`);
  }

  // (4) Gerilemesizlik: varyantın DIŞINDA ad hâlâ çubuktan ince, yani taban boşluk yetiyor.
  for (const boyut of ETKIN_OLMAYAN_BOYUTLAR) {
    const m = model(boyut);
    const adKutusu = tabanAdYazisiPx() * NORMAL_SATIR_ORANI;
    assert.ok(
      m.cubukKalinlik >= adKutusu,
      `${boyut.ad}: çubuk ${m.cubukKalinlik} px, ad kutusu ${adKutusu.toFixed(1)} px — `
      + 'ad çubuğun dışına taşıyor, masaüstü kademesinde de pay gerekir',
    );
  }
});
