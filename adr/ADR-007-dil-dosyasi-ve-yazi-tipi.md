# ADR-007: Dil dosyası ve yazı tipi — dışarıya istek yok
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar); yazı tipinin **görünüşü** Sahip'te (STIL) |
| Bağlam | Oyun içi her metin dil dosyasından gelir (sabit metin yasak). STIL §5 "lisanslı yazı tipi" diyor; dışarıdan yazı tipi çekmek ağ isteği, ücretli olabilir (K3) ve çevrimdışı açılışı bozar |
| Karar | `diller/tr.json` + `diller/en.json`; `dil/cevir.js` eksik anahtarda görünür hata basar. Varsayılan yazı tipi: **sistem yazı tipi yığını** (ör. `system-ui`), indirme ve lisans yok. Sayıların ayırt edilebilirliği (6/9, 1/7) ekran görüntüsüyle doğrulanır; Sahip isterse STIL'de lisanslı bir yazı tipi seçilir ve dosyası depoya konur (ayrı iş + gerekiyorsa K3) |
| Seçenekler | Google Fonts/CDN (dış istek, gizlilik ve çevrimdışı sorunu) — reddedildi |
| Sonuçlar | Çevrimdışı açılır, dış istek yok, lisans masrafı yok. Yazı tipi işletim sistemine göre biraz değişir; sayı okunurluğu ekran görüntüsüyle ölçülür |
| Etkilenen gereksinimler | R-008, R-009 |
