// K1'in (Sahip, 2026-11-19) dört kural kararı tek nesnede (MIMARI.md ADR-008, GDD.md §1 kural 6/10-12).
// Motorun başka hiçbir yerinde bu kurallar yeniden yazılmaz; değişirse tek satır burada değişir.
// Kural 2'nin varsayılanı Sahip'in `tasokey#50` isteğiyle döndü (ADR-008 sürüm 2), kural 1'in
// varsayılanı `tasokey#66` isteğiyle (ADR-008 sürüm 3); ayarlar ve onları okuyan bütün yollar
// olduğu gibi duruyor, bkz. aşağıdaki notlar.

export const KURAL_VARSAYILAN = Object.freeze({
  // 1) **sürüm 3 (2026-11-22, tasokey#66): "12-13-1" geçişi PER SAYILIR** — seri 13'ten 1'e döner.
  // Ayar **kapatma anahtarı** olarak duruyor: `false` yapılırsa per yine 1→13 düz sırası olur ve
  // tek kapıdan (`dizilim.js` → `ardisikPencereUret`) hem doğrulayıcı hem çözücü hem bot düz
  // sıraya döner — tek satır yeter. *(Sürüm 1-2'de varsayılan `false`'tu.)*
  onUcBirGecisiPerSayilir: true,
  // 2) Okey ve sahte okey taşı ATILABİLİR (Sahip kararı, tasokey#50 — ADR-008 sürüm 2): hamle
  // engellenmez, ceza da yoktur; insan oyuncu joker attığında arayüz yalnız bilgilendirme
  // penceresi gösterir (ADR-016/8). Ayar **kapatma anahtarı** olarak duruyor: `true` yapılırsa
  // motorun eski ret yolu (`el.js` → REDDEDILME_SEBEBI.OKEY_ATILAMAZ), çözücünün aday filtresi
  // (`cozucu.js`) ve botun atılabilir havuzu (`bot.js`) yine yasağı uygular — tek satır yeter.
  okeyVeSahteOkeyAtmaYasak: false,
  // 3) Gösterge taşı sahte okey çıkarsa taş desteye karışır ve gösterge yeniden açılır.
  gostergeSahteOkeyIseYenidenAcilir: true,
  // 4) Yerdeki taşlar kimse bitirmeden tükenirse el berabere sayılır ve yeni el başlar.
  desteTukenirseElBerabereSayilir: true,
});
