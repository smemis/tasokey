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
  butceDenetimi, dikeyButce, enCokOlcek, olculenBoyut, olculenTavan, olculenVaryant,
  varyantDikeyButce, varyantUstBantYatay, varyantYatayButce, yatayButce,
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
  // Kısa yatay DÜZEN VARYANTININ terimleri yalnız varyant ETKİNKEN tanımlıdır (kapatma anahtarı =
  // yalıtım: bütün bildirimleri bölgenin içinde durur), bu yüzden orada okunur.
  const varyant = olculenVaryant(olculen.ad);
  return {
    varyant,
    masaIcGenislik: olculen.masaIc[0],
    masaIcYukseklik: olculen.masaIc[1],
    panelDolgu: px('--panel-dolgu'),
    koseKaydirma: px('--kose-kaydirma'),
    masaBosluk: px('--masa-bosluk'),
    rafBosluk: px('--raf-bosluk'),
    metinPayi: px('--sigdirma-metin-payi'),
    // tasokey#85 (ADR-028): dizme düğmelerinin ıstaka başlığı satırına eklediği ÖLÇÜLEN yükseklik.
    // Varyantta da okunur (orada 0'dır) — terim her kademede bütçenin içindedir.
    rafDugmePayi: px('--sigdirma-raf-dugme-payi'),
    cubukKalinlik: px('--rakip-raf-kalinlik'),
    ustCubukGenislik: px('--rakip-ust-genislik'),
    yanMetinPayi: varyant ? px('--sigdirma-yan-metin-payi') : null,
    rafBaslikPayi: varyant ? px('--sigdirma-raf-baslik-payi') : null,
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

  // tasokey#85 (ADR-028): DÜĞME SATIRI terimi dikey eşitsizliğe girer — payı birebir o kadar
  // küçültür ve taş boyundan payın dörtte biri kadar düşer. Terim verilmeyen çağrı (yukarıdaki)
  // eski eşitsizliğin kendisidir (varsayılan 0): iki hâl birlikte ölçülür.
  const dugmeli = dikeyButce({
    masaIcYukseklik: 500, rafBosluk: 8, panelDolgu: 10, koseKaydirma: 5, masaBosluk: 20,
    metinPayi: 92, rafDugmePayi: 12,
  });
  assert.equal(dugmeli.pay, dikey.pay - 12);
  assert.equal(dugmeli.enCokTasYukseklik, dikey.enCokTasYukseklik - 12 / 4);
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
  // Bütçeye girmeyen bloklar — hepsinin GEREKÇESİ var, liste birebir tutulur ki yeni bir kademe
  // sessizce denetimsiz kalmasın:
  //  · `@media (max-width: 900px)` ve `@media (orientation: landscape) and (max-height: 500px)`:
  //    kabul boyutları yatay olduğu için orada artık kısa yatay DÜZEN VARYANTI kazanıyor (ölçek
  //    varyantın bloklarından geliyor, aşağıda). Bu iki bloğun ölçeği VARYANTSIZ hâlin ölçüsüdür
  //    (tasokey#68'de ölçüldü: 1,05 ve 1) ve kapatma anahtarının ta kendisidir — bölge silinince
  //    düzen de ölçek de tasokey#68'e döner. Kabul boyutu kalmadığı için ayrı kademe olarak
  //    ölçülmezler (tasokey#72).
  //  · `@media (max-width: 480px)`: yalnız telefon DİKEYde geçerli, orada oyun alanı hiç çizilmez
  //    (ADR-012, "telefonu yan çevir") → sığdırılacak masa yok.
  const olculmeyen = kademeler.filter((kademe) => !(kademe.ad in KADEME_KABUL_BOYUTLARI));
  assert.deepEqual(olculmeyen.map((kademe) => kademe.ad), [
    '@media (max-width: 900px)',
    '@media (max-width: 480px)',
    '@media (orientation: landscape) and (max-height: 500px)',
  ]);
  // Varyantın İKİ bloğu da ölçek YAZAR (ADR-022/5: kendi kademesi olan her blok ölçülür) ama taban
  // taş merdivenine DOKUNMAZ — varyantın kazancı ölçü değil YAPIDIR (tasokey#71), ölçek o yapının
  // ölçülen sonucudur.
  for (const sorgu of [
    '@media (orientation: landscape) and (max-height: 700px)',
    '@media (orientation: landscape) and (min-height: 501px) and (max-height: 700px)',
  ]) {
    const blok = medyaBloklari(STIL_CSS).find((aday) => aday.sorgu === sorgu);
    assert.ok(blok, `kısa yatay varyant bloğu CSS'te yok: ${sorgu}`);
    assert.match(blok.govde, /--istaka-olcek\s*:/, `${sorgu}: ölçek yazmıyor`);
    for (const ad of ['--tas-taban-genislik', '--tas-taban-yukseklik']) {
      assert.doesNotMatch(
        blok.govde,
        new RegExp(`${ad}\\s*:`),
        `${sorgu}: ${ad} yazıyor — varyant bir ÖLÇÜ kademesi değildir, taban merdiveni devralınır`,
      );
    }
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
  // tasokey#68'de 800x360'ın tabanı ZATEN ihlalliydi (`buyumez0` yok) → tavan 1'de kalıyordu;
  // kısa yatay düzen varyantı o iki çakışmayı kaldırdı, ölçüm 1,95 dedi (tasokey#72).
  assert.equal(olculenTavan('x', ['telefon-kucuk']), 1.95);
  // Bağlayıcı olan en dar boyuttur: 844x390 2,00 verse de iki boyut aynı kademeyi paylaşsaydı
  // 800x360'ın 1,95'inde kalırlardı. (tasokey#72'de kademe bölündü — bkz. KADEME_KABUL_BOYUTLARI.)
  assert.equal(olculenTavan('x', ['telefon-yatay', 'telefon-kucuk']), 1.95);
  // `durum=rakip` daha dar bir sınır verir (el sonunda açılan rakip ıstakası) — ADR-022/6.
  // tasokey#72: madde 8'in muaf küçültmesinden (0,45) ve madde 10'dan sonra 900x600'de
  // 1,10 → 1,25; iki durumun tavanı da artık YATAY sayfa taşmasıdır (çakışma değil).
  assert.equal(olculenTavan('x', ['kademe-900'], ['el', 'rakip']), 1.25);
  // ÜÇÜNCÜ TERİM (madde 9): taşma tavanı da bağlar. Masaüstünde çakışma 1,85'te durduğu için
  // taşma (2,00) görünmez; telefon dilimlerinde madde 10 çakışmayı kaldırınca BAĞLAYICI olan odur.
  // tasokey#73: şerit daralıp kalan yer masaya geçince dikey taşma daha geç başladı (1,30 → 1,45
  // ve 1,50 → 1,65); taşan öğeler aynı kaldı (alt iki köşenin sayaç kutuları).
  assert.equal(olculenTavan('x', ['telefon-kucuk'], ['rakip']), 1.45);
  assert.equal(olculenTavan('x', ['telefon-yatay'], ['rakip']), 1.65);
  // `tasma0` eksik bir kayıt sessizce sonsuz sayılmaz (üçüncü terim denetimsiz kalmasın).
  assert.throws(
    () => olculenTavan('x', ['masaustu'], ['el'], { masaustu: { el: { buyumez0: 1.85 } } }),
    /ölçülen taşma tavanı yok/,
  );
});

