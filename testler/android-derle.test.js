import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sahteUnityKur, kabukBul } from './yardimci/android-sahte-unity.js';
import { zipAdlari, zipOku } from './yardimci/android-zip.js';
import { IMZA_GIRDISI, LINK_GIRDISI } from './yardimci/android-sahte-arac.js';

// tasokey#56 (üst iş tasokey#52) — `android/derle.ps1`: tek komutla imzalı APK + Drive kopyası.
//
// Zincir gerçek araçlarla her makinede ölçülemez (Unity + Android SDK CI'da yok, gerçek imza
// anahtarı öz-teste girmez). Bu yüzden ölçüm DAVRANIŞLI sahte bir araç ağacıyla yapılır
// (`yardimci/android-sahte-arac.js`): araçlar sürüm basmakla kalmaz, işlerini de yapar — gerçek
// zip üretir, R.java yazar, .class/.dex bırakır, APK'ya girdi ekler, imzalar, doğrular. Böylece
// ölçülen şey "betik hangi bayrağı geçti" ile birlikte "APK'nın içine ne girdi" oluyor.
//
// Her araç çağrısı bir günlüğe JSON satırı olarak düşer (SAHTE_ARAC_GUNLUGU) → bayraklar tahmin
// edilmez, okunur. Gerçek araç zinciriyle yapılan koşunun kanıtı iş klasöründedir
// (`is/tasokey-56/derleme-gunlugu.txt`); burada ölçülen, betiğin KENDİ mantığı.
//
// Drive kolu ASLA gerçek G: sürücüsüne dokunmaz: her koşuda TASOKEY_DRIVE_KOK geçici klasöre
// bakar (betikteki ortam değişkeni kolu bu ölçüm için var).

const KOK = join(import.meta.dirname, '..');
const BETIK = join(KOK, 'android', 'derle.ps1');
const KIMLIK = 'com.kraftdcm.tasokey';
const PAROLA = 'ofis-deneme-parolasi';
const URUN_ONEKI = 'tasokey';
const EN_DUSUK_SDK = '24';
const HEDEF_SDK = '36';
const API_SEVIYESI = '36';
const DENEME_ETIKET_EKI = ' (Deneme)';
const DRIVE_ALT = 'APK';
const DRIVE_AD_DESENI = /^tasokey_\d{8}_\d{4}(_\d+)?\.apk$/;

const KABUK = kabukBul();
const ATLA = KABUK ? false : 'PowerShell bulunamadı (betik yalnız Windows kabuğunda çalışır)';

const GECICI_KOK = KABUK ? mkdtempSync(join(tmpdir(), 'tasokey-derle-')) : null;
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

const VARLIK_KOKU = KABUK ? varlikKokunuOku() : 'oyun';

function gitCiktisi(arglar) {
  const s = spawnSync('git', arglar, { cwd: KOK, encoding: 'utf8' });
  return (s.stdout ?? '').trim();
}

// --- Koşu ---------------------------------------------------------------------

function gunlukOku(yol) {
  if (!existsSync(yol)) return [];
  return readFileSync(yol, 'utf8').split('\n').filter((s) => s.trim()).map((s) => JSON.parse(s));
}

/** Günlükteki belirli bir araç çağrısı (ör. aapt2 + 'link'); yoksa null. */
function cagri(gunluk, ad, komut) {
  const bulunan = gunluk.filter((g) => g.ad === ad && (komut === undefined || g.arglar[0] === komut));
  return bulunan.length > 0 ? bulunan[bulunan.length - 1] : null;
}

/** Değer taşıyan bayrağın değeri (yoksa null). */
function bayrak(arglar, ad) {
  const i = arglar.indexOf(ad);
  if (i < 0 || i + 1 >= arglar.length) return null;
  return arglar[i + 1];
}

/**
 * Betiği sahte araç ağacıyla koşturur.
 * @param {string} ad geçici alt klasör adı (koşular karışmasın)
 * @param {{arglar?: string[], agac?: object, driveKok?: string, kimlik?: string,
 *   parola?: string, anahtarVar?: boolean, parolaVar?: boolean}} secenekler
 */
