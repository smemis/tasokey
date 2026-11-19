# PRD: Taş Okey

> Şablon kaynağı: `ofis-sistem-rehberi.md` Bölüm 6, 5.5, 14A. PRD projenin tek ve yaşayan "ürün gerçeği"dir.
> Taslağı Analist yazdı; Mimar uygulanabilirliğe bakacak, Sahip K1'de onaylayacak. **Bu bir taslaktır, onay değildir.**

| Alan | Değer |
|---|---|
| Proje (kısa ad) | `tasokey` |
| Proje türü / profil | `oyun-web` (not: kit'te henüz ayrı bir "web oyunu" profili yok — `ofis-sistem-rehberi.md` D-26, `kit\profiller\web-uygulamasi.md` §"Yakın türler". Profil Mimar tarafından yazılacak) |
| PRD sürümü | `1` (taslak; K1 onayından sonra kesinleşir) |
| Durum | `K1 bekliyor` |
| Son onay | — |
| Ek belgeler | `ARASTIRMA.md`, `GDD.md` (v0), `STIL.md` (taslak) |

## 1. Ne yapıyoruz?
Tarayıcıda oynanan, klasik Türk taş oyunu Okey'i ("Taş Okey") temel alan bir web oyunu. Oyuncu kurallara uygun bir Okey eli
oynar: taş çeker, atar, per/çift dizer, elini bitirir. Bu PRD'nin kapsamı ilk sürümün (M1-M3) iskeletidir; kural seti ve oyun
modu (bota karşı mı, gerçek rakiplerle mi) §9'daki açık sorulara bağlıdır.

## 2. Kimin için?
Türkçe konuşan, Okey oyununu bilen ya da öğrenmek isteyen yetişkin kullanıcılar. Okey kültürel olarak genellikle yetişkin/orta
yaş kitlesiyle anılır (kahvehane oyunu); hedef yaş yine de KraftDcm varsayılanı olan **13+** olarak işaretlendi (bkz. §8).

## 3. Neden?
`ARASTIRMA.md` §3'te incelenen rakiplerin bir bölümü yalnız mobil uygulama (bota karşı, çevrimdışı), bir bölümü de üyelik
gerektiren eski web portalları (Mynet, RekorOyun). Kurulumsuz, tarayıcıda doğrudan açılan, reklamsız/satın almasız ve
Türkiye'nin kumar yasağına baştan uyumlu (gerçek para yok) sade bir Okey deneyimi için boşluk var (doğrulanmadı — pazar payı
ölçülmedi, gözlemsel bir bulgu). Ayrıca bu, KraftDcm'nin ilk **web** oyunu olacağı için küçük ve net kapsamlı tutulması önerilir.

## 4. Platform ve kapsam özeti
| Konu | Karar |
|---|---|
| Platformlar | Web tarayıcı (masaüstü + mobil tarayıcı); hangi tarayıcı/sürüm aralığı Mimar'ın işi |
| Ekran yönü | Duyarlı (responsive); mobilde dikey öncelikli olması önerilir (kesin karar Mimar/STIL) |
| Çevrim içi / çevrim dışı | M1: çevrimdışı/yerel (bota karşı) — bkz. §9 Soru 2 için onay bekliyor |
| Diller | TR + EN (KraftDcm varsayılanı); sabit metin yok, dil anahtarından okunur |
| Kural seti | Klasik Okey önerisi; ayrıntı `GDD.md` §1 — bkz. §9 Soru 1 |

## 5. Gereksinimler

Her gereksinim numara alır (`R-001`). Numara işe, teste ve Denetçi kontrolüne kadar izlenir; numara yeniden kullanılmaz.
"Olmazsa olmaz" bir gereksinim eksikse K4 açılmaz.

