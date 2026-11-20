// Masa, raf, atılan taş yığını; olay bağlama (MIMARI.md §3 `arayuz/ekran.js`; ADR-002).
// Kural bilgisi burada yok: her çek/at çağrısı `cekirdek/el.js`'e gider; bu dosya yalnız
// sonucu DOM'a yansıtır (R-003, R-005, R-006, R-009; tasokey#10).

import { elBaslat, cek, at, KAYNAK, EL_SONUCU, sonrakiOyuncu, oncekiOyuncu } from '../cekirdek/el.js';
import { tasOkeyMi } from '../cekirdek/dagitim.js';
import { elBitirenTaslar } from '../cekirdek/cozucu.js';
import { KURAL_VARSAYILAN } from '../cekirdek/kural.js';
import { elSonucunuHesapla } from '../cekirdek/puan.js';
import { kolayBotTurOyna } from '../bot/kolay.js';
import { cevir } from '../dil/cevir.js';
import { surukleBagla } from './surukle.js';
import { HEDEF_TURU, EYLEM, eylemKararVer } from './etkilesim.js';
import { kayitOku, kayitYaz } from '../kayit/depo.js';
import { gorselOlustur, gorselleriOnYukle } from './gorseller.js';
import { oyuncuKenarHaritasi, oyuncununAtilanKosesi } from './yerlesim.js';

// masa-zemin.svg ve istaka.svg CSS arka planı olarak kullanılır (arayuz/stil.css #masa / #rafAlani
// — burada önceden yüklenmesi gerekmez). Sayı yüzü artık tek paylaşılan gövde (tas-govde.svg) +
// DOM rakam katmanı; ADR-011 (tasokey#28), eski tas-01.svg…tas-13.svg deseni kaldırıldı.
const GORSEL_DOSYALARI = ['tas-govde.svg', 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg'];

const INSAN_OYUNCUSU = 0;
const BOT_GECIKME_MS = 450;

// Oyuncunun ıstakası gerçek okey ıstakası gibi 2 sıra (tasokey#13 ek bilgi); yuva sayısı en
// yüksek el boyutundan (15, dagitim.js BASLAYAN_OYUNCU_EL_BOYUTU) fazla tutulur ki oyuncu taşları
// aralıklı dizerken boş yuva kalsın. Tek kaynak: CSS `--raf-sutun-sayisi` bu sabitten okunur (baslat()).
const RAF_SATIR_SAYISI = 2;
const RAF_SUTUN_SAYISI = 9;
const RAF_SLOT_SAYISI = RAF_SATIR_SAYISI * RAF_SUTUN_SAYISI;

// ADR-012 (tasokey#29): Sahip (oyuncu 0) her zaman alt kenarda; diğer kenarlar/köşeler
// `arayuz/yerlesim.js`in saf mantığıyla, el.js'in sıra yönüyle (sonrakiOyuncu) hesaplanır.
// Oyuncu sayısı ve yön sabit olduğundan harita bir kere (modül yüklenirken) çıkarılır.
const KENAR_HARITASI = oyuncuKenarHaritasi(sonrakiOyuncu);
const KOSE_HARITASI = [0, 1, 2, 3].map((oyuncu) => oyuncununAtilanKosesi(oyuncu, sonrakiOyuncu));

// Rakip kenarlarının ıstaka çubuğu yalnız CSS'te durur (kenar-raf-yatay/dikey, stil.css) — ahşap
// sırt dışında içerik basılmaz (Sahip ek bilgisi, 2026-11-20: rakip taşları hiç görünmemeli, ne
// yüz ne kapalı taş; gerçek okeydeki gibi yalnız ıstakanın arkası). Bu yüzden burada JS'in
// doldurduğu bir "raf" elemanı yok.
const KENAR_ELEMAN_ADLARI = {
  ust: { kutu: 'kenarUst', ad: 'kenarUstAd' },
  sol: { kutu: 'kenarSol', ad: 'kenarSolAd' },
  sag: { kutu: 'kenarSag', ad: 'kenarSagAd' },
};

const KOSE_ELEMAN_ADLARI = {
  solUst: { kutu: 'koseSolUst', yigin: 'koseSolUstYigin', sayac: 'koseSolUstSayac' },
  sagUst: { kutu: 'koseSagUst', yigin: 'koseSagUstYigin', sayac: 'koseSagUstSayac' },
  solAlt: { kutu: 'koseSolAlt', yigin: 'koseSolAltYigin', sayac: 'koseSolAltSayac' },
  sagAlt: { kutu: 'koseSagAlt', yigin: 'koseSagAltYigin', sayac: 'koseSagAltSayac' },
};

// Köşe yığınında en üst taş tam, alttakiler kaydırılmış görünür (R-011 kabul); en fazla bu kadarı
// çizilir (daha eskisi birikse de görsel karmaşayı sınırlamak için — adet gerçek sayıyı gösterir).
const KOSE_GORUNEN_MAKSIMUM = 3;

const durumKutu = {
  durum: null,
  diller: {},
  dilKodu: 'tr',
  rafYerlesimi: [],
  secilenTasId: null,
  mesajAnahtari: null,
  botCalisiyor: false,
};

const eleman = {};

function metinAl(anahtar, degerler = []) {
  return cevir(durumKutu.diller, durumKutu.dilKodu, anahtar, degerler);
}

function oyuncuAdi(oyuncu) {
  return oyuncu === INSAN_OYUNCUSU ? metinAl('oyuncu.sen') : metinAl('oyuncu.bot', [oyuncu]);
}

// Klavye/dokunma erişilebilirliği (R-012/R-013, tasokey#30): odaklanabilir hedef + Enter/Space,
// dil anahtarlı aria-label. Tıklama ve klavye aynı eyleme varır — ayrı bir dokunma kodu yok.
function tiklanabilirYap(eleman_, islev) {
  eleman_.addEventListener('click', islev);
  eleman_.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    islev();
  });
}

