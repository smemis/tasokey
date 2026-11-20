// Dört kenar/köşe yerleşimi: hangi oyuncu hangi kenarda, atılan taşın hangi köşe yığınına
// gittiği (MIMARI.md ADR-012; GDD.md §"Yerleşim"; PRD.md R-011/R-012). Saf mantık, DOM yok
// (tasokey#29). Yön (sıradaki oyuncu kim) burada yeniden tanımlanmaz — çağıran taraf
// `cekirdek/el.js`'in `sonrakiOyuncu`'sunu (ya da onun tersini) `ileri` parametresi olarak verir;
// bu yüzden sıra yönü değişirse (ör. ters fonksiyon verilirse) kenar/köşe eşlemesi de değişir.

import { OYUNCU_SAYISI } from '../cekirdek/dagitim.js';

export const KENAR = Object.freeze({ ALT: 'alt', SAG: 'sag', UST: 'ust', SOL: 'sol' });

export const KOSE = Object.freeze({
  SAG_ALT: 'sagAlt',
  SAG_UST: 'sagUst',
  SOL_UST: 'solUst',
  SOL_ALT: 'solAlt',
});

// Sahip (oyuncu 0) her zaman alttadır (GDD.md §"Yerleşim": "Sahip altta"); bu sırayla başlayıp
// `ileri` fonksiyonunu izleyerek kenarlar dolar.
const KENAR_SIRASI = [KENAR.ALT, KENAR.SAG, KENAR.UST, KENAR.SOL];

const KOSE_ADI = {
  [`${KENAR.ALT}|${KENAR.SAG}`]: KOSE.SAG_ALT,
  [`${KENAR.SAG}|${KENAR.UST}`]: KOSE.SAG_UST,
  [`${KENAR.UST}|${KENAR.SOL}`]: KOSE.SOL_UST,
  [`${KENAR.SOL}|${KENAR.ALT}`]: KOSE.SOL_ALT,
};

// Oyuncu index'inden kenar adına (dizi, index = oyuncu) harita döner.
export function oyuncuKenarHaritasi(ileri) {
  const harita = new Array(OYUNCU_SAYISI);
  let oyuncu = 0;
  for (const kenar of KENAR_SIRASI) {
    harita[oyuncu] = kenar;
    oyuncu = ileri(oyuncu);
  }
  return harita;
}

export function oyuncununKenari(oyuncu, ileri) {
  return oyuncuKenarHaritasi(ileri)[oyuncu];
}

// R-011: atılan taş, atan oyuncu ile ondan sonraki oyuncu (ileri(oyuncu)) arasındaki köşede durur.
export function oyuncununAtilanKosesi(oyuncu, ileri) {
  const kenarHaritasi = oyuncuKenarHaritasi(ileri);
  const atanKenar = kenarHaritasi[oyuncu];
  const sonrakiKenar = kenarHaritasi[ileri(oyuncu)];
  return KOSE_ADI[`${atanKenar}|${sonrakiKenar}`];
}
