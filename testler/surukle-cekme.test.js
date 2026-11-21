import test from 'node:test';
import assert from 'node:assert/strict';

import { cekmeSurukleBagla } from '../docs/arayuz/surukle.js';
import { CEKME_KAYNAGI } from '../docs/arayuz/etkilesim.js';

// `arayuz/surukle.js` DOM katmanındadır; proje jsdom gibi bir bağımlılık taşımaz (MIMARI.md §6:
// yalnız Node yerleşik koşucusu). Bu yüzden burada testin ihtiyacı kadar küçük bir sahte DOM
// kurulur: ebeveyn zinciri, `closest`/`contains`, yakalama evresinde belge dinleyicisi ve
// `elementFromPoint`. Seçici metinlerinin doğruluğu bu testin değil kaynak taramasının işidir
// (hedef-alani.test.js). Ölçülen şey davranış: hangi hareket hamle sayılıyor ve ardından gelen
// uyum tıklaması kime bırakılıyor (tasokey#40).

function ogeYap(secicileri = [], dataset = {}) {
  const oge = {
    secicileri,
    dataset,
    ebeveyn: null,
    style: {},
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
  // Yığının taşları: gerçek DOM'daki `querySelectorAll('.tas, .tas-arka')` karşılığı.
  oge.querySelectorAll = () => oge.taslar;
  oge.setPointerCapture = () => {};
  // Sürükleme kopyası (tasokey#59) bu uçları kullanır: kaynağın kutusu, kopyalanması ve
  // kaldırılması. Kopyanın kendisi bu dosyanın konusu değil (onu `surukleme-kopyasi.test.js`
  // ölçer) — burada yalnız bırakma kararlarının kopyadan etkilenmediği görülür.
  oge.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 60 });
  oge.appendChild = (cocuk) => { cocuk.ebeveyn = oge; return cocuk; };
  oge.setAttribute = () => {};
  oge.removeAttribute = () => {};
  oge.remove = () => {};
  oge.cloneNode = () => ogeYap([...secicileri], { ...dataset });
  return oge;
}

function cocukYap(ebeveyn, secicileri = [], dataset = {}) {
  const oge = ogeYap(secicileri, dataset);
  oge.ebeveyn = ebeveyn;
  return oge;
}

function sahneKur(t) {
  const belgeDinleyicileri = new Map();
  let noktadaki = null;
  let zaman = 1000;

  const masa = ogeYap(['#masa']);
  const raf = cocukYap(masa, ['#raf']);
  const rafYuva = cocukYap(raf, ['.raf-yuva'], { slotIndex: '7' });
  const rafTasi = cocukYap(rafYuva, ['.tas']);
  const deste = cocukYap(masa, ['[data-hedef="yerDestesi"]'], { hedef: 'yerDestesi' });
  const kose = cocukYap(masa, ['.kose[data-kose]'], { kose: 'solAlt' });
  const digerDugme = cocukYap(masa, ['button']);
  deste.taslar = [cocukYap(deste)];
  kose.taslar = [cocukYap(kose)];

  const oncekiBelge = globalThis.document;
  const oncekiPerformance = globalThis.performance;
  globalThis.document = {
    // Sürükleme kopyası gövdeye eklenir (tasokey#59).
    body: ogeYap(['body']),
    addEventListener: (tip, islev) => {
      if (!belgeDinleyicileri.has(tip)) belgeDinleyicileri.set(tip, []);
      belgeDinleyicileri.get(tip).push(islev);
    },
    elementFromPoint: () => noktadaki,
  };
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => zaman },
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

  const cagrilar = [];
  cekmeSurukleBagla(masa, raf, (tur, bilgi, birakma) => cagrilar.push({ tur, bilgi, birakma }));

  function gonder(tip, olay) {
    // Gerçek sıra: belge üstündeki yakalama dinleyicisi hedefin dinleyicilerinden önce çalışır.
    for (const islev of belgeDinleyicileri.get(tip) ?? []) islev(olay);
    for (const islev of masa.dinleyiciler.get(tip) ?? []) islev(olay);
  }

  // `isaretciId`: çok parmaklı deneme için. Fare her zaman aynı kimliği kullandığından (1)
  // varsayılan 1'dir; ikinci parmak için çağrıda ayrıca verilir.
  function isaretci(tip, hedef, x, y, isaretciId = 1) {
    gonder(tip, { type: tip, target: hedef, clientX: x, clientY: y, pointerId: isaretciId });
  }

  // Dönen değer: tıklama hedefine ulaşabildi mi (yakalama evresinde yutulmadıysa evet).
  function tiklama(hedef, detail = 1) {
    let yutuldu = false;
    const olay = {
      type: 'click',
      target: hedef,
      detail,
      stopPropagation: () => { yutuldu = true; },
      preventDefault: () => {},
    };
    for (const islev of belgeDinleyicileri.get('click') ?? []) islev(olay);
    return !yutuldu;
  }

  // Kaynağın üstünde (0,0) başlayıp (x,y)'de biten hareket; `bitisOgesi` bırakma noktasının altında
  // duran öğedir (gerçekte `elementFromPoint`in döndürdüğü şey).
  function surukle(kaynakOgesi, x, y, bitisOgesi, isaretciId = 1) {
    isaretci('pointerdown', kaynakOgesi, 0, 0, isaretciId);
    isaretci('pointermove', kaynakOgesi, x, y, isaretciId);
    noktadaki = bitisOgesi;
    isaretci('pointerup', kaynakOgesi, x, y, isaretciId);
  }

  return {
    masa, raf, rafYuva, rafTasi, deste, kose, digerDugme, cagrilar, surukle, tiklama, isaretci,
    saatIlerlet: (ms) => { zaman += ms; },
    noktaya: (oge) => { noktadaki = oge; },
  };
}

