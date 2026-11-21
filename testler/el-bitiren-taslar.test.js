import test from 'node:test';
import assert from 'node:assert/strict';
import { elBitirenTaslar } from '../docs/cekirdek/cozucu.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#26 — "hangi taşı atarsa el biter?" sorgusu. `cozucu.elBitirilebilirMi` (tasokey#7)
// üzerine kurulu: elin her taşını sırayla "atılmış" sayıp kalanın bitip bitmediğine bakar.
// Arayüz (deste vurgusu, bırakma denetimi) bu listeyi kullanır, kuralı burada yeniden yazmaz.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// (a) tam dizilimli elde doğru taş(lar): seri(4) kirmizi 1-2-3-4 + sayı peri 8 (siyah/mavi/sari).
// Uçtaki taşlardan (1 ya da 4) biri atılırsa kalan yine geçerli seri(3) + sayı peri(3) olur;
// ortadaki taşlar (2, 3) ya da sayı perinin taşları atılırsa kalan bitirilemez.
test('(a) tam dizilimli elde doğru taş(lar) döner', () => {
  const kirmizi1 = t('kirmizi', 1);
  const kirmizi2 = t('kirmizi', 2);
  const kirmizi3 = t('kirmizi', 3);
  const kirmizi4 = t('kirmizi', 4);
  const siyah8 = t('siyah', 8);
  const mavi8 = t('mavi', 8);
  const sari8 = t('sari', 8);
  const el = [kirmizi1, kirmizi2, kirmizi3, kirmizi4, siyah8, mavi8, sari8];

  const sonuc = elBitirenTaslar(el, OKEY_TASI);

  assert.deepEqual(new Set(sonuc), new Set([kirmizi1.id, kirmizi4.id]));
  assert.equal(sonuc.includes(kirmizi2.id), false);
  assert.equal(sonuc.includes(kirmizi3.id), false);
  assert.equal(sonuc.includes(siyah8.id), false);
  assert.equal(sonuc.includes(mavi8.id), false);
  assert.equal(sonuc.includes(sari8.id), false);
});

// (b) bitirilemez elde boş liste: üç ilgisiz izole taş, hiçbiri atılınca kalanı bitirmiyor.
test('(b) bitirilemez elde boş liste döner', () => {
  const el = [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)];
  assert.deepEqual(elBitirenTaslar(el, OKEY_TASI), []);
});

// (c) joker ADAYLIĞI kurala bağlıdır, sabit kodlanmamıştır — iki yönlü ölçülür (tasokey#50,
// ADR-008 sürüm 2): varsayılan kural artık okey atmaya izin verdiğinden joker atıldığında kalan el
// bölünüyorsa joker de aday listesine GİRER; yasak ayarı (`okeyVeSahteOkeyAtmaYasak: true`)
// açıldığında eski davranış (joker hiç aday olmaz) olduğu gibi geri gelir. Aşağıdaki ellerde joker
// atılırsa seri(3) + sayı peri(3) kalır, yani joker gerçekten "bitiren taş"tır.
const KURAL_YASAK = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: true };

test('(c) sahte okey: varsayılanda aday listesine girer, yasak ayarı açıkken girmez', () => {
  const joker = sOkey(1);
  const el = [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3),
    t('siyah', 8), t('mavi', 8), t('sari', 8), joker,
  ];

  assert.equal(elBitirenTaslar(el, OKEY_TASI, KURAL_VARSAYILAN).includes(joker.id), true);
  assert.equal(elBitirenTaslar(el, OKEY_TASI, KURAL_YASAK).includes(joker.id), false);
});

test('(c) gerçek okey taşı (joker sayılan): varsayılanda aday, yasak ayarı açıkken değil', () => {
  const gercekOkey = t('mavi', 7); // OKEY_TASI ile aynı renk/sayı → tasOkeyMi true
  const el = [
    t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3),
    t('siyah', 8), t('mavi', 8), t('sari', 8), gercekOkey,
  ];

  assert.equal(elBitirenTaslar(el, OKEY_TASI, KURAL_VARSAYILAN).includes(gercekOkey.id), true);
  assert.equal(elBitirenTaslar(el, OKEY_TASI, KURAL_YASAK).includes(gercekOkey.id), false);
});

