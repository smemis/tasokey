import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#28 (ADR-011) — tasokey#16'nın ürettiği sayı-başına-SVG deseni (tas-01.svg…tas-13.svg,
// desen üzerinden üretilen dosya adı) kaldırıldı; taş artık tek paylaşılan gövde SVG'si
// (tas-govde.svg) + DOM rakam katmanıyla çiziliyor (kabul a).

const DOCS_DIZINI = join(import.meta.dirname, '..', 'docs');
const ARAYUZ_DIZINI = join(DOCS_DIZINI, 'arayuz');
const GORSEL_DIZINI = join(DOCS_DIZINI, 'gorsel');
const EKRAN_JS = readFileSync(join(ARAYUZ_DIZINI, 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(ARAYUZ_DIZINI, 'stil.css'), 'utf8');
const GORSELLER_JS_YOLU = join(ARAYUZ_DIZINI, 'gorseller.js');

const BAGIMSIZ_YUKLENEN_DOSYALAR = [
  'tas-govde.svg', 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg',
];
const CSS_ARKA_PLAN_DOSYALARI = ['masa-zemin.svg', 'istaka.svg'];
const ESKI_SAYI_SVG_DESENI = /tas-\$\{[^}]*\}\.svg/;

test('kabul-a-1: arayuz/gorseller.js varlık yükleyicisi var ve beklenen işlevleri dışa veriyor', () => {
  const icerik = readFileSync(GORSELLER_JS_YOLU, 'utf8');
  assert.match(icerik, /export\s+(async\s+)?function\s+gorselleriOnYukle/, 'gorselleriOnYukle dışa verilmiyor');
  assert.match(icerik, /export\s+function\s+gorselOlustur/, 'gorselOlustur dışa verilmiyor');
});

test('kabul-a-2: ekran.js tek paylaşılan gövdeyi (tas-govde.svg) kullanıyor; eski sayı-başına-SVG deseni kalmadı', () => {
  assert.ok(/['"]tas-govde\.svg['"]/.test(EKRAN_JS), 'ekran.js tas-govde.svg\'ye başvurmuyor');
  assert.doesNotMatch(EKRAN_JS, ESKI_SAYI_SVG_DESENI, 'ekran.js hâlâ eski sayı başına SVG dosya adı deseni içeriyor');
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

test('kabul-a-5: rakam DOM katmanı kuruluyor; eski yer tutucular ve eski sayı-SVG dosyaları kalmadı', () => {
  assert.ok(!EKRAN_JS.includes("'★'"), 'ekran.js hâlâ ★ metin yer tutucusu içeriyor');
  assert.match(
    EKRAN_JS,
    /classList\.add\(['"]tas-rakam['"]\)|className\s*=\s*['"]tas-rakam['"]/,
    'ekran.js rakam DOM katmanını (tas-rakam) kurmuyor',
  );
  assert.match(EKRAN_JS, /textContent\s*=\s*String\(tas\.sayi\)/, 'ekran.js rakamı DOM metni olarak basmıyor');
  assert.ok(
    !/\.tas\s*\{[^}]*background:\s*#/.test(STIL_CSS),
    'stil.css .tas için hâlâ düz renk arka plan tanımlıyor (SVG gövdesi yerine)',
  );
  assert.ok(!STIL_CSS.includes('okeyVurgu'), 'stil.css hâlâ eski outline tabanlı okeyVurgu sınıfını tanımlıyor');
  for (let sayi = 1; sayi <= 13; sayi++) {
    const ad = `tas-${String(sayi).padStart(2, '0')}.svg`;
    assert.ok(!existsSync(join(GORSEL_DIZINI, ad)), `eski sayı-SVG dosyası hâlâ var: ${ad}`);
  }
});

test('kabul-a-6: taş gövdesi rengi (--tas-govde) tanımlı (SVG\'ler bu değişkeni fallback\'sız kullanıyor)', () => {
  assert.match(STIL_CSS, /--tas-govde:\s*#[0-9a-fA-F]{3,8}/, '--tas-govde :root içinde tanımlı değil');
});

test('kabul-c: rakam+daire rengi tek kaynaklı — .tas-rakam kendi "color" değerini tanımlamıyor (renk .tas sınıfından miras alınır)', () => {
  const kuralEslesme = STIL_CSS.match(/\.tas-rakam\s*\{([^}]*)\}/);
  assert.ok(kuralEslesme, 'stil.css içinde .tas-rakam kuralı yok');
  assert.ok(
    !/\bcolor\s*:/.test(kuralEslesme[1]),
    '.tas-rakam kendi "color" değerini tanımlıyor; tek kaynak (.tas renk sınıfı) ihlal edilir',
  );
  assert.match(
    STIL_CSS,
    /\.tas\.kirmizi\s*\{\s*color:\s*var\(--renk-kirmizi\)/,
    '.tas.kirmizi tek kaynaklı renk tanımı yok (rakam ve daire buradan currentColor ile besleniyor)',
  );
});
