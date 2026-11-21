// tasokey#39 — `elDokumu` (el bittiğinde rakip ıstakasının dizilişi + sonuç penceresindeki
// per / per dışı / çift / okey sayıları) maliyeti. Döküm, bitiş kararının aksine "en çok taşı
// kapsayan" bölümü aradığı için `elBitirilebilirMi`den pahalı olabilir; bütçe aynı yerden gelir
// (MIMARI.md §7 risk 1: tek çağrı 20 ms). Arayüz el bitince 4 el (sonuç penceresi) + 3 el
// (rakip ıstakaları) hesaplar → çizim başına en çok 7 çağrı.
// `npm test` kapsamına girmez; elle çalıştırılır:  node testler/el-dokumu.olcum.js

import { elDokumu } from '../docs/cekirdek/cozucu.js';
import { dagit } from '../docs/cekirdek/dagitim.js';

const EL_SAYISI = 200;
let toplamNs = 0n;
let cagriSayisi = 0;
let enYavasMs = 0;
let enYavasEl = null;
const dagilim = { per: 0, cift: 0, kalan: 0, okey: 0 };

for (let tohum = 90000; tohum < 90000 + EL_SAYISI; tohum++) {
  const { eller, gosterge, okeyTasi } = dagit(tohum);
  for (const el of eller) {
    const basla = process.hrtime.bigint();
    const dokum = elDokumu(el, okeyTasi, undefined, gosterge);
    const bitis = process.hrtime.bigint();
    const gecenMs = Number(bitis - basla) / 1e6;
    if (gecenMs > enYavasMs) {
      enYavasMs = gecenMs;
      enYavasEl = { tohum, el: el.map((tas) => tas.id).join(' '), dokum };
    }
    toplamNs += bitis - basla;
    cagriSayisi++;
    dagilim.per += dokum.perTasSayisi;
    dagilim.cift += dokum.ciftTasSayisi;
    dagilim.kalan += dokum.kalanSayisi;
    dagilim.okey += dokum.okeySayisi;
  }
}

const ortalamaMs = Number(toplamNs) / cagriSayisi / 1e6;
console.log(
  `elDokumu tek çağrı ortalama: ${ortalamaMs.toFixed(4)} ms · en yavaş: ${enYavasMs.toFixed(4)} ms `
  + `(${cagriSayisi} çağrı = ${EL_SAYISI} el x 4 oyuncu, dağıtım anındaki eller)`,
);
console.log(
  `taş dağılımı (toplam): per ${dagilim.per}, çift ${dagilim.cift}, per dışı tek ${dagilim.kalan}, `
  + `okey/sahte okey ${dagilim.okey}`,
);
console.log(`en yavaş el (tohum ${enYavasEl.tohum}): ${enYavasEl.el}`);
console.log(
  `  → ${enYavasEl.dokum.perSayisi} per (${enYavasEl.dokum.perTasSayisi} taş), `
  + `${enYavasEl.dokum.ciftSayisi} çift, per dışı ${enYavasEl.dokum.perDisiSayisi} taş, `
  + `${enYavasEl.dokum.okeySayisi} okey`,
);
