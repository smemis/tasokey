import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#76 (üst iş tasokey#75, plan §4 iş 1) — ADR-025'in yapısını öz-testle korur.
// Belirti: MIMARI.md 181 KB'a çıkmıştı, §5 tek başına 120 KB; her oturum belgeyi baştan okuyordu.
// Karar gövdeleri `adr/` klasörüne taşındı, §5 dizin oldu. Bu dosya o yapının bozulmasını ölçer:
// dizinde satırı olmayan dosya (ya da dosyası olmayan satır), kalıba uymayan dosya adı, iki H1
// taşıyan dosya ve §5'e geri yazılmış bir karar gövdesi burada kırmızı yanar.
//
// Not: ADR dosyalarının çoğunda ayrı bir "Durum" satırı yok (karar gövdeleri birebir taşındı,
// düzeltme yapılmadı — tasokey#76'nın kabul ölçütü). Durum sütunu MIMARI.md §5 dizinindedir;
// bu yüzden burada zorunlu alanlar Tarih / Karar / Etkilenen gereksinimler'dir.

const KOK = join(import.meta.dirname, '..');
const ADR_DIZIN = join(KOK, 'adr');
const MIMARI_MD = readFileSync(join(KOK, 'MIMARI.md'), 'utf8').replace(/\r\n/g, '\n');

const DOSYA_DESENI = /^ADR-(\d{3})-[a-z0-9-]+\.md$/;
const ZORUNLU_ALANLAR = ['Tarih', 'Karar', 'Etkilenen gereksinimler'];

const adrDosyalari = () => readdirSync(ADR_DIZIN).sort();

/** MIMARI.md §5 dizin satırları: numara → bağlantı hedefi. */
function dizinSatirlari() {
  const bas = MIMARI_MD.indexOf('## 5. Mimari kararlar (ADR)');
  const son = MIMARI_MD.indexOf('\n## 6. ', bas);
  assert.ok(bas >= 0 && son > bas, 'MIMARI.md §5 bulunamadı');
  const harita = new Map();
  for (const satir of MIMARI_MD.slice(bas, son).split('\n')) {
    const esle = satir.match(/^\|\s*(\d{3})\s*\|.*\]\(([^)]+)\)\s*\|/);
    if (esle) harita.set(esle[1], esle[2]);
  }
  return harita;
}

test('adr/ klasöründeki her dosya ADR-0NN-kisa-ad.md kalıbına uyuyor', () => {
  const dosyalar = adrDosyalari();
  assert.ok(dosyalar.length >= 25, `adr/ içinde en az 25 dosya beklenir, bulunan: ${dosyalar.length}`);
  const uymayanlar = dosyalar.filter((ad) => !DOSYA_DESENI.test(ad));
  assert.deepEqual(uymayanlar, [], `dosya adı kalıbı "ADR-0NN-kisa-ad.md" değil: ${uymayanlar.join(', ')}`);

  const numaralar = dosyalar.map((ad) => ad.match(DOSYA_DESENI)[1]);
  const tekrar = numaralar.filter((n, i) => numaralar.indexOf(n) !== i);
  assert.deepEqual(tekrar, [], `aynı ADR numarası birden çok dosyada: ${tekrar.join(', ')}`);
});

test('her ADR dosyasında tek bir "# ADR-0NN:" başlığı ve zorunlu alanlar var', () => {
  const sorunlar = [];
  for (const ad of adrDosyalari()) {
    const satirlar = readFileSync(join(ADR_DIZIN, ad), 'utf8').replace(/\r\n/g, '\n').split('\n');
    const h1ler = satirlar.filter((s) => s.startsWith('# '));
    const numara = ad.match(DOSYA_DESENI)[1];

    if (h1ler.length !== 1) sorunlar.push(`${ad}: ${h1ler.length} adet H1 başlığı var (tam 1 olmalı)`);
    if (!new RegExp(`^# ADR-${numara}: .+$`).test(satirlar[0] ?? '')) {
      sorunlar.push(`${ad}: ilk satır "# ADR-${numara}: …" değil`);
    }
    for (const alan of ZORUNLU_ALANLAR) {
      if (!satirlar.some((s) => s.startsWith(`| ${alan} |`))) sorunlar.push(`${ad}: "${alan}" satırı yok`);
    }
  }
  assert.deepEqual(sorunlar, [], `ADR dosyası yapısı bozuk:\n${sorunlar.join('\n')}`);
});

test('ASIL KABUL: MIMARI.md §5 dizini ile adr/ dosya kümesi birebir aynı', () => {
  const dizin = dizinSatirlari();
  const dosyaNumaralari = new Set(adrDosyalari().map((ad) => ad.match(DOSYA_DESENI)[1]));

  const dizindeOlmayan = [...dosyaNumaralari].filter((n) => !dizin.has(n)).sort();
  const dosyasiOlmayan = [...dizin.keys()].filter((n) => !dosyaNumaralari.has(n)).sort();

  assert.deepEqual(dizindeOlmayan, [], `adr/ içinde dosyası var ama §5 dizininde satırı yok: ${dizindeOlmayan.join(', ')}`);
  assert.deepEqual(dosyasiOlmayan, [], `§5 dizininde satırı var ama adr/ içinde dosyası yok: ${dosyasiOlmayan.join(', ')}`);
  assert.equal(dizin.size, dosyaNumaralari.size);
});

test('§5 dizinindeki her bağlantının hedefi diskte var', () => {
  const eksikler = [];
  for (const [numara, hedef] of dizinSatirlari()) {
    if (!existsSync(join(KOK, hedef))) eksikler.push(`ADR-${numara} → ${hedef}`);
  }
  assert.deepEqual(eksikler, [], `§5 dizininde ölü bağlantı:\n${eksikler.join('\n')}`);
});

test('karar gövdeleri MIMARI.md\'ye geri yazılmamış (tek kaynak: adr/)', () => {
  const geriYazilanlar = MIMARI_MD.split('\n').filter((s) => /^#{2,4} ADR-\d{3}:/.test(s));
  assert.deepEqual(
    geriYazilanlar,
    [],
    `MIMARI.md'de karar başlığı var — gövde §5'te tekrarlanmaz (ADR-025):\n${geriYazilanlar.join('\n')}`,
  );
});
