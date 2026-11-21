import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EKRAN, OLAY, kabukBaslat, gecis, onayBekliyorMu, oyunuBitirilebilirMi, botTurunuOynat,
  botSirasiMi, bekleyenBotTuruGecerliMi,
} from '../docs/arayuz/kabuk.js';
import { KADEME } from '../docs/bot/bot.js';
import { elBaslat, EL_SONUCU } from '../docs/cekirdek/el.js';

// tasokey#43 — üst çubuktaki "Oyunu bitir" düğmesi (ADR-016 durum makinesinin genişlemesi; R-010).
// İstek: düğme el sürerken ONAY ister; onaylanınca kabuk `baslangic` durumuna döner; iptal edilince
// el bozulmaz. Onay yalnız kabuğun bir alanıdır (`kabuk.onay`) — ekran.js kendi "pencere açık mı"
// bayrağını tutmaz (ADR-016/1, ikinci kural kaynağı yasağı).
//
// Durum makinesi saf olduğu için DOM açmadan ölçülür; arayüzün bu makineyi gerçekten kullandığı
// (düğme üst çubukta, onay penceresi kabuğa bağlı, botlar masa dışında oynamaz) `baslangic-ekrani`
// testindeki kaynak taraması diliyle aşağıda denetlenir.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const YENI_ANAHTARLAR = ['oyunuBitir', 'onay.oyunuBitir', 'onay.evet', 'onay.hayir'];

/** Seçicisi verilen metni içeren ilk CSS kuralının gövdesi (seçici listesi de olabilir). */
function kuralGovdesi(secici) {
  const kacisli = secici.replace(/[.#*+?^${}()|[\]\\]/g, '\\$&');
  const eslesme = STIL_CSS.match(new RegExp(`${kacisli}[^{}]*\\{([^}]*)\\}`));
  return eslesme ? eslesme[1] : null;
}

/** İnsan oyuncunun sıra numarası (ekran.js INSAN_OYUNCUSU ile aynı değer). */
const INSAN = 0;

/** Masa ekranında (el sürerken) duran kabuk. */
function masadakiKabuk(zorluk = KADEME.ORTA) {
  return gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk }), OLAY.YENI_OYUN);
}

// --- ASIL KABUL: el sürerken onay ister ---

test('ASIL KABUL: el sürerken "oyunu bitir" doğrudan bitirmez, önce onay ister', () => {
  const masa = masadakiKabuk();
  assert.equal(onayBekliyorMu(masa), false, 'başlangıçta onay penceresi açık olmamalı');

  const soruldu = gecis(masa, OLAY.OYUNU_BITIR);
  assert.equal(onayBekliyorMu(soruldu), true, 'düğme onay istemiyor');
  assert.equal(soruldu.ekran, EKRAN.MASA, 'onay sorulurken ekran hâlâ masa olmalı (oyun bitmedi)');
});

test('ASIL KABUL: onaylanınca kabuk baslangic durumuna döner, onay kapanır', () => {
  const soruldu = gecis(masadakiKabuk(KADEME.ZOR), OLAY.OYUNU_BITIR);
  const bitti = gecis(soruldu, OLAY.ONAY_EVET);
  assert.equal(bitti.ekran, EKRAN.BASLANGIC);
  assert.equal(onayBekliyorMu(bitti), false, 'onay penceresi başlangıç ekranında da açık kalmış');
  assert.equal(bitti.zorluk, KADEME.ZOR, 'zorluk seçimi korunmalı');
});

test('ASIL KABUL: iptal edilince masada kalınır ve el hiç bozulmaz', () => {
  const durum = elBaslat(4343);
  const oncekiDurum = structuredClone(durum);

  const masa = masadakiKabuk(KADEME.ZOR);
  const soruldu = gecis(masa, OLAY.OYUNU_BITIR);
  const iptal = gecis(soruldu, OLAY.ONAY_HAYIR);

  assert.equal(iptal.ekran, EKRAN.MASA, 'iptal masadan çıkarmamalı');
  assert.equal(onayBekliyorMu(iptal), false, 'iptal onay penceresini kapatmıyor');
  assert.equal(iptal.zorluk, KADEME.ZOR);
  assert.deepEqual(durum, oncekiDurum, 'kabuk geçişleri el durumunu değiştirmiş');

  // "El bozulmaz" davranış olarak da ölçülür: iptalden sonraki tur, onay hiç açılmamış gibi oynanır.
  const beklenen = botTurunuOynat(masa, durum, durum.sira);
  const gercek = botTurunuOynat(iptal, durum, durum.sira);
  assert.equal(gercek.basarili, true, `motor reddetti: ${gercek.sebep}`);
  assert.deepEqual(
    gercek.durum.eller[durum.sira].map((tas) => tas.id),
    beklenen.durum.eller[durum.sira].map((tas) => tas.id),
    'iptalden sonra el farklı sürüyor',
  );
});

