import test from 'node:test';
import assert from 'node:assert/strict';

import { elDokumu, dokumSirasi } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';
import { dagit } from '../docs/cekirdek/dagitim.js';

// tasokey#39 ek bilgileri (Sahip, 2026-11-20):
//   (1) "el bittiğinde rakip ıstakasında taşlar dizili olsun"
//   (2) "el bittiğinde perler ve per olmayanların sayısı ayrı ayrı yazsın, çift varsa onlar da ayrı
//        yazsın, okey sayısı da ayrı yazsın"
// İkisinin de kaynağı tek saf işlev: `cekirdek/cozucu.js` → `elDokumu` (+ `dokumSirasi`).
// Bitiş kararından (`elBitirilebilirMi`) ayrıdır: el bitmemiş de olabilir, bu yüzden "en çok taşı
// kapsayan" bölüm aranır. Geçerlilik yine `dizilim.js`'ten sorulur (ADR-017/ADR-018 dili).

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);
const cift = (renk, sayi) => [t(renk, sayi, 1), t(renk, sayi, 2)];

// Tamamen perli 14 taş: seri(5) + seri(3) + sayı peri(3) + sayı peri(3).
const TAMAMEN_PER = [
  t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
  t('siyah', 8), t('siyah', 9), t('siyah', 10),
  t('mavi', 11), t('sari', 11), t('kirmizi', 11),
  t('mavi', 2), t('sari', 2), t('siyah', 2),
];

// Tam 7 birebir çift (hiçbir üçlüsü per kurmuyor: sayılar birbirinden farklı, renkler ardışık değil).
const TAM_YEDI_CIFT = [
  ...cift('kirmizi', 3), ...cift('siyah', 5), ...cift('mavi', 1), ...cift('sari', 11),
  ...cift('kirmizi', 8), ...cift('siyah', 13), ...cift('mavi', 10),
];

test('kabul-1: tamamen perli el — bütün taşlar perlerde, per dışı 0, çift 0', () => {
  const dokum = elDokumu(TAMAMEN_PER, OKEY_TASI);
  assert.equal(dokum.perSayisi, 4, `4 per bekleniyordu, bulunan: ${dokum.perSayisi}`);
  assert.equal(dokum.perTasSayisi, 14);
  assert.equal(dokum.perDisiSayisi, 0);
  assert.equal(dokum.ciftSayisi, 0);
  assert.equal(dokum.kalanSayisi, 0);
  assert.equal(dokum.okeySayisi, 0);
});

test('kabul-2: tam 7 çiftli el — per 0, çift 7, per dışı 14 taş', () => {
  const dokum = elDokumu(TAM_YEDI_CIFT, OKEY_TASI);
  assert.equal(dokum.perSayisi, 0, 'çift eli perlere bölünmemeli (birebir aynı taş ne seri ne sayı peri)');
  assert.equal(dokum.ciftSayisi, 7);
  assert.equal(dokum.ciftTasSayisi, 14);
  assert.equal(dokum.perDisiSayisi, 14);
  assert.equal(dokum.kalanSayisi, 0);
});

test('kabul-3: okey ve sahte okey sayısı ayrı sayılır (perde/çiftte kullanılsa da)', () => {
  // mavi-7 bu elde okey taşıdır (OKEY_TASI), sahte okey de joker: ikisi de okey sayısına girer.
  const el = [t('mavi', 7), sOkey(1), t('kirmizi', 4), t('kirmizi', 4, 2)];
  const dokum = elDokumu(el, OKEY_TASI);
  assert.equal(dokum.okeySayisi, 2, 'okey taşı + sahte okey = 2');
});

test('kabul-4: çift eşleştirme iki aşamalı — jokeri sınıf eşleşmesine kurban etmez', () => {
  // Per kurulamayan el: kirmizi-5 x2 + kirmizi-9 + sahte okey. Tek aşamalı açgözlü eşleştirme
  // jokeri önce kirmizi-5'e verip 1 çift bulurdu; doğru cevap 2 çift (5-5 ve 9+joker).
  const el = [sOkey(1), t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('kirmizi', 9)];
  const dokum = elDokumu(el, OKEY_TASI);
  assert.equal(dokum.perSayisi, 0, 'bu el per kurmamalı (5-5-9 ne seri ne sayı peri)');
  assert.equal(dokum.ciftSayisi, 2, `2 çift bekleniyordu, bulunan: ${dokum.ciftSayisi}`);
  assert.equal(dokum.kalanSayisi, 0);
});

test('kabul-5: per dışı kalan taşlar ayrı sayılır (kısmi el)', () => {
  const el = [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), // seri
    t('siyah', 6), t('mavi', 12), t('sari', 4), // hiçbir gruba girmeyen
  ];
  const dokum = elDokumu(el, OKEY_TASI);
  assert.equal(dokum.perSayisi, 1);
  assert.equal(dokum.perTasSayisi, 3);
  assert.equal(dokum.perDisiSayisi, 3);
  assert.equal(dokum.ciftSayisi, 0);
  assert.equal(dokum.kalanSayisi, 3);
});

