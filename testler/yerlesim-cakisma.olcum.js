// tasokey#67 (üst iş tasokey#64) — YERLEŞİM ÇAKIŞMA ÖLÇÜM ARACI (sürücü).
// Planın §5'indeki protokolü koşar: 5 boyut x 2 durum (el sürerken / rakip ıstakaları açık),
// en kötü metin durumu, öğe kümesinin bütün çiftleri, hedef halkası ve taşma denetimi.
// Çıktı: markdown "önce/sonra" tablosu + JSON + boyut başına ekran görüntüsü.
//
// `*.olcum.js` kalıbı: `npm test` bunu KOŞMAZ (MIMARI.md test komutu yalnız `*.test.js`).
// Saf çekirdek `yardimci/yerlesim-cakisma.js`tedir ve `npm test` ile ölçülür; bu dosya yalnız
// sunucu + tarayıcı sürücüsüdür (ölçüm kuralı burada ikinci kez yazılmaz).
//
// İKİ YOL (ADR-023):
//   (a) `--plan <dosya>` → sunucu/tarayıcı AÇMAZ, yalnız plan.json yazar. **Ofisin yolu budur**:
//       ölçümü ofisin penceresiz tarayıcısı `ekran_gerek` turuyla çeker.
//   (b) Sunucu + başsız Edge/CDP kipi (aşağıdaki öbür seçenekler) → **Masa yolu**: ADR-004'ün
//       yerel statik sunucusu (8777, yalnız 127.0.0.1'e bağlı) ve boş profilli tarayıcı açılır.
//       Ofisteki ajan bunu koşmaz, port bağlamaz, izin de istemez.
// Seçeneklerin tek kaynağı aşağıdaki `KULLANIM` metnidir (hatalı argümanda da o basılır).
//
// Sahip'in telefonu/tarayıcısı hiç kullanılmaz: profil geçici klasörde açılır, iş bitince silinir;
// yalnız bu betiğin başlattığı süreçler (PID'leri kaydedilmiş) kapatılır.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  TABLO_BASLIKLARI, markdownTablosu, olcumSatiri, ozetSatirlari, halkaCiftleriniAyir,
} from './yardimci/yerlesim-cakisma.js';
import {
  BOYUTLAR, sayfaBetigi, planNesnesi,
} from './yardimci/yerlesim-olcum-betigi.js';
import { DURUMLAR } from './yardimci/yerlesim-olcum-sayfa.js';

const PROJE_KOK = join(import.meta.dirname, '..');
const DOCS_KOK = join(PROJE_KOK, 'docs');

const TARAYICI_ADAYLARI = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

// Boş profille açılan tarayıcı Sahip'in hesabıyla oturum açmasın (ofis kuralı, 2026-11-20).
const TARAYICI_BAYRAKLARI = [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--hide-scrollbars',
];

export const KULLANIM = [
  'kullanım: node testler/yerlesim-cakisma.olcum.js [seçenekler]',
  '  --plan <dosya>         plan.json yazar, SUNUCU/TARAYICI AÇMAZ (ofis yolu — ADR-023)',
  '  --cikti <klasor>       ölçüm çıktısının klasörü (varsayılan olcum-cikti)',
  '  --port <sayi>          yerel statik sunucu portu (varsayılan 8777)',
  '  --cdp-port <sayi>      tarayıcının hata ayıklama portu (varsayılan 9333)',
  '  --tarayici <yol>       msedge.exe / chrome.exe yolu (yoksa bilinen yollarda aranır)',
  '  --boyut GENISLIKxYUKSEKLIK   yalnız bu boyut (birden çok kez verilebilir)',
  '  --durum el|rakip       yalnız bu durum (birden çok kez verilebilir)',
  '  --tohum <sayi>         dağıtım tohumu (varsayılan 20261122)',
  '  --sunucu-yok           sunucuyu başlatma (zaten koşuyorsa)',
  '  --arama                ölçek araması: --istaka-olcek kademe kademe denenir, ölçülen',
  '                         bütçe terimleri + deneme tablosu ekrana yazılır (ADR-022/5,',
  '                         tasokey#68); boyut listesi iki kipte de aynıdır (tasokey#71)',
].join('\n');

