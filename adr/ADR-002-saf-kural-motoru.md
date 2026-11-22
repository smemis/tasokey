# ADR-002: Saf kural motoru; bot ve insan aynı motoru kullanır
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | GDD §4: botun asla kurala aykırı hamle yapmaması değişmez. İki ayrı kural yorumu (biri arayüzde, biri botta) bu değişmezi ölçülemez kılar ve aynı işi iki yerde yapar (CLAUDE.md §6 "tek kapı / tek kaynak") |
| Karar | Bütün kural bilgisi `cekirdek/` altında; `arayuz/` ve `bot/` yalnız **hamle önerir**, geçerliliğe `cekirdek/el.js` karar verir. `cekirdek/` ve `bot/` tarayıcı API'si kullanamaz (kaynak taramasıyla ölçülür) |
| Seçenekler | Arayüzde ayrı doğrulama (hızlı görünür geri bildirim verir ama kuralı ikileştirir) — reddedildi; arayüz anlık ipucu için `cekirdek`'in saf işlevlerini çağırır |
| Sonuçlar | Kural tarayıcı açmadan test edilir; bot hatası kural hatasından ayrışır. Her arayüz etkileşimi bir motor çağrısına bağlanmak zorunda |
| Etkilenen gereksinimler | R-003, R-004, R-005, R-006 |
