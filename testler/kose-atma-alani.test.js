import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { yorumlariAt } from './yardimci/css-olcu.js';
import {
  alanSatirlari, bildirim as beyan, izlerCoz, masaKullanilanYukseklik, masaModeli,
} from './yardimci/masa-izleri.js';
import { olculenMasaKutusu } from './yardimci/sigdirma-butcesi.js';
import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';

// tasokey#63 (sınıf K) — Sahip'in `tasokey#47`e düzeltmesi:
// "Rakip oyuncuya atılacak taşın bırakılacağı alan, oyuncunun ıstakası ile rakibin ıstakasının
//  ARASINDAKİ BOŞ ALAN olsun; taş bırakılınca bu boş alanın ORTASINDA konumlansın."
// `tasokey#47` köşeyi ızgara hücresini dolduracak biçimde büyütmüştü, ama hücrenin kendisi dar
// kalıyordu: ızgara `auto 1fr auto` sütunlarıyla kurulduğu için köşe sütunu TAŞ ölçüsündeydi ve
// boş alanın tamamı ortadaki `1fr` sütununda kalıyordu (Sahip ölçümü, 800x360: köşe 35x101 px,
// boş bölge ~430x100 px). Aynı şey satırlarda da vardı: üst köşe satırı rakip çubuğunun
// kalınlığı kadardı.
//
// Düzeltme: ızgara masayı "ıstakaların kapladığı orta şerit + dört köşe dikdörtgeni" olarak böler
// (`1fr auto 1fr` sütun, `1fr var(--masa-orta-satir) 1fr` satır), dört ıstaka kendi kenarına
// yapışır ve dikey çubuk satırının TAMAMIDIR. Böylece köşe hücresi = iki komşu ıstaka arasındaki
// boş dikdörtgen eksi birer ızgara boşluğu; kural dört köşe için tektir (ADR-010 simetrisi).
//
// tasokey#71: masa düzeni artık İKİ VARYANTLIDIR (tasokey#70 planı §3, karar maddesi 2) —
// paylaşılan düzende ÜÇ iz, kısa yatay varyantta DÖRT bant (üst köşeler ilk iki bandı kaplar).
// Bu dosyanın savları GEVŞETİLMEDİ: aynı kapsama/ortalama/sığdırma ölçütleri iki düzende de
// ayrı ayrı denetlenir; "izler üç tanedir" varsayımı yerine düzen başına beklenen bant listesi
// ölçülür (aşağıda `kabul-c`). Bant modeli `yardimci/masa-izleri.js`e taşındı (tek kaynak: ince
// sırt oranı öz-testi de aynı bant ölçülerini okuyor).
//
// Ölçüm: DOM yürütmesi yok (bu projenin arayüz testleri deseni) — ızgara iz ölçüleri CSS
// değişkenlerinden GERÇEKTEN hesaplanır ("find the size of an fr" döngüsü dahil). Yazı ölçüsüne
// bağlı yükseklikler için alt/üst sınır kullanılır; sınırlar oranın ALEYHİNE seçilir, bu yüzden
// hesaplanan kapsama oranı gerçeğin ALT SINIRIDIR. Gerçek tarayıcı ölçümü: is/tasokey-63/ekran/.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const YORUMSUZ_STIL = yorumlariAt(STIL_CSS);

// Sahip'in kabul ölçütü: boş bölgenin en az %80'i atma alanı olacak.
const EN_AZ_KAPSAMA = 0.8;

// --raf-sutun-sayisi CSS'te değil `arayuz/raf.js`te tanımlıdır (ADR-019, tek kaynak).
const EKLER = new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]);

// tasokey#71: 900x600 artık "arama ek boyutu" değil ASIL ölçüm boyutudur (plan §5) ve kısa yatay
// varyantın en geniş kabul boyutudur → köşe oranı orada da ölçülür.
const OLCUM_BOYUTLARI = [
  { ad: '1920x1080 (masaüstü)', genislik: 1920, yukseklik: 1080 },
  { ad: '1280x800 (dizüstü)', genislik: 1280, yukseklik: 800 },
  { ad: '1180x820 (tablet yatay)', genislik: 1180, yukseklik: 820 },
  { ad: '900x600 (kısa yatay — geniş)', genislik: 900, yukseklik: 600 },
  { ad: '844x390 (telefon yatay)', genislik: 844, yukseklik: 390 },
  { ad: '800x360 (telefon yatay — Sahip ölçümü)', genislik: 800, yukseklik: 360 },
];

