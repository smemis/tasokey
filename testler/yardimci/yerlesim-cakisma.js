// tasokey#67 (üst iş tasokey#64) — yerleşim çakışma ölçümünün SAF çekirdeği: dikdörtgen
// listesinden çakışan çiftleri, kesişim alanını, taşma ihlallerini ve okunur özet satırlarını
// verir. DOM yok, dosya yok, tarayıcı yok → `npm test` ile tablo testi edilir
// (`yerlesim-cakisma.test.js`; projenin arayüz testleri deseni, MIMARI.md §6).
//
// Ölçüm protokolü (öğe kümesi, istisnalar, taşma denetimi) planın §5'inde tanımlıdır; buradaki
// istisna kuralları onun karşılığıdır:
//   · kenar kenara temas (kesişim 0) ÇAKIŞMA DEĞİLDİR,
//   · 1 px örtüşme ÇAKIŞMADIR (eşik alt-piksel payıdır, 0.5 px),
//   · ata-çocuk iç içeliği çakışma değildir (`yol` zinciriyle ölçülür),
//   · muaf öğe (kalıcı pencere örtüsü ADR-015, sürükleme kopyası ADR-021) hiçbir çifte girmez,
//   · kasıtlı ÇİFTLER ayrı kovaya düşer (`ciftleriAyir`) — gizlenmez, gerekçesiyle sayılır.
//
// Bu dosyanın kaynağı İKİ yerde çalışır (tek kaynak): (1) sürücü `yerlesim-cakisma.olcum.js`
// kutuları CDP ile toplayıp burada hesaplar, (2) ofis ekran görüntüsü yolunda
// `yardimci/yerlesim-olcum-betigi.js` bu kaynağı sayfaya GÖMER (`export` sözcükleri atılarak).
// Bu yüzden dosya `import` KULLANMAZ ve yalnız dil yerleşiklerine dayanır; iki yolun aynı sonucu
// verdiği öz-testle ölçülür.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

/** Alt-piksel yerleşim payı: bu kadar (ve altında) örtüşme çakışma sayılmaz. */
export const ESIK_PX = 0.5;

/** Hedef halkası öğelerinin adı bu ekle biter (`.kose::after` / `#yerDestesi::after`, ADR-014). */
export const HALKA_EKI = '::after';

/**
 * Kasıtlı ÇİFT istisnaları: geometrik olarak çakışan ama tasarım gereği üst üste duran öğeler.
 * Çift burada yazılıysa ihlal değil "kasıtlı" sayılır; gerekçe çıktıda görünür (gizlenmez).
 * Planın §5'i öğe bazlı istisnaları sayar, çift bazlı olanları saymaz — bu liste onun eki
 * olduğu için her satır kaynağıyla birlikte durur.
 */
export const CIFT_ISTISNALARI = Object.freeze([
  { a: '#kenarUstAd', b: '#kenarUst .kenar-raf-yatay', gerekce: 'rakip adı çubuğun üstüne yazılır (madde 1, tasokey#33)' },
  { a: '#kenarSolAd', b: '#kenarSol .kenar-raf-dikey', gerekce: 'rakip adı çubuğun üstüne yazılır (madde 1, tasokey#33)' },
  { a: '#kenarSagAd', b: '#kenarSag .kenar-raf-dikey', gerekce: 'rakip adı çubuğun üstüne yazılır (madde 1, tasokey#33)' },
]);

/** Dikdörtgenin alanı (negatif kenar 0 sayılır). */
export function kutuAlani(kutu) {
  return Math.max(0, kutu.sag - kutu.sol) * Math.max(0, kutu.alt - kutu.ust);
}

/** Ölçüsü olmayan kutu (gizli öğe, boş kutu) ölçüme girmez. */
export function kutuBosMu(kutu) {
  return !(kutu && kutu.sag > kutu.sol && kutu.alt > kutu.ust);
}

/** Kutuyu her yönde `pay` kadar büyütür (hedef halkası: `inset: calc(-1 * var(--hedef-pay))`). */
export function kutuGenislet(kutu, pay) {
  return { sol: kutu.sol - pay, ust: kutu.ust - pay, sag: kutu.sag + pay, alt: kutu.alt + pay };
}

