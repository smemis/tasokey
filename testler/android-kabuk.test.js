import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// tasokey#54 (üst iş tasokey#52) — Android kabuğunun kaynakları (`android/kabuk/`): manifest,
// tek Activity, varlık sunucusu, TR/EN dizeler, tema. Kabuk web oyununu (docs/) tek bir WebView
// içinde çevrimdışı çalıştırır; oyun kuralı/arayüzü/dili kabukta DEĞİLDİR.
//
// Bu test cihaz, emülatör, JDK ya da Android SDK istemez: ölçtüğü şey kaynakların kendisidir
// (`npm test` içinde koşar). Kaynak taraması bu projede kabul ölçütü ölçmenin yerleşik yolu
// (bkz. `adr-atif-tarama.test.js`, `modul-baglanti.test.js`): kabuğun bütün kararları derleme
// girdisi olan metin dosyalarında durduğu için ölçülebilir yer burasıdır. APK'nın cihazda gerçekten
// açıldığı ve dokunmayla oynandığı ayrı bir işte (derleme + kurulum) doğrulanır; bu test onu
// iddia etmez.
//
// Android kabuğunun mimari kararı PRD farkı onayıyla `MIMARI.md` §5'e yazılacak; numarası o zaman
// bu dosyaya da işlenir (atıf numarası, karar belgede olmadan yazılamaz: `adr-atif-tarama.test.js`).

const KOK = join(import.meta.dirname, '..');
const KABUK = join(KOK, 'android', 'kabuk');

const MANIFEST = join(KABUK, 'AndroidManifest.xml');
const JAVA_DIZINI = join(KABUK, 'java', 'com', 'kraftdcm', 'tasokey');
const ETKINLIK = join(JAVA_DIZINI, 'OyunEtkinligi.java');
const SUNUCU = join(JAVA_DIZINI, 'VarlikSunucusu.java');
const DIZELER_EN = join(KABUK, 'res', 'values', 'strings.xml');
const DIZELER_TR = join(KABUK, 'res', 'values-tr', 'strings.xml');
const TEMA = join(KABUK, 'res', 'values', 'styles.xml');
const TEMA_V28 = join(KABUK, 'res', 'values-v28', 'styles.xml');

const BEKLENEN_DOSYALAR = [MANIFEST, ETKINLIK, SUNUCU, DIZELER_EN, DIZELER_TR, TEMA, TEMA_V28];

/** Kabul ölçütündeki `configChanges` kümesi: yön/boyut değişiminde etkinlik yeniden kurulmaz. */
const BEKLENEN_CONFIG_CHANGES = [
  'orientation', 'screenSize', 'screenLayout', 'smallestScreenSize',
  'keyboardHidden', 'uiMode', 'density',
];

/** Kabul ölçütündeki WebView ayar listesi: [metot, beklenen argüman, niçin]. */
const BEKLENEN_WEBVIEW_AYARLARI = [
  ['setJavaScriptEnabled', 'true', 'JS açık (oyun ES2022 modülleriyle çalışır)'],
  ['setDomStorageEnabled', 'true', 'DOM depolama açık (kayıt localStorage)'],
  ['setMediaPlaybackRequiresUserGesture', 'false', 'medya dokunmasız çalabilir'],
  ['setSupportZoom', 'false', 'yakınlaştırma kapalı'],
  ['setBuiltInZoomControls', 'false', 'yakınlaştırma kapalı'],
  ['setDisplayZoomControls', 'false', 'yakınlaştırma kapalı'],
  ['setTextZoom', '100', 'sistem yazı ölçeği düzeni bozmasın'],
  ['setAllowFileAccess', 'false', 'dosya erişimi kapalı'],
  ['setAllowContentAccess', 'false', 'dosya erişimi kapalı'],
  ['setAllowFileAccessFromFileURLs', 'false', 'dosya erişimi kapalı'],
  ['setAllowUniversalAccessFromFileURLs', 'false', 'dosya erişimi kapalı'],
];

