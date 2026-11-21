import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  sahteUnityKur, BUILD_TOOLS, API, JDK_SURUM, BUNDLETOOL_SURUM, EK_API_SEVIYESI,
} from './yardimci/android-sahte-unity.js';

// tasokey#53 (üst iş tasokey#52) — `android/yol-coz.ps1` APK üreten bütün betiklerin TEK yol
// kaynağıdır (Android araç zincirinin mimari kararı PRD farkı onayıyla açılacak; numarası o zaman
// buraya yazılır). Gerçek Unity kurulumu her makinede farklı; o yüzden çözücünün KENDİ mantığı
// (öncelik sırası, en yeni build-tools seçimi, eksik araçta çıkış kodu, sürüm türetme,
// dex→APK yolu seçimi) sahte bir Unity ağacıyla ölçülür (`yardimci/android-sahte-unity.js`).
// Böylece test hiçbir kuruluma bağlı değil; gerçek kurulumun ölçümü android/ARACLAR.md'de.
//
// Sahte ağaç geçici klasörde kurulur (depo kirlenmesin), test sonunda silinir.
// Betik yalnız Windows kabuğunda çalışır → başka işletim sisteminde testler atlanır.

const KOK = join(import.meta.dirname, '..');
const BETIK = join(KOK, 'android', 'yol-coz.ps1');

// Unity Hub kurulumları sürüm adlı klasörlerde durur; sahte ağacın kökü de öyle adlandırılabilsin
// (bir aracın bastığı YOL içindeki sürüm dizesi sürüm sanılmamalı — aşağıdaki ilgili test).
const UNITY_SURUM_KLASORU = '6000.3.9f1';

/** Kabuk: kabul ölçütündeki `pwsh` varsa o, yoksa Windows PowerShell (hangisi varsa, ölçülür). */
function kabukBul() {
  if (process.platform !== 'win32') return null;
  for (const aday of ['pwsh.exe', 'powershell.exe']) {
    const deneme = spawnSync(aday, ['-NoProfile', '-Command', 'exit 7'], { encoding: 'utf8' });
    if (!deneme.error && deneme.status === 7) return aday;
  }
  return null;
}

const KABUK = kabukBul();
const ATLA = KABUK ? false : 'PowerShell bulunamadı (betik yalnız Windows kabuğunda çalışır)';

const GECICI_KOK = KABUK ? mkdtempSync(join(tmpdir(), 'tasokey-android-')) : null;
after(() => {
  if (GECICI_KOK) rmSync(GECICI_KOK, { recursive: true, force: true });
});

function agacKur(ad, secenekler) {
  return sahteUnityKur(join(GECICI_KOK, ad), secenekler);
}

function kos(arglar, ortam = {}) {
  const sonuc = spawnSync(
    KABUK,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BETIK, ...arglar],
    { encoding: 'utf8', env: { ...process.env, ...ortam }, timeout: 120_000 },
  );
  assert.equal(sonuc.error, undefined, `kabuk çalıştırılamadı: ${sonuc.error}`);
  return { kod: sonuc.status, cikti: `${sonuc.stdout ?? ''}${sonuc.stderr ?? ''}` };
}

/** `-Json` çıktısı (PowerShell JSON'u ASCII kaçışlı basar → kod sayfasından bağımsız okunur). */
function envanter(arglar, ortam = {}) {
  const { kod, cikti } = kos(['-Json', ...arglar], ortam);
  const satir = cikti.split('\n').find((s) => s.trim().startsWith('{'));
  assert.ok(satir, `JSON satırı yok. Çıktı:\n${cikti}`);
  return { kod, e: JSON.parse(satir) };
}

/** Rapordaki bir aracın satırı. `aapt` ararken `aapt2`ye takılmamak için ad sınırı aranır. */
function aracSatiri(cikti, arac) {
  const deseni = new RegExp(`^${arac}\\*?\\s`);
  return cikti.split('\n').find((satir) => deseni.test(satir.trimStart()));
}

// --- ASIL KABUL: `-Rapor` → çıkış kodu 0 ve her aracın yolu + sürümü basılır ------------------

test('ASIL KABUL: tam kurulumda -Rapor çıkış kodu 0 verir, her aracın yolu ve sürümü basılır', { skip: ATLA }, () => {
  const kok = agacKur('tam');
  const { kod, cikti } = kos(['-UnityKok', kok, '-Rapor']);

  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  const beklenen = [
    ['java', JDK_SURUM], ['javac', JDK_SURUM], ['keytool', JDK_SURUM],
    ['aapt2', '2.19'], ['aapt', '0.2'], ['d8', '8.2.42'],
    ['zipalign', BUILD_TOOLS], ['apksigner', '0.9'], ['bundletool', BUNDLETOOL_SURUM],
  ];
  for (const [arac, surum] of beklenen) {
    const satir = aracSatiri(cikti, arac);
    assert.ok(satir, `raporda ${arac} satırı yok. Çıktı:\n${cikti}`);
    assert.match(satir, new RegExp(surum.replace(/\./g, '\\.')), `${arac} sürümü basılmamış: ${satir}`);
    assert.match(satir, /[A-Za-z]:\\/, `${arac} yolu basılmamış: ${satir}`);
  }
  assert.match(cikti, /TAMAM/);
  assert.match(cikti, new RegExp(`android-${API}`));
  assert.match(cikti, new RegExp(BUILD_TOOLS.replace(/\./g, '\\.')));
});

