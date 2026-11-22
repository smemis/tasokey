import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EL_SONUCU } from '../docs/cekirdek/el.js';
import { rakipEliAcikMi } from '../docs/arayuz/etkilesim.js';
import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';
import { degiskenOlcusu, kademeSozlukleri } from './yardimci/css-olcu.js';

// tasokey#38 ek bilgi (Sahip, 2026-11-20): "El bittiğinde rakiplerin ıstakaları da gösterilsin."
// El SÜRERKEN rakip taşı hiç görünmez (tasokey#31 ek bilgisi: yalnız ıstakanın ahşap sırtı);
// el bitince (kazanan, berabere, tur sınırı) üç rakibin eli de yüzü açık serilir.
// Karar saf (etkilesim.js rakipEliAcikMi) → DOM'suz sınanır; çizim ve yerleşim kaynak taramasıyla.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

test('kabul-a-1: el sürerken rakip ıstakası KAPALI', () => {
  assert.equal(rakipEliAcikMi({ sonuc: EL_SONUCU.SUREN }), false);
});

test('kabul-a-2: elin bittiği her sonuçta rakip ıstakası açılır (kazanan, berabere, tur sınırı)', () => {
  const bitenSonuclar = Object.values(EL_SONUCU).filter((sonuc) => sonuc !== EL_SONUCU.SUREN);
  assert.ok(bitenSonuclar.length >= 3, 'el.js EL_SONUCU beklenenden az bitiş durumu tanımlıyor');
  for (const sonuc of bitenSonuclar) {
    assert.equal(rakipEliAcikMi({ sonuc }), true, `${sonuc} sonucunda rakip ıstakası açılmıyor`);
  }
});

test('kabul-b: her rakip kenarında taşların serileceği ayrı kutu var', () => {
  for (const id of ['kenarUstTaslar', 'kenarSolTaslar', 'kenarSagTaslar']) {
    assert.match(INDEX_HTML, new RegExp(`id="${id}"`), `index.html içinde #${id} yok`);
  }
  assert.equal(
    (INDEX_HTML.match(/class="kenar-taslar"/g) || []).length,
    3,
    'kenar-taslar kutusu üç rakip kenarının hepsinde olmalı',
  );
});

test('kabul-c: ekran.js kutuyu yalnız saf karara (rakipEliAcikMi) göre dolduruyor', () => {
  assert.match(EKRAN_JS, /import \{[^}]*rakipEliAcikMi[^}]*\} from '\.\/etkilesim\.js'/, 'ekran.js saf kararı almıyor');
  assert.match(
    EKRAN_JS,
    /const rakipEliAcik = rakipEliAcikMi\(durum\);/,
    'masaCiz kararı bir kez hesaplayıp kullanmıyor',
  );
  assert.match(
    EKRAN_JS,
    // tasokey#39 ek bilgisi: çizim artık dizilim için gösterge taşını da alıyor (çift kuralı
    // gösterge taşını dışlar — dizilim.js ciftGecerliMi).
    /rakipTaslariCiz\(eleman\[taslar\], durum\.eller\[oyuncu\], durum\.okeyTasi, rakipEliAcik, oyuncu, durum\.gosterge\)/,
    'masaCiz rakibin gerçek elini (durum.eller[oyuncu]) açmıyor',
  );
  assert.ok(
    /function rakipTaslariCiz\([^)]*\) \{\s*kutu\.innerHTML = '';\s*if \(!acikMi\)/.test(EKRAN_JS),
    'rakipTaslariCiz kapalıyken kutuyu boşaltmıyor (rakip taşı el sürerken görünebilir)',
  );
});

test('kabul-d: açılan taşlar düzeni kaydırmıyor — kutu akış dışında (mutlak), boşken gizli', () => {
  const kutu = STIL_CSS.match(/\.kenar-taslar\s*\{([^}]*)\}/);
  assert.ok(kutu, 'stil.css içinde .kenar-taslar kuralı yok');
  assert.match(kutu[1], /position:\s*absolute/, '.kenar-taslar akışa giriyor (ızgara satırını büyütür)');
  assert.match(STIL_CSS, /\.kenar-taslar:empty\s*\{[^}]*display:\s*none/, 'boş kutu gizlenmiyor');
  assert.match(kutu[1], /pointer-events:\s*none/, 'açılan rakip taşları tıklama hedefi olmamalı');
});