/**
 * Sayısal argüman: değersiz ya da sayı olmayan girdi SESSİZCE geçmez.
 * (`Number(undefined)` = NaN, `Number('abc')` = NaN; ikisi de aşağıda port/tohum olarak kullanılıp
 * ölçümü anlaşılmaz bir yerde düşürüyordu — Denetçi bulgusu, tasokey#67.)
 */
function sayiOku(bayrak, deger, { enAz = 1, enCok = Number.MAX_SAFE_INTEGER } = {}) {
  if (deger === undefined) throw new Error(`${bayrak} bir değer bekler`);
  if (!/^\d+$/.test(deger)) throw new Error(`${bayrak} tam sayı bekler: ${deger}`);
  const sayi = Number(deger);
  if (sayi < enAz || sayi > enCok) throw new Error(`${bayrak} ${enAz}…${enCok} aralığında olmalı: ${deger}`);
  return sayi;
}

/** Değer bekleyen metin argümanı (boş geçilirse sonraki bayrak değer sanılmasın). */
function metinOku(bayrak, deger) {
  if (deger === undefined || deger.startsWith('--')) throw new Error(`${bayrak} bir değer bekler`);
  return deger;
}

export function seceneklerioku(argv) {
  const secenekler = {
    port: 8777,
    cdpPort: 9333,
    cikti: 'olcum-cikti',
    tarayici: null,
    boyutlar: [],
    durumlar: [],
    tohum: 20261122,
    sunucuYok: false,
    plan: null,
    arama: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const bayrak = argv[i];
    const deger = argv[i + 1];
    switch (bayrak) {
      case '--port': secenekler.port = sayiOku(bayrak, deger, { enAz: 1, enCok: 65535 }); i += 1; break;
      case '--cdp-port': secenekler.cdpPort = sayiOku(bayrak, deger, { enAz: 1, enCok: 65535 }); i += 1; break;
      case '--cikti': secenekler.cikti = metinOku(bayrak, deger); i += 1; break;
      case '--tarayici': secenekler.tarayici = metinOku(bayrak, deger); i += 1; break;
      case '--tohum': secenekler.tohum = sayiOku(bayrak, deger, { enAz: 0 }); i += 1; break;
      case '--plan': secenekler.plan = metinOku(bayrak, deger); i += 1; break;
      case '--sunucu-yok': secenekler.sunucuYok = true; break;
      case '--arama': secenekler.arama = true; break;
      case '--boyut': {
        const eslesme = /^(\d+)x(\d+)$/.exec(deger ?? '');
        if (!eslesme) throw new Error(`--boyut GENISLIKxYUKSEKLIK bekler: ${deger}`);
        const tanim = BOYUTLAR.find((b) => b[0] === Number(eslesme[1]) && b[1] === Number(eslesme[2]));
        secenekler.boyutlar.push(tanim ?? [Number(eslesme[1]), Number(eslesme[2]), `${eslesme[1]}x${eslesme[2]}`]);
        i += 1;
        break;
      }
      case '--durum':
        if (!DURUMLAR.includes(deger)) throw new Error(`--durum ${DURUMLAR.join('|')} bekler: ${deger}`);
        secenekler.durumlar.push(deger);
        i += 1;
        break;
      default: throw new Error(`bilinmeyen seçenek: ${bayrak}`);
    }
  }
  // tasokey#71: 900x600 artık BOYUTLAR listesindedir (tasokey#70 planı §5) — ölçek araması için
  // ayrı bir ek boyut yok, iki kip de aynı altı boyutu ölçer.
  if (secenekler.boyutlar.length === 0) {
    secenekler.boyutlar = BOYUTLAR.map((b) => [...b]);
  }
  if (secenekler.durumlar.length === 0) secenekler.durumlar = [...DURUMLAR];
  return secenekler;
}

