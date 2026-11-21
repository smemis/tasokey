import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { surukleBagla, cekmeSurukleBagla } from '../docs/arayuz/surukle.js';
import { kuralGovdesi as kuralGovdesiCoz } from './yardimci/css-olcu.js';

// tasokey#59 — telefonda (Android Chrome) sürükleme sırasında ıstaka bölgesinin bozulması.
// Belirti (Sahip'in iki ekran görüntüsü, is/tasokey-59/ekler/): taş parmağı izlerken ıstakanın
// taş sıraları satır satır gürültüye dönüyor, taşlar kayık çiziliyor, bir sıra tamamen kararıyor.
// Sebep: sürüklenen taş ıstakanın İÇİNDE, akışta duran bir öğeyken her `pointermove`da
// `transform` ve `opacity` alıyordu — kendi derleyici katmanı olmadığı için tarayıcı her karede
// ıstakanın boyanmış bölgesini (iki sıra yuva + `istaka.svg` arka planı) yeniden boyamak zorunda
// kalıyor, mobil Chrome'un kısmi boyama yolu da bu bölgede bozuluyordu. APK aynı WebView motorunu
// kullanacağı için düzeltme oyun kodundadır (Sahip'in isteği).
//
// Düzeltme: sürükleme boyunca parmağı taşın KOPYASI izler; kopya `position: fixed` ile gövdeye
// eklenir, `translate3d` + `will-change: transform` ile kendi katmanında taşınır, bırakmada
// kaldırılır. Asıl taş yerinde, saydamlıksız bekler → ıstakanın boyanmış bölgesi karede değişmez.
//
// Bu dosya DOM katmanını ölçer; proje jsdom taşımaz (MIMARI.md §6), bu yüzden testin ihtiyacı
// kadar küçük bir sahte DOM kurulur (`surukle-cekme.test.js` ile aynı dil; orada gövde/kopya
// gerekmediği için harness burada ayrı durur). Bırakma kararları orada ölçülür — burada ölçülen
// tek şey sürükleme sırasında NEYİN hareket ettiğidir.

const ARAYUZ_KOK = join(import.meta.dirname, '..', 'docs', 'arayuz');
const STIL_CSS = readFileSync(join(ARAYUZ_KOK, 'stil.css'), 'utf8');
const SURUKLE_JS = readFileSync(join(ARAYUZ_KOK, 'surukle.js'), 'utf8');

const TAS_OLCUSU = { left: 100, top: 200, width: 40, height: 60 };

function ogeYap(secicileri = [], dataset = {}, olcu = TAS_OLCUSU) {
  const oge = {
    secicileri,
    dataset: { ...dataset },
    olcu,
    ebeveyn: null,
    cocuklar: [],
    style: {},
    nitelikler: new Map(),
    taslar: [],
    siniflar: new Set(),
    dinleyiciler: new Map(),
  };
  oge.classList = {
    add: (ad) => oge.siniflar.add(ad),
    remove: (ad) => oge.siniflar.delete(ad),
    contains: (ad) => oge.siniflar.has(ad),
  };
  oge.addEventListener = (tip, islev) => {
    if (!oge.dinleyiciler.has(tip)) oge.dinleyiciler.set(tip, []);
    oge.dinleyiciler.get(tip).push(islev);
  };
  oge.closest = (secici) => {
    for (let dugum = oge; dugum; dugum = dugum.ebeveyn) {
      if (dugum.secicileri.includes(secici)) return dugum;
    }
    return null;
  };
  oge.contains = (baskasi) => {
    for (let dugum = baskasi; dugum; dugum = dugum.ebeveyn) if (dugum === oge) return true;
    return false;
  };
  oge.querySelectorAll = () => oge.taslar;
  oge.setPointerCapture = () => {};
  oge.getBoundingClientRect = () => ({ ...oge.olcu });
  oge.setAttribute = (ad, deger) => oge.nitelikler.set(ad, String(deger));
  oge.removeAttribute = (ad) => oge.nitelikler.delete(ad);
  oge.getAttribute = (ad) => oge.nitelikler.get(ad) ?? null;
  oge.appendChild = (cocuk) => {
    cocuk.ebeveyn = oge;
    oge.cocuklar.push(cocuk);
    return cocuk;
  };
  oge.removeChild = (cocuk) => {
    oge.cocuklar = oge.cocuklar.filter((c) => c !== cocuk);
    cocuk.ebeveyn = null;
    return cocuk;
  };
  oge.remove = () => { if (oge.ebeveyn) oge.ebeveyn.removeChild(oge); };
  oge.cloneNode = () => {
    const kopya = ogeYap([...oge.secicileri], { ...oge.dataset }, { ...oge.olcu });
    for (const sinif of oge.siniflar) kopya.siniflar.add(sinif);
    for (const [ad, deger] of oge.nitelikler) kopya.nitelikler.set(ad, deger);
    for (const cocuk of oge.cocuklar) kopya.appendChild(cocuk.cloneNode(true));
    return kopya;
  };
  return oge;
}

