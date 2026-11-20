import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  atilacakTasiSec, cekimKaynaginiSec, bitisYolunuSec, kolayBotTurOyna, YOL,
} from '../docs/bot/kolay.js';
import { elBaslat, cek, KAYNAK, EL_SONUCU } from '../docs/cekirdek/el.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#9 / tasokey#37 — R-006: kolay bot sezgiseli, ADR-018 sürümü. Bot hiçbir kural bilgisini
// kendi yorumlamaz: "per mi / çift mi" sorusunu `cekirdek/dizilim.js`'e, "el bitti mi" sorusunu
// `cekirdek/cozucu.js`'e sorar, geçerliliğe `cekirdek/el.js` karar verir (ADR-002 + ADR-018).
// Tarayıcı API'si sızıntısı `katman-sinirlama.test.js`'te ayrıca taranır.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1); // okeyTasiBelirle(mavi-6) = mavi-7
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// Elin tamamı per gruplarına bölünen 14 taş + atılması elini bitiren 15. taş (ADR-017 kural 13).
const BITIREN_EL = [
  t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
  t('siyah', 1), t('siyah', 2), t('siyah', 3), t('siyah', 4),
  t('mavi', 1), t('mavi', 2), t('mavi', 3),
  t('sari', 1), t('sari', 2), t('sari', 3),
  t('mavi', 2, 2), // ikinci nüsha: hiçbir perde yeri yok, atılınca el biter
];

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

// --- bitisYolunuSec: el başına tek bitiş yolu (ADR-018/2) ---

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

// --- atilacakTasiSec: bitiren taş varsa onu, yoksa seçilen yolda en izole taşı atar ---

test('atilacakTasiSec: per yolunda bağlantısız (izole) taşı, perde yeri olan taşlar yerine seçer', () => {
  const el = [
    t('kirmizi', 1), t('siyah', 1), // aynı sayı farklı renk: ADR-017 ile sayı peri adayı (çift değil)
    t('mavi', 9), t('mavi', 10), // seri adayı
    t('sari', 3), // izole: hiçbir taşla aynı perde buluşamaz
  ];
  const secilen = atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE);
  assert.equal(secilen.id, t('sari', 3).id);
});

test('atilacakTasiSec: elini bitiren taş varsa (izole olmasa da) o taş atılır', () => {
  const secilen = atilacakTasiSec(BITIREN_EL, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE);
  // mavi-2'nin iki nüshası da aynı işi görür; atılan taş her durumda bir "bitiren" taş olmalı.
  assert.ok(['mavi-2-1', 'mavi-2-2'].includes(secilen.id), `beklenmeyen taş: ${secilen.id}`);
});

test('atilacakTasiSec: kural okey atmayı yasaklıyorsa joker hiç aday olmaz; kural kapalıyken aday olur', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const el = [okeyTas, t('kirmizi', 1), t('siyah', 1)];
  const kuralKapali = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: false };
  assert.equal(atilacakTasiSec(el, OKEY_TASI, kuralKapali, GOSTERGE).id, okeyTas.id);
  assert.notEqual(atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE).id, okeyTas.id);
});

test('atilacakTasiSec: elin tamamı jokerse (aday havuzu boşalır) hâlâ elden bir taş döner', () => {
  const el = [sOkey(1), sOkey(2)];
  const secilen = atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE);
  assert.ok(el.some((tas) => tas.id === secilen.id));
});

// --- cekimKaynaginiSec: atılandan çekme yalnız kuralla doğrulanmış gerçek tamamlamada (ADR-018/3) ---

