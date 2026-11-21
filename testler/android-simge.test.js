import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

// tasokey#55 (üst iş tasokey#52) — uygulama simgesi ve adı: iki vektör drawable (geometrinin tek
// kaynağı), API 26+ için `<adaptive-icon>`, API 24-25 için aynı geometriden türetilmiş beş PNG,
// `colors.xml` üç rengi ve `uygulama_adi`. Mimari maddesi **ADR-020/11** (`MIMARI.md` §5, mimari
// karar sürümü 15, Mimar hakemliği tasokey#55); kabuğun kendi maddeleri `android-kabuk.test.js`te
// ölçülür.
//
// Bu test cihaz, emülatör, JDK, Android SDK, ağ ya da ek paket istemez: ölçtüğü şey depodaki
// kaynakların kendisidir (`npm test` içinde koşar) — PNG'ler bayt düzeyinde okunur (imza, IHDR,
// parça CRC'si, IDAT'ın açılmış uzunluğu), vektörlerin `pathData`'sı ayrıştırılıp çizimin
// sınırlayıcı kutusu ölçülür. Tabanı `is/tasokey-55/olcum.mjs` ölçüm betiğidir; o betik geçici iş
// klasöründe kaldığı için maddeler buraya taşındı (Denetçi bulgusu, tasokey#55).
//
// PNG'leri **üreten** program depoda değildir (ADR-020/11: üretim komutu + bayt özetleri
// `android/SIMGE.md`'ye yazılır, ölçü her koşuda ölçülür). Bu yüzden son madde SIMGE.md'deki beş
// SHA-256'yı gerçek dosyalarla karşılaştırır: belge ile depo ayrışırsa sessiz kalmaz.
//
// ÖLÇÜLMEYEN: simgenin cihazda/başlatıcıda görünüşü. APK derlenmedi, `aapt2 link` koşmadı; görsel
// beğeni Sahip'tedir. Bu dosya "simge güzel/doğru duruyor" demez, ölçülebilir kuralları ölçer.
//
// Yanlış yol ya da bozuk dosya **yığın izi değil açık başarısız madde** verir: dosya okuma tek
// yardımcıdan (`oku`/`okuBayt`) geçer, ayrıştırıcı hatası `assert.fail` ile madde hatasına çevrilir.
// Depo kökü `import.meta.dirname`'den bulunur; komut satırı argümanı alınmaz.

const KOK = join(import.meta.dirname, '..');
const ANDROID = join(KOK, 'android');
const KABUK = join(ANDROID, 'kabuk');
const RES = join(KABUK, 'res');

const MANIFEST = join(KABUK, 'AndroidManifest.xml');
const COLORS = join(RES, 'values', 'colors.xml');
const DIZELER_EN = join(RES, 'values', 'strings.xml');
const DIZELER_TR = join(RES, 'values-tr', 'strings.xml');
const ANYDPI = join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml');
const ON_KATMAN = join(RES, 'drawable', 'ic_launcher_on.xml');
const ARKA_KATMAN = join(RES, 'drawable', 'ic_launcher_arka.xml');
const STIL_CSS = join(KOK, 'docs', 'arayuz', 'stil.css');
const SIMGE_MD = join(ANDROID, 'SIMGE.md');

/** Uyarlanır simge tuvali (dp) — ADR-020/11. */
const TUVAL_DP = 108;
/** Dairesel başlatıcı maskesinde anlam taşıyan çizimin sığması gereken çap (dp). */
const GUVENLI_CAP_DP = 66;
/** Çizimin tuval merkezinden sapma payı (dp) — maske her yönden eşit kırpar. */
const MERKEZ_SAPMA_SINIRI = 0.05;
/** Kübik Bézier'in doğru parçasına bölünme sayısı (üreticideki değerin aynısı). */
const BEZIER_ADIM = 24;

/** Yoğunluk adı → PNG kenarı (px); API 24-25 yedeği. */
const YOGUNLUKLAR = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

/** colors.xml adı → docs/arayuz/stil.css `:root` değişkeni (ölçülen tek kaynak köprüsü). */
const RENK_KOPRUSU = [
  ['simge_arka', '--masa-zemin'],
  ['simge_tas_govde', '--tas-govde'],
  ['simge_rakam', '--renk-kirmizi'],
];