// --- Geçersiz sıralar: düğme yalnız el sürerken anlamlı ---

test('oyunu bitirme yalnız masa ekranında istenir (başlangıçta/sonuçta kabuğu değiştirmez)', () => {
  const baslangic = kabukBaslat();
  assert.equal(gecis(baslangic, OLAY.OYUNU_BITIR), baslangic);
  assert.equal(oyunuBitirilebilirMi(baslangic), false, 'başlangıç ekranında bitirilecek oyun yok');

  const masa = masadakiKabuk();
  assert.equal(oyunuBitirilebilirMi(masa), true);
  const sonuc = gecis(masa, OLAY.EL_BITTI);
  assert.equal(gecis(sonuc, OLAY.OYUNU_BITIR), sonuc, 'el bitmişken onay sorulmamalı');
  assert.equal(oyunuBitirilebilirMi(sonuc), false);
});

test('onay açıkken ikinci kez sorulması kabuğu değiştirmez; onaysız evet/hayır yok sayılır', () => {
  const masa = masadakiKabuk();
  const soruldu = gecis(masa, OLAY.OYUNU_BITIR);
  assert.equal(gecis(soruldu, OLAY.OYUNU_BITIR), soruldu, 'ikinci sorma kabuğu değiştirdi');
  assert.equal(gecis(masa, OLAY.ONAY_EVET), masa, 'onay sorulmadan evet kabul edildi');
  assert.equal(gecis(masa, OLAY.ONAY_HAYIR), masa, 'onay sorulmadan hayır kabuğu değiştirdi');
});

test('onay açıkken el kendiliğinden biterse soru düşer (iki pencere birden açılmaz)', () => {
  // Botlar onay penceresi açıkken oynamayı sürdürür; el o sırada bitebilir. Ekran sonuca geçerken
  // bekleyen onay temizlenmezse sonuç penceresiyle onay penceresi üst üste binerdi.
  const soruldu = gecis(masadakiKabuk(), OLAY.OYUNU_BITIR);
  const sonuc = gecis(soruldu, OLAY.EL_BITTI);
  assert.equal(sonuc.ekran, EKRAN.SONUC);
  assert.equal(onayBekliyorMu(sonuc), false, 'el bitince bekleyen onay kapanmalı');
});

test('ilk açılışta onay penceresi kapalıdır (kayıt ne derse desin)', () => {
  assert.equal(onayBekliyorMu(kabukBaslat()), false);
  assert.equal(onayBekliyorMu(kabukBaslat({ zorluk: KADEME.KOLAY, onay: 'oyunuBitir' })), false);
});

// --- Arayüz bağlantısı (kaynak taraması) ---

test('kabul-a: düğme üst çubukta, başlık ve dil düğmesiyle aynı kutuda', () => {
  const ustCubuk = INDEX_HTML.slice(
    INDEX_HTML.indexOf('<div id="ustCubuk"'),
    INDEX_HTML.indexOf('<div id="durumSatiri"'),
  );
  assert.ok(ustCubuk.length > 0, 'index.html içinde #ustCubuk bulunamadı');
  assert.match(ustCubuk, /id="oyunuBitirButonu"/, 'oyunu bitir düğmesi üst çubukta değil');
  assert.match(ustCubuk, /id="baslikMetni"/, 'üst çubukta başlık yok');
  assert.match(ustCubuk, /id="dilDugmesi"/, 'üst çubukta dil düğmesi yok');
});

test('kabul-a-2: onay penceresi var, iki düğmeli ve ekran okuyucuya pencere olarak bildiriliyor', () => {
  assert.match(INDEX_HTML, /<div id="onayPaneli"[^>]*role="dialog"/, '#onayPaneli yok ya da dialog değil');
  assert.match(INDEX_HTML, /<div id="onayPaneli"[^>]*aria-modal="true"/, 'onay penceresi aria-modal değil');
  assert.match(INDEX_HTML, /id="onayEvetButonu"/, 'onay penceresinde onaylama düğmesi yok');
  assert.match(INDEX_HTML, /id="onayHayirButonu"/, 'onay penceresinde vazgeçme düğmesi yok');
});

test('kabul-a-3: üst çubukta ve onay penceresinde sabit metin yok (hepsi dil anahtarından)', () => {
  const bolumler = [
    INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="ustCubuk"'), INDEX_HTML.indexOf('<div id="durumSatiri"')),
    INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="onayPaneli"')),
  ];
  for (const bolum of bolumler) {
    const metinler = [...bolum.matchAll(/>([^<>]+)</g)]
      .map(([, metin]) => metin.trim())
      .filter((metin) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(metin));
    assert.deepEqual(metinler, [], `sabit metin: ${metinler.join(' | ')}`);
  }
});

