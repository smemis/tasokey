# GDD: Taş Okey

> GDD, PRD'nin ekidir: "ne" ve "neden" `PRD.md`'de, oyunun ayrıntısı burada. Çelişirse PRD geçerlidir.
> Bu sürüm **v0** (Analist taslağı); K1 sonrası Mimar tamamlar.

| Alan | Değer |
|---|---|
| Proje | `tasokey` |
| GDD sürümü | `0` (taslak) |
| Bağlı PRD sürümü | `1` (taslak) |

## 1. Kurallar
> Her kural bir PRD gereksinimine bağlanır. Kaynaklar arası fark `ARASTIRMA.md` §2'de; emin olunmayan satır "doğrulanmadı".
> Kural seti varsayımı: **Klasik Okey** (`PRD.md` §9 Soru 1'in önerilen seçeneği — K1'de değişebilir).

| # | Kural | Gereksinim | Kaynak | Durum |
|---|---|---|---|---|
| 1 | Set: 1-13 arası sayı, 4 renk (kırmızı/siyah/mavi/sarı), her sayı-renk 2 adet (104 taş) + 2 sahte okey = 106 taş | R-001 | `ARASTIRMA.md` §2.1 | doğrulandı |
| 2 | Dağıtım: başlayan oyuncu 15, diğer 3 oyuncu 14 taş alır | R-001 | `ARASTIRMA.md` §2.2 | doğrulandı |
| 3 | Gösterge: karma sonrası açılan bir taş; okey taşı göstergeyle aynı renkte bir üst sayıdır (13 → 1 döner) | R-002 | `ARASTIRMA.md` §2.3 | doğrulandı |
| 4 | Sahte okey, o elin okey taşının yerine geçer; her yerde (per, çift) okey gibi kullanılır | R-002 | `ARASTIRMA.md` §2.4 | doğrulandı |
| 5 | Tur: oyuncu yerden ya da son atılan taştan 1 taş çeker, elinden 1 taş atar; sıradaki oyuncuya geçer | R-003 | `ARASTIRMA.md` §2.5 | doğrulandı |
| 6 | Per: aynı renkte ardışık en az 3 sayı (12-13-1 geçişi kurala göre tartışmalı — doğrulanmadı) | R-004 | `ARASTIRMA.md` §2.6 | doğrulanmadı (12-13-1 per geçerliliği kaynaklar arasında net değil) |
| 7 | Çift: aynı sayı, 2 farklı renk | R-004 | `ARASTIRMA.md` §2.6 | doğrulandı |
| 8 | Klasik Okey'de per/çift masaya yalnız el biterken (son taşı atarken) açılır; ara aşamada masaya taş konmaz | R-005 | `ARASTIRMA.md` §2.7 | doğrulandı |
| 9 | Gösterge taşı kendisi çift sayılamaz | R-004 | `ARASTIRMA.md` §2, satır 9 | doğrulandı |
| 10 | Okey (joker) taşının atılması kurala aykırıdır; atılırsa ceza puanı uygulanır (kesin çarpan/puan doğrulanmadı) | R-007 | `ARASTIRMA.md` §2, satır 10-11 | doğrulanmadı — K1'de teyit (`PRD.md` §9 Soru 4) |

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

## 6. Açık sorular
| # | Soru | Seçenekler (önerilen ilk sırada) |
|---|---|---|
| 1 | 12-13-1 geçişi (sayı sırasının "tur" yapıp yapmaması) per olarak geçerli mi? | A) Geçersiz — çoğu kaynakta per ardışık sayılar 1'den 13'e düz sıradır, tur yapma belirtilmemiş **(önerilen)** · B) Geçerli — bazı yerel kurallarda tur yapabiliyor olabilir (doğrulanmadı) |
| 2 | Okey atma cezası kesin puan/çarpanı ne olacak? | A) `PRD.md` §9 Soru 4 ile birlikte M2'de Sahip'in bildiği yerel kuralla sabitlensin **(önerilen)** · B) `101buddy.com` tablosu (101/202/404/808) birebir uygulansın |
| 3 | Bot zorluk kademesi sayısı M1'de kaç olacak? | A) 1 kademe, M2/M3'te artırılsın **(önerilen)** · B) M1'den itibaren 3 kademe (kolay/orta/zor) |