/** `pathData`da izin verilen komutlar: yalnız MUTLAK M L C Z (PNG üreticisinin okuduğu alt küme). */
const IZINLI_KOMUTLAR = new Set(['M', 'L', 'C', 'Z']);

const BEKLENEN_AD = 'Taş Okey';
const PNG_IMZASI = '89504e470d0a1a0a';

// --- okuma yardımcıları (eksik dosya = açık madde hatası) --------------------------------------

function goreli(dosya) {
  return relative(KOK, dosya).replace(/\\/g, '/');
}

function okuBayt(dosya) {
  assert.ok(existsSync(dosya), `dosya yok: ${goreli(dosya)}`);
  return readFileSync(dosya);
}

function oku(dosya) {
  return okuBayt(dosya).toString('utf8');
}

/** XML yorumları atılır: yorumda geçen bir nitelik adı "yazılmış" sayılmaz. */
function xmlYorumsuz(metin) {
  return metin.replace(/<!--[\s\S]*?-->/g, '');
}

function viewport(metin) {
  return [
    Number(/android:viewportWidth="([\d.]+)"/.exec(metin)?.[1]),
    Number(/android:viewportHeight="([\d.]+)"/.exec(metin)?.[1]),
  ];
}

function pathDatalar(metin) {
  return [...metin.matchAll(/android:pathData="([^"]+)"/g)].map(([, d]) => d);
}

/** `<string name="x">…</string>` → Map. */
function dizeTablosu(dosya) {
  const tablo = new Map();
  for (const [, ad, deger] of xmlYorumsuz(oku(dosya)).matchAll(/<string\s+name="([^"]+)"\s*>([\s\S]*?)<\/string>/g)) {
    tablo.set(ad, deger.trim());
  }
  return tablo;
}

// --- pathData → çokgen (ölçülecek geometri) ----------------------------------------------------

/**
 * Yalnız mutlak M, L, C, Z tanınır; başka komut ya da bozuk sayı görülürse hata atılır (çağıran
 * bunu madde hatasına çevirir). Eğrilik, sınırlayıcı kutu ölçülebilsin diye doğru parçalarına
 * bölünür — üreticinin (`is/tasokey-55/uretici/cizim.mjs`) kullandığı adım sayısıyla aynı.
 */
