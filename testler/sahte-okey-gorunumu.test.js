import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BILGI } from '../docs/arayuz/kabuk.js';
import { tasOkeyMi, tasDegeri, tasOzelMi } from '../docs/cekirdek/dagitim.js';
import { elDokumu } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#82 (ADR-027, üst iş tasokey#80 planı İş 2) — "joker vurgusu yalnız gerçek okeyde,
// sahte okey kendi kimliğiyle". Sahip'in gördüğü: ıstakadaki yıldızlı sahte okey artık gerçek
// okeyin sarı çerçevesini taşımaz; yıldız gövdesi kalır ve taşın üstünde o elin okey değeri
// (ör. kırmızı 11) küçük yazıyla okunur. Attığında çıkan pencere sahte okeye özgü metni gösterir.
//
// Arayüz kuralı YENİDEN YAZMAZ: "joker mi" ve "değeri ne" soruları `cekirdek/dagitim.js`'e
// (`tasOkeyMi`, `tasDegeri`) sorulur. DOM açılmadığı için çizim kaynak taramasıyla, kuralın
// kendisi saf çağrılarla ölçülür (projenin `okey-atma-bilgisi.test.js` dili).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const OKEY_TASI = { renk: 'kirmizi', sayi: 11 }; // gösterge kirmizi-10 (Sahip'in ekran görüntüsü)
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);
const KURAL_ESKI_JOKER = { ...KURAL_VARSAYILAN, sahteOkeyJokerGibiDavranir: true };

/** Adı verilen işlevin gövdesi (tek seviyeli: ilk sütundaki `}` kapatır). */
function govde(ad) {
  const eslesme = EKRAN_JS.match(new RegExp(`function ${ad}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(eslesme, `ekran.js içinde ${ad} bulunamadı`);
  return eslesme[1];
}

// ── kabul (a): sarı joker çerçevesi yalnız gerçek okeyde ──

test('kabul-a: okey çerçevesi yalnız tasOkeyMi doğruyken konur; sahte okey kendi gövdesini korur', () => {
  const g = govde('tasElemaniOlustur');
  assert.match(
    g, /if \(tasOkeyMi\(tas, okeyTasi\)\) div\.appendChild\(gorselOlustur\('tas-okey-cerceve\.svg'/,
    'çerçeve "joker mi" sorusunun tek kapısından geçmiyor',
  );
  assert.equal(
    (g.match(/tas-okey-cerceve\.svg/g) || []).length, 1,
    'okey çerçevesi birden çok yerden konuyor: tek kapı bozulmuş',
  );
  assert.match(g, /tasGovdeDosyasi\(tas\)/, 'sahte okeyin yıldız gövdesi artık çizilmiyor');
  assert.match(
    govde('tasGovdeDosyasi'), /tas-sahte-okey\.svg/,
    'yıldız gövdesi (tas-sahte-okey.svg) korunmalı',
  );
});

test('kabul-a: çerçeve kararı sahte okeyde kuralla birlikte döner (iki yönlü)', () => {
  // Arayüz kararı tek satırda `tasOkeyMi`ye bağlı; o satırın iki yöndeki cevabı burada ölçülür.
  assert.equal(tasOkeyMi(sOkey(1), OKEY_TASI), false, 'sahte okey çerçeve almamalı');
  assert.equal(tasOkeyMi(t('kirmizi', 11), OKEY_TASI), true, 'gerçek okey çerçeve almalı');
  assert.equal(tasOkeyMi(t('kirmizi', 10), OKEY_TASI), false, 'göstergenin kopyası çerçeve almamalı');
  assert.equal(
    tasOkeyMi(sOkey(1), OKEY_TASI, KURAL_ESKI_JOKER), true,
    'kapatma anahtarı açıkken sahte okey yine joker: çerçeve geri gelir',
  );
});

// ── kabul (a): değer yazısı — taşın üstünde o elin okey değeri ──

test('kabul-a: sahte okeye değer yazısı konur ve değer çekirdekten (tasDegeri) sorulur', () => {
  const g = govde('tasElemaniOlustur');
  assert.match(g, /tasDegerEtiketiOlustur\(tasDegeri\(tas, okeyTasi\)\)/, 'değer çekirdeğe sorulmuyor');
  assert.match(
    govde('tasDegerEtiketiOlustur'), /textContent = String\(deger\.sayi\)/,
    'değer yazısı taşın sayısını basmıyor',
  );
  assert.match(
    govde('tasDegerEtiketiOlustur'), /`tas-deger \$\{deger\.renk\}`/,
    'değer yazısı değerin rengini almıyor',
  );
  // Değerin kendisi: gösterge kirmizi-10 → sahte okey "kırmızı 11".
  assert.deepEqual(
    { renk: tasDegeri(sOkey(1), OKEY_TASI).renk, sayi: tasDegeri(sOkey(1), OKEY_TASI).sayi },
    { renk: 'kirmizi', sayi: 11 },
  );
});

test('kabul-a: değer yazısının ölçüsü taş ölçüsünden türer (kademelerde birlikte küçülür)', () => {
  assert.match(STIL_CSS, /--tas-deger-font-boyutu: calc\(var\(--tas-yukseklik\) \* var\(--tas-deger-oran\)\)/);
  assert.match(STIL_CSS, /\.kenar-taslar \.tas-deger \{ font-size: calc\(var\(--rakip-acik-tas-yukseklik\)/);
  for (const renk of ['kirmizi', 'siyah', 'mavi', 'sari']) {
    assert.ok(
      STIL_CSS.includes(`.tas-deger.${renk} { color: var(--renk-${renk}); }`),
      `.tas-deger.${renk} rengi stil.css'te yok`,
    );
  }
  // Yıldız SVG'si y 29-81, nokta y ~110: değer yazısı taşın ilk %21'lik bandında kalmalı.
  const ust = Number(STIL_CSS.match(/--tas-deger-ust: (\d+(?:\.\d+)?)%/)[1]);
  const yukseklik = Number(STIL_CSS.match(/--tas-deger-yukseklik: (\d+(?:\.\d+)?)%/)[1]);
  assert.ok(ust + yukseklik <= 21, `değer yazısı yıldızın üstüne taşıyor: %${ust + yukseklik}`);
});

