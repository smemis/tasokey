import test from 'node:test';
import assert from 'node:assert/strict';
import { elBitirilebilirMi } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';

// tasokey#7 — R-005: bitirilebilirlik çözücüsü. Doğrulama tek kaynağı `cekirdek/dizilim.js`.
// tasokey#37 (ADR-017, GDD §1 kural 13): bitiş iki ayrı denetimin VEYA'sıdır — el ya TAMAMEN per
// gruplarına bölünür (seri ya da sayı peri, her grup en az 3 taş) ya da TAM 7 birebir çifttir
// (14 taş). Per ile çift karışık dizilim bitiş sayılmaz.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);
// Birebir çift: aynı renk + aynı sayı, iki nüsha.
const cift = (renk, sayi) => [t(renk, sayi, 1), t(renk, sayi, 2)];

// Her vaka: ad, el (taş listesi), beklenen (true=bitebilir).
const BITEBILEN = [
  { ad: 'tek seri: mavi 2-3-4', el: [t('mavi', 2), t('mavi', 3), t('mavi', 4)] },
  { ad: 'tek sayı peri: 5 üç renkte', el: [t('kirmizi', 5), t('siyah', 5), t('sari', 5)] },
  {
    ad: 'seri + sayı peri: sari 1-2-3, 8 üç renkte',
    el: [t('sari', 1), t('sari', 2), t('sari', 3), t('kirmizi', 8), t('siyah', 8), t('sari', 8)],
  },
  {
    ad: 'sahte okey seri boşluğunu dolduruyor: kirmizi 10-_-12',
    el: [t('kirmizi', 10), sOkey(1), t('kirmizi', 12)],
  },
  {
    ad: 'sahte okey sayı perini tamamlıyor: 12 mavi/sari + joker',
    el: [t('mavi', 12), t('sari', 12), sOkey(2)],
  },
  {
    ad: 'gerçek okey taşı (mavi-7) başka renkte seri boşluğu dolduruyor: kirmizi 9-_-11',
    el: [t('kirmizi', 9), t('mavi', 7), t('kirmizi', 11)],
  },
  {
    ad: 'seri(4) + sayı peri(4): kirmizi 1-2-3-4, 9 dört renkte',
    el: [
      t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
      t('kirmizi', 9), t('siyah', 9), t('mavi', 9), t('sari', 9),
    ],
  },
  { ad: 'üç joker tek grup (iki sahte okey + gerçek okey taşı)', el: [sOkey(1), sOkey(2), t('mavi', 7)] },
  {
    ad: 'tam 7 birebir çift (14 taş)',
    el: [
      ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
      ...cift('kirmizi', 8), ...cift('siyah', 13), ...cift('mavi', 1),
    ],
  },
  {
    ad: 'tam 7 çift, yedincisi jokerle tamamlanıyor (14 taş)',
    el: [
      ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
      ...cift('kirmizi', 8), ...cift('siyah', 13), t('sari', 9), sOkey(1),
    ],
  },
  {
    ad: 'karışık 14 taşlık tam el (hepsi per): seri(5)+seri(3)+sayı peri(3)+sayı peri(3)',
    el: [
      t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
      t('siyah', 7), t('siyah', 8), t('siyah', 9),
      t('mavi', 10), t('sari', 10), t('kirmizi', 10),
      t('mavi', 2), t('sari', 2), t('siyah', 2),
    ],
  },
  {
    ad: '14 taşlık tam el, iki joker iki ayrı per boşluğunu dolduruyor',
    el: [
      t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
      t('siyah', 7), sOkey(1), t('siyah', 9),
      t('mavi', 11), t('sari', 11), sOkey(2),
      t('mavi', 5), t('sari', 5), t('siyah', 5), t('kirmizi', 5),
    ],
  },
];

