import test from 'node:test';
import assert from 'node:assert/strict';
import { kayitOku, kayitYaz, KAYIT_ANAHTARI, SURUM, ALANLAR, VARSAYILAN_KAYIT } from '../docs/kayit/depo.js';
import { ZORLUKLAR, zorlukCozumle } from '../docs/arayuz/kabuk.js';
import { VARSAYILAN_KADEME } from '../docs/bot/bot.js';

// ADR-006 / R-010 (tasokey#14): localStorage sarmalayıcı + şema sürümü. Node'da gerçek
// localStorage yok; `Map` tabanlı sahte depo enjekte edilip Web Storage API'si taklit edilir.
// tasokey#42 (ADR-016): şema sürümü 1 → 2, kayıtta yalnız dil ve zorluk var; sürüm 1 kaydı
// taşınmadan atılır, bozuk zorluk değeri varsayılana düşer.

class SahteDepo {
  constructor() {
    this.magaza = new Map();
  }
  getItem(anahtar) {
    return this.magaza.has(anahtar) ? this.magaza.get(anahtar) : null;
  }
  setItem(anahtar, deger) {
    this.magaza.set(anahtar, String(deger));
  }
}

class CokenDepo {
  getItem() {
    throw new Error('depo erişilemez');
  }
  setItem() {
    throw new Error('depo erişilemez');
  }
}

test('boş depoda varsayılan kayıt döner', () => {
  const depo = new SahteDepo();
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
});

test('yazılan alan aynı sürümle geri okunur', () => {
  const depo = new SahteDepo();
  kayitYaz({ dilKodu: 'en' }, depo);
  const kayit = kayitOku(depo);
  assert.equal(kayit.dilKodu, 'en');
  assert.equal(kayit.surum, SURUM);
});

test('yazılan değer tek anahtar altında JSON olarak durur', () => {
  const depo = new SahteDepo();
  kayitYaz({ dilKodu: 'en' }, depo);
  const ham = depo.getItem(KAYIT_ANAHTARI);
  assert.equal(typeof ham, 'string');
  assert.deepEqual(JSON.parse(ham), { surum: SURUM, dilKodu: 'en' });
});

test('kısmi yazma mevcut alanları korur', () => {
  const depo = new SahteDepo();
  kayitYaz({ dilKodu: 'en' }, depo);
  kayitYaz({ zorluk: 'zor' }, depo);
  const kayit = kayitOku(depo);
  assert.equal(kayit.dilKodu, 'en');
  assert.equal(kayit.zorluk, 'zor');
});

test('kabul (c): sürüm uyuşmazsa kayıt atılır, varsayılana dönülür, çökme yok', () => {
  const depo = new SahteDepo();
  depo.setItem(KAYIT_ANAHTARI, JSON.stringify({ surum: SURUM + 1, dilKodu: 'en' }));
  assert.doesNotThrow(() => kayitOku(depo));
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
});

test('kabul (c): bozuk JSON çökmeden varsayılana döner', () => {
  const depo = new SahteDepo();
  depo.magaza.set(KAYIT_ANAHTARI, '{ bozuk json');
  assert.doesNotThrow(() => kayitOku(depo));
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
});

test('kabul (c): depo erişilemezse (gizli mod/kota) çökmeden varsayılana döner', () => {
  const depo = new CokenDepo();
  assert.doesNotThrow(() => kayitOku(depo));
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
  assert.doesNotThrow(() => kayitYaz({ dilKodu: 'en' }, depo));
});

test('depo hiç yoksa (tarayıcı dışı/kapalı) çökmeden varsayılana döner', () => {
  assert.doesNotThrow(() => kayitOku(undefined));
  assert.deepEqual(kayitOku(undefined), VARSAYILAN_KAYIT);
  assert.doesNotThrow(() => kayitYaz({ dilKodu: 'en' }, undefined));
});

