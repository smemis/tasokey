# GDD: Taş Okey

> GDD, PRD'nin ekidir: "ne" ve "neden" `PRD.md`'de, oyunun ayrıntısı burada. Çelişirse PRD geçerlidir.
> Bu sürüm **v1**: K1'in (Sahip, 2026-11-19) dört kural kararı işlendi (`MIMARI.md` ADR-008); `MIMARI.md` ile çelişen
> kural ifadesi yok.
> **v2** (`tasokey#22`, Sahip kararı 2026-11-20, KraftOfis brainstorm (21)): §7 "Masa düzeni ve etkileşim" eklendi; kaynak
> `tasarim/referans/MASA-DUZENI.md` ve `tasarim/referans/masa-duzeni-sema.svg`. Bu belge güncellemesi arayüz ya da kural
> kodunu değiştirmez — yalnız tasarım kaydı.
> **v3** (`tasokey#36`, üst iş `tasokey#35`, Sahip onayı 2026-11-20): gerçek Klasik Okey bitiş kuralı işlendi — §1 kural 6
> (per = seri **+ sayı peri**), kural 7 (çift = iki birebir aynı taş) düzeltildi, kural 13 (bitiş ya tamamen per ya tam 7 çift,
> karışık yok) eklendi, "Kazanma / bitiş koşulu" paragrafı yeniden yazıldı. Bu da yalnız belge güncellemesidir; motor karşılığı
> (ADR-017) ayrı bir iştir, kural kodu bu işte değişmedi.
> **v4** (`tasokey#41`, Mimar/Geliştirici kararı, 2026-11-21): §7 **Soru 3 kapandı — B** (M1'den itibaren üç bot kademesi:
> kolay/orta/zor) ve §4 "Botlar" tablosunun "Zorluk kademeleri", "Karar yöntemi", "Ölçüm" satırları buna göre güncellendi.
> Bu soruyu belge zaten Mimar/Geliştirici'ye bırakmıştı; kural (§1) ve bitiş koşulu değişmedi, yeni gereksinim yok.
> Karşılığı `MIMARI.md` ADR-013 ve `docs/bot/bot.js`.
> **v5** (`tasokey#50`, Sahip kararı 2026-11-21): §1 **kural 10 değişti** — okey (joker) ve sahte okey
> taşının atılması artık **serbesttir**; motor hamleyi engellemez, ceza da yoktur. Karar
> `MIMARI.md` ADR-008 **sürüm 2**'dir; kural `cekirdek/kural.js`'teki aynı ayarda duruyor ve
> kapatma anahtarı olarak çalışmayı sürdürüyor. Arayüz karşılığı: insan oyuncu joker attığında
> bilgilendirme penceresi açılır (ADR-016 madde 8) — hamle engellenmez, pencere yalnız anlatır.
> Başka kural (6-9, 11-13) ve bitiş koşulu değişmedi; yeni gereksinim yok.
> **v6** (`tasokey#66`, Sahip kararı 2026-11-22): §1 **kural 6a değişti** — seri 13'ten 1'e **döner**,
> yani `12-13-1` artık **geçerli perdir**. Karar `MIMARI.md` ADR-008 **sürüm 3**'tür; kural yine
> `cekirdek/kural.js`'teki aynı ayarda (`onUcBirGecisiPerSayilir`) duruyor ve kapatma anahtarı
> olarak çalışmayı sürdürüyor. §7 Soru 1'in cevabı bu yüzden **A → B** oldu. Başka kural (7-13),
> bitiş koşulu ve gereksinim metinleri değişmedi; yeni gereksinim yok.
> **v7** (`tasokey#80`/`tasokey#81`, Sahip kararı 2026-11-24): §1 **kural 4 yeniden yazıldı** — sahte
> okey **joker değildir**, o elin okey taşının **renk+sayı değerini** alır ve her yerde o değerdeki
> sıradan taş gibi davranır; joker yalnız gösterge+1 aynı renk taşlardır. Kural 6 ve 7'deki "okey ve
> sahte okey eksik taşın yerine geçer" cümleleri buna göre düzeltildi. Karar `adr/ADR-027`'dir; kural
> `cekirdek/kural.js`'te yeni bir ayarda (`sahteOkeyJokerGibiDavranir`, varsayılan `false`) kapatma
> anahtarı olarak duruyor. Kural 10 ve `okeyVeSahteOkeyAtmaYasak` **anlamını korur** (açıkken okey ve
> sahte okey atılamaz); başka kural (5, 8, 9, 11-13), bitiş koşulu ve gereksinim metinleri değişmedi.
> **v8** (Sahip kararı 2026-11-28): §1 **kural 6a daraldı** — seri 13'ten sonra yalnız 1'e döner ve **1
> serinin son taşıdır**: `12-13-1`, `11-12-13-1` geçerli; `13-1-2`, `12-13-1-2`, `13-1-2-3-4` geçersiz.
> Karar `MIMARI.md` ADR-008 **sürüm 4**'tür; kapatma anahtarı yine `onUcBirGecisiPerSayilir`. Başka
> kural, bitiş koşulu ve gereksinim metinleri değişmedi.

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| GDD sürümü | `8` (v8: seri 13'ten sonra yalnız 1'e döner, 1 serinin son taşı — §1 kural 6a, ADR-008 sürüm 4; önceki v7: sahte okey joker değil, okeyin değerini alır — §1 kural 4/6/7, `tasokey#81`, ADR-027; önceki v6: seri 13'ten 1'e döner, `12-13-1` geçerli per — §1 kural 6a, `tasokey#66`; v5: okey/sahte okey atmak serbest — §1 kural 10, `tasokey#50`; v4: bot zorluk kademeleri, `tasokey#41`) |
| Bağlı PRD sürümü | `3` (`tasokey#36` ile birlikte) |
| Son onay | Sahip onayı 2026-11-20, tasokey#35 |