test('kabul-b: onay penceresi ADR-015 pencere kademesini kullanıyor', () => {
  const govde = kuralGovdesi('#onayPaneli');
  assert.ok(govde, 'stil.css içinde #onayPaneli kuralı yok');
  assert.match(govde, /z-index:\s*var\(--kademe-pencere\)/, 'onay penceresi pencere kademesinde değil');
});

test('kabul-b-2: dar kademede başlık taşmaz — kısalarak sığar, düğmeleri itmez', () => {
  const govde = kuralGovdesi('#ustCubuk h1');
  assert.ok(govde, 'stil.css içinde #ustCubuk h1 kuralı yok');
  assert.match(govde, /min-width:\s*0/, 'başlık esnek kutuda küçülemiyor (min-width: 0 yok)');
  assert.match(govde, /overflow:\s*hidden/, 'başlık taşmayı gizlemiyor');
  assert.match(govde, /text-overflow:\s*ellipsis/, 'başlık kısalmıyor (üç nokta yok)');
  assert.match(govde, /white-space:\s*nowrap/, 'başlık satır kırıyor (üst çubuk yükselir)');
});

test('kabul-b-3: üst çubuk düğmelerinin ölçüsü değişkenden gelir ve dar kademede küçülür', () => {
  const govde = kuralGovdesi('.ust-cubuk-dugmesi');
  assert.ok(govde, 'stil.css içinde .ust-cubuk-dugmesi kuralı yok (iki düğme tek kaynaktan)');
  assert.match(govde, /font-size:\s*var\(--ust-dugme-font-boyutu\)/, 'düğme yazı ölçüsü değişkene bağlı değil');
  const tanimSayisi = [...STIL_CSS.matchAll(/--ust-dugme-font-boyutu\s*:/g)].length;
  assert.ok(tanimSayisi >= 2, `--ust-dugme-font-boyutu dar kademede yeniden tanımlanmamış (${tanimSayisi} tanım)`);
});

