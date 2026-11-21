<#
.SYNOPSIS
tasokey Android araç zinciri yol çözücü — tek kaynak.

.DESCRIPTION
Unity'nin Android Build Support modülüyle gelen araç zincirini (JDK, SDK build-tools, platform jar)
bulur, sürümlerini ÖLÇER ve tek bir nesne olarak verir. APK üreten bütün betikler yolu buradan alır;
hiçbir betik kendi içine Unity yolu yazmaz (tek kapı / tek kaynak).

Unity kökü üç kaynaktan, bu sırayla belirlenir:
  1. -UnityKok parametresi
  2. ortam değişkeni  TASOKEY_UNITY_KOK
  3. Unity Hub varsayılan kurulum klasörleri (en yeni sürüm)
1 ya da 2 verilmiş ama geçersizse Hub'a DÜŞÜLMEZ: hata verilir (yanlış Unity ile sessizce derlemektense
durmak yeğdir).

.PARAMETER UnityKok
Unity sürüm klasörü (ör. C:\Program Files\Unity\Hub\Editor\6000.3.9f1) ya da doğrudan
...\Editor\Data\PlaybackEngines\AndroidPlayer klasörü.

.PARAMETER Rapor
İnsan okur rapor basar. Çıkış kodu: 0 = bütün zorunlu araçlar var, 0 dışı = eksik (bkz. Çıkış kodları).

.PARAMETER Json
Tek satır JSON basar (başka betikler için).

.PARAMETER ApiSeviyesi
Aranan platform API seviyesi (platforms/android-<N>/android.jar). Varsayılan 36.

.PARAMETER BuildTools
Belirli bir build-tools sürümüne sabitler. Verilmezse bulunanların en yenisi seçilir.

.PARAMETER SurumOlcme
$false verilirse sürüm komutları çalıştırılmaz (yalnız yol çözümü; hızlı).

.EXAMPLE
pwsh -File android/yol-coz.ps1 -Rapor

.EXAMPLE
$y = & android/yol-coz.ps1 ; & $y.araclar.aapt2.yol link ...

.NOTES
İş: tasokey#53 (üst iş tasokey#52). Ölçülen değerler: android/ARACLAR.md.
Çıkış kodları: 0 tamam · 1 beklenmeyen hata · 2 Unity kökü bulunamadı/geçersiz ·
3 Android araç klasörü (AndroidPlayer/SDK/build-tools) eksik · 4 zorunlu araç eksik.
Bu dosya UTF-8 BOM ile saklanır: Windows PowerShell 5.1 BOM'suz dosyayı ANSI sanıp Türkçe harfleri bozar.
#>

[CmdletBinding()]
param(
  [string] $UnityKok,
  [switch] $Rapor,
  [switch] $Json,
  [int]    $ApiSeviyesi = 36,
  [string] $BuildTools,
  [bool]   $SurumOlcme = $true
)

$ErrorActionPreference = 'Stop'

# --- Ayarlar (sihirli sayı yok; hepsi burada) ---------------------------------

$ORTAM_DEGISKENI = 'TASOKEY_UNITY_KOK'
$ZAMAN_ASIMI_MS  = 20000
$UZANTILAR       = @('.exe', '.bat', '.cmd', '.jar', '')

# Unity kökünden AndroidPlayer'a giden olası göreli yollar (sürümler arası fark + doğrudan klasör verme).
$OYNATICI_YOLLARI = @(
  'Editor\Data\PlaybackEngines\AndroidPlayer',
  'Data\PlaybackEngines\AndroidPlayer',
  'PlaybackEngines\AndroidPlayer',
  '.'
)

# Unity Hub varsayılan kurulum kökü (yalnız 1. ve 2. kaynak yokken taranır).
$HUB_GORELI = 'Unity\Hub\Editor'
$HUB_TABANLARI = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, 'C:\Program Files', 'D:\', 'D:\Program Files')

$KOD_TAMAM          = 0
$KOD_HATA           = 1
$KOD_UNITY_YOK      = 2
$KOD_ARAC_KLASOR_YOK = 3
$KOD_ARAC_EKSIK     = 4

