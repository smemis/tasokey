import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// tasokey#69 (üst iş tasokey#64, plan §7 iş 3) — sürükle-bırak hedef ölçümünün öz-testi.
// Ölçülen: (a) beş yolun kabul KURALI (saf çekirdek, tablo testi), (b) gömülen kaynağın modülle
// aynı sonucu verdiği (ADR-023/4 tek kaynak), (c) planın iki boyut × iki sahne olduğu,
// (d) sayfa katmanının aradığı kimliklerin `docs/index.html`de var olduğu, (e) sürücünün argüman
// çözümü (ADR-023/5: ana giriş doğrudan çağrı koruması arkasında, import plan yazmaz).
// Tarayıcı ÖLÇÜMÜ bu test değildir: ölçüm plan + `ekran_gerek` turundan gelir (ADR-023/1).

import * as cekirdekModulu from './yardimci/surukleme-hedefi.js';
import {
  ESIK_PX, SAHNELER, SAHNE_YOLLARI, YOLLAR, YOL_ANAHTARLARI,
  coklukAyni, dizilimAyni, isabetNoktalari, izgaraNoktalari, kutuAlani, olcuMetni,
  yolTanimi, yolKarari, sahneKararlari, kararOzeti,
  ozetSatirlari, bolgeSatirlari, yaziKatmaniBicimi, kararSatiri, TABLO_BASLIKLARI,
} from './yardimci/surukleme-hedefi.js';
import {
  BOYUTLAR, CEKIRDEK_ADLARI, planNesnesi, sayfaBetigi,
} from './yardimci/surukleme-olcum-betigi.js';
import { gomulebilirKaynak } from './yardimci/yerlesim-olcum-betigi.js';
import {
  BOLGE_BOLMESI, GEREKLI_KIMLIKLER, KOSE_TANIMLARI, BITIRME_EN_COK_EL, EN_COK_TUR,
} from './yardimci/surukleme-olcum-sayfa.js';
import { KULLANIM, seceneklerioku } from './surukleme-hedefi.olcum.js';

const KOK = join(import.meta.dirname, '..');

// ——— geçen gözlemler (her yol için "doğru davranış"ın sayıları) ————————————————————————————

const ONCEKI = ['a', 'b', null, 'c', null, null];
const SONRAKI_ITME = [null, 'b', null, 'a', 'c', null];

function koseKaydi(anahtar, { isabet = 9, disX = 0.2, disY = 0, icX = 12.1 } = {}) {
  return {
    anahtar,
    kutu: { sol: 0, ust: 0, sag: 200, alt: 100 },
    kenarlar: { disX, disY, icX, icY: 30 },
    hucre: { toplam: 9, isabet, noktalar: [], kacanlar: [] },
    bolge: {
      kutu: { sol: 0, ust: 0, sag: 240, alt: 120 },
      toplam: 25,
      isabet: 20,
      oran: 0.8,
      noktalar: [],
      kacanlar: [{ ad: '00', bulunan: '#masa' }],
    },
  };
}

const GECEN = {
  istakayaBirak: {
    cekilen: { yuva: 5, id: 'mavi-5-1', sonrakiYerlesim: ['a', 'b', null, 'c', null, 'mavi-5-1'] },
    itme: {
      suruklenenId: 'a',
      kaynakYuva: 0,
      hedefYuva: 3,
      hedefteOlanId: 'c',
      oncekiYerlesim: ONCEKI,
      sonrakiYerlesim: SONRAKI_ITME,
    },
  },
  gecersizBirak: {
    hedefAdi: '#ustCubuk',
    suruklenenId: 'a',
    sirasinda: { sinif: true, gorunurluk: 'hidden', kopya: 1 },
    sonra: { sinif: false, gorunurluk: 'visible', kopya: 0 },
    oncekiYerlesim: ONCEKI,
    sonrakiYerlesim: [...ONCEKI],
  },
  koseAtmaAlani: {
    esik: ESIK_PX,
    bosluk: 12,
    koseler: KOSE_TANIMLARI.map((tanim) => koseKaydi(tanim.kose)),
    atma: {
      kose: 'sagAlt', nokta: 'solUst(1810,980)', elOnce: 15, elSonra: 14, yiginOnce: 0, yiginSonra: 1,
    },
  },
  cekme: {
    deste: { elOnce: 14, elSonra: 15, cekilenId: 'mavi-5-1' },
    komsuKose: { kose: 'solAlt', cekilebilirSinif: true, yiginAdet: 1, elOnce: 14, elSonra: 15 },
    yasakKose: { kose: 'sagUst', cekilebilirSinif: false, yiginAdet: 2, elOnce: 15, elSonra: 15 },
  },
  bitirmeHedefi: {
    elDenemesi: 2,
    bitirenSayisi: 2,
    sinif: true,
    ipucu: 'Eli bitirmek için taşı buraya bırak',
    vurguFarki: [{ ozellik: 'outlineStyle', vurgulu: 'solid', sade: 'none' }],
    birakma: { elOnce: 15, elSonra: 14, sonucGorunur: true, sonucMetni: 'Sen kazandın' },
  },
};

