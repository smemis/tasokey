import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  atilacakTasiSec, cekimKaynaginiSec, bitisYolunuSec, botTurOyna,
  YOL, KADEME, KADEME_AYARI, VARSAYILAN_KADEME,
} from '../docs/bot/bot.js';
import { elBaslat, cek, KAYNAK, EL_SONUCU } from '../docs/cekirdek/el.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#9 / tasokey#37 / tasokey#41 — R-006: bot sezgiseli (ADR-018) + üç zorluk kademesi
// (ADR-013). Dosya adı `bot-kolay.test.js` tarihseldir; artık üç kademeyi de kapsar.
// Bot hiçbir kural bilgisini kendi yorumlamaz: "per mi / çift mi" sorusunu `cekirdek/dizilim.js`'e,
// "el bitti mi / bu el neye bölünüyor" sorusunu `cekirdek/cozucu.js`'e sorar, geçerliliğe
// `cekirdek/el.js` karar verir (ADR-002 + ADR-018). Tarayıcı API'si sızıntısı
// `katman-sinirlama.test.js`'te ayrıca taranır.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1); // okeyTasiBelirle(mavi-6) = mavi-7
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

const KADEMELER = [KADEME.KOLAY, KADEME.ORTA, KADEME.ZOR];

// Kademe zarını testte sabitlemenin yolu `rastgele`yi enjekte etmek (ADR-013): 0 her zarı
// "tutturur" → kolay kademe de en iyi kararını verir, böylece kademeden bağımsız değişmezler
// (hangi taş atılır, hangi kaynaktan çekilir) üç kademede birden ölçülebilir.
const ENIYI = { rastgele: () => 0 };
const secenekler = (ek = {}) => ({ kural: KURAL_VARSAYILAN, gosterge: GOSTERGE, ...ENIYI, ...ek });

// Elin tamamı per gruplarına bölünen 14 taş + atılması elini bitiren 15. taş (ADR-017 kural 13).
const BITIREN_EL = [
  t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
  t('siyah', 1), t('siyah', 2), t('siyah', 3), t('siyah', 4),
  t('mavi', 1), t('mavi', 2), t('mavi', 3),
  t('sari', 1), t('sari', 2), t('sari', 3),
  t('mavi', 2, 2), // ikinci nüsha: hiçbir perde yeri yok, atılınca el biter
];

// Aynı 14 per taşı + **tek** bitiren taş (sari-9 hiçbir grupta yer almaz): "bitirme fırsatını
// kaçırmak" ölçülebilir olsun diye bitiren taş benzersizdir (BITIREN_EL'de iki mavi-2 nüshası da
// bitiriyor, hangisi atılırsa el bitiyor).
const TEK_BITIREN_EL = [...BITIREN_EL.slice(0, 14), t('sari', 9)];
const TEK_BITIREN_TAS_ID = t('sari', 9).id;

// 5 birebir çift (7'nin 5'i) + 4 bağlantısız taş → bot çift yoluna yönelir (ADR-018/2).
const CIFT_YOLU_ELI = [
  t('kirmizi', 3), t('kirmizi', 3, 2), t('siyah', 8), t('siyah', 8, 2),
  t('sari', 11), t('sari', 11, 2), t('mavi', 4), t('mavi', 4, 2),
  t('kirmizi', 12), t('kirmizi', 12, 2),
  t('sari', 1), t('siyah', 6), t('kirmizi', 10), t('kirmizi', 9),
];

function durumKur(el, ustTas, ekler = {}) {
  return {
    eller: [el, [], [], []],
    yerDestesi: [t('sari', 13)],
    atilanYiginlar: [[], [], [], ustTas ? [ustTas] : []], // ADR-010: oyuncu 0'ın öncekisi 3'tür
    gosterge: GOSTERGE,
    okeyTasi: OKEY_TASI,
    sira: 0,
    cekildiMi: true,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
    ...ekler,
  };
}

// --- Kademe tanımı (ADR-013): üç kademe, tek kaynak ---

