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
import { olculenMasaKutusu } from './yardimci/sigdirma-butcesi.js';

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

const EKLER = new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]);

/** Varyant bloğunu çevreleyen adlandırılmış yorum işaretleri (kapatma anahtarının çapası). */
const BAS_ISARETI = '===== KISA YATAY DÜZEN VARYANTI — BAŞLANGIÇ';
const BITIS_ISARETI = '===== KISA YATAY DÜZEN VARYANTI — BİTİŞ';

/**
 * Bant modeli: masanın İÇERİK kutusu tarayıcıda ÖLÇÜLEN değerden gelir (tasokey#68 tablosu,
 * `yardimci/sigdirma-butcesi.js`) — masa yüksekliği esnek kaptan gelir, CSS'ten okunamaz.
 */
function model(boyut) {
  return masaModeli(STIL_CSS, boyut, EKLER, { masaIc: olculenMasaKutusu(boyut) });
}

/** Varyantın ETKİN olduğu kabul boyutları (plan §5) ve etkin OLMADIĞI gerilemesizlik boyutları. */
const ETKIN_BOYUTLAR = [
  { ad: '800x360', genislik: 800, yukseklik: 360 },
  { ad: '844x390', genislik: 844, yukseklik: 390 },
  { ad: '900x600', genislik: 900, yukseklik: 600 },
];
const ETKIN_OLMAYAN_BOYUTLAR = [
  { ad: '1280x800', genislik: 1280, yukseklik: 800 },
  { ad: '1180x820', genislik: 1180, yukseklik: 820 },
  { ad: '1920x1080', genislik: 1920, yukseklik: 1080 },
];

/** Varyant bloğunun `@media` sorgusu (eşik 500px'ten büyük olan yatay+kısa blok). */
function varyantSorgulari() {
  return medyaBloklari(STIL_CSS)
    .map((blok) => blok.sorgu)
    .filter((sorgu) => /orientation:\s*landscape/.test(sorgu) && Number.parseFloat(
      (/max-height:\s*(\d+)/.exec(sorgu) ?? [])[1] ?? '0',
    ) > 500);
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

/* ---------------------------------------------------------------------------------- kabul-a */

test('kabul-a: varyant TEK bir @media bloğudur ve adlandırılmış başlangıç/bitiş yorumu taşır', () => {
  const sorgular = varyantSorgulari();
  assert.equal(
    sorgular.length,
    1,
    `kısa yatay varyant ${sorgular.length} @media bloğuna yayılmış (${sorgular.join(' | ')}) — `
    + 'kapatma anahtarı (bloğu silmek) tek blok olmadan ölçülemez',
  );
  for (const isaret of [BAS_ISARETI, BITIS_ISARETI]) {
    const sayi = STIL_CSS.split(isaret).length - 1;
    assert.equal(sayi, 1, `"${isaret}" yorumu ${sayi} kez geçiyor (tek olmalı)`);
  }
  // İşaretler bloğu gerçekten SARIYOR: başlangıç yorumu bloğun önünde, bitiş yorumu arkasında.
  const blokBasi = STIL_CSS.indexOf(`@media ${sorgular[0].replace(/^@media\s*/, '')}`);
  assert.ok(blokBasi > STIL_CSS.indexOf(BAS_ISARETI), 'başlangıç yorumu varyant bloğundan sonra');
  assert.ok(blokBasi < STIL_CSS.indexOf(BITIS_ISARETI), 'bitiş yorumu varyant bloğundan önce');
  // Blok çıkarıldığında geride varyanta ait hiçbir iz kalmıyor (bant listesi geçersiz kılması).
  const kalan = varyantsizCss();
  assert.equal(varyantSorgulari().length, 1);
  assert.ok(
    !kalan.includes(BAS_ISARETI) && !kalan.includes(BITIS_ISARETI),
    'varyant bloğu çıkarıldığında yorum işaretleri geride kalıyor — kesme yeri yanlış',
  );
  assert.equal(
    medyaBloklari(kalan).length,
    medyaBloklari(STIL_CSS).length - 1,
    'varyant bloğu çıkarıldığında @media sayısı yalnız bir azalmıyor',
  );
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
  const [sorgu] = varyantSorgulari();
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
  const [sorgu] = varyantSorgulari();
  const blok = medyaBloklari(STIL_CSS).find((b) => b.sorgu === sorgu);
  assert.ok(blok, 'varyant bloğunun gövdesi okunamadı');
  assert.doesNotMatch(
    blok.govde,
    /(^|[,}\s])\.kose\s*\{/m,
    'varyant .kose kuralını yeniden tanımlıyor — dört köşe tek kuraldan okunamaz (ADR-010 simetrisi)',
  );
  assert.doesNotMatch(
    blok.govde,
    /(^|;|\s)grid-area\s*:/,
    'varyant bir öğenin grid-area\'sını geçersiz kılıyor — dört kenar/dört köşe yerleşimi (ADR-012) kademeye göre ayrışır',
  );
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

    // (2) Üst kenar: yığın çubuğun ALTINA, yani #merkez'in bandına sarkar. #merkez bandın alt
    // kenarına yaslı (karar maddesi 3); yığının alt kenarı onun üst kenarına değmemeli.
    const ustSatir = Math.ceil(EN_COK_EL / sutunYatay);
    const ustYiginAlt = m.cubukKalinlik + pay + ustSatir * tasY + (ustSatir - 1) * bosluk;
    const ortaBant = alanSatirlari(m.sablon, 'merkez');
    assert.equal(ortaBant.length, 1, `${boyut.ad}: merkez alanı tek bant kaplamıyor`);
    const merkezYukseklik = m.satirIcerikUst[ortaBant[0]];
    const merkezUst = m.satirOlculeri[0] + m.bosluk
      + (m.satirOlculeri[ortaBant[0]] - merkezYukseklik);
    assert.ok(
      ustYiginAlt < merkezUst,
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
