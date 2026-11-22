// Testler için birim farkındalı CSS ölçü çözümleyicisi. Kaynağı `masa-duzeni-cubuk-deste-kose.test.js`
// (tasokey#33, denetçi bulgusu tur 2): CSS'te calc() içinde uzunlukla birimsiz sayı TOPLANAMAZ
// (`12 * 58px + 11 * 0` geçersizdir) ve değişkeni kullanan bildirim tamamen düşer — metin eşleştiren
// testler bunu göremez, bu yüzden ifade gerçekten hesaplanır.
// tasokey#39'da buraya taşındı: hedef alanı testi (ADR-014) aynı çözümleyiciyi kademe kademe
// kullanıyor; aynı iş iki dosyada yazılmasın (tek kaynak).
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

export class BirimHatasi extends Error {}

/** CSS metnini yorumlardan arındırır (açıklamada geçen değişken adı "ikinci tanım" sayılmasın). */
export function yorumlariAt(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Bir CSS seçicisinin gövdesi (ilk eşleşen kural; yorumlar atılmış metinde aranır). Seçici listesi
 * virgülle yazılmış olabilir (`.kose::after, #yerDestesi::after { … }`) — bu yüzden liste
 * ayrıştırılır, metin eşleştirilmez. `hedef-alani.test.js` içinde yazılmıştı (tasokey#39);
 * tasokey#47'de buraya taşındı: üç test dosyası aynı soruyu soruyor ("bu seçicinin bildirimleri
 * neler?"), aynı ayrıştırıcı üç yerde yazılmasın.
 */
export function kuralGovdesi(css, secici) {
  return kuralGovdeleri(css, secici)[0] ?? null;
}

/**
 * Bir seçiciye ait BÜTÜN kural gövdeleri (geliş sırasıyla). Aynı seçici birden çok kuralda
 * geçebilir — bildirimler amaçlarına göre ayrı kurallara bölünmüş olabilir (ör. `.tas.surukleniyor`
 * konum/kademe kuralı + `.tas.surukleniyor, .tas-arka.surukleniyor` gizleme kuralı, ADR-021).
 * "Şu bildirim tek yerde mi?" sorusu yalnız bütün gövdelere bakarak ölçülür: `kuralGovdesi` ilk
 * eşleşmeyi döndürdüğü için sonraki kurallardaki bildirimi göremez (tasokey#62).
 */
export function kuralGovdeleri(css, secici) {
  const govdeler = [];
  for (const [, seciciler, govde] of yorumlariAt(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const liste = seciciler.split(',').map((parca) => parca.trim().replace(/\s+/g, ' '));
    if (liste.includes(secici)) govdeler.push(govde);
  }
  return govdeler;
}

/** Her `@media` bloğunun `{ sorgu, govde }` listesi (iç içe bloklar parantez dengesiyle). */
export function medyaBloklari(css) {
  const metin = yorumlariAt(css);
  const bloklar = [];
  for (let bas = metin.indexOf('@media'); bas !== -1; bas = metin.indexOf('@media', bas + 1)) {
    const acilis = metin.indexOf('{', bas);
    if (acilis === -1) break;
    bloklar.push({
      sorgu: metin.slice(bas, acilis).trim().replace(/\s+/g, ' '),
      govde: blokGovdesi(metin, acilis).govde,
    });
  }
  return bloklar;
}

/** Metindeki bütün özel değişken bildirimleri: ad → [değer, …] (geliş sırasıyla). */
export function degiskenleriTopla(metin) {
  const sozluk = new Map();
  for (const [, ad, deger] of metin.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    if (!sozluk.has(ad)) sozluk.set(ad, []);
    sozluk.get(ad).push(deger.trim().replace(/\s+/g, ' '));
  }
  return sozluk;
}

/** Birden çok sözlüğü birleştirir; SONRAKİ sözlük öncekini ezer (kademe geçersiz kılması). */
export function sozlukleriBirlestir(...sozlukler) {
  const birlesik = new Map();
  for (const sozluk of sozlukler) {
    for (const [ad, degerler] of sozluk) birlesik.set(ad, degerler);
  }
  return birlesik;
}

/** `{ ... }` bloğunu süslü parantez dengesiyle çıkarır; `basIndex` açılış parantezini gösterir. */
function blokGovdesi(metin, basIndex) {
  let derinlik = 0;
  for (let i = basIndex; i < metin.length; i += 1) {
    if (metin[i] === '{') derinlik += 1;
    else if (metin[i] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return { govde: metin.slice(basIndex + 1, i), son: i };
    }
  }
  return { govde: metin.slice(basIndex + 1), son: metin.length };
}

/**
 * Duyarlı kademelerin değişken sözlükleri: temel `:root` + her `@media` bloğunun `:root`
 * geçersiz kılmaları. `[{ ad, sozluk }, …]` döner (ad = kademenin okunur adı).
 * `ekler`: CSS dışından gelen değişkenler (ör. ekran.js'teki --raf-sutun-sayisi).
 */
export function kademeSozlukleri(css, ekler = new Map()) {
  const metin = yorumlariAt(css);

  const kokBasi = metin.indexOf(':root');
  if (kokBasi === -1) throw new Error('CSS içinde :root bloğu yok');
  const temel = degiskenleriTopla(blokGovdesi(metin, metin.indexOf('{', kokBasi)).govde);
  const kademeler = [{ ad: 'temel (:root)', sozluk: sozlukleriBirlestir(temel, ekler) }];

  for (let bas = metin.indexOf('@media'); bas !== -1; bas = metin.indexOf('@media', bas + 1)) {
    const acilis = metin.indexOf('{', bas);
    if (acilis === -1) break;
    const sorgu = metin.slice(bas, acilis).trim().replace(/\s+/g, ' ');
    const { govde } = blokGovdesi(metin, acilis);
    const icKok = govde.indexOf(':root');
    if (icKok === -1) continue;
    const icGovde = blokGovdesi(govde, govde.indexOf('{', icKok)).govde;
    kademeler.push({
      ad: sorgu,
      sozluk: sozlukleriBirlestir(temel, degiskenleriTopla(icGovde), ekler),
    });
  }

  return kademeler;
}

/** İfadedeki var(--x) çağrılarını sözlükteki değerle değiştirir (iç içe değişkenler dahil). */
export function varCoz(ifade, sozluk, derinlik = 0) {
  if (derinlik > 12) throw new Error('var() döngüsü');
  return ifade.replace(/var\((--[\w-]+)(?:\s*,[^)]*)?\)/g, (_, ad) => {
    const degerler = sozluk.get(ad);
    if (!degerler) throw new Error(`${ad} hiçbir yerde tanımlı değil`);
    return `(${varCoz(degerler[0], sozluk, derinlik + 1)})`;
  });
}

/** `{sayi, birim}` döndürür; birim '' (saf sayı), 'px', '%', 'rem'… */
export function ifadeHesapla(ham) {
  const metin = ham.replace(/\bcalc\(/g, '(');
  let i = 0;
  const bosluk = () => { while (i < metin.length && /\s/.test(metin[i])) i += 1; };

  function etiket(birim) { return birim === '' ? 'birimsiz sayı' : birim; }

  function birimselDeger() {
    bosluk();
    if (metin[i] === '(') {
      i += 1;
      const ic = toplam();
      bosluk();
      if (metin[i] !== ')') throw new Error('kapanmayan parantez');
      i += 1;
      return ic;
    }
    const eslesme = /^[-+]?(?:\d+\.?\d*|\.\d+)([a-z%]*)/i.exec(metin.slice(i));
    if (!eslesme) throw new Error(`sayısal olmayan belirteç: ${metin.slice(i, i + 16)}`);
    i += eslesme[0].length;
    return { sayi: Number.parseFloat(eslesme[0]), birim: eslesme[1] || '' };
  }

  function carpim() {
    let sol = birimselDeger();
    for (;;) {
      bosluk();
      const op = metin[i];
      if (op !== '*' && op !== '/') return sol;
      i += 1;
      const sag = birimselDeger();
      if (op === '*') {
        if (sol.birim !== '' && sag.birim !== '') {
          throw new BirimHatasi(`calc() içinde ${sol.birim} ile ${sag.birim} çarpılıyor`);
        }
        sol = { sayi: sol.sayi * sag.sayi, birim: sol.birim || sag.birim };
      } else {
        if (sag.birim !== '') throw new BirimHatasi(`calc() içinde ${sag.birim} ile bölünüyor`);
        sol = { sayi: sol.sayi / sag.sayi, birim: sol.birim };
      }
    }
  }

  function toplam() {
    let sol = carpim();
    for (;;) {
      bosluk();
      const op = metin[i];
      if (op !== '+' && op !== '-') return sol;
      i += 1;
      const sag = carpim();
      if (sol.birim !== sag.birim) {
        throw new BirimHatasi(
          `calc() içinde ${etiket(sol.birim)} ile ${etiket(sag.birim)} toplanıyor — tarayıcı bildirimi düşürür`,
        );
      }
      sol = { sayi: op === '+' ? sol.sayi + sag.sayi : sol.sayi - sag.sayi, birim: sol.birim };
    }
  }

  const sonuc = toplam();
  bosluk();
  if (i < metin.length) throw new Error(`çözümlenemeyen artık: ${metin.slice(i, i + 16)}`);
  return sonuc;
}

/** Değişkeni verilen sözlükte çözüp hesaplar; `{sayi, birim}`. */
export function degiskenOlcusu(ad, sozluk) {
  const degerler = sozluk.get(ad);
  if (!degerler) throw new Error(`${ad} tanımlı değil`);
  return ifadeHesapla(varCoz(degerler[0], sozluk));
}

/** Metindeki her `calc(...)` ifadesini parantez dengesiyle çıkarır. */
export function calcIfadeleri(css) {
  const liste = [];
  for (let bas = css.indexOf('calc('); bas !== -1; bas = css.indexOf('calc(', bas + 1)) {
    let derinlik = 0;
    let son = bas + 4;
    for (; son < css.length; son += 1) {
      if (css[son] === '(') derinlik += 1;
      else if (css[son] === ')') {
        derinlik -= 1;
        if (derinlik === 0) break;
      }
    }
    liste.push(css.slice(bas, son + 1));
  }
  return liste;
}
