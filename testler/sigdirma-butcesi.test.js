import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAF_SUTUN_SAYISI } from '../docs/arayuz/raf.js';
import {
  boyutSozlugu, degiskenOlcusu, kademeSozlukleri, medyaBloklari,
} from './yardimci/css-olcu.js';
import {
  KADEME_KABUL_BOYUTLARI, OLCEK_BASAMAGI, OLCULEN_MASA_KUTUSU, OLCULEN_OLCEK_TAVANI,
  butceDenetimi, dikeyButce, enCokOlcek, olculenBoyut, olculenTavan, yatayButce,
} from './yardimci/sigdirma-butcesi.js';

// tasokey#68 (üst iş tasokey#64) — ADR-022/5 kabul-d: kademe başına `--istaka-olcek` değeri
// SEÇİLMEZ, ÖLÇÜLÜR. Burada ölçülen, CSS'teki değerlerin planın §4 sığdırma bütçesini
// sağladığıdır. Eşitsizliğin bütün terimleri CSS değişkeninden okunur (çıplak sayı yazılmaz);
// yalnız masanın İÇERİK kutusu tarayıcıda ölçülmüştür (esnek kaptan gelir, CSS'te yazmaz) ve
// `yardimci/sigdirma-butcesi.js` tablosunda tek kaynak olarak durur.
// Gerçek çakışma/taşma ölçümü bu testin işi değildir (tarayıcı: `yerlesim-cakisma.olcum.js`);
// bütçe o ölçümün ÜST SINIRIDIR.

const STIL_CSS = readFileSync(join(import.meta.dirname, '..', 'docs', 'arayuz', 'stil.css'), 'utf8');
const EKLER = new Map([['--raf-sutun-sayisi', [String(RAF_SUTUN_SAYISI)]]]);

/** Ölçülen boyutta geçerli değişken sözlüğü (uyan bütün @media bloklarının birleşimi). */
function sozluk({ boyut: [genislik, yukseklik] }) {
  return boyutSozlugu(STIL_CSS, { genislik, yukseklik }, EKLER);
}

/** Bütçe girdisi: terimlerin hepsi CSS'ten + ölçülen masa kutusundan. */
function butceGirdisi(olculen) {
  const s = sozluk(olculen);
  const px = (ad) => {
    const olcu = degiskenOlcusu(ad, s);
    assert.equal(olcu.birim, 'px', `${ad} px değil (${olcu.birim || 'birimsiz'})`);
    return olcu.sayi;
  };
  const sutun = degiskenOlcusu('--raf-sutun-sayisi', s);
  assert.equal(sutun.birim, '', '--raf-sutun-sayisi birimsiz olmalı');
  return {
    masaIcGenislik: olculen.masaIc[0],
    masaIcYukseklik: olculen.masaIc[1],
    panelDolgu: px('--panel-dolgu'),
    koseKaydirma: px('--kose-kaydirma'),
    masaBosluk: px('--masa-bosluk'),
    rafBosluk: px('--raf-bosluk'),
    metinPayi: px('--sigdirma-metin-payi'),
    sutun: sutun.sayi,
    tasGenislik: px('--tas-genislik'),
    tasYukseklik: px('--tas-yukseklik'),
    tabanGenislik: px('--tas-taban-genislik'),
    tabanYukseklik: px('--tas-taban-yukseklik'),
    olcek: degiskenOlcusu('--istaka-olcek', s).sayi,
    tavan: degiskenOlcusu('--istaka-olcek-tavan', s).sayi,
  };
}

/* --------------------------------------------------- saf formülün kendisi (tablo testi) */

