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

Depodaki PNG'ler **birincil yolla** üretildi: Unity'nin OpenJDK'sı (`AndroidPlayer\OpenJDK\bin\java.exe`,
**17.0.9**) + Java2D + ImageIO, tek dosya kaynak başlatıcısıyla (JEP 330), penceresiz:

```
"<AndroidPlayer>\OpenJDK\bin\java.exe" "-Djava.awt.headless=true" ^
    is\tasokey-55\uretici\SimgeUret.java android\kabuk\res android\kabuk\res
```

(`<AndroidPlayer>` yolu `powershell -File android/yol-coz.ps1 -Json` ile çözülür — araç yolu
hiçbir betiğin içine yazılmaz.) ImageIO'nun PNG yazıcısının **gerçekten var olduğu ölçüldü**
(`com.sun.imageio.plugins.png.PNGImageWriter`); program yazıcı bulamazsa durur, sessizce yedek
yola geçmez. Ağ yok, ek paket yok.

Çizim: 108 dp tuvalin ortadaki 72 dp'si, köşe yuvarlatma kenarın %18'i, Java2D kenar yumuşatma
(`ANTIALIAS_ON` + `STROKE_PURE`), RGBA 8 bit.

**Yedek yol da duruyor ve karşılaştırıldı:** şartname §5'in yedeği (Node v22.20.0 + `zlib`, PNG
kodlayıcı elle — `uretici/cizim.mjs`, `simge-uret.mjs`) aynı XML'den aynı şekli çiziyor. İki yolun
çıktısı piksel piksel ölçüldü (`uretici/Karsilastir.java`): fark yalnız kenar yumuşatmada, kanal
farkı ortalaması ≤ 1,8/255 ve farklı piksellerin oranı %2,7-10,9 (hepsi kontur pikselleri).

## 3. Üretilen dosyaların özeti (SHA-256)

| Dosya | Ölçü | Bayt | SHA-256 |
|---|---|---|---|
| `mipmap-mdpi/ic_launcher.png` | 48×48 | 499 | `770ac2c0ac91180e1d8e8157005ce500c9faa688b743b466d3e9b7a14b6be759` |
| `mipmap-hdpi/ic_launcher.png` | 72×72 | 736 | `f9637f151abc82ea906a2e1fe745df4075c02f6d488855a651555aabde3d756f` |
| `mipmap-xhdpi/ic_launcher.png` | 96×96 | 958 | `d55564d5768b13cdb68e952da9b7f5aa826d300ec5a733898bf4f398b65c0463` |
| `mipmap-xxhdpi/ic_launcher.png` | 144×144 | 1656 | `8fd0b8a7b7f977c85c111530650fece90026cdd9ca09182aa1065fe2665059d4` |
| `mipmap-xxxhdpi/ic_launcher.png` | 192×192 | 2263 | `9d55059df5609108e3dbcf4b50a75a92ca754ffcd2a15d9920568b0e19c2be4e` |

Bu özetler **depodaki baytların** kimliğidir (dosya elle değiştirildi mi, buradan görülür).
Yeniden üretimde piksellerin aynı çıkması beklenir; sıkıştırılmış baytların aynı çıkması
**JDK sürümüne bağlıdır** (ImageIO'nun satır filtresi seçimi ve `Deflater` sürümü), yani başka bir
JDK'da SHA-256 değişebilir — o durumda karşılaştırılacak şey özet değil, ölçülen piksel ölçüsü ve
görüntüdür.

> PNG satır filtreleri: ImageIO **uyarlanır** filtre seçer (hepsi "filtre 0" değildir). PNG'leri
> okuyan bir araç yazılırsa beş filtrenin hepsi çözülmelidir; "filtre 0" varsaymak sessizce çöp
> görüntü üretir (ÖLÇÜLDÜ — `uretici/onizleme.mjs` bu yüzden düzeltildi).

## 4. Ne ölçüldü, ne ölçülmedi

Ölçüm betiği (`is/tasokey-55/olcum.mjs`) ve günlüğü (`olcum.txt`): beş PNG'nin varlığı, PNG imzası,
IHDR'den okunan ölçü (kare, 48/72/96/144/192), RGBA 8 bit, her parçanın CRC'si; `<adaptive-icon>`
kökü ve gösterdiği dosyaların varlığı; viewport 108×108 ve çizimin merkezli 66 dp güvenli daireye
sığması (ölçülen köşegen **65,378 dp**); `pathData` komut kısıtı; üç rengin `stil.css` ile eşitliği;
manifestte `icon` var / `roundIcon` yok; `uygulama_adi` iki dilde `Taş Okey`. Ölçümün gerçekten
ölçtüğü mutasyonla kanıtlandı (`is/tasokey-55/mutasyon-gunlugu.txt`).

**Kaynaklar aapt2 ile derlendi** (günlük `is/tasokey-55/aapt2-gunlugu.txt`):

```
aapt2 compile --dir android/kabuk/res -o is/tasokey-55/res-derleme.zip
```

çıkış kodu **0**, `stdout`/`stderr` **boş** (uyarı yok), 13 derlenmiş kaynak. Bu koşu gerçek bir
kusur buldu: `values/colors.xml` ilk koşuda `xml parser error: not well-formed` ile reddedildi,
çünkü XML **yorumunun** içinde iki tire yan yana duruyordu (`--masa-zemin` gibi CSS değişken
adları). Aynı kusur `AndroidManifest.xml`'de de vardı (`tasokey#54`'ten kalma, `--min-sdk-version`);
`aapt2 compile` manifesti okumadığı için o hata ancak **link** adımında çıkardı. İkisi de
düzeltildi, dokuz XML'in iyi biçimliliği JDK ayrıştırıcısıyla ölçüldü (`uretici/XmlDenetle.java`:
9 dosya, 0 bozuk) ve kural ölçüme bağlandı (`olcum.mjs` madde j).

**XML yorumlarında iki tire yazılmaz** — bu dosyadaki bütün `.xml` kaynaklar için geçerli kuraldır.

**Ölçülmedi:** simgenin **cihazda görünüşü** (APK derlenmedi, kurulmadı; `aapt2 link` çalıştırılmadı).
Bu dosyada "başlatıcıda şöyle duruyor" denebilecek bir ölçüm yoktur. Görsel beğeni Sahip'tedir.

## 5. Değiştirmek gerekirse

- **Motif/çizim değişikliği:** yalnız `ic_launcher_on.xml`'in `pathData`'sı değişir; sonra PNG'ler
  §2'deki komutla yeniden üretilir, bu dosyadaki özet tablosu tazelenir ve `aapt2 compile` yeniden
  koşturulur.
- **Renk değişikliği:** önce `docs/arayuz/stil.css` `:root` (asıl palet), sonra `colors.xml` —
  eşitliği ölçüm düşürür, yani biri unutulursa sessiz kalmaz.
- **Yeni yoğunluk/katman** (`monochrome`, `ic_launcher_round`): bu işin kapsamı dışıdır, ayrı iş.