/** Kabul ölçütündeki MIME satırları (tabloda daha fazlası olabilir, bunlar olmak zorunda). */
const BEKLENEN_MIME = [
  ['html', 'text/html'],
  ['css', 'text/css'],
  ['js', 'text/javascript'],
  ['json', 'application/json'],
  ['svg', 'image/svg+xml'],
];

const BEKLENEN_BASLANGIC_ADRESI = 'https://appassets.androidplatform.net/index.html';

// --- okuma ve ayıklama yardımcıları ----------------------------------------------------------

function oku(dosya) {
  return readFileSync(dosya, 'utf8');
}

/** `android/kabuk` altındaki bütün dosyalar (depo köküne göreli yolla birlikte). */
function kabukDosyalari() {
  const dosyalar = [];
  for (const ad of readdirSync(KABUK, { recursive: true })) {
    const tam = join(KABUK, ad);
    if (statSync(tam).isFile()) dosyalar.push([relative(KOK, tam).replace(/\\/g, '/'), tam]);
  }
  return dosyalar;
}

/** XML yorumları atılır: yorumda geçen bir nitelik adı "yazılmış" sayılmaz. */
function xmlYorumsuz(metin) {
  return metin.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Java yorumları atılır. Dize ve karakter sabitleri korunur — "https://…" içindeki çift bölü
 * satır yorumu sanılırsa sabit yarıdan kesilir, test de yanlış şeyi ölçer.
 */
function javaYorumsuz(kaynak) {
  let sonuc = '';
  let durum = 'kod';
  let i = 0;
  while (i < kaynak.length) {
    const simdi = kaynak[i];
    const sonra = kaynak[i + 1];
    if (durum === 'kod') {
      if (simdi === '/' && sonra === '/') { durum = 'satir'; i += 2; continue; }
      if (simdi === '/' && sonra === '*') { durum = 'blok'; i += 2; continue; }
      if (simdi === '"') durum = 'dize';
      else if (simdi === "'") durum = 'karakter';
      sonuc += simdi;
      i += 1;
      continue;
    }
    if (durum === 'dize' || durum === 'karakter') {
      sonuc += simdi;
      if (simdi === '\\') { sonuc += kaynak[i + 1] ?? ''; i += 2; continue; }
      if ((durum === 'dize' && simdi === '"') || (durum === 'karakter' && simdi === "'")) durum = 'kod';
      i += 1;
      continue;
    }
    if (durum === 'satir') {
      if (simdi === '\n') { sonuc += simdi; durum = 'kod'; }
      i += 1;
      continue;
    }
    if (simdi === '*' && sonra === '/') { durum = 'kod'; i += 2; continue; }
    if (simdi === '\n') sonuc += simdi;
    i += 1;
  }
  return sonuc;
}

/** Bir metot gövdesi (yorumsuz kaynaktan, süslü parantez eşleşmesiyle). */
function metotGovdesi(kaynak, ad) {
  const imza = new RegExp(`[\\w<>\\[\\].]+\\s+${ad}\\s*\\([^)]*\\)\\s*\\{`);
  const esleme = kaynak.match(imza);
  assert.ok(esleme, `${ad} metodu bulunamadı`);
  const bas = kaynak.indexOf('{', esleme.index);
  let derinlik = 0;
  for (let i = bas; i < kaynak.length; i += 1) {
    if (kaynak[i] === '{') derinlik += 1;
    else if (kaynak[i] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return kaynak.slice(bas + 1, i);
    }
  }
  throw new Error(`${ad} metodunun gövdesi kapanmıyor`);
}

/** `… ADI = <ifade>;` sağ tarafı. */
function sabitIfadesi(kaynak, ad) {
  const esleme = kaynak.match(new RegExp(`\\b${ad}\\s*=\\s*([^;]+);`));
  return esleme ? esleme[1].trim() : null;
}

/**
 * Dize sabitinin gerçek değeri: sabitler birbirine eklenerek yazıldığında ("https://" + SUNUCU)
 * test de aynı birleştirmeyi yapar — tek kaynak bozulmadan gerçek değer ölçülür.
 */
function dizeSabiti(kaynak, ad, derinlik = 0) {
  assert.ok(derinlik < 5, `${ad} sabiti kendini çağırıyor olabilir`);
  const ifade = sabitIfadesi(kaynak, ad);
  assert.ok(ifade, `${ad} sabiti yok`);
  return ifade
    .split('+')
    .map((parca) => parca.trim())
    .map((parca) => (parca.startsWith('"') && parca.endsWith('"')
      ? parca.slice(1, -1)
      : dizeSabiti(kaynak, parca, derinlik + 1)))
    .join('');
}

/** `<string name="x">…</string>` → Map. */
function dizeTablosu(dosya) {
  const metin = xmlYorumsuz(oku(dosya));
  const tablo = new Map();
  for (const [, ad, deger] of metin.matchAll(/<string\s+name="([^"]+)"\s*>([\s\S]*?)<\/string>/g)) {
    tablo.set(ad, deger);
  }
  return tablo;
}