// Taşın ekran okuyucu etiketi; renk adı da dil anahtarından gelir (R-008).
function tasAriaEtiketi(tas, okeyTasi) {
  if (tas.tur !== 'sayi') return metinAl('tas.etiketSahteOkey');
  const renkMetni = metinAl(`renk.${tas.renk}`);
  const anahtar = tasOkeyMi(tas, okeyTasi) ? 'tas.etiketOkey' : 'tas.etiket';
  return metinAl(anahtar, [renkMetni, tas.sayi]);
}

// Yuva içeriğini yeni ele göre günceller: hâlâ elde olan taş kendi yuvasında kalır (oyuncunun
// dizilimi/aralığı bozulmaz), elden çıkan taşın yuvası boş kalır, yeni çekilen taş ilk boş yuvaya girer.
function rafYerlesimiGuncelle(yeniEl) {
  const mevcutIdSeti = new Set(yeniEl.map((tas) => tas.id));
  const yerlesim = durumKutu.rafYerlesimi.map((id) => (id !== null && mevcutIdSeti.has(id) ? id : null));
  const yerlesimdekiIdSeti = new Set(yerlesim.filter((id) => id !== null));
  for (const tas of yeniEl) {
    if (yerlesimdekiIdSeti.has(tas.id)) continue;
    const bosIndex = yerlesim.indexOf(null);
    if (bosIndex === -1) yerlesim.push(tas.id);
    else yerlesim[bosIndex] = tas.id;
  }
  durumKutu.rafYerlesimi = yerlesim;
}