function kos(ad, secenekler = {}) {
  const {
    arglar = [], agac = {}, driveKok = null, kimlik = KIMLIK, parola = `${PAROLA}\n`,
    anahtarVar = true, parolaVar = true, zorunlular = ['-Kimlik', '-Anahtar', '-ParolaDosyasi'],
  } = secenekler;

  const taban = join(GECICI_KOK, ad);
  mkdirSync(taban, { recursive: true });
  const unityKok = sahteUnityKur(join(taban, 'unity'), { davranisli: true, ...agac });

  const jks = join(taban, 'deneme.jks');
  if (anahtarVar) writeFileSync(jks, 'SAHTE-ANAHTAR-DEPOSU', 'ascii');
  const parolaDosyasi = join(taban, 'deneme.parola');
  // 'utf8': BOM ölçümünde ﻿ gerçekten EF BB BF olarak yazılsın ('ascii' onu 0x7F'e kırpar).
  if (parolaVar) writeFileSync(parolaDosyasi, parola, 'utf8');

  const ciktiKok = join(taban, 'cikti');
  const aracGunlugu = join(taban, 'arac-gunlugu.jsonl');
  writeFileSync(aracGunlugu, '', 'utf8');

  const tamArglar = [];
  if (zorunlular.includes('-Kimlik')) tamArglar.push('-Kimlik', kimlik);
  if (zorunlular.includes('-Anahtar')) tamArglar.push('-Anahtar', jks);
  if (zorunlular.includes('-ParolaDosyasi')) tamArglar.push('-ParolaDosyasi', parolaDosyasi);
  tamArglar.push('-UnityKok', unityKok, '-Cikti', ciktiKok, ...arglar);

  // Drive kökü HER koşuda geçici klasöre bakar; verilmezse var olmayan bir yol (G: korunur).
  const driveKokYolu = driveKok ?? join(taban, 'drive-yok');

  const sonuc = spawnSync(
    KABUK,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BETIK, ...tamArglar],
    {
      encoding: 'utf8',
      env: { ...process.env, SAHTE_ARAC_GUNLUGU: aracGunlugu, TASOKEY_DRIVE_KOK: driveKokYolu },
      timeout: 300_000,
    },
  );
  assert.equal(sonuc.error, undefined, `kabuk çalıştırılamadı: ${sonuc.error}`);

  return {
    kod: sonuc.status,
    cikti: `${sonuc.stdout ?? ''}${sonuc.stderr ?? ''}`,
    gunluk: gunlukOku(aracGunlugu),
    ciktiKok,
    driveKok: driveKokYolu,
    jks,
    parolaDosyasi,
    taban,
  };
}

const ONBELLEK = new Map();
/** Aynı koşuyu birden çok test ölçüyor; pahalı zincir bir kez koşturulur. */
function birKez(ad, uretici) {
  if (!ONBELLEK.has(ad)) ONBELLEK.set(ad, uretici());
  return ONBELLEK.get(ad);
}

function temelKosu() {
  return birKez('temel', () => kos('temel', { arglar: ['-DriveYok'] }));
}

function denemeKosusu() {
  return birKez('deneme', () => {
    const anahtarParolasi = join(GECICI_KOK, 'anahtar.parola');
    writeFileSync(anahtarParolasi, `${PAROLA}\n`, 'ascii');
    const sonuc = kos('deneme', {
      arglar: ['-Deneme', '-DriveYok', '-AnahtarAdi', 'denemeanahtari',
        '-AnahtarParolaDosyasi', anahtarParolasi],
    });
    return { ...sonuc, anahtarParolasi };
  });
}

/** Çıktı klasöründeki imzalı APK (ara ürünler: temel.apk / hizali.apk). */
function imzaliApk(ciktiKok) {
  const adlar = readdirSync(ciktiKok).filter(
    (ad) => ad.endsWith('.apk') && ad !== 'temel.apk' && ad !== 'hizali.apk',
  );
  assert.equal(adlar.length, 1, `tek imzalı APK beklenirdi: ${adlar.join(', ')}`);
  return join(ciktiKok, adlar[0]);
}

function linkDokumu(apk) {
  const girdi = zipOku(apk).find((g) => g.ad === LINK_GIRDISI);
  assert.ok(girdi, `${LINK_GIRDISI} APK'da yok (aapt2 link bayrakları ölçülemiyor)`);
  return JSON.parse(girdi.veri.toString('utf8'));
}

// --- ASIL KABUL: tek komutla imzalı APK ---------------------------------------

test('ASIL KABUL: tek komutla imzalı APK oluşur ve apksigner verify "Verifies" der', { skip: ATLA }, () => {
  const { kod, cikti, gunluk, ciktiKok } = temelKosu();

  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  const apk = imzaliApk(ciktiKok);
  assert.ok(statSync(apk).size > 0, 'imzalı APK boş');
  assert.match(cikti, /Verifies/, 'apksigner verify çıktısı günlüğe düşmemiş');
  assert.match(cikti, /ölçüldü\s+: çıktıda "Verifies" var/);
  assert.match(cikti, /SONUÇ\s+: TAMAM/);

  const dogrulama = cagri(gunluk, 'apksigner', 'verify');
  assert.ok(dogrulama, 'apksigner verify hiç çağrılmamış');
  assert.ok(zipOku(apk).some((g) => g.ad === IMZA_GIRDISI), 'APK imzalanmamış');
});

