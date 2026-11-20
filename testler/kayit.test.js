import test from 'node:test';
import assert from 'node:assert/strict';
import { kayitOku, kayitYaz, KAYIT_ANAHTARI, SURUM, VARSAYILAN_KAYIT } from '../docs/kayit/depo.js';

// ADR-006 / R-010 (tasokey#14): localStorage sarmalayıcı + şema sürümü. Node'da gerçek
// localStorage yok; `Map` tabanlı sahte depo enjekte edilip Web Storage API'si taklit edilir.

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
  kayitYaz({ sesAcik: true }, depo);
  const kayit = kayitOku(depo);
  assert.equal(kayit.dilKodu, 'en');
  assert.equal(kayit.sesAcik, true);
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
