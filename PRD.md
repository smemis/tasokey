# PRD: Taş Okey

> Şablon kaynağı: `ofis-sistem-rehberi.md` Bölüm 6, 5.5, 14A. PRD projenin tek ve yaşayan "ürün gerçeği"dir.
> Taslağı Analist yazdı; Mimar uygulanabilirliğe baktı (`MIMARI.md`), Sahip K1'de onayladı. **PRD v1 onaylandı.**
> **v2** (`tasokey#22`, Sahip kararı 2026-11-20): masa düzeni ve etkileşim davranışları R-011…R-015 olarak eklendi; kaynak
> `tasarim/referans/MASA-DUZENI.md` ve `tasarim/referans/masa-duzeni-sema.svg`. Bkz. §10 değişiklik geçmişi.
> **v3** (`tasokey#36`, üst iş `tasokey#35`, Sahip onayı 2026-11-20): R-004 ve R-005 metinleri gerçek Klasik Okey bitiş kuralına
> göre düzeltildi (per = seri + sayı peri · çift = iki birebir aynı taş · bitiş ya tamamen per ya tam 7 çift). Gereksinim
> numaraları değişmedi, yeni gereksinim eklenmedi; kural kodu bu işte değişmedi. Bkz. §10 ve `GDD.md` §1 kural 6, 7, 13.