# klasor: jdk | buildTools | tools   ·   zorunlu: $false ise eksikliği çıkış kodunu değiştirmez
$ARAC_TANIM = @(
  @{ ad = 'java';       klasor = 'jdk';        adlar = @('java');      joker = $false; surumArglari = @(, @('-version'));            zorunlu = $true;  yedek = 'yok' }
  @{ ad = 'javac';      klasor = 'jdk';        adlar = @('javac');     joker = $false; surumArglari = @(, @('-version'));            zorunlu = $true;  yedek = 'yok' }
  @{ ad = 'keytool';    klasor = 'jdk';        adlar = @('keytool');   joker = $false; surumArglari = @(@('-version'), @('-J-version')); zorunlu = $true; yedek = 'jdk' }
  @{ ad = 'aapt2';      klasor = 'buildTools'; adlar = @('aapt2');     joker = $false; surumArglari = @(, @('version'));             zorunlu = $true;  yedek = 'buildTools' }
  @{ ad = 'aapt';       klasor = 'buildTools'; adlar = @('aapt');      joker = $false; surumArglari = @(@('v'), @('version'));       zorunlu = $false; yedek = 'buildTools' }
  @{ ad = 'd8';         klasor = 'buildTools'; adlar = @('d8');        joker = $false; surumArglari = @(, @('--version'));           zorunlu = $true;  yedek = 'buildTools' }
  @{ ad = 'zipalign';   klasor = 'buildTools'; adlar = @('zipalign');  joker = $false; surumArglari = @(@('-h'), @('--version'));    zorunlu = $true;  yedek = 'buildTools' }
  @{ ad = 'apksigner';  klasor = 'buildTools'; adlar = @('apksigner'); joker = $false; surumArglari = @(, @('--version'));           zorunlu = $true;  yedek = 'buildTools' }
  @{ ad = 'bundletool'; klasor = 'tools';      adlar = @('bundletool*.jar'); joker = $true; surumArglari = @(, @('version'));        zorunlu = $false; yedek = 'yok' }
)

# --- Yardımcılar --------------------------------------------------------------

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
   $? değerini bozuyor; ayrıca geçici dosya yazmamak gerekiyor. .bat/.cmd cmd.exe ile, .jar java ile
   çalıştırılır (CreateProcess toplu iş dosyasını doğrudan çalıştıramaz). Yalnız kendi başlattığı
   süreci, zaman aşımında nesne üzerinden kapatır. #>
function Calistir {
  param(
    [string]   $Yol,
    [string[]] $Argumanlar = @(),
    [string]   $JavaYolu = ''
  )
  $sonuc = @{ kod = -1; cikti = '' }
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
  $bilgi.WorkingDirectory = $env:SystemRoot

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
    $sonuc = @{ kod = $surec.ExitCode; cikti = $metin }
  }
  catch {
    $sonuc = @{ kod = -1; cikti = ('çalıştırılamadı: ' + $_.Exception.Message) }
  }
  finally {
    if ($surec) { $surec.Dispose() }
  }
  return $sonuc
}

function SurumAyikla {
  param([string] $Metin)
  if (-not $Metin) { return '' }
  $e = [regex]::Match($Metin, '(\d+\.\d+(?:\.\d+)*(?:[_+][\w.-]+)?)')
  if ($e.Success) { return $e.Groups[1].Value }
  return ''
}