// Sürükleyip bırakmayla bir taşı hedef yuvaya koyar: hedef boşsa taş oraya geçer ve eski yuvası
// boş kalır (oyuncu taşları aralıklı dizebilir); hedef doluysa iki taş yer değiştirir.
function tasiYuvayaTasi(tasId, hedefIndex) {
  const yerlesim = durumKutu.rafYerlesimi.slice();
  const kaynakIndex = yerlesim.indexOf(tasId);
  if (kaynakIndex === -1 || kaynakIndex === hedefIndex || hedefIndex < 0 || hedefIndex >= yerlesim.length) return;
  const hedefIcerik = yerlesim[hedefIndex];
  yerlesim[hedefIndex] = tasId;
  yerlesim[kaynakIndex] = hedefIcerik;
  durumKutu.rafYerlesimi = yerlesim;
  rafCiz();
}

// ADR-011: sahte okey rakamsız kendi gövde varyantını kullanır (yıldız işareti SVG içinde),
// sayılı taş paylaşılan gövdeyi (tas-govde.svg) + ayrı DOM rakam katmanını kullanır.
function tasGovdeDosyasi(tas) {
  return tas.tur === 'sahteOkey' ? 'tas-sahte-okey.svg' : 'tas-govde.svg';
}

// Rakam gerçek (seçilebilir, erişilebilir) DOM metni olarak gövdenin üstüne bindirilir; rengi
// ayrıca tanımlanmaz, `.tas`/`.tas.<renk>` sınıfının `color`ı miras alınır (tas-govde.svg'deki
// daire de aynı currentColor'ı kullanır) → rakam ve daire tek kaynaktan renklenir (STIL.md §4).
function tasRakamElemaniOlustur(tas) {
  const span = document.createElement('span');
  span.className = 'tas-rakam';
  span.textContent = String(tas.sayi);
  return span;
}

function tasElemaniOlustur(tas, okeyTasi) {
  const div = document.createElement('div');
  div.className = 'tas';
  if (tas.tur !== 'sahteOkey') div.classList.add(tas.renk);
  div.appendChild(gorselOlustur(tasGovdeDosyasi(tas), 'tas-yuz'));
  if (tas.tur !== 'sahteOkey') div.appendChild(tasRakamElemaniOlustur(tas));
  if (tasOkeyMi(tas, okeyTasi)) div.appendChild(gorselOlustur('tas-okey-cerceve.svg', 'tas-cerceve'));
  div.dataset.tasId = tas.id;
  return div;
}

function tersTasElemaniOlustur() {
  const div = document.createElement('div');
  div.className = 'tas-arka';
  div.appendChild(gorselOlustur('tas-arka.svg'));
  return div;
}

function mesajGoster(sebep) {
  durumKutu.mesajAnahtari = sebep ? `reddedilme.${sebep}` : null;
}

function sonucMetni() {
  const { durum } = durumKutu;
  if (durum.sonuc === EL_SONUCU.BITTI) return metinAl('sonuc.bitti', [oyuncuAdi(durum.kazanan)]);
  if (durum.sonuc === EL_SONUCU.BERABERE) return metinAl('sonuc.berabere');
  if (durum.sonuc === EL_SONUCU.TUR_SINIRI) return metinAl('sonuc.turSiniri');
  return '';
}

function ustCubukCiz() {
  const baslik = metinAl('baslik');
  eleman.baslikMetni.textContent = baslik;
  document.title = baslik;
  eleman.dilDugmesi.textContent = metinAl('dilDegistir');
}

function durumSatiriCiz() {
  const { durum, mesajAnahtari } = durumKutu;
  let metin;
  let retMi = false;
  if (mesajAnahtari) {
    metin = metinAl(mesajAnahtari);
    retMi = true;
  } else if (durum.sonuc !== EL_SONUCU.SUREN) {
    metin = sonucMetni();
  } else if (durum.sira === INSAN_OYUNCUSU) {
    metin = metinAl('sira.sen');
  } else {
    metin = metinAl('sira.bot', [oyuncuAdi(durum.sira)]);
  }
  eleman.durumSatiri.textContent = metin;
  eleman.durumSatiri.classList.toggle('ret', retMi);
}

