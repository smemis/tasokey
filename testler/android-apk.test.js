import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kabukBul } from './yardimci/android-sahte-unity.js';
import { zipYaz } from './yardimci/android-zip.js';

// tasokey#57 (üst iş tasokey#52) — APK doğrulaması (`android/dogrula.ps1`) + depo taramaları.
//
// NİÇİN: `apksigner verify` "paket bozulmadı" der, "oyun açılır" demez. Gerekçe ölçüldü
// (tasokey#56): APK derlendi, hizalandı, imzası doğrulandı — ama `aapt2 link -A` varlık girdilerini
// Windows ayracıyla yazdığı için (`assets/oyun\arayuz\ekran.js`) cihazda HİÇBİR varlık
// bulunamıyordu. `dogrula.ps1` APK'nın İÇİNE bakar: `docs/` ne verdi, APK ne taşıyor?
//
// Bu dosya üç şey ölçer:
//   A) `dogrula.ps1`in kendi mantığı — SENTETİK bir APK (gerçek zip, gerçek `docs/` içeriği)
//      üzerinde. Gerçek araç zinciri, cihaz, SDK ve imza anahtarı GEREKMEZ; her bozma (eksik,
//      fazla, kısa dosya, bozuk ayraç, yanlış varlık kökü, yinelenen ad) ayrı ayrı kırmızı yanar.
//      Gerçek APK ile koşunun kanıtı iş klasöründedir (`is/tasokey-57/`).
//   B) Depoda anahtar/parola izi yok — uzantı taraması + değer taşıyan atama/bayrak/yol kalıpları.
//   C) `android/` altında dış derleme sistemi, uyumluluk kütüphanesi ve indirme adresi yok
//      (ADR-001 sıfır bağımlılık, ADR-020 madde 1) + `android/OKU.md`deki donmuş sayılar
//      `derle.ps1`in ayar bloğuyla aynı.
//
// B ve C taramaları **çalışma ağacını** okur: `git ls-files --cached --others --exclude-standard`
// → izlenen + henüz işlenmemiş dosyalar, `.gitignore`dakiler (ör. `android/cikti/` derleme çıktısı)
// dışarıda. Yalnız dizine (`git ls-files`) bakılsa yeni yazılan bir dosya ilk işlemeye kadar
// taranmadan kalırdı — tam da izin kaçabileceği an.

const KOK = join(import.meta.dirname, '..');
const BETIK = join(KOK, 'android', 'dogrula.ps1');
const WEB_KOK = join(KOK, 'docs');
const DERLE_BETIGI = join(KOK, 'android', 'derle.ps1');
const OKU_BELGESI = join(KOK, 'android', 'OKU.md');

const KABUK = kabukBul();
const ATLA = KABUK ? false : 'PowerShell bulunamadı (betik yalnız Windows kabuğunda çalışır)';

const GECICI_KOK = KABUK ? mkdtempSync(join(tmpdir(), 'tasokey-dogrula-')) : null;
after(() => {
  if (GECICI_KOK) rmSync(GECICI_KOK, { recursive: true, force: true });
});

// --- Depodan okunan tek kaynaklar ---------------------------------------------

function dosyaBul(kok, ad) {
  for (const goreli of readdirSync(kok, { recursive: true })) {
    if (goreli.endsWith(ad)) return join(kok, goreli);
  }
  return null;
}

/** APK içindeki varlık kökü: tek kaynak VarlikSunucusu.java'daki KOK sabiti (ADR-020/6). */
function varlikKokunuOku() {
  const dosya = dosyaBul(join(KOK, 'android', 'kabuk', 'java'), 'VarlikSunucusu.java');
  assert.ok(dosya, 'VarlikSunucusu.java bulunamadı');
  const es = /static\s+final\s+String\s+KOK\s*=\s*"([^"]+)"/.exec(readFileSync(dosya, 'utf8'));
  assert.ok(es, 'VarlikSunucusu.java içinde KOK sabiti yok');
  return es[1];
}

const VARLIK_KOKU = varlikKokunuOku();
const VARLIK_ONEKI = `assets/${VARLIK_KOKU}/`;

/** `docs/` altındaki bütün dosyalar (APK'ya girmesi beklenen varlıklar). */
function webDosyalari() {
  const liste = [];
  for (const goreli of readdirSync(WEB_KOK, { recursive: true })) {
    const tam = join(WEB_KOK, goreli);
    if (statSync(tam).isFile()) liste.push({ goreli: goreli.replace(/\\/g, '/'), tam });
  }
  return liste.sort((a, b) => a.goreli.localeCompare(b.goreli));
}