function cocukYap(ebeveyn, secicileri = [], dataset = {}, olcu = TAS_OLCUSU) {
  const oge = ogeYap(secicileri, dataset, olcu);
  ebeveyn.appendChild(oge);
  return oge;
}

function sahneKur(t) {
  const belgeDinleyicileri = new Map();
  let noktadaki = null;

  const govde = ogeYap(['body']);
  const masa = cocukYap(govde, ['#masa']);
  const raf = cocukYap(masa, ['#raf']);
  const rafYuva = cocukYap(raf, ['.raf-yuva'], { slotIndex: '7' });
  const rafTasi = cocukYap(rafYuva, ['.tas'], { tasId: 'kirmizi-7-a' });
  rafTasi.siniflar.add('tas');
  rafTasi.setAttribute('tabindex', '0');
  const deste = cocukYap(masa, ['[data-hedef="yerDestesi"]'], { hedef: 'yerDestesi' }, { left: 300, top: 150, width: 40, height: 60 });
  const desteTasi = cocukYap(deste, [], { tasId: 'deste-arka' }, { left: 300, top: 150, width: 40, height: 60 });
  desteTasi.siniflar.add('tas-arka');
  deste.taslar = [desteTasi];
  // Köşe yığını ikinci çekme kaynağıdır (`cekmeSurukleBagla`: `yerDestesi || kose`) ve `ekran.js`
  // `koseYiginiCiz` de alanı `innerHTML = ''` ile boşaltır — deste ile aynı yol, aynı tuzak.
  const kose = cocukYap(masa, ['.kose[data-kose]'], { kose: 'sol' }, { left: 60, top: 400, width: 40, height: 60 });
  const koseTasi = cocukYap(kose, [], { tasId: 'kose-ustu' }, { left: 60, top: 400, width: 40, height: 60 });
  koseTasi.siniflar.add('tas');
  kose.taslar = [koseTasi];

  const oncekiBelge = globalThis.document;
  const oncekiPerformance = globalThis.performance;
  globalThis.document = {
    body: govde,
    addEventListener: (tip, islev) => {
      if (!belgeDinleyicileri.has(tip)) belgeDinleyicileri.set(tip, []);
      belgeDinleyicileri.get(tip).push(islev);
    },
    elementFromPoint: () => noktadaki,
  };
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => 1000 },
    configurable: true,
    writable: true,
  });
  t.after(() => {
    globalThis.document = oncekiBelge;
    Object.defineProperty(globalThis, 'performance', {
      value: oncekiPerformance,
      configurable: true,
      writable: true,
    });
  });

  const birakmalar = [];
  const cekmeler = [];
  surukleBagla(raf, (tasId, hedefTuru, bilgi) => birakmalar.push({ tasId, hedefTuru, bilgi }));
  cekmeSurukleBagla(masa, raf, (tur, bilgi, birakma) => cekmeler.push({ tur, bilgi, birakma }));

  function gonder(oge, tip, olay) {
    for (const islev of belgeDinleyicileri.get(tip) ?? []) islev(olay);
    for (const islev of oge.dinleyiciler.get(tip) ?? []) islev(olay);
  }

  function isaretci(oge, tip, hedef, x, y, isaretciId = 1) {
    gonder(oge, tip, { type: tip, target: hedef, clientX: x, clientY: y, pointerId: isaretciId });
  }

  // Gövdeye eklenen kopyalar: sürükleme katmanında duran öğeler.
  function kopyalar() {
    return govde.cocuklar.filter((cocuk) => cocuk.classList.contains('surukleme-kopyasi'));
  }

  // `ekran.js` → `rafCiz()`: ıstakanın içeriği boşaltılıp (`eleman.raf.innerHTML = ''`) yeniden
  // kurulur. Bot turu her sıra geçişinde `ciz()` çağırdığı için bu, sürükleme SÜRERKEN de olur:
  // sürüklenen taş belgeden düşer ve işaretçi yakalaması kopar (tasokey#59, Denetçi turu 1).
  function rafiYenidenCiz() {
    for (const cocuk of [...raf.cocuklar]) raf.removeChild(cocuk);
    const yuva = cocukYap(raf, ['.raf-yuva'], { slotIndex: '3' });
    const tas = cocukYap(yuva, ['.tas'], { tasId: 'mavi-3-a' }, { left: 500, top: 200, width: 40, height: 60 });
    tas.siniflar.add('tas');
    return { yuva, tas };
  }

  // `ekran.js` → `yerDestesiYiginiCiz()` (ekran.js:254; köşede `koseYiginiCiz()`, ekran.js:230):
  // yığın alanı da `innerHTML = ''` ile boşaltılıp yeniden kurulur — her hamlede, yani çekme
  // SÜRERKEN de olabilir. Sürüklenen üst taş belgeden düşer (tasokey#59, Denetçi turu 2).
  function desteyiYenidenCiz() {
    for (const cocuk of [...deste.cocuklar]) deste.removeChild(cocuk);
    const tas = cocukYap(deste, [], { tasId: 'yeni-arka' }, { left: 600, top: 150, width: 40, height: 60 });
    tas.siniflar.add('tas-arka');
    deste.taslar = [tas];
    return tas;
  }

  // `ekran.js` → `koseYiginiCiz()` (ekran.js:230): köşe yığını da her çizimde boşaltılıp yeniden
  // kurulur; sürüklenen üst taş belgeden düşer (tasokey#59, Denetçi turu 2 — "deste/köşe").
  function koseyiYenidenCiz() {
    for (const cocuk of [...kose.cocuklar]) kose.removeChild(cocuk);
    const tas = cocukYap(kose, [], { tasId: 'kose-yeni' }, { left: 70, top: 410, width: 40, height: 60 });
    tas.siniflar.add('tas');
    kose.taslar = [tas];
    return tas;
  }

  return { govde, masa, raf, rafYuva, rafTasi, deste, desteTasi, kose, koseTasi, birakmalar, cekmeler,
    isaretci, kopyalar, rafiYenidenCiz, desteyiYenidenCiz, koseyiYenidenCiz,
    noktaya: (oge) => { noktadaki = oge; } };
}

