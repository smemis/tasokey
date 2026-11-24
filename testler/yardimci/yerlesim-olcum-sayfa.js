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
  // tasokey#85 (ADR-028): dizme düğmeleri ıstaka panelinin İÇİNE girdi. Kümeye alınmaları zorunlu
  // (ata-torun çiftleri atıldığı için `#rafAlani`/`#raf` ile çift kurmazlar, ama alt köşelere ve
  // yan kenarlara taşıp taşmadıkları ancak böyle ölçülür).
  { anahtar: '#rafDugmeleri', secici: '#rafDugmeleri' },
  { anahtar: '#perleriDizButonu', secici: '#perleriDizButonu' },
  { anahtar: '#ciftleriDizButonu', secici: '#ciftleriDizButonu' },
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

/**
 * Bir CSS UZUNLUK ifadesinin tarayıcıda çözülen px değeri (tasokey#68).
 *
 * Niçin ölçü öğesi: özel değişkenin (`--x`) hesaplanan değeri, kaydedilmemiş (unregistered)
 * olduğu sürece YALNIZ `var()` yerine konmuş belirteç dizisidir — `calc()`/`clamp()` sadeleşmez.
 * `getComputedStyle(kök).getPropertyValue('--hedef-pay')` bu yüzden `"calc(24px / 2)"` döndürür ve
 * `parseFloat` onu **NaN** yapar (tasokey#67'de hedef halkası sessizce 0 payla ölçülmüştü: halka
 * kutusu sahibinin kutusuyla aynı çıkıyor, "halka ∩ komşu = 0" ölçütü gevşiyordu). ADR-022 ile
 * taş ölçüsü de `clamp(...)` olduğundan aynı tuzak bütün ölçülere yayılırdı.
 *
 * Çözüm: ifadeyi görünmez bir ölçü öğesinin `width`ine veriyoruz; `width`in hesaplanan değeri
 * mutlak uzunluktur (px). Yani sayıyı tarayıcının kendisi hesaplar, ölçüm katmanı CSS yorumlamaz.
 */
function olculenPx(ifade) {
  const olcer = document.createElement('div');
  olcer.style.cssText = `position:absolute;left:-9999px;top:0;height:0;visibility:hidden;width:${ifade};`;
  document.body.appendChild(olcer);
  const deger = sayi(getComputedStyle(olcer).width);
  olcer.remove();
  return deger;
}

/** Değişkenin px değeri (`--x` → `var(--x)` ölçülür). */
const degiskenPx = (ad) => olculenPx(`var(${ad})`);

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
  const pay = degiskenPx('--hedef-pay');
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
    tasDegiskeni: `${degiskenPx('--tas-genislik')}x${degiskenPx('--tas-yukseklik')}`,
    // `--istaka-olcek` tasokey#64 iş 2'de gelecek; bugün tanımsızdır (önce ölçümü).
    olcek: olcek === '' ? '—' : olcek,
  };
}

/**
 * Kısa yatay DÜZEN VARYANTININ (tasokey#71) bütçe terimleri — tasokey#72, plan §4.
 *
 * Varyantta `.yigin` ve `#rafAlani` YATAY akar: metin taşın yanındadır. Dikey zincirde metin
 * satırı payı düşer, yatayda metnin genişliği eklenir. İkisi de `rem` tabanlı yazı ölçüsünden
 * gelir, yani CSS içinde px'e çevrilemez → ÖLÇÜLÜR (ADR-022/5; tahmin yazılmaz):
 *   · `yanMetinPayi`     — deste/gösterge yığınında taş DIŞINDAKİ en yüksek öğe. Yığın yatay
 *     aktığı için yığının yüksekliği `max(taş, bu pay)`tır → dikey eşitsizliğin üst bant terimi.
 *   · `yanMetinGenislik` — yığının genişliğinden taş alanının genişliği düşülmüş hâli (esnek
 *     boşluklar dahil): üst bandın YATAY denetiminin metin payı.
 *   · `rafBaslikPayi`    — "Istakam" başlığı taşların yanına geçtiğinde ıstaka bandına eklediği
 *     DİKEY pay: başlık iki sıra taştan kısaysa 0'dır, ama 0 yazılıp geçilmez, ölçülür.
 *   · `rafBaslikGenislik`/`merkezGenislik` — yatay denetimin ölçülen karşılıkları (modeldeki üst
 *     sınırlarla karşılaştırmak için; `masa-izleri.js` YAN_BASLIK_GENISLIK_UST_SINIRI_PX).
 *   · `bantlar`          — `#masa`nın ÇÖZÜLEN bant ölçüleri (grid-template-rows, px): varyantın
 *     etkin olduğunun ve bant modelinin doğruluğunun doğrudan kanıtı.
 */