## 1. Kurallar
> Her kural bir PRD gereksinimine bağlanır. Kaynaklar arası fark `ARASTIRMA.md` §2'de; emin olunmayan satır "doğrulanmadı".
> Kural seti: **Klasik Okey** (`PRD.md` §9 Soru 1, K1 onaylı). Kural 6, 10-12 K1'in (Sahip, 2026-11-19) dört kural kararını
> işler (`MIMARI.md` ADR-008); bu dört madde `cekirdek/kural.js` içinde tek nesnede ayar olarak durur.
> Kural 6'nın sayı peri maddesi, kural 7 ve kural 13 Sahip'in 2026-11-20 kararıdır (`tasokey#35`); gerçek Klasik Okey'den
> sapan eski metin bu sürümde düzeltildi.

| # | Kural | Gereksinim | Kaynak | Durum |
|---|---|---|---|---|
| 1 | Set: 1-13 arası sayı, 4 renk (kırmızı/siyah/mavi/sarı), her sayı-renk 2 adet (104 taş) + 2 sahte okey = 106 taş | R-001 | `ARASTIRMA.md` §2.1 | doğrulandı |
| 2 | Dağıtım: başlayan oyuncu 15, diğer 3 oyuncu 14 taş alır | R-001 | `ARASTIRMA.md` §2.2 | doğrulandı |
| 3 | Gösterge: karma sonrası açılan bir taş; okey taşı göstergeyle aynı renkte bir üst sayıdır (13 → 1 döner) | R-002 | `ARASTIRMA.md` §2.3 | doğrulandı |
| 4 | **Joker yalnız gösterge+1 aynı renk taşlardır** (kural 3; 13 → 1 döner). **Sahte okey joker değildir:** o elin okey taşının **renk+sayı değerini** alır ve her yerde (seri, sayı peri, çift, bot değerlendirmesi, döküm) o değerdeki sıradan taş gibi davranır — ör. gösterge kırmızı 10 iken sahte okey "kırmızı 11"dir, iki sahte okey aynı değerde olduğu için çift kurar ama bir seride yan yana gelemez. Göstergenin eldeki kopyası da sıradan taştır. Ayar `cekirdek/kural.js`'te **kapatma anahtarı** olarak duruyor (`sahteOkeyJokerGibiDavranir`): açılırsa sahte okey yine evrensel joker olur. *(v6'ya kadar evrensel jokerdi — K1, 2026-11-19.)* | R-002 | `adr/ADR-027` (Sahip kararı 2026-11-24, `tasokey#80`); önceki metin `ARASTIRMA.md` §2.4 | doğrulandı (Sahip, 2026-11-24; önceki K1, 2026-11-19) |
| 5 | Tur: oyuncu yerden ya da son atılan taştan 1 taş çeker, elinden 1 taş atar; sıradaki oyuncuya geçer | R-003 | `ARASTIRMA.md` §2.5 | doğrulandı |
| 6 | Per iki biçimde olur: **(a) seri** — aynı renkte ardışık en az 3 sayı; sıra **13'ten 1'e döner**, yani **`12-13-1` geçerli perdir** (v6, `tasokey#66`); **1 serinin son taşıdır**, ardından 2, 3… gelemez — `13-1-2`, `12-13-1-2` geçersiz (v8, 2026-11-28). Bir seride aynı sayı iki kez bulunamaz; bu yüzden en uzun seri 13 taştır. **(b) sayı peri** — aynı sayının 3 ya da 4 farklı renkteki taşı; aynı renk bir perde iki kez bulunamaz. **Okey (joker)** her iki per türünde de eksik taşın yerine geçer; **sahte okey geçmez** — o, kendi değerindeki (kural 4) sıradan taş olarak perde yer alır (v7, `tasokey#81`) | R-004 | (a) `MIMARI.md` ADR-008/1 (K1 kararı; **sürüm 3** Sahip kararı 2026-11-22, `tasokey#66`) · (b) Sahip kararı 2026-11-20 (`tasokey#35`) | doğrulandı (seri: K1, 2026-11-19 · dönüşlü sıra: Sahip, 2026-11-22 · sayı peri: Sahip, 2026-11-20) |
| 7 | Çift: iki **birebir aynı** taş (aynı sayı **ve** aynı renk). **Okey (joker)** bir çiftin yerini tutabilir; **sahte okey tutmaz** — yalnız kendi değerindeki (kural 4) taşla, yani öbür sahte okeyle ya da gerçek okeyle çift kurar (v7, `tasokey#81`). Eski "aynı sayı, 2 farklı renk" tanımı yanlıştı; o dizilim artık sayı perinin parçasıdır (kural 6b) | R-004 | Sahip kararı 2026-11-20 (`tasokey#35`) + `adr/ADR-027` (Sahip kararı 2026-11-24); `ARASTIRMA.md` §2 satır 6 düzeltildi | doğrulandı (Sahip, 2026-11-20 · sahte okey: Sahip, 2026-11-24) |
| 8 | Klasik Okey'de per/çift masaya yalnız el biterken (son taşı **ortadaki desteye bırakırken** — kural 15) açılır; ara aşamada masaya taş konmaz | R-005 | `ARASTIRMA.md` §2.7 | doğrulandı |
| 9 | Gösterge taşı kendisi çift sayılamaz | R-004 | `ARASTIRMA.md` §2, satır 9 | doğrulandı |
| 10 | Okey (joker) ve sahte okey taşı **atılabilir**: hamle engellenmez, ceza puanı da yoktur (tek elde ceza tablosunun yeri yok). İnsan oyuncu joker attığında arayüz bir bilgilendirme penceresi gösterir (ADR-016/8) — pencere yalnız anlatır, hamleyi geri almaz. Yasak, `cekirdek/kural.js`'teki ayarda **kapatma anahtarı** olarak duruyor: açılırsa motor hamleyi yine baştan engeller. *(v4'e kadar yasaktı — K1, 2026-11-19.)* | R-003, R-007 | `MIMARI.md` ADR-008/2 **sürüm 2** (Sahip kararı, `tasokey#50`) | doğrulandı (Sahip, 2026-11-21; önceki varsayılan K1, 2026-11-19) |
| 11 | Gösterge taşı sahte okey çıkarsa taş desteye karışır ve gösterge yeniden açılır (yeni gösterge, yeni okey taşı belirler) | R-002 | `MIMARI.md` ADR-008/3 (K1 kararı) | doğrulandı (K1, 2026-11-19) |
| 12 | Yerdeki (desteki) taşlar kimse elini bitirmeden tükenirse el **berabere** sayılır ve yeni el başlar | R-006, R-007 | `MIMARI.md` ADR-008/4 (K1 kararı) | doğrulandı (K1, 2026-11-19) |
| 13 | Bitiş: el ya **tamamen per** gruplarına bölünür (her grup seri ya da sayı peri, her biri en az 3 taş), ya da **tam 7 çift**tir; per ile çift **karışık kullanılamaz** | R-004, R-005 | Sahip kararı 2026-11-20 (`tasokey#35`); motor karşılığı ADR-017, `MIMARI.md`'ye motor işinde yazılır | doğrulandı (Sahip, 2026-11-20) |
| 14 | Önceki oyuncunun köşe yığınından çekilen taş, oyuncu **henüz atmadan** aynı köşeye **geri bırakılabilir**: taş yığının üstüne döner, el 15 → 14 olur, sayaç n-1 → n'e geri gelir ve tur yeniden "çekilmedi" sayılır — oyuncu bu kez desteden çekebilir. Geri bırakma bir **hamle değildir**: sıra geçmez, tur sayacı artmaz. Yalnız **köşeden** çekilen taş için geçerlidir (desteden çekileni geri koymak yer destesinin sırasını bozardı) ve yalnız **atmadan önce**. Ayar `cekirdek/kural.js`'te **kapatma anahtarı** olarak durur (`cekilenTasGeriBirakilabilir`): kapatılırsa motorun tek kapısı her denemeyi reddeder, arayüzün vurgusu da kendiliğinden kaybolur | R-003 | Sahip kararı 2026-11-24 (`tasokey#84` planı, iş `tasokey#87`) | doğrulandı (Sahip, 2026-11-24) |