/* ------------------------------------ kabul-d7…d9: kısa yatay DÜZEN VARYANTININ bütçesi (#72) */

/** Varyantın ETKİN olduğu ölçülen boyutlar (bant sayısı ÖLÇÜLDÜ: dört bant). */
const VARYANT_BOYUTLARI = OLCULEN_MASA_KUTUSU
  .filter((satir) => olculenVaryant(satir.ad))
  .map((satir) => satir.ad);

test('kabul-d7: varyantın ETKİN olduğu boyutlar ÖLÇÜLEN bant sayısından okunur (dört bant)', () => {
  // Bant ölçüleri 1. çekim turunda ölçüldü (`BUTCE-V bant=` satırı). Varsayım değil ölçüm: masa
  // dört banda bu üç boyutta ayrılıyor, masaüstü üçünde üç bant kalıyor (gerilemesizlik).
  assert.deepEqual(VARYANT_BOYUTLARI, ['kademe-900', 'telefon-yatay', 'telefon-kucuk']);
  for (const satir of OLCULEN_MASA_KUTUSU) {
    const girdi = butceGirdisi(satir);
    const varyant = olculenVaryant(satir.ad);
    assert.equal(satir.bant.length, varyant ? 4 : 3, `${satir.ad}: bant sayısı`);
    // Bantlar CSS'ten hesaplanabilir: üst çubuk bandı `auto` (= çubuğun kalınlığı), kalan üç bant
    // `1fr 2fr 1fr` → ölçülen sayılar değişkenlerden ÇIKAR (çıplak sayı doğrulaması değil).
    const bosluk = girdi.masaBosluk;
    const ustBant = varyant ? girdi.cubukKalinlik : 0;
    const esnek = satir.masaIc[1] - ustBant - (satir.bant.length - 1) * bosluk;
    const beklenen = (varyant ? [ustBant] : []).concat([esnek / 4, esnek / 2, esnek / 4]);
    assert.deepEqual(
      satir.bant.map((olcu) => Math.round(olcu * 100) / 100),
      beklenen.map((olcu) => Math.round(olcu * 100) / 100),
      `${satir.ad}: ölçülen bantlar 1fr 2fr 1fr modeliyle uyuşmuyor`,
    );
  }
});