test('ASIL KABUL: ıstakada sürüklenen asıl taş yerinde kalır — kendisine transform yazılmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  assert.equal(
    s.rafTasi.style.transform,
    undefined,
    'ASIL KABUL: asıl taş her karede transform alıyor → ıstakanın boyanmış bölgesi yeniden boyanıyor (telefonda bozulma)',
  );
});

test('ASIL KABUL: sürükleme sırasında gövdeye tek bir kopya eklenir ve translate3d ile taşınır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 160, 250);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);

  const kopyalar = s.kopyalar();
  assert.equal(kopyalar.length, 1, 'sürükleme boyunca gövdede tam bir kopya olmalı');
  const kopya = kopyalar[0];
  // Kopya asıl taşın yerinde doğar (fixed konum, kaynağın kutusu) ve parmağın kaymasını
  // translate3d ile izler: 3B dönüşüm kopyayı kendi derleyici katmanına taşır.
  assert.equal(kopya.style.left, '100px');
  assert.equal(kopya.style.top, '200px');
  assert.equal(kopya.style.width, '40px');
  assert.equal(kopya.style.height, '60px');
  // Taşın merkezi başlangıçta (120, 230); parmak (260, 300)'e gitti.
  assert.equal(kopya.style.transform, 'translate3d(140px, 70px, 0)');
  assert.equal(kopya.getAttribute('aria-hidden'), 'true', 'kopya erişilebilirlik ağacında ikinci bir taş olmamalı');
  assert.equal(kopya.getAttribute('tabindex'), null, 'kopya odak sırasına girmemeli');
});

