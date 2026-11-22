import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  EKRAN, OLAY, kabukBaslat, gecis, sonucKucukMu, dokumAcikMi,
} from '../docs/arayuz/kabuk.js';
import { KADEME } from '../docs/bot/bot.js';
import { kuralGovdeleri } from './yardimci/css-olcu.js';

// tasokey#65 (Sahip, 2026-11-22, ekran görüntüsü Screenshot_20261122-031535.png):
//   "Oyun bittiğinde bot2 nin ıstakasındaki taşlar görünemiyor öndeki açık olan pencereyi
//    küçültme seçeneği ekle"
// El sonu penceresi masanın ortasında durur ve üst kenardaki rakibin (Bot 2) ıstakasını örter.
// Çözüm: pencerenin KÜÇÜLTÜLEBİLMESİ — küçükken yalnız geri büyüten düğme kalır, masanın üstü
// (dolayısıyla dört ıstaka da) görünür olur. Bayrak kabuğun alanıdır (ADR-016/1), `ekran.js`
// kendi ikinci bayrağını tutmaz.
//
// Burada ölçülen: (a) kabuk durum makinesinin davranışı, (b) arayüzün bu bayrağı okuduğu ve
// küçük durumun gerçekten masanın üstünü açtığı (kaynak taraması; piksel ölçümü değil).

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const INDEX_HTML = readFileSync(join(DOCS_KOK, 'index.html'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const KUCULT_ANAHTARLARI = ['sonuc.kucult', 'sonuc.buyut'];

function sonuctakiKabuk() {
  return gecis(gecis(kabukBaslat(), OLAY.YENI_OYUN), OLAY.EL_BITTI);
}

function tekKuralGovdesi(secici) {
  const govdeler = kuralGovdeleri(STIL_CSS, secici);
  assert.equal(govdeler.length, 1, `${secici} için ${govdeler.length} kural var (tam olarak 1 bekleniyor)`);
  return govdeler[0];
}

// --- Kabuk durum makinesi ---

test('ASIL KABUL: sonuç penceresi tam boy açılır, düğme küçültür, ikinci tıklama geri büyütür', () => {
  const sonuc = sonuctakiKabuk();
  assert.equal(sonuc.ekran, EKRAN.SONUC, 'ölçüm varsayımı bozuldu: sonuç ekranında değiliz');
  assert.equal(sonucKucukMu(sonuc), false, 'pencere küçültülmüş olarak açıldı');

  const kucuk = gecis(sonuc, OLAY.SONUC_KUCULT_AC_KAPA);
  assert.equal(sonucKucukMu(kucuk), true, 'pencere küçülmedi');
  assert.equal(kucuk.ekran, EKRAN.SONUC, 'küçültme ekranı değiştirdi');

  assert.equal(sonucKucukMu(gecis(kucuk, OLAY.SONUC_KUCULT_AC_KAPA)), false, 'pencere geri büyümedi');
});

test('küçültme döküm bölümünden bağımsızdır: büyütünce açık bölüm açık kalır', () => {
  const dokumAcik = gecis(sonuctakiKabuk(), OLAY.DOKUM_AC_KAPA);
  assert.equal(dokumAcikMi(dokumAcik), true, 'ölçüm varsayımı bozuldu: döküm bölümü açılmadı');

  const kucuk = gecis(dokumAcik, OLAY.SONUC_KUCULT_AC_KAPA);
  assert.equal(dokumAcikMi(kucuk), true, 'küçültmek döküm bayrağını da çevirmiş');
  assert.equal(dokumAcikMi(gecis(kucuk, OLAY.SONUC_KUCULT_AC_KAPA)), true, 'büyütünce döküm bölümü kapandı');
});

test('küçültme yalnız sonuç ekranında anlamlı ve pencere her açılışında tam boy başlar', () => {
  const masa = gecis(kabukBaslat(), OLAY.YENI_OYUN);
  assert.equal(gecis(masa, OLAY.SONUC_KUCULT_AC_KAPA), masa, 'masada sonuç penceresi küçültülebiliyor');
  const baslangic = kabukBaslat();
  assert.equal(gecis(baslangic, OLAY.SONUC_KUCULT_AC_KAPA), baslangic, 'başlangıç ekranında küçültülebiliyor');

  // Yeni el → masa → yeniden el bitti: pencere yine tam boy.
  const kucuk = gecis(sonuctakiKabuk(), OLAY.SONUC_KUCULT_AC_KAPA);
  const yeniEl = gecis(kucuk, OLAY.YENI_EL);
  assert.equal(sonucKucukMu(yeniEl), false, 'yeni elde küçültme bayrağı açık kalmış');
  assert.equal(sonucKucukMu(gecis(yeniEl, OLAY.EL_BITTI)), false, 'pencere ikinci açılışta küçük');
  assert.equal(sonucKucukMu(gecis(kucuk, OLAY.BASLANGICA_DON)), false, 'başlangıca dönüşte bayrak kalmış');

  // Oturum içi durumdur: kayıttan gelmez (bozuk/eski kayıt bayrağı açamaz).
  assert.equal(
    sonucKucukMu(kabukBaslat({ zorluk: KADEME.KOLAY, sonucKucuk: true })), false,
    'küçültme bayrağı kayıttan geldi',
  );
  assert.deepEqual(
    Object.keys(gecis(sonuctakiKabuk(), OLAY.SONUC_KUCULT_AC_KAPA)).sort(),
    Object.keys(kabukBaslat()).sort(),
    'küçültme kabuğa yeni alan ekliyor/çıkarıyor',
  );
});

// --- Arayüz bağlantısı (kaynak taraması) ---

test('ASIL KABUL (arayüz): küçük pencere masanın üstünü açar — saydam zemin, tıklama geçer, tek düğme kalır', () => {
  const panel = tekKuralGovdesi('#sonucPaneli.kucuk');
  assert.match(panel, /background:\s*(transparent|none)/, 'küçükken karartma zemini duruyor — masa yine örtülü');
  assert.match(panel, /pointer-events:\s*none/, 'küçükken tam ekran zemin tıklamayı yutuyor');

  const kutu = tekKuralGovdesi('#sonucPaneli.kucuk #sonucKutusu');
  assert.match(kutu, /pointer-events:\s*auto/, 'küçültülmüş kutunun kendisi tıklanamaz (geri büyütülemez)');

  // Küçükken yalnız geri büyüten düğme görünür: metin, döküm bölümü ve alt düğmeler gizlenir.
  const gizleme = tekKuralGovdesi('#sonucPaneli.kucuk #sonucKutusu > :not(#kucultAcKapaButonu)');
  assert.match(gizleme, /display:\s*none/, 'küçükken pencere içeriği gizlenmiyor — kutu yine büyük');

  // Hiçbir duyarlı kademe küçültme kurallarını geçersiz kılmamalı.
  const ilkMedya = STIL_CSS.indexOf('@media');
  assert.doesNotMatch(
    STIL_CSS.slice(ilkMedya),
    /#sonucPaneli\.kucuk/,
    'bir @media bloğu küçültme kurallarını yeniden tanımlıyor',
  );
});

test('küçültme düğmesi pencerededir ve sabit metin taşımaz (metin dil anahtarından gelir, R-008)', () => {
  const bolum = INDEX_HTML.slice(INDEX_HTML.indexOf('<div id="sonucPaneli"'), INDEX_HTML.indexOf('<!-- Oyunu bitirme'));
  assert.match(bolum, /id="kucultAcKapaButonu"/, 'sonuç penceresinde küçültme düğmesi yok');
  assert.match(bolum, /<button id="kucultAcKapaButonu"[^>]*aria-pressed=/, 'düğme basılı durumunu bildirmiyor');
  const metinler = [...bolum.matchAll(/>([^<>]+)</g)]
    .map(([, metin]) => metin.trim())
    .filter((metin) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(metin));
  assert.deepEqual(metinler, [], `sabit metin: ${metinler.join(' | ')}`);
});

test('küçült/büyüt metinleri iki dilde de var ve birbirinden farklı (R-008)', () => {
  for (const anahtar of KUCULT_ANAHTARLARI) {
    assert.ok(typeof TR[anahtar] === 'string' && TR[anahtar].length > 0, `tr.json ${anahtar} yok`);
    assert.ok(typeof EN[anahtar] === 'string' && EN[anahtar].length > 0, `en.json ${anahtar} yok`);
    assert.notEqual(TR[anahtar], EN[anahtar], `${anahtar} iki dilde aynı metin`);
  }
  assert.notEqual(TR['sonuc.kucult'], TR['sonuc.buyut'], 'küçült ve büyüt aynı metni kullanıyor');
});

test('ekran.js küçültmeyi kabuktan okuyor; kendi bayrağını atamıyor (ADR-016/1)', () => {
  assert.match(EKRAN_JS, /sonucKucukMu\(/, 'pencerenin küçük olup olmadığı kabuğa sorulmuyor');
  assert.ok(EKRAN_JS.includes('OLAY.SONUC_KUCULT_AC_KAPA'), 'ekran.js küçültme olayını hiç göndermiyor');
  assert.ok(
    !/kabuk\.sonucKucuk\s*=[^=]/.test(EKRAN_JS),
    'ekran.js sonucKucuk alanını doğrudan atıyor; geçiş yalnız kabuk.js gecis() ile yapılmalı',
  );
  assert.match(
    EKRAN_JS,
    /eleman\.kucultAcKapaButonu\.addEventListener\('click'/,
    'küçültme düğmesine tıklama bağlanmamış',
  );
  assert.match(EKRAN_JS, /metinAl\(\s*kucuk \? 'sonuc\.buyut' : 'sonuc\.kucult'\s*\)/, 'düğme metni duruma göre değişmiyor');
});
