// tasokey#69 (üst iş tasokey#64, plan §7 iş 3) — SAYFADA çalışan sürükle-bırak ölçüm katmanı:
// gerçek Pointer Events üretir, beş yolun gözlemini toplar ve kararı saf çekirdeğe
// (`yardimci/surukleme-hedefi.js`) bırakır. Karar burada VERİLMEZ (tek kaynak: ADR-023/4).
//
// Bu dosya İKİ yolda da aynı metin olarak çalışır: (1) `yardimci/surukleme-olcum-betigi.js` onu
// plan.json'un `js` alanına gömer (ofis yolu, ADR-023/1), (2) `npm test` modül olarak import edip
// öğe kümesini, sahne listesini ve betiğin sözdizimini ölçer.
// Bu yüzden: `import` BİLDİRİMİ YOK (saf çekirdek `surukleme` parametresi olarak verilir; oyunun
// kendi saf modülleri sayfadan `import()` ÇAĞRISIYLA alınır) ve DOM'a yalnız işlev gövdelerinin
// içinden dokunulur.
//
// Zorlanan iki şey (çıktıda `zorlanan` alanında yazılı — A9, gizlenmez):
//   1. `Element.prototype.setPointerCapture` ölçüm süresince boş işleve alınır. Sentetik
//      PointerEvent'in `pointerId`si etkin bir işaretçi değildir; gerçek yakalama çağrısı
//      `NotFoundError` atar ve `surukle.js`in çekme yolundaki `try/catch` bunu "durumu düşür"
//      diye yorumlayıp sürüklemeyi iptal eder. Yakalama yalnız bir KOLAYLIKTIR (dinleyiciler
//      `#raf`/`#masa` üstünde durur, `surukle.js` yorumu) — kapatılması bırakma KARARINI
//      değiştirmez, olayların hangi öğeden geçtiğini değiştirir.
//   2. Bot gecikmeleri çökertilir (`window.setTimeout` → 0 ms), tasokey#67/#68 ile aynı desen:
//      ölçüm turu sınırlı, el sürmesi beklenemez.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

/** Ölçülen dört köşe ve komşuları (ADR-012 ızgarası: 3x3, orta sütun ıstaka şeridi). */
export const KOSE_TANIMLARI = Object.freeze([
  { kose: 'solUst', yatay: 'sol', dikey: 'ust', yanKenar: 'kenarSol', ortaKenar: 'kenarUst' },
  { kose: 'sagUst', yatay: 'sag', dikey: 'ust', yanKenar: 'kenarSag', ortaKenar: 'kenarUst' },
  { kose: 'solAlt', yatay: 'sol', dikey: 'alt', yanKenar: 'kenarSol', ortaKenar: 'rafAlani' },
  { kose: 'sagAlt', yatay: 'sag', dikey: 'alt', yanKenar: 'kenarSag', ortaKenar: 'rafAlani' },
]);

/** Bölge taramasının ızgara bölmesi (5x5 = köşe başına 25 nokta). */
export const BOLGE_BOLMESI = 5;

/**
 * Sayfa katmanının `getElementById` ile aradığı bütün kimlikler. Öz-test bu listenin
 * `docs/index.html`de gerçekten var olduğunu ölçer: kimlik yeniden adlandırılırsa ölçüm sessizce
 * "ölçülmedi" dönmek yerine testte kırmızı yanar (tasokey#67 öğe kümesi testinin aynısı).
 */
export const GEREKLI_KIMLIKLER = Object.freeze([
  'zorlukKolay', 'yeniOyunButonu', 'yeniElButonu', 'bilgiPaneli', 'bilgiTamamButonu',
  'baslangicPaneli', 'sonucPaneli', 'sonucMetni',
  'masa', 'ustCubuk', 'rafAlani', 'raf', 'merkez', 'yerDestesi', 'yerDestesiIpucu', 'gosterge',
  'kenarUst', 'kenarSol', 'kenarSag',
  'koseSolUst', 'koseSagUst', 'koseSolAlt', 'koseSagAlt',
  'koseSolUstSayac', 'koseSagUstSayac', 'koseSolAltSayac', 'koseSagAltSayac',
]);

/** Bitirme sahnesinde en çok kaç el denenir (tur bütçesi; aşılırsa yol `olculmedi` kalır). */
export const BITIRME_EN_COK_EL = 8;

/** Bir elde en çok kaç insan turu oynanır (sonsuz döngü ağı; deste ~26 turda tükenir). */
export const EN_COK_TUR = 60;

/**
 * Uygulamanın AÇILIŞI ve elin DAĞITILMASI için beklenen en uzun süreler (ms). İkisi de sabit
 * uyku değil, ölçülen bir koşulun üst sınırıdır: koşul erken sağlanırsa beklenmez, hiç
 * sağlanmazsa ölçüm sessizce sürmek yerine gerekçeli hata verir (A9).
 */
export const HAZIRLIK_BEKLEME_MS = 8000;
export const DAGITIM_BEKLEME_MS = 3000;

// Sayfa katmanının durumu: saf çekirdek ve kurcalanmamış zamanlayıcı. `olcumYap` çağrısında
// doldurulur; modül düzeyinde durmalarının tek nedeni yardımcı işlev gövdelerinin `export`
// sözcüğü atılarak aynı kapsama gömülmesidir (tasokey#67 deseni).
let S = null;
let gercekBekle = null;
let isaretciSayaci = 100;

const el = (id) => document.getElementById(id);
const pxSayi = (deger) => Number.parseFloat(deger) || 0;
const uyu = (ms) => new Promise((coz) => gercekBekle(coz, ms));
const gorunurMu = (id) => el(id).classList.contains('gorunur');
const koseId = (kose) => `kose${kose[0].toUpperCase()}${kose.slice(1)}`;

function kutu(dugum) {
  const k = dugum.getBoundingClientRect();
  return { sol: k.left, ust: k.top, sag: k.right, alt: k.bottom };
}

/**
 * Bir CSS UZUNLUK ifadesinin tarayıcıda çözülen px değeri. Niçin ölçü öğesi: kaydedilmemiş özel
 * değişkenin hesaplanan değeri yalnız belirteç dizisidir, `calc()`/`clamp()` sadeleşmez — ADR-022
 * ile taş ölçüsü de `clamp()` olduğundan `getPropertyValue` + `parseFloat` NaN verir (tasokey#68
 * bulgusu). Sayıyı tarayıcının kendisi hesaplasın diye ifade bir ölçü öğesinin `width`ine verilir.
 */
function olculenPx(ifade) {
  const olcer = document.createElement('div');
  olcer.style.cssText = `position:absolute;left:-9999px;top:0;height:0;visibility:hidden;width:${ifade};`;
  document.body.appendChild(olcer);
  const deger = pxSayi(getComputedStyle(olcer).width);
  olcer.remove();
  return deger;
}