test('bütçe formülü: plan §4\'ün iki eşitsizliği (tablo)', () => {
  // Yatay: N·w + 2·pd + 2·(w + 2·kk) + 2·mb ≤ W  →  w ≤ (W − 2·pd − 4·kk − 2·mb) / (N + 2)
  const yatay = yatayButce({
    masaIcGenislik: 1000, panelDolgu: 10, koseKaydirma: 5, masaBosluk: 20, sutun: 8,
  });
  assert.equal(yatay.pay, 1000 - 20 - 20 - 40);
  assert.equal(yatay.enCokTasGenislik, 920 / 10);
  // Formülün kendisi: tam sınırdaki taş gerçekten sığar (toplam = W).
  const w = yatay.enCokTasGenislik;
  assert.equal(8 * w + 2 * 10 + 2 * (w + 2 * 5) + 2 * 20, 1000);

  // Dikey: 4·h + rb + 2·pd + 4·kk + 2·mb + metinPayi ≤ H
  const dikey = dikeyButce({
    masaIcYukseklik: 500, rafBosluk: 8, panelDolgu: 10, koseKaydirma: 5, masaBosluk: 20, metinPayi: 92,
  });
  assert.equal(dikey.pay, 500 - (8 + 20 + 20 + 40 + 92));
  assert.equal(dikey.enCokTasYukseklik, 320 / 4);
  // Dikeyde köşe satırı BİR tanedir (alt satır ıstakanın kendisi), ama planın sadeleştirdiği
  // eşitsizlik yatayla aynı `4·kose-kaydirma` terimini taşır: bütçe bu kadar (2·kk = 10 px)
  // TEMKİNLİ kalır. Kanıtı aşağıdaki özdeşlik — gerçek yığın tam sınırda H − 2·kk eder.
  const h = dikey.enCokTasYukseklik;
  const baslik = 10;
  const yigin = (2 * h + 8 + baslik + 2 * 10) + (h + 2 * 5) + (h + (92 - baslik)) + 2 * 20;
  assert.equal(yigin, 500 - 2 * 5);
});

test('bütçe denetimi: sığan / taşan durum ve kalan boşluk ayrı okunur', () => {
  const temel = {
    masaIcGenislik: 1000, masaIcYukseklik: 500, panelDolgu: 10, koseKaydirma: 5,
    masaBosluk: 20, rafBosluk: 8, metinPayi: 92, sutun: 8,
  };
  const sigan = butceDenetimi({ ...temel, tasGenislik: 92, tasYukseklik: 80 });
  assert.equal(sigan.sigar, true);
  assert.equal(sigan.yatay.bos, 0);
  assert.equal(sigan.dikey.bos, 0);

  const yatayTasan = butceDenetimi({ ...temel, tasGenislik: 95, tasYukseklik: 80 });
  assert.equal(yatayTasan.sigar, false);
  assert.equal(yatayTasan.yatay.bos, -3);
  assert.equal(yatayTasan.dikey.bos, 0);

  const dikeyTasan = butceDenetimi({ ...temel, tasGenislik: 92, tasYukseklik: 84 });
  assert.equal(dikeyTasan.sigar, false);
  assert.equal(dikeyTasan.dikey.bos, -4);
});

test('en çok ölçek: iki yönün küçüğü, tavanla sınırlı, basamağa AŞAĞI yuvarlanır, 1\'in altına inmez', () => {
  const temel = {
    masaIcGenislik: 1000, masaIcYukseklik: 500, panelDolgu: 10, koseKaydirma: 5,
    masaBosluk: 20, rafBosluk: 8, metinPayi: 92, sutun: 8,
  };
  // Yatay 92/50 = 1,84 · dikey 80/50 = 1,60 → küçüğü 1,60; basamak 0,05 → 1,60.
  const dikeyBaglayici = enCokOlcek(temel, { tabanGenislik: 50, tabanYukseklik: 50, tavan: 2 });
  assert.equal(dikeyBaglayici.basamakli, 1.6);
  assert.ok(Math.abs(dikeyBaglayici.yatay - 1.84) < 1e-9);
  assert.ok(Math.abs(dikeyBaglayici.dikey - 1.6) < 1e-9);

  // Tavan bağlayıcı: iki yön de 2'nin üstünü verse bile ölçek tavanda durur.
  const bolBoyut = enCokOlcek(temel, { tabanGenislik: 20, tabanYukseklik: 20, tavan: 2 });
  assert.equal(bolBoyut.basamakli, 2);

  // Basamağa AŞAĞI yuvarlanır (1,53 → 1,50), bütçe aşılmasın.
  const ara = enCokOlcek({ ...temel, masaIcYukseklik: 494 }, { tabanGenislik: 50, tabanYukseklik: 50, tavan: 2 });
  assert.ok(Math.abs(ara.dikey - 1.57) < 1e-9);
  assert.equal(ara.basamakli, 1.55);

  // Bütçe 1'in altını verse bile ölçek 1'dir (clamp alt sınırı taban — ADR-022/3).
  const dar = enCokOlcek({ ...temel, masaIcYukseklik: 300 }, { tabanGenislik: 50, tabanYukseklik: 50, tavan: 2 });
  assert.ok(dar.ham < 1);
  assert.equal(dar.basamakli, 1);

  assert.equal(OLCEK_BASAMAGI, 0.05);
  assert.throws(() => olculenBoyut('yok-boyle-bir-boyut'), /ölçülen boyut yok/);
});

