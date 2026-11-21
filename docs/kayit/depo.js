// localStorage sarmalayıcı + şema sürümü (MIMARI.md §3 `kayit/depo.js`; ADR-006; R-010; tasokey#14).
// Bu katman tarayıcı API'si kullanabilir (sınır kuralı yalnız cekirdek/ ve bot/ için geçerli,
// MIMARI.md §3 "Sınır kuralı"). `depo` parametresi testte sahte storage enjekte etmek için;
// tarayıcıda varsayılan gerçek `localStorage`'dır.

export const KAYIT_ANAHTARI = 'tasokey.kayit';

// Şema sürümü (ADR-006): değişirse ve eski kayıtla uyuşmazsa kayıt atılır, taşıma kodu yazılmaz
// (yayın öncesi — PRD §8 "toplanan veri yok", taşınacak kullanıcı verisi yok).
// Sürüm 2 (tasokey#42, ADR-016): zorluk kademesi seçimi eklendi; sürüm 1 kaydı (yalnız dil)
// taşınmadan atılır.
export const SURUM = 2;

// Kayıtta duran alanların TEK listesi (ADR-016): yalnız dil ve zorluk saklanır. Okurken de
// yazarken de bu süzgeçten geçilir — başka bir alan (eski şemadan kalan ya da elle eklenmiş)
// kayda girmez, oyuna da sızmaz.
export const ALANLAR = Object.freeze(['dilKodu', 'zorluk']);

// `zorluk` burada **opak dize**dir: geçerli kademe adlarının tek kaynağı `bot/bot.js` (ADR-013) ve
// doğrulaması `arayuz/kabuk.js` `zorlukCozumle`'dir — bu katman kademe listesi bilmez (bu yüzden
// varsayılanı `null`: "henüz seçilmedi").
export const VARSAYILAN_KAYIT = Object.freeze({
  surum: SURUM,
  dilKodu: 'tr',
  zorluk: null,
});

// Bilinen alanlardan yalnız dize değer taşıyanlar; gerisi (bilinmeyen alan, sayı/nesne değer)
// bozuk sayılıp düşürülür → o alan varsayılanıyla kalır.
function alanlariSuz(veri) {
  const suzulmus = {};
  for (const alan of ALANLAR) {
    if (typeof veri?.[alan] === 'string') suzulmus[alan] = veri[alan];
  }
  return suzulmus;
}

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
  return { ...VARSAYILAN_KAYIT, ...alanlariSuz(veri) };
}

// Mevcut kayıtla birleştirip yazar (ör. yalnız zorluk değişince dil seçimi kaybolmaz).
export function kayitYaz(kismiVeri, depo = globalThis.localStorage) {
  if (!depo) return;
  // Süzgeç en sonda uygulanır: hiç seçilmemiş (null) alan kayda yazılmaz, bilinmeyen alan girmez.
  const guncel = { ...alanlariSuz({ ...kayitOku(depo), ...kismiVeri }), surum: SURUM };
  try {
    depo.setItem(KAYIT_ANAHTARI, JSON.stringify(guncel));
  } catch {
    // Depolama yazılamıyor (gizli mod, kota) — sessizce yok sayılır, oyun çökmeden sürer.
  }
}
