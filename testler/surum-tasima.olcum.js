// tasokey#77 — sürüm notu taşımasının ölçümü (öz-test değil, ölçüm betiği:
// `node testler/surum-tasima.olcum.js`; taban commit `--taban <rev>` ile verilebilir).
//
// Sahip'in kabul ölçütü: "taşınan metin birebir ve sıra değişmez". Bu betik bunu TAHMİN etmez:
// taban commit'teki `MIMARI.md`'nin başındaki sürüm notu bloğunu (Sürüm 3…25) ve özet tablodaki
// "önceki: …" zincirini ayrıştırır, `DEGISIKLIK.md`'deki karşılıklarıyla BAYT BAYT karşılaştırır.
// Eklenen tek şey her nota bir çapa başlığıdır (`## Sürüm 24 — tasokey#74`); notun kendi metni
// (`> ` önekleri, satır sonları, tırnaklar) değişmez.
//
// Satır sonu notu: depoda `core.autocrlf=true` (blob LF, çalışma kopyası CRLF olabilir) → tasokey#76'daki
// adr-tasima.olcum.js gibi iki sayı birden basılır; kabul ölçütü normalleştirilmiş farkın 0 olmasıdır.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(import.meta.dirname, '..');
const NOT_BASI = /^> \*\*Sürüm (\d+)\*\*/;

