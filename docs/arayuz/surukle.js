// Taşı sürükleyip bir hedefe bırakma: rafta yeniden dizme (yuvadan yuvaya) ya da raf dışı bir
// hedefe (köşe yığını, yer destesi) bırakma — hangi eylemin yapılacağına burada karar verilmez,
// hedef türü ve ek bilgi `etkilesim.js`e aktarılır (MIMARI.md §3 `arayuz/surukle.js`, DOM
// katmanı; tasokey#13: ıstaka 2 sıralı sabit yuvalardan oluşur; tasokey#30: raf dışı hedefler).
// Fare ve dokunma ikisi de Pointer Events ile aynı yoldan geçer (dokunmatik için ayrı kod yok).

import { HEDEF_TURU, CEKME_KAYNAGI } from './etkilesim.js';

// Bir işaretçi hareketinin "dokunma" mı "sürükleme" mi sayılacağı eşiği (piksel). Deste ve köşe
// hem dokunma (çekme) hem sürükleme kaynağı olduğundan ayrım gerekir: eşiğin altında kalan
// hareket dokunma sayılır ve ekran.js'in tıklama yoluna bırakılır (tasokey#40).
const SURUKLEME_ESIGI_PX = 6;

export function surukleBagla(rafElemani, hedefeBirakCallback) {
  let suruklenenTasId = null;
  let suruklenenEleman = null;
  let baslangicMerkezX = 0;
  let baslangicMerkezY = 0;

  rafElemani.addEventListener('pointerdown', (e) => {
    const hedef = e.target.closest('.tas');
    if (!hedef || !rafElemani.contains(hedef)) return;
    const dikdortgen = hedef.getBoundingClientRect();
    suruklenenEleman = hedef;
    suruklenenTasId = hedef.dataset.tasId;
    baslangicMerkezX = dikdortgen.left + dikdortgen.width / 2;
    baslangicMerkezY = dikdortgen.top + dikdortgen.height / 2;
    hedef.setPointerCapture(e.pointerId);
    hedef.classList.add('surukleniyor');
  });

  rafElemani.addEventListener('pointermove', (e) => {
    if (!suruklenenEleman) return;
    const dx = e.clientX - baslangicMerkezX;
    const dy = e.clientY - baslangicMerkezY;
    suruklenenEleman.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  function birak(e) {
    if (!suruklenenEleman) return;
    suruklenenEleman.style.transform = '';
    suruklenenEleman.classList.remove('surukleniyor');

    // .surukleniyor pointer-events: none bırakır ki elementFromPoint, sürüklenen taşın kendisini
    // değil altındaki yuvayı/köşeyi/desteyi görsün.
    const noktadakiEleman = document.elementFromPoint(e.clientX, e.clientY);
    const rafYuva = noktadakiEleman?.closest('.raf-yuva');
    const kose = noktadakiEleman?.closest('.kose[data-kose]');
    const yerDestesi = noktadakiEleman?.closest('[data-hedef="yerDestesi"]');

    if (rafYuva && rafElemani.contains(rafYuva)) {
      hedefeBirakCallback(suruklenenTasId, HEDEF_TURU.RAF_YUVA, { slotIndex: Number(rafYuva.dataset.slotIndex) });
    } else if (kose) {
      hedefeBirakCallback(suruklenenTasId, HEDEF_TURU.KOSE, { kose: kose.dataset.kose });
    } else if (yerDestesi) {
      hedefeBirakCallback(suruklenenTasId, HEDEF_TURU.YER_DESTESI, {});
    }

    suruklenenTasId = null;
    suruklenenEleman = null;
  }

  rafElemani.addEventListener('pointerup', birak);
  rafElemani.addEventListener('pointercancel', birak);
}

// Yığının en üstteki taşı, en son eklenen öğedir (ekran.js `koseYiginiCiz` / `yerDestesiYiginiCiz`
// taşları alttan üste doğru ekler): köşede açık taş (`.tas`), destede kapalı taş (`.tas-arka`).
// Yığın boşsa (destede taş kalmadı, köşeye henüz atılmadı) null döner — sürükleme yine başlar,
// kararı yine motor verir, yalnız parmağı izleyecek taş yoktur.
function enUsttekiTas(kaynakElemani) {
  const taslar = kaynakElemani.querySelectorAll('.tas, .tas-arka');
  return taslar.length > 0 ? taslar[taslar.length - 1] : null;
}

// Sürükleyerek ÇEKME (tasokey#40; R-012): hareket ıstakada değil, yer destesinde ya da bir köşe
// yığınında başlar ve ıstakaya bırakılır. Hangi kaynağın hangi çekmeye karşılık geldiğine burada
// karar verilmez — karar `etkilesim.js`in (`cekmeKararVer`), onay `cekirdek/el.js`'in (ADR-002).
// Kaynak öğeleri tek tek değil masa üstünden dinlenir: bırakma tarafındaki (`birak`) ile aynı
// seçiciler kullanılır, böylece hedef halkasına (ADR-014) yapılan isabet de kaynağı bulur.
export function cekmeSurukleBagla(masaElemani, rafElemani, kaynaktanCekCallback) {
  let kaynakTuru = null;
  let kaynak = {};
  let ustTas = null;
  let baslangicX = 0;
  let baslangicY = 0;
  let tasindiMi = false;
  let tiklamayiYut = false;

  function sifirla() {
    if (ustTas) {
      ustTas.style.transform = '';
      ustTas.classList.remove('surukleniyor');
    }
    kaynakTuru = null;
    kaynak = {};
    ustTas = null;
    tasindiMi = false;
  }

  // Taşınmış bir sürüklemenin ardından tarayıcı aynı işaretçi dizisi için `click` de üretir; deste
  // ve köşe dokunma yolunda da çekme denediğinden (ekran.js `olaylariBagla`) bu tıklama yutulmazsa
  // aynı hamle ikinci kez denenir ve ikincisi "zaten çekildi" reddiyle görünür. Yakalama evresinde
  // `document` üstünde dinlenir ki hedefin kendi dinleyicilerinden önce çalışsın; bayrak her yeni
  // işaretçi basışında sıfırlanır, böylece beklenen tıklama hiç gelmezse bayat kalmaz.
  document.addEventListener('pointerdown', () => { tiklamayiYut = false; }, true);
  document.addEventListener('click', (e) => {
    if (!tiklamayiYut) return;
    tiklamayiYut = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  masaElemani.addEventListener('pointerdown', (e) => {
    const yerDestesi = e.target.closest('[data-hedef="yerDestesi"]');
    const kose = e.target.closest('.kose[data-kose]');
    const kaynakElemani = yerDestesi || kose;
    if (!kaynakElemani) return;
    kaynakTuru = yerDestesi ? CEKME_KAYNAGI.YER_DESTESI : CEKME_KAYNAGI.KOSE;
    kaynak = yerDestesi ? {} : { kose: kose.dataset.kose };
    ustTas = enUsttekiTas(kaynakElemani);
    baslangicX = e.clientX;
    baslangicY = e.clientY;
    tasindiMi = false;
    // Yakalama yalnız kolaylıktır: dinleyiciler masanın kendisinde durduğundan (ıstaka da masanın
    // içindedir) hareket yakalama olmadan da izlenir. Artık etkin olmayan bir işaretçide tarayıcı
    // `setPointerCapture`i hata ile reddedebilir — bu, başlamış hareketi düşürmemeli.
    try {
      kaynakElemani.setPointerCapture(e.pointerId);
    } catch {
      // yakalama yok; hareket masadaki dinleyicilerle sürer
    }
  });

  masaElemani.addEventListener('pointermove', (e) => {
    if (!kaynakTuru) return;
    const dx = e.clientX - baslangicX;
    const dy = e.clientY - baslangicY;
    if (!tasindiMi && Math.hypot(dx, dy) < SURUKLEME_ESIGI_PX) return;
    if (!tasindiMi) {
      tasindiMi = true;
      // Istakadaki sürüklemeyle aynı görsel dil: taş parmağı izler, soluklaşır ve
      // `pointer-events: none` ile isabet testinden çekilir (altındaki ıstaka görünsün).
      if (ustTas) ustTas.classList.add('surukleniyor');
    }
    if (ustTas) ustTas.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  masaElemani.addEventListener('pointerup', (e) => {
    if (!kaynakTuru) return;
    const tur = kaynakTuru;
    const bilgi = kaynak;
    const suruklendiMi = tasindiMi;
    sifirla();
    // Yerinde bırakma (eşiğin altında) sürükleme sayılmaz: dokunma/tıklama yolu kendi işini yapar.
    if (!suruklendiMi) return;
    tiklamayiYut = true;
    const noktadakiEleman = document.elementFromPoint(e.clientX, e.clientY);
    if (noktadakiEleman && rafElemani.contains(noktadakiEleman)) kaynaktanCekCallback(tur, bilgi);
  });

  // İptal edilen hareket (ör. işletim sisteminin el koyduğu dokunma) hamle sayılmaz.
  masaElemani.addEventListener('pointercancel', sifirla);
}
