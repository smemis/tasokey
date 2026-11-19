import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#16 — tasokey#15'in ürettiği 19 SVG varlığının arayüze bağlandığını ve yer tutucu
// (sabit renk/metin taş gövdesi, ★ karakteri) kalmadığını kaynak taramasıyla ölçer; kabul (a).

const ARAYUZ_DIZINI = join(import.meta.dirname, '..', 'docs', 'arayuz');
const EKRAN_JS = readFileSync(join(ARAYUZ_DIZINI, 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(ARAYUZ_DIZINI, 'stil.css'), 'utf8');
const GORSELLER_JS_YOLU = join(ARAYUZ_DIZINI, 'gorseller.js');

const BAGIMSIZ_YUKLENEN_DOSYALAR = [
  'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg',
];
const CSS_ARKA_PLAN_DOSYALARI = ['masa-zemin.svg', 'istaka.svg'];

test('kabul-a-1: arayuz/gorseller.js varlık yükleyicisi var ve beklenen işlevleri dışa veriyor', () => {
  const icerik = readFileSync(GORSELLER_JS_YOLU, 'utf8');
  assert.match(icerik, /export\s+(async\s+)?function\s+gorselleriOnYukle/, 'gorselleriOnYukle dışa verilmiyor');
  assert.match(icerik, /export\s+function\s+gorselOlustur/, 'gorselOlustur dışa verilmiyor');
});

test('kabul-a-2: ekran.js tas-01…tas-13 yüz dosyalarının hepsine (desen üzerinden) başvuruyor', () => {
  assert.match(EKRAN_JS, /tas-\$\{String\([^)]*\)\.padStart\(2, ['"]0['"]\)\}\.svg/, 'sayı taşı SVG dosya adı deseni yok');
  assert.match(EKRAN_JS, /gorselleriOnYukle/, 'ekran.js gorselleriOnYukle çağırmıyor (ön yükleme yok)');
});

test('kabul-a-3: ekran.js bağımsız varlık dosyalarının her birine başvuruyor', () => {
  for (const ad of BAGIMSIZ_YUKLENEN_DOSYALAR) {
    assert.ok(EKRAN_JS.includes(ad), `ekran.js içinde "${ad}" başvurusu yok`);
  }
});

test('kabul-a-4: stil.css masa ve ıstaka SVG\'lerini arka plan olarak kullanıyor', () => {
  for (const ad of CSS_ARKA_PLAN_DOSYALARI) {
    assert.ok(STIL_CSS.includes(ad), `stil.css içinde "${ad}" arka plan başvurusu yok`);
  }
});

test('kabul-a-5: eski metin/renk yer tutucuları kalmadı', () => {
  assert.ok(!EKRAN_JS.includes("'★'"), 'ekran.js hâlâ ★ metin yer tutucusu içeriyor');
  assert.ok(!/textContent\s*=\s*String\(tas\.sayi\)/.test(EKRAN_JS), 'ekran.js hâlâ taş sayısını metin olarak basıyor');
  assert.ok(!/\.tas\s*\{[^}]*background:\s*#/.test(STIL_CSS), 'stil.css .tas için hâlâ düz renk arka plan tanımlıyor (SVG gövdesi yerine)');
  assert.ok(!STIL_CSS.includes('okeyVurgu'), 'stil.css hâlâ eski outline tabanlı okeyVurgu sınıfını tanımlıyor');
});

test('kabul-a-6: taş gövdesi rengi (--tas-govde) tanımlı (SVG\'ler bu değişkeni fallback\'sız kullanıyor)', () => {
  assert.match(STIL_CSS, /--tas-govde:\s*#[0-9a-fA-F]{3,8}/, '--tas-govde :root içinde tanımlı değil');
});