/** `<style name="x" parent="y">…</style>` → Map(ad → { ebeveyn, maddeler }). */
function temaTablosu(dosya) {
  const metin = xmlYorumsuz(oku(dosya));
  const tablo = new Map();
  const desen = /<style\s+name="([^"]+)"(?:\s+parent="([^"]*)")?\s*(?:\/>|>([\s\S]*?)<\/style>)/g;
  for (const [, ad, ebeveyn, govde] of metin.matchAll(desen)) {
    const maddeler = new Map(
      [...(govde ?? '').matchAll(/<item\s+name="([^"]+)"\s*>([\s\S]*?)<\/item>/g)]
        .map(([, maddeAdi, deger]) => [maddeAdi, deger.trim()]),
    );
    tablo.set(ad, { ebeveyn: ebeveyn ?? null, maddeler });
  }
  return tablo;
}

// --- dosyalar ---------------------------------------------------------------------------------

test('kabuk kaynakları beklenen yerlerde', () => {
  const eksikler = BEKLENEN_DOSYALAR.filter((dosya) => !existsSync(dosya))
    .map((dosya) => relative(KOK, dosya).replace(/\\/g, '/'));
  assert.deepEqual(eksikler, []);
});

// --- manifest ---------------------------------------------------------------------------------

test('ASIL KABUL: manifestte 0 satır uses-permission var (çevrimdışı kabuk izin istemez)', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  const izinler = [...manifest.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map(([, ad]) => ad);
  assert.deepEqual(izinler, [], 'kabukta izin satırı olmamalı (INTERNET dâhil)');
  assert.equal((manifest.match(/<uses-permission/g) ?? []).length, 0);
  assert.equal((manifest.match(/<uses-permission-sdk-23/g) ?? []).length, 0);
  assert.equal((manifest.match(/<permission[\s>]/g) ?? []).length, 0, 'kabuk kendi izni de tanımlamaz');
});

test('ASIL KABUL: hiçbir kaynakta screenOrientation yazılmamış (yön kararı web katmanında, ADR-012)', () => {
  const yazanlar = [];
  for (const [goreli, tam] of kabukDosyalari()) {
    const icerik = goreli.endsWith('.java') ? javaYorumsuz(oku(tam)) : xmlYorumsuz(oku(tam));
    if (icerik.includes('screenOrientation')) yazanlar.push(goreli);
  }
  assert.deepEqual(yazanlar, [], 'yön kilitlenirse ADR-012 (dikeyde uyarı) ölçülemez hâle gelir');
});

