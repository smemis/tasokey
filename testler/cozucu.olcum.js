// tasokey#7 kabul ölçütü (c): tek el kontrolünün ortalama süresi (tahmin hedefi 20 ms).
// `npm test` kapsamına girmez (ad `*.test.js` kalıbına uymaz); elle çalıştırılır:
//   node testler/cozucu.olcum.js

import { elBitirilebilirMi } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// `testler/cozucu.test.js` ile aynı 20 örnek (10 bitebilen + 10 bitemeyen); gerçekçi karışıklıkta
// 14 taşlık eller de dahil. Her tohumla karıştırılıp ölçülür (önbellek her çağrıda sıfırdan kurulur).
const ELLER = [
  [t('kirmizi', 5), t('siyah', 5)],
  [t('mavi', 2), t('mavi', 3), t('mavi', 4)],
  [t('sari', 1), t('sari', 2), t('sari', 3), t('kirmizi', 8), t('mavi', 8)],
  [t('kirmizi', 10), sOkey(1), t('kirmizi', 12)],
  [t('siyah', 6), sOkey(2)],
  [t('kirmizi', 9), t('mavi', 7), t('kirmizi', 11)],
  [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('siyah', 9), t('mavi', 9), t('sari', 5), t('kirmizi', 5)],
  [sOkey(1), sOkey(2)],
  [t('kirmizi', 3), t('siyah', 3), t('kirmizi', 4), t('siyah', 4), t('kirmizi', 6), t('siyah', 6), t('kirmizi', 11), t('siyah', 11)],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
    t('siyah', 7), t('siyah', 8), t('siyah', 9),
    t('mavi', 10), t('sari', 10), t('mavi', 2), t('sari', 2), t('mavi', 5), t('sari', 5),
  ],
  [t('kirmizi', 5)],
  [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)],
  [t('kirmizi', 5, 1), t('kirmizi', 5, 2)],
  [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 4)],
  [t('kirmizi', 5), t('siyah', 5), t('mavi', 9)],
  [t('kirmizi', 1), sOkey(1), t('kirmizi', 4)],
  [
    t('kirmizi', 1), sOkey(1), t('kirmizi', 3),
    t('siyah', 5), sOkey(2), t('siyah', 7),
    t('mavi', 10), t('mavi', 12),
  ],
  [t('kirmizi', 1), sOkey(1), t('kirmizi', 3), t('siyah', 5), t('siyah', 7)],
  [t('sari', 3), t('mavi', 6), t('kirmizi', 11), t('siyah', 2)],
  [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5), t('sari', 12)],
];

const TEKRAR = 200; // toplam çağrı = ELLER.length * TEKRAR
let toplamNs = 0n;
let cagriSayisi = 0;

for (let tur = 0; tur < TEKRAR; tur++) {
  for (const el of ELLER) {
    const karisikEl = karistir(el, tur + 1);
    const basla = process.hrtime.bigint();
    elBitirilebilirMi(karisikEl, OKEY_TASI);
    const bitis = process.hrtime.bigint();
    toplamNs += bitis - basla;
    cagriSayisi++;
  }
}

const ortalamaMs = Number(toplamNs) / cagriSayisi / 1e6;
console.log(`tek el kontrolü ortalama süre: ${ortalamaMs.toFixed(4)} ms (${cagriSayisi} çağrı, ${ELLER.length} örnek x ${TEKRAR} tekrar)`);
