// tasokey#78 (ADR-026) — MIMARI.md hücre ayrıntısının MIMARI-AYRINTI.md'ye taşınmasının ölçümü.
// Öz-test değil, ölçüm betiği: `node testler/ayrinti-tasima.olcum.js` (taban `--taban <rev>` ile verilebilir).
//
// Sahip'in kabul ölçütleri burada ölçülür, tahmin edilmez:
//  (a) eke taşınan HER hücre VE bölüm gövdesi taban commit'teki haliyle BİREBİR mi (bayt farkı 0)
//      — §3 modül, §7 "Konu"/"Nasıl ölçülecek", §6 "Tür"/"Ne ile"/"Tek komut", §5 "Tek satır karar",
//      §2 "Seçim"/"Gerekçe", §4 gövdesi, §1 paragrafları, başlıktaki K1 onayı bloğu,
//  (b) satır sayıları duruyor mu — ADR dizini 26, modül 18, kanıt 14, risk 30,
//  (c) açık 10 riskin (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) ÜÇ hücresi de taban ile birebir mi,
//  (d) MIMARI.md'den eke giden her bağlantının çapası ekte var mı (ölü çapa 0; `belge-baglanti.test.js`
//      ile AYNI çapa kuralı — bağlantı ve başlık tek kaynaktan üretilir),
//  (e) MIMARI.md boyutu 25.600 baytın altında mı — HEM depodaki LF boyutu HEM diskteki boyut
//      (core.autocrlf=true ile satır başına 1 bayt fazla); sıkı olan ölçü bağlayıcıdır.
//
// Satır sonu notu: `core.autocrlf=true` olabilir (blob LF, çalışma kopyası CRLF) → karşılaştırma
// satır sonu normalleştirilmiş metin üzerinde yapılır (tasokey#76/#77/#78 ölçüm betikleriyle aynı dil).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(import.meta.dirname, '..');
const HEDEF_BAYT = 25600;
const ACIK = [8, 10, 15, 16, 18, 21, 22, 23, 29, 30];
// tasokey#81: ADR dizini 26 → 27 (ADR-027 eklendi).
const BEKLENEN_SATIR = { adr: 27, modul: 18, kanit: 14, risk: 30 };

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

/** Kısaltılan hücrede satırı TANITAN bir metin kaldı mı (grup başına yazılı alt sınır).
 *  Kalan cümlenin taban metne sadık olup olmadığı otomatik ölçülemez — bu yalnızca hücrenin
 *  boşaltılmadığını ölçer (mutasyon denemesi 9'un açtığı kör noktanın kapağı, tasokey#78). */
const EN_AZ = { sorumluluk: 60, konu: 60, seçim: 60, tür: 20 };
function kimlikKaldi(etiket, simdiHucre, grup) {
  const enAz = EN_AZ[grup];
  if (B(simdiHucre) < enAz) {
    sorunlar.push(`${etiket}: kısaltılan hücrede ${B(simdiHucre)} B kaldı, en az ${enAz} B olmalı`);
  }
}

/** Taban hücresinin eke BİREBİR girdiğini ölçer. */
// tasokey#81 (ADR-027): eke taşınan bu iki metnin KURALI değişti (sahte okey artık joker değil),
// bu yüzden taban commit'le birebir olamazlar — içerikleri bilerek güncellendi. Taşımanın birebirliği
// kalan 90 hücre için ölçülmeyi sürdürür; bu liste yalnız bilinçli güncellemeleri taşır, büyürse
// ölçümün değeri azalır (yeni satır eklerken işin numarasını ve gerekçesini yaz).
const SONRADAN_GUNCELLENEN = new Map([
  ['cekirdek/dizilim.js (ADR-017) — sorumluluk', 'tasokey#81 / ADR-027'],
  ['Risk 1 — konu', 'tasokey#81 / ADR-027'],
]);

