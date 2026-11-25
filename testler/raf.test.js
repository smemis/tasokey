import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  RAF_SATIR_SAYISI, RAF_SUTUN_SAYISI, RAF_SLOT_SAYISI,
  bosYerlesim, yerlesimKur, rafYerlesimiGuncelle, tasiYuvayaTasi, yerlesimDiz,
} from '../docs/arayuz/raf.js';

// tasokey#48 — ADR-019: ıstakaya sürüklemede taş kendine yer açar, çekilen taş bırakıldığı
// yuvada kalır. Istaka yerleşiminin bütün kuralları `arayuz/raf.js`te (saf mantık, DOM yok);
// `ekran.js` yalnız çizer. Kabul (a)-(g) `is-dosyasi.md`'de:
//   (a) yer değiştirme (swap) yok   (b) itme yönü en yakın boşluğa, eşitlikte sağa
//   (c) sıra tamamen dolu → taşan taş diğer sıranın ilk boş yuvasına
//   (d) iki sıra da dolu → yerleşim değişmez
//   (e) boş hedefe bırakma: eski yuva boşalır
//   (f) aynı sıra içi sürükleme (araya sokma)
//   (g) desteden çekilen taş bırakıldığı yuvaya; dokunma/klavye yolunda ilk boş yuvaya
//
// Yerleşim okunurluk için satır satır dizeyle yazılır: her harf bir taş kimliği, '.' boş yuva.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const RAF_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'raf.js'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');

/** 'ABC.........' biçimindeki satırlardan yerleşim dizisi kurar. */
function y(...satirlar) {
  assert.equal(satirlar.length, RAF_SATIR_SAYISI, 'test yerleşimi satır sayısı tutmuyor');
  for (const satir of satirlar) {
    assert.equal(satir.length, RAF_SUTUN_SAYISI, `test yerleşimi sütun sayısı tutmuyor: "${satir}"`);
  }
  return satirlar.join('').split('').map((harf) => (harf === '.' ? null : harf));
}

/** Yerleşimi tekrar satır dizilerine çevirir (hata iletisi okunur olsun). */
function metin(yerlesim) {
  const harfler = yerlesim.map((id) => (id === null ? '.' : id));
  const satirlar = [];
  for (let satir = 0; satir < Math.ceil(harfler.length / RAF_SUTUN_SAYISI); satir++) {
    satirlar.push(harfler.slice(satir * RAF_SUTUN_SAYISI, (satir + 1) * RAF_SUTUN_SAYISI).join(''));
  }
  return satirlar;
}

/** Taş kimliği listesinden `el` benzeri nesne dizisi (yalnız `id` okunur). */
function el(...idler) {
  return idler.map((id) => ({ id }));
}

test('yuva sayısı: 2 sıra × 12 yuva, en yüksek el boyutundan (15) fazla', () => {
  assert.equal(RAF_SATIR_SAYISI, 2);
  assert.equal(RAF_SUTUN_SAYISI, 12);
  assert.equal(RAF_SLOT_SAYISI, RAF_SATIR_SAYISI * RAF_SUTUN_SAYISI);
  assert.ok(RAF_SLOT_SAYISI > 15, 'yuva sayısı en yüksek el boyutundan (15) fazla olmalı');
  assert.deepEqual(bosYerlesim(), new Array(RAF_SLOT_SAYISI).fill(null));
});

// --- (a)-(f) tablo testi: bırakma kuralları ---

