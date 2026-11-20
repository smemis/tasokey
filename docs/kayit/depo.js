// localStorage sarmalayıcı + şema sürümü (MIMARI.md §3 `kayit/depo.js`; ADR-006; R-010; tasokey#14).
// Bu katman tarayıcı API'si kullanabilir (sınır kuralı yalnız cekirdek/ ve bot/ için geçerli,
// MIMARI.md §3 "Sınır kuralı"). `depo` parametresi testte sahte storage enjekte etmek için;
// tarayıcıda varsayılan gerçek `localStorage`'dır.

export const KAYIT_ANAHTARI = 'tasokey.kayit';

// Şema sürümü (ADR-006): değişirse ve eski kayıtla uyuşmazsa kayıt atılır, taşıma kodu yazılmaz
// (yayın öncesi — PRD §8 "toplanan veri yok", taşınacak kullanıcı verisi yok).
export const SURUM = 1;

export const VARSAYILAN_KAYIT = Object.freeze({
  surum: SURUM,
  dilKodu: 'tr',
});

// Sürüm uyuşmazsa, kayıt bozuksa ya da depo erişilemezse (gizli mod, kota, tarayıcı dışı ortam)
// varsayılana döner — hiçbir durumda çökmez (iş kabul ölçütü c).
export function kayitOku(depo = globalThis.localStorage) {
  if (!depo) return { ...VARSAYILAN_KAYIT };
  let ham;
  try {
    ham = depo.getItem(KAYIT_ANAHTARI);
  } catch {
    return { ...VARSAYILAN_KAYIT };
  }
  if (ham === null || ham === undefined) return { ...VARSAYILAN_KAYIT };
  let veri;
  try {
    veri = JSON.parse(ham);
  } catch {
    return { ...VARSAYILAN_KAYIT };
  }
  if (!veri || typeof veri !== 'object' || veri.surum !== SURUM) return { ...VARSAYILAN_KAYIT };
  return { ...VARSAYILAN_KAYIT, ...veri };
}

// Mevcut kayıtla birleştirip yazar (ör. yalnız dil değişince ses/diğer alanlar kaybolmaz).
export function kayitYaz(kismiVeri, depo = globalThis.localStorage) {
  if (!depo) return;
  const guncel = { ...kayitOku(depo), ...kismiVeri, surum: SURUM };
  try {
    depo.setItem(KAYIT_ANAHTARI, JSON.stringify(guncel));
  } catch {
    // Depolama yazılamıyor (gizli mod, kota) — sessizce yok sayılır, oyun çökmeden sürer.
  }
}