/**
 * İki kutunun kesişimi; yoksa `null`. Kenar teması (fark 0) ve alt-piksel örtüşme (≤ eşik)
 * kesişim SAYILMAZ: tarayıcı yerleşimi kesirli piksel ürettiği için eşik olmadan her ızgara
 * komşusu çakışık görünür.
 */
export function kesisim(a, b, esik = ESIK_PX) {
  const kutu = {
    sol: Math.max(a.sol, b.sol),
    ust: Math.max(a.ust, b.ust),
    sag: Math.min(a.sag, b.sag),
    alt: Math.min(a.alt, b.alt),
  };
  if (kutu.sag - kutu.sol <= esik || kutu.alt - kutu.ust <= esik) return null;
  return kutu;
}

/** Biri ötekinin atası mı (öğenin `yol`u kökten kendine kadar olan ata anahtarlarıdır). */
export function ataCocukMu(a, b) {
  return (a.yol ?? []).includes(b.anahtar) || (b.yol ?? []).includes(a.anahtar);
}

/**
 * Çakışan bütün çiftler: `[{ a, b, kutu, alan }]`, alanı büyükten küçüğe sıralı.
 * `ogeler`: `[{ anahtar, kutu, yol, muaf }]` — `muaf` doluysa öğe hiçbir çifte girmez.
 */
export function cakisanCiftler(ogeler, { esik = ESIK_PX } = {}) {
  const liste = [];
  for (let i = 0; i < ogeler.length; i += 1) {
    for (let j = i + 1; j < ogeler.length; j += 1) {
      const a = ogeler[i];
      const b = ogeler[j];
      if (a.muaf || b.muaf) continue;
      if (kutuBosMu(a.kutu) || kutuBosMu(b.kutu)) continue;
      if (ataCocukMu(a, b)) continue;
      const kutu = kesisim(a.kutu, b.kutu, esik);
      if (!kutu) continue;
      liste.push({ a: a.anahtar, b: b.anahtar, kutu, alan: kutuAlani(kutu) });
    }
  }
  liste.sort((x, y) => y.alan - x.alan || `${x.a}|${x.b}`.localeCompare(`${y.a}|${y.b}`));
  return liste;
}

/** Çakışan çiftleri `ihlaller` (0 olmalı) ve `kasitli` (gerekçeli istisna) kovalarına ayırır. */
export function ciftleriAyir(ciftler, istisnalar = CIFT_ISTISNALARI) {
  const ihlaller = [];
  const kasitli = [];
  for (const cift of ciftler) {
    const istisna = istisnalar.find(
      (i) => (i.a === cift.a && i.b === cift.b) || (i.a === cift.b && i.b === cift.a),
    );
    if (istisna) kasitli.push({ ...cift, gerekce: istisna.gerekce });
    else ihlaller.push(cift);
  }
  return { ihlaller, kasitli };
}

/** Muaf öğelerin dökümü (çıktıda "neyi ölçmedik" satırı). */
export function muafListesi(ogeler) {
  return ogeler.filter((oge) => oge.muaf).map((oge) => ({ anahtar: oge.anahtar, gerekce: oge.muaf }));
}

/** Hedef halkası (ADR-014) çiftleri ile öğe-öğe çiftlerini ayırır (ikisi de 0 olmalı). */
export function halkaCiftleriniAyir(ciftler) {
  const halka = ciftler.filter((c) => c.a.endsWith(HALKA_EKI) || c.b.endsWith(HALKA_EKI));
  const oge = ciftler.filter((c) => !(c.a.endsWith(HALKA_EKI) || c.b.endsWith(HALKA_EKI)));
  return { halka, oge };
}

/**
 * Taşma ihlalleri (R-014 regresyonu, tasokey#63). `olcum`:
 *   `{ gorunum: { genislik, yukseklik }, rafAlaniAlt, kaydirma: [{ anahtar, scrollGenislik,
 *      clientGenislik, scrollYukseklik, clientYukseklik, denetim: ['dikey'|'yatay'] }] }`
 * `denetim` hangi yönün ölçüldüğünü söyler (plan §5: masa/uygulama dikey, kök öğe yatay).
 */