// R-011 kabul: köşe yığınında en üst taş tam, alttakiler kaydırılmış (translate); gerçek adet
// erişilebilir etiketle (`koseYigini.adet`) kutunun aria-label'ına yazılır (görünen sayaç
// aria-hidden, aynı bilgiyi tekrar okutmamak için). Kaydırma miktarı CSS `--kose-kaydirma` ile
// aynı değeri kullanır (stil.css kök değişkeni; burada sayısal olarak tekrarlanır, JS tarafında
// CSS değişkeni hesaplaması olmadığı için — ekran.js'in sabit değerleri CSS_VAR_* önekiyle anılır).
const CSS_VAR_KOSE_KAYDIRMA_PX = 5;

function koseYiginiCiz(kutu, yiginAlani, sayacEl, yigin, oyuncu, okeyTasi) {
  yiginAlani.innerHTML = '';
  const gorunenler = yigin.slice(-KOSE_GORUNEN_MAKSIMUM);
  gorunenler.forEach((tas, index) => {
    const tasElemani = tasElemaniOlustur(tas, okeyTasi);
    const alttanSira = gorunenler.length - 1 - index;
    const kaydirma = alttanSira * CSS_VAR_KOSE_KAYDIRMA_PX;
    tasElemani.style.transform = `translate(${-kaydirma}px, ${-kaydirma}px)`;
    tasElemani.style.zIndex = String(10 - alttanSira);
    yiginAlani.appendChild(tasElemani);
  });
  sayacEl.textContent = String(yigin.length);
  kutu.setAttribute('aria-label', metinAl('koseYigini.adet', [oyuncuAdi(oyuncu), yigin.length]));
}

// R-013: elin bitirilebilir olup olmadığı yalnız iş 3'ün sorgusuyla (`elBitirenTaslar`) anlaşılır;
// kural burada yeniden yazılmaz. Çekilmeden önce ya da sıra bende değilken anlamsız olduğundan
// o durumlarda boş liste döner.
function insanBitirenTaslar(durum) {
  if (durum.sira !== INSAN_OYUNCUSU || !durum.cekildiMi || durum.sonuc !== EL_SONUCU.SUREN) return [];
  return elBitirenTaslar(durum.eller[INSAN_OYUNCUSU], durum.okeyTasi, KURAL_VARSAYILAN, durum.gosterge);
}

function masaCiz() {
  const { durum } = durumKutu;

  eleman.yerDestesiBaslik.textContent = metinAl('yerDestesi');
  eleman.yerDestesi.innerHTML = '';
  if (durum.yerDestesi.length > 0) eleman.yerDestesi.appendChild(tersTasElemaniOlustur());
  eleman.yerDestesiSayac.textContent = String(durum.yerDestesi.length);
  eleman.yerDestesi.setAttribute('aria-label', metinAl('yerDestesi'));

  const bitirilebilirMi = insanBitirenTaslar(durum).length > 0;
  eleman.yerDestesi.classList.toggle('bitirilebilir', bitirilebilirMi);
  eleman.yerDestesiIpucu.textContent = bitirilebilirMi ? metinAl('yerDestesi.bitirilebilirIpucu') : '';

  eleman.gostergeBaslik.textContent = metinAl('gosterge');
  eleman.gosterge.innerHTML = '';
  eleman.gosterge.appendChild(tasElemaniOlustur(durum.gosterge, durum.okeyTasi));

  for (const oyuncu of [1, 2, 3]) {
    const { kutu, ad } = KENAR_ELEMAN_ADLARI[KENAR_HARITASI[oyuncu]];
    eleman[ad].textContent = oyuncuAdi(oyuncu);
    eleman[kutu].classList.toggle('aktif', durum.sira === oyuncu && durum.sonuc === EL_SONUCU.SUREN);
  }

  // R-012: yalnız önceki oyuncunun köşesi geçerli çekme kaynağıdır; o köşe `cekilebilir` sınıfıyla
  // işaretlenir (tıklama da yalnız o köşeye bağlıdır, bkz. olaylariBagla).
  const cekilebilirKoseAdi = KOSE_HARITASI[oncekiOyuncu(durum.sira)];
  for (const oyuncu of [0, 1, 2, 3]) {
    const koseAdi = KOSE_HARITASI[oyuncu];
    const { kutu, yigin, sayac } = KOSE_ELEMAN_ADLARI[koseAdi];
    koseYiginiCiz(eleman[kutu], eleman[yigin], eleman[sayac], durum.atilanYiginlar[oyuncu], oyuncu, durum.okeyTasi);
    eleman[kutu].classList.toggle('cekilebilir', koseAdi === cekilebilirKoseAdi);
  }
}