const uyu = (ms) => new Promise((coz) => { setTimeout(coz, ms); });

async function sinirli(soz, ms, ad) {
  let zamanlayici;
  try {
    return await Promise.race([
      soz,
      new Promise((_, at) => { zamanlayici = setTimeout(() => at(new Error(`zaman aşımı (${ms} ms): ${ad}`)), ms); }),
    ]);
  } finally {
    clearTimeout(zamanlayici);
  }
}

/** Adres yanıt verene kadar bekler (sunucu/tarayıcı hazır mı). */
async function hazirOlsun(adres, sureMs, ad) {
  const bitis = Date.now() + sureMs;
  let sonHata = null;
  while (Date.now() < bitis) {
    try {
      const yanit = await fetch(adres);
      if (yanit.ok) return await yanit.text();
    } catch (hata) {
      sonHata = hata;
    }
    await uyu(200);
  }
  throw new Error(`${ad} hazır olmadı (${adres}): ${sonHata?.message ?? 'yanıt yok'}`);
}

/**
 * Yerel statik sunucu: ADR-004'ün komutu (`python -m http.server`), docs kökünde.
 * `--bind 127.0.0.1` ZORUNLUDUR: varsayılan 0.0.0.0 sunucuyu yerel ağa açar, ölçüm için
 * gerekli olan tek dinleyici ise kendi makinesidir (ofis kuralı: dışarıya açık uç yok).
 */
async function sunucuBaslat(port) {
  const sunucuParametreleri = ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', DOCS_KOK];
  const adaylar = [['python', sunucuParametreleri], ['py', ['-3', ...sunucuParametreleri]]];
  let sonHata = null;
  for (const [komut, parametreler] of adaylar) {
    const surec = spawn(komut, parametreler, { stdio: 'ignore', windowsHide: true });
    surec.on('error', (hata) => { sonHata = hata; });
    try {
      await hazirOlsun(`http://127.0.0.1:${port}/index.html`, 8000, `sunucu (${komut})`);
      return surec;
    } catch (hata) {
      sonHata = hata;
      if (surec.pid && surec.exitCode === null) surec.kill();
    }
  }
  throw new Error(`yerel sunucu başlatılamadı (python 3 gerekir): ${sonHata?.message ?? ''}`);
}