test('kabul-6: sayılar eli iki kez saymaz — perTasSayisi + perDisiSayisi = el boyu', () => {
  for (let tohum = 7100; tohum < 7140; tohum++) {
    const { eller, gosterge, okeyTasi } = dagit(tohum);
    for (const el of eller) {
      const dokum = elDokumu(el, okeyTasi, undefined, gosterge);
      assert.equal(
        dokum.perTasSayisi + dokum.perDisiSayisi,
        el.length,
        `tohum ${tohum}: per (${dokum.perTasSayisi}) + per dışı (${dokum.perDisiSayisi}) ≠ ${el.length}`,
      );
      assert.equal(
        dokum.ciftTasSayisi + dokum.kalanSayisi,
        dokum.perDisiSayisi,
        `tohum ${tohum}: çift taşları + tek kalanlar per dışı sayısını vermiyor`,
      );
      assert.equal(dokum.perTasSayisi, dokum.perler.flat().length);
    }
  }
});

test('ASIL KABUL (ek bilgi 1): dizilim sırası perler → çiftler → per dışı kalanlar', () => {
  const el = [
    t('sari', 4), // per dışı tek
    ...cift('siyah', 13), // çift
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), // per
  ];
  const dokum = elDokumu(el, OKEY_TASI);
  const sirali = dokumSirasi(dokum).map((tas) => tas.id);
  assert.deepEqual(sirali, [
    'kirmizi-1-1', 'kirmizi-2-1', 'kirmizi-3-1',
    'siyah-13-1', 'siyah-13-2',
    'sari-4-1',
  ]);
  assert.equal(sirali.length, el.length, 'dizilim elin bütün taşlarını içermeli (taş kaybolmaz)');
});

test('ek bilgi 1: dizilim elin taşlarını ne kaybeder ne çoğaltır (40 gerçek el)', () => {
  for (let tohum = 7200; tohum < 7240; tohum++) {
    const { eller, gosterge, okeyTasi } = dagit(tohum);
    for (const el of eller) {
      const sirali = dokumSirasi(elDokumu(el, okeyTasi, undefined, gosterge));
      assert.deepEqual(
        sirali.map((tas) => tas.id).slice().sort(),
        el.map((tas) => tas.id).slice().sort(),
        `tohum ${tohum}: dizilmiş el ile gerçek el aynı taş kümesi değil`,
      );
    }
  }
});

test('determinizm: taş sırası değişse de döküm ve dizilim aynı kalır', () => {
  const beklenen = elDokumu(TAMAMEN_PER, OKEY_TASI);
  const beklenenSira = dokumSirasi(beklenen).map((tas) => tas.id);
  for (let tohum = 1; tohum <= 10; tohum++) {
    const dokum = elDokumu(karistir(TAMAMEN_PER, tohum), OKEY_TASI);
    assert.equal(dokum.perSayisi, beklenen.perSayisi);
    assert.equal(dokum.perTasSayisi, beklenen.perTasSayisi);
    assert.equal(dokum.ciftSayisi, beklenen.ciftSayisi);
    assert.equal(dokum.kalanSayisi, beklenen.kalanSayisi);
    assert.deepEqual(dokumSirasi(dokum).map((tas) => tas.id), beklenenSira, `tohum ${tohum}: dizilim kayıyor`);
  }
});

test('sınır: boş el (kazanan) çökmez, bütün sayılar 0', () => {
  const dokum = elDokumu([], OKEY_TASI);
  assert.deepEqual(
    [dokum.perSayisi, dokum.perTasSayisi, dokum.ciftSayisi, dokum.perDisiSayisi, dokum.kalanSayisi, dokum.okeySayisi],
    [0, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(dokumSirasi(dokum), []);
});

test('sınır: dizi olmayan girdi çökmez (boş döküm)', () => {
  assert.equal(elDokumu(null, OKEY_TASI).perSayisi, 0);
  assert.equal(elDokumu(undefined, OKEY_TASI).kalanSayisi, 0);
});

// MIMARI.md §7 risk 1 bütçesi: tek çağrı 20 ms. Arayüz el bitince çizim başına en çok 7 çağrı
// yapar (4 sonuç satırı + 3 rakip ıstakası), bu yüzden tek çağrının ucuz kalması gerekir.
// Ölçüm ayrıca `testler/el-dokumu.olcum.js`de (200 el x 4 oyuncu).
test('bütçe: en pahalı el biçimlerinde tek döküm çağrısı 20 ms altında', () => {
  const ornekler = [
    TAMAMEN_PER,
    TAM_YEDI_CIFT,
    // Çok sayıda kısmi grup + 2 joker: aramanın en pahalı hâli (Sahip'in ekran görüntüsündeki
    // elin iki jokerli biçimi — bkz. el-bitiren-taslar.olcum.js).
    [
      t('siyah', 2), t('sari', 2), t('kirmizi', 2),
      t('mavi', 4, 1), sOkey(1), t('siyah', 11), t('kirmizi', 11),
      t('mavi', 4, 2), t('siyah', 4), t('sari', 4),
      t('mavi', 12), t('sari', 12),
      sOkey(2), t('siyah', 10), t('mavi', 10),
    ],
  ];
  for (const el of ornekler) {
    for (let tohum = 1; tohum <= 5; tohum++) {
      const karisik = karistir(el, tohum);
      const basla = process.hrtime.bigint();
      elDokumu(karisik, OKEY_TASI);
      const gecenMs = Number(process.hrtime.bigint() - basla) / 1e6;
      assert.ok(gecenMs < 20, `döküm ${gecenMs.toFixed(2)} ms sürdü (bütçe 20 ms)`);
    }
  }
});
