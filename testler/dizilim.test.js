import test from 'node:test';
import assert from 'node:assert/strict';
import { perGecerliMi, ciftGecerliMi } from '../docs/cekirdek/dizilim.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#6 — R-004: per ve çift doğrulayıcı. Tek kural kaynağı `cekirdek/kural.js` (ADR-008);
// burada test edilen, o ayarları okuyan `cekirdek/dizilim.js`'in saf mantığı.
// tasokey#37 (ADR-017, GDD §1 kural 6/7): per artık seri + **sayı peri**; çift yalnız iki
// **birebir aynı** taş. "Aynı sayı, farklı renk" artık çift değil, sayı perinin parçasıdır.
// tasokey#66 (ADR-008 sürüm 3, GDD §1 kural 6a): seri 13'ten 1'e **döner** — `12-13-1` per sayılır;
// ayar kapatılınca düz sıra kuralı geri gelir (aşağıda iki yönlü ölçülür).

const OKEY_TASI = { renk: 'mavi', sayi: 7 }; // gösterge mavi-6 varsayımıyla okey taşı.
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);
// ADR-027 (tasokey#81) kapatma anahtarı açık: sahte okey yine evrensel joker (K1 davranışı).
const KURAL_ESKI_JOKER = { ...KURAL_VARSAYILAN, sahteOkeyJokerGibiDavranir: true };

