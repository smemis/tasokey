// tasokey#67 (üst iş tasokey#64) — SAYFADA çalışan ölçüm katmanı: planın §5'indeki durumu kurar
// (el sürerken / rakip ıstakaları açık), en kötü metin durumunu uygular, öğe kümesinin kutularını
// toplar ve saf çekirdeğe (`yardimci/yerlesim-cakisma.js`) verir.
//
// Bu dosya İKİ yolda da aynı metin olarak çalışır (tek kaynak):
//   (1) sürücü `testler/yerlesim-cakisma.olcum.js` → CDP `Runtime.evaluate` ile sayfaya gönderir,
//   (2) ofis ekran görüntüsü yolu → `yardimci/yerlesim-olcum-betigi.js` aynı kaynağı plan.json'un
//       `js` alanına gömer.
// Bu yüzden: `import` YOK (saf çekirdek `geometri` parametresi olarak verilir) ve DOM'a yalnız
// işlev gövdelerinin içinden dokunulur — dosya Node'da `import` edilebilir kalır (öz-test öğe
// kümesini ve betiğin sözdizimini ölçer).
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

/** Ölçülen durumlar (plan §5): el sürerken · el sonu, rakip ıstakaları açık. */
export const DURUMLAR = Object.freeze(['el', 'rakip']);

const PENCERE_MUAFI = 'ADR-015 kalıcı pencerenin tam ekran örtüsü (kasıtlı)';

/**
 * Planın §5'indeki öğe kümesi. `muaf` dolu olan öğe hiçbir çifte girmez (gerekçe çıktıda durur);
 * pencerelerin GÖRÜNEN kutuları (`#sonucKutusu` …) muaf DEĞİLDİR — onlar masadaki öğeleri
 * örtüyorsa bu ölçülmesi gereken bir şeydir.
 */
export const OGE_TANIMLARI = Object.freeze([
  { anahtar: '#ustCubuk', secici: '#ustCubuk' },
  { anahtar: '#durumSatiri', secici: '#durumSatiri' },
  { anahtar: '#masa', secici: '#masa' },
  { anahtar: '#rafAlani', secici: '#rafAlani' },
  { anahtar: '#raf', secici: '#raf' },
  { anahtar: '#koseSolUst', secici: '#koseSolUst' },
  { anahtar: '#koseSagUst', secici: '#koseSagUst' },
  { anahtar: '#koseSolAlt', secici: '#koseSolAlt' },
  { anahtar: '#koseSagAlt', secici: '#koseSagAlt' },
  { anahtar: '#kenarUst', secici: '#kenarUst' },
  { anahtar: '#kenarSol', secici: '#kenarSol' },
  { anahtar: '#kenarSag', secici: '#kenarSag' },
  { anahtar: '#kenarUst .kenar-raf-yatay', secici: '#kenarUst .kenar-raf-yatay' },
  { anahtar: '#kenarSol .kenar-raf-dikey', secici: '#kenarSol .kenar-raf-dikey' },
  { anahtar: '#kenarSag .kenar-raf-dikey', secici: '#kenarSag .kenar-raf-dikey' },
  { anahtar: '#kenarUstAd', secici: '#kenarUstAd' },
  { anahtar: '#kenarSolAd', secici: '#kenarSolAd' },
  { anahtar: '#kenarSagAd', secici: '#kenarSagAd' },
  { anahtar: '#merkez', secici: '#merkez' },
  { anahtar: '#yerDestesi', secici: '#yerDestesi' },
  { anahtar: '#gosterge', secici: '#gosterge' },
  { anahtar: '#kenarUstTaslar', secici: '#kenarUstTaslar' },
  { anahtar: '#kenarSolTaslar', secici: '#kenarSolTaslar' },
  { anahtar: '#kenarSagTaslar', secici: '#kenarSagTaslar' },
  { anahtar: '#baslangicPaneli', secici: '#baslangicPaneli', muaf: PENCERE_MUAFI },
  { anahtar: '#sonucPaneli', secici: '#sonucPaneli', muaf: PENCERE_MUAFI },
  { anahtar: '#onayPaneli', secici: '#onayPaneli', muaf: PENCERE_MUAFI },
  { anahtar: '#bilgiPaneli', secici: '#bilgiPaneli', muaf: PENCERE_MUAFI },
  { anahtar: '#baslangicKutusu', secici: '#baslangicKutusu' },
  { anahtar: '#sonucKutusu', secici: '#sonucKutusu' },
  { anahtar: '#onayKutusu', secici: '#onayKutusu' },
  { anahtar: '#bilgiKutusu', secici: '#bilgiKutusu' },
  {
    anahtar: '.surukleme-kopyasi',
    secici: '.surukleme-kopyasi',
    coklu: true,
    muaf: 'ADR-021 sürükleme kopyası (kasıtlı, taşın parmağı izleyen kopyası)',
  },
]);

