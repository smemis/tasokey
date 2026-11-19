import test from 'node:test';
import assert from 'node:assert/strict';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// MIMARI.md ADR-008 / GDD.md §1 kural 6, 10-12: K1'in dört kural kararı tek nesnede.

test('12-13-1 geçişi per sayılmaz', () => {
  assert.equal(KURAL_VARSAYILAN.onUcBirGecisiPerSayilir, false);
});

test('okey ve sahte okey atmak yasaktır', () => {
  assert.equal(KURAL_VARSAYILAN.okeyVeSahteOkeyAtmaYasak, true);
});

test('gösterge sahte okey çıkarsa yeniden açılır', () => {
  assert.equal(KURAL_VARSAYILAN.gostergeSahteOkeyIseYenidenAcilir, true);
});

test('deste tükenirse el berabere sayılır', () => {
  assert.equal(KURAL_VARSAYILAN.desteTukenirseElBerabereSayilir, true);
});
