import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dagit, gostergeAc, okeyTasiBelirle, tasOkeyMi, tasDegeri, tasOzelMi, sorguJokeriOlustur,
  OYUNCU_SAYISI,
} from '../docs/cekirdek/dagitim.js';
import { tasOlustur, sahteOkeyOlustur, setOlustur, TAS_TURU, RENKLER, EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#4 — R-001/R-002: 15/14/14/14 dağıtım, yer destesi, gösterge; taş yitmiyor/çoğalmıyor.
// tasokey#5 — R-002: o elin okey taşı (gösterge → okey eşlemesi).
// tasokey#81 — ADR-027: joker/değer/özel taş sorularının üç ayrı kapısı (`tasOkeyMi`, `tasDegeri`,
// `tasOzelMi`) ve ADR-027 kapatma anahtarı iki yönlü ölçülür.

const TOPLAM_TAS = 106;
const DENENEN_TOHUMLAR = [1, 2, 3, 42, 12345, 67890, 999999];

test('el boyutları 15/14/14/14', () => {
  const { eller } = dagit(7);
  assert.equal(eller.length, OYUNCU_SAYISI);
  assert.equal(eller[0].length, 15);
  assert.equal(eller[1].length, 14);
  assert.equal(eller[2].length, 14);
  assert.equal(eller[3].length, 14);
});

test('değişmez: eller + yer destesi + gösterge = 106, taş yitmiyor/çoğalmıyor (birden çok tohum)', () => {
  for (const tohum of DENENEN_TOHUMLAR) {
    const { eller, yerDestesi, gosterge } = dagit(tohum);
    const elToplami = eller.reduce((n, el) => n + el.length, 0);
    assert.equal(elToplami + yerDestesi.length + 1, TOPLAM_TAS, `tohum ${tohum}: toplam sayı kayboldu/çoğaldı`);

    const butunIdler = [...eller.flat().map((t) => t.id), ...yerDestesi.map((t) => t.id), gosterge.id];
    assert.equal(butunIdler.length, TOPLAM_TAS, `tohum ${tohum}: toplam taş sayısı 106 değil`);
    assert.equal(new Set(butunIdler).size, TOPLAM_TAS, `tohum ${tohum}: yinelenen taş var`);
  }
});

test('aynı tohumla dağıtım birebir yeniden üretilebilir', () => {
  const birinci = dagit(2026);
  const ikinci = dagit(2026);
  assert.deepEqual(birinci.eller, ikinci.eller);
  assert.deepEqual(birinci.yerDestesi, ikinci.yerDestesi);
  assert.deepEqual(birinci.gosterge, ikinci.gosterge);
});

test('farklı tohum farklı dağıtım verir', () => {
  const birinci = dagit(1);
  const ikinci = dagit(2);
  assert.notDeepEqual(birinci.eller, ikinci.eller);
});

test('gösterge sahte okey çıkarsa taş desteye karışır ve yeniden açılır', () => {
  const destesi = [
    sahteOkeyOlustur(1),
    tasOlustur('kirmizi', 5, 1),
    tasOlustur('mavi', 9, 2),
  ];
  const { gosterge, kalanDeste } = gostergeAc(destesi);
  assert.equal(gosterge.tur, TAS_TURU.SAYI);
  assert.notEqual(gosterge.tur, TAS_TURU.SAHTE_OKEY);
  assert.equal(kalanDeste.length, destesi.length - 1);
  const kalanIdler = [gosterge.id, ...kalanDeste.map((t) => t.id)].sort();
  const beklenenIdler = destesi.map((t) => t.id).sort();
  assert.deepEqual(kalanIdler, beklenenIdler, 'sahte okey desteden kaybolmamalı');
});

test('kural kapalıyken gösterge sahte okey de olabilir', () => {
  const destesi = [sahteOkeyOlustur(1), tasOlustur('kirmizi', 5, 1)];
  const { gosterge } = gostergeAc(destesi, { gostergeSahteOkeyIseYenidenAcilir: false });
  assert.equal(gosterge.tur, TAS_TURU.SAHTE_OKEY);
});

// tasokey#5 kabul (a): 4 renk x 13 sayının tamamı için gösterge → okey eşlemesi, 13'ten 1'e dönüş dahil.
test('okeyTasiBelirle: her renk ve sayı için gösterge bir üst sayıyı okey yapar (13 → 1 dönüşü dahil)', () => {
  for (const renk of RENKLER) {
    for (let sayi = EN_DUSUK_SAYI; sayi <= EN_YUKSEK_SAYI; sayi++) {
      const gosterge = tasOlustur(renk, sayi, 1);
      const beklenenSayi = sayi === EN_YUKSEK_SAYI ? EN_DUSUK_SAYI : sayi + 1;
      const okeyTasi = okeyTasiBelirle(gosterge);
      assert.deepEqual(okeyTasi, { renk, sayi: beklenenSayi }, `gösterge ${renk}-${sayi} için okey yanlış`);
    }
  }
});

// tasokey#81 / ADR-027 (Sahip kararı 2026-11-24): joker YALNIZ gösterge+1 aynı renk taşlardır.
// Sahte okey joker DEĞİLDİR; göstergenin eldeki kopyası da sıradan taştır.
test('tasOkeyMi: joker yalnız gerçek okey taşıdır; sahte okey ve gösterge kopyası joker değildir', () => {
  const gosterge = tasOlustur('mavi', 6, 1); // gösterge mavi-6 → okey mavi-7
  const okeyTasi = okeyTasiBelirle(gosterge);
  assert.equal(tasOkeyMi(sahteOkeyOlustur(1), okeyTasi), false, 'sahte okey joker değildir (ADR-027)');
  assert.equal(tasOkeyMi(sahteOkeyOlustur(2), okeyTasi), false, 'sahte okey joker değildir (ADR-027)');
  assert.equal(tasOkeyMi(tasOlustur('mavi', 7, 1), okeyTasi), true, 'göstergenin belirlediği taş okey olmalı');
  assert.equal(tasOkeyMi(tasOlustur('mavi', 7, 2), okeyTasi), true, 'okey taşının ikinci nüshası da jokerdir');
  assert.equal(tasOkeyMi(tasOlustur('mavi', 6, 2), okeyTasi), false, 'göstergenin eldeki kopyası sıradan taştır');
  assert.equal(tasOkeyMi(tasOlustur('mavi', 8, 1), okeyTasi), false, 'okey taşının rengi/sayısı eşleşmeyen taş okey değildir');
  assert.equal(tasOkeyMi(tasOlustur('kirmizi', 7, 1), okeyTasi), false, 'okey taşıyla aynı sayı ama farklı renk okey değildir');
});

// ADR-027 kapatma anahtarı: açıkken K1'in (2026-11-19) eski davranışı tek satırla döner.
test('tasOkeyMi: sahteOkeyJokerGibiDavranir açıkken sahte okey yine joker olur', () => {
  const okeyTasi = { renk: 'mavi', sayi: 7 };
  const eskiKural = { ...KURAL_VARSAYILAN, sahteOkeyJokerGibiDavranir: true };
  assert.equal(tasOkeyMi(sahteOkeyOlustur(1), okeyTasi, eskiKural), true);
  assert.equal(tasOkeyMi(tasOlustur('mavi', 7, 1), okeyTasi, eskiKural), true, 'gerçek okey iki yönde de jokerdir');
  assert.equal(tasOkeyMi(tasOlustur('mavi', 6, 1), okeyTasi, eskiKural), false, 'anahtar gösterge kopyasını joker yapmaz');
});

// ADR-027: "bu taşın değeri ne?" sorusunun tek kapısı. Sahte okey o elin okey renk+sayısını alır.
test('tasDegeri: sayı taşı kendi değerini, sahte okey o elin okey değerini taşır', () => {
  const okeyTasi = { renk: 'mavi', sayi: 7 };
  const sayiTasi = tasOlustur('kirmizi', 3, 1);
  assert.equal(tasDegeri(sayiTasi, okeyTasi).renk, 'kirmizi');
  assert.equal(tasDegeri(sayiTasi, okeyTasi).sayi, 3);
  assert.equal(tasDegeri(sahteOkeyOlustur(1), okeyTasi).renk, 'mavi');
  assert.equal(tasDegeri(sahteOkeyOlustur(1), okeyTasi).sayi, 7);
  assert.equal(
    tasDegeri(sahteOkeyOlustur(1), okeyTasi).sayi,
    tasDegeri(sahteOkeyOlustur(2), okeyTasi).sayi,
    'iki sahte okey aynı değerdedir',
  );
});

// ADR-008 sürüm 2 + ADR-027: atma yasağının sorduğu soru "joker mi" değil "özel taş mı" —
// `okeyVeSahteOkeyAtmaYasak` anlamı korunur (açıkken okey VE sahte okey atılamaz).
test('tasOzelMi: okey ve sahte okey özeldir, gösterge kopyası ve sıradan taş değildir', () => {
  const okeyTasi = { renk: 'mavi', sayi: 7 };
  assert.equal(tasOzelMi(sahteOkeyOlustur(1), okeyTasi), true, 'sahte okey joker olmasa da özeldir');
  assert.equal(tasOzelMi(tasOlustur('mavi', 7, 1), okeyTasi), true);
  assert.equal(tasOzelMi(tasOlustur('mavi', 6, 1), okeyTasi), false, 'gösterge kopyası özel değildir');
  assert.equal(tasOzelMi(tasOlustur('kirmizi', 7, 1), okeyTasi), false);
});

// Botun "a ile b aynı perde buluşabilir mi?" sorusunu sormak için kullandığı taş gerçek bir
// jokerdir (o elin okeyinin 0. nüshası — hiçbir elde bulunmaz).
test('sorguJokeriOlustur: o elin okey değerinde, elde bulunmayan 0. nüsha joker üretir', () => {
  const okeyTasi = { renk: 'sari', sayi: 13 };
  const soru = sorguJokeriOlustur(okeyTasi);
  assert.equal(tasOkeyMi(soru, okeyTasi), true, 'soru taşı gerçek joker olmalı');
  assert.equal(soru.nusha, 0, 'gerçek set yalnız 1. ve 2. nüshayı üretir');
  assert.equal(setOlustur().some((tas) => tas.id === soru.id), false, 'soru taşı destede bulunmamalı');
});

test('dagit: dönen okeyTasi, dönen göstergeden okeyTasiBelirle ile hesaplananla aynıdır', () => {
  const { gosterge, okeyTasi } = dagit(2026);
  assert.deepEqual(okeyTasi, okeyTasiBelirle(gosterge));
});

// tasokey#5 kabul (c): gösterge sahte okey çıkarsa taş desteye karışır, gösterge yeniden açılır, taş toplamı 106'da kalır.
test('gösterge art arda sahte okey çıkarsa her ikisi de desteye karışır, taş toplamı değişmez, okey gerçek taştan belirlenir', () => {
  const destesi = [
    sahteOkeyOlustur(1),
    sahteOkeyOlustur(2),
    tasOlustur('sari', 13, 1),
    tasOlustur('kirmizi', 5, 1),
  ];
  const { gosterge, kalanDeste } = gostergeAc(destesi);
  assert.equal(gosterge.tur, TAS_TURU.SAYI);
  assert.deepEqual(gosterge, tasOlustur('sari', 13, 1));
  assert.equal(kalanDeste.length, destesi.length - 1, 'taş toplamı (gösterge + kalan deste) değişmemeli');
  const kalanIdler = [gosterge.id, ...kalanDeste.map((t) => t.id)].sort();
  const beklenenIdler = destesi.map((t) => t.id).sort();
  assert.deepEqual(kalanIdler, beklenenIdler, 'iki sahte okey de desteye geri karışmalı, taş yitmemeli');
  assert.deepEqual(okeyTasiBelirle(gosterge), { renk: 'sari', sayi: EN_DUSUK_SAYI }, '13 → 1 dönüşü gösterge yeniden açılsa da doğru olmalı');
});