test('ASIL KABUL: aapt2 link bütün bayraklarını alır (-I, -A, sdk, sürüm, paket, --java)', { skip: ATLA }, () => {
  const { gunluk, ciktiKok } = temelKosu();
  const link = cagri(gunluk, 'aapt2', 'link');
  assert.ok(link, 'aapt2 link hiç çağrılmamış');
  const a = link.arglar;

  assert.ok(bayrak(a, '-I').endsWith(`android-${API_SEVIYESI}\\android.jar`), bayrak(a, '-I'));
  assert.ok(bayrak(a, '--manifest').endsWith('kabuk\\AndroidManifest.xml'), bayrak(a, '--manifest'));
  assert.equal(bayrak(a, '-A'), join(ciktiKok, 'asama', 'assets'));
  assert.equal(bayrak(a, '--min-sdk-version'), EN_DUSUK_SDK);
  assert.equal(bayrak(a, '--target-sdk-version'), HEDEF_SDK);
  assert.equal(bayrak(a, '--rename-manifest-package'), KIMLIK);
  assert.equal(bayrak(a, '--custom-package'), KIMLIK, 'R.java paketi manifestteki paket adı olmalı');
  assert.equal(bayrak(a, '--java'), join(ciktiKok, 'gen'));
  assert.equal(bayrak(a, '-o'), join(ciktiKok, 'temel.apk'));
  assert.ok(a[a.length - 1].endsWith('res.zip'), `son argüman derlenmiş kaynak zip dosyası olmalı: ${a[a.length - 1]}`);

  // Bayraklar APK'ya gerçekten işlendi mi (zipalign + imzadan sonra da orada):
  const dokum = linkDokumu(imzaliApk(ciktiKok));
  assert.equal(dokum.kimlik, KIMLIK);
  assert.equal(dokum.enDusukSdk, EN_DUSUK_SDK);
  assert.equal(dokum.hedefSdk, HEDEF_SDK);
});

test('ASIL KABUL: aapt2 compile aşama res kopyasını derler (depodaki res doğrudan derlenmez)', { skip: ATLA }, () => {
  const { gunluk, ciktiKok } = temelKosu();
  const derleme = cagri(gunluk, 'aapt2', 'compile');
  assert.ok(derleme, 'aapt2 compile hiç çağrılmamış');
  assert.equal(bayrak(derleme.arglar, '--dir'), join(ciktiKok, 'asama', 'res'));
  assert.equal(bayrak(derleme.arglar, '-o'), join(ciktiKok, 'res.zip'));
});

test('ASIL KABUL: javac -classpath android.jar/-source 8/-target 8, d8 --min-api, zipalign -p 4 ile çağrılır', { skip: ATLA }, () => {
  const { gunluk } = temelKosu();

  const javac = cagri(gunluk, 'javac');
  assert.ok(javac, 'javac hiç çağrılmamış');
  // android.jar SINIF yolunda olmalı, ÖNYÜKLEME yolunda değil: gerçek kurulumda ölçüldü
  // (tasokey#56) — android-36/android.jar içinde java/lang/invoke/LambdaMetafactory.class yok,
  // -bootclasspath ile kabuğun lambda satırı "Unable to find method metafactory" ile düşüyor.
  assert.ok(bayrak(javac.arglar, '-classpath').endsWith('android.jar'), bayrak(javac.arglar, '-classpath'));
  assert.equal(bayrak(javac.arglar, '-bootclasspath'), null,
    'android.jar önyükleme yolunda verilmiş (lambda derlenmez)');
  assert.equal(bayrak(javac.arglar, '-source'), '8');
  assert.equal(bayrak(javac.arglar, '-target'), '8');
  assert.equal(bayrak(javac.arglar, '-encoding'), 'UTF-8', 'UTF-8 kaynaklar Windows kod sayfasıyla okunmamalı');
  assert.ok(javac.arglar.some((x) => x.endsWith('OyunEtkinligi.java')), 'kabuk kaynağı derlenmemiş');
  assert.ok(javac.arglar.some((x) => x.endsWith('R.java')), 'üretilen R.java derlenmemiş');

  const d8 = cagri(gunluk, 'd8');
  assert.ok(d8, 'd8 hiç çağrılmamış');
  assert.equal(bayrak(d8.arglar, '--min-api'), EN_DUSUK_SDK);
  assert.ok(bayrak(d8.arglar, '--lib').endsWith('android.jar'), bayrak(d8.arglar, '--lib'));
  assert.ok(d8.arglar.some((x) => x.endsWith('.class')), 'd8 girdisinde .class yok');

  const zipalign = cagri(gunluk, 'zipalign');
  assert.ok(zipalign, 'zipalign hiç çağrılmamış');
  assert.ok(zipalign.arglar.includes('-p'), `zipalign -p geçmemiş: ${zipalign.arglar.join(' ')}`);
  assert.equal(zipalign.arglar[zipalign.arglar.indexOf('-p') + 1], '4');
});

