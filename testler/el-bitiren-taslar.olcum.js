// tasokey#26 kabul ölçütü (e): `elBitirenTaslar` tek çağrının ortalama süresi (tahmin hedefi 20 ms,
// bkz. `cozucu.olcum.js`'in 20 ms bütçesi — bu fonksiyon elin her taşı için bir `elBitirilebilirMi`
// çağrısı yaptığından 15 taşlık gerçek bir elde ~15 kat maliyet beklenir).
// `npm test` kapsamına girmez (ad `*.test.js` kalıbına uymaz); elle çalıştırılır:
//   node testler/el-bitiren-taslar.olcum.js

import { elBitirenTaslar } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { karistir } from '../docs/cekirdek/karma.js';

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// Gerçekçi 15 taşlık (çekilmiş, atmaya hazır) eller: 14 taşı tam gruplu, 1 taş "fazla" —
// tam oyunda deste vurgusu bu şekle her atmadan önce bakar.
const ELLER = [
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5),
    t('siyah', 7), t('siyah', 8), t('siyah', 9),
    t('mavi', 10), t('sari', 10), t('mavi', 2), t('sari', 2), t('mavi', 5), t('sari', 5),
    t('sari', 12),
  ],
  [
    t('kirmizi', 3), t('siyah', 3), t('kirmizi', 4), t('siyah', 4),
    t('kirmizi', 6), t('siyah', 6), t('kirmizi', 11), t('siyah', 11),
    t('mavi', 1), t('mavi', 2), t('mavi', 3),
    t('sari', 9), t('sari', 10), t('sari', 11),
    t('siyah', 2),
  ],
  [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
    t('siyah', 7), t('siyah', 8), t('siyah', 9),
    t('mavi', 10), t('sari', 10),
    t('mavi', 2), t('sari', 2),
    sOkey(1), sOkey(2),
    t('kirmizi', 13), t('mavi', 4),
  ],
  // bitirilemez el: hiçbir atış kalanı tamamlamıyor (deste hiç vurgulanmaz).
  [
    t('kirmizi', 1), t('siyah', 5), t('mavi', 9), t('sari', 3),
    t('kirmizi', 6), t('siyah', 10), t('mavi', 13), t('sari', 7),
    t('kirmizi', 8), t('siyah', 2), t('mavi', 11), t('sari', 4),
    t('kirmizi', 12), t('siyah', 6), t('mavi', 1),
  ],
];

const TEKRAR = 200; // toplam çağrı = ELLER.length * TEKRAR
let toplamNs = 0n;
let cagriSayisi = 0;

for (let tur = 0; tur < TEKRAR; tur++) {
  for (const el of ELLER) {
    const karisikEl = karistir(el, tur + 1);
    const basla = process.hrtime.bigint();
    elBitirenTaslar(karisikEl, OKEY_TASI);
    const bitis = process.hrtime.bigint();
    toplamNs += bitis - basla;
    cagriSayisi++;
  }
}

const ortalamaMs = Number(toplamNs) / cagriSayisi / 1e6;
console.log(`elBitirenTaslar tek çağrı ortalama süre: ${ortalamaMs.toFixed(4)} ms (${cagriSayisi} çağrı, ${ELLER.length} örnek x ${TEKRAR} tekrar, her el 15 taş)`);
