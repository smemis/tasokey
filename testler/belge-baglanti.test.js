import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// tasokey#76 (üst iş tasokey#75, plan §4 iş 1) — ölü bağlantı ölçütü.
// ADR'ler kendi dosyalarına taşındığı için belgeler artık birbirine BAĞLANTIYLA bağlı; bağlantı
// kırılırsa karar metni okunamaz hale gelir (tasokey#38'in belirtisinin belge hali). Taşımadan önce
// MIMARI.md'de hiç markdown bağlantısı yoktu (ölçüldü: 0), yani bu ölçütün tabanı sıfırdır.
// Bu test kök belgelerdeki ve adr/ dosyalarındaki YEREL bağlantıların hedefini diskte arar.
//
// tasokey#77 (plan §4 iş 2): sürüm notu geçmişi `DEGISIKLIK.md`'ye taşındı ve belgeler artık
// BAŞLIK ÇAPASIYLA birbirine bağlanıyor (`DEGISIKLIK.md#sürüm-24--tasokey74`). Bu yüzden ölü bağlantı
// ölçütü çapaları da kapsar: hedef dosyanın başlıklarından üretilen çapa kümesinde olmayan bir çapa
// kırmızı yanar (`capa()` GitHub'ın kuralıdır: küçük harf, noktalama atılır, boşluk tireye döner).
//
// Kapsam dışı yalnız `http(s):` ve `mailto:`. Kod bloklarının içi taranmaz: orada geçen köşeli
// parantez bir bağlantı değil, örnek metindir.

const KOK = join(import.meta.dirname, '..');
const TARANAN_DIZINLER = ['', 'adr', 'android'];
const BAGLANTI_DESENI = /\[[^\]\n]*\]\(([^)\s]+)\)/g;

function belgeler() {
  const dosyalar = [];
  for (const dizin of TARANAN_DIZINLER) {
    const tam = join(KOK, dizin);
    for (const ad of readdirSync(tam)) {
      const yol = join(tam, ad);
      if (ad.endsWith('.md') && statSync(yol).isFile()) dosyalar.push(yol);
    }
  }
  return dosyalar;
}

/** Kod bloklarını (``` … ```) ayıklar; içindeki köşeli parantezler bağlantı sayılmaz. */
const koduAt = (metin) => metin.replace(/```[\s\S]*?```/g, '');

/** GitHub'ın başlık çapası kuralı: küçük harf, harf/sayı/boşluk/tire dışı atılır, boşluk → tire. */
const capa = (baslik) => baslik.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');

/** Bir markdown dosyasının başlıklarından üretilen çapa kümesi. */
function capalar(yol) {
  const kume = new Set();
  for (const satir of koduAt(readFileSync(yol, 'utf8').replace(/\r\n/g, '\n')).split('\n')) {
    const esle = satir.match(/^#{1,6} +(.+?)\s*$/);
    if (esle) kume.add(capa(esle[1]));
  }
  return kume;
}

function yerelBaglantilar() {
  const liste = [];
  for (const dosya of belgeler()) {
    const icerik = koduAt(readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n'));
    for (const [, hedef] of icerik.matchAll(BAGLANTI_DESENI)) {
      if (/^(https?:|mailto:)/.test(hedef)) continue;
      liste.push({ dosya, hedef });
    }
  }
  return liste;
}

const capaliBaglantilar = () => yerelBaglantilar().filter(({ hedef }) => hedef.includes('#'));

test('belge taraması çalışıyor (belge, bağlantı ve çapalı bağlantı bulundu)', () => {
  assert.ok(belgeler().length >= 6, `taranan belge sayısı beklenenden az: ${belgeler().length}`);
  assert.ok(yerelBaglantilar().length > 0, 'hiç yerel bağlantı bulunamadı — tarama deseni bozulmuş olabilir');
  assert.ok(
    capaliBaglantilar().length > 0,
    'hiç çapalı (#…) bağlantı bulunamadı — çapa denetimi sessizce kapsam kaybetmiş olabilir',
  );
});

test('ASIL KABUL: belgelerdeki yerel bağlantıların hedefi diskte var (ölü bağlantı 0)', () => {
  const olu = [];
  for (const { dosya, hedef } of yerelBaglantilar()) {
    const yolKismi = decodeURIComponent(hedef.split('#')[0]);
    if (yolKismi === '') continue;
    const tam = resolve(dirname(dosya), yolKismi);
    if (!existsSync(tam)) olu.push(`${dosya.replace(KOK, '').replace(/\\/g, '/')} → ${hedef}`);
  }
  assert.deepEqual(olu, [], `ölü bağlantı(lar):\n${olu.join('\n')}`);
});

test('ASIL KABUL: başlık çapalarının hedefi var (DEGISIKLIK.md sürüm çapaları dahil)', () => {
  const olu = [];
  for (const { dosya, hedef } of capaliBaglantilar()) {
    const [yolKismi, capaKismi] = hedef.split('#').map((p) => decodeURIComponent(p));
    if (!capaKismi) continue;
    const hedefDosya = yolKismi === '' ? dosya : resolve(dirname(dosya), yolKismi);
    if (!hedefDosya.endsWith('.md') || !existsSync(hedefDosya)) continue; // dosya denetimi üstteki testte
    if (!capalar(hedefDosya).has(capaKismi)) {
      olu.push(`${dosya.replace(KOK, '').replace(/\\/g, '/')} → ${hedef} (başlık yok)`);
    }
  }
  assert.deepEqual(olu, [], `hedefi olmayan çapa(lar):\n${olu.join('\n')}`);
});
