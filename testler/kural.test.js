import test from 'node:test';
import assert from 'node:assert/strict';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// MIMARI.md ADR-008 / GDD.md §1 kural 6, 10-12: K1'in dört kural kararı tek nesnede.

// tasokey#66 (ADR-008 sürüm 3): kural 1'in varsayılanı DÖNDÜ — `12-13-1` geçişi per sayılır.
// Ayar yine duruyor ve kapatma anahtarı olarak çalışıyor (iki yönlü ölçümü `dizilim.test.js`de).
test('12-13-1 geçişi per sayılır (varsayılan), ayar kapatma anahtarı olarak duruyor', () => {
  assert.equal(KURAL_VARSAYILAN.onUcBirGecisiPerSayilir, true);
  assert.ok(
    'onUcBirGecisiPerSayilir' in KURAL_VARSAYILAN,
    'kapatma anahtarı silinmiş: düz sıra kuralına dönmenin tek satırlık yolu kalmadı',
  );
});

// tasokey#50 (ADR-008 sürüm 2): varsayılan DÖNDÜ — okey ve sahte okey atılabilir. Ayar yine
// duruyor ve kapatma anahtarı olarak çalışıyor (iki yönlü ölçümü `el.test.js`de).
test('okey ve sahte okey atmak serbesttir (varsayılan), ayar kapatma anahtarı olarak duruyor', () => {
  assert.equal(KURAL_VARSAYILAN.okeyVeSahteOkeyAtmaYasak, false);
  assert.ok(
    'okeyVeSahteOkeyAtmaYasak' in KURAL_VARSAYILAN,
    'kapatma anahtarı silinmiş: yasağı geri açmanın tek satırlık yolu kalmadı',
  );
});

test('gösterge sahte okey çıkarsa yeniden açılır', () => {
  assert.equal(KURAL_VARSAYILAN.gostergeSahteOkeyIseYenidenAcilir, true);
});

test('deste tükenirse el berabere sayılır', () => {
  assert.equal(KURAL_VARSAYILAN.desteTukenirseElBerabereSayilir, true);
});