/**
 * Masanın bu boyuttaki bant modeli (yardimci/masa-izleri.js — tek kaynak). Masanın İÇERİK kutusu
 * TARAYICIDA ÖLÇÜLEN değerden gelir (yardimci/sigdirma-butcesi.js OLCULEN_MASA_KUTUSU, tasokey#68):
 * masa yüksekliği esnek kaptan gelir (tasokey#63) ve CSS'ten okunamaz; "görünüm eksi üst sınır"
 * tahmini 360 px yükseklikte masaya yalnız 184 px bırakıyor ve bantları yanıltıyordu.
 */
function masaOlcusu(boyut) {
  return masaModeli(STIL_CSS, boyut, EKLER, { masaIc: olculenMasaKutusu(boyut) });
}

function bildirim(secici, ozellik, boyut) {
  return beyan(STIL_CSS, secici, ozellik, boyut);
}

/* ------------------------------------------------------------------------------- ASIL KABUL */

test('ASIL KABUL (a): atma alanı, iki komşu ıstaka arasındaki boş bölgenin en az %80\'i', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    for (const kose of olcu.koseler) {
      // Atma alanı = köşenin bırakma hedefi: kutu + ADR-014 halkasının bölge İÇİNDE kalan payı.
      const hedefGenislik = Math.min(olcu.koseGenislik + olcu.hedefPayi, olcu.bosBolgeGenislik);
      const hedefYukseklik = Math.min(kose.yukseklik + olcu.hedefPayi, kose.bosBolgeYukseklik);
      const bosAlan = olcu.bosBolgeGenislik * kose.bosBolgeYukseklik;
      const oran = (hedefGenislik * hedefYukseklik) / bosAlan;
      assert.ok(
        oran >= EN_AZ_KAPSAMA,
        `${boyut.ad} ${kose.ad} köşe: atma alanı boş bölgenin yalnız %${(oran * 100).toFixed(1)}'i `
        + `(hedef ${hedefGenislik.toFixed(0)}x${hedefYukseklik.toFixed(0)} px, kutu `
        + `${olcu.koseGenislik.toFixed(0)}x${kose.yukseklik.toFixed(0)} px, boş bölge `
        + `${olcu.bosBolgeGenislik.toFixed(0)}x${kose.bosBolgeYukseklik.toFixed(0)} px) — en az %80 olmalı`,
      );
    }
  }
});

test('ASIL KABUL (a2): köşe KUTUSU boş bölgenin ucuna dayanır (açık yalnız bir ızgara boşluğu)', () => {
  // Kutunun boş bölgeden eksik kalan payı yapısal olarak tam bir ızgara boşluğudur (komşu ıstaka
  // hücresiyle arasındaki `gap`); yazı ölçüsünden bağımsız, her kademede aynı. Bu açığın yarısını
  // ADR-014 halkası zaten kapatır (yukarıdaki kabul a).
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    const yatayAcik = olcu.bosBolgeGenislik - olcu.koseGenislik;
    assert.ok(
      yatayAcik >= 0 && yatayAcik <= olcu.bosluk + 0.5,
      `${boyut.ad}: köşe kutusu ile ıstaka arasında ${yatayAcik.toFixed(0)} px boşluk kaldı `
      + `(en çok bir ızgara boşluğu = ${olcu.bosluk} px olmalı)`,
    );
    for (const kose of olcu.koseler) {
      const dikeyAcik = kose.bosBolgeYukseklik - kose.yukseklik;
      assert.ok(
        dikeyAcik >= 0 && dikeyAcik <= olcu.bosluk + 0.5,
        `${boyut.ad} ${kose.ad} köşe: kutu ile komşu çubuk arasında ${dikeyAcik.toFixed(0)} px `
        + `boşluk kaldı (en çok ${olcu.bosluk} px olmalı)`,
      );
    }
  }
});