test('ASIL KABUL: d8 ve apksigner alt süreçlerine JAVA_HOME verilir (makinede tanımlı değil)', { skip: ATLA }, () => {
  // Gerçek koşuda ölçüldü (tasokey#56): `d8.bat` java'yı JAVA_HOME/PATH'te arıyor, bu makinede
  // ikisi de yok → "ERROR: JAVA_HOME is not set…" ile düşüyordu. Betik JDK kökünü yol
  // çözücüden türetip YALNIZ alt sürecin ortamına yazar; sistem ayarı değişmez.
  const { gunluk, cikti } = temelKosu();
  for (const [ad, komut] of [['d8', undefined], ['apksigner', 'sign'], ['apksigner', 'verify']]) {
    const c = cagri(gunluk, ad, komut);
    assert.ok(c, `${ad} ${komut ?? ''} çağrılmamış`);
    assert.ok(c.javaHome, `${ad} ${komut ?? ''} alt sürecinde JAVA_HOME yok`);
    assert.ok(c.javaHome.endsWith('OpenJDK'), `JAVA_HOME JDK kökü olmalı: ${c.javaHome}`);
  }
  assert.match(cikti, /JAVA_HOME\s+: .*OpenJDK\s+\(yalnız alt süreçlere verilir\)/);
  assert.equal(process.env.JAVA_HOME, undefined, 'bu ölçüm JAVA_HOME tanımsızken anlamlı');
});

test('ASIL KABUL: apksigner sign parolayı YALNIZ file: kaynağıyla alır (komut satırında parola yok)', { skip: ATLA }, () => {
  const { gunluk, jks, parolaDosyasi } = temelKosu();
  const imza = cagri(gunluk, 'apksigner', 'sign');
  assert.ok(imza, 'apksigner sign hiç çağrılmamış');

  assert.equal(bayrak(imza.arglar, '--ks'), jks);
  assert.equal(bayrak(imza.arglar, '--ks-pass'), `file:${parolaDosyasi}`);
  // --key-pass AYNI dosyayı göstermemeli: apksigner `file:` kaynaklarını ardışık satır olarak
  // okuyor, tek satırlı dosyada "end of file reached" ile düşüyor (gerçek kurulumda ölçüldü,
  // tasokey#56). Ayrı dosya verilmediğinde bayrak hiç geçmez → depo parolası kullanılır.
  assert.equal(bayrak(imza.arglar, '--key-pass'), null,
    'ayrı anahtar parola dosyası yokken --key-pass geçilmemeli (aynı dosya EOF hatası verir)');
  assert.doesNotMatch(imza.arglar.join(' '), new RegExp(PAROLA),
    'parolanın kendisi komut satırına yazılmış');
});

