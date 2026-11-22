import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';
import {
  BirimHatasi, degiskenOlcusu, degiskenleriTopla, ifadeHesapla, kademeSozlukleri,
  sozlukleriBirlestir, varCoz, yorumlariAt,
} from './yardimci/css-olcu.js';

// tasokey#68 (üst iş tasokey#64) — ADR-022: oyuncunun ıstakası ve taşları TEK ölçek
// değişkeninden büyür. Istek (Sahip): "ekranın izin verdiği kadar, en çok 2 kat; ölçek tek bir
// değişkenden gelsin". Burada ölçülen, kararın YAPISI (taban × ölçek, tavan tek yerde, kapatma
// anahtarı, ölçeğe bağlanmayacak değişkenler); ölçek DEĞERLERİNİN sığdırma bütçesini sağladığı
// `sigdirma-butcesi.test.js`te, gerçek çakışma/taşma ölçümü tarayıcıda (`yerlesim-cakisma.olcum.js`).
// Bütün denetimler statiktir: CSS metni ayrıştırılır ve ifadeler GERÇEKTEN hesaplanır.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const YORUMSUZ = yorumlariAt(STIL_CSS);

// `--raf-sutun-sayisi` CSS'te değil `arayuz/raf.js`te tanımlıdır (ADR-019, tek kaynak).
const EKLER = new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]);
const KADEMELER = kademeSozlukleri(STIL_CSS, EKLER);

/**
 * Kapatma anahtarının ölçütü: `tasokey#13`ten (yatay+kısa kademe `tasokey#31`) beri geçerli olan
 * taş ölçüsü merdiveni. Ölçek 1 iken dört kademenin de bu değerleri BİREBİR vermesi gerekir —
 * ADR-022/4. Kademe adı `css-olcu.js`in verdiği addır (`@media` sorgusu).
 */
const BUGUNKU_MERDIVEN = [
  { kademe: 'temel (:root)', tas: [58, 82], arka: [36, 52] },
  { kademe: '@media (max-width: 1300px)', tas: [50, 72], arka: [30, 44] },
  { kademe: '@media (max-width: 900px)', tas: [42, 60], arka: [24, 36] },
  { kademe: '@media (max-width: 480px)', tas: [34, 50], arka: [18, 28] },
  {
    kademe: '@media (orientation: landscape) and (max-height: 500px)',
    tas: [25, 36],
    arka: [13, 20],
  },
];

const TURETILENLER = [
  ['--tas-genislik', '--tas-taban-genislik'],
  ['--tas-yukseklik', '--tas-taban-yukseklik'],
  ['--tas-arka-genislik', '--tas-arka-taban-genislik'],
  ['--tas-arka-yukseklik', '--tas-arka-taban-yukseklik'],
];

/** Değişkenin değeri (ilk bildirim) — çözülmemiş ham ifade. */
function ham(ad, sozluk) {
  const degerler = sozluk.get(ad);
  assert.ok(degerler, `${ad} hiçbir kademede tanımlı değil`);
  return degerler[0];
}

