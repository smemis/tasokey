import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// tasokey#38 (Mimar hakemliği) — tek kaynak: koda yazılmış bir mimari karar belgeye de yazılmış olmalı.
// Belirti: bu işin kendisi denetimde takıldı. Kod ve testler ADR-015'e atıf yapıyordu, MIMARI.md ise
// o numaranın "kullanılmadığını" yazıyordu; Denetçi "güncel mimari karara uyuyor mu" maddesini
// ölçemedi çünkü atıf yapılan karar hiçbir yerde okunamıyordu.
//
// Bu dosya, kaynaklarda geçen her ADR atfı için MIMARI.md §5'te gerçek bir karar başlığı
// bulunduğunu kaynak taramasıyla ölçer (ADR-002'nin kaynak taraması dilinin aynısı; DOM gerektirmez).

const KOK = join(import.meta.dirname, '..');
const MIMARI_MD = readFileSync(join(KOK, 'MIMARI.md'), 'utf8');
const TARANAN_DIZINLER = ['docs', 'testler'];
const TARANAN_UZANTILAR = ['.js', '.css', '.html', '.md'];

const ATIF_DESENI = /ADR-(\d{3})/g;

function kaynakDosyalari() {
  const dosyalar = [];
  for (const dizin of TARANAN_DIZINLER) {
    const tam = join(KOK, dizin);
    for (const ad of readdirSync(tam, { recursive: true })) {
      if (TARANAN_UZANTILAR.some((uzanti) => ad.endsWith(uzanti))) dosyalar.push(join(tam, ad));
    }
  }
  return dosyalar;
}

/** Kaynaklarda geçen ADR numaralarını numara → [dosya, …] olarak toplar. */
function atiflar() {
  const bulunan = new Map();
  for (const dosya of kaynakDosyalari()) {
    const icerik = readFileSync(dosya, 'utf8');
    for (const [, numara] of icerik.matchAll(ATIF_DESENI)) {
      if (!bulunan.has(numara)) bulunan.set(numara, new Set());
      bulunan.get(numara).add(relative(KOK, dosya).replace(/\\/g, '/'));
    }
  }
  return bulunan;
}

/** MIMARI.md §5'te karar başlığı olan ADR numaraları. */
function belgelenenler() {
  return new Set([...MIMARI_MD.matchAll(/^### ADR-(\d{3}):/gm)].map(([, numara]) => numara));
}

test('ADR taraması çalışıyor (en az 1 dosya tarandı, en az 1 atıf bulundu)', () => {
  assert.ok(kaynakDosyalari().length > 0, 'docs/ ve testler/ altında taranacak kaynak dosyası yok');
  assert.ok(atiflar().size > 0, 'kaynaklarda hiç ADR atfı bulunamadı — tarama deseni bozulmuş olabilir');
});

test('ASIL KABUL: kaynaklarda atıf yapılan her ADR numarasının MIMARI.md §5\'te karar başlığı var', () => {
  const yazilmis = belgelenenler();
  const eksikler = [...atiflar()]
    .filter(([numara]) => !yazilmis.has(numara))
    .map(([numara, dosyalar]) => `ADR-${numara} (atıf: ${[...dosyalar].sort().join(', ')})`);

  assert.deepEqual(
    eksikler.sort(),
    [],
    `kodda/testte atıf yapılan ama MIMARI.md'de "### ADR-0xx:" başlığı olmayan karar(lar):\n${eksikler.sort().join('\n')}`,
  );
});

test('MIMARI.md "kullanılmadı" dediği bir numaraya aynı dosyada karar yazmıyor', () => {
  const yazilmis = belgelenenler();
  const celiskiler = [];
  for (const satir of MIMARI_MD.split('\n')) {
    if (!satir.includes('kullanılmadı')) continue;
    for (const [, numara] of satir.matchAll(ATIF_DESENI)) {
      if (yazilmis.has(numara)) celiskiler.push(`ADR-${numara}: "${satir.trim()}"`);
    }
  }
  assert.deepEqual(celiskiler, [], `MIMARI.md kendisiyle çelişiyor:\n${celiskiler.join('\n')}`);
});
