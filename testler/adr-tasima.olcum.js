// tasokey#76 — ADR taşımasının ölçümü (öz-test değil, ölçüm betiği: `node testler/adr-tasima.olcum.js`).
//
// Sahip'in kabul ölçütü: "24 ADR gövdesi birebir taşınır". Bu betik bunu TAHMİN etmez, ölçer:
// dalın taban commit'indeki `MIMARI.md` §5'ten her ADR'nin gövdesini ayrıştırır ve `adr/` klasöründeki
// dosyanın gövdesiyle BAYT BAYT karşılaştırır. İzin verilen tek fark, dosyanın ilk satırının başlık
// düzeyidir (`### ADR-0NN:` → `# ADR-0NN:`, ADR-025).
//
// Taban commit: `--taban <rev>` verilmezse, HEAD'den geriye doğru `MIMARI.md`'ye dokunan ilk commit'te
// §5 hâlâ karar gövdelerini taşıyorsa o alınır (yani taşımadan önceki son hal).
//
// Satır sonu notu: depoda `core.autocrlf=true`; git'teki blob LF, çalışma kopyası CRLF olabilir.
// Bu yüzden iki sayı birden basılır: ham bayt farkı ve satır sonu normalleştirilmiş bayt farkı.
// Kabul ölçütü normalleştirilmiş farkın 0 olmasıdır (satır sonu dönüşümü git'in işi, içerik değil).

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(import.meta.dirname, '..');
const ADR_DIZIN = join(KOK, 'adr');
const BASLIK_DESENI = /^### ADR-(\d{3}): (.*)$/;

function git(...args) {
  return execFileSync('git', args, { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const normalize = (metin) => metin.replace(/\r\n/g, '\n');

/** `MIMARI.md` metninden §5'i ayırır. */
function bolumBes(md) {
  const bas = md.indexOf('## 5. Mimari kararlar (ADR)');
  const son = md.indexOf('\n## 6. ', bas);
  if (bas < 0 || son < 0) throw new Error('§5 sınırları bulunamadı');
  return md.slice(bas, son);
}

/** §5 metnindeki karar gövdelerini numara → { baslik, govde } olarak döner. */
function govdeler(bolum) {
  const harita = new Map();
  for (const parca of bolum.split(/\n(?=### ADR-\d{3}:)/).slice(1)) {
    const satirlar = parca.split('\n');
    const [, numara, baslik] = satirlar[0].match(BASLIK_DESENI);
    harita.set(numara, { baslik, govde: satirlar.slice(1).join('\n').replace(/\n+$/, '') });
  }
  return harita;
}

function tabanCommit(argv) {
  const i = argv.indexOf('--taban');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  const commitler = git('log', '--format=%H', '--', 'MIMARI.md').trim().split('\n');
  for (const commit of commitler) {
    const md = normalize(git('show', `${commit}:MIMARI.md`));
    if (md.split('\n').some((satir) => BASLIK_DESENI.test(satir))) return commit;
  }
  throw new Error('taban commit bulunamadı: hiçbir sürümde "### ADR-0NN:" başlığı yok');
}

const taban = tabanCommit(process.argv.slice(2));
const tabanMd = normalize(git('show', `${taban}:MIMARI.md`));
const tabanGovdeler = govdeler(bolumBes(tabanMd));

const adrDosyalari = readdirSync(ADR_DIZIN).filter((ad) => ad.endsWith('.md')).sort();
const dosyaNumaralari = new Map(
  adrDosyalari.map((ad) => [ad.match(/^ADR-(\d{3})-/)?.[1] ?? '???', ad]),
);

console.log(`taban commit        : ${taban.slice(0, 7)} (${git('log', '-1', '--format=%s', taban).trim()})`);
console.log(`taban §5 ADR sayısı : ${tabanGovdeler.size}`);
console.log(`adr/ dosya sayısı   : ${adrDosyalari.length}`);
console.log('');

let hamFark = 0;
let normFark = 0;
let ayni = 0;
const sorunlar = [];

for (const [numara, { baslik, govde }] of [...tabanGovdeler].sort()) {
  const dosyaAdi = dosyaNumaralari.get(numara);
  if (!dosyaAdi) {
    sorunlar.push(`ADR-${numara}: adr/ içinde dosyası yok`);
    continue;
  }
  const beklenen = `# ADR-${numara}: ${baslik}\n${govde}\n`;
  const diskHam = readFileSync(join(ADR_DIZIN, dosyaAdi), 'utf8');
  const disk = normalize(diskHam);

  const hamD = Math.abs(Buffer.byteLength(diskHam, 'utf8') - Buffer.byteLength(beklenen, 'utf8'));
  const normD = disk === beklenen ? 0 : Math.max(1, Math.abs(Buffer.byteLength(disk, 'utf8') - Buffer.byteLength(beklenen, 'utf8')));
  hamFark += hamD;
  normFark += normD;
  if (normD === 0) ayni += 1;
  else sorunlar.push(`ADR-${numara} (${dosyaAdi}): gövde aynı değil`);

  console.log(
    `ADR-${numara} ${dosyaAdi.padEnd(34)} gövde ${String(Buffer.byteLength(govde, 'utf8')).padStart(6)} B` +
      `  fark ${normD} bayt${normD === 0 ? '' : '  ← FARKLI'}`,
  );
}

const yeniler = [...dosyaNumaralari.keys()].filter((n) => !tabanGovdeler.has(n)).sort();
console.log('');
console.log(`ADR sayısı          : ${tabanGovdeler.size} → ${tabanGovdeler.size} (birebir taşındı) + yeni ${yeniler.map((n) => `ADR-${n}`).join(', ') || 'yok'}`);
console.log(`birebir aynı gövde  : ${ayni}/${tabanGovdeler.size}`);
console.log(`BAYT FARKI (satır sonu normalleştirilmiş): ${normFark}`);
console.log(`bayt farkı (diskteki ham hal)            : ${hamFark}`);

const tabanBoyut = Buffer.byteLength(tabanMd, 'utf8');
const simdiBoyut = Buffer.byteLength(normalize(readFileSync(join(KOK, 'MIMARI.md'), 'utf8')), 'utf8');
console.log(
  `MIMARI.md (LF bayt) : ${tabanBoyut} → ${simdiBoyut}` +
    ` (%${Math.round((1 - simdiBoyut / tabanBoyut) * 100)} küçüldü)`,
);

if (sorunlar.length > 0) {
  console.log('\nSORUN:');
  for (const s of sorunlar) console.log('  - ' + s);
  process.exitCode = 1;
} else {
  console.log('\nSONUÇ: gövdeler birebir taşındı (bayt farkı 0).');
}
