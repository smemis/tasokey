import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#31 — R-014: telefon dikeyde oyun alanı yerine dil anahtarlı "telefonu yan çevir" uyarısı;
// telefon yatay/tablet kademelerinde dört kenar düzeni sığdırılır. Yön tespiti CSS ortam sorgusuyla
// yapılır (JS'te sabit karar yok) — kaynak taraması ile ölçülür (tahminle değil).
// Ek bilgi (Sahip, 2026-11-20): rakip ıstakalarında taş hiç görünmez, yalnız ince ahşap sırt.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

test('kabul-a-1: index.html içinde #telefonUyarisi, #masa ile kardeş (oyun alanının yerini alan ayrı eleman)', () => {
  assert.match(INDEX_HTML, /<div id="telefonUyarisi"/, 'index.html içinde #telefonUyarisi yok');
  const masaKapanisindanSonra = INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="telefonUyarisi"'));
  assert.ok(masaKapanisindanSonra.length > 0);
  assert.ok(
    INDEX_HTML.indexOf('<div id="telefonUyarisi"') > INDEX_HTML.indexOf('id="masa"'),
    '#telefonUyarisi #masa\'dan önce gelmemeli (oyun alanının dışında, onun yerine geçen ayrı eleman)',
  );
});

test('kabul-a-2: dil anahtarlı uyarı metni için ayrı bir eleman var (telefonUyarisiMetni)', () => {
  assert.match(INDEX_HTML, /id="telefonUyarisiMetni"/, 'index.html içinde telefonUyarisiMetni yok');
});

test('kabul-b-1: yön tespiti CSS ortam sorgusuyla yapılıyor — JS matchMedia çağırmıyor', () => {
  assert.ok(!/matchMedia\s*\(/.test(EKRAN_JS), 'ekran.js matchMedia ile yön tespiti yapıyor; bu CSS\'te kalmalı (R-014)');
  assert.match(STIL_CSS, /@media\s*\(orientation:\s*portrait\)/, 'stil.css içinde orientation: portrait sorgusu yok');
});

test('kabul-b-2: dikey telefon sorgusunda oyun alanı gizlenir, uyarı görünür olur', () => {
  const blokEslesme = STIL_CSS.match(/@media\s*\(orientation:\s*portrait\)[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(blokEslesme, 'stil.css içinde portrait media bloğu bulunamadı');
  const blok = blokEslesme[1];
  assert.match(blok, /#masa\s*\{[^}]*display:\s*none/, 'portrait bloğunda #masa gizlenmiyor');
  assert.match(blok, /#telefonUyarisi\s*\{[^}]*display:\s*flex/, 'portrait bloğunda #telefonUyarisi gösterilmiyor');
});

test('kabul-b-3: dikey telefon sorgusu yalnız dar genişliğe uygulanır (tablet dikeyi etkilemez)', () => {
  const satir = STIL_CSS.match(/@media\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*(\d+)px\)/);
  assert.ok(satir, 'portrait sorgusunda max-width sınırı yok (tablet dikeyi de gizlerdi)');
  const genislikSiniri = Number(satir[1]);
  assert.ok(genislikSiniri < 820, 'portrait uyarı sınırı tablet dikey genişliğini (820px) de kapsıyor');
});

test('kabul-c: dil dosyalarında telefonuCevir anahtarı TR/EN için farklı ve dolu metinlerle tanımlı', () => {
  assert.equal(typeof TR.telefonuCevir, 'string');
  assert.equal(typeof EN.telefonuCevir, 'string');
  assert.ok(TR.telefonuCevir.trim().length > 0);
  assert.ok(EN.telefonuCevir.trim().length > 0);
  assert.notEqual(TR.telefonuCevir, EN.telefonuCevir);
});

test('kabul-c-2: ekran.js uyarı metnini dil anahtarından (metinAl) basıyor, sabit metin yazmıyor', () => {
  assert.match(
    EKRAN_JS,
    /telefonUyarisiMetni\.textContent\s*=\s*metinAl\(['"]telefonuCevir['"]\)/,
    'ekran.js telefonUyarisiMetni\'ni metinAl(\'telefonuCevir\') ile doldurmuyor',
  );
});

test('kabul-d: telefon yatay/dar kısa yükseklik için ayrı bir sığdırma kademesi var (genişlik kademesinden bağımsız)', () => {
  assert.match(
    STIL_CSS,
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*\d+px\)/,
    'stil.css içinde yatay+kısa-yükseklik için sığdırma kademesi yok',
  );
});

test('rakip ıstakasında taş çizilmiyor: ekran.js artık kenar rafına kapalı taş eklemiyor', () => {
  assert.ok(
    !/rafDiv\.appendChild\(tersTasElemaniOlustur/.test(EKRAN_JS),
    'ekran.js hâlâ rakip ıstakasına kapalı taş ekliyor (Sahip ek bilgisi: rakip taşları hiç görünmemeli)',
  );
});

test('rakip ıstakası ince ahşap sırt: kalınlık uzunluktan belirgin biçimde ince (oran >= 6)', () => {
  const uzunlukEslesme = STIL_CSS.match(/--rakip-raf-uzunluk:\s*(\d+)px/);
  const kalinlikEslesme = STIL_CSS.match(/--rakip-raf-kalinlik:\s*(\d+)px/);
  assert.ok(uzunlukEslesme && kalinlikEslesme, 'stil.css içinde --rakip-raf-uzunluk/--rakip-raf-kalinlik tanımlı değil');
  const oran = Number(uzunlukEslesme[1]) / Number(kalinlikEslesme[1]);
  assert.ok(oran >= 6, `rakip ıstakası yeterince ince değil (uzunluk/kalınlık oranı ${oran}, beklenen >= 6)`);
});

test('oyuncunun kendi ıstakası iki kademeli kalır (RAF_SATIR_SAYISI değişmedi)', () => {
  assert.match(EKRAN_JS, /const RAF_SATIR_SAYISI = 2;/, 'ekran.js RAF_SATIR_SAYISI artık 2 değil');
});