/* --------------------------------------------------- kabul-d: CSS'teki değerler bütçeyi sağlıyor */

test('kabul-d: plan §4\'ün iki eşitsizliği ölçülen BÜTÜN boyutlarda sağlanıyor', () => {
  for (const olculen of OLCULEN_MASA_KUTUSU) {
    const girdi = butceGirdisi(olculen);
    const sonuc = butceDenetimi(girdi);
    const nerede = `${olculen.ad} ${olculen.boyut.join('x')} (ölçek ${girdi.olcek})`;
    assert.ok(
      sonuc.yatay.bos >= 0,
      `${nerede}: YATAY bütçe aşıldı — taş ${girdi.tasGenislik}px,`
      + ` izin verilen ${sonuc.yatay.enCokTasGenislik.toFixed(1)}px`,
    );
    assert.ok(
      sonuc.dikey.bos >= 0,
      `${nerede}: DİKEY bütçe aşıldı — taş ${girdi.tasYukseklik}px,`
      + ` izin verilen ${sonuc.dikey.enCokTasYukseklik.toFixed(1)}px`,
    );
  }
});

test('kabul-d2: her kademenin ölçeği, kendi EN DAR kabul boyutunun bütçesinden büyük değil', () => {
  const kademeler = kademeSozlukleri(STIL_CSS, EKLER);
  // Bütçeyle ölçülen kademeler listesi CSS'teki kademelerin alt kümesidir ve adları birebir
  // tutar: `@media` sorgusu değişirse bu test kademeyi bulamaz ve ölçüm sessizce kaybolmaz.
  for (const ad of Object.keys(KADEME_KABUL_BOYUTLARI)) {
    assert.ok(kademeler.some((kademe) => kademe.ad === ad), `kademe CSS'te yok: ${ad}`);
  }
  // Bütçeye girmeyen bloklar — ikisinin de GEREKÇESİ var, liste birebir tutulur ki yeni bir
  // kademe sessizce denetimsiz kalmasın:
  //  · `@media (max-width: 480px)`: yalnız telefon DİKEYde geçerli, orada oyun alanı hiç çizilmez
  //    (ADR-012, "telefonu yan çevir") → sığdırılacak masa yok.
  //  · `@media (orientation: landscape) and (max-height: 700px)`: kısa yatay DÜZEN varyantı
  //    (tasokey#71, tasokey#70 planı §3) bir ÖLÇÜ kademesi değildir — `--istaka-olcek`i ve taban
  //    taş merdivenini geçersiz kılmaz, devralır. Kendi ölçeği olmadığı için bütçeye ayrı kademe
  //    olarak girmez; kabul boyutlarının ölçeği yine kendi ölçü kademelerinden ölçülür
  //    (900x600 → max-width 900, 800x360/844x390 → max-height 500). Varyantın bant yapısına özgü
  //    bütçe eşitsizliği tasokey#70 iş 2'de yazılır.
  const olculmeyen = kademeler.filter((kademe) => !(kademe.ad in KADEME_KABUL_BOYUTLARI));
  assert.deepEqual(olculmeyen.map((kademe) => kademe.ad), [
    '@media (max-width: 480px)',
    '@media (orientation: landscape) and (max-height: 700px)',
  ]);
  // Varyant bloğu gerçekten ölçek/taban YAZMIYOR (yoksa yukarıdaki gerekçe çürür ve kendi
  // ölçeğinin ölçülmesi gerekir — ADR-022/5).
  const varyantBlogu = medyaBloklari(STIL_CSS).find(
    (blok) => blok.sorgu === '@media (orientation: landscape) and (max-height: 700px)',
  );
  assert.ok(varyantBlogu, 'kısa yatay varyant bloğu CSS\'te yok');
  for (const ad of ['--istaka-olcek', '--tas-taban-genislik', '--tas-taban-yukseklik']) {
    assert.doesNotMatch(
      varyantBlogu.govde,
      new RegExp(`${ad}\\s*:`),
      `kısa yatay varyant bloğu ${ad} yazıyor — o zaman kendi ölçeği ölçülmek zorundadır`,
    );
  }

  for (const [kademeAdi, boyutAdlari] of Object.entries(KADEME_KABUL_BOYUTLARI)) {
    let enDar = null;
    for (const boyutAdi of boyutAdlari) {
      const girdi = butceGirdisi(olculenBoyut(boyutAdi));
      const sinir = enCokOlcek(girdi, {
        tabanGenislik: girdi.tabanGenislik,
        tabanYukseklik: girdi.tabanYukseklik,
        tavan: girdi.tavan,
      });
      assert.ok(
        girdi.olcek <= sinir.basamakli + 1e-9,
        `${kademeAdi} · ${boyutAdi}: ölçek ${girdi.olcek}, bütçenin izni ${sinir.basamakli}`,
      );
      if (enDar === null || sinir.basamakli < enDar.sinir) enDar = { boyutAdi, sinir: sinir.basamakli, olcek: girdi.olcek };
    }
    // Değer SEÇİLMEZ, ÖLÇÜLÜR: kademenin ölçeği en dar kabul boyutunun sınırını aşmamalı.
    assert.ok(
      enDar.olcek <= enDar.sinir + 1e-9,
      `${kademeAdi}: ölçek ${enDar.olcek}, en dar boyut ${enDar.boyutAdi} ${enDar.sinir} veriyor`,
    );
  }
});