test('tam kurulumda envanter alanları doldurulur (başka betikler için tek kaynak)', { skip: ATLA }, () => {
  const kok = agacKur('tam');
  const { kod, e } = envanter(['-UnityKok', kok]);

  assert.equal(kod, 0);
  assert.deepEqual(e.eksikler, []);
  assert.equal(e.kaynak, '-UnityKok');
  assert.equal(e.unityKok, kok);
  assert.equal(e.buildToolsSurum, BUILD_TOOLS, 'build-tools seçimi sayısal olmalı (9.0.0 değil)');
  assert.ok(e.platformJar.endsWith(`android-${API}\\android.jar`), e.platformJar);
  assert.ok(e.araclar.java.yol.endsWith('OpenJDK\\bin\\java.cmd'), e.araclar.java.yol);
  assert.ok(e.araclar.aapt2.yol.includes(`build-tools\\${BUILD_TOOLS}`), e.araclar.aapt2.yol);
  assert.equal(e.source8, 'evet');
  assert.ok(e.zipArchive, '.NET ZipArchive bulunamadı (dex ekleme yedeği yok)');
  assert.match(e.dexEklemeYolu, /^aapt-add/, e.dexEklemeYolu);
});

test('sürümünü bildirmeyen araçların sürümü türetilir ve uyarı yazılır', { skip: ATLA }, () => {
  const kok = agacKur('tam');
  const { e } = envanter(['-UnityKok', kok]);

  assert.match(e.araclar.keytool.surum, new RegExp(`^${JDK_SURUM.replace(/\./g, '\\.')} `), e.araclar.keytool.surum);
  assert.match(e.araclar.zipalign.surum, new RegExp(`^${BUILD_TOOLS.replace(/\./g, '\\.')} `), e.araclar.zipalign.surum);
  assert.equal(e.uyarilar.filter((u) => u.startsWith('keytool') || u.startsWith('zipalign')).length, 2);
});

test('ASIL KABUL: sürüm yerine kendi yolunu basan araçta yoldaki klasör adı sürüm sanılmaz', { skip: ATLA }, () => {
  // Gerçek kurulumda ölçüldü (tasokey#53): `zipalign -h` sürüm basmıyor, hata satırında kendi tam
  // yolunu basıyor; çözücü yoldaki Unity klasör adından ("6000.3.9f1") "6000.3.9" ayıklayıp sürüm
  // sanıyordu → türetme kolu hiç çalışmıyor, UYARI yazılmıyordu. Sahte ağaç bu yüzden Unity Hub
  // gibi SÜRÜM ADLI bir klasöre kurulur: yol gerçek bir sürüm dizesi taşısın.
  const kok = agacKur(UNITY_SURUM_KLASORU, { yolBasan: ['zipalign'] });
  const { kod, cikti } = kos(['-UnityKok', kok, '-Rapor']);

  assert.equal(kod, 0, `çıkış kodu 0 beklenirdi. Çıktı:\n${cikti}`);
  const satir = aracSatiri(cikti, 'zipalign');
  assert.ok(satir, `raporda zipalign satırı yok. Çıktı:\n${cikti}`);
  assert.match(satir, /\(build-tools sürümü\)/, `zipalign sürümü türetilmemiş: ${satir}`);
  assert.match(cikti, /UYARI\s+: zipalign/, `türetilmiş sürüm UYARI ile görünmeli. Çıktı:\n${cikti}`);

  const { e } = envanter(['-UnityKok', kok]);
  assert.equal(e.araclar.zipalign.surum, `${BUILD_TOOLS} (build-tools sürümü)`);
  assert.doesNotMatch(
    e.araclar.zipalign.surum, /6000/,
    'aracın kendi yolundaki Unity klasör adı sürüm olarak basılmış',
  );
  assert.ok(e.uyarilar.some((u) => u.startsWith('zipalign')), e.uyarilar.join(' | '));
});

// --- Eksik araç: 0 dışı çıkış kodu + eksiğin adı ---------------------------------------------

