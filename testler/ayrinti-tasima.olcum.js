// tasokey#78 (ADR-026) — MIMARI.md hücre ayrıntısının MIMARI-AYRINTI.md'ye taşınmasının ölçümü.
// Öz-test değil, ölçüm betiği: `node testler/ayrinti-tasima.olcum.js` (taban `--taban <rev>` ile verilebilir).
//
// Sahip'in kabul ölçütleri burada ölçülür, tahmin edilmez:
//  (a) eke taşınan HER hücre taban commit'teki haliyle BİREBİR mi (bayt farkı 0),
//  (b) satır sayıları duruyor mu — ADR dizini 26, modül 18, kanıt 14, risk 30,
//  (c) açık 10 riskin (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) ÜÇ hücresi de taban ile birebir mi,
//  (d) MIMARI.md'den eke giden her bağlantının çapası ekte var mı (ölü çapa 0; `belge-baglanti.test.js`
//      ile AYNI çapa kuralı — bağlantı ve başlık tek kaynaktan üretilir),
//  (e) MIMARI.md boyutu 25.600 baytın altında mı (tutmazsa fark bayt olarak yazılır).
//
// Satır sonu notu: `core.autocrlf=true` olabilir (blob LF, çalışma kopyası CRLF) → karşılaştırma
// satır sonu normalleştirilmiş metin üzerinde yapılır (tasokey#76/#77/#78 ölçüm betikleriyle aynı dil).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(import.meta.dirname, '..');
const HEDEF_BAYT = 25600;
const ACIK = [8, 10, 15, 16, 18, 21, 22, 23, 29, 30];
const BEKLENEN_SATIR = { adr: 26, modul: 18, kanit: 14, risk: 30 };

