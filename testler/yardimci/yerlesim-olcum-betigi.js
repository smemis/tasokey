// tasokey#67 (üst iş tasokey#64) — sayfada çalışacak ölçüm betiğini KURAN katman: saf çekirdeğin
// (`yerlesim-cakisma.js`) ve sayfa katmanının (`yerlesim-olcum-sayfa.js`) kaynağını okur,
// `export` sözcüklerini atar ve tek bir "async gövde" metni üretir.
//
// Niçin gömme: ölçüm iki yoldan koşuyor — (1) sürücü `testler/yerlesim-cakisma.olcum.js` CDP
// `Runtime.evaluate` ile, (2) ofisin penceresiz tarayıcısı plan.json'un `js` alanıyla. İkisi de
// AYNI kaynağı çalıştırsın diye betik dosyadan okunur; kural ikinci bir yerde yazılmaz
// (öz-test gömülen kaynağın modülle aynı sonucu verdiğini ölçer).
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DURUMLAR } from './yerlesim-olcum-sayfa.js';

const GEOMETRI_DOSYASI = join(import.meta.dirname, 'yerlesim-cakisma.js');
const SAYFA_DOSYASI = join(import.meta.dirname, 'yerlesim-olcum-sayfa.js');

/**
 * Ölçüm boyutları: `[genislik, yukseklik, ad]`.
 *
 * tasokey#71 (üst iş tasokey#70 planı §5): 900x600 artık ARAMA EK BOYUTU değil ASIL ölçüm
 * boyutudur. İki gerekçe: (1) Sahip onu kanıt boyutu sayıyor (kısa yatay düzen varyantının en
 * geniş kabul boyutu, tasokey#70 isteği), (2) `max-width: 900px` kademesinin tek kabul boyutu
 * odur ve her turda ölçülmesi gerekir. Sıra `sigdirma-butcesi.js` OLCULEN_MASA_KUTUSU ile
 * birebir aynıdır (geniş → dar), böylece iki tablo yan yana okunur.
 */
export const BOYUTLAR = Object.freeze([
  Object.freeze([1920, 1080, 'masaustu']),
  Object.freeze([1280, 800, 'dizustu']),
  Object.freeze([1180, 820, 'tablet']),
  Object.freeze([900, 600, 'kademe-900']),
  Object.freeze([844, 390, 'telefon-yatay']),
  Object.freeze([800, 360, 'telefon-kucuk']),
]);

/** Saf çekirdeğin sayfa katmanına verilen adları (tek liste; öz-test modülle karşılaştırır). */
export const GEOMETRI_ADLARI = Object.freeze([
  'ESIK_PX', 'HALKA_EKI', 'CIFT_ISTISNALARI',
  'kutuAlani', 'kutuBosMu', 'kutuGenislet', 'kesisim', 'ataCocukMu',
  'cakisanCiftler', 'ciftleriAyir', 'muafListesi', 'halkaCiftleriniAyir', 'tasmaIhlalleri',
  'ciftFarki',
  'olcuMetni', 'ozetSatirlari', 'aramaSatirlari', 'yaziKatmaniBicimi', 'markdownTablosu',
  'olcumSatiri',
  'TABLO_BASLIKLARI',
]);

/**
 * Ekran görüntüsü yolunda yazı katmanına yazılan en çok ihlal satırı. "Önce" ölçümünde en kötü
 * boyutta 14 ihlal çıktı; liste KIRPILMASIN diye bunun üstünde tutulur (katman satır sayısına
 * göre kendini küçültür, `yaziKatmaniBicimi`).
 */
export const EKRAN_EN_COK_CIFT = 24;

/** ES modül kaynağını tarayıcıya gömülebilir düz koda çevirir (`export` atılır, `import` yasak). */
export function gomulebilirKaynak(kaynak) {
  if (/^\s*import\s/m.test(kaynak)) {
    throw new Error('gömülecek kaynakta import var: gömülen kod modül değildir');
  }
  const gomulu = kaynak.replace(/^export\s+(?=(const|let|function|async function|class)\b)/gm, '');
  if (/^\s*export\b/m.test(gomulu)) throw new Error('gömülen kaynakta artık export var');
  return gomulu;
}

/** İki kaynağı okur ve sayfada çalışacak async gövdeyi döndürür. */
export function sayfaBetigi({
  durum = 'el', gosterim = 'json', esik = null, enCokCift = null, arama = false,
} = {}) {
  if (!DURUMLAR.includes(durum)) throw new Error(`sayfaBetigi: bilinmeyen durum ${durum}`);
  const geometri = gomulebilirKaynak(readFileSync(GEOMETRI_DOSYASI, 'utf8'));
  const sayfa = gomulebilirKaynak(readFileSync(SAYFA_DOSYASI, 'utf8'));
  return [
    '// gömülen saf çekirdek: testler/yardimci/yerlesim-cakisma.js (tasokey#67)',
    geometri,
    '// gömülen sayfa katmanı: testler/yardimci/yerlesim-olcum-sayfa.js (tasokey#67)',
    sayfa,
    'const OLCUM = await olcumYap({',
    `  durum: ${JSON.stringify(durum)},`,
    `  gosterim: ${JSON.stringify(gosterim)},`,
    `  esik: ${esik === null ? 'undefined' : Number(esik)},`,
    `  enCokCift: ${enCokCift === null ? 'undefined' : Number(enCokCift)},`,
    `  arama: ${arama === true},`,
    `  geometri: { ${GEOMETRI_ADLARI.join(', ')} },`,
    '});',
    'return OLCUM;',
  ].join('\n');
}

/**
 * Ofisin ekran görüntüsü yolu için plan nesnesi (iş klasörüne `plan.json` olarak yazılır):
 * altı boyut × iki durum, ölçüm özeti sayfanın üstüne yazı katmanı olarak basılır.
 * Tohum verilmez (`index.html` düz açılır): çekirdeğin sürücüsü sayfa adını yol olarak
 * kullanıyor, sorgu dizesi eklemek riskli — el sürerken durumu tohuma bağlı değildir.
 */
export function planNesnesi({ bekle = 1.5, jsBekle = 1.2, arama = false } = {}) {
  return {
    boyutlar: BOYUTLAR.map((boyut) => [...boyut]),
    cekimler: DURUMLAR.map((durum) => ({
      ad: `olcum-${durum}`,
      sayfa: 'index.html',
      bekle,
      js: sayfaBetigi({ durum, gosterim: 'ekran', enCokCift: EKRAN_EN_COK_CIFT, arama }),
      js_bekle: jsBekle,
    })),
  };
}
