import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ESIK_PX, CIFT_ISTISNALARI, TABLO_BASLIKLARI,
  kutuAlani, kutuBosMu, kutuGenislet, kesisim, ataCocukMu,
  cakisanCiftler, ciftleriAyir, muafListesi, halkaCiftleriniAyir, tasmaIhlalleri,
  olcuMetni, ozetSatirlari, yaziKatmaniBicimi, markdownTablosu, olcumSatiri,
} from './yardimci/yerlesim-cakisma.js';
import * as geometriModulu from './yardimci/yerlesim-cakisma.js';
import {
  BOYUTLAR, GEOMETRI_ADLARI, EKRAN_EN_COK_CIFT, gomulebilirKaynak, sayfaBetigi, planNesnesi,
} from './yardimci/yerlesim-olcum-betigi.js';
import { DURUMLAR, OGE_TANIMLARI, HALKA_TANIMLARI } from './yardimci/yerlesim-olcum-sayfa.js';
import { KULLANIM, seceneklerioku } from './yerlesim-cakisma.olcum.js';

// tasokey#67 (üst iş tasokey#64) — yerleşim çakışma ölçüm aracının saf çekirdeği.
// İstek (Sahip): ıstaka/taş büyütülürken "hiçbir öğe çifti çakışmasın" ölçülebilir olsun.
// Kabul: dikdörtgen listesinden çakışan çiftleri ve kesişim alanını veren saf işlev + istisna
// kuralları (ata-çocuk iç içeliği çakışma değil, kenar kenara temas çakışma değil, 1 px örtüşme
// çakışma) tablo testiyle ölçülür. Tarayıcı yolu bu dosyada KOŞMAZ (sürücü `*.olcum.js`);
// burada ölçülen son madde, tarayıcıya GÖMÜLEN kaynağın modülle aynı sonucu vermesidir.

const oge = (anahtar, [sol, ust, sag, alt], ekler = {}) => ({
  anahtar, kutu: { sol, ust, sag, alt }, yol: [], muaf: null, ...ekler,
});

// --- 1. Çakışma kuralı: tablo testi -----------------------------------------------------------

