# ADR-006: Kayıt — localStorage + şema sürümü, taşıma yok
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | Hesap ve sunucu yok; yalnız dil/ses tercihi ve istenirse yarım el saklanacak. Profil: "veri şeması sürümleme baştan kurulur" |
| Karar | Tek anahtar `tasokey.kayit`, içinde `surum` alanı. Okurken sürüm uyuşmazsa kayıt atılır ve varsayılana dönülür (yayın öncesi). Yayından sonra şema değişikliği R sınıfıdır |
| Seçenekler | Sürümsüz kayıt (ilk şema değişikliğinde sessiz bozulma) — reddedildi. IndexedDB (bu veri hacmi için gereksiz karmaşıklık) — reddedildi |
| Sonuçlar | Şema değişimi ilk sürümlerde bedava; yayından sonra kapı gerektirir. Kullanıcı tercihinin silinmesi yayın öncesi kabul edilir |
| Etkilenen gereksinimler | R-008, R-010 |