/** Hedef halkası (ADR-014) taşıyan öğeler: kutuları --hedef-pay kadar büyütülüp ayrıca ölçülür. */
export const HALKA_TANIMLARI = Object.freeze([
  '#koseSolUst', '#koseSagUst', '#koseSolAlt', '#koseSagAlt', '#yerDestesi',
]);

// Sayfa katmanının iki durumu: saf çekirdek (`geometri`) ve kurcalanmamış zamanlayıcı. İkisi de
// `olcumYap` çağrısında doldurulur; modül düzeyinde durmalarının tek nedeni yardımcı işlevlerin
// gövdelerinin `export` sözcüğü atılarak aynı kapsama gömülmesidir.
let G = null;
let gercekBekle = null;

const el = (id) => document.getElementById(id);
const sayi = (deger) => Number.parseFloat(deger) || 0;
const uyu = (ms) => new Promise((coz) => gercekBekle(coz, ms));

function kutu(dugum) {
  const k = dugum.getBoundingClientRect();
  return { sol: k.left, ust: k.top, sag: k.right, alt: k.bottom };
}

const gorunurMu = (id) => el(id).classList.contains('gorunur');

function bilgiyiKapat() {
  if (!gorunurMu('bilgiPaneli')) return false;
  el('bilgiTamamButonu').click();
  return true;
}

/** (i) El sürerken: oyun başlar, botlar birkaç hamle oynar, masa görünür (tasokey#63 deseni). */
async function durumElKur() {
  el('zorlukKolay').click();
  el('yeniOyunButonu').click();
  await uyu(2600);
  bilgiyiKapat();
  if (gorunurMu('sonucPaneli')) throw new Error('durum-el: el beklenmedik biçimde bitti (tohumu değiştir)');
  if (gorunurMu('baslangicPaneli')) throw new Error('durum-el: başlangıç penceresi kapanmadı');
}

/**
 * (ii) El sonu, rakip ıstakaları açık: bot gecikmeleri çökertilir, insan oyuncunun hamleleri
 * (desteden çek → taşı köşeye at) el bitene kadar sürülür, sonra sonuç penceresi küçültülür —
 * masanın üstü, yani rakip ıstakaları açılır (tasokey#65 deseni, gerçek akış; DOM kurcalanmaz).
 */
async function durumRakipKur() {
  window.setTimeout = (islev, ms, ...kalan) => gercekBekle(islev, 0, ...kalan);
  el('zorlukKolay').click();
  el('yeniOyunButonu').click();
  await uyu(200);
  const koseler = ['koseSolAlt', 'koseSagAlt', 'koseSagUst', 'koseSolUst'];
  for (let tur = 0; tur < 4000 && !gorunurMu('sonucPaneli'); tur += 1) {
    await uyu(5);
    if (bilgiyiKapat()) continue;
    el('yerDestesi').click();
    const tas = document.querySelector('#raf .tas');
    if (tas) tas.click();
    for (const kose of koseler) {
      if (gorunurMu('sonucPaneli') || gorunurMu('bilgiPaneli')) break;
      el(kose).click();
    }
  }
  bilgiyiKapat();
  await uyu(100);
  if (!gorunurMu('sonucPaneli')) throw new Error('durum-rakip: el bitmedi, sonuç penceresi açılmadı');
  el('kucultAcKapaButonu').click();
  await uyu(200);
  if (!el('sonucPaneli').classList.contains('kucuk')) throw new Error('durum-rakip: pencere küçülmedi');
  if (!document.querySelector('.kenar-taslar .tas')) throw new Error('durum-rakip: rakip ıstakaları açılmadı');
}

/**
 * En kötü metin durumu (plan §5): durum satırının EN UZUN TR/EN metni, deste ipucu dolu, üst
 * çubukta başlık + iki düğme görünür. Metinler iki dil dosyasından okunur (sabit metin yazılmaz);
 * `fetch` beklemesi durum kurulumundan ÖNCE yapılır ki uygulama metni sonra ezemesin.
 */