test('ASIL KABUL: configChanges kümesi tam (yön/boyut değişiminde etkinlik yeniden kurulmaz)', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  const esleme = manifest.match(/android:configChanges="([^"]+)"/);
  assert.ok(esleme, 'activity üzerinde configChanges yok');

  const yazilanlar = esleme[1].split('|').map((parca) => parca.trim()).filter(Boolean);
  const eksikler = BEKLENEN_CONFIG_CHANGES.filter((deger) => !yazilanlar.includes(deger));
  assert.deepEqual(eksikler, [], `configChanges eksik: ${eksikler.join(', ')}`);
  assert.equal(new Set(yazilanlar).size, yazilanlar.length, `configChanges yinelenen değer taşıyor: ${esleme[1]}`);
});

test('manifest paket adı + etkinlik adı Java kaynağıyla aynı, başlatıcı niyeti tanımlı', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  const paket = manifest.match(/package="([^"]+)"/)?.[1];
  assert.equal(paket, 'com.kraftdcm.tasokey', 'firma standardı paket adı (donmuş alan)');

  const javaPaketi = javaYorumsuz(oku(ETKINLIK)).match(/package\s+([\w.]+);/)?.[1];
  assert.equal(javaPaketi, paket);

  const etkinlikAdi = manifest.match(/<activity[\s\S]*?android:name="([^"]+)"/)?.[1];
  assert.equal(etkinlikAdi, '.OyunEtkinligi');
  assert.match(javaYorumsuz(oku(ETKINLIK)), /class\s+OyunEtkinligi\s+extends\s+Activity/);

  assert.match(manifest, /android.intent.action.MAIN/);
  assert.match(manifest, /android.intent.category.LAUNCHER/);
  assert.match(manifest, /android:exported="true"/, 'başlatıcı etkinliği exported olmak zorunda');
});

test('manifest en düşük/hedef Android sürümünü sabitlemiyor (donmuş alan, derleme anında verilir)', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  assert.equal((manifest.match(/<uses-sdk/g) ?? []).length, 0);
  assert.doesNotMatch(manifest, /minSdkVersion|targetSdkVersion/);
});

// --- WebView ve pencere ------------------------------------------------------------------------

test('ASIL KABUL: WebView ayar listesi tam ve tek yerde (ayarla metodu)', () => {
  const etkinlik = javaYorumsuz(oku(ETKINLIK));
  const govde = metotGovdesi(etkinlik, 'ayarla');

  for (const [metot, arguman, nicin] of BEKLENEN_WEBVIEW_AYARLARI) {
    const desen = new RegExp(`\\.${metot}\\s*\\(\\s*${arguman}\\s*\\)`);
    assert.match(govde, desen, `${metot}(${arguman}) yok — ${nicin}`);
  }

  // Ayar tek kapıdan: `ayarla` dışında WebSettings çağrısı kalmamalı.
  const dis = etkinlik.replace(govde, '');
  const kacaklar = BEKLENEN_WEBVIEW_AYARLARI
    .map(([metot]) => metot)
    .filter((metot) => dis.includes(`.${metot}(`));
  assert.deepEqual(kacaklar, [], 'WebView ayarı ayarla() dışında da yazılmış (iki kaynak)');
});

test('ASIL KABUL: pencereye FLAG_KEEP_SCREEN_ON eklenir (bot oynarken ekran kararmaz)', () => {
  const etkinlik = javaYorumsuz(oku(ETKINLIK));
  assert.match(
    etkinlik,
    /addFlags\s*\(\s*WindowManager\.LayoutParams\.FLAG_KEEP_SCREEN_ON\s*\)/,
    'FLAG_KEEP_SCREEN_ON eklenmemiş',
  );
});