function IlkSatir {
  param([string] $Metin, [int] $EnFazla = 90)
  if (-not $Metin) { return '' }
  $satir = ($Metin -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
  if (-not $satir) { return '' }
  $satir = $satir.Trim()
  if ($satir.Length -gt $EnFazla) { $satir = $satir.Substring(0, $EnFazla) + '…' }
  return $satir
}

function SurumSayisi {
  param([string] $Ad)
  $e = [regex]::Match($Ad, '^(\d+)\.(\d+)(?:\.(\d+))?')
  if (-not $e.Success) { return (New-Object System.Version 0, 0, 0) }
  $u = 0
  if ($e.Groups[3].Success) { $u = [int] $e.Groups[3].Value }
  return (New-Object System.Version ([int] $e.Groups[1].Value), ([int] $e.Groups[2].Value), $u)
}

function AracDosyasiBul {
  param([string] $Klasor, [string[]] $Adlar, [bool] $Joker)
  if (-not $Klasor -or -not (Test-Path -LiteralPath $Klasor)) { return '' }
  foreach ($ad in $Adlar) {
    if ($Joker) {
      $bulunan = @(Get-ChildItem -LiteralPath $Klasor -Filter $ad -File -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending)
      if ($bulunan.Count -gt 0) { return $bulunan[0].FullName }
    }
    else {
      foreach ($uzanti in $UZANTILAR) {
        $aday = Join-Path $Klasor ($ad + $uzanti)
        if (Test-Path -LiteralPath $aday -PathType Leaf) { return $aday }
      }
    }
  }
  return ''
}

# --- 1) Unity kökü -------------------------------------------------------------

function HubAdaylari {
  $kokler = @()
  foreach ($taban in $HUB_TABANLARI) {
    if (-not $taban) { continue }
    $yol = Join-Path $taban $HUB_GORELI
    if (Test-Path -LiteralPath $yol -PathType Container) { $kokler += $yol }
  }
  # Unity Hub'ın ikincil kurulum yolu (kullanıcı başka diske kurduysa).
  $ikincilDosya = Join-Path $env:APPDATA 'UnityHub\secondaryInstallPath.json'
  if (Test-Path -LiteralPath $ikincilDosya -PathType Leaf) {
    try {
      $ikincil = (Get-Content -LiteralPath $ikincilDosya -Raw).Trim().Trim('"')
      if ($ikincil -and (Test-Path -LiteralPath $ikincil -PathType Container)) { $kokler += $ikincil }
    }
    catch { }
  }
  return ($kokler | Select-Object -Unique)
}

function OynaticiKlasoru {
  param([string] $Kok)
  if (-not $Kok -or -not (Test-Path -LiteralPath $Kok -PathType Container)) { return '' }
  foreach ($goreli in $OYNATICI_YOLLARI) {
    $aday = [System.IO.Path]::GetFullPath((Join-Path $Kok $goreli))
    if ((Test-Path -LiteralPath (Join-Path $aday 'SDK') -PathType Container) -or
        (Test-Path -LiteralPath (Join-Path $aday 'OpenJDK') -PathType Container)) {
      return $aday
    }
  }
  return ''
}

function UnityKokunuCoz {
  param([string] $Verilen)
  if ($Verilen) {
    return @{ kok = $Verilen; kaynak = '-UnityKok' }
  }
  $ortam = [Environment]::GetEnvironmentVariable($ORTAM_DEGISKENI)
  if ($ortam) {
    return @{ kok = $ortam; kaynak = ('ortam:' + $ORTAM_DEGISKENI) }
  }
  $adaylar = @()
  foreach ($hub in (HubAdaylari)) {
    foreach ($surum in (Get-ChildItem -LiteralPath $hub -Directory -ErrorAction SilentlyContinue)) {
      if (OynaticiKlasoru $surum.FullName) { $adaylar += $surum }
    }
  }
  if ($adaylar.Count -eq 0) { return @{ kok = ''; kaynak = 'hub' } }
  $enYeni = ($adaylar | Sort-Object -Property @{ Expression = { SurumSayisi $_.Name } }, Name -Descending |
    Select-Object -First 1)
  return @{ kok = $enYeni.FullName; kaynak = 'hub' }
}

# --- 2) Envanteri topla --------------------------------------------------------

function EnvanterTopla {
  $sonuc = [ordered] @{
    unityKok        = ''
    kaynak          = ''
    androidPlayer   = ''
    sdk             = ''
    jdk             = ''
    buildToolsSurum = ''
    buildTools      = ''
    platformJar     = ''
    apiSeviyesi     = $ApiSeviyesi
    bulunanApiler   = @()
    araclar         = [ordered] @{}
    source8         = ''
    source8Cikti    = ''
    dexEklemeYolu   = ''
    zipArchive      = $false
    eksikler        = @()
    uyarilar        = @()
    ortam           = ''
    kod             = $KOD_TAMAM
  }

  # .NET ZipArchive dex'i APK'ya eklemenin yedek yolu → gerçekten kullanılabiliyor mu, ölç.
  # ÖLÇÜLDÜ (tasokey#53, PowerShell 5.1): `ZipFile.Open(apk, Update)` için İKİ derleme gerekiyor;
  # yalnız System.IO.Compression.FileSystem yüklenirse ZipArchiveMode türü hâlâ çözülmüyor.
  try {
    foreach ($derleme in @('System.IO.Compression', 'System.IO.Compression.FileSystem')) {
      try { Add-Type -AssemblyName $derleme -ErrorAction Stop } catch { }
    }
    $null = [System.IO.Compression.ZipArchiveMode]::Update
    $null = [System.IO.Compression.ZipFile]
    $sonuc.zipArchive = $true
  }
  catch { $sonuc.zipArchive = $false }

  $psSurum = $PSVersionTable.PSVersion.ToString()
  $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue)
  $pwshDurum = 'yok'
  if ($pwsh) { $pwshDurum = $pwsh.Source }
  $sonuc.ortam = ('PowerShell ' + $psSurum + ' · pwsh: ' + $pwshDurum + ' · ZipArchive: ' +
    $(if ($sonuc.zipArchive) { 'var' } else { 'yok' }))

  $coz = UnityKokunuCoz $UnityKok
  $sonuc.kaynak = $coz.kaynak
  $sonuc.unityKok = $coz.kok

  if (-not $coz.kok) {
    $sonuc.eksikler += 'Unity kökü (Hub varsayılan klasörlerinde Android Build Support bulunamadı)'
    $sonuc.kod = $KOD_UNITY_YOK
    return $sonuc
  }
  if (-not (Test-Path -LiteralPath $coz.kok -PathType Container)) {
    $sonuc.eksikler += ('Unity kökü yok: ' + $coz.kok + ' (kaynak: ' + $coz.kaynak + ')')
    $sonuc.kod = $KOD_UNITY_YOK
    return $sonuc
  }

  $oynatici = OynaticiKlasoru $coz.kok
  if (-not $oynatici) {
    $sonuc.eksikler += ('AndroidPlayer (Android Build Support modülü) yok: ' + $coz.kok +
      ' (kaynak: ' + $coz.kaynak + ')')
    $sonuc.kod = $KOD_ARAC_KLASOR_YOK
    return $sonuc
  }
  $sonuc.androidPlayer = $oynatici
  $sonuc.unityKok = [System.IO.Path]::GetFullPath($coz.kok)

  $klasorler = @{
    jdk        = (Join-Path $oynatici 'OpenJDK\bin')
    buildTools = ''
    tools      = (Join-Path $oynatici 'Tools')
  }
  $sdk = (Join-Path $oynatici 'SDK')
  if (Test-Path -LiteralPath $sdk -PathType Container) { $sonuc.sdk = $sdk }
  if (Test-Path -LiteralPath $klasorler.jdk -PathType Container) { $sonuc.jdk = $klasorler.jdk }

  # build-tools: istenen sürüm ya da en yenisi
  $btKok = Join-Path $sdk 'build-tools'
  if (Test-Path -LiteralPath $btKok -PathType Container) {
    $btler = @(Get-ChildItem -LiteralPath $btKok -Directory -ErrorAction SilentlyContinue)
    if ($BuildTools) {
      $btler = @($btler | Where-Object { $_.Name -eq $BuildTools })
      if ($btler.Count -eq 0) { $sonuc.eksikler += ('build-tools/' + $BuildTools) }
    }
    if ($btler.Count -gt 0) {
      $secilen = ($btler | Sort-Object -Property @{ Expression = { SurumSayisi $_.Name } }, Name -Descending |
        Select-Object -First 1)
      $sonuc.buildToolsSurum = $secilen.Name
      $sonuc.buildTools = $secilen.FullName
      $klasorler.buildTools = $secilen.FullName
    }
  }
  if (-not $sonuc.buildTools -and -not ($sonuc.eksikler -match 'build-tools')) {
    $sonuc.eksikler += 'build-tools (SDK\build-tools altında sürüm klasörü yok)'
  }

  # platform jar
  $platformKok = Join-Path $sdk 'platforms'
  if (Test-Path -LiteralPath $platformKok -PathType Container) {
    $sonuc.bulunanApiler = @(Get-ChildItem -LiteralPath $platformKok -Directory -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty Name)
  }
  $jar = Join-Path $platformKok ('android-' + $ApiSeviyesi + '\android.jar')
  if (Test-Path -LiteralPath $jar -PathType Leaf) { $sonuc.platformJar = $jar }
  else { $sonuc.eksikler += ('platforms/android-' + $ApiSeviyesi + '/android.jar') }

  # araçlar
  $javaYolu = ''
  foreach ($tanim in $ARAC_TANIM) {
    $yol = AracDosyasiBul $klasorler[$tanim.klasor] $tanim.adlar $tanim.joker
    $kayit = [ordered] @{ ad = $tanim.ad; yol = $yol; surum = ''; ham = ''; zorunlu = $tanim.zorunlu }
    if (-not $yol) {
      if ($tanim.zorunlu) { $sonuc.eksikler += $tanim.ad }
      $kayit.surum = 'yok'
      $sonuc.araclar[$tanim.ad] = $kayit
      continue
    }
    if ($tanim.ad -eq 'java') { $javaYolu = $yol }
    if ($SurumOlcme) {
      foreach ($arglar in $tanim.surumArglari) {
        $c = Calistir -Yol $yol -Argumanlar $arglar -JavaYolu $javaYolu
        $s = SurumAyikla $c.cikti
        if ($s) { $kayit.surum = $s; $kayit.ham = (IlkSatir $c.cikti); break }
        if (-not $kayit.ham) { $kayit.ham = (IlkSatir $c.cikti) }
      }
    }
    $sonuc.araclar[$tanim.ad] = $kayit
  }

  # Sürümünü kendisi söylemeyen araçlar (zipalign, bazı keytool sürümleri): türetilmiş sürüm yaz.
  if ($SurumOlcme) {
    $jdkSurum = $sonuc.araclar['java'].surum
    foreach ($tanim in $ARAC_TANIM) {
      $kayit = $sonuc.araclar[$tanim.ad]
      if (-not $kayit.yol -or $kayit.surum) { continue }
      if ($tanim.yedek -eq 'jdk' -and $jdkSurum) { $kayit.surum = $jdkSurum + ' (JDK ile aynı paket)' }
      elseif ($tanim.yedek -eq 'buildTools' -and $sonuc.buildToolsSurum) {
        $kayit.surum = $sonuc.buildToolsSurum + ' (build-tools sürümü)'
      }
      else { $kayit.surum = 'bilinmiyor' }
      $sonuc.uyarilar += ($tanim.ad + ': sürümü kendisi bildirmiyor → türetildi (' + $kayit.surum + ')')
    }
  }

  # javac -source 8 desteği (dosya yazmadan: seçenek doğrulaması -version ile birlikte yapılır)
  $javac = $sonuc.araclar['javac']
  if ($SurumOlcme -and $javac.yol) {
    $c = Calistir -Yol $javac.yol -Argumanlar @('-source', '8', '-target', '8', '-version')
    $sonuc.source8Cikti = (IlkSatir $c.cikti)
    if ($c.kod -eq 0 -and $c.cikti -notmatch 'invalid (source|target) release') { $sonuc.source8 = 'evet' }
    else {
      $sonuc.source8 = 'hayır'
      $sonuc.uyarilar += 'javac -source 8 desteklenmiyor → derleme hedefi yükseltilmeli (d8 girdisi)'
    }
  }
  elseif (-not $javac.yol) { $sonuc.source8 = 'ölçülemedi (javac yok)' }
  else { $sonuc.source8 = 'ölçülmedi (-SurumOlcme $false)' }

  # dex'i APK'ya ekleme yolu: aapt v1 'add' varsa o, yoksa .NET ZipArchive
  if ($sonuc.araclar['aapt'].yol) { $sonuc.dexEklemeYolu = "aapt-add (aapt v1 bulundu)" }
  elseif ($sonuc.zipArchive) { $sonuc.dexEklemeYolu = 'zip-archive (.NET System.IO.Compression)' }
  else {
    $sonuc.dexEklemeYolu = 'yok'
    $sonuc.eksikler += 'dex ekleme yolu (ne aapt v1 ne .NET ZipArchive)'
  }

  if ($sonuc.eksikler.Count -gt 0 -and $sonuc.kod -eq $KOD_TAMAM) { $sonuc.kod = $KOD_ARAC_EKSIK }
  return $sonuc
}

