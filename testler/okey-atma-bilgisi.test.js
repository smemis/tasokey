import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EKRAN, OLAY, BILGI, kabukBaslat, gecis, bilgiBekliyorMu, bilgiGecerliMi, dokumAcikMi,
  onayBekliyorMu, botSirasiMi, bekleyenBotTuruGecerliMi, kayitAlanlari,
} from '../docs/arayuz/kabuk.js';
import { KADEME } from '../docs/bot/bot.js';
import { elBaslat, at, EL_SONUCU, REDDEDILME_SEBEBI } from '../docs/cekirdek/el.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';

// tasokey#50 — Sahip kararı: okey ve sahte okey ATILABİLİR (ADR-008 sürüm 2) ve insan oyuncu bunu
// yaptığında bir **bilgilendirme penceresi** açılır (ADR-016 madde 8). Pencere soru sormaz, hamleyi
// engellemez, ceza yoktur; kabuğun bir ALANIDIR (`kabuk.bilgi`), ayrı ekran değildir ve kayda
// yazılmaz. Pencere açıkken bot oynamaz — koşulun tek kaynağı `botSirasiMi`dır (ADR-016/1).
//
// Ek bilgiler (Sahip, 2026-11-21): sonuç penceresindeki oyuncu taş sayıları bölümü açılıp
// kapanabilir ve pencere ilk açıldığında KAPALI olur (ek bilgi 1); pencere içeriğine göre
// boyutlanır, sabit en/boy taşımaz (ek bilgi 2).
//
// Durum makinesi saf olduğundan DOM açmadan ölçülür; arayüzün bu makineyi gerçekten kullandığı
// `oyunu-bitir.test.js`teki kaynak taraması diliyle aşağıda denetlenir.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const YENI_ANAHTARLAR = ['bilgi.okeyAtildi', 'bilgi.tamam', 'sonuc.oyuncuTaslari'];

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);

/** İnsan oyuncunun sıra numarası (ekran.js INSAN_OYUNCUSU ile aynı değer). */
const INSAN = 0;

/** Seçicisi verilen metni içeren ilk CSS kuralının gövdesi (seçici listesi de olabilir). */
function kuralGovdesi(secici) {
  const kacisli = secici.replace(/[.#*+?^${}()|[\]\\]/g, '\\$&');
  const eslesme = STIL_CSS.match(new RegExp(`${kacisli}[^{}]*\\{([^}]*)\\}`));
  return eslesme ? eslesme[1] : null;
}

/** Seçicinin TEK BAŞINA (ortak seçici listesi değil) yazıldığı kuralın gövdesi. */
function tekKuralGovdesi(secici) {
  const kacisli = secici.replace(/[.#*+?^${}()|[\]\\]/g, '\\$&');
  const eslesme = STIL_CSS.match(new RegExp(`(^|\\})\\s*${kacisli}\\s*\\{([^}]*)\\}`, 'm'));
  return eslesme ? eslesme[2] : null;
}

/** Masa ekranında (el sürerken) duran kabuk. */
function masadakiKabuk(zorluk = KADEME.ORTA) {
  return gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk }), OLAY.YENI_OYUN);
}

// --- ASIL KABUL (kural): joker atmak serbest, yasak ayarı kapatma anahtarı ---

test('ASIL KABUL: varsayılan kuralda joker atılır, hamle engellenmez ve ceza/geri alma yoktur', () => {
  const sahte = sahteOkeyOlustur(1);
  const durum = {
    eller: [[sahte, t('kirmizi', 1)], [t('siyah', 2)], [t('mavi', 3)], [t('sari', 4)]],
    yerDestesi: [t('kirmizi', 5), t('siyah', 6)],
    atilanYiginlar: [[], [], [], []],
    gosterge: t('mavi', 6, 1),
    okeyTasi: OKEY_TASI,
    sira: INSAN,
    cekildiMi: true,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
  };

  const serbest = at(durum, INSAN, sahte.id);
  assert.equal(serbest.basarili, true, 'varsayılan kuralda joker atılamadı');
  // "Ceza yok": elden yalnız atılan taş eksilir, başka hiçbir taş/alan değişmez.
  assert.equal(serbest.durum.eller[INSAN].length, durum.eller[INSAN].length - 1);
  assert.equal(serbest.durum.atilanYiginlar[INSAN].at(-1).id, sahte.id);
  assert.equal(serbest.durum.sonuc, EL_SONUCU.SUREN);

  const yasakli = at(durum, INSAN, sahte.id, { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: true });
  assert.equal(yasakli.basarili, false, 'kapatma anahtarı artık yasağı uygulamıyor');
  assert.equal(yasakli.sebep, REDDEDILME_SEBEBI.OKEY_ATILAMAZ, 'motorun ret yolu silinmiş');
});

test('motorun OKEY_ATILAMAZ ret sebebi ve dil anahtarı silinmedi (kapatma anahtarı çalışır kalsın)', () => {
  assert.equal(REDDEDILME_SEBEBI.OKEY_ATILAMAZ, 'okeyAtilamaz');
  assert.equal(typeof TR['reddedilme.okeyAtilamaz'], 'string');
  assert.equal(typeof EN['reddedilme.okeyAtilamaz'], 'string');
});

// --- ASIL KABUL (kabuk): bilgilendirme kabuğun alanı, tek kapıdan geçer ---

test('ASIL KABUL: bilgilendirme kabuğun alanıdır — masada açılır, ekran değişmez, tek düğme kapatır', () => {
  const masa = masadakiKabuk();
  assert.equal(bilgiBekliyorMu(masa), false, 'el başında pencere açık');

  const acik = gecis(masa, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });
  assert.equal(bilgiBekliyorMu(acik), true, 'pencere açılmadı');
  assert.equal(acik.bilgi, BILGI.OKEY_ATILDI);
  assert.equal(acik.ekran, EKRAN.MASA, 'bilgilendirme ekran değiştirmemeli (ayrı ekran değil)');

  const kapali = gecis(acik, OLAY.BILGI_KAPAT);
  assert.equal(bilgiBekliyorMu(kapali), false, 'pencere kapanmadı');
  assert.equal(kapali.ekran, EKRAN.MASA, 'kapanınca masada kalınmalı');
  assert.equal(kapali.zorluk, masa.zorluk);
});

