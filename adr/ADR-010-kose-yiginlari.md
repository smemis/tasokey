# ADR-010: Atılan taş — oyuncu başına ayrı köşe yığını
| Alan | Değer |
|---|---|
| Tarih | 2026-11-20 · Durum: kabul (K2 — Mimar) |
| Bağlam | `GDD.md` §6 "Bulgu" (tasokey#22): `cekirdek/el.js` atılan taşı tek ortak `atilanYigin` dizisinde tutuyor, oyuncu başına ayrılmış bir yığın yok (ölçüldü, satır 41/77-80/103). `PRD.md` R-011 arayüzde dört ayrı köşe yığını, R-012 çekme kaynağının yalnız "önceki oyuncunun köşesi" olmasını istiyor; motor şu an hangi taşı hangi oyuncunun attığını ayrı ayrı bilmiyor |
| Karar | `cekirdek/el.js`'teki atılan taş modeli, oyuncu başına ayrı yığın (ya da her taşa "atan oyuncu" etiketi) tutacak şekilde genişletilir; motor hâlâ tek kaynaktır (ADR-002), arayüz yalnız bu modeli görüntüler. Kodun kendisi bu işte (`tasokey#24`, belge güncellemesi) **değişmez** — ayrı bir Geliştirici işi (R-011 notu) |
| Seçenekler | B) Arayüzde tek ortak diziyi görsel olarak dört köşeye bölüştürmek (atan oyuncuyu DOM tarafında sıra düzeninden tahmin ederek) — reddedildi: ADR-002'nin "tek kaynak" ilkesini bozar, R-012'nin "başka köşeden çekilemez" kısıtını motor doğrulayamaz, tahmin kuralla senkron kalmayabilir |
| Sonuçlar | Kolaylaştırır: 4 köşe yığını ve R-012'nin çekme kaynağı kısıtı motor tarafından doğrulanabilir hâle gelir. Zorlaştırır: `cekirdek/el.js` veri şekli değişir → bu alanı kullanan öz-testler (`el.test.js`, `dizilim.test.js`) güncellenmeli; kayıt şemasına (ADR-006) etkisi varsa (yarım el saklanıyorsa) o iş ayrıca değerlendirilir |
| Etkilenen gereksinimler | R-011, R-012 |