function birebir(etiket, baslik, tabanHucre) {
  if (SONRADAN_GUNCELLENEN.has(baslik)) {
    tasinan += 1;
    dogrulandi.add(baslik);
    console.log(`  (birebirlik ölçülmedi: "${baslik}" ${SONRADAN_GUNCELLENEN.get(baslik)} ile güncellendi)`);
    return;
  }
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
  if (p[1] !== t[1]) {
    birebir(`modül ${duzMetin(p[0])} sorumluluk`, `${duzMetin(p[0])} — sorumluluk`, t[1]);
    kimlikKaldi(`modül ${duzMetin(p[0])} sorumluluk`, p[1], 'sorumluluk');
  }
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
  if (s[1] !== t[1]) {
    birebir(`risk ${numara} konu`, `Risk ${numara} — konu`, t[1]);
    kimlikKaldi(`risk ${numara} konu`, s[1], 'konu');
  }
  if (s[2] !== t[2]) sorunlar.push(`risk ${numara}: "Durum" hücresi değişmiş (bu işte dokunulmamalı)`);
  if (s[3] !== t[3]) birebir(`risk ${numara} ölçüm`, `Risk ${numara} — nasıl ölçülecek`, t[3]);
}

// ── (a) Ek 3 / 9 / 12: §6'nın üç sütunu ("Ne ile", "Tek komut", "Tür") ──
const tabanKanit = kanitlar(tabanMd);
const simdiKanit = kanitlar(simdiMd);
if (tabanKanit.length !== simdiKanit.length) sorunlar.push('kanıt satır sayısı taban ile aynı değil');
for (let i = 0; i < Math.min(tabanKanit.length, simdiKanit.length); i += 1) {
  const sutunlar = [
    [0, 'tür', `Kanıt ${i + 1} — tür`],
    [1, 'ne ile', `Kanıt ${i + 1} — ne ile`],
    [2, 'tek komut', `Kanıt ${i + 1} — tek komut`],
  ];
  for (const [s, ad, baslik] of sutunlar) {
    if (tabanKanit[i][s] !== simdiKanit[i][s]) {
      birebir(`kanıt ${i + 1} ${ad}`, baslik, tabanKanit[i][s]);
      if (ad === 'tür') kimlikKaldi(`kanıt ${i + 1} tür`, simdiKanit[i][s], 'tür');
    }
  }
}

// ── (a) Ek 5 / 11: §2 yığın tablosunun "Gerekçe" ve "Seçim" hücreleri ──
const tabanYigin = tablo(tabanMd, 2, 4, (p) => p[0] === 'Katman');
const simdiYigin = tablo(simdiMd, 2, 4, (p) => p[0] === 'Katman');
if (tabanYigin.length !== simdiYigin.length) sorunlar.push('yığın satır sayısı taban ile aynı değil');
for (let i = 0; i < Math.min(tabanYigin.length, simdiYigin.length); i += 1) {
  if (tabanYigin[i][0] !== simdiYigin[i][0]) sorunlar.push(`yığın ${i + 1}: "Katman" hücresi değişmiş`);
  if (tabanYigin[i][1] !== simdiYigin[i][1]) {
    birebir(`yığın ${i + 1} seçim`, `Yığın ${i + 1} — seçim`, tabanYigin[i][1]);
    kimlikKaldi(`yığın ${i + 1} seçim`, simdiYigin[i][1], 'seçim');
  }
  if (tabanYigin[i][2] !== simdiYigin[i][2]) birebir(`yığın ${i + 1} gerekçe`, `Yığın ${i + 1} — gerekçe`, tabanYigin[i][2]);
  if (tabanYigin[i][3] !== simdiYigin[i][3]) sorunlar.push(`yığın ${i + 1}: "ADR" hücresi değişmiş (taşıma kapsamı dışı)`);
}

// ── (a) Ek 7 / 8 / 10: tablo olmayan bloklar (§4 gövdesi, K1 onayı bloğu, §1 paragrafları) ──
/** Bölüm gövdesi: başlıktan sonraki, baştaki/sondaki boş satırları kırpılmış metin. */
function bolumGovdesi(md, no) {
  const L = md.split('\n');
  const i = L.findIndex((l) => l.startsWith(`## ${no}. `));
  let j = L.findIndex((l, k) => k > i && l.startsWith('## '));
  if (j < 0) j = L.length;
  let a = i + 1;
  let b = j;
  while (a < b && L[a] === '') a += 1;
  while (b > a && L[b - 1] === '') b -= 1;
  return L.slice(a, b).join('\n');
}

