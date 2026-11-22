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
// Kapsam dışı: `http(s):`, `mailto:` ve yalnız çapa olan (`#…`) bağlantılar. Çapa denetimi
// (`dosya.md#baslik`) bu işte yok — bağlantının dosya kısmı denetlenir (plan iş 2'nin ölçütü).
// Kod bloklarının içi taranmaz: orada geçen köşeli parantez bir bağlantı değil, örnek metindir.

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

function yerelBaglantilar() {
  const liste = [];
  for (const dosya of belgeler()) {
    const icerik = koduAt(readFileSync(dosya, 'utf8').replace(/\r\n/g, '\n'));
    for (const [, hedef] of icerik.matchAll(BAGLANTI_DESENI)) {
      if (/^(https?:|mailto:|#)/.test(hedef)) continue;
      liste.push({ dosya, hedef });
    }
  }
  return liste;
}

test('belge taraması çalışıyor (belge bulundu, bağlantı bulundu)', () => {
  assert.ok(belgeler().length >= 6, `taranan belge sayısı beklenenden az: ${belgeler().length}`);
  assert.ok(yerelBaglantilar().length > 0, 'hiç yerel bağlantı bulunamadı — tarama deseni bozulmuş olabilir');
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