function cokgenler(pathData) {
  const parcalar = pathData.trim().match(/[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  const sonuc = [];
  let simdi = null;
  let x = 0;
  let y = 0;
  let i = 0;
  const sayi = () => {
    const d = Number(parcalar[i]);
    if (!Number.isFinite(d)) throw new Error(`pathData: sayı bekleniyordu, "${parcalar[i]}" geldi`);
    i += 1;
    return d;
  };
  while (i < parcalar.length) {
    const komut = parcalar[i];
    if (!/^[A-Za-z]$/.test(komut)) throw new Error(`pathData: komut bekleniyordu, "${komut}" geldi`);
    if (!IZINLI_KOMUTLAR.has(komut)) throw new Error(`pathData: izin verilmeyen komut "${komut}"`);
    i += 1;
    if (komut === 'M') {
      x = sayi();
      y = sayi();
      simdi = [[x, y]];
      sonuc.push(simdi);
    } else if (komut === 'L') {
      if (!simdi) throw new Error('pathData: M olmadan L');
      x = sayi();
      y = sayi();
      simdi.push([x, y]);
    } else if (komut === 'C') {
      if (!simdi) throw new Error('pathData: M olmadan C');
      const x1 = sayi();
      const y1 = sayi();
      const x2 = sayi();
      const y2 = sayi();
      const x3 = sayi();
      const y3 = sayi();
      for (let k = 1; k <= BEZIER_ADIM; k += 1) {
        const t = k / BEZIER_ADIM;
        const u = 1 - t;
        simdi.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      x = x3;
      y = y3;
    } else {
      if (simdi && simdi.length > 0) [x, y] = simdi[0];
      simdi = null;
    }
  }
  return sonuc.filter((c) => c.length > 2);
}

/** Çokgen kümesinin sınırlayıcı kutusu. */
function kutu(cokgenKumesi) {
  let enAzX = Infinity;
  let enAzY = Infinity;
  let enCokX = -Infinity;
  let enCokY = -Infinity;
  for (const c of cokgenKumesi) {
    for (const [px, py] of c) {
      if (px < enAzX) enAzX = px;
      if (py < enAzY) enAzY = py;
      if (px > enCokX) enCokX = px;
      if (py > enCokY) enCokY = py;
    }
  }
  return { enAzX, enAzY, enCokX, enCokY };
}

// --- PNG çözümleme (bayt düzeyi; ek paket yok) -------------------------------------------------

const CRC_TABLOSU = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(veri) {
  let c = 0xffffffff;
  for (const b of veri) c = CRC_TABLOSU[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * PNG'yi baytlarından çözümler. Bozuk dosya bu işlevi DÜŞÜRMEZ: sorun listesi döner, böylece tek
 * bozuk PNG bütün maddeyi yığın iziyle bitirmez (olcum.mjs'de ölçülen davranış).
 */
function pngCozumle(dosya) {
  const veri = okuBayt(dosya);
  const sorunlar = [];
  const sonuc = {
    bayt: veri.length,
    sha256: createHash('sha256').update(veri).digest('hex'),
    parcalar: [],
    sorunlar,
  };
  if (veri.subarray(0, 8).toString('hex') !== PNG_IMZASI) {
    sorunlar.push('PNG imzası yanlış (dosya PNG değil ya da bozulmuş)');
    return sonuc;
  }
  let i = 8;
  const idat = [];
  while (i + 12 <= veri.length) {
    const uzunluk = veri.readUInt32BE(i);
    if (i + 12 + uzunluk > veri.length) {
      sorunlar.push('parça uzunluğu dosya sonunu taşıyor (dosya yarım)');
      break;
    }
    const tur = veri.toString('latin1', i + 4, i + 8);
    const govde = veri.subarray(i + 4, i + 8 + uzunluk);
    if (crc32(govde) !== veri.readUInt32BE(i + 8 + uzunluk)) sorunlar.push(`${tur} parçasında CRC uyuşmuyor`);
    sonuc.parcalar.push(tur);
    if (tur === 'IHDR') {
      sonuc.genislik = veri.readUInt32BE(i + 8);
      sonuc.yukseklik = veri.readUInt32BE(i + 12);
      sonuc.bitDerinligi = veri[i + 16];
      sonuc.renkTuru = veri[i + 17];
    }
    if (tur === 'IDAT') idat.push(veri.subarray(i + 8, i + 8 + uzunluk));
    i += 12 + uzunluk;
  }
  if (!sonuc.parcalar.includes('IHDR')) {
    sorunlar.push('IHDR parçası yok (ölçü okunamadı)');
    return sonuc;
  }
  try {
    sonuc.hamBayt = inflateSync(Buffer.concat(idat)).length;
  } catch (hata) {
    sonuc.hamBayt = -1;
    sorunlar.push(`IDAT açılamadı: ${hata.message}`);
  }
  sonuc.beklenenHam = sonuc.yukseklik * (sonuc.genislik * 4 + 1);
  return sonuc;
}

/** `android/` altındaki bütün `.xml` dosyaları. */
function xmlDosyalari() {
  assert.ok(existsSync(ANDROID), `klasör yok: ${goreli(ANDROID)}`);
  const sonuc = [];
  for (const giris of readdirSync(ANDROID, { recursive: true, withFileTypes: true })) {
    if (giris.isFile() && giris.name.toLowerCase().endsWith('.xml')) {
      sonuc.push(join(giris.parentPath ?? giris.path, giris.name));
    }
  }
  return sonuc;
}

// --- a) beş yoğunlukta PNG ---------------------------------------------------------------------

test('ASIL KABUL (ADR-020/11): beş yoğunlukta ic_launcher.png var; PNG imzası, IHDR ölçüsü (kare 48/72/96/144/192), RGBA 8 bit, parça CRC\'leri ve IDAT uzunluğu doğru', () => {
  const bulgular = [];
  const olculen = [];
  for (const [yogunluk, kenar] of YOGUNLUKLAR) {
    const dosya = join(RES, `mipmap-${yogunluk}`, 'ic_launcher.png');
    if (!existsSync(dosya)) {
      bulgular.push(`${yogunluk}: dosya yok (${goreli(dosya)})`);
      continue;
    }
    const p = pngCozumle(dosya);
    olculen.push(`${yogunluk} ${p.genislik}x${p.yukseklik} ${p.bayt}B`);
    for (const sorun of p.sorunlar) bulgular.push(`${yogunluk}: ${sorun}`);
    if (p.sorunlar.length > 0) continue;
    if (p.genislik !== kenar || p.yukseklik !== kenar) {
      bulgular.push(`${yogunluk}: ${p.genislik}x${p.yukseklik}, beklenen ${kenar}x${kenar} (kare)`);
    }
    if (p.bitDerinligi !== 8 || p.renkTuru !== 6) {
      bulgular.push(`${yogunluk}: bit=${p.bitDerinligi} renkTuru=${p.renkTuru}, beklenen 8/6 (RGBA)`);
    }
    if (p.hamBayt !== p.beklenenHam) {
      bulgular.push(`${yogunluk}: IDAT açılınca ${p.hamBayt} bayt, ölçüye göre beklenen ${p.beklenenHam}`);
    }
  }
  assert.deepEqual(bulgular, [], `ölçülen: ${olculen.join(' · ') || 'hiç PNG okunamadı'}`);
  assert.equal(olculen.length, YOGUNLUKLAR.length);
});

// --- b) uyarlanır simge kökü -------------------------------------------------------------------

test('ASIL KABUL (ADR-020/11): mipmap-anydpi-v26/ic_launcher.xml kökü adaptive-icon; background ve foreground gösterdiği drawable dosyaları mevcut', () => {
  const metin = xmlYorumsuz(oku(ANYDPI));
  assert.match(metin, /<adaptive-icon\b/, 'kök öğe <adaptive-icon> değil (API 26+ simgeyi tanımaz)');

  const gosterilen = new Map();
  const eksikler = [];
  for (const [, katman, ad] of metin.matchAll(/<(background|foreground)\s+android:drawable="@drawable\/(\w+)"/g)) {
    gosterilen.set(katman, ad);
    const hedef = join(RES, 'drawable', `${ad}.xml`);
    if (!existsSync(hedef)) eksikler.push(`${katman} → ${goreli(hedef)} yok`);
  }
  assert.deepEqual(eksikler, []);
  assert.deepEqual([...gosterilen.keys()].sort(), ['background', 'foreground'],
    'iki katman da @drawable/… ile gösterilmeli (renk/mipmap gösterimi geometriyi ikinci kaynağa taşır)');
});

// --- c) viewport ve güvenli daire --------------------------------------------------------------

test(`ASIL KABUL (ADR-020/11): iki vektörün viewport'u ${TUVAL_DP}x${TUVAL_DP}; ön plan çizimi tuval merkezli ${GUVENLI_CAP_DP} dp daireye sığıyor`, () => {
  const onMetin = xmlYorumsuz(oku(ON_KATMAN));
  const arkaMetin = xmlYorumsuz(oku(ARKA_KATMAN));
  for (const [ad, metin] of [['ic_launcher_on.xml', onMetin], ['ic_launcher_arka.xml', arkaMetin]]) {
    assert.deepEqual(viewport(metin), [TUVAL_DP, TUVAL_DP], `${ad}: viewport ${TUVAL_DP}x${TUVAL_DP} olmalı`);
  }

  const yollar = pathDatalar(onMetin);
  assert.ok(yollar.length > 0, 'ön katmanda android:pathData taşıyan <path> yok');

  let cizim;
  try {
    cizim = yollar.flatMap((d) => cokgenler(d));
  } catch (hata) {
    assert.fail(`ön katmanın pathData'sı ayrıştırılamadı: ${hata.message}`);
  }
  assert.ok(cizim.length > 0, "ön katmanın pathData'sından kapalı çokgen çıkmadı");

  const k = kutu(cizim);
  const genislik = k.enCokX - k.enAzX;
  const yukseklik = k.enCokY - k.enAzY;
  const kosegen = Math.hypot(genislik, yukseklik);
  const merkezX = (k.enAzX + k.enCokX) / 2;
  const merkezY = (k.enAzY + k.enCokY) / 2;
  const olculen = `çizim ${genislik.toFixed(2)}x${yukseklik.toFixed(2)} dp · köşegen ${kosegen.toFixed(3)} dp`
    + ` · merkez (${merkezX.toFixed(2)}; ${merkezY.toFixed(2)})`;

  assert.ok(kosegen <= GUVENLI_CAP_DP,
    `köşegen ${kosegen.toFixed(3)} dp > ${GUVENLI_CAP_DP} dp: dairesel maskede çizimin köşesi kırpılır (${olculen})`);
  assert.ok(Math.abs(merkezX - TUVAL_DP / 2) <= MERKEZ_SAPMA_SINIRI
    && Math.abs(merkezY - TUVAL_DP / 2) <= MERKEZ_SAPMA_SINIRI,
    `çizim tuval merkezinde değil, maske bir kenardan daha çok kırpar (${olculen})`);
});

// --- d) çizim komutu kısıtı --------------------------------------------------------------------

test('ASIL KABUL (ADR-020/11): iki vektörün pathData\'sı yalnız mutlak M L C Z içeriyor (yay/göreli/kısayol komut yok)', () => {
  const komutlar = new Set();
  for (const dosya of [ON_KATMAN, ARKA_KATMAN]) {
    const yollar = pathDatalar(xmlYorumsuz(oku(dosya)));
    assert.ok(yollar.length > 0, `${goreli(dosya)}: android:pathData yok`);
    for (const d of yollar) for (const [harf] of d.matchAll(/[A-Za-z]/g)) komutlar.add(harf);
  }
  const disarida = [...komutlar].filter((harf) => !IZINLI_KOMUTLAR.has(harf)).sort();
  assert.deepEqual(disarida, [],
    `PNG üreticisi yalnız M L C Z okur; izinsiz komut sessizce yanlış PNG verir (kullanılan: ${[...komutlar].sort().join(' ')})`);
});

// --- e) renk tek kaynağı köprüsü ---------------------------------------------------------------

test('ASIL KABUL (ADR-020/11): colors.xml üç değeri docs/arayuz/stil.css :root paletiyle birebir aynı', () => {
  const css = oku(STIL_CSS);
  const colorsXml = xmlYorumsuz(oku(COLORS));
  const bulgular = [];
  const olculen = [];
  for (const [ad, degisken] of RENK_KOPRUSU) {
    const androidDeger = new RegExp(`<color\\s+name="${ad}"\\s*>\\s*([^<\\s]+)\\s*</color>`).exec(colorsXml)?.[1];
    const cssDeger = new RegExp(`${degisken}\\s*:\\s*([^;]+);`).exec(css)?.[1]?.trim();
    olculen.push(`${ad}=${androidDeger ?? 'tanımsız'} ↔ ${degisken}=${cssDeger ?? 'tanımsız'}`);
    if (!androidDeger) bulgular.push(`colors.xml'de ${ad} yok`);
    else if (!cssDeger) bulgular.push(`stil.css :root içinde ${degisken} yok`);
    else if (androidDeger.toLowerCase() !== cssDeger.toLowerCase()) bulgular.push(`${ad} ≠ ${degisken}`);
  }
  assert.deepEqual(bulgular, [],
    `Android kaynağı CSS okuyamaz; eşitlik kopya değil ölçülen köprüdür (${olculen.join(' · ')})`);
});

// --- f) manifest niteliği ve vektörlerde onaltılık renk yokluğu --------------------------------

test('ASIL KABUL (ADR-020/11): manifestte android:icon="@mipmap/ic_launcher" var, roundIcon yok; vektörlerde onaltılık renk yok', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  assert.equal(/android:icon="([^"]+)"/.exec(manifest)?.[1], '@mipmap/ic_launcher',
    'simge niteliği yok ya da başka kaynağı gösteriyor');
  assert.doesNotMatch(manifest, /android:roundIcon=/,
    'roundIcon ayrı bir geometri kaynağı ister (ADR-020/11: tek kaynak, yuvarlak maske uyarlanır simgeden gelir)');

  const onaltilik = [];
  for (const dosya of [ON_KATMAN, ARKA_KATMAN]) {
    if (/#[0-9a-fA-F]{3,8}\b/.test(xmlYorumsuz(oku(dosya)))) onaltilik.push(goreli(dosya));
  }
  assert.deepEqual(onaltilik, [], 'renk yalnız @color/… ile gelir (colors.xml tek tanım)');
});

// --- g) uygulama adı iki dilde -----------------------------------------------------------------

test(`ASIL KABUL (ADR-020/11): uygulama_adi iki dilde de "${BEKLENEN_AD}" (özel ad çevrilmez)`, () => {
  const en = dizeTablosu(DIZELER_EN);
  const tr = dizeTablosu(DIZELER_TR);
  assert.equal(en.get('uygulama_adi'), BEKLENEN_AD, 'varsayılan (EN) dizelerde uygulama adı');
  assert.equal(tr.get('uygulama_adi'), BEKLENEN_AD, 'TR dizelerde uygulama adı');
  assert.match(xmlYorumsuz(oku(MANIFEST)), /android:label="@string\/uygulama_adi"/,
    'manifest uygulama adını dize anahtarından almıyor (sabit metin yasak — ADR-020/9)');
});

// --- j) XML yorumlarında iki tire yok ----------------------------------------------------------

// Bu madde şartnamenin a…i listesinde YOKTU: `aapt2 compile` ilk koşusunda gerçek bir kusur buldu
// (`values/colors.xml` → "xml parser error: not well-formed"), çünkü CSS değişken adları XML
// yorumunun içinde iki tire yan yana taşıyordu. Aynı kusur AndroidManifest.xml'de de vardı
// (tasokey#54'ten kalma) ve `aapt2 compile` manifesti okumadığı için ancak link adımında çıkardı.
// Kural buraya bağlandı: ölçüm dış araç istemez, kusur geri gelirse `npm test` görür.
test('ASIL KABUL (ADR-020/11): android/ altındaki XML yorumlarında iki tire yan yana yok (aapt2 dosyayı reddeder)', () => {
  const dosyalar = xmlDosyalari();
  assert.ok(dosyalar.length > 0, `${goreli(ANDROID)} altında .xml bulunamadı — tarama kapsamı bozulmuş`);
  for (const beklenen of [MANIFEST, COLORS]) {
    assert.ok(dosyalar.includes(beklenen), `tarama ${goreli(beklenen)} dosyasını görmüyor`);
  }

  const bulgular = [];
  for (const dosya of dosyalar) {
    for (const [tam] of oku(dosya).matchAll(/<!--[\s\S]*?-->/g)) {
      const ic = tam.slice(4, -3);
      if (ic.includes('--') || ic.endsWith('-')) bulgular.push(`${goreli(dosya)}: yorumda "--"`);
    }
  }
  assert.deepEqual(bulgular, [], `${dosyalar.length} XML tarandı; XML yorumu iki tire taşıyamaz`);
});

// --- k) SIMGE.md özetleri ↔ depodaki baytlar ---------------------------------------------------

test('ASIL KABUL (ADR-020/11): android/SIMGE.md\'deki beş SHA-256 özeti depodaki PNG\'lerin baytlarıyla birebir aynı', () => {
  const belge = oku(SIMGE_MD);
  const yazilan = new Map();
  for (const [, yogunluk, ozet] of belge.matchAll(/mipmap-(\w+)\/ic_launcher\.png`\s*\|[^|]*\|[^|]*\|\s*`([0-9a-f]{64})`/g)) {
    yazilan.set(yogunluk, ozet);
  }
  assert.deepEqual([...yazilan.keys()].sort(), YOGUNLUKLAR.map(([y]) => y).sort(),
    `SIMGE.md özet tablosu beş yoğunluğu kapsamıyor (okunan: ${[...yazilan.keys()].join(', ') || 'hiçbiri'})`);

  const bulgular = [];
  for (const [yogunluk] of YOGUNLUKLAR) {
    const dosya = join(RES, `mipmap-${yogunluk}`, 'ic_launcher.png');
    if (!existsSync(dosya)) {
      bulgular.push(`${yogunluk}: dosya yok`);
      continue;
    }
    const gercek = createHash('sha256').update(readFileSync(dosya)).digest('hex');
    if (gercek !== yazilan.get(yogunluk)) {
      bulgular.push(`${yogunluk}: depo ${gercek.slice(0, 16)}… ≠ SIMGE.md ${yazilan.get(yogunluk).slice(0, 16)}…`);
    }
  }
  assert.deepEqual(bulgular, [],
    'PNG değişmiş ama belge tazelenmemiş (ya da tersi): üretici depoda olmadığı için belge tek kimlik kaydıdır');
});
