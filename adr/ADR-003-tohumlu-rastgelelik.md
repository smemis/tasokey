# ADR-003: Rastgelelik tohumlu ve enjekte edilir
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: kabul (K2 — Mimar) |
| Bağlam | Karıştırma ve bot kararları rastgele. `Math.random` doğrudan çağrılırsa hata tekrar üretilemez, test tekrarlanabilir olmaz (A9: ölç, tahmin etme) |
| Karar | `cekirdek/karma.js` içinde küçük, tohumlu bir sayı üreteci (ör. 32-bit xorshift); tohum motora **parametre olarak** verilir. Oyunda tohum `Date.now()`'dan, testte sabit sayıdan gelir. Hata raporunda tohum yazılır → el birebir yeniden oynanır |
| Seçenekler | `Math.random` (basit ama tekrar üretilemez; hata işinde "önce kırmızı test" yazılamaz) — reddedildi. `crypto.getRandomValues` (gerek yok; kumar/para yok, kriptografik rastgelelik gereksiz) |
| Sonuçlar | Her hata tohumla yeniden üretilebilir; bot koşusu tekrarlanabilir. Üretecin kendisi test edilmeli (aynı tohum → aynı dizi) |
| Etkilenen gereksinimler | R-001, R-006 |