function git(...args) {
  return execFileSync('git', args, { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
const normalize = (metin) => metin.replace(/\r\n/g, '\n');

/** Bir MIMARI.md metninden sürüm notlarını numara → metin olarak ayrıştırır (birebir). */
function notlar(md) {
  const L = md.split('\n');
  const bas = L.findIndex((l) => /^> \*\*Sürüm 3\*\*/.test(l));
  const birl = L.findIndex((l) => /^> \*Birleştirme notu/.test(l));
  if (bas < 0 || birl < 0) return new Map();
  const toplanan = [];
  for (const satir of L.slice(bas, birl - 1)) {
    const esle = satir.match(NOT_BASI);
    if (esle) toplanan.push({ numara: Number(esle[1]), satirlar: [satir] });
    else if (toplanan.length) toplanan.at(-1).satirlar.push(satir);
  }
  const harita = new Map();
  for (const not of toplanan) {
    while (not.satirlar.length && (not.satirlar.at(-1) === '' || not.satirlar.at(-1) === '>')) not.satirlar.pop();
    harita.set(not.numara, not.satirlar.join('\n'));
  }
  return harita;
}

/** Özet tablodaki "önceki: …" zinciri (son ") |" eki dışında, birebir). */
function zincir(md) {
  const satir = md.split('\n').find((l) => l.startsWith('| Mimari karar sürümü |'));
  if (!satir) return null;
  const bas = satir.indexOf('önceki: ');
  if (bas < 0 || !satir.endsWith(') |')) return null;
  return satir.slice(bas, satir.length - ') |'.length);
}

/** DEGISIKLIK.md'yi "## başlık" → gövde (başlık altındaki metin, boş satırlar kırpılmış) olarak böler. */
function bolumler(deg) {
  const harita = new Map();
  let baslik = null;
  let govde = [];
  const yaz = () => {
    if (baslik === null) return;
    while (govde.length && govde.at(-1) === '') govde.pop();
    while (govde.length && govde[0] === '') govde.shift();
    harita.set(baslik, govde.join('\n'));
  };
  for (const satir of deg.split('\n')) {
    if (satir.startsWith('## ')) {
      yaz();
      baslik = satir.slice(3).trim();
      govde = [];
    } else if (baslik !== null) govde.push(satir);
  }
  yaz();
  return harita;
}

function tabanCommit(argv) {
  const i = argv.indexOf('--taban');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  for (const commit of git('log', '--format=%H', '--', 'MIMARI.md').trim().split('\n')) {
    if (notlar(normalize(git('show', `${commit}:MIMARI.md`))).size >= 2) return commit;
  }
  throw new Error('taban commit bulunamadı: hiçbir sürümde sürüm notu bloğu yok');
}

const taban = tabanCommit(process.argv.slice(2));
const tabanMd = normalize(git('show', `${taban}:MIMARI.md`));
const tabanNotlar = notlar(tabanMd);
const tabanZincir = zincir(tabanMd);
const degHam = readFileSync(join(KOK, 'DEGISIKLIK.md'), 'utf8');
const deg = normalize(degHam);
const degBolumler = bolumler(deg);

console.log(`taban commit        : ${taban.slice(0, 7)} (${git('log', '-1', '--format=%s', taban).trim()})`);
console.log(`taban sürüm notu    : ${tabanNotlar.size} adet (Sürüm ${[...tabanNotlar.keys()].join(', ')})`);
console.log(`DEGISIKLIK.md bölüm : ${degBolumler.size} adet`);
console.log('');

let hamFark = 0;
let normFark = 0;
let ayni = 0;
const sorunlar = [];

// Bölüm başlıklarının sırası: artan olmalı
const degSiralama = [...degBolumler.keys()]
  .map((b) => Number(b.match(/^Sürüm (\d+) —/)?.[1]))
  .filter((n) => Number.isFinite(n));
const artan = [...degSiralama].sort((a, b) => a - b);
if (degSiralama.join(',') !== artan.join(',')) {
  sorunlar.push(`DEGISIKLIK.md'de sürüm sırası artan değil: ${degSiralama.join(', ')}`);
}

for (const [numara, metin] of [...tabanNotlar].sort((a, b) => a[0] - b[0])) {
  const baslik = [...degBolumler.keys()].find((b) => b.startsWith(`Sürüm ${numara} —`));
  if (!baslik) {
    sorunlar.push(`Sürüm ${numara}: DEGISIKLIK.md'de bölümü yok`);
    continue;
  }
  const disk = degBolumler.get(baslik);
  const normD = disk === metin ? 0 : Math.max(1, Math.abs(Buffer.byteLength(disk, 'utf8') - Buffer.byteLength(metin, 'utf8')));
  const hamD = Math.abs(
    Buffer.byteLength(degHam.includes('\r\n') ? disk.replace(/\n/g, '\r\n') : disk, 'utf8') -
      Buffer.byteLength(metin, 'utf8'),
  );
  normFark += normD;
  hamFark += normD === 0 ? 0 : hamD;
  if (normD === 0) ayni += 1;
  else sorunlar.push(`Sürüm ${numara} (çapa "${baslik}"): metin aynı değil`);
  console.log(
    `Sürüm ${String(numara).padStart(2)}  çapa "${baslik}"`.padEnd(46) +
      `${String(Buffer.byteLength(metin, 'utf8')).padStart(5)} B  fark ${normD} bayt${normD === 0 ? '' : '  ← FARKLI'}`,
  );
}

// Özet tablodaki zincir
const ekBaslik = [...degBolumler.keys()].find((b) => b.startsWith('Ek —'));
const ekGovde = ekBaslik ? degBolumler.get(ekBaslik) : '';
const diskZincir = ekGovde.split('\n').find((l) => l.startsWith('önceki: ')) ?? null;
if (tabanZincir === null) sorunlar.push('taban commit\'te özet tablo zinciri bulunamadı');
else if (diskZincir === null) sorunlar.push('DEGISIKLIK.md\'de "önceki: …" zinciri bulunamadı');
else if (diskZincir !== tabanZincir) {
  sorunlar.push('özet tablo zinciri birebir değil');
  normFark += 1;
}
console.log('');
console.log(
  `özet tablo zinciri  : ${Buffer.byteLength(tabanZincir ?? '', 'utf8')} B → çapa "${ekBaslik ?? '(yok)'}"` +
    `  fark ${diskZincir === tabanZincir ? 0 : '≠0'} bayt`,
);

console.log('');
console.log(`birebir aynı not    : ${ayni}/${tabanNotlar.size}`);
console.log(`BAYT FARKI (satır sonu normalleştirilmiş): ${normFark}`);
console.log(`bayt farkı (diskteki ham hal)            : ${hamFark}`);
const tabanBoyut = Buffer.byteLength(tabanMd, 'utf8');
const simdiBoyut = Buffer.byteLength(normalize(readFileSync(join(KOK, 'MIMARI.md'), 'utf8')), 'utf8');
console.log(
  `MIMARI.md (LF bayt) : ${tabanBoyut} → ${simdiBoyut} (%${Math.round((1 - simdiBoyut / tabanBoyut) * 100)} küçüldü)` +
    ` · DEGISIKLIK.md ${Buffer.byteLength(deg, 'utf8')} B`,
);

if (sorunlar.length > 0) {
  console.log('\nSORUN:');
  for (const s of sorunlar) console.log('  - ' + s);
  process.exitCode = 1;
} else {
  console.log('\nSONUÇ: sürüm notları ve özet tablo zinciri birebir taşındı, sıra artan (bayt farkı 0).');
}