function tasiSec(id) {
  if (durumKutu.durum.sira !== INSAN_OYUNCUSU) return;
  durumKutu.secilenTasId = durumKutu.secilenTasId === id ? null : id;
  ciz();
}

function rafCiz() {
  const { durum, rafYerlesimi, secilenTasId } = durumKutu;
  eleman.rafBaslik.textContent = metinAl('rafim');
  const elMap = new Map(durum.eller[INSAN_OYUNCUSU].map((tas) => [tas.id, tas]));
  eleman.raf.innerHTML = '';
  for (let index = 0; index < rafYerlesimi.length; index++) {
    const yuva = document.createElement('div');
    yuva.className = 'raf-yuva';
    yuva.dataset.slotIndex = String(index);
    const id = rafYerlesimi[index];
    const tas = id !== null ? elMap.get(id) : null;
    if (tas) {
      const tasElemani = tasElemaniOlustur(tas, durum.okeyTasi);
      const seciliMi = id === secilenTasId;
      if (seciliMi) tasElemani.classList.add('secili');
      tasElemani.setAttribute('tabindex', '0');
      tasElemani.setAttribute('role', 'button');
      tasElemani.setAttribute('aria-pressed', String(seciliMi));
      tasElemani.setAttribute('aria-label', tasAriaEtiketi(tas, durum.okeyTasi));
      tiklanabilirYap(tasElemani, () => tasiSec(id));
      yuva.appendChild(tasElemani);
    } else {
      yuva.appendChild(gorselOlustur('yuva-bos.svg'));
    }
    eleman.raf.appendChild(yuva);
  }
}

function sonucKalanTaslariCiz(sonuc) {
  eleman.sonucKalanTaslar.innerHTML = '';
  for (const { oyuncu, sayi } of sonuc.kalanTaslar) {
    const li = document.createElement('li');
    li.textContent = metinAl('sonuc.kalanTas', [oyuncuAdi(oyuncu), sayi]);
    eleman.sonucKalanTaslar.appendChild(li);
  }
}

function sonucPaneliCiz() {
  const { durum } = durumKutu;
  const sonuc = elSonucunuHesapla(durum);
  eleman.sonucPaneli.classList.toggle('gorunur', sonuc !== null);
  if (sonuc === null) return;
  eleman.sonucMetni.textContent = sonucMetni();
  sonucKalanTaslariCiz(sonuc);
  eleman.yeniElButonu.textContent = metinAl('yeniEl');
}

// R-014: dikey/yatay geçişi CSS ortam sorgusu yönetir (stil.css `orientation: portrait`); burada
// yalnız dil anahtarlı uyarı metni basılır — JS yön tespiti yapmaz, sabit metin yazmaz.
function telefonUyarisiCiz() {
  eleman.telefonUyarisiMetni.textContent = metinAl('telefonuCevir');
}

function ciz() {
  ustCubukCiz();
  durumSatiriCiz();
  masaCiz();
  rafCiz();
  telefonUyarisiCiz();
  sonucPaneliCiz();
}

function cekSonucunuIsle(sonuc) {
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumKutu.durum = sonuc.durum;
  rafYerlesimiGuncelle(sonuc.durum.eller[INSAN_OYUNCUSU]);
  mesajGoster(null);
  ciz();
}

