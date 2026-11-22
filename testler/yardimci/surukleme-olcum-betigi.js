// tasokey#69 (üst iş tasokey#64, plan §7 iş 3) — sürükle-bırak ölçüm betiğini KURAN katman:
// saf çekirdeğin (`surukleme-hedefi.js`) ve sayfa katmanının (`surukleme-olcum-sayfa.js`)
// kaynağını okur, `export` sözcüklerini atar ve tek bir "async gövde" metni üretir.
// Gömme kuralı tasokey#67'den gelir ve ikinci kez yazılmaz: `gomulebilirKaynak` oradan alınır.
//
// Ofis yolu (ADR-023/1): plan.json'un `js` alanı bu betiktir; çekimi çekirdeğin penceresiz
// tarayıcısı yapar, ajan sunucu/tarayıcı açmaz.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { gomulebilirKaynak } from './yerlesim-olcum-betigi.js';
import { SAHNELER } from './surukleme-hedefi.js';

const CEKIRDEK_DOSYASI = join(import.meta.dirname, 'surukleme-hedefi.js');
const SAYFA_DOSYASI = join(import.meta.dirname, 'surukleme-olcum-sayfa.js');

/**
 * İşin metnindeki iki boyut: en küçük kabul boyutu ve en büyük (ADR-022 ölçeğinin 1 olduğu ve
 * 1,85 olduğu iki uç — hedeflerin "yeni ölçekte" çalıştığı ancak ikisinde birlikte ölçülür).
 */
export const BOYUTLAR = Object.freeze([
  Object.freeze([800, 360, 'telefon-kucuk']),
  Object.freeze([1920, 1080, 'masaustu']),
]);

/** Saf çekirdeğin sayfa katmanına verilen adları (tek liste; öz-test modülle karşılaştırır). */
export const CEKIRDEK_ADLARI = Object.freeze([
  'ESIK_PX', 'SAHNELER', 'SAHNE_YOLLARI', 'YOLLAR', 'YOL_ANAHTARLARI',
  'olcuMetni', 'coklukAyni', 'dizilimAyni', 'isabetNoktalari', 'izgaraNoktalari', 'kutuAlani',
  'yolTanimi', 'yolKarari', 'sahneKararlari', 'kararOzeti',
  'ozetSatirlari', 'bolgeSatirlari', 'yaziKatmaniBicimi', 'kararSatiri', 'TABLO_BASLIKLARI',
]);

/** İki kaynağı okur ve sayfada çalışacak async gövdeyi döndürür. */
export function sayfaBetigi({ sahne = 'hedef', gosterim = 'json' } = {}) {
  if (!SAHNELER.includes(sahne)) throw new Error(`sayfaBetigi: bilinmeyen sahne ${sahne}`);
  const cekirdek = gomulebilirKaynak(readFileSync(CEKIRDEK_DOSYASI, 'utf8'));
  const sayfa = gomulebilirKaynak(readFileSync(SAYFA_DOSYASI, 'utf8'));
  return [
    '// gömülen saf çekirdek: testler/yardimci/surukleme-hedefi.js (tasokey#69)',
    cekirdek,
    '// gömülen sayfa katmanı: testler/yardimci/surukleme-olcum-sayfa.js (tasokey#69)',
    sayfa,
    'const OLCUM = await olcumYap({',
    `  sahne: ${JSON.stringify(sahne)},`,
    `  gosterim: ${JSON.stringify(gosterim)},`,
    `  surukleme: { ${CEKIRDEK_ADLARI.join(', ')} },`,
    '});',
    'return OLCUM;',
  ].join('\n');
}

/**
 * Ofisin ekran görüntüsü yolu için plan nesnesi (iş klasörüne `plan.json` olarak yazılır):
 * iki boyut × iki sahne. Ölçüm özeti sayfanın üstüne yazı katmanı olarak basılır, isabet
 * noktaları sayfaya işaretlenir (işin kabulü: "isabet noktaları ekran görüntüsüyle kanıtlanır").
 * `bitirme` sahnesi birkaç el oynadığı için daha uzun bekler.
 */
export function planNesnesi({ bekle = 1.5, jsBekle = 1.5, bitirmeJsBekle = 3 } = {}) {
  return {
    boyutlar: BOYUTLAR.map((boyut) => [...boyut]),
    cekimler: SAHNELER.map((sahne) => ({
      ad: `surukle-${sahne}`,
      sayfa: 'index.html',
      bekle,
      js: sayfaBetigi({ sahne, gosterim: 'ekran' }),
      js_bekle: sahne === 'bitirme' ? bitirmeJsBekle : jsBekle,
    })),
  };
}
