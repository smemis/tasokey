import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { degiskenOlcusu, kademeSozlukleri, yorumlariAt } from './yardimci/css-olcu.js';

// tasokey#39 — ADR-014: taş atma ve çekme hedef alanları büyütülsün.
// İstek (Sahip): "Köşe yığınlarının ve yer destesinin bırakma/tıklama hedefi taş boyundan
// BAĞIMSIZ tek bir CSS değişkeninden gelir; taşın görünen ölçüsü değişmez."
// Kabul: öz-test (a) hedef ölçüsünün o değişkenden geldiğini, (b) her duyarlı kademede tanımlı
// (çözümlenebilir, pozitif bir uzunluk) olduğunu, (c) büyüyen hedefin komşu öğeyi örtmediğini
// (ızgara boşluğunun yarısını geçmediğini), (d) taş görünümünün değişmediğini doğrular.
// Kaynak taraması + gerçek calc() hesabı (bu projenin arayüz testleri deseni; DOM yürütmesi yok).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const SURUKLE_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'surukle.js'), 'utf8');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const YORUMSUZ_STIL = yorumlariAt(STIL_CSS);

const HEDEF_DEGISKENI = '--hedef-pay';
// Hedefin büyüyebileceği boşluk: masa ızgarasının hücreler arası boşluğu. Köşe yığınının en yakın
// ETKİLEŞİMLİ komşusu (yandaki ıstaka paneli / kenar) bu boşluğun ötesindedir.
const KOMSU_BOSLUGU = '--masa-bosluk';

/**
 * Bir CSS seçicisinin gövdesi (ilk eşleşen kural). Seçici listesi virgülle yazılmış olabilir
 * (`.kose::after, #yerDestesi::after { … }`) — bu yüzden liste ayrıştırılır, metin eşleştirilmez.
 */
function kuralGovdesi(secici) {
  for (const [, seciciler, govde] of YORUMSUZ_STIL.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const liste = seciciler.split(',').map((parca) => parca.trim().replace(/\s+/g, ' '));
    if (liste.includes(secici)) return govde;
  }
  return null;
}

function ekDegiskenler() {
  const sutun = EKRAN_JS.match(/const RAF_SUTUN_SAYISI = (\d+);/);
  return new Map(sutun ? [['--raf-sutun-sayisi', [sutun[1]]]] : []);
}

test('kabul-1: hedef payı stil.css :root içinde TEK kez tanımlı (tek kaynak)', () => {
  const tanimlar = [...YORUMSUZ_STIL.matchAll(new RegExp(`${HEDEF_DEGISKENI}\\s*:\\s*([^;}]+)`, 'g'))];
  assert.equal(
    tanimlar.length,
    1,
    `${HEDEF_DEGISKENI} ${tanimlar.length} kez tanımlı; hedef ölçüsünün tek kaynağı olmalı`,
  );
  const kokGovdesi = YORUMSUZ_STIL.match(/:root\s*\{([\s\S]*?)\n\}/);
  assert.ok(kokGovdesi, 'stil.css içinde :root bloğu yok');
  assert.ok(
    kokGovdesi[1].includes(`${HEDEF_DEGISKENI}:`),
    `${HEDEF_DEGISKENI} ilk :root bloğunda tanımlı değil (tek kaynak orası)`,
  );
});

test('ASIL KABUL (a): köşe ve destenin hedef alanı ölçüsünü yalnız o değişkenden alıyor', () => {
  for (const secici of ['.kose::after', '#yerDestesi::after']) {
    const govde = kuralGovdesi(secici);
    assert.ok(govde, `stil.css içinde ${secici} kuralı yok — hedef alanı büyütülmemiş`);
    assert.match(govde, /content:\s*''/, `${secici} sözde öğesi içerik tanımlamıyor (hiç çizilmez)`);
    assert.match(govde, /position:\s*absolute/, `${secici} mutlak konumlu değil (düzeni kaydırır)`);
    const inset = govde.match(/inset:\s*([^;]+);/);
    assert.ok(inset, `${secici} inset ile büyümüyor`);
    assert.match(
      inset[1],
      new RegExp(`var\\(${HEDEF_DEGISKENI}\\)`),
      `${secici} hedef ölçüsünü ${HEDEF_DEGISKENI} değişkeninden almıyor: "${inset[1]}"`,
    );
  }
});

