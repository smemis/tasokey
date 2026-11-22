// tasokey#78 — risk gerekçesi taşımasının ve 25 KB hedefinin ölçümü (öz-test değil, ölçüm betiği:
// `node testler/risk-tasima.olcum.js`; taban commit `--taban <rev>` ile verilebilir).
//
// Sahip'in kabul ölçütleri bu betikle ölçülür, tahmin edilmez:
//  (a) §7'nin kapanmış/Masa'da/ölçülmüş satırlarının durum hücresindeki gerekçe DEGISIKLIK.md'ye
//      BİREBİR taşındı mı (bayt farkı 0),
//  (b) tablo satırı duruyor mu — 30 satır, numara silinmemiş ve yeniden kullanılmamış,
//  (c) açık 10 risk (8, 10, 15, 16, 18, 21, 22, 23, 29, 30) taban commit'teki haliyle BİREBİR duruyor mu,
//  (d) MIMARI.md boyutu 25.600 baytın altında mı (hedef tutmazsa fark bayt olarak yazılır).
//
// Satır sonu notu: `core.autocrlf=true` (blob LF, çalışma kopyası CRLF olabilir) → karşılaştırma
// satır sonu normalleştirilmiş metin üzerinde yapılır (tasokey#76/#77 ölçüm betikleriyle aynı dil).

// tasokey#78 (ADR-026, aynı işin ikinci turu): "Nasıl ölçülecek" hücresi artık taban ile aynı
// kalmak ZORUNDA değil — 16 tanesi `MIMARI-AYRINTI.md`'ye taşındı. Sav gevşetilmedi, kesinleştirildi:
// değişen hücre YALNIZCA tek bir `[ayrıntı](MIMARI-AYRINTI.md#…)` bağlantısıysa ve ekteki bölüm
// taban hücresine BİREBİR eşitse kabul edilir; başka her değişiklik kırmızı yanar (tasokey#74'ün
// dersi: sav yeni yapıya uydurulurken gevşetilmez).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(import.meta.dirname, '..');
const HEDEF_BAYT = 25600;
const ACIK = [8, 10, 15, 16, 18, 21, 22, 23, 29, 30];