// (d) el sürmüyorsa (boş ya da geçersiz girdi) boş liste döner.
test('(d) boş el için boş liste döner', () => {
  assert.deepEqual(elBitirenTaslar([], OKEY_TASI), []);
});

test('(d) dizi olmayan girdi için boş liste döner', () => {
  assert.deepEqual(elBitirenTaslar(null, OKEY_TASI), []);
  assert.deepEqual(elBitirenTaslar(undefined, OKEY_TASI), []);
});

// (e) ASIL KABUL (regresyon, tasokey#37): Sahip'in ekran görüntüsündeki
// (`is/tasokey-35/ekler/image.png`) 15 taşlık el — gösterge 10-sari, okey 11-sari.
// Eski "çift = aynı sayı, farklı renk" tanımıyla motor bu elde "elini bitirebilirsin" diyordu.
// Gerçek Klasik Okey kuralında (GDD §1 kural 6/7/13, ADR-017) el hiçbir atışla bitmez:
//   * tamamen per: 11-siyah/11-kirmizi ve 12-mavi/12-sari ikilileri üçüncü taşa muhtaç, elde tek
//     joker var ve ikisine birden yetmiyor (11'in ya da 12'nin seri yapabileceği aynı renk komşusu
//     elde yok) — bir taş atmak iki ayrı eksiği kapatmıyor;
//   * tam 7 çift: birebir aynı tek ikili 4-mavi x2, kalan dokuz taş tek başına.
// Tohum/karıştırma yok: taşlar doğrudan listeyle kurulur.
test('(e) ASIL KABUL: ekran görüntüsündeki 15 taşlık el hiçbir atışla bitmez', () => {
  const gosterge = t('sari', 10, 1);
  const okeyTasi = { renk: 'sari', sayi: 11 }; // gösterge 10-sari → okey 11-sari
  const el = [
    t('siyah', 2), t('sari', 2), t('kirmizi', 2),
    t('mavi', 4, 1),
    sOkey(1),
    t('siyah', 11), t('kirmizi', 11),
    t('mavi', 4, 2), t('siyah', 4), t('sari', 4),
    t('mavi', 12), t('sari', 12),
    t('sari', 10, 2), t('siyah', 10), t('mavi', 10),
  ];

  assert.equal(el.length, 15, 'ekran görüntüsündeki el 15 taştır');
  assert.deepEqual(elBitirenTaslar(el, okeyTasi, KURAL_VARSAYILAN, gosterge), []);
});

// Kapatma anahtarının motor tarafındaki etkisi: aynı elde yalnız jokerin aday olup olmadığı
// değişir, jokersiz adaylar (burada serinin uçları) iki yönde de aynı kalır.
test('yasak ayarı yalnız jokeri havuzdan düşürür, öbür adayları değiştirmez', () => {
  const joker = sOkey(1);
  const kirmizi1 = t('kirmizi', 1);
  const el = [kirmizi1, t('kirmizi', 2), t('kirmizi', 3), joker];

  const varsayilan = elBitirenTaslar(el, OKEY_TASI, KURAL_VARSAYILAN);
  const yasakli = elBitirenTaslar(el, OKEY_TASI, KURAL_YASAK);

  assert.equal(varsayilan.includes(joker.id), true, 'varsayılanda joker aday değil');
  assert.equal(yasakli.includes(joker.id), false, 'yasak ayarı açıkken joker hâlâ aday');
  assert.equal(varsayilan.includes(kirmizi1.id), true, 'serinin ucu aday olmalı');
  assert.deepEqual(
    varsayilan.filter((id) => id !== joker.id),
    yasakli,
    'yasak ayarı jokerden başka bir adayı da düşürmüş',
  );
});