test('geçersiz bilgilendirme istekleri kabuğu değiştirmez (tek kapı)', () => {
  const masa = masadakiKabuk();
  for (const bozuk of ['efsane', '', null, undefined, 7]) {
    assert.equal(gecis(masa, OLAY.BILGI_GOSTER, { bilgi: bozuk }), masa, `bozuk değer geçti: ${bozuk}`);
  }
  assert.equal(gecis(masa, OLAY.BILGI_GOSTER), masa, 'veri verilmeden pencere açıldı');
  assert.equal(gecis(masa, OLAY.BILGI_KAPAT), masa, 'açık pencere yokken kapatma kabuğu değiştirdi');

  const acik = gecis(masa, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });
  assert.equal(gecis(acik, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI }), acik, 'ikinci kez açıldı');

  // Başlangıç ve sonuç ekranında anlatılacak bir hamle yok.
  const baslangic = kabukBaslat();
  assert.equal(gecis(baslangic, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI }), baslangic);
  const sonuc = gecis(masa, OLAY.EL_BITTI);
  assert.equal(gecis(sonuc, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI }), sonuc);

  assert.equal(bilgiGecerliMi(BILGI.OKEY_ATILDI), true);
  assert.equal(bilgiGecerliMi('efsane'), false);
});

test('ASIL KABUL: ekran değiştiren geçiş bilgilendirmeyi düşürür (iki pencere üst üste binmez)', () => {
  const acik = gecis(masadakiKabuk(), OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });

  // Atılan joker eli bitirmiş olabilir: ekran sonuca geçerken pencere kapanmalı.
  const sonuc = gecis(acik, OLAY.EL_BITTI);
  assert.equal(sonuc.ekran, EKRAN.SONUC);
  assert.equal(bilgiBekliyorMu(sonuc), false, 'el bitince bilgilendirme kapanmadı');

  // Oyunu bitirme onayı da aynı kapıdan geçer.
  const bitti = gecis(gecis(acik, OLAY.OYUNU_BITIR), OLAY.ONAY_EVET);
  assert.equal(bitti.ekran, EKRAN.BASLANGIC);
  assert.equal(bilgiBekliyorMu(bitti), false, 'onaylı çıkışta bilgilendirme açık kaldı');
  assert.equal(onayBekliyorMu(bitti), false);
});