/** `ad` değişkeni (iç içe var() zinciri boyunca) `hedef` değişkenine dayanıyor mu? */
function bagimliMi(ad, sozluk, hedef, derinlik = 0) {
  if (derinlik > 12) throw new Error(`var() döngüsü: ${ad}`);
  const deger = sozluk.get(ad)?.[0];
  if (!deger) return false;
  const adlar = [...deger.matchAll(/var\((--[\w-]+)/g)].map(([, bulunan]) => bulunan);
  return adlar.includes(hedef) || adlar.some((alt) => bagimliMi(alt, sozluk, hedef, derinlik + 1));
}

/** Kademenin sözlüğü, `--istaka-olcek` verilen değere ZORLANMIŞ hâliyle (kapatma anahtarı). */
function olcekZorla(sozluk, olcek) {
  return sozlukleriBirlestir(sozluk, new Map([['--istaka-olcek', [String(olcek)]]]));
}

test('kabul-a: taş ölçüsü TABAN × ÖLÇEK'
  + ' türer — hiçbir kademede çıplak px taş ölçüsü yok', () => {
  for (const [turetilen, taban] of TURETILENLER) {
    const deger = ham(turetilen, KADEMELER[0].sozluk);
    assert.match(deger, /^clamp\(/, `${turetilen} clamp() ile türetilmiyor: "${deger}"`);
    for (const parca of [taban, '--istaka-olcek', '--istaka-olcek-tavan']) {
      assert.ok(
        deger.includes(`var(${parca})`),
        `${turetilen} ifadesi var(${parca}) okumuyor: "${deger}"`,
      );
    }
    // Türetilen ölçü TEK yerde tanımlanır: kademeler yalnız tabanı ve ölçeği geçersiz kılar,
    // yoksa "tek kaynak" ikiye bölünür ve kapatma anahtarı bir kademede kaçar.
    const bildirimler = [...YORUMSUZ.matchAll(new RegExp(`${turetilen}\\s*:`, 'g'))];
    assert.equal(bildirimler.length, 1, `${turetilen} ${bildirimler.length} yerde tanımlı (tek olmalı)`);
  }

  for (const kademe of KADEMELER) {
    for (const [turetilen, taban] of TURETILENLER) {
      assert.match(
        ham(taban, kademe.sozluk),
        /^\d+px$/,
        `${kademe.kademe ?? kademe.ad}: ${taban} px merdiven değeri değil`,
      );
      assert.ok(
        bagimliMi(turetilen, kademe.sozluk, '--istaka-olcek'),
        `${kademe.ad}: ${turetilen} ölçeğe bağlı değil`,
      );
    }
  }
});

test('kabul-b: ölçek her kademede 1 ile tavan arasında; tavan TEK yerde yazılı', () => {
  const tavanBildirimleri = [...YORUMSUZ.matchAll(/--istaka-olcek-tavan\s*:/g)];
  assert.equal(
    tavanBildirimleri.length,
    1,
    `"en çok 2 kat" kuralı ${tavanBildirimleri.length} yerde yazılı (tek olmalı — ADR-022/3)`,
  );
  const tavan = degiskenOlcusu('--istaka-olcek-tavan', KADEMELER[0].sozluk);
  assert.equal(tavan.birim, '', 'tavan birimsiz sayı değil');
  assert.equal(tavan.sayi, 2, 'tavan 2 değil (istek: "en çok 2 kat")');

  for (const kademe of KADEMELER) {
    const olcek = degiskenOlcusu('--istaka-olcek', kademe.sozluk);
    assert.equal(olcek.birim, '', `${kademe.ad}: --istaka-olcek birimsiz sayı değil`);
    assert.ok(
      olcek.sayi >= 1 && olcek.sayi <= tavan.sayi,
      `${kademe.ad}: --istaka-olcek ${olcek.sayi} — 1…${tavan.sayi} aralığında olmalı`,
    );
  }

  // Taban değeri geçersiz kılan her kademe ölçeği de yazar: yoksa tarayıcıdaki devralma
  // (cascade) ile buradaki kademe sözlüğü ayrışır ve ölçülen değer yanıltır.
  for (const blok of YORUMSUZ.split('@media').slice(1)) {
    if (!blok.includes('--tas-taban-genislik')) continue;
    assert.ok(
      blok.includes('--istaka-olcek:'),
      `taban ölçüyü geçersiz kılan kademe ölçeği yazmıyor: "${blok.slice(0, 60).trim()}…"`,
    );
  }
});

test('kabul-c: KAPATMA ANAHTARI — ölçek 1 bütün kademelerde bugünkü ölçüleri birebir verir', () => {
  assert.equal(KADEMELER.length, BUGUNKU_MERDIVEN.length, 'kademe sayısı merdiven tablosundan farklı');
  for (const [sira, kademe] of KADEMELER.entries()) {
    const beklenen = BUGUNKU_MERDIVEN[sira];
    assert.equal(kademe.ad, beklenen.kademe, `${sira}. kademenin adı değişmiş`);
    const sozluk = olcekZorla(kademe.sozluk, 1);
    const olcu = (ad) => degiskenOlcusu(ad, sozluk);
    const olculer = [
      ['--tas-genislik', beklenen.tas[0]],
      ['--tas-yukseklik', beklenen.tas[1]],
      ['--tas-arka-genislik', beklenen.arka[0]],
      ['--tas-arka-yukseklik', beklenen.arka[1]],
    ];
    for (const [ad, deger] of olculer) {
      assert.deepEqual(
        olcu(ad),
        { sayi: deger, birim: 'px' },
        `${kademe.ad}: ölçek 1 iken ${ad} ${deger}px vermiyor (kapatma anahtarı bozuk)`,
      );
    }
    // Istakanın genişliği taş ölçüsünün türevidir (12 sütun + panel dolgusu) — ölçek 1'de o da
    // bugünkü değerde kalmalı; üst rakibin çubuğu aynı formülü kullanır (tek kaynak).
    const istaka = olcu('--rakip-ust-genislik');
    const panelDolgu = olcu('--panel-dolgu').sayi;
    const yuvaBosluk = olcu('--raf-yuva-bosluk').sayi;
    assert.equal(
      istaka.sayi,
      RAF_SUTUN_SAYISI * beklenen.tas[0] + (RAF_SUTUN_SAYISI - 1) * yuvaBosluk + 2 * panelDolgu,
      `${kademe.ad}: ıstaka genişliği taş ölçüsünün türevi değil`,
    );
  }
});

test('kabul-c2: ölçek clamp alt/üst sınırını geçemez (küçülme yasak, tavan aşılamaz)', () => {
  for (const kademe of KADEMELER) {
    const taban = degiskenOlcusu('--tas-yukseklik', olcekZorla(kademe.sozluk, 1)).sayi;
    assert.equal(
      degiskenOlcusu('--tas-yukseklik', olcekZorla(kademe.sozluk, 0.5)).sayi,
      taban,
      `${kademe.ad}: ölçek 0,5 taşı KÜÇÜLTÜYOR — clamp alt sınırı taban değil`,
    );
    assert.equal(
      degiskenOlcusu('--tas-yukseklik', olcekZorla(kademe.sozluk, 5)).sayi,
      2 * taban,
      `${kademe.ad}: ölçek 5 tavanı aşıyor — clamp üst sınırı taban × tavan değil`,
    );
  }
});

test('kabul-e: --rakip-raf-*, --hedef-pay ve --masa-bosluk ölçeğe BAĞLANMAMIŞ (ADR-022/6)', () => {
  const bagimsizlar = ['--rakip-raf-uzunluk', '--rakip-raf-kalinlik', '--hedef-pay', '--masa-bosluk'];
  for (const kademe of KADEMELER) {
    for (const ad of bagimsizlar) {
      assert.equal(
        bagimliMi(ad, kademe.sozluk, '--istaka-olcek'),
        false,
        `${kademe.ad}: ${ad} ölçeğe bağlanmış — ince sırt kuralı / ADR-014 payı taş ölçüsünden bağımsızdır`,
      );
    }
    // İnce sırt kuralı (madde 1, tasokey#33) ölçekten etkilenmemeli: uzunluk/kalınlık ≥ 6.
    for (const olcek of [1, 2]) {
      const sozluk = olcekZorla(kademe.sozluk, olcek);
      const oran = degiskenOlcusu('--rakip-raf-uzunluk', sozluk).sayi
        / degiskenOlcusu('--rakip-raf-kalinlik', sozluk).sayi;
      assert.ok(oran >= 6, `${kademe.ad}: ölçek ${olcek} iken çubuk oranı ${oran.toFixed(1)} < 6`);
    }
  }
  // Olumlu denetim: bağımlılık yürüyüşü gerçekten çalışıyor (taş ölçüsü ölçeğe BAĞLI).
  assert.equal(bagimliMi('--tas-genislik', KADEMELER[0].sozluk, '--istaka-olcek'), true);
  // Rakip ıstakası açıkken küçültülmüş taşlar da ölçekle büyür (türev, tek kaynak).
  assert.equal(bagimliMi('--rakip-acik-tas-genislik', KADEMELER[0].sozluk, '--istaka-olcek'), true);
});

/* ------------------------------------------------- ölçüm aracının kendisi: clamp()/min()/max() */

test('css-olcu: clamp() / min() / max() gerçekten hesaplanıyor (ADR-022 ölçüsünün ön koşulu)', () => {
  const tablo = [
    ['clamp(10px, 20px, 30px)', 20],
    ['clamp(10px, 5px, 30px)', 10],
    ['clamp(10px, 50px, 30px)', 30],
    ['min(10px, 4px, 7px)', 4],
    ['max(10px, 4px, 7px)', 10],
    ['calc(clamp(10px, 20px, 30px) * 2)', 40],
    ['clamp(10px, calc(4px * 6), 30px)', 24],
    ['clamp( 10px , 20px , 30px )', 20],
  ];
  for (const [ifade, beklenen] of tablo) {
    assert.deepEqual(ifadeHesapla(ifade), { sayi: beklenen, birim: 'px' }, ifade);
  }
  assert.deepEqual(ifadeHesapla('clamp(1, 2, 3)'), { sayi: 2, birim: '' });
  // Birim karışımı CSS'te de geçersizdir (bildirim düşer) → sessizce geçmemeli.
  assert.throws(() => ifadeHesapla('clamp(10px, 50%, 30px)'), BirimHatasi);
  assert.throws(() => ifadeHesapla('clamp(10px, 20px)'), /üç argüman/);
  // Değişkenle birlikte: CSS'teki gerçek kalıp.
  const sozluk = degiskenleriTopla('--taban: 25px; --olcek: 1.4; --tavan: 2;'
    + ' --olcu: clamp(var(--taban), var(--taban) * var(--olcek), var(--taban) * var(--tavan));');
  assert.deepEqual(ifadeHesapla(varCoz('var(--olcu)', sozluk)), { sayi: 35, birim: 'px' });
});