test('ASIL KABUL: -AnahtarParolaDosyasi depo parolası dosyasının aynısıysa --key-pass geçilmez', { skip: ATLA }, () => {
  // Aynı dosya iki parola için verilirse apksigner ikinci satırı arar ve EOF verir; betik bu
  // durumu yakalayıp bayrağı hiç geçmiyor. Sahte apksigner gerçek davranışı taklit ediyor,
  // yani bu koruma kalkarsa zincir kırmızı yanar.
  // `kos` parola dosyasını <taban>\deneme.parola olarak yazıyor; aynı yolu -AnahtarParolaDosyasi
  // olarak geri vererek "iki bayrak tek dosya" durumu kurulur.
  const ad = 'ayni-parola-dosyasi';
  const beklenenParola = join(GECICI_KOK, ad, 'deneme.parola');
  const sonuc = kos(ad, { arglar: ['-DriveYok', '-AnahtarParolaDosyasi', beklenenParola] });

  assert.equal(sonuc.parolaDosyasi, beklenenParola, 'parola dosyasının yolu değişmiş (ölçüm kurulamaz)');
  assert.equal(sonuc.kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${sonuc.cikti}`);
  assert.match(sonuc.cikti, /UYARI\s+: -AnahtarParolaDosyasi -ParolaDosyasi ile aynı dosya/);
  assert.equal(bayrak(cagri(sonuc.gunluk, 'apksigner', 'sign').arglar, '--key-pass'), null);
});

test("seçmeli -AnahtarAdi ve -AnahtarParolaDosyasi apksigner'a geçer", { skip: ATLA }, () => {
  const { gunluk, anahtarParolasi, kod, cikti } = denemeKosusu();
  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  const imza = cagri(gunluk, 'apksigner', 'sign');
  assert.equal(bayrak(imza.arglar, '--ks-key-alias'), 'denemeanahtari');
  assert.equal(bayrak(imza.arglar, '--key-pass'), `file:${anahtarParolasi}`);
});

// --- Aşama: web çıktısı APK'nın içine girer -----------------------------------

test('ASIL KABUL: imzalı APK classes.dex, AndroidManifest.xml ve assets/<varlık kökü>/index.html taşır', { skip: ATLA }, () => {
  const { ciktiKok } = temelKosu();
  const adlar = zipAdlari(imzaliApk(ciktiKok));

  assert.ok(adlar.includes('classes.dex'), `APK'da classes.dex yok: ${adlar.join(', ')}`);
  assert.ok(adlar.includes('AndroidManifest.xml'), "APK'da AndroidManifest.xml yok");
  assert.ok(adlar.includes(`assets/${VARLIK_KOKU}/index.html`),
    `APK'da assets/${VARLIK_KOKU}/index.html yok (kabuk bu kökün altından sunar): ${adlar.slice(0, 20).join(', ')}`);
  assert.ok(adlar.some((ad) => ad === `assets/${VARLIK_KOKU}/cekirdek/kural.js`),
    'oyun çekirdeği varlıklara girmemiş');
  assert.ok(adlar.some((ad) => ad === `assets/${VARLIK_KOKU}/diller/tr.json`),
    'dil dosyası varlıklara girmemiş');

  // ASIL KABUL: zip girdi adlarında ayraç yalnız `/` olabilir. Gerçek kurulumda ölçüldü
  // (tasokey#56, üç okuyucu): `aapt2 link -A` Windows'ta `assets/oyun\arayuz\ekran.js` yazıyor;
  // cihazda AssetManager hiçbir varlığı bulamaz → APK derlenir, imza doğrulanır, oyun açılmaz.
  const tersBolulu = adlar.filter((ad) => ad.includes('\\'));
  assert.deepEqual(tersBolulu, [], `APK girdi adlarında ters bölü var: ${tersBolulu.slice(0, 5).join(', ')}`);
});

test("varlık kökü uydurulmaz: VarlikSunucusu.java'daki KOK ile aynı klasöre kopyalanır", { skip: ATLA }, () => {
  const { ciktiKok, cikti } = temelKosu();
  const hedef = join(ciktiKok, 'asama', 'assets', VARLIK_KOKU, 'index.html');
  assert.ok(existsSync(hedef), `aşama kopyası beklenen kökte değil: ${hedef}`);
  assert.match(cikti, new RegExp(`Varlık kökü\\s+: assets/${VARLIK_KOKU}`));
});

// --- -Deneme: yalnız derleme anında, depo değişmez ----------------------------

test('ASIL KABUL: -Deneme kimliğe .deneme, etikete " (Deneme)" ekler; DEPO değişmez', { skip: ATLA }, () => {
  const { kod, gunluk, ciktiKok, cikti } = denemeKosusu();
  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);

  const link = cagri(gunluk, 'aapt2', 'link');
  assert.equal(bayrak(link.arglar, '--rename-manifest-package'), `${KIMLIK}.deneme`);
  assert.equal(bayrak(link.arglar, '--custom-package'), KIMLIK,
    'R.java paketi deneme ekiyle değişmemeli (Java kaynakları o pakette)');
  assert.equal(linkDokumu(imzaliApk(ciktiKok)).kimlik, `${KIMLIK}.deneme`);

  // Ek TAM OLARAK BİR KEZ uygulanır: ilk sürümde günlük satırı eki iki kez basıyordu
  // (gerçek koşuda görüldü, tasokey#56) → ölçüm artık beklenen değerin kendisine bakıyor.
  const depoEtiketi = /<string name="uygulama_adi">([^<]*)<\/string>/
    .exec(readFileSync(join(KOK, 'android', 'kabuk', 'res', 'values', 'strings.xml'), 'utf8'))[1];
  for (const ad of ['values', 'values-tr']) {
    const asamada = readFileSync(join(ciktiKok, 'asama', 'res', ad, 'strings.xml'), 'utf8');
    const deger = /<string name="uygulama_adi">([^<]*)<\/string>/.exec(asamada)[1];
    assert.equal(deger, `${depoEtiketi}${DENEME_ETIKET_EKI}`, `${ad}/strings.xml etiketi yanlış`);
  }
  assert.match(cikti, new RegExp(`etiket eki\\s+: values/strings.xml → "${depoEtiketi} \\(Deneme\\)"`),
    'günlük satırı etiketin yazılan hâlini basmalı (ek iki kez görünmemeli)');

  // Deneme eki DEPOYA sızmış olmasın: koşu sırasına bağlı olmayan ölçüm, dosyanın kendi içeriği.
  for (const ad of ['values', 'values-tr']) {
    const depoda = readFileSync(join(KOK, 'android', 'kabuk', 'res', ad, 'strings.xml'), 'utf8');
    assert.doesNotMatch(depoda, /\(Deneme\)/, `deneme eki depodaki ${ad}/strings.xml'e yazılmış`);
  }
});