test('ASIL KABUL (b): atılan taş yığını boş bölgenin ortasında (sapma en çok bir ızgara boşluğu)', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    const olcu = masaOlcusu(boyut);
    // Yığın köşe kutusunun ortasındadır (.kose: `1fr auto 1fr` + justify-items: center — bkz.
    // masa-duzeni-cubuk-deste-kose.test.js kose-47-c). Kutu masanın kenarına dayandığı için
    // yığın merkezinin kenardan uzaklığı kutunun yarısıdır.
    const yatayKayma = Math.abs(olcu.bosBolgeGenislik - olcu.koseGenislik) / 2;
    assert.ok(
      yatayKayma <= olcu.bosluk,
      `${boyut.ad}: yığın merkezi boş bölgenin ortasından yatayda ${yatayKayma.toFixed(0)} px kayık `
      + `(en çok bir ızgara boşluğu = ${olcu.bosluk} px olmalı)`,
    );
    for (const kose of olcu.koseler) {
      const dikeyKayma = Math.abs(kose.bosBolgeYukseklik - kose.yukseklik) / 2;
      assert.ok(
        dikeyKayma <= olcu.bosluk,
        `${boyut.ad} ${kose.ad} köşe: yığın merkezi boş bölgenin ortasından dikeyde `
        + `${dikeyKayma.toFixed(0)} px kayık (en çok ${olcu.bosluk} px olmalı)`,
      );
    }
  }
});

test('ASIL KABUL (c): büyüyen köşe satırları masayı viewport dışına itmez (R-014 sığdırma)', () => {
  // tasokey#63'ün satır düzeni (`1fr 2fr 1fr`) köşeleri büyütür; ama #masa yüksekliğini
  // İÇERİĞİNDEN alıyorsa tek dolu satır (oyuncunun ıstakası) masayı kendi dört katına çeker
  // (CSS Grid §12.7.2) ve ıstaka ekranın dışında kalır — Sahip'in 800x360 ölçümünde masa 416 px.
  for (const boyut of OLCUM_BOYUTLARI) {
    const { kullanilabilir, kullanilan, icerikten } = masaKullanilanYukseklik(
      STIL_CSS, boyut, masaOlcusu(boyut),
    );
    assert.ok(
      kullanilan <= kullanilabilir + 0.5,
      `${boyut.ad}: masa ${kullanilan.toFixed(0)} px yer istiyor, oysa ${kullanilabilir.toFixed(0)} px `
      + `var (içerikten çözülen yükseklik ${icerikten.toFixed(0)} px) — sayfa taşar, oyuncunun `
      + 'ıstakası ekranın dışında kalır. #masa yüksekliğini esnek kaptan almalı (esneme tabanı 0 + '
      + 'min-height: 0), yoksa esnek izler kalan yerden değil içerikten çözülür',
    );
  }
});

test('ASIL KABUL (c2): satır içerikleri kalan yüksekliğe sığar (kesin yükseklik sıkıştırma gizlemez)', () => {
  // (c)'deki çözüm masayı viewport'a KESİN olarak oturtur; bu tek başına "ıstaka görünür" demek
  // değildir — satırların içerik tabanları toplamı da sığmalı, yoksa içerik hücresinden taşar.
  for (const boyut of OLCUM_BOYUTLARI) {
    const { kullanilabilir, satirTabanlari } = masaKullanilanYukseklik(
      STIL_CSS, boyut, masaOlcusu(boyut),
    );
    assert.ok(
      satirTabanlari <= kullanilabilir + 0.5,
      `${boyut.ad}: satırların içerik tabanı ${satirTabanlari.toFixed(0)} px, kalan yükseklik `
      + `${kullanilabilir.toFixed(0)} px — ıstaka/çubuk kendi satırından taşar`,
    );
  }
});

/* ------------------------------------------------- yapısal kurallar (ölçümün dayandığı düzen) */

/**
 * Paylaşılan düzende (masaüstü/tablet) ve kısa yatay varyantta beklenen bant listesi. tasokey#71:
 * "izler üç tanedir" varsayımı GEVŞETİLMEDİ, DÜZEN BAŞINA yazıldı — paylaşılan düzende yine tam
 * üç iz, varyantta tam dört bant ve üst köşeler ilk iki bandı kaplar (karar maddesi 2).
 */
const BEKLENEN_DUZENLER = [
  {
    ad: 'paylaşılan düzen (masaüstü/tablet)',
    boyut: OLCUM_BOYUTLARI[0],
    satirSayisi: 3,
    koseUstBantlari: [0],
    koseAltBantlari: [2],
    yanBant: 1,
    ortaBant: 1,
  },
  {
    ad: 'kısa yatay varyant',
    boyut: OLCUM_BOYUTLARI.at(-1),
    satirSayisi: 4,
    koseUstBantlari: [0, 1],
    koseAltBantlari: [3],
    yanBant: 2,
    ortaBant: 1,
  },
];

