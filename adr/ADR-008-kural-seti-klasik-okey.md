# ADR-008: Kural seti Klasik Okey; çelişkili 4 ayrıntı tek yerde ayar
> **Sürüm 3** (`tasokey#66`, Sahip kararı 2026-11-22): kural 1'in **varsayılanı değişti** —
> `12-13-1` geçişi **per sayılır**, seri 13'ten 1'e döner. Kararın yapısı yine aynı kaldı: ayar
> (`cekirdek/kural.js` `onUcBirGecisiPerSayilir`) **kapatma anahtarı** olarak duruyor ve `false`
> yapıldığında düz sıra kuralı tek satırla geri gelir — çünkü ayarı okuyan tek kapı
> `cekirdek/dizilim.js` `ardisikPencereUret`'tir ve doğrulayıcı, çözücü (`cozucu.js`) ve bot
> (`bot.js`) kuralı kendileri yeniden yazmaz. Uygulamanın iki ölçülen yan etkisi: (a) dönüşlü
> pencereler artık her uzunlukta 13 tane olduğu için çözücünün arama uzayı büyüdü ve dayanıklılık
> koşusu 43,3 s → 50,5 s çıktı; pencere tablosu uzunluk+ayar anahtarıyla **önbelleğe** alınınca
> 43,2 s'ye döndü (tablo girdiye bağlı sabittir, `Object.freeze` ile korumak denendi ve geri alındı —
> donmuş dizide `filter`/`includes` yavaşlıyor, koşu 86,5 s oldu). (b) Pencere üreteci artık sayı
> aralığından **uzun pencere üretmiyor**: düz sırada bu kendiliğinden boş dönerdi, dönüşlü sırada
> 13'ten sonra sayıları tekrar edip "13 taş + joker" dizisini yanlışlıkla seri sayardı.