test('ASIL KABUL: başlangıç adresi https://appassets.androidplatform.net/index.html', () => {
  const sunucu = javaYorumsuz(oku(SUNUCU));
  assert.equal(dizeSabiti(sunucu, 'BASLANGIC_ADRESI'), BEKLENEN_BASLANGIC_ADRESI);

  const etkinlik = javaYorumsuz(oku(ETKINLIK));
  assert.match(
    etkinlik,
    /loadUrl\s*\(\s*VarlikSunucusu\.BASLANGIC_ADRESI\s*\)/,
    'etkinlik başlangıç adresini sabitten yüklemiyor',
  );
  const kendiAdresi = etkinlik.match(/"https?:\/\/[^"]*"/g) ?? [];
  assert.deepEqual(kendiAdresi, [], 'etkinlikte elle yazılmış adres var (tek kaynak VarlikSunucusu)');
});

// --- varlık sunucusu ---------------------------------------------------------------------------

test('ASIL KABUL: varlık sunucusu ".." ve kök dışını reddediyor; varlığı yalnız çözülen yoldan açıyor', () => {
  const sunucu = javaYorumsuz(oku(SUNUCU));
  const govde = metotGovdesi(sunucu, 'varlikYolu');

  // ".." yol içinde aranmaz, SEGMENT olarak reddedilir ("..taslar" gibi geçerli ad engellenmesin)
  // ve reddin karşılığı null dönmektir.
  assert.match(govde, /\.equals\s*\(\s*"\.\."\s*\)\s*\)\s*return\s+null/,
    '".." segmenti için null dönen kol yok');
  assert.match(govde, /for\s*\([^)]*split\s*\(\s*"\/"/, '".." denetimi segmentlere ayırdıktan sonra yapılmalı');
  assert.match(govde, /startsWith\s*\(\s*KOK\s*\+\s*"\/"\s*\)[\s\S]{0,40}return\s+null/,
    'kök dışına düşen sonucu reddeden son kapı yok');
  assert.match(govde, /indexOf\s*\(\s*'\\\\'\s*\)/, 'ters bölü taşıyan yol reddedilmiyor');
  assert.match(govde, /%2e/, 'yüzde kaçışlı nokta (%2e) reddedilmiyor');

  // Varlık açan tek çağrı, çözücünün döndürdüğü değişkeni açar ve null denetiminden sonra gelir.
  const yanit = metotGovdesi(sunucu, 'yanit');
  const atama = yanit.match(/String\s+(\w+)\s*=\s*varlikYolu\s*\(/);
  assert.ok(atama, 'yanit() yolu varlikYolu() ile çözmüyor');
  const degisken = atama[1];

  const acmalar = [...sunucu.matchAll(/\.open\s*\(\s*([^)]*)\)/g)].map(([, arguman]) => arguman.trim());
  assert.deepEqual(acmalar, [degisken], `varlık açan çağrı yalnız çözülen yolu açmalı: ${acmalar.join(', ')}`);

  const denetim = yanit.search(new RegExp(`if\\s*\\(\\s*${degisken}\\s*==\\s*null\\s*\\)\\s*return`));
  const acma = yanit.indexOf('.open(');
  assert.ok(denetim >= 0, 'çözülen yol için null denetimi yok');
  assert.ok(denetim < acma, 'null denetimi varlık açmadan önce gelmeli');

  // Başka sunucuya ait istek karşılanmaz (kesme yalnız kendi adımız için).
  assert.match(yanit, /SUNUCU\.equals\s*\(\s*adres\.getHost\s*\(\s*\)\s*\)/);
});

