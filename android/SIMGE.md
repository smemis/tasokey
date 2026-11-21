# Uygulama simgesi — kaynaklar, üretim ve ölçüm

> İş: `tasokey#55` (üst iş `tasokey#52`) · 2026-11-21
> Kapsam uyarısı: Android paketi `PRD.md` §6'da hâlâ kapsam dışıdır (ADR-020 ile aynı rejim).
> Kaynaklar yazıldı ve ölçüldü; APK üretilmedi, dal `main`'e birleştirilmedi.

## 1. Dosyalar

| Dosya | Ne |
|---|---|
| `kabuk/res/drawable/ic_launcher_arka.xml` | Uyarlanır simgenin arka katmanı: 108×108 dp tek renk zemin |
| `kabuk/res/drawable/ic_launcher_on.xml` | Ön katman: okey taşı + kırmızı "1" + altındaki daire |
| `kabuk/res/mipmap-anydpi-v26/ic_launcher.xml` | `<adaptive-icon>` kökü (API 26+) |
| `kabuk/res/mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png` | API 24-25 yedeği (48/72/96/144/192 px) |
| `kabuk/res/values/colors.xml` | Üç rengin tek tanımı (`simge_arka`, `simge_tas_govde`, `simge_rakam`) |
| `kabuk/AndroidManifest.xml` | `android:icon="@mipmap/ic_launcher"` (`roundIcon` YOK) |

**Geometrinin tek kaynağı iki vektör drawable'dır.** PNG'ler oradan türetilir; PNG'ye elle rötuş
yapılmaz (yapılırsa ölçüm değil, yalnız ölçü doğru kalır — bkz. §4 sınırı). Renkler yalnız
`@color/…` ile gelir; vektörlerin içinde onaltılık değer yoktur. `colors.xml`'deki üç değer web
tarafındaki `docs/arayuz/stil.css` `:root` paletiyle birebir aynıdır (Android kaynağı CSS okuyamaz;
eşitlik kopya değil **ölçülen köprüdür**).

Ölçüler, komut kısıtı (`pathData` yalnız mutlak `M L C Z`) ve "kenar çizgisi/gölge bilerek yok"
gerekçeleri dosyaların kendi başlık yorumlarında yazılıdır. Simgenin mimari maddesi `MIMARI.md`'ye
**henüz yazılmadı** (ADR-020'ye eklenecek madde; metni `tasokey#55` şartnamesinde hazır) — o madde
yazılana kadar simgenin yazılı kuralı bu dosyadır. İlgili kararlar: ADR-020 (kabuk), ADR-011 (taş
gövdesi tek kaynak), ADR-009 (kumar çağrışımı yok: jeton/para/zar/rulet imgesi yoktur).

## 2. PNG'ler nasıl üretildi (ağsız)

Üretici program **depoda değildir** (istek böyle): `is/tasokey-55/uretici/` içinde durur ve
geometriyi yukarıdaki XML'lerden **okur** — kendi içine koordinat yazmaz.

```
node is/tasokey-55/uretici/simge-uret.mjs <depo-koku>
```

Şartnamenin birincil yolu Unity OpenJDK (`AndroidPlayer\OpenJDK\bin\java.exe`, 17.0.9) +
Java2D/ImageIO idi. O yol **çalıştırılamadı**: `tasokey#55`'in iş manifestinde dış araç çalıştırma
yetkisi yok (koruma kancası reddetti) — ImageIO yazıcısının çalışıp çalışmadığı hâlâ **ölçülmedi**.
Bu yüzden şartname §5'in **yedek yolu** kullanıldı: Node v22.20.0 + `zlib`, PNG kodlayıcı elle
(`uretici/cizim.mjs`). Ek paket yok, ağ yok. Çizim: 108 dp tuvalin ortadaki 72 dp'si, köşe
yuvarlatma kenarın %18'i, piksel başına 4×4 örnekle kenar yumuşatma, RGBA 8 bit.

## 3. Üretilen dosyaların özeti (SHA-256)

| Dosya | Ölçü | Bayt | SHA-256 |
|---|---|---|---|
| `mipmap-mdpi/ic_launcher.png` | 48×48 | 420 | `96ad5f3816e9e73ff4e750dc2a1d724e80a997298397e67edfb49c66d4096b9e` |
| `mipmap-hdpi/ic_launcher.png` | 72×72 | 552 | `c274a9680874f41517885086b215c2958ffd46a2f8356bf21da0b9810f117ee2` |
| `mipmap-xhdpi/ic_launcher.png` | 96×96 | 799 | `e65d61c2154ea65ff3106812b6e8a6c2e2f2e3b0361bde8fd4a50ce65e8043cc` |
| `mipmap-xxhdpi/ic_launcher.png` | 144×144 | 1332 | `21076996b79aae5211a302f9f9569c2bf57d1be6ae60a6a44231c57f51bd6664` |
| `mipmap-xxxhdpi/ic_launcher.png` | 192×192 | 1789 | `6bbb73db6829510f0cd57c0ef8fa048a18b3b02ebe4d5e5d22d8515ebc099be8` |

Bu özetler **depodaki baytların** kimliğidir (dosya elle değiştirildi mi, buradan görülür).
Yeniden üretimde piksellerin aynı çıkması beklenir; sıkıştırılmış baytların aynı çıkması
**zlib sürümüne bağlıdır**, yani farklı bir Node sürümünde SHA-256 değişebilir — o durumda
karşılaştırılacak şey özet değil, ölçülen piksel ölçüsü ve görüntüdür.

## 4. Ne ölçüldü, ne ölçülmedi

Ölçüm betiği (`is/tasokey-55/olcum.mjs`) ve günlüğü (`olcum.txt`): beş PNG'nin varlığı, PNG imzası,
IHDR'den okunan ölçü (kare, 48/72/96/144/192), RGBA 8 bit, her parçanın CRC'si; `<adaptive-icon>`
kökü ve gösterdiği dosyaların varlığı; viewport 108×108 ve çizimin merkezli 66 dp güvenli daireye
sığması (ölçülen köşegen **65,378 dp**); `pathData` komut kısıtı; üç rengin `stil.css` ile eşitliği;
manifestte `icon` var / `roundIcon` yok; `uygulama_adi` iki dilde `Taş Okey`. Ölçümün gerçekten
ölçtüğü mutasyonla kanıtlandı (`is/tasokey-55/mutasyon-gunlugu.txt`).

**Ölçülmedi:** `aapt2 compile` ile kaynakların derlenmesi (dış araç; izin bekliyor) ve simgenin
**cihazda görünüşü** (APK derlenmedi, kurulmadı). Bu dosyada "başlatıcıda şöyle duruyor" denebilecek
bir ölçüm yoktur. Görsel beğeni Sahip'tedir.

## 5. Değiştirmek gerekirse

- **Motif/çizim değişikliği:** yalnız `ic_launcher_on.xml`'in `pathData`'sı değişir; sonra PNG'ler
  §2'deki komutla yeniden üretilir ve bu dosyadaki özet tablosu tazelenir.
- **Renk değişikliği:** önce `docs/arayuz/stil.css` `:root` (asıl palet), sonra `colors.xml` —
  eşitliği ölçüm düşürür, yani biri unutulursa sessiz kalmaz.
- **Yeni yoğunluk/katman** (`monochrome`, `ic_launcher_round`): bu işin kapsamı dışıdır, ayrı iş.
