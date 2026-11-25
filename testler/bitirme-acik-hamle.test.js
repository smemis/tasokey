import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  at, bitir, cek, elBaslat, KAYNAK, REDDEDILME_SEBEBI, EL_SONUCU, sonrakiOyuncu, oncekiOyuncu,
} from '../docs/cekirdek/el.js';
import { HEDEF_TURU, EYLEM, eylemKararVer } from '../docs/arayuz/etkilesim.js';
import { oyuncununAtilanKosesi } from '../docs/arayuz/yerlesim.js';
import { botTurOyna, KADEME } from '../docs/bot/bot.js';
import { tasOlustur } from '../docs/cekirdek/tas.js';

// tasokey#89 — Sahip hatası: **bitirilebilir elle köşeye atınca el kendiliğinden bitiyordu**
// ("El bitti! Kazanan: Sen"). Doğru kural (GDD.md §1 kural 15, §2 "Bitirme"; R-013, ADR-021/6):
// el YALNIZ oyuncu son taşını ortadaki yer destesine (bitirme alanı) bıraktığında biter; el
// bitirilebilir olsa bile köşeye atmak SIRADAN bir atmadır — el sürer, sıra sonraki oyuncuya geçer.
// Bu dosya iki yolu birden denetler: (1) köşeye atma eli bitirmez, (2) bitirme hamlesi bitirir.
// Kök neden `cekirdek/el.js` `at` idi (her atıştan sonra `elBitirilebilirMi` çağırıyordu); düzeltme
// tek kapıdan yapıldı — bitirme ayrı motor kapısıdır (`bitir`), arayüz ve bot aynı kapıyı kullanır.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1); // okeyTasiBelirle(mavi-6) = mavi-7
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);

const INSAN = 0;
const KENDI_KOSESI = oyuncununAtilanKosesi(INSAN, sonrakiOyuncu);

// Elin tamamı per gruplarına bölünen 14 taş (ADR-017 kural 13) + atılınca eli bitiren 15. taş.
const PER_ELI_14 = [
  t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
  t('siyah', 1), t('siyah', 2), t('siyah', 3), t('siyah', 4),
  t('mavi', 1), t('mavi', 2), t('mavi', 3),
  t('sari', 1), t('sari', 2), t('sari', 3),
];
const BITIREN_TAS = t('sari', 9); // hiçbir perde yeri yok: atılınca kalan 14 taş tamamen per
const BITIRILEBILIR_EL = [...PER_ELI_14, BITIREN_TAS];

// Oyuncu 0 çekmiş, elinde 15 taş var ve atacağı taşı seçtiğinde el bitebilir durumda.
function bitirilebilirDurum(ekler = {}) {
  return {
    eller: [BITIRILEBILIR_EL, [t('siyah', 10)], [t('mavi', 11)], [t('sari', 12)]],
    yerDestesi: [t('kirmizi', 5), t('siyah', 6)],
    atilanYiginlar: [[], [], [], []],
    gosterge: GOSTERGE,
    okeyTasi: OKEY_TASI,
    sira: INSAN,
    cekildiMi: true,
    sonCekilen: null,
    turSayaci: 3,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
    ...ekler,
  };
}

// --- (1) Bitirilebilir elle köşeye atma: el BİTMEZ, sıra geçer (Sahip'in bildirdiği belirti) ---

test('(1) bitirilebilir elle köşeye atınca el bitmez: sonuç SUREN, kazanan null, sıra sonrakine geçer', () => {
  const durum = bitirilebilirDurum();
  const sonuc = at(durum, INSAN, BITIREN_TAS.id);

  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN, 'köşeye atma eli bitirmemeli');
  assert.equal(sonuc.durum.kazanan, null, 'köşeye atmada kazanan ilan edilmemeli');
  assert.equal(sonuc.durum.sira, sonrakiOyuncu(INSAN), 'sıra sonraki oyuncuya geçmeli');
  // Taş yine atan oyuncunun köşe yığınına gider (ADR-010) ve tur sayacı ilerler.
  assert.deepEqual(sonuc.durum.atilanYiginlar[INSAN].map((tas) => tas.id), [BITIREN_TAS.id]);
  assert.equal(sonuc.durum.turSayaci, durum.turSayaci + 1);
  assert.equal(sonuc.durum.cekildiMi, false);
});