test('ASIL KABUL: MIME tablosunda html/css/js/json/svg var; bilinmeyen uzantıda varsayılan tür', () => {
  const sunucu = javaYorumsuz(oku(SUNUCU));
  const tanim = sabitIfadesi(sunucu, 'MIME_TABLOSU');
  assert.ok(tanim, 'MIME_TABLOSU yok');

  const tablo = new Map(
    [...tanim.matchAll(/\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}/g)].map(([, uzanti, mime]) => [uzanti, mime]),
  );
  for (const [uzanti, beklenen] of BEKLENEN_MIME) {
    assert.equal(tablo.get(uzanti), beklenen, `${uzanti} satırı eksik ya da yanlış`);
  }

  assert.equal(dizeSabiti(sunucu, 'MIME_VARSAYILAN'), 'application/octet-stream');
  // Uzantı karşılaştırması tek yerde: mimeTuru tabloyu dolaşır, kendi koşulunu yazmaz.
  const mimeGovdesi = metotGovdesi(sunucu, 'mimeTuru');
  assert.match(mimeGovdesi, /MIME_TABLOSU/);
  assert.match(mimeGovdesi, /toLowerCase\s*\(\s*Locale\.ROOT\s*\)/, 'uzantı Locale.ROOT ile küçültülmeli');
  assert.match(mimeGovdesi, /return\s+MIME_VARSAYILAN/);
});

test('varlık kökü tek sabitten gelir (assets/oyun) ve çözülen yol onunla başlar', () => {
  const sunucu = javaYorumsuz(oku(SUNUCU));
  assert.equal(dizeSabiti(sunucu, 'KOK'), 'oyun');
  assert.equal(dizeSabiti(sunucu, 'VARSAYILAN_SAYFA'), 'index.html');
  assert.equal(dizeSabiti(sunucu, 'SUNUCU'), 'appassets.androidplatform.net');
  assert.match(metotGovdesi(sunucu, 'varlikYolu'), /new StringBuilder\s*\(\s*KOK\s*\)/);
});

// --- dizeler (TR/EN) ---------------------------------------------------------------------------

test('ASIL KABUL: TR ve EN dize anahtar kümeleri birebir aynı ve çıkış sorusu ikisinde de dolu', () => {
  const en = dizeTablosu(DIZELER_EN);
  const tr = dizeTablosu(DIZELER_TR);

  assert.ok(en.size > 0, 'varsayılan (EN) dize dosyası boş');
  assert.deepEqual([...tr.keys()].sort(), [...en.keys()].sort(), 'TR ve EN anahtar kümeleri aynı değil');

  for (const [ad, tablo] of [['EN', en], ['TR', tr]]) {
    const bos = [...tablo].filter(([, deger]) => deger.trim() === '').map(([anahtar]) => anahtar);
    assert.deepEqual(bos, [], `${ad} dosyasında boş değer var`);
  }

  for (const anahtar of ['cikis_basligi', 'cikis_sorusu', 'cikis_evet', 'cikis_hayir']) {
    assert.ok(en.get(anahtar)?.trim(), `EN ${anahtar} boş`);
    assert.ok(tr.get(anahtar)?.trim(), `TR ${anahtar} boş`);
  }
  assert.notEqual(
    tr.get('cikis_sorusu'), en.get('cikis_sorusu'),
    'çıkış sorusu iki dilde aynı metin — çeviri yapılmamış',
  );
});

