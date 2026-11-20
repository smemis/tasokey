import test from 'node:test';
import assert from 'node:assert/strict';
import {
  elBaslat, cek, at, KAYNAK, REDDEDILME_SEBEBI, EL_SONUCU, VARSAYILAN_MAKSIMUM_TUR,
  sonrakiOyuncu, oncekiOyuncu,
} from '../docs/cekirdek/el.js';
import { tasOkeyMi, OYUNCU_SAYISI } from '../docs/cekirdek/dagitim.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#8 — R-003: sıra, çek-at, el sonu. Kabul (a)-(e) `is-dosyasi.md`'de.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1);
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

function temelDurum(ekler = {}) {
  const varsayilan = {
    eller: [
      [t('kirmizi', 1), t('kirmizi', 9)],
      [t('siyah', 2), t('siyah', 10)],
      [t('mavi', 3), t('mavi', 11)],
      [t('sari', 4), t('sari', 12)],
    ],
    yerDestesi: [t('kirmizi', 5), t('siyah', 6)],
    atilanYiginlar: [[], [], [], []],
    gosterge: GOSTERGE,
    okeyTasi: OKEY_TASI,
    sira: 0,
    cekildiMi: false,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
  };
  return { ...varsayilan, ...ekler };
}

// --- (a) sırası olmayan oyuncu hamle yapamıyor ---

test('sırası olmayan oyuncu çekemez (sebep: siraDegil)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false });
  const sonuc = cek(durum, 1, KAYNAK.YER);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.SIRA_DEGIL);
  assert.deepEqual(sonuc.durum, durum, 'reddedilen hamle durumu değiştirmemeli');
});

test('sırası olmayan oyuncu atamaz (sebep: siraDegil)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: true });
  const sonuc = at(durum, 1, durum.eller[1][0].id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.SIRA_DEGIL);
});

// --- (b) çekmeden atılamıyor, iki kez çekilemiyor ---

test('çekmeden taş atılamaz (sebep: henuzCekilmedi)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false });
  const sonuc = at(durum, 0, durum.eller[0][0].id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.HENUZ_CEKILMEDI);
});

test('aynı turda iki kez çekilemez (sebep: zatenCekildi)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false });
  const birinci = cek(durum, 0, KAYNAK.YER);
  assert.equal(birinci.basarili, true);
  const ikinci = cek(birinci.durum, 0, KAYNAK.YER);
  assert.equal(ikinci.basarili, false);
  assert.equal(ikinci.sebep, REDDEDILME_SEBEBI.ZATEN_CEKILDI);
});

// --- (c) yerden ve atılan taştan çekme ikisi de çalışıyor ---

test('yerden çekme: yer destesinin baştaki taşı ele geçer, deste bir kısalır', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false });
  const beklenenTas = durum.yerDestesi[0];
  const sonuc = cek(durum, 0, KAYNAK.YER);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.yerDestesi.length, durum.yerDestesi.length - 1);
  assert.equal(sonuc.durum.cekildiMi, true);
  assert.ok(sonuc.durum.eller[0].some((tas) => tas.id === beklenenTas.id));
});

// --- tasokey#25 — ADR-010: atılan taşlar oyuncu başına yığın ---

test('sonrakiOyuncu/oncekiOyuncu: 4 koltukta ileri/geri tek kaynaktan dönen sıra hesabı', () => {
  assert.equal(sonrakiOyuncu(0), 1);
  assert.equal(sonrakiOyuncu(3), 0);
  assert.equal(oncekiOyuncu(0), 3);
  assert.equal(oncekiOyuncu(1), 0);
});

test('kabul (a): atılan taş atan oyuncunun kendi yığınına konur', () => {
  const sonAtilan = t('mavi', 13);
  const durum = temelDurum({
    sira: 2,
    cekildiMi: true,
    eller: [temelDurum().eller[0], temelDurum().eller[1], [sonAtilan, t('siyah', 9)], temelDurum().eller[3]],
  });
  const sonuc = at(durum, 2, sonAtilan.id);
  assert.equal(sonuc.basarili, true);
  assert.deepEqual(sonuc.durum.atilanYiginlar[2], [sonAtilan], 'taş atan oyuncunun (2) yığınına girmeli');
  assert.deepEqual(sonuc.durum.atilanYiginlar[0], []);
  assert.deepEqual(sonuc.durum.atilanYiginlar[1], []);
  assert.deepEqual(sonuc.durum.atilanYiginlar[3], []);
});

