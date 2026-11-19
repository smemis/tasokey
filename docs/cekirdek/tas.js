// Taş kimliği ve 106'lık setin kurulması (MIMARI.md §3, GDD.md §1 kural 1).

export const RENKLER = Object.freeze(['kirmizi', 'siyah', 'mavi', 'sari']);
export const EN_DUSUK_SAYI = 1;
export const EN_YUKSEK_SAYI = 13;

export const TAS_TURU = Object.freeze({
  SAYI: 'sayi',
  SAHTE_OKEY: 'sahteOkey',
});

export function tasOlustur(renk, sayi, nusha) {
  return Object.freeze({ tur: TAS_TURU.SAYI, renk, sayi, nusha, id: `${renk}-${sayi}-${nusha}` });
}

export function sahteOkeyOlustur(nusha) {
  return Object.freeze({ tur: TAS_TURU.SAHTE_OKEY, nusha, id: `sahteOkey-${nusha}` });
}

export function setOlustur() {
  const taslar = [];
  for (const renk of RENKLER) {
    for (let sayi = EN_DUSUK_SAYI; sayi <= EN_YUKSEK_SAYI; sayi++) {
      taslar.push(tasOlustur(renk, sayi, 1));
      taslar.push(tasOlustur(renk, sayi, 2));
    }
  }
  taslar.push(sahteOkeyOlustur(1));
  taslar.push(sahteOkeyOlustur(2));
  return taslar;
}