test('ASIL KABUL: bırakmada kopya gövdeden kaldırılır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.noktaya(s.rafYuva);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 260, 300);
  assert.deepEqual(s.kopyalar(), [], 'sürükleme bitince kopya sayfada kalmamalı');
  assert.equal(s.rafTasi.classList.contains('surukleniyor'), false);
  assert.equal(s.birakmalar.length, 1, 'davranış değişmedi: bırakma yine bildirilir');
});

test('iptal edilen ıstaka sürüklemesinde de kopya kaldırılır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.noktaya(null);
  s.isaretci(s.raf, 'pointercancel', s.rafTasi, 260, 300);
  assert.deepEqual(s.kopyalar(), [], 'iptal sonrası kopya sayfada kalmamalı');
});

test('hareketsiz dokunuşta (seçme yolu) kopya hiç yaratılmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.noktaya(s.rafYuva);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 120, 230);
  assert.deepEqual(s.kopyalar(), [], 'dokunma yolunda gereksiz DOM düğümü yaratılmamalı');
});

// --- Bayat kopya (tasokey#59, Denetçi turu 1) -------------------------------------------------
// Denetçi bulgusu: kopya yalnız `birak()`/`sifirla()` ile kapanıyordu. Istaka sürükleme sırasında
// yeniden çizilince (bot turu) sürüklenen taş belgeden düşer, işaretçi yakalaması kopar; parmak
// ıstakanın DIŞINDA kalkarsa `pointerup` artık `#raf`a ulaşmaz → kopya gövdede asılı kalır ve
// sonraki sürüklemede parmağı eski taşın kopyası izler.

test('ASIL KABUL: ıstaka sürükleme sırasında yeniden çizilir, parmak dışarıda kalkar — kopya kalmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  assert.equal(s.kopyalar().length, 1, 'ön koşul: sürükleme kopyası doğdu');

  s.rafiYenidenCiz();
  // Yakalama koptuğu için bırakma #raf'a değil masaya gider.
  s.isaretci(s.masa, 'pointerup', s.masa, 700, 700);

  assert.deepEqual(
    s.kopyalar(),
    [],
    'ASIL KABUL: kopya gövdede asılı kalıyor → ekranda parmağı izlemeyen hayalet taş',
  );
  assert.equal(s.rafTasi.classList.contains('surukleniyor'), false, 'asıl taşın sürükleme sınıfı da düşmeli');
  assert.equal(s.birakmalar.length, 0, 'ıstaka dışında biten bırakma hamle değildir (davranış değişmez)');
});

test('ASIL KABUL: bayat kopya sonraki sürüklemeyi bozmaz — kopya yeni taşa çapalanır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  // Bırakma hiç gelmiyor (yakalama koptu, parmak başka bir pencerede/dışarıda kalktı).
  const { tas: yeniTas } = s.rafiYenidenCiz();

  s.isaretci(s.raf, 'pointerdown', yeniTas, 520, 230);
  s.isaretci(s.raf, 'pointermove', yeniTas, 560, 260);

  const kopyalar = s.kopyalar();
  assert.equal(kopyalar.length, 1, 'ASIL KABUL: eski kopya kalınca gövdede iki kopya oluyor');
  assert.equal(kopyalar[0].dataset.tasId, 'mavi-3-a', 'ASIL KABUL: parmağı eski taşın kopyası izliyor');
  assert.equal(kopyalar[0].style.left, '500px', 'kopya yeni taşın kutusuna çapalanmalı (eski çapa 100px)');
  assert.equal(kopyalar[0].style.transform, 'translate3d(40px, 30px, 0)', 'kopya yeni parmağı izlemeli');
});