> **Sürüm 2** (`tasokey#50`, Sahip kararı 2026-11-21): kural 2'nin **varsayılanı değişti** — okey ve
> sahte okey **atılabilir**. Kararın yapısı aynı kaldı: dört ayrıntı hâlâ `cekirdek/kural.js`
> içinde tek nesnede ayardır ve bu madde bir **kapatma anahtarı** olarak duruyor. ADR-008'in
> "Sonuçlar" satırı bu dönüşü tam olarak öngörmüştü ("Sahip bir ayrıntıyı yanlış bulursa tek satır
> değişir ve ilgili tablo testi güncellenir — mimari değişmez"); gerçekleşen de bu oldu.

| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K1, Sahip onayı 2026-11-19) · kural 2 varsayılanı 2026-11-21'de döndü (sürüm 2, Sahip, `tasokey#50`) · kural 1 varsayılanı 2026-11-22'de döndü (sürüm 3, Sahip, `tasokey#66`) |
| Karar veren | Sahip (K1); sürüm 2'de kural 2, sürüm 3'te kural 1 varsayılanı yine Sahip (`tasokey#50`, `tasokey#66`) |
| Bağlam | Kaynaklar 4 noktada çelişiyor (ARASTIRMA §2) ve bir nokta hiç tanımlı değildi (deste tükenmesi → bot koşusu sonsuz dönebilir). Kural seti seçimi (Klasik Okey ↔ 101 Okey) kural motorunun büyüklüğünü belirler |
| Karar | **Kural seti: Klasik Okey** — tek el, per/çift yalnız el biterken açılır, masaya açma ve kümülatif skor yok. Dört ayrıntı aşağıdaki varsayılanlarla sabit: (1) **sürüm 3 (2026-11-22, `tasokey#66`): `12-13-1` geçişi PER SAYILIR** — seri 13'ten 1'e döner; ayar `onUcBirGecisiPerSayilir` **kapatma anahtarı** olarak durur ve `false` yapıldığında per yine 1→13 düz sırası olur: ayarı okuyan tek yer `cekirdek/dizilim.js` `ardisikPencereUret` olduğu için doğrulayıcı, çözücünün aday üreteci ve bot aynı satırla düz sıraya döner (iki yönlü testler: `testler/kural.test.js`, `testler/dizilim.test.js`, `testler/cozucu.test.js`). Aynı sayı bir seride iki kez bulunamadığından en uzun seri 13 taştır. *(Sürüm 1-2'de per değildi.)*; (2) **sürüm 2 (2026-11-21, `tasokey#50`): okey ve sahte okey atmak SERBESTTİR** — hamle engellenmez, ceza puanı da yoktur (tek elde ceza tablosunun yeri yok); ayar `okeyVeSahteOkeyAtmaYasak` **kapatma anahtarı** olarak durur ve `true` yapıldığında eski yasak tek satırla geri gelir: motorun ret yolu (`el.js` → `REDDEDILME_SEBEBI.OKEY_ATILAMAZ` + `reddedilme.okeyAtilamaz` dil anahtarı), çözücünün aday filtresi (`cozucu.js` `elBitirenTaslar`) ve botun atılabilir havuzu (`bot.js` `atilabilirHavuz`) hepsi bu ayarı okumayı sürdürür. *(Sürüm 1'de yasaktı; motor hamleyi baştan engelliyordu.)* Arayüz tarafındaki karşılığı ADR-016 madde 8'dir: hamle engellenmediği için oyuncu bilgilendirilir; (3) gösterge taşı sahte okey çıkarsa taş desteye karışır ve **gösterge yeniden açılır**; (4) yerdeki taşlar kimse bitirmeden tükenirse **el berabere sayılır** ve yeni el başlar. Bu dördü `cekirdek/kural.js` içinde **tek nesnede ayar** olarak durur; motorun başka hiçbir yerinde bu kurallar yeniden yazılmaz |
| Seçenekler | 101 Okey (masaya açma + el devri + kümülatif puan = üç ek alt sistem, plan ~4 iş büyür) — reddedildi, istenirse ayrı PRD farkıyla gelir. İki kural setini birlikte taşımak — M1'de reddedildi. Dört ayrıntıyı tek tek sormak — plan bu noktada duracaktı; Sahip toplu varsayılanı seçti |
| Sonuçlar | M1 çekirdeği 7 işte çıkar; iş 3, 4 ve 6 beklemeden başlar. Sahip M2 denemesinde (K4) bir ayrıntıyı yanlış bulursa `cekirdek/kural.js`'te tek satır değişir ve ilgili tablo testi güncellenir — mimari değişmez. Kural setinin değişmesi (101 Okey) PRD farkı ister. **Sürüm 2'de bu gerçekleşti** (`tasokey#50`): kural 2'nin varsayılanı bir satırda döndü, mimari ve kural motorunun yapısı değişmedi; etkilenen testler iki yönlü hâle geldi (varsayılanda serbest, ayar açıkken reddedilir) ve joker artık botun atılabilir havuzuna da girdiğinden ADR-013'ün kademe ölçümü yeniden yapıldı (orada yazılı). Ölçülen yan etki: kolay kademe el başına ~1,2 kez joker atıyor, orta ve zor kademe hiç atmıyor (sezgisel jokeri en bağlantılı taş sayıyor, bkz. ADR-013 Sonuçlar). **Sürüm 3'te aynısı kural 1 için oldu** (`tasokey#66`): varsayılan bir satırda döndü, kural motorunun yapısı değişmedi, etkilenen testler iki yönlü hâle geldi. Ölçülen yan etki orada **başarım**: dönüşlü pencereler arama uzayını büyüttüğü için pencere tablosu önbelleğe alındı, dayanıklılık koşusu 43,3 s → 50,5 s → **43,2 s** (bütçe 60 s). Kural daha çok per ürettiği için ADR-013'ün kademe ölçümü de yeniden yapıldı (orada yazılı): eller kısaldı, beraberlik düştü, kademe sırası (kolay < orta < zor) korundu |
| Etkilenen gereksinimler | R-002, R-003, R-004, R-005, R-006, R-007 · sürüm 2'de ayrıca R-008 (yeni pencere metinleri TR+EN) ve ADR-016 madde 8 |