test('KADEME: üç kademe var, varsayılan orta ve her kademenin ayarı tanımlı', () => {
  assert.deepEqual(Object.values(KADEME), ['kolay', 'orta', 'zor']);
  assert.equal(VARSAYILAN_KADEME, KADEME.ORTA);
  for (const kademe of KADEMELER) assert.ok(KADEME_AYARI[kademe], `${kademe} ayarı yok`);
});

test('KADEME_AYARI: yalnız kolay kademe zayıflatılmış; orta ve zor her kararı doğru verir', () => {
  const oranlar = (kademe) => [
    KADEME_AYARI[kademe].bitirmeyiGormeOrani,
    KADEME_AYARI[kademe].koseyiKullanmaOrani,
    KADEME_AYARI[kademe].enIzoleSecmeOrani,
  ];
  for (const oran of oranlar(KADEME.KOLAY)) assert.ok(oran < 1, 'kolay kademe zayıflatılmış olmalı');
  assert.deepEqual(oranlar(KADEME.ORTA), [1, 1, 1]);
  assert.deepEqual(oranlar(KADEME.ZOR), [1, 1, 1]);
  // Zor kademeyi ayıran: çözücüyle çekme + dökümle atma (orta ikisini de kullanmaz).
  assert.equal(KADEME_AYARI[KADEME.ZOR].cozucuIleCekim, true);
  assert.equal(KADEME_AYARI[KADEME.ORTA].cozucuIleCekim, false);
});

test('bilinmeyen kademe adı sessizce varsayılana düşmez, hata fırlatır', () => {
  assert.throws(() => atilacakTasiSec(BITIREN_EL, OKEY_TASI, 'efsane', secenekler()), /bilinmeyen bot kademesi/);
  assert.throws(() => botTurOyna(elBaslat(2026), 0, 'efsane'), /bilinmeyen bot kademesi/);
});

// --- bitisYolunuSec: el başına tek bitiş yolu (ADR-018/2); kademeden bağımsız ---

test('bitisYolunuSec: elde 5 birebir çift varsa çift yoluna yönelir', () => {
  assert.equal(bitisYolunuSec(CIFT_YOLU_ELI, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE), YOL.CIFT);
});

test('bitisYolunuSec: birebir çifti olmayan elde per yoluna yönelir', () => {
  const el = [t('kirmizi', 1), t('kirmizi', 2), t('siyah', 5), t('mavi', 9), t('sari', 13)];
  assert.equal(bitisYolunuSec(el, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE), YOL.PER);
});

test('bitisYolunuSec: joker her taşla çift kurabilse de yol çifte kaymaz (eşleşme ayrıktır)', () => {
  // Joker iki taşla da geçerli çift kurar; ayrık eşleşme olmasa her el "çift yolu" görünürdü.
  const el = [sOkey(1), sOkey(2), t('kirmizi', 1), t('siyah', 5), t('mavi', 9), t('sari', 13), t('kirmizi', 11)];
  assert.equal(bitisYolunuSec(el, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE), YOL.PER);
});

// --- atilacakTasiSec: üç kademede de geçerli değişmezler (zar "tutmuş" sayılır) ---