test('kabul-c: masa ızgarası ortada yalnız ıstaka şeridini bırakır (dış izler esnek, simetrik)', () => {
  for (const { ad, boyut } of BEKLENEN_DUZENLER) {
    const { sozluk, satirAdlari, sutunAdlari } = masaOlcusu(boyut);
    const duzen = BEKLENEN_DUZENLER.find((d) => d.ad === ad);
    // Sütunlarda dış izler birebir eşit ve esnek (iki düzende de aynı).
    const [ilkSutun, , sonSutun] = sutunAdlari;
    assert.equal(ilkSutun, sonSutun, `${ad} sütunlar: dış izler eşit değil (${ilkSutun} / ${sonSutun}) — köşeler simetrik olmaz`);
    assert.match(ilkSutun, /fr$/, `${ad} sütunlar: dış iz esnek değil ("${ilkSutun}") — köşe hücresi içeriği kadar kalır`);
    // Satırlarda ölçüt köşe BANTLARININ esnek payıdır: üst köşe varyantta üst çubuğun `auto`
    // bandını da kaplar (karar maddesi 2), ama artan boş alanı paylaştıran pay iki köşede eşit
    // kalmalı — yoksa köşeler simetrik olmaz (ADR-010).
    const frPayi = (bantlar) => bantlar.reduce(
      (toplam, i) => toplam + (satirAdlari[i].endsWith('fr') ? Number.parseFloat(satirAdlari[i]) : 0),
      0,
    );
    assert.equal(
      frPayi(duzen.koseUstBantlari),
      frPayi(duzen.koseAltBantlari),
      `${ad} satırlar: üst/alt köşe bantlarının esnek payı eşit değil (${satirAdlari.join(' ')})`,
    );
    assert.ok(frPayi(duzen.koseUstBantlari) > 0, `${ad} satırlar: köşe bandı esnek değil — köşe hücresi içeriği kadar kalır`);
    for (const i of [...duzen.koseUstBantlari, ...duzen.koseAltBantlari]) {
      assert.ok(
        satirAdlari[i] === 'auto' || satirAdlari[i].endsWith('fr'),
        `${ad} satırlar: ${i}. bant çıplak uzunluk ("${satirAdlari[i]}") — köşe hücresi kademeyle büyüyüp küçülmez`,
      );
    }
    // Orta SÜTUN içeriğe oturur: genişliğini oyuncunun ıstakası belirler, esnemez.
    assert.equal(sutunAdlari.length, 3, `${ad}: masa üç sütun tanımlamıyor (${sutunAdlari.join(' ')})`);
    assert.equal(
      sutunAdlari[1],
      'auto',
      `${ad}: #masa orta sütunu "${sutunAdlari[1]}" — ıstaka genişliğinden büyük olursa artan yer `
      + 'köşenin değil ortadaki hücrenin olur',
    );
    // Orta SATIR bir ORAN kararıdır (çubuk ~masa yüksekliğinin yarısı): esnek ve köşe
    // satırlarından büyük olmalı, yoksa çubuk kısalır (madde 1, tasokey#33).
    const yanIz = satirAdlari[BEKLENEN_DUZENLER.find((d) => d.ad === ad).yanBant];
    assert.ok(
      Number.parseFloat(yanIz) > Number.parseFloat(satirAdlari.at(-1)),
      `${ad}: #masa yan çubuk bandı (${yanIz}) köşe bandından (${satirAdlari.at(-1)}) büyük değil — `
      + 'dikey ıstaka çubuğu masa yüksekliğinin yaklaşık yarısı kalmaz',
    );
  }
});

