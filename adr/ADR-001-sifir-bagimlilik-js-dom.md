# ADR-001: Sıfır bağımlılık düz JavaScript + DOM
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 |
| Durum | **kabul** (K1, Sahip onayı 2026-11-19) |
| Karar veren | Sahip (K1) |
| Bağlam | Tarayıcıda çalışan, sunucusuz, tek kişilik 2B masa oyunu. Ofisin manifestinde ağ erişimi yok; paket kurulumu izin istemi. Testler tek komuttan çalışmak zorunda |
| Karar | ES2022 modülleriyle düz JavaScript; sunum DOM + CSS; derleme, paketleme ve dış kütüphane yok |
| Seçenekler | **B) TypeScript + Vite:** tip güvenliği ve otomatik yeniden yükleme kazandırır, ama `npm install` (ağ + izin istemi), `node_modules`, derleme adımı ve sürüm bakımı getirir — her iş bir kurulum kapısına takılabilir. **C) Phaser / Three.js:** oyun çatısı; taş dizme, metin ölçekleme ve duyarlı düzeni DOM'un bedava verdiği yerde elle yazdırır, yerel kopyalanması gereken ~1 MB kütüphane ekler, 2B masa oyunu için kazancı yok. **D) Tuval (canvas) + düz JS:** kütüphanesiz ama metin/dil/erişilebilirlik ve 4 ekran boyutunu elle çizmek gerekir |
| Sonuçlar | Kolaylaştırır: her iş kurulum beklemeden başlar; test ve ekran görüntüsü kanıtı tek komut; dağıtım = dosyaları kopyalamak. Zorlaştırır: tip denetimi yok (karşılığı: `cekirdek/` için geniş öz-test ve JSDoc tipleri), arayüz büyüdükçe elle yazılan kod artar |
| Etkilenen gereksinimler | R-001…R-010 (hepsi) |