const BIRAKMA_DURUMLARI = [
  {
    ad: '(a) yer değiştirme yok: hedefteki taş sürüklenen taşın eski yuvasına ATLAMAZ, yana itilir',
    once: ['ABCD........', '............'],
    tas: 'A',
    hedef: 3,
    // Eski davranış (swap) D'yi 0. yuvaya atardı: 'DBCA........'. Yeni kural: D bir sağa itilir.
    sonra: ['.BCAD.......', '............'],
  },
  {
    ad: '(b) itme yönü: en yakın boşluk solda → taşlar sola itilir',
    once: ['AB.CDEF.....', 'Z...........'],
    tas: 'Z',
    hedef: 4,
    sonra: ['ABCDZEF.....', '............'],
  },
  {
    ad: '(b) itme yönü: iki boşluk eşit uzaklıkta → sağa itilir',
    once: ['AB.CDE......', 'Z...........'],
    tas: 'Z',
    hedef: 4,
    sonra: ['AB.CZDE.....', '............'],
  },
  {
    ad: '(c) hedef sıra tamamen dolu → sağ uçtan taşan taş diğer sıranın ilk boş yuvasına',
    once: ['ABCDEFGHIJKL', 'Z...........'],
    tas: 'Z',
    hedef: 2,
    sonra: ['ABZCDEFGHIJK', 'L...........'],
  },
  {
    ad: '(c) taşan taş diğer sıranın İLK boş yuvasına girer (dolu yuvaları atlar, boşalan yuvaya koşmaz)',
    once: ['ABCDEFGHIJKL', 'MN.Z........'],
    tas: 'Z',
    hedef: 0,
    sonra: ['ZABCDEFGHIJK', 'MNL.........'],
  },
  {
    ad: '(d) iki sıra da dolu (yerleşimde olmayan taş) → yerleşim değişmez',
    once: ['ABCDEFGHIJKL', 'MNOPQRSTUVWX'],
    tas: 'Z',
    hedef: 5,
    sonra: ['ABCDEFGHIJKL', 'MNOPQRSTUVWX'],
  },
  {
    ad: '(e) boş hedefe bırakma: taş oraya geçer, eski yuvası boşalır',
    once: ['A...........', '............'],
    tas: 'A',
    hedef: 5,
    sonra: ['.....A......', '............'],
  },
  {
    ad: '(e) boş hedef diğer sırada olabilir',
    once: ['AB..........', '............'],
    tas: 'A',
    hedef: 13,
    sonra: ['.B..........', '.A..........'],
  },
  {
    ad: '(f) aynı sıra içi sürükleme: sağdaki taş araya sokulur, kalanlar sağa kayar',
    once: ['ABCDEFGHIJKL', '............'],
    tas: 'L',
    hedef: 3,
    sonra: ['ABCLDEFGHIJK', '............'],
  },
  {
    ad: '(f) aynı sıra içi sürükleme: soldaki taş sağa taşınır, aradakiler sola kayar',
    // Boşalan kaynak yuvası (0) hedefe (4) sağdaki boşluktan (11) daha yakın → itme sola.
    once: ['ABCDEFGHIJK.', '............'],
    tas: 'A',
    hedef: 4,
    sonra: ['BCDEAFGHIJK.', '............'],
  },
  {
    ad: 'kendi yuvasına bırakma yerleşimi değiştirmez',
    once: ['ABC.........', '............'],
    tas: 'B',
    hedef: 1,
    sonra: ['ABC.........', '............'],
  },
  {
    ad: 'yerleşim dışı hedef indeksi yok sayılır',
    once: ['ABC.........', '............'],
    tas: 'B',
    hedef: 99,
    sonra: ['ABC.........', '............'],
  },
];

for (const durum of BIRAKMA_DURUMLARI) {
  test(`ASIL KABUL ${durum.ad}`, () => {
    const once = y(...durum.once);
    const sonuc = tasiYuvayaTasi(once, durum.tas, durum.hedef);
    assert.deepEqual(metin(sonuc), durum.sonra);
    // Saf mantık: girdi dizisi değişmez (ekran.js'in elindeki yerleşim yalnız dönen değerle güncellenir).
    assert.deepEqual(metin(once), durum.once, 'girdi yerleşimi değiştirildi (saf değil)');
  });
}

test('(a) hiçbir bırakmada taş kaybolmaz ya da çoğalmaz', () => {
  for (const durum of BIRAKMA_DURUMLARI) {
    const once = y(...durum.once);
    const sonuc = tasiYuvayaTasi(once, durum.tas, durum.hedef);
    const oncekiler = once.filter((id) => id !== null);
    const sonrakiler = sonuc.filter((id) => id !== null);
    const beklenen = new Set([...oncekiler, ...(sonrakiler.includes(durum.tas) ? [durum.tas] : [])]);
    assert.equal(new Set(sonrakiler).size, sonrakiler.length, `${durum.ad}: aynı taş iki yuvada`);
    assert.deepEqual(
      [...new Set(sonrakiler)].sort(),
      [...beklenen].sort(),
      `${durum.ad}: taş listesi değişti (${metin(sonuc).join(' | ')})`,
    );
  }
});

// --- (g) çekilen taşın yuvası ---

test('(g) kabul: desteden sürükleyerek çekilen taş BIRAKILDIĞI yuvada kalır', () => {
  const once = y('AB..........', '............');
  const sonra = rafYerlesimiGuncelle(once, el('A', 'B', 'Z'), { yeniTasYuvasi: 7 });
  assert.deepEqual(metin(sonra), ['AB.....Z....', '............']);
});