test('kabul-b-4: telefon dikeyde onay penceresi de gizlenir (R-014 uyarısını örtmez)', () => {
  const blokEslesme = STIL_CSS.match(/@media\s*\(orientation:\s*portrait\)[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(blokEslesme, 'stil.css içinde portrait media bloğu bulunamadı');
  assert.match(
    blokEslesme[1],
    /#onayPaneli\.gorunur\s*\{[^}]*display:\s*none/,
    'dikey telefon bloğunda onay penceresi gizlenmiyor',
  );
});

test('kabul-c: ekran.js düğmeyi ve onay penceresini kabuk durum makinesinden okuyor', () => {
  assert.match(EKRAN_JS, /oyunuBitirilebilirMi\(/, 'düğmenin görünürlüğü kabuğa sorulmuyor');
  assert.match(EKRAN_JS, /onayBekliyorMu\(/, 'onay penceresinin görünürlüğü kabuğa sorulmuyor');
  assert.ok(
    !/kabuk\.onay\s*=[^=]/.test(EKRAN_JS),
    'ekran.js onay alanını doğrudan atıyor; geçiş yalnız kabuk.js gecis() ile yapılmalı',
  );
  for (const olay of ['OLAY.OYUNU_BITIR', 'OLAY.ONAY_EVET', 'OLAY.ONAY_HAYIR']) {
    assert.ok(EKRAN_JS.includes(olay), `ekran.js ${olay} olayını hiç göndermiyor`);
  }
});

// --- ASIL KABUL: bekleyen bot turu oyun bitince düşer (denetçi turu 1 düzeltmesi) ---

/** `botAdimiOyna`nın ateşlendiği andaki defter bilgisi (ekran.js durumKutu alanları). */
function bekleyen({ nesil = 1, elNesli = 1, botCalisiyor = true } = {}) {
  return { nesil, elNesli, botCalisiyor };
}

test('botSirasiMi: botlar yalnız masa ekranında, el sürerken ve sıra kendilerindeyken oynar', () => {
  const masa = masadakiKabuk();
  const durum = elBaslat(4343);
  const botSirasi = { ...durum, sira: 1 };

  assert.equal(botSirasiMi(masa, botSirasi, INSAN), true);
  assert.equal(botSirasiMi(kabukBaslat(), botSirasi, INSAN), false, 'başlangıç ekranında bot oynadı');
  assert.equal(
    botSirasiMi(gecis(masa, OLAY.EL_BITTI), botSirasi, INSAN), false,
    'sonuç ekranında bot oynamayı sürdürüyor',
  );
  assert.equal(botSirasiMi(masa, durum, INSAN), false, 'insanın sırasında bot oynuyor');
  assert.equal(
    botSirasiMi(masa, { ...botSirasi, sonuc: EL_SONUCU.BITTI }, INSAN), false,
    'el bitmişken bot oynamayı sürdürüyor',
  );
  assert.equal(botSirasiMi(masa, null, INSAN), false, 'el kurulmadan bot oynuyor');
});

test('ASIL KABUL: "oyunu bitir → evet → yeni oyun" sırasında bekleyen tur yeni elin üstüne düşmez', () => {
  // Bot turu zamanlayıcıyla (setTimeout) sıraya girer. Oyuncu gecikmenin ortasında oyunu bitirip
  // hemen "Yeni oyun"a basarsa ekran yine `masa` olur: yalnız ekrana bakan bir denetim bekleyen
  // turu geçirir ve tur, YENİ elin üstünde işlenir (yeni el `sira = 0`, yani insanla başlar →
  // bot insanın elinden taş atardı). Çözüm: her yeni el bir "nesil"dir; bekleyen tur kendi
  // neslini doğrular.
  const masa = masadakiKabuk();
  const durum = elBaslat(4343);
  const botSirasi = { ...durum, sira: 1 };

  assert.equal(
    bekleyenBotTuruGecerliMi(masa, botSirasi, INSAN, bekleyen({ nesil: 1, elNesli: 1 })), true,
    'kendi elinin turu da reddediliyor',
  );
  assert.equal(
    bekleyenBotTuruGecerliMi(masa, botSirasi, INSAN, bekleyen({ nesil: 1, elNesli: 2 })), false,
    'eski elin bekleyen turu yeni elde (nesil değişmiş) hâlâ işleniyor',
  );
  // Yeni el gerçekten insanla başlıyor: bu yüzden nesil denetimi olmasa bot insanın yerine oynardı.
  assert.equal(durum.sira, INSAN, 'yeni el insanın sırasıyla başlamıyor — ölçüm varsayımı bozuldu');
  assert.equal(
    bekleyenBotTuruGecerliMi(masa, durum, INSAN, bekleyen()), false,
    'bekleyen tur insanın sırasında da oynuyor',
  );
  assert.equal(
    bekleyenBotTuruGecerliMi(masa, botSirasi, INSAN, bekleyen({ botCalisiyor: false })), false,
    'bot sırası durdurulduktan sonra bekleyen tur hâlâ işleniyor',
  );
  // Onaylı çıkışın kendisi de (yeni oyun açılmadan) bekleyen turu reddeder.
  const bitti = gecis(gecis(masa, OLAY.OYUNU_BITIR), OLAY.ONAY_EVET);
  assert.equal(bekleyenBotTuruGecerliMi(bitti, botSirasi, INSAN, bekleyen()), false);
});

test('ASIL KABUL (kaynak): ekran.js bekleyen turu iptal ediyor ve nesli defterde tutuyor', () => {
  const govde = EKRAN_JS.match(/function botAdimiOyna\(([^)]*)\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(govde, 'ekran.js içinde botAdimiOyna bulunamadı');
  assert.match(govde[1], /nesil/, 'bot adımı hangi elin turu olduğunu (nesil) almıyor');
  assert.match(
    govde[2],
    /bekleyenBotTuruGecerliMi\(/,
    'bot adımı oynamadan önce turun hâlâ geçerli olduğunu kabuğa sormuyor',
  );
  assert.match(EKRAN_JS, /clearTimeout\(/, 'ekran.js bekleyen bot zamanlayıcısını hiç iptal etmiyor');
  assert.match(EKRAN_JS, /elNesli(\s*\+=\s*1|\+\+)/, 'yeni el kurulurken nesil artırılmıyor');
  // Zamanlayıcı tek kapıdan kurulur: çıplak `setTimeout(botAdimiOyna…)` kalırsa iptal edilemez.
  assert.ok(
    !/setTimeout\(\s*botAdimiOyna/.test(EKRAN_JS),
    'bot adımı zamanlayıcısı tek kapıdan (iptal edilebilir biçimde) kurulmuyor',
  );
});

test('kabul-d: yeni metinlerin TR + EN anahtarı var, dolu ve çevrilmiş', () => {
  for (const anahtar of YENI_ANAHTARLAR) {
    assert.equal(typeof TR[anahtar], 'string', `tr.json'da yok: ${anahtar}`);
    assert.equal(typeof EN[anahtar], 'string', `en.json'da yok: ${anahtar}`);
    assert.ok(TR[anahtar].trim().length > 0, `tr.json boş: ${anahtar}`);
    assert.ok(EN[anahtar].trim().length > 0, `en.json boş: ${anahtar}`);
    assert.notEqual(TR[anahtar], EN[anahtar], `çevrilmemiş: ${anahtar}`);
  }
});
