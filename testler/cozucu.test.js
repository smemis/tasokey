import test from 'node:test';
import assert from 'node:assert/strict';
import { elBitirilebilirMi } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';

// tasokey#7 — R-005: bitirilebilirlik çözücüsü. Elin tamamını geçerli per/çift gruplarına tam
// bölmeye çalışır (joker dahil); doğrulama tek kaynağı `cekirdek/dizilim.js` (tasokey#6).

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// Her vaka: ad, el (taş listesi), beklenen (true=bitebilir).
const BITEBILEN = [
  { ad: 'tek çift: kirmizi-5 / siyah-5', el: [t('kirmizi', 5), t('siyah', 5)] },
  { ad: 'tek per: mavi 2-3-4', el: [t('mavi', 2), t('mavi', 3), t('mavi', 4)] },
  {
    ad: 'per + çift: sari 1-2-3, kirmizi-8/mavi-8',
    el: [t('sari', 1), t('sari', 2), t('sari', 3), t('kirmizi', 8), t('mavi', 8)],
  },
  {
    ad: 'sahte okey per boşluğunu dolduruyor: kirmizi 10-_-12',
    el: [t('kirmizi', 10), sOkey(1), t('kirmizi', 12)],
  },
  {
    ad: 'sahte okey çift ortağı: siyah-6 / sahte okey',
    el: [t('siyah', 6), sOkey(2)],
  },
  {
    ad: 'gerçek okey taşı (mavi-7) başka renkte boşluk dolduruyor: kirmizi 9-_-11',
    el: [t('kirmizi', 9), t('mavi', 7), t('kirmizi', 11)],
  },
  {
    ad: 'per(4) + çift + çift: kirmizi 1-2-3-4, siyah-9/mavi-9, sari-5/kirmizi-5',
    el: [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('siyah', 9), t('mavi', 9), t('sari', 5), t('kirmizi', 5)],
  },
  { ad: 'iki sahte okey tek grup: joker çifti', el: [sOkey(1), sOkey(2)] },
  {
    ad: 'çift ağırlıklı el: 4 çift (3,4,6,11)',
    el: [
      t('kirmizi', 3), t('siyah', 3),
      t('kirmizi', 4), t('siyah', 4),
      t('kirmizi', 6), t('siyah', 6),
      t('kirmizi', 11), t('siyah', 11),
    ],
  },
  {
    ad: 'karışık 14 taşlık tam el: per(5)+per(3)+çift+çift+çift',
    el: [
      t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
      t('siyah', 7), t('siyah', 8), t('siyah', 9),
      t('mavi', 10), t('sari', 10),
      t('mavi', 2), t('sari', 2),
      t('mavi', 5), t('sari', 5),
    ],
  },
];

const BITEMEYEN = [
  { ad: 'tek izole taş', el: [t('kirmizi', 5)] },
  { ad: 'üç ilgisiz izole taş, joker yok', el: [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)] },
  { ad: 'aynı rengin iki nüshası (çift de per de değil)', el: [t('kirmizi', 5, 1), t('kirmizi', 5, 2)] },
  { ad: 'boşluklu per, joker yok (kirmizi 1-2-4)', el: [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 4)] },
  {
    ad: 'geçerli çift + yanında izole taş',
    el: [t('kirmizi', 5), t('siyah', 5), t('mavi', 9)],
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
  {
    ad: 'bir joker iki ayrı gruba yetmiyor, geri kalan taş izole',
    el: [
      t('kirmizi', 1), sOkey(1), t('kirmizi', 3),
      t('siyah', 5), t('siyah', 7),
    ],
  },
  { ad: 'dört ilgisiz izole taş', el: [t('sari', 3), t('mavi', 6), t('kirmizi', 11), t('siyah', 2)] },
  {
    ad: 'geçerli per + izole taş (13 taş, biri fazla)',
    el: [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5), t('sari', 12)],
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

test('deterministik: aynı el (aynı sıra) iki kez çağrılınca aynı sonucu verir', () => {
  const el = BITEBILEN[9].el;
  const birinci = elBitirilebilirMi(el, OKEY_TASI);
  const ikinci = elBitirilebilirMi(el, OKEY_TASI);
  assert.equal(birinci, ikinci);
  assert.equal(birinci, true);
});

test('deterministik: aynı el karıştırılmış sırayla da aynı sonucu verir', () => {
  const el = BITEBILEN[9].el;
  const karisik = karistir(el, 12345);
  assert.equal(elBitirilebilirMi(karisik, OKEY_TASI), elBitirilebilirMi(el, OKEY_TASI));
});

test('elBitirilebilirMi dizi olmayan girdide false döner', () => {
  assert.equal(elBitirilebilirMi(null, OKEY_TASI), false);
});

test('boş el bitebilir sayılır (tam bölünecek taş kalmadı)', () => {
  assert.equal(elBitirilebilirMi([], OKEY_TASI), true);
});
