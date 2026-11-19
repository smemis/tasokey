// El durumu, sıra, hamle doğrulama (çek/at), el sonu koşulları
// (MIMARI.md §3 `cekirdek/el.js`; GDD.md §1 kural 5, 10, 12, §2 "Taş çekme/atma"; R-003, R-006, R-007).
// tasokey#8: sıra denetimi, çek-at akışı, okey/sahte okey atma yasağı (ADR-008/2), deste tükenmesi
// (ADR-008/4) ve sonsuz döngüye karşı tanımlı tur sınırı.

import { dagit, OYUNCU_SAYISI, tasOkeyMi } from './dagitim.js';
import { elBitirilebilirMi } from './cozucu.js';
import { KURAL_VARSAYILAN } from './kural.js';

export const KAYNAK = Object.freeze({ YER: 'yer', ATILAN: 'atilan' });

export const REDDEDILME_SEBEBI = Object.freeze({
  SIRA_DEGIL: 'siraDegil',
  ZATEN_CEKILDI: 'zatenCekildi',
  HENUZ_CEKILMEDI: 'henuzCekilmedi',
  YER_DESTESI_BOS: 'yerDestesiBos',
  ATILAN_YOK: 'atilanYok',
  TAS_ELDE_YOK: 'tasEldeYok',
  OKEY_ATILAMAZ: 'okeyAtilamaz',
  EL_BITTI: 'elBitti',
});

export const EL_SONUCU = Object.freeze({
  SUREN: 'suren',
  BITTI: 'bitti',
  BERABERE: 'berabere',
  TUR_SINIRI: 'turSiniri',
});

// Bot koşusunda hiç pes etmeyen, yer destesine hiç dokunmayan bir döngü teorik olarak sonsuz
// sürebilir (ör. her tur atılandan çekip geri atmak); bu, o döngüye karşı son çare güvenlik sınırı.
export const VARSAYILAN_MAKSIMUM_TUR = 500;

// Başlayan oyuncu 15 taşla başlar (dagitim.js); bu, elindeki "fazla" taşı zaten çekmiş gibi
// sayılmasına karşılık gelir — ilk hamlesi doğrudan atma olur, çekme adımı atlanır.
export function elBaslat(tohum, kural = KURAL_VARSAYILAN) {
  const { eller, yerDestesi, gosterge, okeyTasi } = dagit(tohum, kural);
  return {
    eller: eller.map((el) => el.slice()),
    yerDestesi: yerDestesi.slice(),
    atilanYigin: [],
    gosterge,
    okeyTasi,
    sira: 0,
    cekildiMi: true,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
  };
}

function reddet(durum, sebep) {
  return { basarili: false, sebep, durum };
}

function elleriGuncelle(eller, oyuncu, donustur) {
  return eller.map((el, i) => (i === oyuncu ? donustur(el) : el));
}

// GDD.md §2 "Taş çekme": yerden ya da atılan taştan birini seçer; sırası olmayan ya da bu turda
// zaten çekmiş oyuncu çekemez (R-003 kabul b).
export function cek(durum, oyuncu, kaynak) {
  if (durum.sonuc !== EL_SONUCU.SUREN) return reddet(durum, REDDEDILME_SEBEBI.EL_BITTI);
  if (oyuncu !== durum.sira) return reddet(durum, REDDEDILME_SEBEBI.SIRA_DEGIL);
  if (durum.cekildiMi) return reddet(durum, REDDEDILME_SEBEBI.ZATEN_CEKILDI);

  if (kaynak === KAYNAK.YER) {
    if (durum.yerDestesi.length === 0) return reddet(durum, REDDEDILME_SEBEBI.YER_DESTESI_BOS);
    const yerDestesi = durum.yerDestesi.slice();
    const tas = yerDestesi.shift();
    const eller = elleriGuncelle(durum.eller, oyuncu, (el) => [...el, tas]);
    return { basarili: true, durum: { ...durum, eller, yerDestesi, cekildiMi: true } };
  }

  if (kaynak === KAYNAK.ATILAN) {
    if (durum.atilanYigin.length === 0) return reddet(durum, REDDEDILME_SEBEBI.ATILAN_YOK);
    const atilanYigin = durum.atilanYigin.slice();
    const tas = atilanYigin.pop();
    const eller = elleriGuncelle(durum.eller, oyuncu, (el) => [...el, tas]);
    return { basarili: true, durum: { ...durum, eller, atilanYigin, cekildiMi: true } };
  }

  throw new Error(`bilinmeyen çekme kaynağı: ${kaynak}`);
}

// GDD.md §2 "Taş atma": elinden bir taş seçip atar; çekmeden atılamaz (R-003 kabul b), okey ve
// sahte okey atılamaz (ADR-008/2, R-003 kabul d). El sonu koşulları burada denetlenir: el bitti mi
// (R-005/R-006), yer destesi tükendi mi (ADR-008/4, R-003 kabul e), tur sınırına ulaşıldı mı.
export function at(durum, oyuncu, tasId, kural = KURAL_VARSAYILAN, maksimumTur = VARSAYILAN_MAKSIMUM_TUR) {
  if (durum.sonuc !== EL_SONUCU.SUREN) return reddet(durum, REDDEDILME_SEBEBI.EL_BITTI);
  if (oyuncu !== durum.sira) return reddet(durum, REDDEDILME_SEBEBI.SIRA_DEGIL);
  if (!durum.cekildiMi) return reddet(durum, REDDEDILME_SEBEBI.HENUZ_CEKILMEDI);

  const el = durum.eller[oyuncu];
  const tas = el.find((t) => t.id === tasId);
  if (!tas) return reddet(durum, REDDEDILME_SEBEBI.TAS_ELDE_YOK);
  if (kural.okeyVeSahteOkeyAtmaYasak && tasOkeyMi(tas, durum.okeyTasi)) {
    return reddet(durum, REDDEDILME_SEBEBI.OKEY_ATILAMAZ);
  }

  const kalanEl = el.filter((t) => t.id !== tasId);
  const eller = elleriGuncelle(durum.eller, oyuncu, () => kalanEl);
  const atilanYigin = [...durum.atilanYigin, tas];
  const turSayaci = durum.turSayaci + 1;
  const ortakAlanlar = { eller, atilanYigin, turSayaci, cekildiMi: false };

  if (elBitirilebilirMi(kalanEl, durum.okeyTasi, kural, durum.gosterge)) {
    return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.BITTI, kazanan: oyuncu } };
  }

  if (turSayaci >= maksimumTur) {
    return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.TUR_SINIRI } };
  }

  if (durum.yerDestesi.length === 0) {
    return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.BERABERE } };
  }

  const sira = (durum.sira + 1) % OYUNCU_SAYISI;
  return { basarili: true, durum: { ...durum, ...ortakAlanlar, sira } };
}