export function tasmaIhlalleri(olcum, { esik = 0 } = {}) {
  const ihlaller = [];
  const { gorunum, rafAlaniAlt, kaydirma = [] } = olcum;
  if (typeof rafAlaniAlt === 'number' && rafAlaniAlt - gorunum.yukseklik > esik) {
    ihlaller.push({
      tur: 'istaka-gorunum-disi',
      anahtar: '#rafAlani',
      miktar: rafAlaniAlt - gorunum.yukseklik,
    });
  }
  for (const kutu of kaydirma) {
    const denetim = kutu.denetim ?? ['dikey', 'yatay'];
    if (denetim.includes('dikey') && kutu.scrollYukseklik - kutu.clientYukseklik > esik) {
      ihlaller.push({
        tur: 'dikey-tasma',
        anahtar: kutu.anahtar,
        miktar: kutu.scrollYukseklik - kutu.clientYukseklik,
      });
    }
    if (denetim.includes('yatay') && kutu.scrollGenislik - kutu.clientGenislik > esik) {
      ihlaller.push({
        tur: 'yatay-tasma',
        anahtar: kutu.anahtar,
        miktar: kutu.scrollGenislik - kutu.clientGenislik,
      });
    }
  }
  return ihlaller;
}

/**
 * İki ölçümün çakışan çift listelerini karşılaştırır (tasokey#68 ölçek araması): hangi çift
 * YENİ doğdu, hangi eski çiftin kesişimi BÜYÜDÜ. Ölçek seçiminin ölçütü budur — "çakışma 0"
 * tek başına kullanılamıyor, çünkü taban dalda (ölçek 1) bazı boyutlarda **zaten** ihlal var
 * (tasokey#67 ölçümü: 800x360'ta 2, rakip durumunda 1-14). Saf: yalnız liste.
 */
export function ciftFarki(tabanCiftler, denemeCiftler, { esik = ESIK_PX } = {}) {
  const anahtar = (cift) => [cift.a, cift.b].sort().join(' n ');
  const taban = new Map(tabanCiftler.map((cift) => [anahtar(cift), cift.alan]));
  const yeni = [];
  const buyuyen = [];
  for (const cift of denemeCiftler) {
    const ad = anahtar(cift);
    if (!taban.has(ad)) yeni.push(cift);
    else if (cift.alan - taban.get(ad) > esik) buyuyen.push({ ...cift, tabanAlan: taban.get(ad) });
  }
  return { yeni, buyuyen };
}

/** `308x100` biçiminde ölçü metni (yuvarlanmış). */
export function olcuMetni(kutu) {
  if (kutuBosMu(kutu)) return '—';
  return `${Math.round(kutu.sag - kutu.sol)}x${Math.round(kutu.alt - kutu.ust)}`;
}

/**
 * Ölçümün okunur özeti: hem ekran görüntüsündeki yazı katmanı hem de sürücünün günlüğü bunu
 * kullanır (tek kaynak — ekran görüntüsünden okunan sayı ile JSON'daki sayı aynı yerden gelir).
 * `enCokCift`: özete yazılacak çift satırı sayısı (ekran görüntüsü taşmasın).
 */
export function ozetSatirlari(olcum, { enCokCift = 6 } = {}) {
  const { durum, gorunum, olculer = {}, ihlaller = [], kasitli = [], tasmalar = [] } = olcum;
  const halkaDokumu = halkaCiftleriniAyir(ihlaller);
  const satirlar = [
    `EKRAN ${gorunum.genislik}x${gorunum.yukseklik} durum=${durum} oge=${olcum.ogeSayisi ?? '?'}`
    + ` muaf=${(olcum.muaflar ?? []).length} esik=${olcum.esik ?? ESIK_PX}px`,
    `ISTAKA ${olcuMetni(olculer.istaka)} TAS ${olcuMetni(olculer.tas)}`
    + ` (css ${olculer.tasDegiskeni ?? '—'}) MASA-IC ${olcuMetni(olculer.masaIc)}`
    + ` OLCEK ${olculer.olcek ?? '—'}`,
    `CAKISMA ihlal=${ihlaller.length} (oge ${halkaDokumu.oge.length} + halka ${halkaDokumu.halka.length})`
    + ` kasitli=${kasitli.length}`,
    tasmalar.length === 0
      ? 'TASMA yok'
      : `TASMA ${tasmalar.map((t) => `${t.anahtar} ${t.tur} ${Math.round(t.miktar)}px`).join(' | ')}`,
  ];
  for (const cift of ihlaller.slice(0, enCokCift)) {
    satirlar.push(`  x ${cift.a} n ${cift.b}  ${olcuMetni(cift.kutu)} = ${Math.round(cift.alan)}px2`);
  }
  if (ihlaller.length > enCokCift) satirlar.push(`  … +${ihlaller.length - enCokCift} cift daha`);
  for (const cift of kasitli) {
    satirlar.push(`  = ${cift.a} n ${cift.b}  ${olcuMetni(cift.kutu)} (${cift.gerekce})`);
  }
  return satirlar;
}

