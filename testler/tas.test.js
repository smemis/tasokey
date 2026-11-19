import test from 'node:test';
import assert from 'node:assert/strict';
import { RENKLER, TAS_TURU, setOlustur } from '../docs/cekirdek/tas.js';

// R-001: standart 106'lık okey seti (13 sayı x 4 renk x 2 nüsha + 2 sahte okey).

test('set tam 106 taş içerir', () => {
  const taslar = setOlustur();
  assert.equal(taslar.length, 106);
});

test('her renk-sayı çifti tam 2 nüsha olarak geçer', () => {
  const taslar = setOlustur().filter((t) => t.tur === TAS_TURU.SAYI);
  assert.equal(taslar.length, 104);
  for (const renk of RENKLER) {
    for (let sayi = 1; sayi <= 13; sayi++) {
      const uyanlar = taslar.filter((t) => t.renk === renk && t.sayi === sayi);
      assert.equal(uyanlar.length, 2, `${renk}-${sayi} tam 2 nüsha olmalı`);
      assert.deepEqual(new Set(uyanlar.map((t) => t.nusha)), new Set([1, 2]));
    }
  }
});

test('tam 2 sahte okey taşı var', () => {
  const sahteOkeyler = setOlustur().filter((t) => t.tur === TAS_TURU.SAHTE_OKEY);
  assert.equal(sahteOkeyler.length, 2);
  assert.deepEqual(new Set(sahteOkeyler.map((t) => t.nusha)), new Set([1, 2]));
});

test('her taşın kimliği benzersizdir', () => {
  const idler = setOlustur().map((t) => t.id);
  assert.equal(new Set(idler).size, idler.length);
});
