// tasokey#69 (üst iş tasokey#64, plan §7 iş 3) — SÜRÜKLE-BIRAK HEDEF ÖLÇÜM ARACI (sürücü).
// Beş yolu iki boyutta (800x360 ve 1920x1080) ölçer: ıstakaya bırakma (ADR-019), geçersiz
// bırakmada taşın yerine dönmesi (tasokey#62), köşe atma alanı (tasokey#63), desteden/komşu
// köşeden çekme (R-012), bitirme hedefinin destede vurgulanması (R-013).
//
// `*.olcum.js` kalıbı: `npm test` bunu KOŞMAZ. Ölçüm KURALI `yardimci/surukleme-hedefi.js`tedir
// ve `npm test` ile ölçülür; bu dosya yalnız plan yazıcısıdır.
//
// ADR-023: ofis içi arayüz ölçümü YALNIZ plan yolundan alınır — sürücü sunucu açmaz, port
// bağlamaz, tarayıcı başlatmaz ve bunun için izin de istemez. Bu sahnenin Masa yolu (sunucu +
// Edge/CDP tek komutu) YAZILMADI: `yerlesim-cakisma.olcum.js` o kipi taşıyor, ikinci bir kopya
// ölçüm sürücüsünü iki yerde tutardı. Sahnenin Masa'da tek komutla koşması gerekirse o sürücünün
// `--sahne` seçeneği olarak eklenir (ayrı iş).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SAHNELER, YOL_ANAHTARLARI } from './yardimci/surukleme-hedefi.js';
import { BOYUTLAR, planNesnesi } from './yardimci/surukleme-olcum-betigi.js';

export const KULLANIM = [
  'kullanım: node testler/surukleme-hedefi.olcum.js --plan <dosya>',
  '  --plan <dosya>         plan.json yazar, SUNUCU/TARAYICI AÇMAZ (ofis yolu — ADR-023)',
  '  --bekle <saniye>       sayfa yüklendikten sonraki bekleme (varsayılan 1.5)',
  '  --js-bekle <saniye>    betik koştuktan sonraki bekleme (varsayılan 1.5)',
].join('\n');

/** Ondalık saniye argümanı: değersiz ya da sayı olmayan girdi SESSİZCE geçmez (tasokey#67). */
function saniyeOku(bayrak, deger, { enAz = 0, enCok = 60 } = {}) {
  if (deger === undefined) throw new Error(`${bayrak} bir değer bekler`);
  if (!/^\d+(\.\d+)?$/.test(deger)) throw new Error(`${bayrak} sayı bekler: ${deger}`);
  const sayi = Number(deger);
  if (sayi < enAz || sayi > enCok) throw new Error(`${bayrak} ${enAz}…${enCok} aralığında olmalı: ${deger}`);
  return sayi;
}

function metinOku(bayrak, deger) {
  if (deger === undefined || deger.startsWith('--')) throw new Error(`${bayrak} bir değer bekler`);
  return deger;
}

export function seceneklerioku(argv) {
  const secenekler = { plan: null, bekle: 1.5, jsBekle: 1.5 };
  for (let i = 0; i < argv.length; i += 1) {
    const bayrak = argv[i];
    const deger = argv[i + 1];
    switch (bayrak) {
      case '--plan': secenekler.plan = metinOku(bayrak, deger); i += 1; break;
      case '--bekle': secenekler.bekle = saniyeOku(bayrak, deger); i += 1; break;
      case '--js-bekle': secenekler.jsBekle = saniyeOku(bayrak, deger); i += 1; break;
      default: throw new Error(`bilinmeyen seçenek: ${bayrak}`);
    }
  }
  if (!secenekler.plan) throw new Error('--plan zorunludur (ofis yolu dışında kip yok — ADR-023)');
  return secenekler;
}

function planiYaz({ plan, bekle, jsBekle }) {
  const hedef = resolve(plan);
  mkdirSync(dirname(hedef), { recursive: true });
  const nesne = planNesnesi({ bekle, jsBekle });
  writeFileSync(hedef, `${JSON.stringify(nesne, null, 2)}\n`, 'utf8');
  console.log(`plan yazıldı: ${hedef}`);
  console.log(`boyut ${nesne.boyutlar.length} (${BOYUTLAR.map((b) => `${b[0]}x${b[1]}`).join(', ')})`
    + ` x çekim ${nesne.cekimler.length} (${nesne.cekimler.map((c) => c.ad).join(', ')})`);
  console.log(`sahneler: ${SAHNELER.join(', ')} · yollar: ${YOL_ANAHTARLARI.join(', ')}`);
  console.log(`betik: ${nesne.cekimler.map((c) => `${c.ad} ${c.js.length} karakter`).join(' · ')}`);
  console.log('bu kip sunucu ya da tarayıcı AÇMAZ: ofisin penceresiz tarayıcısı çeker.');
}

// Yalnız doğrudan çağrıldığında koşar: `seceneklerioku`/`KULLANIM` öz-testten import edilirken
// plan yazımı tetiklenmez (ADR-023/5).
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
  planiYaz(secenekler);
}
