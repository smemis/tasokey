import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#33 (sınıf K) — Sahip'in 4 maddelik masa düzeni düzeltmesi:
// 1) rakip ıstakaları gri kutu yerine gerçek kenar boyu çubuk, ad çubuğun üstünde
// 2) deste tek taş yerine üst üste kaydırılmış katmanlar
// 3) masa zemin dokusu + ahşap çerçeve gerçekten uygulanır
// 4) köşe yığını boşken "0" yerine boş yuva görünür
// Kaynak taraması (bu projenin arayuz testleri deseni, bkz. gorsel-baglanti.test.js,
// duyarlilik-telefon.test.js) — DOM yürütmesi yok, dosya içeriği ölçülür.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const MASA_ZEMIN_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'masa-zemin.svg'), 'utf8');

test('madde-1-a: .kenar artık gri kutu (beyaz saydam arka plan) taşımıyor', () => {
  assert.ok(
    !/\.kenar\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/.test(STIL_CSS),
    'stil.css .kenar hâlâ gri/beyaz saydam arka plan tanımlıyor',
  );
});

test('madde-1-b: üst rakip çubuğu genişliği Sahip\'in kendi ıstaka formülüyle (tek kaynak) hesaplanıyor', () => {
  const formulEslesme = STIL_CSS.match(/--rakip-ust-genislik:\s*calc\(([\s\S]*?)\);/);
  assert.ok(formulEslesme, '--rakip-ust-genislik calc() ile tanımlı değil');
  assert.match(formulEslesme[1], /--raf-sutun-sayisi/, 'formül --raf-sutun-sayisi kullanmıyor');
  assert.match(formulEslesme[1], /--tas-genislik/, 'formül --tas-genislik kullanmıyor');
  assert.match(
    STIL_CSS,
    /\.kenar-raf-yatay\s*\{[^}]*width:\s*var\(--rakip-ust-genislik\)/,
    '.kenar-raf-yatay genişliği var(--rakip-ust-genislik) kullanmıyor',
  );
});

test('madde-1-c: sol/sağ rakip adı çubuğun üstünde dikey yazı olarak duruyor', () => {
  assert.match(
    STIL_CSS,
    /\.kenar-sol \.kenar-ad,\s*\n?\s*\.kenar-sag \.kenar-ad\s*\{[^}]*writing-mode:\s*vertical-rl/,
    'sol/sağ .kenar-ad dikey yazı (writing-mode: vertical-rl) değil',
  );
  assert.match(
    STIL_CSS,
    /\.kenar-ad\s*\{[^}]*position:\s*absolute/,
    '.kenar-ad mutlak konumlu değil (ad çubuğun üstüne bindirilmiyor)',
  );
});

test('madde-1-d: rakip taş hâlâ çizilmiyor (Sahip ek bilgisi korunuyor)', () => {
  assert.ok(
    !/rafDiv\.appendChild\(tersTasElemaniOlustur/.test(EKRAN_JS),
    'ekran.js hâlâ rakip ıstakasına kapalı taş ekliyor olmamalı',
  );
});

test('madde-2-a: deste artık tek taş değil, üst üste kaydırılmış katmanlar olarak çiziliyor', () => {
  assert.doesNotMatch(
    EKRAN_JS,
    /if \(durum\.yerDestesi\.length > 0\) eleman\.yerDestesi\.appendChild\(tersTasElemaniOlustur\(\)\)/,
    'ekran.js hâlâ eski tek-taş deste çizimini kullanıyor',
  );
  assert.match(EKRAN_JS, /function yerDestesiYiginiCiz/, 'yerDestesiYiginiCiz işlevi yok');
  assert.match(
    EKRAN_JS,
    /yerDestesiYiginiCiz\(eleman\.yerDestesi,\s*durum\.yerDestesi\.length\)/,
    'masaCiz yerDestesiYiginiCiz\'i çağırmıyor',
  );
  const maksimumEslesme = EKRAN_JS.match(/const DESTE_GORUNEN_MAKSIMUM = (\d+);/);
  assert.ok(maksimumEslesme, 'DESTE_GORUNEN_MAKSIMUM tanımlı değil');
  assert.ok(Number(maksimumEslesme[1]) > 1, 'DESTE_GORUNEN_MAKSIMUM 1\'den büyük olmalı (yığın görünsün)');
});

test('madde-2-b: deste taşları #yerDestesi içinde mutlak konumlanıp ortada üst üste biniyor', () => {
  assert.match(
    STIL_CSS,
    /#yerDestesi \.tas-arka\s*\{[^}]*position:\s*absolute/,
    '#yerDestesi .tas-arka mutlak konumlu değil (yığın görünümü kurulamaz)',
  );
});

test('madde-3-a: masa zemin dokusu eski (neredeyse görünmez) opaklıktan daha belirgin', () => {
  const eslesme = MASA_ZEMIN_SVG.match(/opacity="([\d.]+)"/);
  assert.ok(eslesme, 'masa-zemin.svg deseninde opacity tanımlı değil');
  assert.ok(Number(eslesme[1]) > 0.12, `doku opaklığı ${eslesme[1]}, eski değer 0.12'den büyük olmalı (madde 3)`);
});

test('madde-3-b: masanın çevresine ahşap çerçeve (masa-cerceve.svg) gerçekten uygulanıyor', () => {
  assert.match(
    STIL_CSS,
    /#masa\s*\{[\s\S]*?border-image-source:\s*url\(['"]\.\.\/gorsel\/masa-cerceve\.svg['"]\)/,
    '#masa border-image-source ile masa-cerceve.svg kullanmıyor',
  );
});

test('madde-4-a: köşe yığını boşken "0" yazmıyor, boş yuva görseli gösteriyor', () => {
  assert.match(
    EKRAN_JS,
    /if \(yigin\.length === 0\) \{\s*\n\s*yiginAlani\.appendChild\(gorselOlustur\(['"]yuva-bos\.svg['"]/,
    'koseYiginiCiz boşken yuva-bos.svg eklemiyor',
  );
  assert.match(
    EKRAN_JS,
    /if \(yigin\.length === 0\) \{[\s\S]*?sayacEl\.textContent = '';/,
    'koseYiginiCiz boşken sayaç metnini boşaltmıyor (hâlâ "0" yazabilir)',
  );
});

test('madde-4-b: erişilebilir adet etiketi (aria-label) boşken de gerçek sayıyı (0) taşımaya devam ediyor', () => {
  assert.match(
    EKRAN_JS,
    /kutu\.setAttribute\('aria-label', metinAl\('koseYigini\.adet', \[oyuncuAdi\(oyuncu\), yigin\.length\]\)\);/,
    'koseYiginiCiz aria-label\'ı görsel "0" gizlemesinden bağımsız olarak hâlâ ayarlamıyor',
  );
});