const degiskenPx = (ad) => olculenPx(`var(${ad})`);

function bilgiyiKapat() {
  if (!gorunurMu('bilgiPaneli')) return false;
  el('bilgiTamamButonu').click();
  return true;
}

// ——— ıstaka okuması ———————————————————————————————————————————————————————————————————————

/** Istakanın yerleşimi: `slotIndex` → taş kimliği (boş yuva `null`). DOM'dan okunur. */
function yerlesimOku() {
  const yuvalar = [...document.querySelectorAll('#raf .raf-yuva')];
  const yerlesim = new Array(yuvalar.length).fill(null);
  for (const yuva of yuvalar) {
    const index = Number(yuva.dataset.slotIndex);
    const tas = yuva.querySelector('.tas');
    yerlesim[index] = tas ? tas.dataset.tasId : null;
  }
  return yerlesim;
}

const elSayisi = () => yerlesimOku().filter((id) => id !== null).length;

/** Yuva öğesi (`slotIndex`e göre); çizim her hamlede yenilendiği için her seferinde aranır. */
const yuvaOgesi = (index) => document.querySelector(`#raf .raf-yuva[data-slot-index="${index}"]`);
const tasOgesi = (tasId) => document.querySelector(`#raf .tas[data-tas-id="${tasId}"]`);

/** Köşe/deste yığınının ADEDİ: sayaç metni tek kaynaktır (yığın en çok N taş ÇİZER, ekran.js). */
function yiginAdedi(sayacId) {
  const metin = el(sayacId).textContent.trim();
  return metin === '' ? 0 : Number(metin);
}

const merkez = (k) => ({ x: (k.sol + k.sag) / 2, y: (k.ust + k.alt) / 2 });

// ——— sentetik işaretçi ————————————————————————————————————————————————————————————————————

function isaretciGonder(dugum, tip, nokta, isaretciId) {
  dugum.dispatchEvent(new PointerEvent(tip, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: nokta.x,
    clientY: nokta.y,
    pointerId: isaretciId,
    pointerType: 'mouse',
    isPrimary: true,
    buttons: tip === 'pointerup' ? 0 : 1,
  }));
}

/**
 * Tek sürükleme: basış → birkaç hareket → bırakma. Olaylar KAYNAK öğeye gönderilir (kabarcıkla
 * `#raf`/`#masa` dinleyicisine çıkar, `surukle.js`in iki kapısı da orada durur); bırakma kararını
 * `document.elementFromPoint(clientX, clientY)` verdiği için ölçüm gerçek isabet testini kullanır.
 * `sirasindaOlc`: ilk hareketten SONRA (sürükleme sürerken) okunacak gözlem.
 * `dropteOlc`: `pointerup` gönderildikten HEMEN SONRA, hiç `await` edilmeden okunacak gözlem —
 * yani hamlenin KENDİ sonucu. `surukle.js` `birak()` bırakma geri çağrısını olay gönderimi içinde
 * SENKRON çağırır ve `ekran.js` çizimi de senkron biter; bot turu ise `setTimeout` ile sıraya
 * girer (ölçümde 0 ms'ye çökertili). Beklemeden sonra okunan sayı bu yüzden bizim hamlemizi değil
 * "hamle + botların tepkisi"ni ölçer (tasokey#74: 1920x1080 turunda bot, köşeye attığımız taşı
 * hemen çekti → yığın 0→1→0 göründü ve ölçüm elde olmayan bir sebeple kaldı).
 */
async function surukleBirak({
  kaynakDugum, baslangic, bitis, adim = 4, sirasindaOlc = null, dropteOlc = null,
}) {
  isaretciSayaci += 1;
  const isaretciId = isaretciSayaci;
  let sirasinda = null;
  isaretciGonder(kaynakDugum, 'pointerdown', baslangic, isaretciId);
  for (let i = 1; i <= adim; i += 1) {
    const oran = i / adim;
    isaretciGonder(kaynakDugum, 'pointermove', {
      x: baslangic.x + (bitis.x - baslangic.x) * oran,
      y: baslangic.y + (bitis.y - baslangic.y) * oran,
    }, isaretciId);
    if (i === 1 && sirasindaOlc) sirasinda = sirasindaOlc();
    await uyu(0);
  }
  isaretciGonder(kaynakDugum, 'pointerup', bitis, isaretciId);
  const dropte = dropteOlc ? dropteOlc() : null;
  await uyu(60);
  bilgiyiKapat();
  await uyu(20);
  return { sirasinda, dropte };
}

// ——— sahne kurulumu ———————————————————————————————————————————————————————————————————————

/** İnsan oyuncunun sırası mı: uygulamanın kendi işareti (`.cekilebilir`, ekran.js masaCiz). */
const insanSirasiMi = (cekilebilirKose) => el(koseId(cekilebilirKose)).classList.contains('cekilebilir');

/**
 * Uygulama açılışının BİTTİĞİNİ bekler. Niçin ayrı bir kapı: `ekran.js` `baslat()` ASENKRONdur —
 * dil dosyaları ve görseller yüklendikten SONRA `olaylariBagla()` ve ilk `ciz()` koşar. Ondan önce
 * `yeniOyunButonu`na basmak sessizce kaybolur (dinleyici henüz bağlı değil) ve `baslangicPaneli` de
 * `gorunur` sınıfını henüz almadığı için "pencere kapandı" denetimi yanlışlıkla GEÇER: ölçüm, el
 * hiç dağıtılmamışken sürer ve bütün yollar `olculmedi` döner. Ölçüldü (tasokey#74 çekim turu 2,
 * 800x360): ıstaka 12x8 px, "itme ölçümü için en az 2 taş gerekir", "sıra insana gelmedi".
 * İşaret: ilk ekran `baslangic`tır (ADR-016) → panel `gorunur` sınıfını ilk çizimde alır.
 */
async function uygulamaHazirOl() {
  for (let i = 0; i < HAZIRLIK_BEKLEME_MS / 10; i += 1) {
    if (gorunurMu('baslangicPaneli')) return;
    await uyu(10);
  }
  throw new Error('uygulama açılışı bitmedi (başlangıç penceresi hiç görünmedi)');
}

/** El dağıtıldı mı: ıstakada taş görünene kadar bekler (sabit uyku yerine ölçülen koşul). */
async function eliBekle() {
  for (let i = 0; i < DAGITIM_BEKLEME_MS / 10; i += 1) {
    if (elSayisi() > 0) return true;
    await uyu(10);
  }
  return false;
}

