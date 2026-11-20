import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// MIMARI.md §3 sınır kuralı: cekirdek/ ve bot/ altında document, window, localStorage,
// Math.random geçmez — kaynak taraması ile ölçülür, tahminle değil.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const KATMANLAR = ['cekirdek', 'bot'];
const YASAKLI_KALIPLAR = [/\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bMath\.random\b/];

function jsDosyalariniTopla(dizin) {
  return readdirSync(dizin, { recursive: true })
    .filter((ad) => ad.endsWith('.js'))
    .map((ad) => join(dizin, ad));
}

test('cekirdek katmanı taraması çalışıyor (en az 1 dosya tarandı)', () => {
  const cekirdekDizini = join(DOCS_KOK, 'cekirdek');
  assert.ok(existsSync(cekirdekDizini), 'docs/cekirdek klasörü yok');
  const dosyalar = jsDosyalariniTopla(cekirdekDizini);
  assert.ok(dosyalar.length > 0, 'docs/cekirdek altında taranacak .js dosyası yok');
});

test('cekirdek ve bot altında tarayıcı API\'si ya da Math.random geçmiyor', () => {
  for (const katman of KATMANLAR) {
    const dizin = join(DOCS_KOK, katman);
    if (!existsSync(dizin)) continue;
    for (const dosya of jsDosyalariniTopla(dizin)) {
      const icerik = readFileSync(dosya, 'utf8');
      for (const kalip of YASAKLI_KALIPLAR) {
        assert.ok(!kalip.test(icerik), `${dosya} yasaklı desen içeriyor: ${kalip}`);
      }
    }
  }
});