const CAKISMA_TABLOSU = [
  {
    ad: 'kenar kenara temas çakışma değildir (kesişim 0)',
    ogeler: [oge('#a', [0, 0, 10, 10]), oge('#b', [10, 0, 20, 10])],
    beklenen: [],
  },
  {
    ad: 'yalnız köşeden değmek çakışma değildir',
    ogeler: [oge('#a', [0, 0, 10, 10]), oge('#b', [10, 10, 20, 20])],
    beklenen: [],
  },
  {
    ad: '1 px örtüşme ÇAKIŞMADIR',
    ogeler: [oge('#a', [0, 0, 10, 10]), oge('#b', [9, 0, 20, 10])],
    beklenen: [{ a: '#a', b: '#b', alan: 10 }],
  },
  {
    ad: 'alt-piksel örtüşme (0.4 px) eşiğin altında kalır',
    ogeler: [oge('#a', [0, 0, 10, 10]), oge('#b', [9.6, 0, 20, 10])],
    beklenen: [],
  },
  {
    ad: 'tek yönde ince ama uzun örtüşme çakışmadır',
    ogeler: [oge('#a', [0, 0, 100, 10]), oge('#b', [0, 9, 100, 30])],
    beklenen: [{ a: '#a', b: '#b', alan: 100 }],
  },
  {
    ad: 'ata-çocuk iç içeliği çakışma değildir',
    ogeler: [oge('#ata', [0, 0, 100, 100]), oge('#cocuk', [10, 10, 20, 20], { yol: ['#ata'] })],
    beklenen: [],
  },
  {
    ad: 'torun da ata-çocuk istisnasına girer (yol zinciri)',
    ogeler: [
      oge('#ata', [0, 0, 100, 100]),
      oge('#cocuk', [10, 10, 60, 60], { yol: ['#ata'] }),
      oge('#torun', [20, 20, 30, 30], { yol: ['#ata', '#cocuk'] }),
    ],
    beklenen: [],
  },
  {
    ad: 'muaf öğe (kalıcı pencere örtüsü) hiçbir çifte girmez',
    ogeler: [
      oge('#masa', [0, 0, 100, 100]),
      oge('#panel', [0, 0, 100, 100], { muaf: 'ADR-015 tam ekran örtüsü' }),
    ],
    beklenen: [],
  },
  {
    ad: 'ölçüsü olmayan (gizli) öğe ölçüme girmez',
    ogeler: [oge('#a', [0, 0, 100, 100]), oge('#gizli', [50, 50, 50, 50])],
    beklenen: [],
  },
  {
    ad: 'kardeşlerin tam örtüşmesi alanıyla bildirilir',
    ogeler: [oge('#a', [0, 0, 10, 20]), oge('#b', [0, 0, 10, 20])],
    beklenen: [{ a: '#a', b: '#b', alan: 200 }],
  },
  {
    ad: 'çiftler alanı büyükten küçüğe sıralanır',
    ogeler: [
      oge('#kucuk', [0, 0, 10, 10]),
      oge('#orta', [5, 0, 30, 10]),
      oge('#buyuk', [0, 0, 30, 10]),
    ],
    // Çift adları girdi sırasını korur (a = listede önce gelen öğe), sıralama yalnız alana göre.
    beklenen: [
      { a: '#orta', b: '#buyuk', alan: 250 },
      { a: '#kucuk', b: '#buyuk', alan: 100 },
      { a: '#kucuk', b: '#orta', alan: 50 },
    ],
  },
  {
    ad: 'hedef halkası komşu öğeye giriyorsa ihlaldir, sahibiyle iç içeliği değildir',
    ogeler: [
      oge('#kose', [0, 0, 20, 20]),
      oge('#kose::after', [-5, -5, 25, 25], { yol: ['#kose'] }),
      oge('#komsu', [24, 0, 60, 20]),
    ],
    beklenen: [{ a: '#kose::after', b: '#komsu', alan: 20 }],
  },
];

test('çakışan çiftler: kural tablosu', () => {
  for (const satir of CAKISMA_TABLOSU) {
    const ciftler = cakisanCiftler(satir.ogeler);
    const ozet = ciftler.map((cift) => ({ a: cift.a, b: cift.b, alan: cift.alan }));
    assert.deepEqual(ozet, satir.beklenen, satir.ad);
  }
});

test('eşik ayarlanabilir: eşik 0 iken alt-piksel örtüşme de çakışmadır', () => {
  const ogeler = [oge('#a', [0, 0, 10, 10]), oge('#b', [9.6, 0, 20, 10])];
  assert.equal(cakisanCiftler(ogeler).length, 0);
  assert.equal(cakisanCiftler(ogeler, { esik: 0 }).length, 1);
  assert.equal(ESIK_PX, 0.5);
});

test('kesişim, alan ve kutu yardımcıları', () => {
  assert.equal(kesisim({ sol: 0, ust: 0, sag: 10, alt: 10 }, { sol: 10, ust: 0, sag: 20, alt: 10 }), null);
  assert.deepEqual(
    kesisim({ sol: 0, ust: 0, sag: 10, alt: 10 }, { sol: 5, ust: 5, sag: 20, alt: 20 }),
    { sol: 5, ust: 5, sag: 10, alt: 10 },
  );
  assert.equal(kutuAlani({ sol: 0, ust: 0, sag: 3, alt: 4 }), 12);
  assert.equal(kutuAlani({ sol: 10, ust: 0, sag: 0, alt: 4 }), 0);
  assert.equal(kutuBosMu(null), true);
  assert.equal(kutuBosMu({ sol: 0, ust: 0, sag: 0, alt: 10 }), true);
  assert.equal(kutuBosMu({ sol: 0, ust: 0, sag: 1, alt: 10 }), false);
  assert.deepEqual(
    kutuGenislet({ sol: 10, ust: 10, sag: 20, alt: 20 }, 3),
    { sol: 7, ust: 7, sag: 23, alt: 23 },
  );
  assert.equal(ataCocukMu(oge('#a', [0, 0, 1, 1]), oge('#b', [0, 0, 1, 1], { yol: ['#a'] })), true);
  assert.equal(ataCocukMu(oge('#a', [0, 0, 1, 1]), oge('#b', [0, 0, 1, 1])), false);
  assert.equal(olcuMetni({ sol: 0, ust: 0, sag: 307.6, alt: 100.2 }), '308x100');
  assert.equal(olcuMetni(null), '—');
});

