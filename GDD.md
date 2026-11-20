# GDD: Taş Okey

> GDD, PRD'nin ekidir: "ne" ve "neden" `PRD.md`'de, oyunun ayrıntısı burada. Çelişirse PRD geçerlidir.
> Bu sürüm **v1**: K1'in (Sahip, 2026-11-19) dört kural kararı işlendi (`MIMARI.md` ADR-008); `MIMARI.md` ile çelişen
> kural ifadesi yok.
> **v2** (`tasokey#22`, Sahip kararı 2026-11-20, KraftOfis brainstorm (21)): §7 "Masa düzeni ve etkileşim" eklendi; kaynak
> `tasarim/referans/MASA-DUZENI.md` ve `tasarim/referans/masa-duzeni-sema.svg`. Bu belge güncellemesi arayüz ya da kural
> kodunu değiştirmez — yalnız tasarım kaydı.

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| GDD sürümü | `2` (v2: masa düzeni bölümü, `tasokey#22`) |
| Bağlı PRD sürümü | `2` (`tasokey#22` ile birlikte) |

## 1. Kurallar
> Her kural bir PRD gereksinimine bağlanır. Kaynaklar arası fark `ARASTIRMA.md` §2'de; emin olunmayan satır "doğrulanmadı".
> Kural seti: **Klasik Okey** (`PRD.md` §9 Soru 1, K1 onaylı). Kural 6, 10-12 K1'in (Sahip, 2026-11-19) dört kural kararını
> işler (`MIMARI.md` ADR-008); bu dört madde `cekirdek/kural.js` içinde tek nesnede ayar olarak durur.

| # | Kural | Gereksinim | Kaynak | Durum |
|---|---|---|---|---|
| 1 | Set: 1-13 arası sayı, 4 renk (kırmızı/siyah/mavi/sarı), her sayı-renk 2 adet (104 taş) + 2 sahte okey = 106 taş | R-001 | `ARASTIRMA.md` §2.1 | doğrulandı |
| 2 | Dağıtım: başlayan oyuncu 15, diğer 3 oyuncu 14 taş alır | R-001 | `ARASTIRMA.md` §2.2 | doğrulandı |
| 3 | Gösterge: karma sonrası açılan bir taş; okey taşı göstergeyle aynı renkte bir üst sayıdır (13 → 1 döner) | R-002 | `ARASTIRMA.md` §2.3 | doğrulandı |
| 4 | Sahte okey, o elin okey taşının yerine geçer; her yerde (per, çift) okey gibi kullanılır | R-002 | `ARASTIRMA.md` §2.4 | doğrulandı |
| 5 | Tur: oyuncu yerden ya da son atılan taştan 1 taş çeker, elinden 1 taş atar; sıradaki oyuncuya geçer | R-003 | `ARASTIRMA.md` §2.5 | doğrulandı |
| 6 | Per: aynı renkte ardışık en az 3 sayı; **`12-13-1` geçişi per DEĞİLDİR** (per 1→13 düz sıradır, tur yapmaz) | R-004 | `MIMARI.md` ADR-008/1 (K1 kararı) | doğrulandı (K1, 2026-11-19) |
| 7 | Çift: aynı sayı, 2 farklı renk | R-004 | `ARASTIRMA.md` §2.6 | doğrulandı |
| 8 | Klasik Okey'de per/çift masaya yalnız el biterken (son taşı atarken) açılır; ara aşamada masaya taş konmaz | R-005 | `ARASTIRMA.md` §2.7 | doğrulandı |
| 9 | Gösterge taşı kendisi çift sayılamaz | R-004 | `ARASTIRMA.md` §2, satır 9 | doğrulandı |
| 10 | Okey (joker) ve sahte okey taşının atılması **yasaktır**; motor bu hamleyi baştan engeller. Ceza puanı yoktur — tek elde ceza tablosunun yeri yok | R-003, R-007 | `MIMARI.md` ADR-008/2 (K1 kararı) | doğrulandı (K1, 2026-11-19) |
| 11 | Gösterge taşı sahte okey çıkarsa taş desteye karışır ve gösterge yeniden açılır (yeni gösterge, yeni okey taşı belirler) | R-002 | `MIMARI.md` ADR-008/3 (K1 kararı) | doğrulandı (K1, 2026-11-19) |
| 12 | Yerdeki (desteki) taşlar kimse elini bitirmeden tükenirse el **berabere** sayılır ve yeni el başlar | R-006, R-007 | `MIMARI.md` ADR-008/4 (K1 kararı) | doğrulandı (K1, 2026-11-19) |

