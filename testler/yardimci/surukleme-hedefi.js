// tasokey#69 (üst iş tasokey#64, plan §7 iş 3) — sürükle-bırak hedef ölçümünün SAF çekirdeği:
// beş yolun kabul KURALI burada, tek kaynakta durur. Gözlem nesnesi (sayfadan toplanan sayılar ve
// kutular) girer, karar (`gecti`/`kaldi`/`olculmedi`) + okunur özet satırları çıkar.
// DOM yok, dosya yok, tarayıcı yok → `npm test` ile tablo testi edilir (`surukleme-hedefi.test.js`).
//
// Ölçülen beş yol (işin metni; kaynakları kararlarda):
//   1. `istakayaBirak`  ADR-019 + tasokey#48: taş kendine yer açar (yer değiştirme YOK) ve çekilen
//      taş bırakıldığı yuvada kalır.
//   2. `gecersizBirak`  tasokey#62 + ADR-021: geçersiz bırakmada taş yerine döner (kopya kalkar,
//      asıl taş yeniden görünür, ıstaka dizilimi değişmez).
//   3. `koseAtmaAlani`  tasokey#63 + ADR-012: köşe atma alanı iki ıstaka arasındaki boş bölgenin
//      tamamıdır (hücre masa kenarına ve komşu ıstakanın yüzüne dayanır, içindeki her nokta köşeye
//      isabet eder, uç noktadan atma gerçekten çalışır).
//   4. `cekme`          R-012: desteden ve KOMŞU köşeden çekilir, başka köşeden çekilemez.
//   5. `bitirmeHedefi`  R-013: el bitirilebilirken deste görsel olarak vurgulanır (dil anahtarlı
//      ipucu + ölçülen biçim farkı) ve son taşı desteye bırakmak eli bitirir.
//
// Bu dosyanın kaynağı İKİ yerde çalışır (ADR-023/4, tek kaynak): (1) `npm test` modül olarak
// import eder, (2) `yardimci/surukleme-olcum-betigi.js` aynı kaynağı sayfaya GÖMER (`export`
// sözcükleri atılarak). Bu yüzden dosya `import` KULLANMAZ ve yalnız dil yerleşiklerine dayanır.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

/** Kutu karşılaştırmalarının alt-piksel payı (tarayıcı yerleşimi kesirli piksel üretir). */
export const ESIK_PX = 1.5;

/** Ölçülen sahneler: dört yol el sürerken, bitirme hedefi ayrı bir sahnede ölçülür. */
export const SAHNELER = Object.freeze(['hedef', 'bitirme']);

/** Hangi sahne hangi yolları ölçer (plan §7 iş 3'ün beş yolu ikiye bölünür). */
export const SAHNE_YOLLARI = Object.freeze({
  hedef: Object.freeze(['istakayaBirak', 'gecersizBirak', 'koseAtmaAlani', 'cekme']),
  bitirme: Object.freeze(['bitirmeHedefi']),
});

const sayi = (deger) => (typeof deger === 'number' && Number.isFinite(deger)
  ? Math.round(deger * 10) / 10 : '—');

const evet = (deger) => (deger ? 'evet' : 'hayir');

/** Dikdörtgenin en x boy metni (yuvarlanmış). */
export function olcuMetni(kutu) {
  if (!kutu) return '—';
  return `${Math.round(kutu.sag - kutu.sol)}x${Math.round(kutu.alt - kutu.ust)}`;
}

/** İki kimlik listesinin ÇOKLUĞU aynı mı (sıra değişebilir, taş kaybolamaz/çoğalamaz). */
export function coklukAyni(a, b) {
  const dolu = (liste) => (liste ?? []).filter((id) => id !== null && id !== undefined).sort();
  const x = dolu(a);
  const y = dolu(b);
  return x.length === y.length && x.every((id, i) => id === y[i]);
}

