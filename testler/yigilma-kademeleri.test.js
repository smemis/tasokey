import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#38 — ADR-015: sonuç penceresi her zaman en üstte.
// Belirti (Sahip'in ekran görüntüsü, is/tasokey-35/ekler/image-2.png): "El bitti!" penceresi açıkken
// ortadaki yer destesi taşı pencerenin ÜSTÜNE çiziliyor ve metni örtüyor. Sebep yığılma sırasının
// tek kaynağının olmaması: deste/köşe taşları JS'te sayısal z-index alıyordu (10, 9, …), sürüklenen
// taş stil.css'te çıplak `z-index: 5` idi, kalıcı pencerenin (#sonucPaneli) ise hiç z-index'i yoktu —
// konumlanmış ve pozitif z-index'li taşlar, z-index'i `auto` olan sabit panelin üstünde boyanıyordu.
//
// Bu dosya kademelerin TEK KAYNAKTAN (stil.css :root --kademe-*) geldiğini ve sıralamanın
// masa < seçili/sürüklenen taş < kalıcı pencere olduğunu kaynak taramasıyla ölçer; boyama sırası
// tarayıcıda ekran görüntüsüyle doğrulanır (iş raporu).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const ARAYUZ_KOK = join(DOCS_KOK, 'arayuz');
const EKRAN_JS = readFileSync(join(ARAYUZ_KOK, 'ekran.js'), 'utf8');
// Taramalar yorumsuz metin üzerinde yapılır: açıklama satırlarında geçen bir değişken adı
// "ikinci tanım" sanılmasın (tek kaynak denetimi gerçek bildirimleri saymalı).
const STIL_CSS = readFileSync(join(ARAYUZ_KOK, 'stil.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const KADEME_ADLARI = [
  '--kademe-masa',
  '--kademe-masa-pay',
  '--kademe-tas-secili',
  '--kademe-tas-surukleniyor',
  '--kademe-pencere',
];

/** stil.css'teki kademe tanımlarını ad → [değer, …] olarak toplar (tek kaynak denetimi için hepsi). */
function kademeTanimlari() {
  const tanimlar = new Map();
  for (const ad of KADEME_ADLARI) {
    const bulunan = [...STIL_CSS.matchAll(new RegExp(`${ad}\\s*:\\s*([^;}]+)`, 'g'))].map((e) => e[1].trim());
    tanimlar.set(ad, bulunan);
  }
  return tanimlar;
}

/** Bir CSS seçicisinin gövdesi (ilk eşleşen kural). */
function kuralGovdesi(secici) {
  const kacisli = secici.replace(/[.#*+?^${}()|[\]\\]/g, '\\$&');
  const eslesme = STIL_CSS.match(new RegExp(`(^|\\})\\s*${kacisli}\\s*\\{([^}]*)\\}`, 'm'));
  return eslesme ? eslesme[2] : null;
}

test('kabul-1: beş yığılma kademesi stil.css :root içinde TEK kez, tamsayı olarak tanımlı', () => {
  const tanimlar = kademeTanimlari();
  for (const ad of KADEME_ADLARI) {
    const degerler = tanimlar.get(ad);
    assert.equal(degerler.length, 1, `${ad} ${degerler.length} kez tanımlı (tek kaynak: tam 1 olmalı)`);
    assert.match(degerler[0], /^\d+$/, `${ad} değeri tamsayı değil: "${degerler[0]}"`);
  }
  const kokGovdesi = STIL_CSS.match(/:root\s*\{([\s\S]*?)\n\}/);
  assert.ok(kokGovdesi, 'stil.css içinde :root bloğu yok');
  for (const ad of KADEME_ADLARI) {
    assert.ok(kokGovdesi[1].includes(`${ad}:`), `${ad} ilk :root bloğunda tanımlı değil (tek kaynak orası)`);
  }
});

test('kabul-2: pencere kademesi sürüklenen/seçili taşın, o da masanın üstünde', () => {
  const tanimlar = kademeTanimlari();
  const sayi = (ad) => Number(tanimlar.get(ad)[0]);
  const masaTavani = sayi('--kademe-masa') + sayi('--kademe-masa-pay');

  assert.ok(
    sayi('--kademe-tas-secili') > masaTavani,
    `seçili taş kademesi (${sayi('--kademe-tas-secili')}) masa tavanının (${masaTavani}) üstünde değil`,
  );
  assert.ok(
    sayi('--kademe-tas-surukleniyor') >= sayi('--kademe-tas-secili'),
    'sürüklenen taş seçili taşın altında kalıyor',
  );
  assert.ok(
    sayi('--kademe-pencere') > sayi('--kademe-tas-surukleniyor'),
    `ASIL KABUL: pencere kademesi (${sayi('--kademe-pencere')}) sürüklenen taşınkinden (${sayi('--kademe-tas-surukleniyor')}) büyük değil`,
  );
});

test('kabul-3: stil.css içinde çıplak z-index yok — her değer kademe değişkeninden okunur', () => {
  const ciplaklar = [...STIL_CSS.matchAll(/z-index\s*:\s*([^;}]+)/g)]
    .map((e) => e[1].trim())
    .filter((deger) => !deger.includes('var(--kademe-'));
  assert.deepEqual(ciplaklar, [], `stil.css'te kademe değişkenine bağlanmamış z-index değerleri: ${ciplaklar.join(', ')}`);
});

test('kabul-4: kalıcı pencere (#sonucPaneli) pencere kademesini kullanıyor', () => {
  const govde = kuralGovdesi('#sonucPaneli');
  assert.ok(govde, 'stil.css içinde #sonucPaneli kuralı yok');
  assert.match(
    govde,
    /z-index:\s*var\(--kademe-pencere\)/,
    'ASIL KABUL: sonuç penceresinin z-index\'i yok/kademeye bağlı değil → masadaki taşlar üstünü örtebilir',
  );
});

test('kabul-5: seçili ve sürüklenen taş kendi kademesini kullanıyor', () => {
  const surukleniyor = kuralGovdesi('.tas.surukleniyor');
  const secili = kuralGovdesi('.tas.secili');
  assert.ok(surukleniyor, 'stil.css içinde .tas.surukleniyor kuralı yok');
  assert.ok(secili, 'stil.css içinde .tas.secili kuralı yok');
  assert.match(surukleniyor, /z-index:\s*var\(--kademe-tas-surukleniyor\)/, '.tas.surukleniyor kademeye bağlı değil');
  assert.match(secili, /z-index:\s*var\(--kademe-tas-secili\)/, '.tas.secili kademeye bağlı değil');
});

test('kabul-6: arayüz JS\'i sayısal z-index yazmıyor, yalnız yığın içi sırayı veriyor', () => {
  const jsDosyalari = readdirSync(ARAYUZ_KOK).filter((ad) => ad.endsWith('.js'));
  for (const ad of jsDosyalari) {
    const kaynak = readFileSync(join(ARAYUZ_KOK, ad), 'utf8');
    assert.ok(
      !/zIndex/.test(kaynak),
      `${ad} z-index'i JS'ten yazıyor; kademe tek kaynağı stil.css --kademe-* olmalı (ADR-015)`,
    );
  }
  assert.match(
    EKRAN_JS,
    /setProperty\(\s*'--yigin-sira'/,
    'ekran.js yığın içi sırayı --yigin-sira özel değişkeniyle vermiyor',
  );
});

test('kabul-7: masa yığınlarının sıra payı kademe aralığını taşmıyor', () => {
  const tanimlar = kademeTanimlari();
  const pay = Number(tanimlar.get('--kademe-masa-pay')[0]);
  const kose = Number(EKRAN_JS.match(/const KOSE_GORUNEN_MAKSIMUM = (\d+);/)[1]);
  const deste = Number(EKRAN_JS.match(/const DESTE_GORUNEN_MAKSIMUM = (\d+);/)[1]);
  assert.ok(
    Math.max(kose, deste) <= pay,
    `görünen yığın katmanı (köşe ${kose}, deste ${deste}) masa payından (${pay}) fazla → üst kademeye taşar`,
  );
});
