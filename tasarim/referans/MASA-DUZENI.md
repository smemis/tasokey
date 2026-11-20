# Masa düzeni ve oyun akışı: Sahip'in istediği (2026-11-20)

Kaynak: Sahip'in kararı (KraftOfis brainstorm 2026-11-20 (21)). Kaba yerleşim şeması: `masa-duzeni-sema.svg` (bizim çizimimiz).
Sahip ayrıca bir okey oyunundan ekran görüntüsü verdi; o görsel **yalnız tür kalıbını göstermek için** iş klasörüne eklenir, depoya girmez.
O oyunun çizimleri, yazı tipi, oyuncu adları, düğme simgeleri, "bahis" gibi kendine has öğeleri **kopyalanmaz**; çizimler bizim olur.

## Görsel
| Öğe | İstenen |
|---|---|
| Masa | Desenli (ince dokulu) yeşil keçe, dışında ahşap çerçeve |
| Istaka | Kalın ahşap, **iki kademe** (alt ve üst raf), iki ucunda ayak/kulak; taşlar rafa oturur. Taşlar arasında boşluk bırakılabilir |
| Taş | Fildişi/krem gövde, hafif gölge ve yuvarlatılmış köşe; **kalın, düz rakam** (yedi parçalı/dijital DEĞİL; sistem yazı tipi, kalın); rakamın altında **aynı renkte küçük daire**. Renkler: kırmızı, mavi, siyah, sarı/turuncu |
| Sahte okey | Rakamsız, ayrı işaretli taş (yıldız ya da rozet) |
| Kapalı taş | Ters dönmüş taş: gövde rengi, yüzü görünmez |

## Yerleşim (yatay ekran)
- Dört oyuncu **dört kenarda**: Sahip altta (kendi ıstakası), botlar **sol, üst, sağ**. Adları kenarda, dil dosyasından.
- **Deste ortada:** ters dönmüş taşlardan üst üste görünen yığın (kalan sayısı okunur). **Gösterge taşı** destenin yanında açık durur.
- **Atılan taş yığınları köşelerde:** her oyuncunun attığı taş, **kendisi ile sonraki oyuncu arasındaki köşede** kendi yığınında durur.
  Alınmayan taşlar birikir; en üstteki tam görünür, alttakiler hafif kaydırılmış görünür (kaç taş biriktiği anlaşılır).
  Sıra saat yönünün tersine ise: Sahip (alt) → sağ → üst → sol → Sahip; Sahip'in yığını **sağ alt** köşede, Sahip'in alabileceği yığın (soldaki oyuncunun) **sol alt** köşede.
  (Yön kural ayarında ne ise o kullanılır; şema saat yönünün tersini gösterir.)

## Etkileşim
| Eylem | Nasıl |
|---|---|
| Taş çekme | Ortadaki desteden **ya da** önceki oyuncunun köşedeki yığınının üstünden: sürükleyip ıstakaya bırak (ya da dokun) |
| Taş atma | Istakadaki taşı sürükleyip **sonraki oyuncunun tarafındaki köşe yığınına** bırak |
| Bitirme | Son taşı **ortadaki desteye** bırak; elin bitebilir olduğu durumda deste vurgulanır ("bitirmek için buraya bırak" — metin dil dosyasından) |
| Telefon yedeği | Dokun-seç → hedefe dokun (sürükleme zorunlu değil) |
| Istakada düzen | Taşları sürükleyerek yer değiştirme, araya boşluk bırakma |

"At" düğmesi kaldırılabilir; ekran okuyucu ve klavye için erişilebilir bir yol kalmalı (ör. seç + Enter).

## Ekran boyutları
- Masaüstü (geniş ve dar), tablet: yatay düzen.
- **Telefon dikey:** oyun alanı yerine "telefonu yan çevir" uyarısı (dil dosyasından). Telefon yatay: dört kenar düzeni sığdırılır.

## Kural belgeleri
Bu davranışlar önce `GDD.md` / `PRD.md`'ye yazılır (tek kaynak); testler atma yeri, bitirme yeri ve çekme kaynağını denetler.
Kayıt şeması değişirse (`surum`) eski kayıt sıfırlanır.
