import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#15 (sınıf V) — şartname is/tasokey-15/sartname.md §1-5, kabul 1-8.
// Ücretli üretim yok; 19 el yazımı SVG dosyası docs/gorsel/ altında ölçülür.

const GORSEL_DIZINI = join(import.meta.dirname, '..', 'docs', 'gorsel');
const DOSYA_BUTCESI = 4096; // bayt, dosya başına (şartname §1)
const TOPLAM_BUTCE = 61440; // bayt, 19 dosya toplamı (şartname §1)

const TAS_YUZLERI = Array.from({ length: 13 }, (_, i) => `tas-${String(i + 1).padStart(2, '0')}.svg`);
const HEX_YOK_GRUBU = [...TAS_YUZLERI, 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg'];
const TUM_DOSYALAR = [
  ...TAS_YUZLERI,
  'tas-sahte-okey.svg',
  'tas-okey-cerceve.svg',
  'tas-arka.svg',
  'masa-zemin.svg',
  'istaka.svg',
  'yuva-bos.svg',
];

const VIEWBOX_100x140 = [...TAS_YUZLERI, 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg'];

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

// path 'd' içindeki M/L/H/V komutlarını izleyip ziyaret edilen tüm (x,y) noktalarını döndürür.
function pathNoktalari(d) {
  const noktalar = [];
  let x = 0, y = 0;
  const komutlar = d.match(/[MLHVZ][^MLHVZ]*/gi) ?? [];
  for (const parca of komutlar) {
    const tip = parca[0].toUpperCase();
    const sayilar = (parca.slice(1).match(/-?\d+\.?\d*/g) ?? []).map(Number);
    if (tip === 'M' || tip === 'L') {
      for (let i = 0; i < sayilar.length; i += 2) {
        x = sayilar[i]; y = sayilar[i + 1];
        noktalar.push([x, y]);
      }
    } else if (tip === 'H') {
      for (const nx of sayilar) { x = nx; noktalar.push([x, y]); }
    } else if (tip === 'V') {
      for (const ny of sayilar) { y = ny; noktalar.push([x, y]); }
    }
  }
  return noktalar;
}

test('kabul-1: 19 dosyanın hepsi docs/gorsel altında var', () => {
  const mevcut = new Set(readdirSync(GORSEL_DIZINI));
  for (const ad of TUM_DOSYALAR) {
    assert.ok(mevcut.has(ad), `${ad} bulunamadı`);
  }
  assert.equal(TUM_DOSYALAR.length, 19, 'varlık listesi 19 olmalı');
});

test('kabul-2: dosya başına <=4096 bayt, toplam <=61440 bayt (ölçülen sayı)', () => {
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

test('kabul-4: taş yüzlerinde rx=10 gövde var; rakam koordinatları içerik kutusunu aşmıyor', () => {
  for (const ad of TAS_YUZLERI) {
    const icerik = oku(ad);
    assert.match(icerik, /<rect[^>]*\brx="10"[^>]*\bry="10"[^>]*\/>/, `${ad} rx=10/ry=10 gövde dikdörtgeni yok`);
    const pathEslesme = icerik.match(/<path d="([^"]+)"/);
    assert.ok(pathEslesme, `${ad} rakam path'i yok`);
    const noktalar = pathNoktalari(pathEslesme[1]);
    assert.ok(noktalar.length > 0, `${ad} path koordinatı ayrıştırılamadı`);
    for (const [x, y] of noktalar) {
      assert.ok(
        x >= ICERIK_KUTUSU.xMin - 1e-6 && x <= ICERIK_KUTUSU.xMax + 1e-6,
        `${ad} x=${x} içerik kutusunu (${ICERIK_KUTUSU.xMin}..${ICERIK_KUTUSU.xMax}) aşıyor`,
      );
      assert.ok(
        y >= ICERIK_KUTUSU.yMin - 1e-6 && y <= ICERIK_KUTUSU.yMax + 1e-6,
        `${ad} y=${y} içerik kutusunu (${ICERIK_KUTUSU.yMin}..${ICERIK_KUTUSU.yMax}) aşıyor`,
      );
    }
  }
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

test('kabul-8: tas-01 … tas-13 birbirinden farklı', () => {
  const ozetler = new Set();
  for (const ad of TAS_YUZLERI) {
    const ozet = createHash('sha256').update(oku(ad)).digest('hex');
    assert.ok(!ozetler.has(ozet), `${ad} bir başka tas-XX.svg ile birebir aynı`);
    ozetler.add(ozet);
  }
  assert.equal(ozetler.size, 13, '13 farklı içerik özeti bekleniyor');
});
