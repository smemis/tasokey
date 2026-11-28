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
  // **Sürüm 4 (Sahip 2026-11-28, GDD v8):** dönüş yalnız SONDA — 13'ten sonra 1 gelir ve 1 serinin son
  // taşıdır: `12-13-1`, `11-12-13-1` geçerli; `13-1-2`, `12-13-1-2`, `13-1-2-3-4` geçersiz. Anahtarın anlamı
  // "13 → 1 sonda geçişi"dir; tam dönüş (1'den sonra devam) hiçbir ayarla açılmaz.
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
  // 5) **ADR-027 (2026-11-24, tasokey#81, Sahip kararı):** sahte okey JOKER DEĞİLDİR; o elin okey
  // taşının renk+sayı DEĞERİNİ alır ve perde, çiftte, bot değerlendirmesinde o değerdeki sıradan
  // taş gibi davranır. Joker yalnız gösterge+1 aynı renk taşlardır (13 → 1). Ayar **kapatma
  // anahtarı** olarak duruyor: `true` yapılırsa K1'in (2026-11-19) eski davranışı — sahte okey
  // evrensel joker — tek kapıdan (`dagitim.js` → `tasOkeyMi`) geri gelir; dizilim, çözücü, bot ve
  // arayüz kendiliğinden hizalanır. `okeyVeSahteOkeyAtmaYasak` bundan BAĞIMSIZDIR: atma kısıtı
  // "joker mi" değil "özel taş mı" sorusudur (`tasOzelMi`), yani açıkken okey VE sahte okey
  // iki ayarın da değerinden bağımsız olarak atılamaz.
  sahteOkeyJokerGibiDavranir: false,
  // 6) **tasokey#87 (2026-11-24, Sahip kararı, GDD §1 kural 14):** önceki oyuncunun köşesinden
  // çekilen taş, oyuncu HENÜZ atmadan aynı köşeye GERİ BIRAKILABİLİR; tur yeniden "çekilmedi"
  // olur ve oyuncu bu kez desteden çekebilir. Geri bırakma bir hamle değildir: `turSayaci` ve
  // `sira` değişmez. Yalnız KÖŞEDEN çekilen taş için geçerlidir (desteden çekileni geri koymak
  // yer destesinin sırasını bozardı). Ayar **kapatma anahtarı**: `false` yapılırsa motorun tek
  // kapısı (`el.js` → `cekmeyiGeriAl` / `geriBirakilabilirTasId`) her denemeyi
  // `geriBirakilamaz` ile reddeder; arayüzün vurgusu ve etkileşim kararı aynı kapıdan geldiği
  // için kendiliğinden kaybolur — tek satır yeter.
  cekilenTasGeriBirakilabilir: true,
});
