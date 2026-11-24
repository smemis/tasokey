import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dagit } from '../docs/cekirdek/dagitim.js';
import { elDokumu, dokumGruplari, dokumSirasi } from '../docs/cekirdek/cozucu.js';
import {
  RAF_SUTUN_SAYISI, rafYerlesimiGuncelle, yerlesimDiz,
} from '../docs/arayuz/raf.js';
import {
  degiskenOlcusu, kademeSozlukleri, kuralGovdesi, medyaBloklari, sozlukleriBirlestir,
} from './yardimci/css-olcu.js';

// tasokey#86 (üst iş tasokey#84 planı §4 iş 2) — "El bitince dört ıstaka da gruplu dizili".
// İstek (Sahip): el bitip sonuç penceresi açıldığında kendi ıstakam perler → çiftler → per dışı
// kalanlar sırasında, gruplar arasında bir boş yuva ile dursun; üç rakibin açılan taşlarında da
// aynı sırayla gruplar arası görünür boşluk olsun. El SÜRERKEN kendi dizilimim hiç değişmesin.
//
// Kurallar İş 1'in kapılarında (ADR-028): grupların içeriği/sırası `cekirdek/cozucu.js`
// (`dokumGruplari`), yuvalara yerleşim `arayuz/raf.js` (`yerlesimDiz`). Bu iş yalnız ikisini
// el sonunda BİR KEZ bağlar (`ekran.js durumuIlerlet`) ve rakip ızgarasına ayraç hücresi koyar.
// `ekran.js` modül yüklenirken `baslat()` çağırdığı için node'da içe alınamaz → arayüz tarafı
// kaynak taramasıyla, bileşim ise saf modüllerle (gerçek dağıtılmış ellerde) ölçülür.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// "Kaç kez çağrılıyor" sayımı KODU sayar, açıklama satırlarını saymaz (arayüz JS'i yalnız `//`).
const EKRAN_JS_KOD = EKRAN_JS.split('\n').filter((satir) => !satir.trim().startsWith('//')).join('\n');