const git = (...a) => execFileSync('git', a, { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const normalize = (m) => m.replace(/\r\n/g, '\n');
const B = (t) => Buffer.byteLength(t, 'utf8');
const hucreler = (s) => s.replace(/^\| /, '').replace(/ \|$/, '').split(' | ');
const duzMetin = (s) => s.replace(/[`*]/g, '');
/** belge-baglanti.test.js'in çapa kuralı (GitHub). */
const capa = (b) => b.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');

/** Bir bölümün tablo satırlarını hücrelere böler. */
function tablo(md, bolumNo, hucreSayisi, basligiAt) {
  const L = md.split('\n');
  const i = L.findIndex((l) => l.startsWith(`## ${bolumNo}. `));
  let j = L.findIndex((l, k) => k > i && l.startsWith('## '));
  if (j < 0) j = L.length;
  const satirlar = [];
  for (const satir of L.slice(i, j)) {
    if (!satir.startsWith('| ') || satir.startsWith('|---')) continue;
    const p = hucreler(satir);
    if (p.length !== hucreSayisi) continue;
    if (basligiAt(p)) continue;
    satirlar.push(p);
  }
  return satirlar;
}

const moduller = (md) => tablo(md, 3, 4, (p) => p[0] === 'Modül');
const kanitlar = (md) => tablo(md, 6, 3, (p) => p[0] === 'Tür');
const riskler = (md) => tablo(md, 7, 4, (p) => !/^[0-9]+$/.test(p[0]));
const adrler = (md) => [...md.matchAll(/^\| (\d{3}) \| (.*)$/gm)].map(([, n, kalan]) => [n, kalan]);

/** Eke taşınmadan önceki son hal: MIMARI.md'de ekten hiç söz edilmeyen commit. */
function tabanCommit(argv) {
  const i = argv.indexOf('--taban');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  for (const commit of git('log', '--format=%H', '--', 'MIMARI.md').trim().split('\n')) {
    if (!normalize(git('show', `${commit}:MIMARI.md`)).includes('MIMARI-AYRINTI.md')) return commit;
  }
  throw new Error('taban commit bulunamadı');
}

/** MIMARI-AYRINTI.md'nin "### …" bölümleri: başlık → gövde. */
function ekBolumleri(metin) {
  const harita = new Map();
  let baslik = null;
  let govde = [];
  const yaz = () => {
    if (baslik === null) return;
    while (govde.length && govde.at(-1) === '') govde.pop();
    while (govde.length && govde[0] === '') govde.shift();
    harita.set(baslik, govde.join('\n'));
  };
  for (const satir of metin.split('\n')) {
    const esle = satir.match(/^### +(.+?)\s*$/);
    if (esle) {
      yaz();
      baslik = esle[1];
      govde = [];
    } else if (satir.startsWith('## ')) {
      yaz();
      baslik = null;
    } else if (baslik !== null) govde.push(satir);
  }
  yaz();
  return harita;
}

const taban = tabanCommit(process.argv.slice(2));
const tabanMd = normalize(git('show', `${taban}:MIMARI.md`));
const simdiMd = normalize(readFileSync(join(KOK, 'MIMARI.md'), 'utf8'));
const ekMd = normalize(readFileSync(join(KOK, 'MIMARI-AYRINTI.md'), 'utf8'));
const ek = ekBolumleri(ekMd);

console.log(`taban commit : ${taban.slice(0, 7)} (${git('log', '-1', '--format=%s', taban).trim()})`);
console.log(`ek bölümü    : ${ek.size} adet "### " başlığı\n`);

const sorunlar = [];
const dogrulandi = new Set();
let fark = 0;
let tasinan = 0;

/** Taban hücresinin eke BİREBİR girdiğini ölçer. */
function birebir(etiket, baslik, tabanHucre) {
  const govde = ek.get(baslik);
  if (govde === undefined) {
    sorunlar.push(`${etiket}: ekte "### ${baslik}" bölümü yok`);
    fark += Math.max(1, B(tabanHucre));
    return;
  }
  tasinan += 1;
  dogrulandi.add(baslik);
  const d = govde === tabanHucre ? 0 : Math.max(1, Math.abs(B(govde) - B(tabanHucre)));
  fark += d;
  if (d !== 0) sorunlar.push(`${etiket}: eke taşınan metin birebir değil (${B(tabanHucre)} B → ${B(govde)} B)`);
}

// ── (a) Ek 1: §3 modül hücreleri ──
const tabanModul = new Map(moduller(tabanMd).map((p) => [p[0], p]));
for (const p of moduller(simdiMd)) {
  const t = tabanModul.get(p[0]);
  if (!t) {
    sorunlar.push(`modül ${p[0]}: taban commit'te yok`);
    continue;
  }
  if (p[1] !== t[1]) birebir(`modül ${duzMetin(p[0])} sorumluluk`, `${duzMetin(p[0])} — sorumluluk`, t[1]);
  if (p[2] !== t[2]) sorunlar.push(`modül ${p[0]}: "Bağımlı olduğu" hücresi değişmiş (taşıma kapsamı dışı)`);
  if (p[3] !== t[3]) birebir(`modül ${duzMetin(p[0])} saf mantık`, `${duzMetin(p[0])} — saf mantık mı`, t[3]);
}

// ── (a) Ek 2: §7 "Nasıl ölçülecek" + (c) açık risklerin tam metni ──
const tabanRisk = new Map(riskler(tabanMd).map((p) => [Number(p[0]), p]));
const simdiRisk = new Map(riskler(simdiMd).map((p) => [Number(p[0]), p]));
for (const [numara, t] of [...tabanRisk].sort((a, b) => a[0] - b[0])) {
  const s = simdiRisk.get(numara);
  if (!s) {
    sorunlar.push(`risk ${numara}: satır silinmiş`);
    continue;
  }
  if (ACIK.includes(numara)) {
    const tam = s[1] === t[1] && s[2] === t[2] && s[3] === t[3];
    if (!tam) sorunlar.push(`AÇIK risk ${numara}: metni değişmiş (açık riskin üç hücresi tam kalmalı)`);
    continue;
  }
  if (s[1] !== t[1]) birebir(`risk ${numara} konu`, `Risk ${numara} — konu`, t[1]);
  if (s[2] !== t[2]) sorunlar.push(`risk ${numara}: "Durum" hücresi değişmiş (bu işte dokunulmamalı)`);
  if (s[3] !== t[3]) birebir(`risk ${numara} ölçüm`, `Risk ${numara} — nasıl ölçülecek`, t[3]);
}

// ── (a) Ek 3: §6 "Ne ile" ──
const tabanKanit = kanitlar(tabanMd);
const simdiKanit = kanitlar(simdiMd);
for (let i = 0; i < Math.min(tabanKanit.length, simdiKanit.length); i += 1) {
  if (tabanKanit[i][0] !== simdiKanit[i][0]) {
    sorunlar.push(`kanıt ${i + 1}: "Tür" hücresi değişmiş`);
    continue;
  }
  if (tabanKanit[i][1] !== simdiKanit[i][1]) {
    const baslik = [...ek.keys()].find((b) => b.startsWith(`Kanıt ${i + 1} — `));
    birebir(`kanıt ${i + 1} ne ile`, baslik ?? `Kanıt ${i + 1} — ?`, tabanKanit[i][1]);
  }
}

// ── (a) Ek 4: §5 "Tek satır karar" sütunu ──
for (const [numara, kalan] of adrler(tabanMd)) {
  const p = hucreler(`| ${numara} | ${kalan}`);
  if (p.length !== 5) continue;
  birebir(`ADR-${numara} tek satır karar`, `ADR-${numara} — tek satır karar`, p[4]);
}

// ── (a') ekte taban karşılığı olmayan bölüm: yalnız bu işte YAZILAN ADR-026 satırı olabilir ──
const YENI_BOLUMLER = ['ADR-026 — tek satır karar'];
const tabanAdrNumaralari = new Set(adrler(tabanMd).map(([n]) => n));
const yeniAdr = adrler(simdiMd)
  .map(([n]) => n)
  .filter((n) => !tabanAdrNumaralari.has(n));
const beklenmeyen = [...ek.keys()].filter(
  (b) => !YENI_BOLUMLER.includes(b) && !b.startsWith('Kanıt ') && !dogrulandi.has(b),
);
if (beklenmeyen.length) sorunlar.push(`ekte taban karşılığı olmayan bölüm: ${beklenmeyen.join(', ')}`);
console.log(
  `ekte yeni yazılan bölüm : ${YENI_BOLUMLER.filter((b) => ek.has(b)).length} ` +
    `(bu işte açılan ADR: ${yeniAdr.join(', ') || 'yok'}) — tabanda karşılığı yoktur, birebirlik ölçülmez\n`,
);

// ── (b) satır sayıları ──
const sayilar = {
  adr: adrler(simdiMd).length,
  modul: moduller(simdiMd).length,
  kanit: kanitlar(simdiMd).length,
  risk: simdiRisk.size,
};
for (const [ad, beklenen] of Object.entries(BEKLENEN_SATIR)) {
  const durum = sayilar[ad] === beklenen ? 'tamam' : 'FARKLI';
  if (durum !== 'tamam') sorunlar.push(`${ad} satır sayısı ${sayilar[ad]}, beklenen ${beklenen}`);
  console.log(`satır sayısı ${ad.padEnd(6)}: ${String(sayilar[ad]).padStart(3)} (beklenen ${beklenen}) ${durum}`);
}
const numaralar = [...simdiRisk.keys()];
if (new Set(numaralar).size !== numaralar.length) sorunlar.push('risk numarası yeniden kullanılmış');
const fazlalar = numaralar.filter((n) => !tabanRisk.has(n));
if (fazlalar.length) sorunlar.push(`taban commit'te olmayan risk numarası: ${fazlalar.join(', ')}`);

// ── (d) ölü çapa ──
let capaSayisi = 0;
const oluCapa = [];
const ekCapalari = new Set([...ekMd.matchAll(/^#{1,6} +(.+?)\s*$/gm)].map(([, b]) => capa(b)));
for (const [, hedef] of simdiMd.matchAll(/\]\(MIMARI-AYRINTI\.md#([^)\s]+)\)/g)) {
  capaSayisi += 1;
  if (!ekCapalari.has(decodeURIComponent(hedef))) oluCapa.push(hedef);
}
if (capaSayisi === 0) sorunlar.push('MIMARI.md\'de hiç ek bağlantısı yok — tarama deseni bozulmuş olabilir');
if (oluCapa.length) sorunlar.push(`ölü çapa: ${oluCapa.join(', ')}`);

// ── (e) boyut ──
const boyut = B(simdiMd);
console.log('');
console.log(`eke taşınan hücre       : ${tasinan}`);
console.log(`BAYT FARKI              : ${fark}`);
console.log(`ek bağlantısı / ölü çapa: ${capaSayisi} / ${oluCapa.length}`);
console.log(`MIMARI.md               : ${B(tabanMd)} → ${boyut} bayt (LF) · ek dosyası ${B(ekMd)} bayt`);
console.log(
  `25 KB hedefi (< ${HEDEF_BAYT} B): ${boyut < HEDEF_BAYT ? 'TUTTU' : `TUTMADI — ${boyut - HEDEF_BAYT} bayt fazla`}`,
);

if (sorunlar.length > 0) {
  console.log('\nSORUN:');
  for (const s of sorunlar) console.log('  - ' + s);
  process.exitCode = 1;
} else if (boyut >= HEDEF_BAYT) {
  console.log('\nSONUÇ: taşıma birebir (bayt farkı 0) ama 25 KB hedefi TUTMUYOR → karar Sahip\'te (iş durur).');
  process.exitCode = 2;
} else {
  console.log('\nSONUÇ: taşıma birebir (bayt farkı 0) ve 25 KB hedefi tuttu.');
}