test('ASIL KABUL: zorunlu araç eksikse çıkış kodu 0 dışıdır ve eksiğin adı basılır', { skip: ATLA }, () => {
  const kok = agacKur('eksik-arac', { yok: ['zipalign', 'apksigner'] });

  const rapor = kos(['-UnityKok', kok, '-Rapor']);
  assert.notEqual(rapor.kod, 0, `0 dışı kod beklenirdi. Çıktı:\n${rapor.cikti}`);
  assert.match(rapor.cikti, /zipalign/);
  assert.match(rapor.cikti, /apksigner/);

  const { kod, e } = envanter(['-UnityKok', kok]);
  assert.equal(kod, 4);
  assert.deepEqual([...e.eksikler].sort(), ['apksigner', 'zipalign']);
  assert.equal(e.araclar.zipalign.yol, '');
  assert.equal(e.araclar.zipalign.surum, 'yok');
});

test('platform jar eksikse eksik listesinde tam adıyla geçer', { skip: ATLA }, () => {
  const kok = agacKur('eksik-jar', { yok: ['android.jar'] });
  const { kod, e } = envanter(['-UnityKok', kok]);

  assert.equal(kod, 4);
  assert.deepEqual(e.eksikler, [`platforms/android-${API}/android.jar`]);
  assert.ok(e.bulunanApiler.includes(`android-${EK_API_SEVIYESI}`), 'bulunan API seviyeleri raporlanmalı');
});

test('isteğe bağlı araçların yokluğu çıkış kodunu bozmaz (aapt, bundletool)', { skip: ATLA }, () => {
  const kok = agacKur('eksik-istege-bagli', { yok: ['aapt', 'bundletool'] });
  const { kod, e } = envanter(['-UnityKok', kok]);

  assert.equal(kod, 0, `isteğe bağlı araç eksikliği 0 dışı kod vermemeli: ${e.eksikler}`);
  assert.deepEqual(e.eksikler, []);
  assert.equal(e.araclar.bundletool.yol, '');
  assert.match(e.dexEklemeYolu, /^zip-archive/, 'aapt v1 yoksa dex ekleme .NET ZipArchive ile olmalı');
});

test('javac -source 8 desteklemiyorsa ölçüm "hayır" der ve uyarı verir (araç var → kod 0)', { skip: ATLA }, () => {
  const kok = agacKur('source8-yok', { source8: false });
  const { kod, e } = envanter(['-UnityKok', kok]);

  assert.equal(kod, 0);
  assert.equal(e.source8, 'hayır');
  assert.match(e.source8Cikti, /invalid source release: 8/);
  assert.ok(e.uyarilar.some((u) => u.includes('-source 8')), e.uyarilar.join(' | '));
});

// --- Öncelik sırası: -UnityKok → ortam değişkeni → Hub -------------------------------------

test('ASIL KABUL: -UnityKok ortam değişkeninden önce gelir', { skip: ATLA }, () => {
  const parametre = agacKur('oncelik-parametre');
  const ortamKok = agacKur('oncelik-ortam');
  const { kod, e } = envanter(['-UnityKok', parametre], { TASOKEY_UNITY_KOK: ortamKok });

  assert.equal(kod, 0);
  assert.equal(e.unityKok, parametre);
  assert.equal(e.kaynak, '-UnityKok');
});

test('parametre yoksa ortam değişkeni kullanılır (Hub taranmaz)', { skip: ATLA }, () => {
  const ortamKok = agacKur('oncelik-ortam');
  const { kod, e } = envanter([], { TASOKEY_UNITY_KOK: ortamKok });

  assert.equal(kod, 0);
  assert.equal(e.unityKok, ortamKok);
  assert.equal(e.kaynak, 'ortam:TASOKEY_UNITY_KOK');
});

test('verilen Unity kökü yoksa Hub\'a düşmez, 0 dışı kodla durur ve kaynağı söyler', { skip: ATLA }, () => {
  const olmayan = join(GECICI_KOK, 'boyle-bir-unity-yok');
  const { kod, e } = envanter(['-UnityKok', olmayan]);

  assert.equal(kod, 2);
  assert.equal(Object.keys(e.araclar).length, 0, 'kök yoksa araç ölçümüne girilmemeli');
  assert.match(e.eksikler.join(' '), /Unity kökü yok/);
  assert.match(e.eksikler.join(' '), /-UnityKok/);
});

test('Unity var ama Android Build Support kurulu değilse ayrı çıkış kodu (3) verir', { skip: ATLA }, () => {
  const kok = agacKur('android-modulu-yok', { androidPlayer: false });
  const { kod, e } = envanter(['-UnityKok', kok]);

  assert.equal(kod, 3);
  assert.match(e.eksikler.join(' '), /AndroidPlayer/);
});

test('-ApiSeviyesi başka bir API seviyesine bakabilir (tek kaynak, gömülü sayı yok)', { skip: ATLA }, () => {
  const kok = agacKur('tam');
  const { kod, e } = envanter(['-UnityKok', kok, '-ApiSeviyesi', String(EK_API_SEVIYESI)]);

  assert.equal(kod, 0);
  assert.equal(e.apiSeviyesi, EK_API_SEVIYESI);
  assert.ok(e.platformJar.endsWith(`android-${EK_API_SEVIYESI}\\android.jar`), e.platformJar);
});