for (const kademe of KADEMELER) {
  test(`atilacakTasiSec (${kademe}): per yolunda bağlantısız (izole) taşı, perde yeri olan taşlar yerine seçer`, () => {
    const el = [
      t('kirmizi', 1), t('siyah', 1), // aynı sayı farklı renk: ADR-017 ile sayı peri adayı (çift değil)
      t('mavi', 9), t('mavi', 10), // seri adayı
      t('sari', 3), // izole: hiçbir taşla aynı perde buluşamaz
    ];
    const secilen = atilacakTasiSec(el, OKEY_TASI, kademe, secenekler());
    assert.equal(secilen.id, t('sari', 3).id);
  });

  test(`atilacakTasiSec (${kademe}): elini bitiren taş varsa (izole olmasa da) o taş atılır`, () => {
    const secilen = atilacakTasiSec(BITIREN_EL, OKEY_TASI, kademe, secenekler());
    // mavi-2'nin iki nüshası da aynı işi görür; atılan taş her durumda bir "bitiren" taş olmalı.
    assert.ok(['mavi-2-1', 'mavi-2-2'].includes(secilen.id), `beklenmeyen taş: ${secilen.id}`);
  });

  // tasokey#50: havuz filtresi SİLİNMEDİ, yalnız varsayılanı döndü (ADR-008 sürüm 2). İki yön de
  // ölçülür: yasak ayarı açıkken joker hiç aday olmaz, varsayılanda (serbest) aday olabilir.
  test(`atilacakTasiSec (${kademe}): havuz filtresi kurala bağlı — yasak açıkken joker aday olmaz, varsayılanda olur`, () => {
    const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
    const el = [okeyTas, t('kirmizi', 1), t('siyah', 1)];
    const kuralYasak = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: true };
    assert.equal(atilacakTasiSec(el, OKEY_TASI, kademe, secenekler()).id, okeyTas.id);
    assert.notEqual(atilacakTasiSec(el, OKEY_TASI, kademe, secenekler({ kural: kuralYasak })).id, okeyTas.id);
  });

  test(`atilacakTasiSec (${kademe}): elin tamamı jokerse (aday havuzu boşalır) hâlâ elden bir taş döner`, () => {
    const el = [sOkey(1), sOkey(2)];
    const secilen = atilacakTasiSec(el, OKEY_TASI, kademe, secenekler());
    assert.ok(el.some((tas) => tas.id === secilen.id));
  });
}

// --- cekimKaynaginiSec: atılandan çekme yalnız kuralla doğrulanmış gerçek tamamlamada (ADR-018/3) ---

for (const kademe of KADEMELER) {
  test(`cekimKaynaginiSec (${kademe}): üst taş elde gerçek bir per tamamlıyorsa ATILAN seçilir`, () => {
    const el = [t('kirmizi', 1), t('kirmizi', 2), t('sari', 13), t('siyah', 6)];
    const durum = durumKur(el, t('kirmizi', 3)); // kirmizi 1-2-3 geçerli seri
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.ATILAN);
  });

  test(`cekimKaynaginiSec (${kademe}): üst taş sayı perini tamamlıyorsa (3. renk) ATILAN seçilir`, () => {
    const el = [t('kirmizi', 5), t('siyah', 5), t('sari', 13)];
    const durum = durumKur(el, t('mavi', 5)); // ADR-017: aynı sayının 3 farklı rengi = sayı peri
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.ATILAN);
  });

  test(`cekimKaynaginiSec (${kademe}): ADR-017 regresyonu — "aynı sayı farklı renk" ikilisi artık ATILAN seçtirmez`, () => {
    // Eski kuralda bu ikili "çift adayı" sayılıp atılandan çekmeyi tetikliyordu; artık ne çift ne
    // tamamlanmış per (3. renk yok) → yerden çekilir, yer destesi azalır.
    const el = [t('kirmizi', 5), t('mavi', 2)];
    const durum = durumKur(el, t('siyah', 5));
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.YER);
  });

  test(`cekimKaynaginiSec (${kademe}): çift yolundaki el üst taşla birebir çift kuruyorsa ATILAN seçilir`, () => {
    const durum = durumKur(CIFT_YOLU_ELI, t('sari', 1, 2)); // sari-1'in ikinci nüshası
    assert.equal(bitisYolunuSec(CIFT_YOLU_ELI, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE), YOL.CIFT);
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.ATILAN);
  });

  test(`cekimKaynaginiSec (${kademe}): çift yolundaki el per tamamlayan taşı almaz (karışık toplama yok)`, () => {
    // kirmizi-11, elde kirmizi 9-10 ile geçerli bir seri tamamlıyor; ama el çift yolunda olduğundan
    // bot karışık toplamaz (ADR-018/2) → yerden çeker.
    const durum = durumKur(CIFT_YOLU_ELI, t('kirmizi', 11));
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.YER);
  });

  test(`cekimKaynaginiSec (${kademe}): önceki oyuncunun yığını boşsa YER seçilir (başka oyuncunun yığınına bakılmaz)`, () => {
    const durum = durumKur([t('kirmizi', 1), t('kirmizi', 2)], null);
    durum.atilanYiginlar = [[], [t('kirmizi', 3)], [], []]; // oyuncu 1'in yığını dolu ama öncekisi değil
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.YER);
  });

  test(`cekimKaynaginiSec (${kademe}): yer destesi boşsa motorun kabul edeceği tek kaynak (ATILAN) seçilir`, () => {
    const durum = durumKur([t('kirmizi', 5)], t('sari', 11), { yerDestesi: [] });
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.ATILAN);
  });
}