async function oyunuBaslat() {
  el('zorlukKolay').click();
  el('yeniOyunButonu').click();
  if (!(await eliBekle())) throw new Error('el dağıtılmadı ("Yeni oyun" tıklaması işlemedi)');
  bilgiyiKapat();
  if (gorunurMu('baslangicPaneli')) throw new Error('başlangıç penceresi kapanmadı');
}

/**
 * O turun elini SABİTLER: oyunun kendi belgeli tohum parametresini (`?tohum=`, `ekran.js`
 * `tohumuBelirle`) adres satırına yazar; "Yeni oyun" onu okur ve aynı eli dağıtır (ADR-003).
 * Uygulama DEĞİŞMEZ, ölçüm katmanı yalnız parametreyi verir; sayfa yeniden yüklenmez.
 * Niçin: tohumsuz turda el `Date.now()` ile dağıtılıyordu → aynı betik her boyutta BAŞKA bir el
 * ölçüyordu ve R-013 sahnesi "bitirilebilir el" bulana kadar el oynamak zorundaydı (tasokey#74
 * çekim turu 2'de 900x600'de 8 el denendi, bulunamadı → yol `olculmedi` kaldı).
 */
function tohumuSabitle(tohum) {
  if (tohum === null || tohum === undefined) return null;
  const adres = new URL(window.location.href);
  adres.searchParams.set('tohum', String(tohum));
  window.history.replaceState(null, '', adres.toString());
  return tohum;
}

/**
 * Sıra insana gelene kadar bekler (bot gecikmeleri çökertilmiş olmalı). ATMAZ: sıra gelmezse
 * `false` döner ki o ana kadar toplanan gözlemler kaybolmasın — ölçülmeyen yol zaten `olculmedi`
 * olarak raporlanır (A9).
 */
async function sirayiBekle(cekilebilirKose, { enCok = 400 } = {}) {
  for (let i = 0; i < enCok; i += 1) {
    bilgiyiKapat();
    if (gorunurMu('sonucPaneli')) return false;
    if (insanSirasiMi(cekilebilirKose)) return true;
    await uyu(5);
  }
  return false;
}

/** Sırayı bekler ve gelmezse ATAR: ölçümü sıraya bağlı olan adımlar bunu kullanır. */
async function sirayiBekleZorunlu(cekilebilirKose) {
  if (await sirayiBekle(cekilebilirKose)) return;
  throw new Error(gorunurMu('sonucPaneli')
    ? 'el bitti (sonuç penceresi açık), sıra insana gelmeyecek'
    : 'sıra insana gelmedi (bot turu bitmedi)');
}

// ——— yol 1 + yol 4: ıstakaya bırakma ve çekme ——————————————————————————————————————————————

/** Istakada itme: dolu bir yuvaya bırakma (ADR-019 — taş kendine yer açar, takas yok). */
async function itmeyiOlc() {
  const once = yerlesimOku();
  const dolular = once.map((id, index) => ({ id, index })).filter((k) => k.id !== null);
  if (dolular.length < 2) throw new Error('itme ölçümü için en az 2 taş gerekir');
  const kaynak = dolular[0];
  const hedef = dolular[dolular.length - 1];
  const tas = tasOgesi(kaynak.id);
  const hedefYuva = yuvaOgesi(hedef.index);
  if (!tas || !hedefYuva) throw new Error('itme ölçümü: taş ya da hedef yuva bulunamadı');
  await surukleBirak({
    kaynakDugum: tas,
    baslangic: merkez(kutu(tas)),
    bitis: merkez(kutu(hedefYuva)),
  });
  return {
    suruklenenId: kaynak.id,
    kaynakYuva: kaynak.index,
    hedefYuva: hedef.index,
    hedefteOlanId: hedef.id,
    oncekiYerlesim: once,
    sonrakiYerlesim: yerlesimOku(),
  };
}

/**
 * Desteden ıstakaya sürükleyerek çekme (R-012) — bırakılan yuva SEÇİLİR (tasokey#48/ADR-019:
 * çekilen taş bırakıldığı yuvada kalır). Hedef, ıstakanın SON boş yuvasıdır: "ilk boş yuvaya
 * girdi" ile "bırakılan yuvada kaldı" ayırt edilebilsin.
 */
async function destedenCekmeyiOlc() {
  const once = yerlesimOku();
  const bosYuvalar = once.map((id, index) => ({ id, index })).filter((k) => k.id === null);
  if (bosYuvalar.length === 0) throw new Error('çekme ölçümü: ıstakada boş yuva yok');
  const hedefIndex = bosYuvalar[bosYuvalar.length - 1].index;
  const hedefYuva = yuvaOgesi(hedefIndex);
  const deste = el('yerDestesi');
  const elOnce = once.filter((id) => id !== null).length;
  await surukleBirak({
    kaynakDugum: deste,
    baslangic: merkez(kutu(deste)),
    bitis: merkez(kutu(hedefYuva)),
  });
  const sonra = yerlesimOku();
  const yeniler = sonra.filter((id) => id !== null && !once.includes(id));
  return {
    yuva: hedefIndex,
    id: yeniler[0] ?? null,
    cekilenId: yeniler[0] ?? null,
    elOnce,
    elSonra: sonra.filter((id) => id !== null).length,
    oncekiYerlesim: once,
    sonrakiYerlesim: sonra,
  };
}

/** Bir köşeden ıstakaya sürükleyerek çekme denemesi (geçerli ya da yasak köşe — R-012). */
async function kosedenCekmeyiOlc(kose) {
  const kaynak = el(koseId(kose));
  const sayac = `${koseId(kose)}Sayac`;
  const once = yerlesimOku();
  const bosYuvalar = once.map((id, index) => ({ id, index })).filter((k) => k.id === null);
  if (bosYuvalar.length === 0) throw new Error('köşeden çekme ölçümü: ıstakada boş yuva yok');
  const hedefYuva = yuvaOgesi(bosYuvalar[0].index);
  const gozlem = {
    kose,
    cekilebilirSinif: kaynak.classList.contains('cekilebilir'),
    yiginAdet: yiginAdedi(sayac),
    elOnce: once.filter((id) => id !== null).length,
  };
  await surukleBirak({
    kaynakDugum: kaynak,
    baslangic: merkez(kutu(kaynak)),
    bitis: merkez(kutu(hedefYuva)),
  });
  gozlem.elSonra = elSayisi();
  return gozlem;
}

/**
 * tasokey#87 — çekilen taşı geri bırakma (GDD §1 kural 14). Ön koşul: `kosedenCekmeyiOlc` az önce
 * geçerli köşeden çekmiş olmalı. Hangi taşın çekildiğini ölçüm KENDİ defterinden değil,
 * uygulamanın ekrana koyduğu işaretten okur (`#raf .tas.geri-birakilabilir`) — yani ölçüm
 * Sahip'in gördüğü şeyi ölçer, iç durumu değil. Sonra o taş aynı köşeye sürüklenir ve zincirin
 * tamamı (el, sayaç, vurgu, durum satırı, desteden çekebilme) okunur.
 */
