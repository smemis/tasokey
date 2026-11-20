# STIL: Taş Okey

> Bu belge **taslak**tır (Analist); görsel beğeni ve "his" kararı Sahip'tedir, Sahip onaylamadan kesin sayılmaz.
> 3B varlık yok (web 2B masa oyunu) — §3 bu projede uygulanmaz.

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| Sürüm | `0` (taslak) |
| Onay | Bekliyor |

## 1. Genel görünüş
Sade, geleneksel bir okey masası hissi: yeşil/koyu keçe tonunda masa zemini, gerçekçi değil ama tanınabilir taş görselleri
(sayı + renk net okunur biçimde). Kumar/kahvehane çağrışımlı öğelerden (nakit, jeton-para benzetmesi, zar/rulet imgesi)
kaçınılması **K1'de onaylandı ve bağlayıcı hale geldi** (`PRD.md` §9 Soru 6, karar A; ayrıntı §4). Kesin örnek görsel/referans
Sahip'ten beklenir — bu taslakta yok; bu kısıt dışındaki görsel beğeni kararları yine Sahip onayı ister.

## 2. Renk
| Kullanım | Renk | Not |
|---|---|---|
| Okey taşı — 4 oyun rengi | Kırmızı, siyah (ya da koyu gri), mavi, sarı | Oyunun kural renkleri; sabit, UI paletinden ayrı tutulmalı ki karışmasın |
| Okey (joker) taşı vurgusu | Ayrı bir çerçeve/ikon (renk üstüne) | Renk körlüğü erişilebilirliği için öneri — yalnız renkle ayırt etmemek |
| Masa zemini | Koyu yeşil ya da neutr koyu ton (öneri) | Taş renklerinin kontrastını bozmayacak koyuluk |
| Arayüz (düğme, menü) | Oyun taşı renklerinden bağımsız, sade nötr palet | Karışıklığı önlemek için |

## 3. 3B varlıklar
Uygulanmaz (proje 2B web arayüzü; 3B varlık planı yok).

## 4. 2B görseller ve ikonlar
- **Kumar çağrışımı yasağı (bağlayıcı madde, K1 — Sahip, 2026-11-19; `MIMARI.md` ADR-009, `PRD.md` §9 Soru 6 — karar A):**
  görselde nakit, jeton-para benzetmesi, zar/rulet imgesi ve bahis dili **kullanılmaz**; yalnız geleneksel okey taşı ve
  masa görseli. Bu bir öneri değil, V sınıfı iş 13'ün şartnamesine giren zorunlu kısıttır; dil dosyasına da bahis/kumar
  sözcüğü girmez.
- Taş görseli: sayı (1-13) büyük ve net, renk arka plan ya da taş rengiyle; sahte okey ayrı bir ikonla (ör. yonca/joker simgesi,
  `ARASTIRMA.md` §2'de geçen geleneksel gösterime yakın; yukarıdaki kumar çağrışımı yasağına uygun, zar/rulet imgesi değil).
- Gösterge taşı, atılan taş yığını, oyuncu rafı (14-15 taş) için ayrı görsel durumlar gerekir — ayrıntı Mimar/Varlık ile.
- İkon seti (çek/at/bitir düğmeleri, dil seçici TR/EN) sade, metinsiz anlaşılır ikon önerisi; her ikon dil anahtarlı etiketle desteklenmeli (sabit metin yasak).

## 5. Yazı
Lisanslı, okunurluğu yüksek bir yazı tipi (sayı ayırt edilebilirliği önemli — 6/9, 1/7 karışmamalı). Kesin yazı tipi ve lisansı
Mimar/Varlık aşamasında seçilecek; bu taslakta belirlenmedi.

## 6. Ses (varsa)
Taş çekme/atma için kısa, hafif ses efekti önerilebilir (kapatma anahtarı ile, A6 ilkesi — ayarlanabilir + kill-switch).
Müzik gerekli görülmedi (sade masa oyunu deneyimi). Kesin karar Sahip'te.

## 7. Lisans
| Varlık | Kaynak | Lisans | Belge |
|---|---|---|---|
| (henüz yok) | — | — | — |

Müzik ve görsel seçilince: lisansı belgelenmiş içerik olacak, lisans tablosu bu bölümde ve depoda güncellenecek.
