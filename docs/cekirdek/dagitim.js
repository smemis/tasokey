// Dağıtım, yer destesi, gösterge açma ve o elin okey taşını belirleme
// (MIMARI.md §3 `cekirdek/dagitim.js`; GDD.md §1 kural 2, 3, 4, 11; R-001, R-002).

import { setOlustur, TAS_TURU, EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from './tas.js';
import { karistir } from './karma.js';
import { KURAL_VARSAYILAN } from './kural.js';

export const OYUNCU_SAYISI = 4;
export const BASLAYAN_OYUNCU_EL_BOYUTU = 15;
export const DIGER_OYUNCU_EL_BOYUTU = 14;

// GDD.md §1 kural 11 / ADR-008-3: gösterge sahte okey çıkarsa taş desteye karışır, yeni gösterge açılır.
export function gostergeAc(destesi, kural = KURAL_VARSAYILAN) {
  const kalan = destesi.slice();
  let gosterge = kalan.shift();
  while (kural.gostergeSahteOkeyIseYenidenAcilir && gosterge?.tur === TAS_TURU.SAHTE_OKEY) {
    kalan.push(gosterge);
    gosterge = kalan.shift();
  }
  return { gosterge, kalanDeste: kalan };
}

// GDD.md §1 kural 3: okey taşı, göstergeyle aynı renkte bir üst sayıdır (13 → 1 döner).
export function okeyTasiBelirle(gosterge) {
  const sonrakiSayi = gosterge.sayi === EN_YUKSEK_SAYI ? EN_DUSUK_SAYI : gosterge.sayi + 1;
  return { renk: gosterge.renk, sayi: sonrakiSayi };
}

// GDD.md §1 kural 4: sahte okey, o elin okey taşının yerine geçer; her yerde okey gibi davranır.
export function tasOkeyMi(tas, okeyTasi) {
  if (tas.tur === TAS_TURU.SAHTE_OKEY) return true;
  return tas.renk === okeyTasi.renk && tas.sayi === okeyTasi.sayi;
}

// GDD.md §1 kural 2: başlayan oyuncu 15, diğer üçü 14 taş alır; kalanı yer destesidir.
export function dagit(tohum, kural = KURAL_VARSAYILAN) {
  const havuz = karistir(setOlustur(), tohum);
  const eller = [];
  for (let oyuncu = 0; oyuncu < OYUNCU_SAYISI; oyuncu++) {
    const boyut = oyuncu === 0 ? BASLAYAN_OYUNCU_EL_BOYUTU : DIGER_OYUNCU_EL_BOYUTU;
    eller.push(havuz.splice(0, boyut));
  }
  const { gosterge, kalanDeste } = gostergeAc(havuz, kural);
  return { eller, yerDestesi: kalanDeste, gosterge, okeyTasi: okeyTasiBelirle(gosterge) };
}