test('desteden ıstakaya sürükleme yer destesi kaynağıyla çekme çağırır', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  assert.deepEqual(s.cagrilar, [{ tur: CEKME_KAYNAGI.YER_DESTESI, bilgi: {}, birakma: { slotIndex: 7 } }]);
});

test('köşeden ıstakaya sürüklemede kaynak bilgisi köşe adını taşır', (t) => {
  const s = sahneKur(t);
  s.surukle(s.kose, 40, 40, s.rafYuva);
  assert.deepEqual(s.cagrilar, [
    { tur: CEKME_KAYNAGI.KOSE, bilgi: { kose: 'solAlt' }, birakma: { slotIndex: 7 } },
  ]);
});

// tasokey#48 (ADR-019): çekilen taş bırakıldığı yuvada kalacağı için bu katman yuvayı da bildirir.
// Yuva kararın parçası değildir (etkilesim.js'in çekme kararı değişmedi), yalnız yerleşim bilgisidir.
test('ASIL KABUL: ıstakanın bir yuvasına bırakılan çekme, o yuvanın slotIndex\'ini bildirir', (t) => {
  const s = sahneKur(t);
  s.rafYuva.dataset.slotIndex = '13';
  s.surukle(s.deste, 40, 40, s.rafYuva);
  assert.deepEqual(s.cagrilar.map((c) => c.birakma), [{ slotIndex: 13 }]);
});

test('ıstakanın yuvasız bir yerine bırakılan çekme hamledir ama yuva bildirmez', (t) => {
  const s = sahneKur(t);
  // Bırakma noktası ıstakanın kendisi (yuvaların arası/kenarı): çekme yine denenir, taşın yerini
  // yerleşim kuralı seçer (ilk boş yuva).
  s.surukle(s.deste, 40, 40, s.raf);
  assert.deepEqual(s.cagrilar, [{ tur: CEKME_KAYNAGI.YER_DESTESI, bilgi: {}, birakma: {} }]);
});

test('taşın üstüne bırakılan çekme, o taşın yuvasını bildirir (yuva taşın sahibidir)', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafTasi);
  assert.deepEqual(s.cagrilar.map((c) => c.birakma), [{ slotIndex: 7 }]);
});

test('ıstakaya düşen sürüklemenin ardından gelen uyum tıklaması yutulur', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  assert.equal(s.tiklama(s.deste), false, 'çekme yapıldıktan sonra aynı hamle ikinci kez denenmemeli');
});

test('ASIL KABUL: eşiği aşıp kaynağın üstünde biten hareket tıklama yolunu kapatmaz', (t) => {
  const s = sahneKur(t);
  // Parmak 40 px kayıp deste/köşenin üstünde kalkıyor: ıstakaya bırakma yok, çekme de yok.
  s.surukle(s.deste, 40, 40, s.deste);
  assert.deepEqual(s.cagrilar, [], 'ıstakaya düşmeyen sürükleme çekme çağırmamalı');
  assert.equal(s.tiklama(s.deste), true, 'hamle olmadığı için ardından gelen tıklama (titrek dokunuş) geçmeli');
});

test('eşiğin altında kalan hareket sürükleme sayılmaz, tıklama geçer', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 3, 2, s.deste);
  assert.deepEqual(s.cagrilar, []);
  assert.equal(s.tiklama(s.deste), true);
});

