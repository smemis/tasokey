import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EKRAN, OLAY, ZORLUKLAR, kabukBaslat, gecis, zorlukGecerliMi, zorlukCozumle,
  kayitAlanlari, botTurunuOynat,
} from '../docs/arayuz/kabuk.js';
import { KADEME, VARSAYILAN_KADEME, botTurOyna } from '../docs/bot/bot.js';
import { EL_SONUCU } from '../docs/cekirdek/el.js';
import { tasOlustur } from '../docs/cekirdek/tas.js';

// tasokey#42 — ADR-016: arayüz tek durum makinesine (`arayuz/kabuk.js`) bağlanır:
// baslangic (Yeni oyun + zorluk seçimi) → masa → sonuc → baslangic. Saf mantık olduğu için
// DOM açmadan ölçülür; `ekran.js`in bu makineyi gerçekten kullandığı `baslangic-ekrani.test.js`
// kaynak taramasıyla ayrıca denetlenir.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1);
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);

// Elin tamamı per gruplarına bölünen 14 taş (bot-kolay.test.js ile aynı el) + hiçbir gruba
// girmeyen 15. taş: kademeler bu elde ölçülebilir biçimde FARKLI karar verir.
const PER_ELI = [
  t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
  t('siyah', 1), t('siyah', 2), t('siyah', 3), t('siyah', 4),
  t('mavi', 1), t('mavi', 2), t('mavi', 3),
  t('sari', 1), t('sari', 2), t('sari', 3),
];

function durumKur(el, ustTas) {
  return {
    eller: [el, [], [], []],
    yerDestesi: [t('sari', 13)],
    atilanYiginlar: [[], [], [], ustTas ? [ustTas] : []], // ADR-010: oyuncu 0'ın öncekisi 3'tür
    gosterge: GOSTERGE,
    okeyTasi: OKEY_TASI,
    sira: 0,
    cekildiMi: false,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
  };
}

// --- Ekranlar ve ilk açılış ---

test('üç ekran var ve ilk açılış baslangic ekranındadır', () => {
  assert.deepEqual(Object.values(EKRAN), ['baslangic', 'masa', 'sonuc']);
  assert.equal(kabukBaslat().ekran, EKRAN.BASLANGIC);
  assert.equal(kabukBaslat({ zorluk: 'zor' }).ekran, EKRAN.BASLANGIC);
});

test('zorluklar botun kademeleriyle aynı (tek kaynak) ve varsayılan orta', () => {
  assert.deepEqual([...ZORLUKLAR], Object.values(KADEME));
  assert.equal(kabukBaslat().zorluk, VARSAYILAN_KADEME);
});

// --- ASIL KABUL: durum geçişleri baslangic → masa → sonuc → baslangic ---

test('ASIL KABUL: baslangic → masa → sonuc → baslangic çevrimi tamamlanır', () => {
  const baslangic = kabukBaslat({ zorluk: KADEME.ZOR });
  const masa = gecis(baslangic, OLAY.YENI_OYUN);
  assert.equal(masa.ekran, EKRAN.MASA);

  const sonuc = gecis(masa, OLAY.EL_BITTI);
  assert.equal(sonuc.ekran, EKRAN.SONUC);

  const donus = gecis(sonuc, OLAY.BASLANGICA_DON);
  assert.equal(donus.ekran, EKRAN.BASLANGIC);
  // Zorluk çevrim boyunca taşınır: oyuncu seçimi her ekranda aynı kalır.
  for (const kabuk of [masa, sonuc, donus]) assert.equal(kabuk.zorluk, KADEME.ZOR);
});

test('sonuc → masa (Yeni el) aynı zorlukla sürer — R-010 eski davranışı korunur', () => {
  const sonuc = gecis(gecis(kabukBaslat({ zorluk: KADEME.KOLAY }), OLAY.YENI_OYUN), OLAY.EL_BITTI);
  const yeniEl = gecis(sonuc, OLAY.YENI_EL);
  assert.equal(yeniEl.ekran, EKRAN.MASA);
  assert.equal(yeniEl.zorluk, KADEME.KOLAY);
});

