import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEDEF_TURU, EYLEM, ETKILESIM_RET_SEBEBI, eylemKararVer,
} from '../docs/arayuz/etkilesim.js';
import { KOSE, oyuncununAtilanKosesi } from '../docs/arayuz/yerlesim.js';
import { EL_SONUCU, sonrakiOyuncu, oncekiOyuncu } from '../docs/cekirdek/el.js';
import { tasOlustur } from '../docs/cekirdek/tas.js';

// tasokey#30 — R-012/R-013: (seçili taş, hedef türü, el durumu) → eylem kararı. Kabul (a)-(d)
// `is-dosyasi.md`'de. Oyuncu 0 (insan, ekran.js INSAN_OYUNCUSU) için: kendi atılan köşesi
// (doğru atma hedefi) sağAlt, çekilebilir köşe (doğru çekme kaynağı) solAlt (bkz. yerlesim.test.js
// kabul-a-3/a-4) — burada tekrar hesaplanmaz, aynı `oyuncununAtilanKosesi` ile doğrulanır.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const GOSTERGE = tasOlustur('mavi', 6, 1);
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);

const OYUNCU = 0;
const KENDI_ATILAN_KOSESI = oyuncununAtilanKosesi(OYUNCU, sonrakiOyuncu);
const CEKILEBILIR_KOSE = oyuncununAtilanKosesi(oncekiOyuncu(OYUNCU), sonrakiOyuncu);
const YANLIS_KOSE = [KOSE.SAG_ALT, KOSE.SAG_UST, KOSE.SOL_UST, KOSE.SOL_ALT]
  .find((kose) => kose !== KENDI_ATILAN_KOSESI && kose !== CEKILEBILIR_KOSE);

function temelElDurumu(ekler = {}) {
  const varsayilan = {
    eller: [[], [], [], []],
    gosterge: GOSTERGE,
    okeyTasi: OKEY_TASI,
    sira: OYUNCU,
    cekildiMi: true,
    sonuc: EL_SONUCU.SUREN,
  };
  return { ...varsayilan, ...ekler };
}

// --- (a) doğru köşeye atma kabul / yanlış köşe ret ---

test('(a) kabul: çekilmiş, sıra bende, taş seçili, kendi atılan köşeme bırakınca "at" eylemi döner', () => {
  const tas = t('kirmizi', 1);
  const durum = temelElDurumu({ cekildiMi: true, eller: [[tas], [], [], []] });
  const karar = eylemKararVer(tas.id, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: KENDI_ATILAN_KOSESI });
  assert.deepEqual(karar, { eylem: EYLEM.AT, tasId: tas.id });
});

test('(a) ret: aynı durumda yanlış köşeye bırakınca "gecersiz" + yanlisKose döner', () => {
  const tas = t('kirmizi', 1);
  const durum = temelElDurumu({ cekildiMi: true, eller: [[tas], [], [], []] });
  const karar = eylemKararVer(tas.id, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: YANLIS_KOSE });
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
});

test('(a) ret: henüz çekilmemişken köşeye atma denenirse henuzCekilmedi döner', () => {
  const tas = t('kirmizi', 1);
  const durum = temelElDurumu({ cekildiMi: false, eller: [[tas], [], [], []] });
  const karar = eylemKararVer(tas.id, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: KENDI_ATILAN_KOSESI });
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.HENUZ_CEKILMEDI);
});

// --- (b) deste ve önceki köşeden çekme kabul / yanlış köşe ret ---

test('(b) kabul: henüz çekilmemişken, taş seçili değilken deste hedefi "cekDeste" döner', () => {
  const durum = temelElDurumu({ cekildiMi: false });
  const karar = eylemKararVer(null, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.deepEqual(karar, { eylem: EYLEM.CEK_DESTE });
});

test('(b) kabul: henüz çekilmemişken önceki oyuncunun köşesine (çekilebilir köşe) hedeflenince "cekKose" döner', () => {
  const durum = temelElDurumu({ cekildiMi: false });
  const karar = eylemKararVer(null, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: CEKILEBILIR_KOSE });
  assert.deepEqual(karar, { eylem: EYLEM.CEK_KOSE });
});

test('(b) ret: henüz çekilmemişken yanlış köşeden çekme denenirse yanlisKose döner', () => {
  const durum = temelElDurumu({ cekildiMi: false });
  const karar = eylemKararVer(null, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: YANLIS_KOSE });
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
});