const WEB_SAYISI = webDosyalari().length;

// --- Sentetik APK -------------------------------------------------------------

// Gerçek APK'nın varlık dışı girdileri: doğrulama iskeleti de ölçtüğü için taslakları burada durur
// (içerikleri anlamsız; `dogrula.ps1` bu girdilerin VARLIĞINA bakar, içine bakmaz).
const ISKELET = [
  { ad: 'AndroidManifest.xml', veri: Buffer.from('SAHTE-IKILI-MANIFEST', 'ascii') },
  { ad: 'resources.arsc', veri: Buffer.from('SAHTE-KAYNAK-TABLOSU', 'ascii') },
  { ad: 'classes.dex', veri: Buffer.from('SAHTE-DEX', 'ascii') },
  { ad: 'META-INF/CERT.SF', veri: Buffer.from('SAHTE-IMZA-OZETI', 'ascii') },
  { ad: 'META-INF/CERT.RSA', veri: Buffer.from('SAHTE-IMZA-BLOGU', 'ascii') },
];

/** `docs/` içeriğinin APK varlıkları olarak hâli (ad + GERÇEK bayt). */
function varlikGirdileri() {
  return webDosyalari().map(({ goreli, tam }) => ({
    ad: VARLIK_ONEKI + goreli,
    veri: readFileSync(tam),
  }));
}

/**
 * Sentetik APK yazar.
 * @param {string} ad geçici dosya adı
 * @param {(girdiler: {ad: string, veri: Buffer}[]) => {ad: string, veri: Buffer}[]} degistir
 *   bozma işlevi (verilmezse kusursuz APK)
 */
function apkKur(ad, degistir = (g) => g) {
  const yol = join(GECICI_KOK, `${ad}.apk`);
  zipYaz(yol, degistir([...ISKELET, ...varlikGirdileri()]));
  return yol;
}

function kos(apk, arglar = []) {
  const tamArglar = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BETIK];
  if (apk) tamArglar.push('-Apk', apk);
  tamArglar.push('-Json', ...arglar);

  const sonuc = spawnSync(KABUK, tamArglar, { encoding: 'utf8', timeout: 120_000 });
  assert.equal(sonuc.error, undefined, `kabuk çalıştırılamadı: ${sonuc.error}`);
  const cikti = `${sonuc.stdout ?? ''}${sonuc.stderr ?? ''}`;
  const jsonSatiri = cikti.split('\n').reverse().find((s) => s.trimStart().startsWith('{'));
  assert.ok(jsonSatiri, `-Json verildiği hâlde JSON satırı basılmadı. Çıktı:\n${cikti}`);
  return { kod: sonuc.status, cikti, json: JSON.parse(jsonSatiri) };
}

const ONBELLEK = new Map();
function birKez(ad, uretici) {
  if (!ONBELLEK.has(ad)) ONBELLEK.set(ad, uretici());
  return ONBELLEK.get(ad);
}

function tamKosu() {
  return birKez('tam', () => kos(apkKur('tam')));
}

// --- A) ASIL KABUL: docs/ ↔ APK karşılaştırması -------------------------------

test('ASIL KABUL: kusursuz APK → eksik 0, fazla 0, boyutlar eşit (n/n), çıkış kodu 0', { skip: ATLA }, () => {
  const { kod, cikti, json } = tamKosu();

  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  assert.equal(json.sonuc, 'tamam');
  assert.equal(json.webSayisi, WEB_SAYISI, 'docs/ dosya sayısı okunamamış');
  assert.equal(json.apkVarlikSayisi, WEB_SAYISI);
  assert.equal(json.eslesen, WEB_SAYISI, 'eşleşme ad + sıkıştırılmamış boy üzerinden sayılmalı');
  assert.deepEqual(json.eksikler, []);
  assert.deepEqual(json.fazlalar, []);
  assert.deepEqual(json.boyutFarklari, []);
  assert.deepEqual(json.tersBolulular, []);
  assert.deepEqual(json.yinelenenler, []);
  assert.deepEqual(json.kusurlar, []);

  // İnsan raporu da aynı sayıları yazar (Masa günlüğe bakar, JSON'a değil).
  assert.match(cikti, new RegExp(`eşleşen\\s+: ${WEB_SAYISI}/${WEB_SAYISI}`));
  assert.match(cikti, /eksik\s+: 0/);
  assert.match(cikti, /fazla\s+: 0/);
  assert.match(cikti, /boyut farkı\s+: 0/);
  assert.match(cikti, /ters bölülü\s+: 0/);
  assert.match(cikti, /SONUÇ\s+: TAMAM/);
  assert.doesNotMatch(cikti, /KUSUR/);
});