test('kabul-d3: ölçülen taban taş ölçüsü, statik kademe çözümüyle AYNI (hangi @media kazanıyor?)', () => {
  // Tarayıcıda ölçülen `taban=WxH` (BUTCE satırı) ile `boyutSozlugu`nun çözdüğü değer aynı
  // olmalı: 844x390 gibi ÜÇ sorgunun birden uyduğu boyutta devralma sırası yanlışsa bütçe
  // başka bir kademenin sayılarıyla hesaplanır ve test sessizce yanıltır.
  for (const olculen of OLCULEN_MASA_KUTUSU) {
    const girdi = butceGirdisi(olculen);
    assert.deepEqual(
      [girdi.tabanGenislik, girdi.tabanYukseklik],
      [...olculen.taban],
      `${olculen.ad}: statik kademe çözümü ölçülen tabanla uyuşmuyor`,
    );
    // Görünen ölçü gerçekten taban × ölçektir (clamp alt/üst sınırı arada).
    assert.equal(girdi.tasGenislik, girdi.tabanGenislik * girdi.olcek);
    assert.equal(girdi.tasYukseklik, girdi.tabanYukseklik * girdi.olcek);
  }
});

test('kabul-d4: ölçülen boyut tablosu planın §4 kabul boyutlarını kapsar', () => {
  const adlar = OLCULEN_MASA_KUTUSU.map((satir) => satir.ad);
  assert.deepEqual(adlar, [...new Set(adlar)], 'ölçülen boyut tablosunda yinelenen ad var');
  const kabulAdlari = Object.values(KADEME_KABUL_BOYUTLARI).flat();
  assert.deepEqual([...kabulAdlari].sort(), [...adlar].sort());
  // Plan §5'in beş ölçüm boyutu + 900px kademesinin kabul boyutu.
  assert.deepEqual(
    OLCULEN_MASA_KUTUSU.map((satir) => satir.boyut.join('x')),
    ['1920x1080', '1280x800', '1180x820', '900x600', '844x390', '800x360'],
  );
  // Masa içerik kutusu her zaman görünümden KÜÇÜK (dolgu + ahşap çerçeve + üst çubuk payı).
  for (const satir of OLCULEN_MASA_KUTUSU) {
    assert.ok(satir.masaIc[0] < satir.boyut[0], `${satir.ad}: masa genişliği görünümden küçük değil`);
    assert.ok(satir.masaIc[1] < satir.boyut[1], `${satir.ad}: masa yüksekliği görünümden küçük değil`);
  }
});

