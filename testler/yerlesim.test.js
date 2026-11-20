import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KENAR, KOSE, oyuncuKenarHaritasi, oyuncununKenari, oyuncununAtilanKosesi,
} from '../docs/arayuz/yerlesim.js';
import { sonrakiOyuncu, oncekiOyuncu } from '../docs/cekirdek/el.js';

// tasokey#29 (ADR-012) — R-011/R-012: dört kenar/köşe yerleşim mantığı. Yön `cekirdek/el.js`'ten
// gelen fonksiyonla hesaplanır (burada yeniden tanımlanmaz); kabul (a).

test('kabul-a-1: Sahip (oyuncu 0) altta', () => {
  assert.equal(oyuncununKenari(0, sonrakiOyuncu), KENAR.ALT);
});

test('kabul-a-2: sıradaki oyuncu (1) sağda', () => {
  assert.equal(oyuncununKenari(1, sonrakiOyuncu), KENAR.SAG);
});

test('kabul-a-3: Sahip\'in attığı yığın sağ altta', () => {
  assert.equal(oyuncununAtilanKosesi(0, sonrakiOyuncu), KOSE.SAG_ALT);
});

test('kabul-a-4: Sahip\'in çekebileceği yığın (önceki oyuncunun köşesi) sol altta', () => {
  const oncekiOyuncuIndex = oncekiOyuncu(0);
  assert.equal(oyuncununAtilanKosesi(oncekiOyuncuIndex, sonrakiOyuncu), KOSE.SOL_ALT);
});

test('kabul-a-5: dört oyuncunun dördü de farklı bir kenara düşer', () => {
  const harita = oyuncuKenarHaritasi(sonrakiOyuncu);
  assert.equal(new Set(harita).size, 4);
  assert.deepEqual([...harita].sort(), [KENAR.ALT, KENAR.SAG, KENAR.SOL, KENAR.UST].sort());
});

test('kabul-a-6: dört oyuncunun köşe yığını dördü de farklı bir köşeye düşer', () => {
  const koseler = [0, 1, 2, 3].map((oyuncu) => oyuncununAtilanKosesi(oyuncu, sonrakiOyuncu));
  assert.equal(new Set(koseler).size, 4);
});

test('kabul-a-7: yön değişince eşleme değişir (ters yön verilince kenar haritası farklı olur)', () => {
  const ileriHarita = oyuncuKenarHaritasi(sonrakiOyuncu);
  const terslenmisHarita = oyuncuKenarHaritasi(oncekiOyuncu);
  assert.notDeepEqual(ileriHarita, terslenmisHarita);
  // Sahip her yönde de altta kalır (0 her zaman başlangıç noktası).
  assert.equal(ileriHarita[0], KENAR.ALT);
  assert.equal(terslenmisHarita[0], KENAR.ALT);
  // Ama sıradaki oyuncu (1) artık sağda değil, soldadır (yön tersine döndü).
  assert.equal(terslenmisHarita[1], KENAR.SOL);
});

test('kabul-a-8: yön değişince köşe eşlemesi de değişir (sıradaki oyuncunun köşesi için)', () => {
  const ileriKose = oyuncununAtilanKosesi(1, sonrakiOyuncu);
  const terslenmisKose = oyuncununAtilanKosesi(1, oncekiOyuncu);
  assert.notEqual(ileriKose, terslenmisKose);
  assert.equal(ileriKose, KOSE.SAG_UST);
  assert.equal(terslenmisKose, KOSE.SOL_ALT);
});