async function geriBirakmayiOlc(kose) {
  const koseDugum = el(koseId(kose));
  const sayacAdi = `${koseId(kose)}Sayac`;
  const isaretliTas = document.querySelector('#raf .tas.geri-birakilabilir');
  const gozlem = {
    kose,
    isaretliTasVar: Boolean(isaretliTas),
    tasId: isaretliTas?.dataset?.tasId ?? null,
    koseVurgusu: koseDugum.classList.contains('geri-birakilabilir'),
    elOnce: elSayisi(),
    yiginOnce: yiginAdedi(sayacAdi),
    durumOnce: el('durumSatiri').textContent,
  };
  if (!isaretliTas) {
    return { ...gozlem, hata: 'ıstakada "geri bırakılabilir" işaretli taş yok (köşeden çekilmemiş olabilir)' };
  }

  await surukleBirak({
    kaynakDugum: isaretliTas,
    baslangic: merkez(kutu(isaretliTas)),
    bitis: merkez(kutu(koseDugum)),
  });

  gozlem.elSonra = elSayisi();
  gozlem.yiginSonra = yiginAdedi(sayacAdi);
  gozlem.durumSonra = el('durumSatiri').textContent;
  gozlem.isaretKalkti = document.querySelector('#raf .tas.geri-birakilabilir') === null;
  gozlem.koseVurgusuSonra = koseDugum.classList.contains('geri-birakilabilir');

  // Sahip'in cümlesinin son halkası: geri bıraktıktan sonra DESTEDEN çekebilmeli.
  try {
    const deste = await destedenCekmeyiOlc();
    gozlem.elDestedenSonra = deste.elSonra;
    gozlem.destedenCekildi = deste.elSonra === gozlem.elSonra + 1;
  } catch (hata) {
    gozlem.destedenCekildi = false;
    gozlem.destedenHata = hata.message;
  }
  return gozlem;
}

// ——— yol 2: geçersiz bırakma ———————————————————————————————————————————————————————————————

const kopyaSayisi = () => document.querySelectorAll('.surukleme-kopyasi').length;

function suruklenenTasDurumu(tasId) {
  const tas = tasOgesi(tasId);
  return {
    sinif: tas ? tas.classList.contains('surukleniyor') : null,
    gorunurluk: tas ? getComputedStyle(tas).visibility : 'yok',
    kopya: kopyaSayisi(),
  };
}

/**
 * Geçersiz bırakma (tasokey#62 + ADR-021): taş ıstakadan alınır, masanın DIŞINA (üst çubuğa)
 * bırakılır. Hiçbir hedefe düşmediği için hamle olmaz; kopya kalkar, asıl taş yeniden görünür
 * olur ve ıstaka dizilimi BİREBİR aynı kalır.
 */
async function gecersizBirakmayiOlc() {
  const once = yerlesimOku();
  const suruklenenId = once.find((id) => id !== null);
  const tas = tasOgesi(suruklenenId);
  const hedef = el('ustCubuk');
  const hedefKutu = kutu(hedef);
  const { sirasinda } = await surukleBirak({
    kaynakDugum: tas,
    baslangic: merkez(kutu(tas)),
    bitis: { x: merkez(hedefKutu).x, y: merkez(hedefKutu).y },
    sirasindaOlc: () => suruklenenTasDurumu(suruklenenId),
  });
  return {
    hedefAdi: '#ustCubuk',
    suruklenenId,
    sirasinda,
    sonra: suruklenenTasDurumu(suruklenenId),
    oncekiYerlesim: once,
    sonrakiYerlesim: yerlesimOku(),
  };
}

// ——— yol 3: köşe atma alanı ————————————————————————————————————————————————————————————————

/** Bir noktadaki isabetin ADI: köşe ise `data-kose`, değilse öğenin kimliği/sınıfı. */
function noktadakiAd(nokta) {
  const dugum = document.elementFromPoint(nokta.x, nokta.y);
  if (!dugum) return 'yok';
  const kose = dugum.closest('.kose[data-kose]');
  if (kose) return `kose:${kose.dataset.kose}`;
  const kimlikli = dugum.closest('[id]');
  if (kimlikli) return `#${kimlikli.id}`;
  return dugum.className ? `.${String(dugum.className).split(' ')[0]}` : dugum.tagName.toLowerCase();
}

function masaIcKutusu() {
  const masa = el('masa');
  const bicim = getComputedStyle(masa);
  const dis = kutu(masa);
  return {
    sol: dis.sol + pxSayi(bicim.borderLeftWidth) + pxSayi(bicim.paddingLeft),
    ust: dis.ust + pxSayi(bicim.borderTopWidth) + pxSayi(bicim.paddingTop),
    sag: dis.sag - pxSayi(bicim.borderRightWidth) - pxSayi(bicim.paddingRight),
    alt: dis.alt - pxSayi(bicim.borderBottomWidth) - pxSayi(bicim.paddingBottom),
  };
}

/**
 * Dört köşenin ölçümü (tasokey#63 + ADR-012):
 *   · `hucre`: köşe ızgara hücresinin İÇİNDEN seçilen 9 noktanın isabeti (hepsi o köşe olmalı),
 *   · `kenarlar`: hücrenin dış kenarı masanın içerik kutusuna, iç yatay kenarı ıstaka SÜTUNUNA
 *     (`#rafAlani` şeridi — ADR-012 iz kuralı) ne kadar uzakta,
 *   · `bolge`: "iki ıstaka arasındaki boş bölge" (dış kenarlar masa içerik kutusu, iç yatay kenar
 *     ızgaranın orta SÜTUN çizgisi, iç dikey kenar komşu yan çubuğun yüzü) 5x5 taranır; kaçan
 *     noktanın neye düştüğü adıyla yazılır. Oran burada yalnız ÖLÇÜLÜR; ölçütle karşılaştırma
 *     saf çekirdekteki `bolgeIsabetiEnAz80` denetimindedir (tek kaynak `EN_AZ_BOLGE_ORANI`).
 */