// Her vaka: ad, tur ('per'|'cift'), taslar, beklenen (true=geçerli). cift için [tasA, tasB].
// gosterge yalnız kural 9 (gösterge çift sayılmaz) vakalarında dolu.
const TABLO = [
  // --- Geçerli per: seri (aynı renk, ardışık en az 3) ---
  { ad: 'per geçerli: kirmizi 3-4-5 (uzunluk 3)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5)], beklenen: true },
  { ad: 'per geçerli: siyah 10-11-12-13 (üst sınır 13)', tur: 'per', taslar: [t('siyah', 10), t('siyah', 11), t('siyah', 12), t('siyah', 13)], beklenen: true },
  { ad: 'per geçerli: sari 1-2-3 (alt sınır 1)', tur: 'per', taslar: [t('sari', 1), t('sari', 2), t('sari', 3)], beklenen: true },
  { ad: 'per geçerli: kirmizi 8-9-10-11-12 (uzunluk 5)', tur: 'per', taslar: [t('kirmizi', 8), t('kirmizi', 9), t('kirmizi', 10), t('kirmizi', 11), t('kirmizi', 12)], beklenen: true },
  { ad: 'per geçerli: sırası karışık verilse de aynı renk ardışık 3', tur: 'per', taslar: [t('mavi', 5), t('mavi', 3), t('mavi', 4)], beklenen: true },

  // --- Geçersiz seri ---
  { ad: 'per geçersiz: 2 taş (en az 3 şartı)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 4)], beklenen: false },
  { ad: 'per geçersiz: renk karışık (kirmizi-siyah-mavi, sayı ardışık olsa da)', tur: 'per', taslar: [t('kirmizi', 3), t('siyah', 4), t('mavi', 5)], beklenen: false },
  { ad: 'per geçersiz: ardışık değil (kirmizi 3-5-7)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 5), t('kirmizi', 7)], beklenen: false },
  { ad: 'per geçersiz: aynı renk ardışık değil, dönüşlü de değil (sari 11-12-1)', tur: 'per', taslar: [t('sari', 11), t('sari', 12), t('sari', 1)], beklenen: false },
  { ad: 'per geçersiz: 13 taşlık seriye 14. taş (joker) eklenemez (sayı aralığı 13)', tur: 'per', taslar: [...Array.from({ length: 13 }, (_, i) => t('mavi', i + 1)), sOkey(1)], beklenen: false },
  { ad: 'per geçersiz: aynı sayının iki nüshası (ardışık sayılamaz)', tur: 'per', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('kirmizi', 6)], beklenen: false },
  { ad: 'per geçersiz: boş dizi', tur: 'per', taslar: [], beklenen: false },

  // --- Geçerli per: sayı peri (aynı sayı, 3-4 farklı renk — GDD kural 6b, tasokey#37) ---
  { ad: 'sayı peri geçerli: 5 üç renkte (kirmizi-siyah-mavi)', tur: 'per', taslar: [t('kirmizi', 5), t('siyah', 5), t('mavi', 5)], beklenen: true },
  { ad: 'sayı peri geçerli: 11 dört renkte (tam set)', tur: 'per', taslar: [t('kirmizi', 11), t('siyah', 11), t('mavi', 11), t('sari', 11)], beklenen: true },
  { ad: 'sayı peri geçerli: sırası karışık verilse de aynı sayı üç renk', tur: 'per', taslar: [t('sari', 2), t('kirmizi', 2), t('siyah', 2)], beklenen: true },
  // ADR-027 (tasokey#81): sahte okey joker değildir, o elin okey DEĞERİNDE (mavi-7) bir taştır.
  { ad: 'sayı peri geçerli: sahte okey 7lerin mavisi yerine geçiyor (7 kirmizi-siyah-★)', tur: 'per', taslar: [t('kirmizi', 7), t('siyah', 7), sOkey(1)], beklenen: true },
  { ad: 'per geçerli: sahte okey serinin 7si oluyor (mavi 5-6-★)', tur: 'per', taslar: [t('mavi', 5), t('mavi', 6), sOkey(1)], beklenen: true },
  { ad: 'sayı peri geçersiz: sahte okey mavi-7 olduğundan 12lerin eksiğini kapatmaz (12 mavi-sari-★)', tur: 'per', taslar: [t('mavi', 12), t('sari', 12), sOkey(1)], beklenen: false },
  { ad: 'sayı peri geçersiz: sahte okey mavi-7, yanında gerçek mavi-12 varken renk iki kez geçer', tur: 'per', taslar: [t('mavi', 12), t('sari', 12), t('kirmizi', 12), sOkey(1)], beklenen: false },
  { ad: 'per geçerli: ANAHTAR AÇIK — sahte okey yine evrensel joker (12 mavi-sari-_)', tur: 'per', taslar: [t('mavi', 12), t('sari', 12), sOkey(1)], kural: KURAL_ESKI_JOKER, beklenen: true },
  { ad: 'sayı peri geçerli: gerçek okey taşı (mavi-7) eksik rengin yerine geçiyor (10 kirmizi-siyah-_)', tur: 'per', taslar: [t('kirmizi', 10), t('siyah', 10), t('mavi', 7)], beklenen: true },

  // --- Geçersiz sayı peri ---
  { ad: 'sayı peri geçersiz: aynı renk iki kez (kirmizi-5 x2 + siyah-5)', tur: 'per', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2), t('siyah', 5)], beklenen: false },
  { ad: 'sayı peri geçersiz: aynı renk iki kez, jokerli (kirmizi-5 x2 + joker)', tur: 'per', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2), sOkey(1)], beklenen: false },
  { ad: 'sayı peri geçersiz: 4 renkten fazla taş (5 taş, bir renk tekrar eder)', tur: 'per', taslar: [t('kirmizi', 5, 1), t('siyah', 5), t('mavi', 5), t('sari', 5), t('kirmizi', 5, 2)], beklenen: false },
  { ad: 'sayı peri geçersiz: 2 taş (en az 3 şartı — kirmizi-9, siyah-9)', tur: 'per', taslar: [t('kirmizi', 9), t('siyah', 9)], beklenen: false },
  { ad: 'per geçersiz: ne seri ne sayı peri (kirmizi-5, siyah-5, mavi-6)', tur: 'per', taslar: [t('kirmizi', 5), t('siyah', 5), t('mavi', 6)], beklenen: false },

  // --- Geçerli çift: iki birebir aynı taş (GDD kural 7, tasokey#37) ---
  { ad: 'çift geçerli: kirmizi-7 iki nüsha (birebir aynı)', tur: 'cift', taslar: [t('kirmizi', 7, 1), t('kirmizi', 7, 2)], beklenen: true },
  { ad: 'çift geçerli: sari-3 iki nüsha', tur: 'cift', taslar: [t('sari', 3, 1), t('sari', 3, 2)], beklenen: true },

  // --- Geçersiz çift ---
  { ad: 'çift geçersiz: aynı sayı, FARKLI renk (kirmizi-7, siyah-7) — eski kural, artık sayı perinin işi', tur: 'cift', taslar: [t('kirmizi', 7), t('siyah', 7)], beklenen: false },
  { ad: 'çift geçersiz: aynı sayı, farklı renk (mavi-3, sari-3)', tur: 'cift', taslar: [t('mavi', 3), t('sari', 3)], beklenen: false },
  { ad: 'çift geçersiz: farklı sayı, aynı renk (kirmizi 5-6)', tur: 'cift', taslar: [t('kirmizi', 5), t('kirmizi', 6)], beklenen: false },
  { ad: 'çift geçersiz: farklı sayı, farklı renk (kirmizi-5, siyah-6)', tur: 'cift', taslar: [t('kirmizi', 5), t('siyah', 6)], beklenen: false },

  // --- Okey (gösterge joker) ve sahte okeyin joker olduğu seri ---
  { ad: 'per geçersiz: sahte okey ARTIK boşluk doldurmaz (kirmizi 3-★-5)', tur: 'per', taslar: [t('kirmizi', 3), sOkey(1), t('kirmizi', 5)], beklenen: false },
  { ad: 'per geçerli: ANAHTAR AÇIK — sahte okey boşluğu dolduruyor (kirmizi 3-_-5)', tur: 'per', taslar: [t('kirmizi', 3), sOkey(1), t('kirmizi', 5)], kural: KURAL_ESKI_JOKER, beklenen: true },
  { ad: 'per geçerli: gerçek okey taşı (mavi-7) boşluğu dolduruyor (siyah 9-_-11)', tur: 'per', taslar: [t('siyah', 9), t('mavi', 7), t('siyah', 11)], beklenen: true },
  { ad: 'per geçerli: iki gerçek okey nüshası iki boşluğu dolduruyor (kirmizi 2-_-_-5)', tur: 'per', taslar: [t('kirmizi', 2), t('mavi', 7, 1), t('mavi', 7, 2), t('kirmizi', 5)], beklenen: true },
  { ad: 'per geçersiz: iki sahte okey aynı değerde (mavi-7) olduğundan seride yan yana gelemez', tur: 'per', taslar: [t('kirmizi', 2), sOkey(1), sOkey(2), t('kirmizi', 5)], beklenen: false },
  { ad: 'per geçerli: ANAHTAR AÇIK — iki sahte okey iki boşluğu dolduruyor (kirmizi 2-_-_-5)', tur: 'per', taslar: [t('kirmizi', 2), sOkey(1), sOkey(2), t('kirmizi', 5)], kural: KURAL_ESKI_JOKER, beklenen: true },

  // --- Okey ve sahte okeyin joker olduğu çift ---
  { ad: 'çift geçerli: gerçek okey taşı (mavi-7) joker olarak kirmizi-9 ile eşleşiyor', tur: 'cift', taslar: [t('kirmizi', 9), t('mavi', 7)], beklenen: true },
  // ADR-027: sahte okey joker DEĞİL, mavi-7 değerinde taş → yalnız mavi-7 ile çift kurar.
  { ad: 'çift geçersiz: sahte okey (mavi-7 değerinde) kirmizi-9 ile eşleşmez', tur: 'cift', taslar: [sOkey(1), t('kirmizi', 9)], beklenen: false },
  { ad: 'çift geçersiz: sahte okey siyah-7 ile eşleşmez (sayı aynı, renk tutmuyor)', tur: 'cift', taslar: [sOkey(1), t('siyah', 7)], beklenen: false },
  { ad: 'çift geçerli: ANAHTAR AÇIK — sahte okey joker olarak kirmizi-9 ile eşleşiyor', tur: 'cift', taslar: [sOkey(1), t('kirmizi', 9)], kural: KURAL_ESKI_JOKER, beklenen: true },
  { ad: 'çift geçerli: iki sahte okey birlikte (ikisi de mavi-7 değerinde)', tur: 'cift', taslar: [sOkey(1), sOkey(2)], beklenen: true },
  { ad: 'çift geçerli: sahte okey + gerçek okey taşı (gerçek okey joker)', tur: 'cift', taslar: [sOkey(1), t('mavi', 7)], beklenen: true },

  // --- Gösterge taşı çift sayılmaz (GDD kural 9) ---
  { ad: 'çift geçersiz: taşlardan biri gösterge taşının kendisi', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2)], gosterge: t('kirmizi', 5, 1), beklenen: false },
  { ad: 'çift geçerli: birebir aynı iki taş, gösterge başka bir taş', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2)], gosterge: t('mavi', 9, 1), beklenen: true },
  { ad: 'çift geçerli: gösterge parametresi verilmeyince kural 9 uygulanmaz', tur: 'cift', taslar: [t('kirmizi', 5, 1), t('kirmizi', 5, 2)], beklenen: true },

  // --- Dönüşlü seri varsayılan olarak GEÇERLİ (Sahip kararı tasokey#66, ADR-008 sürüm 3) ---
  { ad: 'per geçerli: 12-13-1 geçişi (sari)', tur: 'per', taslar: [t('sari', 12), t('sari', 13), t('sari', 1)], beklenen: true },
  { ad: 'per geçerli: 13-1-2 geçişi (siyah)', tur: 'per', taslar: [t('siyah', 13), t('siyah', 1), t('siyah', 2)], beklenen: true },
  { ad: 'per geçerli: 12-13-1-2 (dönüşlü, uzunluk 4)', tur: 'per', taslar: [t('kirmizi', 12), t('kirmizi', 13), t('kirmizi', 1), t('kirmizi', 2)], beklenen: true },
  { ad: 'per geçerli: dönüşlü serinin boşluğunu gerçek okey dolduruyor (siyah 13-_-2)', tur: 'per', taslar: [t('siyah', 13), t('mavi', 7), t('siyah', 2)], beklenen: true },
  { ad: 'per geçersiz: dönüşlü serinin boşluğunu sahte okey dolduramaz (siyah 13-★-2)', tur: 'per', taslar: [t('siyah', 13), sOkey(1), t('siyah', 2)], beklenen: false },
  { ad: 'per geçerli: 13 taşlık tam seri (1..13, sayı aralığının tamamı)', tur: 'per', taslar: Array.from({ length: 13 }, (_, i) => t('mavi', i + 1)), beklenen: true },
  { ad: 'per geçersiz: dönüşlü görünse de renk karışık (sari-12, sari-13, kirmizi-1)', tur: 'per', taslar: [t('sari', 12), t('sari', 13), t('kirmizi', 1)], beklenen: false },

  // --- Kural ayarı tek kaynaktan okunuyor (ADR-008): kapatma anahtarı düz sıra kuralına döner ---
  { ad: 'per geçersiz: onUcBirGecisiPerSayilir kapatılırsa 12-13-1 yine geçersiz olur', tur: 'per', taslar: [t('sari', 12), t('sari', 13), t('sari', 1)], kural: { onUcBirGecisiPerSayilir: false }, beklenen: false },
  { ad: 'per geçerli: ayar kapalıyken düz seri etkilenmez (kirmizi 3-4-5)', tur: 'per', taslar: [t('kirmizi', 3), t('kirmizi', 4), t('kirmizi', 5)], kural: { onUcBirGecisiPerSayilir: false }, beklenen: true },
];

test(`per/çift doğrulayıcı tablo testi (${TABLO.length} örnek)`, () => {
  assert.ok(TABLO.length >= 20, 'tablo en az 20 örnek içermeli');
});

for (const vaka of TABLO) {
  test(vaka.ad, () => {
    const kural = vaka.kural;
    const sonuc = vaka.tur === 'per'
      ? (kural ? perGecerliMi(vaka.taslar, OKEY_TASI, kural) : perGecerliMi(vaka.taslar, OKEY_TASI))
      : ciftGecerliMi(vaka.taslar[0], vaka.taslar[1], OKEY_TASI, kural, vaka.gosterge ?? null);
    assert.equal(sonuc, vaka.beklenen, vaka.ad);
  });
}