test('(g) kabul: çekilen taş dolu bir yuvaya bırakılırsa oradaki taş itilir (bırakma kuralı aynı)', () => {
  const once = y('ABC.........', '............');
  const sonra = rafYerlesimiGuncelle(once, el('A', 'B', 'C', 'Z'), { yeniTasYuvasi: 1 });
  assert.deepEqual(metin(sonra), ['AZBC........', '............']);
});

test('(g) kabul: dokunma/klavye yolunda (yuva verilmez) çekilen taş ilk boş yuvaya girer', () => {
  const once = y('A.B.........', '............');
  const sonra = rafYerlesimiGuncelle(once, el('A', 'B', 'Z'));
  assert.deepEqual(metin(sonra), ['AZB.........', '............']);
});

test('(g) elden çıkan taşın (atılan taş) yuvası boşalır, kalanlar yerinde durur', () => {
  const once = y('A.B.C.......', '............');
  const sonra = rafYerlesimiGuncelle(once, el('A', 'C'));
  assert.deepEqual(metin(sonra), ['A...C.......', '............']);
});

test('(g) iki sıra da doluysa çekilen taş hedefe konamaz ama kaybolmaz', () => {
  // Bugünkü sayılarla (24 yuva, en çok 15 taş) ulaşılamaz bir durum; yerleşim yine de taşı düşürmez.
  const once = y('ABCDEFGHIJKL', 'MNOPQRSTUVWX');
  const sonra = rafYerlesimiGuncelle(once, el(...'ABCDEFGHIJKLMNOPQRSTUVWX'.split(''), 'Z'), { yeniTasYuvasi: 3 });
  assert.ok(sonra.includes('Z'), 'çekilen taş yerleşimden düştü');
  assert.equal(sonra.filter((id) => id === 'Z').length, 1);
});

test('yeni el kurulduğunda taşlar sırayla ilk yuvalardan dizilir', () => {
  const yerlesim = yerlesimKur(el('A', 'B', 'C'));
  assert.deepEqual(metin(yerlesim), ['ABC.........', '............']);
  assert.equal(yerlesim.length, RAF_SLOT_SAYISI);
});

// --- gruplanmış dizme (tasokey#85): yerlesimDiz ---
//
// Kabul (is-dosyasi.md): gruplar arası TAM BİR boş yuva · grup satır içinde bölünmez ·
// 24 yuvaya sığmazsa boşluksuz paketlenir · elde olmayan taş yerleşime girmez.
// Grupların içeriğine/sırasına burada karar verilmez (tek kaynak cozucu.js dokumGruplari).

/** 'ABC' biçimindeki dizelerden grup listesi kurar (her harf bir taş kimliği). */
function g(...gruplar) {
  return gruplar.map((grup) => grup.split(''));
}

const DIZME_DURUMLARI = [
  {
    ad: 'gruplar arası tam bir boş yuva (per 3 + çift 2 + kalan 1)',
    gruplar: g('ABC', 'DE', 'F'),
    sonra: ['ABC.DE.F....', '............'],
  },
  {
    ad: 'tek grup: hiç boşluk yok, soldan başlar',
    gruplar: g('ABCD'),
    sonra: ['ABCD........', '............'],
  },
  {
    ad: 'grup satır içinde bölünmez: sığmayan grup sonraki satırın başından başlar',
    gruplar: g('ABCDEFGHIJ', 'KLM'),
    sonra: ['ABCDEFGHIJ..', 'KLM.........'],
  },
  {
    ad: 'satır tam dolduğunda sonraki grup ikinci satıra geçer (boşluk satır başına düşer)',
    gruplar: g('ABCDEFGHIJKL', 'MN'),
    sonra: ['ABCDEFGHIJKL', '.MN.........'],
  },
  {
    ad: 'yedi çift (çiftli bitiş eli): her çift kendi bloğu, aralar boş',
    gruplar: g('AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN'),
    sonra: ['AB.CD.EF.GH.', 'IJ.KL.MN....'],
  },
  {
    ad: 'beş per (15 taş): aralıklı dizim 24 yuvaya sığar',
    gruplar: g('ABC', 'DEF', 'GHI', 'JKL', 'MNO'),
    sonra: ['ABC.DEF.GHI.', 'JKL.MNO.....'],
  },
  {
    ad: '24 yuvaya aralıklı sığmayan durum (13 taşlık per + çift) boşluksuz paketlenir',
    // 13 taşlık per hiçbir satıra (12 yuva) sığmaz → aralıklı dizim yok, taş da düşmez.
    gruplar: g('ABCDEFGHIJKLM', 'NO'),
    sonra: ['ABCDEFGHIJKL', 'MNO.........'],
  },
  {
    ad: 'boş grup listesi boş yerleşim verir',
    gruplar: [],
    sonra: ['............', '............'],
  },
  {
    ad: 'boş gruplar atılır, kalan gruplar arasında tek boşluk kalır',
    gruplar: [[], ['A', 'B'], [], ['C']],
    sonra: ['AB.C........', '............'],
  },
];

