import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BirimHatasi, calcIfadeleri, degiskenleriTopla, ifadeHesapla, varCoz, yorumlariAt,
} from './yardimci/css-olcu.js';

// tasokey#33 (sınıf K) — Sahip'in 4 maddelik masa düzeni düzeltmesi:
// 1) rakip ıstakaları gri kutu yerine gerçek kenar boyu çubuk, ad çubuğun üstünde
// 2) deste tek taş yerine üst üste kaydırılmış katmanlar
// 3) masa zemin dokusu + ahşap çerçeve gerçekten uygulanır
// 4) köşe yığını boşken "0" yerine boş yuva görünür
// Kaynak taraması (bu projenin arayuz testleri deseni, bkz. gorsel-baglanti.test.js,
// duyarlilik-telefon.test.js) — DOM yürütmesi yok, dosya içeriği ölçülür.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const MASA_ZEMIN_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'masa-zemin.svg'), 'utf8');
const MASA_CERCEVE_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'masa-cerceve.svg'), 'utf8');
const ISTAKA_DIKEY_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'istaka-dikey.svg'), 'utf8');
const ISTAKA_YATAY_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'istaka-yatay.svg'), 'utf8');
const ISTAKA_SVG = readFileSync(join(DOCS_KOK, 'gorsel', 'istaka.svg'), 'utf8');

// Birim farkındalı calc() çözümleyicisi `testler/yardimci/css-olcu.js`e taşındı (tasokey#39):
// hedef alanı testi (ADR-014) aynı çözümleyiciyi kademe kademe kullanıyor, aynı iş iki yerde
// yazılmasın. Buradaki testlerin anlamı değişmedi.

const YORUMSUZ_STIL = yorumlariAt(STIL_CSS);

/** Dosyadaki bütün özel değişken bildirimleri: ad → [değer, …] (kademeler dahil). */
function degiskenSozlugu() {
  const sozluk = degiskenleriTopla(YORUMSUZ_STIL);
  // --raf-sutun-sayisi CSS'te değil, ekran.js'te tanımlanır (tek kaynak, baslat()).
  const sutun = EKRAN_JS.match(/const RAF_SUTUN_SAYISI = (\d+);/);
  if (sutun) sozluk.set('--raf-sutun-sayisi', [sutun[1]]);
  return sozluk;
}

function onalticiRenk(metin) {
  const e = /#([0-9a-f]{6})/i.exec(metin);
  if (!e) return null;
  return [0, 2, 4].map((k) => Number.parseInt(e[1].slice(k, k + 2), 16));
}

test('madde-1-a: .kenar artık gri kutu (beyaz saydam arka plan) taşımıyor', () => {
  assert.ok(
    !/\.kenar\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/.test(STIL_CSS),
    'stil.css .kenar hâlâ gri/beyaz saydam arka plan tanımlıyor',
  );
});

test('madde-1-b: üst rakip çubuğu genişliği Sahip\'in kendi ıstaka formülüyle (tek kaynak) hesaplanıyor', () => {
  const formulEslesme = STIL_CSS.match(/--rakip-ust-genislik:\s*calc\(([\s\S]*?)\);/);
  assert.ok(formulEslesme, '--rakip-ust-genislik calc() ile tanımlı değil');
  assert.match(formulEslesme[1], /--raf-sutun-sayisi/, 'formül --raf-sutun-sayisi kullanmıyor');
  assert.match(formulEslesme[1], /--tas-genislik/, 'formül --tas-genislik kullanmıyor');
  assert.match(
    STIL_CSS,
    /\.kenar-raf-yatay\s*\{[^}]*width:\s*var\(--rakip-ust-genislik\)/,
    '.kenar-raf-yatay genişliği var(--rakip-ust-genislik) kullanmıyor',
  );
});