test("ASIL KABUL: docs/'tan bir dosya APK'ya girmemişse eksik sayılır (kod 4)", { skip: ATLA }, () => {
  const hedef = `${VARLIK_ONEKI}index.html`;
  const apk = apkKur('eksik', (g) => g.filter((girdi) => girdi.ad !== hedef));
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.deepEqual(json.eksikler, [hedef]);
  assert.equal(json.eslesen, WEB_SAYISI - 1);
  assert.deepEqual(json.fazlalar, []);
  assert.match(cikti, /eksik\s+: 1/);
  assert.ok(cikti.includes(hedef), `eksik girdinin adı basılmamış. Çıktı:\n${cikti}`);
  assert.match(cikti, /KUSUR\s+: eksik varlık 1/);
  assert.match(cikti, /SONUÇ\s+: BAŞARISIZ/);
});

test("ASIL KABUL: APK'da docs/ karşılığı olmayan varlık fazla sayılır (kod 4)", { skip: ATLA }, () => {
  const fazla = `${VARLIK_ONEKI}eski/kaldirilmis.js`;
  const apk = apkKur('fazla', (g) => [...g, { ad: fazla, veri: Buffer.from('eski', 'ascii') }]);
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.deepEqual(json.fazlalar, [fazla]);
  assert.deepEqual(json.eksikler, []);
  assert.equal(json.eslesen, WEB_SAYISI, 'fazla girdi eşleşmeyi bozmamalı');
  assert.match(cikti, /fazla\s+: 1/);
  assert.ok(cikti.includes(fazla));
  assert.match(cikti, /KUSUR\s+: fazla varlık 1/);
});

test('ASIL KABUL: aynı adlı girdinin boyu farklıysa boyut farkı sayılır (kod 4)', { skip: ATLA }, () => {
  const hedef = `${VARLIK_ONEKI}diller/tr.json`;
  const tamBoy = statSync(join(WEB_KOK, 'diller', 'tr.json')).size;
  const apk = apkKur('boyut', (g) => g.map((girdi) => (girdi.ad === hedef
    ? { ad: girdi.ad, veri: girdi.veri.slice(0, 10) } : girdi)));
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.equal(json.boyutFarklari.length, 1);
  assert.ok(json.boyutFarklari[0].startsWith(hedef), json.boyutFarklari[0]);
  // Bulgu satırı İKİ sayıyı da yazar: hangi tarafın eksik olduğu günlükten okunabilsin.
  assert.ok(json.boyutFarklari[0].includes('10') && json.boyutFarklari[0].includes(String(tamBoy)),
    `boyut farkı satırı iki boyu da yazmalı: ${json.boyutFarklari[0]}`);
  assert.equal(json.eslesen, WEB_SAYISI - 1, 'boyu farklı girdi eşleşmiş sayılmamalı');
  assert.deepEqual(json.eksikler, [], 'adı yerinde olan girdi eksik sayılmamalı');
  assert.match(cikti, /boyut farkı\s+: 1/);
});

test('ASIL KABUL (tasokey#56 regresyonu): ters bölülü girdi adı yakalanır (kod 4)', { skip: ATLA }, () => {
  // Gerçek kusur: `aapt2 link -A` Windows'ta `assets/oyun\arayuz\ekran.js` yazıyor; APK derlenir,
  // imza doğrulanır, cihazda AssetManager `assets/oyun/arayuz/ekran.js` arar ve bulamaz.
  const dogru = `${VARLIK_ONEKI}arayuz/ekran.js`;
  const bozuk = `${VARLIK_ONEKI}arayuz\\ekran.js`;
  const apk = apkKur('ters-bolu', (g) => g.map((girdi) => (girdi.ad === dogru
    ? { ad: bozuk, veri: girdi.veri } : girdi)));
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.deepEqual(json.tersBolulular, [bozuk]);
  assert.deepEqual(json.eksikler, [dogru], 'doğru adlı girdi eksik sayılmalı');
  assert.deepEqual(json.fazlalar, [bozuk], 'bozuk adlı girdi fazla sayılmalı');
  assert.match(cikti, /ters bölülü\s+: 1/);
  assert.match(cikti, /KUSUR\s+:.*ters bölülü ad 1/);
});