test('kasıtlı çiftler ayrı kovaya düşer, gerekçesiyle', () => {
  const ogeler = [
    oge('#kenarUstAd', [40, 10, 90, 30]),
    oge('#kenarUst .kenar-raf-yatay', [0, 0, 200, 26]),
    oge('#merkez', [0, 100, 200, 200]),
  ];
  const { ihlaller, kasitli } = ciftleriAyir(cakisanCiftler(ogeler));
  assert.equal(ihlaller.length, 0);
  assert.equal(kasitli.length, 1);
  assert.match(kasitli[0].gerekce, /çubuğun üstüne/);
  // İstisna listesi sırasızdır: çift ters yazılmış olsa da eşleşir.
  const ters = ciftleriAyir([{ a: '#kenarUst .kenar-raf-yatay', b: '#kenarUstAd', kutu: {}, alan: 1 }]);
  assert.equal(ters.kasitli.length, 1);
  // Listede olmayan çift ihlaldir.
  const yabanci = ciftleriAyir([{ a: '#merkez', b: '#kenarUstTaslar', kutu: {}, alan: 1 }]);
  assert.equal(yabanci.ihlaller.length, 1);
  assert.equal(CIFT_ISTISNALARI.length, 3);
});

test('muaf listesi ve halka/öğe ayrımı', () => {
  const ogeler = [
    oge('#masa', [0, 0, 100, 100]),
    oge('#sonucPaneli', [0, 0, 100, 100], { muaf: 'ADR-015 örtü' }),
  ];
  assert.deepEqual(muafListesi(ogeler), [{ anahtar: '#sonucPaneli', gerekce: 'ADR-015 örtü' }]);
  const dokum = halkaCiftleriniAyir([
    { a: '#kose::after', b: '#komsu', alan: 1, kutu: {} },
    { a: '#merkez', b: '#raf', alan: 2, kutu: {} },
  ]);
  assert.equal(dokum.halka.length, 1);
  assert.equal(dokum.oge.length, 1);
});

// --- 2. Taşma denetimi (R-014 regresyonu, tasokey#63) -----------------------------------------

const TEMIZ_TASMA = {
  gorunum: { genislik: 800, yukseklik: 360 },
  rafAlaniAlt: 352,
  kaydirma: [
    { anahtar: '#masa', denetim: ['dikey'], scrollGenislik: 800, clientGenislik: 800, scrollYukseklik: 240, clientYukseklik: 240 },
    { anahtar: '#uygulama', denetim: ['dikey'], scrollGenislik: 800, clientGenislik: 800, scrollYukseklik: 360, clientYukseklik: 360 },
    { anahtar: 'scrollingElement', denetim: ['yatay'], scrollGenislik: 800, clientGenislik: 800, scrollYukseklik: 400, clientYukseklik: 360 },
  ],
};