test('ASIL KABUL (b): hedef payı HER duyarlı kademede tanımlı ve pozitif bir uzunluk', () => {
  const kademeler = kademeSozlukleri(STIL_CSS, ekDegiskenler());
  // Kademeler: temel :root + 1300px + 900px + 480px + telefon yatay (en az 4 kademe beklenir).
  assert.ok(kademeler.length >= 4, `beklenenden az kademe bulundu (${kademeler.length})`);
  for (const { ad, sozluk } of kademeler) {
    let olcu;
    try {
      olcu = degiskenOlcusu(HEDEF_DEGISKENI, sozluk);
    } catch (hata) {
      assert.fail(`${ad}: ${HEDEF_DEGISKENI} çözümlenemiyor → ${hata.message}`);
    }
    assert.equal(olcu.birim, 'px', `${ad}: hedef payı uzunluk değil ("${olcu.birim || 'birimsiz'}")`);
    assert.ok(olcu.sayi > 0, `${ad}: hedef payı ${olcu.sayi}px — hedef hiç büyümüyor`);
  }
});

test('ASIL KABUL (c): büyüyen hedef komşu öğeye girmiyor (ızgara boşluğunun yarısını geçmiyor)', () => {
  for (const { ad, sozluk } of kademeSozlukleri(STIL_CSS, ekDegiskenler())) {
    const pay = degiskenOlcusu(HEDEF_DEGISKENI, sozluk);
    const bosluk = degiskenOlcusu(KOMSU_BOSLUGU, sozluk);
    assert.ok(
      pay.sayi <= bosluk.sayi / 2 + 1e-9,
      `${ad}: hedef payı ${pay.sayi}px, ızgara boşluğu ${bosluk.sayi}px — halka komşu hücrenin `
      + 'kutusuna girer (en çok boşluğun yarısı olmalı)',
    );
  }
});

test('ASIL KABUL (d): taşın görünen ölçüsü hedef payından etkilenmiyor', () => {
  const tas = kuralGovdesi('.tas');
  assert.ok(tas, 'stil.css içinde .tas kuralı yok');
  assert.match(tas, /width:\s*var\(--tas-genislik\)/, '.tas genişliği --tas-genislik değil');
  assert.match(tas, /height:\s*var\(--tas-yukseklik\)/, '.tas yüksekliği --tas-yukseklik değil');

  const yigin = kuralGovdesi('.kose-yigin');
  assert.ok(yigin, 'stil.css içinde .kose-yigin kuralı yok');
  assert.match(yigin, /width:\s*var\(--tas-genislik\)/, 'köşe yığını genişliği taş ölçüsünden gelmiyor');

  // Hedef payı hiçbir görünür ölçüde (genişlik/yükseklik/yazı boyu/dolgu) kullanılmamalı:
  // yalnız hedef halkasının inset'inde ve kendi tanımında geçer.
  const yanlisKullanim = [...YORUMSUZ_STIL.matchAll(
    new RegExp(`(width|height|min-width|min-height|font-size|padding[\\w-]*|gap)\\s*:[^;}]*var\\(${HEDEF_DEGISKENI}\\)`, 'g'),
  )].map((e) => e[0].trim());
  assert.deepEqual(
    yanlisKullanim,
    [],
    `${HEDEF_DEGISKENI} görünür ölçüde kullanılmış (taş/kutu büyür): ${yanlisKullanim.join(', ')}`,
  );
});

test('kabul-2: hedef halkası, isabet testinin bulduğu öğenin KENDİSİNDE (çocukta değil)', () => {
  // surukle.js bırakma noktasındaki öğeden yukarı doğru bu seçicileri arar; halka bu öğelerin
  // sözde öğesi olmalı ki `closest` onu bulabilsin (sözde öğe isabetinde hedef, sahibi olur).
  assert.match(SURUKLE_JS, /closest\('\.kose\[data-kose\]'\)/, 'surukle.js köşeyi .kose[data-kose] ile arıyor olmalı');
  assert.match(
    SURUKLE_JS,
    /closest\('\[data-hedef="yerDestesi"\]'\)/,
    'surukle.js desteyi [data-hedef="yerDestesi"] ile arıyor olmalı',
  );
  assert.match(INDEX_HTML, /id="yerDestesi"[^>]*data-hedef="yerDestesi"/, '#yerDestesi data-hedef taşımıyor');
  assert.equal(
    (INDEX_HTML.match(/class="kose" data-kose="/g) || []).length,
    4,
    'dört köşenin hepsi .kose + data-kose taşımalı (halka o öğenin sözde öğesi)',
  );
});

test('kabul-3: hedef payı masa boşluğundan türüyor → kademe değişince kendiliğinden küçülür', () => {
  const tanim = YORUMSUZ_STIL.match(new RegExp(`${HEDEF_DEGISKENI}:\\s*([^;]+);`));
  assert.ok(tanim, `${HEDEF_DEGISKENI} tanımı okunamadı`);
  assert.match(
    tanim[1],
    new RegExp(`var\\(${KOMSU_BOSLUGU}\\)`),
    `${HEDEF_DEGISKENI} sabit bir ölçü ("${tanim[1].trim()}"); dar kademede komşuya girer `
    + `ya da gereksiz küçülür — ${KOMSU_BOSLUGU} tabanından türemeli`,
  );
});
