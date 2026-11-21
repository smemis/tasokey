// tasokey#7 kabul ölçütü (c): tek el kontrolünün ortalama süresi (tahmin hedefi 20 ms).
// tasokey#37 (ADR-017): örnekler yeni bitiş kuralına göre yenilendi — tamamen perli eller,
// tam 7 birebir çiftli eller ve bitmeyen/karışık eller.
// `npm test` kapsamına girmez (ad `*.test.js` kalıbına uymaz); elle çalıştırılır:
//   node testler/cozucu.olcum.js

import { elBitirilebilirMi } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);
const cift = (renk, sayi) => [t(renk, sayi, 1), t(renk, sayi, 2)];

// `testler/cozucu.test.js` ile aynı örnekler (bitebilen + bitemeyen); gerçekçi karışıklıkta
// 14 taşlık eller de dahil. Her tohumla karıştırılıp ölçülür (önbellek her çağrıda sıfırdan kurulur).
const ELLER = [
  // --- bitebilen ---
  [t('mavi', 2), t('mavi', 3), t('mavi', 4)],
  [t('kirmizi', 5), t('siyah', 5), t('sari', 5)],
  [t('sari', 1), t('sari', 2), t('sari', 3), t('kirmizi', 8), t('siyah', 8), t('sari', 8)],
  [t('kirmizi', 10), sOkey(1), t('kirmizi', 12)],
  [t('mavi', 12), t('sari', 12), sOkey(2)],
  [t('kirmizi', 9), t('mavi', 7), t('kirmizi', 11)],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
    t('kirmizi', 9), t('siyah', 9), t('mavi', 9), t('sari', 9),
  ],
  [sOkey(1), sOkey(2), t('mavi', 7)],
  [
    ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
    ...cift('kirmizi', 8), ...cift('siyah', 13), ...cift('mavi', 1),
  ],
  [
    ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
    ...cift('kirmizi', 8), ...cift('siyah', 13), t('sari', 9), sOkey(1),
  ],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
    t('siyah', 7), t('siyah', 8), t('siyah', 9),
    t('mavi', 10), t('sari', 10), t('kirmizi', 10),
    t('mavi', 2), t('sari', 2), t('siyah', 2),
  ],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
    t('siyah', 7), sOkey(1), t('siyah', 9),
    t('mavi', 11), t('sari', 11), sOkey(2),
    t('mavi', 5), t('sari', 5), t('siyah', 5), t('kirmizi', 5),
  ],
  // --- bitemeyen ---
  [t('kirmizi', 5)],
  [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)],
  cift('kirmizi', 5),
  [t('kirmizi', 5), t('siyah', 5)],
  [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 4)],
  [t('kirmizi', 5), t('siyah', 5), t('sari', 5), t('mavi', 9)],
  [t('kirmizi', 1), sOkey(1), t('kirmizi', 4)],
  [
    t('kirmizi', 1), sOkey(1), t('kirmizi', 3),
    t('siyah', 5), sOkey(2), t('siyah', 7),
    t('mavi', 10), t('mavi', 12),
  ],
  [t('sari', 3), t('mavi', 6), t('kirmizi', 11), t('siyah', 2)],
  [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5), t('sari', 12)],
  [t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('siyah', 5)],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
    ...cift('siyah', 6), ...cift('mavi', 9), ...cift('sari', 12), ...cift('kirmizi', 13),
    ...cift('siyah', 2),
  ],
  [
    t('kirmizi', 7), t('siyah', 7), t('mavi', 7), t('sari', 7),
    ...cift('siyah', 6), ...cift('mavi', 9), ...cift('sari', 12), ...cift('kirmizi', 13),
    ...cift('siyah', 2),
  ],
  [
    ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
    ...cift('kirmizi', 8), ...cift('siyah', 13), t('mavi', 9), t('sari', 9),
  ],
  [
    ...cift('kirmizi', 3), ...cift('siyah', 4), ...cift('mavi', 6), ...cift('sari', 11),
    ...cift('kirmizi', 8), ...cift('siyah', 13),
  ],
];

const TEKRAR = 200; // toplam çağrı = ELLER.length * TEKRAR
let toplamNs = 0n;
let cagriSayisi = 0;
let enYavasMs = 0;

for (let tur = 0; tur < TEKRAR; tur++) {
  for (const el of ELLER) {
    const karisikEl = karistir(el, tur + 1);
    const basla = process.hrtime.bigint();
    elBitirilebilirMi(karisikEl, OKEY_TASI);
    const bitis = process.hrtime.bigint();
    const gecenMs = Number(bitis - basla) / 1e6;
    if (gecenMs > enYavasMs) enYavasMs = gecenMs;
    toplamNs += bitis - basla;
    cagriSayisi++;
  }
}

const ortalamaMs = Number(toplamNs) / cagriSayisi / 1e6;
console.log(
  `tek el kontrolü ortalama süre: ${ortalamaMs.toFixed(4)} ms (en yavaş tek çağrı ${enYavasMs.toFixed(4)} ms, `
  + `${cagriSayisi} çağrı, ${ELLER.length} örnek x ${TEKRAR} tekrar)`,
);