const BITEMEYEN = [
  { ad: 'tek izole taş', el: [t('kirmizi', 5)] },
  { ad: 'üç ilgisiz izole taş, joker yok', el: [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)] },
  { ad: 'tek birebir çift: 7 çift değil, per de değil', el: cift('kirmizi', 5) },
  {
    ad: 'aynı sayı farklı renk ikilisi (eski "çift" tanımı) artık bitirmez',
    el: [t('kirmizi', 5), t('siyah', 5)],
  },
  { ad: 'boşluklu seri, joker yok (kirmizi 1-2-4)', el: [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 4)] },
  {
    ad: 'geçerli sayı peri + yanında izole taş',
    el: [t('kirmizi', 5), t('siyah', 5), t('sari', 5), t('mavi', 9)],
  },
  {
    ad: 'bir joker iki ayrı boşluğu dolduramaz (kirmizi 1-_-4, boşluk 2 taş)',
    el: [t('kirmizi', 1), sOkey(1), t('kirmizi', 4)],
  },
  {
    ad: '2 joker 3 ayrı tek-boşluklu gruba yetmiyor',
    el: [
      t('kirmizi', 1), sOkey(1), t('kirmizi', 3),
      t('siyah', 5), sOkey(2), t('siyah', 7),
      t('mavi', 10), t('mavi', 12),
    ],
  },
  { ad: 'dört ilgisiz izole taş', el: [t('sari', 3), t('mavi', 6), t('kirmizi', 11), t('siyah', 2)] },
  {
    ad: 'geçerli seri + izole taş (6 taş, biri fazla)',
    el: [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5), t('sari', 12)],
  },
  {
    ad: 'sayı peri aynı rengi iki kez alamaz (kirmizi-5 x2 + siyah-5)',
    el: [t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('siyah', 5)],
  },
  // --- GDD kural 13: karışık dizilim reddedilir ---
  {
    ad: 'karışık (14 taş): seri(4) + 5 birebir çift — per ile çift aynı elde kullanılamaz',
    el: [
      t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
      ...cift('siyah', 6), ...cift('mavi', 9), ...cift('sari', 12), ...cift('kirmizi', 13),
      ...cift('siyah', 2),
    ],
  },
  {
    ad: 'karışık (14 taş): sayı peri(4) + 5 birebir çift',
    el: [
      t('kirmizi', 7), t('siyah', 7), t('mavi', 7), t('sari', 7),
      ...cift('siyah', 6), ...cift('mavi', 9), ...cift('sari', 12), ...cift('kirmizi', 13),
      ...cift('siyah', 2),
    ],
  },
  {
    ad: '6 birebir çift + bir "aynı sayı farklı renk" ikilisi (14 taş) — yedinci çift geçersiz',
    el: [
      ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
      ...cift('kirmizi', 8), ...cift('siyah', 13), t('mavi', 9), t('sari', 9),
    ],
  },
  {
    ad: '6 birebir çift (12 taş) — tam 7 çift değil',
    el: [
      ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
      ...cift('kirmizi', 8), ...cift('siyah', 13),
    ],
  },
];

test(`çözücü tablo testi (${BITEBILEN.length} bitebilen + ${BITEMEYEN.length} bitemeyen)`, () => {
  assert.ok(BITEBILEN.length >= 10, 'en az 10 bitebilen örnek olmalı');
  assert.ok(BITEMEYEN.length >= 10, 'en az 10 bitemeyen örnek olmalı');
});

for (const vaka of BITEBILEN) {
  test(`bitebilir: ${vaka.ad}`, () => {
    assert.equal(elBitirilebilirMi(vaka.el, OKEY_TASI), true, vaka.ad);
  });
}

for (const vaka of BITEMEYEN) {
  test(`bitemez: ${vaka.ad}`, () => {
    assert.equal(elBitirilebilirMi(vaka.el, OKEY_TASI), false, vaka.ad);
  });
}

const TAM_EL = BITEBILEN.find((vaka) => vaka.ad.startsWith('karışık 14 taşlık tam el')).el;
const YEDI_CIFT_EL = BITEBILEN.find((vaka) => vaka.ad === 'tam 7 birebir çift (14 taş)').el;

test('deterministik: aynı el (aynı sıra) iki kez çağrılınca aynı sonucu verir', () => {
  const birinci = elBitirilebilirMi(TAM_EL, OKEY_TASI);
  const ikinci = elBitirilebilirMi(TAM_EL, OKEY_TASI);
  assert.equal(birinci, ikinci);
  assert.equal(birinci, true);
});

test('deterministik: aynı el karıştırılmış sırayla da aynı sonucu verir', () => {
  const karisik = karistir(TAM_EL, 12345);
  assert.equal(elBitirilebilirMi(karisik, OKEY_TASI), elBitirilebilirMi(TAM_EL, OKEY_TASI));
});

test('deterministik: 7 çiftli el karıştırılmış sırayla da bitebilir sayılır', () => {
  const karisik = karistir(YEDI_CIFT_EL, 987);
  assert.equal(elBitirilebilirMi(karisik, OKEY_TASI), true);
});

// GDD kural 9: gösterge taşının kendisi çift sayılmaz — çiftli bitişte de geçerli.
test('gösterge taşının kendisi yedinci çifti kuramaz', () => {
  const gostergeTasi = t('sari', 9, 1);
  const el = [
    ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
    ...cift('kirmizi', 8), ...cift('siyah', 13), gostergeTasi, t('sari', 9, 2),
  ];
  assert.equal(elBitirilebilirMi(el, OKEY_TASI), true, 'gösterge verilmezse normal 7 çift');
  assert.equal(elBitirilebilirMi(el, OKEY_TASI, undefined, gostergeTasi), false);
});

test('elBitirilebilirMi dizi olmayan girdide false döner', () => {
  assert.equal(elBitirilebilirMi(null, OKEY_TASI), false);
});

test('boş el bitebilir sayılır (tam bölünecek taş kalmadı)', () => {
  assert.equal(elBitirilebilirMi([], OKEY_TASI), true);
});