test('kabul-d8: varyant bütçesinin İKİ eşitsizliği üç varyant boyutunda değişkenlerden sağlanıyor', () => {
  for (const boyutAdi of VARYANT_BOYUTLARI) {
    const olculen = olculenBoyut(boyutAdi);
    const girdi = butceGirdisi(olculen);
    const nerede = `${boyutAdi} ${olculen.boyut.join('x')} (ölçek ${girdi.olcek})`;
    // Terimlerin hepsi CSS değişkeni; ölçülen iki terim de CSS'te px olarak YAZILI (tahmin yok).
    assert.equal(girdi.varyant, true, `${nerede}: varyant girdisi değil`);
    assert.ok(girdi.yanMetinPayi > 0, `${nerede}: --sigdirma-yan-metin-payi yok/pozitif değil`);
    assert.ok(girdi.rafBaslikPayi > 0, `${nerede}: --sigdirma-raf-baslik-payi yok/pozitif değil`);

    const yatay = varyantYatayButce(girdi);
    assert.ok(
      yatay.enCokTasGenislik >= girdi.tasGenislik,
      `${nerede}: YATAY varyant bütçesi aşıldı — taş ${girdi.tasGenislik}px,`
      + ` izin verilen ${yatay.enCokTasGenislik.toFixed(1)}px`,
    );
    const dikey = varyantDikeyButce(girdi);
    assert.ok(
      dikey.enCokTasYukseklik >= girdi.tasYukseklik,
      `${nerede}: DİKEY varyant bütçesi aşıldı — taş ${girdi.tasYukseklik}px,`
      + ` izin verilen ${dikey.enCokTasYukseklik.toFixed(1)}px`,
    );
    // Aynı denetim tek kapıdan (butceDenetimi varyantı girdisinden tanır).
    assert.equal(butceDenetimi(girdi).sigar, true, `${nerede}: butceDenetimi varyantı sığdıramadı`);

    // Varyantın kazancı YAPISALDIR: dikey zincir dört taş boyu yerine ÜÇ taşır. Taban eşitsizlik
    // aynı boyutta aynı ölçeğe izin VERMEZDİ — ölçülen kazancın kaynağı bu (ADR-022 Sonuçlar/e'nin
    // "yatay+kısa kademede kazanç yok" sonucu varyantla değişti).
    assert.ok(
      dikey.enCokTasYukseklik > dikeyButce(girdi).enCokTasYukseklik,
      `${nerede}: varyantın dikey bütçesi taban düzeninkinden geniş değil`,
    );
  }
});

test('kabul-d9: üst bandın ek yatay denetimi — bağlayıcı satır ıstaka satırıdır', () => {
  for (const boyutAdi of VARYANT_BOYUTLARI) {
    const girdi = butceGirdisi(olculenBoyut(boyutAdi));
    const ust = varyantUstBantYatay(girdi);
    // (1) Üst bant (rakip çubuğu + iki köşe sütunu + iki ızgara boşluğu) masaya sığıyor.
    assert.ok(
      ust.bos >= 0,
      `${boyutAdi}: ÜST BANT yatayda taşıyor — gereken ${ust.gereken.toFixed(1)}px,`
      + ` masa ${girdi.masaIcGenislik}px`,
    );
    // (2) Üst çubuk ıstakayla AYNI formülden gelir (tek kaynak): N·w + 2·panel-dolgu.
    assert.equal(
      girdi.ustCubukGenislik,
      girdi.sutun * girdi.tasGenislik + 2 * girdi.panelDolgu,
      `${boyutAdi}: --rakip-ust-genislik ıstaka formülünden sapmış`,
    );
    // (3) Bağlayıcı olan ıstaka satırıdır ve farkı TAM OLARAK başlığın yatay payı kadardır:
    // varyantta "Istakam" taşların yanına geçtiği için orta sütun o kadar genişler (karar maddesi 4).
    assert.ok(
      ust.bos > ust.istakaSatiriBos * (girdi.sutun + 2) - 1e-9,
      `${boyutAdi}: üst bant ıstaka satırından dar — bağlayıcı satır değişmiş`,
    );
    assert.ok(
      Math.abs(ust.bos - (ust.istakaSatiriBos * (girdi.sutun + 2) + ust.fark)) < 1e-9,
      `${boyutAdi}: üst bant ile ıstaka satırı arasındaki fark raf-boşluk + başlık payı değil`,
    );
    assert.equal(ust.fark, girdi.rafBosluk + girdi.rafBaslikPayi);
  }
});

