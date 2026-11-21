import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// tasokey#41 — `bot/kolay.js` → `bot/bot.js` yeniden adlandırması, `arayuz/ekran.js`'in import
// satırını kırabilirdi: öz-testler modülleri doğrudan import ettiği için kendi yollarını
// doğruluyor, ama **tarayıcının** yüklediği zincir (`docs/index.html` → `arayuz/ekran.js` → …)
// hiçbir testte yüklenmiyordu (ekran.js DOM'suz import edilemez). Bu dosya o zinciri kaynak
// taramasıyla ölçer: `docs/` altındaki her göreli import hedefi gerçekten var mı?
// (ADR-002'nin kaynak taraması diliyle aynı yöntem; tarayıcı gerektirmez.)

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const IMPORT_DESENI = /from\s+'(\.[^']+)'/g;
const ADLI_IMPORT_DESENI = /import\s*\{([^}]*)\}\s*from\s+'(\.[^']+)'/g;
const HTML_KAYNAK_DESENI = /(?:src|href)="([^":]+)"/g;
const EXPORT_BILDIRIM_DESENI = /export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+(\w+)/g;
const EXPORT_LISTE_DESENI = /export\s*\{([^}]*)\}/g;

// `import { a as b }` → içe alınan ad `a`; `export { a as b }` → dışa verilen ad `b`.
function adlariAyikla(liste, tarafIndeksi) {
  return liste
    .split(',')
    .map((parca) => parca.trim())
    .filter((parca) => parca.length > 0)
    .map((parca) => {
      const parcalar = parca.split(/\s+as\s+/);
      return (parcalar[tarafIndeksi] ?? parcalar[0]).trim();
    });
}

function disaVerilenAdlar(dosya) {
  const icerik = readFileSync(dosya, 'utf8');
  const adlar = new Set();
  for (const [, ad] of icerik.matchAll(EXPORT_BILDIRIM_DESENI)) adlar.add(ad);
  for (const [, liste] of icerik.matchAll(EXPORT_LISTE_DESENI)) {
    for (const ad of adlariAyikla(liste, 1)) adlar.add(ad);
  }
  return adlar;
}

function jsDosyalari(dizin) {
  return readdirSync(dizin, { recursive: true })
    .filter((ad) => ad.endsWith('.js'))
    .map((ad) => join(dizin, ad));
}

test('docs/ altındaki her göreli JS import\'u var olan bir dosyayı gösteriyor', () => {
  const eksikler = [];
  let sayi = 0;
  for (const dosya of jsDosyalari(DOCS_KOK)) {
    const icerik = readFileSync(dosya, 'utf8');
    for (const [, yol] of icerik.matchAll(IMPORT_DESENI)) {
      sayi += 1;
      const hedef = join(dirname(dosya), yol);
      if (!existsSync(hedef)) {
        eksikler.push(`${relative(DOCS_KOK, dosya).replace(/\\/g, '/')} → ${yol}`);
      }
    }
  }
  assert.ok(sayi > 0, 'hiç import bulunamadı — tarama deseni bozulmuş olabilir');
  assert.deepEqual(eksikler, [], `var olmayan modüle import:\n${eksikler.join('\n')}`);
});

// Dosyanın var olması yetmez: `ekran.js` `botTurOyna` / `VARSAYILAN_KADEME` adlarını istiyor;
// bot tarafında ad değişirse tarayıcı "does not provide an export named …" ile patlar, oysa
// yukarıdaki test yeşil kalır. Bu test içe alınan her adın hedef modülde dışa verildiğini ölçer.
test('docs/ altındaki her adlı import, hedef modülde dışa verilen bir adı gösteriyor', () => {
  const eksikler = [];
  let sayi = 0;
  for (const dosya of jsDosyalari(DOCS_KOK)) {
    const icerik = readFileSync(dosya, 'utf8');
    for (const [, liste, yol] of icerik.matchAll(ADLI_IMPORT_DESENI)) {
      const hedef = join(dirname(dosya), yol);
      if (!existsSync(hedef)) continue; // eksik dosyayı ilk test bildiriyor
      const verilen = disaVerilenAdlar(hedef);
      const kaynakAdi = relative(DOCS_KOK, dosya).replace(/\\/g, '/');
      assert.ok(verilen.size > 0, `${yol} içinde hiç export bulunamadı — tarama deseni bozulmuş olabilir`);
      for (const ad of adlariAyikla(liste, 0)) {
        sayi += 1;
        if (!verilen.has(ad)) eksikler.push(`${kaynakAdi} → ${yol} içinde '${ad}' yok`);
      }
    }
  }
  assert.ok(sayi > 10, `beklenenden az adlı import tarandı (${sayi}) — tarama deseni bozulmuş olabilir`);
  assert.deepEqual(eksikler, [], `dışa verilmeyen adı içe alan import:\n${eksikler.join('\n')}`);
});

test('docs/index.html\'in yüklediği betik ve stil dosyaları var', () => {
  const html = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
  const hedefler = [...html.matchAll(HTML_KAYNAK_DESENI)].map(([, yol]) => yol);
  assert.ok(hedefler.length > 0, 'index.html\'de src/href bulunamadı');
  for (const hedef of hedefler) {
    assert.ok(existsSync(join(DOCS_KOK, hedef)), `index.html var olmayan dosyayı yüklüyor: ${hedef}`);
  }
});