test('ASIL KABUL: varlıklar yanlış köke kopyalanmışsa hepsi eksik + hepsi fazla olur', { skip: ATLA }, () => {
  // Varlık kökü `VarlikSunucusu.java`daki KOK sabitidir; `assets/docs/…` gibi başka bir klasör
  // (ör. web klasörünün adı) kullanılırsa kabuk hiçbir varlığı sunamaz — doğrulama bunu görür.
  const yanlis = 'assets/docs/';
  const apk = apkKur('yanlis-kok', (g) => g.map((girdi) => (girdi.ad.startsWith(VARLIK_ONEKI)
    ? { ad: yanlis + girdi.ad.slice(VARLIK_ONEKI.length), veri: girdi.veri } : girdi)));
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.equal(json.eksikler.length, WEB_SAYISI);
  assert.equal(json.fazlalar.length, WEB_SAYISI);
  assert.equal(json.eslesen, 0);
  assert.equal(json.varlikKoku, VARLIK_ONEKI, 'doğrulama kökü kaynaktan okumalı');
  assert.match(cikti, new RegExp(`Varlık kökü\\s+: ${VARLIK_ONEKI}\\s+\\[VarlikSunucusu.java → KOK\\]`));
});

test('ASIL KABUL: aynı girdi adı iki kez varsa yineleme sayılır (kod 4)', { skip: ATLA }, () => {
  // `aapt add` ve .NET ZipArchive ikisi de zip'in sonuna ekler: aynı ad iki kez girebilir ve
  // hangisinin okunduğu okuyucuya bağlı olur (sessiz kusur).
  const hedef = `${VARLIK_ONEKI}index.html`;
  const apk = apkKur('yinelenen', (g) => [...g, { ad: hedef, veri: Buffer.from('<html>başka</html>', 'utf8') }]);
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 4, `çıkış kodu 4 beklenirdi. Çıktı:\n${cikti}`);
  assert.deepEqual(json.yinelenenler, [hedef]);
  assert.match(cikti, /yinelenen ad\s+: 1/);
});

test('ASIL KABUL: classes.dex ya da AndroidManifest.xml yoksa kusur yazılır (kod 4)', { skip: ATLA }, () => {
  for (const [ad, girdi] of [['dex-yok', 'classes.dex'], ['manifest-yok', 'AndroidManifest.xml']]) {
    const apk = apkKur(ad, (g) => g.filter((x) => x.ad !== girdi));
    const { kod, cikti, json } = kos(apk);

    assert.equal(kod, 4, `${girdi} yokken kod 4 beklenirdi. Çıktı:\n${cikti}`);
    assert.ok(json.kusurlar.some((k) => k.startsWith(girdi)), `kusur satırı yok: ${json.kusurlar.join(' · ')}`);
    assert.deepEqual(json.eksikler, [], 'iskelet eksikliği varlık karşılaştırmasını bozmamalı');
    assert.match(cikti, /YOK/);
  }
});

test('imza girdisi RAPOR satırıdır: sayılır, ama imzasız APK doğrulamayı bozmaz', { skip: ATLA }, () => {
  // İmzanın geçerliliğini `apksigner verify` ölçer (derle.ps1 11. adım); bu betik onu iddia etmez,
  // yoksa "imza girdisi 0" diye yazar ve ara ürün APK'ları da ölçülebilir kalır.
  const apk = apkKur('imzasiz', (g) => g.filter((x) => !x.ad.startsWith('META-INF/')));
  const { kod, cikti, json } = kos(apk);

  assert.equal(kod, 0, `imzasız ara ürün de ölçülebilmeli. Çıktı:\n${cikti}`);
  assert.equal(json.imzaGirdisi, 0);
  assert.equal(tamKosu().json.imzaGirdisi, 2, "imzalı APK'da META-INF imza girdileri sayılmalı");
  assert.match(cikti, /imza girdisi\s+: 0/);
  assert.match(cikti, /geçerliliği apksigner verify ölçer/);
});

// --- A) Girdi denetimi --------------------------------------------------------

test('ASIL KABUL: -Apk verilmezse 0 dışı kod ve eksiğin adı basılır', { skip: ATLA }, () => {
  const { kod, cikti } = kos(null);
  assert.equal(kod, 2, `çıkış kodu 2 beklenirdi. Çıktı:\n${cikti}`);
  assert.match(cikti, /zorunlu parametre eksik: -Apk/);
});

