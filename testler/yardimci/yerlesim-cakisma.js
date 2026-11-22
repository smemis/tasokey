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
 * Muaf açık el yığınının kendi ölçeğinin (`--rakip-acik-olcek`) ALT SINIRI ve arama basamağı
 * — ADR-022 **madde 8 (sürüm 3)**, tasokey#72.
 *
 * Alt sınır bir KARARDIR, ölçüm değil (Mimar, ADR-022/8): el sonunda birkaç saniye görünen yığın
 * küçültülerek el oynanırken geçerli ölçeğin tavanı yükseltilir, ama taşın rakamı okunur kalmak
 * zorundadır. Bir kademe bu sınırın altını isterse iş **durur ve sorar**. Değer TEK YERDE burada
 * durur: hem tarayıcıdaki arama merdivenini hem öz-testin CSS denetimini (`sigdirma-butcesi`
 * kabul-d11) bu sabit besler.
 */
export const MUAF_OLCEK_TABANI = 0.45;

/** Muaf ölçek aramasının basamağı (ölçek aramasının 0,05'iyle aynı çözünürlük). */
export const MUAF_OLCEK_BASAMAGI = 0.05;

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
 * Muaf ölçek merdiveni (tasokey#72): CSS'teki değerden başlayıp `MUAF_OLCEK_TABANI`na kadar
 * basamak basamak iner. İlk basamak CSS'in kendi değeridir — ölçüm "küçültmeden önce" ile
 * "küçülttükten sonra"yı AYNI koşuda, aynı yoldan karşılaştırsın (gereksiz küçültme yazılmasın).
 * Tabanın altındaki bir girdi uydurulmaz: yalnız kendisi döner (öz-test CSS'i sınırda tutar).
 */
export function muafOlcekMerdiveni(cssDegeri, {
  taban = MUAF_OLCEK_TABANI, basamak = MUAF_OLCEK_BASAMAGI,
} = {}) {
  const yuvarla = (deger) => Math.round(deger * 100) / 100;
  const bas = yuvarla(cssDegeri);
  const merdiven = [];
  for (let deger = bas; deger >= taban - 1e-9; deger = yuvarla(deger - basamak)) merdiven.push(deger);
  return merdiven.length === 0 ? [bas] : merdiven;
}

/**
 * Bir kaydırma kutusundan TAŞAN öğeler (tasokey#72; ADR-022/9'un üçüncü terimi).
 *
 * Niçin: `scrollWidth − clientWidth` taşmanın MİKTARINI verir, KAYNAĞINI vermez — `tasokey#72`
 * raporu §11 "hangi öğe taşıyor" sorusunu açık bırakmıştı, oysa ölçeğin tavanını o öğe belirliyor.
 * `adaylar`: `[{ anahtar, miktar }]` (miktar = öğenin kutunun istemci alanını SON kenardan aştığı
 * px — kaydırılabilir taşma yalnız son kenarda doğar, baş kenarın ötesi erişilemez ve
 * `scrollWidth`e girmez). Büyükten küçüğe sıralı, en çok `enCok` kayıt. Saf: yalnız liste.
 */
export function tasanOgeler(adaylar = [], { esik = 0, enCok = 2 } = {}) {
  return adaylar
    .filter((aday) => aday.miktar > esik)
    .sort((a, b) => b.miktar - a.miktar || String(a.anahtar).localeCompare(String(b.anahtar)))
    .slice(0, enCok)
    .map((aday) => ({ anahtar: aday.anahtar, miktar: aday.miktar }));
}

/**
 * Taşma ihlalleri (R-014 regresyonu, tasokey#63). `olcum`:
 *   `{ gorunum: { genislik, yukseklik }, rafAlaniAlt, kaydirma: [{ anahtar, scrollGenislik,
 *      clientGenislik, scrollYukseklik, clientYukseklik, denetim: ['dikey'|'yatay'],
 *      tasanlar: [{ anahtar, yatay, dikey }] }] }`
 * `denetim` hangi yönün ölçüldüğünü söyler (plan §5: masa/uygulama dikey, kök öğe yatay).
 * `tasanlar` verilmişse ihlale TAŞAN ÖĞE listesi eklenir (tasokey#72); verilmemişse alan hiç
 * yazılmaz — eski ölçümlerin biçimi değişmesin.
 */
export function tasmaIhlalleri(olcum, { esik = 0 } = {}) {
  const ihlaller = [];
  const { gorunum, rafAlaniAlt, kaydirma = [] } = olcum;
  /** O yöndeki taşan öğeler (kutunun ölçtüğü adaylardan). */
  const tasanlariEkle = (ihlal, kutu, yon) => {
    const liste = tasanOgeler(
      (kutu.tasanlar ?? []).map((aday) => ({ anahtar: aday.anahtar, miktar: aday[yon] ?? 0 })),
      { esik },
    );
    if (liste.length > 0) ihlal.tasanlar = liste;
    return ihlal;
  };
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
      ihlaller.push(tasanlariEkle({
        tur: 'dikey-tasma',
        anahtar: kutu.anahtar,
        miktar: kutu.scrollYukseklik - kutu.clientYukseklik,
      }, kutu, 'dikey'));
    }
    if (denetim.includes('yatay') && kutu.scrollGenislik - kutu.clientGenislik > esik) {
      ihlaller.push(tasanlariEkle({
        tur: 'yatay-tasma',
        anahtar: kutu.anahtar,
        miktar: kutu.scrollGenislik - kutu.clientGenislik,
      }, kutu, 'yatay'));
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

/**
 * Taşma ihlalinin okunur metni: nerede, ne kadar ve TAŞAN ÖĞE (tasokey#72). Taşan öğe
 * ölçülmemişse eski biçim aynen kalır (ekran görüntüsünden okunan satır değişmesin).
 *
 * `kisa`: muaf merdiveninin tek satırlık özeti için daraltılmış biçim (`kok/yatay 13px <#oge`) —
 * o satır dört basamağı birden taşıyor ve yazı katmanı 800 px görünümde yatayda kırpıyor.
 * İki biçim de AYNI yerden gelir, sayıları ayrışmaz.
 */
export function tasmaMetni(ihlal, { kisa = false } = {}) {
  const kutuAdi = kisa && ihlal.anahtar === 'scrollingElement' ? 'kok' : ihlal.anahtar;
  const tur = kisa ? String(ihlal.tur).replace('-tasma', '') : ihlal.tur;
  const kok = `${kutuAdi}${kisa ? '/' : ' '}${tur} ${Math.round(ihlal.miktar)}px`;
  if (!ihlal.tasanlar || ihlal.tasanlar.length === 0) return kok;
  if (kisa) return `${kok} <${ihlal.tasanlar[0].anahtar}`;
  return `${kok} <- ${ihlal.tasanlar.map((t) => `${t.anahtar} ${Math.round(t.miktar)}px`).join(' + ')}`;
}

/**
 * Bir deneme listesinin üç ÖLÇÜLEN tavanı (ADR-022/9 — tasokey#72): yeni çift yok · yeni+büyüyen
 * yok · sayfa taşması yok. Ölçüt sağlanmıyorsa `null` (tabanda bile ihlal var). TEK KAYNAK: ekran
 * özetindeki `ARAMA enCok` satırı da, muaf merdiveninin satırları da bunu okur.
 */
export function aramaTavanlari(denemeler = []) {
  const enBuyuk = (sart) => {
    const uygun = denemeler.filter(sart).map((deneme) => deneme.olcek);
    return uygun.length === 0 ? null : Math.max(...uygun);
  };
  return {
    yeni0: enBuyuk((d) => d.yeni === 0 && d.tasma === 0),
    buyumez0: enBuyuk((d) => d.yeni === 0 && d.buyuyen === 0 && d.tasma === 0),
    tasma0: enBuyuk((d) => d.tasma === 0),
  };
}

/** Taşmanın İLK göründüğü deneme (`tasma0`+1 basamağı) ve orada taşan ilk kayıt; yoksa `null`. */
export function ilkTasmaDenemesi(denemeler = []) {
  const deneme = denemeler.find((aday) => (aday.tasma ?? 0) > 0);
  if (!deneme) return null;
  return { olcek: deneme.olcek, ihlal: (deneme.tasmaListesi ?? [])[0] ?? null };
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
      : `TASMA ${tasmalar.map((t) => tasmaMetni(t)).join(' | ')}`,
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
 * Muaf ölçek merdiveninin BİR basamağının tek satırlık özeti (tasokey#72, ADR-022/8):
 * o `--rakip-acik-olcek` değerinde ölçülen üç tavan + açık taşın ölçüsü + rakamın taşın kutusuna
 * kalan payı + taşmanın ilk göründüğü basamak ve TAŞAN ÖĞE.
 *
 * Niçin tek satır: ekran görüntüsü yolunda (ADR-023) ölçüm yalnız yazı katmanından okunur ve
 * katman 800x360'ta satır sayısına göre küçülür — dört basamak × çok satır kırpılma riskidir.
 */
export function muafSatiri(kayit) {
  const sayi1 = (deger) => (typeof deger === 'number' ? Math.round(deger * 10) / 10 : '—');
  const olcekMetni = (deger) => (typeof deger === 'number' ? deger.toFixed(2) : '—');
  const { yeni0, buyumez0, tasma0 } = aramaTavanlari(kayit.denemeler);
  const acik = kayit.acikTas ?? null;
  const ilk = ilkTasmaDenemesi(kayit.denemeler);
  const parcalar = [
    `MUAF ${Number(kayit.muaf).toFixed(2)}`,
    `y0=${olcekMetni(yeni0)}`,
    `b0=${olcekMetni(buyumez0)}`,
    `t0=${olcekMetni(tasma0)}`,
    `tas=${acik ? `${sayi1(acik.genislik)}x${sayi1(acik.yukseklik)}` : '—'}`,
    `rk=${acik && typeof acik.tasPayi === 'number' ? sayi1(acik.tasPayi) : '—'}`,
  ];
  if (ilk) {
    parcalar.push(
      `! ${olcekMetni(ilk.olcek)} ${ilk.ihlal ? tasmaMetni(ilk.ihlal, { kisa: true }) : 'kayit yok'}`,
    );
  }
  return parcalar.join(' ');
}

/**
 * Ölçek aramasının (tasokey#68) ekrandan okunabilir özeti. Deneme satırları KISA tutulur
 * (`ölçek:yeni/büyüyen/taşma`, satır başına beşi): yazı katmanı `white-space: pre` olduğu için
 * uzun satır 800px görünümde yatayda kırpılır. Saf: yalnız sayı ve metin.
 *
 * tasokey#72: KRİTİK satırlar başa alındı (ölçülen bütçe terimleri → muaf merdiveni → üç tavan),
 * ayrıntı dökümü sona. Gerekçe ölçüm: katman sığmazsa SONDAN kırpılır (`yaziKatmaniBicimi` yazıyı
 * 7 px'in altına indirmez), yani ölçeği seçen sayılar hiçbir boyutta kırpılmasın.
 */
export function aramaSatirlari(arama, { satirBasinaDeneme = 5, enCokAyrinti = 3 } = {}) {
  const { taban, denemeler = [], olculenler = {}, muaflar = [] } = arama;
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
  // Muaf açık el yığınının kendi ölçeği basamak basamak küçültülürken ölçülen tavanlar
  // (tasokey#72, ADR-022/8). İlk basamak CSS'in kendi değeridir → "küçültmeden önce" de burada.
  for (const kayit of muaflar) satirlar.push(muafSatiri(kayit));
  satirlar.push(enCokSatiri(denemeler));
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
  dokum('tasma', 'tasmaListesi', '!', (t) => tasmaMetni(t));

  return satirlar;
}

/** `ARAMA enCok …` satırı: üç ölçütün ölçülen en büyük ölçeği (tek kaynak `aramaTavanlari`). */
function enCokSatiri(denemeler) {
  const { yeni0, buyumez0, tasma0 } = aramaTavanlari(denemeler);
  const metin = (deger) => (typeof deger === 'number' ? deger.toFixed(2) : '—');
  return `ARAMA enCok yeni0=${metin(yeni0)} yeni0buyumez0=${metin(buyumez0)}`
    + ` tasma0=${metin(tasma0)}`;
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