test('ilk açılışta bilgilendirme kapalıdır ve kayda yazılmaz (kayıt ne derse desin)', () => {
  assert.equal(bilgiBekliyorMu(kabukBaslat()), false);
  assert.equal(bilgiBekliyorMu(kabukBaslat({ zorluk: KADEME.ZOR, bilgi: 'okeyAtildi' })), false);
  const acik = gecis(masadakiKabuk(KADEME.ZOR), OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });
  assert.deepEqual(kayitAlanlari(acik), { zorluk: KADEME.ZOR }, 'bilgi alanı kayda sızdı');
});

// --- ASIL KABUL: pencere açıkken bot oynamaz ---

test('ASIL KABUL: bilgilendirme açıkken botun sırası gelmez; kapanınca sıra devam eder', () => {
  const masa = masadakiKabuk();
  const botSirasi = { ...elBaslat(5050), sira: 1 };

  assert.equal(botSirasiMi(masa, botSirasi, INSAN), true, 'ölçüm varsayımı bozuldu: bot sırası değil');
  const acik = gecis(masa, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });
  assert.equal(botSirasiMi(acik, botSirasi, INSAN), false, 'bilgilendirme açıkken bot oynuyor');
  assert.equal(
    botSirasiMi(gecis(acik, OLAY.BILGI_KAPAT), botSirasi, INSAN), true,
    'pencere kapandıktan sonra bot sırası devam etmiyor',
  );

  // Zamanlayıcıyla sıraya girmiş tur da aynı kapıdan geçer: pencere açıkken ateşlenirse düşer.
  const bekleyen = { nesil: 1, elNesli: 1, botCalisiyor: true };
  assert.equal(bekleyenBotTuruGecerliMi(masa, botSirasi, INSAN, bekleyen), true);
  assert.equal(
    bekleyenBotTuruGecerliMi(acik, botSirasi, INSAN, bekleyen), false,
    'bekleyen bot turu bilgilendirme açıkken işleniyor',
  );
});

test('onay sorusu bundan ayrıdır: onay açıkken botlar oynamayı sürdürür (tasokey#43 davranışı)', () => {
  const soruldu = gecis(masadakiKabuk(), OLAY.OYUNU_BITIR);
  const botSirasi = { ...elBaslat(5050), sira: 1 };
  assert.equal(botSirasiMi(soruldu, botSirasi, INSAN), true, 'onay penceresi bot sırasını durdurmuş');
});

// --- Ek bilgi 1: sonuç penceresindeki döküm bölümü açılır/kapanır, ilk açılışta kapalı ---

test('ASIL KABUL (ek bilgi 1): döküm bölümü ilk açılışta kapalı, düğmeyle açılıp kapanıyor', () => {
  const sonuc = gecis(masadakiKabuk(), OLAY.EL_BITTI);
  assert.equal(dokumAcikMi(sonuc), false, 'sonuç penceresi açık dökümle açıldı');

  const acik = gecis(sonuc, OLAY.DOKUM_AC_KAPA);
  assert.equal(dokumAcikMi(acik), true, 'döküm bölümü açılmadı');
  assert.equal(acik.ekran, EKRAN.SONUC, 'döküm bölümü ekranı değiştirdi');
  assert.equal(dokumAcikMi(gecis(acik, OLAY.DOKUM_AC_KAPA)), false, 'döküm bölümü kapanmadı');
});

test('ek bilgi 1: pencere her açılışında kapalı başlar ve bölüm yalnız sonuç ekranında anlamlı', () => {
  const sonuc = gecis(masadakiKabuk(), OLAY.EL_BITTI);
  const acik = gecis(sonuc, OLAY.DOKUM_AC_KAPA);

  // Yeni el → masa → yeniden el bitti: bölüm yine kapalı.
  const yeniEl = gecis(acik, OLAY.YENI_EL);
  assert.equal(dokumAcikMi(yeniEl), false, 'yeni elde döküm bölümü açık kalmış');
  assert.equal(dokumAcikMi(gecis(yeniEl, OLAY.EL_BITTI)), false, 'pencere ikinci açılışta kapalı değil');

  const masa = masadakiKabuk();
  assert.equal(gecis(masa, OLAY.DOKUM_AC_KAPA), masa, 'masada döküm bölümü açılabiliyor');
  const baslangic = kabukBaslat();
  assert.equal(gecis(baslangic, OLAY.DOKUM_AC_KAPA), baslangic, 'başlangıç ekranında bölüm açılabiliyor');
  assert.equal(dokumAcikMi(kabukBaslat({ zorluk: KADEME.KOLAY, dokumAcik: true })), false, 'bayrak kayıttan geldi');
});