test('başka parmağın masada bıraktığı işaretçi süren ıstaka sürüklemesini düşürmez', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);

  s.isaretci(s.masa, 'pointerup', s.masa, 700, 700, 9);
  assert.equal(s.kopyalar().length, 1, 'ikinci parmağın bırakması süren sürüklemeyi bozmamalı');

  s.noktaya(s.rafYuva);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 260, 300);
  assert.equal(s.birakmalar.length, 1, 'sürükleme kendi parmağıyla bitince bırakma yine bildirilir');
  assert.deepEqual(s.kopyalar(), [], 'bırakmada kopya kaldırılır');
});

test('ASIL KABUL: kopya asıl taşın sürükleme sınıfını taşımaz (ıstaka yolu)', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);

  const kopya = s.kopyalar()[0];
  assert.equal(kopya.classList.contains('surukleme-kopyasi'), true, 'kopya kendi sınıfını taşır');
  assert.equal(
    kopya.classList.contains('surukleniyor'),
    false,
    'ASIL KABUL: kopya `.surukleniyor` taşıyor → `position: fixed` yalnız kural sırası sayesinde kazanıyor (.tas.surukleniyor position: relative; özgüllükler eşit)',
  );
  assert.equal(s.rafTasi.classList.contains('surukleniyor'), true, 'asıl taş yerinde beklerken sınıfını taşır');
});

test('ASIL KABUL: kopya asıl taşın sürükleme sınıfını taşımaz (deste yolu)', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);

  const kopya = s.kopyalar()[0];
  assert.equal(
    kopya.classList.contains('surukleniyor'),
    false,
    'ASIL KABUL: deste kopyası da `.surukleniyor` taşıyor (tek kapı ikisinde de aynı olmalı)',
  );
  assert.equal(s.desteTasi.classList.contains('surukleniyor'), true, 'destenin asıl taşı sınıfını taşır');
});

test('ASIL KABUL: desteden sürüklemede üst taşın kopyası taşınır, asıl taş yerinde kalır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);

  const kopyalar = s.kopyalar();
  assert.equal(kopyalar.length, 1, 'destenin üst taşı için bir kopya olmalı');
  assert.equal(kopyalar[0].style.transform, 'translate3d(60px, 60px, 0)');
  assert.equal(
    s.desteTasi.style.transform,
    undefined,
    'ASIL KABUL: destenin asıl taşı hâlâ her karede transform alıyor',
  );

  s.noktaya(s.rafYuva);
  s.isaretci(s.masa, 'pointerup', s.deste, 380, 240);
  assert.deepEqual(s.kopyalar(), [], 'çekme bitince kopya kaldırılmalı');
  assert.equal(s.cekmeler.length, 1, 'davranış değişmedi: çekme yine bildirilir');
});

// --- Bayat kopya, ÇEKME yolu (tasokey#59, Denetçi turu 2) -------------------------------------
// Denetçi bulgusu: turu 1'in ağı yalnız `surukleBagla`ya (ıstaka) kuruldu. Aynı tek kapıyı
// kullanan `cekmeSurukleBagla` (deste/köşe çekmesi) için soru aynı ve cevabı da aynıydı: yığın
// alanı yeniden çizilince (`innerHTML = ''`) üst taş belgeden düşer, yakalama kopar; parmak
// masanın DIŞINDA kalkarsa `pointerup` masaya ulaşmaz → `sifirla()` hiç çalışmaz, kopya gövdede
// asılı kalır ve sonraki çekmede parmağı eski taşın kopyası eski çapasıyla izler.

