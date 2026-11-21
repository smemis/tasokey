import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EKRAN, OLAY, ZORLUKLAR, kabukBaslat, gecis, ustCubukBaslikTarifi,
} from '../docs/arayuz/kabuk.js';
import { KADEME } from '../docs/bot/bot.js';
import { cevir } from '../docs/dil/cevir.js';

// tasokey#45 — üst çubuk başlığı oynanan zorluk kademesini de gösterir (ADR-016/3, R-006/R-008).
// İstek: "Taş Okey — Kolay"; ayırıcı **koda gömülmez** (biçim `baslik.zorluklu` anahtarındadır),
// kademe adı `zorluk.<kademe>` anahtarından gelir, `baslangic` ekranında düz başlık kalır ve
// `document.title` (sekme adı) kademeyle DEĞİŞMEZ.
//
// Başlığın hangi anahtarlardan kurulduğu saf işlevle (`ustCubukBaslikTarifi`) ölçülür — DOM
// gerekmez; `ekran.js`in bu tarifi gerçekten kullandığı (ikinci bir birleştirme kuralı yazmadığı)
// `baslangic-ekrani`/`oyunu-bitir` testlerindeki kaynak taraması diliyle denetlenir.

const KOK = join(import.meta.dirname, '..');
const DOCS_KOK = join(KOK, 'docs');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const KABUK_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'kabuk.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));
const DILLER = { tr: TR, en: EN };

const BASLIK_ZORLUKLU = 'baslik.zorluklu';

/** Masa ekranında (el sürerken) duran kabuk. */
function masadakiKabuk(zorluk = KADEME.KOLAY) {
  return gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk }), OLAY.YENI_OYUN);
}

/** Sonuç ekranındaki kabuk (el bitti). */
function sonuctakiKabuk(zorluk = KADEME.KOLAY) {
  return gecis(masadakiKabuk(zorluk), OLAY.EL_BITTI);
}

/** Tarifi gerçek çeviriciyle metne dönüştürür — `ekran.js`in yaptığı işin aynısı, DOM'suz. */
function baslikMetni(kabuk, dilKodu, diller = DILLER) {
  const tarif = ustCubukBaslikTarifi(kabuk);
  const degerler = tarif.degerAnahtarlari.map((anahtar) => cevir(diller, dilKodu, anahtar));
  return cevir(diller, dilKodu, tarif.anahtar, degerler);
}

/**
 * Yorumları atılmış kaynak: yorum metinlerindeki tireler/uzun çizgiler taramaya karışmasın
 * (dosyaların açıklama yorumları uzun çizgi kullanıyor — aranan şey KOD içindeki sabit metin).
 */
function yorumsuz(icerik) {
  return icerik.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/\s\/\/.*$/gm, ' ');
}

// --- ASIL KABUL: başlık hangi anahtarlardan kuruluyor? ---

test('ASIL KABUL: masa ekranında başlık `baslik` + `zorluk.<kademe>` anahtarlarından kurulur', () => {
  for (const zorluk of ZORLUKLAR) {
    const tarif = ustCubukBaslikTarifi(masadakiKabuk(zorluk));
    assert.equal(tarif.anahtar, BASLIK_ZORLUKLU, `${zorluk}: başlık biçimi dil anahtarından gelmiyor`);
    assert.deepEqual(
      tarif.degerAnahtarlari,
      ['baslik', `zorluk.${zorluk}`],
      `${zorluk}: başlığın yer tutucuları beklenen anahtarlardan gelmiyor`,
    );
  }
});

test('ASIL KABUL: sonuç ekranında da kademe yazılır (aynı tarif)', () => {
  const tarif = ustCubukBaslikTarifi(sonuctakiKabuk(KADEME.ZOR));
  assert.equal(tarif.anahtar, BASLIK_ZORLUKLU);
  assert.deepEqual(tarif.degerAnahtarlari, ['baslik', `zorluk.${KADEME.ZOR}`]);
});

test('ASIL KABUL: başlangıç ekranında düz başlık kalır (kademe yazılmaz)', () => {
  const tarif = ustCubukBaslikTarifi(kabukBaslat());
  assert.equal(tarif.anahtar, 'baslik', 'başlangıç ekranında da zorluklu biçim kullanılıyor');
  assert.deepEqual(tarif.degerAnahtarlari, [], 'başlangıç başlığına yer tutucu değer giriyor');
});

test('ASIL KABUL: TR masa başlığı "Taş Okey — Kolay" olarak okunur, EN karşılığı da kurulur', () => {
  assert.equal(baslikMetni(masadakiKabuk(KADEME.KOLAY), 'tr'), 'Taş Okey — Kolay');
  assert.equal(baslikMetni(masadakiKabuk(KADEME.ORTA), 'tr'), 'Taş Okey — Orta');
  assert.equal(baslikMetni(masadakiKabuk(KADEME.ZOR), 'tr'), 'Taş Okey — Zor');
  assert.equal(baslikMetni(masadakiKabuk(KADEME.KOLAY), 'en'), 'Stone Rummikub — Easy');
  assert.equal(baslikMetni(kabukBaslat(), 'tr'), 'Taş Okey', 'başlangıç başlığı düz ürün adı olmalı');
});

