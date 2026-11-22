import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { SURUKLENIYOR_SINIFI } from '../docs/arayuz/surukle.js';
import { HEDEF_TURU } from '../docs/arayuz/etkilesim.js';
import { kuralGovdeleri, yorumlariAt } from './yardimci/css-olcu.js';
import { sahneKur } from './yardimci/surukleme-sahnesi.js';

// tasokey#62 (ADR-021) — Sahip'in belirtisi (`is/tasokey-60/ekler/d316461d-image.png`): sürükleme
// sürerken taş ALINDIĞI YERDE de görünmeye devam ediyor, yani ekranda iki yerde duruyor. Sebep
// tasokey#59'un yan etkisidir: parmağı taşın kopyası izlerken asıl taş yerinde, saydamlıksız
// bekliyordu.
//
// Karar (ADR-021): asıl taş kaynağında GÖRÜNMEZ olur ama yerini korur (`visibility` yolu;
// `display: none` yasak — ıstaka sırası kayar, ADR-019 yerleşimi bozulur), boş görünen yuvanın
// görseli tek kaynaktan (`gorsel/yuva-bos.svg`) gelir ve eylem üretmeyen her bırakma görünümü eski
// hâline döndürür. Deste/köşede de aynı kural: sürüklenen ÜST taş görünmez olur, sayaç değişmez.
//
// Davranış ölçümleri `yardimci/surukleme-sahnesi.js` sahte DOM'uyla yapılır (proje jsdom taşımaz —
// MIMARI.md §6). `ekran.js` DOM'suz import edilemez (ADR-016 Sonuçlar/c) → onun payına düşen
// maddeler (gizlemenin yeniden çizimde yaşaması, `ciz()`in çağrılmaması) `sira-gecis-gecikmesi.js`
// ile aynı dilde kaynak taramasıyla ölçülür; sınırı dosya sonundaki başlıkta yazılı.

