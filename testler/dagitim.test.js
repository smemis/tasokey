import test from 'node:test';
import assert from 'node:assert/strict';
import { dagit, gostergeAc, OYUNCU_SAYISI } from '../docs/cekirdek/dagitim.js';
import { tasOlustur, sahteOkeyOlustur, TAS_TURU } from '../docs/cekirdek/tas.js';

// tasokey#4 — R-001/R-002: 15/14/14/14 dağıtım, yer destesi, gösterge; taş yitmiyor/çoğalmıyor.

const TOPLAM_TAS = 106;
const DENENEN_TOHUMLAR = [1, 2, 3, 42, 12345, 67890, 999999];

test('el boyutları 15/14/14/14', () => {
  const { eller } = dagit(7);
  assert.equal(eller.length, OYUNCU_SAYISI);
  assert.equal(eller[0].length, 15);
  assert.equal(eller[1].length, 14);
  assert.equal(eller[2].length, 14);
  assert.equal(eller[3].length, 14);
});

test('değişmez: eller + yer destesi + gösterge = 106, taş yitmiyor/çoğalmıyor (birden çok tohum)', () => {
  for (const tohum of DENENEN_TOHUMLAR) {
    const { eller, yerDestesi, gosterge } = dagit(tohum);
    const elToplami = eller.reduce((n, el) => n + el.length, 0);
    assert.equal(elToplami + yerDestesi.length + 1, TOPLAM_TAS, `tohum ${tohum}: toplam sayı kayboldu/çoğaldı`);

    const butunIdler = [...eller.flat().map((t) => t.id), ...yerDestesi.map((t) => t.id), gosterge.id];
    assert.equal(butunIdler.length, TOPLAM_TAS, `tohum ${tohum}: toplam taş sayısı 106 değil`);
    assert.equal(new Set(butunIdler).size, TOPLAM_TAS, `tohum ${tohum}: yinelenen taş var`);
  }
});

test('aynı tohumla dağıtım birebir yeniden üretilebilir', () => {
  const birinci = dagit(2026);
  const ikinci = dagit(2026);
  assert.deepEqual(birinci.eller, ikinci.eller);
  assert.deepEqual(birinci.yerDestesi, ikinci.yerDestesi);
  assert.deepEqual(birinci.gosterge, ikinci.gosterge);
});

test('farklı tohum farklı dağıtım verir', () => {
  const birinci = dagit(1);
  const ikinci = dagit(2);
  assert.notDeepEqual(birinci.eller, ikinci.eller);
});

test('gösterge sahte okey çıkarsa taş desteye karışır ve yeniden açılır', () => {
  const destesi = [
    sahteOkeyOlustur(1),
    tasOlustur('kirmizi', 5, 1),
    tasOlustur('mavi', 9, 2),
  ];
  const { gosterge, kalanDeste } = gostergeAc(destesi);
  assert.equal(gosterge.tur, TAS_TURU.SAYI);
  assert.notEqual(gosterge.tur, TAS_TURU.SAHTE_OKEY);
  assert.equal(kalanDeste.length, destesi.length - 1);
  const kalanIdler = [gosterge.id, ...kalanDeste.map((t) => t.id)].sort();
  const beklenenIdler = destesi.map((t) => t.id).sort();
  assert.deepEqual(kalanIdler, beklenenIdler, 'sahte okey desteden kaybolmamalı');
});

test('kural kapalıyken gösterge sahte okey de olabilir', () => {
  const destesi = [sahteOkeyOlustur(1), tasOlustur('kirmizi', 5, 1)];
  const { gosterge } = gostergeAc(destesi, { gostergeSahteOkeyIseYenidenAcilir: false });
  assert.equal(gosterge.tur, TAS_TURU.SAHTE_OKEY);
});
