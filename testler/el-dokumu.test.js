import test from 'node:test';
import assert from 'node:assert/strict';

import { elDokumu, dokumSirasi, dokumGruplari, DOKUM_ONCELIGI } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';
import { dagit } from '../docs/cekirdek/dagitim.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

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
// ADR-027 (tasokey#81) kapatma anahtarı açık: sahte okey yine evrensel joker (K1 davranışı).
const KURAL_ESKI_JOKER = { ...KURAL_VARSAYILAN, sahteOkeyJokerGibiDavranir: true };

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

// ADR-027 (tasokey#81): `okeySayisi` yalnız GERÇEK okeyleri sayar — sahte okey joker değildir.
// Kapatma anahtarı açıkken eski sayım (okey + sahte okey) geri gelir.
test('kabul-3: okey sayısı yalnız gerçek okeyleri sayar (sahte okey joker değil)', () => {
  const el = [t('mavi', 7), sOkey(1), t('kirmizi', 4), t('kirmizi', 4, 2)];
  assert.equal(elDokumu(el, OKEY_TASI).okeySayisi, 1, 'yalnız gerçek okey taşı (mavi-7) sayılır');
  assert.equal(
    elDokumu(el, OKEY_TASI, KURAL_ESKI_JOKER).okeySayisi,
    2,
    'anahtar açıkken sahte okey yine joker: okey taşı + sahte okey = 2',
  );
});

test('kabul-4: çift eşleştirme iki aşamalı — jokeri sınıf eşleşmesine kurban etmez', () => {
  // Per kurulamayan el: kirmizi-5 x2 + kirmizi-9 + gerçek okey (mavi-7). Tek aşamalı açgözlü
  // eşleştirme jokeri önce kirmizi-5'e verip 1 çift bulurdu; doğru cevap 2 çift (5-5 ve 9+joker).
  const el = [t('mavi', 7), t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('kirmizi', 9)];
  const dokum = elDokumu(el, OKEY_TASI);
  assert.equal(dokum.perSayisi, 0, 'bu el per kurmamalı (5-5-9 ne seri ne sayı peri)');
  assert.equal(dokum.ciftSayisi, 2, `2 çift bekleniyordu, bulunan: ${dokum.ciftSayisi}`);
  assert.equal(dokum.kalanSayisi, 0);
});