const KOK = join(import.meta.dirname, '..');
const ARAYUZ_KOK = join(KOK, 'docs', 'arayuz');
const STIL_CSS = readFileSync(join(ARAYUZ_KOK, 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(ARAYUZ_KOK, 'ekran.js'), 'utf8');
const SURUKLE_JS = readFileSync(join(ARAYUZ_KOK, 'surukle.js'), 'utf8');
// "Tek kaynak" sayımı kodu sayar, açıklama satırlarını saymaz (arayüz JS'i yalnız `//` kullanır).
const EKRAN_JS_KOD = EKRAN_JS.split('\n').filter((satir) => !satir.trim().startsWith('//')).join('\n');
const SURUKLE_JS_KOD = SURUKLE_JS.split('\n').filter((satir) => !satir.trim().startsWith('//')).join('\n');

const BOS_YUVA_GORSELI = 'yuva-bos.svg';

/** Adı verilen işlevin gövdesi (arayüz JS'indeki tek düzeyli `function ad(...) { … }` biçimi). */
function islevGovdesi(kaynak, ad) {
  const eslesme = kaynak.match(new RegExp(`function ${ad}\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  return eslesme ? eslesme[2] : null;
}

// --- (a) Sürükleme başlayınca asıl taş gizlenir, kopya gizlenmez ------------------------------

test('ASIL KABUL: ıstakada sürükleme başlayınca asıl taş gizleme sınıfını alır, kopyada o sınıf yok', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);

  assert.equal(
    s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI),
    true,
    'ASIL KABUL: asıl taş gizleme sınıfını almıyor → taş hem yuvasında hem parmakta görünüyor (Sahip\'in görüntüsü)',
  );
  const kopya = s.kopyalar()[0];
  assert.ok(kopya, 'ön koşul: sürükleme kopyası doğdu');
  assert.equal(
    kopya.classList.contains(SURUKLENIYOR_SINIFI),
    false,
    'kopya gizleme sınıfını taşırsa parmakta GÖRÜNMEZ bir taş kalır (tasokey#59 kuralı korunur)',
  );
});

test('hareketsiz basışta (seçme yolu) asıl taş gizlenmez — her dokunuş taşı yok etmez', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  assert.equal(
    s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI),
    false,
    'gizleme basışta değil ilk HAREKETTE başlamalı: yoksa taş seçmek için dokunan oyuncunun taşı kırpışır',
  );
});

// --- (b) Geçerli bırakma ----------------------------------------------------------------------

test('ASIL KABUL: geçerli bırakmada gizleme kalkar, geri çağrı yuvasıyla bir kez çağrılır', (t) => {
  const gorunurlukler = [];
  const s = sahneKur(t, {
    // Geri çağrı çalışırken ölçülür: ekran.js buradan `ciz()`e gider, o yüzden gizleme bu anda
    // çözülmüş olmalı — yoksa yeniden çizilen taş görünmez kalır.
    birakmaSonucu: () => gorunurlukler.push(s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI)),
  });
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.noktaya(s.rafYuva);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 260, 300);

  assert.equal(s.birakmalar.length, 1, 'bırakma tam bir kez bildirilmeli');
  assert.equal(s.birakmalar[0].hedefTuru, HEDEF_TURU.RAF_YUVA);
  assert.deepEqual(s.birakmalar[0].bilgi, { slotIndex: 7 }, 'ADR-019 yolu değişmedi: yuva bildirilir');
  assert.deepEqual(gorunurlukler, [false], 'geri çağrı çalışırken gizleme çözülmüş olmalı');
  assert.equal(s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'bırakmadan sonra taş görünür');
  assert.deepEqual(s.kopyalar(), [], 'kopya kaldırılır');
});

// --- (c) Geçersiz bırakma ---------------------------------------------------------------------

test('ASIL KABUL: geçersiz bırakmada (hedefsiz nokta) geri çağrı hiç çağrılmaz, gizleme kalkar', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.noktaya(null);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 260, 300);

  assert.equal(s.birakmalar.length, 0, 'hedefsiz bırakma hamle değildir (karar katmanı değişmedi)');
  assert.equal(
    s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI),
    false,
    'ASIL KABUL: eylem üretmeyen bırakmadan sonra taş görünmez kalıyor → oyuncunun taşı kayboldu',
  );
  assert.deepEqual(s.kopyalar(), [], 'kopya kaldırılır');
});

// --- (d) İptal ve ıstaka dışında biten bırakma ------------------------------------------------

test('ASIL KABUL: pointercancel gizlemeyi kaldırır, kopya kalmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.noktaya(null);
  s.isaretci(s.raf, 'pointercancel', s.rafTasi, 260, 300);

  assert.equal(s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'iptal sonrası taş görünür döner');
  assert.deepEqual(s.kopyalar(), [], 'iptal sonrası kopya kalmaz');
  assert.equal(s.birakmalar.length, 0, 'iptal hamle değildir');
});

test('ASIL KABUL: ıstaka dışında biten bırakmada gizleme kalkar, kopya kalmaz', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  // tasokey#59'un ağı: yakalama koptuğunda bırakma #raf'a değil masaya/gövdeye gider.
  s.isaretci(s.masa, 'pointerup', s.masa, 700, 700);

  assert.equal(s.rafTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'dışarıda biten bırakmada taş görünür döner');
  assert.deepEqual(s.kopyalar(), [], 'kopya kaldırılır');
  assert.equal(s.birakmalar.length, 0, 'ıstaka dışında biten bırakma hamle değildir');
});

// --- (e) Deste ve köşe yolu (aynı tek kapı) ---------------------------------------------------

test('ASIL KABUL: desteden çekmede üst taş gizlenir, kopyada gizleme sınıfı yok', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);

  assert.equal(
    s.desteTasi.classList.contains(SURUKLENIYOR_SINIFI),
    true,
    'ASIL KABUL: destenin üst taşı gizlenmiyor → taş hem destede hem parmakta görünüyor',
  );
  assert.equal(s.kopyalar()[0].classList.contains(SURUKLENIYOR_SINIFI), false, 'kopya gizlenmez');
});

test('deste eşiğinin altında kalan dokunuşta üst taş gizlenmez', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 322, 181);
  assert.equal(s.desteTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'dokunma yolunda deste taşı kırpışmaz');
});

test('ASIL KABUL: desteden ıstakaya bırakmada gizleme kalkar ve çekme bir kez bildirilir', (t) => {
  const gorunurlukler = [];
  const s = sahneKur(t, {
    cekmeSonucu: () => gorunurlukler.push(s.desteTasi.classList.contains(SURUKLENIYOR_SINIFI)),
  });
  s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
  s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);
  s.noktaya(s.rafYuva);
  s.isaretci(s.masa, 'pointerup', s.deste, 380, 240);

  assert.equal(s.cekmeler.length, 1, 'çekme tam bir kez bildirilmeli');
  assert.deepEqual(gorunurlukler, [false], 'ASIL KABUL: motor çağrılırken üst taş hâlâ gizli (ret gelirse görünmez kalır)');
  assert.equal(s.desteTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'çekmeden sonra üst taş görünür');
  assert.deepEqual(s.kopyalar(), [], 'kopya kaldırılır');
});

test('ASIL KABUL: masa dışında biten çekmede ve iptalde gizleme kalkar, kopya kalmaz', (t) => {
  for (const tip of ['pointerup', 'pointercancel']) {
    const s = sahneKur(t);
    s.isaretci(s.masa, 'pointerdown', s.deste, 320, 180);
    s.isaretci(s.masa, 'pointermove', s.deste, 380, 240);
    s.isaretci(s.govde, tip, s.govde, 900, 900);

    assert.equal(s.desteTasi.classList.contains(SURUKLENIYOR_SINIFI), false, `${tip}: üst taş görünür döner`);
    assert.deepEqual(s.kopyalar(), [], `${tip}: kopya kaldırılır`);
    assert.equal(s.cekmeler.length, 0, `${tip}: hamle üretilmez`);
  }
});

test('ASIL KABUL: köşeden çekmede aynı kural — üst taş gizlenir, geçersiz bırakmada görünür döner', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.masa, 'pointerdown', s.kose, 80, 430);
  s.isaretci(s.masa, 'pointermove', s.kose, 140, 490);
  assert.equal(
    s.koseTasi.classList.contains(SURUKLENIYOR_SINIFI),
    true,
    'ASIL KABUL: köşenin üst taşı gizlenmiyor (deste denetimi köşe için kanıt sayılmaz)',
  );

  // Istakaya düşmeyen bırakma: çekme değildir, görünüm eski hâline döner.
  s.noktaya(s.masa);
  s.isaretci(s.masa, 'pointerup', s.kose, 500, 500);
  assert.equal(s.cekmeler.length, 0, 'ıstaka dışına bırakma çekme değildir');
  assert.equal(s.koseTasi.classList.contains(SURUKLENIYOR_SINIFI), false, 'köşenin üst taşı görünür döner');
  assert.deepEqual(s.kopyalar(), [], 'kopya kaldırılır');
});

test('ASIL KABUL: çekme reddedilince üst taş yeniden görünür (ret ekranda taş eksiltmez)', (t) => {
  // Motorun reddi `ekran.js` `cekSonucunuIsle`de olur ve ret yolunda `ciz()` çağrılır; bu testin
  // ölçtüğü şey şudur: geri çağrı ÇALIŞIRKEN gizleme çözülmüş olmalı ki ret yeniden çizimi taşı
  // görünmez bırakmasın. Çekmenin kendisi (`kaynaktanCekCallback`) reddi temsil eder.
  let retAninda = null;
  const s = sahneKur(t, {
    cekmeSonucu: () => { retAninda = s.koseTasi.classList.contains(SURUKLENIYOR_SINIFI); },
  });
  s.isaretci(s.masa, 'pointerdown', s.kose, 80, 430);
  s.isaretci(s.masa, 'pointermove', s.kose, 140, 490);
  s.noktaya(s.rafYuva);
  s.isaretci(s.masa, 'pointerup', s.kose, 140, 490);

  assert.equal(s.cekmeler.length, 1, 'ön koşul: çekme bildirildi');
  assert.equal(retAninda, false, 'ASIL KABUL: ret anında üst taş gizli → reddedilen çekmeden sonra köşe taşı kayboluyor');
});

test('sürüklenen üst taş gizlenirken sayaç DEĞİŞMEZ: surukle.js sayaç/metin yazmaz', () => {
  assert.ok(
    !/textContent|sayac|innerHTML/.test(SURUKLE_JS_KOD),
    'surukle.js sayaç ya da metin yazıyor: çekme henüz motorca onaylanmadı, sayı gerçek adedi göstermeli (ADR-021/4)',
  );
});

// --- Bildirim sözleşmesi: gizlemenin tek kaynağı ekran.js'in durum kutusu ----------------------

test('ASIL KABUL: sürükleme başı ve sonu tek bildirimle duyurulur (kimlik, sonra null)', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  assert.deepEqual(s.bildirimler, [], 'basış henüz sürükleme değil');

  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 280, 320);
  assert.deepEqual(s.bildirimler, ['kirmizi-7-a'], 'sürükleme başı bir kez, taşın kimliğiyle bildirilir');

  s.noktaya(s.rafYuva);
  s.isaretci(s.raf, 'pointerup', s.rafTasi, 280, 320);
  assert.deepEqual(s.bildirimler, ['kirmizi-7-a', null], 'sürükleme sonu bir kez, null ile bildirilir');
});

test('bildirim sürükleme bitmeden tekrarlanmaz: iptal sonrası yalnız null gelir', (t) => {
  const s = sahneKur(t);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  s.isaretci(s.raf, 'pointermove', s.rafTasi, 260, 300);
  s.isaretci(s.raf, 'pointercancel', s.rafTasi, 260, 300);
  s.isaretci(s.raf, 'pointerdown', s.rafTasi, 120, 230);
  assert.deepEqual(s.bildirimler, ['kirmizi-7-a', null], 'boş durumun yeniden düşürülmesi bildirim üretmez');
});

// --- (f) Kaynak taraması: gizleme tek yerde, display yok, boş yuva tek kaynaktan ---------------

test('ASIL KABUL: gizleme kuralı stil.css\'te TEK yerde ve visibility yolundan', () => {
  const gizlemeler = [...yorumlariAt(STIL_CSS).matchAll(/visibility\s*:\s*hidden/g)];
  assert.equal(
    gizlemeler.length,
    1,
    `gizleme kuralı tek yerde olmalı (bulunan: ${gizlemeler.length}) — ikinci kural ıstaka ve deste yollarını ayırır`,
  );
  for (const secici of [`.tas.${SURUKLENIYOR_SINIFI}`, `.tas-arka.${SURUKLENIYOR_SINIFI}`]) {
    const govdeler = kuralGovdeleri(STIL_CSS, secici);
    assert.ok(govdeler.length > 0, `stil.css içinde ${secici} kuralı yok`);
    assert.ok(
      govdeler.some((govde) => /visibility\s*:\s*hidden/.test(govde)),
      `ASIL KABUL: ${secici} görünmez olmuyor → taş sürüklenirken alındığı yerde de görünüyor`,
    );
  }
});

test('ASIL KABUL: sürükleme kuralları display ile gizlemiyor (ıstaka sırası kaymasın — ADR-019)', () => {
  for (const [, seciciler, govde] of yorumlariAt(STIL_CSS).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!seciciler.includes(SURUKLENIYOR_SINIFI)) continue;
    assert.doesNotMatch(
      govde,
      /display\s*:/,
      `ASIL KABUL: "${seciciler.trim()}" display yazıyor → display:none yuvayı akıştan düşürür, oyuncunun aralıklı dizilimi bozulur`,
    );
  }
});

test('ASIL KABUL: boş görünen yuvanın görseli yalnız yuva-bos.svg\'den gelir', () => {
  // (1) Varlık tek dosyadan anılır: `docs/` altındaki başka hiçbir kaynak kendi boş yuva çizimini
  // yazmaz (ikinci çizim yazılsa iki görsel dil olurdu).
  // Açıklama satırları sayılmaz (stil.css görselin adını yalnız yorumda anar: boyama `url()` ile
  // değil, ekran.js'in koyduğu satır içi SVG ile olur).
  const kodu = (icerik) => yorumlariAt(icerik).split('\n').filter((satir) => !satir.trim().startsWith('//')).join('\n');
  const kaynaklar = readdirSync(join(KOK, 'docs'), { recursive: true })
    .filter((ad) => /\.(js|css|html)$/.test(ad))
    .map((ad) => join(KOK, 'docs', ad));
  const anankalar = kaynaklar
    .filter((dosya) => kodu(readFileSync(dosya, 'utf8')).includes(BOS_YUVA_GORSELI))
    .map((dosya) => relative(KOK, dosya).replace(/\\/g, '/'));
  assert.deepEqual(anankalar, ['docs/arayuz/ekran.js'], `${BOS_YUVA_GORSELI} tek kaynaktan anılmalı`);

  // (2) `rafCiz` boş yuva katmanını TEK yerden koyar: dolu yuva da aynı katmanı alır, yoksa taş
  // gizlenince yuva boş değil "yok" görünür.
  const govde = islevGovdesi(EKRAN_JS, 'rafCiz');
  assert.ok(govde, 'ekran.js içinde rafCiz bulunamadı — tarama deseni bozulmuş');
  const cagrilar = [...govde.matchAll(new RegExp(`gorselOlustur\\('${BOS_YUVA_GORSELI}'`, 'g'))];
  assert.equal(
    cagrilar.length,
    1,
    `ASIL KABUL: rafCiz boş yuva görselini ${cagrilar.length} yerde koyuyor → dolu yuvada katman yok ya da dal başına kopyalanmış`,
  );

  // (3) CSS ikinci bir boş yuva görünümü boyamaz (arka plan/çerçeve): görsel tek kaynaktan gelir.
  for (const govdeMetni of kuralGovdeleri(STIL_CSS, '.raf-yuva')) {
    assert.doesNotMatch(govdeMetni, /background|border/, '.raf-yuva kendi boş yuva görünümünü boyuyor (ikinci çizim)');
  }
});

// --- (g) Gizleme yeniden çizimde yaşar (kaynak taraması; sınır dosya sonunda) ------------------

test('ASIL KABUL: sürüklenen taşın kimliği ekran.js durum kutusunda tek kaynak ve rafCiz onu uygular', () => {
  const tanimlar = [...EKRAN_JS_KOD.matchAll(/suruklenenTasId:\s*null/g)];
  assert.equal(tanimlar.length, 1, 'sürüklenen taşın kimliği durum kutusunda tam bir kez tanımlanmalı');

  const govde = islevGovdesi(EKRAN_JS, 'rafCiz');
  assert.ok(govde, 'ekran.js içinde rafCiz bulunamadı');
  assert.match(
    govde,
    /suruklenenTasId/,
    'ASIL KABUL: rafCiz gizlemeyi yeniden uygulamıyor → ıstaka sürükleme sürerken çizilirse taş geri görünür (iki yerde taş)',
  );
  assert.match(
    govde,
    new RegExp(`classList\\.add\\(SURUKLENIYOR_SINIFI\\)`),
    'rafCiz gizleme sınıfını tek kaynaktan (surukle.js sabiti) uygulamalı',
  );
});

test('ASIL KABUL: sürükleme bildirimi ciz() ÇAĞIRMAZ (sürüklenen öğe DOM\'dan düşmesin)', () => {
  const baglama = EKRAN_JS_KOD.match(/surukleBagla\(([^;]*)\);/);
  assert.ok(baglama, 'ekran.js surukleBagla çağrısı bulunamadı');
  const bildirimAdi = baglama[1].split(',')[2]?.trim();
  assert.ok(bildirimAdi, 'ASIL KABUL: surukleBagla bildirim geri çağrısı almıyor → gizleme yeniden çizimde yaşamaz');

  const govde = islevGovdesi(EKRAN_JS, bildirimAdi);
  assert.ok(govde, `ekran.js içinde ${bildirimAdi} bulunamadı`);
  assert.doesNotMatch(
    govde,
    /(^|[^a-zA-Z])ciz\(\)/,
    'ASIL KABUL: bildirim ciz() çağırıyor → sürüklenen öğe DOM\'dan düşer, işaretçi yakalaması kopar (tasokey#59)',
  );
  // Sürükleme sürerken ıstaka yeniden çizilmiş olabilir: `surukle.js` gizlemeyi KENDİ tuttuğu
  // (artık belgeden düşmüş) öğeden kaldırır, ekranda duran YENİ öğede sınıf kalır. Bildirim bunu
  // yeniden çizim yapmadan temizlemeli, yoksa taş kalıcı olarak görünmez kalır.
  assert.match(
    govde,
    new RegExp(`classList\\.remove\\(SURUKLENIYOR_SINIFI\\)`),
    'ASIL KABUL: sürükleme bitince ıstakada asılı kalmış gizleme sınıfı silinmiyor → taş kalıcı görünmez',
  );
});

test('gizleme sınıfının adı tek kaynaktan gelir (ekran.js surukle.js\'ten alır)', () => {
  assert.match(
    EKRAN_JS,
    /import \{[^}]*SURUKLENIYOR_SINIFI[^}]*\} from '\.\/surukle\.js'/,
    'ekran.js gizleme sınıfının adını surukle.js\'ten almıyor (iki yerde yazılı ad = iki kaynak)',
  );
  for (const [ad, kaynak] of [['ekran.js', EKRAN_JS_KOD], ['surukle.js', SURUKLE_JS_KOD]]) {
    const dizeler = [...kaynak.matchAll(/'surukleniyor'/g)];
    assert.equal(dizeler.length, ad === 'surukle.js' ? 1 : 0, `${ad}: gizleme sınıfının adı sabit dize olarak yazılmış`);
  }
});

// ÖLÇÜMÜN SINIRI (rapora aynen yazılır): gizlemenin GERÇEK yeniden çizimde yaşadığı, yani
// `rafCiz()` çalıştıktan sonra yeni taş öğesinin görünmez kaldığı, bu dosyada ÖLÇÜLEMEDİ —
// `ekran.js` tarayıcı dışında import edilemez (`gorseller.js` modül düzeyinde `new DOMParser()`
// çağırır; ADR-016 Sonuçlar/c). Ölçülen: (1) kimliğin durum kutusunda tek kaynak olduğu,
// (2) `rafCiz`in o kimlikle gizleme sınıfını yeniden uyguladığı, (3) bildirimin `ciz()`
// çağırmadığı ve asılı sınıfı sildiği — hepsi kaynak taramasıyla. Davranışın kendisi tarayıcıda
// ekran görüntüsüyle doğrulanır (iş klasörü `ekran/`).