| Alan | Değer |
|---|---|
| Proje (kısa ad) | `tasokey` |
| Proje türü / profil | `oyun-web` (not: kit'te henüz ayrı bir "web oyunu" profili yok — `ofis-sistem-rehberi.md` D-26, `kit\profiller\web-uygulamasi.md` §"Yakın türler". Taslak profil: `profil-oyun-web-taslak.md`, kit'e girmesi ayrı Sahip onayı ister) |
| PRD sürümü | `3` (v1 **K1 onaylı**; v2 masa düzeni eki, `tasokey#22`; v3 kural düzeltmesi, `tasokey#36`) |
| Durum | `onaylandı` |
| Son onay | Sahip onayı 2026-11-20, tasokey#35 (v3 kural metni); v1 K1 toplu onayı 2026-11-19, v2 eki Sahip kararı 2026-11-20 |
| Ek belgeler | `ARASTIRMA.md`, `MIMARI.md` (v1, K1 onaylı), `GDD.md` (v3), `STIL.md` (taslak, görsel onayı Sahip'te), `tasarim/referans/MASA-DUZENI.md` |

## 1. Ne yapıyoruz?
Tarayıcıda oynanan, klasik Türk taş oyunu Okey'i ("Taş Okey") temel alan bir web oyunu. Oyuncu kurallara uygun bir Okey eli
oynar: taş çeker, atar, per/çift dizer, elini bitirir. Bu PRD'nin kapsamı ilk sürümün (M1-M3) iskeletidir; kural seti **Klasik
Okey** ve oyun modu **yalnız bota karşı** olarak K1'de kesinleşti (§9).

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
| Ekran yönü | Duyarlı (responsive); mobilde **yatay** oynanır, dikey yönde dil anahtarlı "telefonu çevir" uyarısı gösterilir — v1'deki "dikey öncelikli" önerisi R-014 kararıyla netleşti (bkz. §5 R-014, `GDD.md` §6) |
| Çevrim içi / çevrim dışı | M1: çevrimdışı/yerel, yalnız bota karşı — K1 onaylı (§9 Soru 2) |
| Diller | TR + EN (KraftDcm varsayılanı); sabit metin yok, dil anahtarından okunur |
| Kural seti | Klasik Okey — K1 onaylı (§9 Soru 1); ayrıntı `GDD.md` §1 |

## 5. Gereksinimler

Her gereksinim numara alır (`R-001`). Numara işe, teste ve Denetçi kontrolüne kadar izlenir; numara yeniden kullanılmaz.
"Olmazsa olmaz" bir gereksinim eksikse K4 açılmaz.

| No | Gereksinim | Olmazsa olmaz | Kilometre taşı | Kabul ölçütü (nasıl ölçülür) | Durum |
|---|---|---|---|---|---|
| R-001 | Sistem, standart 106 taşlık okey setini (1-13, 4 renk, her biri 2 adet + 2 sahte okey) kurallara uygun karıp dağıtır | evet | M1 | Öz-test: dağıtılan taş sayısı ve seti tam, dağıtım kuralına uygun | açık |
| R-002 | Sistem her elin başında bir gösterge taşı açar ve o elin okey (joker) taşını (göstergeyle aynı renk, bir üst sayı; 13'ün üstü 1) belirler | evet | M1 | Öz-test: gösterge → okey eşleşmesi beklenen taşla eşleşiyor | açık |
| R-003 | Oyuncu sırası geldiğinde yerden ya da son atılan taştan bir taş çeker ve elinden bir taş atar; kurala aykırı hamle (sıra dışı, taşsız çekme/atma) engellenir | evet | M1 | Öz-test: geçerli/geçersiz hamle senaryoları | açık |
| R-004 | Sistem, bir dizi taşın geçerli "per" — seri (aynı renkte ardışık ≥3 sayı) ya da sayı peri (aynı sayının 3-4 farklı renkteki taşı, aynı renk iki kez giremez) — ya da geçerli "çift" (iki birebir aynı taş: aynı sayı ve aynı renk) olup olmadığını doğrular; okey ve sahte okey her ikisinde de eksik taşın yerine geçer | evet | M1 | Öz-test: geçerli/geçersiz seri, sayı peri ve çift örnekleri | karşılandı — `cekirdek/dizilim.js` (ADR-017, `tasokey#37`); kanıt: `testler/dizilim.test.js` tablo testi (38 denetim), ör. "sayı peri geçerli: 5 üç renkte", "sayı peri geçersiz: aynı renk iki kez (kirmizi-5 x2 + siyah-5)", "çift geçersiz: aynı sayı, FARKLI renk … artık sayı perinin işi", "çift geçerli: kirmizi-7 iki nüsha (birebir aynı)" |
| R-005 | Oyuncu elindeki taşları sürükleyip/dizip bitiş dizilimi dener; sistem elini (tek taş kalıp atarak) bitirebildiğini yalnız iki biçimde kabul eder: elin tamamı per gruplarına bölünüyorsa ya da el tam 7 çiftse — per ile çift karışık dizilim bitiş sayılmaz — ve bu durumda "bitti" ilan eder | evet | M1 | Öz-test + elle deneme: tamamen perli ve tam 7 çiftli el bitiş sayılıyor, karışık dizilim sayılmıyor | karşılandı — `cekirdek/cozucu.js` (ADR-017, `tasokey#37`); kanıt: `testler/cozucu.test.js` ("bitebilir: tam 7 birebir çift (14 taş)", "bitemez: karışık (14 taş): seri(4) + 5 birebir çift"), `testler/el.test.js` ("el biter: son taş atılınca kalan 14 taş tam 7 birebir çift", "el bitmez: karışık dizilim (per + çift) bitiş sayılmaz"), regresyon `testler/el-bitiren-taslar.test.js` "(e) ASIL KABUL: ekran görüntüsündeki 15 taşlık el hiçbir atışla bitmez". Tarayıcıda elle doğrulanmadı |
| R-006 | Oyuncu, insan oyuncuyla aynı kural sınıfını kullanan en az bir zorluk kademesindeki bota karşı tam bir el oynayabilir (başından bitimine kadar hatasız) | evet | M1 | N bot × M el öz-testi hatasız biter (bkz. `GDD.md` §4) | karşılandı — `docs/bot/kolay.js` (ADR-018, `tasokey#37`); kanıt: `testler/bot-dayaniklilik.test.js` "bot dayanıklılık koşusu: 200 el, 4 kolay bot (1 \"insan\" koltuğu dahil), sabit tohumlar" (ölçüldü: turSiniri=0, ihlal=0, bitti=194, berabere=6, 17,6 s) ve "bot koşusu deterministiktir: aynı tohumla iki bağımsız koşu…"; `testler/bot-kolay.test.js` ("kolayBotTurOyna: ADR-018/3 regresyonu — tohum 90007 doğal sonlanır ve yer destesi azalır", "kolayBotTurOyna: bitiren taşı atınca el sonunu motor (el.js) ilan eder", "kaynak kontrolü: bot kural sorularını cekirdek'e sorar, kendi geçerlilik mantığını yazmaz"). Tarayıcıda elle doğrulanmadı |
| R-007 | Sistem bitmiş elin sonucunu (kazanan, kalan taş/ceza durumu) hesaplar ve oyuncuya gösterir | evet | M2 | Elle deneme: el bitince sonuç ekranı doğru puanla görünür | açık |
| R-008 | Oyuncu arayüz dilini TR/EN arasında değiştirebilir; arayüzde sabit (koda gömülü) metin yoktur | evet | M2 | Dil dosyası taraması: yeni ekranda anahtarsız metin = 0 | açık |
| R-009 | Oyun arayüzü en az 3 tarayıcı penceresi oranında (ör. geniş masaüstü, dar masaüstü/tablet, mobil dikey) kullanılabilir biçimde görüntülenir | evet | M2 | Ekran görüntüsü kanıtı: 3 oranda taşlar/düğmeler kesilmiyor, okunur | açık |
| R-010 | Oyuncu bir eli yeniden başlatabilir/yeni el isteyebilir (M1 kapsamında tek elden fazlasını oynamak isterse) | hayır | M2 | Elle deneme: "yeni el" eylemi çalışır | açık |
| R-011 | Sistem arayüzde atılan taşları oyuncu başına ayrı köşe yığını olarak gösterir (atan oyuncu ile sıradaki oyuncu arasındaki köşe); en üstteki taş tam, alttakiler kısmi görünür, kaç taş biriktiği anlaşılır | evet | M2 | Ekran görüntüsü + öz-test: 4 köşe yığını doğru oyuncuya atfedilir, üstteki taş görünür | karşılandı — motor oyuncu başına ayrı yığın tutuyor (`atilanYiginlar`, ADR-010, `tasokey#25`), arayüz 4 köşeyi ayrı çiziyor (`tasokey#29`); ekran görüntüsü kanıtı `tasokey#32` |
| R-012 | Oyuncu taş çekerken desteden ya da kendisinden önceki oyuncunun köşe yığınının üstünden seçer (sürükle-bırak ya da dokun); başka köşeden çekemez | evet | M2 | Elle deneme: iki çekme kaynağı da çalışır, geçersiz kaynak engellenir (motor tarafı zaten R-003'le karşılanıyor) | karşılandı — `tasokey#30` (sürükle/dokun/klavye), kod incelemesiyle doğrulandı; gerçek fare/dokunmayla elle denenmedi |
| R-013 | Oyuncu elini bitirirken son taşını ortadaki desteye bırakır; el bitirilebilir durumdaysa deste görsel olarak vurgulanır (dil anahtarlı metin) | evet | M2 | Elle deneme: bitirme hareketi ortadaki desteye bırakmayla çalışır, vurgulama görünür | karşılandı — `tasokey#30` (`yerDestesi.bitirilebilirIpucu`), kod incelemesiyle doğrulandı; gerçek fare/dokunmayla elle denenmedi |
| R-014 | Oyun telefon dikey yönde açıldığında oyun alanı yerine dil anahtarlı "telefonu yan çevir" uyarısı gösterilir; telefon yatay döndürüldüğünde dört kenar düzeni sığdırılmış biçimde görünür | evet | M2 | Ekran görüntüsü: dikey telefon oranında uyarı görünür, yatayda masa görünür | karşılandı — `tasokey#31`; ekran görüntüsü kanıtı (390×844 dikey, 844×390 yatay) `tasokey#32` |
| R-015 | Masa, ıstaka ve taş görselleri `STIL.md`'de tanımlı görünüme uygun çizilir: desenli yeşil keçe masa + ahşap çerçeve, iki kademeli kalın ahşap ıstaka, fildişi taş gövdesi, kalın düz (sistem yazı tipi) rakam ve altında aynı renkte daire | evet | M2/M3 | Ekran görüntüsü karşılaştırması: `STIL.md` ve `tasarim/referans/MASA-DUZENI.md` ile eşleşiyor | karşılandı — ekran görüntüsü kanıtı `tasokey#32`; görsel beğeni/son onay Sahip'te (K4) |

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
| Site adresi kalıbı | `https://kraftdcm.github.io/tasokey/` — K1 onaylı (§9 Soru 5, `MIMARI.md` ADR-005); kendi deposu (`kraftdcm/tasokey`) `docs/` klasöründen statik yayın |

## 9. Açık sorular — K1'de kapatıldı (2026-11-19, Sahip, toplu onay: her soruda önerilen seçenek)

> Bütün sorular kapandı; açık soru kalmadı. Karar sütunu seçilen seçeneği gösterir; ayrıntı `MIMARI.md` ADR-005/ADR-008/ADR-009'da.

| # | Soru | Seçenekler (önerilen ilk sırada) | Karar |
|---|---|---|---|
| 1 | Hangi kural seti uygulanacak? | A) Klasik Okey — per/çift yalnız el biterken açılır, tek el biter oyun biter **(önerilen)** — isim ve sadelik açısından "Taş Okey"e daha yakın, kural motoru daha basit · B) 101 Okey — çoklu el, kümülatif skor, önceden açma kuralı — daha popüler ama daha karmaşık · C) İkisi de (mod seçimi) — kapsam büyür, M1'de önerilmez | **A — Klasik Okey** |
| 2 | M1'de oyun modu ne olacak? | A) Yalnız bota karşı (yerel, sunucusuz) **(önerilen)** — XOX Duel'de de ilk sürüm bota karşı + yerel oldu (`D:\KraftDcm\oyunlar.md`); risk ve kapsam düşük · B) Baştan gerçek zamanlı çok oyunculu (ağ üzerinden insan rakipler) — sunucu/oturum/eşleştirme gerektirir, kapsam ve süre büyür | **A — yalnız bota karşı** |
| 3 | Oyuncu sayısı sabit 4 mü olacak? | A) Evet, yalnız 4 kişilik standart Okey **(önerilen)** — en yaygın ve kaynaklarda net tanımlı biçim · B) 2-3 kişilik modlar da eklensin — kural ayrıntısı doğrulanmadı, ek araştırma gerekir | **A — sabit 4 kişi** |
| 4 | Ceza/puanlama tablosu hangi kaynağa göre sabitlenecek? | A) `GDD.md`'de önerilen basit tablo (normal bitiş / okey ile bitiş iki kademe) ile başla, Sahip'in bildiği yerel kurallarla M2'de teyit edilsin **(önerilen)** — kaynaklar birbiriyle çelişiyor (`ARASTIRMA.md` §2, satır 10-11) · B) Belirli bir kaynağın (ör. 101buddy.com) tam tablosu birebir uygulansın — tek kaynağa bağlanır, yerel oynanışla farklı olabilir | **A, değişti** — okey/sahte okey atmak motor tarafından baştan engellenir (`MIMARI.md` ADR-008/2), bu yüzden ceza puanı tablosu gerekmiyor; bkz. `GDD.md` §1 kural 10 |
| 5 | Oyun hangi adreste/biçimde barındırılacak? | A) `kraftdcm.github.io/tasokey/` altında statik (sunucusuz) site, M1 bota karşı olduğu için teknik olarak mümkün **(önerilen)** — mevcut KraftDcm web altyapısıyla uyumlu · B) Ayrı domain/sunucu — ileride çok oyunculu eklenirse gerekebilir, şimdiden kurulursa kapsam büyür (nihai teknik karar Mimar'ın) | **A — `kraftdcm/tasokey` deposu, `docs/`'tan GitHub Pages** |
| 6 | Görsel ton: kumar/kahvehane çağrışımı olan öğelerden (nakit, jeton-para benzetmesi, rulet/zar imgesi) kaçınılsın mı? | A) Evet, kaçınılsın; yalnız geleneksel okey taşı ve masa görseli kullanılsın **(önerilen)** — yasal risk ve marka algısı açısından güvenli taraf (`ARASTIRMA.md` §4) · B) Kısıtlama yok | **A — kaçınılsın** (bağlayıcı, `STIL.md` §4) |