// ADR-027: sahte okey çiftte joker değildir — yalnız kendi değerindeki (mavi-7) taşla, yani öbür
// sahte okeyle ya da gerçek okeyle eşleşir; kirmizi-9 ile eşleşmez ve kalanlara düşer.
test('kabul-4b: sahte okey çiftte yalnız kendi değeriyle eşleşir', () => {
  const el = [sOkey(1), t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('kirmizi', 9)];
  const dokum = elDokumu(el, OKEY_TASI);
  assert.equal(dokum.ciftSayisi, 1, 'yalnız kirmizi-5 çifti kurulur');
  assert.equal(dokum.kalanSayisi, 2, 'sahte okey ve kirmizi-9 kalanlara düşer');

  const ikiSahte = elDokumu([sOkey(1), sOkey(2)], OKEY_TASI);
  assert.equal(ikiSahte.ciftSayisi, 1, 'iki sahte okey aynı değerdedir (mavi-7): çift kurar');

  const eski = elDokumu(el, OKEY_TASI, KURAL_ESKI_JOKER);
  assert.equal(eski.ciftSayisi, 2, 'anahtar açıkken sahte okey yine joker: 5-5 ve 9+joker');
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

/* ----------------------------------------------- tasokey#85 (ADR-028): döküm ÖNCELİĞİ + gruplar */

// Istakadaki "Perleri diz" / "Çiftleri diz" düğmelerinin (tasokey#85) tek kural kaynağı burasıdır:
// aynı taşlar hem pere hem çifte girebildiğinde hangisinin ÖNCE ayrılacağı seçenektir.
// Tablo elle kurulur ki beklenen sayı ölçümden değil KURALDAN gelsin (A9: tahmin yok).
const CIFT_ONCELIGI_TABLOSU = [
  {
    ad: 'üç ikili seri: per önceliği 2 seri, çift önceliği 3 çift',
    el: [...cift('kirmizi', 5), ...cift('kirmizi', 6), ...cift('kirmizi', 7)],
    per: { perSayisi: 2, ciftSayisi: 0, kalanSayisi: 0 },
    cift: { perSayisi: 0, ciftSayisi: 3, kalanSayisi: 0 },
  },
  {
    ad: 'çift kurulamayan seri: iki öncelik AYNI (tek seri)',
    el: [t('siyah', 1), t('siyah', 2), t('siyah', 3)],
    per: { perSayisi: 1, ciftSayisi: 0, kalanSayisi: 0 },
    cift: { perSayisi: 1, ciftSayisi: 0, kalanSayisi: 0 },
  },
  {
    ad: 'tamamen perli el (birebir aynı taş yok): iki öncelik AYNI',
    el: TAMAMEN_PER,
    per: { perSayisi: 4, ciftSayisi: 0, kalanSayisi: 0 },
    cift: { perSayisi: 4, ciftSayisi: 0, kalanSayisi: 0 },
  },
  {
    ad: 'tam 7 çift: per hiç kurulmaz, iki öncelik AYNI',
    el: TAM_YEDI_CIFT,
    per: { perSayisi: 0, ciftSayisi: 7, kalanSayisi: 0 },
    cift: { perSayisi: 0, ciftSayisi: 7, kalanSayisi: 0 },
  },
  {
    // Per önceliği sayı perini kurar ve artan iki nüsha (kirmizi-4-2, siyah-4-2) ÇİFT DEĞİLDİR:
    // çift birebir aynı taş ister, farklı renkteki iki 4 eşleşmez → ikisi de kalanlara düşer.
    ad: 'sayı peri ile çift yarışı: per önceliği 1 sayı peri + 2 kalan, çift önceliği 2 çift',
    el: [...cift('kirmizi', 4), ...cift('siyah', 4), t('mavi', 4)],
    per: { perSayisi: 1, ciftSayisi: 0, kalanSayisi: 2 },
    cift: { perSayisi: 0, ciftSayisi: 2, kalanSayisi: 1 },
  },
];

test('ADR-028 kabul-a: çift önceliği tablosu — her satırda iki öncelik beklenen bölümü verir', () => {
  for (const satir of CIFT_ONCELIGI_TABLOSU) {
    for (const [oncelik, beklenen] of [[DOKUM_ONCELIGI.PER, satir.per], [DOKUM_ONCELIGI.CIFT, satir.cift]]) {
      const dokum = elDokumu(satir.el, OKEY_TASI, undefined, null, { oncelik });
      assert.deepEqual(
        { perSayisi: dokum.perSayisi, ciftSayisi: dokum.ciftSayisi, kalanSayisi: dokum.kalanSayisi },
        beklenen,
        `${satir.ad} — öncelik ${oncelik}`,
      );
    }
  }
});

test('ADR-028 kabul-b: çift önceliği hiçbir elde per önceliğinden AZ çift bulmaz (40 gerçek el)', () => {
  for (let tohum = 7300; tohum < 7340; tohum++) {
    const { eller, gosterge, okeyTasi } = dagit(tohum);
    for (const el of eller) {
      const perOnce = elDokumu(el, okeyTasi, undefined, gosterge);
      const ciftOnce = elDokumu(el, okeyTasi, undefined, gosterge, { oncelik: DOKUM_ONCELIGI.CIFT });
      assert.ok(
        ciftOnce.ciftSayisi >= perOnce.ciftSayisi,
        `tohum ${tohum}: çift önceliği ${ciftOnce.ciftSayisi} çift buldu, per önceliği ${perOnce.ciftSayisi}`,
      );
    }
  }
});

test('ADR-028 kabul-c: sayı özdeşlikleri İKİ öncelikte de bozulmaz (40 gerçek el)', () => {
  for (const oncelik of [DOKUM_ONCELIGI.PER, DOKUM_ONCELIGI.CIFT]) {
    for (let tohum = 7400; tohum < 7440; tohum++) {
      const { eller, gosterge, okeyTasi } = dagit(tohum);
      for (const el of eller) {
        const dokum = elDokumu(el, okeyTasi, undefined, gosterge, { oncelik });
        assert.equal(dokum.perTasSayisi + dokum.perDisiSayisi, el.length, `${oncelik}/${tohum}: el iki kez sayıldı`);
        assert.equal(dokum.ciftTasSayisi + dokum.kalanSayisi, dokum.perDisiSayisi, `${oncelik}/${tohum}: per dışı toplamı tutmuyor`);
        assert.deepEqual(
          dokumSirasi(dokum).map((tas) => tas.id).slice().sort(),
          el.map((tas) => tas.id).slice().sort(),
          `${oncelik}/${tohum}: dizilim elin taşlarını kaybediyor ya da çoğaltıyor`,
        );
      }
    }
  }
});

test('ADR-028 kabul-d: tanınmayan ve verilmeyen öncelik per önceliğine düşer (kapatma anahtarı)', () => {
  const el = CIFT_ONCELIGI_TABLOSU[0].el;
  const beklenen = dokumSirasi(elDokumu(el, OKEY_TASI)).map((tas) => tas.id);
  for (const secenekler of [undefined, {}, { oncelik: 'per' }, { oncelik: 'yok-boyle-bir-sey' }, { oncelik: null }]) {
    assert.deepEqual(dokumSirasi(elDokumu(el, OKEY_TASI, undefined, null, secenekler)).map((tas) => tas.id), beklenen);
  }
});

// `dokumGruplari` ıstakaya gruplu dizmenin (raf.js `yerlesimDiz`) tek sıralama kaynağıdır: her per
// ve her çift kendi bloğu, per dışı tek kalanların tamamı tek blok.
test('ADR-028 kabul-e: dokumGruplari = perler + çiftler + (varsa) kalanlar bloğu', () => {
  const dokum = elDokumu(
    [...cift('kirmizi', 5), t('siyah', 1), t('siyah', 2), t('siyah', 3), t('mavi', 9)],
    OKEY_TASI,
  );
  const gruplar = dokumGruplari(dokum);
  assert.deepEqual(gruplar.map((grup) => grup.map((tas) => tas.id)), [
    ['siyah-1-1', 'siyah-2-1', 'siyah-3-1'],
    ['kirmizi-5-1', 'kirmizi-5-2'],
    ['mavi-9-1'],
  ]);
  assert.deepEqual(dokumSirasi(dokum).map((tas) => tas.id), gruplar.flat().map((tas) => tas.id));

  // Kalan yoksa kalanlar bloğu HİÇ eklenmez (boş blok ıstakada boş yuva israfı olurdu).
  const kalansiz = dokumGruplari(elDokumu(TAMAMEN_PER, OKEY_TASI));
  assert.equal(kalansiz.length, 4);
  assert.ok(kalansiz.every((grup) => grup.length > 0));
  assert.deepEqual(dokumGruplari(elDokumu([], OKEY_TASI)), []);
});

// GERİLEME ÇAPASI (ADR-028): per önceliği tasokey#81'den (sahte okey artık joker değil) SONRA
// ölçülen çıktının BİREBİR aynısını vermek zorundadır — düğme işi varsayılan dizilimi değiştirmez.
// Tablo `is/tasokey-85/uret-tablo.mjs` ile diskteki koddan üretildi, eski bir nottan kopyalanmadı.
const PER_ONCELIGI_GERILEME = [
  // tohum 20261122 — okey sari-12
  [20261122, 0, 'kirmizi-1-2+kirmizi-2-2+kirmizi-3-2 | kirmizi-13-2+mavi-13-1+sari-13-1 | kirmizi-8-2+kirmizi-10-2+siyah-8-2+siyah-10-1+siyah-11-1+mavi-1-1+mavi-9-2+sari-2-2+sari-6-1'],
  [20261122, 1, 'kirmizi-6-1+siyah-6-1+sari-6-2 | sari-1-2+sari-1-1 | kirmizi-8-1+siyah-3-2+siyah-7-1+siyah-13-2+mavi-12-2+sari-3-1+sari-7-1+sari-8-2+sari-13-2'],
  [20261122, 2, 'sari-9-1+sari-9-2 | kirmizi-3-1+kirmizi-4-2+kirmizi-6-2+kirmizi-7-1+siyah-5-2+siyah-10-2+mavi-2-2+mavi-4-1+mavi-5-2+mavi-7-1+sari-2-1+sari-11-2'],
  [20261122, 3, 'kirmizi-12-2+siyah-12-2+sahteOkey-2 | mavi-5-1+mavi-6-1+mavi-8-1+sari-12-2 | kirmizi-5-1+kirmizi-13-1+siyah-3-1+siyah-6-2+mavi-8-2+sari-4-2+sari-7-2'],
  // tohum 7002 — okey sari-1
  [7002, 0, 'kirmizi-6-1+siyah-6-2+sari-6-2 | sari-1-2+sari-3-1+sari-4-1+sahteOkey-1 | mavi-4-2+mavi-4-1 | siyah-2-2+siyah-6-1+siyah-11-2+siyah-13-2+mavi-7-1+sari-11-1'],
  [7002, 1, 'kirmizi-10-2+kirmizi-11-1+kirmizi-12-2 | siyah-1-2+mavi-1-1+sahteOkey-2 | kirmizi-6-2+siyah-1-1+siyah-7-2+siyah-8-2+siyah-10-1+mavi-13-2+sari-4-2+sari-7-2'],
  [7002, 2, 'siyah-5-2+siyah-7-1+siyah-8-1+sari-1-1 | siyah-9-2+mavi-9-2+sari-9-1 | kirmizi-1-2+siyah-3-2+siyah-13-1+mavi-5-2+mavi-8-2+sari-7-1+sari-13-2'],
  [7002, 3, 'kirmizi-2-2+siyah-2-1+mavi-2-1+sari-2-2 | kirmizi-5-2+kirmizi-5-1 | kirmizi-13-2+kirmizi-13-1 | kirmizi-7-2+siyah-4-1+mavi-3-1+mavi-10-2+mavi-12-2+sari-5-1'],
];

test('ADR-028 kabul-f: per önceliğinin çıktısı BİREBİR aynı kaldı (8 gerçek el, gerileme)', () => {
  const imza = (gruplar) => gruplar.map((grup) => grup.map((tas) => tas.id).join('+')).join(' | ');
  for (const [tohum, oyuncu, beklenen] of PER_ONCELIGI_GERILEME) {
    const { eller, gosterge, okeyTasi } = dagit(tohum);
    const dokum = elDokumu(eller[oyuncu], okeyTasi, undefined, gosterge);
    assert.equal(imza(dokumGruplari(dokum)), beklenen, `tohum ${tohum} oyuncu ${oyuncu}: per önceliği kaydı`);
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