test('kabul (c): atılan taştan çekme yalnız önceki oyuncunun yığınının üstündeki taşı alır, yalnız o yığın eksilir', () => {
  const altTas = t('sari', 8);
  const sonAtilan = t('mavi', 13);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: false,
    atilanYiginlar: [[], [t('kirmizi', 11)], [t('siyah', 12)], [altTas, sonAtilan]],
  });
  const sonuc = cek(durum, 0, KAYNAK.ATILAN);
  assert.equal(sonuc.basarili, true);
  assert.deepEqual(sonuc.durum.atilanYiginlar[3], [altTas], 'yalnız en üstteki taş alınmalı, önceki oyuncunun (3) yığınından');
  assert.deepEqual(sonuc.durum.atilanYiginlar[1], [t('kirmizi', 11)], 'ilgisiz yığınlar değişmemeli');
  assert.deepEqual(sonuc.durum.atilanYiginlar[2], [t('siyah', 12)], 'ilgisiz yığınlar değişmemeli');
  assert.ok(sonuc.durum.eller[0].some((tas) => tas.id === sonAtilan.id));
});

test('yer destesi boşken yerden çekilemez (sebep: yerDestesiBos)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false, yerDestesi: [] });
  const sonuc = cek(durum, 0, KAYNAK.YER);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.YER_DESTESI_BOS);
});

test('atılan yığın boşken atılandan çekilemez (sebep: atilanYok)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: false, atilanYiginlar: [[], [], [], []] });
  const sonuc = cek(durum, 0, KAYNAK.ATILAN);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.ATILAN_YOK);
});

test('kabul (b): önceki oyuncunun yığını boşken başka oyuncunun dolu yığınından çekilemez (sebep: atilanYok)', () => {
  // Sıra 0'da: önceki oyuncu 3 (boş yığın). Oyuncu 1 ve 2'nin yığınları dolu ama bunlar motor
  // için geçerli bir kaynak değil — başka köşeden çekme yasağı (R-012) motorda da geçerli olmalı.
  const durum = temelDurum({
    sira: 0,
    cekildiMi: false,
    atilanYiginlar: [[], [t('kirmizi', 11)], [t('siyah', 12)], []],
  });
  const sonuc = cek(durum, 0, KAYNAK.ATILAN);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.ATILAN_YOK);
  assert.deepEqual(sonuc.durum, durum, 'reddedilen hamle durumu değiştirmemeli');
});

test('kabul (d): tam turda (4 atış) dört yığının da uzunluğu 1 olur', () => {
  let durum = elBaslat(5050);
  for (let i = 0; i < OYUNCU_SAYISI; i++) {
    const oyuncu = durum.sira;
    if (!durum.cekildiMi) {
      const cekSonuc = cek(durum, oyuncu, KAYNAK.YER);
      assert.equal(cekSonuc.basarili, true);
      durum = cekSonuc.durum;
    }
    const atilacakTas = durum.eller[oyuncu].find((tas) => !tasOkeyMi(tas, durum.okeyTasi));
    const atSonuc = at(durum, oyuncu, atilacakTas.id);
    assert.equal(atSonuc.basarili, true);
    durum = atSonuc.durum;
  }
  for (let oyuncu = 0; oyuncu < OYUNCU_SAYISI; oyuncu++) {
    assert.equal(durum.atilanYiginlar[oyuncu].length, 1, `oyuncu ${oyuncu} yığını tam turda tam 1 taş içermeli`);
  }
});

// --- (d) okey/sahte okey atma engelleniyor (ADR-008/2), sebep çağırana döner ---

test('gerçek okey taşı atılamaz (sebep: okeyAtilamaz)', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [[okeyTas, t('kirmizi', 1)], temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3]],
  });
  const sonuc = at(durum, 0, okeyTas.id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.OKEY_ATILAMAZ);
});

test('sahte okey atılamaz (sebep: okeyAtilamaz)', () => {
  const sahte = sOkey(1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [[sahte, t('kirmizi', 1)], temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3]],
  });
  const sonuc = at(durum, 0, sahte.id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.OKEY_ATILAMAZ);
  assert.ok(sonuc.durum.eller[0].some((tas) => tas.id === sahte.id), 'reddedilen hamlede taş elde kalmalı');
});

