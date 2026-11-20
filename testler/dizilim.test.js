import test from 'node:test';
import assert from 'node:assert/strict';
import { perGecerliMi, ciftGecerliMi } from '../docs/cekirdek/dizilim.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';

// tasokey#6 — R-004: per ve çift doğrulayıcı. Tek kural kaynağı `cekirdek/kural.js` (ADR-008);
// burada test edilen, o ayarları okuyan `cekirdek/dizilim.js`'in saf mantığı.

const OKEY_TASI = { renk: 'mavi', sayi: 7 }; // gösterge mavi-6 varsayımıyla okey taşı.
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// Her vaka: ad, tur ('per'|'cift'), taslar, beklenen (true=geçerli). cift için [tasA, tasB].
// gosterge yalnız kural 9 (gösterge çift sayılmaz) vakalarında dolu.
const TABLO = [
  // --- Geçerli per (aynı renk, ardışık en az 3) ---
  { ad: 'per geçerli: kirmizi 3-4-5 (uzunluk 3)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5)], beklenen: true },
  { ad: 'per geçerli: siyah 10-11-12-13 (üst sınır 13)', tur: 'per', taslar: [t('siyah', 10), t('siyah', 11), t('siyah', 12), t('siyah', 13)], beklenen: true },
  { ad: 'per geçerli: sari 1-2-3 (alt sınır 1)', tur: 'per', taslar: [t('sari', 1), t('sari', 2), t('sari', 3)], beklenen: true },
  { ad: 'per geçerli: kirmizi 8-9-10-11-12 (uzunluk 5)', tur: 'per', taslar: [t('kirmizi', 8), t('kirmizi', 9), t('kirmizi', 10), t('kirmizi', 11), t('kirmizi', 12)], beklenen: true },
  { ad: 'per geçerli: sırası karışık verilse de aynı renk ardışık 3', tur: 'per', taslar: [t('mavi', 5), t('mavi', 3), t('mavi', 4)], beklenen: true },

  // --- Geçersiz per ---
  { ad: 'per geçersiz: 2 taş (en az 3 şartı)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 4)], beklenen: false },
  { ad: 'per geçersiz: renk karışık (kirmizi-siyah-mavi, sayı ardışık olsa da)', tur: 'per', taslar: [t('kirmizi', 3), t('siyah', 4), t('mavi', 5)], beklenen: false },
  { ad: 'per geçersiz: ardışık değil (kirmizi 3-5-7)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 5), t('kirmizi', 7)], beklenen: false },
  { ad: 'per geçersiz: 12-13-1 geçişi (K1 kararı, GDD kural 6 — tur yapmaz)', tur: 'per', taslar: [t('sari', 12), t('sari', 13), t('sari', 1)], beklenen: false },
  { ad: 'per geçersiz: aynı sayının iki nüshası (ardışık sayılamaz)', tur: 'per', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('kirmizi', 6)], beklenen: false },
  { ad: 'per geçersiz: boş dizi', tur: 'per', taslar: [], beklenen: false },

  // --- Geçerli çift (aynı sayı, 2 farklı renk) ---
  { ad: 'çift geçerli: kirmizi-7 ve siyah-7', tur: 'cift', taslar: [t('kirmizi', 7), t('siyah', 7)], beklenen: true },
  { ad: 'çift geçerli: mavi-3 ve sari-3', tur: 'cift', taslar: [t('mavi', 3), t('sari', 3)], beklenen: true },
  { ad: 'çift geçerli: kirmizi-10 ve mavi-10', tur: 'cift', taslar: [t('kirmizi', 10), t('mavi', 10)], beklenen: true },

  // --- Geçersiz çift ---
  { ad: 'çift geçersiz: aynı rengin iki nüshası (kirmizi-5 x2)', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2)], beklenen: false },
  { ad: 'çift geçersiz: farklı sayı, aynı renk (kirmizi 5-6)', tur: 'cift', taslar: [t('kirmizi', 5), t('kirmizi', 6)], beklenen: false },
  { ad: 'çift geçersiz: farklı sayı, farklı renk (kirmizi-5, siyah-6)', tur: 'cift', taslar: [t('kirmizi', 5), t('siyah', 6)], beklenen: false },

  // --- Okey (gösterge joker) ve sahte okeyin joker olduğu per ---
  { ad: 'per geçerli: sahte okey boşluğu dolduruyor (kirmizi 3-_-5)', tur: 'per', taslar: [t('kirmizi', 3), sOkey(1), t('kirmizi', 5)], beklenen: true },
  { ad: 'per geçerli: gerçek okey taşı (mavi-7) boşluğu dolduruyor (siyah 9-_-11)', tur: 'per', taslar: [t('siyah', 9), t('mavi', 7), t('siyah', 11)], beklenen: true },
  { ad: 'per geçerli: iki joker birden iki boşluğu dolduruyor (kirmizi 2-_-_-5)', tur: 'per', taslar: [t('kirmizi', 2), sOkey(1), sOkey(2), t('kirmizi', 5)], beklenen: true },

  // --- Okey ve sahte okeyin joker olduğu çift ---
  { ad: 'çift geçerli: gerçek okey taşı (mavi-7) joker olarak kirmizi-7 ile eşleşiyor', tur: 'cift', taslar: [t('kirmizi', 7), t('mavi', 7)], beklenen: true },
  { ad: 'çift geçerli: sahte okey joker olarak kirmizi-9 ile eşleşiyor', tur: 'cift', taslar: [sOkey(1), t('kirmizi', 9)], beklenen: true },
  { ad: 'çift geçerli: iki sahte okey birlikte (ikisi de joker)', tur: 'cift', taslar: [sOkey(1), sOkey(2)], beklenen: true },

  // --- Gösterge taşı çift sayılmaz (GDD kural 9) ---
  { ad: 'çift geçersiz: taşlardan biri gösterge taşının kendisi', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('siyah', 5, 1)], gosterge: t('kirmizi', 5, 1), beklenen: false },
  { ad: 'çift geçerli: aynı sayı/renk eşleşmesi ama gösterge farklı bir taş', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('siyah', 5, 1)], gosterge: t('mavi', 9, 1), beklenen: true },
  { ad: 'çift geçerli: gösterge parametresi verilmeyince kural 9 uygulanmaz', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('siyah', 5, 1)], beklenen: true },

  // --- Kural ayarı tek kaynaktan okunuyor (ADR-008): 12-13-1 açılırsa geçerli olur ---
  { ad: 'per geçerli: onUcBirGecisiPerSayilir açılırsa 12-13-1 geçerli olur', tur: 'per', taslar: [t('sari', 12), t('sari', 13), t('sari', 1)], kural: { onUcBirGecisiPerSayilir: true }, beklenen: true },
];

test(`per/çift doğrulayıcı tablo testi (${TABLO.length} örnek)`, () => {
  assert.ok(TABLO.length >= 20, 'tablo en az 20 örnek içermeli');
});

for (const vaka of TABLO) {
  test(vaka.ad, () => {
    const kural = vaka.kural;
    const sonuc = vaka.tur === 'per'
      ? (kural ? perGecerliMi(vaka.taslar, OKEY_TASI, kural) : perGecerliMi(vaka.taslar, OKEY_TASI))
      : (vaka.gosterge !== undefined
        ? ciftGecerliMi(vaka.taslar[0], vaka.taslar[1], OKEY_TASI, undefined, vaka.gosterge)
        : ciftGecerliMi(vaka.taslar[0], vaka.taslar[1], OKEY_TASI));
    assert.equal(sonuc, vaka.beklenen, vaka.ad);
  });
}