/** İki dizilim birebir aynı mı (geçersiz bırakma ıstakayı DEĞİŞTİRMEMELİ). */
export function dizilimAyni(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

/**
 * Bir kutunun içinden seçilen 9 isabet noktası: orta, dört köşe ve dört kenar ortası.
 * Köşeler/kenarlar `kenarPayi` kadar İÇERİDEN alınır (tam kenar noktası komşu hücreye düşebilir,
 * alt-piksel yuvarlama yüzünden). Saf: yalnız sayı.
 */
export function isabetNoktalari(kutu, { kenarPayi = 4 } = {}) {
  const sol = kutu.sol + kenarPayi;
  const sag = kutu.sag - kenarPayi;
  const ust = kutu.ust + kenarPayi;
  const alt = kutu.alt - kenarPayi;
  const ortaX = (kutu.sol + kutu.sag) / 2;
  const ortaY = (kutu.ust + kutu.alt) / 2;
  return [
    { ad: 'orta', x: ortaX, y: ortaY },
    { ad: 'solUst', x: sol, y: ust },
    { ad: 'sagUst', x: sag, y: ust },
    { ad: 'solAlt', x: sol, y: alt },
    { ad: 'sagAlt', x: sag, y: alt },
    { ad: 'ustOrta', x: ortaX, y: ust },
    { ad: 'altOrta', x: ortaX, y: alt },
    { ad: 'solOrta', x: sol, y: ortaY },
    { ad: 'sagOrta', x: sag, y: ortaY },
  ];
}

/**
 * Kutuyu `bolme x bolme` ızgaraya bölüp her gözün MERKEZİNİ verir: "boş bölgenin tamamı" ölçütü
 * böyle taranır (hücrenin dışında kalan nokta hangi öğeye düşüyor, çıktıda adıyla durur).
 */
export function izgaraNoktalari(kutu, { bolme = 5 } = {}) {
  const noktalar = [];
  const en = (kutu.sag - kutu.sol) / bolme;
  const boy = (kutu.alt - kutu.ust) / bolme;
  for (let satir = 0; satir < bolme; satir += 1) {
    for (let sutun = 0; sutun < bolme; sutun += 1) {
      noktalar.push({
        ad: `${satir}${sutun}`,
        x: kutu.sol + (sutun + 0.5) * en,
        y: kutu.ust + (satir + 0.5) * boy,
      });
    }
  }
  return noktalar;
}

/** Kutu alanı (boş/ters kutu 0). */
export function kutuAlani(kutu) {
  if (!kutu) return 0;
  return Math.max(0, kutu.sag - kutu.sol) * Math.max(0, kutu.alt - kutu.ust);
}

const hepsi = (liste, sart) => (liste ?? []).length > 0 && (liste ?? []).every(sart);

/**
 * Beş yolun kabul kuralı. Her denetim: `ad` · `gecti(gozlem)` · `olcu(gozlem)` (ekrana yazılan
 * sayı). Kural burada bir kez yazılır; sayfa katmanı yalnız gözlemi toplar, karar vermez.
 */
export const YOLLAR = Object.freeze([
  {
    anahtar: 'istakayaBirak',
    baslik: 'Istakaya bırakma: taş kendine yer açar, çekilen taş bırakıldığı yuvada kalır',
    kaynak: 'ADR-019 + tasokey#48',
    denetimler: Object.freeze([
      {
        ad: 'cekilenYuvadaKaldi',
        gecti: (g) => g.cekilen.sonrakiYerlesim[g.cekilen.yuva] === g.cekilen.id,
        olcu: (g) => `yuva=${g.cekilen.yuva} birakilan=${g.cekilen.id}`
          + ` yuvadaki=${g.cekilen.sonrakiYerlesim[g.cekilen.yuva] ?? 'bos'}`,
      },
      {
        ad: 'itmeHedefeOturdu',
        gecti: (g) => g.itme.sonrakiYerlesim[g.itme.hedefYuva] === g.itme.suruklenenId,
        olcu: (g) => `${g.itme.kaynakYuva}->${g.itme.hedefYuva} tas=${g.itme.suruklenenId}`
          + ` hedefte=${g.itme.sonrakiYerlesim[g.itme.hedefYuva] ?? 'bos'}`,
      },
      {
        // ADR-019: "yer değiştirme yok, taş kendine yer açar" — hedefteki taş sürüklenen taşın
        // ESKİ yuvasına geçerse bu bir takastır, itme değildir.
        ad: 'itmeTakasDegil',
        gecti: (g) => g.itme.hedefteOlanId !== null
          && g.itme.sonrakiYerlesim[g.itme.kaynakYuva] !== g.itme.hedefteOlanId,
        olcu: (g) => `hedefteOlan=${g.itme.hedefteOlanId ?? 'bos'}`
          + ` kaynaktaki=${g.itme.sonrakiYerlesim[g.itme.kaynakYuva] ?? 'bos'}`,
      },
      {
        ad: 'itmeTasKaybetmedi',
        gecti: (g) => coklukAyni(g.itme.oncekiYerlesim, g.itme.sonrakiYerlesim),
        olcu: (g) => `once=${g.itme.oncekiYerlesim.filter((id) => id !== null).length}`
          + ` sonra=${g.itme.sonrakiYerlesim.filter((id) => id !== null).length}`,
      },
    ]),
  },
  {
    anahtar: 'gecersizBirak',
    baslik: 'Geçersiz bırakmada taş yerine döner',
    kaynak: 'tasokey#62 + ADR-021',
    denetimler: Object.freeze([
      {
        ad: 'sirasindaGizliVeKopyaVar',
        gecti: (g) => g.sirasinda.sinif === true && g.sirasinda.gorunurluk === 'hidden'
          && g.sirasinda.kopya === 1,
        olcu: (g) => `sinif=${evet(g.sirasinda.sinif)} gorunurluk=${g.sirasinda.gorunurluk}`
          + ` kopya=${g.sirasinda.kopya}`,
      },
      {
        ad: 'sonraGorunurVeKopyaYok',
        gecti: (g) => g.sonra.sinif === false && g.sonra.gorunurluk === 'visible'
          && g.sonra.kopya === 0,
        olcu: (g) => `sinif=${evet(g.sonra.sinif)} gorunurluk=${g.sonra.gorunurluk}`
          + ` kopya=${g.sonra.kopya}`,
      },
      {
        ad: 'dizilimDegismedi',
        gecti: (g) => dizilimAyni(g.oncekiYerlesim, g.sonrakiYerlesim),
        olcu: (g) => `hedef=${g.hedefAdi} tas=${g.suruklenenId}`
          + ` ayni=${evet(dizilimAyni(g.oncekiYerlesim, g.sonrakiYerlesim))}`,
      },
    ]),
  },
  {
    anahtar: 'koseAtmaAlani',
    baslik: 'Köşe atma alanı iki ıstaka arasındaki boş bölgenin tamamı',
    kaynak: 'tasokey#63 + ADR-012 + ADR-014',
    denetimler: Object.freeze([
      {
        // Hücrenin İÇİNDEKİ her nokta o köşeye isabet etmeli (dört köşede de aynı kural).
        ad: 'hucreIsabetiTam',
        gecti: (g) => hepsi(g.koseler, (k) => k.hucre.isabet === k.hucre.toplam),
        olcu: (g) => (g.koseler ?? [])
          .map((k) => `${k.anahtar}=${k.hucre.isabet}/${k.hucre.toplam}`).join(' '),
      },
      {
        // Hücre masanın İÇERİK kenarına dayanır (iki dış kenar) — boş bölge köşede başlar.
        ad: 'disKenarMasayaDayali',
        gecti: (g) => hepsi(g.koseler, (k) => Math.abs(k.kenarlar.disX) <= g.esik
          && Math.abs(k.kenarlar.disY) <= g.esik),
        olcu: (g) => (g.koseler ?? [])
          .map((k) => `${k.anahtar}=${sayi(k.kenarlar.disX)}/${sayi(k.kenarlar.disY)}`).join(' '),
      },
      {
        // Hücrenin iç yatay kenarı komşu ıstakanın yüzünden yalnız ızgara boşluğu kadar uzakta.
        ad: 'icKenarIstakaYuzunde',
        gecti: (g) => hepsi(g.koseler, (k) => Math.abs(k.kenarlar.icX - g.bosluk) <= g.esik),
        olcu: (g) => `bosluk=${sayi(g.bosluk)} ` + (g.koseler ?? [])
          .map((k) => `${k.anahtar}=${sayi(k.kenarlar.icX)}`).join(' '),
      },
      {
        // Uç noktadan (hücrenin köşesine yakın) atma GERÇEKTEN hamle üretir: el bir taş azalır,
        // o köşenin yığını bir taş artar.
        ad: 'ucNoktadanAtmaCalisti',
        gecti: (g) => g.atma.elSonra === g.atma.elOnce - 1
          && g.atma.yiginSonra === g.atma.yiginOnce + 1,
        olcu: (g) => `kose=${g.atma.kose} nokta=${g.atma.nokta}`
          + ` el=${g.atma.elOnce}->${g.atma.elSonra} yigin=${g.atma.yiginOnce}->${g.atma.yiginSonra}`,
      },
    ]),
  },
  {
    anahtar: 'cekme',
    baslik: 'Desteden ve komşu köşeden çekme; başka köşeden çekilemez',
    kaynak: 'R-012',
    denetimler: Object.freeze([
      {
        ad: 'destedenCekildi',
        gecti: (g) => g.deste.elSonra === g.deste.elOnce + 1,
        olcu: (g) => `el=${g.deste.elOnce}->${g.deste.elSonra} tas=${g.deste.cekilenId ?? '—'}`,
      },
      {
        ad: 'komsuKosedenCekildi',
        gecti: (g) => g.komsuKose.cekilebilirSinif === true
          && g.komsuKose.elSonra === g.komsuKose.elOnce + 1,
        olcu: (g) => `kose=${g.komsuKose.kose} cekilebilir=${evet(g.komsuKose.cekilebilirSinif)}`
          + ` el=${g.komsuKose.elOnce}->${g.komsuKose.elSonra}`,
      },
      {
        // Yığın BOŞ olan köşeden çekilememesi kuralı ölçmez (boş yığından zaten çekilemez):
        // yasak köşenin dolu olması ölçümün önkoşuludur.
        ad: 'yasakKosedenCekilemedi',
        gecti: (g) => g.yasakKose.cekilebilirSinif === false
          && g.yasakKose.yiginAdet > 0
          && g.yasakKose.elSonra === g.yasakKose.elOnce,
        olcu: (g) => `kose=${g.yasakKose.kose} cekilebilir=${evet(g.yasakKose.cekilebilirSinif)}`
          + ` yigin=${g.yasakKose.yiginAdet} el=${g.yasakKose.elOnce}->${g.yasakKose.elSonra}`,
      },
    ]),
  },
  {
    anahtar: 'bitirmeHedefi',
    baslik: 'El bitirilebilirken deste vurgulu; son taş desteye bırakılınca el biter',
    kaynak: 'R-013',
    denetimler: Object.freeze([
      {
        ad: 'vurguSinifiVar',
        gecti: (g) => g.sinif === true && g.bitirenSayisi > 0,
        olcu: (g) => `sinif=${evet(g.sinif)} bitirenTas=${g.bitirenSayisi} el=${g.elDenemesi}`,
      },
      {
        ad: 'ipucuMetniDolu',
        gecti: (g) => typeof g.ipucu === 'string' && g.ipucu.length > 0,
        olcu: (g) => `ipucu="${g.ipucu}"`,
      },
      {
        // "Vurgulu" göze görünür bir biçim farkı demektir: sınıf kalkınca değişen özellikler
        // ölçülür (hiçbiri değişmiyorsa vurgu yalnız sınıf adıdır, görsel değildir).
        ad: 'vurguBicimFarkiOlculdu',
        gecti: (g) => (g.vurguFarki ?? []).length > 0,
        olcu: (g) => (g.vurguFarki ?? []).map((f) => `${f.ozellik}:${f.vurgulu}`).join(' ') || 'fark yok',
      },
      {
        ad: 'destedeBirakmaEliBitirdi',
        gecti: (g) => g.birakma.sonucGorunur === true && g.birakma.elSonra === g.birakma.elOnce - 1,
        olcu: (g) => `el=${g.birakma.elOnce}->${g.birakma.elSonra}`
          + ` sonucPaneli=${evet(g.birakma.sonucGorunur)} sonuc="${g.birakma.sonucMetni ?? ''}"`,
      },
    ]),
  },
]);

export const YOL_ANAHTARLARI = Object.freeze(YOLLAR.map((yol) => yol.anahtar));

/** Yol tanımı (bilinmeyen anahtar hata verir: yazım hatası sessizce "ölçülmedi" olmasın). */
export function yolTanimi(anahtar) {
  const yol = YOLLAR.find((y) => y.anahtar === anahtar);
  if (!yol) throw new Error(`bilinmeyen yol: ${anahtar}`);
  return yol;
}

/**
 * Tek yolun kararı. `gozlem` yoksa (adım hiç koşmadı) ya da `hata` taşıyorsa karar `olculmedi`
 * olur — A9: ölçülmeyen yol "geçti" yazılmaz. Denetim gövdesi patlarsa (eksik alan) o denetim
 * `kaldi` sayılır ve hata metni ölçü olarak durur.
 */
export function yolKarari(anahtar, gozlem) {
  const yol = yolTanimi(anahtar);
  const ortak = { anahtar, baslik: yol.baslik, kaynak: yol.kaynak };
  if (!gozlem) return { ...ortak, durum: 'olculmedi', hata: 'gözlem yok', denetimler: [] };
  if (gozlem.hata) {
    return { ...ortak, durum: 'olculmedi', hata: String(gozlem.hata), denetimler: [] };
  }
  const denetimler = yol.denetimler.map((denetim) => {
    try {
      return { ad: denetim.ad, gecti: denetim.gecti(gozlem) === true, olcu: String(denetim.olcu(gozlem)) };
    } catch (hata) {
      return { ad: denetim.ad, gecti: false, olcu: `ölçülemedi: ${hata.message}` };
    }
  });
  return {
    ...ortak,
    durum: denetimler.every((d) => d.gecti) ? 'gecti' : 'kaldi',
    hata: null,
    denetimler,
  };
}

/** Sahnenin bütün yollarının kararı (sırası `SAHNE_YOLLARI`). */
export function sahneKararlari(sahne, gozlemler = {}) {
  const anahtarlar = SAHNE_YOLLARI[sahne];
  if (!anahtarlar) throw new Error(`bilinmeyen sahne: ${sahne}`);
  return anahtarlar.map((anahtar) => yolKarari(anahtar, gozlemler[anahtar]));
}

/** Karar sayımı: `gecti` / `kaldi` / `olculmedi`. */
export function kararOzeti(kararlar) {
  const say = (durum) => kararlar.filter((karar) => karar.durum === durum).length;
  return { toplam: kararlar.length, gecti: say('gecti'), kaldi: say('kaldi'), olculmedi: say('olculmedi') };
}

/**
 * Ekran görüntüsünden ve sürücü günlüğünden okunan özet (tek kaynak: iki yolda aynı satırlar).
 * Satırlar KISA tutulur — yazı katmanı `white-space: pre`, uzun satır 800px görünümde kırpılır.
 */
export function ozetSatirlari(olcum, { enCokOlcu = 4 } = {}) {
  const { sahne, gorunum, kararlar = [], olculer = {} } = olcum;
  const ozet = kararOzeti(kararlar);
  const satirlar = [
    `SURUKLE ${gorunum.genislik}x${gorunum.yukseklik} sahne=${sahne}`
    + ` yol=${ozet.toplam} gecti=${ozet.gecti} kaldi=${ozet.kaldi} olculmedi=${ozet.olculmedi}`,
    `OLCU istaka ${olcuMetni(olculer.istaka)} tas ${olcuMetni(olculer.tas)}`
    + ` olcek ${olculer.olcek ?? '—'} hedefPay ${sayi(olculer.hedefPay)}px`,
  ];
  for (const karar of kararlar) {
    const isaret = karar.durum === 'gecti' ? '+' : (karar.durum === 'kaldi' ? 'x' : '?');
    satirlar.push(`${isaret} ${karar.anahtar} [${karar.durum}] ${karar.kaynak}`
      + (karar.hata ? ` — ${karar.hata}` : ''));
    for (const denetim of karar.denetimler.slice(0, enCokOlcu)) {
      satirlar.push(`   ${denetim.gecti ? '·' : '!'} ${denetim.ad}: ${denetim.olcu}`);
    }
    if (karar.denetimler.length > enCokOlcu) {
      satirlar.push(`   … +${karar.denetimler.length - enCokOlcu} denetim daha`);
    }
  }
  return satirlar;
}

/**
 * Köşe bölge taramasının dökümü: hücrenin dışında kalan noktalar hangi öğeye düşüyor.
 * "Boş bölgenin tamamı" iddiası bu sayıyla okunur; kaçan nokta ızgara boşluğuna (`#masa`) ya da
 * komşu öğeye düşüyorsa sahipsiz bir şerit yoktur. Eşik YOKTUR: ölçülen oran yazılır (A9).
 */
export function bolgeSatirlari(koseler = []) {
  const satirlar = [];
  for (const kose of koseler) {
    const bolge = kose.bolge ?? {};
    satirlar.push(`BOLGE ${kose.anahtar} hucre ${olcuMetni(kose.kutu)}`
      + ` bosBolge ${olcuMetni(bolge.kutu)} isabet ${bolge.isabet ?? '?'}/${bolge.toplam ?? '?'}`
      + ` (${Math.round((bolge.oran ?? 0) * 100)}%)`);
    const kacanlar = bolge.kacanlar ?? [];
    if (kacanlar.length > 0) {
      const dokum = new Map();
      for (const kacan of kacanlar) dokum.set(kacan.bulunan, (dokum.get(kacan.bulunan) ?? 0) + 1);
      satirlar.push(`   kacan: ${[...dokum].map(([ad, adet]) => `${ad} x${adet}`).join(', ')}`);
    }
  }
  return satirlar;
}

/**
 * Ekran görüntüsündeki yazı katmanının sığdırma biçimi (tasokey#67 ile aynı kural, ayrı sahne
 * olduğu için burada da gerekir): satır sayısı + görünüm yüksekliğinden yazı boyu ve üst pay.
 */
export function yaziKatmaniBicimi(satirSayisi, gorunumYuksekligi, {
  yazi = 12, satirPayi = 1.3, ustOran = 0.18, enKucukYazi = 6, dolgu = 10,
} = {}) {
  const gerekli = (boy) => Math.ceil(satirSayisi * boy * satirPayi) + dolgu;
  const ustPx = Math.round(gorunumYuksekligi * ustOran);
  if (gerekli(yazi) <= gorunumYuksekligi - ustPx) return { yazi, ustPx, satirPayi };
  if (gerekli(yazi) <= gorunumYuksekligi) return { yazi, ustPx: 0, satirPayi };
  const sigan = Math.floor((gorunumYuksekligi - dolgu) / (satirSayisi * satirPayi));
  return { yazi: Math.max(enKucukYazi, sigan), ustPx: 0, satirPayi };
}

/** Markdown tablosunun bir satırı (sürücü raporu; yol başına bir satır). */
export function kararSatiri(olcum, karar) {
  return [
    `${olcum.gorunum.genislik}x${olcum.gorunum.yukseklik}`,
    olcum.boyutAdi ?? '—',
    olcum.sahne,
    karar.anahtar,
    karar.kaynak,
    karar.durum,
    karar.denetimler.map((d) => `${d.gecti ? '✓' : '✗'} ${d.ad}`).join('<br>') || (karar.hata ?? '—'),
  ];
}

export const TABLO_BASLIKLARI = Object.freeze([
  'boyut', 'ad', 'sahne', 'yol', 'kaynak', 'karar', 'denetimler',
]);