/** Adı verilen işlevin gövdesi (arayüz JS'indeki tek düzeyli `function ad(...) { … }` biçimi). */
function islevGovdesi(kaynak, ad) {
  const eslesme = kaynak.match(new RegExp(`function ${ad}\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  return eslesme ? eslesme[2] : null;
}

const kacKez = (kaynak, desen) => (kaynak.match(desen) ?? []).length;

const TOHUMLAR = Object.freeze([4242, 1, 2, 3, 7, 537, 2447, 12345, 91000, 90000]);

/** Gerçek dağıtılmış eller: `[{ tohum, oyuncu, el, okeyTasi, gosterge }]` (10 tohum × 4 koltuk). */
function gercekEller() {
  const eller = [];
  for (const tohum of TOHUMLAR) {
    const dagitim = dagit(tohum);
    for (const [oyuncu, el] of dagitim.eller.entries()) {
      eller.push({
        tohum, oyuncu, el, okeyTasi: dagitim.okeyTasi, gosterge: dagitim.gosterge,
      });
    }
  }
  return eller;
}

/** `ekran.js durumuIlerlet`in el sonunda kurduğu bileşimin birebir aynısı (tek yerde yazılı). */
function elSonuYerlesimi({ el, okeyTasi, gosterge }) {
  const dokum = elDokumu(el, okeyTasi, undefined, gosterge);
  const gruplar = dokumGruplari(dokum).map((grup) => grup.map((tas) => tas.id));
  return { dokum, gruplar, yerlesim: yerlesimDiz(gruplar) };
}

const satir = (index) => Math.floor(index / RAF_SUTUN_SAYISI);

/** Yerleşimdeki dolu yuvaların `[yuvaIndeksi, tasId]` listesi, yuva sırasında. */
function doluYuvalar(yerlesim) {
  return yerlesim
    .map((id, index) => [index, id])
    .filter(([, id]) => id !== null);
}

// --- 1. ASIL KABUL: el sonunda kendi ıstakam gruplu ve gruplar arası boşlukla dizili ----------

test('ASIL KABUL: el sonu yerleşimi perler → çiftler → per dışı sırasını birebir koruyor', () => {
  for (const kayit of gercekEller()) {
    const { dokum, yerlesim } = elSonuYerlesimi(kayit);
    const yerlesen = doluYuvalar(yerlesim).map(([, id]) => id);
    assert.deepEqual(
      yerlesen,
      dokumSirasi(dokum).map((tas) => tas.id),
      `tohum ${kayit.tohum} oyuncu ${kayit.oyuncu}: dizilim çekirdeğin döküm sırasından sapıyor`,
    );
    assert.equal(yerlesen.length, kayit.el.length, 'yerleşim taş düşürmüş ya da çoğaltmış');
    assert.equal(new Set(yerlesen).size, yerlesen.length, 'aynı taş iki yuvada');
  }
});

test('ASIL KABUL: gruplar bitişik bloklar hâlinde durur, iki grup arasında boşluk ya da satır sonu var', () => {
  // Sahip\'in gözünden ölçülen sav: "hangi taşın hangi pere/çifte girdiği tek bakışta okunur".
  // ADR-028/3: aralıklı dizim 24 yuvaya sığmazsa `raf.js` boşluksuz paketlemeye düşer (taş
  // düşürmek yasak) — o durumda ayrım görünmez; hangi ellerde böyle olduğu ÖLÇÜLÜR (aşağıdaki
  // sayım testi) ve raporda durur. Burada ölçülen: aralıklı dizim kullanıldığında ayrım var.
  let aralikliSayisi = 0;
  for (const kayit of gercekEller()) {
    const { gruplar, yerlesim } = elSonuYerlesimi(kayit);
    const dolu = doluYuvalar(yerlesim);
    const etiket = `tohum ${kayit.tohum} oyuncu ${kayit.oyuncu}`;

    // Boşluksuz paketlemeye düşen el: bütün taşlar baştan sırayla, ayrım yok.
    const bosluksuz = dolu.every(([index], sira) => index === sira);
    if (bosluksuz) continue;
    aralikliSayisi += 1;

    let imlec = 0;
    for (const [grupSirasi, grup] of gruplar.entries()) {
      const blok = dolu.slice(imlec, imlec + grup.length);
      assert.deepEqual(blok.map(([, id]) => id), grup, `${etiket}: ${grupSirasi}. grup bölünmüş`);
      // Blok kendi içinde bitişik: yuva indeksleri birer birer artar.
      for (let i = 1; i < blok.length; i++) {
        assert.equal(blok[i][0], blok[i - 1][0] + 1, `${etiket}: ${grupSirasi}. grup bitişik değil`);
      }
      if (grupSirasi > 0) {
        const oncekiSon = dolu[imlec - 1][0];
        const bosluk = blok[0][0] - oncekiSon - 1;
        assert.ok(
          bosluk >= 1 || satir(blok[0][0]) > satir(oncekiSon),
          `${etiket}: ${grupSirasi}. grup öncekine yapışık (boşluk ${bosluk}, aynı satır)`,
        );
      }
      imlec += grup.length;
    }
  }
  assert.ok(aralikliSayisi > 0, 'ön koşul: ölçülen ellerin hiçbiri aralıklı dizilmemiş');
});

test('ayraç sayısı = grup sayısı - 1; gerçek ellerde grup sayısının ölçülen bandı', () => {
  const gruplar = gercekEller().map((kayit) => elSonuYerlesimi(kayit).gruplar.length);
  for (const sayi of gruplar) assert.ok(sayi >= 1, 'boş grup listesi: döküm hiç grup üretmemiş');
  // Ayraç, grupların ARASINA konur: sayısı her zaman "grup sayısı - 1"dir (ekran.js kaynak
  // taraması bu değişmezi yapının kendisinde denetler). Burada ölçülen bandın raporda yeri var:
  // rakip ızgarasının hücre sayısı = taş sayısı + ayraç sayısı, satır sayısı buradan çıkıyor.
  const enCok = Math.max(...gruplar);
  assert.ok(enCok >= 2, 'ön koşul: ölçülen ellerin hiçbirinde iki grup yok, ayraç hiç çizilmezdi');
  assert.ok(enCok <= 7, `grup sayısı 7'yi aştı (${enCok}): 14 taşta en çok 7 çift olabilir`);
});

// --- 2. ASIL KABUL: yerleşim el sonunda BİR KEZ kurulur, çizimde yeniden kurulmaz -------------

test('ASIL KABUL: el sonu dizilimi tek kapıdan ve YALNIZ durumuIlerlet\'in el bitti dalında kurulur', () => {
  const ilerlet = islevGovdesi(EKRAN_JS, 'durumuIlerlet');
  assert.ok(ilerlet, 'ekran.js durumuIlerlet işlevini tanımlamıyor');
  assert.equal(
    kacKez(ilerlet, /istakaYerlesiminiDiz\(/g), 1,
    'durumuIlerlet el sonu dizilimini ya hiç kurmuyor ya birden çok kez kuruyor',
  );
  // Çağrı el BİTTİĞİ dalda: `SUREN` denetiminden sonra, kabuk geçişiyle aynı blokta.
  assert.match(
    ilerlet,
    /if \(yeniDurum\.sonuc !== EL_SONUCU\.SUREN\) \{[\s\S]*istakaYerlesiminiDiz\(DOKUM_ONCELIGI\.PER\);[\s\S]*\}/,
    'dizilim el bitti dalının dışında kuruluyor (el sürerken de dizerdi)',
  );
  // Yerleşimi yazan TEK kapı: `yerlesimDiz` kaynakta bir kez çağrılır, o da bu kapının içinde.
  assert.equal(kacKez(EKRAN_JS_KOD, /yerlesimDiz\(/g), 1, 'ekran.js yerlesimDiz\'i birden çok yerden çağırıyor');
  const dizKapisi = islevGovdesi(EKRAN_JS, 'istakaYerlesiminiDiz');
  assert.ok(dizKapisi, 'ekran.js istakaYerlesiminiDiz kapısını tanımlamıyor');
  assert.match(dizKapisi, /yerlesimDiz\(dokumGruplari\(dokum\)/, 'dizme kapısı İş 1\'in iki kapısını bağlamıyor');
  assert.ok(
    !/rafCiz\(\)/.test(dizKapisi),
    'dizme kapısı kendi içinde çiziyor: el sonu yolunda ıstaka iki kez çizilir',
  );
  // Kapıyı çağıran yerler TAM olarak iki: el sonu (durumuIlerlet) + dizme düğmeleri (istakayiDiz).
  assert.equal(
    kacKez(EKRAN_JS_KOD, /istakaYerlesiminiDiz\(/g), 3, // 1 tanım + 2 çağrı
    'dizme kapısının çağrı yerleri değişmiş (beklenen: durumuIlerlet + istakayiDiz)',
  );
  const dugmeKapisi = islevGovdesi(EKRAN_JS, 'istakayiDiz');
  assert.match(dugmeKapisi, /istakaYerlesiminiDiz\(oncelik\);\s*\n?\s*rafCiz\(\);/, 'düğme yolu dizip çizmiyor');
});

test('ASIL KABUL: çizim işlevleri dizilim KURMAZ — sonuç penceresi küçültülüp masa yeniden çizilince dizilim kalır', () => {
  for (const ad of ['rafCiz', 'masaCiz', 'ciz', 'sonucPaneliCiz']) {
    const govde = islevGovdesi(EKRAN_JS, ad);
    assert.ok(govde, `ekran.js ${ad} işlevini tanımlamıyor`);
    assert.ok(
      !/istakaYerlesiminiDiz\(|yerlesimDiz\(/.test(govde),
      `${ad} her çizimde dizilimi yeniden kuruyor: oyuncunun taşıdığı taş geri sıçrar`,
    );
  }
});

test('ASIL KABUL: el SÜRERKEN oyuncunun aralıklı dizilimi bozulmaz (çekme/atma yuvaları korur)', () => {
  // Oyuncu el sürerken "Perleri diz"e bastı (ADR-028/4: dizmek hamle değildir) → aralıklı dizilim.
  // Sonra sıradan bir tur: bir taş atılır, bir taş çekilir. Istakanın boşlukları yerinde kalmalı;
  // yoksa oyuncunun kurduğu düzen her hamlede dağılırdı. (`raf.test.js`in yuva koruma savlarının
  // aralıklı yerleşim üzerindeki karşılığı — o dosyanın savları değişmeden geçer.)
  let olculenEl = 0;
  for (const kayit of gercekEller()) {
    const { yerlesim } = elSonuYerlesimi(kayit);
    const dolu = doluYuvalar(yerlesim);
    if (dolu.every(([index], sira) => index === sira)) continue; // boşluksuza düşen el
    olculenEl += 1;
    const etiket = `tohum ${kayit.tohum} oyuncu ${kayit.oyuncu}`;

    // (a) Atma: elden bir taş çıkar → yalnız onun yuvası boşalır.
    const atilan = kayit.el[0];
    const atmaSonrasi = rafYerlesimiGuncelle(yerlesim, kayit.el.filter((tas) => tas.id !== atilan.id));
    for (const [index, id] of dolu) {
      assert.equal(
        atmaSonrasi[index], id === atilan.id ? null : id,
        `${etiket}: atmadan sonra ${index}. yuva kaymış — aralıklı dizilim bozuluyor`,
      );
    }

    // (b) Çekme: yeni taş gelir → eski taşların yuvası hiç değişmez, yeni taş boş bir yuvaya girer.
    const yeniTas = { ...atilan, id: `${atilan.id}-yeni` };
    const cekmeSonrasi = rafYerlesimiGuncelle(atmaSonrasi, [...kayit.el.filter((tas) => tas.id !== atilan.id), yeniTas]);
    for (const [index, id] of dolu) {
      if (id === atilan.id) continue;
      assert.equal(cekmeSonrasi[index], id, `${etiket}: çekmeden sonra ${index}. yuva kaymış`);
    }
    assert.ok(cekmeSonrasi.includes(yeniTas.id), `${etiket}: çekilen taş yerleşime girmedi`);
  }
  assert.ok(olculenEl > 0, 'ön koşul: aralıklı dizilimli el ölçülemedi');
});

// --- 3. ASIL KABUL: rakip ıstakasında gruplar arası ayraç -------------------------------------

test('ASIL KABUL: rakip ıstakası grupları çekirdekten alır ve ARALARINA tam bir ayraç koyar', () => {
  const govde = islevGovdesi(EKRAN_JS, 'rakipTaslariCiz');
  assert.ok(govde, 'ekran.js rakipTaslariCiz işlevini tanımlamıyor');
  // Grup listesinin kaynağı çekirdek (ADR-028/2); arayüz kendi gruplamasını yazmaz.
  assert.match(
    govde,
    /const gruplar = dokumGruplari\(elDokumu\(el, okeyTasi, KURAL_VARSAYILAN, gosterge\)\);/,
    'grup listesi dokumGruplari kapısından gelmiyor',
  );
  // Ayraç yalnız grupların ARASINA: ilk grup hariç her grubun önüne TAM BİR tane → ayraç sayısı
  // yapının kendisi gereği "grup sayısı - 1"dir.
  assert.match(
    govde,
    /for \(const \[grupSirasi, grup\] of gruplar\.entries\(\)\) \{\s*\n\s*if \(grupSirasi > 0\) kutu\.appendChild\(grupAyraciOlustur\(\)\);/,
    'ayraç gruplar arasına konmuyor (ilk grubun önüne de koyabilir ya da hiç koymuyor)',
  );
  assert.equal(kacKez(govde, /grupAyraciOlustur\(\)/g), 1, 'ayraç grup başına birden çok kez ekleniyor');
  assert.equal(
    kacKez(EKRAN_JS_KOD, /grupAyraciOlustur\(/g), 2, // 1 tanım + 1 çağrı
    'ayraç başka bir yerden de ekleniyor: sayı "grup sayısı - 1" olmaktan çıkar',
  );
  // Kapalıyken kutu boş kalır (el sürerken rakip taşı bir an bile görünmez — tasokey#38 kuralı).
  assert.match(govde, /^\s*kutu\.innerHTML = '';\s*\n\s*if \(!acikMi\)/, 'kapalıyken kutu boşaltılmıyor');
});

test('ayraç yalnız görsel: sınıfı tek sabitten, ekran okuyucudan saklı', () => {
  assert.match(EKRAN_JS, /const GRUP_AYRACI_SINIFI = 'kenar-ayrac';/, 'ayraç sınıfı tek sabitte değil');
  const govde = islevGovdesi(EKRAN_JS, 'grupAyraciOlustur');
  assert.ok(govde, 'ekran.js grupAyraciOlustur işlevini tanımlamıyor');
  assert.match(govde, /className = GRUP_AYRACI_SINIFI/, 'ayraç sınıf adını sabitten almıyor');
  assert.match(govde, /setAttribute\('aria-hidden', 'true'\)/, 'ayraç ekran okuyucuya okunuyor');
  assert.ok(!/aria-label/.test(govde), 'ayraca etiket yazılmış: boş hücre okunacak');
});

test('ASIL KABUL: ayracın ölçüsü CSS\'te, taş genişliğinden türer ve --istaka-olcek\'e bağlanmaz', () => {
  // ADR-022 sürüm 2 madde 6 muafiyeti: açılan rakip taşlarının kutusu ölçekle büyümüyor, bu yüzden
  // ölçüleri TABANdan türer. Ayraç aynı ızgaranın hücresi → aynı kural (yoksa ölçek büyüyünce
  // ayraçlar köşe hedef halkasına çarpar).
  assert.match(
    STIL_CSS,
    /--rakip-acik-ayrac-genislik:\s*calc\(var\(--rakip-acik-tas-genislik\) \* var\(--rakip-acik-ayrac-orani\)\)/,
    'ayraç genişliği taş genişliğinden türemiyor (sabit ölçü duyarlı kademelerde taşar)',
  );
  const kural = STIL_CSS.match(/\.kenar-taslar \.kenar-ayrac\s*\{([^}]*)\}/);
  assert.ok(kural, 'stil.css .kenar-taslar .kenar-ayrac kuralı yok');
  assert.match(kural[1], /width:\s*var\(--rakip-acik-ayrac-genislik\)/, 'ayraç genişliği değişkenden gelmiyor');
  assert.match(
    kural[1], /height:\s*var\(--rakip-acik-tas-yukseklik\)/,
    'ayracın yüksekliği taşla aynı değil: tek başına kaldığı satırın yüksekliği çöker',
  );

  const olcu = (sozluk, olcek) => degiskenOlcusu(
    '--rakip-acik-ayrac-genislik',
    sozlukleriBirlestir(sozluk, new Map([['--istaka-olcek', [String(olcek)]]])),
  ).sayi;
  for (const kademe of kademeSozlukleri(STIL_CSS)) {
    assert.equal(
      olcu(kademe.sozluk, 2), olcu(kademe.sozluk, 1),
      `${kademe.ad}: ayraç genişliği --istaka-olcek ile büyüyor (ADR-022 sürüm 2, madde 6)`,
    );
    assert.ok(olcu(kademe.sozluk, 1) > 0, `${kademe.ad}: ayraç genişliği 0 — gruplar arası boşluk görünmez`);
  }
});

// --- 4. ASIL KABUL: ayraçlar rakip yığınının SATIR sayısını artırmaz -------------------------

// Elin en büyük boyu (`cekirdek/dagitim.js`: başlayan oyuncu 15 taş alır).
const EN_COK_TAS = 15;
// Grup sayısının ÖLÇÜLEN tavanı: 1200 gerçek elde (300 tohum × 4 koltuk) en çok 6 grup görüldü
// (günlük `is/tasokey-86/probe.mjs` çıktısı) → en çok 5 ayraç. Kuramsal tavan daha yüksektir
// (15 taş = 7 çift + 1 kalan → 8 grup); o ele düşülürse ızgara bir satır daha açar, yani kural
// yumuşak bozulur — kutu ölçümü (ADR-022 madde 10) o satırda yeniden koşulmalıdır.
const EN_COK_AYRAC = 5;
const EN_COK_HUCRE = EN_COK_TAS + EN_COK_AYRAC;

// Ayraçlardan ÖNCEKİ sütun sayıları (tasokey#85 ve öncesi). Satır bütçesi bunlardan türetilir:
// "ayraçlı en kötü durum, taşların ESKİ sütun sayısında ihtiyaç duyduğu satırdan fazlasını
// istemesin". Ölçülen gerekçe: yan yığın bir satır bile uzayınca çubuk bandını aşıp köşe
// hücrelerine, ADR-014'ün hedef halkasına giriyor (1180x820'de +8 çakışma; `ekran-once` ↔ `ekran`).
const ONCEKI_SUTUNLAR = Object.freeze({
  taban: Object.freeze({ yatay: 8, dikey: 2 }),
  varyant: Object.freeze({ yatay: 15, dikey: 4 }),
});

const satirSayisi = (hucre, sutun) => Math.ceil(hucre / sutun);

function sutunlar(govde) {
  const al = (yon) => {
    const eslesme = govde.match(new RegExp(`--rakip-acik-sutun-${yon}:\\s*(\\d+)`));
    assert.ok(eslesme, `--rakip-acik-sutun-${yon} bu blokta tanımlı değil`);
    return Number(eslesme[1]);
  };
  return { yatay: al('yatay'), dikey: al('dikey') };
}

test('ASIL KABUL: ayraç hücreleri rakip yığınına YENİ SATIR ekletmiyor (köşe halkası korunur)', () => {
  const varyantBlogu = medyaBloklari(STIL_CSS)
    .find(({ sorgu }) => /orientation:\s*landscape/.test(sorgu) && /max-height:\s*700px/.test(sorgu));
  assert.ok(varyantBlogu, 'kısa yatay varyant bloğu bulunamadı (ADR-024)');

  const kademeler = [
    { ad: 'taban', bulunan: sutunlar(kuralGovdesi(STIL_CSS, ':root')), onceki: ONCEKI_SUTUNLAR.taban },
    { ad: 'varyant', bulunan: sutunlar(varyantBlogu.govde), onceki: ONCEKI_SUTUNLAR.varyant },
  ];

  for (const { ad, bulunan, onceki } of kademeler) {
    for (const yon of ['yatay', 'dikey']) {
      const butce = satirSayisi(EN_COK_TAS, onceki[yon]);
      const simdiki = satirSayisi(EN_COK_HUCRE, bulunan[yon]);
      assert.ok(
        simdiki <= butce,
        `${ad}/${yon}: ${bulunan[yon]} sütunla ${EN_COK_HUCRE} hücre ${simdiki} satır istiyor,`
        + ` bütçe ${butce} satır (${onceki[yon]} sütun × ${EN_COK_TAS} taş). Sütun sayısı`
        + ' ayraçları taşıyacak kadar açılmalı — yoksa yan yığın köşe halkasına girer.',
      );
      // Sütun sayısı GEREKSİZ büyütülmemeli: boş sütun 0 genişliktir ama dolu ellerde yığın
      // yatayda yayılır ve masanın ortasına doğru büyür. Bütçeyi tutturan en küçük sayı yeter.
      assert.ok(
        satirSayisi(EN_COK_HUCRE, bulunan[yon] - 1) > butce || bulunan[yon] === onceki[yon],
        `${ad}/${yon}: ${bulunan[yon]} sütun gereğinden fazla (${bulunan[yon] - 1} de bütçeyi tutuyor)`,
      );
    }
  }
});