test('-Deneme verilmezse kimlikte .deneme, etiketde ek yoktur', { skip: ATLA }, () => {
  const { gunluk, ciktiKok } = temelKosu();
  assert.equal(bayrak(cagri(gunluk, 'aapt2', 'link').arglar, '--rename-manifest-package'), KIMLIK);
  const asamada = readFileSync(join(ciktiKok, 'asama', 'res', 'values', 'strings.xml'), 'utf8');
  assert.doesNotMatch(asamada, /\(Deneme\)/);
});

// --- Sürüm --------------------------------------------------------------------

test("ASIL KABUL: sürüm kodu git rev-list --count HEAD'den gelir; dal + sayı basılır", { skip: ATLA }, () => {
  const { cikti, gunluk, ciktiKok } = temelKosu();
  const sayi = gitCiktisi(['rev-list', '--count', 'HEAD']);
  const dal = gitCiktisi(['rev-parse', '--abbrev-ref', 'HEAD']);
  assert.ok(/^\d+$/.test(sayi), `git işleme sayısı okunamadı: ${sayi}`);

  const link = cagri(gunluk, 'aapt2', 'link');
  assert.equal(bayrak(link.arglar, '--version-code'), sayi);
  assert.equal(bayrak(link.arglar, '--version-name'), `0.${sayi}`);
  assert.match(cikti, new RegExp(`Sürüm kodu\\s+: ${sayi}`));
  assert.match(cikti, new RegExp(`Dal\\s+: ${dal.replace(/[/\\]/g, '.')}`));

  const dokum = linkDokumu(imzaliApk(ciktiKok));
  assert.equal(dokum.surumKodu, sayi);
  assert.equal(dokum.surumAdi, `0.${sayi}`);
});