test('veri nesne değilse (ör. dizi/sayı) varsayılana döner', () => {
  const depo = new SahteDepo();
  depo.magaza.set(KAYIT_ANAHTARI, JSON.stringify([1, 2, 3]));
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
});

// --- tasokey#42 / ADR-016: şema sürümü 2 + zorluk alanı ---

test('ASIL KABUL (şema): sürüm 2 ve kayıtta yalnız dil + zorluk alanı var', () => {
  assert.equal(SURUM, 2);
  assert.deepEqual([...ALANLAR], ['dilKodu', 'zorluk']);
  assert.deepEqual(Object.keys(VARSAYILAN_KAYIT).sort(), ['dilKodu', 'surum', 'zorluk']);
});

test('ASIL KABUL (eski kayıt): sürüm 1 kaydı taşınmadan atılır, varsayılana dönülür', () => {
  const depo = new SahteDepo();
  // tasokey#14'ten kalan gerçek sürüm 1 kaydı: yalnız dil vardı.
  depo.setItem(KAYIT_ANAHTARI, JSON.stringify({ surum: 1, dilKodu: 'en' }));
  assert.deepEqual(kayitOku(depo), VARSAYILAN_KAYIT);
  assert.equal(kayitOku(depo).dilKodu, 'tr', 'eski dil seçimi taşınmamalı (taşıma kodu yazılmaz)');
});

test('zorluk yazılıp geri okunur (seçim bir sonraki açılışta duruyor)', () => {
  for (const zorluk of ZORLUKLAR) {
    const depo = new SahteDepo();
    kayitYaz({ zorluk }, depo);
    assert.equal(kayitOku(depo).zorluk, zorluk);
    assert.equal(JSON.parse(depo.getItem(KAYIT_ANAHTARI)).surum, SURUM);
  }
});

test('hiç kayıt yoksa zorluk seçilmemiştir (null) ve kabuk varsayılana düşer', () => {
  const depo = new SahteDepo();
  assert.equal(kayitOku(depo).zorluk, null);
  assert.equal(zorlukCozumle(kayitOku(depo).zorluk), VARSAYILAN_KADEME);
});

test('ASIL KABUL (bozuk değer): tanınmayan zorluk kayda yazılsa da varsayılana düşülür', () => {
  const depo = new SahteDepo();
  depo.setItem(KAYIT_ANAHTARI, JSON.stringify({ surum: SURUM, dilKodu: 'en', zorluk: 'efsane' }));
  const kayit = kayitOku(depo);
  assert.equal(kayit.dilKodu, 'en', 'bozuk zorluk dili düşürmemeli');
  assert.equal(zorlukCozumle(kayit.zorluk), VARSAYILAN_KADEME);
});

test('zorluk dize değilse (sayı/nesne) düşürülür, varsayılan kalır', () => {
  for (const bozuk of [3, { kademe: 'zor' }, ['zor'], true]) {
    const depo = new SahteDepo();
    depo.setItem(KAYIT_ANAHTARI, JSON.stringify({ surum: SURUM, zorluk: bozuk }));
    assert.equal(kayitOku(depo).zorluk, null, `bozuk değer düşmedi: ${JSON.stringify(bozuk)}`);
  }
});

test('şema dışı alan ne okunur ne yazılır (kayıtta yalnız dil ve zorluk kalır)', () => {
  const depo = new SahteDepo();
  depo.setItem(KAYIT_ANAHTARI, JSON.stringify({ surum: SURUM, dilKodu: 'en', sesAcik: 'evet' }));
  assert.equal(kayitOku(depo).sesAcik, undefined, 'bilinmeyen alan okunmamalı');

  kayitYaz({ zorluk: 'kolay', sesAcik: 'evet' }, depo);
  assert.deepEqual(
    Object.keys(JSON.parse(depo.getItem(KAYIT_ANAHTARI))).sort(),
    ['dilKodu', 'surum', 'zorluk'],
  );
});