function koseleriOlc() {
  const masaIc = masaIcKutusu();
  const raf = kutu(el('rafAlani'));
  const koseler = [];
  for (const tanim of KOSE_TANIMLARI) {
    const dugum = el(koseId(tanim.kose));
    const hucre = kutu(dugum);
    const yan = kutu(el(tanim.yanKenar));
    const orta = kutu(el(tanim.ortaKenar));

    const hucreNoktalari = S.isabetNoktalari(hucre).map((nokta) => ({
      ...nokta, bulunan: noktadakiAd(nokta),
    }));
    const beklenen = `kose:${tanim.kose}`;

    // Boş bölgenin YATAY sınırı dört köşede de ızgaranın ORTA SÜTUN çizgisidir (`#rafAlani`in
    // kenarları; ızgara sütunu bütün satırlarda ortaktır). tasokey#74'e kadar üst köşelerde sınır
    // üst çubuğun YÜZÜ alınıyordu; tasokey#73 çubuğu daralttığı için o yüz artık sütun çizgisinin
    // İÇİNDE kalıyor ve kutu orta sütuna taşıyordu — ölçülen kaçan noktalar bunu adıyla söyledi
    // (900x600 solUst: `#merkez x2`, `#yerDestesiBaslik x1`). Taşan kutu, projenin kendi statik
    // modeliyle de çelişiyordu: `kose-atma-alani.test.js` kabul-a2 boş bölge ile köşe kutusu
    // arasındaki açığı EN ÇOK BİR ızgara boşluğu sayar, yani bölgeyi sütun çizgisinden türetir.
    // Çubuk ile sütun çizgisi arasında kalan artık şerit aşağıda AYRICA ölçülür (`cubukArtigi`).
    const bolgeKutusu = {
      sol: tanim.yatay === 'sol' ? masaIc.sol : raf.sag,
      sag: tanim.yatay === 'sol' ? raf.sol : masaIc.sag,
      ust: tanim.dikey === 'ust' ? masaIc.ust : yan.alt,
      alt: tanim.dikey === 'ust' ? yan.ust : masaIc.alt,
    };
    const bolgeNoktalari = S.izgaraNoktalari(bolgeKutusu, { bolme: BOLGE_BOLMESI })
      .map((nokta) => ({ ...nokta, bulunan: noktadakiAd(nokta) }));
    const bolgeIsabet = bolgeNoktalari.filter((nokta) => nokta.bulunan === beklenen);

    koseler.push({
      anahtar: tanim.kose,
      kutu: hucre,
      kenarlar: {
        // Dış kenarlar: masanın içerik kutusuna uzaklık (0 olmalı — boş bölge köşede başlar).
        disX: tanim.yatay === 'sol' ? hucre.sol - masaIc.sol : masaIc.sag - hucre.sag,
        disY: tanim.dikey === 'ust' ? hucre.ust - masaIc.ust : masaIc.alt - hucre.alt,
        // İç yatay kenar: ıstaka sütununun (orta iz = `#rafAlani` şeridi) yüzüne uzaklık;
        // ızgara boşluğu (`--masa-bosluk`) kadar olmalı.
        icX: tanim.yatay === 'sol' ? raf.sol - hucre.sag : hucre.sol - raf.sag,
        // İç dikey kenar: orta satır komşusunun (yan çubuk) yüzüne uzaklık — ÖLÇÜLÜR, eşiği
        // yoktur: orta satır `align-items: center` olduğu için çubuk satırını doldurmaz.
        icY: tanim.dikey === 'ust' ? yan.ust - hucre.alt : hucre.ust - yan.alt,
        // Orta sütun çizgisi ile o sütundaki komşunun yüzü arasında kalan ARTIK şerit (px):
        // köşenin dışında kalan ama gerçekte boş duran masa. ÖLÇÜLÜR, eşiği yoktur (A9) — alt
        // köşelerde komşu `#rafAlani`in kendisidir, bu yüzden yapısal olarak 0'dır; üst köşelerde
        // üst çubuğun genişliği (`--rakip-ust-genislik`, Sahip'in ıstakasıyla aynı formül) orta
        // sütundan dar kalırsa büyür. stil.css'in kendi yorumu (`.kenar-raf-yatay` üstü) dikey
        // çubuk için bu artığı tasokey#63 koşulu sayıyor; yatay çubuk için karar Mimar'da.
        cubukArtigi: tanim.yatay === 'sol' ? orta.sol - raf.sol : raf.sag - orta.sag,
      },
      hucre: {
        toplam: hucreNoktalari.length,
        isabet: hucreNoktalari.filter((nokta) => nokta.bulunan === beklenen).length,
        noktalar: hucreNoktalari,
        kacanlar: hucreNoktalari.filter((nokta) => nokta.bulunan !== beklenen),
      },
      bolge: {
        kutu: bolgeKutusu,
        toplam: bolgeNoktalari.length,
        isabet: bolgeIsabet.length,
        oran: bolgeNoktalari.length === 0 ? 0 : bolgeIsabet.length / bolgeNoktalari.length,
        noktalar: bolgeNoktalari,
        kacanlar: bolgeNoktalari.filter((nokta) => nokta.bulunan !== beklenen),
      },
    });
  }
  return { koseler, masaIc };
}

/**
 * Taş okey/sahte okey mi: ekran.js okey taşına `tas-okey-cerceve.svg` katmanını ekler
 * (`.tas-cerceve`). Kural burada yazılmaz, uygulamanın kendi işareti okunur.
 */
function okeyIsaretliMi(tasId) {
  const tas = tasOgesi(tasId);
  return tas ? tas.querySelector('.tas-cerceve') !== null : false;
}

/** Okey/sahte okey olmayan bir taş (atınca bilgilendirme penceresi açılmasın — ADR-016/8). */
function atilabilirTasId(yerlesim) {
  const dolular = yerlesim.filter((id) => id !== null);
  return dolular.find((id) => !okeyIsaretliMi(id)) ?? dolular[0] ?? null;
}

/**
 * Uç noktadan atma (tasokey#63 kazancının kanıtı): taş, kendi köşesinin hücre KÖŞESİNE yakın bir
 * noktaya bırakılır — eski düzende orada taş ölçüsünde küçük bir kutu vardı, hücre o kadar
 * büyümediği için bu nokta hedefin dışında kalıyordu.
 *
 * Sonuç BIRAKMA ANINDA okunur (`dropteOlc`), beklemeden sonra değil: atılan taş bizim köşemize
 * düşer ve sıra hemen soldaki bota geçer — bot o taşı komşu köşesinden ÇEKEBİLİR (R-012), o zaman
 * yığın 0→1→0 olur ve bizim hamlemiz hiç olmamış gibi görünür. Ölçülen şey hamlenin kendi
 * sonucudur; botun sonraki kararı bu yolun ölçütü değildir (tasokey#74).
 */