| 15 | **Bitirmek oyuncunun SEÇİMİDİR:** el yalnız oyuncu son taşını **ortadaki yer destesine** (bitirme alanı) bıraktığında biter. El bitirilebilir durumda olsa bile oyuncu taşını **köşesine atarsa** bu sıradan bir atmadır — el devam eder, sıra sonraki oyuncuya geçer ve bitirme fırsatı sıradaki turlarda da açık kalır; bitirilebilir durumda destenin vurgusu sürer (R-013). Aynı kural botlar için de geçerlidir: bot bitirmek istediğinde bitirme hamlesini açıkça yapar. Motor karşılığı `cekirdek/el.js` `bitir` kapısıdır (`at` eli asla kendiliğinden bitirmez); bitiş koşulunun kendisi değişmedi (kural 13, ADR-017) | R-005, R-013 | Sahip kararı 2026-11-25 (hata bildirimi, iş `tasokey#89`) | doğrulandı (Sahip, 2026-11-25) |

### Kural farkları tablosu (varsa)
| Konu | Seçenek A (Klasik) | Seçenek B (101 Okey) | Öneri |
|---|---|---|---|
| Masaya açma zamanı | Yalnız el biterken | Per ≥101 ya da ≥5 çift olunca önceden | A |
| El/skor yapısı | Tek el, biten oyun biter | Çoklu el, kümülatif skor (101'e kadar) | A |

### Kazanma / bitiş koşulu
Oyuncu elindeki 14 taşı (okey ve sahte okey dahil) geçerli bir dizilime dizip son taşını **ortadaki desteye bırakırsa** (kural 15)
ve "taşsız" kalırsa eli kazanır ("okey/bitti"). Bitiş yalnız **iki** biçimde geçerlidir (kural 13):

1. **Tamamen per:** 14 taşın tamamı per gruplarına bölünür; her grup ya seri ya sayı peridir ve en az 3 taş içerir (kural 6).
2. **Tam 7 çift:** 14 taşın tamamı çifttir; her çift iki birebir aynı taştır (kural 7).

Per ile çift **aynı elde karışık kullanılamaz**; karışık bir dizilim (ör. 6 çift + 1 per) bitiş sayılmaz. **Okey (joker)** her
iki yolda da eksik taşın yerine geçer; **sahte okey geçmez** — kendi değerindeki sıradan taş olarak dizilime girer (kural 4,
v7). Elin tamamı bu iki biçimden birine bölünmüyorsa bitiş kabul edilmez (R-005).

## 2. Mekanikler
| Mekanik | Oyuncu ne yapar | Sistem ne yapar | Gereksinim |
|---|---|---|---|
| Taş çekme | Yerden ya da atılan taştan birini seçer | Elindeki taş sayısını günceller, geçersiz çekimi engeller | R-003 |
| Çekmeyi geri alma | Köşeden çektiği taşı, **atmadan önce** aynı köşeye geri bırakır (kural 14) | Taşı yığının üstüne koyar, turu yeniden "çekilmedi" yapar; sıra ve tur sayacı değişmez | R-003 |
| Taş atma | Elinden bir taş seçip **kendi köşesine** atar | Atılan taşı o köşeye koyar, sırayı ilerletir; el bitirilebilir olsa da eli **bitirmez** (kural 15) | R-003 |
| Dizme/deneme | Elindeki taşları sürükleyip per/çift grupları oluşturmayı dener (yalnız görsel düzenleme, masaya açma değil) | Geçerliliği anlık doğrulamaz zorunlu değildir; bitişte tam kontrol yapar | R-004, R-005 |
| Bitirme | Son taşını **ortadaki desteye (bitirme alanı) bırakarak** "bitti" bildirir (kural 15; köşeye atmak bitirme değildir) | Elin tamamının geçerli per/çift olduğunu doğrular, kazananı ilan eder; bitmiyorsa hamleyi `bitirilemez` ile reddeder ve el sürer | R-005, R-006 |
| Bot turu | (Yok — bot kendi kendine oynar) | Botun elini kural motoruyla değerlendirip hamle seçer | R-006 |
| Sonuç gösterimi | Sonuç ekranını görür, yeni el başlatabilir ya da başlangıç ekranına dönüp zorluğu değiştirebilir | Puanı hesaplar, ekrana yazar | R-007, R-010 |

- **Arayüz kabuğu** (ADR-016, `tasokey#42`): ekranlar tek durum makinesine bağlıdır — `baslangic` (Yeni oyun +
  Kolay/Orta/Zor seçimi) → `masa` (el sürüyor) → `sonuc` (el bitti) → `baslangic`; `sonuc`tan "Yeni el" ile aynı
  zorlukla doğrudan `masa`ya dönülür. İlk açılış `baslangic` ekranındadır ve seçilen kademe o eli oynayan botların
  kademesidir (§4 "Zorluk kademeleri"). Seçim kayıtta durur (`kayit/depo.js` şema sürüm 2: yalnız dil + zorluk).

- Oyun modları: M1'de yalnız "bota karşı" (1 insan + 3 bot), bkz. `PRD.md` §9 Soru 2.
- Tur / akış: karma → dağıtım → gösterge/okey belirleme → sırayla çek-at → biten oyuncuda el sonu → sonuç ekranı.
- Girdi: dokunma/tıklama (taş seçme, sürükleme); klavye girdisi zorunlu değil (doğrulanmadı — erişilebilirlik ihtiyacı varsa ayrı soru).

## 3. Ekonomi
Yok. Gerçek para, satın alınabilir jeton ya da nakde çevrilebilir herhangi bir değer **yok** (TR kumar yasağı, `PRD.md` §8 —
sabit karar). Oyun içi puan/skor varsa bile yalnız o elin/oturumun sonucunu gösterir, biriktirilip harcanabilir bir para birimi
değildir.

## 4. Botlar
| Konu | Tanım |
|---|---|
| Zorluk kademeleri | **Üç kademe M1'de: kolay / orta / zor** (§7 Soru 3 kapandı — B; karar Mimar/Geliştirici, `MIMARI.md` ADR-013, `tasokey#41`). Üçü aynı sezgiselin üç ayarıdır, kuralı değiştirmez: orta ADR-018 sezgiselinin kendisi, kolay zayıflatılmış (bitirme fırsatını kaçırabilir, köşeden çekmeyi çoğunlukla kullanmaz, en izole taşı her zaman seçmez), zor güçlendirilmiş (bitiren taşı çözücüyle görür, atacağı taşı elin gerçek bölümüne göre seçer). Oyuncu kademeyi **başlangıç ekranından seçer** (ADR-016, `tasokey#42`); seçim kayıtta durur, kayıt yoksa/bozuksa varsayılan (orta) oynanır |
| Karar yöntemi | Kural tabanlı basit sezgisel (hangi taşı çekeceği/atacağı per-çift tamamlama olasılığına göre); ayrıntılı algoritma bu v0'da tanımlı değil, Mimar/Geliştirici tamamlar → `MIMARI.md` ADR-018 (sezgisel) + ADR-013 (kademeler) |
| Oyunla aynı kural sınıfını kullanır mı | Evet — bot ve insan oyuncu aynı saf kural motorunu (per/çift geçerlilik, bitiş kontrolü) kullanır |
| Ölçüm | Örnek hedef: N bot × M el öz-testi hatasız biter (kesin N/M Mimar/Geliştirici belirler); değişmez: botun asla kurala aykırı hamle yapmaması. **Ölçüldü** (kademe başına 200 el, 4 bot, sabit tohum 91000-91199; son ölçüm `tasokey#83`, sahte okey joker değilken — ADR-027): motorun reddettiği öneri 0 ve sonlanmayan el 0 — üç kademede de. Kademe gücü aynı dağıtımlarda kazanma oranıyla ölçülür: kolay **%1,0** · orta **%28,0** · zor **%41,5** (`testler/bot-zorluk.olcum.js`). Zorluk sırası (kolay < orta < zor) korundu, aralık açıldı: elde joker azalınca kolay kademe en çok, zor kademe en az etkilendi. *(Önceki ölçümler: `tasokey#66` %4,0 / %28,5 / %34,0 · `tasokey#50` %3,5 / %26,5 / %34,5 · `tasokey#41` %5,5 / %26,5 / %34,5.)* |

## 5. Kilometre taşı testleri
| Kilometre taşı | Test (ölçülebilir) |
|---|---|
| M1 çekirdek | Kural öz-testleri yeşil (dağıtım, gösterge/okey, per/çift geçerliliği, bitiş tespiti); bot ile N el hatasız biter |
| M2 oynanabilir | Elle deneme: tarayıcıda bir el baştan sona oynanır, sonuç ekranı ve TR/EN dil değişimi çalışır; K4, Sahip |
| M3 cila | Son deneme: 3 ekran oranında arayüz kanıtı, ceza/puan tablosu Sahip ile teyitli; K5, Sahip |

## 6. Masa düzeni ve etkileşim

> Kaynak: Sahip'in kararı, 2026-11-20 (KraftOfis brainstorm (21)); ayrıntı `tasarim/referans/MASA-DUZENI.md` ve kaba yerleşim
> şeması `tasarim/referans/masa-duzeni-sema.svg`. Gereksinimler `PRD.md` §5'te R-011…R-015; bu bölüm yalnız tasarım kaydıdır,
> bu iş (`tasokey#22`) arayüz ya da kural kodunu değiştirmez.

### Yerleşim (yatay ekran)
- Dört oyuncu dört kenarda: **Sahip altta** (kendi ıstakası), **botlar sol, üst, sağ**. Oyuncu adları kenarda, dil dosyasından (R-008).
- **Deste ortada:** ters dönmüş taşlardan üst üste görünen yığın (kalan sayı okunur gerekmez, görsel yığın yeterli). **Gösterge taşı**
  destenin yanında açık durur (GDD §1 kural 3).
- **Köşe (atılan taş) yığınları:** her oyuncunun attığı taş, **kendisi ile sıradaki oyuncu arasındaki köşede** kendisine ait
  yığında birikir. Alınmayan taşlar üst üste birikir; en üstteki tam görünür, alttakiler hafif kaydırılmış görünür (kaç taş
  biriktiği anlaşılır). Sıra yönü saat yönünün tersi olduğunda: Sahip (alt) → sağ → üst → sol → Sahip; Sahip'in attığı yığın
  **sağ alt** köşede, Sahip'in çekebileceği yığın (soldaki oyuncunun attığı) **sol alt** köşede. (Şema bu yönü gösterir; gerçek
  yön kural ayarına bağlıdır.)