test('kabul-c3: düzen başına bant listesi ve köşelerin kapladığı bantlar beklenen (üç iz / dört bant)', () => {
  for (const duzen of BEKLENEN_DUZENLER) {
    const { satirAdlari, sablon } = masaOlcusu(duzen.boyut);
    assert.equal(
      satirAdlari.length,
      duzen.satirSayisi,
      `${duzen.ad}: ${satirAdlari.length} bant var, ${duzen.satirSayisi} bekleniyor (${satirAdlari.join(' ')})`,
    );
    assert.equal(sablon.length, duzen.satirSayisi, `${duzen.ad}: alan şablonu bant sayısıyla uyuşmuyor`);
    for (const [alan, beklenen] of [
      ['solUst', duzen.koseUstBantlari], ['sagUst', duzen.koseUstBantlari],
      ['solAlt', duzen.koseAltBantlari], ['sagAlt', duzen.koseAltBantlari],
      ['ust', [duzen.satirSayisi === 3 ? 0 : 0]], ['merkez', [duzen.ortaBant]],
      ['sol', [duzen.yanBant]], ['sag', [duzen.yanBant]],
      ['alt', [duzen.satirSayisi - 1]],
    ]) {
      assert.deepEqual(
        alanSatirlari(sablon, alan),
        beklenen,
        `${duzen.ad}: ${alan} alanı ${alanSatirlari(sablon, alan).join(',')} bandında (beklenen ${beklenen.join(',')})`,
      );
    }
    // Varyantta üst çubuk bandı içeriğe oturur (yalnız çubuğun kalınlığı), öbür bantlar esnektir.
    if (duzen.satirSayisi === 4) {
      assert.equal(satirAdlari[0], 'auto', `${duzen.ad}: üst çubuk bandı "auto" değil`);
      assert.deepEqual(
        sablon[2].filter((ad) => ad === '.'),
        ['.'],
        `${duzen.ad}: yan çubuk bandının orta sütunu boş değil — ıstakanın taşacağı yer kalmaz`,
      );
    }
  }
});

test('kabul-d: dört ıstaka masanın kendi kenarına yapışır (köşe sütunu/satırı boş kalsın)', () => {
  const beklenen = [
    ['#kenarUst', 'align-self', 'start'],
    ['#rafAlani', 'align-self', 'end'],
    ['.kenar-sol', 'justify-self', 'start'],
    ['.kenar-sag', 'justify-self', 'end'],
  ];
  // İki düzende de aynı: varyant yalnız bant listesini değiştirir, yapışmayı değiştirmez.
  for (const { ad, boyut } of BEKLENEN_DUZENLER) {
    for (const [secici, ozellik, deger] of beklenen) {
      assert.equal(
        bildirim(secici, ozellik, boyut),
        deger,
        `${ad} · ${secici} ${ozellik}: ${deger} değil — ıstaka hücresinin ortasına kayar, köşe boş `
        + 'bölgeyi gösteremez',
      );
    }
  }
});

test('kabul-e: dikey ıstaka çubuğu satırın TAMAMIDIR (satır sınırı = boş bölgenin sınırı)', () => {
  for (const boyut of OLCUM_BOYUTLARI) {
    assert.equal(
      bildirim('.kenar-raf-dikey', 'height', boyut),
      '100%',
      `${boyut.ad}: dikey çubuk satırı tam doldurmuyor — satırın iki ucunda köşenin dışında `
      + 'kalan boş alan oluşur',
    );
  }
});

test('kabul-f: orta satır oranı tek kaynaktan (kuralın içine sayı yazılmaz)', () => {
  for (const { ad, boyut } of BEKLENEN_DUZENLER) {
    const ham = bildirim('#masa', 'grid-template-rows', boyut);
    assert.match(
      ham,
      /var\(--masa-orta-satir\)/,
      `${ad}: #masa grid-template-rows yan çubuk izini değişkenden okumuyor: "${ham}"`,
    );
    // Değişken gerçekten bir fr payına çözülüyor (izlerCoz onu var() ile açar).
    const izAdlari = izlerCoz(ham, masaOlcusu(boyut).sozluk);
    assert.ok(izAdlari.every((iz) => iz === 'auto' || /^\d+(\.\d+)?fr$/.test(iz)), `${ad}: iz listesi "${izAdlari.join(' ')}"`);
  }
  const tanimlar = [...YORUMSUZ_STIL.matchAll(/--masa-orta-satir\s*:\s*([^;}]+)/g)];
  assert.equal(tanimlar.length, 1, '--masa-orta-satir birden çok kez tanımlı; tek kaynak olmalı');
  assert.match(tanimlar[0][1].trim(), /^\d+(\.\d+)?fr$/, '--masa-orta-satir bir fr payı değil');
});