test('cekimKaynaginiSec: üst taş elde gerçek bir per tamamlıyorsa ATILAN seçilir', () => {
  const el = [t('kirmizi', 1), t('kirmizi', 2), t('sari', 13), t('siyah', 6)];
  const durum = durumKur(el, t('kirmizi', 3)); // kirmizi 1-2-3 geçerli seri
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

test('cekimKaynaginiSec: üst taş sayı perini tamamlıyorsa (3. renk) ATILAN seçilir', () => {
  const el = [t('kirmizi', 5), t('siyah', 5), t('sari', 13)];
  const durum = durumKur(el, t('mavi', 5)); // ADR-017: aynı sayının 3 farklı rengi = sayı peri
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

test('cekimKaynaginiSec: ADR-017 regresyonu — "aynı sayı farklı renk" ikilisi artık ATILAN seçtirmez', () => {
  // Eski kuralda bu ikili "çift adayı" sayılıp atılandan çekmeyi tetikliyordu; artık ne çift ne
  // tamamlanmış per (3. renk yok) → yerden çekilir, yer destesi azalır.
  const el = [t('kirmizi', 5), t('mavi', 2)];
  const durum = durumKur(el, t('siyah', 5));
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

test('cekimKaynaginiSec: tamamlama yalnız jokerle kuruluyorsa ATILAN seçilmez (joker saklanır)', () => {
  const el = [sOkey(1), sOkey(2), t('kirmizi', 9)];
  const durum = durumKur(el, t('sari', 3));
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

test('cekimKaynaginiSec: çift yolundaki el üst taşla birebir çift kuruyorsa ATILAN seçilir', () => {
  const durum = durumKur(CIFT_YOLU_ELI, t('sari', 1, 2)); // sari-1'in ikinci nüshası
  assert.equal(bitisYolunuSec(CIFT_YOLU_ELI, OKEY_TASI, KURAL_VARSAYILAN, GOSTERGE), YOL.CIFT);
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

test('cekimKaynaginiSec: çift yolundaki el per tamamlayan taşı almaz (karışık toplama yok)', () => {
  // kirmizi-11, elde kirmizi 9-10 ile geçerli bir seri tamamlıyor; ama el çift yolunda olduğundan
  // bot karışık toplamaz (ADR-018/2) → yerden çeker.
  const durum = durumKur(CIFT_YOLU_ELI, t('kirmizi', 11));
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

test('cekimKaynaginiSec: önceki oyuncunun yığını boşsa YER seçilir (başka oyuncunun yığınına bakılmaz)', () => {
  const durum = durumKur([t('kirmizi', 1), t('kirmizi', 2)], null);
  durum.atilanYiginlar = [[], [t('kirmizi', 3)], [], []]; // oyuncu 1'in yığını dolu ama öncekisi değil
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

test('cekimKaynaginiSec: yer destesi boşsa motorun kabul edeceği tek kaynak (ATILAN) seçilir', () => {
  const durum = durumKur([t('kirmizi', 5)], t('sari', 11), { yerDestesi: [] });
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

// --- kolayBotTurOyna: gerçek cekirdek/el.js ile entegrasyon ---

test('kolayBotTurOyna: elBaslat sonrası sıradaki oyuncu için çek+at başarıyla tamamlanır', () => {
  const durum = elBaslat(2026);
  // Oyuncu 0 (başlayan) zaten çekilmiş sayılır; onun turu doğrudan atma.
  const cekSonucu = cek(durum, 0, KAYNAK.YER);
  assert.equal(cekSonucu.sebep, 'zatenCekildi');

  const atSonucu = kolayBotTurOyna(durum, 0, KURAL_VARSAYILAN);
  assert.equal(atSonucu.basarili, true, 'bot önerisi motor tarafından reddedilmemeli');
});

test('kolayBotTurOyna: önerilen taş her zaman o oyuncunun elinden; hiçbir zaman okeyAtilamaz sebebiyle reddedilmiyor', () => {
  let durum = elBaslat(4242);
  for (let i = 0; i < 20 && durum.sonuc === EL_SONUCU.SUREN; i++) {
    const oyuncu = durum.sira;
    const sonuc = kolayBotTurOyna(durum, oyuncu, KURAL_VARSAYILAN);
    assert.equal(sonuc.basarili, true, `tur ${i}: reddedildi, sebep=${sonuc.sebep}`);
    durum = sonuc.durum;
  }
});

test('kolayBotTurOyna: bitiren taşı atınca el sonunu motor (el.js) ilan eder', () => {
  const sonuc = kolayBotTurOyna(durumKur(BITIREN_EL, t('sari', 9)), 0, KURAL_VARSAYILAN);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 0);
});

test('kolayBotTurOyna: ADR-018/3 regresyonu — tohum 90007 doğal sonlanır ve yer destesi azalır', () => {
  // Bu tohum ADR-017'den sonra eski sezgiselle TUR_SINIRI'na çarpıyordu: dört bot da sürekli
  // atılandan çekiyor, yer destesi 26 taşta donuyor, el hiç sonlanmıyordu (ölçüldü, tasokey#37).
  let durum = elBaslat(90007);
  const desteBaslangici = durum.yerDestesi.length;
  while (durum.sonuc === EL_SONUCU.SUREN) {
    const sonuc = kolayBotTurOyna(durum, durum.sira);
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

// --- Kaynak kontrolü: ADR-018/1 — bot kuralı sorar, yeniden yazmaz ---

test('kaynak kontrolü: bot kural sorularını cekirdek\'e sorar, kendi geçerlilik mantığını yazmaz', () => {
  const kaynak = readFileSync(join(import.meta.dirname, '..', 'docs', 'bot', 'kolay.js'), 'utf8');

  // (a) Soruyu kurala sorar: dizilim/cozucu'nun saf işlevleri ADR-018 ile serbesttir.
  assert.match(kaynak, /from '\.\.\/cekirdek\/dizilim\.js'/, 'bot per/çift sorusunu dizilim.js\'e sormalı');
  // (b) Son karar kapısı hâlâ el.js: hamle cek()/at() ile motora onaylatılır (ADR-002).
  assert.match(kaynak, /from '\.\.\/cekirdek\/el\.js'/);
  assert.match(kaynak, /\bcek\(/);
  assert.match(kaynak, /\bat\(/);

  // (c) Kuralı kopyalamaz: renk/sayı karşılaştırmasıyla kendi per/çift tanımını kurmaz, sayı
  // aralığı/renk listesiyle kendi pencere hesabını yapmaz (ADR-017 hizasızlığının kök sebebi).
  const kuralKopyasiKaliplari = [
    /\.renk\s*[!=]==/, /\.sayi\s*[!=]==/, /\.sayi\s*[<>]/,
    /Math\.abs/, /ardisikPencereUret/, /EN_DUSUK_SAYI|EN_YUKSEK_SAYI|\bRENKLER\b/,
  ];
  for (const kalip of kuralKopyasiKaliplari) {
    assert.ok(!kalip.test(kaynak), `bot kural hesaplamasını kopyalamamalı: ${kalip}`);
  }

  // (d) ADR-002 taraması korunur: bot tarayıcı API'si kullanmaz.
  for (const kalip of [/\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bMath\.random\b/]) {
    assert.ok(!kalip.test(kaynak), `bot tarayıcı API\'si kullanmamalı: ${kalip}`);
  }
});