test('cekimKaynaginiSec (kolay/orta): tamamlama yalnız jokerle kuruluyorsa ATILAN seçilmez (joker saklanır)', () => {
  const el = [sOkey(1), sOkey(2), t('kirmizi', 9)];
  const durum = durumKur(el, t('sari', 3));
  for (const kademe of [KADEME.KOLAY, KADEME.ORTA]) {
    assert.equal(cekimKaynaginiSec(durum, 0, kademe, ENIYI), KAYNAK.YER);
  }
});

// --- Kolay kademe: zayıflatma ölçülebilir (ADR-013/2) ---

test('kolay: bitirme fırsatını kaçırabilir — zar tutmazsa bitiren taşı aramaz, başka taş atar', () => {
  const zarTutmaz = { rastgele: () => 0.6 }; // 0,6 < 0,6 değil → bitirmeyi görmez; izole seçimi de düşer
  const kolaySecim = atilacakTasiSec(TEK_BITIREN_EL, OKEY_TASI, KADEME.KOLAY, secenekler(zarTutmaz));
  assert.notEqual(kolaySecim.id, TEK_BITIREN_TAS_ID, 'kolay kademe bu zarda bitiren taşı atmamalı');

  // Aynı el, aynı zar: orta ve zor kademe fırsatı **her zaman** görür (oran 1 → zar atılmaz).
  for (const kademe of [KADEME.ORTA, KADEME.ZOR]) {
    const secim = atilacakTasiSec(TEK_BITIREN_EL, OKEY_TASI, kademe, secenekler(zarTutmaz));
    assert.equal(secim.id, TEK_BITIREN_TAS_ID, `${kademe} kademe bitiren taşı atmalı`);
  }
});

test('kolay: en izole taşı her zaman seçmez — zar tutmazsa havuzdan başka bir taş atar', () => {
  const el = [t('kirmizi', 1), t('siyah', 1), t('mavi', 9), t('mavi', 10), t('sari', 3)];
  const secim = atilacakTasiSec(el, OKEY_TASI, KADEME.KOLAY, secenekler({ rastgele: () => 0.6 }));
  assert.notEqual(secim.id, t('sari', 3).id, 'izole taş değil, havuzdan rastgele bir taş seçilmeli');
  assert.ok(el.some((tas) => tas.id === secim.id), 'seçilen taş elden olmalı');
});

test('kolay: köşeden çekmeyi çoğunlukla kullanmaz — tamamlama olsa da yerden çeker', () => {
  const el = [t('kirmizi', 1), t('kirmizi', 2), t('sari', 13), t('siyah', 6)];
  const durum = durumKur(el, t('kirmizi', 3)); // kirmizi 1-2-3: gerçek tamamlama
  // Zar tutmaz (0,5 ≥ 0,25): köşe atlanır. Aynı durumda orta kademe ATILAN seçiyor (yukarıda).
  assert.equal(cekimKaynaginiSec(durum, 0, KADEME.KOLAY, { rastgele: () => 0.5 }), KAYNAK.YER);
  // "Hiç kullanmaz" değil "çoğunlukla kullanmaz": zar tutarsa köşeyi alır.
  assert.equal(cekimKaynaginiSec(durum, 0, KADEME.KOLAY, { rastgele: () => 0.1 }), KAYNAK.ATILAN);
});

// --- Zor kademe: `elBitirenTaslar` sorgusu (ADR-013/3) ---