test('(1) el sürdüğü için sonraki oyuncu oynayabilir ve bitirilebilir oyuncu sırası gelince bitirebilir', () => {
  const kosedenAtilmis = at(bitirilebilirDurum(), INSAN, BITIREN_TAS.id).durum;
  // Sıradaki oyuncu hamlesini yapabiliyor: el gerçekten devam ediyor (ret sebebi elBitti değil).
  const rakipCekti = cek(kosedenAtilmis, sonrakiOyuncu(INSAN), KAYNAK.YER);
  assert.equal(rakipCekti.basarili, true, `el sürerken rakip çekemedi: ${rakipCekti.sebep}`);

  // Sıra oyuncuya döndüğünde (eli yine 15 taş) bitirme hamlesi hâlâ açık: bitirmek SEÇİMDİR.
  const siraDondu = { ...kosedenAtilmis, sira: INSAN, cekildiMi: true, eller: kosedenAtilmis.eller.map(
    (el, i) => (i === INSAN ? [...el, BITIREN_TAS] : el),
  ) };
  const bitirme = bitir(siraDondu, INSAN, BITIREN_TAS.id);
  assert.equal(bitirme.basarili, true, `bitirme reddedildi: ${bitirme.sebep}`);
  assert.equal(bitirme.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(bitirme.durum.kazanan, INSAN);
});

// --- (2) Bitirme hamlesi: el biter, kazanan doğru ---

test('(2) bitirme hamlesi eli bitirir: sonuç BITTI, kazanan hamleyi yapan oyuncu, taş elden çıkar', () => {
  const durum = bitirilebilirDurum();
  const sonuc = bitir(durum, INSAN, BITIREN_TAS.id);

  assert.equal(sonuc.basarili, true, `bitirme reddedildi: ${sonuc.sebep}`);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, INSAN);
  assert.equal(sonuc.durum.eller[INSAN].length, 14, 'bitirenin elinde 14 taş kalmalı');
  assert.equal(
    sonuc.durum.eller[INSAN].some((tas) => tas.id === BITIREN_TAS.id), false,
    'bırakılan taş elde kalmış',
  );
});

test('(2) kazanan hamleyi yapan oyuncudur (oyuncu 2 bitirince kazanan 2)', () => {
  const durum = bitirilebilirDurum({
    sira: 2,
    eller: [[t('siyah', 10)], [t('mavi', 11)], BITIRILEBILIR_EL, [t('sari', 12)]],
  });
  const sonuc = bitir(durum, 2, BITIREN_TAS.id);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 2);
});

test('(2) bitirmeyen taşla bitirme denenirse bitirilemez ile reddedilir ve durum HİÇ değişmez', () => {
  const durum = bitirilebilirDurum();
  const sonuc = bitir(durum, INSAN, PER_ELI_14[0].id); // kirmizi-1: atılırsa kalan el bitmez
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.BITIRILEMEZ);
  assert.deepEqual(sonuc.durum, durum, 'reddedilen bitirme durumu değiştirmemeli');
});

test('(2) bitirme hamlesi atmanın ön koşullarını paylaşır: sıra, çekmiş olma, taşın elde olması', () => {
  const durum = bitirilebilirDurum();
  assert.equal(bitir(durum, 1, BITIREN_TAS.id).sebep, REDDEDILME_SEBEBI.SIRA_DEGIL);
  assert.equal(
    bitir({ ...durum, cekildiMi: false }, INSAN, BITIREN_TAS.id).sebep,
    REDDEDILME_SEBEBI.HENUZ_CEKILMEDI,
  );
  assert.equal(bitir(durum, INSAN, 'olmayan-tas-id').sebep, REDDEDILME_SEBEBI.TAS_ELDE_YOK);
  assert.equal(
    bitir({ ...durum, sonuc: EL_SONUCU.BITTI, kazanan: 1 }, INSAN, BITIREN_TAS.id).sebep,
    REDDEDILME_SEBEBI.EL_BITTI,
  );
});

// --- (3) Etkileşim kararı: hedef hangi motor kapısına gider (ADR-002: karar burada, onay motorda) ---

test('(3) bitirilebilir elle KÖŞE hedefi "at" eylemi döner (bitirmeye sapmaz)', () => {
  const karar = eylemKararVer(
    BITIREN_TAS.id, HEDEF_TURU.KOSE, bitirilebilirDurum(), INSAN, { kose: KENDI_KOSESI },
  );
  assert.deepEqual(karar, { eylem: EYLEM.AT, tasId: BITIREN_TAS.id });
});

