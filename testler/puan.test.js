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

test('el TUR_SINIRI ile durduğunda da kalan taş durumu hesaplanır, kazanan null kalır', () => {
  const durum = temelDurum({ sonuc: EL_SONUCU.TUR_SINIRI, kazanan: null });
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.sonuc, EL_SONUCU.TUR_SINIRI);
  assert.equal(sonuc.kazanan, null);
  assert.equal(sonuc.kalanTaslar.length, 4);
});
