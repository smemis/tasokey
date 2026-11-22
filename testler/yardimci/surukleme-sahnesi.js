// Sürükleme testlerinin paylaşılan sahte DOM'u (`surukle.js` DOM katmanındadır; proje jsdom
// taşımaz — MIMARI.md §6, yalnız Node yerleşik koşucusu). Testin ihtiyacı kadar küçük tutulur:
// ebeveyn zinciri, `closest`/`contains`, sınıf listesi, `cloneNode`, gövdeye ekleme, yakalama
// evresinde belge dinleyicisi ve `elementFromPoint`.
//
// `surukleme-kopyasi.test.js` (tasokey#59) içinde yazılmıştı; tasokey#62'de buraya taşındı:
// `surukleme-gorunurlugu.test.js` (ADR-021) aynı sahneyi soruyor, aynı sahte DOM iki dosyada
// yazılmasın (`yardimci/css-olcu.js`nin tasokey#47'de buraya taşınmasıyla aynı gerekçe).
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import { surukleBagla, cekmeSurukleBagla } from '../../docs/arayuz/surukle.js';

const TAS_OLCUSU = { left: 100, top: 200, width: 40, height: 60 };

export function ogeYap(secicileri = [], dataset = {}, olcu = TAS_OLCUSU) {
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

export function cocukYap(ebeveyn, secicileri = [], dataset = {}, olcu = TAS_OLCUSU) {
  const oge = ogeYap(secicileri, dataset, olcu);
  ebeveyn.appendChild(oge);
  return oge;
}

/**
 * Masa + ıstaka + deste + köşe sahnesini kurar ve sürükleme kapılarını bağlar.
 *
 * `secenekler.birakmaSonucu(kayit)` ve `secenekler.cekmeSonucu(kayit)`: geri çağrı çalışırken
 * bakılmak istenen şeyi ölçmek için (ör. motor hamleyi reddederken asıl taşın görünürlüğü).
 */
export function sahneKur(t, secenekler = {}) {
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
  // Sürükleme başlangıç/bitiş bildirimleri (ADR-021/5): `ekran.js` gizlemenin tek kaynağını bu
  // uçtan yazar. Sahne yalnız kaydeder — çizim yapmaz, çünkü bildirim `ciz()` ÇAĞIRMAZ.
  const bildirimler = [];
  surukleBagla(
    raf,
    (tasId, hedefTuru, bilgi) => {
      const kayit = { tasId, hedefTuru, bilgi };
      birakmalar.push(kayit);
      secenekler.birakmaSonucu?.(kayit);
    },
    (tasId) => bildirimler.push(tasId),
  );
  cekmeSurukleBagla(masa, raf, (tur, bilgi, birakma) => {
    const kayit = { tur, bilgi, birakma };
    cekmeler.push(kayit);
    secenekler.cekmeSonucu?.(kayit);
  });

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

  // `ekran.js` → `yerDestesiYiginiCiz()` (köşede `koseYiginiCiz()`): yığın alanı da
  // `innerHTML = ''` ile boşaltılıp yeniden kurulur — her hamlede, yani çekme SÜRERKEN de
  // olabilir. Sürüklenen üst taş belgeden düşer (tasokey#59, Denetçi turu 2).
  function desteyiYenidenCiz() {
    for (const cocuk of [...deste.cocuklar]) deste.removeChild(cocuk);
    const tas = cocukYap(deste, [], { tasId: 'yeni-arka' }, { left: 600, top: 150, width: 40, height: 60 });
    tas.siniflar.add('tas-arka');
    deste.taslar = [tas];
    return tas;
  }

  // `ekran.js` → `koseYiginiCiz()`: köşe yığını da her çizimde boşaltılıp yeniden kurulur;
  // sürüklenen üst taş belgeden düşer (tasokey#59, Denetçi turu 2 — "deste/köşe").
  function koseyiYenidenCiz() {
    for (const cocuk of [...kose.cocuklar]) kose.removeChild(cocuk);
    const tas = cocukYap(kose, [], { tasId: 'kose-yeni' }, { left: 70, top: 410, width: 40, height: 60 });
    tas.siniflar.add('tas');
    kose.taslar = [tas];
    return tas;
  }

  return { govde, masa, raf, rafYuva, rafTasi, deste, desteTasi, kose, koseTasi,
    birakmalar, cekmeler, bildirimler,
    isaretci, kopyalar, rafiYenidenCiz, desteyiYenidenCiz, koseyiYenidenCiz,
    noktaya: (oge) => { noktadaki = oge; } };
}