test('ASIL KABUL: çekme sürerken yığın yeniden çizilir, parmak masa dışında kalkar — kopya kalmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);
  assert.equal(s.kopyalar().length, 1, 'ön koşul: çekme kopyası doğdu');

  s.desteyiYenidenCiz();
  // Yakalama koptuğu için bırakma masaya değil masanın dışına (gövdeye) gider.
  s.isaretci(s.govde, 'pointerup', s.govde, 900, 900);

  assert.deepEqual(
    s.kopyalar(),
    [],
    'ASIL KABUL: çekme kopyası gövdede asılı kalıyor → masada parmağı izlemeyen hayalet taş',
  );
  assert.equal(s.desteTasi.classList.contains('surukleniyor'), false, 'eski üst taşın sürükleme sınıfı da düşmeli');
  assert.equal(s.cekmeler.length, 0, 'masa dışında biten bırakma çekme değildir (davranış değişmez)');
});

test('ASIL KABUL: bayat çekme kopyası sonraki çekmeyi bozmaz — kopya yeni üst taşa çapalanır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);
  // Bırakma hiç gelmiyor (parmak pencerenin/masanın dışında kalktı).
  const yeniUstTas = s.desteyiYenidenCiz();

  s.isaretci(s.masa, 'pointerdown', s.deste, 620, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 660, 210);

  const kopyalar = s.kopyalar();
  assert.equal(kopyalar.length, 1, 'ASIL KABUL: eski kopya kalınca gövdede iki kopya oluyor');
  assert.equal(kopyalar[0].dataset.tasId, 'yeni-arka', 'ASIL KABUL: parmağı eski üst taşın kopyası izliyor');
  assert.equal(kopyalar[0].style.left, '600px', 'kopya yeni üst taşın kutusuna çapalanmalı (eski çapa 300px)');
  assert.equal(kopyalar[0].style.transform, 'translate3d(40px, 30px, 0)', 'kopya yeni parmağı izlemeli');
  assert.equal(yeniUstTas.classList.contains('surukleniyor'), true, 'yeni üst taş yerinde beklerken sınıfını taşır');
});

test('başka parmağın masa dışında bıraktığı işaretçi süren çekmeyi düşürmez', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);

  s.isaretci(s.govde, 'pointerup', s.govde, 900, 900, 9);
  assert.equal(s.kopyalar().length, 1, 'ikinci parmağın bırakması süren çekmeyi bozmamalı');

  s.noktaya(s.rafYuva);
  s.isaretci(s.masa, 'pointerup', s.deste, 380, 240);
  assert.equal(s.cekmeler.length, 1, 'çekme kendi parmağıyla bitince yine bildirilir');
  assert.deepEqual(s.kopyalar(), [], 'bırakmada kopya kaldırılır');
});

// Denetçi bulgusu "deste/köşe çekmesi" diyor: köşe yığını `cekmeSurukleBagla`da destenin TA
// KENDİSİ yolundan geçer (`yerDestesi || kose`) ve `koseYiginiCiz` de alanı boşaltır. Ağın orada
// da tuttuğu burada ölçülür — deste denetimleri köşe için kanıt sayılmaz.

test('ASIL KABUL: köşe çekmesi sürerken yığın yeniden çizilir, parmak masa dışında kalkar — kopya kalmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.kose, 80, 430);
  s.isaretci(s.masa, 'pointermove', s.kose, 140, 490);
  assert.equal(s.kopyalar().length, 1, 'ön koşul: köşe çekmesinin kopyası doğdu');

  s.koseyiYenidenCiz();
  s.isaretci(s.govde, 'pointerup', s.govde, 900, 900);

  assert.deepEqual(s.kopyalar(), [], 'ASIL KABUL: köşe kopyası gövdede asılı kalıyor → masada hayalet taş');
  assert.equal(s.koseTasi.classList.contains('surukleniyor'), false, 'eski üst taşın sürükleme sınıfı da düşmeli');
  assert.equal(s.cekmeler.length, 0, 'masa dışında biten bırakma çekme değildir (davranış değişmez)');
});