### Etkileşim
| Eylem | Nasıl |
|---|---|
| Taş çekme | Ortadaki desteden **ya da** önceki oyuncunun köşedeki yığınının üstünden: sürükle-bırak ya da dokun |
| Taş atma | Istakadaki taşı sürükleyip **sıradaki oyuncunun tarafındaki köşe yığınına** bırak |
| Bitirme | Son taşı **ortadaki desteye** bırak; el bitirilebilir durumdaysa deste görsel olarak vurgulanır ("bitirmek için buraya bırak" — dil anahtarlı) |
| Telefon yedeği | Sürükleme zorunlu değil: dokun-seç → hedefe dokun |
| Istakada düzen | Taşları sürükleyerek yer değiştirme, araya boşluk bırakma (yalnız görsel düzenleme, kural motorunu etkilemez) |

"At" düğmesi kaldırılabilir; ekran okuyucu ve klavye için erişilebilir bir yol kalmalı (ör. seç + Enter) — doğrulanmadı,
erişilebilirlik ayrıntısı bu v2'de netleşmedi.

### Görsel (özet; ayrıntı `STIL.md`)
Desenli (ince dokulu) yeşil keçe masa, ahşap çerçeve; kalın ahşap, **iki kademeli** (alt/üst raf) ıstaka, iki ucunda ayak/kulak;
fildişi/krem gövdeli taş, **kalın düz rakam** (yedi parçalı/dijital DEĞİL, sistem yazı tipi) ve altında **aynı renkte küçük daire**;
sahte okey rakamsız, ayrı işaretli (yıldız/rozet); kapalı taş ters dönmüş, yüzü görünmez.