// Atma ve bitirme aynı motor çağrısına (`at`) varır: el.js bu hamlenin kalan eli bitirip
// bitirmediğine zaten kendi bakar (R-005/R-013), etkileşim yalnız ÖNDEN göstermek için
// `elBitirenTaslar`a bakmıştı (etkilesim.js) — burada motor sonucunu uygulamaktan başka bir
// kural tekrarı yok (ADR-002).
function atVeyaBitirUygula(tasId) {
  const sonuc = at(durumKutu.durum, INSAN_OYUNCUSU, tasId);
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumKutu.durum = sonuc.durum;
  durumKutu.secilenTasId = null;
  rafYerlesimiGuncelle(sonuc.durum.eller[INSAN_OYUNCUSU]);
  mesajGoster(null);
  ciz();
  botSirasiniBaslat();
}

// `etkilesim.js`in döndürdüğü eylem kararını uygular: sürükleme, dokunma (tıklama) ve klavye
// yolu hepsi buraya varır (tasokey#30). Doğrulama burada yok — yalnız hangi motor çağrısının
// (`cek`/`at`) yapılacağına ya da rafta taşıma olduğuna göre dağıtır.
function eylemiUygula(karar) {
  if (karar.eylem === EYLEM.GECERSIZ) {
    mesajGoster(karar.sebep);
    ciz();
    return;
  }
  if (karar.eylem === EYLEM.RAFTA_TASI) {
    tasiYuvayaTasi(karar.tasId, karar.slotIndex);
    return;
  }
  if (karar.eylem === EYLEM.CEK_DESTE) {
    cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.YER));
    return;
  }
  if (karar.eylem === EYLEM.CEK_KOSE) {
    cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.ATILAN));
    return;
  }
  atVeyaBitirUygula(karar.tasId);
}

// Dokunma/tıklama/klavye yolu: seçili taş zaten `durumKutu`da durur (dokun-seç → hedefe dokun).
function etkilesimUygula(hedefTuru, hedef = {}) {
  const karar = eylemKararVer(durumKutu.secilenTasId, hedefTuru, durumKutu.durum, INSAN_OYUNCUSU, hedef);
  eylemiUygula(karar);
}

// Sürükleme yolu: taşınan taş id'si sürükleme olayından gelir, seçim durumuna bakılmaz.
function hedefeBirakUygula(tasId, hedefTuru, hedef) {
  const karar = eylemKararVer(tasId, hedefTuru, durumKutu.durum, INSAN_OYUNCUSU, hedef);
  eylemiUygula(karar);
}

function botAdimiOyna() {
  const { durum } = durumKutu;
  const sonuc = kolayBotTurOyna(durum, durum.sira);
  if (!sonuc.basarili) {
    // Bot her zaman geçerli hamle seçmeli (ADR-002 değişmezi); burası yalnız teşhis için.
    console.error('bot hamlesi motor tarafından reddedildi', sonuc.sebep);
    durumKutu.botCalisiyor = false;
    ciz();
    return;
  }
  durumKutu.durum = sonuc.durum;
  ciz();
  if (sonuc.durum.sonuc !== EL_SONUCU.SUREN || sonuc.durum.sira === INSAN_OYUNCUSU) {
    durumKutu.botCalisiyor = false;
    return;
  }
  setTimeout(botAdimiOyna, BOT_GECIKME_MS);
}

function botSirasiniBaslat() {
  const { durum } = durumKutu;
  if (durum.sonuc !== EL_SONUCU.SUREN || durum.sira === INSAN_OYUNCUSU) return;
  durumKutu.botCalisiyor = true;
  setTimeout(botAdimiOyna, BOT_GECIKME_MS);
}

function dilDegistir() {
  durumKutu.dilKodu = durumKutu.dilKodu === 'tr' ? 'en' : 'tr';
  kayitYaz({ dilKodu: durumKutu.dilKodu });
  ciz();
}