test('olmayan APK, zip olmayan dosya ve olmayan -Web klasörü ayrı kodlarla reddedilir', { skip: ATLA }, () => {
  const yokYol = join(GECICI_KOK, 'hic-yok.apk');
  const yok = kos(yokYol);
  assert.equal(yok.kod, 2, yok.cikti);
  assert.match(yok.cikti, /-Apk dosyası yok/);
  assert.ok(yok.cikti.includes(yokYol));

  const zipDegil = join(GECICI_KOK, 'zip-degil.apk');
  writeFileSync(zipDegil, 'bu dosya zip değil', 'utf8');
  const bozuk = kos(zipDegil);
  assert.equal(bozuk.kod, 3, `zip olmayan dosyada kod 3 beklenirdi. Çıktı:\n${bozuk.cikti}`);
  assert.match(bozuk.cikti, /APK zip olarak okunamadı/);

  const webYok = kos(apkKur('web-yok-icin'), ['-Web', join(GECICI_KOK, 'olmayan-web')]);
  assert.equal(webYok.kod, 2, webYok.cikti);
  assert.match(webYok.cikti, /-Web klasörü yok/);
});

test('-Web ile başka bir web klasörü ölçülebilir (varsayılan docs)', { skip: ATLA }, () => {
  const { cikti, json } = kos(apkKur('web-parametresi'), ['-Web', WEB_KOK]);
  assert.equal(json.web, WEB_KOK, 'verilen web klasörü raporda yazılmalı');
  assert.equal(json.webSayisi, WEB_SAYISI);
  assert.match(cikti, /Web kaynağı\s+: /);
  assert.equal(tamKosu().json.web, WEB_KOK, '-Web verilmezse depo kökündeki docs ölçülmeli');
});

// --- A) Betiğin kendi kuralları ----------------------------------------------