async function ucNoktadanAtmayiOlc(kendiKose, noktaAdi = 'solUst') {
  const dugum = el(koseId(kendiKose));
  const nokta = S.isabetNoktalari(kutu(dugum)).find((n) => n.ad === noktaAdi);
  const sayacId = `${koseId(kendiKose)}Sayac`;
  const yerlesim = yerlesimOku();
  const tasId = atilabilirTasId(yerlesim);
  const tas = tasOgesi(tasId);
  const gozlem = {
    kose: kendiKose,
    nokta: `${noktaAdi}(${Math.round(nokta.x)},${Math.round(nokta.y)})`,
    noktaIsabeti: noktadakiAd(nokta),
    tasId,
    elOnce: yerlesim.filter((id) => id !== null).length,
    yiginOnce: yiginAdedi(sayacId),
  };
  const { dropte } = await surukleBirak({
    kaynakDugum: tas,
    baslangic: merkez(kutu(tas)),
    bitis: nokta,
    dropteOlc: () => ({ el: elSayisi(), yigin: yiginAdedi(sayacId) }),
  });
  gozlem.elSonra = dropte.el;
  gozlem.yiginSonra = dropte.yigin;
  // Bekleme sonrası durum ÖLÇÜLÜR ama ölçüt değildir: yığın eksildiyse taşı bot çekmiştir.
  gozlem.yiginBotSonrasi = yiginAdedi(sayacId);
  return gozlem;
}

// ——— yol 5: bitirme hedefi —————————————————————————————————————————————————————————————————

/** Taş kimliğinden taş nesnesi (kimlik biçimi `tas.js`in kendi kalıbıyla doğrulanır). */
function kimliktenTas(id, tasModulu) {
  if (id.startsWith('sahteOkey-')) {
    const tas = tasModulu.sahteOkeyOlustur(Number(id.slice('sahteOkey-'.length)));
    if (tas.id !== id) throw new Error(`taş kimliği çözülemedi: ${id}`);
    return tas;
  }
  const parcalar = id.split('-');
  const tas = tasModulu.tasOlustur(parcalar[0], Number(parcalar[1]), Number(parcalar[2]));
  if (tas.id !== id) throw new Error(`taş kimliği çözülemedi: ${id}`);
  return tas;
}

/** O elin göstergesi ve okey taşı (ikisi de oyunun kendi saf modüllerinden gelir). */
function elinOkeyi(moduller) {
  const gostergeId = el('gosterge').querySelector('.tas').dataset.tasId;
  const gosterge = kimliktenTas(gostergeId, moduller.tas);
  return { gosterge, okeyTasi: moduller.dagitim.okeyTasiBelirle(gosterge) };
}

/** Istakadaki eli taş nesnesi listesi olarak okur. */
function eliOku(moduller) {
  return yerlesimOku().filter((id) => id !== null).map((id) => kimliktenTas(id, moduller.tas));
}

/**
 * Bitirme sahnesinin insan politikası: KURAL yazmaz, çekirdeğe sorar (ADR-018 dili). Çeker, elde
 * bitirici taş var mı diye `cozucu.js`e bakar, yoksa `elDokumu`nun per DIŞI taşlarından birini
 * atar. Amaç oynamak değil, R-013'ün ölçülebileceği durumu (el bitirilebilir) gerçek akışla
 * üretmektir; politikanın kalitesi kabul ölçütü DEĞİLDİR.
 */
async function bitirilebilirDurumuAra(moduller, cekilebilirKose) {
  let elDenemesi = 0;
  for (; elDenemesi < BITIRME_EN_COK_EL; elDenemesi += 1) {
    if (elDenemesi > 0) {
      if (gorunurMu('sonucPaneli')) el('yeniElButonu').click();
      else await oyunuBaslat();
      await uyu(60);
    }
    for (let tur = 0; tur < EN_COK_TUR; tur += 1) {
      bilgiyiKapat();
      if (gorunurMu('sonucPaneli')) break;
      if (!(await sirayiBekle(cekilebilirKose))) break;
      // Seçimi boşalt: seçili taşla desteye dokunmak bitirme denemesi sayılır (etkilesim.js).
      const secili = document.querySelector('#raf .tas.secili');
      if (secili) secili.click();
      if (elSayisi() < 15) {
        el('yerDestesi').click();
        await uyu(10);
        bilgiyiKapat();
      }
      if (gorunurMu('sonucPaneli')) break;
      const { gosterge, okeyTasi } = elinOkeyi(moduller);
      const elim = eliOku(moduller);
      const bitirenler = moduller.cozucu.elBitirenTaslar(elim, okeyTasi, undefined, gosterge);
      if (bitirenler.length > 0) return { bulundu: true, elDenemesi, bitirenler };
      const dokum = moduller.cozucu.elDokumu(elim, okeyTasi, undefined, gosterge);
      const adaylar = [...dokum.kalanlar, ...dokum.ciftler.flat(), ...dokum.perler.flat()]
        .map((tas) => tas.id);
      const atilacak = adaylar.find((id) => !okeyIsaretliMi(id)) ?? adaylar[0];
      if (!atilacak) break;
      tasOgesi(atilacak)?.click();
      await uyu(5);
      el(koseId(moduller.kendiKose)).click();
      await uyu(10);
      bilgiyiKapat();
    }
  }
  return { bulundu: false, elDenemesi, bitirenler: [] };
}

/** Vurgunun GÖRSEL farkı: `bitirilebilir` sınıfı kalkınca değişen biçim özellikleri. */
const VURGU_OZELLIKLERI = Object.freeze(['outlineStyle', 'outlineWidth', 'outlineColor', 'borderTopLeftRadius']);

function vurguFarkiniOlc() {
  const deste = el('yerDestesi');
  const vurgulu = {};
  const bicim = getComputedStyle(deste);
  for (const ozellik of VURGU_OZELLIKLERI) vurgulu[ozellik] = bicim[ozellik];
  deste.classList.remove('bitirilebilir');
  const sade = {};
  const sadeBicim = getComputedStyle(deste);
  for (const ozellik of VURGU_OZELLIKLERI) sade[ozellik] = sadeBicim[ozellik];
  deste.classList.add('bitirilebilir');
  return VURGU_OZELLIKLERI
    .filter((ozellik) => vurgulu[ozellik] !== sade[ozellik])
    .map((ozellik) => ({ ozellik, vurgulu: vurgulu[ozellik], sade: sade[ozellik] }));
}

/** R-013: bitirici taş ortadaki desteye SÜRÜKLENİP bırakılır → el biter. */
async function bitirmeBirakmasiniOlc(bitirenler) {
  const deste = el('yerDestesi');
  const tasId = bitirenler[0].id ?? bitirenler[0];
  const tas = tasOgesi(tasId);
  const gozlem = { tasId, elOnce: elSayisi() };
  await surukleBirak({ kaynakDugum: tas, baslangic: merkez(kutu(tas)), bitis: merkez(kutu(deste)) });
  await uyu(120);
  gozlem.elSonra = elSayisi();
  gozlem.sonucGorunur = gorunurMu('sonucPaneli');
  gozlem.sonucMetni = el('sonucMetni').textContent.trim();
  return gozlem;
}

