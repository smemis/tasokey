import test from 'node:test';
import assert from 'node:assert/strict';
import {
  elBaslat, cek, at, bitir, cekmeyiGeriAl, geriBirakilabilirTasId,
  KAYNAK, REDDEDILME_SEBEBI, EL_SONUCU, VARSAYILAN_MAKSIMUM_TUR,
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
    // tasokey#87: bu turda çekilen taş (`{ tasId, kaynak }`) — geri bırakmanın tek dayanağı.
    sonCekilen: null,
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

// --- (d) okey/sahte okey atma İKİ YÖNLÜ: varsayılanda serbest, ayar açıkken reddedilir ---
// tasokey#50 (ADR-008 sürüm 2, Sahip kararı): varsayılan artık atmaya izin verir — hamle
// engellenmez, ceza yoktur. Ayar `okeyVeSahteOkeyAtmaYasak: true` yapıldığında motorun eski ret
// yolu (REDDEDILME_SEBEBI.OKEY_ATILAMAZ) olduğu gibi çalışır; her iki test iki yönü de ölçer ki
// davranış sabit kodlanmasın.

const KURAL_YASAK = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: true };

function jokerliDurum(joker) {
  return temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [[joker, t('kirmizi', 1)], temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3]],
  });
}

test('gerçek okey taşı varsayılan kuralda atılabilir; yasak ayarı açıkken reddedilir (okeyAtilamaz)', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const durum = jokerliDurum(okeyTas);

  const serbest = at(durum, 0, okeyTas.id);
  assert.equal(serbest.basarili, true, 'varsayılan kuralda okey atılamadı');
  assert.equal(serbest.durum.eller[0].some((tas) => tas.id === okeyTas.id), false, 'atılan okey elde kalmış');
  assert.equal(serbest.durum.atilanYiginlar[0].at(-1).id, okeyTas.id, 'okey atan oyuncunun yığınına konmadı');

  const yasakli = at(durum, 0, okeyTas.id, KURAL_YASAK);
  assert.equal(yasakli.basarili, false, 'yasak ayarı açıkken okey atılabildi');
  assert.equal(yasakli.sebep, REDDEDILME_SEBEBI.OKEY_ATILAMAZ);
});

test('sahte okey varsayılan kuralda atılabilir; yasak ayarı açıkken reddedilir (okeyAtilamaz)', () => {
  const sahte = sOkey(1);
  const durum = jokerliDurum(sahte);

  const serbest = at(durum, 0, sahte.id);
  assert.equal(serbest.basarili, true, 'varsayılan kuralda sahte okey atılamadı');
  assert.equal(serbest.durum.eller[0].some((tas) => tas.id === sahte.id), false, 'atılan sahte okey elde kalmış');

  const yasakli = at(durum, 0, sahte.id, KURAL_YASAK);
  assert.equal(yasakli.basarili, false, 'yasak ayarı açıkken sahte okey atılabildi');
  assert.equal(yasakli.sebep, REDDEDILME_SEBEBI.OKEY_ATILAMAZ);
  assert.ok(yasakli.durum.eller[0].some((tas) => tas.id === sahte.id), 'reddedilen hamlede taş elde kalmalı');
});

test('elde olmayan taş atılamaz (sebep: tasEldeYok)', () => {
  const durum = temelDurum({ sira: 0, cekildiMi: true });
  const sonuc = at(durum, 0, 'olmayan-tas-id');
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.TAS_ELDE_YOK);
});

// --- el sonu: bitme (R-005/R-006 ile entegrasyon) ---
// tasokey#89 (GDD §1 kural 15): el yalnız AÇIK bitirme hamlesiyle (`bitir`) biter; `at` eli hiçbir
// koşulda kendiliğinden bitirmez. Bu yüzden aşağıdaki bitiş denetimleri `bitir` kapısından geçer;
// "bitirilebilir elle köşeye atmak" yolunun kendi öz-testi `bitirme-acik-hamle.test.js`tedir.

test('el bitirme hamlesiyle bitince sonuç BITTI olur ve kazanan belirlenir', () => {
  const fazlaTas = t('sari', 9);
  const durum = temelDurum({
    sira: 0,
    cekildiMi: true,
    eller: [
      [t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), fazlaTas],
      temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
    ],
  });
  const sonuc = bitir(durum, 0, fazlaTas.id);
  assert.equal(sonuc.basarili, true);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 0);
});

// ADR-017 (GDD §1 kural 13): el akışında da bitiş yalnız iki biçimde kabul edilir.
test('el biter: bitirme hamlesinden sonra kalan 14 taş tam 7 birebir çift', () => {
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
  const sonuc = bitir(durum, 0, fazlaTas.id);
  assert.equal(sonuc.durum.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.durum.kazanan, 0);
});

