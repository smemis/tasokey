import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { degiskenOlcusu, kademeSozlukleri, yorumlariAt } from './yardimci/css-olcu.js';

// tasokey#46 (sınıf K) — Sahip isteği: "Taşın etrafında çok ince, çok az görünen kenar çizgisi"
// (plan.md İş 2, R-015). Kısıtlar burada ÖLÇÜLÜR:
//  (a) kenarın kalınlık/renk/opaklık değeri TEK KAYNAKTAN gelir: stil.css :root'taki üç değişken;
//      üç gövde varyantı (tas-govde / tas-sahte-okey / tas-arka) aynı değişkenleri okur, SVG'lere
//      sayı yazılmaz (SVG'ler inline basıldığı için CSS değişkeni içeriye geçer — arayuz/gorseller.js).
//  (b) çizgi viewBox'ın İÇİNDE kalır: dikdörtgenin kenardan içe kaçıklığı en az kalınlığın yarısıdır,
//      yani konturun yarısı kesilmez (kontur ölçekle büyüyen user-unit cinsindendir, bu yüzden bu
//      ilişki her duyarlı kademede ve küçültülmüş taşlarda da geçerlidir).
//  (c) taşın görünen ölçüsü ve köşe yarıçapı değişmez: gövde dikdörtgeni hâlâ rx=10, kenar çizgisi
//      onunla eş merkezli (rx = 10 - kaçıklık), .tas'a CSS border eklenmez.
//  (d) "çok az görünen" ölçülebilir: gövde rengiyle kontrast oranı WCAG formülüyle hesaplanır.

const DOCS_DIZINI = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_DIZINI, 'arayuz', 'stil.css'), 'utf8');

const VARYANTLAR = ['tas-govde.svg', 'tas-sahte-okey.svg', 'tas-arka.svg'];
const KENAR_DEGISKENLERI = ['--tas-kenar-kalinlik', '--tas-kenar-renk', '--tas-kenar-opaklik'];

// "Çok az görünen" bandı (istek metninin ölçülebilir karşılığı): 1'e yakın ama fark edilir.
const KONTRAST_ALT = 1.1;
const KONTRAST_UST = 2.0;
// Kenar çizgisi taşın kenarına yapışıktır: iç çerçeveye dönüşmesin diye kaçıklık,
// konturun yarısından en çok bu kadar (viewBox birimi) fazla olabilir.
const KACIKLIK_PAYI = 0.6;

function svgOku(ad) {
  return readFileSync(join(DOCS_DIZINI, 'gorsel', ad), 'utf8');
}

function kenarDugumu(icerik) {
  const eslesme = icerik.match(/<rect[^>]*\bdata-alan="kenar"[^>]*\/>/);
  return eslesme ? eslesme[0] : null;
}

function sayi(dugum, ozellik) {
  const eslesme = dugum.match(new RegExp(`\\b${ozellik}="([-\\d.]+)"`));
  assert.ok(eslesme, `kenar düğümünde ${ozellik} sayısal değeri yok`);
  return Number(eslesme[1]);
}

/** sRGB bileşenini doğrusallaştırır (WCAG 2.1 relative luminance). */
function dogrusal(bilesen) {
  const o = bilesen / 255;
  return o <= 0.03928 ? o / 12.92 : ((o + 0.055) / 1.055) ** 2.4;
}

function parlaklik([r, g, b]) {
  return 0.2126 * dogrusal(r) + 0.7152 * dogrusal(g) + 0.0722 * dogrusal(b);
}