test('(3) aynı elde YER DESTESI hedefi "bitir" eylemi döner', () => {
  const karar = eylemKararVer(BITIREN_TAS.id, HEDEF_TURU.YER_DESTESI, bitirilebilirDurum(), INSAN);
  assert.deepEqual(karar, { eylem: EYLEM.BITIR, tasId: BITIREN_TAS.id });
});

// `ekran.js` tarayıcı dışında import edilemez (ADR-016 Sonuçlar/c): iki eylemin AYRI motor kapısına
// gittiği kaynak taramasıyla ölçülür — aynı dilde başka öz-testler de var (bkz. surukleme-*.test.js).
test('(3) ekran.js EYLEM.BITIR kararını `bitir` kapısına, atmayı `at` kapısına verir', () => {
  const ekranJs = readFileSync(join(import.meta.dirname, '..', 'docs', 'arayuz', 'ekran.js'), 'utf8');
  assert.match(ekranJs, /bitir,/, 'ekran.js motorun `bitir` kapısını import etmiyor');
  assert.match(
    ekranJs, /karar\.eylem === EYLEM\.BITIR \? bitir : at/,
    'ekran.js bitirme eylemini `bitir` kapısına yöneltmiyor',
  );
});

// --- (4) Botlar için de aynı kural: bitirmek açık hamledir ---

test('(4) bot bitirebildiğinde bitirme hamlesini açıkça yapar: el BITTI, kazanan bot', () => {
  for (const kademe of [KADEME.ORTA, KADEME.ZOR]) {
    const durum = bitirilebilirDurum({ cekildiMi: true });
    const sonuc = botTurOyna(durum, INSAN, kademe, { rastgele: () => 0 });
    assert.equal(sonuc.basarili, true, `${kademe}: motor reddetti (${sonuc.sebep})`);
    assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI, `${kademe}: bot eli bitirmeliydi`);
    assert.equal(sonuc.durum.kazanan, INSAN);
  }
});

test('(4) bot bitiremiyorsa turu sıradan atma olarak kapatır: el sürer, sıra geçer', () => {
  // 14 taşı per bölünmeyen bir el: botun attığı taş eli bitirmez.
  const bitmeyenEl = [
    t('kirmizi', 1), t('kirmizi', 3), t('siyah', 5), t('siyah', 9), t('mavi', 12),
    t('sari', 2), t('sari', 7), t('kirmizi', 11), t('siyah', 13), t('mavi', 4),
    t('sari', 10), t('kirmizi', 8), t('siyah', 6), t('mavi', 9), t('sari', 5),
  ];
  const durum = bitirilebilirDurum({ eller: [bitmeyenEl, [t('siyah', 10)], [t('mavi', 11)], [t('sari', 12)]] });
  const sonuc = botTurOyna(durum, INSAN, KADEME.ORTA, { rastgele: () => 0 });
  assert.equal(sonuc.basarili, true, `motor reddetti: ${sonuc.sebep}`);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN);
  assert.equal(sonuc.durum.kazanan, null);
  assert.equal(sonuc.durum.sira, sonrakiOyuncu(INSAN));
  assert.equal(sonuc.durum.atilanYiginlar[INSAN].length, 1, 'atılan taş kendi köşe yığınına gitmeli');
});

test('(4) dört botun oynadığı el yine sonlanır (bitirme hamlesi botlarda da işliyor)', () => {
  let durum = elBaslat(90007);
  while (durum.sonuc === EL_SONUCU.SUREN) {
    const sonuc = botTurOyna(durum, durum.sira, KADEME.ORTA);
    assert.equal(sonuc.basarili, true, `reddedildi: ${sonuc.sebep}`);
    durum = sonuc.durum;
  }
  assert.equal(durum.sonuc, EL_SONUCU.BITTI, 'bu tohumda el kazananla bitmeli');
  assert.equal(typeof durum.kazanan, 'number');
  // Kazanan gerçekten bitirme hamlesi yapmış olmalı: önceki oyuncunun değil kendi yığını son dolan.
  assert.equal(durum.eller[durum.kazanan].length, 14, 'kazananın elinde 14 taş kalmalı');
  assert.notEqual(oncekiOyuncu(durum.kazanan), durum.kazanan);
});
