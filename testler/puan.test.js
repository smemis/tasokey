import test from 'node:test';
import assert from 'node:assert/strict';
import { elSonucunuHesapla } from '../docs/cekirdek/puan.js';
import { EL_SONUCU } from '../docs/cekirdek/el.js';
import { tasOlustur } from '../docs/cekirdek/tas.js';

// tasokey#11 — R-007: el sonucu ve kalan taş durumu hesabı. Kabul (c) `is-dosyasi.md`'de.

const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);

function temelDurum(ekler = {}) {
  const varsayilan = {
    eller: [
      [t('kirmizi', 1), t('kirmizi', 9)],
      [t('siyah', 2), t('siyah', 10), t('siyah', 11)],
      [t('mavi', 3)],
      [t('sari', 4), t('sari', 12), t('sari', 13), t('sari', 1)],
    ],
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
    // tasokey#39: sonuç dökümü (per/çift/okey sayıları) o elin okey taşını bilmek zorunda.
    okeyTasi: { renk: 'mavi', sayi: 7 },
    gosterge: t('mavi', 6),
  };
  return { ...varsayilan, ...ekler };
}

test('el sürerken (SUREN) sonuç hesaplanmaz, null döner', () => {
  const durum = temelDurum({ sonuc: EL_SONUCU.SUREN, kazanan: null });
  assert.equal(elSonucunuHesapla(durum), null);
});

test('el BITTI olduğunda kazananın kalan taş sayısı 0, diğerlerininki kendi el uzunluğudur', () => {
  const durum = temelDurum({ sonuc: EL_SONUCU.BITTI, kazanan: 0, eller: [
    [], temelDurum().eller[1], temelDurum().eller[2], temelDurum().eller[3],
  ] });
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.sonuc, EL_SONUCU.BITTI);
  assert.equal(sonuc.kazanan, 0);
  assert.deepEqual(sonuc.kalanTaslar, [
    { oyuncu: 0, sayi: 0 },
    { oyuncu: 1, sayi: 3 },
    { oyuncu: 2, sayi: 1 },
    { oyuncu: 3, sayi: 4 },
  ]);
});

test('el BERABERE olduğunda kazanan null, herkesin kalan taş sayısı kendi eliyle eşleşir', () => {
  const durum = temelDurum({ sonuc: EL_SONUCU.BERABERE, kazanan: null });
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.sonuc, EL_SONUCU.BERABERE);
  assert.equal(sonuc.kazanan, null);
  assert.deepEqual(sonuc.kalanTaslar, [
    { oyuncu: 0, sayi: 2 },
    { oyuncu: 1, sayi: 3 },
    { oyuncu: 2, sayi: 1 },
    { oyuncu: 3, sayi: 4 },
  ]);
});

// tasokey#39 ek bilgisi (Sahip, 2026-11-20): "el bittiğinde perler ve per olmayanların sayısı
// ayrı ayrı yazsın, çift varsa onlar da ayrı yazsın, okey sayısı da ayrı yazsın."
test('el bittiğinde oyuncu başına döküm (per / çift / per dışı / okey) hesaplanır', () => {
  const durum = temelDurum({
    sonuc: EL_SONUCU.BITTI,
    kazanan: 0,
    eller: [
      [],
      // seri(3) + çift + okey taşı (mavi-7): okey seriyi 4'e uzatır (joker eksik taşın yerine geçer)
      [t('kirmizi', 1), t('kirmizi', 2), t('kirmizi', 3), t('sari', 9, 1), t('sari', 9, 2), t('mavi', 7)],
      [t('siyah', 4)],
      [],
    ],
  });
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.dokumler.length, 4, 'her oyuncu için bir döküm olmalı');
  assert.deepEqual(sonuc.dokumler.map((d) => d.oyuncu), [0, 1, 2, 3]);

  const ikinci = sonuc.dokumler[1];
  assert.equal(ikinci.perSayisi, 1);
  assert.equal(ikinci.perTasSayisi, 4, 'okey taşı seriyi kirmizi 1-2-3-(4) olarak uzatır');
  assert.equal(ikinci.ciftSayisi, 1);
  assert.equal(ikinci.perDisiSayisi, 2);
  assert.equal(ikinci.kalanSayisi, 0);
  assert.equal(ikinci.okeySayisi, 1, 'mavi-7 bu elde okey taşı — perde kullanılsa da ayrı sayılır');

  assert.equal(sonuc.dokumler[0].perSayisi, 0, 'kazananın eli boş: bütün sayılar 0');
  assert.equal(sonuc.dokumler[2].kalanSayisi, 1);
});

test('el TUR_SINIRI ile durduğunda da kalan taş durumu hesaplanır, kazanan null kalır', () => {
  const durum = temelDurum({ sonuc: EL_SONUCU.TUR_SINIRI, kazanan: null });
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.sonuc, EL_SONUCU.TUR_SINIRI);
  assert.equal(sonuc.kazanan, null);
  assert.equal(sonuc.kalanTaslar.length, 4);
});
