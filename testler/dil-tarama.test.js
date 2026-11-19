import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// R-008 / ADR-007: arayüzde sabit (koda gömülü) metin yok; dil dosyaları arasında
// eksik/karşılıksız anahtar yok. Tahminle değil, kaynak taraması ile ölçülür (tasokey#12).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const ARAYUZ_DIZINI = join(DOCS_KOK, 'arayuz');
const DILLER_DIZINI = join(DOCS_KOK, 'diller');

// Harf içermeyen DOM metinleri (ikon/glif, sayı) dil anahtarı gerektirmez — görsel sembol,
// dile göre çevrilmez. Harf içeren her literal gerçek bir metindir ve anahtardan gelmelidir.
const HARF_DESENI = /[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/;
const METIN_ATAMA_DESENI = /\.(?:textContent|innerText)\s*=\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

// PRD §6/§8, STIL.md §4: gerçek para/bahis/kumar çağrışımı yasak (TR kumar yasağı, sabit karar).
const KUMAR_DESENI = /kumar|bahis|\bbet\b|gambl|jeton|casino|rulet|nakit ödül|para ödül/i;

function jsDosyalariniTopla(dizin) {
  return readdirSync(dizin, { recursive: true })
    .filter((ad) => ad.endsWith('.js'))
    .map((ad) => join(dizin, ad));
}

function sabitMetinleriBul(icerik) {
  const bulunanlar = [];
  for (const [, , literal] of icerik.matchAll(METIN_ATAMA_DESENI)) {
    if (HARF_DESENI.test(literal)) bulunanlar.push(literal);
  }
  return bulunanlar;
}

test('arayüz taraması çalışıyor (en az 1 dosya tarandı)', () => {
  const dosyalar = jsDosyalariniTopla(ARAYUZ_DIZINI);
  assert.ok(dosyalar.length > 0, 'docs/arayuz altında taranacak .js dosyası yok');
});

test('arayüz katmanında dil anahtarı dışından gelen sabit metin yok', () => {
  const dosyalar = jsDosyalariniTopla(ARAYUZ_DIZINI);
  const tumBulunanlar = [];
  for (const dosya of dosyalar) {
    const icerik = readFileSync(dosya, 'utf8');
    for (const literal of sabitMetinleriBul(icerik)) {
      tumBulunanlar.push(`${dosya}: "${literal}"`);
    }
  }
  assert.equal(tumBulunanlar.length, 0, `sabit metin bulundu:\n${tumBulunanlar.join('\n')}`);
});

test('dil dosyaları arasında eksik/karşılıksız anahtar yok', () => {
  const tr = JSON.parse(readFileSync(join(DILLER_DIZINI, 'tr.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(DILLER_DIZINI, 'en.json'), 'utf8'));
  const trAnahtarlari = new Set(Object.keys(tr));
  const enAnahtarlari = new Set(Object.keys(en));

  const enDeYok = [...trAnahtarlari].filter((anahtar) => !enAnahtarlari.has(anahtar));
  const trDeYok = [...enAnahtarlari].filter((anahtar) => !trAnahtarlari.has(anahtar));

  assert.equal(enDeYok.length, 0, `en.json'da karşılığı yok: ${enDeYok.join(', ')}`);
  assert.equal(trDeYok.length, 0, `tr.json'da karşılığı yok: ${trDeYok.join(', ')}`);
});

test('dil dosyalarında boş metin yok', () => {
  const tr = JSON.parse(readFileSync(join(DILLER_DIZINI, 'tr.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(DILLER_DIZINI, 'en.json'), 'utf8'));
  for (const [dilAdi, tablo] of [['tr', tr], ['en', en]]) {
    const bosAnahtarlar = Object.entries(tablo)
      .filter(([, metin]) => typeof metin !== 'string' || metin.trim() === '')
      .map(([anahtar]) => anahtar);
    assert.equal(bosAnahtarlar.length, 0, `${dilAdi}.json boş metinli anahtar: ${bosAnahtarlar.join(', ')}`);
  }
});

test('metinlerde bahis/kumar dili yok (PRD §6/§8)', () => {
  const tr = JSON.parse(readFileSync(join(DILLER_DIZINI, 'tr.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(DILLER_DIZINI, 'en.json'), 'utf8'));
  for (const [dilAdi, tablo] of [['tr', tr], ['en', en]]) {
    const yakalananlar = Object.entries(tablo)
      .filter(([, metin]) => typeof metin === 'string' && KUMAR_DESENI.test(metin))
      .map(([anahtar, metin]) => `${anahtar}: "${metin}"`);
    assert.equal(yakalananlar.length, 0, `${dilAdi}.json kumar/bahis dili içeriyor: ${yakalananlar.join(', ')}`);
  }
});