test('madde-1-c: sol/sağ rakip adı çubuğun üstünde dikey yazı olarak duruyor', () => {
  assert.match(
    STIL_CSS,
    /\.kenar-sol \.kenar-ad,\s*\n?\s*\.kenar-sag \.kenar-ad\s*\{[^}]*writing-mode:\s*vertical-rl/,
    'sol/sağ .kenar-ad dikey yazı (writing-mode: vertical-rl) değil',
  );
  assert.match(
    STIL_CSS,
    /\.kenar-ad\s*\{[^}]*position:\s*absolute/,
    '.kenar-ad mutlak konumlu değil (ad çubuğun üstüne bindirilmiyor)',
  );
});

test('madde-1-d: rakip taş hâlâ çizilmiyor (Sahip ek bilgisi korunuyor)', () => {
  assert.ok(
    !/rafDiv\.appendChild\(tersTasElemaniOlustur/.test(EKRAN_JS),
    'ekran.js hâlâ rakip ıstakasına kapalı taş ekliyor olmamalı',
  );
});

// 1. turun ekran görüntüsünde ölçüldü (is/tasokey-33/ekran, 1920x1080): sarı odak çerçevesi
// (.kenar.aktif .kenar-raf-dikey) 345 px uzundu, yani DOM kutusu gerçekten uzuyordu; ama boyanan
// ahşap yalnız ~26x78 px (viewBox 160x480 = 1:3) kalıyordu. Sebep: SVG'nin varsayılan
// preserveAspectRatio="xMidYMid meet" değeri, background-size: 100% 100% ile kutu gerilse bile
// resmi kendi oranında ortalıyor. Çubuğun kenar boyunca gerçekten uzaması için SVG'nin oran
// koruması kapatılmalı.
test('madde-1-e: rakip ıstaka SVG\'leri oran korumasını kapatır (kutu gerilince ahşap da gerilir)', () => {
  assert.match(
    ISTAKA_DIKEY_SVG,
    /preserveAspectRatio="none"/,
    'istaka-dikey.svg preserveAspectRatio="none" taşımıyor — çubuk kutu kadar uzamaz, ortada kısa kalır',
  );
  assert.match(
    ISTAKA_YATAY_SVG,
    /preserveAspectRatio="none"/,
    'istaka-yatay.svg preserveAspectRatio="none" taşımıyor — çubuk kendi ıstaka genişliğine uzamaz',
  );
});

// Ölçüm (1. tur, 1920x1080): çubuk 345 px / masa 1008 px = %34, "masa yüksekliğinin yaklaşık
// yarısı" değil. Çubuk ızgaranın orta satırını kaplar; orta satır masa yüksekliğinin ~%60'ı
// olduğundan "yarısına" ulaşmak için satırın en az %80'i gerekir.
test('madde-1-f: sol/sağ çubuk orta satırın en az %80\'ini kaplar (≈ masa yüksekliğinin yarısı)', () => {
  const eslesme = STIL_CSS.match(/\.kenar-raf-dikey\s*\{[^}]*height:\s*(\d+)%/);
  assert.ok(eslesme, '.kenar-raf-dikey yüzde yükseklik tanımlamıyor');
  assert.ok(
    Number(eslesme[1]) >= 80,
    `.kenar-raf-dikey yüksekliği %${eslesme[1]}; masa yüksekliğinin yarısına ulaşmak için en az %80 olmalı`,
  );
});

// 2. turun ekran görüntüsünden ölçüldü (is/tasokey-33/ekran, 1920x1080, PNG piksel taraması):
// Sahip'in kendi ıstaka panelinin (#rafAlani) DOM kutusu içeriğe göre doğru (227 px: 16 px dolgu +
// başlık + 2 sıra taş + 16 px dolgu), ama boyanan ahşap yalnız 846..1026 = 181 px. 603 px genişlik /
// (400/120) = 181 — yani istaka.svg de kendi oranında ortalanıyor (madde-1-e'deki hatanın aynısı:
// background-size: 100% 100% kutuyu gerer, preserveAspectRatio varsayılanı resmi germez). Sonuç:
// taşların alt sırası ahşabın alt kenarından taşıyor, panelin altında boş keçe kalıyor —
// MASA-DUZENI.md "taşlar rafa oturur" karşılanmıyor.
test('madde-1-g: Sahip\'in kendi ıstaka görseli de oran korumasını kapatır (taşlar ahşaba oturur)', () => {
  assert.match(
    ISTAKA_SVG,
    /preserveAspectRatio="none"/,
    'istaka.svg preserveAspectRatio="none" taşımıyor — ahşap panel kutusu kadar uzamaz, alt sıra taşlar dışarı taşar',
  );
});

// border-image-slice sayıları, görselin KENDİ (intrinsic) piksel uzayında okunur. Yalnız viewBox
// taşıyan bir SVG'nin intrinsic boyutu yoktur; tarayıcı onu çerçeve alanına göre ölçekler ve
// "36" artık viewBox birimi olmaz → çerçeve ahşap deseni yerine düz kahverengi şerit olur.
// width/height verilince 36, viewBox'taki iç kesimle (36..84) birebir eşleşir.
test('madde-3-c: masa-cerceve.svg intrinsic boyut taşır (border-image-slice 36 viewBox birimine denk gelsin)', () => {
  assert.match(
    MASA_CERCEVE_SVG,
    /<svg[^>]*\bwidth="120"[^>]*\bheight="120"/,
    'masa-cerceve.svg width/height taşımıyor — border-image-slice: 36 viewBox birimine karşılık gelmez',
  );
});

test('madde-2-a: deste artık tek taş değil, üst üste kaydırılmış katmanlar olarak çiziliyor', () => {
  assert.doesNotMatch(
    EKRAN_JS,
    /if \(durum\.yerDestesi\.length > 0\) eleman\.yerDestesi\.appendChild\(tersTasElemaniOlustur\(\)\)/,
    'ekran.js hâlâ eski tek-taş deste çizimini kullanıyor',
  );
  assert.match(EKRAN_JS, /function yerDestesiYiginiCiz/, 'yerDestesiYiginiCiz işlevi yok');
  assert.match(
    EKRAN_JS,
    /yerDestesiYiginiCiz\(eleman\.yerDestesi,\s*durum\.yerDestesi\.length\)/,
    'masaCiz yerDestesiYiginiCiz\'i çağırmıyor',
  );
  const maksimumEslesme = EKRAN_JS.match(/const DESTE_GORUNEN_MAKSIMUM = (\d+);/);
  assert.ok(maksimumEslesme, 'DESTE_GORUNEN_MAKSIMUM tanımlı değil');
  assert.ok(Number(maksimumEslesme[1]) > 1, 'DESTE_GORUNEN_MAKSIMUM 1\'den büyük olmalı (yığın görünsün)');
});

test('madde-2-b: deste taşları #yerDestesi içinde mutlak konumlanıp ortada üst üste biniyor', () => {
  assert.match(
    STIL_CSS,
    /#yerDestesi \.tas-arka\s*\{[^}]*position:\s*absolute/,
    '#yerDestesi .tas-arka mutlak konumlu değil (yığın görünümü kurulamaz)',
  );
});

test('madde-3-a: masa zemin dokusu eski (neredeyse görünmez) opaklıktan daha belirgin', () => {
  const eslesme = MASA_ZEMIN_SVG.match(/opacity="([\d.]+)"/);
  assert.ok(eslesme, 'masa-zemin.svg deseninde opacity tanımlı değil');
  assert.ok(Number(eslesme[1]) > 0.12, `doku opaklığı ${eslesme[1]}, eski değer 0.12'den büyük olmalı (madde 3)`);
});

// 2. turun ekran görüntüsünde ölçüldü (1920x1080): doku yalnız x=471..1448 arasında, yani masanın
// yüksekliği kadar (978 px) bir KARE alanda görünüyordu — masa-zemin.svg kare viewBox'ını (240x240)
// background-size: 100% 100% ile gerilen kutuda kendi oranında ortalıyordu. Doku bir döşeme deseni
// olduğu için doğru çözüm germek değil, sabit ölçüyle döşemek (background-repeat varsayılanı).
test('madde-3-d: masa zemin dokusu masanın TAMAMINI kaplar (gerilmiş kare değil, döşenmiş desen)', () => {
  // Açıklama satırları eski değeri anlatmak için metinde geçebilir → yalnız gerçek bildirimler okunur.
  const bildirimler = STIL_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const eslesme = bildirimler.match(/#masa\s*\{[\s\S]*?background-size:\s*([^;]+);/);
  assert.ok(eslesme, '#masa background-size tanımlamıyor');
  assert.doesNotMatch(
    eslesme[1],
    /100%\s+100%/,
    '#masa dokusu hâlâ kutuya geriliyor (background-size: 100% 100%) — kare görsel ortada kalır, kenarlar dokusuz',
  );
  const degiskenAdi = eslesme[1].match(/var\((--[\w-]+)\)/);
  assert.ok(degiskenAdi, '#masa dokusu ölçüsü değişkenden gelmiyor (kodda sihirli sayı olmamalı)');
  const degiskenDegeri = bildirimler.match(new RegExp(`${degiskenAdi[1]}:\\s*([^;]+);`));
  assert.ok(degiskenDegeri, `${degiskenAdi[1]} :root içinde tanımlı değil`);
  assert.match(
    degiskenDegeri[1],
    /\d+px/,
    `${degiskenAdi[1]} sabit (px) döşeme ölçüsü değil — doku yine kutuya gerilir`,
  );
});

test('madde-3-b: masanın çevresine ahşap çerçeve (masa-cerceve.svg) gerçekten uygulanıyor', () => {
  assert.match(
    STIL_CSS,
    /#masa\s*\{[\s\S]*?border-image-source:\s*url\(['"]\.\.\/gorsel\/masa-cerceve\.svg['"]\)/,
    '#masa border-image-source ile masa-cerceve.svg kullanmıyor',
  );
});

test('madde-4-a: köşe yığını boşken "0" yazmıyor, boş yuva görseli gösteriyor', () => {
  assert.match(
    EKRAN_JS,
    /if \(yigin\.length === 0\) \{\s*\n\s*yiginAlani\.appendChild\(gorselOlustur\(['"]yuva-bos\.svg['"]/,
    'koseYiginiCiz boşken yuva-bos.svg eklemiyor',
  );
  assert.match(
    EKRAN_JS,
    /if \(yigin\.length === 0\) \{[\s\S]*?sayacEl\.textContent = '';/,
    'koseYiginiCiz boşken sayaç metnini boşaltmıyor (hâlâ "0" yazabilir)',
  );
});

test('madde-4-b: erişilebilir adet etiketi (aria-label) boşken de gerçek sayıyı (0) taşımaya devam ediyor', () => {
  assert.match(
    EKRAN_JS,
    /kutu\.setAttribute\('aria-label', metinAl\('koseYigini\.adet', \[oyuncuAdi\(oyuncu\), yigin\.length\]\)\);/,
    'koseYiginiCiz aria-label\'ı görsel "0" gizlemesinden bağımsız olarak hâlâ ayarlamıyor',
  );
});

// Sahip ek bilgisi (2026-11-20): "Istakanın tek sırası 12 taş alacak genişlikte olsun ve taşlar
// arasında boşluk olmasın" — gerçek okey ıstakasında taşlar bitişik durur.
test('madde-ek-a: ıstakanın bir sırası 12 taş alıyor', () => {
  assert.match(EKRAN_JS, /const RAF_SUTUN_SAYISI = 12;/, 'ekran.js RAF_SUTUN_SAYISI 12 değil');
});

// Boşluk sıfır olmalı (bitişik taş), AMA uzunluk birimiyle: aynı değişken
// --rakip-ust-genislik'in calc()'ında uzunluklarla toplanıyor; birimsiz `0` orada
// <number>dır ve bütün formülü geçersiz kılar (denetçi bulgusu, tur 2).
test('madde-ek-b: ıstaka yuvaları arasında boşluk yok (hiçbir kademede) ve değer uzunluk birimi taşır', () => {
  const tanimlar = [...STIL_CSS.matchAll(/--raf-yuva-bosluk:\s*([^;]+);/g)].map((e) => e[1].trim());
  assert.ok(tanimlar.length > 0, 'stil.css --raf-yuva-bosluk tanımlamıyor');
  for (const deger of tanimlar) {
    assert.match(
      deger,
      /^0(px|rem|em)$/,
      `--raf-yuva-bosluk ya sıfır değil ya da birimsiz: ${deger} (birimsiz 0, calc() toplamını geçersiz kılar)`,
    );
  }
});

// Denetçi bulguları (tur 1). #rafAlani `.kenar` sınıfındadır, `.kenar` da bu işte
// `justify-content: center` kazandı: panelin kutusu içeriğinden kısa kalırsa taşlar iki uca da
// taşar ve alt sıra ahşabın dışında kalır. Kutunun içerikten kısa kalması yasaklanırsa ortalama
// zaten etkisizdir (kutu = içerik yüksekliği).
test('denetci-1: Sahip\'in ıstaka paneli kutusu içeriğinden kısa kalamaz', () => {
  assert.match(
    STIL_CSS,
    /#rafAlani\s*\{[^}]*min-height:\s*max-content/,
    '#rafAlani min-height: max-content tanımlamıyor (kutu içerikten kısa kalabilir)',
  );
});

test('denetci-2: sol/sağ rakip çubuğu dar kademelerde taban orandan daha uzun', () => {
  const tabanEslesme = STIL_CSS.match(/\.kenar-raf-dikey\s*\{[^}]*height:\s*(\d+)%/);
  assert.ok(tabanEslesme, '.kenar-raf-dikey taban yüzde yüksekliği tanımlı değil');

  const bas = STIL_CSS.indexOf('@media (max-width: 1300px)');
  assert.ok(bas > 0, 'stil.css 1300px kademesini tanımlamıyor');
  const sonraki = STIL_CSS.indexOf('@media', bas + 1);
  const darKademe = STIL_CSS.slice(bas, sonraki > 0 ? sonraki : STIL_CSS.length);

  const darEslesme = darKademe.match(/\.kenar-raf-dikey\s*\{[^}]*height:\s*(\d+)%/);
  assert.ok(darEslesme, '1300px kademesi .kenar-raf-dikey yüksekliğini artırmıyor');
  const taban = Number(tabanEslesme[1]);
  const dar = Number(darEslesme[1]);
  assert.ok(dar > taban, `dar kademe oranı (${dar}%) tabandan (${taban}%) büyük değil`);
  assert.ok(dar <= 100, `dar kademe oranı (${dar}%) satırın dışına taşıyor`);
});

// Denetçi bulguları (tur 2). Üst rakibin yatay çubuğu dört ekran görüntüsünde de hiç
// çizilmiyordu: --rakip-ust-genislik formülündeki `(sütun-1) * var(--raf-yuva-bosluk)`
// terimi, boşluk birimsiz `0`a çekilince <number> oluyor ve uzunlukla toplanamıyor →
// değişken geçersiz → width düşüyor → boş div 0 genişlik. Metin eşleştiren madde-1-b
// bunu göremedi; aşağıdaki iki test ifadeyi gerçekten hesaplar.
test('denetci-3: üst çubuk genişliği gerçekten bir UZUNLUK veriyor (birimsiz sayıyla toplanmıyor)', () => {
  const sozluk = degiskenSozlugu();
  const ham = sozluk.get('--rakip-ust-genislik');
  assert.ok(ham, '--rakip-ust-genislik tanımlı değil');
  let sonuc;
  try {
    sonuc = ifadeHesapla(varCoz(ham[0], sozluk));
  } catch (hata) {
    assert.fail(`--rakip-ust-genislik çözümlenemiyor: ${hata.message}`);
  }
  assert.equal(
    sonuc.birim,
    'px',
    `--rakip-ust-genislik "${sonuc.birim || 'birimsiz'}" veriyor; uzunluk olmayan değer width: için geçersizdir`,
  );
  assert.ok(sonuc.sayi > 0, `--rakip-ust-genislik ${sonuc.sayi}px — çubuk görünmez`);
});

test('denetci-4: stil.css\'teki bütün calc() ifadeleri birim bakımından geçerli', () => {
  const sozluk = degiskenSozlugu();
  for (const ifade of calcIfadeleri(YORUMSUZ_STIL)) {
    let cozulmus;
    try {
      cozulmus = varCoz(ifade, sozluk);
    } catch {
      continue; // sayısal olmayan/çözülemeyen değişken: bu testin konusu değil
    }
    try {
      ifadeHesapla(cozulmus);
    } catch (hata) {
      if (hata instanceof BirimHatasi) {
        assert.fail(`${ifade.replace(/\s+/g, ' ')} → ${hata.message}`);
      }
    }
  }
});

test('denetci-5: her özel değişken bütün kademelerde aynı birim türünde kalır', () => {
  const sozluk = degiskenSozlugu();
  for (const [ad, degerler] of sozluk) {
    const birimler = new Set();
    for (const deger of degerler) {
      try {
        birimler.add(ifadeHesapla(varCoz(deger, sozluk)).birim);
      } catch {
        birimler.clear(); // sayısal olmayan değer (renk, url, anahtar sözcük) → atla
        break;
      }
    }
    assert.ok(
      birimler.size <= 1,
      `${ad} kademeden kademeye birim değiştiriyor (${[...birimler].map((b) => b || 'birimsiz').join(', ')}) — calc() içinde kullanılırsa formül geçersiz olur`,
    );
  }
});

// Denetçi ölçümü (tur 2): doku masanın tamamına döşenmiş ama tonlar arasında en çok
// 2-3/255 fark var → gözle hâlâ "düz koyu yeşil". madde-3-a yalnız opaklık sayısını
// okuyor; burada gerçek görünürlük (desen rengi × opaklık, keçenin üstüne karıştırılmış)
// ölçülür.
test('madde-3-e: keçe dokusu zeminden gözle ayrılacak kadar kontrastlı', () => {
  const kece = onalticiRenk(YORUMSUZ_STIL.match(/--masa-zemin:\s*([^;]+);/)[1]);
  assert.ok(kece, '--masa-zemin onaltılık renk değil');
  const desenEslesme = MASA_ZEMIN_SVG.match(/stroke="[^"]*?(#[0-9a-f]{6})[^"]*"/i);
  assert.ok(desenEslesme, 'masa-zemin.svg desen çizgisinin yedek rengi okunamadı');
  const desen = onalticiRenk(desenEslesme[1]);
  const opaklik = Number(MASA_ZEMIN_SVG.match(/opacity="([\d.]+)"/)[1]);
  // Dış SVG arka plan olarak kullanıldığında sayfanın değişkenlerini göremez → yedek renk geçerlidir.
  const fark = Math.max(...desen.map((k, i) => Math.abs(kece[i] + opaklik * (k - kece[i]) - kece[i])));
  assert.ok(
    fark >= 8,
    `doku ile keçe arasında en çok ${fark.toFixed(1)}/255 fark var; çizgi ${desenEslesme[1]} × opaklık ${opaklik} gözle görünmüyor (madde 3)`,
  );
});
