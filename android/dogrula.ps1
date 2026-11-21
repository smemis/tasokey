<#
.SYNOPSIS
tasokey — üretilmiş APK'nın içine web çıktısının (docs/) gerçekten girdiğini ölçer.

.DESCRIPTION
`android/derle.ps1` APK üretir ve imzasını doğrular; bu betik APK'nın İÇİNE ne girdiğini ölçer.
İkisi ayrı sorudur ve gerekçe ölçülmüştür (tasokey#56): APK derlendiği, hizalandığı ve
`apksigner verify` "Verifies" dediği hâlde varlık girdi adları işletim sistemi ayracıyla
(`assets/oyun\arayuz\ekran.js`) yazıldığı için cihazda HİÇBİR varlık bulunamıyordu. İmza
"paket bozulmadı" der, "oyun açılır" demez.

Ölçülenler (hepsi tek okumada, APK'ya dokunmadan):

  1. varlık kökü    `VarlikSunucusu.java`daki `KOK` sabitinden OKUNUR (ADR-020 madde 6) — betik
                    klasör adı uydurmaz; uydursa karşılaştırma yanlış yere bakar
  2. karşılaştırma  `docs/` altındaki her dosya ↔ APK'daki `assets/<varlık kökü>/<göreli yol>`
                    girdisi → eksik 0, fazla 0, sıkıştırılmamış boylar eşit
  3. ayraç          girdi adlarında ters bölü 0 (zip adlarında ayraç yalnız `/` olabilir)
  4. yineleme       aynı girdi adı iki kez yok (dex eklemesi ve `aapt add` ikisi de ekleyebilir)
  5. iskelet        `classes.dex` + `AndroidManifest.xml` var
  6. imza           `META-INF/*.(RSA|DSA|EC|SF)` girdileri SAYILIR — bu bir RAPOR satırıdır;
                    imzanın geçerliliğini `apksigner verify` ölçer, bu betik onu iddia etmez

APK yalnız OKUNUR (`ZipFile::OpenRead`): girdi eklenmez, silinmez, değiştirilmez. Depoya hiçbir
şey yazılmaz, hiçbir dosya silinmez; betik ağa çıkmaz ve hiçbir araç çalıştırmaz (tek gereken
.NET sıkıştırma derlemeleridir).

.PARAMETER Apk
ZORUNLU. Ölçülecek APK dosyası (imzalı ya da imzasız; ara ürün de ölçülebilir).

.PARAMETER Web
Seçmeli. Karşılaştırma kaynağı olan web çıktısı klasörü. Verilmezse depo kökündeki `docs`.
Göreli verilirse DEPO KÖKÜNE göre çözülür (çalışma klasörüne değil) — aynı komut her yerden
aynı yere baksın.

.PARAMETER Json
Seçmeli. İnsan raporunun SONUNA tek satır JSON ekler (başka betikten çağırmak için). Sayılar ve
bulgu adları aynı koşudan gelir; iki ayrı ölçüm yoktur.

.EXAMPLE
powershell -File android/dogrula.ps1 -Apk android\cikti\tasokey-0.57.apk

.EXAMPLE
powershell -File android/dogrula.ps1 -Apk <apk yolu> -Web docs -Json

.NOTES
İş: tasokey#57 (üst iş tasokey#52). Kullanım ve yayın adımları: android/OKU.md.
Çıkış kodları: 0 tamam · 1 beklenmeyen hata · 2 parametre/girdi eksik ya da geçersiz ·
3 APK okunamadı (.NET ZipArchive yok ya da dosya zip değil) · 4 doğrulama başarısız
(eksik/fazla/boyut farkı/ters bölü/yineleme/iskelet eksik).
Bu dosya UTF-8 BOM ile saklanır: Windows PowerShell 5.1 BOM'suz dosyayı ANSI sanıp Türkçe
harfleri bozar (yol-coz.ps1 ve derle.ps1 ile aynı kural).
#>

[CmdletBinding()]
param(
  [string] $Apk,
  [string] $Web,
  [switch] $Json
)

$ErrorActionPreference = 'Stop'

# --- Ayarlar (sihirli sayı yok; hepsi burada) ---------------------------------

$VARSAYILAN_WEB   = 'docs'          # depo köküne göreli
$VARLIK_ONEKI     = 'assets/'       # APK içindeki varlık alanı
$DEX_GIRDISI      = 'classes.dex'
$MANIFEST_GIRDISI = 'AndroidManifest.xml'
$IMZA_ONEKI       = 'META-INF/'
$IMZA_UZANTILARI  = @('.RSA', '.DSA', '.EC', '.SF')
$EN_FAZLA_AD      = 20              # bulgu listesinde basılan ad sayısı (kalanı "+N" olarak)

$KOD_TAMAM = 0
$KOD_HATA  = 1
$KOD_GIRDI = 2
$KOD_OKUMA = 3
$KOD_FARK  = 4

# --- Yollar -------------------------------------------------------------------

$KOK      = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$JAVA_KOK = Join-Path $PSScriptRoot 'kabuk\java'

# --- Yardımcılar --------------------------------------------------------------

function Yaz { param([string] $Metin = '') Write-Output $Metin }

function Baslik {
  param([string] $Metin)
  Yaz ''
  Yaz ('--- ' + $Metin + ' ' + ('-' * [Math]::Max(1, 74 - $Metin.Length)))
}

<# Tek satır JSON. Hem başarıda hem erken çıkışta aynı alan kümesi basılır ki çağıran betik
   "alan var mı" diye bakmak zorunda kalmasın. #>
function JsonBas {
  param([hashtable] $Alanlar)
  if (-not $Json) { return }
  Yaz (ConvertTo-Json -InputObject $Alanlar -Compress -Depth 4)
}

function Dur {
  param([string] $Metin, [int] $Kod)
  Yaz ''
  Yaz ('HATA            : ' + $Metin)
  Yaz ('SONUÇ           : BAŞARISIZ (çıkış kodu ' + $Kod + ')')
  JsonBas @{ sonuc = 'basarisiz'; kod = $Kod; hata = $Metin }
  exit $Kod
}

trap {
  Yaz ''
  Yaz ('HATA            : beklenmeyen — ' + $_.Exception.Message)
  Yaz $_.ScriptStackTrace
  Yaz 'SONUÇ           : BAŞARISIZ (çıkış kodu 1)'
  exit 1
}

function DosyaOku {
  param([string] $Yol)
  return [System.IO.File]::ReadAllText($Yol, [System.Text.UTF8Encoding]::new($false))
}

# .NET sıkıştırma derlemeleri: PowerShell 5.1'de İKİ derleme gerekir; yalnız FileSystem yetmez
# (yol-coz.ps1'de ölçüldü, android/ARACLAR.md §3).
function ZipHazir {
  try {
    foreach ($derleme in @('System.IO.Compression', 'System.IO.Compression.FileSystem')) {
      try { Add-Type -AssemblyName $derleme -ErrorAction Stop } catch { }
    }
    $null = [System.IO.Compression.ZipArchiveMode]::Read
    $null = [System.IO.Compression.ZipFile]
    return $true
  }
  catch { return $false }
}

<# Girdi adlarını ORDINAL (büyük/küçük harfe duyarlı) eşleştiren sözlük. PowerShell'in kendi
   hashtable'ı harf duyarsızdır; zip adları ve cihazdaki AssetManager duyarlıdır → `Tas.svg` ile
   `tas.svg` farkı hashtable ile sessizce kaybolurdu. #>
function YeniSozluk {
  return New-Object 'System.Collections.Generic.Dictionary[string,long]' ([System.StringComparer]::Ordinal)
}

<# Bulgu listesini basar: ilk $EN_FAZLA_AD ad, kalanı sayı olarak. #>
function BulguBas {
  param([string] $Etiket, [string[]] $Adlar)
  if (-not $Adlar -or $Adlar.Count -eq 0) { return }
  Yaz ('  ' + $Etiket + ':')
  $i = 0
  foreach ($ad in $Adlar) {
    if ($i -ge $EN_FAZLA_AD) { Yaz ('    … +' + ($Adlar.Count - $EN_FAZLA_AD) + ' tane daha'); break }
    Yaz ('    - ' + $ad)
    $i++
  }
}

function Sirala {
  param([string[]] $Adlar)
  if (-not $Adlar) { return @() }
  return @($Adlar | Sort-Object)
}

# --- 0) Parametre denetimi -----------------------------------------------------

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

Yaz '=== tasokey APK doğrulaması (android/dogrula.ps1) ==='
Yaz ('Depo kökü       : ' + $KOK)
Yaz ('Zaman           : ' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))

if (-not $Apk) {
  Dur 'zorunlu parametre eksik: -Apk (ölçülecek APK dosyası verilmedi)' $KOD_GIRDI
}
if (-not (Test-Path -LiteralPath $Apk -PathType Leaf)) {
  Dur ('-Apk dosyası yok: ' + $Apk) $KOD_GIRDI
}
$ApkTam = [System.IO.Path]::GetFullPath($Apk)

if (-not $Web) { $Web = $VARSAYILAN_WEB }
if ([System.IO.Path]::IsPathRooted($Web)) { $WebKok = [System.IO.Path]::GetFullPath($Web) }
else { $WebKok = [System.IO.Path]::GetFullPath((Join-Path $KOK $Web)) }
if (-not (Test-Path -LiteralPath $WebKok -PathType Container)) {
  Dur ('-Web klasörü yok: ' + $WebKok) $KOD_GIRDI
}

# Varlık kökü (APK içindeki assets/<kök>/): tek kaynak VarlikSunucusu.java'daki KOK sabitidir
# (ADR-020 madde 6) — kabuk yalnız o kökün altından sunar. Betik bir ad uydurursa karşılaştırma
# yanlış yere bakar ve "eksik 32" diye yanlış alarm verir.
$sunucuDosyasi = @(Get-ChildItem -LiteralPath $JAVA_KOK -Recurse -File -Filter 'VarlikSunucusu.java' -ErrorAction SilentlyContinue)
if ($sunucuDosyasi.Count -ne 1) { Dur 'VarlikSunucusu.java tek dosya olarak bulunamadı (varlık kökü okunamıyor)' $KOD_GIRDI }
$varlikKokEs = [regex]::Match((DosyaOku $sunucuDosyasi[0].FullName), 'static\s+final\s+String\s+KOK\s*=\s*"([^"]+)"')
if (-not $varlikKokEs.Success) { Dur ('VarlikSunucusu.java''da KOK sabiti okunamadı: ' + $sunucuDosyasi[0].FullName) $KOD_GIRDI }
$varlikKoku = $varlikKokEs.Groups[1].Value
$varlikOneki = $VARLIK_ONEKI + $varlikKoku + '/'

$apkBilgi = Get-Item -LiteralPath $ApkTam
Yaz ('APK             : ' + $ApkTam + '  (' + [Math]::Round($apkBilgi.Length / 1024) + ' KB)')
Yaz ('Web kaynağı     : ' + $WebKok)
Yaz ('Varlık kökü     : ' + $varlikOneki + '  [VarlikSunucusu.java → KOK]')

# --- 1) Beklenen varlık listesi (docs/) ----------------------------------------

$beklenen = YeniSozluk
foreach ($dosya in @(Get-ChildItem -LiteralPath $WebKok -Recurse -File)) {
  $goreli = $dosya.FullName.Substring($WebKok.Length).TrimStart('\', '/').Replace('\', '/')
  $beklenen[$varlikOneki + $goreli] = $dosya.Length
}
if ($beklenen.Count -eq 0) { Dur ('-Web klasöründe hiç dosya yok: ' + $WebKok) $KOD_GIRDI }

# --- 2) APK girdileri ----------------------------------------------------------

if (-not (ZipHazir)) {
  Dur 'APK okunamıyor: .NET ZipArchive yüklenemedi (System.IO.Compression + …FileSystem)' $KOD_OKUMA
}

$apkGirdileri = YeniSozluk
$yinelenenler = @()
$klasorGirdileri = @()
$tersBolulular = @()
$imzaGirdileri = @()
$arsiv = $null
try {
  $arsiv = [System.IO.Compression.ZipFile]::OpenRead($ApkTam)
  foreach ($girdi in $arsiv.Entries) {
    $ad = $girdi.FullName
    if ($ad.Contains('\')) { $tersBolulular += $ad }
    if ($ad.EndsWith('/')) { $klasorGirdileri += $ad; continue }
    if ($ad.StartsWith($IMZA_ONEKI, [StringComparison]::Ordinal) -and
        ($IMZA_UZANTILARI | Where-Object { $ad.EndsWith($_, [StringComparison]::OrdinalIgnoreCase) })) {
      $imzaGirdileri += $ad
    }
    if ($apkGirdileri.ContainsKey($ad)) { $yinelenenler += $ad; continue }
    $apkGirdileri[$ad] = $girdi.Length
  }
}
catch {
  Dur ('APK zip olarak okunamadı: ' + $_.Exception.Message) $KOD_OKUMA
}
finally { if ($arsiv) { $arsiv.Dispose() } }

# --- 3) Karşılaştırma ----------------------------------------------------------

Baslik 'Varlık karşılaştırması (docs/ ↔ APK)'

$eksikler = @()
$boyutFarklari = @()
$eslesen = 0
foreach ($ad in $beklenen.Keys) {
  if (-not $apkGirdileri.ContainsKey($ad)) { $eksikler += $ad; continue }
  if ($apkGirdileri[$ad] -ne $beklenen[$ad]) {
    $boyutFarklari += ($ad + ' (APK ' + $apkGirdileri[$ad] + ' bayt ≠ web ' + $beklenen[$ad] + ' bayt)')
    continue
  }
  $eslesen++
}

# "Fazla": APK'nın varlık alanında (assets/…) duran, docs/ karşılığı OLMAYAN girdi. Yanlış varlık
# köküne ya da ayracı bozuk ada kopyalanmış dosyalar da buraya düşer (ikisi de cihazda 404'tür).
$fazlalar = @()
foreach ($ad in $apkGirdileri.Keys) {
  if (-not $ad.StartsWith($VARLIK_ONEKI, [StringComparison]::Ordinal)) { continue }
  if (-not $beklenen.ContainsKey($ad)) { $fazlalar += $ad }
}

# @(…) BİLEREK: PowerShell fonksiyon çıktısındaki tek elemanlı diziyi tek değere çevirir; sarmasız
# yazılırsa bir bulgu varken liste yerine dize dönüyor ve JSON alanı dizi olmaktan çıkıyor.
$eksikler = @(Sirala $eksikler)
$fazlalar = @(Sirala $fazlalar)
$boyutFarklari = @(Sirala $boyutFarklari)
$tersBolulular = @(Sirala $tersBolulular)
$yinelenenler = @(Sirala $yinelenenler)

$apkVarlikSayisi = @($apkGirdileri.Keys | Where-Object { $_.StartsWith($VARLIK_ONEKI, [StringComparison]::Ordinal) }).Count

Yaz ('  web dosyası   : ' + $beklenen.Count + '   (' + $WebKok + ')')
Yaz ('  APK varlığı   : ' + $apkVarlikSayisi + '   (' + $VARLIK_ONEKI + '…)')
Yaz ('  eşleşen       : ' + $eslesen + '/' + $beklenen.Count + '   (ad + sıkıştırılmamış boy)')
Yaz ('  eksik         : ' + $eksikler.Count)
Yaz ('  fazla         : ' + $fazlalar.Count)
Yaz ('  boyut farkı   : ' + $boyutFarklari.Count)
Yaz ('  ters bölülü   : ' + $tersBolulular.Count + '   (zip adlarında ayraç yalnız /)')
Yaz ('  yinelenen ad  : ' + $yinelenenler.Count)
if ($klasorGirdileri.Count -gt 0) {
  Yaz ('  klasör girdisi: ' + $klasorGirdileri.Count + '   (karşılaştırmaya girmez)')
}

BulguBas 'eksik girdiler' $eksikler
BulguBas 'fazla girdiler' $fazlalar
BulguBas 'boyut farkları' $boyutFarklari
BulguBas 'ters bölülü girdiler' $tersBolulular
BulguBas 'yinelenen adlar' $yinelenenler

# --- 4) APK iskeleti -----------------------------------------------------------

Baslik 'APK iskeleti'

$dexVar = $apkGirdileri.ContainsKey($DEX_GIRDISI)
$manifestVar = $apkGirdileri.ContainsKey($MANIFEST_GIRDISI)
Yaz ('  classes.dex   : ' + $(if ($dexVar) { 'var' } else { 'YOK' }) + '   (' + $DEX_GIRDISI + ')')
Yaz ('  manifest      : ' + $(if ($manifestVar) { 'var' } else { 'YOK' }) + '   (' + $MANIFEST_GIRDISI + ')')
# İmza satırı RAPORDUR: imzanın geçerliliğini apksigner verify ölçer (derle.ps1 11. adım).
Yaz ('  imza girdisi  : ' + $imzaGirdileri.Count + '   (' + $IMZA_ONEKI + '*' +
  ($IMZA_UZANTILARI -join '/') + ' — geçerliliği apksigner verify ölçer)')

# --- Özet ----------------------------------------------------------------------

$kusurlar = @()
if ($eksikler.Count -gt 0) { $kusurlar += ('eksik varlık ' + $eksikler.Count) }
if ($fazlalar.Count -gt 0) { $kusurlar += ('fazla varlık ' + $fazlalar.Count) }
if ($boyutFarklari.Count -gt 0) { $kusurlar += ('boyut farkı ' + $boyutFarklari.Count) }
if ($tersBolulular.Count -gt 0) { $kusurlar += ('ters bölülü ad ' + $tersBolulular.Count) }
if ($yinelenenler.Count -gt 0) { $kusurlar += ('yinelenen ad ' + $yinelenenler.Count) }
if (-not $dexVar) { $kusurlar += ($DEX_GIRDISI + ' yok') }
if (-not $manifestVar) { $kusurlar += ($MANIFEST_GIRDISI + ' yok') }

$kod = $(if ($kusurlar.Count -eq 0) { $KOD_TAMAM } else { $KOD_FARK })
$sonuc = $(if ($kod -eq $KOD_TAMAM) { 'tamam' } else { 'basarisiz' })

Baslik 'Özet'
Yaz ('APK             : ' + $ApkTam)
Yaz ('Varlık kökü     : ' + $varlikOneki)
Yaz ('Eşleşme         : ' + $eslesen + '/' + $beklenen.Count + ' · eksik ' + $eksikler.Count +
  ' · fazla ' + $fazlalar.Count + ' · boyut farkı ' + $boyutFarklari.Count)
if ($kusurlar.Count -gt 0) { Yaz ('KUSUR           : ' + ($kusurlar -join ' · ')) }
if ($kod -eq $KOD_TAMAM) { Yaz ('SONUÇ           : TAMAM (çıkış kodu ' + $KOD_TAMAM + ')') }
else { Yaz ('SONUÇ           : BAŞARISIZ (çıkış kodu ' + $KOD_FARK + ')') }

JsonBas @{
  sonuc = $sonuc
  kod = $kod
  apk = $ApkTam
  web = $WebKok
  varlikKoku = $varlikOneki
  webSayisi = $beklenen.Count
  apkVarlikSayisi = $apkVarlikSayisi
  eslesen = $eslesen
  eksikler = $eksikler
  fazlalar = $fazlalar
  boyutFarklari = $boyutFarklari
  tersBolulular = $tersBolulular
  yinelenenler = $yinelenenler
  dex = $dexVar
  manifest = $manifestVar
  imzaGirdisi = $imzaGirdileri.Count
  kusurlar = $kusurlar
}

exit $kod