/**
 * Ölçek aramasının (tasokey#68) ekrandan okunabilir özeti. Deneme satırları KISA tutulur
 * (`ölçek:yeni/büyüyen/taşma`, satır başına beşi): yazı katmanı `white-space: pre` olduğu için
 * uzun satır 800px görünümde yatayda kırpılır. Saf: yalnız sayı ve metin.
 */
export function aramaSatirlari(arama, { satirBasinaDeneme = 5, enCokAyrinti = 3 } = {}) {
  const { taban, denemeler = [], olculenler = {} } = arama;
  const sayi = (deger) => (typeof deger === 'number' ? Math.round(deger * 10) / 10 : '—');
  const satirlar = [
    `BUTCE masaIc=${olcuMetni(olculenler.masaIc)} rafBaslik=${sayi(olculenler.rafBaslik)}`
    + ` merkez=${sayi(olculenler.merkez)} tas=${sayi(olculenler.tasYukseklik)}`
    + ` metinPayi=${sayi(olculenler.metinPayi)}`,
    `BUTCE pd=${sayi(olculenler.panelDolgu)} kk=${sayi(olculenler.koseKaydirma)}`
    + ` mb=${sayi(olculenler.masaBosluk)} rb=${sayi(olculenler.rafBosluk)}`
    + ` yb=${sayi(olculenler.yuvaBosluk)} taban=${olculenler.taban ?? '—'}`
    + ` n=${olculenler.sutun ?? '—'}`,
    // tasokey#72: kısa yatay varyantın ÖLÇÜLEN bütçe terimleri (plan §4). İki satır, çünkü yazı
    // katmanı `white-space: pre`dir ve uzun satır 800px görünümde yatayda kırpılır.
    `BUTCE-V yanMetinPayi=${sayi(olculenler.yanMetinPayi)}`
    + ` yanMetinGen=${sayi(olculenler.yanMetinGenislik)}`
    + ` rafBaslikPayi=${sayi(olculenler.rafBaslikPayi)}`
    + ` rafBaslik=${sayi(olculenler.rafBaslikGenislik)}x${sayi(olculenler.rafBaslikYukseklik)}`,
    `BUTCE-V merkezGen=${sayi(olculenler.merkezGenislik)}`
    + ` bant=${(olculenler.bantlar ?? '—').replace(/px/g, '')}`,
    `ARAMA taban(olcek 1) ihlal=${taban?.ihlal ?? '?'} tasma=${taban?.tasma ?? '?'}`
    + '  satir bicimi: olcek:yeni/buyuyen/tasma',
  ];
  for (let i = 0; i < denemeler.length; i += satirBasinaDeneme) {
    satirlar.push(`  ${denemeler.slice(i, i + satirBasinaDeneme)
      .map((d) => `${d.olcek.toFixed(2)}:${d.yeni}/${d.buyuyen}/${d.tasma}`).join(' ')}`);
  }
  // Sayı tek başına ölçeği SEÇTİRMEZ: "2 yeni çift" hangi çiftin doğduğunu söylemez, yani hangi
  // öğenin bağlayıcı olduğu ölçülmemiş kalır (tasokey#68 1. turun sınırı). İlk BOZULAN denemenin
  // çiftleri ada ve ölçüye kadar yazılır; satır başına bir kayıt (katman `white-space: pre`,
  // uzun satır yatayda kırpılır).
  const dokum = (alan, liste, isaret, bicimle) => {
    const deneme = denemeler.find((d) => (d[alan] ?? 0) > 0);
    if (!deneme) return;
    satirlar.push(`ARAMA ilk-${alan} olcek=${deneme.olcek.toFixed(2)} sayi=${deneme[alan]}`);
    for (const kayit of (deneme[liste] ?? []).slice(0, enCokAyrinti)) {
      satirlar.push(`  ${isaret} ${bicimle(kayit)}`);
    }
  };
  dokum('yeni', 'yeniCiftler', '+', (c) => `${c.a} n ${c.b}  ${olcuMetni(c.kutu)}`);
  dokum('buyuyen', 'buyuyenCiftler', '>', (c) => `${c.a} n ${c.b}  ${olcuMetni(c.kutu)}`);
  dokum('tasma', 'tasmaListesi', '!', (t) => `${t.anahtar} ${t.tur} ${Math.round(t.miktar)}px`);

  const enBuyuk = (sart) => {
    const uygun = denemeler.filter(sart).map((d) => d.olcek);
    return uygun.length === 0 ? '—' : Math.max(...uygun).toFixed(2);
  };
  satirlar.push(
    `ARAMA enCok yeni0=${enBuyuk((d) => d.yeni === 0 && d.tasma === 0)}`
    + ` yeni0buyumez0=${enBuyuk((d) => d.yeni === 0 && d.buyuyen === 0 && d.tasma === 0)}`
    + ` tasma0=${enBuyuk((d) => d.tasma === 0)}`,
  );
  return satirlar;
}