test('zor: köşedeki taş eli bitiriyorsa alır — tamamlama kurmasa bile (orta kaçırır, yerden çeker)', () => {
  // El 14 taşla zaten tamamen per bölünüyor; sari-9 hiçbir grup kurmuyor, ama onu alıp hemen atmak
  // eli bitirir. Orta kademe yalnız "tamamlama var mı?" diye bakar → göremez, yerden çeker.
  const el = BITIREN_EL.slice(0, 14);
  const durum = durumKur(el, t('sari', 9));
  assert.equal(cekimKaynaginiSec(durum, 0, KADEME.ZOR, ENIYI), KAYNAK.ATILAN);
  assert.equal(cekimKaynaginiSec(durum, 0, KADEME.ORTA, ENIYI), KAYNAK.YER);
});

test('zor: üst taş joker olsa da çekme+atma motorun kabul ettiği hamleye dönüşür (atılan taş joker değil)', () => {
  // Motor okey/sahte okey atmayı yasaklar (ADR-008/2). Zor kademenin çözücü sorgusu "hangi taşı
  // atarsam biter" cevabını atılabilir havuzla kesiştirir; kesiştirmese çekme sonrası atma
  // motorca reddedilebilirdi. Ölçülen: hamle kabul edildi ve atılan taş joker değil.
  const durum = durumKur([...BITIREN_EL.slice(0, 14)], sOkey(1));
  const sonuc = botTurOyna({ ...durum, cekildiMi: false }, 0, KADEME.ZOR, ENIYI);
  assert.equal(sonuc.basarili, true, `motor reddetti: ${sonuc.sebep}`);
  const atilan = sonuc.durum.atilanYiginlar[0].at(-1);
  assert.notEqual(atilan.id, sOkey(1).id, 'atılan taş sahte okey olmamalı');
});

// --- botTurOyna: gerçek cekirdek/el.js ile entegrasyon, üç kademe ---

for (const kademe of KADEMELER) {
  test(`botTurOyna (${kademe}): elBaslat sonrası sıradaki oyuncu için çek+at başarıyla tamamlanır`, () => {
    const durum = elBaslat(2026);
    // Oyuncu 0 (başlayan) zaten çekilmiş sayılır; onun turu doğrudan atma.
    const cekSonucu = cek(durum, 0, KAYNAK.YER);
    assert.equal(cekSonucu.sebep, 'zatenCekildi');

    const atSonucu = botTurOyna(durum, 0, kademe);
    assert.equal(atSonucu.basarili, true, 'bot önerisi motor tarafından reddedilmemeli');
  });

  test(`botTurOyna (${kademe}): önerilen taş her zaman o oyuncunun elinden; hiçbir zaman okeyAtilamaz sebebiyle reddedilmiyor`, () => {
    let durum = elBaslat(4242);
    for (let i = 0; i < 20 && durum.sonuc === EL_SONUCU.SUREN; i++) {
      const oyuncu = durum.sira;
      const sonuc = botTurOyna(durum, oyuncu, kademe);
      assert.equal(sonuc.basarili, true, `tur ${i}: reddedildi, sebep=${sonuc.sebep}`);
      durum = sonuc.durum;
    }
  });

  test(`botTurOyna (${kademe}): ADR-018/3 regresyonu — tohum 90007 doğal sonlanır ve yer destesi azalır`, () => {
    // Bu tohum ADR-017'den sonra eski sezgiselle TUR_SINIRI'na çarpıyordu: dört bot da sürekli
    // atılandan çekiyor, yer destesi 26 taşta donuyor, el hiç sonlanmıyordu (ölçüldü, tasokey#37).
    let durum = elBaslat(90007);
    const desteBaslangici = durum.yerDestesi.length;
    while (durum.sonuc === EL_SONUCU.SUREN) {
      const sonuc = botTurOyna(durum, durum.sira, kademe);
      assert.equal(sonuc.basarili, true, `reddedildi: ${sonuc.sebep}`);
      assert.ok(sonuc.durum.yerDestesi.length <= durum.yerDestesi.length, 'yer destesi büyümemeli');
      durum = sonuc.durum;
    }
    assert.notEqual(durum.sonuc, EL_SONUCU.TUR_SINIRI, 'el güvenlik tur sınırına çarpmamalı');
    assert.ok(
      durum.yerDestesi.length < desteBaslangici,
      `yer destesi azalmalı: ${desteBaslangici} → ${durum.yerDestesi.length}`,
    );
  });
}