# --- 3) Rapor -----------------------------------------------------------------

function RaporBas {
  param($E)
  $zipDurum = 'yok'
  if ($E.zipArchive) { $zipDurum = 'var' }
  Write-Output '=== tasokey Android araç envanteri (android/yol-coz.ps1) ==='
  Write-Output ('Unity kökü      : ' + $(if ($E.unityKok) { $E.unityKok } else { '— bulunamadı —' }) +
    '  [kaynak: ' + $E.kaynak + ']')
  Write-Output ('AndroidPlayer   : ' + $(if ($E.androidPlayer) { $E.androidPlayer } else { '— yok —' }))
  Write-Output ('SDK             : ' + $(if ($E.sdk) { $E.sdk } else { '— yok —' }))
  Write-Output ('JDK (bin)       : ' + $(if ($E.jdk) { $E.jdk } else { '— yok —' }))
  Write-Output ('build-tools     : ' + $(if ($E.buildToolsSurum) { $E.buildToolsSurum + '  → ' + $E.buildTools } else { '— yok —' }))
  Write-Output ('platform jar    : android-' + $E.apiSeviyesi + '  → ' +
    $(if ($E.platformJar) { $E.platformJar } else { '— yok — (bulunan: ' + (($E.bulunanApiler -join ', ')) + ')' }))
  Write-Output ''
  Write-Output ('{0,-11} {1,-28} {2}' -f 'ARAÇ', 'SÜRÜM', 'YOL')
  Write-Output ('{0,-11} {1,-28} {2}' -f '----', '-----', '---')
  foreach ($ad in $E.araclar.Keys) {
    $a = $E.araclar[$ad]
    $etiket = $ad
    if (-not $a.zorunlu) { $etiket = $ad + '*' }
    $yol = $a.yol
    if (-not $yol) { $yol = '— bulunamadı —' }
    Write-Output ('{0,-11} {1,-28} {2}' -f $etiket, $a.surum, $yol)
  }
  Write-Output '(* isteğe bağlı: eksikliği çıkış kodunu değiştirmez)'
  Write-Output ''
  Write-Output ('javac -source 8 : ' + $E.source8 + '  [' + $E.source8Cikti + ']')
  Write-Output ('dex → APK       : ' + $E.dexEklemeYolu + '  · .NET ZipArchive: ' + $zipDurum)
  Write-Output ('Ortam           : ' + $E.ortam)
  foreach ($u in $E.uyarilar) { Write-Output ('UYARI           : ' + $u) }
  if ($E.eksikler.Count -gt 0) {
    Write-Output ('EKSİK           : ' + ($E.eksikler -join ', '))
    Write-Output ('SONUÇ           : EKSİK (çıkış kodu ' + $E.kod + ')')
  }
  else {
    $zorunluSayi = @($ARAC_TANIM | Where-Object { $_.zorunlu }).Count
    Write-Output ('SONUÇ           : TAMAM (' + $zorunluSayi + '/' + $zorunluSayi +
      ' zorunlu araç + platform jar, çıkış kodu 0)')
  }
}

# --- Giriş --------------------------------------------------------------------

try {
  if ($Rapor -or $Json) {
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
  }
  $envanter = EnvanterTopla
  if ($Json) { Write-Output (ConvertTo-Json $envanter -Depth 6 -Compress) }
  elseif ($Rapor) { RaporBas $envanter }
  else { Write-Output $envanter }
  exit $envanter.kod
}
catch {
  Write-Output ('HATA: ' + $_.Exception.Message)
  Write-Output ($_.ScriptStackTrace)
  exit $KOD_HATA
}
