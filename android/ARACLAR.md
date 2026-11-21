# Android araç envanteri — tasokey

> İş: **tasokey#53** (üst iş tasokey#52) · Tarih: 2026-11-21 · Yazan: Geliştirici (ofis)
> Bu belge, APK üretiminde kullanılacak araç zincirinin **tek kaynağıdır**: hiçbir betik kendi içine
> Unity yolu, JDK yolu ya da build-tools sürümü yazmaz; hepsi [`yol-coz.ps1`](yol-coz.ps1)'den gelir
> (ADR-004'ün "komut tek yerde durur, araç sürümü ölçülür" ilkesinin Android karşılığı).
>
> **A9 (ölç, tahmin etme) gereği:** aşağıda "ölçüldü" yazan her satır bu makinede gerçekten
> çalıştırılarak alınmıştır. Unity kurulum klasörü bu işin manifestinde **yoktu** → o klasördeki
> araçların gerçek yol ve sürümleri **ölçülmedi**; §4 boş tabloyu ve ölçüm komutunu veriyor.

---

## 1. Çözücü: `android/yol-coz.ps1`

Unity'nin **Android Build Support** modülüyle gelen araç zincirini bulur, sürümlerini ölçer ve
tek bir nesne olarak verir. Ayrı bir Android SDK / JDK kurulumu gerekmez (kurulum = izin istemi).

### Unity kökünün kaynağı (sıra kesindir)

| Sıra | Kaynak | Not |
|---|---|---|
| 1 | `-UnityKok <yol>` parametresi | En yüksek öncelik |
| 2 | `TASOKEY_UNITY_KOK` ortam değişkeni | Makineye bir kez yazılır |
| 3 | Unity Hub varsayılan kurulum klasörleri | En yeni **sürüm numarası** seçilir (sözlük sırası değil); Hub'ın `secondaryInstallPath.json` ikincil yolu da taranır |

1 ya da 2 verilmiş **ama geçersizse Hub'a düşülmez**: çıkış kodu 2 ile durur ve hangi kaynağın
hangi yolu verdiğini yazar. Gerekçe: yanlış Unity ile sessizce derlemektense durmak yeğdir.

`-UnityKok` olarak Unity sürüm klasörü (`…\Hub\Editor\<sürüm>`) ya da doğrudan
`…\Editor\Data\PlaybackEngines\AndroidPlayer` klasörü verilebilir.

### Kullanım

| Amaç | Komut |
|---|---|
| İnsan okur rapor (kabul ölçütü) | `pwsh -File android/yol-coz.ps1 -Rapor` |
| Başka betiğe veri | `pwsh -File android/yol-coz.ps1 -Json` → tek satır JSON |
| Aynı oturumda nesne | `$y = & android/yol-coz.ps1` → `$y.araclar.aapt2.yol` |
| Başka API seviyesi | `… -ApiSeviyesi 34` (varsayılan **36**) |
| Build-tools sabitleme | `… -BuildTools 36.0.0` (verilmezse en yenisi) |
| Yalnız yol, sürüm ölçmeden (hızlı) | `… -SurumOlcme $false` |

> **Bu makinede `pwsh` YOK** (ölçüldü, §3). Eşdeğer komut: `powershell -File android/yol-coz.ps1 -Rapor`.
> Betik hem Windows PowerShell 5.1 hem PowerShell 7 ile çalışacak biçimde yazıldı; 5.1 ile ölçüldü,
> 7 ile **ölçülmedi** (kurulu değil).

### Çıkış kodları

| Kod | Anlamı |
|---|---|
| 0 | Bütün **zorunlu** araçlar + platform jar yerinde |
| 1 | Beklenmeyen hata (çıktıda hata metni + yığın) |
| 2 | Unity kökü bulunamadı / verilen yol geçersiz |
| 3 | Unity var ama Android Build Support (AndroidPlayer) kurulu değil |
| 4 | Zorunlu araç ya da platform jar eksik — **eksiğin adı** `EKSİK:` satırında |

---

## 2. Aranan araçlar ve beklenen yerleri

`AP` = `<UnityKok>\Editor\Data\PlaybackEngines\AndroidPlayer`.
Araç dosyası, aranan klasörde şu uzantılarla aranır: `.exe`, `.bat`, `.cmd`, `.jar`, (uzantısız) —
Unity'nin SDK'sında bazı araçlar `.exe`, bazıları `.bat` olarak gelir, bundletool bir `.jar`'dır.

| Araç | Beklenen yer | Sürüm komutu | Zorunlu | Niçin gerekli |
|---|---|---|---|---|
| `java` | `AP\OpenJDK\bin` | `-version` | evet | jar araçlarını çalıştırmak, imzalama |
| `javac` | `AP\OpenJDK\bin` | `-version` | evet | Java kaynağını derlemek (sonra d8) |
| `keytool` | `AP\OpenJDK\bin` | `-version` → **yoksa JDK sürümünden türetilir** | evet | Hata ayıklama imza anahtarı üretmek |
| `aapt2` | `AP\SDK\build-tools\<sürüm>` | `version` | evet | Kaynakları derlemek + `link` ile APK iskeleti |
| `aapt` (v1) | `AP\SDK\build-tools\<sürüm>` | `v` | hayır | Varsa `aapt add` ile dex'i APK'ya ekler |
| `d8` | `AP\SDK\build-tools\<sürüm>` | `--version` | evet | `.class` → `classes.dex` |
| `zipalign` | `AP\SDK\build-tools\<sürüm>` | sürüm bayrağı yok → **build-tools sürümünden türetilir** | evet | APK hizalama (imzalamadan önce) |
| `apksigner` | `AP\SDK\build-tools\<sürüm>` | `--version` | evet | APK imzalama (v2/v3) |
| `android.jar` | `AP\SDK\platforms\android-<API>` | — (API seviyesi) | evet | Derleme sınıf yolu |
| `bundletool` | `AP\Tools\bundletool*.jar` | `java -jar … version` | hayır | AAB üretimi; APK yolunda gerekmez |

**Türetilmiş sürüm:** `keytool` ve `zipalign` sürümünü kendisi bildirmez. Çözücü bu durumda sürümü
aynı pakettekinden türetir (`… (JDK ile aynı paket)` / `… (build-tools sürümü)`) ve bir `UYARI`
satırı yazar — rapor "sürüm basılmadı" diye boş kalmaz, ama türetilmiş olduğu görünür.

### `dex` → APK ekleme yolu

Çözücü iki yolu da yoklar ve hangisinin kullanılacağını yazar:

1. **`aapt-add`** — `aapt` (v1) varsa: `aapt add <apk> classes.dex` (Android SDK'nın kendi yolu).
2. **`zip-archive`** — yoksa .NET `System.IO.Compression.ZipFile.Open(apk, Update)` ile eklenir;
   ek program gerekmez. Bu yolun **gerçekten kullanılabildiği ölçüldü** (§3).

İkisi de yoksa `EKSİK: dex ekleme yolu` → çıkış kodu 4.

### `javac -source 8` ölçümü

`javac -source 8 -target 8 -version` çalıştırılır (geçici dosya yazmadan: seçenek doğrulaması
derlenecek dosya istemeden yapılır). Çıkış kodu 0 ve çıktıda `invalid source release` yoksa
→ `evet`. Desteklenmiyorsa rapor `hayır` der, `UYARI` yazar, ama **çıkış kodunu bozmaz**
(araç yerinde; bu bir sürüm kararıdır, eksik araç değil).

---

## 3. Ölçülenler (bu makine, 2026-11-21)

Kanıt: `is\tasokey-53\ortam-olcumu.txt`, `is\tasokey-53\ornek-rapor.txt`, `is\tasokey-53\test-gunlugu.txt`.

| Ne | Ölçülen değer |
|---|---|
| İşletim sistemi | Microsoft Windows NT 10.0.26300.0 |
| `pwsh` (PowerShell 7) | **yok** → kabul ölçütü `powershell -File …` ile doğrulandı |
| `powershell.exe` | 5.1.26100.9818 (Desktop) · `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe` |
| `node` | v22.20.0 (öz-testler buradan koşuyor) |
| `TASOKEY_UNITY_KOK` | tanımlı değil (bu makinede henüz yazılmadı) |
| `[System.IO.Compression.ZipArchiveMode]` yükleme yapmadan | çözülmüyor |
| yalnız `System.IO.Compression.**FileSystem**` yüklenince | **hâlâ çözülmüyor** |
| `System.IO.Compression` **+** `…FileSystem` yüklenince | `ZipArchiveMode` + `ZipFile` **var** |
| Öz-test | `npm test` → **491/491 geçti** (12'si bu işin yeni testi) |

**Dersler (koda yazıldı):**

- PowerShell 5.1'de dex'i APK'ya .NET ile eklemek için **iki** derleme yüklenmeli;
  yalnız `System.IO.Compression.FileSystem` yetmez. Çözücü ikisini de yükler.
- `yol-coz.ps1` **UTF-8 BOM** ile saklanır: Windows PowerShell 5.1 BOM'suz dosyayı ANSI sanıp
  Türkçe harfleri bozar. Dosyayı düzenleyen araç BOM'u düşürürse rapor metni bozulur.
- `.bat`/`.cmd` araçları (`d8.bat`, `apksigner.bat`) `CreateProcess` ile doğrudan çalıştırılamaz;
  çözücü onları `cmd.exe /d /s /c` ile çağırır. `.jar` ise `java -jar` ile.

---

## 4. ÖLÇÜLMEYENLER — Unity kurulum klasörü izni gerekiyor

tasokey#53'ün manifestinde yazma: iş klasörü + ofis klonu; okuma (ek): `D:\KraftOfis\merkez\kit`,
`D:\KraftDcm`. **Unity kurulum klasörü yok** (`unity_editor: null`, `araclar: []`) ve koruma kancası
o klasörü okumayı reddetti. Bu yüzden aşağıdaki tablo **boş bırakıldı** — tahmin yazılmadı (A9).

İzin gelince tek komut tabloyu dolduruyor:

```
powershell -File android/yol-coz.ps1 -Rapor      # pwsh kurulursa: pwsh -File …
```

| Ne | Ölçülen değer |
|---|---|
| Unity kökü (+ hangi kaynaktan) | — ölçülmedi — |
| Unity sürümü | — ölçülmedi — |
| `AndroidPlayer` yolu | — ölçülmedi — |
| `java` / `javac` / `keytool` sürümü | — ölçülmedi — |
| `javac -source 8` desteği | — ölçülmedi — |
| build-tools sürümü (seçilen + bulunanlar) | — ölçülmedi — |
| `aapt2` / `aapt` / `d8` / `zipalign` / `apksigner` sürümü | — ölçülmedi — |
| `platforms/android-36/android.jar` var mı | — ölçülmedi — (yoksa bulunan API seviyeleri raporda listelenir) |
| `bundletool` var mı, sürümü | — ölçülmedi — |
| Seçilen dex → APK yolu | — ölçülmedi — (yedek yol `zip-archive`in çalıştığı §3'te ölçüldü) |

**Manifeste yazılması gereken:** Unity kurulum klasörüne **okuma + çalıştırma**
(sürüm komutları araçları çalıştırır; başka bir yolu yok). Başka hiçbir şey gerekmiyor:
ağ yok, yazma yok, ücretli çağrı yok, cihaz yok.

---

## 5. Sınanma

`testler/android-yol-coz.test.js` (12 test, `npm test` içinde) çözücünün kendi mantığını **sahte**
bir Unity ağacıyla ölçer: araçlar, gerçek araçların çıktı biçiminde sürüm basan `.cmd` taslakları
(`testler/yardimci/android-sahte-unity.js`). Böylece testler hiçbir kuruluma bağlı değil ve CI'da
da koşar; Windows dışında kendiliğinden atlanır.

Ölçülen davranışlar: `-Rapor` tam kurulumda kod 0 + her aracın yolu ve sürümü · zorunlu araç
eksikse kod 4 + eksiğin adı · platform jar eksikse tam dosya adıyla · isteğe bağlı araç (aapt,
bundletool) eksikliği kodu bozmaz · `aapt` yoksa dex yolu `zip-archive`e döner · sürüm bildirmeyen
araçta türetme + uyarı · `-UnityKok` > ortam değişkeni > Hub sırası · geçersiz kökte kod 2, Android
modülü yoksa kod 3 · en yeni build-tools **sayısal** seçilir (`36.0.0` > `9.0.0`) · `-ApiSeviyesi`
başka seviyeye bakar.

## 6. Açık noktalar (bu işin kapsamı dışında, karar Mimar'da/Sahip'te)

- **PRD §Kapsam dışı** satırı bugün "mobil uygulama (Android/iOS native) paketi — bu iş yalnız web
  sürümünü kapsıyor" diyor. Android APK yolu açılıyorsa PRD/GDD ve bir ADR güncellenmeli;
  bu iş belge değiştirmedi (A4 kapsam disiplini).
- **Donmuş alanlar:** paket adı (firma standardı `com.kraftdcm.tasokey`), imza anahtarı, sürüm kodu,
  en düşük/hedef Android sürümü bu belgeye yazılmadı — onlar R sınıfı, Masa'da karar verilir.
- `pwsh` kurulumu bir izin istemidir; gerekmiyor (5.1 yeterli), ama kabul ölçütleri `pwsh` yazıyorsa
  komut satırı metni `powershell` olarak güncellenmeli.
- `keytool`/`zipalign` sürümünün türetilmesi yerine gerçek sürüm gerekiyorsa
  (`apksigner --version` gibi) ayrı bir ölçüm yolu aranmalı; bugün gerek görülmedi.