test('botTurOyna (orta/zor): bitiren taşı atınca el sonunu motor (el.js) ilan eder', () => {
  for (const kademe of [KADEME.ORTA, KADEME.ZOR]) {
    const sonuc = botTurOyna(durumKur(BITIREN_EL, t('sari', 9)), 0, kademe);
    assert.equal(sonuc.basarili, true);
    assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
    assert.equal(sonuc.durum.kazanan, 0);
  }
});

test('botTurOyna: kademe verilmezse varsayılan (orta) oynar — arayüzün bugünkü davranışı', () => {
  const durum = durumKur(BITIREN_EL, t('sari', 9));
  assert.deepEqual(
    botTurOyna(durum, 0).durum.atilanYiginlar[0].map((tas) => tas.id),
    botTurOyna(durum, 0, KADEME.ORTA).durum.atilanYiginlar[0].map((tas) => tas.id),
  );
});

// --- Kaynak kontrolü: ADR-018/1 — bot kuralı sorar, yeniden yazmaz ---

test('kaynak kontrolü: bot kural sorularını cekirdek\'e sorar, kendi geçerlilik mantığını yazmaz', () => {
  // tasokey#41: tek dosya değil, `docs/bot/` altındaki **bütün** kaynaklar taranır — kural kopyası
  // yeni bir dosyaya taşınarak denetimden kaçamaz.
  const botDizini = join(import.meta.dirname, '..', 'docs', 'bot');
  assert.ok(existsSync(botDizini), 'docs/bot klasörü yok');
  const dosyalar = readdirSync(botDizini, { recursive: true }).filter((ad) => ad.endsWith('.js'));
  assert.ok(dosyalar.length > 0, 'docs/bot altında taranacak .js dosyası yok');

  for (const dosya of dosyalar) {
    const kaynak = readFileSync(join(botDizini, dosya), 'utf8');

    // (c) Kuralı kopyalamaz: renk/sayı karşılaştırmasıyla kendi per/çift tanımını kurmaz, sayı
    // aralığı/renk listesiyle kendi pencere hesabını yapmaz (ADR-017 hizasızlığının kök sebebi).
    const kuralKopyasiKaliplari = [
      /\.renk\s*[!=]==/, /\.sayi\s*[!=]==/, /\.sayi\s*[<>]/,
      /Math\.abs/, /ardisikPencereUret/, /EN_DUSUK_SAYI|EN_YUKSEK_SAYI|\bRENKLER\b/,
    ];
    for (const kalip of kuralKopyasiKaliplari) {
      assert.ok(!kalip.test(kaynak), `${dosya} kural hesaplamasını kopyalamamalı: ${kalip}`);
    }

    // (d) ADR-002 taraması korunur: bot tarayıcı API'si ve dilin hazır rastgele üretecini kullanmaz
    // (kademe zarı `cekirdek/karma.js`'in tohumlu üretecinden gelir, ADR-003 + ADR-013).
    for (const kalip of [/\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /Math\.random/]) {
      assert.ok(!kalip.test(kaynak), `${dosya} tarayıcı API'si / tohumsuz rastgelelik kullanmamalı: ${kalip}`);
    }
  }

  // (a) Soruyu kurala sorar: dizilim/cozucu'nun saf işlevleri ADR-018 ile serbesttir.
  const giris = readFileSync(join(botDizini, 'bot.js'), 'utf8');
  assert.match(giris, /from '\.\.\/cekirdek\/dizilim\.js'/, 'bot per/çift sorusunu dizilim.js\'e sormalı');
  assert.match(giris, /from '\.\.\/cekirdek\/cozucu\.js'/, 'bot bitiş/döküm sorusunu cozucu.js\'e sormalı');
  // (b) Son karar kapısı hâlâ el.js: hamle cek()/at() ile motora onaylatılır (ADR-002).
  assert.match(giris, /from '\.\.\/cekirdek\/el\.js'/);
  assert.match(giris, /\bcek\(/);
  assert.match(giris, /\bat\(/);
  // (e) Tohumlu rastgelelik tek kaynaktan: `karma.js` (ADR-003).
  assert.match(giris, /from '\.\.\/cekirdek\/karma\.js'/);
});