// ── kabul (b): dil anahtarları ayrışır, sabit metin yok ──

test('kabul-b: tas.etiketSahteOkey iki dilde de DEĞER yer tutucularını taşıyor', () => {
  for (const [ad, tablo] of [['tr', TR], ['en', EN]]) {
    const metin = tablo['tas.etiketSahteOkey'];
    assert.equal(typeof metin, 'string', `${ad}.json'da tas.etiketSahteOkey yok`);
    assert.match(metin, /\{0\}/, `${ad}: etikette renk yer tutucusu yok`);
    assert.match(metin, /\{1\}/, `${ad}: etikette sayı yer tutucusu yok`);
  }
  assert.notEqual(TR['tas.etiketSahteOkey'], EN['tas.etiketSahteOkey'], 'çevrilmemiş');
  assert.match(
    govde('tasAriaEtiketi'),
    /metinAl\('tas\.etiketSahteOkey', \[metinAl\(`renk\.\$\{deger\.renk\}`\), deger\.sayi\]\)/,
    'etiket değeri çekirdekten sorulan değerle doldurulmuyor',
  );
});

test('kabul-b: bilgi penceresi ikiye ayrıldı; iki metin de iki dilde dolu ve farklı', () => {
  assert.equal(BILGI.SAHTE_OKEY_ATILDI, 'sahteOkeyAtildi');
  assert.notEqual(BILGI.OKEY_ATILDI, BILGI.SAHTE_OKEY_ATILDI);
  for (const anahtar of ['bilgi.okeyAtildi', 'bilgi.sahteOkeyAtildi']) {
    for (const [ad, tablo] of [['tr', TR], ['en', EN]]) {
      assert.ok(tablo[anahtar]?.trim().length > 0, `${ad}.json boş ya da yok: ${anahtar}`);
    }
    assert.notEqual(TR[anahtar], EN[anahtar], `çevrilmemiş: ${anahtar}`);
  }
  assert.notEqual(TR['bilgi.okeyAtildi'], TR['bilgi.sahteOkeyAtildi'], 'iki pencere aynı metni veriyor');
  // Eski birleşik cümle ("okey ya da sahte okey") artık okey metninde kalmamalı.
  assert.doesNotMatch(TR['bilgi.okeyAtildi'], /sahte okey/i, 'okey metni hâlâ sahte okeyden söz ediyor');
  assert.doesNotMatch(EN['bilgi.okeyAtildi'], /fake joker/i, 'okey metni hâlâ sahte okeyden söz ediyor');
});

test('kabul-b: hangi pencerenin açılacağına çekirdek karar veriyor (arayüzde ikinci kural yok)', () => {
  const g = govde('atVeyaBitirUygula');
  assert.match(g, /tasOzelMi\(atilanTas, okeyTasi\)/, 'pencerenin açılması "özel taş mı"ya sorulmuyor');
  assert.match(
    g, /tasOkeyMi\(atilanTas, okeyTasi\)\s*\?\s*BILGI\.OKEY_ATILDI\s*:\s*BILGI\.SAHTE_OKEY_ATILDI/,
    'metin seçimi "joker mi" sorusunun tek kapısından geçmiyor',
  );
  assert.doesNotMatch(g, /tur === 'sahteOkey'/, 'arayüz taş türünü kendi yorumluyor');

  // Karşılığı: sahte okey atıldığında pencere açılır ama metin sahte okeye özgüdür; anahtar
  // açıldığında sahte okey yine joker sayılır ve joker metnine döner.
  const sahte = sOkey(1);
  assert.equal(tasOzelMi(sahte, OKEY_TASI), true, 'sahte okey atışında pencere açılmalı');
  assert.equal(tasOkeyMi(sahte, OKEY_TASI), false, 'varsayılanda sahte okey metni gelmeli');
  assert.equal(tasOkeyMi(sahte, OKEY_TASI, KURAL_ESKI_JOKER), true, 'anahtar açıkken joker metni gelmeli');
});

// ── kabul (c): sonuç penceresindeki "okey" sayısı yalnız gerçek okeyleri sayar ──

test('kabul-c: elDokumu().okeySayisi yalnız gerçek okeyleri sayar (iki yönlü)', () => {
  const el = [t('kirmizi', 11, 1), t('kirmizi', 11, 2), sOkey(1), t('siyah', 3)];
  assert.equal(elDokumu(el, OKEY_TASI).okeySayisi, 2, 'yalnız iki gerçek okey sayılmalı');
  assert.equal(
    elDokumu(el, OKEY_TASI, KURAL_ESKI_JOKER).okeySayisi, 3,
    'anahtar açıkken sahte okey de sayılır (eski davranış)',
  );
  // Sonuç penceresi bu sayıyı dil anahtarıyla basar, kendi saymaz.
  assert.match(EKRAN_JS, /sonuc\.dokumOkey/, 'sonuç penceresi okey sayısını dil anahtarından basmıyor');
  assert.match(EKRAN_JS, /okeySayisi/, 'sonuç penceresi okey sayısını dökümden okumuyor');
});