### Kural farkları tablosu (varsa)
| Konu | Seçenek A (Klasik) | Seçenek B (101 Okey) | Öneri |
|---|---|---|---|
| Masaya açma zamanı | Yalnız el biterken | Per ≥101 ya da ≥5 çift olunca önceden | A |
| El/skor yapısı | Tek el, biten oyun biter | Çoklu el, kümülatif skor (101'e kadar) | A |

### Kazanma / bitiş koşulu
Elindeki 14 taşı (okey ve sahte okey dahil) geçerli per/çift kombinasyonlarına dizip son taşı atan ve "taşsız" kalan oyuncu
eli kazanır ("okey/bitti"). Tam dizilim geçerli değilse bitiş kabul edilmez (R-005).

## 2. Mekanikler
| Mekanik | Oyuncu ne yapar | Sistem ne yapar | Gereksinim |
|---|---|---|---|
| Taş çekme | Yerden ya da atılan taştan birini seçer | Elindeki taş sayısını günceller, geçersiz çekimi engeller | R-003 |
| Taş atma | Elinden bir taş seçip atar | Atılan taşı masaya koyar, sırayı ilerletir | R-003 |
| Dizme/deneme | Elindeki taşları sürükleyip per/çift grupları oluşturmayı dener (yalnız görsel düzenleme, masaya açma değil) | Geçerliliği anlık doğrulamaz zorunlu değildir; bitişte tam kontrol yapar | R-004, R-005 |
| Bitirme | Son taşını atarak "bitti" bildirir | Elin tamamının geçerli per/çift olduğunu doğrular, kazananı ilan eder | R-005, R-006 |
| Bot turu | (Yok — bot kendi kendine oynar) | Botun elini kural motoruyla değerlendirip hamle seçer | R-006 |
| Sonuç gösterimi | Sonuç ekranını görür, yeni el başlatabilir | Puanı hesaplar, ekrana yazar | R-007, R-010 |

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
| Zorluk kademeleri | En az 1 kademe M1'de (ör. "kolay": rastgele geçerli hamle); ek kademeler (orta/zor) M2/M3'te değerlendirilir — kesin sayı Mimar/Geliştirici'nin işi |
| Karar yöntemi | Kural tabanlı basit sezgisel (hangi taşı çekeceği/atacağı per-çift tamamlama olasılığına göre); ayrıntılı algoritma bu v0'da tanımlı değil, Mimar/Geliştirici tamamlar |
| Oyunla aynı kural sınıfını kullanır mı | Evet — bot ve insan oyuncu aynı saf kural motorunu (per/çift geçerlilik, bitiş kontrolü) kullanır |
| Ölçüm | Örnek hedef: N bot × M el öz-testi hatasız biter (kesin N/M Mimar/Geliştirici belirler); değişmez: botun asla kurala aykırı hamle yapmaması |

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

### Bulgu: kural motorunda köşe yığını (yapılacak)
`docs/cekirdek/el.js` kontrol edildi (bu iş kapsamında kod **değiştirilmedi**): el durumu tek ortak `atilanYigin` dizisi
tutuyor (satır 41, 77-80, 103), oyuncu başına ayrılmış bir yığın yok. Sıra sabit döngüde ilerlediği için "ATILAN" kaynağından
çekilen taş (dizinin en üstü) her zaman fiilen **önceki oyuncunun** attığı taşla aynı sonucu verir — bu yüzden mevcut çekme
mantığı (R-003) yanlış **değildir**. Ancak arayüzün dört ayrı köşe yığınını (her birinin kendi yüksekliği/geçmişiyle)
göstermesi için motorun hangi taşın hangi oyuncu tarafından atıldığını ayrı ayrı bilmesi gerekir; bu bilgi şu an dizide yok.
**Yapılacak** (bu işin kapsamı dışı, ayrı bir Geliştirici işi): `atilanYigin`'i oyuncu başına dizi (ya da her taşa "atan oyuncu"
etiketi) olacak şekilde genişletmek — bkz. `PRD.md` R-011.

## 7. Açık sorular

Soru 1 ve 2 K1'de kapandı (Sahip, 2026-11-19 — bkz. §1 kural 6 ve 10). Soru 3 açık kalıyor; M1 planında Mimar/Geliştirici kararı.

| # | Soru | Seçenekler (önerilen ilk sırada) | Durum |
|---|---|---|---|
| 1 | 12-13-1 geçişi (sayı sırasının "tur" yapıp yapmaması) per olarak geçerli mi? | A) Geçersiz — çoğu kaynakta per ardışık sayılar 1'den 13'e düz sıradır, tur yapma belirtilmemiş **(önerilen)** · B) Geçerli — bazı yerel kurallarda tur yapabiliyor olabilir (doğrulanmadı) | **kapandı — A** (K1, §1 kural 6) |
| 2 | Okey atma cezası kesin puan/çarpanı ne olacak? | A) `PRD.md` §9 Soru 4 ile birlikte M2'de Sahip'in bildiği yerel kuralla sabitlensin **(önerilen)** · B) `101buddy.com` tablosu (101/202/404/808) birebir uygulansın | **kapandı — değişti**: okey/sahte okey atmak baştan yasak (motor engelliyor), ceza puanı/tablosu yok (K1, §1 kural 10) |
| 3 | Bot zorluk kademesi sayısı M1'de kaç olacak? | A) 1 kademe, M2/M3'te artırılsın **(önerilen)** · B) M1'den itibaren 3 kademe (kolay/orta/zor) | açık — K1 kapsamında değildi |