test('ASIL KABUL: HEAD ana dal değilse UYARI basılır (ana daldaysa basılmaz)', { skip: ATLA }, () => {
  const { cikti } = temelKosu();
  const dal = gitCiktisi(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (dal === 'main') {
    assert.doesNotMatch(cikti, /DAL derlemesidir/, 'ana dalda dal uyarısı basılmamalı');
    return;
  }
  assert.match(cikti, /UYARI\s+: HEAD 'main' değil/, `dal uyarısı yok (dal: ${dal})`);
  assert.match(cikti, /DAL derlemesidir/);
});

// --- Girdi denetimi: 0 dışı çıkış kodu + eksiğin adı --------------------------

for (const eksik of ['-Kimlik', '-Anahtar', '-ParolaDosyasi']) {
  test(`ASIL KABUL: ${eksik} verilmezse 0 dışı kod ve eksiğin adı basılır`, { skip: ATLA }, () => {
    const zorunlular = ['-Kimlik', '-Anahtar', '-ParolaDosyasi'].filter((p) => p !== eksik);
    const { kod, cikti } = kos(`eksik${eksik}`, { zorunlular, arglar: ['-DriveYok'] });

    assert.equal(kod, 2, `çıkış kodu 2 beklenirdi. Çıktı:\n${cikti}`);
    assert.match(cikti, new RegExp(`zorunlu parametre eksik: .*${eksik}`));
    assert.match(cikti, /kendisi belirlemez/, 'betik varsayılan uydurmadığını söylemeli');
  });
}

test('anahtar deposu dosyası yoksa 0 dışı kod ve dosyanın yolu basılır', { skip: ATLA }, () => {
  const { kod, cikti, jks } = kos('anahtar-yok', { anahtarVar: false, arglar: ['-DriveYok'] });
  assert.equal(kod, 2, cikti);
  assert.match(cikti, /-Anahtar dosyası yok/);
  assert.ok(cikti.includes(jks), `eksik dosyanın yolu basılmamış: ${jks}`);
});

test('parola dosyası yoksa 0 dışı kod ve dosyanın yolu basılır', { skip: ATLA }, () => {
  const { kod, cikti, parolaDosyasi } = kos('parola-yok', { parolaVar: false, arglar: ['-DriveYok'] });
  assert.equal(kod, 2, cikti);
  assert.match(cikti, /-ParolaDosyasi dosyası yok/);
  assert.ok(cikti.includes(parolaDosyasi));
});

test('ASIL KABUL: parola dosyası BOM taşıyorsa betik durur (BOM parolayı bozar)', { skip: ATLA }, () => {
  const { kod, cikti } = kos('parola-bom', { parola: `\uFEFF${PAROLA}\n`, arglar: ['-DriveYok'] });
  assert.equal(kod, 2, cikti);
  assert.match(cikti, /BOM taşıyor/);
});

test('boş parola dosyası reddedilir', { skip: ATLA }, () => {
  const { kod, cikti } = kos('parola-bos', { parola: '', arglar: ['-DriveYok'] });
  assert.equal(kod, 2, cikti);
  assert.match(cikti, /parola dosyası boş/);
});

test('geçersiz paket adı reddedilir (tek parça, boşluk, rakamla başlayan parça)', { skip: ATLA }, () => {
  for (const kotu of ['tasokey', 'com.kraftdcm.1tasokey']) {
    const { kod, cikti } = kos(`kimlik-${kotu.replace(/\W/g, '_')}`, { kimlik: kotu, arglar: ['-DriveYok'] });
    assert.equal(kod, 2, `"${kotu}" reddedilmeliydi. Çıktı:\n${cikti}`);
    assert.match(cikti, /geçerli bir paket adı değil/);
  }
});

test('araç zinciri eksikse yol çözücünün kodu ve eksiğin adı basılır (derleme başlamaz)', { skip: ATLA }, () => {
  const { kod, cikti, gunluk } = kos('arac-eksik', {
    agac: { yok: ['zipalign'] }, arglar: ['-DriveYok'],
  });
  assert.equal(kod, 3, `çıkış kodu 3 beklenirdi. Çıktı:\n${cikti}`);
  assert.match(cikti, /araç zinciri eksik/);
  assert.match(cikti, /zipalign/);
  assert.equal(cagri(gunluk, 'aapt2', 'compile'), null, 'araç eksikken derlemeye girilmemeli');
});

// --- dex → APK: iki yol da ölçülür --------------------------------------------

test('ASIL KABUL: aapt v1 varsa dex "aapt add" ile dex klasöründen eklenir', { skip: ATLA }, () => {
  const { gunluk, ciktiKok, cikti } = temelKosu();
  const ekleme = cagri(gunluk, 'aapt', 'add');
  assert.ok(ekleme, `aapt add çağrılmamış. Çıktı:\n${cikti}`);
  assert.deepEqual(ekleme.arglar.slice(2), ['classes.dex'],
    'girdi GÖRELI adla eklenmeli (yoksa APK içinde yanlış yola girer)');
  assert.equal(ekleme.cwd, join(ciktiKok, 'dex'), 'aapt add dex klasöründe koşmalı');
  assert.match(cikti, /yol\s+: aapt-add/);
  assert.ok(zipAdlari(imzaliApk(ciktiKok)).includes('classes.dex'));
});

test("ASIL KABUL: aapt v1 yoksa dex .NET ZipArchive ile eklenir (APK'da classes.dex var)", { skip: ATLA }, () => {
  const sonuc = birKez('aapt-yok', () => kos('aapt-yok', { agac: { yok: ['aapt'] } }));
  assert.equal(sonuc.kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${sonuc.cikti}`);
  assert.match(sonuc.cikti, /yol\s+: zip-archive/);
  assert.equal(cagri(sonuc.gunluk, 'aapt', 'add'), null, 'aapt yokken aapt add çağrılmamalı');
  assert.ok(zipAdlari(imzaliApk(sonuc.ciktiKok)).includes('classes.dex'));
  assert.match(sonuc.cikti, /ölçüldü\s+: APK içinde classes.dex var/);
});

// --- Drive kopyası ------------------------------------------------------------

test('ASIL KABUL: Drive kopyası <kök>\\APK\\<kimlik>\\<ürün>_yyyyMMdd_HHmm.apk olarak açılır', { skip: ATLA }, () => {
  const driveKok = join(GECICI_KOK, 'drive-temiz');
  mkdirSync(driveKok, { recursive: true });
  const { kod, cikti, ciktiKok } = kos('drive-temiz', { driveKok });

  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  const klasor = join(driveKok, DRIVE_ALT, KIMLIK);
  assert.ok(existsSync(klasor), `Drive hedef klasörü açılmadı: ${klasor}`);
  const adlar = readdirSync(klasor);
  assert.equal(adlar.length, 1, `tek kopya beklenirdi: ${adlar.join(', ')}`);
  assert.match(adlar[0], DRIVE_AD_DESENI, adlar[0]);
  assert.deepEqual(
    readFileSync(join(klasor, adlar[0])), readFileSync(imzaliApk(ciktiKok)),
    'Drive kopyası imzalı APK ile aynı baytlar olmalı',
  );
});

test("ASIL KABUL: Drive'da aynı adda dosya varsa ÜSTÜNE YAZILMAZ, yanına açılır", { skip: ATLA }, () => {
  const driveKok = join(GECICI_KOK, 'drive-dolu');
  const klasor = join(driveKok, DRIVE_ALT, KIMLIK);
  mkdirSync(klasor, { recursive: true });

  // Dakika sınırına denk gelme olasılığı için şimdiki VE bir sonraki dakikanın adı doldurulur.
  const simdi = new Date();
  const varOlanlar = [0, 60_000].map((ek) => {
    const t = new Date(simdi.getTime() + ek);
    const iki = (n) => String(n).padStart(2, '0');
    const ad = `${URUN_ONEKI}_${t.getFullYear()}${iki(t.getMonth() + 1)}${iki(t.getDate())}`
      + `_${iki(t.getHours())}${iki(t.getMinutes())}.apk`;
    const yol = join(klasor, ad);
    writeFileSync(yol, 'DOKUNULMAMALI', 'ascii');
    return yol;
  });

  const { kod, cikti } = kos('drive-dolu', { driveKok });
  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);

  for (const yol of varOlanlar) {
    assert.equal(readFileSync(yol, 'utf8'), 'DOKUNULMAMALI', `var olan dosya değişti: ${yol}`);
  }
  const yeniler = readdirSync(klasor).filter((ad) => !varOlanlar.some((y) => y.endsWith(ad)));
  assert.equal(yeniler.length, 1, `tek yeni kopya beklenirdi: ${readdirSync(klasor).join(', ')}`);
  assert.match(yeniler[0], /_2\.apk$/, yeniler[0]);
});

test('ASIL KABUL: Drive kökü yoksa atlanır, çıkış kodu 0 kalır', { skip: ATLA }, () => {
  const { kod, cikti, driveKok } = birKez('aapt-yok', () => kos('aapt-yok', { agac: { yok: ['aapt'] } }));
  assert.equal(kod, 0, cikti);
  assert.ok(!existsSync(driveKok), 'olmayan Drive kökü oluşturulmuş');
  assert.match(cikti, /atlandı \(Drive kökü yok/);
  assert.match(cikti, /SONUÇ\s+: TAMAM/);
});

test("ASIL KABUL: -DriveYok ile Drive'a hiç dokunulmaz", { skip: ATLA }, () => {
  const { cikti, driveKok } = temelKosu();
  assert.match(cikti, /atlandı \(-DriveYok\)/);
  assert.ok(!existsSync(driveKok), '-DriveYok verilmişken Drive klasörü oluşturulmuş');
});

test('Drive varsayılan kökü ve dosya adı kalıbı betikte tek yerde yazılıdır', { skip: ATLA }, () => {
  // Gerçek G: sürücüsüne dokunmadan ölçülebilen tek şey: betikteki tek kaynak satırları.
  const betik = readFileSync(BETIK, 'utf8');
  assert.match(betik, /\$DRIVE_KOK\s+=\s+"G:\\Drive'ım"/, 'varsayılan Drive kökü değişmiş');
  assert.match(betik, /\$DRIVE_ALT\s+=\s+'APK'/);
  assert.match(betik, /\$DRIVE_ZAMAN\s+=\s+'yyyyMMdd_HHmm'/);
});

// --- Depo kuralları -----------------------------------------------------------

test('ASIL KABUL: .gitignore android/cikti/, *.jks, *.keystore, *.parola taşır', () => {
  const metin = readFileSync(join(KOK, '.gitignore'), 'utf8');
  for (const kalip of ['android/cikti/', '*.jks', '*.keystore', '*.parola']) {
    assert.ok(
      metin.split('\n').some((satir) => satir.trim() === kalip),
      `.gitignore'da eksik: ${kalip}`,
    );
  }
});