async function metinleriYukle() {
  const diller = await Promise.all(
    ['diller/tr.json', 'diller/en.json'].map((yol) => fetch(yol).then((yanit) => yanit.json())),
  );
  const duz = {};
  const gez = (onek, nesne) => {
    for (const ad of Object.keys(nesne)) {
      const deger = nesne[ad];
      if (deger && typeof deger === 'object') gez(`${onek}${ad}.`, deger);
      else {
        const anahtar = `${onek}${ad}`;
        const metin = String(deger);
        if (!duz[anahtar] || metin.length > duz[anahtar].length) duz[anahtar] = metin;
      }
    }
  };
  for (const dil of diller) gez('', dil);
  const enUzun = (kalip) => Object.keys(duz)
    .filter((anahtar) => kalip.test(anahtar))
    .map((anahtar) => duz[anahtar])
    .sort((a, b) => b.length - a.length)[0] ?? '';
  return {
    // Durum satırına basılabilen anahtarlar (ekran.js durumSatiriCiz): ret mesajları, sıra
    // bildirimi ve el sonucu metinleri.
    durumSatiri: enUzun(/^(reddedilme\.|sira\.|sonuc\.(berabere|turSiniri|bitti))/),
    ipucu: enUzun(/^yerDestesi\./),
  };
}

function enKotuMetniUygula(metinler) {
  el('durumSatiri').textContent = metinler.durumSatiri;
  el('yerDestesiIpucu').textContent = metinler.ipucu;
  // "Oyunu bitir" düğmesi yalnız masa ekranında görünür (ADR-016); en kötü durum iki düğmeli üst
  // çubuktur, bu yüzden sonuç ekranında da görünür yapılır — ZORLANMIŞ durum, çıktıda yazılı.
  const bitir = el('oyunuBitirButonu');
  const zorlandi = bitir.hidden === true;
  bitir.hidden = false;
  return { ...metinler, oyunuBitirZorlandi: zorlandi };
}

function kutulariTopla() {
  const dugumler = [];
  for (const tanim of OGE_TANIMLARI) {
    if (tanim.coklu) {
      let sira = 0;
      for (const dugum of document.querySelectorAll(tanim.secici)) {
        dugumler.push({ anahtar: `${tanim.anahtar}[${sira}]`, dugum, muaf: tanim.muaf ?? null });
        sira += 1;
      }
    } else {
      const dugum = document.querySelector(tanim.secici);
      if (dugum) dugumler.push({ anahtar: tanim.anahtar, dugum, muaf: tanim.muaf ?? null });
    }
  }

  const anahtarlar = new Map(dugumler.map((kayit) => [kayit.dugum, kayit.anahtar]));
  const ogeler = [];
  for (const kayit of dugumler) {
    const bicim = getComputedStyle(kayit.dugum);
    if (bicim.display === 'none' || bicim.visibility === 'hidden') continue;
    const olcu = kutu(kayit.dugum);
    if (G.kutuBosMu(olcu)) continue;
    const yol = [];
    for (let ata = kayit.dugum.parentElement; ata; ata = ata.parentElement) {
      const anahtar = anahtarlar.get(ata);
      if (anahtar) yol.unshift(anahtar);
    }
    ogeler.push({ anahtar: kayit.anahtar, kutu: olcu, yol, muaf: kayit.muaf });
  }

  // Hedef halkaları: sahibinin kutusu --hedef-pay kadar büyütülmüş sanal öğe. Atası sahibi
  // olduğu için sahibiyle ve sahibinin çocuklarıyla çakışması ata-çocuk istisnasına düşer;
  // KOMŞU öğeyle çakışması ihlaldir (plan §5: halka ∩ komşu kutu = 0).
  const pay = sayi(getComputedStyle(document.documentElement).getPropertyValue('--hedef-pay'));
  const haritaOge = new Map(ogeler.map((oge) => [oge.anahtar, oge]));
  for (const sahipAnahtari of HALKA_TANIMLARI) {
    const sahip = haritaOge.get(sahipAnahtari);
    if (!sahip) continue;
    ogeler.push({
      anahtar: `${sahipAnahtari}::after`,
      kutu: G.kutuGenislet(sahip.kutu, pay),
      yol: [...sahip.yol, sahipAnahtari],
      muaf: null,
    });
  }

  return { ogeler, hedefPay: pay };
}

function olculeriAl() {
  const masa = el('masa');
  const bicim = getComputedStyle(masa);
  const dis = kutu(masa);
  const masaIc = {
    sol: dis.sol + sayi(bicim.borderLeftWidth) + sayi(bicim.paddingLeft),
    ust: dis.ust + sayi(bicim.borderTopWidth) + sayi(bicim.paddingTop),
    sag: dis.sag - sayi(bicim.borderRightWidth) - sayi(bicim.paddingRight),
    alt: dis.alt - sayi(bicim.borderBottomWidth) - sayi(bicim.paddingBottom),
  };
  const kok = getComputedStyle(document.documentElement);
  const tas = document.querySelector('#raf .tas');
  const rakipTas = document.querySelector('.kenar-taslar .tas');
  const olcek = kok.getPropertyValue('--istaka-olcek').trim();
  return {
    istaka: kutu(el('rafAlani')),
    raf: kutu(el('raf')),
    tas: tas ? kutu(tas) : null,
    rakipTas: rakipTas ? kutu(rakipTas) : null,
    masaIc,
    // CSS değişkeninin kendisi: tarayıcıda ölçülen taş kutusuyla karşılaştırma için.
    tasDegiskeni: `${sayi(kok.getPropertyValue('--tas-genislik'))}x${sayi(kok.getPropertyValue('--tas-yukseklik'))}`,
    // `--istaka-olcek` tasokey#64 iş 2'de gelecek; bugün tanımsızdır (önce ölçümü).
    olcek: olcek === '' ? '—' : olcek,
  };
}

