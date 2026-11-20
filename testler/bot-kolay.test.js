import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  atilacakTasiSec, cekimKaynaginiSec, kolayBotTurOyna,
} from '../docs/bot/kolay.js';
import { elBaslat, cek, KAYNAK, EL_SONUCU } from '../docs/cekirdek/el.js';
import { tasOlustur, sahteOkeyOlustur } from '../docs/cekirdek/tas.js';
import { KURAL_VARSAYILAN } from '../docs/cekirdek/kural.js';

// tasokey#9 — R-006: kolay bot sezgiseli. Bot hiçbir kural bilgisini kendi yorumlamaz;
// cekirdek/el.js'e önerir, motor onaylar/reddeder (MIMARI.md ADR-002). Kaynak kontrolü
// (bot kuralı kopyalamıyor) `katman-sinirlama.test.js`'te ayrıca ölçülür.

const OKEY_TASI = { renk: 'mavi', sayi: 7 };
const t = (renk, sayi, nusha = 1) => tasOlustur(renk, sayi, nusha);
const sOkey = (nusha = 1) => sahteOkeyOlustur(nusha);

// --- atilacakTasiSec: en izole taşı seçer, joker atma yasaksa jokeri hiç önermez ---

test('atilacakTasiSec: bağlantısız (izole) taşı, çift/per oluşturan taşlar yerine seçer', () => {
  const el = [
    t('kirmizi', 1), t('siyah', 1), // çift adayı: güçlü bağlantı
    t('mavi', 9), t('mavi', 10), // per adayı: orta bağlantı
    t('sari', 3), // izole: hiçbir taşla bağlantısı yok
  ];
  const secilen = atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN);
  assert.equal(secilen.id, t('sari', 3).id);
});

test('atilacakTasiSec: kural okey atmayı yasaklıyorsa joker hiç aday olmaz', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const sahte = sOkey(1);
  const el = [okeyTas, sahte, t('sari', 3)]; // jokerler dışında tek aday sarı-3
  const secilen = atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN);
  assert.equal(secilen.id, t('sari', 3).id);
});

test('atilacakTasiSec: kural kapalıyken (okeyVeSahteOkeyAtmaYasak: false) joker de aday olabilir', () => {
  const okeyTas = t(OKEY_TASI.renk, OKEY_TASI.sayi, 1);
  const el = [okeyTas, t('kirmizi', 1), t('siyah', 1)]; // kirmizi/siyah-1 çift, okey izole kalır
  const kuralAcik = { ...KURAL_VARSAYILAN, okeyVeSahteOkeyAtmaYasak: false };
  const secilen = atilacakTasiSec(el, OKEY_TASI, kuralAcik);
  assert.equal(secilen.id, okeyTas.id);
});

test('atilacakTasiSec: elin tamamı jokerse (aday havuzu boşalır) hâlâ elden bir taş döner', () => {
  const el = [sOkey(1), sOkey(2)];
  const secilen = atilacakTasiSec(el, OKEY_TASI, KURAL_VARSAYILAN);
  assert.ok(el.some((tas) => tas.id === secilen.id));
});

// --- cekimKaynaginiSec: atılanı yalnız gerçekten bağlantılıysa seçer ---

// tasokey#25 — ADR-010: oyuncu 0 için önceki oyuncu 3'tür (oncekiOyuncu); bot da motorun
// cek(ATILAN) ile kabul edeceği tek kaynağa (yalnız oyuncu 3'ün yığını) bakmalı.

