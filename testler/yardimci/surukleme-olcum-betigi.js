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
 * Ölçüm boyutları: `[genislik, yukseklik, ad]`, geniş → dar (öbür ölçüm tablolarıyla aynı sıra:
 * `yardimci/yerlesim-olcum-betigi.js` BOYUTLAR ve `yardimci/sigdirma-butcesi.js`
 * OLCULEN_MASA_KUTUSU — üç tablo yan yana okunur).
 *
 * tasokey#69'da İKİ boyut vardı (ADR-022 ölçeğinin 1 ve 1,85 olduğu iki uç). tasokey#74 (üst iş
 * tasokey#70, plan §6.4) **900x600**'ü ekler: kısa yatay düzen varyantının (ADR-024) en GENİŞ
 * kabul boyutudur, bağlayıcı ekseni öbür ikisinden farklıdır (orada yatay bütçe bağlar — ADR-022
 * madde 9) ve varyantta deste/gösterge bandın ucuna geçtiği için hedeflerin orada da çalıştığı
 * ölçülmek zorundadır. 1920x1080 varyantın ETKİN OLMADIĞI kademedir: gerilemesizlik kanıtı.
 */
export const BOYUTLAR = Object.freeze([
  Object.freeze([1920, 1080, 'masaustu']),
  Object.freeze([900, 600, 'kademe-900']),
  Object.freeze([800, 360, 'telefon-kucuk']),
]);

/** Saf çekirdeğin sayfa katmanına verilen adları (tek liste; öz-test modülle karşılaştırır). */
export const CEKIRDEK_ADLARI = Object.freeze([
  'ESIK_PX', 'EN_AZ_BOLGE_ORANI', 'SAHNELER', 'SAHNE_YOLLARI', 'YOLLAR', 'YOL_ANAHTARLARI',
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
 * üç boyut × iki sahne. Ölçüm özeti sayfanın üstüne yazı katmanı olarak basılır, isabet
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