function varyantOlcumu({ yuksek, genis }) {
  const yiginlar = [...document.querySelectorAll('.yigin')];
  const metinOlculeri = yiginlar.map((yigin) => {
    const tasAlani = yigin.querySelector('.yigin-tas-alani');
    const metinler = [...yigin.children].filter((cocuk) => cocuk !== tasAlani);
    return {
      pay: Math.max(0, ...metinler.map((cocuk) => yuksek(cocuk))),
      genislik: Math.max(0, genis(yigin) - genis(tasAlani)),
    };
  });
  const rafBaslikYukseklik = yuksek(el('rafBaslik'));
  const rafYukseklik = yuksek(el('raf'));
  return {
    yanMetinPayi: Math.max(0, ...metinOlculeri.map((o) => o.pay)),
    yanMetinGenislik: Math.max(0, ...metinOlculeri.map((o) => o.genislik)),
    rafBaslikPayi: Math.max(0, rafBaslikYukseklik - rafYukseklik),
    rafBaslikGenislik: genis(el('rafBaslik')),
    rafBaslikYukseklik,
    merkezGenislik: genis(el('merkez')),
    bantlar: getComputedStyle(el('masa')).gridTemplateRows,
  };
}

/**
 * Sığdırma bütçesinin (plan §4) ÖLÇÜLEN terimleri (tasokey#68). İki şey ölçülür:
 *   (1) `--sigdirma-metin-payi` = ıstaka başlığının yüksekliği + merkez sütununun taş boyunu aşan
 *       payı (deste başlığı/sayaç/ipucu satırları + `.yigin` boşlukları). Bu terim `rem` tabanlı
 *       olduğu için CSS içinde px'e çevrilemez → ölçülmek zorundadır (ADR-022/5).
 *   (2) Masanın İÇERİK kutusu: bütçenin sağ tarafı (`W`/`H`). Masa yüksekliği esnek kaptan gelir
 *       (tasokey#63), yani taş ölçüsünden bağımsızdır — ölçek aramasında sabit kalır.
 * Geri kalan terimler CSS değişkenidir ve buradan da okunur (ölçüm ile formülün aynı yerden
 * geldiği karşılaştırılabilsin).
 */
function sigdirmaOlcumu() {
  const yuksek = (dugum) => (dugum ? kutu(dugum).alt - kutu(dugum).ust : 0);
  const genis = (dugum) => (dugum ? kutu(dugum).sag - kutu(dugum).sol : 0);
  const rafBaslik = yuksek(el('rafBaslik'));
  const merkez = yuksek(el('merkez'));
  const tasYukseklik = degiskenPx('--tas-yukseklik');
  return {
    masaIc: olculeriAl().masaIc,
    rafBaslik,
    merkez,
    tasYukseklik,
    metinPayi: rafBaslik + Math.max(0, merkez - tasYukseklik),
    ...varyantOlcumu({ yuksek, genis }),
    panelDolgu: degiskenPx('--panel-dolgu'),
    koseKaydirma: degiskenPx('--kose-kaydirma'),
    masaBosluk: degiskenPx('--masa-bosluk'),
    rafBosluk: degiskenPx('--raf-bosluk'),
    yuvaBosluk: degiskenPx('--raf-yuva-bosluk'),
    taban: `${degiskenPx('--tas-taban-genislik')}x${degiskenPx('--tas-taban-yukseklik')}`,
    // Sütun sayısı BİRİMSİZ bir sayıdır (ADR-019, `arayuz/raf.js`): uzunluk gibi ölçülemez,
    // hesaplanan değeri doğrudan okunur.
    sutun: sayi(getComputedStyle(document.documentElement).getPropertyValue('--raf-sutun-sayisi')),
  };
}