const taban4 = bolumGovdesi(tabanMd, 4);
if (bolumGovdesi(simdiMd, 4) !== taban4) birebir('§4 gövdesi', '§4 Veri ve kayıt — tam metin', taban4);

const K1_DESEN = /> \*\*K1 onayı alındı\*\*[\s\S]*?ayrıntısı\)\./;
const tabanK1 = tabanMd.match(K1_DESEN);
if (!tabanK1) sorunlar.push('taban commit\'te K1 onayı bloğu bulunamadı (desen eskimiş olabilir)');
else if (!simdiMd.includes(tabanK1[0])) {
  birebir('K1 onayı bloğu', 'Başlıktaki K1 onayı bloğu — tam metin', tabanK1[0]);
}

const taban1 = bolumGovdesi(tabanMd, 1);
const simdi1 = bolumGovdesi(simdiMd, 1);
if (simdi1 !== taban1) {
  const parca = taban1.split('\n\n');
  if (parca.length !== 3 || !parca[1].startsWith('```')) sorunlar.push('taban §1 gövdesi beklenen üç parça değil');
  else {
    birebir('§1 giriş paragrafı', '§1 Genel bakış — giriş', parca[0]);
    birebir('§1 bağımlılık paragrafı', '§1 Genel bakış — bağımlılık yönü', parca[2]);
    // Katman şeması MIMARI.md'de KALMALI (dizinin okunabilirliği buna bağlı).
    if (!simdi1.includes(parca[1])) sorunlar.push('§1: katman şeması (kod bloğu) MIMARI.md\'de birebir durmuyor');
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
const beklenmeyen = [...ek.keys()].filter((b) => !YENI_BOLUMLER.includes(b) && !dogrulandi.has(b));
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

// ── (e) boyut: hedef HEM depodaki LF boyutunda HEM diskteki (CRLF) boyutta tutmalı ──
const boyut = B(simdiMd);
const diskBoyut = B(readFileSync(join(KOK, 'MIMARI.md'))); // ham disk (çalışma kopyası satır sonlarıyla)
// CRLF karşılığı: `core.autocrlf=true` ile TEMİZ bir checkout'ta dosya bu boyutta olur (satır başına +1 B).
// Bağlayıcı ölçü üçünün en sıkısıdır — hedef, dosyanın nasıl indirildiğine bağlı kalmaz.
const crlfBoyut = boyut + simdiMd.split('\n').length - 1;
const olculen = Math.max(boyut, diskBoyut, crlfBoyut);
console.log('');
console.log(`eke taşınan hücre/blok  : ${tasinan}`);
console.log(`BAYT FARKI              : ${fark}`);
console.log(`ek bağlantısı / ölü çapa: ${capaSayisi} / ${oluCapa.length}`);
console.log(
  `MIMARI.md               : ${B(tabanMd)} → ${boyut} bayt (LF) · ${diskBoyut} bayt (diskte) · ` +
    `${crlfBoyut} bayt (CRLF checkout)`,
);
console.log(`MIMARI-AYRINTI.md       : ${B(ekMd)} bayt (LF)`);
console.log(
  `25 KB hedefi (< ${HEDEF_BAYT} B): ${olculen < HEDEF_BAYT ? `TUTTU (iki ölçüde de; pay ${HEDEF_BAYT - olculen} B)` : `TUTMADI — ${olculen - HEDEF_BAYT} bayt fazla`}`,
);

if (sorunlar.length > 0) {
  console.log('\nSORUN:');
  for (const s of sorunlar) console.log('  - ' + s);
  process.exitCode = 1;
} else if (olculen >= HEDEF_BAYT) {
  console.log('\nSONUÇ: taşıma birebir (bayt farkı 0) ama 25 KB hedefi TUTMUYOR → karar Sahip\'te (iş durur).');
  process.exitCode = 2;
} else {
  console.log('\nSONUÇ: taşıma birebir (bayt farkı 0) ve 25 KB hedefi tuttu.');
}