test("dogrula.ps1 varlık kökünü kendi içine YAZMAZ (tek kaynak VarlikSunucusu.java)", () => {
  const kod = readFileSync(BETIK, 'utf8').replace(/<#[\s\S]*?#>/g, ' ').replace(/#[^\n]*/g, ' ');
  assert.doesNotMatch(kod, new RegExp(`["']${VARLIK_KOKU}["']`),
    `varlık kökü betiğe sabit yazılmış: ${VARLIK_KOKU}`);
  assert.match(kod, /VarlikSunucusu\.java/, 'varlık kökünün kaynağı okunmuyor');
});

test("dogrula.ps1 UTF-8 BOM ile saklanır (PowerShell 5.1 BOM'suz dosyayı ANSI sanar)", () => {
  assert.deepEqual([...readFileSync(BETIK).slice(0, 3)], [0xEF, 0xBB, 0xBF], "dogrula.ps1 BOM'u düşmüş");
});

// --- Depo taramaları: dosya listesi ------------------------------------------

/**
 * Çalışma ağacındaki (izlenen + yeni, `.gitignore` dışında) dosyalar. Depo taramasının ölçtüğü
 * küme burasıdır: `android/cikti/` gibi üretilmiş çıktı dışarıda kalır, yeni yazılmış ama henüz
 * işlenmemiş dosya İÇERİDE kalır.
 */
function depoDosyalari() {
  const sonuc = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(sonuc.status, 0,
    `git ls-files koşmadı → depo taraması ölçülemez: ${sonuc.stderr ?? sonuc.error}`);
  return sonuc.stdout.split('\0').filter((ad) => ad.length > 0);
}

/** Metin olarak okunabilen dosyalar (NUL baytı taşıyan ikili dosyalar ayrı sayılır). */
function metinDosyalari(dosyalar) {
  const metinler = [];
  let ikili = 0;
  for (const goreli of dosyalar) {
    const bayt = readFileSync(join(KOK, goreli));
    if (bayt.includes(0)) { ikili++; continue; }
    metinler.push({ goreli, icerik: bayt.toString('utf8') });
  }
  return { metinler, ikili };
}

function satirlar(icerik) {
  return icerik.split('\n');
}

// --- B) Anahtar / parola izi -------------------------------------------------

// Uzantı ve dosya adı kalıbı: anahtar deposu, parola dosyası, özel anahtar, imza malzemesi.
const SIR_UZANTILARI = [
  '.jks', '.keystore', '.jceks', '.bks', '.p12', '.pfx', '.pem', '.key', '.parola',
  '.ppk', '.p8', '.asc', '.gpg',
];
const SIR_DOSYA_ADLARI = [
  'keystore.properties', 'signing.properties', 'local.properties', 'id_rsa', 'id_dsa', '.netrc',
];

// İçerik kalıpları. Hepsi DEĞERE bakar, sözcüğe değil: `derle.ps1` parolayı parametre olarak alır
// ve `--ks-pass file:<dosya>` ile geçer; "parola" sözcüğünün belgede geçmesi iz değildir, bir
// parolanın ya da anahtar yolunun YAZILI olması izdir.
//
// Kalıpların kaynağı burada kendi kendini yakalamayacak biçimde yazılmıştır (işleç karakter
// sınıfıyla: anahtar sözcüğün hemen ardından düz `=`/`:` gelmez).
const SIR_SOZCUKLERI = 'store_?pass(?:word)?|key_?pass(?:word)?|pass(?:word|wd)?|parola|sifre|keystore';
const SIR_KALIPLARI = [
  {
    ad: 'parola ataması (yazılı değer)',
    desen: new RegExp(String.raw`\b(?:${SIR_SOZCUKLERI})\b\s*[=:]\s*(['"])[^'"\r\n]+\1`, 'i'),
  },
  {
    // apksigner parolayı bir KAYNAK önekiyle alır (`file:` / `env:` / `stdin`); düz metin kaynağı
    // tek bir önektir ve ÖLÇÜLDÜ: `file:` dışındaki kullanım bu depoda hiç yok. Bayrak adının
    // düz yazıda anılması (açıklama, hata metni, test adı) iz DEĞİLDİR — kalıp bu yüzden bayrağa
    // değil, parolanın kendisini taşıyan kaynak biçimine bakar.
    ad: 'düz metin parola kaynağı',
    desen: /\bpass[:]\S/i,
  },
  {
    // keytool/jarsigner bayrakları parolayı DOĞRUDAN alır (önek kavramı yoktur) → değer taşıyan
    // her kullanım yazılı paroladır. Dolaylı değerler (değişken, yer tutucu) ayıklanır.
    ad: 'parolayı doğrudan alan araç bayrağı',
    desen: /(?:-storepass|-keypass|-srcstorepass|-deststorepass)\s+(?!["'`]?[$<«%])/i,
  },
  {
    ad: 'anahtar deposu / parola dosyasının tam yolu',
    desen: /(?:[A-Za-z][:]\\|\\\\)[^\s"'|)]*\.(?:jks|keystore|jceks|bks|p12|pfx|parola)\b/i,
  },
  {
    ad: 'kapalı anahtar klasörünün yolu',
    desen: /(?:[A-Za-z][:]\\|\\\\)[^\s"'|)]*Guvenli/i,
  },
  {
    ad: 'imza malzemesi bloğu',
    desen: /-{5}BEGIN [A-Z ]*(?:PRIVATE KEY|CERTIFICATE)-{5}/,
  },
];

// Bilinen muafiyetler: her biri dosya + satır kalıbı + gerekçe. Muafiyetin HÂLÂ eşleştiği ayrıca
// ölçülür — kalıp ya da satır değişince muafiyet sessizce birikmesin, kırmızı yansın.
const SIR_MUAFIYETLERI = [
  {
    dosya: 'testler/android-derle.test.js',
    desen: /ofis-deneme-parolasi/,
    neden: 'derleme öz-testinin SAHTE parolası: geçici klasörde üretilen sahte anahtar deposu için, '
      + 'gerçek bir anahtarı açmaz',
  },
];

function sirBulgulari() {
  const { metinler, ikili } = metinDosyalari(depoDosyalari());
  const bulgular = [];
  for (const { goreli, icerik } of metinler) {
    satirlar(icerik).forEach((satir, i) => {
      for (const { ad, desen } of SIR_KALIPLARI) {
        if (!desen.test(satir)) continue;
        const muaf = SIR_MUAFIYETLERI.some((m) => m.dosya === goreli && m.desen.test(satir));
        if (muaf) continue;
        bulgular.push(`${goreli}:${i + 1} [${ad}]`);
      }
    });
  }
  return { bulgular, taranan: metinler.length, ikili };
}

test('ASIL KABUL: depoda anahtar/parola uzantısı taşıyan dosya yok (0)', () => {
  const dosyalar = depoDosyalari();
  assert.ok(dosyalar.length > 50, `depo listesi okunamadı (${dosyalar.length} dosya)`);

  const bulgular = dosyalar.filter((goreli) => {
    const ad = goreli.split('/').pop().toLowerCase();
    return SIR_UZANTILARI.some((u) => ad.endsWith(u)) || SIR_DOSYA_ADLARI.includes(ad);
  });
  assert.deepEqual(bulgular, [], 'anahtar/parola dosyası depoya girmiş (donmuş alan: anahtar Masa\'da durur)');
});

test('ASIL KABUL: depoda yazılı parola, anahtar yolu ya da imza malzemesi yok (0)', () => {
  const { bulgular, taranan, ikili } = sirBulgulari();
  assert.ok(taranan > 50, `tarama kapsamı küçük görünüyor: ${taranan} metin dosyası (${ikili} ikili)`);
  assert.deepEqual(bulgular, [], `anahtar/parola izi bulundu (${taranan} dosya tarandı)`);
});

test('izi tarayan kalıplar gerçekten yakalıyor (muafiyetler hâlâ canlı)', () => {
  // Tarama "hiçbir şey bulamıyor" diye değil, "aradığını bulabiliyor" diye yeşil olmalı.
  //
  // Örnek satırlar PARÇA PARÇA kurulur: kaynağa düz yazılsalar taramanın kendisi bu dosyayı iz
  // sanar ve yukarıdaki ölçüm kırmızı yanardı (kalıplar bütün çalışma ağacını okuyor, bu dosya da
  // onun içinde). Birleştirmeden sonra kalıbın gördüğü metin gerçek izin aynısıdır.
  const ESITTIR = '=';
  const BOLU = '\\';
  const TIRE5 = '-'.repeat(5);
  const ornekler = [
    [`password${ESITTIR}'1234'`, 'parola ataması (yazılı değer)'],
    [`apksigner sign --ks-pass pass${':'}1234 app.apk`, 'düz metin parola kaynağı'],
    [`keytool -list -storepass${' '}1234`, 'parolayı doğrudan alan araç bayrağı'],
    [`-Anahtar D:${BOLU}bir${BOLU}yer${BOLU}tasokey.jks`, 'anahtar deposu / parola dosyasının tam yolu'],
    [`-Anahtar D:${BOLU}Guvenli${BOLU}bir-yer`, 'kapalı anahtar klasörünün yolu'],
    [`${TIRE5}BEGIN PRIVATE KEY${TIRE5}`, 'imza malzemesi bloğu'],
  ];
  for (const [satir, beklenenKalip] of ornekler) {
    const yakalayan = SIR_KALIPLARI.filter(({ desen }) => desen.test(satir)).map(({ ad }) => ad);
    assert.ok(yakalayan.includes(beklenenKalip),
      `"${satir}" yakalanmadı (yakalayanlar: ${yakalayan.join(', ') || 'yok'})`);
  }
  // `file:` dolaylı kaynağı ve sözcüğün düz geçtiği satırlar iz DEĞİLDİR (yanlış alarm olmasın).
  for (const temiz of [
    'apksigner sign --ks-pass file:$ParolaDosyasi app.apk',
    'ZORUNLU. Anahtar deposu parolasını taşıyan dosya',
    'apksigner sign: --ks-pass gerekli',            // bayrak adının düz yazıda anılması
    'UYARI: --key-pass geçilmedi (depo parolası kullanılır)',
  ]) {
    const yakalayan = SIR_KALIPLARI.filter(({ desen }) => desen.test(temiz)).map(({ ad }) => ad);
    assert.deepEqual(yakalayan, [], `yanlış alarm: "${temiz}"`);
  }

  for (const muaf of SIR_MUAFIYETLERI) {
    const icerik = readFileSync(join(KOK, muaf.dosya), 'utf8');
    const satir = satirlar(icerik).find((s) => muaf.desen.test(s));
    assert.ok(satir, `muafiyet artık eşleşmiyor, listeden çıkarılmalı: ${muaf.dosya} (${muaf.neden})`);
    assert.ok(SIR_KALIPLARI.some(({ desen }) => desen.test(satir)),
      `muafiyet gereksiz: satır hiçbir kalıba takılmıyor → ${muaf.dosya}`);
  }
});

// --- C) android/ klasörü: dış derleme sistemi, kütüphane, indirme adresi -----

// Yasak dizeler: dış derleme sistemi ve uyumluluk kütüphaneleri. Gerekçe ADR-001 (sıfır bağımlılık)
// + ADR-020 madde 1; `tasokey#53` Unity'nin içindeki araçların yettiğini ölçtü. Kabuk KAYNAKLARINI
// (`android/kabuk/`) ayrıca `android-kabuk.test.js` tarar; buradaki tarama bütün klasörü, yani
// derleme betiklerini ve belgeleri de kapsar.
const YASAK_DIZELER = ['gradle', 'androidx', 'android.support'];

// İzin verilen adresler ağdan İNDİRMEZ: biri XML ad alanı (dosya açılmaz), öteki kabuğun kendi
// sanal sunucu adıdır (ADR-020 madde 5; cihazda APK içinden sunulur, INTERNET izni yoktur).
const IZINLI_ADRESLER = ['http://schemas.android.com/', 'https://appassets.androidplatform.net/'];

function androidDosyalari() {
  return metinDosyalari(depoDosyalari().filter((goreli) => goreli.startsWith('android/'))).metinler;
}

test('ASIL KABUL: android/ altında dış derleme sistemi ve uyumluluk kütüphanesi adı geçmiyor (0)', () => {
  const dosyalar = androidDosyalari();
  assert.ok(dosyalar.length > 5, `android/ taraması küçük görünüyor: ${dosyalar.length} dosya`);

  const bulgular = [];
  for (const { goreli, icerik } of dosyalar) {
    const kucuk = icerik.toLowerCase();
    for (const yasak of YASAK_DIZELER) {
      if (kucuk.includes(yasak)) bulgular.push(`${goreli}: ${yasak}`);
    }
  }
  assert.deepEqual(bulgular, [], 'zincir doğrudan araç çağrılarıdır (ADR-001 sıfır bağımlılık)');
});

test('ASIL KABUL: android/ altında indirme adresi yok (yalnız ad alanı + kabuğun sanal sunucusu)', () => {
  const bulgular = [];
  let adresSayisi = 0;
  for (const { goreli, icerik } of androidDosyalari()) {
    for (const [adres] of icerik.matchAll(/https?:\/\/[^\s"'`)>,]+/g)) {
      adresSayisi++;
      if (IZINLI_ADRESLER.some((izinli) => adres.startsWith(izinli))) continue;
      bulgular.push(`${goreli}: ${adres}`);
    }
  }
  assert.ok(adresSayisi > 0, 'adres taraması hiç adres görmedi (tarama boşa koşuyor olabilir)');
  assert.deepEqual(bulgular, [], 'derleme zinciri ağdan hiçbir şey indirmez (ADR-007 ile aynı çizgi)');
});

// --- C) OKU.md ↔ derle.ps1: donmuş sayılar tek kaynaktan ---------------------

test('ASIL KABUL: OKU.md donmuş sayıları derle.ps1 ayar bloğuyla aynı yazıyor', () => {
  const derle = readFileSync(DERLE_BETIGI, 'utf8');
  const belge = readFileSync(OKU_BELGESI, 'utf8');

  const ayar = (ad) => {
    const es = new RegExp(String.raw`\$${ad}\s*=\s*(\d+)`).exec(derle);
    assert.ok(es, `derle.ps1 içinde $${ad} ayarı yok`);
    return es[1];
  };
  const esler = [
    ['--min-sdk-version', ayar('MIN_SDK')],
    ['--target-sdk-version', ayar('HEDEF_SDK')],
    ['android-<API>', ayar('API_SEVIYESI')],
  ];
  for (const [bayrak, deger] of esler) {
    const satir = satirlar(belge).find((s) => s.includes(bayrak));
    assert.ok(satir, `OKU.md ${bayrak} satırını yazmıyor`);
    assert.ok(satir.includes(`**${deger}**`),
      `OKU.md ${bayrak} için ${deger} yazmalı (derle.ps1 ile tek kaynak). Satır: ${satir}`);
  }

  // Sürüm kuralı: belge sayı yazmaz, komutu yazar — sayı git geçmişinden gelir.
  assert.match(belge, /git rev-list --count HEAD/, 'OKU.md sürüm kodunun kaynağını yazmıyor');
  assert.ok(belge.includes('`0.<sürüm kodu>`'), 'OKU.md sürüm adı kuralını yazmıyor');
  assert.match(derle, /\$SURUM_ADI_ONEKI\s*=\s*'0\.'/, 'derle.ps1 sürüm adı öneki değişmiş');
});

test('OKU.md iki betiğin de çıkış kodlarını ve yayın adımlarını yazıyor', () => {
  const belge = readFileSync(OKU_BELGESI, 'utf8');
  for (const parca of ['derle.ps1', 'dogrula.ps1', 'yol-coz.ps1', '-Kimlik', '-Anahtar',
    '-ParolaDosyasi', '-Apk', '-Web', '## 6. Yayın derlemesi']) {
    assert.ok(belge.includes(parca), `OKU.md ${parca} yazmıyor`);
  }
  // Doğrulama betiğinin kendi çıkış kodları belgede tek tek yazılı olmalı (0-4).
  const dogrulamaBolumu = belge.slice(belge.indexOf('## 4.'), belge.indexOf('## 5.'));
  for (const kod of ['| 0 |', '| 1 |', '| 2 |', '| 3 |', '| 4 |']) {
    assert.ok(dogrulamaBolumu.includes(kod), `OKU.md §4 çıkış kodu satırı eksik: ${kod}`);
  }
});
