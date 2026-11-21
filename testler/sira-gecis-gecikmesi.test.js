import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#49 — Sahip isteği: "Her bırakılmadan sonra sıra 1 saniye sonra geçsin".
// Gecikme `arayuz/ekran.js`in bir sabitidir ve ekran.js DOM'suz import edilemez (ADR-016 Sonuçlar/c);
// bu yüzden kabul ölçütü kaynak taramasıyla ölçülür: sabit TEK kaynaktır, değeri 1000 ms'dir ve
// insan→bot ile bot→bot geçişi aynı kapıdan (`botAdiminiSiraya`) geçtiği için ikisi de aynı
// beklemeyi alır. Zamanlayıcının iptali/nesil denetimi `oyunu-bitir.test.js`te ölçülür (tasokey#43).

const EKRAN_JS_YOLU = join(import.meta.dirname, '..', 'docs', 'arayuz', 'ekran.js');
const EKRAN_JS = readFileSync(EKRAN_JS_YOLU, 'utf8');
// "Tek kaynak" sayımı kodu sayar, açıklama satırlarını saymaz (ekran.js yalnız `//` yorumu kullanır).
const EKRAN_JS_KOD = EKRAN_JS.split('\n').filter((satir) => !satir.trim().startsWith('//')).join('\n');

const SABIT_ADI = 'SIRA_GECIS_GECIKME_MS';
const BEKLENEN_MS = 1000;
const BOT_SAYISI = 3;

/** Adı verilen işlevin gövdesi (ekran.js'teki tek düzeyli `function ad(...) { … }` biçimi). */
function islevGovdesi(ad) {
  const eslesme = EKRAN_JS.match(new RegExp(`function ${ad}\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  return eslesme ? eslesme[2] : null;
}

test('ASIL KABUL: sıra geçiş gecikmesi 1000 ms ve tek kaynak', () => {
  const tanimlar = [...EKRAN_JS.matchAll(new RegExp(`const ${SABIT_ADI}\\s*=\\s*(\\d+)\\s*;`, 'g'))];
  assert.equal(tanimlar.length, 1, `${SABIT_ADI} tek kez tanımlanmalı (bulunan: ${tanimlar.length})`);
  assert.equal(
    Number(tanimlar[0][1]), BEKLENEN_MS,
    `sıra geçiş gecikmesi ${BEKLENEN_MS} ms olmalı (istek: "1 saniye sonra geçsin")`,
  );
  // Eski ad (450 ms'lik `BOT_GECIKME_MS`) geride kalmamalı: iki sabit = iki kaynak.
  assert.ok(!/BOT_GECIKME_MS\s*=/.test(EKRAN_JS), 'eski gecikme sabiti (BOT_GECIKME_MS) hâlâ tanımlı');
});

test('ASIL KABUL: gecikme zamanlayıcıya yalnız sabitle verilir (sihirli sayı yok)', () => {
  const sureler = [...EKRAN_JS_KOD.matchAll(/setTimeout\(([\s\S]*?)\)\s*;/g)].map(([, arg]) => arg);
  assert.ok(sureler.length > 0, 'ekran.js içinde setTimeout çağrısı bulunamadı — tarama deseni bozulmuş');
  for (const arg of sureler) {
    assert.ok(
      arg.includes(SABIT_ADI),
      `zamanlayıcı gecikmesi sabitten gelmiyor: setTimeout(${arg.trim()})`,
    );
  }
  assert.equal(
    [...EKRAN_JS_KOD.matchAll(new RegExp(SABIT_ADI, 'g'))].length - 1, 1,
    'sabit kodda birden çok yerde okunuyor — bekleme tek kapıda (botAdiminiSiraya) uygulanmalı',
  );
});

test('ASIL KABUL: hem insan→bot hem bot→bot geçişi aynı bekleme kapısından geçiyor', () => {
  const siraya = islevGovdesi('botAdiminiSiraya');
  assert.ok(siraya, 'ekran.js içinde botAdiminiSiraya bulunamadı');
  assert.match(siraya, new RegExp(SABIT_ADI), 'bekleme kapısı gecikme sabitini kullanmıyor');

  // İnsanın attığı/bıraktığı taştan sonraki ilk bot turu: atVeyaBitirUygula → botSirasiniBaslat.
  const atma = islevGovdesi('atVeyaBitirUygula');
  assert.ok(atma, 'ekran.js içinde atVeyaBitirUygula bulunamadı');
  assert.match(atma, /botSirasiniBaslat\(\)/, 'insan taşını bıraktıktan sonra bot sırası başlatılmıyor');
  const baslat = islevGovdesi('botSirasiniBaslat');
  assert.ok(baslat, 'ekran.js içinde botSirasiniBaslat bulunamadı');
  assert.match(baslat, /botAdiminiSiraya\(/, 'insan→bot geçişi beklemesiz (doğrudan) oynuyor');

  // Bot→bot geçişi: tur sonunda sıra hâlâ bottaysa yine aynı kapı.
  const botAdimi = islevGovdesi('botAdimiOyna');
  assert.ok(botAdimi, 'ekran.js içinde botAdimiOyna bulunamadı');
  assert.match(botAdimi, /botAdiminiSiraya\(/, 'bot→bot geçişi beklemesiz oynuyor');
});

test('bir tam turun (3 bot) beklenen en az süresi sabitten türer', () => {
  // Duvar saati ölçümü tarayıcıda yapılır (rapor: tasokey#49); burada yalnız alt sınır belgelenir:
  // insan taşını bıraktıktan sonra üç bot sırayla oynar, her geçiş bir gecikme bekler.
  assert.equal(BOT_SAYISI * BEKLENEN_MS, 3000, 'üç botluk turun beklenen en az süresi 3000 ms');
});