test('o ekranda geçersiz olay kabuğu değiştirmez (aynı nesne döner)', () => {
  const baslangic = kabukBaslat();
  // Başlangıçta "el bitti" ya da "yeni el" olamaz; masada "yeni oyun" olamaz.
  assert.equal(gecis(baslangic, OLAY.EL_BITTI), baslangic);
  assert.equal(gecis(baslangic, OLAY.YENI_EL), baslangic);
  assert.equal(gecis(baslangic, OLAY.BASLANGICA_DON), baslangic);

  const masa = gecis(baslangic, OLAY.YENI_OYUN);
  assert.equal(gecis(masa, OLAY.YENI_OYUN), masa);
  assert.equal(gecis(masa, OLAY.BASLANGICA_DON), masa);
  assert.equal(gecis(masa, 'bilinmeyenOlay'), masa);

  const sonuc = gecis(masa, OLAY.EL_BITTI);
  assert.equal(gecis(sonuc, OLAY.EL_BITTI), sonuc);
});

test('el bitti olayı iki kez gelse de ekran sonuçta kalır (çizim tekrarı durumu bozmaz)', () => {
  const masa = gecis(kabukBaslat(), OLAY.YENI_OYUN);
  const birinci = gecis(masa, OLAY.EL_BITTI);
  assert.equal(gecis(birinci, OLAY.EL_BITTI).ekran, EKRAN.SONUC);
});

// --- Zorluk seçimi ---

test('zorluk yalnız başlangıç ekranında seçilir (el sürerken kademe değişmez)', () => {
  const baslangic = kabukBaslat();
  for (const zorluk of ZORLUKLAR) {
    assert.equal(gecis(baslangic, OLAY.ZORLUK_SEC, { zorluk }).zorluk, zorluk);
    assert.equal(gecis(baslangic, OLAY.ZORLUK_SEC, { zorluk }).ekran, EKRAN.BASLANGIC);
  }
  const masa = gecis(gecis(baslangic, OLAY.ZORLUK_SEC, { zorluk: KADEME.ORTA }), OLAY.YENI_OYUN);
  assert.equal(gecis(masa, OLAY.ZORLUK_SEC, { zorluk: KADEME.ZOR }), masa, 'masada zorluk değişmemeli');
  const sonuc = gecis(masa, OLAY.EL_BITTI);
  assert.equal(gecis(sonuc, OLAY.ZORLUK_SEC, { zorluk: KADEME.ZOR }), sonuc, 'sonuçta zorluk değişmemeli');
});

test('bilinmeyen zorluk seçimi yok sayılır (mevcut seçim korunur)', () => {
  const kabuk = gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk: KADEME.ZOR });
  for (const bozuk of ['efsane', '', null, undefined, 3, { zorluk: 'zor' }]) {
    assert.equal(gecis(kabuk, OLAY.ZORLUK_SEC, { zorluk: bozuk }), kabuk, `bozuk değer geçti: ${bozuk}`);
  }
});

test('ASIL KABUL (kayıt): bozuk/eksik zorluk kaydında varsayılana düşülür', () => {
  assert.equal(zorlukCozumle('efsane'), VARSAYILAN_KADEME);
  assert.equal(zorlukCozumle(null), VARSAYILAN_KADEME);
  assert.equal(zorlukCozumle(undefined), VARSAYILAN_KADEME);
  assert.equal(zorlukCozumle(0), VARSAYILAN_KADEME);
  for (const zorluk of ZORLUKLAR) assert.equal(zorlukCozumle(zorluk), zorluk);
  for (const zorluk of ZORLUKLAR) assert.equal(zorlukGecerliMi(zorluk), true);
  assert.equal(zorlukGecerliMi('efsane'), false);

  // Kayıttan okunan bozuk değer doğrudan kabuğa verilince de aynı yoldan geçer.
  assert.equal(kabukBaslat({ zorluk: 'efsane' }).zorluk, VARSAYILAN_KADEME);
  assert.equal(kabukBaslat(null).zorluk, VARSAYILAN_KADEME);
});