test('taşma ihlalleri: temiz ölçümde boş, her ihlal türü ayrı bildirilir', () => {
  assert.deepEqual(tasmaIhlalleri(TEMIZ_TASMA), []);

  const istakaTasiyor = { ...TEMIZ_TASMA, rafAlaniAlt: 372 };
  assert.deepEqual(tasmaIhlalleri(istakaTasiyor), [
    { tur: 'istaka-gorunum-disi', anahtar: '#rafAlani', miktar: 12 },
  ]);

  const masaTasiyor = {
    ...TEMIZ_TASMA,
    kaydirma: TEMIZ_TASMA.kaydirma.map((k) => (k.anahtar === '#masa' ? { ...k, scrollYukseklik: 260 } : k)),
  };
  assert.deepEqual(tasmaIhlalleri(masaTasiyor), [
    { tur: 'dikey-tasma', anahtar: '#masa', miktar: 20 },
  ]);

  const kokYatay = {
    ...TEMIZ_TASMA,
    kaydirma: TEMIZ_TASMA.kaydirma.map((k) => (k.anahtar === 'scrollingElement' ? { ...k, scrollGenislik: 830 } : k)),
  };
  assert.deepEqual(tasmaIhlalleri(kokYatay), [
    { tur: 'yatay-tasma', anahtar: 'scrollingElement', miktar: 30 },
  ]);
});

test('taşma denetimi yalnız istenen yönü ölçer (plan §5: masa dikey, kök yatay)', () => {
  // Kök öğenin dikey kaydırması §5'te denetlenmiyor (TEMIZ_TASMA'da 400 > 360) — ihlal çıkmamalı.
  assert.deepEqual(tasmaIhlalleri(TEMIZ_TASMA), []);
  const hepsi = {
    ...TEMIZ_TASMA,
    kaydirma: TEMIZ_TASMA.kaydirma.map((k) => ({ ...k, denetim: ['dikey', 'yatay'] })),
  };
  assert.equal(tasmaIhlalleri(hepsi).length, 1);
});

// --- 3. Çıktı biçimi ---------------------------------------------------------------------------

