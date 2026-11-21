// Per ve çift geçerliliği; okey/sahte okey yerine geçme (MIMARI.md §3 `cekirdek/dizilim.js`,
// ADR-017; GDD.md §1 kural 6, 7, 9; R-004).
//
// Per iki biçimde olur (GDD kural 6): **seri** — aynı renkte ardışık en az 3 sayı; **sayı peri** —
// aynı sayının 3 ya da 4 farklı renkteki taşı (aynı renk bir perde iki kez bulunamaz).
// Çift yalnız iki **birebir aynı** taştır (GDD kural 7); "aynı sayı, farklı renk" artık çift değil,
// sayı perinin parçasıdır.

import { EN_DUSUK_SAYI, EN_YUKSEK_SAYI, RENKLER } from './tas.js';
import { tasOkeyMi } from './dagitim.js';
import { KURAL_VARSAYILAN } from './kural.js';

const SAYI_ARALIGI = EN_YUKSEK_SAYI - EN_DUSUK_SAYI + 1;
export const EN_KISA_PER = 3;

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

// GDD.md §1 kural 6: per ya seri ya sayı peridir; okey/sahte okey her ikisinde de eksik taşın
// yerine geçer. Bu, dizilim doğrulamasının tek kapısıdır — çözücü de buradan sorar.
export function perGecerliMi(taslar, okeyTasi, kural = KURAL_VARSAYILAN) {
  if (!Array.isArray(taslar) || taslar.length < EN_KISA_PER) return false;

  const normaller = taslar.filter((tas) => !tasOkeyMi(tas, okeyTasi));

  // Yalnız jokerden kurulu grup: seri olarak okunur (en çok 13 taş).
  if (normaller.length === 0) return taslar.length <= SAYI_ARALIGI;

  return seriGecerliMi(taslar, normaller, kural) || sayiPeriGecerliMi(taslar, normaller);
}

// GDD.md §1 kural 6a: aynı renkte ardışık en az 3 sayı; `12-13-1` geçişi kural ayarına bağlı.
function seriGecerliMi(taslar, normaller, kural) {
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

// GDD.md §1 kural 6b: aynı sayının 3 ya da 4 farklı renkteki taşı; aynı renk iki kez giremez.
function sayiPeriGecerliMi(taslar, normaller) {
  if (taslar.length > RENKLER.length) return false;

  const sayilar = new Set(normaller.map((tas) => tas.sayi));
  if (sayilar.size > 1) return false;

  const renkler = new Set(normaller.map((tas) => tas.renk));
  return renkler.size === normaller.length;
}

// GDD.md §1 kural 7, 9: çift = iki birebir aynı taş (aynı sayı VE aynı renk); okey/sahte okey
// çiftte de eksik taşın yerine geçer. Gösterge taşının kendisi çift sayılmaz.
export function ciftGecerliMi(tasA, tasB, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  if (gosterge && (tasA.id === gosterge.id || tasB.id === gosterge.id)) return false;

  const aJoker = tasOkeyMi(tasA, okeyTasi);
  const bJoker = tasOkeyMi(tasB, okeyTasi);
  if (aJoker || bJoker) return true;

  return tasA.sayi === tasB.sayi && tasA.renk === tasB.renk;
}