test('el bitmez: karışık dizilim (per + çift) bitirme hamlesini reddeder (bitirilemez)', () => {
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
  const sonuc = bitir(durum, 0, fazlaTas.id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.BITIRILEMEZ);
  assert.deepEqual(sonuc.durum, durum, 'reddedilen bitirme durumu değiştirmemeli');
  // Aynı taş sıradan atma olarak atılabilir: el sürer, sıra ilerler.
  const atma = at(durum, 0, fazlaTas.id);
  assert.equal(atma.durum.sonuc, EL_SONUCU.SUREN);
  assert.equal(atma.durum.sira, 1);
});

test('el bitmez: eski kuralın "aynı sayı farklı renk" ikilileri bitirme hamlesinde de reddedilir', () => {
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
  const sonuc = bitir(durum, 0, fazlaTas.id);
  assert.equal(sonuc.basarili, false);
  assert.equal(sonuc.sebep, REDDEDILME_SEBEBI.BITIRILEMEZ);
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
  const bitmisDurum = bitir(durum, 0, fazlaTas.id).durum;
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

// --- (f) tasokey#87: köşeden çekilen taşı geri bırakma (GDD §1 kural 14, Sahip kararı) ---

// Oyuncu 0'ın çekebildiği yığın önceki oyuncunun (3) yığınıdır — yön `oncekiOyuncu`dan gelir,
// burada yeniden hesaplanmaz (ADR-010).
const CEKILEBILIR_YIGIN = oncekiOyuncu(0);

function cekmeyeHazirDurum(ekler = {}) {
  const atilanYiginlar = [[], [], [], []];
  atilanYiginlar[CEKILEBILIR_YIGIN] = [t('sari', 8), t('sari', 13)];
  return temelDurum({ sira: 0, cekildiMi: false, atilanYiginlar, ...ekler });
}

/** Köşeden çekmiş, henüz atmamış oyuncu 0 durumu + çekme öncesi durum. */
function koseyiCekmisDurum(ekler = {}) {
  const once = cekmeyeHazirDurum(ekler);
  const cekme = cek(once, 0, KAYNAK.ATILAN);
  assert.equal(cekme.basarili, true, 'ön koşul: köşeden çekme başarılı olmalı');
  return { once, sonra: cekme.durum };
}

test('ASIL KABUL (f): geri bırakılan durum, çekme ÖNCESİ durumla BİREBİR aynıdır', () => {
  const { once, sonra } = koseyiCekmisDurum();
  // Ön koşul: çekme gerçekten bir şey değiştirdi (yoksa "birebir aynı" savı boş olurdu).
  assert.equal(sonra.eller[0].length, once.eller[0].length + 1);
  assert.equal(sonra.atilanYiginlar[CEKILEBILIR_YIGIN].length, once.atilanYiginlar[CEKILEBILIR_YIGIN].length - 1);
  assert.equal(sonra.cekildiMi, true);

  const geri = cekmeyiGeriAl(sonra, 0);
  assert.equal(geri.basarili, true, `geri bırakma reddedildi: ${geri.sebep}`);
  // Derin karşılaştırma: eller, atilanYiginlar, cekildiMi, turSayaci, sira ve sonCekilen dahil
  // bütün alanlar çekme öncesine döner. Geri bırakma bir hamle DEĞİLDİR.
  assert.deepEqual(geri.durum, once, 'geri alınan durum çekme öncesiyle birebir aynı olmalı');
  assert.equal(geri.durum.turSayaci, once.turSayaci, 'geri bırakma tur sayacını artırmamalı');
  assert.equal(geri.durum.sira, once.sira, 'geri bırakma sırayı geçirmemeli');
  assert.equal(geri.durum.cekildiMi, false, 'geri bırakmadan sonra oyuncu yeniden çekebilmeli');
});

test('ASIL KABUL (f): geri bıraktıktan sonra oyuncu bu kez DESTEDEN çekebilir', () => {
  const { sonra } = koseyiCekmisDurum();
  const geri = cekmeyiGeriAl(sonra, 0);
  const yenidenCekme = cek(geri.durum, 0, KAYNAK.YER);
  assert.equal(yenidenCekme.basarili, true, `desteden çekme reddedildi: ${yenidenCekme.sebep}`);
  assert.equal(yenidenCekme.durum.sonCekilen.kaynak, KAYNAK.YER);
  // ...ve desteden çekilen taş artık geri bırakılamaz (aşağıdaki ret tablosunun ölçtüğü kural).
  assert.equal(geriBirakilabilirTasId(yenidenCekme.durum, 0), null);
});

test('ASIL KABUL (f): geri bırakılan taş yığının ÜSTÜNE döner (sıra bozulmaz)', () => {
  const { once, sonra } = koseyiCekmisDurum();
  const ustTas = once.atilanYiginlar[CEKILEBILIR_YIGIN].at(-1);
  const geri = cekmeyiGeriAl(sonra, 0);
  assert.deepEqual(
    geri.durum.atilanYiginlar[CEKILEBILIR_YIGIN].at(-1), ustTas,
    'geri bırakılan taş yığının üstünde olmalı',
  );
  assert.ok(!geri.durum.eller[0].some((tas) => tas.id === ustTas.id), 'taş hâlâ elde duruyor');
});

// Reddedilen yollar: her satır "geri bırakma neden olmaz"ı ölçer. Tablo, kabul ölçütündeki
// altı yolu da kapsar (hiç çekilmedi, desteden çekildi, zaten attı, sıra değil, el bitti,
// anahtar kapalı).
const KURAL_ANAHTAR_KAPALI = { ...KURAL_VARSAYILAN, cekilenTasGeriBirakilabilir: false };

function attiktanSonrakiDurum() {
  const { sonra } = koseyiCekmisDurum();
  const atilacak = sonra.eller[0].find((tas) => !tasOkeyMi(tas, sonra.okeyTasi));
  const atma = at(sonra, 0, atilacak.id);
  assert.equal(atma.basarili, true, 'ön koşul: atma başarılı olmalı');
  return atma.durum;
}

const GERI_BIRAKMA_RET_TABLOSU = [
  {
    ad: 'bu turda hiç çekilmedi',
    durum: () => cekmeyeHazirDurum(),
    oyuncu: 0,
    sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ,
  },
  {
    ad: 'taş DESTEDEN çekildi (yer destesinin sırası bozulmasın)',
    durum: () => cek(cekmeyeHazirDurum(), 0, KAYNAK.YER).durum,
    oyuncu: 0,
    sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ,
  },
  {
    ad: 'oyuncu zaten attı (sıra artık onda değil)',
    durum: attiktanSonrakiDurum,
    oyuncu: 0,
    sebep: REDDEDILME_SEBEBI.SIRA_DEGIL,
  },
  {
    ad: 'oyuncu zaten attı (sıra yapay olarak onda bırakılsa bile)',
    durum: () => ({ ...attiktanSonrakiDurum(), sira: 0 }),
    oyuncu: 0,
    sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ,
  },
  {
    ad: 'sıra o oyuncuda değil',
    durum: () => koseyiCekmisDurum().sonra,
    oyuncu: 1,
    sebep: REDDEDILME_SEBEBI.SIRA_DEGIL,
  },
  {
    ad: 'el bitti',
    durum: () => ({ ...koseyiCekmisDurum().sonra, sonuc: EL_SONUCU.BITTI, kazanan: 2 }),
    oyuncu: 0,
    sebep: REDDEDILME_SEBEBI.EL_BITTI,
  },
  {
    ad: 'kapatma anahtarı kapalı (cekilenTasGeriBirakilabilir: false)',
    durum: () => koseyiCekmisDurum().sonra,
    oyuncu: 0,
    kural: KURAL_ANAHTAR_KAPALI,
    sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ,
  },
];

for (const satir of GERI_BIRAKMA_RET_TABLOSU) {
  test(`(f) ret: ${satir.ad} → ${satir.sebep}`, () => {
    const durum = satir.durum();
    const sonuc = cekmeyiGeriAl(durum, satir.oyuncu, satir.kural ?? KURAL_VARSAYILAN);
    assert.equal(sonuc.basarili, false);
    assert.equal(sonuc.sebep, satir.sebep);
    assert.deepEqual(sonuc.durum, durum, 'reddedilen geri bırakma durumu değiştirmemeli');
    // Arayüzün sorduğu saf soru da aynı cevabı verir (tek kaynak: ikisi aynı kapıdan geçer).
    assert.equal(geriBirakilabilirTasId(durum, satir.oyuncu, satir.kural ?? KURAL_VARSAYILAN), null);
  });
}

test('(f) geriBirakilabilirTasId, geri bırakılabilen durumda ÇEKİLEN taşın kimliğini verir', () => {
  const { once, sonra } = koseyiCekmisDurum();
  const cekilenTas = once.atilanYiginlar[CEKILEBILIR_YIGIN].at(-1);
  assert.equal(geriBirakilabilirTasId(sonra, 0), cekilenTas.id);
  assert.equal(geriBirakilabilirTasId(sonra, 0, KURAL_ANAHTAR_KAPALI), null);
});

test('(f) elBaslat: başlayan oyuncunun 15 taşı çekme SAYILMAZ (sonCekilen null, geri bırakılamaz)', () => {
  const durum = elBaslat(4242);
  assert.equal(durum.sonCekilen, null);
  assert.equal(geriBirakilabilirTasId(durum, 0), null);
  assert.equal(cekmeyiGeriAl(durum, 0).sebep, REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ);
});
