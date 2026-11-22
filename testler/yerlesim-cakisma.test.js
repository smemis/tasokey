import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ESIK_PX, CIFT_ISTISNALARI, TABLO_BASLIKLARI,
  kutuAlani, kutuBosMu, kutuGenislet, kesisim, ataCocukMu,
  cakisanCiftler, ciftleriAyir, muafListesi, halkaCiftleriniAyir, tasmaIhlalleri,
  olcuMetni, ozetSatirlari, yaziKatmaniBicimi, markdownTablosu, olcumSatiri,
  ciftFarki, aramaSatirlari,
  MUAF_OLCEK_TABANI, MUAF_OLCEK_BASAMAGI, muafOlcekMerdiveni, tasanOgeler, tasmaMetni,
  aramaTavanlari, ilkTasmaDenemesi, muafSatiri,
} from './yardimci/yerlesim-cakisma.js';
import * as geometriModulu from './yardimci/yerlesim-cakisma.js';
import {
  BOYUTLAR, GEOMETRI_ADLARI, EKRAN_EN_COK_CIFT, gomulebilirKaynak, sayfaBetigi,
  planNesnesi,
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

// --- 3b. Ölçek aramasının ölçütü (tasokey#68, ADR-022/5) --------------------------------------

const CIFT = (a, b, alan) => ({ a, b, kutu: { sol: 0, ust: 0, sag: alan, alt: 1 }, alan });

test('çift farkı: YENİ doğan ve BÜYÜYEN çakışma ayrı sayılır (ölçek seçiminin ölçütü)', () => {
  const taban = [CIFT('#a', '#b', 100), CIFT('#c', '#d', 50)];

  // (a) Aynı liste: ne yeni ne büyüyen — ölçek bu denemede kabul edilebilir.
  assert.deepEqual(ciftFarki(taban, taban), { yeni: [], buyuyen: [] });

  // (b) Tabanda olmayan çift YENİdir (çift sırası ters yazılsa da aynı çift sayılır).
  const yeniCiftli = [...taban, CIFT('#e', '#f', 7)];
  assert.deepEqual(ciftFarki(taban, yeniCiftli).yeni.map((c) => c.b), ['#f']);
  assert.deepEqual(ciftFarki(taban, [CIFT('#b', '#a', 100)]), { yeni: [], buyuyen: [] });

  // (c) Tabandaki çiftin kesişimi büyüdüyse BÜYÜYEN; küçüldüyse ya da eşikten az değiştiyse değil.
  const buyuyen = ciftFarki(taban, [CIFT('#a', '#b', 140)]).buyuyen;
  assert.equal(buyuyen.length, 1);
  assert.equal(buyuyen[0].tabanAlan, 100);
  assert.deepEqual(ciftFarki(taban, [CIFT('#a', '#b', 100.4)]).buyuyen, []);
  assert.deepEqual(ciftFarki(taban, [CIFT('#a', '#b', 60)]).buyuyen, []);
});

test('taşan ÖĞE ölçülür: miktarın yanında kaynağı da yazılır (tasokey#72)', () => {
  // tasokey#72 raporu §11 "hangi öğe taşıyor" sorusunu açık bıraktı; ölçeğin mutlak tavanını
  // (ADR-022/9 üçüncü terim) o öğe belirlediği için taşma artık kaynağıyla ölçülür.
  const adaylar = [
    { anahtar: '#kenarUstTaslar', miktar: 13.4 },
    { anahtar: '#merkez', miktar: 0 },
    { anahtar: '.kenar-ust>.kenar-taslar', miktar: 4.2 },
  ];
  assert.deepEqual(tasanOgeler(adaylar), [
    { anahtar: '#kenarUstTaslar', miktar: 13.4 },
    { anahtar: '.kenar-ust>.kenar-taslar', miktar: 4.2 },
  ]);
  // Eşiğin altındaki ve sıfır olan aday listeye girmez; `enCok` kayıt sayısını sınırlar.
  assert.deepEqual(tasanOgeler(adaylar, { esik: 5 }), [{ anahtar: '#kenarUstTaslar', miktar: 13.4 }]);
  assert.equal(tasanOgeler(adaylar, { enCok: 1 }).length, 1);
  assert.deepEqual(tasanOgeler(), []);
  // Eşit miktarda ad sırası kararlıdır (ekran görüntüsü turdan tura aynı okunsun).
  assert.deepEqual(
    tasanOgeler([{ anahtar: '#b', miktar: 2 }, { anahtar: '#a', miktar: 2 }]).map((t) => t.anahtar),
    ['#a', '#b'],
  );

  // Taşma ihlali, kutunun ölçtüğü adaylardan YÖNE göre kendi listesini alır.
  const tasanli = {
    ...TEMIZ_TASMA,
    kaydirma: TEMIZ_TASMA.kaydirma.map((k) => (k.anahtar === 'scrollingElement' ? {
      ...k,
      scrollGenislik: 813,
      tasanlar: [
        { anahtar: '#kenarUstTaslar', yatay: 13, dikey: 0 },
        { anahtar: '#masa', yatay: 0, dikey: 40 },
      ],
    } : k)),
  };
  assert.deepEqual(tasmaIhlalleri(tasanli), [{
    tur: 'yatay-tasma',
    anahtar: 'scrollingElement',
    miktar: 13,
    tasanlar: [{ anahtar: '#kenarUstTaslar', miktar: 13 }],
  }]);
  // Taşan öğe ÖLÇÜLMEMİŞSE alan hiç yazılmaz (eski ölçümlerin biçimi birebir kalır).
  assert.deepEqual(tasmaIhlalleri({ ...TEMIZ_TASMA, rafAlaniAlt: 372 }), [
    { tur: 'istaka-gorunum-disi', anahtar: '#rafAlani', miktar: 12 },
  ]);
  assert.equal(tasmaMetni({ tur: 'dikey-tasma', anahtar: '#masa', miktar: 9 }), '#masa dikey-tasma 9px');
  assert.equal(
    tasmaMetni({
      tur: 'yatay-tasma', anahtar: 'scrollingElement', miktar: 13.4,
      tasanlar: [{ anahtar: '#kenarUstTaslar', miktar: 13.4 }],
    }),
    'scrollingElement yatay-tasma 13px <- #kenarUstTaslar 13px',
  );
});

test('muaf ölçek merdiveni: CSS değerinden 0,45 tabanına, 0,05 basamakla (ADR-022/8)', () => {
  // Alt sınır bir KARARDIR (Mimar, ADR-022 sürüm 3 madde 8) ve TEK YERDE durur: arama merdiveni
  // de, öz-testin CSS denetimi de bu sabitten okur.
  assert.equal(MUAF_OLCEK_TABANI, 0.45);
  assert.equal(MUAF_OLCEK_BASAMAGI, 0.05);
  assert.deepEqual(muafOlcekMerdiveni(0.6), [0.6, 0.55, 0.5, 0.45]);
  // İlk basamak CSS'in kendi değeridir: "önce" ile "sonra" aynı koşuda ölçülür.
  assert.equal(muafOlcekMerdiveni(0.5)[0], 0.5);
  assert.deepEqual(muafOlcekMerdiveni(0.5), [0.5, 0.45]);
  assert.deepEqual(muafOlcekMerdiveni(0.45), [0.45]);
  // Tabanın altı UYDURULMAZ: değer zaten sınırın altındaysa yalnız kendisi ölçülür (öz-test
  // CSS'i sınırda tutar; daha azı gerekiyorsa iş durur ve sorar).
  assert.deepEqual(muafOlcekMerdiveni(0.4), [0.4]);
  // Kesirli toplama hatası birikmiyor (0,05 basamak ikilik tabanda tam değil).
  for (const deger of muafOlcekMerdiveni(0.6)) {
    assert.equal(deger, Math.round(deger * 100) / 100);
  }
});

test('arama tavanları ve ilk taşan basamak tek kaynaktan okunur', () => {
  const denemeler = [
    { olcek: 1.05, yeni: 0, buyuyen: 0, tasma: 0 },
    { olcek: 1.1, yeni: 0, buyuyen: 1, tasma: 0 },
    { olcek: 1.15, yeni: 1, buyuyen: 1, tasma: 0 },
    {
      olcek: 1.2, yeni: 1, buyuyen: 2, tasma: 1,
      tasmaListesi: [{ tur: 'yatay-tasma', anahtar: 'scrollingElement', miktar: 13 }],
    },
  ];
  assert.deepEqual(aramaTavanlari(denemeler), { yeni0: 1.1, buyumez0: 1.05, tasma0: 1.15 });
  // Taban zaten ihlalliyse ölçüt sağlanmaz → `null` (sayı uydurulmaz).
  assert.deepEqual(
    aramaTavanlari([{ olcek: 1.05, yeni: 1, buyuyen: 1, tasma: 1 }]),
    { yeni0: null, buyumez0: null, tasma0: null },
  );
  assert.deepEqual(aramaTavanlari(), { yeni0: null, buyumez0: null, tasma0: null });
  // `tasma0`+1 basamağı: taşmanın İLK göründüğü deneme ve orada taşan kayıt.
  assert.deepEqual(ilkTasmaDenemesi(denemeler), {
    olcek: 1.2,
    ihlal: { tur: 'yatay-tasma', anahtar: 'scrollingElement', miktar: 13 },
  });
  assert.equal(ilkTasmaDenemesi(denemeler.slice(0, 3)), null);
});

test('muaf satırı tek satırda okunur: üç tavan + açık taş + rakam payı + taşan öğe', () => {
  // Ekran görüntüsü yolunda (ADR-023) ölçüm yalnız yazı katmanından okunur: dört basamağın
  // hepsi tek satıra sığmak zorunda (katman `white-space: pre`, 800 px görünümde kırpar).
  const satir = muafSatiri({
    muaf: 0.5,
    taban: { ihlal: 1, tasma: 0 },
    denemeler: [
      { olcek: 1.25, yeni: 0, buyuyen: 0, tasma: 0 },
      { olcek: 1.3, yeni: 0, buyuyen: 0, tasma: 0 },
      {
        olcek: 1.35, yeni: 1, buyuyen: 0, tasma: 1,
        tasmaListesi: [{
          tur: 'yatay-tasma', anahtar: 'scrollingElement', miktar: 13,
          tasanlar: [{ anahtar: '#kenarUstTaslar', miktar: 13 }],
        }],
      },
    ],
    acikTas: { genislik: 29, yukseklik: 41, tasPayi: 1.24, rakamPayi: -0.4 },
  });
  assert.equal(
    satir,
    'MUAF 0.50 y0=1.30 b0=1.30 t0=1.30 tas=29x41 rk=1.2 ! 1.35 kok/yatay 13px <#kenarUstTaslar',
  );
  assert.ok(satir.length <= 96, `muaf satırı çok uzun: ${satir.length}`);
  // Ölçülmeyen alan "—" ile yazılır, 0 ya da tahminle DOLDURULMAZ (A9): `durum=el`de açık taş yok.
  assert.equal(
    muafSatiri({ muaf: 0.6, denemeler: [{ olcek: 1.2, yeni: 0, buyuyen: 0, tasma: 0 }] }),
    'MUAF 0.60 y0=1.20 b0=1.20 t0=1.20 tas=— rk=—',
  );
});

test('arama özeti ekrandan okunur: ölçülen bütçe terimleri + deneme tablosu + en çok ölçek', () => {
  const arama = {
    olculenler: {
      masaIc: { sol: 0, ust: 0, sag: 784, alt: 281 },
      rafBaslik: 17,
      merkez: 132,
      tasYukseklik: 36,
      metinPayi: 113,
      panelDolgu: 4,
      koseKaydirma: 5,
      masaBosluk: 6,
      rafBosluk: 4,
      yuvaBosluk: 0,
      taban: '25x36',
      sutun: 12,
      // tasokey#72 — kısa yatay varyantın ölçülen terimleri (plan §4).
      yanMetinPayi: 17,
      yanMetinGenislik: 120,
      rafBaslikPayi: 0,
      rafBaslikGenislik: 48,
      rafBaslikYukseklik: 17,
      merkezGenislik: 215,
      bantlar: '8px 58px 117px 80px',
    },
    taban: { ihlal: 2, tasma: 0 },
    denemeler: [
      { olcek: 1.05, yeni: 0, buyuyen: 0, tasma: 0 },
      {
        olcek: 1.1,
        yeni: 0,
        buyuyen: 1,
        tasma: 0,
        buyuyenCiftler: [{ a: '#rafAlani', b: '#merkez', kutu: { sol: 0, ust: 0, sag: 308, alt: 14 }, alan: 4312, tabanAlan: 2926 }],
      },
      {
        olcek: 1.15,
        yeni: 1,
        buyuyen: 1,
        tasma: 0,
        yeniCiftler: [{ a: '#rafAlani', b: '#gosterge', kutu: { sol: 0, ust: 0, sag: 6, alt: 10 }, alan: 60 }],
      },
      {
        olcek: 1.2,
        yeni: 1,
        buyuyen: 2,
        tasma: 1,
        tasmaListesi: [{ tur: 'dikey-tasma', anahtar: '#masa', miktar: 9 }],
      },
    ],
  };
  const satirlar = aramaSatirlari(arama);
  assert.match(satirlar[0], /BUTCE masaIc=784x281 rafBaslik=17 merkez=132 tas=36 metinPayi=113/);
  assert.match(satirlar[1], /pd=4 kk=5 mb=6 rb=4 yb=0 taban=25x36 n=12/);
  // Varyantın ölçülen terimleri de ekrandan okunur (tasokey#72): CSS'e yazılan payların kaynağı
  // bu satırlardır, bu yüzden görüntüde ad ad durmaları zorunludur.
  assert.match(satirlar[2], /BUTCE-V yanMetinPayi=17 yanMetinGen=120 rafBaslikPayi=0 rafBaslik=48x17/);
  assert.match(satirlar[3], /BUTCE-V merkezGen=215 bant=8 58 117 80/);
  assert.match(satirlar[4], /ARAMA taban\(olcek 1\) ihlal=2 tasma=0/);
  assert.ok(satirlar.some((satir) => satir.includes('1.05:0/0/0 1.10:0/1/0 1.15:1/1/0 1.20:1/2/1')));
  // İlk BOZULAN deneme adıyla yazılır: ölçeği sınırlayan çift sayı değil, ÖĞE olarak okunur
  // (tasokey#68 — "2 yeni çift" hangi öğenin bağlayıcı olduğunu söylemiyordu).
  assert.ok(satirlar.some((satir) => /ARAMA ilk-yeni olcek=1\.15 sayi=1/.test(satir)));
  assert.ok(satirlar.some((satir) => satir.includes('+ #rafAlani n #gosterge  6x10')));
  assert.ok(satirlar.some((satir) => /ARAMA ilk-buyuyen olcek=1\.10 sayi=1/.test(satir)));
  assert.ok(satirlar.some((satir) => satir.includes('> #rafAlani n #merkez  308x14')));
  assert.ok(satirlar.some((satir) => /ARAMA ilk-tasma olcek=1\.20 sayi=1/.test(satir)));
  assert.ok(satirlar.some((satir) => satir.includes('! #masa dikey-tasma 9px')));
  // tasokey#72: taşma dökümü artık TAŞAN ÖĞEYİ de yazıyor (ADR-022/9 üçüncü terimi).
  const tasanli = aramaSatirlari({
    ...arama,
    denemeler: arama.denemeler.map((d) => (d.tasma > 0 ? {
      ...d,
      tasmaListesi: [{
        tur: 'dikey-tasma', anahtar: '#masa', miktar: 9,
        tasanlar: [{ anahtar: '#kenarUstTaslar', miktar: 9 }],
      }],
    } : d)),
  });
  assert.ok(tasanli.some((satir) => satir.includes('! #masa dikey-tasma 9px <- #kenarUstTaslar 9px')));
  // Döküm en çok `enCokAyrinti` satır yazar (yazı katmanı taşmasın).
  const cokCift = aramaSatirlari({
    ...arama,
    denemeler: [{
      olcek: 1.05,
      yeni: 5,
      buyuyen: 0,
      tasma: 0,
      yeniCiftler: Array.from({ length: 5 }, (_, i) => ({ a: `#a${i}`, b: '#b', kutu: { sol: 0, ust: 0, sag: 1, alt: 1 }, alan: 1 })),
    }],
  }, { enCokAyrinti: 2 });
  assert.equal(cokCift.filter((satir) => satir.startsWith('  +')).length, 2);
  // En çok ölçek üç ölçüte göre ayrı okunur: yeni çift yok · yeni+büyüyen yok · taşma yok.
  // (Satır tasokey#72'de BAŞA alındı — ekran kırpılırsa ölçeği seçen sayı değil ayrıntı gitsin.)
  const enCok = satirlar.find((satir) => satir.startsWith('ARAMA enCok'));
  assert.match(enCok, /yeni0=1\.10 yeni0buyumez0=1\.05 tasma0=1\.15/);
  assert.ok(
    satirlar.indexOf(enCok) < satirlar.findIndex((satir) => satir.startsWith('ARAMA ilk-')),
    'ARAMA enCok satırı ayrıntı dökümünden sonra geliyor (kırpılma riski)',
  );
  // Satır başına beş deneme: `white-space: pre` katmanı 800px görünümde yatayda kırpmasın.
  const uzun = aramaSatirlari({
    ...arama,
    denemeler: Array.from({ length: 20 }, (_, i) => ({
      olcek: Math.round((1.05 + i * 0.05) * 100) / 100, yeni: 0, buyuyen: 0, tasma: 0,
    })),
  });
  assert.equal(uzun.length, 5 + 4 + 1);
  // 96 karakter = 12px Consolas'ta ~635 px: en küçük görünümde (800 px) yatayda kırpılmaz.
  for (const satir of uzun) assert.ok(satir.length <= 96, `arama satırı çok uzun: ${satir.length}`);
});

test('uzunluk değişkenleri ölçü öğesiyle çözülür, getPropertyValue ile OKUNMAZ (tasokey#68)', () => {
  // Belirti (tasokey#67'de sessizce kaldı): kaydedilmemiş özel değişkenin hesaplanan değeri
  // yalnız `var()` yerine konmuş belirteç dizisidir — `--hedef-pay: calc(var(--masa-bosluk) / 2)`
  // için `getPropertyValue` `"calc(24px / 2)"` döndürür, `parseFloat` NaN → pay 0 → hedef halkası
  // sahibinin kutusuna eşit olur ve "halka ∩ komşu = 0" ölçütü gevşer. ADR-022 ile taş ölçüsü de
  // `clamp(...)` olduğu için aynı tuzak bütün ölçülere yayılırdı.
  const kaynak = readFileSync(
    join(import.meta.dirname, 'yardimci', 'yerlesim-olcum-sayfa.js'), 'utf8',
  );
  // Yorumlar atılır: tuzağı ANLATAN satır da kalıbı içeriyor (kod sanılmasın).
  const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // `--rakip-acik-olcek` tasokey#72'de eklendi: muaf açık el yığınının kendi ölçeği, BİRİMSİZ bir
  // çarpan (ADR-022/8). Arama merdiveni CSS'teki değerden başladığı için okunmak zorundadır.
  const BIRIMSIZLER = ['--istaka-olcek', '--raf-sutun-sayisi', '--rakip-acik-olcek'];
  const okunanlar = [...kod.matchAll(/getPropertyValue\('(--[\w-]+)'\)/g)].map(([, ad]) => ad);
  assert.ok(okunanlar.length > 0, 'kaynak değişken okumuyor (test eskidi mi?)');
  for (const ad of okunanlar) {
    assert.ok(
      BIRIMSIZLER.includes(ad),
      `${ad} getPropertyValue ile okunuyor; uzunluksa ölçü öğesiyle (olculenPx) çözülmeli`,
    );
  }
  // Uzunluklar gerçekten ölçü öğesinden geçiyor (hedef payı ve taş ölçüsü dahil).
  for (const ad of ['--hedef-pay', '--tas-genislik', '--tas-yukseklik', '--raf-bosluk']) {
    assert.ok(kaynak.includes(`degiskenPx('${ad}')`), `${ad} ölçü öğesiyle çözülmüyor`);
  }
  assert.match(kaynak, /function olculenPx\(ifade\) \{[\s\S]*?getComputedStyle\(olcer\)\.width/);
});

// --- 4. Ölçüm protokolünün verisi (plan §5) ---------------------------------------------------

test('altı boyut ve iki durum planın §5\'indeki küme', () => {
  // tasokey#71 (tasokey#70 planı §5): 900x600 ARTIK ASIL ÖLÇÜM BOYUTU — kısa yatay düzen
  // varyantının en geniş kabul boyutu ve `max-width: 900px` kademesinin tek kabul boyutu.
  // Sıra `sigdirma-butcesi.js` OLCULEN_MASA_KUTUSU ile birebir aynı (iki tablo yan yana okunur).
  assert.deepEqual(BOYUTLAR.map((boyut) => `${boyut[0]}x${boyut[1]}`), [
    '1920x1080', '1280x800', '1180x820', '900x600', '844x390', '800x360',
  ]);
  assert.deepEqual([...DURUMLAR], ['el', 'rakip']);
});

test('ölçek araması kipi boyut listesini DEĞİŞTİRMEZ, betiğe yalnız arama bayrağını geçer', () => {
  // tasokey#68'de 900x600 yalnız arama kipinde eklenen bir "ek boyut"tu; tasokey#71'de asıl
  // ölçüm boyutu oldu → ayrı liste kalmadı, iki kip de aynı altı boyutu ölçer (tek kaynak).
  assert.ok(BOYUTLAR.some((boyut) => boyut[0] === 900 && boyut[1] === 600));
  const plan = planNesnesi({ arama: true });
  assert.equal(plan.boyutlar.length, BOYUTLAR.length);
  assert.deepEqual(plan.boyutlar, BOYUTLAR.map((boyut) => [...boyut]));
  for (const cekim of plan.cekimler) {
    assert.ok(cekim.js.includes('arama: true'));
    assert.doesNotThrow(() => new Function(`return (async () => {\n${cekim.js}\n});`));
  }
  // Sürücünün argüman çözümü de aynı listeyi verir (iki yol tek kaynaktan — ADR-023/4).
  assert.equal(seceneklerioku(['--arama']).boyutlar.length, BOYUTLAR.length);
  assert.equal(seceneklerioku([]).boyutlar.length, BOYUTLAR.length);
  assert.equal(seceneklerioku(['--arama', '--boyut', '800x360']).boyutlar.length, 1);
  // 900x600 artık `--boyut 900x600` ile de tanınır (adıyla birlikte).
  assert.deepEqual(seceneklerioku(['--boyut', '900x600']).boyutlar, [[900, 600, 'kademe-900']]);
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
  for (const cekim of plan.cekimler) assert.ok(cekim.js.includes('arama: false'));
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
