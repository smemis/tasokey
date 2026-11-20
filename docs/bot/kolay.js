// Kolay bot: çekme/atma sezgiseli (per-çift tamamlama yakınlığı); hamleyi her zaman
// cekirdek/el.js'e onaylatır, kuralı kendi yorumlamaz (MIMARI.md ADR-002, GDD.md §4, tasokey#9).

import { cek, at, KAYNAK, VARSAYILAN_MAKSIMUM_TUR, oncekiOyuncu } from '../cekirdek/el.js';
import { tasOkeyMi } from '../cekirdek/dagitim.js';
import { KURAL_VARSAYILAN } from '../cekirdek/kural.js';
import { EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from '../cekirdek/tas.js';

const SAYI_ARALIGI = EN_YUKSEK_SAYI - EN_DUSUK_SAYI + 1;

function sayiFarki(a, b, onUcBirGecisiPerSayilir) {
  const duz = Math.abs(a - b);
  if (!onUcBirGecisiPerSayilir) return duz;
  return Math.min(duz, SAYI_ARALIGI - duz);
}

// Bir taşın elin diğer taşlarıyla ne kadar "bağlantılı" olduğunu ölçer: aynı sayı farklı
// renk (çift adayı) en yüksek puanı alır, aynı renk bitişik/yakın sayı (per adayı) daha az,
// joker varlığı her taşa küçük bir esneklik puanı ekler. Yüksek puan = elde tutmaya değer.
function baglantiPuani(hedef, el, okeyTasi, onUcBirGecisiPerSayilir) {
  let puan = 0;
  for (const digerTas of el) {
    if (digerTas.id === hedef.id) continue;
    if (tasOkeyMi(digerTas, okeyTasi)) { puan += 2; continue; }
    if (digerTas.sayi === hedef.sayi && digerTas.renk !== hedef.renk) { puan += 4; continue; }
    if (digerTas.renk === hedef.renk) {
      const fark = sayiFarki(hedef.sayi, digerTas.sayi, onUcBirGecisiPerSayilir);
      if (fark === 1) puan += 3;
      else if (fark === 2) puan += 1;
    }
  }
  return puan;
}

// GDD.md §4 "Karar yöntemi": atılacak taşı en düşük bağlantı puanlı (en izole) taş olarak
// seçer. Kural okey/sahte okey atmayı yasaklıyorsa joker bu seçimde hiç aday olmaz —
// motora reddedilecek bir hamle baştan önerilmez.
export function atilacakTasiSec(el, okeyTasi, kural = KURAL_VARSAYILAN) {
  const adaylar = kural.okeyVeSahteOkeyAtmaYasak
    ? el.filter((tas) => !tasOkeyMi(tas, okeyTasi))
    : el;
  const havuz = adaylar.length > 0 ? adaylar : el;

  let secilen = havuz[0];
  let enDusukPuan = baglantiPuani(secilen, el, okeyTasi, kural.onUcBirGecisiPerSayilir);
  for (const tas of havuz.slice(1)) {
    const puan = baglantiPuani(tas, el, okeyTasi, kural.onUcBirGecisiPerSayilir);
    if (puan < enDusukPuan) {
      secilen = tas;
      enDusukPuan = puan;
    }
  }
  return secilen;
}

// Çekim kaynağını seçer: ADR-010 ile atılan taşlar oyuncu başına yığın olduğundan bot da
// yalnız önceki oyuncunun yığınının üst taşına bakar (motorun cek(ATILAN) ile kabul edeceği
// tek kaynak budur). O taş eldeki taşlarla bir çift adayı ya da bitişik per adayı oluşturacak
// kadar bağlantılıysa oradan, değilse yerden çekilir. Kaynaklar boşsa (deste tükenmişken bile
// cek() çağrılabilmesi diye) hâlâ geçerli olan kaynak seçilir.
export function cekimKaynaginiSec(durum, oyuncu, kural = KURAL_VARSAYILAN) {
  if (durum.yerDestesi.length === 0) return KAYNAK.ATILAN;
  const oncekiYigin = durum.atilanYiginlar[oncekiOyuncu(oyuncu)];
  if (oncekiYigin.length === 0) return KAYNAK.YER;

  const ustTas = oncekiYigin[oncekiYigin.length - 1];
  const el = durum.eller[oyuncu];
  const puan = baglantiPuani(ustTas, el, durum.okeyTasi, kural.onUcBirGecisiPerSayilir);
  return puan >= 3 ? KAYNAK.ATILAN : KAYNAK.YER;
}

// Bir bot turunu baştan sona oynar: çekim kaynağını seçer, cekirdek/el.js'e çektirir,
// sonra atılacak taşı seçer ve yine cekirdek/el.js'e attırır. Geçerliliğe her iki adımda da
// motor karar verir; bot yalnız öneri sunar (ADR-002). Çekme reddedilirse (ör. sıra değilse)
// o sebeple doğrudan döner, atma denenmez. `durum.cekildiMi` zaten true ise (başlayan
// oyuncunun 15 taşlık ilk hamlesi, bkz. el.js `elBaslat`) çekme adımı atlanır — aksi halde
// motor "zatenCekildi" sebebiyle reddeder.
export function kolayBotTurOyna(durum, oyuncu, kural = KURAL_VARSAYILAN, maksimumTur = VARSAYILAN_MAKSIMUM_TUR) {
  let calisanDurum = durum;
  if (!calisanDurum.cekildiMi) {
    const kaynak = cekimKaynaginiSec(calisanDurum, oyuncu, kural);
    const cekSonucu = cek(calisanDurum, oyuncu, kaynak);
    if (!cekSonucu.basarili) return cekSonucu;
    calisanDurum = cekSonucu.durum;
  }

  const el = calisanDurum.eller[oyuncu];
  const atilacakTas = atilacakTasiSec(el, calisanDurum.okeyTasi, kural);
  return at(calisanDurum, oyuncu, atilacakTas.id, kural, maksimumTur);
}