/** Gözlemin derin kopyası (bozma testleri birbirini etkilemesin). */
const kopya = (nesne) => JSON.parse(JSON.stringify(nesne));

test('beş yol işin metnindeki beş yoldur ve sahneler onları tam böler', () => {
  assert.deepEqual([...YOL_ANAHTARLARI], [
    'istakayaBirak', 'gecersizBirak', 'koseAtmaAlani', 'cekme', 'bitirmeHedefi',
  ]);
  assert.deepEqual([...SAHNELER], ['hedef', 'bitirme']);
  const sahnedekiler = SAHNELER.flatMap((sahne) => [...SAHNE_YOLLARI[sahne]]);
  assert.deepEqual(sahnedekiler.slice().sort(), [...YOL_ANAHTARLARI].sort());
  // Her yol kaynağını (ADR ya da iş numarası) taşır: raporda "hangi karara göre" okunabilsin.
  for (const yol of YOLLAR) {
    assert.match(yol.kaynak, /ADR-\d{3}|tasokey#\d+|R-\d{3}/, `yol ${yol.anahtar} kaynaksız`);
    assert.ok(yol.denetimler.length > 0, `yol ${yol.anahtar} denetimsiz`);
  }
  assert.throws(() => yolTanimi('yokBoyleYol'), /bilinmeyen yol/);
});

test('ASIL KABUL: beş yolun geçen gözlemi "gecti" verir, her denetim tek tek ölçülür', () => {
  for (const anahtar of YOL_ANAHTARLARI) {
    const karar = yolKarari(anahtar, GECEN[anahtar]);
    assert.equal(karar.durum, 'gecti', `${anahtar}: ${JSON.stringify(karar.denetimler)}`);
    assert.equal(karar.denetimler.length, yolTanimi(anahtar).denetimler.length);
    for (const denetim of karar.denetimler) {
      assert.equal(denetim.gecti, true, `${anahtar}/${denetim.ad}`);
      assert.ok(denetim.olcu.length > 0, `${anahtar}/${denetim.ad} ölçüsüz`);
    }
  }
});

test('bozulan gözlem "kaldi" verir: her denetim gerçekten bir şey ölçüyor (tablo)', () => {
  const bozmalar = [
    // yol, bozulan denetim, gözlemi bozan işlev
    ['istakayaBirak', 'cekilenYuvadaKaldi', (g) => { g.cekilen.sonrakiYerlesim[5] = 'baska'; }],
    // Sürüklenen taş hedef yuvaya değil yanındakine düşmüş (taş kaybolmadı, hedefe oturmadı).
    ['istakayaBirak', 'itmeHedefeOturdu', (g) => {
      g.itme.sonrakiYerlesim[3] = 'c';
      g.itme.sonrakiYerlesim[4] = 'a';
    }],
    // Takas: hedefteki taş sürüklenen taşın ESKİ yuvasına geçmiş (ADR-019 bunu yasaklar).
    ['istakayaBirak', 'itmeTakasDegil', (g) => {
      g.itme.sonrakiYerlesim[0] = 'c';
      g.itme.sonrakiYerlesim[4] = null;
    }],
    ['istakayaBirak', 'itmeTasKaybetmedi', (g) => { g.itme.sonrakiYerlesim[4] = null; }],
    ['gecersizBirak', 'sirasindaGizliVeKopyaVar', (g) => { g.sirasinda.gorunurluk = 'visible'; }],
    ['gecersizBirak', 'sonraGorunurVeKopyaYok', (g) => { g.sonra.kopya = 1; }],
    ['gecersizBirak', 'dizilimDegismedi', (g) => { g.sonrakiYerlesim[2] = 'a'; }],
    ['koseAtmaAlani', 'hucreIsabetiTam', (g) => { g.koseler[1].hucre.isabet = 8; }],
    ['koseAtmaAlani', 'disKenarMasayaDayali', (g) => { g.koseler[0].kenarlar.disY = 9; }],
    ['koseAtmaAlani', 'icKenarIstakaYuzunde', (g) => { g.koseler[3].kenarlar.icX = 40; }],
    ['koseAtmaAlani', 'ucNoktadanAtmaCalisti', (g) => { g.atma.elSonra = 15; }],
    ['cekme', 'destedenCekildi', (g) => { g.deste.elSonra = 14; }],
    ['cekme', 'komsuKosedenCekildi', (g) => { g.komsuKose.cekilebilirSinif = false; }],
    ['cekme', 'yasakKosedenCekilemedi', (g) => { g.yasakKose.elSonra = 16; }],
    // Yığını boş bir köşeden çekilememesi kuralı ölçmez (önkoşul: yasak köşe dolu olmalı).
    ['cekme', 'yasakKosedenCekilemedi', (g) => { g.yasakKose.yiginAdet = 0; }],
    ['bitirmeHedefi', 'vurguSinifiVar', (g) => { g.sinif = false; }],
    ['bitirmeHedefi', 'ipucuMetniDolu', (g) => { g.ipucu = ''; }],
    ['bitirmeHedefi', 'vurguBicimFarkiOlculdu', (g) => { g.vurguFarki = []; }],
    ['bitirmeHedefi', 'destedeBirakmaEliBitirdi', (g) => { g.birakma.sonucGorunur = false; }],
  ];
  for (const [anahtar, denetimAdi, boz] of bozmalar) {
    const gozlem = kopya(GECEN[anahtar]);
    boz(gozlem);
    const karar = yolKarari(anahtar, gozlem);
    assert.equal(karar.durum, 'kaldi', `${anahtar}/${denetimAdi} bozulduğu hâlde geçti`);
    const kalan = karar.denetimler.filter((d) => !d.gecti).map((d) => d.ad);
    assert.deepEqual(kalan, [denetimAdi], `${anahtar}: beklenen tek kalan ${denetimAdi}`);
  }
});

test('ölçülmeyen yol "geçti" yazılmaz: gözlem yoksa ya da hata varsa karar olculmedi (A9)', () => {
  const yok = yolKarari('bitirmeHedefi', undefined);
  assert.equal(yok.durum, 'olculmedi');
  assert.equal(yok.denetimler.length, 0);
  const hatali = yolKarari('cekme', { hata: 'sıra insana gelmedi' });
  assert.equal(hatali.durum, 'olculmedi');
  assert.match(hatali.hata, /sıra insana gelmedi/);
  // Eksik alan sessizce geçmez: denetim gövdesi patlarsa o denetim KALDI sayılır.
  const eksik = yolKarari('cekme', { deste: { elOnce: 14, elSonra: 15 } });
  assert.equal(eksik.durum, 'kaldi');
  assert.ok(eksik.denetimler.some((d) => !d.gecti && d.olcu.startsWith('ölçülemedi')));
});

test('sahne kararları ve karar özeti', () => {
  const kararlar = sahneKararlari('hedef', GECEN);
  assert.deepEqual(kararlar.map((k) => k.anahtar), [...SAHNE_YOLLARI.hedef]);
  assert.deepEqual(kararOzeti(kararlar), { toplam: 4, gecti: 4, kaldi: 0, olculmedi: 0 });
  const eksikli = sahneKararlari('bitirme', {});
  assert.deepEqual(kararOzeti(eksikli), { toplam: 1, gecti: 0, kaldi: 0, olculmedi: 1 });
  assert.throws(() => sahneKararlari('yokBoyleSahne', {}), /bilinmeyen sahne/);
});

test('isabet noktaları kutunun İÇİNDE kalır ve 9 adlı noktadır', () => {
  const kutu = { sol: 100, ust: 200, sag: 300, alt: 260 };
  const noktalar = isabetNoktalari(kutu, { kenarPayi: 4 });
  assert.deepEqual(noktalar.map((n) => n.ad), [
    'orta', 'solUst', 'sagUst', 'solAlt', 'sagAlt', 'ustOrta', 'altOrta', 'solOrta', 'sagOrta',
  ]);
  for (const nokta of noktalar) {
    assert.ok(nokta.x >= kutu.sol + 4 && nokta.x <= kutu.sag - 4, `x dışarıda: ${nokta.ad}`);
    assert.ok(nokta.y >= kutu.ust + 4 && nokta.y <= kutu.alt - 4, `y dışarıda: ${nokta.ad}`);
  }
  assert.deepEqual(noktalar[0], { ad: 'orta', x: 200, y: 230 });
  assert.deepEqual(noktalar[1], { ad: 'solUst', x: 104, y: 204 });
});

test('bölge taraması göz MERKEZLERİNİ verir, kenara dokunmaz', () => {
  const kutu = { sol: 0, ust: 0, sag: 100, alt: 50 };
  const noktalar = izgaraNoktalari(kutu, { bolme: 5 });
  assert.equal(noktalar.length, 25);
  assert.deepEqual(noktalar[0], { ad: '00', x: 10, y: 5 });
  assert.deepEqual(noktalar[24], { ad: '44', x: 90, y: 45 });
  for (const nokta of noktalar) {
    assert.ok(nokta.x > kutu.sol && nokta.x < kutu.sag);
    assert.ok(nokta.y > kutu.ust && nokta.y < kutu.alt);
  }
  assert.equal(kutuAlani(kutu), 5000);
  assert.equal(kutuAlani(null), 0);
  assert.equal(olcuMetni(kutu), '100x50');
  assert.equal(olcuMetni(null), '—');
});

test('çokluk ve dizilim karşılaştırmaları: tablo', () => {
  assert.equal(coklukAyni(['a', null, 'b'], ['b', 'a', null]), true);
  assert.equal(coklukAyni(['a', 'b'], ['a']), false);
  assert.equal(coklukAyni(['a', 'a'], ['a', 'b']), false);
  assert.equal(dizilimAyni(['a', null], ['a', null]), true);
  assert.equal(dizilimAyni(['a', null], [null, 'a']), false);
  assert.equal(dizilimAyni(['a'], ['a', null]), false);
  assert.equal(dizilimAyni(null, ['a']), false);
});

test('özet satırları ekran görüntüsünden okunabilir biçimde yazılır', () => {
  const olcum = {
    sahne: 'hedef',
    gorunum: { genislik: 800, yukseklik: 360 },
    olculer: { istaka: { sol: 0, ust: 0, sag: 308, alt: 101 }, tas: null, olcek: '1', hedefPay: 3 },
    kararlar: sahneKararlari('hedef', GECEN),
  };
  const satirlar = ozetSatirlari(olcum);
  assert.match(satirlar[0], /^SURUKLE 800x360 sahne=hedef yol=4 gecti=4 kaldi=0 olculmedi=0$/);
  assert.match(satirlar[1], /^OLCU istaka 308x101 tas — olcek 1 hedefPay 3px$/);
  for (const anahtar of SAHNE_YOLLARI.hedef) {
    assert.ok(satirlar.some((satir) => satir.startsWith(`+ ${anahtar} [gecti]`)), anahtar);
  }
  // Kalan yol `x` ile, ölçülmeyen `?` ile başlar: ekran görüntüsünde göz tarayarak bulunur.
  const bozuk = { ...olcum, kararlar: [yolKarari('cekme', { hata: 'x' }), yolKarari('cekme', { ...kopya(GECEN.cekme), deste: { elOnce: 1, elSonra: 1 } })] };
  const bozukSatirlar = ozetSatirlari(bozuk);
  assert.ok(bozukSatirlar.some((satir) => satir.startsWith('? cekme [olculmedi]')));
  assert.ok(bozukSatirlar.some((satir) => satir.startsWith('x cekme [kaldi]')));
  assert.ok(bozukSatirlar.some((satir) => satir.includes('! destedenCekildi')));
});

test('bölge satırları oranı ve kaçan noktaların dökümünü yazar (eşik YOK, ölçüm)', () => {
  const satirlar = bolgeSatirlari([koseKaydi('solAlt')]);
  assert.match(satirlar[0], /^BOLGE solAlt hucre 200x100 bosBolge 240x120 isabet 20\/25 \(80%\)$/);
  assert.match(satirlar[1], /kacan: #masa x1/);
  assert.deepEqual(bolgeSatirlari([]), []);
});

test('yazı katmanı ekrana sığar: uzun liste başa çekilir, gerekirse yazı küçülür', () => {
  const kisa = yaziKatmaniBicimi(6, 360);
  assert.equal(kisa.yazi, 12);
  assert.ok(kisa.ustPx > 0, 'kısa listede katman masanın üstünde durur');
  const uzun = yaziKatmaniBicimi(40, 360);
  assert.equal(uzun.ustPx, 0);
  assert.ok(uzun.yazi < 12 && uzun.yazi >= 6, `yazı küçülmeli: ${uzun.yazi}`);
  assert.ok(Math.ceil(40 * uzun.yazi * uzun.satirPayi) + 10 <= 360, 'uzun liste ekrana sığmalı');
});

test('markdown satırı yol başına bir satırdır ve başlıklarla aynı genişlikte', () => {
  const olcum = { sahne: 'hedef', boyutAdi: 'masaustu', gorunum: { genislik: 1920, yukseklik: 1080 } };
  const satir = kararSatiri(olcum, yolKarari('cekme', GECEN.cekme));
  assert.equal(satir.length, TABLO_BASLIKLARI.length);
  assert.deepEqual(satir.slice(0, 6), ['1920x1080', 'masaustu', 'hedef', 'cekme', 'R-012', 'gecti']);
  assert.match(satir[6], /✓ destedenCekildi/);
});

// ——— gömme, plan, kimlikler, sürücü ————————————————————————————————————————————————————————

test('gömülen saf çekirdek, modülle AYNI sonucu verir (ADR-023/4 tek kaynak)', () => {
  const kaynak = readFileSync(join(KOK, 'testler/yardimci/surukleme-hedefi.js'), 'utf8');
  const gomulu = gomulebilirKaynak(kaynak);
  const kur = new Function(`${gomulu}\nreturn { ${CEKIRDEK_ADLARI.join(', ')} };`);
  const gomuluCekirdek = kur();
  for (const ad of CEKIRDEK_ADLARI) {
    assert.ok(ad in gomuluCekirdek, `gömülen kaynakta ${ad} yok`);
    assert.equal(typeof gomuluCekirdek[ad], typeof cekirdekModulu[ad], `tür farkı: ${ad}`);
  }
  // Aynı gözlem iki yolda aynı kararı vermeli (sayılar ve metinler birebir).
  for (const anahtar of YOL_ANAHTARLARI) {
    assert.deepEqual(
      gomuluCekirdek.yolKarari(anahtar, GECEN[anahtar]),
      yolKarari(anahtar, GECEN[anahtar]),
      `gömülen karar modülden farklı: ${anahtar}`,
    );
  }
  assert.deepEqual(
    gomuluCekirdek.isabetNoktalari({ sol: 0, ust: 0, sag: 40, alt: 20 }),
    isabetNoktalari({ sol: 0, ust: 0, sag: 40, alt: 20 }),
  );
});

test('sayfa betiği geçerli bir async gövdedir; iki sahne de gömülü kaynağı kullanır', () => {
  for (const sahne of SAHNELER) {
    const betik = sayfaBetigi({ sahne, gosterim: 'json' });
    assert.doesNotThrow(() => new Function(`return (async () => {\n${betik}\n});`), `sahne ${sahne}`);
    assert.match(betik, /gömülen saf çekirdek: testler\/yardimci\/surukleme-hedefi\.js/);
    assert.match(betik, /gömülen sayfa katmanı: testler\/yardimci\/surukleme-olcum-sayfa\.js/);
    assert.match(betik, new RegExp(`sahne: "${sahne}"`));
    assert.doesNotMatch(betik, /^\s*export\s/m, 'gömülen kaynakta export kalmış');
    assert.doesNotMatch(betik, /^\s*import\s/m, 'gömülen kaynakta import bildirimi kalmış');
  }
  assert.throws(() => sayfaBetigi({ sahne: 'yokBoyleSahne' }), /bilinmeyen sahne/);
});

test('plan iki boyut × iki sahne: işin metnindeki 800x360 ve 1920x1080', () => {
  assert.deepEqual(BOYUTLAR.map((b) => `${b[0]}x${b[1]}`), ['800x360', '1920x1080']);
  const plan = planNesnesi();
  assert.deepEqual(plan.boyutlar, [[800, 360, 'telefon-kucuk'], [1920, 1080, 'masaustu']]);
  assert.deepEqual(plan.cekimler.map((c) => c.ad), ['surukle-hedef', 'surukle-bitirme']);
  for (const cekim of plan.cekimler) {
    assert.equal(cekim.sayfa, 'index.html');
    assert.ok(cekim.bekle > 0 && cekim.js_bekle > 0, `${cekim.ad}: bekleme yok`);
    assert.ok(cekim.js.length > 1000, `${cekim.ad}: betik kısa`);
    assert.doesNotThrow(() => new Function(`return (async () => {\n${cekim.js}\n});`), cekim.ad);
  }
  // Bitirme sahnesi birkaç el oynar: beklemesi hedef sahnesinden uzun olmalı.
  assert.ok(plan.cekimler[1].js_bekle > plan.cekimler[0].js_bekle);
});

test('sayfa katmanının aradığı kimlikler docs/index.html\'de var', () => {
  const html = readFileSync(join(KOK, 'docs/index.html'), 'utf8');
  const eksikler = GEREKLI_KIMLIKLER.filter((kimlik) => !html.includes(`id="${kimlik}"`));
  assert.deepEqual(eksikler, [], `index.html'de olmayan kimlik(ler): ${eksikler.join(', ')}`);
  // Dört köşe ve komşuları: ızgaranın 3x3 düzeni (ADR-012) ölçüm kümesinde tam.
  assert.deepEqual(KOSE_TANIMLARI.map((t) => t.kose), ['solUst', 'sagUst', 'solAlt', 'sagAlt']);
  for (const tanim of KOSE_TANIMLARI) {
    assert.ok(html.includes(`data-kose="${tanim.kose}"`), `data-kose yok: ${tanim.kose}`);
    assert.ok(GEREKLI_KIMLIKLER.includes(tanim.yanKenar), `yan komşu kümede yok: ${tanim.yanKenar}`);
    assert.ok(GEREKLI_KIMLIKLER.includes(tanim.ortaKenar), `orta komşu kümede yok: ${tanim.ortaKenar}`);
  }
  assert.equal(BOLGE_BOLMESI * BOLGE_BOLMESI, 25);
  assert.ok(BITIRME_EN_COK_EL > 0 && EN_COK_TUR > 0);
});

test('sayfa katmanı zorlanan iki şeyi gerekçesiyle yazar (gizlenmez)', () => {
  const kaynak = readFileSync(join(KOK, 'testler/yardimci/surukleme-olcum-sayfa.js'), 'utf8');
  // Sentetik işaretçi yakalanamadığı için kapatılır; bu çıktıda `zorlanan` alanında durur.
  assert.match(kaynak, /isaretciYakalamasi: 'devre dışı/);
  assert.match(kaynak, /botGecikmesi: 'çökertildi/);
  // Yakalama ve zamanlayıcı ölçüm bitince GERİ verilir (sayfa kalıcı olarak kurcalanmış kalmasın).
  assert.match(kaynak, /Element\.prototype\.setPointerCapture = asilYakala;/);
  assert.match(kaynak, /window\.setTimeout = asilZamanlayici;/);
  // Kural sayfa katmanında YAZILMAZ: karar saf çekirdekten gelir (tek kaynak).
  assert.match(kaynak, /S\.sahneKararlari\(sahne, gozlemler\)/);
});

test('sürücü argümanları: tablo testi (geçerli / eksik / sayı olmayan / bilinmeyen)', () => {
  assert.deepEqual(seceneklerioku(['--plan', 'plan.json']), {
    plan: 'plan.json', bekle: 1.5, jsBekle: 1.5,
  });
  assert.deepEqual(seceneklerioku(['--plan', 'p.json', '--bekle', '2', '--js-bekle', '4.5']), {
    plan: 'p.json', bekle: 2, jsBekle: 4.5,
  });
  assert.throws(() => seceneklerioku([]), /--plan zorunludur/);
  assert.throws(() => seceneklerioku(['--plan']), /--plan bir değer bekler/);
  assert.throws(() => seceneklerioku(['--plan', '--bekle']), /--plan bir değer bekler/);
  assert.throws(() => seceneklerioku(['--plan', 'p.json', '--bekle', 'abc']), /--bekle sayı bekler/);
  assert.throws(() => seceneklerioku(['--plan', 'p.json', '--bekle', '99']), /aralığında olmalı/);
  assert.throws(() => seceneklerioku(['--tarayici', 'x']), /bilinmeyen seçenek/);
});

test('kullanım metni her bayrağı anlatır ve ofis yolunu söyler (ADR-023)', () => {
  for (const bayrak of ['--plan', '--bekle', '--js-bekle']) {
    assert.ok(KULLANIM.includes(bayrak), `kullanımda anlatılmayan bayrak: ${bayrak}`);
  }
  assert.match(KULLANIM, /SUNUCU\/TARAYICI AÇMAZ/);
  assert.match(KULLANIM, /ADR-023/);
});
