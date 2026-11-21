# Android araç envanteri — tasokey

> İş: **tasokey#53** (üst iş tasokey#52) · Tarih: 2026-11-21 · Yazan: Geliştirici (ofis)
> Bu belge, APK üretiminde kullanılacak araç zincirinin **tek kaynağıdır**: hiçbir betik kendi içine
> Unity yolu, JDK yolu ya da build-tools sürümü yazmaz; hepsi [`yol-coz.ps1`](yol-coz.ps1)'den gelir.
> Android araç zincirinin mimari kararı PRD farkı onayıyla açılacak; numarası o zaman buraya yazılır.
>
> **A9 (ölç, tahmin etme) gereği:** aşağıda "ölçüldü" yazan her satır bu makinede gerçekten
> çalıştırılarak alınmıştır. Unity kurulum klasörüne okuma + araçları çalıştırma izni **verildi**
> (Sahip, 2026-11-21) → gerçek kurulumun yolları ve sürümleri de **ölçüldü**: §4.

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
| İnsan okur rapor (kabul ölçütü) | `powershell -File android/yol-coz.ps1 -Rapor` |
| Başka betiğe veri | `powershell -File android/yol-coz.ps1 -Json` → tek satır JSON |
| Aynı oturumda nesne | `$y = & android/yol-coz.ps1` → `$y.araclar.aapt2.yol` |
| Başka API seviyesi | `… -ApiSeviyesi 34` (varsayılan **36**) |
| Build-tools sabitleme | `… -BuildTools 36.0.0` (verilmezse en yenisi) |
| Yalnız yol, sürüm ölçmeden (hızlı) | `… -SurumOlcme $false` |

> **Bu makinede `pwsh` YOK** (ölçüldü, §3) ve kurulmayacak (kurulum ayrı izin istemi) → komut
> satırı `powershell -File …` olarak yazılır. Betik hem Windows PowerShell 5.1 hem PowerShell 7 ile
> çalışacak biçimde yazıldı; 5.1 ile ölçüldü, 7 ile **ölçülmedi** (kurulu değil).

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

"Sürüm komutu" sütunu **bu kurulumda ölçülen** davranışı yazar (§4): bazı araçlar sürüm bayrağını
tanımıyor, o zaman sürüm aynı paketten türetilir.

| Araç | Beklenen yer | Sürüm komutu (ölçülen davranış) | Zorunlu | Niçin gerekli |
|---|---|---|---|---|
| `java` | `AP\OpenJDK\bin` | `-version` → sürümü kendisi bildirir | evet | jar araçlarını çalıştırmak, imzalama |
| `javac` | `AP\OpenJDK\bin` | `-version` → sürümü kendisi bildirir | evet | Java kaynağını derlemek (sonra d8) |
| `keytool` | `AP\OpenJDK\bin` | `-version` → bu JDK'da bildirdi; bildirmezse **JDK sürümünden türetilir** | evet | Hata ayıklama imza anahtarı üretmek |
| `aapt2` | `AP\SDK\build-tools\<sürüm>` | `version` → sürümü kendisi bildirir | evet | Kaynakları derlemek + `link` ile APK iskeleti |
| `aapt` (v1) | `AP\SDK\build-tools\<sürüm>` | `v` → sürümü kendisi bildirir | hayır | Varsa `aapt add` ile dex'i APK'ya ekler |
| `d8` | `AP\SDK\build-tools\<sürüm>` | `--version` sürüm basmıyor → **build-tools sürümünden türetilir** | evet | `.class` → `classes.dex` |
| `zipalign` | `AP\SDK\build-tools\<sürüm>` | sürüm bayrağı yok → **build-tools sürümünden türetilir** | evet | APK hizalama (imzalamadan önce) |
| `apksigner` | `AP\SDK\build-tools\<sürüm>` | `--version` sürüm basmıyor → **build-tools sürümünden türetilir** | evet | APK imzalama (v2/v3) |
| `android.jar` | `AP\SDK\platforms\android-<API>` | — (API seviyesi) | evet | Derleme sınıf yolu |
| `bundletool` | `AP\Tools\bundletool*.jar` | `java -jar … version` → sürümü kendisi bildirir | hayır | AAB üretimi; APK yolunda gerekmez |

**Türetilmiş sürüm:** bu kurulumda `d8`, `zipalign` ve `apksigner` sürümünü kendisi bildirmedi
(ölçüldü, §4). Çözücü bu durumda sürümü aynı pakettekinden türetir
(`… (build-tools sürümü)` / `… (JDK ile aynı paket)`) ve bir `UYARI` satırı yazar — rapor
"sürüm basılmadı" diye boş kalmaz, ama türetilmiş olduğu görünür.