### Ekran boyutları
Masaüstü (geniş/dar) ve tablet yatay düzende dört kenar yerleşimini kullanır. **Telefon dikey** yönde oyun alanı yerine dil
anahtarlı "telefonu yan çevir" uyarısı gösterilir (R-014); telefon yatay döndürüldüğünde dört kenar düzeni sığdırılır.

### Bulgu: kural motorunda köşe yığını — kapatıldı (`tasokey#32`)
v2'de (bu bölüm yazıldığında) `docs/cekirdek/el.js` tek ortak `atilanYigin` dizisi tutuyordu, oyuncu başına ayrılmış bir yığın
yoktu. Bu, ayrı bir Geliştirici işi (`ADR-010`, `tasokey#25`) olarak çözüldü: motor artık `atilanYiginlar` (oyuncu başına 4
ayrı dizi) tutuyor; `at()` taşı atan oyuncunun kendi yığınına koyuyor, `cek(ATILAN)` yalnız `oncekiOyuncu()` yığınının üstünden
alıyor. Arayüz dört köşeyi `arayuz/ekran.js`te ayrı ayrı çiziyor (`tasokey#29`). `PRD.md` R-011 artık "karşılandı" (ekran
görüntüsü kanıtı `tasokey#32`).

## 7. Açık sorular

