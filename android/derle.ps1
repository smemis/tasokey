<#
.SYNOPSIS
tasokey — tek komutla imzalı Android APK (+ Google Drive kopyası).

.DESCRIPTION
Web oyununu (docs/) Android kabuğuna (android/kabuk/) paketler ve imzalar. Zincir tek yerde durur:

  1. yol çözümü      android/yol-coz.ps1 -Json  → bütün araç yolları (tek kaynak; bu betik
                     kendi içine Unity/JDK/SDK yolu YAZMAZ)
  2. sürüm           git rev-list --count HEAD  → sürüm kodu, sürüm adı; dal + sayı basılır,
                     HEAD ana dal değilse UYARI yazılır
  3. aşama           docs/ → <Cikti>\asama\assets\<varlık kökü> · res/ → <Cikti>\asama\res
                     (varlık kökü VarlikSunucusu.java'daki KOK sabitinden OKUNUR)
  4. aapt2 compile   aşama res → <Cikti>\res.zip
  5. aapt2 link      -I android.jar · --min-sdk-version / --target-sdk-version ·
                     -A aşama assets · --rename-manifest-package · --custom-package ·
                     --version-code / --version-name · --java (R.java üretimi)
  6. javac           -bootclasspath android.jar -source 8 -target 8 (+ -encoding UTF-8)
  7. d8              --min-api <en düşük SDK> → classes.dex
  8. dex ekleme      aapt v1 varsa `aapt add`, yoksa .NET ZipArchive (yolu çözücü seçer)
  9. zipalign        -p 4
 10. apksigner sign  --ks / --ks-pass file: / --key-pass file: (parola komut satırında GEÇMEZ)
 11. apksigner verify  çıktıda "Verifies" aranır; yoksa betik 0 dışı kodla durur
 12. Drive kopyası   <Drive kökü>\APK\<kimlik>\<ürün>_yyyyMMdd_HHmm.apk — üstüne YAZMAZ, hiçbir
                     şeyi SİLMEZ, Drive yoksa atlar (çıkış kodunu bozmaz)

Betik kimliği, anahtarı ve parolayı KENDİSİ BELİRLEMEZ: üçü de zorunlu parametredir. Depoya
hiçbir şey yazılmaz; bütün ara ürünler -Cikti altında kalır (android/cikti/ .gitignore'dadır).

Paket adı, imza anahtarı, en düşük/hedef Android sürümü ve sürüm kodu DONMUŞ alanlardır
(ADR-020 madde 4; karar Masa'da). Bu betik onları depoya sabitlemez: kimlik parametreden,
sürüm kodu git geçmişinden, en düşük/hedef SDK aşağıdaki ayar bloğundan (iş tasokey#56 ile
verilen değerler) derleme anında bayrak olarak geçer.

.PARAMETER Kimlik
ZORUNLU. Uygulama kimliği (paket adı), ör. com.kraftdcm.tasokey. -Deneme ile `.deneme` eklenir.

.PARAMETER Anahtar
ZORUNLU. İmza anahtar deposu (.jks / .keystore) dosyasının yolu.

.PARAMETER ParolaDosyasi
ZORUNLU. Anahtar deposu parolasını taşıyan dosya (apksigner'a `--ks-pass file:` ile verilir).
Parola hiçbir zaman komut satırına yazılmaz. Dosya BOM taşıyorsa betik durur (BOM parolayı bozar).

.PARAMETER AnahtarAdi
Seçmeli. Anahtar takma adı (`--ks-key-alias`). Verilmezse apksigner depodaki tek anahtarı seçer.

.PARAMETER AnahtarParolaDosyasi
Seçmeli. Anahtar parolası dosyası — AYRI bir dosya olmalı. Verilmezse (ya da -ParolaDosyasi ile
aynı dosya gösterilirse) `--key-pass` hiç geçilmez: apksigner anahtar için depo parolasını
kullanır. Gerekçe ölçülmüştür: apksigner aynı dosyadan iki parolayı ardışık satır olarak okur,
tek satırlı dosyada "end of file reached" ile düşer (bkz. 10. adımın açıklaması).

.PARAMETER UnityKok
Seçmeli. Doğrudan android/yol-coz.ps1'e geçer (orada: parametre > TASOKEY_UNITY_KOK > Unity Hub).

.PARAMETER Cikti
Seçmeli. Çıktı klasörü. Verilmezse `android\cikti` (depo köküne göreli, .gitignore'da).
Göreli verilirse DEPO KÖKÜNE göre çözülür (çalışma klasörüne değil) — aynı komut her yerden
aynı yere yazsın.

.PARAMETER Deneme
Seçmeli. Deneme derlemesi: YALNIZ derleme anında kimliğe `.deneme`, uygulama etiketine
` (Deneme)` eklenir. Depodaki hiçbir dosya değişmez (ek, aşama kopyasına uygulanır).

.PARAMETER DriveYok
Seçmeli. Drive kopyasını hiç denemez (ofis denemelerinde böyle koşulur: G: sürücüsü yazma
kapsamı dışındadır).

.EXAMPLE
powershell -File android/derle.ps1 -Kimlik com.kraftdcm.tasokey -Anahtar <anahtar deposu> -ParolaDosyasi <parola dosyası>

Anahtarın ve parola dosyasının GERÇEK yolu burada (ve depoda hiçbir yerde) yazılı DEĞİLDİR: ikisi
de yalnız komut satırında yaşar. Kuralı `testler/android-apk.test.js` depo taramasıyla ölçer
(tasokey#57); bu örnek satır bir kez tam yol taşıdığı için yer tutucuya çevrildi.

.EXAMPLE
powershell -File android/derle.ps1 -Kimlik com.kraftdcm.tasokey -Anahtar gecici.jks -ParolaDosyasi gecici.parola -Deneme -DriveYok

.NOTES
İş: tasokey#56 (üst iş tasokey#52). Araç yolları ve ölçülen sürümler: android/ARACLAR.md.
Çıkış kodları: 0 tamam · 1 beklenmeyen hata · 2 parametre/girdi dosyası eksik ya da geçersiz ·
3 araç zinciri eksik (yol çözücü 0 dışı, git yok) · 4 derleme adımı başarısız ·
5 APK imzası doğrulanamadı.
Drive kopyasının atlanması çıkış kodunu BOZMAZ (UYARI satırı yazılır).
Bu dosya UTF-8 BOM ile saklanır: Windows PowerShell 5.1 BOM'suz dosyayı ANSI sanıp Türkçe
harfleri bozar (yol-coz.ps1 ile aynı kural).
#>

[CmdletBinding()]
param(
  [string] $Kimlik,
  [string] $Anahtar,
  [string] $ParolaDosyasi,
  [string] $AnahtarAdi,
  [string] $AnahtarParolaDosyasi,
  [string] $UnityKok,
  [string] $Cikti,
  [switch] $Deneme,
  [switch] $DriveYok
)

$ErrorActionPreference = 'Stop'

# --- Ayarlar (sihirli sayı yok; hepsi burada) ---------------------------------

# Android sürüm bayrakları: DONMUŞ alan (ADR-020 madde 4). Değerler iş tasokey#56 ile Sahip
# tarafından verildi; değişmesi gerekiyorsa burası tek satırdır ve karar R sınıfıdır (Masa'da).
$API_SEVIYESI = 36   # -I için platforms/android-<N>/android.jar
$MIN_SDK      = 24
$HEDEF_SDK    = 36

$VARSAYILAN_CIKTI = 'android\cikti'      # depo köküne göreli (.gitignore'da)
$ANA_DAL          = 'main'

$DENEME_KIMLIK_EKI = '.deneme'
$DENEME_ETIKET_EKI = ' (Deneme)'
$ETIKET_ANAHTARI   = 'uygulama_adi'      # res/values*/strings.xml içindeki uygulama adı anahtarı

$SURUM_ADI_ONEKI = '0.'                  # sürüm adı = önek + sürüm kodu (git işleme sayısı)

$HIZALAMA = 4                            # zipalign -p <hizalama>

# Drive kopyası. Kök normalde Google Drive masaüstü sürücüsüdür; ORTAM DEĞİŞKENİ ile
# değiştirilebilir (öz-test Drive kolunu gerçek G: sürücüsüne dokunmadan ölçebilsin —
# TASOKEY_UNITY_KOK ile aynı düzen).
$DRIVE_KOK_ORTAM = 'TASOKEY_DRIVE_KOK'
$DRIVE_KOK       = "G:\Drive'ım"
$DRIVE_ALT       = 'APK'
$DRIVE_ZAMAN     = 'yyyyMMdd_HHmm'
$DRIVE_EN_FAZLA  = 99                    # aynı dakikada kaç kopya adı denenir (üstüne yazmamak için)

$ZAMAN_ASIMI_MS = 900000                 # tek adım için (aapt2/javac/d8 büyük girdide yavaş olabilir)

$KOD_TAMAM     = 0
$KOD_HATA      = 1
$KOD_GIRDI     = 2
$KOD_ARAC      = 3
$KOD_ADIM      = 4
$KOD_IMZA      = 5

# Kimlik (paket adı) biçimi: en az iki parça, her parça harfle başlar.
$KIMLIK_DESENI = '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$'

$BOM = [byte[]] @(0xEF, 0xBB, 0xBF)

# Beklenmeyen (yakalanmamış) hata: günlükte hata metni + yığın izi kalsın, çıkış kodu 1 olsun.
trap {
  Write-Output ''
  Write-Output ('HATA            : beklenmeyen — ' + $_.Exception.Message)
  Write-Output $_.ScriptStackTrace
  Write-Output 'SONUÇ           : BAŞARISIZ (çıkış kodu 1)'
  exit 1
}

# --- Yollar -------------------------------------------------------------------

$KOK = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

$COZUCU        = Join-Path $PSScriptRoot 'yol-coz.ps1'
$MANIFEST_YOLU = Join-Path $PSScriptRoot 'kabuk\AndroidManifest.xml'
$RES_KOK       = Join-Path $PSScriptRoot 'kabuk\res'
$JAVA_KOK      = Join-Path $PSScriptRoot 'kabuk\java'
$WEB_KOK       = Join-Path $KOK 'docs'

# --- Yardımcılar --------------------------------------------------------------

function Yaz { param([string] $Metin = '') Write-Output $Metin }

function Baslik {
  param([string] $Metin)
  Yaz ''
  Yaz ('--- ' + $Metin + ' ' + ('-' * [Math]::Max(1, 74 - $Metin.Length)))
}

function Dur {
  param([string] $Metin, [int] $Kod)
  Yaz ''
  Yaz ('HATA            : ' + $Metin)
  Yaz ('SONUÇ           : BAŞARISIZ (çıkış kodu ' + $Kod + ')')
  exit $Kod
}

function ArgDizesi {
  param([string[]] $Argumanlar)
  if (-not $Argumanlar -or $Argumanlar.Count -eq 0) { return '' }
  $parcalar = @()
  foreach ($a in $Argumanlar) {
    if ($a -match '[\s"]') { $parcalar += ('"' + ($a -replace '"', '\"') + '"') } else { $parcalar += $a }
  }
  return ' ' + ($parcalar -join ' ')
}

<# Dış süreç çalıştırır; stdout+stderr'i tek metin, çıkış kodunu sayı olarak verir.
   .NET Process kullanılır: PowerShell 5.1'de yerel komutun 2>&1 yönlendirmesi ErrorRecord üretip
   $? değerini bozuyor. .bat/.cmd cmd.exe ile, .jar java ile çalıştırılır (CreateProcess toplu iş
   dosyasını doğrudan çalıştıramaz — yol-coz.ps1'de ölçüldü). Yalnız kendi başlattığı süreci,
   zaman aşımında nesne üzerinden kapatır (ada göre kapatma yok). #>
$script:JavaHome = ''

function Calistir {
  param(
    [string]   $Yol,
    [string[]] $Argumanlar = @(),
    [string]   $CalismaDizini = '',
    [string]   $JavaYolu = ''
  )
  $uzanti = [System.IO.Path]::GetExtension($Yol).ToLowerInvariant()
  $bilgi = New-Object System.Diagnostics.ProcessStartInfo

  if ($uzanti -eq '.bat' -or $uzanti -eq '.cmd') {
    $icKomut = '"' + $Yol + '"' + (ArgDizesi $Argumanlar)
    $bilgi.FileName = (Join-Path $env:SystemRoot 'System32\cmd.exe')
    $bilgi.Arguments = '/d /s /c "' + $icKomut + '"'
  }
  elseif ($uzanti -eq '.jar') {
    if (-not $JavaYolu) { return @{ kod = -1; cikti = 'java bulunamadı (jar çalıştırılamaz)' } }
    $bilgi.FileName = $JavaYolu
    $bilgi.Arguments = '-jar ' + (ArgDizesi @($Yol)).Trim() + (ArgDizesi $Argumanlar)
  }
  else {
    $bilgi.FileName = $Yol
    $bilgi.Arguments = (ArgDizesi $Argumanlar).Trim()
  }

  $bilgi.UseShellExecute = $false
  $bilgi.RedirectStandardOutput = $true
  $bilgi.RedirectStandardError = $true
  $bilgi.CreateNoWindow = $true

  # JAVA_HOME YALNIZ bu alt sürecin ortamına yazılır (sistem/kullanıcı ayarı DEĞİŞTİRİLMEZ).
  # ÖLÇÜLDÜ (tasokey#56, gerçek kurulum): `d8.bat` ve `apksigner.bat` java'yı JAVA_HOME ya da
  # PATH'te arıyor; bu makinede ikisi de yok (android/ARACLAR.md §3) → "ERROR: JAVA_HOME is not
  # set and no 'java' command could be found" ile düşüyorlardı. Değer çözücünün bulduğu JDK'dır.
  if ($script:JavaHome) { $bilgi.EnvironmentVariables['JAVA_HOME'] = $script:JavaHome }

  if ($CalismaDizini -and (Test-Path -LiteralPath $CalismaDizini -PathType Container)) {
    $bilgi.WorkingDirectory = $CalismaDizini
  }
  else { $bilgi.WorkingDirectory = $KOK }

  $surec = $null
  try {
    $surec = [System.Diagnostics.Process]::Start($bilgi)
    $cikisGorev = $surec.StandardOutput.ReadToEndAsync()
    $hataGorev  = $surec.StandardError.ReadToEndAsync()
    if (-not $surec.WaitForExit($ZAMAN_ASIMI_MS)) {
      try { $surec.Kill() } catch { }
      return @{ kod = -1; cikti = 'ZAMAN AŞIMI' }
    }
    $metin = (($cikisGorev.Result + "`n" + $hataGorev.Result) -replace "`r", '').Trim()
    return @{ kod = $surec.ExitCode; cikti = $metin }
  }
  catch {
    return @{ kod = -1; cikti = ('çalıştırılamadı: ' + $_.Exception.Message) }
  }
  finally {
    if ($surec) { $surec.Dispose() }
  }
}

<# Bir zincir adımı: komutu günlüğe yazar, çalıştırır, çıktısını basar; çıkış kodu 0 değilse
   betiği durdurur. Günlük "ne çalıştırıldı, ne döndü" dışında bir şey saklamaz.

   Sonuç DÖNDÜRÜLMEZ, $script:SonCikti / $script:SonKod'a yazılır: günlük satırları başarı
   akışına (Write-Output) gidiyor, dönüş değeri kullanılsa günlük de dönüş değerine karışırdı
   (`$x = AdimKos …` günlüğü yutar). Günlüğün akışta kalması gerekiyor ki çağıran taraf
   `> gunluk.txt` ile betiğin TAM çıktısını alabilsin. #>
$script:SonKod = 0
$script:SonCikti = ''

function AdimKos {
  param(
    [string]   $Ad,
    [string]   $Yol,
    [string[]] $Argumanlar,
    [string]   $CalismaDizini = '',
    [int]      $HataKodu = 0
  )
  if ($HataKodu -eq 0) { $HataKodu = $KOD_ADIM }
  if (-not $Yol) { Dur ($Ad + ': araç yolu boş (yol çözücü aracı bulamadı)') $KOD_ARAC }
  Yaz ('$ ' + $Yol + (ArgDizesi $Argumanlar))
  $s = Calistir -Yol $Yol -Argumanlar $Argumanlar -CalismaDizini $CalismaDizini
  $script:SonKod = $s.kod
  $script:SonCikti = $s.cikti
  if ($s.cikti) { foreach ($satir in ($s.cikti -split "`n")) { Yaz ('  | ' + $satir) } }
  Yaz ('  → çıkış kodu ' + $s.kod)
  if ($s.kod -ne 0) { Dur ($Ad + ' başarısız (çıkış kodu ' + $s.kod + ')') $HataKodu }
}

function DosyaOku {
  param([string] $Yol)
  return [System.IO.File]::ReadAllText($Yol, [System.Text.UTF8Encoding]::new($false))
}

function DosyaYaz {
  param([string] $Yol, [string] $Metin)
  [System.IO.File]::WriteAllText($Yol, $Metin, [System.Text.UTF8Encoding]::new($false))
}

function KlasorKur {
  param([string] $Yol)
  if (-not (Test-Path -LiteralPath $Yol -PathType Container)) {
    $null = New-Item -ItemType Directory -Path $Yol -Force
  }
}

<# Ara ürünü temizler. YALNIZ bu betiğin ürettiği, adı bilinen yollar silinir ve her biri
   -Cikti'nin ALTINDA olmak zorundadır; bilinmeyen içerik hiçbir koşulda silinmez. #>
function AraUrunuSil {
  param([string] $Yol, [string] $CiktiKok)
  $tam = [System.IO.Path]::GetFullPath($Yol)
  $kokTam = [System.IO.Path]::GetFullPath($CiktiKok).TrimEnd('\') + '\'
  if (-not $tam.StartsWith($kokTam, [StringComparison]::OrdinalIgnoreCase)) {
    Dur ('silinecek ara ürün çıktı klasörünün altında değil: ' + $tam) $KOD_HATA
  }
  if (Test-Path -LiteralPath $tam) { Remove-Item -LiteralPath $tam -Recurse -Force -Confirm:$false }
}

function JavaSurumunuBul {
  param($Envanter)
  if ($Envanter.araclar.java -and $Envanter.araclar.java.yol) { return $Envanter.araclar.java.yol }
  return ''
}

# .NET sıkıştırma derlemeleri: APK içeriğini okumak ve (aapt v1 yoksa) dex eklemek için.
# PowerShell 5.1'de İKİ derleme gerekir; yalnız FileSystem yetmez (yol-coz.ps1'de ölçüldü).
function ZipHazir {
  try {
    foreach ($derleme in @('System.IO.Compression', 'System.IO.Compression.FileSystem')) {
      try { Add-Type -AssemblyName $derleme -ErrorAction Stop } catch { }
    }
    $null = [System.IO.Compression.ZipArchiveMode]::Update
    $null = [System.IO.Compression.ZipFile]
    return $true
  }
  catch { return $false }
}

<# APK girdi adlarındaki ters bölüyü bölüye çevirir ve çevrilen sayısını verir (-1: ZipArchive yok).

   ÖLÇÜLDÜ (tasokey#56, gerçek kurulum, üç ayrı okuyucuyla — aapt v1 `list`, .NET ZipArchive ve
   kendi okuyucumuz): `aapt2 link -A <klasör>` Windows'ta alt klasörlü varlıkları İŞLETİM SİSTEMİ
   ayracıyla yazıyor → `assets/oyun\arayuz\ekran.js`. Zip adlarında ayraç her zaman `/` olmak
   zorundadır; cihazda AssetManager `oyun/arayuz/ekran.js` arar ve HİÇBİR varlığı bulamaz
   (APK derlenir, imza doğrulanır, oyun açılmaz — sessiz kusur). Bu yüzden adlar link'ten sonra
   düzeltilir; Linux'ta ayraç zaten `/` olduğu için bu adım hiçbir şey yapmaz. #>
function ApkGirdileriniNormalize {
  param([string] $Apk)
  if (-not (ZipHazir)) { return -1 }
  $sayi = 0
  $arsiv = $null
  try {
    $arsiv = [System.IO.Compression.ZipFile]::Open($Apk, [System.IO.Compression.ZipArchiveMode]::Update)
    $bozuklar = @($arsiv.Entries | Where-Object { $_.FullName.Contains('\') })
    foreach ($girdi in $bozuklar) {
      $yeniAd = $girdi.FullName.Replace('\', '/')
      $bellek = New-Object System.IO.MemoryStream
      $oku = $girdi.Open()
      try { $oku.CopyTo($bellek) } finally { $oku.Dispose() }
      $veri = $bellek.ToArray()
      $bellek.Dispose()
      $girdi.Delete()
      $yeni = $arsiv.CreateEntry($yeniAd)
      $yaz = $yeni.Open()
      try { $yaz.Write($veri, 0, $veri.Length) } finally { $yaz.Dispose() }
      $sayi++
    }
  }
  finally { if ($arsiv) { $arsiv.Dispose() } }
  return $sayi
}

<# Adında ters bölü taşıyan girdi sayısı (-1: okunamadı). Düzeltmenin ölçümü. #>
function ApkTersBoluluSayisi {
  param([string] $Apk)
  if (-not (ZipHazir)) { return -1 }
  $arsiv = $null
  try {
    $arsiv = [System.IO.Compression.ZipFile]::OpenRead($Apk)
    return @($arsiv.Entries | Where-Object { $_.FullName.Contains('\') }).Count
  }
  catch { return -1 }
  finally { if ($arsiv) { $arsiv.Dispose() } }
}

function ApkIcinde {
  param([string] $Apk, [string] $Girdi)
  if (-not (ZipHazir)) { return $null }
  $arsiv = $null
  try {
    $arsiv = [System.IO.Compression.ZipFile]::OpenRead($Apk)
    foreach ($g in $arsiv.Entries) { if ($g.FullName -eq $Girdi) { return $true } }
    return $false
  }
  catch { return $null }
  finally { if ($arsiv) { $arsiv.Dispose() } }
}

# --- 0) Parametre denetimi -----------------------------------------------------

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

Yaz '=== tasokey Android derlemesi (android/derle.ps1) ==='
Yaz ('Depo kökü       : ' + $KOK)
Yaz ('Zaman           : ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))

$eksikParametreler = @()
if (-not $Kimlik)        { $eksikParametreler += '-Kimlik' }
if (-not $Anahtar)       { $eksikParametreler += '-Anahtar' }
if (-not $ParolaDosyasi) { $eksikParametreler += '-ParolaDosyasi' }
if ($eksikParametreler.Count -gt 0) {
  # PowerShell'in kendi Mandatory istemi başsız koşuda okunacak girdi bulamaz; bu yüzden
  # zorunluluk burada ölçülür: eksiğin ADI basılır ve betik 0 dışı kodla durur.
  Dur ('zorunlu parametre eksik: ' + ($eksikParametreler -join ', ') +
    ' (betik kimliği, anahtarı ve parolayı kendisi belirlemez)') $KOD_GIRDI
}

if ($Kimlik -notmatch $KIMLIK_DESENI) {
  Dur ('-Kimlik geçerli bir paket adı değil: ' + $Kimlik) $KOD_GIRDI
}
if (-not (Test-Path -LiteralPath $Anahtar -PathType Leaf)) {
  Dur ('-Anahtar dosyası yok: ' + $Anahtar) $KOD_GIRDI
}
if (-not (Test-Path -LiteralPath $ParolaDosyasi -PathType Leaf)) {
  Dur ('-ParolaDosyasi dosyası yok: ' + $ParolaDosyasi) $KOD_GIRDI
}
if ($AnahtarParolaDosyasi -and -not (Test-Path -LiteralPath $AnahtarParolaDosyasi -PathType Leaf)) {
  Dur ('-AnahtarParolaDosyasi dosyası yok: ' + $AnahtarParolaDosyasi) $KOD_GIRDI
}

# Parola dosyasında BOM: apksigner `file:` kaynağını baytıyla okur, BOM parolanın başına üç
# görünmez bayt ekler → imzalama "keystore password incorrect" ile düşer. Sessiz tuzak olmasın.
foreach ($pd in @($ParolaDosyasi, $AnahtarParolaDosyasi)) {
  if (-not $pd) { continue }
  $bas = [System.IO.File]::ReadAllBytes($pd)
  if ($bas.Length -ge 3 -and $bas[0] -eq $BOM[0] -and $bas[1] -eq $BOM[1] -and $bas[2] -eq $BOM[2]) {
    Dur ('parola dosyası BOM taşıyor (parolayı bozar, BOM''suz kaydedin): ' + $pd) $KOD_GIRDI
  }
  if ($bas.Length -eq 0) { Dur ('parola dosyası boş: ' + $pd) $KOD_GIRDI }
}

foreach ($gerekli in @($COZUCU, $MANIFEST_YOLU, $RES_KOK, $JAVA_KOK, $WEB_KOK)) {
  if (-not (Test-Path -LiteralPath $gerekli)) { Dur ('depoda eksik: ' + $gerekli) $KOD_GIRDI }
}

if (-not $Cikti) { $Cikti = $VARSAYILAN_CIKTI }
if ([System.IO.Path]::IsPathRooted($Cikti)) { $CiktiKok = [System.IO.Path]::GetFullPath($Cikti) }
else { $CiktiKok = [System.IO.Path]::GetFullPath((Join-Path $KOK $Cikti)) }
if ($CiktiKok.TrimEnd('\') -eq $KOK.TrimEnd('\')) {
  Dur '-Cikti depo köküne eşit olamaz (ara ürün temizliği depoyu silemez)' $KOD_GIRDI
}

$etkinKimlik = $Kimlik
if ($Deneme) { $etkinKimlik = $Kimlik + $DENEME_KIMLIK_EKI }

# Manifestteki paket adı: üretilen R.java'nın Java paketi (--custom-package) buradan gelir;
# kabuk kaynakları o paketin içinde durur, bu yüzden betik bir ad UYDURMAZ, manifestten okur.
$manifestMetni = DosyaOku $MANIFEST_YOLU
$temelPaketEs = [regex]::Match($manifestMetni, 'package="([^"]+)"')
if (-not $temelPaketEs.Success) { Dur ('AndroidManifest.xml''de package="…" yok: ' + $MANIFEST_YOLU) $KOD_GIRDI }
$temelPaket = $temelPaketEs.Groups[1].Value
$urunOneki = ($temelPaket -split '\.')[-1]

# Varlık kökü (APK içindeki assets/<kök>/): tek kaynak VarlikSunucusu.java'daki KOK sabitidir —
# kabuk varlıkları yalnız o kökün altından sunar (ADR-020 madde 6). Betik bir klasör adı
# uydurursa APK derlenir, imza doğrulanır ama oyun cihazda 404 verir; o yüzden ad OKUNUR.
$sunucuDosyasi = @(Get-ChildItem -LiteralPath $JAVA_KOK -Recurse -File -Filter 'VarlikSunucusu.java' -ErrorAction SilentlyContinue)
if ($sunucuDosyasi.Count -ne 1) { Dur 'VarlikSunucusu.java tek dosya olarak bulunamadı (varlık kökü okunamıyor)' $KOD_GIRDI }
$varlikKokEs = [regex]::Match((DosyaOku $sunucuDosyasi[0].FullName), 'static\s+final\s+String\s+KOK\s*=\s*"([^"]+)"')
if (-not $varlikKokEs.Success) { Dur ('VarlikSunucusu.java''da KOK sabiti okunamadı: ' + $sunucuDosyasi[0].FullName) $KOD_GIRDI }
$varlikKoku = $varlikKokEs.Groups[1].Value

Yaz ('Çıktı klasörü   : ' + $CiktiKok)
Yaz ('Kimlik          : ' + $etkinKimlik + $(if ($Deneme) { '  (-Deneme: ' + $Kimlik + ' + ' + $DENEME_KIMLIK_EKI + ')' } else { '' }))
Yaz ('R.java paketi   : ' + $temelPaket + '  [AndroidManifest.xml]')
Yaz ('Varlık kökü     : assets/' + $varlikKoku + '  [VarlikSunucusu.java → KOK]')

# --- 1) Yol çözümü -------------------------------------------------------------

Baslik '1/12 yol çözümü (android/yol-coz.ps1)'

$kabukAdi = 'powershell.exe'
if ($PSVersionTable.PSEdition -eq 'Core') { $kabukAdi = 'pwsh.exe' }
$kabukYolu = Join-Path $PSHOME $kabukAdi
if (-not (Test-Path -LiteralPath $kabukYolu -PathType Leaf)) {
  Dur ('kendi PowerShell kabuğu bulunamadı: ' + $kabukYolu) $KOD_ARAC
}

$cozucuArglari = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $COZUCU, '-Json',
  '-ApiSeviyesi', [string] $API_SEVIYESI)
if ($UnityKok) { $cozucuArglari += @('-UnityKok', $UnityKok) }

Yaz ('$ ' + $kabukYolu + (ArgDizesi $cozucuArglari))
$cozum = Calistir -Yol $kabukYolu -Argumanlar $cozucuArglari
$jsonSatiri = ($cozum.cikti -split "`n" | Where-Object { $_.TrimStart().StartsWith('{') } | Select-Object -First 1)
if (-not $jsonSatiri) {
  Yaz ('  | ' + $cozum.cikti)
  Dur 'yol çözücü JSON basmadı' $KOD_ARAC
}
$araclar = $jsonSatiri | ConvertFrom-Json
Yaz ('  → çıkış kodu ' + $cozum.kod)
if ($cozum.kod -ne 0) {
  Yaz ('  | EKSİK: ' + (($araclar.eksikler) -join ', '))
  Dur ('araç zinciri eksik (yol çözücü çıkış kodu ' + $cozum.kod + '): ' + (($araclar.eksikler) -join ', ')) $KOD_ARAC
}

$aapt2     = $araclar.araclar.aapt2.yol
$javacYolu = $araclar.araclar.javac.yol
$d8Yolu    = $araclar.araclar.d8.yol
$zipalign  = $araclar.araclar.zipalign.yol
$apksigner = $araclar.araclar.apksigner.yol
$aaptV1    = $araclar.araclar.aapt.yol
$platformJar = $araclar.platformJar
$javaYolu  = JavaSurumunuBul $araclar

# JDK kökü (`…\OpenJDK`): java'nın yolundan türer, ayrıca yazılmaz (tek kaynak yol çözücü).
if ($javaYolu) {
  $script:JavaHome = Split-Path -Parent (Split-Path -Parent $javaYolu)
}
if (-not $script:JavaHome) { Dur 'java bulunamadı (JAVA_HOME türetilemiyor, d8/apksigner çalışmaz)' $KOD_ARAC }

Yaz ('  Unity kökü    : ' + $araclar.unityKok + '  [kaynak: ' + $araclar.kaynak + ']')
Yaz ('  JAVA_HOME     : ' + $script:JavaHome + '  (yalnız alt süreçlere verilir)')
Yaz ('  build-tools   : ' + $araclar.buildToolsSurum)
Yaz ('  platform jar  : ' + $platformJar)
Yaz ('  dex → APK     : ' + $araclar.dexEklemeYolu)

# --- 2) Sürüm ------------------------------------------------------------------

Baslik '2/12 sürüm (git)'

$gitKomut = (Get-Command git -ErrorAction SilentlyContinue)
if (-not $gitKomut) { Dur 'git bulunamadı (sürüm kodu git işleme sayısından gelir)' $KOD_ARAC }
$gitYolu = $gitKomut.Source

AdimKos -Ad 'git rev-list' -Yol $gitYolu -Argumanlar @('rev-list', '--count', 'HEAD') -CalismaDizini $KOK -HataKodu $KOD_ARAC
$sayimCiktisi = $script:SonCikti
$surumKodu = 0
if (-not [int]::TryParse($sayimCiktisi.Trim(), [ref] $surumKodu) -or $surumKodu -le 0) {
  Dur ('git işleme sayısı okunamadı: ' + $sayimCiktisi) $KOD_ARAC
}
$dalSonuc = Calistir -Yol $gitYolu -Argumanlar @('rev-parse', '--abbrev-ref', 'HEAD') -CalismaDizini $KOK
$dal = $dalSonuc.cikti.Trim()
$surumAdi = $SURUM_ADI_ONEKI + $surumKodu

Yaz ('  Dal           : ' + $dal)
Yaz ('  Sürüm kodu    : ' + $surumKodu + '   (git rev-list --count HEAD)')
Yaz ('  Sürüm adı     : ' + $surumAdi)
$dalUyarisi = ''
if ($dal -ne $ANA_DAL) {
  $dalUyarisi = ('HEAD ''' + $ANA_DAL + ''' değil (' + $dal + ') → bu APK bir DAL derlemesidir')
  Yaz ('  UYARI         : ' + $dalUyarisi)
}

# --- 3) Aşama ------------------------------------------------------------------

Baslik '3/12 aşama (docs → assets, res kopyası)'

$asama       = Join-Path $CiktiKok 'asama'
$asamaVarlik = Join-Path $asama 'assets'
$asamaRes    = Join-Path $asama 'res'
$resZip      = Join-Path $CiktiKok 'res.zip'
$genKok      = Join-Path $CiktiKok 'gen'
$sinifKok    = Join-Path $CiktiKok 'sinif'
$dexKok      = Join-Path $CiktiKok 'dex'
$temelApk    = Join-Path $CiktiKok 'temel.apk'
$hizaliApk   = Join-Path $CiktiKok 'hizali.apk'
$imzaliAd    = $urunOneki + '-' + $surumAdi + $(if ($Deneme) { '-deneme' } else { '' }) + '.apk'
$imzaliApk   = Join-Path $CiktiKok $imzaliAd

KlasorKur $CiktiKok
foreach ($ara in @($asama, $genKok, $sinifKok, $dexKok, $resZip, $temelApk, $hizaliApk, $imzaliApk)) {
  AraUrunuSil $ara $CiktiKok
}
# $asamaRes ve $varlikHedefi BİLEREK açılmaz: Copy-Item -Recurse var olan bir hedefe kaynak
# klasörü İÇİNE kopyalar (res\res\values…), olmayan hedefe ise kaynağın kendisi olarak.
foreach ($yeni in @($asamaVarlik, $genKok, $sinifKok, $dexKok)) { KlasorKur $yeni }

$varlikHedefi = Join-Path $asamaVarlik $varlikKoku
Yaz ('  docs/         → ' + $varlikHedefi)
Copy-Item -LiteralPath $WEB_KOK -Destination $varlikHedefi -Recurse -Force
Yaz ('  kabuk/res/    → ' + $asamaRes)
Copy-Item -LiteralPath $RES_KOK -Destination $asamaRes -Recurse -Force

# Web çıktısı gerçekten aşamaya girdi mi: giriş sayfası yoksa APK derlenir ama oyun açılmaz.
$girisSayfasi = Join-Path $varlikHedefi 'index.html'
if (-not (Test-Path -LiteralPath $girisSayfasi -PathType Leaf)) {
  Dur ('web çıktısı aşamaya kopyalanmadı (giriş sayfası yok): ' + $girisSayfasi) $KOD_ADIM
}
$varlikSayisi = @(Get-ChildItem -LiteralPath $varlikHedefi -Recurse -File).Count
Yaz ('  varlık dosyası: ' + $varlikSayisi)

if ($Deneme) {
  # Deneme eki YALNIZ aşama kopyasına uygulanır: depodaki strings.xml dosyaları değişmez.
  $etiketDosyalari = @(Get-ChildItem -LiteralPath $asamaRes -Recurse -File -Filter 'strings.xml')
  if ($etiketDosyalari.Count -eq 0) { Dur 'aşama kopyasında strings.xml bulunamadı (deneme etiketi yazılamaz)' $KOD_ADIM }
  $deseni = '(<string name="' + [regex]::Escape($ETIKET_ANAHTARI) + '">)([^<]*)(</string>)'
  foreach ($dosya in $etiketDosyalari) {
    $metin = DosyaOku $dosya.FullName
    if ($metin -notmatch $deseni) {
      Dur ($ETIKET_ANAHTARI + ' anahtarı yok: ' + $dosya.FullName) $KOD_ADIM
    }
    $yeni = [regex]::Replace($metin, $deseni, ('${1}${2}' + $DENEME_ETIKET_EKI + '${3}'))
    DosyaYaz $dosya.FullName $yeni
    # Günlüğe YAZILAN HÂL basılır; ek burada bir daha eklenmez (ilk sürümde iki kez görünüyordu).
    Yaz ('  etiket eki    : ' + $dosya.Directory.Name + '/strings.xml → "' +
      [regex]::Match($yeni, $deseni).Groups[2].Value + '"')
  }
}

# --- 4) aapt2 compile ----------------------------------------------------------

Baslik '4/12 aapt2 compile (kaynaklar)'
AdimKos -Ad 'aapt2 compile' -Yol $aapt2 -Argumanlar @('compile', '--dir', $asamaRes, '-o', $resZip)
if (-not (Test-Path -LiteralPath $resZip -PathType Leaf)) { Dur ('derlenmiş kaynak zip''i oluşmadı: ' + $resZip) $KOD_ADIM }

# --- 5) aapt2 link -------------------------------------------------------------

Baslik '5/12 aapt2 link (APK iskeleti + R.java)'
$linkArglari = @(
  'link',
  '-o', $temelApk,
  '-I', $platformJar,
  '--manifest', $MANIFEST_YOLU,
  '-A', $asamaVarlik,
  '--min-sdk-version', [string] $MIN_SDK,
  '--target-sdk-version', [string] $HEDEF_SDK,
  '--version-code', [string] $surumKodu,
  '--version-name', $surumAdi,
  '--rename-manifest-package', $etkinKimlik,
  '--custom-package', $temelPaket,
  '--java', $genKok,
  $resZip
)
AdimKos -Ad 'aapt2 link' -Yol $aapt2 -Argumanlar $linkArglari
if (-not (Test-Path -LiteralPath $temelApk -PathType Leaf)) { Dur ('APK iskeleti oluşmadı: ' + $temelApk) $KOD_ADIM }

# Varlık girdi adlarındaki ayracı düzelt (gerekçe: ApkGirdileriniNormalize açıklaması).
$duzeltilen = ApkGirdileriniNormalize $temelApk
if ($duzeltilen -lt 0) {
  Dur 'APK girdi adları düzeltilemedi (.NET ZipArchive yok); varlık yolları cihazda bulunamaz' $KOD_ADIM
}
Yaz ('  girdi adı düzeltildi: ' + $duzeltilen + ' (ters bölü → bölü)')
$kalanTersBolu = ApkTersBoluluSayisi $temelApk
if ($kalanTersBolu -ne 0) {
  Dur ('APK''da hâlâ ters bölülü girdi var: ' + $kalanTersBolu) $KOD_ADIM
}
Yaz '  ölçüldü       : APK girdi adlarında ters bölü yok'

# --- 6) javac ------------------------------------------------------------------

Baslik '6/12 javac (kabuk + üretilen R.java)'
$kaynaklar = @(Get-ChildItem -LiteralPath $JAVA_KOK -Recurse -File -Filter '*.java' | ForEach-Object { $_.FullName })
$uretilen  = @(Get-ChildItem -LiteralPath $genKok -Recurse -File -Filter 'R.java' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
if ($kaynaklar.Count -eq 0) { Dur ('kabuk Java kaynağı yok: ' + $JAVA_KOK) $KOD_ADIM }
if ($uretilen.Count -eq 0) { Dur ('aapt2 link R.java üretmedi: ' + $genKok) $KOD_ADIM }

# -encoding UTF-8: kaynaklar UTF-8, Windows'un varsayılan kod sayfası değil (Türkçe açıklamalar
# ve dizeler bozulmasın).
#
# android.jar SINIF YOLUNDA (-classpath), ÖNYÜKLEME yolunda (-bootclasspath) DEĞİL — ÖLÇÜLDÜ
# (tasokey#56, gerçek kurulum): android-36/android.jar içinde `java/lang/invoke/
# LambdaMetafactory.class` YOKTUR (jar listelendi), bu yüzden -bootclasspath ile derlerken
# kabuğun lambda kullanan satırı "Unable to find method metafactory" ile düşüyor. Lambda'nın
# cihazdaki karşılığını zaten d8 üretir (şekere indirgeme); javac'ın derleme anında JDK'nın
# java.lang.invoke'una erişmesi gerekir. android.* sınıfları sınıf yolundaki android.jar'dan
# gelmeyi sürdürür (ADR-020 madde 1: sınıf yolunda platform dışında kütüphane yok).
# Sonuç: java.* yüzeyi JDK'nın; Android'de olmayan bir java.* çağrısını d8 --lib yakalar.
# javac'ın "bootstrap class path not set" / "source value 8 is obsolete" uyarıları BİLEREK
# susturulmaz: günlükte durumun doğrusu yazılı kalsın.
$javacArglari = @(
  '-encoding', 'UTF-8',
  '-classpath', $platformJar,
  '-source', '8', '-target', '8',
  '-d', $sinifKok
) + $kaynaklar + $uretilen
AdimKos -Ad 'javac' -Yol $javacYolu -Argumanlar $javacArglari

$sinifDosyalari = @(Get-ChildItem -LiteralPath $sinifKok -Recurse -File -Filter '*.class' | ForEach-Object { $_.FullName })
if ($sinifDosyalari.Count -eq 0) { Dur ('javac .class üretmedi: ' + $sinifKok) $KOD_ADIM }
Yaz ('  .class sayısı : ' + $sinifDosyalari.Count)

# --- 7) d8 ---------------------------------------------------------------------

Baslik '7/12 d8 (.class → classes.dex)'
$d8Arglari = @('--min-api', [string] $MIN_SDK, '--lib', $platformJar, '--output', $dexKok) + $sinifDosyalari
AdimKos -Ad 'd8' -Yol $d8Yolu -Argumanlar $d8Arglari
$dexDosyasi = Join-Path $dexKok 'classes.dex'
if (-not (Test-Path -LiteralPath $dexDosyasi -PathType Leaf)) { Dur ('classes.dex oluşmadı: ' + $dexDosyasi) $KOD_ADIM }

# --- 8) dex ekleme -------------------------------------------------------------

Baslik '8/12 dex → APK'
if ($aaptV1) {
  # `aapt add` girdiyi VERİLDİĞİ yolla saklar → çalışma klasörü dex klasörü olmalı, yoksa
  # APK'ya "cikti/dex/classes.dex" diye girer ve çalışma zamanında bulunamaz.
  Yaz ('  yol           : aapt-add (' + $aaptV1 + ')')
  AdimKos -Ad 'aapt add' -Yol $aaptV1 -Argumanlar @('add', $temelApk, 'classes.dex') -CalismaDizini $dexKok
}
else {
  Yaz '  yol           : zip-archive (.NET System.IO.Compression)'
  if (-not (ZipHazir)) { Dur 'dex ekleme yolu yok (ne aapt v1 ne .NET ZipArchive)' $KOD_ADIM }
  $arsiv = $null
  try {
    $arsiv = [System.IO.Compression.ZipFile]::Open($temelApk, [System.IO.Compression.ZipArchiveMode]::Update)
    $eski = $arsiv.GetEntry('classes.dex')
    if ($eski) { $eski.Delete() }
    $null = [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($arsiv, $dexDosyasi, 'classes.dex')
  }
  finally { if ($arsiv) { $arsiv.Dispose() } }
  Yaz '  → classes.dex eklendi'
}

$dexVar = ApkIcinde $temelApk 'classes.dex'
if ($dexVar -eq $false) { Dur ('classes.dex APK''ya eklenmedi: ' + $temelApk) $KOD_ADIM }
if ($null -eq $dexVar) { Yaz '  UYARI         : APK içeriği okunamadı (.NET ZipArchive yok) → dex varlığı ölçülmedi' }
else { Yaz '  ölçüldü       : APK içinde classes.dex var' }

# --- 9) zipalign ---------------------------------------------------------------

Baslik '9/12 zipalign'
# -f: var olan çıktıyı yeniler (betik yeniden koşturulabilir olsun). -p: paylaşılan kitaplıklar
# sayfa hizalı (imzadan ÖNCE hizalanır; sonra hizalamak imzayı bozar).
AdimKos -Ad 'zipalign' -Yol $zipalign -Argumanlar @('-f', '-p', [string] $HIZALAMA, $temelApk, $hizaliApk)
if (-not (Test-Path -LiteralPath $hizaliApk -PathType Leaf)) { Dur ('hizalanmış APK oluşmadı: ' + $hizaliApk) $KOD_ADIM }

# --- 10) apksigner sign --------------------------------------------------------

Baslik '10/12 apksigner sign'
# ÖLÇÜLDÜ (tasokey#56, gerçek kurulum): apksigner `file:` kaynaklarını ARDIŞIK SATIR olarak okur.
# `--ks-pass file:P --key-pass file:P` verildiğinde depo parolası ilk satırı tüketiyor, anahtar
# parolası için aynı dosyada ikinci satır aranıyor ve
#   "Failed to read Key … password … end of file reached in P"
# ile düşüyor. Bu yüzden `--key-pass` YALNIZ ayrı bir dosya verildiğinde geçer; verilmediğinde
# (ya da aynı dosya gösterildiğinde) hiç geçmez: apksigner o durumda anahtar için depo parolasını
# kullanır — PKCS12 deposunda ikisi zaten aynıdır.
$imzaArglari = @('sign', '--ks', $Anahtar, '--ks-pass', ('file:' + $ParolaDosyasi))
if ($AnahtarAdi) { $imzaArglari += @('--ks-key-alias', $AnahtarAdi) }
$anahtarParolaNotu = 'depo parolası (--key-pass geçilmedi)'
if ($AnahtarParolaDosyasi) {
  $ayniDosya = ([System.IO.Path]::GetFullPath($AnahtarParolaDosyasi) -eq
    [System.IO.Path]::GetFullPath($ParolaDosyasi))
  if ($ayniDosya) {
    Yaz '  UYARI         : -AnahtarParolaDosyasi -ParolaDosyasi ile aynı dosya → --key-pass geçilmedi'
  }
  else {
    $imzaArglari += @('--key-pass', ('file:' + $AnahtarParolaDosyasi))
    $anahtarParolaNotu = $AnahtarParolaDosyasi
  }
}
Yaz ('  anahtar parolası: ' + $anahtarParolaNotu)
$imzaArglari += @('--min-sdk-version', [string] $MIN_SDK, '--out', $imzaliApk, $hizaliApk)
AdimKos -Ad 'apksigner sign' -Yol $apksigner -Argumanlar $imzaArglari
if (-not (Test-Path -LiteralPath $imzaliApk -PathType Leaf)) { Dur ('imzalı APK oluşmadı: ' + $imzaliApk) $KOD_ADIM }

# --- 11) apksigner verify ------------------------------------------------------

Baslik '11/12 apksigner verify'
AdimKos -Ad 'apksigner verify' -Yol $apksigner `
  -Argumanlar @('verify', '--verbose', '--print-certs', '--min-sdk-version', [string] $MIN_SDK, $imzaliApk) `
  -HataKodu $KOD_IMZA
if ($script:SonCikti -notmatch 'Verifies') {
  Dur 'apksigner verify çıktısında "Verifies" yok (imza doğrulanamadı)' $KOD_IMZA
}
Yaz '  ölçüldü       : çıktıda "Verifies" var'

# --- 12) Drive kopyası ---------------------------------------------------------

Baslik '12/12 Drive kopyası'
$driveDurum = ''
if ($DriveYok) {
  $driveDurum = 'atlandı (-DriveYok)'
  Yaz ('  ' + $driveDurum)
}
else {
  $driveKok = [Environment]::GetEnvironmentVariable($DRIVE_KOK_ORTAM)
  $driveKaynak = ('ortam:' + $DRIVE_KOK_ORTAM)
  if (-not $driveKok) { $driveKok = $DRIVE_KOK; $driveKaynak = 'varsayılan' }
  Yaz ('  Drive kökü    : ' + $driveKok + '  [' + $driveKaynak + ']')
  if (-not (Test-Path -LiteralPath $driveKok -PathType Container)) {
    $driveDurum = ('atlandı (Drive kökü yok: ' + $driveKok + ')')
    Yaz ('  UYARI         : ' + $driveDurum)
  }
  else {
    $hedefKlasor = Join-Path (Join-Path $driveKok $DRIVE_ALT) $etkinKimlik
    KlasorKur $hedefKlasor
    $zamanEki = (Get-Date).ToString($DRIVE_ZAMAN)
    $hedef = ''
    for ($i = 1; $i -le $DRIVE_EN_FAZLA; $i++) {
      $ad = $urunOneki + '_' + $zamanEki + $(if ($i -eq 1) { '' } else { '_' + $i }) + '.apk'
      $aday = Join-Path $hedefKlasor $ad
      # Üstüne YAZMAZ, hiçbir şeyi SİLMEZ: var olan adın yanına yeni ad açılır.
      if (-not (Test-Path -LiteralPath $aday)) { $hedef = $aday; break }
    }
    if (-not $hedef) {
      $driveDurum = ('atlandı (' + $DRIVE_EN_FAZLA + ' adın hepsi dolu: ' + $hedefKlasor + ')')
      Yaz ('  UYARI         : ' + $driveDurum)
    }
    else {
      Copy-Item -LiteralPath $imzaliApk -Destination $hedef -Confirm:$false
      $driveDurum = $hedef
      Yaz ('  kopyalandı    : ' + $hedef)
    }
  }
}

# --- Özet ----------------------------------------------------------------------

$apkBilgi = Get-Item -LiteralPath $imzaliApk
Baslik 'Özet'
Yaz ('Kimlik          : ' + $etkinKimlik)
Yaz ('Etiket eki      : ' + $(if ($Deneme) { $DENEME_ETIKET_EKI.Trim() } else { '— yok —' }))
Yaz ('Sürüm           : kod ' + $surumKodu + ' · ad ' + $surumAdi + ' · dal ' + $dal)
Yaz ('en düşük / hedef: ' + $MIN_SDK + ' / ' + $HEDEF_SDK + '  (derleme anında, depoda sabit değil)')
Yaz ('APK             : ' + $imzaliApk + '  (' + [Math]::Round($apkBilgi.Length / 1024) + ' KB)')
Yaz ('İmza            : apksigner verify → Verifies')
Yaz ('Drive           : ' + $driveDurum)
if ($dalUyarisi) { Yaz ('UYARI           : ' + $dalUyarisi) }
Yaz ('SONUÇ           : TAMAM (çıkış kodu ' + $KOD_TAMAM + ')')
exit $KOD_TAMAM