function tasmaOlcumu() {
  const kokOge = document.scrollingElement;
  const kutular = [
    { anahtar: '#masa', dugum: el('masa'), denetim: ['dikey'] },
    { anahtar: '#uygulama', dugum: el('uygulama'), denetim: ['dikey'] },
    { anahtar: 'scrollingElement', dugum: kokOge, denetim: ['yatay'] },
  ];
  return {
    gorunum: { genislik: window.innerWidth, yukseklik: window.innerHeight },
    rafAlaniAlt: kutu(el('rafAlani')).alt,
    kaydirma: kutular.filter((k) => k.dugum).map((k) => ({
      anahtar: k.anahtar,
      denetim: k.denetim,
      scrollGenislik: k.dugum.scrollWidth,
      clientGenislik: k.dugum.clientWidth,
      scrollYukseklik: k.dugum.scrollHeight,
      clientYukseklik: k.dugum.clientHeight,
    })),
  };
}

/**
 * Ekran görüntüsü yolunda ölçüm sayfanın üstüne yazı katmanı olarak basılır (tasokey#63 deseni).
 * Yer ve yazı boyu satır sayısına göre saf çekirdekten gelir: uzun ihlal listesi küçük görünümde
 * de kırpılmadan okunabilsin.
 */
function ekranaYaz(satirlar) {
  const bicim = G.yaziKatmaniBicimi(satirlar.length, window.innerHeight);
  const katman = document.createElement('div');
  katman.id = 'olcumKatmani';
  katman.style.cssText = `position:fixed;left:0;top:${bicim.ustPx}px;right:0;z-index:99999;`
    + 'background:#000000ee;color:#ffffff;'
    + `font:${bicim.yazi}px/${bicim.satirPayi} Consolas,monospace;`
    + 'padding:6px 8px;white-space:pre;';
  katman.textContent = satirlar.join('\n');
  document.body.appendChild(katman);
}

/**
 * Tek ölçüm: durumu kurar, en kötü metni uygular, kutuları toplar, saf çekirdekle hesaplar.
 * `gosterim === 'ekran'` ise özet sayfaya basılır (ekran görüntüsünden okunmak için);
 * `enCokCift` yazı katmanına kaç ihlal satırı yazılacağını söyler (verilmezse çekirdeğin
 * varsayılanı). `geometri`: `yardimci/yerlesim-cakisma.js`in dışa verdikleri (tek kaynak).
 */
export async function olcumYap({ durum = 'el', gosterim = 'json', esik, enCokCift, geometri } = {}) {
  if (!geometri) throw new Error('olcumYap: geometri (saf çekirdek) verilmedi');
  if (!DURUMLAR.includes(durum)) throw new Error(`olcumYap: bilinmeyen durum ${durum}`);
  G = geometri;
  gercekBekle = window.setTimeout.bind(window);
  const esikPx = esik ?? G.ESIK_PX;

  const metinler = await metinleriYukle();
  if (durum === 'el') await durumElKur();
  else await durumRakipKur();
  const zorlanan = enKotuMetniUygula(metinler);

  const { ogeler, hedefPay } = kutulariTopla();
  const ciftler = G.cakisanCiftler(ogeler, { esik: esikPx });
  const { ihlaller, kasitli } = G.ciftleriAyir(ciftler, G.CIFT_ISTISNALARI);
  const tasmaGirdisi = tasmaOlcumu();
  const olcum = {
    durum,
    esik: esikPx,
    hedefPay,
    gorunum: tasmaGirdisi.gorunum,
    olculer: olculeriAl(),
    ogeSayisi: ogeler.length,
    muaflar: G.muafListesi(ogeler),
    ihlaller,
    kasitli,
    tasmalar: G.tasmaIhlalleri(tasmaGirdisi, { esik: 0 }),
    tasmaOlcumu: tasmaGirdisi,
    zorlanan,
    ogeler,
  };
  if (gosterim === 'ekran') {
    ekranaYaz(G.ozetSatirlari(olcum, enCokCift == null ? undefined : { enCokCift }));
  }
  return olcum;
}
