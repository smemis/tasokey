// Davranışlı sahte Android araçları (tasokey#56).
//
// `android/derle.ps1`in zinciri gerçek araçlarla ölçülemez: Unity + Android SDK her makinede
// yok (CI'da hiç yok) ve gerçek bir imza anahtarı öz-teste giremez. Bu dosya, zincirin her
// adımını taklit eden tek bir dağıtıcıdır: her araç için (a) `yol-coz.ps1`in sürüm sorgusuna
// gerçek aracın biçiminde cevap verir, (b) asıl işini YAPAR — gerçek bir zip üretir, R.java
// yazar, .class/.dex dosyası bırakır, APK'ya girdi ekler, imzalar ve doğrular.
//
// Her çağrı bir GÜNLÜĞE (SAHTE_ARAC_GUNLUGU ortam değişkeni) JSON satırı olarak yazılır:
// testler "hangi araca hangi bayrak gitti" sorusunu tahminle değil ölçümle yanıtlar.
//
// Çağrılış: node android-sahte-arac.js <araç adı> <aracın kendi argümanları…>
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import {
  appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { zipOku, zipYaz } from './android-zip.js';

export const AAPT2_SURUM = '2.19-9602130';
export const AAPT_SURUM = '0.2-9602130';
export const D8_SURUM = '8.2.42-dev';
export const APKSIGNER_SURUM = '0.9';
export const JAVAC_SURUM = '17.0.11';

/** İmzalı APK'nın işareti: sahte `verify` yalnız bunu görürse "Verifies" der. */
export const IMZA_GIRDISI = 'META-INF/SAHTE.SF';
/** Sahte `aapt2 link`in APK'ya yazdığı bayrak dökümü (zincir sonunda hâlâ orada olmalı). */
export const LINK_GIRDISI = 'SAHTE-LINK.json';

const DEX_IMZASI = Buffer.from('dex\n035\0', 'latin1');
const SINIF_IMZASI = Buffer.from([0xca, 0xfe, 0xba, 0xbe]);

function gunlukle(ad, arglar) {
  const gunluk = process.env.SAHTE_ARAC_GUNLUGU;
  if (!gunluk) return;
  const kayit = { ad, arglar, cwd: process.cwd(), javaHome: process.env.JAVA_HOME ?? null };
  appendFileSync(gunluk, `${JSON.stringify(kayit)}\n`, 'utf8');
}

function bas(metin) {
  process.stdout.write(`${metin}\n`);
}

function cik(kod, metin) {
  if (metin) bas(metin);
  process.exit(kod);
}

/** `-o`, `--output` gibi değer taşıyan bayrağın değeri. */
function deger(arglar, bayrak) {
  const i = arglar.indexOf(bayrak);
  if (i < 0 || i + 1 >= arglar.length) return null;
  return arglar[i + 1];
}

function dosyalar(kok) {
  const sonuc = [];
  if (!existsSync(kok)) return sonuc;
  for (const ad of readdirSync(kok, { recursive: true })) {
    const tam = join(kok, ad);
    if (statSync(tam).isFile()) sonuc.push(tam);
  }
  return sonuc;
}

function klasorKur(yol) {
  mkdirSync(yol, { recursive: true });
}

function zipGirdisi(ad, veri) {
  return { ad: ad.replace(/\\/g, '/'), veri };
}

// --- aapt2 --------------------------------------------------------------------

function aapt2(arglar) {
  if (arglar[0] === 'version') cik(0, `Android Asset Packaging Tool (aapt) ${AAPT2_SURUM}`);

  if (arglar[0] === 'compile') {
    const kaynakKok = deger(arglar, '--dir');
    const hedef = deger(arglar, '-o');
    if (!kaynakKok || !hedef) cik(1, 'aapt2 compile: --dir ve -o gerekli');
    const girdiler = dosyalar(kaynakKok).map((tam) => zipGirdisi(
      `${relative(kaynakKok, tam)}.flat`, readFileSync(tam),
    ));
    if (girdiler.length === 0) cik(1, `aapt2 compile: ${kaynakKok} içinde kaynak yok`);
    klasorKur(dirname(resolve(hedef)));
    zipYaz(hedef, girdiler);
    process.exit(0);
  }

  if (arglar[0] === 'link') {
    const hedef = deger(arglar, '-o');
    const manifest = deger(arglar, '--manifest');
    const javaKok = deger(arglar, '--java');
    const paket = deger(arglar, '--custom-package');
    const varlikKok = deger(arglar, '-A');
    if (!hedef || !manifest || !javaKok || !paket) {
      cik(1, 'aapt2 link: -o, --manifest, --java, --custom-package gerekli');
    }
    if (!existsSync(manifest)) cik(1, `aapt2 link: manifest yok: ${manifest}`);

    // R.java: gerçek aapt2 gibi --custom-package'in klasör ağacına yazılır.
    const rKlasoru = join(javaKok, ...paket.split('.'));
    klasorKur(rKlasoru);
    writeFileSync(join(rKlasoru, 'R.java'), [
      `package ${paket};`,
      'public final class R {',
      '    public static final class string {',
      '        public static final int uygulama_adi = 0x7f010000;',
      '    }',
      '}',
      '',
    ].join('\n'), 'utf8');

    const dokum = {
      kimlik: deger(arglar, '--rename-manifest-package'),
      paket,
      enDusukSdk: deger(arglar, '--min-sdk-version'),
      hedefSdk: deger(arglar, '--target-sdk-version'),
      surumKodu: deger(arglar, '--version-code'),
      surumAdi: deger(arglar, '--version-name'),
      platformJar: deger(arglar, '-I'),
      varlikKok,
    };

    const girdiler = [
      zipGirdisi('AndroidManifest.xml', readFileSync(manifest)),
      zipGirdisi('resources.arsc', Buffer.from('SAHTE-ARSC', 'utf8')),
      zipGirdisi(LINK_GIRDISI, Buffer.from(JSON.stringify(dokum), 'utf8')),
    ];
    if (varlikKok) {
      for (const tam of dosyalar(varlikKok)) {
        // ÖLÇÜLDÜ (tasokey#56, gerçek kurulum): aapt2 Windows'ta alt klasörlü varlıkları
        // İŞLETİM SİSTEMİ ayracıyla yazıyor (`assets/oyun\arayuz\ekran.js`). Taklit de öyle
        // yazar (adı BİLEREK normalleştirilmez) — betiğin düzeltme adımı ölçülebilsin.
        girdiler.push({ ad: `assets/${relative(varlikKok, tam)}`, veri: readFileSync(tam) });
      }
    }
    klasorKur(dirname(resolve(hedef)));
    zipYaz(hedef, girdiler);
    process.exit(0);
  }

  cik(1, `aapt2: bilinmeyen komut: ${arglar[0]}`);
}

// --- aapt (v1) ----------------------------------------------------------------

function aapt(arglar) {
  if (arglar[0] === 'v' || arglar[0] === 'version') {
    cik(0, `Android Asset Packaging Tool, v${AAPT_SURUM}`);
  }
  if (arglar[0] === 'add') {
    const apk = arglar[1];
    const eklenenler = arglar.slice(2);
    if (!apk || eklenenler.length === 0) cik(1, 'aapt add: apk ve en az bir dosya gerekli');
    if (!existsSync(apk)) cik(1, `aapt add: apk yok: ${apk}`);
    const girdiler = zipOku(apk);
    for (const ad of eklenenler) {
      // Gerçek `aapt add` girdiyi VERİLDİĞİ yolla saklar → çalışma klasörüne göre okunur.
      if (!existsSync(ad)) cik(1, `aapt add: dosya yok (çalışma klasörü: ${process.cwd()}): ${ad}`);
      const sira = girdiler.findIndex((g) => g.ad === ad.replace(/\\/g, '/'));
      const girdi = zipGirdisi(ad, readFileSync(ad));
      if (sira >= 0) girdiler[sira] = girdi; else girdiler.push(girdi);
      bas(`    adding: ${ad}`);
    }
    zipYaz(apk, girdiler);
    process.exit(0);
  }
  if (arglar[0] === 'list' || arglar[0] === 'l') {
    const apk = arglar[arglar.length - 1];
    for (const { ad } of zipOku(apk)) bas(ad);
    process.exit(0);
  }
  cik(1, `aapt: bilinmeyen komut: ${arglar[0]}`);
}

// --- javac --------------------------------------------------------------------

const SINIF_DESENI = /^\s*(?:public\s+|final\s+|abstract\s+)*(?:class|interface|enum)\s+(\w+)/m;
const PAKET_DESENI = /^\s*package\s+([\w.]+)\s*;/m;

function javac(arglar) {
  const kaynaklar = arglar.filter((a) => a.endsWith('.java'));
  if (kaynaklar.length === 0) {
    // `-version` (yol-coz.ps1'in sürüm ölçümü) ya da yalnız seçenek doğrulaması.
    if (arglar.includes('-source') && arglar[arglar.indexOf('-source') + 1] !== '8') {
      cik(2, `javac: invalid source release: ${arglar[arglar.indexOf('-source') + 1]}`);
    }
    cik(0, `javac ${JAVAC_SURUM}`);
  }
  const hedef = deger(arglar, '-d');
  if (!hedef) cik(1, 'javac: -d gerekli');
  for (const kaynak of kaynaklar) {
    if (!existsSync(kaynak)) cik(1, `javac: kaynak yok: ${kaynak}`);
    const metin = readFileSync(kaynak, 'utf8');
    const paket = PAKET_DESENI.exec(metin)?.[1];
    const sinif = SINIF_DESENI.exec(metin)?.[1];
    if (!paket || !sinif) cik(1, `javac: paket/sınıf okunamadı: ${kaynak}`);
    const klasor = join(hedef, ...paket.split('.'));
    klasorKur(klasor);
    writeFileSync(join(klasor, `${sinif}.class`), SINIF_IMZASI);
  }
  process.exit(0);
}

// --- d8 -----------------------------------------------------------------------

// Gerçek `d8.bat` / `apksigner.bat` java'yı JAVA_HOME ya da PATH'te arar; bu makinede ikisi de
// yok (android/ARACLAR.md §3), yani betik JDK kökünü alt sürece KENDİSİ vermek zorunda — gerçek
// koşuda ölçülen kusur buydu (tasokey#56, `is/tasokey-56/derleme-gunlugu.txt`). Sahte araçlar da
// aynı şeyi ister, böylece kusur kalıcı ölçüme bağlanır. Sürüm sorgusu bu kapıya girmez: yol
// çözücü JAVA_HOME vermiyor ve vermesi de gerekmiyor.
function javaHomeGerek(ad) {
  const kok = process.env.JAVA_HOME;
  if (!kok || !existsSync(kok)) {
    cik(1, `ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. (${ad})`);
  }
}

function d8(arglar) {
  if (arglar.includes('--version')) cik(0, D8_SURUM);
  javaHomeGerek('d8');
  const hedef = deger(arglar, '--output');
  const siniflar = arglar.filter((a) => a.endsWith('.class'));
  if (!hedef) cik(1, 'd8: --output gerekli');
  if (siniflar.length === 0) cik(1, 'd8: girdi .class dosyası yok');
  klasorKur(hedef);
  writeFileSync(join(hedef, 'classes.dex'), Buffer.concat([DEX_IMZASI, Buffer.alloc(24)]));
  process.exit(0);
}

// --- zipalign -----------------------------------------------------------------

function zipalign(arglar) {
  if (arglar.includes('-h') || arglar.length === 0) {
    // Gerçek zipalign sürüm bayrağı tanımaz: kullanım metni basıp 2 ile çıkar.
    bas('Zip alignment utility');
    bas('Usage: zipalign [-f] [-p] [-v] [-z] align infile outfile');
    process.exit(2);
  }
  const girdi = arglar[arglar.length - 2];
  const cikti = arglar[arglar.length - 1];
  if (!existsSync(girdi)) cik(1, `zipalign: girdi yok: ${girdi}`);
  // Hizalama bu taklit için anlamsız; dosya olduğu gibi taşınır (zincir sürsün).
  writeFileSync(cikti, readFileSync(girdi));
  process.exit(0);
}

// --- apksigner ----------------------------------------------------------------

function parolaOku(arglar, bayrak, satir = 0) {
  const ham = deger(arglar, bayrak);
  if (!ham) return null;
  if (!ham.startsWith('file:')) cik(1, `apksigner: ${bayrak} yalnız file: kaynağı ile desteklenir`);
  const yol = ham.slice('file:'.length);
  if (!existsSync(yol)) cik(1, `apksigner: parola dosyası yok: ${yol}`);
  const satirlar = readFileSync(yol, 'utf8').split(/\r?\n/);
  // Gerçek apksigner `file:` kaynaklarını ARDIŞIK SATIR olarak okur: aynı dosya iki parola için
  // verilirse ikincisi bir sonraki satırdan gelir, satır yoksa EOF hatası verir (gerçek
  // kurulumda ölçüldü, tasokey#56). Taklit de öyle davranır ki kusur bir daha sessiz dönmesin.
  const parola = satirlar[satir];
  if (!parola) {
    cik(2, 'Failed to load signer "signer #1"\n'
      + `java.io.IOException: Failed to read Key password for signer #1 : end of file reached in ${yol}`);
  }
  return parola;
}

function apksigner(arglar) {
  if (arglar[0] === '--version') cik(0, APKSIGNER_SURUM);

  if (arglar[0] === 'sign') {
    javaHomeGerek('apksigner sign');
    const depo = deger(arglar, '--ks');
    const cikti = deger(arglar, '--out');
    const girdi = arglar[arglar.length - 1];
    if (!depo || !cikti) cik(1, 'apksigner sign: --ks ve --out gerekli');
    if (!existsSync(depo)) cik(1, `apksigner sign: anahtar deposu yok: ${depo}`);
    if (!existsSync(girdi)) cik(1, `apksigner sign: girdi APK yok: ${girdi}`);
    const depoParolasi = parolaOku(arglar, '--ks-pass');
    if (!depoParolasi) cik(1, 'apksigner sign: --ks-pass gerekli');
    // Anahtar parolası aynı dosyadan geliyorsa SIRADAKİ satır okunur (gerçek davranış).
    const ayniDosya = deger(arglar, '--key-pass') === deger(arglar, '--ks-pass');
    const imza = {
      depo, takmaAd: deger(arglar, '--ks-key-alias'),
      depoParolasiUzunlugu: depoParolasi.length,
      anahtarParolasiVar: parolaOku(arglar, '--key-pass', ayniDosya ? 1 : 0) !== null,
    };
    const girdiler = zipOku(girdi);
    girdiler.push(zipGirdisi(IMZA_GIRDISI, Buffer.from(JSON.stringify(imza), 'utf8')));
    zipYaz(cikti, girdiler);
    process.exit(0);
  }

  if (arglar[0] === 'verify') {
    javaHomeGerek('apksigner verify');
    const apk = arglar[arglar.length - 1];
    if (!existsSync(apk)) cik(1, `apksigner verify: APK yok: ${apk}`);
    const imzali = zipOku(apk).some((g) => g.ad === IMZA_GIRDISI);
    if (!imzali) cik(1, `DOES NOT VERIFY\nERROR: ${apk} imzasız`);
    bas('Verifies');
    bas('Verified using v1 scheme (JAR signing): true');
    bas('Verified using v2 scheme (APK Signature Scheme v2): true');
    bas('Signer #1 certificate DN: CN=sahte');
    process.exit(0);
  }

  cik(1, `apksigner: bilinmeyen komut: ${arglar[0]}`);
}

// --- Dağıtıcı -----------------------------------------------------------------

const ARACLAR = { aapt2, aapt, javac, d8, zipalign, apksigner };

// Yalnız DOĞRUDAN çalıştırıldığında dağıtım yapılır: testler bu dosyadan sabitleri (IMZA_GIRDISI,
// LINK_GIRDISI, sürümler) içe alıyor; import sırasında araç çalıştırmaya kalkarsa test çöker.
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const ad = process.argv[2];
  const arglar = process.argv.slice(3);
  gunlukle(ad, arglar);
  const arac = ARACLAR[ad];
  if (!arac) cik(1, `sahte araç tanınmadı: ${ad}`);
  arac(arglar);
}