**Aracın bastığı yol sürüm sayılmaz:** sürüm bayrağını tanımayan araç hata satırında kendi tam
yolunu basabiliyor (`zipalign -h` böyle yapıyor); yoldaki klasör adı (Unity sürümü `6000.3.9f1`,
build-tools `36.0.0`) sürüm sanılırsa rapor **ölçülmemiş bir sayıyı** ölçülmüş gibi basar. Çözücü
sürümü aramadan önce yol taşıyan sözcükleri çıkarır (`yol-coz.ps1` → `$YOL_SOZCUGU`, tek yerde
duran kural; araca özel durum yok) ve sürüm kalmazsa türetme koluna düşer.

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

Bu kurulumda sonuç: **evet (JDK 17.0.9)** — ölçüldü, §4. Desen değişmedi; JDK 24+ `-source 8`
yerine "no longer supported" diyor ve o sürüm bu makinede **ölçülmedi** (kurulu değil) — orada
yalnız çıkış kodu kolu yakalar.

---

## 3. Ölçülenler (bu makine, 2026-11-21)

Kanıt: `is\tasokey-53\ortam-olcumu.txt`, `is\tasokey-53\ornek-rapor.txt`, `is\tasokey-53\test-gunlugu.txt`,
`is\tasokey-53\gercek-rapor-son.txt`.

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
| Öz-test | `npm test` → **492/492 geçti**, 0 atlandı (13'ü bu işin testi) |
| Çözücünün gerçek makinede koşması (`-UnityKok` geçersiz yol) | **çıkış kodu 2** + `EKSİK: Unity kökü yok: … (kaynak: -UnityKok)`; Türkçe harfler bozulmadı, ortam satırı doğru (`pwsh: yok · ZipArchive: var`). Kanıt: `is\tasokey-53\gercek-kosu-kod2.txt` |
| Çözücünün gerçek kurulumda koşması (`-UnityKok <AndroidPlayer>`) | **çıkış kodu 0**, 7/7 zorunlu araç + platform jar → §4. Kanıt: `is\tasokey-53\gercek-rapor-son.txt` |
| Ortam değişkeni ile kurulmuş araç zinciri | **yok** — `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `UNITY_HOME`, `TASOKEY_UNITY_KOK` **tanımlı değil**; araçların tek kaynağı Unity kurulumu (§4) |

**Dersler (koda yazıldı):**

- PowerShell 5.1'de dex'i APK'ya .NET ile eklemek için **iki** derleme yüklenmeli;
  yalnız `System.IO.Compression.FileSystem` yetmez. Çözücü ikisini de yükler.
- `yol-coz.ps1` **UTF-8 BOM** ile saklanır: Windows PowerShell 5.1 BOM'suz dosyayı ANSI sanıp
  Türkçe harfleri bozar. Dosyayı düzenleyen araç BOM'u düşürürse rapor metni bozulur.
- `.bat`/`.cmd` araçları (`d8.bat`, `apksigner.bat`) `CreateProcess` ile doğrudan çalıştırılamaz;
  çözücü onları `cmd.exe /d /s /c` ile çağırır. `.jar` ise `java -jar` ile.

---

## 4. Gerçek kurulum (ölçüldü 2026-11-21)

Unity kurulum klasörüne **okuma + araçları çalıştırma** izni: **verildi** (Sahip, 2026-11-21,
iş boyunca; `tasokey#53` manifest okuma listesi). Değerler tek komutla alındı — her satırın
karşılığı ham çıktıda birebir var (kanıt: `is\tasokey-53\gercek-rapor-son.txt`):

```
powershell -File android/yol-coz.ps1 -Rapor -UnityKok "C:\Program Files\Unity\Hub\Editor\6000.3.9f1\Editor\Data\PlaybackEngines\AndroidPlayer"
```

`-UnityKok` verildi çünkü `TASOKEY_UNITY_KOK` bu makinede tanımlı değil ve `setx` ile yazmak bir
sistem ayarıdır (ayrı izin istemi) — Hub kolu da aynı klasörü bulur, ölçüm o kola bağlı değil.

| Ne | Ölçülen değer |
|---|---|
| Unity kökü (+ hangi kaynaktan) | `C:\Program Files\Unity\Hub\Editor\6000.3.9f1\Editor\Data\PlaybackEngines\AndroidPlayer` [kaynak: `-UnityKok`] |
| Unity sürümü | `6000.3.9f1` (Hub kurulum klasörü adı; firma belgesiyle aynı) |
| `AndroidPlayer` yolu | `…\Hub\Editor\6000.3.9f1\Editor\Data\PlaybackEngines\AndroidPlayer` (`SDK`, `OpenJDK`, `Tools` yerinde) |
| `java` / `javac` / `keytool` sürümü | **17.0.9** / **17.0.9** / **17.0.9** (üçü de `…\AndroidPlayer\OpenJDK\bin`) |
| `javac -source 8` desteği | **evet** (`javac 17.0.9`; JDK 24+ ölçülmedi, §2) |
| build-tools sürümü (seçilen + bulunanlar) | **36.0.0** seçildi → `…\AndroidPlayer\SDK\build-tools\36.0.0`; klasör listelendi: bulunan tek sürüm **36.0.0** |
| `aapt2` / `aapt` / `d8` / `zipalign` / `apksigner` sürümü | **2.20** / **0.2** / **36.0.0 (build-tools sürümü)** / **36.0.0 (build-tools sürümü)** / **36.0.0 (build-tools sürümü)** — son üçü sürümünü bildirmiyor, `UYARI` ile türetildi |
| `platforms/android-36/android.jar` var mı | **var** → `…\AndroidPlayer\SDK\platforms\android-36\android.jar` (`-ApiSeviyesi` varsayılanı 36; kurulu platformlar: `android-34`, `android-35`, `android-36`) |
| `bundletool` var mı, sürümü | **var**, **1.17.2** → `…\AndroidPlayer\Tools\bundletool-all-1.17.2.jar` |
| Seçilen dex → APK yolu | **`aapt-add`** (aapt v1 bulundu); yedek `zip-archive` de kullanılabilir durumda (§3) |
| Sonuç / çıkış kodu | `TAMAM (7/7 zorunlu araç + platform jar)` · **çıkış kodu 0** |

Ortam satırı aynı koşuda: `PowerShell 5.1.26100.9818 · pwsh: yok · ZipArchive: var`.

**Manifest gereği:** Unity kurulum klasörüne **okuma + çalıştırma** (sürüm komutları araçları
çalıştırır; başka bir yolu yok). Başka hiçbir şey gerekmiyor: ağ yok, yazma yok, ücretli çağrı yok,
cihaz yok. Aynı izin `tasokey#54`–`#58` için de açık; o işler ölçümü yeniden yapmaz, çözücüden okur.

---

## 5. Sınanma

`testler/android-yol-coz.test.js` (13 test, `npm test` içinde) çözücünün kendi mantığını **sahte**
bir Unity ağacıyla ölçer: araçlar, gerçek araçların çıktı biçiminde sürüm basan `.cmd` taslakları
(`testler/yardimci/android-sahte-unity.js`). Böylece testler hiçbir kuruluma bağlı değil ve CI'da
da koşar; Windows dışında kendiliğinden atlanır.

Ölçülen davranışlar: `-Rapor` tam kurulumda kod 0 + her aracın yolu ve sürümü · zorunlu araç
eksikse kod 4 + eksiğin adı · platform jar eksikse tam dosya adıyla · isteğe bağlı araç (aapt,
bundletool) eksikliği kodu bozmaz · `aapt` yoksa dex yolu `zip-archive`e döner · sürüm bildirmeyen
araçta türetme + uyarı · `-UnityKok` > ortam değişkeni > Hub sırası · geçersiz kökte kod 2, Android
modülü yoksa kod 3 · en yeni build-tools **sayısal** seçilir (`36.0.0` > `9.0.0`) · `-ApiSeviyesi`
başka seviyeye bakar · **sürüm yerine kendi tam yolunu basan araçta** yoldaki klasör adı sürüm
sanılmaz, türetilir ve `UYARI` yazılır (sahte ağaç bu test için Unity Hub gibi `6000.3.9f1` adlı
klasöre kurulur — gerçek kurulumda ölçülen kusurun regresyonu).

ADR atıf koruması (`testler/adr-atif-tarama.test.js`) `android/` klasörünü ve `.ps1` uzantısını da
tarar: buradaki bir ADR atfının `MIMARI.md` §5'te karar başlığı yoksa `npm test` kırmızı yanar
(bu klasöre uydurma numaralı bir atıf koyularak elle bir kez doğrulandı — bu belge numara yazamaz,
yazdığı anda kendisi kırmızı yanar).

## 6. Açık noktalar (bu işin kapsamı dışında, karar Mimar'da/Sahip'te)

- **PRD farkı (Analist'te, paralel yürüyor):** `PRD.md` §Kapsam dışı satırı bugün "mobil uygulama
  (Android/iOS native) paketi — bu iş yalnız web sürümünü kapsıyor" diyor. Android APK yolu
  açıldığı için kapsam satırı + yeni gereksinim numarası onaya gidiyor; onay gelince Android araç
  zincirinin ADR'si `MIMARI.md`ye yazılır ve bu belgedeki atıf oraya bağlanır. Bu iş PRD/GDD/MIMARI
  dosyalarına dokunmadı (A4 kapsam disiplini).
- **Donmuş alanlar:** paket adı (firma standardı `com.kraftdcm.tasokey`), imza anahtarı, sürüm kodu,
  en düşük/hedef Android sürümü bu belgeye yazılmadı — onlar R sınıfı, Masa'da karar verilir.
- `pwsh` **kurulmayacak** (Mimar kararı; kurulum ayrı izin istemi). Kabul ölçütü metinleri
  `powershell -File …` yazar; §1 buna göre güncellendi.
- `d8`/`zipalign`/`apksigner` sürümünün türetilmesi yerine gerçek sürüm gerekiyorsa ayrı bir ölçüm
  yolu (ör. `apksigner.jar` içindeki bilgi) aranmalı; APK üretimi için gerek görülmedi.
