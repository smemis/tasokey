// tasokey#41 kabul ölçütü: bot zorluk kademelerinin (kolay / orta / zor, ADR-013) ölçümü.
// `npm test` kapsamına girmez (ad `*.test.js` kalıbına uymaz); elle çalıştırılır:
//   node testler/bot-zorluk.olcum.js            → kademe başına 200 el
//   node testler/bot-zorluk.olcum.js 50         → kademe başına 50 el (hızlı deneme)
//
// İki koşu yapılır, ikisi de tohumlu (aynı tohum = aynı el dizisi, ADR-003):
//  (A) KARMA: koltuk 0 ölçülen kademede, koltuk 1-3 **orta** kademede. Kademenin gücü burada
//      okunur — dört koltuk aynı kademede olsa simetri gereği kazanma oranı zaten ~%25 çıkardı.
//      Bütün kademeler aynı tohumlarla, yani aynı dağıtımlarla oynar: fark kademeden gelir.
//  (B) HOMOJEN: dört koltuk da aynı kademede — kademenin kendi hızı (ortalama tur, berabere oranı).
// Ölçülen: hangi koltuk kaç el bitirdi, koltuk 0'ın kazanma oranı, berabere, tur sınırına çarpan
// el (olmamalı), ortalama tur, süre ve motorun reddettiği öneri sayısı (olmamalı).

import { elBaslat, EL_SONUCU } from '../docs/cekirdek/el.js';
import { botTurOyna, KADEME } from '../docs/bot/bot.js';
import { OYUNCU_SAYISI } from '../docs/cekirdek/dagitim.js';

const EL_SAYISI = Number(process.argv[2]) || 200;
const TOHUM_BASLANGICI = 91000; // dayanıklılık koşusunun aralığından (90000+) ayrı
const KADEMELER = [KADEME.KOLAY, KADEME.ORTA, KADEME.ZOR];

/** Bir eli sonuna kadar oynar; `kademeler[koltuk]` o koltuğun kademesidir. */
function birElOyna(tohum, kademeler) {
  let durum = elBaslat(tohum);
  let tur = 0;
  while (durum.sonuc === EL_SONUCU.SUREN) {
    const oyuncu = durum.sira;
    const sonuc = botTurOyna(durum, oyuncu, kademeler[oyuncu]);
    if (!sonuc.basarili) return { ihlal: { tohum, tur, oyuncu, sebep: sonuc.sebep }, durum, tur };
    durum = sonuc.durum;
    tur += 1;
  }
  return { ihlal: null, durum, tur };
}

function kosu(kademeler) {
  const basla = performance.now();
  const kazanmalar = new Array(OYUNCU_SAYISI).fill(0);
  const sayaclar = { berabere: 0, turSiniri: 0, ihlal: 0 };
  let toplamTur = 0;

  for (let i = 0; i < EL_SAYISI; i++) {
    const { ihlal, durum, tur } = birElOyna(TOHUM_BASLANGICI + i, kademeler);
    toplamTur += tur;
    if (ihlal) {
      sayaclar.ihlal += 1;
      // eslint-disable-next-line no-console
      console.error(`  ihlal: tohum=${ihlal.tohum} tur=${ihlal.tur} oyuncu=${ihlal.oyuncu} sebep=${ihlal.sebep}`);
      continue;
    }
    if (durum.sonuc === EL_SONUCU.BITTI) kazanmalar[durum.kazanan] += 1;
    if (durum.sonuc === EL_SONUCU.BERABERE) sayaclar.berabere += 1;
    if (durum.sonuc === EL_SONUCU.TUR_SINIRI) sayaclar.turSiniri += 1;
  }

  return {
    kazanmalar,
    ...sayaclar,
    ortalamaTur: toplamTur / EL_SAYISI,
    sureMs: performance.now() - basla,
  };
}

function yazdir(etiket, o) {
  const oran = (sayi) => `${((sayi / EL_SAYISI) * 100).toFixed(1)}%`;
  // eslint-disable-next-line no-console
  console.log(
    `${etiket.padEnd(26)} bitiren: ${o.kazanmalar.map((s, i) => `k${i}=${s}`).join(' ')}`
    + ` | koltuk0 kazanma: ${oran(o.kazanmalar[0])}`
    + ` | berabere: ${o.berabere} (${oran(o.berabere)})`
    + ` | turSiniri: ${o.turSiniri} | ihlal: ${o.ihlal}`
    + ` | ortalamaTur: ${o.ortalamaTur.toFixed(2)} | sure: ${(o.sureMs / 1000).toFixed(1)} s`,
  );
}

// eslint-disable-next-line no-console
console.log(
  `[tasokey#41] bot zorluk ölçümü — kademe başına ${EL_SAYISI} el, 4 bot, tohum ${TOHUM_BASLANGICI}…`
  + `${TOHUM_BASLANGICI + EL_SAYISI - 1}\n`
  + 'A) KARMA koşu: koltuk 0 = ölçülen kademe, koltuk 1-3 = orta\n',
);
for (const kademe of KADEMELER) {
  const kademeler = [kademe, KADEME.ORTA, KADEME.ORTA, KADEME.ORTA];
  yazdir(`koltuk0=${kademe}`, kosu(kademeler));
}

// eslint-disable-next-line no-console
console.log('\nB) HOMOJEN koşu: dört koltuk da aynı kademe\n');
for (const kademe of KADEMELER) {
  yazdir(`hepsi=${kademe}`, kosu(new Array(OYUNCU_SAYISI).fill(kademe)));
}
