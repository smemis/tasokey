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

// tasokey#81 (ADR-027): sahte okey joker DEĞİLDİR, o elin okey değerini alır. Ayar kapatma
// anahtarıdır (iki yönlü ölçümü `dagitim/dizilim/cozucu/el-dokumu/el-bitiren-taslar` testlerinde).
test('sahte okey joker değildir (varsayılan), ayar kapatma anahtarı olarak duruyor', () => {
  assert.equal(KURAL_VARSAYILAN.sahteOkeyJokerGibiDavranir, false);
  assert.ok(
    'sahteOkeyJokerGibiDavranir' in KURAL_VARSAYILAN,
    'kapatma anahtarı silinmiş: K1 davranışına dönmenin tek satırlık yolu kalmadı',
  );
});

// ADR-027 ile ADR-008 sürüm 2 BAĞIMSIZDIR: atma yasağı "özel taş" sorusudur, joker tanımı değil.
test('okeyVeSahteOkeyAtmaYasak, sahte okey joker olmasa da anlamını korur', () => {
  const kural = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: true };
  assert.equal(kural.sahteOkeyJokerGibiDavranir, false, 'iki ayar birbirine bağlanmamalı');
  assert.equal(kural.okeyVeSahteOkeyAtmaYasak, true);
});