/**
 * Ölçek araması (tasokey#68, ADR-022/5): kurulu durumda `--istaka-olcek` kademe kademe
 * denenir, her denemede kutular YENİDEN toplanır (CSS'in kendi yerleşimi çalışır; DOM
 * kurcalanmaz, JS yeniden çizim yapmaz — taş ölçüsünün tek kaynağı CSS değişkenidir).
 * Ölçüt: tabana (ölçek 1) göre YENİ çakışan çift ve BÜYÜYEN çakışma yok, taşma yok
 * (taban dalda bazı boyutlarda zaten ihlal var — tasokey#67). Arama bittiğinde satır içi
 * geçersiz kılma kaldırılır, yani sayfa CSS'teki değere döner.
 */
function olcekAramasi({ esik, basamak = 0.05, tavan = 2 }) {
  const kokOge = document.documentElement;
  const onceki = kokOge.style.getPropertyValue('--istaka-olcek');
  const oncekiMuaf = kokOge.style.getPropertyValue('--rakip-acik-olcek');
  const dene = () => {
    const { ogeler } = kutulariTopla();
    const { ihlaller } = G.ciftleriAyir(G.cakisanCiftler(ogeler, { esik }), G.CIFT_ISTISNALARI);
    return { ihlaller, tasmalar: G.tasmaIhlalleri(tasmaOlcumu(), { esik: 0 }) };
  };
  const olcekYaz = (deger) => kokOge.style.setProperty('--istaka-olcek', String(deger));

  /** Bir tam ölçek taraması: taban (ölçek 1) + basamakların denemeleri. */
  const tarama = () => {
    olcekYaz(1);
    const taban = dene();
    const denemeler = [];
    for (let adim = 1; ; adim += 1) {
      const olcek = Math.round((1 + adim * basamak) * 100) / 100;
      if (olcek > tavan + 1e-9) break;
      olcekYaz(olcek);
      const sonuc = dene();
      const fark = G.ciftFarki(taban.ihlaller, sonuc.ihlaller, { esik });
      const kisa = (cift) => ({ a: cift.a, b: cift.b, kutu: cift.kutu, alan: cift.alan });
      denemeler.push({
        olcek,
        yeni: fark.yeni.length,
        buyuyen: fark.buyuyen.length,
        tasma: sonuc.tasmalar.length,
        // Çiftlerin ADLARI da taşınır: ölçeği seçen kısıtın hangi öğe olduğu ancak böyle okunur
        // (tasokey#68 — 1. turda yalnız sayı yazılmıştı, bağlayıcı çift ölçülmemiş kaldı).
        yeniCiftler: fark.yeni.map(kisa),
        buyuyenCiftler: fark.buyuyen.map((cift) => ({ ...kisa(cift), tabanAlan: cift.tabanAlan })),
        tasmaListesi: sonuc.tasmalar,
      });
    }
    return { taban: { ihlal: taban.ihlaller.length, tasma: taban.tasmalar.length }, denemeler };
  };

  olcekYaz(1);
  const olculenler = sigdirmaOlcumu();
  const { taban, denemeler } = tarama();

  // MUAF ÖLÇEK MERDİVENİ (tasokey#72, ADR-022 madde 8): el sonunda açılan rakip yığınının kendi
  // ölçeği (`--rakip-acik-olcek`) basamak basamak küçültülür ve HER BASAMAKTA ölçek araması
  // yeniden koşar. Böylece "muafı küçültmek ölçeğin tavanını gerçekten yükseltiyor mu?" sorusu
  // ölçülür, tahmin edilmez (A9) — ilk basamak CSS'in kendi değeri olduğu için "önce" de aynı
  // koşudadır. `durum=el`de açık yığın hiç çizilmez (`.kenar-taslar:empty`), yani basamaklar aynı
  // tavanı vermelidir: o da varsayım değil ÖLÇÜMdür.
  const muafDegeri = Number.parseFloat(
    getComputedStyle(kokOge).getPropertyValue('--rakip-acik-olcek'),
  );
  const muaflar = [];
  if (Number.isFinite(muafDegeri)) {
    const merdiven = G.muafOlcekMerdiveni(muafDegeri);
    for (let sira = 0; sira < merdiven.length; sira += 1) {
      const muaf = merdiven[sira];
      let sonuc = { taban, denemeler };
      if (sira > 0) {
        kokOge.style.setProperty('--rakip-acik-olcek', String(muaf));
        sonuc = tarama();
      }
      olcekYaz(1);
      muaflar.push({ muaf, ...sonuc, acikTas: acikTasOlcumu() });
    }
  }
  if (oncekiMuaf) kokOge.style.setProperty('--rakip-acik-olcek', oncekiMuaf);
  else kokOge.style.removeProperty('--rakip-acik-olcek');

  if (onceki) olcekYaz(onceki);
  else kokOge.style.removeProperty('--istaka-olcek');
  return { olculenler, taban, denemeler, muaflar };
}

