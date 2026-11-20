import test from 'node:test';
import assert from 'node:assert/strict';
import { elBaslat, EL_SONUCU } from '../docs/cekirdek/el.js';
import { kolayBotTurOyna } from '../docs/bot/kolay.js';
import { OYUNCU_SAYISI } from '../docs/cekirdek/dagitim.js';

// tasokey#9 — kabul (a): 1 insan yerine geçen bot + 3 bot ile 200 el, sabit tohumlarla.
// Dört koltuğun dördü de kolay bot oynatıyor (biri "insan yerine geçen" koltuk); hiçbiri
// cekirdek/el.js'in geçerlilik denetimini atlamıyor. Ölçülen: 0 kurala aykırı hamle
// (motorun reddettiği öneri), 0 çökme (fırlatılan hata), 0 sonlanmayan el (TUR_SINIRI'ne
// çarpan, yani doğal bitmeyen el). Süre hedefi 60 s — tahmindi; gerçek ölçüm rapora yazılır.

const EL_SAYISI = 200;
const SABIT_TOHUM_BASLANGICI = 90000; // iş numarasıyla çakışmaması için ayrı aralık

function birElOyna(tohum) {
  let durum = elBaslat(tohum);
  let tur = 0;
  while (durum.sonuc === EL_SONUCU.SUREN) {
    const oyuncu = durum.sira;
    const sonuc = kolayBotTurOyna(durum, oyuncu);
    if (!sonuc.basarili) {
      return { ihlal: { tohum, tur, oyuncu, sebep: sonuc.sebep }, durum: sonuc.durum, tur };
    }
    durum = sonuc.durum;
    tur += 1;
  }
  return { ihlal: null, durum, tur };
}

// Eşlik testi (kit/beceriler/oz-test-yazma SKILL.md "Simülasyon ve bot testleri"): aynı tohum
// aynı hamle dizisini ve aynı sonucu üretmeli — bot koşusu tekrar üretilebilir olmalı.
test('bot koşusu deterministiktir: aynı tohumla iki bağımsız koşu aynı sonucu ve tur sayısını verir', () => {
  const birinci = birElOyna(SABIT_TOHUM_BASLANGICI);
  const ikinci = birElOyna(SABIT_TOHUM_BASLANGICI);
  assert.equal(birinci.ihlal, null);
  assert.deepEqual(ikinci, birinci);
});

test(`bot dayanıklılık koşusu: ${EL_SAYISI} el, 4 kolay bot (1 "insan" koltuğu dahil), sabit tohumlar`, () => {
  const baslangicMs = performance.now();

  const ihlaller = [];
  const sonucSayaclari = { [EL_SONUCU.BITTI]: 0, [EL_SONUCU.BERABERE]: 0, [EL_SONUCU.TUR_SINIRI]: 0 };
  let toplamTur = 0;

  assert.equal(OYUNCU_SAYISI, 4, 'kabul ölçütü 4 koltuk (1 insan yerine geçen + 3 bot) varsayıyor');

  for (let i = 0; i < EL_SAYISI; i++) {
    const tohum = SABIT_TOHUM_BASLANGICI + i;
    const { ihlal, durum, tur } = birElOyna(tohum); // fırlatılan hata olursa test burada çöker (0 çökme ölçütü)
    toplamTur += tur;
    if (ihlal) {
      ihlaller.push(ihlal);
      continue;
    }
    sonucSayaclari[durum.sonuc] += 1;
  }

  const sureMs = performance.now() - baslangicMs;
  const berabereOrani = sonucSayaclari[EL_SONUCU.BERABERE] / EL_SAYISI;
  const ortalamaTur = toplamTur / EL_SAYISI;

  // eslint-disable-next-line no-console
  console.log(
    `[tasokey#9] el=${EL_SAYISI} sure=${sureMs.toFixed(1)}ms ortalamaTur=${ortalamaTur.toFixed(2)} `
    + `bitti=${sonucSayaclari[EL_SONUCU.BITTI]} berabere=${sonucSayaclari[EL_SONUCU.BERABERE]} `
    + `(oran=${(berabereOrani * 100).toFixed(1)}%) turSiniri=${sonucSayaclari[EL_SONUCU.TUR_SINIRI]} `
    + `ihlal=${ihlaller.length}`,
  );

  assert.deepEqual(ihlaller, [], '0 kurala aykırı hamle: motor hiçbir bot önerisini reddetmemeli');
  assert.equal(sonucSayaclari[EL_SONUCU.TUR_SINIRI], 0, '0 sonlanmayan el: hiçbir el güvenlik tur sınırına çarpmamalı');
  assert.equal(
    sonucSayaclari[EL_SONUCU.BITTI] + sonucSayaclari[EL_SONUCU.BERABERE],
    EL_SAYISI,
    'bütün eller BITTI ya da BERABERE ile doğal sonlanmalı',
  );
});