for (const durum of DIZME_DURUMLARI) {
  test(`ASIL KABUL yerlesimDiz: ${durum.ad}`, () => {
    const girdi = durum.gruplar.map((grup) => grup.slice());
    const sonuc = yerlesimDiz(durum.gruplar);
    assert.equal(sonuc.length, RAF_SLOT_SAYISI);
    assert.deepEqual(metin(sonuc), durum.sonra);
    // Saf mantık: girdi grupları değişmez.
    assert.deepEqual(durum.gruplar, girdi, 'girdi grup listesi değiştirildi (saf değil)');
  });
}

test('ASIL KABUL yerlesimDiz: hiçbir durumda taş kaybolmaz ya da çoğalmaz', () => {
  for (const durum of DIZME_DURUMLARI) {
    const sonuc = yerlesimDiz(durum.gruplar);
    const yerlesenler = sonuc.filter((id) => id !== null);
    const beklenenler = durum.gruplar.flat();
    assert.deepEqual(
      yerlesenler.slice().sort(),
      beklenenler.slice().sort(),
      `${durum.ad}: yerleşen taş listesi gruplardan farklı`,
    );
    assert.equal(new Set(yerlesenler).size, yerlesenler.length, `${durum.ad}: aynı taş iki yuvada`);
  }
});

test('ASIL KABUL yerlesimDiz: elde olmayan taş yerleşime girmez (dizme boş yerleşimden kurulur)', () => {
  // Önceki dizilimde Z duruyordu; yeni gruplarda yok (taş atıldı) → yerleşimde de yok.
  const sonuc = yerlesimDiz(g('AB', 'CD'));
  assert.ok(!sonuc.includes('Z'), 'gruplarda olmayan taş yerleşime girdi');
  assert.deepEqual(metin(sonuc), ['AB.CD.......', '............']);
});

test('yerlesimDiz: grup listesi verilmezse boş yerleşim döner (çökmez)', () => {
  assert.deepEqual(yerlesimDiz(undefined), bosYerlesim());
  assert.deepEqual(yerlesimDiz(null), bosYerlesim());
});

// --- tek kaynak / katman sınırı ---

test('tek kaynak: yerleşim kuralları ve RAF_* sabitleri yalnız raf.js\'te', () => {
  assert.match(RAF_JS, /export const RAF_SATIR_SAYISI = 2;/, 'raf.js RAF_SATIR_SAYISI tanımlamıyor');
  assert.match(RAF_JS, /export const RAF_SUTUN_SAYISI = 12;/, 'raf.js RAF_SUTUN_SAYISI tanımlamıyor');
  assert.ok(
    !/const RAF_(SATIR|SUTUN|SLOT)_SAYISI\s*=/.test(EKRAN_JS),
    'ekran.js RAF_* sabitlerini kendi tanımlıyor — tek kaynak raf.js olmalı (ADR-019)',
  );
  assert.match(EKRAN_JS, /from '\.\/raf\.js'/, 'ekran.js yerleşimi raf.js\'ten almıyor');
  assert.ok(
    !/function (rafYerlesimiGuncelle|tasiYuvayaTasi)\s*\(/.test(EKRAN_JS),
    'ekran.js yerleşim kuralını hâlâ kendi içinde tanımlıyor (ADR-019: kural raf.js\'te)',
  );
});

test('raf.js saf: DOM ya da tarayıcı API\'si kullanmıyor', () => {
  for (const ad of ['document', 'window', 'localStorage', 'Math.random']) {
    assert.ok(!new RegExp(`\\b${ad.replace('.', '\\.')}\\b`).test(RAF_JS), `raf.js ${ad} kullanıyor`);
  }
  assert.ok(!/^import /m.test(RAF_JS), 'raf.js başka modüle bağlı — yerleşim kuralı kendi başına durmalı');
});
