// Dağıtım, yer destesi, gösterge açma ve o elin okey taşını belirleme
// (MIMARI.md §3 `cekirdek/dagitim.js`; GDD.md §1 kural 2, 3, 4, 11; R-001, R-002).

import { setOlustur, tasOlustur, TAS_TURU, EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from './tas.js';
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

// GDD.md §1 kural 4 (ADR-027, Sahip kararı 2026-11-24): "bu taş joker mi?" sorusunun TEK kapısı.
// Joker YALNIZ göstergenin bir üstü, aynı renk taşlardır (gösterge X → joker X+1, 13 → 1).
// Sahte okey joker DEĞİLDİR (kapatma anahtarı `sahteOkeyJokerGibiDavranir` açılmadıkça); göstergenin
// eldeki kopyası da sıradan taştır — o kopya gösterge sayısındadır, joker bir üst sayıdır.
// Tür denetimi renk/sayı karşılaştırmasından ÖNCE gelir: sahte okeyin değeri okey taşıyla aynı
// olduğundan (bkz. tasDegeri) sonra sorulsaydı yine joker çıkardı.
export function tasOkeyMi(tas, okeyTasi, kural = KURAL_VARSAYILAN) {
  if (tas.tur === TAS_TURU.SAHTE_OKEY) return kural.sahteOkeyJokerGibiDavranir === true;
  return tas.renk === okeyTasi.renk && tas.sayi === okeyTasi.sayi;
}

// GDD.md §1 kural 4 (ADR-027): "bu taşın renk+sayı değeri ne?" sorusunun TEK kapısı. Sayı taşının
// değeri kendisidir; sahte okeyin değeri o elin okey taşıdır. Dönen nesne yalnız OKUNUR ve yalnız
// `renk`/`sayi` alanları anlamlıdır (sıcak yolda kopya üretmemek için taşın kendisi döner).
export function tasDegeri(tas, okeyTasi) {
  return tas.tur === TAS_TURU.SAHTE_OKEY ? okeyTasi : tas;
}

// GDD.md §1 kural 10 / ADR-008 sürüm 2: "bu taş özel mi?" — okey ya da sahte okey. Atma yasağı
// (`okeyVeSahteOkeyAtmaYasak`) ve arayüzün bilgilendirme penceresi bu soruyu sorar, "joker mi"yi
// DEĞİL: ADR-027'den sonra sahte okey joker olmasa da yasağın kapsamındadır.
export function tasOzelMi(tas, okeyTasi) {
  if (tas.tur === TAS_TURU.SAHTE_OKEY) return true;
  return tas.renk === okeyTasi.renk && tas.sayi === okeyTasi.sayi;
}

// Kural sorusu taşı (bot `bot.js` kullanır): o elin gerçek okey taşının, hiçbir elde bulunmayan
// 0. nüshası. "a ile b aynı perde buluşabilir mi?" sorusunu dizilim.js'e sormanın yolu araya bir
// JOKER koymaktır; ADR-027'den sonra sahte okey joker olmadığı için soru taşı buradan üretilir.
export function sorguJokeriOlustur(okeyTasi) {
  return tasOlustur(okeyTasi.renk, okeyTasi.sayi, 0);
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