// ——— ortak ölçüler ve çıktı ————————————————————————————————————————————————————————————————

function olculeriAl() {
  const tas = document.querySelector('#raf .tas');
  return {
    istaka: kutu(el('rafAlani')),
    tas: tas ? kutu(tas) : null,
    olcek: getComputedStyle(document.documentElement).getPropertyValue('--istaka-olcek').trim() || '—',
    hedefPay: degiskenPx('--hedef-pay'),
  };
}

const ISARET_RENKLERI = Object.freeze({
  hucreIsabet: '#2ecc71', hucreKacan: '#e74c3c',
  bolgeIsabet: '#3498db', bolgeKacan: '#f39c12',
  birakma: '#f1c40f', kaynak: '#9b59b6',
});

/**
 * İsabet noktalarını ve bırakma noktalarını sayfaya BASAR (işin kabulü: "isabet noktaları ekran
 * görüntüsüyle kanıtlanır"). Katman isabet testinden çekilidir (`pointer-events: none`) ve
 * BÜTÜN ölçümler bittikten sonra eklenir — `elementFromPoint` sonucunu değiştirmez.
 */
function isaretleriBas(isaretler) {
  const katman = document.createElement('div');
  katman.id = 'surukleIsaretKatmani';
  katman.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;';
  for (const isaret of isaretler) {
    const nokta = document.createElement('div');
    const cap = isaret.cap ?? 6;
    nokta.style.cssText = `position:absolute;left:${isaret.x - cap / 2}px;top:${isaret.y - cap / 2}px;`
      + `width:${cap}px;height:${cap}px;border-radius:50%;background:${isaret.renk};`
      + 'box-shadow:0 0 0 1px #000;';
    katman.appendChild(nokta);
  }
  document.body.appendChild(katman);
}

function yaziyaBas(satirlar) {
  const bicim = S.yaziKatmaniBicimi(satirlar.length, window.innerHeight);
  const katman = document.createElement('div');
  katman.id = 'surukleOlcumKatmani';
  katman.style.cssText = `position:fixed;left:0;top:${bicim.ustPx}px;right:0;z-index:99999;`
    + 'background:#000000ee;color:#ffffff;'
    + `font:${bicim.yazi}px/${bicim.satirPayi} Consolas,monospace;`
    + 'padding:6px 8px;white-space:pre;';
  katman.textContent = satirlar.join('\n');
  document.body.appendChild(katman);
}

function koseIsaretleri(koseler) {
  const isaretler = [];
  for (const kose of koseler) {
    const beklenen = `kose:${kose.anahtar}`;
    for (const nokta of kose.bolge.noktalar) {
      isaretler.push({
        x: nokta.x,
        y: nokta.y,
        cap: 5,
        renk: nokta.bulunan === beklenen ? ISARET_RENKLERI.bolgeIsabet : ISARET_RENKLERI.bolgeKacan,
      });
    }
    for (const nokta of kose.hucre.noktalar) {
      isaretler.push({
        x: nokta.x,
        y: nokta.y,
        cap: 9,
        renk: nokta.bulunan === beklenen ? ISARET_RENKLERI.hucreIsabet : ISARET_RENKLERI.hucreKacan,
      });
    }
  }
  return isaretler;
}

// ——— sahneler —————————————————————————————————————————————————————————————————————————————

/** `hedef` sahnesi: ıstakaya bırakma, geçersiz bırakma, köşe atma alanı, çekme (dört yol). */
async function hedefSahnesi(moduller) {
  const { cekilebilirKose, kendiKose } = moduller;
  const gozlemler = {};
  const isaretler = [];
  const sar = async (anahtar, islev) => {
    try {
      gozlemler[anahtar] = { ...(gozlemler[anahtar] ?? {}), ...(await islev()) };
    } catch (hata) {
      gozlemler[anahtar] = { ...(gozlemler[anahtar] ?? {}), hata: hata.message };
    }
  };

  await sirayiBekle(cekilebilirKose);

  // 1. Istakada itme (hamle değil, dizme) — el 15 taşla başlar, sıra beklenmez.
  await sar('istakayaBirak', async () => ({ itme: await itmeyiOlc() }));

  // 2. Geçersiz bırakma (hamle üretmez).
  await sar('gecersizBirak', async () => gecersizBirakmayiOlc());

  // 3. Köşe atma alanı: önce isabet taramaları (salt okuma), sonra uç noktadan gerçek atma.
  let koseOlcumu = null;
  await sar('koseAtmaAlani', async () => {
    koseOlcumu = koseleriOlc();
    return {
      koseler: koseOlcumu.koseler,
      esik: S.ESIK_PX,
      bosluk: degiskenPx('--masa-bosluk'),
      // Atma hamledir: sıra bizde olmalı (isabet taramaları sıraya bağlı değil, yukarıda koştu).
      atma: await sirayiBekleZorunlu(cekilebilirKose).then(() => ucNoktadanAtmayiOlc(kendiKose)),
    };
  });
  if (koseOlcumu) isaretler.push(...koseIsaretleri(koseOlcumu.koseler));
  if (gozlemler.koseAtmaAlani?.atma) {
    const atma = gozlemler.koseAtmaAlani.atma;
    const eslesme = /\((-?\d+),(-?\d+)\)/.exec(atma.nokta);
    if (eslesme) {
      isaretler.push({
        x: Number(eslesme[1]), y: Number(eslesme[2]), cap: 13, renk: ISARET_RENKLERI.birakma,
      });
    }
  }

  // 4. Çekme: yasak köşe (sıra bizdeyken, çekilmemişken) → deste → sonraki turda komşu köşe.
  await sar('cekme', async () => {
    await sirayiBekleZorunlu(cekilebilirKose);
    const yasak = KOSE_TANIMLARI
      .map((tanim) => tanim.kose)
      .filter((kose) => kose !== cekilebilirKose && kose !== kendiKose)
      .find((kose) => yiginAdedi(`${koseId(kose)}Sayac`) > 0);
    const yasakKose = yasak ? await kosedenCekmeyiOlc(yasak) : { hata: 'dolu yasak köşe yok' };
    const deste = await destedenCekmeyiOlc();
    return { yasakKose, deste };
  });
  // Desteden çekme aynı zamanda ADR-019/tasokey#48'in "bırakılan yuvada kalır" gözlemidir.
  if (gozlemler.cekme?.deste) {
    gozlemler.istakayaBirak = { ...gozlemler.istakayaBirak, cekilen: gozlemler.cekme.deste };
    const yuva = yuvaOgesi(gozlemler.cekme.deste.yuva);
    if (yuva) {
      const nokta = merkez(kutu(yuva));
      isaretler.push({ x: nokta.x, y: nokta.y, cap: 13, renk: ISARET_RENKLERI.birakma });
    }
  }

  // Sıra yeniden bize gelsin diye bir taş atılır (ölçüm değil, akış).
  const atilacak = atilabilirTasId(yerlesimOku());
  tasOgesi(atilacak)?.click();
  await uyu(5);
  el(koseId(kendiKose)).click();
  await uyu(30);
  bilgiyiKapat();
  await sar('cekme', async () => {
    await sirayiBekleZorunlu(cekilebilirKose);
    return { komsuKose: await kosedenCekmeyiOlc(cekilebilirKose) };
  });

  // 5. tasokey#87: az önce köşeden çekilen taşı AYNI köşeye geri bırakma. Bu adım 4'ün
  // `komsuKose` çekmesinin üstüne biner — ayrı bir çekme yapılmaz, çünkü ölçülen tam olarak
  // "çektikten sonra vazgeçmek"tir.
  await sar('geriBirak', async () => geriBirakmayiOlc(cekilebilirKose));
  if (gozlemler.geriBirak && !gozlemler.geriBirak.hata) {
    const nokta = merkez(kutu(el(koseId(cekilebilirKose))));
    isaretler.push({ x: nokta.x, y: nokta.y, cap: 13, renk: ISARET_RENKLERI.birakma });
  }

  return { gozlemler, isaretler };
}