test('cekimKaynaginiSec: önceki oyuncunun atılan taşı elde çift tamamlıyorsa ATILAN seçilir', () => {
  const durum = {
    eller: [[t('kirmizi', 5), t('mavi', 2)], [], [], []],
    yerDestesi: [t('sari', 1)],
    atilanYiginlar: [[], [], [], [t('siyah', 5)]], // kirmizi-5 ile çift adayı, oyuncu 3'ün yığınında
    okeyTasi: OKEY_TASI,
  };
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

test('cekimKaynaginiSec: önceki oyuncunun atılan taşı elle bağlantısızsa YER seçilir', () => {
  const durum = {
    eller: [[t('kirmizi', 5), t('mavi', 2)], [], [], []],
    yerDestesi: [t('sari', 1)],
    atilanYiginlar: [[], [], [], [t('sari', 11)]], // hiçbir elde taşla bağlantısı yok
    okeyTasi: OKEY_TASI,
  };
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

test('cekimKaynaginiSec: yer destesi boşsa önceki oyuncunun yığını boş olmadıkça ATILAN seçilir', () => {
  const durum = {
    eller: [[t('kirmizi', 5)], [], [], []],
    yerDestesi: [],
    atilanYiginlar: [[], [], [], [t('sari', 11)]],
    okeyTasi: OKEY_TASI,
  };
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.ATILAN);
});

test('cekimKaynaginiSec: önceki oyuncunun yığını boşsa YER seçilir (başka oyuncunun dolu yığınına bakılmaz)', () => {
  const durum = {
    eller: [[t('kirmizi', 5)], [], [], []],
    yerDestesi: [t('sari', 1)],
    atilanYiginlar: [[], [t('kirmizi', 11)], [], []], // oyuncu 1'in yığını dolu ama oyuncu 0'ın öncekisi değil
    okeyTasi: OKEY_TASI,
  };
  assert.equal(cekimKaynaginiSec(durum, 0, KURAL_VARSAYILAN), KAYNAK.YER);
});

// --- kolayBotTurOyna: gerçek cekirdek/el.js ile entegrasyon, bot asla kurala aykırı hamle önermiyor ---

test('kolayBotTurOyna: elBaslat sonrası sıradaki oyuncu için çek+at başarıyla tamamlanır', () => {
  const durum = elBaslat(2026);
  // Oyuncu 0 (başlayan) zaten çekilmiş sayılır; onun turu doğrudan atma. Sırayı 1'e getirelim.
  const cekSonucu = cek(durum, 0, KAYNAK.YER);
  assert.equal(cekSonucu.sebep, 'zatenCekildi');

  const atSonucu = kolayBotTurOyna(durum, 0, KURAL_VARSAYILAN);
  assert.equal(atSonucu.basarili, true, 'bot önerisi motor tarafından reddedilmemeli');
});

test('kolayBotTurOyna: önerilen taş her zaman o oyuncunun elinden; hiçbir zaman okeyAtilamaz sebebiyle reddedilmiyor', () => {
  let durum = elBaslat(4242);
  for (let i = 0; i < 20 && durum.sonuc === EL_SONUCU.SUREN; i++) {
    const oyuncu = durum.sira;
    const sonuc = kolayBotTurOyna(durum, oyuncu, KURAL_VARSAYILAN);
    assert.equal(sonuc.basarili, true, `tur ${i}: reddedildi, sebep=${sonuc.sebep}`);
    durum = sonuc.durum;
  }
});

test('kaynak kontrolü: bot dizilim.js/cozucu.js içe aktarmıyor, geçerliliği yalnız el.js belirliyor', () => {
  // ADR-002: kural bilgisi tek yerde (cekirdek); bot aynı işi (per/çift geçerliliği,
  // bitirilebilirlik) ikinci kez hesaplamıyor, yalnız öneri üretip el.js'e onaylatıyor.
  const kaynak = readFileSync(join(import.meta.dirname, '..', 'docs', 'bot', 'kolay.js'), 'utf8');
  assert.ok(!/dizilim\.js|cozucu\.js/.test(kaynak), 'bot kural motorunun iç hesaplama modüllerini içe aktarmamalı');
  assert.ok(!/perGecerliMi|ciftGecerliMi|elBitirilebilirMi/.test(kaynak), 'bot kural hesaplamasını kopyalamamalı');
});