test('kural kapalıyken (okeyVeSahteOkeyAtmaYasak: false) okey atılabilir', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [[okeyTas, t('kirmizi', 1)], temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3]],
  });
  const sonuc = at(durum, 0, okeyTas.id, { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: false });
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.eller[0].some((tas) => tas.id === okeyTas.id), false);
});

test('elde olmayan taş atılamaz (sebep: tasEldeYok)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: true });
  const sonuc = at(durum, 0, 'olmayan-tas-id');
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.TAS_ELDE_YOK);
});

// --- el sonu: bitme (R-005/R-006 ile entegrasyon) ---

test('el bitince (son taş atılınca) sonuç BITTI olur ve kazanan belirlenir', () => {
  const fazlaTas = t('sari', 9);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), fazlaTas],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, fazlaTas.id);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 0);
});

// ADR-017 (GDD §1 kural 13): el akışında da bitiş yalnız iki biçimde kabul edilir.
test('el biter: son taş atılınca kalan 14 taş tam 7 birebir çift', () => {
  const fazlaTas = t('sari', 9);
  const cift = (renk, sayi) => [t(renk, sayi, 1), t(renk, sayi, 2)];
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [
        // mavi-6 kullanılmaz: GOSTERGE taşının kendisi (kural 9) çift sayılmaz.
        ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 5), ...cift('sari', 11),
        ...cift('kirmizi', 8), ...cift('siyah', 13), ...cift('mavi', 1), fazlaTas,
      ],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, fazlaTas.id);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 0);
});

test('el bitmez: karışık dizilim (per + çift) bitiş sayılmaz, sıra ilerler', () => {
  const fazlaTas = t('sari', 9);
  const cift = (renk, sayi) => [t(renk, sayi, 1), t(renk, sayi, 2)];
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [
        t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
        ...cift('siyah', 6), ...cift('mavi', 9), ...cift('sari', 12), ...cift('kirmizi', 13),
        ...cift('siyah', 2), fazlaTas,
      ],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, fazlaTas.id);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN);
  assert.equal(sonuc.durum.sira, 1);
});

test('el bitmez: eski kuralın "aynı sayı farklı renk" ikilileri artık bitirmiyor', () => {
  const fazlaTas = t('sari', 9);
  const ikili = (sayi) => [t('kirmizi', sayi), t('siyah', sayi)];
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [
        ...ikili(1), ...ikili(2), ...ikili(3), ...ikili(4),
        ...ikili(5), ...ikili(6), ...ikili(8), fazlaTas,
      ],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, fazlaTas.id);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN);
});

test('el bittiyse başka hamle kabul edilmez (sebep: elBitti)', () => {
  const fazlaTas = t('sari', 9);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), fazlaTas],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const bitmisDurum = at(durum, 0, fazlaTas.id).durum;
  const sonrakiAt = at(bitmisDurum, 1, bitmisDurum.eller[1][0].id);
  assert.equal(sonrakiAt.basarili, false);
  assert.equal(sonrakiAt.sebep, REDDEDILME_SEBEBI.EL_BITTI);
  const sonrakiCek = cek(bitmisDurum, 1, KAYNAK.YER);
  assert.equal(sonrakiCek.basarili, false);
  assert.equal(sonrakiCek.sebep, REDDEDILME_SEBEBI.EL_BITTI);
});

// --- (e) yer destesi tükenirse el berabere sonlanıyor (ADR-008/4) ---

test('yer destesi tükenmişken yapılan atışla (kimse bitirmediyse) el BERABERE sonlanır', () => {
  const atilacakTas = t('kirmizi', 1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    yerDestesi: [],
    eller: [
      [atilacakTas, t('siyah', 9)],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, atilacakTas.id);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BERABERE);
  assert.equal(sonuc.durum.kazanan, null);
});

test('kural kapalıyken (desteTukenirseElBerabereSayilir: false) deste tükense de el berabere olmaz, sıra ilerler', () => {
  const atilacakTas = t('kirmizi', 1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    yerDestesi: [],
    eller: [
      [atilacakTas, t('siyah', 9)],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, atilacakTas.id, { ...KURAL_VARSAYILAN, desteTukenirseElBerabereSayilir: false });
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN);
  assert.equal(sonuc.durum.sira, 1);
  assert.equal(sonuc.durum.kazanan, null);
});