test('kabul-d10: kademenin ölçeği İKİ DURUMUN ölçülen tavanlarının en küçüğüdür', () => {
  // tasokey#72 — ADR-022/5'in "SEÇİLMEZ, ÖLÇÜLÜR"ü tek bir kurala bağlandı: değer, kademenin bütün
  // kabul boyutlarında `durum=el` VE `durum=rakip` ölçümlerinin en küçüğüdür. Böylece iş 1'in
  // "durum=rakip'te YENİ çakışma 0" ölçütü de kuralın içinde kalır ve hiçbir kademe için ayrı
  // gerekçe yazılmaz.
  //
  // tasokey#68'de bu kural YAZILAMAZDI: masaüstü üç kademede `rakip` tavanı `el`in çok altındaydı
  // (1,85 / 1,30) ve seçim `el`e dayanıyordu. ADR-022/6 `--rakip-acik-tas-*`ı ölçekten ayırınca
  // o fark kapandı — bu turda ölçüldü: masaüstü üç boyutta iki durum AYNI (1,85 / 1,35 / 1,40).
  // Fark yalnız kısa yatay varyantın üç diliminde sürüyor (tasokey#73 ölçümü: el 1,95 / 2,00 / 1,25
  // ↔ rakip 1,45 / 1,65 / 1,25); ADR-022 madde 8 ve 10'dan sonra oradaki bağlayıcı terim artık
  // çoğunlukla çakışma değil SAYFA TAŞMASIDIR (madde 9'un üçüncü terimi).
  for (const [kademeAdi, boyutAdlari] of Object.entries(KADEME_KABUL_BOYUTLARI)) {
    const olcek = butceGirdisi(olculenBoyut(boyutAdlari[0])).olcek;
    assert.equal(
      olcek,
      olculenTavan(kademeAdi, boyutAdlari, ['el', 'rakip']),
      `${kademeAdi}: ölçek iki durumun ölçülen en küçük tavanı değil`,
    );
  }
  // Masaüstü kademelerinde iki durum AYNI tavanı veriyor → değer `el` okumasıyla da aynı kalır
  // (tasokey#68'in 1,85 / 1,35 değerleri BİREBİR değişmedi).
  for (const kademeAdi of ['temel (:root)', '@media (max-width: 1300px)']) {
    const boyutAdlari = KADEME_KABUL_BOYUTLARI[kademeAdi];
    assert.equal(
      olculenTavan(kademeAdi, boyutAdlari, ['el', 'rakip']),
      olculenTavan(kademeAdi, boyutAdlari, ['el']),
      `${kademeAdi}: iki durumun tavanı ayrışmış`,
    );
  }
  assert.equal(butceGirdisi(olculenBoyut('masaustu')).olcek, 1.85);
  assert.equal(butceGirdisi(olculenBoyut('dizustu')).olcek, 1.35);
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

  // tasokey#72 — varyantın iki ölçülen terimi YALNIZ varyant etkinken tanımlı (kapatma anahtarı =
  // yalıtım: bölgenin dışına sızmaz) ve orada px olarak yazılı.
  for (const ad of ['--sigdirma-yan-metin-payi', '--sigdirma-raf-baslik-payi']) {
    for (const satir of OLCULEN_MASA_KUTUSU) {
      if (olculenVaryant(satir.ad)) {
        const olcu = degiskenOlcusu(ad, sozluk(satir));
        assert.equal(olcu.birim, 'px', `${satir.ad}: ${ad} px değil`);
        assert.ok(olcu.sayi > 0, `${satir.ad}: ${ad} pozitif değil`);
      } else {
        assert.throws(
          () => degiskenOlcusu(ad, sozluk(satir)),
          /tanımlı değil/,
          `${satir.ad}: ${ad} varyantın dışında tanımlı (bölge sızıyor)`,
        );
      }
    }
  }
});
