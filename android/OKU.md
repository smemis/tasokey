# `android/` — ne var, nasıl koşar, APK nasıl yayına hazırlanır

> İş: `tasokey#57` (üst iş `tasokey#52`) · 2026-11-22 · Yazan: Geliştirici (ofis)
> **Kapsam uyarısı:** Android paketi `PRD.md` §6'da hâlâ **kapsam dışıdır** (ADR-020 ile aynı rejim:
> teknik şekil bağlayıcı, ürün kapsamı Sahip'te). PRD farkı + R numarası onaylanmadan **yayın
> derlemesi yapılmaz ve dal `main`'e birleştirilmez**. Aşağıdaki adımlar o onay geldiğinde
> izlenecek yolu yazar; bugün yalnız deneme derlemesi ve ölçüm için kullanılır.
>
> Bu klasör **gerçek kimlik, anahtar yolu, anahtar adı ve parola yazmaz**: üçü de her koşuda
> dışarıdan parametre olarak gelir (ADR-020 madde 4: paket adı ve imza **donmuş alandır**, karar
> R sınıfıdır, Masa'da verilir). Depoda izi kalmadığı her `npm test` koşusunda ölçülür
> (`testler/android-apk.test.js`).

---

## 1. Dosyalar ve sıra

| Dosya | Ne yapar | Belgesi |
|---|---|---|
| `yol-coz.ps1` | Araç zincirini (Unity içindeki SDK + JDK) bulur, sürümlerini ölçer, tek satır JSON verir | `ARACLAR.md` |
| `kabuk/` | Android kabuğu: manifest, tek `Activity`, varlık sunucusu, TR/EN dizeler, tema, simge | `SIMGE.md`, ADR-020 |
| `derle.ps1` | Tek komutla imzalı APK (+ Drive kopyası); yolları çözücüden, sürümü git'ten alır | bu dosya §3 |
| `dogrula.ps1` | Üretilmiş APK'nın **içini** ölçer: `docs/` ↔ `assets/<varlık kökü>/…` | bu dosya §4 |
| `cikti/` | Bütün ara ürünler ve APK (`.gitignore`'da; kaynak değildir, tek komutla yeniden üretilir) | — |

Sıra: **çöz → derle → doğrula**. `derle.ps1` kendi içinde `yol-coz.ps1`i çağırır; `dogrula.ps1`
bağımsızdır (araç çalıştırmaz, ağa çıkmaz, yalnız APK'yı okur).

Bu klasörde **dış derleme sistemi, uyumluluk kütüphanesi ve indirme adresi geçmez**: zincir doğrudan
araç çağrılarıdır, bütün araçlar Unity kurulumunun içinden gelir (ADR-001 sıfır bağımlılık,
ADR-020 madde 1; kuralı `testler/android-apk.test.js` tarar).

---

## 2. Hazırlık (bir kez)

| Ne | Nasıl |
|---|---|
| Araç zinciri yerinde mi | `powershell -File android/yol-coz.ps1 -Rapor` → çıkış kodu **0** beklenir |
| Unity kökü | Çözücü Unity Hub'dan bulur; başka yerdeyse `-UnityKok <yol>` ya da `TASOKEY_UNITY_KOK` ortam değişkeni |
| İmza anahtarı | Masa'da durur, depoya **girmez**; yolu ve parola dosyası komutta verilir (§3) |
| Parola dosyası | Parolayı taşıyan düz metin dosya, **BOM'suz** kaydedilir; parola hiçbir zaman komut satırına yazılmaz |

`pwsh` (PowerShell 7) bu makinede yok ve kurulmayacak; komutlar `powershell -File …` ile yazılır
(`ARACLAR.md` §3).

---

## 3. Derleme — `derle.ps1`

### Kullanım

```
powershell -File android/derle.ps1 -Kimlik <paket adı> -Anahtar <anahtar deposu> -ParolaDosyasi <parola dosyası>
```

Deneme derlemesi (ayrı uygulama olarak kurulur, Drive'a dokunmaz):

```
powershell -File android/derle.ps1 -Kimlik <paket adı> -Anahtar <anahtar deposu> -ParolaDosyasi <parola dosyası> -Deneme -DriveYok
```

### Parametreler

| Parametre | Zorunlu | Ne |
|---|---|---|
| `-Kimlik` | **evet** | Uygulama kimliği (paket adı). Betik bir varsayılan **uydurmaz** |
| `-Anahtar` | **evet** | İmza anahtar deposu dosyasının yolu |
| `-ParolaDosyasi` | **evet** | Depo parolasını taşıyan dosya; `--ks-pass file:<dosya>` olarak geçer |
| `-AnahtarAdi` | hayır | Anahtar takma adı. Verilmezse depodaki tek anahtar seçilir |
| `-AnahtarParolaDosyasi` | hayır | Anahtar parolası **ayrı** dosyada ise. Depo parolası dosyasının aynısı verilirse bayrak hiç geçmez (ölçüldü: aynı dosyadan iki satır okunur, tek satırlıda dosya sonu hatası) |
| `-UnityKok` | hayır | Doğrudan `yol-coz.ps1`e geçer |
| `-Cikti` | hayır | Çıktı klasörü. Verilmezse `android\cikti`; göreli yol **depo köküne** göre çözülür |
| `-Deneme` | hayır | Yalnız derleme anında kimliğe `.deneme`, uygulama adına ` (Deneme)` ekler. **Depoda hiçbir dosya değişmez** |
| `-DriveYok` | hayır | Drive kopyasını hiç denemez |

### Donmuş sayılar (tek kaynak `derle.ps1` ayar bloğu)

| Bayrak | Değer | Kaynak |
|---|---|---|
| `--min-sdk-version` (en düşük Android) | **24** | `derle.ps1` → `$MIN_SDK` |
| `--target-sdk-version` (hedef Android) | **36** | `derle.ps1` → `$HEDEF_SDK` |
| `-I … android-<API>` (derleme sınıf yolu) | **36** | `derle.ps1` → `$API_SEVIYESI` |

Bu üçü **donmuş alandır** (ADR-020 madde 4): depodaki manifeste yazılmaz, derleme anında bayrak
olarak geçer. Değişmesi gerekiyorsa iş **R sınıfıdır** ve karar Masa'dadır; `derle.ps1`de tek satır
değişir, bu tablo da aynı işte güncellenir (öz-test ikisinin eşitliğini ölçer).

### Sürüm kuralı — nasıl artar

| Alan | Değer | Nereden |
|---|---|---|
| Sürüm kodu (`--version-code`) | işleme sayısı | `git rev-list --count HEAD` |
| Sürüm adı (`--version-name`) | `0.<sürüm kodu>` | önek `derle.ps1` → `$SURUM_ADI_ONEKI` |

Yani **sürüm kodu depoda bir yerde yazılı değildir**: `main`e her yeni işleme girdiğinde
kendiliğinden bir artar, elle güncellenmez ve yanlışlıkla geri gitmez. Sonuçları:

- Aynı işlemeden iki kez derlerseniz **aynı** sürüm kodu çıkar (mağaza ikinci yüklemeyi reddeder) —
  yeni yükleme yeni işleme ister.
- Dal derlemesinde sayı dalın kendi geçmişinden gelir; bu yüzden `derle.ps1` HEAD `main` değilse
  **UYARI** basar ve APK'nın bir dal derlemesi olduğunu söyler. Mağazaya yalnız `main` derlemesi gider.
- `git rev-list --count HEAD` geçmiş yeniden yazılırsa (sıkıştırma, yeniden temellendirme) azalabilir;
  o durum R sınıfı bir karardır (sürüm kodu geri gitmez), Masa'da ele alınır.

### Çıkış kodları

| Kod | Anlamı |
|---|---|
| 0 | APK üretildi ve imzası doğrulandı |
| 1 | Beklenmeyen hata (çıktıda hata metni + yığın izi) |
| 2 | Parametre ya da girdi dosyası eksik/geçersiz |
| 3 | Araç zinciri eksik (çözücü 0 dışı döndü ya da `git` yok) |
| 4 | Bir derleme adımı başarısız |
| 5 | APK imzası doğrulanamadı (`apksigner verify` çıktısında `Verifies` yok) |

Drive kopyasının atlanması çıkış kodunu **bozmaz** (yalnız `UYARI` satırı yazılır).

---

## 4. Doğrulama — `dogrula.ps1`

`apksigner verify` "paket bozulmadı" der, **"oyun açılır" demez**. Bu ayrımın gerekçesi ölçülmüştür
(`tasokey#56`): APK derlendi, hizalandı, imzası doğrulandı — ama varlık girdi adları işletim sistemi
ayracıyla yazıldığı için cihazda hiçbir varlık bulunamıyordu. `dogrula.ps1` o soruyu sorar: **web
çıktısı APK'nın içine, doğru adla ve tam boyla girdi mi?**

### Kullanım

```
powershell -File android/dogrula.ps1 -Apk <apk yolu>
powershell -File android/dogrula.ps1 -Apk <apk yolu> -Web docs -Json
```

| Parametre | Zorunlu | Ne |
|---|---|---|
| `-Apk` | **evet** | Ölçülecek APK (imzalı ya da ara ürün) |
| `-Web` | hayır | Karşılaştırma kaynağı. Verilmezse depo kökündeki `docs`; göreli yol depo köküne göre çözülür |
| `-Json` | hayır | İnsan raporunun **sonuna** tek satır JSON ekler (başka betikten çağırmak için) |

### Ne ölçer

| Ölçüm | Beklenen |
|---|---|
| `docs/` dosyası ↔ `assets/<varlık kökü>/<göreli yol>` girdisi | **eksik 0** |
| Varlık alanında `docs/` karşılığı olmayan girdi | **fazla 0** |
| Sıkıştırılmamış boylar | **hepsi eşit** (eşleşen `n/n`) |
| Girdi adında ters bölü | **0** (zip adlarında ayraç yalnız `/`) |
| Aynı girdi adının iki kez bulunması | **0** |
| `classes.dex` + `AndroidManifest.xml` | **var** |
| `META-INF` imza girdisi | sayılır — **rapor satırıdır**; geçerliliği `apksigner verify` ölçer |

Varlık kökünü betik **uydurmaz**, `kabuk/java/.../VarlikSunucusu.java`daki `KOK` sabitinden okur
(ADR-020 madde 6: kabuk yalnız o kökün altından sunar). Kök değişirse doğrulama kendiliğinden yeni
köke bakar; betikte klasör adı yazılı değildir.

APK yalnız **okunur** (.NET `ZipFile::OpenRead`): girdi eklenmez, silinmez, değiştirilmez; depoya
hiçbir şey yazılmaz, hiçbir araç çalıştırılmaz, ağa çıkılmaz.

### Çıkış kodları

| Kod | Anlamı |
|---|---|
| 0 | Karşılaştırma tam: eksik 0, fazla 0, boyutlar eşit, iskelet yerinde |
| 1 | Beklenmeyen hata |
| 2 | Parametre ya da girdi eksik/geçersiz (`-Apk` yok, dosya yok, `-Web` klasörü yok, boş) |
| 3 | APK okunamadı (.NET ZipArchive yüklenemedi ya da dosya zip değil) |
| 4 | Doğrulama başarısız — `KUSUR` satırı neyin kaç tane olduğunu yazar |

Örnek (gerçek koşu, `tasokey#57`): `eşleşen 32/32 · eksik 0 · fazla 0 · boyut farkı 0` → kod 0.

---

## 5. Öz-test ile ölçülenler

`npm test` içinde, cihaz/SDK/anahtar istemeden:

| Test | Ne ölçer |
|---|---|
| `testler/android-yol-coz.test.js` | Çözücünün mantığı (sahte Unity ağacı) |
| `testler/android-kabuk.test.js` | ADR-020 maddeleri, kabuk kaynakları |
| `testler/android-simge.test.js` | Simge geometrisi, PNG ölçüleri, renk köprüsü |
| `testler/android-derle.test.js` | `derle.ps1`in kendi mantığı (davranışlı sahte araç ağacı) |
| `testler/android-apk.test.js` | `dogrula.ps1`in kendi mantığı (sentetik APK) + **depo taramaları**: anahtar/parola izi, bu klasörde dış derleme sistemi/kütüphane/indirme adresi yok, bu belgedeki donmuş sayılar `derle.ps1` ile aynı |

Windows dışında `.ps1` koşan testler kendiliğinden atlanır; depo taramaları her yerde koşar.

---

## 6. Yayın derlemesi — Masa'nın adımları

**Önce kapı:** PRD farkı + R numarası onaylı mı? Değilse yayın derlemesi yapılmaz (§ başlıktaki
kapsam uyarısı). Yayın, birleştirme ve mağaza işlemleri **Sahip'tedir**; ofis ajanı buraya kadar gelir.

1. **`main`e geç ve güncelle.** Yayın APK'sı yalnız `main`den çıkar; `derle.ps1` başka dalda UYARI basar.
2. **`npm test` yeşil** olsun (depo taramaları da burada koşar).
3. **Araç zinciri:** `powershell -File android/yol-coz.ps1 -Rapor` → kod 0.
4. **Anahtarı ve parola dosyasını** kapalı klasörden kullanılabilir yap; ikisinin yolu yalnız komut
   satırında yaşar, depoya ve günlüğe yazılmaz. Parola dosyası BOM'suz olmalı (betik BOM'luyu reddeder).
5. **Derle:** `powershell -File android/derle.ps1 -Kimlik <paket adı> -Anahtar <anahtar deposu> -ParolaDosyasi <parola dosyası> > cikti\derleme-gunlugu.txt`
   → çıkış kodu **0** ve günlüğün sonunda `SONUÇ: TAMAM`.
6. **Doğrula:** `powershell -File android/dogrula.ps1 -Apk <üretilen apk> > cikti\dogrulama-gunlugu.txt`
   → çıkış kodu **0**, `eksik 0 · fazla 0 · boyut farkı 0`.
7. **Sürümü yaz:** günlükteki sürüm kodu ve adını yayın notuna geçir (sürüm kodu = işleme sayısı, §3).
8. **Cihazda dene:** kayıtlı bir cihaza kur, oyunu aç, bir el oyna, geri tuşunu dene. Bu adım
   betikle **ölçülmez**; raporda "cihazda denendi/denenmedi" diye yazılır. Sahip'in telefonuna
   kurulum yapılmaz.
9. **Drive kopyası:** `derle.ps1` başarılı derlemeden sonra kopyayı kendisi açar (üstüne yazmaz,
   hiçbir şeyi silmez). Drive yoksa atlar ve bunu söyler — çıkış kodu bozulmaz.
10. **Mağaza yüklemesi, imza anahtarının saklanması ve sürüm notu Sahip'tedir.**

Yayın derlemesinde **`-Deneme` kullanılmaz**: deneme eki ayrı bir uygulama kimliği üretir, mağaza
sürümüyle karışmaması için yalnız elde denemek içindir.

---

## 7. Sık karşılaşılanlar

| Belirti | Sebep / çözüm |
|---|---|
| `zorunlu parametre eksik` (kod 2) | Kimlik, anahtar ya da parola dosyası verilmedi; betik varsayılan uydurmaz |
| `parola dosyası BOM taşıyor` (kod 2) | Dosyayı BOM'suz kaydedin; BOM parolanın başına üç görünmez bayt ekler |
| `araç zinciri eksik` (kod 3) | `yol-coz.ps1 -Rapor` ile eksiğin adını okuyun (Unity'nin Android modülü kurulu mu?) |
| `JAVA_HOME is not set` | Bu makinede `JAVA_HOME` yok; `derle.ps1` JDK kökünü çözücüden türetip **yalnız alt sürece** verir — sistem ayarı değiştirilmez |
| İmza doğrulanamadı (kod 5) | Anahtar/parola eşleşmiyor ya da anahtar parolası ayrı dosyada; `-AnahtarParolaDosyasi` ile **ayrı** dosya verin |
| Doğrulamada `fazla` ve `eksik` birlikte artıyor | Girdi adlarının ayracı bozuk ya da varlık kökü değişmiş — ters bölü sayısına bakın |
| Doğrulamada `boyut farkı` | APK eski bir `docs/` ile üretilmiş; yeniden derleyin (ara ürünler `cikti/` altında, silinmesi zararsız) |
| APK kuruluyor ama ekran boş | Varlık yolu sorunu: `dogrula.ps1` çalıştırın; `eksik 0 · fazla 0` değilse paketleme kusurudur, oyun değil |
