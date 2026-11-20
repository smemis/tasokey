import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { elSonucunuHesapla } from '../docs/cekirdek/puan.js';
import { elDokumu, dokumSirasi } from '../docs/cekirdek/cozucu.js';
import { EL_SONUCU } from '../docs/cekirdek/el.js';
import { dagit } from '../docs/cekirdek/dagitim.js';

// tasokey#39 ek bilgileri (Sahip, 2026-11-20):
//   (1) 22:55 — "el bittiğinde rakip ıstakasında taşlar dizili olsun"
//   (2) 23:13 — "el bittiğinde perler ve per olmayanların sayısı ayrı ayrı yazsın, çift varsa
//        onlar da ayrı yazsın, okey sayısı da ayrı yazsın"
// Saf taraf `el-dokumu.test.js`de ölçülür; burada ARAYÜZ bağlantısı ölçülür: sıralamanın ve
// sayıların tek kaynağı çekirdek mi, metinler dil anahtarından mı geliyor (R-008), sonuç
// penceresi dört oyuncunun dökümünü de basıyor mu.

const DOCS_KOK = join(import.meta.dirname, '..', 'docs');
const EKRAN_JS = readFileSync(join(DOCS_KOK, 'arayuz', 'ekran.js'), 'utf8');
const STIL_CSS = readFileSync(join(DOCS_KOK, 'arayuz', 'stil.css'), 'utf8');
const TR = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'tr.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(DOCS_KOK, 'diller', 'en.json'), 'utf8'));

const DOKUM_ANAHTARLARI = ['sonuc.dokumPer', 'sonuc.dokumCift', 'sonuc.dokumPerDisi', 'sonuc.dokumOkey'];

test('ek bilgi 1: rakip ıstakası dizilimi çekirdeğin döküm sırasından geliyor (arayüz kendi sıralamıyor)', () => {
  assert.match(
    EKRAN_JS,
    /import \{[^}]*elDokumu[^}]*dokumSirasi[^}]*\} from '\.\.\/cekirdek\/cozucu\.js'/,
    'ekran.js döküm/dizilim işlevlerini çekirdekten almıyor',
  );
  assert.match(
    EKRAN_JS,
    /const sirali = dokumSirasi\(elDokumu\(el, okeyTasi, KURAL_VARSAYILAN, gosterge\)\);/,
    'rakipTaslariCiz taşları döküm sırasına göre sermiyor',
  );
  assert.match(
    EKRAN_JS,
    /for \(const tas of sirali\)/,
    'rakipTaslariCiz hâlâ elin ham sırasını (durum.eller) basıyor olabilir',
  );
  // Sıralama/karşılaştırma mantığı arayüzde tekrar edilmemeli (tek kaynak: cozucu.js).
  assert.ok(
    !/\.sort\(/.test(EKRAN_JS),
    'ekran.js kendi sıralamasını yazıyor; dizilim kuralı cekirdek/cozucu.js\'de kalmalı',
  );
});

test('ek bilgi 2: sonuç penceresi dört oyuncunun dökümünü de basıyor', () => {
  assert.match(EKRAN_JS, /function dokumMetni\(dokum\)/, 'ekran.js döküm metnini kuran işlevi tanımlamıyor');
  assert.match(
    EKRAN_JS,
    /dokum\.textContent = dokumMetni\(sonuc\.dokumler\[oyuncu\]\);/,
    'sonuç satırına oyuncunun dökümü yazılmıyor',
  );
  assert.match(STIL_CSS, /\.sonuc-dokum\s*\{/, 'stil.css döküm satırı görünümünü tanımlamıyor');
});

test('ASIL KABUL (ek bilgi 2): per, çift, per olmayan ve okey AYRI sayılar olarak yazılıyor', () => {
  for (const anahtar of DOKUM_ANAHTARLARI) {
    const jsAnahtari = anahtar.replace('sonuc.', '');
    assert.match(
      EKRAN_JS,
      new RegExp(`metinAl\\('${anahtar.replace('.', '\\.')}'`),
      `döküm metni ${jsAnahtari} parçasını yazmıyor`,
    );
  }
  // Çift yalnız VARSA yazılır (Sahip: "çift varsa onlar da ayrı yazsın"); okey her zaman yazılır.
  assert.match(
    EKRAN_JS,
    /if \(dokum\.ciftSayisi > 0\) parcalar\.push\(metinAl\('sonuc\.dokumCift'/,
    'çift satırı "varsa" koşuluna bağlı değil',
  );
});

test('ek bilgi 2: döküm metinleri iki dilde de tanımlı ve yer tutucuları dolu (R-008)', () => {
  for (const [dil, tablo] of [['tr', TR], ['en', EN]]) {
    for (const anahtar of DOKUM_ANAHTARLARI) {
      assert.equal(typeof tablo[anahtar], 'string', `${dil}.json ${anahtar} anahtarı yok`);
      assert.match(tablo[anahtar], /\{0\}/, `${dil}.json ${anahtar} ilk sayıyı almıyor`);
      assert.notEqual(tablo[anahtar].trim(), '', `${dil}.json ${anahtar} boş`);
    }
    // Per ve çift satırı iki sayı taşır (grup sayısı + taş sayısı).
    assert.match(tablo['sonuc.dokumPer'], /\{1\}/, `${dil}.json sonuc.dokumPer taş sayısını almıyor`);
    assert.match(tablo['sonuc.dokumCift'], /\{1\}/, `${dil}.json sonuc.dokumCift taş sayısını almıyor`);
  }
  for (const anahtar of DOKUM_ANAHTARLARI) {
    assert.notEqual(TR[anahtar], EN[anahtar], `${anahtar} çevrilmemiş (tr = en)`);
  }
});

test('ek bilgi 2: sonuç dökümü gerçek bir elde kalan taş sayısıyla tutarlı', () => {
  const { eller, gosterge, okeyTasi } = dagit(4242);
  const durum = {
    eller, gosterge, okeyTasi, sonuc: EL_SONUCU.BERABERE, kazanan: null,
  };
  const sonuc = elSonucunuHesapla(durum);
  assert.equal(sonuc.dokumler.length, 4);
  for (const { oyuncu, sayi } of sonuc.kalanTaslar) {
    const dokum = sonuc.dokumler[oyuncu];
    assert.equal(
      dokum.perTasSayisi + dokum.perDisiSayisi,
      sayi,
      `oyuncu ${oyuncu}: döküm toplamı kalan taş sayısıyla uyuşmuyor`,
    );
    assert.ok(dokum.okeySayisi <= sayi, `oyuncu ${oyuncu}: okey sayısı el boyundan fazla`);
  }
});

test('ek bilgi 1: aynı elde dizilim ve döküm aynı taş kümesini anlatıyor', () => {
  const { eller, gosterge, okeyTasi } = dagit(4242);
  for (const el of eller) {
    const dokum = elDokumu(el, okeyTasi, undefined, gosterge);
    assert.equal(dokumSirasi(dokum).length, el.length);
    assert.equal(dokum.perTasSayisi + dokum.ciftTasSayisi + dokum.kalanSayisi, el.length);
  }
});