| No | Gereksinim | Olmazsa olmaz | Kilometre taşı | Kabul ölçütü (nasıl ölçülür) | Durum |
|---|---|---|---|---|---|
| R-001 | Sistem, standart 106 taşlık okey setini (1-13, 4 renk, her biri 2 adet + 2 sahte okey) kurallara uygun karıp dağıtır | evet | M1 | Öz-test: dağıtılan taş sayısı ve seti tam, dağıtım kuralına uygun | açık |
| R-002 | Sistem her elin başında bir gösterge taşı açar ve o elin okey (joker) taşını (göstergeyle aynı renk, bir üst sayı; 13'ün üstü 1) belirler | evet | M1 | Öz-test: gösterge → okey eşleşmesi beklenen taşla eşleşiyor | açık |
| R-003 | Oyuncu sırası geldiğinde yerden ya da son atılan taştan bir taş çeker ve elinden bir taş atar; kurala aykırı hamle (sıra dışı, taşsız çekme/atma) engellenir | evet | M1 | Öz-test: geçerli/geçersiz hamle senaryoları | açık |
| R-004 | Sistem, bir dizi taşın geçerli "per" (aynı renkte ardışık ≥3 sayı) ya da "çift" (aynı sayı, farklı renk, ikili) olup olmadığını doğrular | evet | M1 | Öz-test: geçerli/geçersiz per-çift örnekleri | açık |
| R-005 | Oyuncu elindeki taşları sürükleyip/dizip per-çift kombinasyonu dener; sistem geçerli bir dizilimle elini (tek taş kalıp atarak) bitirebildiğini tespit eder ve "bitti" ilan eder | evet | M1 | Öz-test + elle deneme: tam dizilimli bir el doğru tespit ediliyor | açık |
| R-006 | Oyuncu, insan oyuncuyla aynı kural sınıfını kullanan en az bir zorluk kademesindeki bota karşı tam bir el oynayabilir (başından bitimine kadar hatasız) | evet | M1 | N bot × M el öz-testi hatasız biter (bkz. `GDD.md` §4) | açık |
| R-007 | Sistem bitmiş elin sonucunu (kazanan, kalan taş/ceza durumu) hesaplar ve oyuncuya gösterir | evet | M2 | Elle deneme: el bitince sonuç ekranı doğru puanla görünür | açık |
| R-008 | Oyuncu arayüz dilini TR/EN arasında değiştirebilir; arayüzde sabit (koda gömülü) metin yoktur | evet | M2 | Dil dosyası taraması: yeni ekranda anahtarsız metin = 0 | açık |
| R-009 | Oyun arayüzü en az 3 tarayıcı penceresi oranında (ör. geniş masaüstü, dar masaüstü/tablet, mobil dikey) kullanılabilir biçimde görüntülenir | evet | M2 | Ekran görüntüsü kanıtı: 3 oranda taşlar/düğmeler kesilmiyor, okunur | açık |
| R-010 | Oyuncu bir eli yeniden başlatabilir/yeni el isteyebilir (M1 kapsamında tek elden fazlasını oynamak isterse) | hayır | M2 | Elle deneme: "yeni el" eylemi çalışır | açık |

Kilometre taşları: **M1** çekirdek (kurallar, testler; bota karşı tek el) · **M2** oynanabilir (sonuç ekranı, diller, duyarlı arayüz) ·
**M3** cila (bkz. `GDD.md` §5).

> Not: Gerçek zamanlı çok oyunculu (başka insan oyuncularla ağ üzerinden oynama) kasıtlı olarak bu listeye **gereksinim olarak
> yazılmadı** — kapsamı netleşmemiş bir karardır, bkz. §9 Soru 2. Onaylanırsa yeni numaralarla (R-011…) eklenecek bir PRD farkı
> olur.

## 6. Kapsam dışı
- Gerçek para ile oynama, gerçek para karşılığı jeton/bahis satışı ya da nakde çevrilebilir herhangi bir sanal değer (bkz. §8 —
  Türkiye'de kumar yasağı kapsamına girer, sabit karar, soru değil).
- Kağıt Okey (iskambil kağıdı deseniyle oynanan varyant) — bu iş yalnız taş/klasik görünümlü Okey'i kapsıyor.
- 2 ve 3 kişilik okey varyantları (doğrulanmadı, standart 4 kişilik oyun esas alındı).
- Turnuva, sıralama tablosu (liderlik tablosu), arkadaş ekleme/sosyal özellikler — istenmedi.
- Reklam ve satın alma (ilk sürüm) — KraftDcm varsayılan kararı, ileride ayrı PRD farkıyla değerlendirilir.
- Mobil uygulama (Android/iOS native) paketi — bu iş yalnız web (tarayıcı) sürümünü kapsıyor.

## 7. Ne zaman bitmiş sayılır? (başarı ölçütleri)
| Ölçüt | Hedef | Nasıl ölçülür |
|---|---|---|
| Çekirdek kural öz-testleri | %100 yeşil | Test komutu (Mimar belirleyecek) çıkışı |
| Bot ile el bitirme güvenilirliği | N el × M bot kademesi hatasız biter | Bot koşusu günlüğü (`GDD.md` §4) |
| "Olmazsa olmaz" gereksinimler | R-001…R-006 karşılandı | PRD tablosu "karşılandı" durumu |
| Çoklu ekran oranı | En az 3 oranda arayüz bozulmuyor | Ekran görüntüsü kanıtı |

## 8. Mağaza ve yasal
> Kaynak: `D:\KraftDcm\` notları ve `ARASTIRMA.md` §4-5. Bu proje **web oyunu**; Google Play/App Store süreci (`kit\yayin\google-play.md`)
> uygulanmaz.

| Konu | Karar |
|---|---|
| Hedef yaş | 13+ (KraftDcm varsayılanı) |
| Reklam | Yok (ilk sürüm, KraftDcm varsayılan kararı) |
| Satın alma | Yok — **ve gerçek para/para hükmünde değer hiçbir biçimde yer almayacak** (TR kumar yasağı; sabit karar, bkz. `ARASTIRMA.md` §4) |
| Hesap / giriş | Yok (M1 kapsamı: bota karşı, yerel). Gerçek zamanlı çok oyunculu onaylanırsa yeniden değerlendirilir |
| Toplanan veri | Yok (yalnız tarayıcı yerel depolamasında oyun durumu/ayar; kişisel veri toplanmıyor) |
| İzinler | Yok (web oyunu; konum, bildirim, kamera gibi tarayıcı izni istenmeyecek) |
| Üçüncü taraf SDK | Yok (M1) |
| Yasal gereklilikler (türe göre) | TR kumar yasağına uyum (gerçek para yok, sabit karar) · gizlilik/kullanım şartları sayfası gerekip gerekmediği veri toplama kapsamına göre netleşecek (doğrulanmadı — KVKK açısından veri toplanmıyorsa asgari metin yeterli olabilir, kesin karar değil) |
| Site adresi kalıbı | `kraftdcm.github.io/tasokey/` (KraftDcm standardı); oyunun bu adreste barındırılıp barındırılmayacağı (statik mi, sunucu mu) Mimar kararı — bkz. §9 Soru 5 |

## 9. Açık sorular (K1'de sorulacak)

| # | Soru | Seçenekler (önerilen ilk sırada) |
|---|---|---|
| 1 | Hangi kural seti uygulanacak? | A) Klasik Okey — per/çift yalnız el biterken açılır, tek el biter oyun biter **(önerilen)** — isim ve sadelik açısından "Taş Okey"e daha yakın, kural motoru daha basit · B) 101 Okey — çoklu el, kümülatif skor, önceden açma kuralı — daha popüler ama daha karmaşık · C) İkisi de (mod seçimi) — kapsam büyür, M1'de önerilmez |
| 2 | M1'de oyun modu ne olacak? | A) Yalnız bota karşı (yerel, sunucusuz) **(önerilen)** — XOX Duel'de de ilk sürüm bota karşı + yerel oldu (`D:\KraftDcm\oyunlar.md`); risk ve kapsam düşük · B) Baştan gerçek zamanlı çok oyunculu (ağ üzerinden insan rakipler) — sunucu/oturum/eşleştirme gerektirir, kapsam ve süre büyür |
| 3 | Oyuncu sayısı sabit 4 mü olacak? | A) Evet, yalnız 4 kişilik standart Okey **(önerilen)** — en yaygın ve kaynaklarda net tanımlı biçim · B) 2-3 kişilik modlar da eklensin — kural ayrıntısı doğrulanmadı, ek araştırma gerekir |
| 4 | Ceza/puanlama tablosu hangi kaynağa göre sabitlenecek? | A) `GDD.md`'de önerilen basit tablo (normal bitiş / okey ile bitiş iki kademe) ile başla, Sahip'in bildiği yerel kurallarla M2'de teyit edilsin **(önerilen)** — kaynaklar birbiriyle çelişiyor (`ARASTIRMA.md` §2, satır 10-11) · B) Belirli bir kaynağın (ör. 101buddy.com) tam tablosu birebir uygulansın — tek kaynağa bağlanır, yerel oynanışla farklı olabilir |
| 5 | Oyun hangi adreste/biçimde barındırılacak? | A) `kraftdcm.github.io/tasokey/` altında statik (sunucusuz) site, M1 bota karşı olduğu için teknik olarak mümkün **(önerilen)** — mevcut KraftDcm web altyapısıyla uyumlu · B) Ayrı domain/sunucu — ileride çok oyunculu eklenirse gerekebilir, şimdiden kurulursa kapsam büyür (nihai teknik karar Mimar'ın) |
| 6 | Görsel ton: kumar/kahvehane çağrışımı olan öğelerden (nakit, jeton-para benzetmesi, rulet/zar imgesi) kaçınılsın mı? | A) Evet, kaçınılsın; yalnız geleneksel okey taşı ve masa görseli kullanılsın **(önerilen)** — yasal risk ve marka algısı açısından güvenli taraf (`ARASTIRMA.md` §4) · B) Kısıtlama yok |

Emin olunmayan kural ya da bilgi satırları "doğrulanmadı" diye işaretlenir; bu PRD'de işaretli satırlar `ARASTIRMA.md` §2 ve §4'te
listelidir (ceza puanlama kesinliği, KVKK kapsamı, 2-3 kişilik mod).

## 10. Değişiklik geçmişi (PRD farkları)
Kapsamı değiştiren her istek önce bir **PRD farkı** olur ve Sahip'e sorulur; onaylanınca sürüm artar.

| Sürüm | Tarih | Fark (eklenen / değişen / çıkan gereksinimler) | İstek (iş no) | Onay |
|---|---|---|---|---|
| 1 | 2026-11-19 | İlk sürüm (taslak) | `tasokey#1` | K1 bekliyor |
