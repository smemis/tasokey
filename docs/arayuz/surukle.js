// Rafta taşları sürükleyerek yeniden dizme (yuvadan yuvaya) — yalnız görsel düzenleme, kural
// motoruna hiçbir çağrı yapmaz (GDD.md §2 "Dizme/deneme": masaya açma değil). Fare ve dokunma
// (Pointer Events) ile çalışır (MIMARI.md §3 `arayuz/surukle.js`, DOM katmanı; tasokey#13: ıstaka
// artık 2 sıralı sabit yuvalardan oluşur, taş boş bir yuvaya bırakılırsa eski yuvası boş kalır —
// oyuncu taşları aralıklı dizebilir).

export function surukleBagla(rafElemani, hedefYuvayaTasiCallback) {
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
    // değil altındaki yuvayı/taşı görsün.
    const noktadakiEleman = document.elementFromPoint(e.clientX, e.clientY);
    const hedefYuva = noktadakiEleman?.closest('.raf-yuva');
    if (hedefYuva && rafElemani.contains(hedefYuva)) {
      hedefYuvayaTasiCallback(suruklenenTasId, Number(hedefYuva.dataset.slotIndex));
    }

    suruklenenTasId = null;
    suruklenenEleman = null;
  }

  rafElemani.addEventListener('pointerup', birak);
  rafElemani.addEventListener('pointercancel', birak);
}