test('yer destesinde taş kaldığı sürece el berabere sonlanmaz, sıra ilerler', () => {
  const atilacakTas = t('kirmizi', 1);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    yerDestesi: [t('mavi', 2)],
    eller: [
      [atilacakTas, t('siyah', 9)],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = at(durum, 0, atilacakTas.id);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.SUREN);
  assert.equal(sonuc.durum.sira, 1);
});

// --- (e) bir el en çok tanımlı tur sayısında bitiyor (sonsuz döngü koruması) ---

test('tanımlı varsayılan tur sınırı pozitif ve sonlu bir sayıdır', () => {
  assert.ok(Number.isInteger(VARSAYILAN_MAKSIMUM_TUR) && VARSAYILAN_MAKSIMUM_TUR > 0);
});

test('tur sınırı: hiç bitmeyen/tükenmeyen bir döngü tanımlı tur sayısında TUR_SINIRI ile durur', () => {
  const maksimumTur = 5;
  // Hiçbir oyuncu per/çift kuramıyor (hep tek izole taş), yer destesi 20 taşla bol: döngü ADR-008/4
  // (deste tükenmesi) devreye girmeden tur sınırına çarpmalı — iki koşul bağımsız test ediliyor.
  let durum = temelDurum({
    sira: 0,
    cekildiMi: false,
    yerDestesi: Array.from({ length: 20 }, (_, i) => t('sari', (i % 13) + 1, i < 13 ? 1 : 2)),
    eller: [[t('kirmizi', 1)], [t('siyah', 2)], [t('mavi', 3)], [t('sari', 13)]],
  });

  let turSayisi = 0;
  const guvenlikTavani = maksimumTur + 5; // testin kendi döngüsü de gerçekten sonlu olmalı
  while (durum.sonuc === EL_SONUCU.SUREN && turSayisi < guvenlikTavani) {
    const oyuncu = durum.sira;
    const cekSonuc = cek(durum, oyuncu, KAYNAK.YER);
    assert.equal(cekSonuc.basarili, true);
    durum = cekSonuc.durum;
    const atilacakTas = durum.eller[oyuncu][0];
    const atSonuc = at(durum, oyuncu, atilacakTas.id, KURAL_VARSAYILAN, maksimumTur);
    assert.equal(atSonuc.basarili, true);
    durum = atSonuc.durum;
    turSayisi += 1;
  }

  assert.equal(durum.sonuc, EL_SONUCU.TUR_SINIRI, 'döngü tanımlı tur sayısında TUR_SINIRI ile durmalı');
  assert.equal(durum.turSayaci, maksimumTur);
  assert.equal(turSayisi, maksimumTur, 'test döngüsü de tam tur sınırında durmuş olmalı');

  const sonrakiCek = cek(durum, durum.sira, KAYNAK.YER);
  assert.equal(sonrakiCek.basarili, false);
  assert.equal(sonrakiCek.sebep, REDDEDILME_SEBEBI.EL_BITTI, 'tur sınırına ulaşan el yeni hamle kabul etmemeli');
});

// --- elBaslat: gerçek dagitim.js ile entegrasyon ---

test('elBaslat: başlayan oyuncu (15 taş) zaten çekmiş sayılır, ilk hamlesi doğrudan atma olur', () => {
  const durum = elBaslat(2026);
  assert.equal(durum.sira, 0);
  assert.equal(durum.cekildiMi, true);
  assert.equal(durum.eller[0].length, 15);
  assert.equal(durum.sonuc, EL_SONUCU.SUREN);

  // Diğer oyuncular henüz çekmedi: sıra 0'dayken onlar hamle yapamaz, 0 da çekemez (zatenCekildi).
  assert.equal(cek(durum, 0, KAYNAK.YER).sebep, REDDEDILME_SEBEBI.ZATEN_CEKILDI);
  assert.equal(at(durum, 1, durum.eller[1][0].id).sebep, REDDEDILME_SEBEBI.SIRA_DEGIL);

  const atilabilirTas = durum.eller[0].find((tas) => !tasOkeyMi(tas, durum.okeyTasi));
  const sonuc = at(durum, 0, atilabilirTas.id);
  assert.equal(sonuc.basarili, true);
  if (sonuc.durum.sonuc === EL_SONUCU.SUREN) {
    assert.equal(sonuc.durum.sira, 1);
    assert.equal(sonuc.durum.cekildiMi, false);
  }
});