Soru 1 ve 2 K1'de kapandı (Sahip, 2026-11-19 — bkz. §1 kural 6 ve 10); ikisinin cevabı sonradan
Sahip'in isteğiyle **değişti** (soru 2: `tasokey#50` · soru 1: `tasokey#66`), soru yine kapalıdır.
Soru 3 de kapandı
(2026-11-21, Mimar/Geliştirici kararı — bu soruyu bu belge onlara bırakmıştı; bkz. §4 ve
`MIMARI.md` ADR-013). Açık soru kalmadı.

| # | Soru | Seçenekler (önerilen ilk sırada) | Durum |
|---|---|---|---|
| 1 | 12-13-1 geçişi (sayı sırasının "tur" yapıp yapmaması) per olarak geçerli mi? | A) Geçersiz — çoğu kaynakta per ardışık sayılar 1'den 13'e düz sıradır, tur yapma belirtilmemiş **(önerilen)** · B) Geçerli — bazı yerel kurallarda tur yapabiliyor olabilir (doğrulanmadı) | **kapandı — değişti: B** (K1 2026-11-19'da A demişti; Sahip 2026-11-22'de B'ye döndürdü — v6 / `tasokey#66`, ADR-008 sürüm 3; §1 kural 6a) |
| 2 | Okey atma cezası kesin puan/çarpanı ne olacak? | A) `PRD.md` §9 Soru 4 ile birlikte M2'de Sahip'in bildiği yerel kuralla sabitlensin **(önerilen)** · B) `101buddy.com` tablosu (101/202/404/808) birebir uygulansın | **kapandı — değişti**: ceza puanı/tablosu yok. (K1, 2026-11-19: atmak yasaktı. v5 / `tasokey#50`: atmak serbest, **ceza yine yok** — oyuncu yalnız bilgilendirilir; §1 kural 10) |
| 3 | Bot zorluk kademesi sayısı M1'de kaç olacak? | A) 1 kademe, M2/M3'te artırılsın **(önerilen)** · B) M1'den itibaren 3 kademe (kolay/orta/zor) | **kapandı — B** (Mimar/Geliştirici, 2026-11-21, `tasokey#41`): üç kademe tek sezgiselin üç ayarı olduğu için M1'de karşılanabildi — kademe başına ayrı bot yazılmadı, kural kodu değişmedi (`MIMARI.md` ADR-013). Kademe farkı ölçüldü (`tasokey#83`'te ADR-027'den sonra yeniden): kazanma oranı %1,0 / %28,0 / %41,5. Oyuncuya kademe seçtiren **arayüz** ayrı iştir (ADR-013 §7 risk 11) |