test("derle.ps1 UTF-8 BOM ile saklanır (PowerShell 5.1 BOM'suz dosyayı ANSI sanar)", () => {
  const bayt = readFileSync(BETIK);
  assert.deepEqual([...bayt.slice(0, 3)], [0xEF, 0xBB, 0xBF], "derle.ps1 BOM'u düşmüş");
});

/** PowerShell yorumları (blok + satır) atılmış hâl: kural KODA bakar, açıklamaya değil. */
function psYorumsuz(metin) {
  return metin.replace(/<#[\s\S]*?#>/g, ' ').replace(/#[^\n]*/g, ' ');
}

test('derle.ps1 kendi içine Unity/JDK/SDK yolu yazmaz (tek kaynak yol-coz.ps1)', () => {
  const betik = readFileSync(BETIK, 'utf8');
  const kod = psYorumsuz(betik);
  // Desenler YOL biçimini arar (ayraçla birlikte); günlük etiketi olarak geçen "build-tools"
  // ya da "JAVA_HOME" sözcüğü yol değildir.
  for (const desen of [/Hub[\\/]Editor/, /PlaybackEngines/, /[\\/]OpenJDK/, /build-tools[\\/]/]) {
    assert.doesNotMatch(kod, desen, `betiğe araç yolu yazılmış: ${desen}`);
  }
  // Mutlak yol sabiti yok; tek bilinçli istisna Drive kökü (ayar bloğunda, tek satır).
  const mutlaklar = [...kod.matchAll(/[A-Za-z]:\\[^\s'"]*/g)]
    .map(([yol]) => yol).filter((yol) => !yol.startsWith('G:\\Drive'));
  assert.deepEqual(mutlaklar, [], `kodda mutlak yol sabiti var: ${mutlaklar.join(', ')}`);
  assert.match(betik, /yol-coz\.ps1/, 'yol çözücü çağrısı yok');
});