// --- Arayüz bağlantısı (kaynak taraması) ---

test('kabul-a: bilgilendirme penceresi var, tek düğmeli ve ekran okuyucuya pencere olarak bildiriliyor', () => {
  assert.match(INDEX_HTML, /<div id="bilgiPaneli"[^>]*role="dialog"/, '#bilgiPaneli yok ya da dialog değil');
  assert.match(INDEX_HTML, /<div id="bilgiPaneli"[^>]*aria-modal="true"/, 'bilgilendirme penceresi aria-modal değil');
  assert.match(INDEX_HTML, /id="bilgiMetni"/, 'pencerede metin alanı yok');
  assert.match(INDEX_HTML, /id="bilgiTamamButonu"/, 'pencereyi kapatan düğme yok');
  // Soru penceresi DEĞİL: ikinci bir karar düğmesi yok.
  const panel = INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="bilgiPaneli"'));
  assert.equal((panel.match(/<button/g) ?? []).length, 1, 'bilgilendirme penceresinde birden çok düğme var');
});

test('kabul-a-2: bilgilendirme penceresinde ve döküm düğmesinde sabit metin yok (hepsi dil anahtarından)', () => {
  const bolumler = [
    INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="bilgiPaneli"')),
    INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="sonucPaneli"'), INDEX_HTML.indexOf('<!-- Bilgilendirme')),
  ];
  for (const bolum of bolumler) {
    const metinler = [...bolum.matchAll(/>([^<>]+)</g)]
      .map(([, metin]) => metin.trim())
      .filter((metin) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(metin));
    assert.deepEqual(metinler, [], `sabit metin: ${metinler.join(' | ')}`);
  }
});

test('kabul-b: bilgilendirme penceresi ADR-015 pencere kademesini kullanıyor', () => {
  const govde = kuralGovdesi('#bilgiPaneli');
  assert.ok(govde, 'stil.css içinde #bilgiPaneli kuralı yok');
  assert.match(govde, /z-index:\s*var\(--kademe-pencere\)/, 'bilgilendirme penceresi pencere kademesinde değil');
});