test('kayda yazılan alan yalnız zorluktur (şema sürüm 2 alan adı tek yerde)', () => {
  assert.deepEqual(kayitAlanlari(kabukBaslat({ zorluk: KADEME.KOLAY })), { zorluk: KADEME.KOLAY });
});

// --- ASIL KABUL: seçilen kademe gerçekten o botları başlatır ---

test('ASIL KABUL: botTurunuOynat botun tek girişine kabuğun zorluğunu geçirir', () => {
  for (const zorluk of ZORLUKLAR) {
    const kabuk = gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk }), OLAY.YENI_OYUN);
    const cagrilar = [];
    const casus = (durum, oyuncu, kademe) => {
      cagrilar.push({ oyuncu, kademe });
      return { basarili: true, durum };
    };
    botTurunuOynat(kabuk, durumKur(PER_ELI, t('sari', 9)), 2, casus);
    assert.deepEqual(cagrilar, [{ oyuncu: 2, kademe: zorluk }]);
  }
});

test('ASIL KABUL: kabuk üzerinden oynanan tur, o kademenin doğrudan oynadığı turla aynı', () => {
  const durum = durumKur(PER_ELI, t('sari', 9));
  for (const zorluk of ZORLUKLAR) {
    const kabuk = gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk }), OLAY.YENI_OYUN);
    const kabuktan = botTurunuOynat(kabuk, durum, 0);
    const dogrudan = botTurOyna(durum, 0, zorluk);
    assert.equal(kabuktan.basarili, true, `motor reddetti (${zorluk}): ${kabuktan.sebep}`);
    assert.deepEqual(
      kabuktan.durum.atilanYiginlar[0].map((tas) => tas.id),
      dogrudan.durum.atilanYiginlar[0].map((tas) => tas.id),
      `${zorluk} kademesi kabuk üzerinden farklı oynadı`,
    );
    assert.equal(kabuktan.durum.eller[0].length, dogrudan.durum.eller[0].length);
  }
});

test('ASIL KABUL: kademe seçimi hamleyi değiştirir — zor köşeden çeker, orta yerden', () => {
  // ADR-013'ün ölçülmüş farkı (bot-kolay.test.js "zor: köşedeki taş eli bitiriyorsa alır"): aynı
  // durumda zor kademe köşedeki sari-9'u `elBitirenTaslar` ile görüp ALIR, orta kademe göremez ve
  // yerden çeker. Kademe yolda yok sayılırsa (ör. sabit varsayılan oynatılırsa) bu test kırmızı yanar.
  const durum = durumKur(PER_ELI, t('sari', 9));
  const kabukZor = gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk: KADEME.ZOR }), OLAY.YENI_OYUN);
  const kabukOrta = gecis(gecis(kabukBaslat(), OLAY.ZORLUK_SEC, { zorluk: KADEME.ORTA }), OLAY.YENI_OYUN);

  const zorSonucu = botTurunuOynat(kabukZor, durum, 0);
  const ortaSonucu = botTurunuOynat(kabukOrta, durum, 0);
  assert.equal(zorSonucu.basarili, true, `motor reddetti (zor): ${zorSonucu.sebep}`);
  assert.equal(ortaSonucu.basarili, true, `motor reddetti (orta): ${ortaSonucu.sebep}`);

  // Zor: önceki oyuncunun köşesi boşaldı (üst taş alındı), yer destesi hiç azalmadı.
  assert.equal(zorSonucu.durum.atilanYiginlar[3].length, 0, 'zor kademe köşeden çekmeliydi');
  assert.equal(zorSonucu.durum.yerDestesi.length, durum.yerDestesi.length);
  // Orta: köşe olduğu gibi duruyor, yer destesi azaldı.
  assert.equal(ortaSonucu.durum.atilanYiginlar[3].length, 1, 'orta kademe köşeye dokunmamalıydı');
  assert.equal(ortaSonucu.durum.yerDestesi.length, durum.yerDestesi.length - 1);
});
