import test from 'node:test';
import assert from 'node:assert/strict';
import { cevir } from '../docs/dil/cevir.js';

// R-008: sabit metin yasak; eksik anahtarda görünür hata (ADR-007).

const DILLER = {
  tr: { merhaba: 'Merhaba {0}', sade: 'Sabit metin' },
  en: { merhaba: 'Hello {0}' },
};

test('bilinen anahtar doğru metni döner', () => {
  assert.equal(cevir(DILLER, 'tr', 'sade'), 'Sabit metin');
});

test('yer tutucular sırayla doldurulur', () => {
  assert.equal(cevir(DILLER, 'tr', 'merhaba', ['Semih']), 'Merhaba Semih');
  assert.equal(cevir(DILLER, 'en', 'merhaba', ['Semih']), 'Hello Semih');
});

test('tanımsız dil kodu tr tablosuna düşer', () => {
  assert.equal(cevir(DILLER, 'de', 'sade'), 'Sabit metin');
});

test('eksik anahtar görünür hata fırlatır', () => {
  assert.throws(() => cevir(DILLER, 'en', 'sade'), /eksik dil anahtarı/);
});