async function tarayiciBaslat({ tarayici, cdpPort }) {
  const yol = tarayici ?? TARAYICI_ADAYLARI.find((aday) => existsSync(aday));
  if (!yol) {
    throw new Error(`tarayıcı bulunamadı (arananlar: ${TARAYICI_ADAYLARI.join(', ')}) — --tarayici <yol> ver`);
  }
  const profil = mkdtempSync(join(tmpdir(), 'tasokey-olcum-profil-'));
  const surec = spawn(yol, [
    ...TARAYICI_BAYRAKLARI,
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profil}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let baslatmaHatasi = null;
  surec.on('error', (hata) => { baslatmaHatasi = hata; });
  try {
    const surum = await hazirOlsun(`http://127.0.0.1:${cdpPort}/json/version`, 20000, 'tarayıcı (CDP)');
    return { surec, profil, yol, surum: JSON.parse(surum) };
  } catch (hata) {
    if (surec.pid && surec.exitCode === null) surec.kill();
    rmSync(profil, { recursive: true, force: true });
    throw new Error(`tarayıcı başlatılamadı (${yol}): ${baslatmaHatasi?.message ?? hata.message}`);
  }
}

/** En küçük CDP istemcisi: Node 22'nin yerleşik WebSocket'i (ek paket yok). */
class Cdp {
  #ws;
  #sira = 0;
  #bekleyenler = new Map();
  #olayDinleyicileri = [];

  constructor(ws) {
    this.#ws = ws;
    ws.onmessage = (olay) => {
      const ileti = JSON.parse(typeof olay.data === 'string' ? olay.data : String(olay.data));
      if (ileti.id !== undefined) {
        const bekleyen = this.#bekleyenler.get(ileti.id);
        if (!bekleyen) return;
        this.#bekleyenler.delete(ileti.id);
        if (ileti.error) bekleyen.at(new Error(`${ileti.error.message} (${JSON.stringify(ileti.error.data ?? {})})`));
        else bekleyen.coz(ileti.result);
        return;
      }
      for (const dinleyici of [...this.#olayDinleyicileri]) dinleyici(ileti);
    };
  }

  static async bagla(adres) {
    if (typeof WebSocket === 'undefined') {
      throw new Error('bu Node sürümünde yerleşik WebSocket yok — Node 22+ gerekir');
    }
    const ws = new WebSocket(adres);
    await new Promise((coz, at) => {
      ws.onopen = coz;
      ws.onerror = () => at(new Error(`CDP bağlantısı kurulamadı: ${adres}`));
    });
    return new Cdp(ws);
  }

  gonder(yontem, parametreler = {}, sessionId) {
    this.#sira += 1;
    const id = this.#sira;
    const ileti = { id, method: yontem, params: parametreler };
    if (sessionId) ileti.sessionId = sessionId;
    return new Promise((coz, at) => {
      this.#bekleyenler.set(id, { coz, at });
      this.#ws.send(JSON.stringify(ileti));
    });
  }

  /** Olay dinleyicisi; `kaldir()` döndürür. */
  dinle(islev) {
    this.#olayDinleyicileri.push(islev);
    return () => {
      this.#olayDinleyicileri = this.#olayDinleyicileri.filter((d) => d !== islev);
    };
  }

  /** Olay sözü: navigasyondan ÖNCE kurulur, sonra beklenir (olay kaçmasın). */
  olaySozu(yontem, sessionId) {
    return new Promise((coz) => {
      const kaldir = this.dinle((ileti) => {
        if (ileti.method !== yontem) return;
        if (sessionId && ileti.sessionId !== sessionId) return;
        kaldir();
        coz(ileti.params);
      });
    });
  }

  kapat() {
    try { this.#ws.close(); } catch { /* bağlantı zaten kapandı */ }
  }
}

/**
 * Konsol/sayfa hatalarını toplar. `kaldir()` ÇAĞRILMALIDIR: her ölçüm turu kendi dinleyicisini
 * kurduğu için kaldırılmazsa 10 çekimde 10 dinleyici birikir (Denetçi bulgusu, tasokey#67).
 */
function konsolKaydet(cdp, sessionId) {
  const kayitlar = [];
  const kaldir = cdp.dinle((ileti) => {
    if (ileti.sessionId && ileti.sessionId !== sessionId) return;
    if (ileti.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(ileti.params.type)) {
      kayitlar.push(`konsol.${ileti.params.type}: ${(ileti.params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ')}`);
    }
    if (ileti.method === 'Runtime.exceptionThrown') {
      const ayrinti = ileti.params.exceptionDetails;
      kayitlar.push(`sayfa hatası: ${ayrinti.exception?.description ?? ayrinti.text}`);
    }
  });
  return { kayitlar, kaldir };
}

async function olcumAl({ cdp, sessionId, boyut, durum, adres, tohum, arama = false }) {
  const [genislik, yukseklik, boyutAdi] = boyut;
  await cdp.gonder('Emulation.setDeviceMetricsOverride', {
    width: genislik, height: yukseklik, deviceScaleFactor: 1, mobile: false,
  }, sessionId);
  const yuklendi = cdp.olaySozu('Page.loadEventFired', sessionId);
  await cdp.gonder('Page.navigate', { url: `${adres}/index.html?tohum=${tohum}` }, sessionId);
  await sinirli(yuklendi, 30000, `${boyutAdi} ${durum}: sayfa yüklenmedi`);
  await uyu(1200);

  const betik = sayfaBetigi({ durum, gosterim: 'json', arama });
  const yanit = await sinirli(cdp.gonder('Runtime.evaluate', {
    expression: `(async () => {\n${betik}\n})()`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId), 180000, `${boyutAdi} ${durum}: ölçüm betiği`);
  if (yanit.exceptionDetails) {
    const ayrinti = yanit.exceptionDetails;
    throw new Error(`${boyutAdi} ${durum}: ${ayrinti.exception?.description ?? ayrinti.text}`);
  }
  const olcum = { ...yanit.result.value, boyutAdi };
  const goruntu = await sinirli(
    cdp.gonder('Page.captureScreenshot', { format: 'png' }, sessionId),
    60000,
    `${boyutAdi} ${durum}: ekran görüntüsü`,
  );
  return { olcum, png: Buffer.from(goruntu.data, 'base64') };
}

function raporMetni({ olcumler, tarih, secenekler }) {
  const parcalar = [
    `# tasokey#67 — yerleşim çakışma ölçümü (${tarih})`,
    '',
    `Araç: \`node testler/yerlesim-cakisma.olcum.js\` · sunucu: yerel statik, port ${secenekler.port},`
    + ' yalnız 127.0.0.1 · başsız Edge/CDP (boş geçici profil)'
    + ` · tohum ${secenekler.tohum}`,
    '',
    markdownTablosu(TABLO_BASLIKLARI, olcumler.map((olcum) => olcumSatiri(olcum))),
    '',
    '## Döküm',
    '',
  ];
  for (const olcum of olcumler) {
    const { halka, oge } = halkaCiftleriniAyir(olcum.ihlaller);
    parcalar.push(
      `### ${olcum.gorunum.genislik}x${olcum.gorunum.yukseklik} (${olcum.boyutAdi}) · durum ${olcum.durum}`,
      '',
      '```',
      ...ozetSatirlari(olcum, { enCokCift: 40 }),
      '```',
      '',
      `- öğe-öğe ihlal: ${oge.length} · hedef halkası ihlali: ${halka.length} · kasıtlı çift: ${olcum.kasitli.length}`,
      `- muaf öğeler: ${olcum.muaflar.map((m) => `${m.anahtar} (${m.gerekce})`).join(', ') || 'yok'}`,
      `- en kötü metin: durum satırı "${olcum.zorlanan.durumSatiri}" · ipucu "${olcum.zorlanan.ipucu}"`
      + ` · "Oyunu bitir" düğmesi ${olcum.zorlanan.oyunuBitirZorlandi ? 'zorlanarak görünür yapıldı' : 'kendiliğinden görünür'}`,
      `- hedef payı (--hedef-pay): ${olcum.hedefPay}px · eşik: ${olcum.esik}px`,
      olcum.konsol?.length ? `- konsol: ${olcum.konsol.join(' | ')}` : '- konsol: temiz',
      '',
    );
  }
  return parcalar.join('\n');
}

async function olcumuKos(secenekler) {
  const ciktiKok = resolve(secenekler.cikti);
  mkdirSync(ciktiKok, { recursive: true });
  const adres = `http://127.0.0.1:${secenekler.port}`;

  let sunucu = null;
  let tarayici = null;
  let cdp = null;
  const olcumler = [];
  try {
    if (!secenekler.sunucuYok) {
      sunucu = await sunucuBaslat(secenekler.port);
      console.log(`sunucu açıldı: ${adres} (pid ${sunucu.pid}, kök ${DOCS_KOK})`);
    } else {
      await hazirOlsun(`${adres}/index.html`, 5000, 'sunucu (hazır olduğu varsayıldı)');
    }
    tarayici = await tarayiciBaslat(secenekler);
    console.log(`tarayıcı açıldı: ${tarayici.yol} (pid ${tarayici.surec.pid}, ${tarayici.surum.Browser})`);

    cdp = await Cdp.bagla(tarayici.surum.webSocketDebuggerUrl);
    const { targetId } = await cdp.gonder('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.gonder('Target.attachToTarget', { targetId, flatten: true });
    await cdp.gonder('Page.enable', {}, sessionId);
    await cdp.gonder('Runtime.enable', {}, sessionId);

    for (const boyut of secenekler.boyutlar) {
      for (const durum of secenekler.durumlar) {
        const konsol = konsolKaydet(cdp, sessionId);
        let olcum;
        let png;
        try {
          ({ olcum, png } = await olcumAl({
            cdp, sessionId, boyut, durum, adres, tohum: secenekler.tohum, arama: secenekler.arama,
          }));
        } finally {
          konsol.kaldir();
        }
        olcum.konsol = [...konsol.kayitlar];
        const dosyaAdi = `olcum-${durum}-${olcum.boyutAdi}.png`;
        writeFileSync(join(ciktiKok, dosyaAdi), png);
        olcum.goruntu = dosyaAdi;
        olcumler.push(olcum);
        console.log(ozetSatirlari(olcum).join('\n'));
        console.log(`  → ${dosyaAdi}`);
      }
    }
  } finally {
    cdp?.kapat();
    // Yalnız bu betiğin başlattığı süreçler (PID'leri burada duruyor) kapatılır.
    if (tarayici?.surec.pid && tarayici.surec.exitCode === null) tarayici.surec.kill();
    if (sunucu?.pid && sunucu.exitCode === null) sunucu.kill();
    if (tarayici?.profil) rmSync(tarayici.profil, { recursive: true, force: true });
  }

  const tarih = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const rapor = raporMetni({ olcumler, tarih, secenekler });
  writeFileSync(join(ciktiKok, 'once-tablosu.md'), `${rapor}\n`, 'utf8');
  writeFileSync(join(ciktiKok, 'olcum.json'), `${JSON.stringify({ tarih, secenekler, olcumler }, null, 2)}\n`, 'utf8');
  console.log(`\n${rapor}`);
  console.log(`\nçıktı: ${ciktiKok}`);

  const ihlalToplami = olcumler.reduce((toplam, olcum) => toplam + olcum.ihlaller.length + olcum.tasmalar.length, 0);
  return ihlalToplami;
}

function planiYaz(yol, { arama = false } = {}) {
  const hedef = resolve(yol);
  mkdirSync(dirname(hedef), { recursive: true });
  const plan = planNesnesi({ arama });
  writeFileSync(hedef, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  console.log(`plan yazıldı: ${hedef}`);
  console.log(`boyut ${plan.boyutlar.length} x çekim ${plan.cekimler.length}`
    + ` (${plan.cekimler.map((c) => c.ad).join(', ')}), betik ${plan.cekimler[0].js.length} karakter`);
  console.log('bu kip sunucu ya da tarayıcı AÇMAZ: ofisin penceresiz tarayıcısı çeker.');
}

// Yalnız doğrudan çağrıldığında koşar: `seceneklerioku`/`KULLANIM` öz-testten import edilirken
// sunucu, tarayıcı ya da plan yazımı tetiklenmez.
const dogrudanCagri = process.argv[1] !== undefined
  && resolve(process.argv[1]) === resolve(import.meta.filename);

if (dogrudanCagri) {
  let secenekler;
  try {
    secenekler = seceneklerioku(process.argv.slice(2));
  } catch (hata) {
    console.error(`hata: ${hata.message}\n`);
    console.error(KULLANIM);
    process.exit(2);
  }
  if (secenekler.plan) {
    planiYaz(secenekler.plan, { arama: secenekler.arama });
  } else {
    const ihlal = await olcumuKos(secenekler);
    if (ihlal > 0) {
      console.log(`\n${ihlal} ihlal (çakışan çift + taşma) ölçüldü — "önce" ölçümünde bu beklenebilir.`);
    }
  }
}