/** `bitirme` sahnesi: R-013 — deste vurgusu ve son taşın desteye bırakılması. */
async function bitirmeSahnesi(moduller) {
  const gozlemler = {};
  const isaretler = [];
  try {
    const arama = await bitirilebilirDurumuAra(moduller, moduller.cekilebilirKose);
    if (!arama.bulundu) {
      gozlemler.bitirmeHedefi = {
        hata: `bitirilebilir el bulunamadı (${arama.elDenemesi} el denendi, bütçe ${BITIRME_EN_COK_EL})`,
      };
      return { gozlemler, isaretler };
    }
    const deste = el('yerDestesi');
    const gozlem = {
      elDenemesi: arama.elDenemesi,
      bitirenSayisi: arama.bitirenler.length,
      sinif: deste.classList.contains('bitirilebilir'),
      ipucu: el('yerDestesiIpucu').textContent.trim(),
      vurguFarki: vurguFarkiniOlc(),
    };
    const nokta = merkez(kutu(deste));
    isaretler.push({ x: nokta.x, y: nokta.y, cap: 13, renk: ISARET_RENKLERI.birakma });
    gozlem.birakma = await bitirmeBirakmasiniOlc(arama.bitirenler);
    gozlemler.bitirmeHedefi = gozlem;
  } catch (hata) {
    gozlemler.bitirmeHedefi = { hata: hata.message };
  }
  return { gozlemler, isaretler };
}

/**
 * Tek ölçüm turu. `surukleme`: saf çekirdeğin (`yardimci/surukleme-hedefi.js`) dışa verdikleri
 * (tek kaynak — kural orada, burada yalnız gözlem). `gosterim === 'ekran'` ise özet sayfanın
 * üstüne yazı katmanı olarak basılır ve isabet noktaları işaretlenir.
 */
export async function olcumYap({ sahne = 'hedef', gosterim = 'json', surukleme, tohum = null } = {}) {
  if (!surukleme) throw new Error('olcumYap: surukleme (saf çekirdek) verilmedi');
  if (!surukleme.SAHNELER.includes(sahne)) throw new Error(`olcumYap: bilinmeyen sahne ${sahne}`);
  S = surukleme;
  gercekBekle = window.setTimeout.bind(window);

  const asilYakala = Element.prototype.setPointerCapture;
  const asilZamanlayici = window.setTimeout;
  // Zorlanan iki şey (dosya başlığı): sentetik işaretçi yakalanamaz, bot gecikmesi beklenemez.
  Element.prototype.setPointerCapture = function yakalamaYok() {};
  window.setTimeout = (islev, ms, ...kalan) => asilZamanlayici.call(window, islev, 0, ...kalan);

  const temel = new URL('.', document.baseURI).href;
  const ice = (yol) => import(new URL(yol, temel).href);
  let gozlemler = {};
  let isaretler = [];
  try {
    const moduller = {
      tas: await ice('cekirdek/tas.js'),
      dagitim: await ice('cekirdek/dagitim.js'),
      cozucu: await ice('cekirdek/cozucu.js'),
      elModulu: await ice('cekirdek/el.js'),
      yerlesim: await ice('arayuz/yerlesim.js'),
    };
    // Hangi köşeye atılır / hangi köşeden çekilir: kural oyunun kendi saf modülünden gelir
    // (ADR-010/R-012), ölçüm katmanı yeniden yazmaz.
    moduller.kendiKose = moduller.yerlesim.oyuncununAtilanKosesi(0, moduller.elModulu.sonrakiOyuncu);
    moduller.cekilebilirKose = moduller.yerlesim.oyuncununAtilanKosesi(
      moduller.elModulu.oncekiOyuncu(0), moduller.elModulu.sonrakiOyuncu,
    );

    await uygulamaHazirOl();
    tohumuSabitle(tohum);
    await oyunuBaslat();
    const sonuc = sahne === 'hedef' ? await hedefSahnesi(moduller) : await bitirmeSahnesi(moduller);
    gozlemler = sonuc.gozlemler;
    isaretler = sonuc.isaretler;
  } finally {
    Element.prototype.setPointerCapture = asilYakala;
    window.setTimeout = asilZamanlayici;
  }

  const kararlar = S.sahneKararlari(sahne, gozlemler);
  const olcum = {
    sahne,
    tohum,
    gorunum: { genislik: window.innerWidth, yukseklik: window.innerHeight },
    olculer: olculeriAl(),
    kararlar,
    ozet: S.kararOzeti(kararlar),
    zorlanan: {
      isaretciYakalamasi: 'devre dışı (sentetik PointerEvent yakalanamaz)',
      botGecikmesi: 'çökertildi (setTimeout → 0 ms)',
      vurguFarki: sahne === 'bitirme' ? 'bitirilebilir sınıfı ölçüm için bir kez kaldırıldı' : 'yok',
    },
    gozlemler,
  };

  if (gosterim === 'ekran') {
    const satirlar = S.ozetSatirlari(olcum);
    if (gozlemler.koseAtmaAlani?.koseler) {
      satirlar.push(...S.bolgeSatirlari(gozlemler.koseAtmaAlani.koseler));
    }
    isaretleriBas(isaretler);
    yaziyaBas(satirlar);
  }
  return olcum;
}
