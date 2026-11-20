// Taşı sürükleyip bir hedefe bırakma: rafta yeniden dizme (yuvadan yuvaya) ya da raf dışı bir
// hedefe (köşe yığını, yer destesi) bırakma — hangi eylemin yapılacağına burada karar verilmez,
// hedef türü ve ek bilgi `etkilesim.js`e aktarılır (MIMARI.md §3 `arayuz/surukle.js`, DOM
// katmanı; tasokey#13: ıstaka 2 sıralı sabit yuvalardan oluşur; tasokey#30: raf dışı hedefler).
// Fare ve dokunma ikisi de Pointer Events ile aynı yoldan geçer (dokunmatik için ayrı kod yok).

import { HEDEF_TURU } from './etkilesim.js';

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