test('kabul-b-2: telefon dikeyde bilgilendirme penceresi de gizlenir (R-014 uyarısını örtmez)', () => {
  const blokEslesme = STIL_CSS.match(/@media\s*\(orientation:\s*portrait\)[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(blokEslesme, 'stil.css içinde portrait media bloğu bulunamadı');
  assert.match(
    blokEslesme[1],
    /#bilgiPaneli\.gorunur\s*\{[^}]*display:\s*none/,
    'dikey telefon bloğunda bilgilendirme penceresi gizlenmiyor',
  );
});

test('ASIL KABUL (ek bilgi 2): sonuç kutusu içeriğine göre boyutlanıyor — sabit en/boy yok', () => {
  const govde = tekKuralGovdesi('#sonucKutusu');
  assert.ok(govde, 'stil.css içinde sonuç kutusunun kendi kuralı yok');
  assert.match(govde, /width:\s*fit-content/, 'sonuç kutusunun genişliği içerikten gelmiyor');
  assert.match(govde, /max-width:\s*min\(/, 'dar ekran üst sınırı yok (kutu viewport\'tan taşabilir)');
  assert.match(govde, /max-height:\s*\d+vh/, 'uzun içerikte yükseklik sınırı yok');
  assert.match(govde, /overflow:\s*auto/, 'taşan içerik kutu içinde kaydırılmıyor');
  assert.doesNotMatch(
    govde,
    /(^|;|\s)(height|min-width|min-height)\s*:/,
    'sonuç kutusu sabit/en küçük ölçü tanımlıyor — içeriğiyle küçülmez',
  );
  // Hiçbir duyarlı kademe bu kuralı sabit ölçüyle geçersiz kılmamalı.
  const kademeler = [...STIL_CSS.matchAll(/@media[^{]*\{/g)].map((e) => e.index);
  assert.doesNotMatch(
    STIL_CSS.slice(kademeler[0]),
    /(^|[,}\s])#sonucKutusu\s*\{/m,
    'bir @media bloğu #sonucKutusu kuralını yeniden tanımlıyor',
  );
});

test('kabul-c: ekran.js bilgilendirmeyi ve döküm bölümünü kabuk durum makinesinden okuyor', () => {
  assert.match(EKRAN_JS, /bilgiBekliyorMu\(/, 'pencerenin görünürlüğü kabuğa sorulmuyor');
  assert.match(EKRAN_JS, /dokumAcikMi\(/, 'döküm bölümünün açıklığı kabuğa sorulmuyor');
  for (const olay of ['OLAY.BILGI_GOSTER', 'OLAY.BILGI_KAPAT', 'OLAY.DOKUM_AC_KAPA']) {
    assert.ok(EKRAN_JS.includes(olay), `ekran.js ${olay} olayını hiç göndermiyor`);
  }
  for (const alan of ['bilgi', 'dokumAcik']) {
    assert.ok(
      !new RegExp(`kabuk\\.${alan}\\s*=[^=]`).test(EKRAN_JS),
      `ekran.js ${alan} alanını doğrudan atıyor; geçiş yalnız kabuk.js gecis() ile yapılmalı`,
    );
  }
  // Pencere yalnız İNSAN oyuncunun kendi atışında açılır: atma yolunda, bot adımında değil.
  const atmaGovdesi = EKRAN_JS.match(/function atVeyaBitirUygula\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(atmaGovdesi, 'ekran.js içinde atVeyaBitirUygula bulunamadı');
  assert.match(atmaGovdesi[1], /OLAY\.BILGI_GOSTER/, 'bilgilendirme insanın atma yolundan açılmıyor');
  // ADR-027: soru "joker mi" değil "özel taş mı" (okey ya da sahte okey) — kapı `tasOzelMi`.
  assert.match(atmaGovdesi[1], /tasOzelMi\(/, '"atılan taş özel mi" sorusu çekirdeğe sorulmuyor');
  const botGovdesi = EKRAN_JS.match(/function botAdimiOyna\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(botGovdesi, 'ekran.js içinde botAdimiOyna bulunamadı');
  assert.doesNotMatch(botGovdesi[1], /BILGI_GOSTER/, 'botun joker atışında da pencere açılıyor');
  // Pencere kapanınca duran bot sırası devam etmeli.
  const kapatmaGovdesi = EKRAN_JS.match(/function bilgiyiKapat\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(kapatmaGovdesi, 'ekran.js içinde bilgiyiKapat bulunamadı');
  assert.match(kapatmaGovdesi[1], /botSirasiniBaslat\(\)/, 'pencere kapanınca bot sırası devam etmiyor');
});

test('kabul-d: yeni metinlerin TR + EN anahtarı var, dolu ve çevrilmiş', () => {
  for (const anahtar of YENI_ANAHTARLAR) {
    assert.equal(typeof TR[anahtar], 'string', `tr.json'da yok: ${anahtar}`);
    assert.equal(typeof EN[anahtar], 'string', `en.json'da yok: ${anahtar}`);
    assert.ok(TR[anahtar].trim().length > 0, `tr.json boş: ${anahtar}`);
    assert.ok(EN[anahtar].trim().length > 0, `en.json boş: ${anahtar}`);
    assert.notEqual(TR[anahtar], EN[anahtar], `çevrilmemiş: ${anahtar}`);
  }
  // Pencere metni bilgi türünden türetilir: her BILGI değerinin anahtarı iki dilde de olmalı.
  for (const deger of Object.values(BILGI)) {
    assert.equal(typeof TR[`bilgi.${deger}`], 'string', `tr.json'da yok: bilgi.${deger}`);
    assert.equal(typeof EN[`bilgi.${deger}`], 'string', `en.json'da yok: bilgi.${deger}`);
  }
});
