// Sahte Unity Android araç ağacı kurucusu (tasokey#53).
//
// `android/yol-coz.ps1`in KENDİ mantığı (öncelik sırası, en yeni build-tools seçimi, eksik araçta
// çıkış kodu, sürüm türetme, dex→APK yolu) gerçek bir Unity kurulumu olmadan ölçülebilsin diye
// Unity'nin AndroidPlayer klasör düzenini taklit eder: her araç, gerçek aracın çıktı biçiminde
// sürüm basan bir `.cmd` taslağı; platform jar'ı boş dosya.
//
// Hem `android-yol-coz.test.js` hem de kanıt üretimi (ör. örnek rapor çıktısı) aynı ağacı
// kullanır; ağaç iki yerde kurulmasın (tek kaynak — `css-olcu.js` ile aynı gerekçe).
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const BUILD_TOOLS = '36.0.0';
export const API = 36;
export const JDK_SURUM = '17.0.11';
export const BUNDLETOOL_SURUM = '1.15.6';

// Sözlük sırasında "36.0.0"dan büyük görünen sürümler de var: seçim sayısal olmalı.
const ESKI_BUILD_TOOLS = ['35.0.0', '9.0.0'];
const EK_API = 34;

const ZIP_BASLIK = 'PK\u0003\u0004';

/** Gerçek araçların sürüm çıktısı biçiminde taslaklar. */
const TASLAKLAR = {
  java: [
    '@echo off',
    'echo %* | findstr /C:"bundletool" >nul',
    'if %errorlevel%==0 (',
    `  echo ${BUNDLETOOL_SURUM}`,
    '  exit /b 0',
    ')',
    `echo openjdk version "${JDK_SURUM}" 2024-04-16 1>&2`,
    'exit /b 0',
  ],
  // Gerçek keytool sürümünü bildirmez → çözücü JDK sürümünden türetmeli.
  keytool: ['@echo off', 'echo Illegal option:  -version 1>&2', 'exit /b 1'],
  aapt2: ['@echo off', 'echo Android Asset Packaging Tool (aapt) 2.19-9602130', 'exit /b 0'],
  aapt: ['@echo off', 'echo Android Asset Packaging Tool, v0.2-9602130', 'exit /b 0'],
  d8: ['@echo off', 'echo 8.2.42-dev', 'exit /b 0'],
  // Gerçek zipalign sürüm bayrağı tanımaz: kullanım metni basar, 2 ile çıkar → build-tools'tan türetilmeli.
  zipalign: [
    '@echo off',
    'echo Zip alignment utility',
    'echo Usage: zipalign [-f] [-p] [-v] align infile outfile',
    'exit /b 2',
  ],
  apksigner: ['@echo off', 'echo 0.9', 'exit /b 0'],
};

function javacTaslagi(source8Destekli) {
  if (source8Destekli) return ['@echo off', `echo javac ${JDK_SURUM}`, 'exit /b 0'];
  return [
    '@echo off',
    'echo %* | findstr /C:"-source" >nul',
    'if %errorlevel%==0 (',
    '  echo javac: invalid source release: 8 1>&2',
    '  exit /b 2',
    ')',
    `echo javac ${JDK_SURUM}`,
    'exit /b 0',
  ];
}

function cmdYaz(yol, satirlar) {
  writeFileSync(yol, `${satirlar.join('\r\n')}\r\n`, 'ascii');
}

/**
 * Sahte Unity kurulumunu `kok` altına kurar ve kökü geri verir.
 * @param {string} kok kurulacak klasör (yoksa oluşturulur)
 * @param {{yok?: string[], source8?: boolean, androidPlayer?: boolean}} secenekler
 *   yok: kurulmayacak araç adları (`android.jar` da bir ad) ·
 *   source8: javac `-source 8` destekliyor mu ·
 *   androidPlayer: Android Build Support modülü kurulu mu
 */
export function sahteUnityKur(kok, secenekler = {}) {
  const { yok = [], source8 = true, androidPlayer = true } = secenekler;
  mkdirSync(kok, { recursive: true });
  if (!androidPlayer) {
    mkdirSync(join(kok, 'Editor', 'Data'), { recursive: true });
    return kok;
  }

  const oynatici = join(kok, 'Editor', 'Data', 'PlaybackEngines', 'AndroidPlayer');
  const jdkBin = join(oynatici, 'OpenJDK', 'bin');
  const buildTools = join(oynatici, 'SDK', 'build-tools', BUILD_TOOLS);
  const tools = join(oynatici, 'Tools');
  for (const dizin of [jdkBin, buildTools, tools]) mkdirSync(dizin, { recursive: true });
  for (const eski of ESKI_BUILD_TOOLS) {
    mkdirSync(join(oynatici, 'SDK', 'build-tools', eski), { recursive: true });
  }
  for (const api of [EK_API, API]) {
    const platform = join(oynatici, 'SDK', 'platforms', `android-${api}`);
    mkdirSync(platform, { recursive: true });
    if (!yok.includes('android.jar') || api !== API) {
      writeFileSync(join(platform, 'android.jar'), ZIP_BASLIK);
    }
  }

  const hedefler = {
    java: jdkBin, javac: jdkBin, keytool: jdkBin,
    aapt2: buildTools, aapt: buildTools, d8: buildTools, zipalign: buildTools, apksigner: buildTools,
  };
  for (const [arac, dizin] of Object.entries(hedefler)) {
    if (yok.includes(arac)) continue;
    cmdYaz(join(dizin, `${arac}.cmd`), arac === 'javac' ? javacTaslagi(source8) : TASLAKLAR[arac]);
  }
  if (!yok.includes('bundletool')) {
    writeFileSync(join(tools, `bundletool-all-${BUNDLETOOL_SURUM}.jar`), ZIP_BASLIK);
  }
  return kok;
}

export const EK_API_SEVIYESI = EK_API;