/**
 * Bir öğenin okunur adı: kimliği varsa o, yoksa ilk sınıfı — ve adsızsa en yakın atasıyla
 * birlikte (`#kenarUstTaslar>.tas`). Taşan öğeyi ekran görüntüsünden tanımak için (tasokey#72).
 */
function ogeAdi(dugum) {
  const ad = (hedef) => {
    if (hedef.id) return `#${hedef.id}`;
    if (hedef.classList.length > 0) return `.${hedef.classList[0]}`;
    return hedef.tagName.toLowerCase();
  };
  if (dugum.id) return `#${dugum.id}`;
  const ata = dugum.parentElement;
  return ata ? `${ad(ata)}>${ad(dugum)}` : ad(dugum);
}

/** Kaydırma kutusunun İSTEMCİ (client) alanı: kenarlığın içi, kaydırma çubuğu hariç. */
function istemciKutusu(dugum) {
  const bicim = getComputedStyle(dugum);
  const dis = kutu(dugum);
  const sol = dis.sol + sayi(bicim.borderLeftWidth);
  const ust = dis.ust + sayi(bicim.borderTopWidth);
  return { sol, ust, sag: sol + dugum.clientWidth, alt: ust + dugum.clientHeight };
}

/**
 * Kutudan TAŞAN öğe adayları (tasokey#72, ADR-022/9): soyların kutunun istemci alanını SON
 * kenardan (sağ/alt) aştığı px. Yalnız son kenar ölçülür, çünkü kaydırılabilir taşma yalnız orada
 * doğar (`scrollWidth`/`scrollHeight` baş kenarın ötesini saymaz) — ölçüm miktarla aynı şeyi
 * anlatsın. Pahalı olduğu için YALNIZ gerçekten taşan kutuda koşar.
 */
function tasanAdaylari(dugum) {
  const sinir = istemciKutusu(dugum);
  const adaylar = [];
  for (const soy of dugum.querySelectorAll('*')) {
    const bicim = getComputedStyle(soy);
    if (bicim.display === 'none' || bicim.visibility === 'hidden') continue;
    const olcu = kutu(soy);
    if (G.kutuBosMu(olcu)) continue;
    const yatay = olcu.sag - sinir.sag;
    const dikey = olcu.alt - sinir.alt;
    if (yatay <= 0 && dikey <= 0) continue;
    adaylar.push({ anahtar: ogeAdi(soy), yatay, dikey });
  }
  return adaylar;
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
    kaydirma: kutular.filter((k) => k.dugum).map((k) => {
      const olcu = {
        anahtar: k.anahtar,
        denetim: k.denetim,
        scrollGenislik: k.dugum.scrollWidth,
        clientGenislik: k.dugum.clientWidth,
        scrollYukseklik: k.dugum.scrollHeight,
        clientYukseklik: k.dugum.clientHeight,
      };
      const tasiyor = olcu.scrollGenislik > olcu.clientGenislik
        || olcu.scrollYukseklik > olcu.clientYukseklik;
      if (tasiyor) olcu.tasanlar = tasanAdaylari(k.dugum);
      return olcu;
    }),
  };
}