// R-010: oyuncu bir eli yeniden başlatabilir. Yeni el yeni bir gösterge/okey taşı belirler
// (dagitim.js `dagit` her çağrıda yeniden karar, elBaslat çağrısından gelir); dil/kayıt tercihi
// (durumKutu.dilKodu) bu sıfırlamadan etkilenmez.
function elDurumunuSifirla(tohum) {
  durumKutu.durum = elBaslat(tohum);
  durumKutu.rafYerlesimi = new Array(RAF_SLOT_SAYISI).fill(null);
  durumKutu.durum.eller[INSAN_OYUNCUSU].forEach((tas, index) => {
    durumKutu.rafYerlesimi[index] = tas.id;
  });
  durumKutu.secilenTasId = null;
  durumKutu.mesajAnahtari = null;
  durumKutu.botCalisiyor = false;
}

function yeniElBaslat() {
  elDurumunuSifirla(tohumuBelirle());
  ciz();
}

function elemanlariTopla() {
  const idler = [
    'baslikMetni', 'dilDugmesi', 'durumSatiri',
    'yerDestesiBaslik', 'yerDestesi', 'yerDestesiSayac', 'yerDestesiIpucu',
    'gostergeBaslik', 'gosterge',
    'kenarUst', 'kenarUstAd',
    'kenarSol', 'kenarSolAd',
    'kenarSag', 'kenarSagAd',
    'telefonUyarisiMetni',
    'koseSolUst', 'koseSolUstYigin', 'koseSolUstSayac',
    'koseSagUst', 'koseSagUstYigin', 'koseSagUstSayac',
    'koseSolAlt', 'koseSolAltYigin', 'koseSolAltSayac',
    'koseSagAlt', 'koseSagAltYigin', 'koseSagAltSayac',
    'rafBaslik', 'raf',
    'sonucPaneli', 'sonucMetni', 'sonucKalanTaslar', 'yeniElButonu',
  ];
  for (const id of idler) eleman[id] = document.getElementById(id);
}

// R-012/R-013: her köşe/deste hedefi hangi eylemi (çek/at/bitir) temsil ettiğine `etkilesim.js`de
// karar verilir; burada hedef türüne göre dağıtmaktan başka bir kural yok (geçersiz hedef dil
// anahtarlı ret mesajıyla gösterilir, bkz. eylemiUygula → mesajGoster).
function olaylariBagla() {
  tiklanabilirYap(eleman.yerDestesi, () => etkilesimUygula(HEDEF_TURU.YER_DESTESI));
  for (const koseAdi of Object.keys(KOSE_ELEMAN_ADLARI)) {
    tiklanabilirYap(eleman[KOSE_ELEMAN_ADLARI[koseAdi].kutu], () => etkilesimUygula(HEDEF_TURU.KOSE, { kose: koseAdi }));
  }
  eleman.dilDugmesi.addEventListener('click', dilDegistir);
  eleman.yeniElButonu.addEventListener('click', yeniElBaslat);
  surukleBagla(eleman.raf, hedefeBirakUygula);
}

async function dilleriYukle() {
  const [tr, en] = await Promise.all([
    fetch('diller/tr.json').then((yanit) => yanit.json()),
    fetch('diller/en.json').then((yanit) => yanit.json()),
  ]);
  return { tr, en };
}

function tohumuBelirle() {
  const parametreler = new URLSearchParams(location.search);
  const parametreTohum = parametreler.get('tohum');
  return parametreTohum !== null ? Number(parametreTohum) : Date.now();
}

async function baslat() {
  elemanlariTopla();
  document.documentElement.style.setProperty('--raf-sutun-sayisi', String(RAF_SUTUN_SAYISI));
  const [diller] = await Promise.all([dilleriYukle(), gorselleriOnYukle(GORSEL_DOSYALARI)]);
  durumKutu.diller = diller;
  durumKutu.dilKodu = kayitOku().dilKodu;
  elDurumunuSifirla(tohumuBelirle());
  olaylariBagla();
  ciz();
}

baslat();