test('ASIL KABUL: bayat köşe kopyası sonraki köşe çekmesini bozmaz — kopya yeni üst taşa çapalanır', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.kose, 80, 430);
  s.isaretci(s.masa, 'pointermove', s.kose, 140, 490);
  const yeniUstTas = s.koseyiYenidenCiz();

  s.isaretci(s.masa, 'pointerdown', s.kose, 90, 440);
  s.isaretci(s.masa, 'pointermove', s.kose, 130, 470);

  const kopyalar = s.kopyalar();
  assert.equal(kopyalar.length, 1, 'ASIL KABUL: eski kopya kalınca gövdede iki kopya oluyor');
  assert.equal(kopyalar[0].dataset.tasId, 'kose-yeni', 'ASIL KABUL: parmağı eski üst taşın kopyası izliyor');
  assert.equal(kopyalar[0].style.left, '70px', 'kopya yeni üst taşın kutusuna çapalanmalı (eski çapa 60px)');
  assert.equal(kopyalar[0].style.transform, 'translate3d(40px, 30px, 0)', 'kopya yeni parmağı izlemeli');
  assert.equal(yeniUstTas.classList.contains('surukleniyor'), true, 'yeni üst taş yerinde beklerken sınıfını taşır');
});

test('köşeden ıstakaya bırakma ağa takılmaz: çekme yine kaynağıyla bildirilir', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.kose, 80, 430);
  s.isaretci(s.masa, 'pointermove', s.kose, 140, 490);

  s.noktaya(s.rafYuva);
  s.isaretci(s.masa, 'pointerup', s.kose, 140, 490);

  assert.equal(s.cekmeler.length, 1, 'davranış değişmedi: köşeden çekme yine bildirilir');
  assert.equal(s.cekmeler[0].bilgi.kose, 'sol', 'çekme kaynağı (köşe) korunur');
  assert.deepEqual(s.cekmeler[0].birakma, { slotIndex: 7 }, 'bırakılan yuva korunur (ADR-019)');
  assert.deepEqual(s.kopyalar(), [], 'bırakmada kopya kaldırılır');
});

test('eşiğin altında kalan deste dokunuşunda kopya yaratılmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 322, 181);
  assert.deepEqual(s.kopyalar(), [], 'sürükleme eşiği aşılmadan kopya yaratılmamalı');
});

test('ASIL KABUL: stil.css sürükleme kopyasını kendi katmanına alıyor (fixed + will-change + kademe)', () => {
  const govde = kuralGovdesiCoz(STIL_CSS, '.tas.surukleme-kopyasi');
  assert.ok(govde, 'stil.css içinde .tas.surukleme-kopyasi kuralı yok');
  assert.match(govde, /position:\s*fixed/, 'kopya sabit konumlu değil → ıstakanın akışında kalır');
  assert.match(
    govde,
    /will-change:\s*transform/,
    'ASIL KABUL: kopyada will-change yok → tarayıcı onu kendi katmanına almayabilir, boyama yine ıstakaya düşer',
  );
  assert.match(govde, /pointer-events:\s*none/, 'kopya isabet testine girerse bırakma hedefi bulunamaz');
  assert.match(govde, /z-index:\s*var\(--kademe-tas-surukleniyor\)/, 'kopya kademesini tek kaynaktan almıyor (ADR-015)');
});

test('ASIL KABUL: yerinde bekleyen asıl taş saydamlaşmıyor', () => {
  for (const secici of ['.tas.surukleniyor', '.tas-arka.surukleniyor']) {
    const govde = kuralGovdesiCoz(STIL_CSS, secici);
    assert.ok(govde, `stil.css içinde ${secici} kuralı yok`);
    assert.doesNotMatch(
      govde,
      /opacity:/,
      `ASIL KABUL: ${secici} hâlâ opaklık değiştiriyor → asıl taş her karede yeniden boyanır (Sahip: "asıl taş yerinde saydamlıksız beklesin")`,
    );
  }
});

test('surukle.js transform yazarken yalnız 3B dönüşüm kullanıyor', () => {
  const atamalar = [...SURUKLE_JS.matchAll(/style\.transform\s*=\s*([^;]+);/g)].map((e) => e[1].trim());
  assert.ok(atamalar.length > 0, 'surukle.js hiç transform yazmıyor — sürükleme taşı hareket ettirmiyor olmalı');
  for (const atama of atamalar) {
    assert.match(atama, /translate3d/, `2B dönüşüm kendi katmanını yaratmaz: ${atama}`);
  }
});