Emin olunmayan kural ya da bilgi satırları "doğrulanmadı" diye işaretlenir; bu PRD'de işaretli satırlar `ARASTIRMA.md` §2 ve §4'te
listelidir (KVKK kapsamı, 2-3 kişilik mod). Ceza puanlama kesinliği sorusu yukarıda kapandı (Soru 4).

## 10. Değişiklik geçmişi (PRD farkları)
Kapsamı değiştiren her istek önce bir **PRD farkı** olur ve Sahip'e sorulur; onaylanınca sürüm artar.

| Sürüm | Tarih | Fark (eklenen / değişen / çıkan gereksinimler) | İstek (iş no) | Onay |
|---|---|---|---|---|
| 1 | 2026-11-19 | İlk sürüm (taslak, R-001…R-010) | `tasokey#1` | K1 onaylandı (toplu, 2026-11-19) |
| 1 | 2026-11-19 | §9'un altı sorusu kapatıldı, "onaylandı" damgası eklendi; gereksinim numaraları (R-001…R-010) değişmedi | `tasokey#2` | K1 onaylandı (toplu, 2026-11-19) |
| 2 | 2026-11-20 | Masa düzeni ve etkileşim (dört köşe yığını, deste/gösterge, bitirme hedefi, telefon dikey uyarısı, masa/ıstaka/taş görseli) gereksinim olarak eklendi: R-011…R-015. Kaynak: `tasarim/referans/MASA-DUZENI.md`, `tasarim/referans/masa-duzeni-sema.svg`. Yalnız belge; arayüz ve kural kodu değişmedi | `tasokey#22` | Sahip onaylandı (2026-11-20) |
| 3 | 2026-11-20 | Motor karşılığı yazıldı (ADR-017): **R-004** ve **R-005** durumu "açık" → **"karşılandı"**. Gereksinim metinleri değişmedi, yeni gereksinim yok. Kanıt: `testler/dizilim.test.js`, `testler/cozucu.test.js`, `testler/el.test.js`, `testler/el-bitiren-taslar.test.js` (regresyon: Sahip'in ekran görüntüsündeki el). Not: **R-006** (bot dayanıklılığı) bu kural değişikliğiyle yeniden açıldı — kolay botun sezgiseli eski kurala göre puanlıyor, 200 elin 20'si tur sınırına çarpıyor; ayrı iş | `tasokey#37` | Geliştirici, 2026-11-20 (Denetçi kararı bekliyor) |
| 3 | 2026-11-20 | Bot sezgiseli ADR-018'e göre yenilendi: **R-006** durumu "açık" → **"karşılandı"**. Gereksinim metni ve ölçütü ("N bot × M el öz-testi hatasız biter") değişmedi, gevşetilmedi; yeni gereksinim yok. Kanıt: `testler/bot-dayaniklilik.test.js` (200 el, turSiniri 20 → **0**, ihlal 0) ve `testler/bot-kolay.test.js` (ADR-018 kaynak kontrolü + tohum 90007 regresyonu). `MIMARI.md` sürüm 5 | `tasokey#37` (plan: Mimar) | Geliştirici, 2026-11-20 (Denetçi kararı bekliyor) |
| 3 | 2026-11-20 | Gerçek Klasik Okey bitiş kuralı: **R-004** ve **R-005** metinleri değişti (per = seri + sayı peri · çift = iki birebir aynı taş · bitiş ya tamamen per ya tam 7 çift, karışık yok). Eklenen/çıkan gereksinim yok, numaralar değişmedi; R-004/R-005 durumu "açık" kaldı (motor işi kapatacak). `GDD.md` v3 (§1 kural 6, 7, yeni 13 ve "Kazanma / bitiş koşulu"), `ARASTIRMA.md` §2 düzeltme notu. Yalnız belge; kural kodu değişmedi | `tasokey#36` (karar: `tasokey#35`) | Sahip onayı 2026-11-20, tasokey#35 |
