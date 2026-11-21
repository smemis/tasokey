import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ZORLUKLAR } from '../docs/arayuz/kabuk.js';

// tasokey#42 — ADR-016: başlangıç ekranı (Yeni oyun + Kolay/Orta/Zor) ve arayüzün tek durum
// makinesine bağlanması. Durum makinesinin kendisi `kabuk.test.js`te saf olarak ölçülür; burada
// **arayüzün o makineyi gerçekten kullandığı** kaynak taramasıyla denetlenir (ADR-002'nin kaynak
// taraması dili; `ekran.js` DOM'suz import edilemez, bu yüzden tarayıcı gerektirmeyen yol budur).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const YENI_ANAHTARLAR = [
  'baslangic.baslik', 'baslangic.zorluk', 'yeniOyun', 'baslangicaDon',
  ...ZORLUKLAR.map((zorluk) => `zorluk.${zorluk}`),
];

/** Seçicisi verilen metni içeren ilk CSS kuralının gövdesi (seçici listesi de olabilir). */
function kuralGovdesi(secici) {
  const kacisli = secici.replace(/[.#*+?^${}()|[\]\\]/g, '\\$&');
  const eslesme = STIL_CSS.match(new RegExp(`${kacisli}[^{}]*\\{([^}]*)\\}`));
  return eslesme ? eslesme[1] : null;
}

test('kabul-a: index.html başlangıç penceresini, Yeni oyun düğmesini ve zorluk grubunu taşıyor', () => {
  assert.match(INDEX_HTML, /<div id="baslangicPaneli"/, 'index.html içinde #baslangicPaneli yok');
  assert.match(INDEX_HTML, /id="yeniOyunButonu"/, 'Yeni oyun düğmesi yok');
  assert.match(INDEX_HTML, /id="zorlukSecimi"[^>]*role="radiogroup"/, 'zorluk seçimi radiogroup değil');
  assert.match(INDEX_HTML, /id="zorlukSecimi"[^>]*aria-labelledby="zorlukBaslik"/, 'radiogroup etiketsiz');
});

test('kabul-a-2: her kademe için bir düğme var ve data-zorluk değeri kademe adıyla birebir', () => {
  const bulunanlar = [...INDEX_HTML.matchAll(/data-zorluk="([^"]+)"/g)].map(([, deger]) => deger);
  assert.deepEqual(bulunanlar, [...ZORLUKLAR], 'düğmeler bot kademeleriyle birebir eşleşmiyor');
  for (const dugme of INDEX_HTML.matchAll(/<button[^>]*data-zorluk="[^"]*"[^>]*>/g)) {
    assert.match(dugme[0], /role="radio"/, `zorluk düğmesi radio değil: ${dugme[0]}`);
  }
});

test('kabul-a-3: sonuç penceresinde başlangıca dönüş düğmesi var (sonuc → baslangic)', () => {
  assert.match(INDEX_HTML, /id="baslangicaDonButonu"/, 'sonuç penceresinde başlangıca dön düğmesi yok');
  assert.ok(
    INDEX_HTML.indexOf('id="baslangicaDonButonu"') > INDEX_HTML.indexOf('id="sonucPaneli"'),
    'başlangıca dön düğmesi sonuç penceresinin içinde olmalı',
  );
});

test('kabul-a-4: başlangıç penceresinde sabit metin yok (hepsi dil anahtarından doldurulur)', () => {
  const panel = INDEX_HTML.slice(
    INDEX_HTML.indexOf('<div id="baslangicPaneli"'),
    INDEX_HTML.indexOf('<div id="sonucPaneli"'),
  );
  const metinler = [...panel.matchAll(/>([^<>]+)</g)]
    .map(([, metin]) => metin.trim())
    .filter((metin) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(metin));
  assert.deepEqual(metinler, [], `başlangıç penceresinde sabit metin: ${metinler.join(' | ')}`);
});

test('kabul-b: başlangıç penceresi ADR-015 pencere kademesini kullanıyor (taşlar üstüne çıkamaz)', () => {
  const govde = kuralGovdesi('#baslangicPaneli');
  assert.ok(govde, 'stil.css içinde #baslangicPaneli kuralı yok');
  assert.match(govde, /z-index:\s*var\(--kademe-pencere\)/, 'başlangıç penceresi pencere kademesinde değil');
});

test('kabul-b-2: telefon dikeyde başlangıç penceresi gizlenir (R-014 uyarısını örtmez)', () => {
  const blokEslesme = STIL_CSS.match(/@media\s*\(orientation:\s*portrait\)[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(blokEslesme, 'stil.css içinde portrait media bloğu bulunamadı');
  assert.match(
    blokEslesme[1],
    /#baslangicPaneli\.gorunur\s*\{[^}]*display:\s*none/,
    'dikey telefon bloğunda başlangıç penceresi gizlenmiyor',
  );
});

test('kabul-c: ekran.js panel görünürlüğünü kabuk durum makinesinden okuyor', () => {
  assert.match(EKRAN_JS, /from '\.\/kabuk\.js'/, 'ekran.js kabuk.js\'i kullanmıyor');
  assert.match(EKRAN_JS, /kabuk\.ekran === EKRAN\.BASLANGIC/, 'başlangıç paneli kabuk ekranına bağlı değil');
  assert.match(EKRAN_JS, /kabuk\.ekran === EKRAN\.SONUC/, 'sonuç paneli kabuk ekranına bağlı değil');
  // Geçişler yalnız tek kapıdan: ekran.js kendi başına `durumKutu.kabuk.ekran = …` yazmaz.
  assert.ok(
    !/kabuk\.ekran\s*=[^=]/.test(EKRAN_JS),
    'ekran.js ekranı doğrudan atıyor; geçiş yalnız kabuk.js gecis() ile yapılmalı',
  );
});

test('ASIL KABUL (kaynak): ekran.js kademe adı yazmıyor — botu kabuğun zorluğuyla çağırıyor', () => {
  assert.match(EKRAN_JS, /botTurunuOynat\(kabuk, durum, durum\.sira\)/, 'bot turu kabuk üzerinden oynatılmıyor');
  assert.ok(!/VARSAYILAN_KADEME/.test(EKRAN_JS), 'ekran.js sabit kademe oynatıyor (seçim yok sayılır)');
  assert.ok(!/\bbotTurOyna\b/.test(EKRAN_JS), 'ekran.js botu kabuğu atlayarak çağırıyor');
  assert.ok(!/from '\.\.\/bot\//.test(EKRAN_JS), 'ekran.js bot katmanını doğrudan içe alıyor');
});

test('kabul-d: seçim kayda yazılıyor ve açılışta kayıttan okunuyor (şema sürüm 2)', () => {
  assert.match(EKRAN_JS, /kayitYaz\(kayitAlanlari\(/, 'zorluk seçimi kayda yazılmıyor');
  assert.match(EKRAN_JS, /kabukBaslat\(kayit\)/, 'kabuk açılışta kayıttan kurulmuyor');
});

test('kabul-e: yeni metinlerin TR + EN anahtarı var, dolu ve birbirinden farklı', () => {
  for (const anahtar of YENI_ANAHTARLAR) {
    assert.equal(typeof TR[anahtar], 'string', `tr.json'da yok: ${anahtar}`);
    assert.equal(typeof EN[anahtar], 'string', `en.json'da yok: ${anahtar}`);
    assert.ok(TR[anahtar].trim().length > 0, `tr.json boş: ${anahtar}`);
    assert.ok(EN[anahtar].trim().length > 0, `en.json boş: ${anahtar}`);
  }
  // Zorluk adları iki dilde de ayrı yazılmıştır (TR "Kolay" ≠ EN "Easy").
  for (const zorluk of ZORLUKLAR) {
    assert.notEqual(TR[`zorluk.${zorluk}`], EN[`zorluk.${zorluk}`], `zorluk.${zorluk} çevrilmemiş`);
  }
});