test('klavyeden gelen tıklama (detail 0) sürüklemeden sonra yutulmaz', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  // Dokunmatikte uyum tıklaması gelmedi; kullanıcı araya işaretçi basışı koymadan native bir
  // düğmeyi (dil, yeni el) Enter/Space ile çalıştırıyor — bu tıklama sürüklemeye ait değil.
  assert.equal(s.tiklama(s.digerDugme, 0), true);
});

test('uyum tıklaması hiç gelmezse yutma bayrağı pencere dolunca düşer', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  s.saatIlerlet(2000);
  assert.equal(s.tiklama(s.deste), true, 'bayat bayrak sonraki tıklamayı yutmamalı');
});

test('ASIL KABUL: çekmeden sonra raftaki taşa dokunma yutulmaz (yutma kaynağa bağlı)', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  // Dokunmatikte uyum tıklaması hiç gelmez; pencere (700 ms) dolmadan oyuncu çektiği taşı
  // oynamak için rafa dokunuyor. Yutulacak olan yalnız kaynağın (deste/köşe) kendi tıklamasıdır.
  s.saatIlerlet(200);
  assert.equal(s.tiklama(s.rafTasi), true, 'raf taşına dokunma ölmemeli');
  assert.equal(s.tiklama(s.digerDugme), true, 'kaynak dışındaki düğme de ölmemeli');
});

test('yutma yalnız sürüklemenin başladığı kaynağa uygulanır', (t) => {
  const s = sahneKur(t);
  s.surukle(s.kose, 40, 40, s.rafYuva);
  assert.equal(s.tiklama(s.deste), true, 'başka kaynağın (deste) tıklaması yutulmamalı');
  assert.equal(s.tiklama(s.kose), false, 'sürüklemenin başladığı köşenin uyum tıklaması yutulmalı');
});

test('ikinci parmağın raftaki hareketi deste çekmesi tetiklemez', (t) => {
  const s = sahneKur(t);
  // Bir parmak destede basılı (kalkmadı), ikinci parmak rafta sürüklenip kalkıyor.
  s.isaretci('pointerdown', s.deste, 0, 0, 1);
  s.isaretci('pointerdown', s.rafTasi, 200, 200, 2);
  s.isaretci('pointermove', s.rafTasi, 260, 240, 2);
  s.noktaya(s.rafYuva);
  s.isaretci('pointerup', s.rafTasi, 260, 240, 2);
  assert.deepEqual(s.cagrilar, [], 'başka işaretçinin hareketi kaynaktan çekme sayılmamalı');
});

test('kaynak dışında başlayan basış bayat durumu düşürür', (t) => {
  const s = sahneKur(t);
  // Fare destede basıldı, `pointerup` kayboldu (pencere dışında bırakma, yakalama yok): durum
  // bayat kaldı. Aynı kimlikli (fare) sıradaki hareket rafta başlıyor ve rafta bitiyor.
  s.isaretci('pointerdown', s.deste, 0, 0, 1);
  s.surukle(s.rafTasi, 40, 40, s.rafYuva);
  assert.deepEqual(s.cagrilar, [], 'rafta başlayan hareket çekme çağırmamalı');
});

test('yakalama etkin olmayan işaretçide hata verirse hareket düşürülür', (t) => {
  const s = sahneKur(t);
  s.deste.setPointerCapture = () => { throw new Error('etkin olmayan isaretci'); };
  s.surukle(s.deste, 40, 40, s.rafYuva);
  assert.deepEqual(s.cagrilar, [], 'işaretçisi artık var olmayan hareket çekme çağırmamalı');
});

test('iptal edilen hareket hamle sayılmaz', (t) => {
  const s = sahneKur(t);
  s.surukle(s.deste, 40, 40, s.rafYuva);
  s.cagrilar.length = 0;
  const deste = s.deste;
  // pointerdown + hareket, sonra pointercancel: bırakma hiç olmadı.
  s.tiklama(deste); // bayrağı temizle
  const sahte = { type: 'pointerdown', target: deste, clientX: 0, clientY: 0, pointerId: 1 };
  for (const islev of s.masa.dinleyiciler.get('pointerdown') ?? []) islev(sahte);
  for (const islev of s.masa.dinleyiciler.get('pointercancel') ?? []) islev(sahte);
  for (const islev of s.masa.dinleyiciler.get('pointerup') ?? []) islev(sahte);
  assert.deepEqual(s.cagrilar, [], 'iptal sonrası pointerup çekme çağırmamalı');
});