test('özet satırları ekran görüntüsünden okunabilir biçimde yazılır', () => {
  const olcum = {
    durum: 'rakip',
    esik: ESIK_PX,
    gorunum: { genislik: 800, yukseklik: 360 },
    ogeSayisi: 24,
    muaflar: [{ anahtar: '#sonucPaneli', gerekce: 'ADR-015 örtü' }],
    olculer: {
      istaka: { sol: 0, ust: 0, sag: 308, alt: 100 },
      tas: { sol: 0, ust: 0, sag: 25, alt: 36 },
      masaIc: { sol: 0, ust: 0, sag: 788, alt: 240 },
      tasDegiskeni: '25x36',
      olcek: '—',
    },
    ihlaller: [{ a: '#merkez', b: '#kenarUstTaslar', kutu: { sol: 0, ust: 0, sag: 10, alt: 4 }, alan: 40 }],
    kasitli: [{ a: '#kenarUstAd', b: '#kenarUst .kenar-raf-yatay', kutu: { sol: 0, ust: 0, sag: 50, alt: 20 }, alan: 1000, gerekce: 'ad çubuğun üstünde' }],
    tasmalar: [{ tur: 'dikey-tasma', anahtar: '#masa', miktar: 20 }],
  };
  const satirlar = ozetSatirlari(olcum);
  assert.match(satirlar[0], /EKRAN 800x360 durum=rakip oge=24 muaf=1/);
  assert.match(satirlar[1], /ISTAKA 308x100 TAS 25x36 \(css 25x36\) MASA-IC 788x240 OLCEK —/);
  assert.match(satirlar[2], /ihlal=1 \(oge 1 \+ halka 0\) kasitli=1/);
  assert.match(satirlar[3], /TASMA #masa dikey-tasma 20px/);
  assert.ok(satirlar.some((satir) => satir.includes('#merkez') && satir.includes('40px2')));
  assert.ok(satirlar.some((satir) => satir.includes('ad çubuğun üstünde')));
  // Uzun ihlal listesi ekran görüntüsünü taşırmaz: satır sayısı sınırlanır.
  const cokIhlal = { ...olcum, ihlaller: Array.from({ length: 20 }, (_, i) => ({ a: `#a${i}`, b: '#b', kutu: { sol: 0, ust: 0, sag: 1, alt: 1 }, alan: 1 })) };
  assert.ok(ozetSatirlari(cokIhlal, { enCokCift: 3 }).some((satir) => satir.includes('+17 cift daha')));
});

test('yazı katmanı ekrana sığar: uzun liste başa çekilir, gerekirse yazı küçülür', () => {
  const sigar = (satirSayisi, yukseklik, bicim) => (
    Math.ceil(satirSayisi * bicim.yazi * bicim.satirPayi) + 12 <= yukseklik - bicim.ustPx
  );

  // (a) Kısa liste: katman masanın üstünde durur (sayfa da görünsün), yazı küçülmez.
  const kisa = yaziKatmaniBicimi(8, 1080);
  assert.equal(kisa.yazi, 12);
  assert.ok(kisa.ustPx > 0);
  assert.ok(sigar(8, 1080, kisa));

  // (b) "Önce" ölçümünün en kötü hâli (800x360, 14 ihlal + 3 kasıtlı + 4 başlık): başa çekilir,
  //     yazı 12 px kalır ve liste KIRPILMAZ.
  const enKotu = yaziKatmaniBicimi(21, 360);
  assert.equal(enKotu.yazi, 12);
  assert.equal(enKotu.ustPx, 0);
  assert.ok(sigar(21, 360, enKotu));

  // (c) Başa çekmek de yetmezse yazı küçülür ve liste yine sığar.
  const cokUzun = yaziKatmaniBicimi(30, 360);
  assert.ok(cokUzun.yazi < 12);
  assert.ok(sigar(30, 360, cokUzun));

  // (d) Okunurluk tabanı yazıyı küçültmekten önce gelir: 7 px'in altına inilmez (bu durumda
  //     katman ekranı taşar — kırpılan satır, okunmayan satırdan iyidir).
  assert.equal(yaziKatmaniBicimi(400, 360).yazi, 7);
  assert.ok(!sigar(400, 360, yaziKatmaniBicimi(400, 360)));

  // (e) Ekran yolunun sınırı, ölçülen en kötü ihlal sayısının üstünde (liste kırpılmasın).
  assert.ok(EKRAN_EN_COK_CIFT > 14);
  const enKotuSinir = yaziKatmaniBicimi(EKRAN_EN_COK_CIFT + 8, 360);
  assert.ok(sigar(EKRAN_EN_COK_CIFT + 8, 360, enKotuSinir));
});

test('markdown tablosu ve ölçüm satırı', () => {
  const tablo = markdownTablosu(['a', 'b'], [[1, 'x'], [2, 'y']]);
  assert.equal(tablo, '| a | b |\n| --- | --- |\n| 1 | x |\n| 2 | y |');
  const satir = olcumSatiri({
    boyutAdi: 'telefon-kucuk',
    durum: 'el',
    gorunum: { genislik: 800, yukseklik: 360 },
    olculer: {
      istaka: { sol: 0, ust: 0, sag: 308, alt: 100 },
      tas: { sol: 0, ust: 0, sag: 25, alt: 36 },
      masaIc: { sol: 0, ust: 0, sag: 788, alt: 240 },
      olcek: '—',
    },
    ihlaller: [],
    kasitli: [],
    tasmalar: [],
  });
  assert.equal(satir.length, TABLO_BASLIKLARI.length);
  assert.deepEqual(satir.slice(0, 7), ['800x360', 'telefon-kucuk', 'el', '308x100', '25x36', '—', '788x240']);
  assert.equal(satir[9], 'yok');
});

// --- 4. Ölçüm protokolünün verisi (plan §5) ---------------------------------------------------

test('beş boyut ve iki durum planın §5\'indeki küme', () => {
  assert.deepEqual(BOYUTLAR.map((boyut) => `${boyut[0]}x${boyut[1]}`), [
    '1920x1080', '1280x800', '1180x820', '844x390', '800x360',
  ]);
  assert.deepEqual([...DURUMLAR], ['el', 'rakip']);
});

test('öğe kümesi planın §5\'indeki bütün öğeleri kapsar ve index.html\'de var', () => {
  const indexHtml = readFileSync(join(import.meta.dirname, '..', 'docs', 'index.html'), 'utf8');
  const anahtarlar = OGE_TANIMLARI.map((tanim) => tanim.anahtar);
  const beklenen = [
    '#ustCubuk', '#durumSatiri', '#masa', '#rafAlani', '#raf',
    '#koseSolUst', '#koseSagUst', '#koseSolAlt', '#koseSagAlt',
    '#kenarUst', '#kenarSol', '#kenarSag',
    '#kenarUst .kenar-raf-yatay', '#kenarSol .kenar-raf-dikey', '#kenarSag .kenar-raf-dikey',
    '#kenarUstAd', '#kenarSolAd', '#kenarSagAd',
    '#merkez', '#yerDestesi', '#gosterge',
    '#kenarUstTaslar', '#kenarSolTaslar', '#kenarSagTaslar',
    '#baslangicPaneli', '#sonucPaneli', '#onayPaneli', '#bilgiPaneli',
  ];
  for (const anahtar of beklenen) assert.ok(anahtarlar.includes(anahtar), `${anahtar} öğe kümesinde yok`);

  // Kimlik seçicileri gerçekten belgede duruyor (ölü seçiciyle "çakışma 0" ölçülmesin).
  for (const tanim of OGE_TANIMLARI) {
    for (const parca of tanim.secici.split(' ')) {
      if (parca.startsWith('#')) assert.ok(indexHtml.includes(`id="${parca.slice(1)}"`), `${parca} index.html'de yok`);
      else if (parca.startsWith('.')) assert.ok(
        indexHtml.includes(`class="${parca.slice(1)}"`) || indexHtml.includes(`${parca.slice(1)} `)
        || parca === '.surukleme-kopyasi',
        `${parca} index.html'de yok`,
      );
    }
  }

  // Kalıcı pencerelerin örtüsü muaf, görünen kutuları DEĞİL (örttüğü şey ölçülmeli).
  const muaflar = OGE_TANIMLARI.filter((tanim) => tanim.muaf).map((tanim) => tanim.anahtar);
  assert.deepEqual(muaflar, [
    '#baslangicPaneli', '#sonucPaneli', '#onayPaneli', '#bilgiPaneli', '.surukleme-kopyasi',
  ]);
  assert.ok(anahtarlar.includes('#sonucKutusu'));
  assert.deepEqual([...HALKA_TANIMLARI], [
    '#koseSolUst', '#koseSagUst', '#koseSolAlt', '#koseSagAlt', '#yerDestesi',
  ]);
});

// --- 5. Tarayıcıya gömülen kaynak = modül (tek kaynak) ----------------------------------------

test('gömülen kaynak modülün kendisidir: export atılır, import yasaktır', () => {
  const kaynak = 'export const A = 1;\nexport function f() { return A; }\nexport async function g() {}\n';
  const gomulu = gomulebilirKaynak(kaynak);
  assert.equal(gomulu, 'const A = 1;\nfunction f() { return A; }\nasync function g() {}\n');
  assert.throws(() => gomulebilirKaynak("import { x } from './y.js';\n"), /import/);
});

test('gömülen saf çekirdek, modülle AYNI sonucu verir', () => {
  const modulKaynagi = readFileSync(
    join(import.meta.dirname, 'yardimci', 'yerlesim-cakisma.js'), 'utf8',
  );
  const gomulu = gomulebilirKaynak(modulKaynagi);
  const kur = new Function(`${gomulu}\nreturn { ${GEOMETRI_ADLARI.join(', ')} };`);
  const gomulenGeometri = kur();

  // (a) Betiğin saf çekirdeğe verdiği adların hepsi modülde var ve hiçbiri eksik değil.
  const modulAdlari = Object.keys(geometriModulu).sort();
  assert.deepEqual([...GEOMETRI_ADLARI].sort(), modulAdlari);

  // (b) Aynı girdide aynı çıktı (tablo testinin bütün satırları + taşma ölçümü).
  for (const satir of CAKISMA_TABLOSU) {
    assert.deepEqual(
      gomulenGeometri.cakisanCiftler(satir.ogeler),
      cakisanCiftler(satir.ogeler),
      `gömülen kaynak farklı sonuç verdi: ${satir.ad}`,
    );
  }
  assert.deepEqual(gomulenGeometri.tasmaIhlalleri(TEMIZ_TASMA), tasmaIhlalleri(TEMIZ_TASMA));
  assert.deepEqual(gomulenGeometri.CIFT_ISTISNALARI, CIFT_ISTISNALARI);
  assert.equal(gomulenGeometri.ESIK_PX, ESIK_PX);
});

test('sayfa betiği geçerli bir async gövdedir ve iki yol aynı metni kullanır', () => {
  for (const durum of DURUMLAR) {
    const betik = sayfaBetigi({ durum, gosterim: 'json' });
    // Sözdizimi denetimi: betik gerçekten `(async () => { … })` gövdesi olarak derlenebiliyor.
    assert.doesNotThrow(() => new Function(`return (async () => {\n${betik}\n});`), `durum ${durum}`);
    assert.ok(betik.includes('async function olcumYap'));
    assert.ok(!betik.includes('\nexport '));
    assert.ok(betik.includes(`durum: ${JSON.stringify(durum)}`));
  }
  const plan = planNesnesi();
  assert.equal(plan.cekimler.length, DURUMLAR.length);
  // ADR-023: plan yolu betiğe "ekran" gösterimini verir, sunucu/tarayıcı kipine hiç girmez.
  assert.equal(plan.boyutlar.length, BOYUTLAR.length);
  for (const cekim of plan.cekimler) {
    assert.equal(cekim.sayfa, 'index.html');
    assert.ok(cekim.js.includes("gosterim: \"ekran\""));
    // Ekran yolu ihlal listesini kırpmaz: sınır betiğe yazılı geçer.
    assert.ok(cekim.js.includes(`enCokCift: ${EKRAN_EN_COK_CIFT}`));
    assert.doesNotThrow(() => new Function(`return (async () => {\n${cekim.js}\n});`));
  }
});

// --- 6. Sürücünün argüman okuması (ADR-023 iki yolun girişi) ----------------------------------
// Sürücünün sunucu/tarayıcı kipi ofiste koşmaz (ADR-023: Masa yolu); okunabilen ve ölçülebilen
// parçası argüman çözümüdür. Belirti: `--port` değersiz ya da sayı olmayan verilince `Number(…)`
// NaN üretiyor, hata ölçümün ortasında anlaşılmaz bir yerde çıkıyordu (Denetçi bulgusu).
// `seceneklerioku`yu import etmek sürücüyü ÇALIŞTIRMAZ: dosyanın ana girişi doğrudan çağrı
// koruması arkasındadır — bu testin kendisi o korumanın ölçümüdür (import sırasında sunucu,
// tarayıcı ya da plan yazımı tetiklenirse test koşusu burada çakılır).

const ARGUMAN_TABLOSU = [
  {
    ad: 'boş argüman: varsayılanlar (8777 / 9333 / tohum 20261122, bütün boyut ve durumlar)',
    argv: [],
    beklenen: { port: 8777, cdpPort: 9333, tohum: 20261122, plan: null, sunucuYok: false },
    boyutSayisi: BOYUTLAR.length,
    durumlar: [...DURUMLAR],
  },
  {
    ad: 'geçerli küme: sayılar okunur, boyut/durum süzgeci birikir',
    argv: ['--port', '9000', '--cdp-port', '9444', '--tohum', '0', '--cikti', 'cikti/olcum',
      '--boyut', '800x360', '--durum', 'rakip', '--sunucu-yok'],
    beklenen: { port: 9000, cdpPort: 9444, tohum: 0, cikti: 'cikti/olcum', sunucuYok: true },
    boyutSayisi: 1,
    durumlar: ['rakip'],
  },
  {
    ad: 'plan yolu: sunucu/tarayıcı açmayan kip (ADR-023 ofis yolu)',
    argv: ['--plan', 'is/tasokey-67/plan.json'],
    beklenen: { plan: 'is/tasokey-67/plan.json', port: 8777 },
    boyutSayisi: BOYUTLAR.length,
    durumlar: [...DURUMLAR],
  },
  { ad: 'sayı olmayan port', argv: ['--port', 'abc'], hata: /--port tam sayı bekler: abc/ },
  { ad: 'ondalık/bilimsel tohum tam sayı değildir', argv: ['--tohum', '1e3'], hata: /--tohum tam sayı bekler/ },
  { ad: 'eksik değer: port', argv: ['--port'], hata: /--port bir değer bekler/ },
  { ad: 'eksik değer: cdp-port (son argüman)', argv: ['--cikti', 'x', '--cdp-port'], hata: /--cdp-port bir değer bekler/ },
  { ad: 'aralık dışı port (0)', argv: ['--cdp-port', '0'], hata: /--cdp-port 1…65535/ },
  { ad: 'aralık dışı port (65536)', argv: ['--port', '65536'], hata: /--port 1…65535/ },
  { ad: 'değer yerine sonraki bayrak gelmişse metin argümanı da reddedilir', argv: ['--cikti', '--durum', 'el'], hata: /--cikti bir değer bekler/ },
  { ad: 'eksik değer: plan', argv: ['--plan'], hata: /--plan bir değer bekler/ },
  { ad: 'tanınmayan durum', argv: ['--durum', 'orta'], hata: /--durum el\|rakip bekler/ },
  { ad: 'boyut biçimi', argv: ['--boyut', '800'], hata: /--boyut GENISLIKxYUKSEKLIK bekler/ },
  { ad: 'bilinmeyen seçenek', argv: ['--hizli'], hata: /bilinmeyen seçenek: --hizli/ },
];

test('sürücü argümanları: tablo testi (geçerli / sayı olmayan / eksik değer)', () => {
  for (const satir of ARGUMAN_TABLOSU) {
    if (satir.hata) {
      assert.throws(() => seceneklerioku(satir.argv), satir.hata, satir.ad);
      continue;
    }
    const secenekler = seceneklerioku(satir.argv);
    for (const [alan, deger] of Object.entries(satir.beklenen)) {
      assert.deepEqual(secenekler[alan], deger, `${satir.ad}: ${alan}`);
    }
    assert.equal(secenekler.boyutlar.length, satir.boyutSayisi, `${satir.ad}: boyut sayısı`);
    assert.deepEqual(secenekler.durumlar, satir.durumlar, `${satir.ad}: durumlar`);
    // Hiçbir sayısal alan NaN kalmaz (sessiz NaN bu testin asıl belirtisiydi).
    for (const alan of ['port', 'cdpPort', 'tohum']) assert.ok(Number.isInteger(secenekler[alan]), alan);
  }
});

test('kullanım metni her bayrağı anlatır (tek kaynak: hatalı argümanda basılan metin)', () => {
  const surucuKaynagi = readFileSync(
    join(import.meta.dirname, 'yerlesim-cakisma.olcum.js'), 'utf8',
  );
  const bayraklar = [...surucuKaynagi.matchAll(/case '(--[a-z-]+)'/g)].map(([, bayrak]) => bayrak);
  assert.ok(bayraklar.length >= 9, `bayrak taraması bozuldu: ${bayraklar.join(', ')}`);
  for (const bayrak of bayraklar) {
    assert.ok(KULLANIM.includes(`${bayrak} `), `${bayrak} kullanım metninde yok`);
  }
  // ADR-023: ofis yolunun hangisi olduğu kullanım metninden okunur.
  assert.match(KULLANIM, /--plan .*AÇMAZ/);
});
