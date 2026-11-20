import test from 'node:test';
import assert from 'node:assert/strict';
import { elBaslat, EL_SONUCU } from '../docs/cekirdek/el.js';
import { botTurOyna, KADEME } from '../docs/bot/bot.js';
import { OYUNCU_SAYISI } from '../docs/cekirdek/dagitim.js';

// tasokey#9 — kabul (a): 1 insan yerine geçen bot + 3 bot ile el koşusu, sabit tohumlarla.
// Dört koltuğun dördü de bot oynatıyor (biri "insan yerine geçen" koltuk); hiçbiri
// cekirdek/el.js'in geçerlilik denetimini atlamıyor. Ölçülen: 0 kurala aykırı hamle
// (motorun reddettiği öneri), 0 çökme (fırlatılan hata), 0 sonlanmayan el (TUR_SINIRI'ne
// çarpan, yani doğal bitmeyen el).
//
// tasokey#41 (ADR-013): koşu **üç kademe** için de yapılır — kolay / orta / zor. El sayıları
// ölçülen süreye göre seçildi (bütçe: bu dosya tek başına 60 s'nin altında kalmalı; ölçüldü,
// 200 el orta ≈ 20 s, zor ≈ 38 s, kolay ≈ 15 s): varsayılan kademe (orta, arayüzün oynattığı)
// 200 elde, diğer iki kademe 100 elde koşar. Kademe başına **200 ellik** tam ölçüm (kazanma
// oranları dahil) `testler/bot-zorluk.olcum.js`'tedir ve raporda sayılarla durur.

const SABIT_TOHUM_BASLANGICI = 90000; // iş numarasıyla çakışmaması için ayrı aralık

const KOSULAR = [
  { kademe: KADEME.ORTA, elSayisi: 200 },
  { kademe: KADEME.KOLAY, elSayisi: 100 },
  { kademe: KADEME.ZOR, elSayisi: 100 },
];

function birElOyna(tohum, kademe) {
  let durum = elBaslat(tohum);
  let tur = 0;
  while (durum.sonuc === EL_SONUCU.SUREN) {
    const oyuncu = durum.sira;
    const sonuc = botTurOyna(durum, oyuncu, kademe);
    if (!sonuc.basarili) {
      return { ihlal: { tohum, tur, oyuncu, sebep: sonuc.sebep }, durum: sonuc.durum, tur };
    }
    durum = sonuc.durum;
    tur += 1;
  }
  return { ihlal: null, durum, tur };
}

// Eşlik testi (kit/beceriler/oz-test-yazma SKILL.md "Simülasyon ve bot testleri"): aynı tohum
// aynı hamle dizisini ve aynı sonucu üretmeli — bot koşusu tekrar üretilebilir olmalı. Kolay
// kademenin zayıflatma zarı da buna dahildir: tohum durumdan türetildiği için (ADR-013) karar
// durumun saf işlevi kalır, iki bağımsız koşu birebir aynı sonucu verir.
for (const { kademe } of KOSULAR) {
  test(`bot koşusu deterministiktir (${kademe}): aynı tohumla iki bağımsız koşu aynı sonucu ve tur sayısını verir`, () => {
    const birinci = birElOyna(SABIT_TOHUM_BASLANGICI, kademe);
    const ikinci = birElOyna(SABIT_TOHUM_BASLANGICI, kademe);
    assert.equal(birinci.ihlal, null);
    assert.deepEqual(ikinci, birinci);
  });
}

for (const { kademe, elSayisi } of KOSULAR) {
  test(`bot dayanıklılık koşusu (${kademe}): ${elSayisi} el, 4 bot (1 "insan" koltuğu dahil), sabit tohumlar`, () => {
    const baslangicMs = performance.now();

    const ihlaller = [];
    const sonucSayaclari = { [EL_SONUCU.BITTI]: 0, [EL_SONUCU.BERABERE]: 0, [EL_SONUCU.TUR_SINIRI]: 0 };
    let toplamTur = 0;

    assert.equal(OYUNCU_SAYISI, 4, 'kabul ölçütü 4 koltuk (1 insan yerine geçen + 3 bot) varsayıyor');

    for (let i = 0; i < elSayisi; i++) {
      const tohum = SABIT_TOHUM_BASLANGICI + i;
      const { ihlal, durum, tur } = birElOyna(tohum, kademe); // fırlatılan hata olursa test burada çöker (0 çökme ölçütü)
      toplamTur += tur;
      if (ihlal) {
        ihlaller.push(ihlal);
        continue;
      }
      sonucSayaclari[durum.sonuc] += 1;
    }

    const sureMs = performance.now() - baslangicMs;
    const berabereOrani = sonucSayaclari[EL_SONUCU.BERABERE] / elSayisi;
    const ortalamaTur = toplamTur / elSayisi;

    // eslint-disable-next-line no-console
    console.log(
      `[tasokey#9/#41] kademe=${kademe} el=${elSayisi} sure=${sureMs.toFixed(1)}ms `
      + `ortalamaTur=${ortalamaTur.toFixed(2)} bitti=${sonucSayaclari[EL_SONUCU.BITTI]} `
      + `berabere=${sonucSayaclari[EL_SONUCU.BERABERE]} (oran=${(berabereOrani * 100).toFixed(1)}%) `
      + `turSiniri=${sonucSayaclari[EL_SONUCU.TUR_SINIRI]} ihlal=${ihlaller.length}`,
    );

    assert.deepEqual(ihlaller, [], '0 kurala aykırı hamle: motor hiçbir bot önerisini reddetmemeli');
    assert.equal(sonucSayaclari[EL_SONUCU.TUR_SINIRI], 0, '0 sonlanmayan el: hiçbir el güvenlik tur sınırına çarpmamalı');
    assert.equal(
      sonucSayaclari[EL_SONUCU.BITTI] + sonucSayaclari[EL_SONUCU.BERABERE],
      elSayisi,
      'bütün eller BITTI ya da BERABERE ile doğal sonlanmalı',
    );
  });
}