test('ASIL KABUL: kabukta sabit metin yok — kullanılan her dize anahtarı iki dilde de tanımlı', () => {
  const en = dizeTablosu(DIZELER_EN);
  const tr = dizeTablosu(DIZELER_TR);

  const kullanilan = new Set();
  for (const dosya of [ETKINLIK, SUNUCU]) {
    for (const [, ad] of javaYorumsuz(oku(dosya)).matchAll(/R\.string\.(\w+)/g)) kullanilan.add(ad);
  }
  for (const [, ad] of xmlYorumsuz(oku(MANIFEST)).matchAll(/@string\/(\w+)/g)) kullanilan.add(ad);

  const tanimsizlar = [...kullanilan].filter((ad) => !en.has(ad) || !tr.has(ad)).sort();
  assert.deepEqual(tanimsizlar, [], `kullanılan ama tanımsız anahtar: ${tanimsizlar.join(', ')}`);

  const kullanilmayanlar = [...en.keys()].filter((ad) => !kullanilan.has(ad)).sort();
  assert.deepEqual(kullanilmayanlar, [], `tanımlı ama hiç kullanılmayan anahtar: ${kullanilmayanlar.join(', ')}`);

  // Çıkış penceresinin metni koddan değil dizelerden gelir.
  const etkinlik = javaYorumsuz(oku(ETKINLIK));
  for (const kurucu of ['setTitle', 'setMessage', 'setPositiveButton', 'setNegativeButton']) {
    assert.doesNotMatch(etkinlik, new RegExp(`${kurucu}\\s*\\(\\s*"`), `${kurucu} elle yazılmış metin alıyor`);
  }
  assert.match(etkinlik, /setPositiveButton\s*\(\s*R\.string\.cikis_evet/);
  assert.match(etkinlik, /setNegativeButton\s*\(\s*R\.string\.cikis_hayir/);
});

// --- tema ---------------------------------------------------------------------------------------

test('tema platform temasından türer; çentik maddesi yalnız values-v28, ortak maddeler tek kaynakta', () => {
  const manifest = xmlYorumsuz(oku(MANIFEST));
  const temaAdi = manifest.match(/android:theme="@style\/(\w+)"/)?.[1];
  assert.ok(temaAdi, 'application üzerinde tema yok');

  const temel = temaTablosu(TEMA);
  const v28 = temaTablosu(TEMA_V28);

  assert.ok(temel.has(temaAdi), `${temaAdi} res/values/styles.xml'de tanımlı değil`);
  assert.ok(v28.has(temaAdi), `${temaAdi} res/values-v28/styles.xml'de tanımlı değil`);

  const ebeveynAdi = temel.get(temaAdi).ebeveyn;
  assert.ok(ebeveynAdi && temel.has(ebeveynAdi), `${temaAdi} ortak maddeleri taşıyan bir temelden türemeli`);
  assert.equal(v28.get(temaAdi).ebeveyn, ebeveynAdi, 'v28 teması aynı temelden türemeli (madde kopyalanmasın)');
  assert.match(temel.get(ebeveynAdi).ebeveyn, /^@android:style\//, 'temel tema platform temasından türemeli');

  const cutout = 'android:windowLayoutInDisplayCutoutMode';
  assert.equal(v28.get(temaAdi).maddeler.get(cutout), 'shortEdges', 'v28 temasında çentik maddesi yok');
  for (const [ad, tema] of temel) {
    assert.equal(tema.maddeler.has(cutout), false, `çentik maddesi API 28 öncesi temada yazılmış: ${ad}`);
  }
  assert.equal(temel.get(temaAdi).maddeler.size, 0, 'values/styles.xml içindeki tema maddeleri temelde durmalı');
});

// --- bağımlılık yokluğu -------------------------------------------------------------------------

test('ASIL KABUL: kabuk kaynaklarında androidx / android.support hiç geçmiyor (ADR-001)', () => {
  const bulgular = [];
  for (const [goreli, tam] of kabukDosyalari()) {
    const icerik = oku(tam);
    for (const yasak of ['androidx', 'android.support']) {
      if (icerik.includes(yasak)) bulgular.push(`${goreli}: ${yasak}`);
    }
  }
  assert.deepEqual(bulgular, [], 'kabuk yalnız platform sınıflarını kullanır (dış kütüphane yok)');
});

test('kabuk sınıfları yalnız android.* ve java.* paketlerini içe alır', () => {
  const yabancilar = [];
  for (const dosya of [ETKINLIK, SUNUCU]) {
    for (const [, paket] of javaYorumsuz(oku(dosya)).matchAll(/^import\s+([\w.]+);/gm)) {
      if (!/^(android|java|javax)\./.test(paket)) {
        yabancilar.push(`${relative(KOK, dosya).replace(/\\/g, '/')}: ${paket}`);
      }
    }
  }
  assert.deepEqual(yabancilar, []);
});
