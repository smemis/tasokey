// Rafta taşları sürükleyerek yeniden dizme — yalnız görsel düzenleme, kural motoruna
// hiçbir çağrı yapmaz (GDD.md §2 "Dizme/deneme": masaya açma değil). Fare ve dokunma
// (Pointer Events) ile çalışır (MIMARI.md §3 `arayuz/surukle.js`, DOM katmanı).

export function surukleBagla(rafElemani, siraDizisiGetter, uygulaCallback) {
  let suruklenenIndex = null;
  let suruklenenEleman = null;
  let baslangicX = 0;

  function hesaplaYeniIndex(x) {
    const kardesler = Array.from(rafElemani.children).filter((el) => el !== suruklenenEleman);
    let index = 0;
    for (const kardes of kardesler) {
      const dikdortgen = kardes.getBoundingClientRect();
      const merkezX = dikdortgen.left + dikdortgen.width / 2;
      if (x > merkezX) index++;
    }
    return index;
  }

  rafElemani.addEventListener('pointerdown', (e) => {
    const hedef = e.target.closest('.tas');
    if (!hedef || hedef.parentElement !== rafElemani) return;
    suruklenenEleman = hedef;
    suruklenenIndex = Array.from(rafElemani.children).indexOf(hedef);
    baslangicX = e.clientX;
    hedef.setPointerCapture(e.pointerId);
    hedef.classList.add('surukleniyor');
  });

  rafElemani.addEventListener('pointermove', (e) => {
    if (suruklenenIndex === null) return;
    suruklenenEleman.style.transform = `translateX(${e.clientX - baslangicX}px)`;
  });

  function birak(e) {
    if (suruklenenIndex === null) return;
    suruklenenEleman.style.transform = '';
    suruklenenEleman.classList.remove('surukleniyor');

    const yeniIndex = hesaplaYeniIndex(e.clientX);
    if (yeniIndex !== suruklenenIndex) {
      const siraDizisi = siraDizisiGetter().slice();
      const [id] = siraDizisi.splice(suruklenenIndex, 1);
      siraDizisi.splice(yeniIndex, 0, id);
      uygulaCallback(siraDizisi);
    }
    suruklenenIndex = null;
    suruklenenEleman = null;
  }

  rafElemani.addEventListener('pointerup', birak);
  rafElemani.addEventListener('pointercancel', birak);
}