test('(b) ret: kendi atılan köşemden çekme denenirse de yanlisKose döner (yalnız önceki oyuncunun köşesi geçerli)', () => {
  const durum = temelElDurumu({ cekildiMi: false });
  const karar = eylemKararVer(null, HEDEF_TURU.KOSE, durum, OYUNCU, { kose: KENDI_ATILAN_KOSESI });
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
});

test('(b) ret: zaten çekilmişken yeniden çekme (deste) denenirse zatenCekildi döner', () => {
  const durum = temelElDurumu({ cekildiMi: true });
  const karar = eylemKararVer(null, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.ZATEN_CEKILDI);
});

// --- (c) bitirilemez elde desteye bırakma ret ---

test('(c) ret: bitirilemez elde seçili taşı desteye bırakınca "bitirilemez" döner', () => {
  // İzole taşlar — hiçbiri atılınca kalan per/çift oluşturmuyor (tasokey#26 el-bitiren-taslar.test.js
  // (b) ile aynı desen).
  const el = [t('kirmizi', 1), t('siyah', 5), t('mavi', 9)];
  const durum = temelElDurumu({ cekildiMi: true, eller: [el, [], [], []] });
  const karar = eylemKararVer(el[0].id, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.BITIRILEMEZ);
});

// --- (d) bitirilebilirde kabul ---

test('(d) kabul: bitirilebilir elde doğru taşı desteye bırakınca "bitir" eylemi döner', () => {
  // seri(4) kirmizi 1-2-3-4 + sayı peri 8 (siyah/mavi/sari): uçtaki taş (1) atılırsa kalan
  // tamamen per olur (ADR-017; el-bitiren-taslar.test.js (a) ile aynı desen).
  const kirmizi1 = t('kirmizi', 1);
  const el = [
    kirmizi1, t('kirmizi', 2), t('kirmizi', 3), t('kirmizi', 4),
    t('siyah', 8), t('mavi', 8), t('sari', 8),
  ];
  const durum = temelElDurumu({ cekildiMi: true, eller: [el, [], [], []] });
  const karar = eylemKararVer(kirmizi1.id, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.deepEqual(karar, { eylem: EYLEM.BITIR, tasId: kirmizi1.id });
});

test('(d) ret: aynı bitirilebilir elde ortadaki (yanlış) taş bırakılırsa bitirilemez döner', () => {
  const kirmizi2 = t('kirmizi', 2);
  const el = [
    t('kirmizi', 1), kirmizi2, t('kirmizi', 3), t('kirmizi', 4),
    t('siyah', 8), t('mavi', 8), t('sari', 8),
  ];
  const durum = temelElDurumu({ cekildiMi: true, eller: [el, [], [], []] });
  const karar = eylemKararVer(kirmizi2.id, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.BITIRILEMEZ);
});

// --- raf içi yeniden dizme: motora hiç gitmez ---

test('rafYuva hedefi: taş seçiliyse sıra/el sonu kısıtı olmadan "raftaTasi" döner', () => {
  const durum = temelElDurumu({ sira: oncekiOyuncu(OYUNCU), sonuc: EL_SONUCU.BITTI });
  const karar = eylemKararVer('herhangi-bir-id', HEDEF_TURU.RAF_YUVA, durum, OYUNCU, { slotIndex: 4 });
  assert.deepEqual(karar, { eylem: EYLEM.RAFTA_TASI, tasId: 'herhangi-bir-id', slotIndex: 4 });
});

test('rafYuva hedefi: taş seçili değilse tasSecilmedi döner', () => {
  const durum = temelElDurumu();
  const karar = eylemKararVer(null, HEDEF_TURU.RAF_YUVA, durum, OYUNCU, { slotIndex: 4 });
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.TAS_SECILMEDI);
});

// --- el bitti / sıra değil ---

test('el bittiyse herhangi bir hedefte elBitti döner', () => {
  const durum = temelElDurumu({ sonuc: EL_SONUCU.BITTI });
  const karar = eylemKararVer(null, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.EL_BITTI);
});

test('sıra başka oyuncudaysa siraDegil döner', () => {
  const durum = temelElDurumu({ sira: sonrakiOyuncu(OYUNCU) });
  const karar = eylemKararVer(null, HEDEF_TURU.YER_DESTESI, durum, OYUNCU);
  assert.equal(karar.eylem, EYLEM.GECERSIZ);
  assert.equal(karar.sebep, ETKILESIM_RET_SEBEBI.SIRA_DEGIL);
});
