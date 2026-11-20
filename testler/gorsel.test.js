import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#15 (sınıf V) — şartname is/tasokey-15/sartname.md §1-5, kabul 1-8.
// Ücretli üretim yok; el yazımı SVG dosyaları docs/gorsel/ altında ölçülür.
// tasokey#28 (ADR-011): sayı başına 13 ayrı yüz dosyası kaldırıldı, tek paylaşılan gövde
// (tas-govde.svg) ile değiştirildi; rakam artık SVG değil DOM katmanı (gorsel-baglanti.test.js).

const GORSEL_DIZINI = join(import.meta.dirname, '..', 'docs', 'gorsel');
const DOSYA_BUTCESI = 4096; // bayt, dosya başına (şartname §1)
const TOPLAM_BUTCE = 28672; // bayt, 7 dosya toplamı (dosya başına bütçenin 7 katı; ADR-011 ile dosya sayısı 19'dan 7'ye indi)

const HEX_YOK_GRUBU = ['tas-govde.svg', 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg'];
const TUM_DOSYALAR = [
  'tas-govde.svg',
  'tas-sahte-okey.svg',
  'tas-okey-cerceve.svg',
  'tas-arka.svg',
  'masa-zemin.svg',
  'istaka.svg',
  'yuva-bos.svg',
];

const VIEWBOX_100x140 = ['tas-govde.svg', 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg'];

const ICERIK_KUTUSU = { xMin: 8, xMax: 92, yMin: 11.2, yMax: 128.8 };

const YASAK_DESENLER = [
  /<script\b/i, /<image\b/i, /<foreignObject\b/i, /<text\b/i, /<title\b/i, /<desc\b/i,
  /url\(\s*['"]?https?:/i, /base64/i, /@font-face/i,
  /\buse\b[^>]*\bhref\s*=\s*["'](?!#)/i, // dış kaynaklı use href (# ile başlamayan)
];

const HEX_RENK_DESENI = /#[0-9a-fA-F]{3,8}\b/;

function oku(ad) {
  return readFileSync(join(GORSEL_DIZINI, ad), 'utf8');
}

function boyut(ad) {
  return statSync(join(GORSEL_DIZINI, ad)).size;
}

test('kabul-1: dosyaların hepsi docs/gorsel altında var', () => {
  const mevcut = new Set(readdirSync(GORSEL_DIZINI));
  for (const ad of TUM_DOSYALAR) {
    assert.ok(mevcut.has(ad), `${ad} bulunamadı`);
  }
  assert.equal(TUM_DOSYALAR.length, 7, 'varlık listesi 7 olmalı (ADR-011: sayı başına 13 yüz dosyası yerine 1 paylaşılan gövde)');
});

test('kabul-2: dosya başına <=4096 bayt, toplam <=28672 bayt (ölçülen sayı)', () => {
  let toplam = 0;
  const olculenler = [];
  for (const ad of TUM_DOSYALAR) {
    const s = boyut(ad);
    toplam += s;
    olculenler.push(`${ad}=${s}B`);
    assert.ok(s <= DOSYA_BUTCESI, `${ad} ${s} bayt, bütçe ${DOSYA_BUTCESI} aşıldı`);
  }
  console.log('[gorsel.test] ölçülen boyutlar:', olculenler.join(', '));
  console.log(`[gorsel.test] ölçülen toplam: ${toplam} bayt (bütçe ${TOPLAM_BUTCE})`);
  assert.ok(toplam <= TOPLAM_BUTCE, `toplam ${toplam} bayt, bütçe ${TOPLAM_BUTCE} aşıldı`);
});

test('kabul-3: viewBox değerleri doğru', () => {
  for (const ad of VIEWBOX_100x140) {
    const icerik = oku(ad);
    assert.match(icerik, /viewBox="0 0 100 140"/, `${ad} viewBox 0 0 100 140 değil`);
  }
  assert.match(oku('istaka.svg'), /viewBox="0 0 400 120"/, 'istaka.svg viewBox 0 0 400 120 değil');
  assert.match(oku('masa-zemin.svg'), /viewBox="0 0 240 240"/, 'masa-zemin.svg viewBox 0 0 240 240 değil');
});

test('kabul-4: taş gövdesinde rx=10 gövde var; rakam alanı ve altındaki renk dairesi içerik kutusunu aşmıyor', () => {
  const icerik = oku('tas-govde.svg');
  assert.match(icerik, /<rect[^>]*\brx="10"[^>]*\bry="10"[^>]*\/>/, 'tas-govde.svg rx=10/ry=10 gövde dikdörtgeni yok');

  const alanEslesme = icerik.match(/<rect[^>]*\bdata-alan="rakam"[^>]*\/>/);
  assert.ok(alanEslesme, 'tas-govde.svg rakam alanını işaretleyen data-alan="rakam" rect\'i yok (DOM rakam katmanı bu alana hizalanır)');
  const alanSayi = (ozellik) => Number(alanEslesme[0].match(new RegExp(`\\b${ozellik}="([\\d.]+)"`))[1]);
  const alanX = alanSayi('x');
  const alanY = alanSayi('y');
  const alanGenislik = alanSayi('width');
  const alanYukseklik = alanSayi('height');
  assert.ok(
    alanX >= ICERIK_KUTUSU.xMin && alanX + alanGenislik <= ICERIK_KUTUSU.xMax,
    `rakam alanı x ekseninde içerik kutusunu (${ICERIK_KUTUSU.xMin}..${ICERIK_KUTUSU.xMax}) aşıyor`,
  );
  assert.ok(
    alanY >= ICERIK_KUTUSU.yMin && alanY + alanYukseklik <= ICERIK_KUTUSU.yMax,
    `rakam alanı y ekseninde içerik kutusunu (${ICERIK_KUTUSU.yMin}..${ICERIK_KUTUSU.yMax}) aşıyor`,
  );

  const daireEslesme = icerik.match(/<circle[^>]*\/>/);
  assert.ok(daireEslesme, 'tas-govde.svg altındaki renk dairesi yok');
  const daireSayi = (ozellik) => Number(daireEslesme[0].match(new RegExp(`\\b${ozellik}="([\\d.]+)"`))[1]);
  const cx = daireSayi('cx');
  const cy = daireSayi('cy');
  const r = daireSayi('r');
  assert.ok(
    cx - r >= ICERIK_KUTUSU.xMin && cx + r <= ICERIK_KUTUSU.xMax,
    `renk dairesi x ekseninde içerik kutusunu (${ICERIK_KUTUSU.xMin}..${ICERIK_KUTUSU.xMax}) aşıyor`,
  );
  assert.ok(
    cy - r >= ICERIK_KUTUSU.yMin && cy + r <= ICERIK_KUTUSU.yMax,
    `renk dairesi y ekseninde içerik kutusunu (${ICERIK_KUTUSU.yMin}..${ICERIK_KUTUSU.yMax}) aşıyor`,
  );
});

test('kabul-5: yasak düğüm/öznitelik taraması 0 eşleşme', () => {
  const bulunanlar = [];
  for (const ad of TUM_DOSYALAR) {
    const icerik = oku(ad);
    for (const desen of YASAK_DESENLER) {
      if (desen.test(icerik)) bulunanlar.push(`${ad}: ${desen}`);
    }
  }
  assert.equal(bulunanlar.length, 0, `yasak düğüm/öznitelik bulundu:\n${bulunanlar.join('\n')}`);
});

test('kabul-6: taş yüzü/sahte okey/okey çerçevesi dosyalarında hex renk yok', () => {
  const bulunanlar = [];
  for (const ad of HEX_YOK_GRUBU) {
    const icerik = oku(ad);
    if (HEX_RENK_DESENI.test(icerik)) bulunanlar.push(ad);
    assert.ok(/currentColor|var\(--/.test(icerik), `${ad} currentColor ya da var(-- içermiyor`);
  }
  assert.equal(bulunanlar.length, 0, `hex renk bulundu: ${bulunanlar.join(', ')}`);
});

test('kabul-7: her dosya aria-hidden="true" taşıyor', () => {
  for (const ad of TUM_DOSYALAR) {
    assert.match(oku(ad), /aria-hidden="true"/, `${ad} aria-hidden="true" içermiyor`);
  }
});

