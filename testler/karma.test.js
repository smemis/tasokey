import test from 'node:test';
import assert from 'node:assert/strict';
import { karistir, tohumluUretec } from '../docs/cekirdek/karma.js';
import { setOlustur } from '../docs/cekirdek/tas.js';

// ADR-003: tohumlu, enjekte edilen rastgelelik — aynı tohum aynı sırayı, farklı tohum farklı sırayı verir.

test('aynı tohum aynı sırayı verir', () => {
  const set = setOlustur();
  const birinci = karistir(set, 12345).map((t) => t.id);
  const ikinci = karistir(set, 12345).map((t) => t.id);
  assert.deepEqual(birinci, ikinci);
});

test('farklı tohum farklı sırayı verir', () => {
  const set = setOlustur();
  const birinci = karistir(set, 12345).map((t) => t.id);
  const ikinci = karistir(set, 67890).map((t) => t.id);
  assert.notDeepEqual(birinci, ikinci);
});

test('karma taş çokluğunu değiştirmez', () => {
  const set = setOlustur();
  const karisik = karistir(set, 42);
  assert.equal(karisik.length, set.length);
  const oncekiIdler = set.map((t) => t.id).sort();
  const sonrakiIdler = karisik.map((t) => t.id).sort();
  assert.deepEqual(sonrakiIdler, oncekiIdler);
});

test('karma girdi dizisini değiştirmez (saf işlev)', () => {
  const set = setOlustur();
  const kopya = set.slice();
  karistir(set, 7);
  assert.deepEqual(set, kopya);
});

test('tohumlu üretec aynı tohumla aynı sayı dizisini verir', () => {
  const uretec1 = tohumluUretec(999);
  const uretec2 = tohumluUretec(999);
  const dizi1 = Array.from({ length: 5 }, () => uretec1());
  const dizi2 = Array.from({ length: 5 }, () => uretec2());
  assert.deepEqual(dizi1, dizi2);
});
