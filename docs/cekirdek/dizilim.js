// Per ve çift geçerliliği; okey/sahte okey yerine geçme (MIMARI.md §3 `cekirdek/dizilim.js`;
// GDD.md §1 kural 6, 7, 9; R-004).

import { EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from './tas.js';
import { tasOkeyMi } from './dagitim.js';
import { KURAL_VARSAYILAN } from './kural.js';

const SAYI_ARALIGI = EN_YUKSEK_SAYI - EN_DUSUK_SAYI + 1;

// n uzunluğunda, ardışık sayı pencereleri üretir. `onUcBirGecisiPerSayilir` açıksa
// 13 → 1 dönüşlü (dairesel) pencereler de üretilir; kapalıysa yalnız 1..13 düz pencereler.
export function ardisikPencereUret(n, onUcBirGecisiPerSayilir) {
  const pencereler = [];
  for (let baslangic = EN_DUSUK_SAYI; baslangic <= EN_YUKSEK_SAYI; baslangic++) {
    const pencere = [];
    let gecerli = true;
    for (let i = 0; i < n; i++) {
      let deger = baslangic + i;
      if (deger > EN_YUKSEK_SAYI) {
        if (!onUcBirGecisiPerSayilir) {
          gecerli = false;
          break;
        }
        deger = EN_DUSUK_SAYI + ((deger - EN_DUSUK_SAYI) % SAYI_ARALIGI);
      }
      pencere.push(deger);
    }
    if (gecerli) pencereler.push(pencere);
  }
  return pencereler;
}

// GDD.md §1 kural 6: aynı renkte ardışık en az 3 sayı; okey/sahte okey boşluğu doldurur.
export function perGecerliMi(taslar, okeyTasi, kural = KURAL_VARSAYILAN) {
  if (!Array.isArray(taslar) || taslar.length < 3) return false;

  const normaller = taslar.filter((tas) => !tasOkeyMi(tas, okeyTasi));

  if (normaller.length === 0) {
    return taslar.length <= SAYI_ARALIGI;
  }

  const renkler = new Set(normaller.map((tas) => tas.renk));
  if (renkler.size > 1) return false;

  const sayilar = normaller.map((tas) => tas.sayi);
  if (new Set(sayilar).size !== sayilar.length) return false;

  const pencereler = ardisikPencereUret(taslar.length, kural.onUcBirGecisiPerSayilir);
  return pencereler.some((pencere) => {
    const pencereSeti = new Set(pencere);
    return sayilar.every((sayi) => pencereSeti.has(sayi));
  });
}

// GDD.md §1 kural 7, 9: aynı sayı, 2 farklı renk; gösterge taşı çift sayılmaz.
export function ciftGecerliMi(tasA, tasB, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  if (gosterge && (tasA.id === gosterge.id || tasB.id === gosterge.id)) return false;

  const aJoker = tasOkeyMi(tasA, okeyTasi);
  const bJoker = tasOkeyMi(tasB, okeyTasi);
  if (aJoker || bJoker) return true;

  return tasA.sayi === tasB.sayi && tasA.renk !== tasB.renk;
}