test('kabul-e: açılan taş ölçüsü tek kaynaktan türer ve kademelerde kendiliğinden küçülür', () => {
  assert.match(
    STIL_CSS,
    /--rakip-acik-tas-genislik:\s*calc\(var\(--tas-genislik\) \* var\(--rakip-acik-olcek\)\)/,
    'açık taş genişliği --tas-genislik tabanından türemiyor (sabit ölçü duyarlı kademelerde taşar)',
  );
  assert.match(
    STIL_CSS,
    /--rakip-acik-tas-yukseklik:\s*calc\(var\(--tas-yukseklik\) \* var\(--rakip-acik-olcek\)\)/,
    'açık taş yüksekliği --tas-yukseklik tabanından türemiyor',
  );
  const olcek = Number(STIL_CSS.match(/--rakip-acik-olcek:\s*([\d.]+)/)[1]);
  assert.ok(olcek > 0 && olcek < 1, `--rakip-acik-olcek 0-1 arasında değil (${olcek})`);
});

test('kabul-f: 15 taşlık el kenara sığacak sütun düzeniyle seriliyor', () => {
  const yatay = Number(STIL_CSS.match(/--rakip-acik-sutun-yatay:\s*(\d+)/)[1]);
  const dikey = Number(STIL_CSS.match(/--rakip-acik-sutun-dikey:\s*(\d+)/)[1]);
  const olcek = Number(STIL_CSS.match(/--rakip-acik-olcek:\s*([\d.]+)/)[1]);
  // Taş ölçüsü artık çıplak px DEĞİL, `clamp(taban, taban * ölçek, taban * tavan)` (ADR-022,
  // tasokey#64 iş 2) — metin eşleştiren okuma yerine değişken gerçekten hesaplanır. Ölçülen sayı
  // değişmedi: taban kademenin görünen taş genişliği (ölçek 1'de 58 px).
  const tasGenislik = degiskenOlcusu('--tas-genislik', kademeSozlukleri(STIL_CSS)[0].sozluk).sayi;
  // Istaka sütun sayısının tek kaynağı `arayuz/raf.js` (ADR-019/tasokey#48).
  const sutunSayisi = RAF_SUTUN_SAYISI;

  // Üst kenar: açılan sıra, Sahip'in kendi ıstakasından (12 taş genişliği) geniş olmamalı.
  assert.ok(
    yatay * tasGenislik * olcek <= sutunSayisi * tasGenislik,
    `üst kenarda açılan sıra ıstakadan geniş (${yatay} sütun × ölçek ${olcek})`,
  );
  // En yüksek el 15 taş (dagitim.js); dikey kenarda satır sayısı = 15 / sütun.
  assert.ok(dikey >= 2, 'sol/sağ kenarda tek sütun 15 taşı dikey sığdıramaz');
  assert.ok(Math.ceil(15 / dikey) * tasGenislik * olcek < 15 * tasGenislik, 'dikey seriliş tek sütundan dar değil');
});

test('kabul-g: açık ıstakanın erişilebilir etiketi dil anahtarından geliyor (iki dilde de dolu)', () => {
  assert.match(EKRAN_JS, /metinAl\('rakipAcikEl', \[oyuncuAdi\(oyuncu\), el\.length\]\)/, 'etiket dil anahtarından gelmiyor');
  for (const [dil, tablo] of [['tr', TR], ['en', EN]]) {
    assert.equal(typeof tablo.rakipAcikEl, 'string', `${dil}.json rakipAcikEl anahtarı yok`);
    assert.match(tablo.rakipAcikEl, /\{0\}/, `${dil}.json rakipAcikEl oyuncu adını almıyor`);
    assert.match(tablo.rakipAcikEl, /\{1\}/, `${dil}.json rakipAcikEl taş sayısını almıyor`);
  }
  assert.notEqual(TR.rakipAcikEl, EN.rakipAcikEl, 'tr/en metni aynı (çeviri yapılmamış)');
});

test('kabul-h: açılan taşlar sonuç penceresinin altında kalır (kendi kademesi yok — masa kademesi)', () => {
  const kutu = STIL_CSS.match(/\.kenar-taslar\s*\{([^}]*)\}/)[1];
  assert.ok(!/z-index/.test(kutu), '.kenar-taslar kendine z-index veriyor; masa kademesinde kalmalı (ADR-015)');
  const tasKurali = STIL_CSS.match(/\.kenar-taslar \.tas\s*\{([^}]*)\}/);
  assert.ok(tasKurali, 'stil.css içinde .kenar-taslar .tas kuralı yok');
  assert.ok(!/z-index/.test(tasKurali[1]), 'açılan rakip taşı kendine z-index veriyor (pencereyi örtebilir)');
});
