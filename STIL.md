# STIL: Taş Okey

> Bu belge **taslak**tır (Analist); görsel beğeni ve "his" kararı Sahip'tedir, Sahip onaylamadan kesin sayılmaz.
> 3B varlık yok (web 2B masa oyunu) — §3 bu projede uygulanmaz.
> **v0.1** (`tasokey#22`, Sahip kararı 2026-11-20): masa, ıstaka ve taş görünümü `tasarim/referans/MASA-DUZENI.md` ile
> eşitlendi (§1, §4). Yalnız belge; arayüz kodu bu işte değişmedi.
> **v0.2** (`tasokey#46`, Sahip isteği 2026-11-21): taşın çevresine çok ince, çok az görünen kenar çizgisi eklendi (§4);
> değerin tek kaynağı `arayuz/stil.css` `:root`. Görsel beğeni hâlâ Sahip'te (K4).
> **v0.3** (`tasokey#47`, Sahip isteği 2026-11-21): atılan taş alanı (köşe) iki ıstaka arasındaki boş alanı doldurur,
> atılan taş bu alanın ortasında durur (§4). Taşın kendi ölçüsü değişmedi. Görsel beğeni hâlâ Sahip'te (K4).

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| Sürüm | `0.2` (taslak; masa/ıstaka/taş görünümü Sahip kararıyla netleşti, diğer kısımlar hâlâ taslak) |
| Onay | Bekliyor (masa/ıstaka/taş görünümü hariç — bkz. v0.1 notu) |

## 1. Genel görünüş
Sade, geleneksel bir okey masası hissi: **desenli (ince dokulu) yeşil keçe** masa zemini, dışında **ahşap çerçeve**; kalın
ahşap, **iki kademeli** (alt ve üst raf) ıstaka, iki ucunda ayak/kulak (Sahip kararı, 2026-11-20 — bkz. §4). Gerçekçi değil
ama tanınabilir taş görselleri (sayı + renk net okunur biçimde). Kumar/kahvehane çağrışımlı öğelerden (nakit, jeton-para
benzetmesi, zar/rulet imgesi) kaçınılması **K1'de onaylandı ve bağlayıcı hale geldi** (`PRD.md` §9 Soru 6, karar A; ayrıntı
§4). Masa/ıstaka/taş görünümü dışındaki görsel beğeni kararları yine Sahip onayı ister.

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
- **Taş görseli (Sahip kararı, 2026-11-20 — `tasarim/referans/MASA-DUZENI.md`):** fildişi/krem gövde, hafif gölge ve
  yuvarlatılmış köşe; sayı (1-13) **kalın, düz rakam** (yedi parçalı/dijital DEĞİL — sistem yazı tipi, kalın), rakamın
  altında **aynı renkte küçük daire**. Renkler: kırmızı, mavi, siyah, sarı/turuncu. Sahte okey rakamsız, ayrı işaretli taş
  (yıldız ya da rozet) — kumar çağrışımı yasağına uygun, zar/rulet imgesi değil. Kapalı taş: ters dönmüş, gövde rengi, yüzü
  görünmez.
- **Taşın kenar çizgisi (Sahip isteği, 2026-11-21 — `tasokey#46`):** taşın çevresinde çok ince, çok az görünen tek kontur,
  gövdenin yuvarlak köşesini izler ve taşın görünen ölçüsünü büyütmez; kalınlık/renk/opaklık değerinin **tek kaynağı**
  `arayuz/stil.css` `:root` (`--tas-kenar-kalinlik` / `--tas-kenar-renk` / `--tas-kenar-opaklik`) — üç gövde varyantı
  (taş yüzü, sahte okey, kapalı taş) aynı değeri okur, SVG dosyalarına sayı yazılmaz.
- **Sahte okeyin değer yazısı (Sahip isteği, 2026-11-24 — `tasokey#82`, ADR-027):** sahte okey artık
  joker değil, o elin okey taşının renk+sayı **değerinde** bir taştır — yıldız gövdesi ve rakamsızlığı
  **korunur**, değer yıldızın üstündeki boş banda **küçük yazıyla** basılır ve yalnız o yazı değerin
  rengini alır (gövde rengi değişmez). Sarı okey çerçevesi (`tas-okey-cerceve.svg`) yalnız **gerçek**
  okeye konur. Ölçünün tek kaynağı `arayuz/stil.css` `:root` (`--tas-deger-ust` / `--tas-deger-yukseklik`
  / `--tas-deger-oran`); boyut ve yer **görsel beğenidir**, K4'te Sahip'in onayına sunulur.
- **Atılan taş alanı (Sahip isteği, 2026-11-21 — `tasokey#47`):** her köşedeki atılan taş yığınının alanı, o oyuncunun
  ıstaka satırı ile komşu kenarın ıstaka sütununun kesiştiği **boş alanı doldurur** (iki ıstaka arasında boşta kalan keçe
  yoktur); atılan taş bu alanın **ortasında** durur, adet sayacı taşın hemen altında kalır. Kural dört köşe için aynıdır
  (`MIMARI.md` ADR-010 simetrisi) ve taşın görünen ölçüsünü büyütmez.
- **Istaka görseli (Sahip kararı, 2026-11-20):** kalın ahşap, **iki kademeli** (alt ve üst raf), iki ucunda ayak/kulak; taşlar
  rafa oturur, taşlar arasında boşluk bırakılabilir.
- Gösterge taşı, köşe (atılan taş) yığınları, oyuncu rafı (14-15 taş) için ayrı görsel durumlar gerekir — ayrıntı Mimar/Varlık
  ile; yerleşim ayrıntısı `GDD.md` §6.
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