function git(...args) {
  return execFileSync('git', args, { cwd: KOK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
const normalize = (metin) => metin.replace(/\r\n/g, '\n');

/** MIMARI.md §7 risk satırları: numara → { konu, durum, nasil, satir }. */
function riskler(md) {
  const L = md.split('\n');
  const i7 = L.findIndex((l) => l.startsWith('## 7. '));
  const harita = new Map();
  if (i7 < 0) return harita;
  for (const satir of L.slice(i7)) {
    if (!/^\| [0-9]+ \| /.test(satir)) continue;
    const p = satir.replace(/^\| /, '').replace(/ \|$/, '').split(' | ');
    if (p.length !== 4) throw new Error(`risk satırı 4 hücreye bölünmedi: ${satir.slice(0, 60)}`);
    harita.set(Number(p[0]), { konu: p[1], durum: p[2], nasil: p[3], satir });
  }
  return harita;
}

/** "### Risk N …" başlıklı bölümler (DEGISIKLIK.md gerekçeleri ve MIMARI-AYRINTI.md ölçüm hücreleri). */
function riskBolumleri(deg, desen = /^### Risk (\d+)\s*$/) {
  const harita = new Map();
  let numara = null;
  let govde = [];
  const yaz = () => {
    if (numara === null) return;
    while (govde.length && govde.at(-1) === '') govde.pop();
    while (govde.length && govde[0] === '') govde.shift();
    harita.set(numara, govde.join('\n'));
  };
  for (const satir of deg.split('\n')) {
    const esle = satir.match(desen);
    if (esle) {
      yaz();
      numara = Number(esle[1]);
      govde = [];
    } else if (/^#{1,6} +/.test(satir)) {
      // desene uymayan HER başlık bölümü kapatır (ör. ekteki "### ADR-001 — tek satır karar"):
      // yoksa yabancı bölümler gövdeye sızar ve birebirlik ölçümü sessizce yanlış olur.
      yaz();
      numara = null;
    } else if (numara !== null) govde.push(satir);
  }
  yaz();
  return harita;
}

function tabanCommit(argv) {
  const i = argv.indexOf('--taban');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  // Taşımadan önceki son hal: §7'de durum hücresi "gerekçe" bağlantısı taşımayan sürüm.
  for (const commit of git('log', '--format=%H', '--', 'MIMARI.md').trim().split('\n')) {
    const md = normalize(git('show', `${commit}:MIMARI.md`));
    const r = riskler(md);
    if (r.size >= 30 && ![...r.values()].some((x) => x.durum.includes('#risk-'))) return commit;
  }
  throw new Error('taban commit bulunamadı');
}

const taban = tabanCommit(process.argv.slice(2));
const tabanRiskler = riskler(normalize(git('show', `${taban}:MIMARI.md`)));
const simdiMd = normalize(readFileSync(join(KOK, 'MIMARI.md'), 'utf8'));
const simdiRiskler = riskler(simdiMd);
const bolumler = riskBolumleri(normalize(readFileSync(join(KOK, 'DEGISIKLIK.md'), 'utf8')));
// ADR-026 (tasokey#78 ikinci tur): "Nasıl ölçülecek" hücrelerinin yürürlükteki tam metni ekte.
const ekMetni = normalize(readFileSync(join(KOK, 'MIMARI-AYRINTI.md'), 'utf8'));
const ekBolumler = riskBolumleri(ekMetni, /^### Risk (\d+) — nasıl ölçülecek\s*$/);
// Üçüncü tur: kapanmış satırların "Konu" hücresinin tam metni de ekte (Ek 6).
const ekKonular = riskBolumleri(ekMetni, /^### Risk (\d+) — konu\s*$/);
let tasinanOlcum = 0;
let tasinanKonu = 0;

console.log(`taban commit        : ${taban.slice(0, 7)} (${git('log', '-1', '--format=%s', taban).trim()})`);
console.log(`risk satırı         : ${tabanRiskler.size} → ${simdiRiskler.size}`);
console.log(`DEGISIKLIK.md risk bölümü: ${bolumler.size}`);
console.log('');

const sorunlar = [];
let fark = 0;
let ayni = 0;

for (const [numara, taban_] of [...tabanRiskler].sort((a, b) => a[0] - b[0])) {
  const simdi = simdiRiskler.get(numara);
  if (!simdi) {
    sorunlar.push(`risk ${numara}: satır silinmiş`);
    continue;
  }
  if (taban_.konu !== simdi.konu) {
    // ADR-026 (tasokey#78 üçüncü tur): kapanmış satırların "Konu" hücresinde tek cümle kaldı, tam metin
    // ekte. Sav gevşetilmedi, kesinleştirildi: değişiklik yalnız ekteki bölüm taban hücresine BİREBİR
    // eşitse ve hücrenin kalanı tabanın bir ÖN EKİ değil, tabandan türetilmiş kısa cümleyse kabul edilir.
    const ekGovde = ekKonular.get(numara);
    if (ACIK.includes(numara)) sorunlar.push(`AÇIK risk ${numara}: "Konu" hücresi değişmiş (tam kalmalı)`);
    else if (ekGovde === undefined) sorunlar.push(`risk ${numara}: "Konu" hücresi değişmiş ama ekte bölümü yok`);
    else if (ekGovde !== taban_.konu) {
      sorunlar.push(
        `risk ${numara}: eke taşınan konu metni birebir değil ` +
          `(${Buffer.byteLength(taban_.konu)} B → ${Buffer.byteLength(ekGovde)} B)`,
      );
    } else if (Buffer.byteLength(simdi.konu) >= Buffer.byteLength(taban_.konu)) {
      sorunlar.push(`risk ${numara}: "Konu" hücresi kısalmamış (taşımanın kazancı yok)`);
    } else if (Buffer.byteLength(simdi.konu) < 60) {
      // Kalan cümlenin taban metne SADIK olduğu otomatik ölçülemez; ölçülebilen şey hücrenin
      // boşaltılmadığıdır (satır kimliğini yitirmemeli). Alt sınır yazılı: 60 bayt.
      sorunlar.push(`risk ${numara}: "Konu" hücresinde ${Buffer.byteLength(simdi.konu)} B kaldı, en az 60 B olmalı`);
    } else tasinanKonu += 1;
  }
  if (taban_.nasil !== simdi.nasil) {
    // ADR-026: hücre eke taşınmış olabilir — kabul ölçütü bağlantının TEK başına durması ve
    // ekteki bölümün taban hücresine BİREBİR eşit olmasıdır.
    const bag = simdi.nasil.match(/^\[ayrıntı\]\(MIMARI-AYRINTI\.md#[^)\s]+\)$/);
    const ekGovde = ekBolumler.get(numara);
    if (!bag) sorunlar.push(`risk ${numara}: "Nasıl ölçülecek" hücresi değişmiş (ek bağlantısı da değil)`);
    else if (ekGovde === undefined) sorunlar.push(`risk ${numara}: hücre eke taşınmış ama ekte bölümü yok`);
    else if (ekGovde !== taban_.nasil) {
      sorunlar.push(
        `risk ${numara}: eke taşınan ölçüm metni birebir değil ` +
          `(${Buffer.byteLength(taban_.nasil)} B → ${Buffer.byteLength(ekGovde)} B)`,
      );
    } else tasinanOlcum += 1;
  }

  if (ACIK.includes(numara)) {
    const tam = taban_.durum === simdi.durum;
    if (!tam) {
      sorunlar.push(`AÇIK risk ${numara}: durum hücresi değişmiş (açık riskin metni tam kalmalı)`);
      fark += 1;
    }
    console.log(`risk ${String(numara).padStart(2)} AÇIK   ${tam ? 'tam metin duruyor' : 'DEĞİŞMİŞ'}`);
    continue;
  }

  const bolum = bolumler.get(numara);
  if (simdi.durum === taban_.durum) {
    // taşınacak gerekçesi olmayan kısa hücre (yalnız etiket + kısa atıf)
    console.log(`risk ${String(numara).padStart(2)} aynı   taşınmadı (gerekçe metni yok): ${taban_.durum}`);
    continue;
  }
  if (bolum === undefined) {
    sorunlar.push(`risk ${numara}: durum hücresi değişti ama DEGISIKLIK.md'de "### Risk ${numara}" bölümü yok`);
    fark += 1;
    continue;
  }
  const d = bolum === taban_.durum ? 0 : Math.max(1, Math.abs(Buffer.byteLength(bolum) - Buffer.byteLength(taban_.durum)));
  fark += d;
  if (d === 0) ayni += 1;
  else sorunlar.push(`risk ${numara}: taşınan gerekçe birebir değil`);
  if (!simdi.durum.includes(`DEGISIKLIK.md#risk-${numara}`)) {
    sorunlar.push(`risk ${numara}: durum hücresinde gerekçe bağlantısı yok`);
  }
  console.log(
    `risk ${String(numara).padStart(2)} taşındı ${String(Buffer.byteLength(taban_.durum)).padStart(4)} B → ` +
      `${String(Buffer.byteLength(simdi.durum)).padStart(3)} B  fark ${d} bayt${d === 0 ? '' : '  ← FARKLI'}`,
  );
}

const fazlalar = [...simdiRiskler.keys()].filter((n) => !tabanRiskler.has(n));
if (fazlalar.length) sorunlar.push(`taban commit'te olmayan risk numarası: ${fazlalar.join(', ')}`);

const boyut = Buffer.byteLength(simdiMd);
const tabanBoyut = Buffer.byteLength(normalize(git('show', `${taban}:MIMARI.md`)));
console.log('');
console.log(`birebir taşınan ölçüm   : ${tasinanOlcum} hücre → MIMARI-AYRINTI.md (ADR-026)`);
console.log(`birebir taşınan konu    : ${tasinanKonu} hücre → MIMARI-AYRINTI.md (ADR-026, Ek 6)`);
console.log(`birebir taşınan gerekçe : ${ayni}/${[...tabanRiskler.keys()].filter((n) => !ACIK.includes(n)).length} (kapanmış/Masa'da/ölçülmüş satır)`);
console.log(`BAYT FARKI              : ${fark}`);
console.log(`MIMARI.md               : ${tabanBoyut} → ${boyut} bayt (LF)`);
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