// --- ayırıcı koda gömülmez ---

test('ayırıcı dil tablosundan gelir: biçim değişince başlık da değişir (kodda birleştirme yok)', () => {
  const sahteTablo = {
    xx: { baslik: 'URUN', 'zorluk.kolay': 'KADEME', [BASLIK_ZORLUKLU]: '<<{0}|{1}>>' },
  };
  assert.equal(baslikMetni(masadakiKabuk(KADEME.KOLAY), 'xx', sahteTablo), '<<URUN|KADEME>>');
});

test('ayırıcı kaynak kodda sabit metin olarak yazılmamış (yalnız dil dosyasında)', () => {
  const bicim = TR[BASLIK_ZORLUKLU];
  assert.ok(bicim, `tr.json'da ${BASLIK_ZORLUKLU} anahtarı yok`);
  const eslesme = bicim.match(/\{0\}([\s\S]*)\{1\}/);
  assert.ok(eslesme, `${BASLIK_ZORLUKLU} biçimi {0} … {1} sırasını taşımıyor: "${bicim}"`);
  const ayirici = eslesme[1].trim();
  assert.ok(ayirici.length > 0, `${BASLIK_ZORLUKLU} biçiminde ayırıcı yok: "${bicim}"`);
  for (const [ad, icerik] of [['ekran.js', EKRAN_JS], ['kabuk.js', KABUK_JS]]) {
    const kod = yorumsuz(icerik);
    assert.ok(kod.includes('ustCubukBaslikTarifi'), `${ad}: yorum ayıklaması bozuk (tarama güvenilmez)`);
    assert.ok(
      !kod.includes(ayirici),
      `${ad}: başlık ayırıcısı ("${ayirici}") koda gömülmüş — biçim yalnız dil anahtarında olmalı`,
    );
  }
});

// --- kaynak taraması: ekran.js ikinci bir kural yazmıyor, sekme adı değişmiyor ---

test('kaynak: ekran.js başlığı kabuğun tarifinden kurar, kademe adı yazmaz', () => {
  assert.match(EKRAN_JS, /ustCubukBaslikTarifi\(/, 'ekran.js başlık tarifini kabuktan almıyor');
  assert.ok(
    !/['"`](kolay|orta|zor)['"`]/.test(EKRAN_JS),
    'ekran.js sabit kademe adı yazıyor (tek kaynak bot/bot.js KADEME olmalı)',
  );
});

test('kaynak: document.title kademeyle değişmez (sekme adı düz ürün adı)', () => {
  const eslesme = EKRAN_JS.match(/document\.title\s*=\s*([^;\n]+);/);
  assert.ok(eslesme, 'ekran.js document.title atamıyor (sekme adı dil anahtarından gelmeli)');
  assert.equal(
    eslesme[1].trim(),
    "metinAl('baslik')",
    `document.title kademeli başlıkla atanıyor: ${eslesme[1].trim()}`,
  );
});

// --- dil anahtarları ---

test('yeni biçim anahtarı iki dilde de var ve iki yer tutucu taşıyor', () => {
  for (const [dilAdi, tablo] of [['tr', TR], ['en', EN]]) {
    const bicim = tablo[BASLIK_ZORLUKLU];
    assert.ok(bicim, `${dilAdi}.json'da ${BASLIK_ZORLUKLU} yok`);
    assert.ok(bicim.includes('{0}') && bicim.includes('{1}'), `${dilAdi}.json ${BASLIK_ZORLUKLU} yer tutucuları eksik`);
  }
});

test('tarifin saydığı her anahtar iki dilde de çözülebiliyor', () => {
  const kabuklar = [kabukBaslat(), ...ZORLUKLAR.map((zorluk) => masadakiKabuk(zorluk))];
  for (const dilKodu of ['tr', 'en']) {
    for (const kabuk of kabuklar) {
      assert.doesNotThrow(() => baslikMetni(kabuk, dilKodu), `${dilKodu}: ${kabuk.ekran}/${kabuk.zorluk} başlığı çözülemedi`);
    }
  }
});

// --- TR "Istakam" (anahtar adı ve EN değeri değişmez) ---

test('ASIL KABUL: TR ıstaka başlığı "Istakam" (anahtar adı `rafim` kalır, EN değişmez)', () => {
  assert.equal(TR.rafim, 'Istakam');
  assert.equal(EN.rafim, 'My rack', 'EN değeri bu işte değişmemeliydi');
  assert.ok(Object.hasOwn(TR, 'rafim') && Object.hasOwn(EN, 'rafim'), 'anahtar adı `rafim` korunmalı');
});

test('ıstaka başlığı hâlâ dil anahtarından basılıyor (sabit metin değil)', () => {
  assert.match(EKRAN_JS, /rafBaslik\.textContent = metinAl\('rafim'\)/, 'rafBaslik dil anahtarından gelmiyor');
});