function hexAyir(deger) {
  const eslesme = deger.trim().match(/^#([0-9a-fA-F]{6})$/);
  assert.ok(eslesme, `hex renk beklenirken "${deger}" bulundu`);
  const h = eslesme[1];
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

/** Yarı saydam konturun gövde üzerinde oluşturduğu gerçek rengi hesaplar. */
function bindirme(ust, alt, opaklik) {
  return ust.map((u, i) => alt[i] + (u - alt[i]) * opaklik);
}

function kontrast(a, b) {
  const [buyuk, kucuk] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (buyuk + 0.05) / (kucuk + 0.05);
}

test('kabul-a-1: kenar çizgisinin üç değeri stil.css :root içinde TEK kez tanımlı (tek kaynak)', () => {
  const kokGovde = yorumlariAt(STIL_CSS).match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(kokGovde, 'stil.css içinde :root bloğu yok');
  for (const ad of KENAR_DEGISKENLERI) {
    const tanimlar = yorumlariAt(STIL_CSS).match(new RegExp(`${ad}\\s*:`, 'g')) ?? [];
    assert.equal(tanimlar.length, 1, `${ad} ${tanimlar.length} kez tanımlı; tek kaynak olmalı`);
    assert.match(kokGovde[1], new RegExp(`${ad}\\s*:`), `${ad} :root içinde tanımlı değil`);
  }
});

test('kabul-a-2: üç gövde varyantı kenar değerlerini yalnız var() ile okur, dosyalara sayı yazılmaz', () => {
  const dugumler = [];
  for (const ad of VARYANTLAR) {
    const dugum = kenarDugumu(svgOku(ad));
    assert.ok(dugum, `${ad} içinde data-alan="kenar" konturu yok`);
    assert.match(dugum, /stroke="var\(--tas-kenar-renk\)"/, `${ad} kenar rengini tek kaynaktan almıyor`);
    assert.match(dugum, /stroke-width="var\(--tas-kenar-kalinlik\)"/, `${ad} kenar kalınlığını tek kaynaktan almıyor`);
    assert.match(dugum, /stroke-opacity="var\(--tas-kenar-opaklik\)"/, `${ad} kenar opaklığını tek kaynaktan almıyor`);
    assert.match(dugum, /fill="none"/, `${ad} kenar konturu dolgulu; yalnız çizgi olmalı`);
    dugumler.push(dugum);
  }
  // Üç varyant aynı kaynağı okur: kontur işaretlemesi birebir aynı olmalı.
  assert.equal(new Set(dugumler).size, 1, `üç varyantın kenar konturu aynı değil:\n${dugumler.join('\n')}`);
});

test('kabul-b: çizgi viewBox içinde kalır (yarısı kesilmez) ve her kademede aynı değeri okur', () => {
  const dugum = kenarDugumu(svgOku('tas-govde.svg'));
  assert.ok(dugum, 'tas-govde.svg içinde kenar konturu yok');
  const x = sayi(dugum, 'x');
  const y = sayi(dugum, 'y');
  const genislik = sayi(dugum, 'width');
  const yukseklik = sayi(dugum, 'height');

  const olculen = [];
  const kalinliklar = [];
  for (const { ad, sozluk } of kademeSozlukleri(STIL_CSS)) {
    const kalinlik = degiskenOlcusu('--tas-kenar-kalinlik', sozluk);
    assert.equal(kalinlik.birim, '', '--tas-kenar-kalinlik viewBox birimi (birimsiz sayı) olmalı: kontur taşla ölçeklenir');
    const yari = kalinlik.sayi / 2;
    olculen.push(`${ad} → ${kalinlik.sayi}`);
    kalinliklar.push(kalinlik.sayi);
    for (const [etiket, kaciklik] of [['sol', x], ['üst', y], ['sağ', 100 - (x + genislik)], ['alt', 140 - (y + yukseklik)]]) {
      assert.ok(kaciklik >= yari - 1e-9, `${etiket} kenarda kontur viewBox dışına taşıyor (kaçıklık ${kaciklik} < ${yari})`);
      assert.ok(
        kaciklik <= yari + KACIKLIK_PAYI,
        `${etiket} kenarda kontur taşın kenarından çok uzak (kaçıklık ${kaciklik}); kenar çizgisi iç çerçeveye dönüşür`,
      );
    }
  }
  console.log('[tas-kenar] ölçülen kalınlık (viewBox birimi) kademe kademe:', olculen.join(' | '));
  assert.equal(new Set(kalinliklar).size, 1, `kalınlık kademeler arasında değişiyor (${kalinliklar.join(', ')}); tek kaynak bozulur`);
});

test('kabul-c: taşın görünen ölçüsü/köşe yarıçapı değişmedi; kenar gövdeyle eş merkezli; .tas border almadı', () => {
  for (const ad of VARYANTLAR) {
    const icerik = svgOku(ad);
    assert.match(icerik, /viewBox="0 0 100 140"/, `${ad} viewBox'ı değişmiş`);
    assert.match(
      icerik,
      /<rect[^>]*\bx="0"[^>]*\by="0"[^>]*\bwidth="100"[^>]*\bheight="140"[^>]*\brx="10"[^>]*\/>/,
      `${ad} gövde dikdörtgeni (0,0,100,140, rx=10) değişmiş`,
    );
  }
  const dugum = kenarDugumu(svgOku('tas-govde.svg'));
  const kaciklik = sayi(dugum, 'x');
  assert.equal(sayi(dugum, 'rx'), 10 - kaciklik, 'kenar çizgisinin rx değeri gövdenin rx=10 yarıçapıyla eş merkezli değil');
  assert.equal(sayi(dugum, 'ry'), 10 - kaciklik, 'kenar çizgisinin ry değeri gövdenin ry=10 yarıçapıyla eş merkezli değil');

  const tasKurali = yorumlariAt(STIL_CSS).match(/\n\.tas\s*\{([^}]*)\}/);
  assert.ok(tasKurali, 'stil.css içinde .tas kuralı yok');
  assert.ok(!/\bborder\s*:/.test(tasKurali[1]), '.tas CSS border almış; kenar çizgisi SVG konturu olmalı (köşelerde taşmasın)');
});

test('kabul-d: kenar çizgisi gövde rengine göre "çok az görünen" bandında (ölçülen kontrast)', () => {
  const [{ sozluk }] = kademeSozlukleri(STIL_CSS);
  const govde = hexAyir(sozluk.get('--tas-govde')[0]);
  const kenar = hexAyir(sozluk.get('--tas-kenar-renk')[0]);
  const opaklik = Number(sozluk.get('--tas-kenar-opaklik')[0]);
  assert.ok(opaklik > 0 && opaklik < 1, `--tas-kenar-opaklik 0-1 arasında olmalı, ölçülen ${opaklik}`);

  const gorunen = bindirme(kenar, govde, opaklik);
  const oran = kontrast(gorunen, govde);
  console.log(
    `[tas-kenar] ölçülen kontrast: ${oran.toFixed(2)}:1 (gövde #${govde.map((c) => c.toString(16).padStart(2, '0')).join('')}, ` +
      `kenar opaklık ${opaklik}, bindirilmiş rgb(${gorunen.map((c) => Math.round(c)).join(',')}))`,
  );
  assert.ok(oran >= KONTRAST_ALT, `kenar çizgisi görünmez (${oran.toFixed(2)}:1 < ${KONTRAST_ALT}:1)`);
  assert.ok(oran <= KONTRAST_UST, `kenar çizgisi fazla belirgin (${oran.toFixed(2)}:1 > ${KONTRAST_UST}:1); istek "çok az görünen" diyor`);
});