test('kabul-d6: her kademenin ölçeği TARAYICIDA ÖLÇÜLEN tavanı aşmıyor (bağlayıcı denetim)', () => {
  // ADR-022/5: değer SEÇİLMEZ, ÖLÇÜLÜR. Bütçe (kabul-d2) bir ÜST SINIRDIR ve her boyutta
  // gerçeğin üstünde kaldı; bağlayıcı olan `yerlesim-cakisma.olcum.js --arama` ölçümüdür.
  for (const [kademeAdi, boyutAdlari] of Object.entries(KADEME_KABUL_BOYUTLARI)) {
    const tavan = olculenTavan(kademeAdi, boyutAdlari);
    const olcek = butceGirdisi(olculenBoyut(boyutAdlari[0])).olcek;
    // Kademenin bütün kabul boyutları aynı @media bloğundan okur → ölçek hepsinde aynı olmalı.
    for (const boyutAdi of boyutAdlari) {
      assert.equal(
        butceGirdisi(olculenBoyut(boyutAdi)).olcek, olcek,
        `${kademeAdi} · ${boyutAdi}: aynı kademenin kabul boyutları farklı ölçek çözüyor`,
      );
    }
    assert.ok(
      olcek <= tavan + 1e-9,
      `${kademeAdi}: ölçek ${olcek}, ölçülen tavan ${tavan}`
      + ` (çakışma çıkar — is/tasokey-68/ekran/olcum-el-*.png "ARAMA enCok" satırı)`,
    );
  }
  // Ölçüm tablosu, bütçenin ölçtüğü boyutların HEPSİNİ kapsıyor (biri eklenince sessizce
  // denetimsiz kalmasın).
  assert.deepEqual(
    Object.keys(OLCULEN_OLCEK_TAVANI).sort(),
    OLCULEN_MASA_KUTUSU.map((satir) => satir.ad).sort(),
  );
  // Bilinmeyen boyut/durum sessizce `undefined` ile geçmemeli.
  assert.throws(() => olculenTavan('x', ['yok-boyle']), /ölçülen ölçek tavanı yok/);
  assert.throws(() => olculenTavan('x', ['masaustu'], ['yok']), /ölçülen durum yok/);
  // Tabanı zaten ihlalli boyut ölçeği 1'de tutar (800x360 `el`: buyumez0 yok).
  assert.equal(olculenTavan('x', ['telefon-kucuk']), 1);
});

test('kabul-d5: metin payı ölçülen tek değişkendir (kuralların içine sayı yazılmaz)', () => {
  // Değişken CSS'te px olarak yazılı ve bütün ölçüm boyutlarında çözülebiliyor.
  for (const olculen of OLCULEN_MASA_KUTUSU) {
    const olcu = degiskenOlcusu('--sigdirma-metin-payi', sozluk(olculen));
    assert.equal(olcu.birim, 'px', `${olculen.ad}: --sigdirma-metin-payi px değil`);
    assert.ok(olcu.sayi > 0, `${olculen.ad}: --sigdirma-metin-payi pozitif değil`);
  }
  // Yatay+kısa kademede `.yigin` boşluğu daraldığı için pay KÜÇÜLÜR (ölçüldü: 85 → 79).
  const genis = degiskenOlcusu('--sigdirma-metin-payi', sozluk(olculenBoyut('masaustu'))).sayi;
  const kisa = degiskenOlcusu('--sigdirma-metin-payi', sozluk(olculenBoyut('telefon-kucuk'))).sayi;
  assert.ok(kisa < genis, 'yatay+kısa kademede metin payı küçülmüyor');
});