/**
 * Ekran görüntüsündeki yazı katmanının sığdırma biçimi: satır sayısı + görünüm yüksekliğinden
 * yazı boyunu ve üst payı verir. Kısa listede katman masanın üstünde durur (sayfa da görünsün),
 * uzun listede önce başa çekilir, yine sığmıyorsa yazı küçültülür — ihlal listesi KIRPILMASIN
 * diye. Saf: DOM yok, yalnız sayı.
 */
export function yaziKatmaniBicimi(satirSayisi, gorunumYuksekligi, {
  yazi = 12, satirPayi = 1.35, ustOran = 0.24, enKucukYazi = 7, dolgu = 12,
} = {}) {
  const gerekli = (boy) => Math.ceil(satirSayisi * boy * satirPayi) + dolgu;
  const ustPx = Math.round(gorunumYuksekligi * ustOran);
  if (gerekli(yazi) <= gorunumYuksekligi - ustPx) return { yazi, ustPx, satirPayi };
  if (gerekli(yazi) <= gorunumYuksekligi) return { yazi, ustPx: 0, satirPayi };
  const sigan = Math.floor((gorunumYuksekligi - dolgu) / (satirSayisi * satirPayi));
  return { yazi: Math.max(enKucukYazi, sigan), ustPx: 0, satirPayi };
}

/** Markdown tablosu (başlıklar + satırlar; hücreler metne çevrilir). */
export function markdownTablosu(basliklar, satirlar) {
  const ciz = (hucreler) => `| ${hucreler.join(' | ')} |`;
  return [
    ciz(basliklar),
    ciz(basliklar.map(() => '---')),
    ...satirlar.map((satir) => ciz(satir.map((hucre) => String(hucre)))),
  ].join('\n');
}

/** Önce/sonra tablosunun bir satırı (plan §5: ıstaka, taş, ölçek, masa içerik kutusu). */
export function olcumSatiri(olcum) {
  const { olculer = {}, ihlaller = [], kasitli = [], tasmalar = [] } = olcum;
  return [
    `${olcum.gorunum.genislik}x${olcum.gorunum.yukseklik}`,
    olcum.boyutAdi ?? '—',
    olcum.durum,
    olcuMetni(olculer.istaka),
    olcuMetni(olculer.tas),
    olculer.olcek ?? '—',
    olcuMetni(olculer.masaIc),
    String(ihlaller.length),
    String(kasitli.length),
    tasmalar.length === 0 ? 'yok' : tasmalar.map((t) => `${t.anahtar} ${Math.round(t.miktar)}px`).join('; '),
  ];
}

export const TABLO_BASLIKLARI = Object.freeze([
  'boyut', 'ad', 'durum', 'ıstaka (#rafAlani)', 'taş (.tas)', 'ölçek', 'masa içerik',
  'çakışan çift', 'kasıtlı', 'taşma',
]);