/**
 * El sonunda açılan rakip taşının ÖLÇÜLEN kutusu ve RAKAMIN o kutuya sığıp sığmadığı — ADR-022
 * madde 8 (sürüm 3): "yazılan her değerde açık el taşının rakamının kırpılmadan sığdığı ÖLÇÜLÜR".
 *
 * Rakamın gerçek glif kutusu `Range` ile ölçülür: `.tas-rakam`ın kendi kutusu taşın yüzdesidir ve
 * `overflow` görünürdür, yani kutuyu aşan glif gizlenmez — okunmaz olduğu yer TAŞIN kenarıdır.
 * Bu yüzden bağlayıcı pay glifin TAŞA kalan payıdır (eksi ise rakam taşın dışına çıkıyor).
 * En kötü taş aranır (en geniş glif / en küçük pay), ilk taş değil: ıstakada "13" ile "1" aynı
 * kutuda durmuyor. `durum=el`de açık taş yoktur → `null`.
 */
function acikTasOlcumu() {
  const taslar = [...document.querySelectorAll('.kenar-taslar .tas')];
  if (taslar.length === 0) return null;
  let enKotu = null;
  for (const tas of taslar) {
    const tasKutusu = kutu(tas);
    const rakam = tas.querySelector('.tas-rakam');
    if (!rakam) continue;
    const rakamKutusu = kutu(rakam);
    const aralik = document.createRange();
    aralik.selectNodeContents(rakam);
    const g = aralik.getBoundingClientRect();
    const glif = { sol: g.left, ust: g.top, sag: g.right, alt: g.bottom };
    const kayit = {
      genislik: tasKutusu.sag - tasKutusu.sol,
      yukseklik: tasKutusu.alt - tasKutusu.ust,
      metin: rakam.textContent,
      yaziBoyu: sayi(getComputedStyle(rakam).fontSize),
      glifGenislik: glif.sag - glif.sol,
      glifYukseklik: glif.alt - glif.ust,
      // Glifin TAŞIN kutusuna kalan en küçük payı (bağlayıcı denetim).
      tasPayi: Math.min(
        glif.sol - tasKutusu.sol, glif.ust - tasKutusu.ust,
        tasKutusu.sag - glif.sag, tasKutusu.alt - glif.alt,
      ),
      // Glifin `.tas-rakam` kutusuna kalan payı (ikincil: eksi olması kırpılma DEĞİL, taşmadır).
      rakamPayi: Math.min(
        glif.sol - rakamKutusu.sol, glif.ust - rakamKutusu.ust,
        rakamKutusu.sag - glif.sag, rakamKutusu.alt - glif.alt,
      ),
      sayac: taslar.length,
    };
    if (enKotu === null || kayit.tasPayi < enKotu.tasPayi) enKotu = kayit;
  }
  return enKotu;
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
export async function olcumYap({
  durum = 'el', gosterim = 'json', esik, enCokCift, arama = false, geometri,
} = {}) {
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
  // Arama ölçümden SONRA, yazı katmanından ÖNCE koşar: katman sabit konumlu olsa da sayfaya
  // eklenmesi taşma ölçümünün girdisini değiştirmesin.
  if (arama) olcum.arama = olcekAramasi({ esik: esikPx });

  if (gosterim === 'ekran') {
    const satirlar = G.ozetSatirlari(olcum, enCokCift == null ? undefined : { enCokCift });
    if (olcum.arama) satirlar.push(...G.aramaSatirlari(olcum.arama));
    ekranaYaz(satirlar);
  }
  return olcum;
}
