// Masa, raf, atılan taş yığını; olay bağlama (MIMARI.md §3 `arayuz/ekran.js`; ADR-002).
// Kural bilgisi burada yok: her çek/at çağrısı `cekirdek/el.js`'e gider; bu dosya yalnız
// sonucu DOM'a yansıtır (R-003, R-005, R-006, R-009; tasokey#10).

import { elBaslat, cek, at, KAYNAK, EL_SONUCU, sonrakiOyuncu, oncekiOyuncu } from '../cekirdek/el.js';
import { tasOkeyMi } from '../cekirdek/dagitim.js';
import { elBitirenTaslar, elDokumu, dokumSirasi } from '../cekirdek/cozucu.js';
import { KURAL_VARSAYILAN } from '../cekirdek/kural.js';
import { elSonucunuHesapla } from '../cekirdek/puan.js';
import { cevir } from '../dil/cevir.js';
import { surukleBagla, cekmeSurukleBagla, SURUKLENIYOR_SINIFI } from './surukle.js';
import { HEDEF_TURU, EYLEM, eylemKararVer, cekmeKararVer, rakipEliAcikMi } from './etkilesim.js';
import {
  EKRAN, OLAY, BILGI, ZORLUKLAR, kabukBaslat, gecis, kayitAlanlari, botTurunuOynat,
  oyunuBitirilebilirMi, onayBekliyorMu, bilgiBekliyorMu, dokumAcikMi, sonucKucukMu,
  botSirasiMi, bekleyenBotTuruGecerliMi, ustCubukBaslikTarifi,
} from './kabuk.js';
import { kayitOku, kayitYaz } from '../kayit/depo.js';
import { gorselOlustur, gorselleriOnYukle } from './gorseller.js';
import { oyuncuKenarHaritasi, oyuncununAtilanKosesi } from './yerlesim.js';
import { RAF_SUTUN_SAYISI, rafYerlesimiGuncelle, tasiYuvayaTasi, yerlesimKur } from './raf.js';

// masa-zemin.svg ve istaka.svg CSS arka planı olarak kullanılır (arayuz/stil.css #masa / #rafAlani
// — burada önceden yüklenmesi gerekmez). Sayı yüzü artık tek paylaşılan gövde (tas-govde.svg) +
// DOM rakam katmanı; ADR-011 (tasokey#28), eski tas-01.svg…tas-13.svg deseni kaldırıldı.
const GORSEL_DOSYALARI = ['tas-govde.svg', 'tas-sahte-okey.svg', 'tas-okey-cerceve.svg', 'tas-arka.svg', 'yuva-bos.svg'];

const INSAN_OYUNCUSU = 0;

// Her bırakmadan (atmadan) sonra sıra 1 saniye sonra geçer (Sahip isteği, tasokey#49): oyuncu
// hamlesinin masaya yansımasını görsün, botlar da birbirinin hamlesini anlaşılır bir ritimle
// oynasın. TEK KAYNAK: hem insan→bot hem bot→bot geçişi `botAdiminiSiraya` kapısından geçtiği
// için bu sabit iki yolda da aynı beklemeyi verir (eski ad `BOT_GECIKME_MS` = 450 ms).
const SIRA_GECIS_GECIKME_MS = 1000;

// Istakanın yuva sayıları ve bütün yerleşim kuralları `arayuz/raf.js`te (ADR-019, tasokey#48);
// bu dosya yalnız dönen yerleşimi çizer. CSS `--raf-sutun-sayisi` de aynı sabitten okunur (baslat()).

// ADR-012 (tasokey#29): Sahip (oyuncu 0) her zaman alt kenarda; diğer kenarlar/köşeler
// `arayuz/yerlesim.js`in saf mantığıyla, el.js'in sıra yönüyle (sonrakiOyuncu) hesaplanır.
// Oyuncu sayısı ve yön sabit olduğundan harita bir kere (modül yüklenirken) çıkarılır.
const KENAR_HARITASI = oyuncuKenarHaritasi(sonrakiOyuncu);
const KOSE_HARITASI = [0, 1, 2, 3].map((oyuncu) => oyuncununAtilanKosesi(oyuncu, sonrakiOyuncu));

// Rakip kenarlarının ıstaka çubuğu yalnız CSS'te durur (kenar-raf-yatay/dikey, stil.css) — ahşap
// sırt dışında içerik basılmaz (Sahip ek bilgisi, 2026-11-20: rakip taşları EL SÜRERKEN hiç
// görünmemeli, ne yüz ne kapalı taş; gerçek okeydeki gibi yalnız ıstakanın arkası). El bitince
// aynı kenarın `taslar` kutusu rakibin elini açar (Sahip ek bilgisi, 2026-11-20).
const KENAR_ELEMAN_ADLARI = {
  ust: { kutu: 'kenarUst', ad: 'kenarUstAd', taslar: 'kenarUstTaslar' },
  sol: { kutu: 'kenarSol', ad: 'kenarSolAd', taslar: 'kenarSolTaslar' },
  sag: { kutu: 'kenarSag', ad: 'kenarSagAd', taslar: 'kenarSagTaslar' },
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

// Deste de aynı kaydırılmış-katman diliyle çizilir (madde 2, tasokey#33): tek taş yerine birkaç
// ters taş üst üste görünür; gerçek kalan sayı ayrıca sayaçta okunur.
const DESTE_GORUNEN_MAKSIMUM = 4;

// Zorluk düğmelerinin eleman adları kademe adından türetilir (ADR-016): yeni bir kademe eklenirse
// `bot/bot.js` → `kabuk.js` ZORLUKLAR zinciri yeter, burada ikinci bir liste tutulmaz. Karşılığı
// index.html'de `id="zorlukKolay"` … düğmeleridir.
const ZORLUK_DUGME_ADLARI = Object.fromEntries(
  ZORLUKLAR.map((zorluk) => [zorluk, `zorluk${zorluk[0].toUpperCase()}${zorluk.slice(1)}`]),
);

const durumKutu = {
  durum: null,
  // Hangi ekran açık + hangi zorluk oynanıyor (arayuz/kabuk.js durum makinesi, ADR-016).
  kabuk: null,
  diller: {},
  dilKodu: 'tr',
  rafYerlesimi: [],
  secilenTasId: null,
  // Sürüklemesi SÜREN ıstaka taşının kimliği (ADR-021/5): gizlemenin TEK kaynağı burasıdır,
  // `rafCiz` onu her çizimde yeniden uygular. Sürükleme yoksa null.
  suruklenenTasId: null,
  mesajAnahtari: null,
  botCalisiyor: false,
  // Her kurulan el bir "nesil"dir (tasokey#43): zamanlayıcıyla sıraya girmiş bot turu ateşlendiğinde
  // hangi elin turu olduğunu bu sayıyla doğrular. Sayı yalnız `elDurumunuSifirla`da artar.
  elNesli: 0,
  // Bekleyen bot turunun zamanlayıcı kimliği (iptal edilebilmesi için); bekleyen tur yoksa null.
  botZamanlayici: null,
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

// Yuva içeriğini yeni ele göre günceller; kural `raf.js`te (ADR-019). `yeniTasYuvasi` yalnız
// sürükleyerek çekmede doludur: çekilen taş bırakıldığı yuvada kalır (dokunma/klavye yolunda
// verilmez, taş ilk boş yuvaya girer).
function rafYerlesiminiTazele(yeniEl, yeniTasYuvasi) {
  durumKutu.rafYerlesimi = rafYerlesimiGuncelle(durumKutu.rafYerlesimi, yeniEl, { yeniTasYuvasi });
}

// Sürükleyip bırakmayla bir taşı hedef yuvaya koyar; bırakma kuralı (yer açma, itme yönü, taşma)
// `raf.js`te durur — burada yalnız sonucu yerleşime yazıp yeniden çizmek var.
function rafYuvasinaBirak(tasId, hedefIndex) {
  const yeniYerlesim = tasiYuvayaTasi(durumKutu.rafYerlesimi, tasId, hedefIndex);
  if (yeniYerlesim === durumKutu.rafYerlesimi) return;
  durumKutu.rafYerlesimi = yeniYerlesim;
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

// Üst çubuk: başlık, dil düğmesi ve "Oyunu bitir" (tasokey#43). Düğmenin görünürlüğü kabuğa
// sorulur (yalnız el sürerken anlamlı) — burada "şu panel kapalıysa göster" kuralı yazılmaz.
//
// Başlık da aynı kapıdan gelir (tasokey#45): hangi anahtarlardan kurulacağına `kabuk.js`
// (`ustCubukBaslikTarifi`) karar verir — burada kademe adı, ayırıcı ya da sıra yazılmaz, yalnız
// tarifteki anahtarlar çevrilir. `document.title` (sekme adı) kademeyle DEĞİŞMEZ: sekmede ürün
// adı durur, oynanan kademe yalnız çubuğun kendisinde okunur.
function ustCubukCiz() {
  const tarif = ustCubukBaslikTarifi(durumKutu.kabuk);
  eleman.baslikMetni.textContent = metinAl(tarif.anahtar, tarif.degerAnahtarlari.map((anahtar) => metinAl(anahtar)));
  document.title = metinAl('baslik');
  eleman.dilDugmesi.textContent = metinAl('dilDegistir');
  eleman.oyunuBitirButonu.textContent = metinAl('oyunuBitir');
  eleman.oyunuBitirButonu.hidden = !oyunuBitirilebilirMi(durumKutu.kabuk);
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

// Madde 4 (tasokey#33): boşken "0" yazısı yerine boş yuva/silik taş çerçevesi (yuva-bos.svg,
// rafın boş yuvasıyla aynı görsel dil) görünür; erişilebilir adet etiketi (aria-label) gerçek
// sayıyı (0 dahil) yine de taşır, yalnız görünen sayaç metni boşken basılmaz.
function koseYiginiCiz(kutu, yiginAlani, sayacEl, yigin, oyuncu, okeyTasi) {
  yiginAlani.innerHTML = '';
  if (yigin.length === 0) {
    yiginAlani.appendChild(gorselOlustur('yuva-bos.svg', 'kose-yuva-bos'));
    sayacEl.textContent = '';
  } else {
    const gorunenler = yigin.slice(-KOSE_GORUNEN_MAKSIMUM);
    gorunenler.forEach((tas, index) => {
      const tasElemani = tasElemaniOlustur(tas, okeyTasi);
      const alttanSira = gorunenler.length - 1 - index;
      const kaydirma = alttanSira * CSS_VAR_KOSE_KAYDIRMA_PX;
      tasElemani.style.transform = `translate(${-kaydirma}px, ${-kaydirma}px)`;
      // Yığılma kademesi JS'te yazılmaz (ADR-015, tasokey#38): burada yalnız yığın İÇİ sıra verilir
      // (1 = en alt), gerçek z-index stil.css'teki --kademe-masa üstüne eklenir.
      tasElemani.style.setProperty('--yigin-sira', String(gorunenler.length - alttanSira));
      yiginAlani.appendChild(tasElemani);
    });
    sayacEl.textContent = String(yigin.length);
  }
  kutu.setAttribute('aria-label', metinAl('koseYigini.adet', [oyuncuAdi(oyuncu), yigin.length]));
}

// Madde 2 (tasokey#33): ortadaki deste de köşe yığınıyla aynı mantıkla üst üste kaydırılmış
// birkaç ters taş olarak görünür (tek taş yerine); kalan gerçek sayı ayrı sayaçta okunur.
function yerDestesiYiginiCiz(alan, adet) {
  alan.innerHTML = '';
  const gorunenSayi = Math.min(adet, DESTE_GORUNEN_MAKSIMUM);
  for (let index = 0; index < gorunenSayi; index++) {
    const tersTas = tersTasElemaniOlustur();
    const alttanSira = gorunenSayi - 1 - index;
    const kaydirma = alttanSira * CSS_VAR_KOSE_KAYDIRMA_PX;
    tersTas.style.transform = `translate(${-kaydirma}px, ${-kaydirma}px)`;
    // Köşe yığınıyla aynı dil: yalnız yığın içi sıra; kademe stil.css'te (ADR-015).
    tersTas.style.setProperty('--yigin-sira', String(gorunenSayi - alttanSira));
    alan.appendChild(tersTas);
  }
}

// El bitince rakibin ıstakası açılır (Sahip ek bilgisi, 2026-11-20): kutu rakibin bütün taşlarını
// yüzü açık gösterir. "Açık mı" kararı saf modülde (etkilesim.js rakipEliAcikMi); burada yalnız
// çizim var. El sürerken kutu boşaltılır — rakip taşı bir an bile görünmez.
// Taşlar DİZİLİ serilir (Sahip ek bilgisi, 2026-11-20): sıra `cekirdek/cozucu.js` dökümünden gelir
// (perler → çiftler → per dışı kalanlar); arayüz kendi sıralama kuralı yazmaz.
function rakipTaslariCiz(kutu, el, okeyTasi, acikMi, oyuncu, gosterge) {
  kutu.innerHTML = '';
  if (!acikMi) {
    kutu.removeAttribute('aria-label');
    return;
  }
  const sirali = dokumSirasi(elDokumu(el, okeyTasi, KURAL_VARSAYILAN, gosterge));
  for (const tas of sirali) {
    const tasElemani = tasElemaniOlustur(tas, okeyTasi);
    tasElemani.setAttribute('aria-label', tasAriaEtiketi(tas, okeyTasi));
    kutu.appendChild(tasElemani);
  }
  kutu.setAttribute('aria-label', metinAl('rakipAcikEl', [oyuncuAdi(oyuncu), el.length]));
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
  yerDestesiYiginiCiz(eleman.yerDestesi, durum.yerDestesi.length);
  eleman.yerDestesiSayac.textContent = String(durum.yerDestesi.length);
  eleman.yerDestesi.setAttribute('aria-label', metinAl('yerDestesi'));

  const bitirilebilirMi = insanBitirenTaslar(durum).length > 0;
  eleman.yerDestesi.classList.toggle('bitirilebilir', bitirilebilirMi);
  eleman.yerDestesiIpucu.textContent = bitirilebilirMi ? metinAl('yerDestesi.bitirilebilirIpucu') : '';

  eleman.gostergeBaslik.textContent = metinAl('gosterge');
  eleman.gosterge.innerHTML = '';
  eleman.gosterge.appendChild(tasElemaniOlustur(durum.gosterge, durum.okeyTasi));

  const rakipEliAcik = rakipEliAcikMi(durum);
  for (const oyuncu of [1, 2, 3]) {
    const { kutu, ad, taslar } = KENAR_ELEMAN_ADLARI[KENAR_HARITASI[oyuncu]];
    eleman[ad].textContent = oyuncuAdi(oyuncu);
    eleman[kutu].classList.toggle('aktif', durum.sira === oyuncu && durum.sonuc === EL_SONUCU.SUREN);
    rakipTaslariCiz(eleman[taslar], durum.eller[oyuncu], durum.okeyTasi, rakipEliAcik, oyuncu, durum.gosterge);
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

// Sürükleme bildiriminin TEK kapısı (ADR-021/5; `surukle.js` çağırır): gizlemenin kaynağını
// yazar. Çizim YAPMAZ — sürükleme sürerken `ciz()` çağrılsa sürüklenen öğe DOM'dan düşer,
// işaretçi yakalaması kopar ve tasokey#59'un bayat durum ağları devreye girer.
function suruklemeDurumunuYaz(tasId) {
  const oncekiId = durumKutu.suruklenenTasId;
  durumKutu.suruklenenTasId = tasId;
  if (tasId !== null || oncekiId === null) return;
  // Sürükleme bitti. `surukle.js` gizlemeyi KENDİ tuttuğu öğeden kaldırdı, ama ıstaka arada
  // yeniden çizilmişse (bot turu) o öğe belgeden düşmüştür ve sınıf ekranda duran YENİ öğede
  // kalır — taş kalıcı olarak görünmez kalırdı. Burada yalnız o sınıf silinir, yeniden çizim yok.
  for (const oge of eleman.raf.querySelectorAll(`.${SURUKLENIYOR_SINIFI}`)) {
    oge.classList.remove(SURUKLENIYOR_SINIFI);
  }
}

function rafCiz() {
  const { durum, rafYerlesimi, secilenTasId, suruklenenTasId } = durumKutu;
  eleman.rafBaslik.textContent = metinAl('rafim');
  const elMap = new Map(durum.eller[INSAN_OYUNCUSU].map((tas) => [tas.id, tas]));
  eleman.raf.innerHTML = '';
  for (let index = 0; index < rafYerlesimi.length; index++) {
    const yuva = document.createElement('div');
    yuva.className = 'raf-yuva';
    yuva.dataset.slotIndex = String(index);
    // Boş yuva görseli DOLU yuvaya da konur (ADR-021/3): en alt katmanda bekler, taş sürüklenirken
    // görünmez olunca altından aynı görsel çıkar — yuva "boş" görünür. Böylece boş yuva görünümü
    // tek kaynaktan gelir (`yuva-bos.svg`), ikinci bir çizim yazılmaz. Katman akışa girmez ve
    // isabet testinden çekilidir (stil.css `.yuva-bos-katman`).
    yuva.appendChild(gorselOlustur('yuva-bos.svg', 'yuva-bos-katman'));
    const id = rafYerlesimi[index];
    const tas = id !== null ? elMap.get(id) : null;
    if (tas) {
      const tasElemani = tasElemaniOlustur(tas, durum.okeyTasi);
      const seciliMi = id === secilenTasId;
      if (seciliMi) tasElemani.classList.add('secili');
      // Sürüklemesi süren taş yeniden çizildikten sonra da görünmez kalır (ADR-021/5).
      if (id === suruklenenTasId) tasElemani.classList.add(SURUKLENIYOR_SINIFI);
      tasElemani.setAttribute('tabindex', '0');
      tasElemani.setAttribute('role', 'button');
      tasElemani.setAttribute('aria-pressed', String(seciliMi));
      tasElemani.setAttribute('aria-label', tasAriaEtiketi(tas, durum.okeyTasi));
      tiklanabilirYap(tasElemani, () => tasiSec(id));
      yuva.appendChild(tasElemani);
    }
    eleman.raf.appendChild(yuva);
  }
}

// Sahip ek bilgisi (2026-11-20): el bitince her oyuncu için perler, per olmayanlar, (varsa) çiftler
// ve okey sayısı AYRI AYRI yazılır. Parçalar ayrı dil anahtarlarından gelir ve ayraçla birleşir;
// sayıların kaynağı `cekirdek/puan.js`in dökümüdür (kural burada tekrar edilmez).
const DOKUM_AYRACI = ' · ';

function dokumMetni(dokum) {
  const parcalar = [metinAl('sonuc.dokumPer', [dokum.perSayisi, dokum.perTasSayisi])];
  if (dokum.ciftSayisi > 0) parcalar.push(metinAl('sonuc.dokumCift', [dokum.ciftSayisi, dokum.ciftTasSayisi]));
  parcalar.push(metinAl('sonuc.dokumPerDisi', [dokum.perDisiSayisi]));
  parcalar.push(metinAl('sonuc.dokumOkey', [dokum.okeySayisi]));
  return parcalar.join(DOKUM_AYRACI);
}

function sonucKalanTaslariCiz(sonuc) {
  eleman.sonucKalanTaslar.innerHTML = '';
  for (const { oyuncu, sayi } of sonuc.kalanTaslar) {
    const li = document.createElement('li');
    li.textContent = metinAl('sonuc.kalanTas', [oyuncuAdi(oyuncu), sayi]);
    const dokum = document.createElement('div');
    dokum.className = 'sonuc-dokum';
    dokum.textContent = dokumMetni(sonuc.dokumler[oyuncu]);
    li.appendChild(dokum);
    eleman.sonucKalanTaslar.appendChild(li);
  }
}

// Panelin görünürlüğü artık yalnız kabuğun ekranından gelir (ADR-016): "el bitti mi" sorusu
// `elSonucunuHesapla` ile iki kez sorulmaz, geçiş `durumuIlerlet`te bir kez yapılır.
//
// Oyuncuların kalan taşları AÇILIR bir bölümdür (Sahip ek bilgisi, tasokey#50) ve pencere her
// açıldığında KAPALI başlar: bayrağı kabuk tutar (`dokumAcikMi`, ekran değiştiren geçiş kapatır),
// bu dosya kendi "açık mı" bayrağını açmaz (ADR-016/1). Liste kapalıyken kutu da içeriğiyle
// birlikte küçülür — pencerenin sabit bir en/boyu yoktur (Sahip ek bilgisi 2, stil.css
// `#sonucKutusu`).
//
// Pencere ayrıca KÜÇÜLTÜLEBİLİR (tasokey#65): bayrak yine kabuktadır (`sonucKucukMu`), bu dosya
// yalnız `.kucuk` sınıfını taşır — küçükken neyin gizleneceğine stil.css karar verir, burada ikinci
// bir görünürlük kuralı yazılmaz (ADR-016/1). Küçükken de metinler tazelenir: düğme ister
// küçültsün ister büyütsün, dil değişimi onu da günceller (R-008).
function sonucPaneliCiz() {
  const { durum, kabuk } = durumKutu;
  const sonucEkraninda = kabuk.ekran === EKRAN.SONUC;
  const kucuk = sonucEkraninda && sonucKucukMu(kabuk);
  eleman.sonucPaneli.classList.toggle('gorunur', sonucEkraninda);
  eleman.sonucPaneli.classList.toggle('kucuk', kucuk);
  if (!sonucEkraninda) return;
  eleman.kucultAcKapaButonu.textContent = metinAl(kucuk ? 'sonuc.buyut' : 'sonuc.kucult');
  eleman.kucultAcKapaButonu.setAttribute('aria-pressed', String(kucuk));
  const sonuc = elSonucunuHesapla(durum);
  eleman.sonucMetni.textContent = sonucMetni();
  if (sonuc !== null) sonucKalanTaslariCiz(sonuc);
  const dokumAcik = dokumAcikMi(kabuk);
  eleman.dokumAcKapaButonu.textContent = metinAl('sonuc.oyuncuTaslari');
  eleman.dokumAcKapaButonu.setAttribute('aria-expanded', String(dokumAcik));
  eleman.sonucKalanTaslar.hidden = !dokumAcik;
  eleman.yeniElButonu.textContent = metinAl('yeniEl');
  eleman.baslangicaDonButonu.textContent = metinAl('baslangicaDon');
}

// Başlangıç ekranı (ADR-016): Yeni oyun + zorluk seçimi. Seçili kademe hem görsel olarak
// (`.etkin`) hem erişilebilir olarak (`aria-checked`) işaretlenir; metinler dil anahtarından.
function baslangicPaneliCiz() {
  const { kabuk } = durumKutu;
  eleman.baslangicPaneli.classList.toggle('gorunur', kabuk.ekran === EKRAN.BASLANGIC);
  eleman.baslangicBaslik.textContent = metinAl('baslangic.baslik');
  eleman.zorlukBaslik.textContent = metinAl('baslangic.zorluk');
  for (const zorluk of ZORLUKLAR) {
    const dugme = eleman[ZORLUK_DUGME_ADLARI[zorluk]];
    const seciliMi = kabuk.zorluk === zorluk;
    dugme.textContent = metinAl(`zorluk.${zorluk}`);
    dugme.classList.toggle('etkin', seciliMi);
    dugme.setAttribute('aria-checked', String(seciliMi));
  }
  eleman.yeniOyunButonu.textContent = metinAl('yeniOyun');
}

// Oyunu bitirme onayı (tasokey#43): görünürlüğü yine kabuktan gelir (kabuk.onay); masa arkada
// olduğu gibi durur, pencere yalnız üstünü kapatır.
function onayPaneliCiz() {
  const acikMi = onayBekliyorMu(durumKutu.kabuk);
  eleman.onayPaneli.classList.toggle('gorunur', acikMi);
  if (!acikMi) return;
  eleman.onayMetni.textContent = metinAl('onay.oyunuBitir');
  eleman.onayEvetButonu.textContent = metinAl('onay.evet');
  eleman.onayHayirButonu.textContent = metinAl('onay.hayir');
}

// Bilgilendirme penceresi (tasokey#50, ADR-016/8): görünürlüğü ve hangi bilginin gösterildiği
// kabuktan gelir (`kabuk.bilgi`); metnin anahtarı o alandan türer, bu dosya metin yazmaz (R-008).
// Pencere soru sormaz: tek düğmesi yalnız kapatır, hamle çoktan işlenmiştir.
function bilgiPaneliCiz() {
  const acikMi = bilgiBekliyorMu(durumKutu.kabuk);
  eleman.bilgiPaneli.classList.toggle('gorunur', acikMi);
  if (!acikMi) return;
  eleman.bilgiMetni.textContent = metinAl(`bilgi.${durumKutu.kabuk.bilgi}`);
  eleman.bilgiTamamButonu.textContent = metinAl('bilgi.tamam');
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
  baslangicPaneliCiz();
  sonucPaneliCiz();
  onayPaneliCiz();
  bilgiPaneliCiz();
}

// El durumunu ilerletmenin TEK kapısı (ADR-016): motor eli bitirdiyse kabuk `masa` → `sonuc`
// geçişini burada bir kez yapar; çizim işlevleri kendi başına "el bitti mi" kararı vermez.
function durumuIlerlet(yeniDurum) {
  durumKutu.durum = yeniDurum;
  if (yeniDurum.sonuc !== EL_SONUCU.SUREN) {
    durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.EL_BITTI);
  }
}

// `yeniTasYuvasi`: sürükleyerek çekmede taşın bırakıldığı ıstaka yuvası (tasokey#48, ADR-019);
// dokunma/klavye yolunda verilmez.
function cekSonucunuIsle(sonuc, yeniTasYuvasi) {
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumuIlerlet(sonuc.durum);
  rafYerlesiminiTazele(sonuc.durum.eller[INSAN_OYUNCUSU], yeniTasYuvasi);
  mesajGoster(null);
  ciz();
}

// Atma ve bitirme aynı motor çağrısına (`at`) varır: el.js bu hamlenin kalan eli bitirip
// bitirmediğine zaten kendi bakar (R-005/R-013), etkileşim yalnız ÖNDEN göstermek için
// `elBitirenTaslar`a bakmıştı (etkilesim.js) — burada motor sonucunu uygulamaktan başka bir
// kural tekrarı yok (ADR-002).
function atVeyaBitirUygula(tasId) {
  // Atılan taşın okey/sahte okey olup olmadığı hamleden ÖNCE okunur (taş sonra elde değil);
  // "okey mi" sorusunun tek kaynağı `cekirdek/dagitim.js` tasOkeyMi'dir, burada renk/sayı
  // karşılaştırılmaz. Kural artık bu hamleyi engellemiyor (ADR-008 sürüm 2, tasokey#50).
  const atilanTas = durumKutu.durum.eller[INSAN_OYUNCUSU].find((tas) => tas.id === tasId);
  const jokerAtiliyor = atilanTas !== undefined && tasOkeyMi(atilanTas, durumKutu.durum.okeyTasi);
  const sonuc = at(durumKutu.durum, INSAN_OYUNCUSU, tasId);
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumuIlerlet(sonuc.durum);
  // Bilgilendirme penceresi yalnız insan oyuncunun KENDİ joker atışında açılır (ADR-016/8) ve
  // hamleyi geri almaz. Hamle eli bitirdiyse ekran `sonuc`a geçmiş olur; o durumda tek kapı
  // (`gecis`) bilgiyi zaten yok sayar — sonuç penceresiyle üst üste binmez.
  if (jokerAtiliyor) {
    durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.BILGI_GOSTER, { bilgi: BILGI.OKEY_ATILDI });
  }
  durumKutu.secilenTasId = null;
  rafYerlesiminiTazele(sonuc.durum.eller[INSAN_OYUNCUSU]);
  mesajGoster(null);
  ciz();
  // Bilgilendirme açıkken bot sırası başlamaz (koşul `kabuk.js` botSirasiMi'de): pencere
  // kapanınca `bilgiyiKapat` sırayı buradan devam ettirir.
  botSirasiniBaslat();
}

// `etkilesim.js`in döndürdüğü eylem kararını uygular: sürükleme, dokunma (tıklama) ve klavye
// yolu hepsi buraya varır (tasokey#30). Doğrulama burada yok — yalnız hangi motor çağrısının
// (`cek`/`at`) yapılacağına ya da rafta taşıma olduğuna göre dağıtır.
// `yeniTasYuvasi` yalnız sürükleyerek çekme yolundan gelir (bırakılan ıstaka yuvası, tasokey#48).
function eylemiUygula(karar, yeniTasYuvasi) {
  if (karar.eylem === EYLEM.GECERSIZ) {
    mesajGoster(karar.sebep);
    ciz();
    return;
  }
  if (karar.eylem === EYLEM.RAFTA_TASI) {
    rafYuvasinaBirak(karar.tasId, karar.slotIndex);
    return;
  }
  if (karar.eylem === EYLEM.CEK_DESTE) {
    cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.YER), yeniTasYuvasi);
    return;
  }
  if (karar.eylem === EYLEM.CEK_KOSE) {
    cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.ATILAN), yeniTasYuvasi);
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

// Sürükleyerek çekme yolu (tasokey#40, R-012): hareket destede/köşede başlayıp ıstakada bittiğinde
// kaynağın hangi çekmeye karşılık geldiğine `etkilesim.js` karar verir, motor yine `el.js`.
// `birakma.slotIndex` bırakılan ıstaka yuvasıdır (tasokey#48): çekme KARARINA girmez, yalnız
// motor çekmeyi onayladıktan sonra taşın hangi yuvaya konacağını `raf.js`e söyler (ADR-019).
function kaynaktanCekUygula(kaynakTuru, kaynak, birakma = {}) {
  eylemiUygula(cekmeKararVer(kaynakTuru, durumKutu.durum, INSAN_OYUNCUSU, kaynak), birakma.slotIndex);
}

// Bekleyen bot turunu düşürür: zamanlayıcıyı iptal eder ve bot sırasını kapatır. Masadan çıkan ya
// da yeni el kuran her yol buradan geçer (tasokey#43) — ateşlenmeyi bekleyen tur kalmaz.
function botSirasiniDurdur() {
  if (durumKutu.botZamanlayici !== null) {
    clearTimeout(durumKutu.botZamanlayici);
    durumKutu.botZamanlayici = null;
  }
  durumKutu.botCalisiyor = false;
}

// Bot turunu sıraya alan tek kapı: hangi elin (neslin) turu olduğunu zamanlayıcıya birlikte verir.
// Gecikmenin tek kaynağı `SIRA_GECIS_GECIKME_MS`; insanın attığı taştan sonraki ilk bot turu
// (`botSirasiniBaslat`) ve bottan bota geçiş (`botAdimiOyna` sonu) aynı buradan geçer (tasokey#49).
function botAdiminiSiraya(nesil) {
  durumKutu.botZamanlayici = setTimeout(() => botAdimiOyna(nesil), SIRA_GECIS_GECIKME_MS);
}

function botAdimiOyna(nesil) {
  // Başka bir nesle (kapanmış bir ele) ait bekleyen tur: yeni elin defterine HİÇ dokunmadan düşer.
  if (nesil !== durumKutu.elNesli) return;
  durumKutu.botZamanlayici = null;
  const { durum, kabuk } = durumKutu;
  // Tur, oynamadan önce hâlâ geçerli olduğunu kabuğa sorar (tasokey#43): oyuncu gecikmenin
  // ortasında "Oyunu bitir"i onaylamış (ekran `baslangic`), hemen yeni oyun açmış (nesil değişti)
  // ya da sıra insana geçmiş olabilir. Koşulun tek kaynağı `kabuk.js`tir (ADR-016).
  if (!bekleyenBotTuruGecerliMi(kabuk, durum, INSAN_OYUNCUSU, {
    nesil, elNesli: durumKutu.elNesli, botCalisiyor: durumKutu.botCalisiyor,
  })) {
    durumKutu.botCalisiyor = false;
    return;
  }
  // ADR-013 + ADR-016: kademe adı dışarıdan verilir ve oyuncunun başlangıç ekranındaki seçiminden
  // gelir. Kademe adı burada YAZILMAZ — `kabuk.js` botun tek girişini kendi zorluğuyla çağırır.
  const sonuc = botTurunuOynat(kabuk, durum, durum.sira);
  if (!sonuc.basarili) {
    // Bot her zaman geçerli hamle seçmeli (ADR-002 değişmezi); burası yalnız teşhis için.
    console.error('bot hamlesi motor tarafından reddedildi', sonuc.sebep);
    durumKutu.botCalisiyor = false;
    ciz();
    return;
  }
  durumuIlerlet(sonuc.durum);
  ciz();
  if (sonuc.durum.sonuc !== EL_SONUCU.SUREN || sonuc.durum.sira === INSAN_OYUNCUSU) {
    durumKutu.botCalisiyor = false;
    return;
  }
  botAdiminiSiraya(nesil);
}

// Botlar yalnız masa ekranında, el sürerken ve sıra kendilerindeyken oynar (ADR-016); koşulun tek
// kaynağı `kabuk.js` → `botSirasiMi`.
function botSirasiniBaslat() {
  const { durum, kabuk } = durumKutu;
  if (!botSirasiMi(kabuk, durum, INSAN_OYUNCUSU)) return;
  durumKutu.botCalisiyor = true;
  botAdiminiSiraya(durumKutu.elNesli);
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
  // Yeni el = yeni nesil (tasokey#43): bekleyen bir bot turu varsa iptal edilir, iptalin
  // kaçırıldığı durumda (zamanlayıcı tam o anda ateşlenmişse) nesil denetimi onu yine düşürür.
  botSirasiniDurdur();
  durumKutu.elNesli += 1;
  durumKutu.durum = elBaslat(tohum);
  durumKutu.rafYerlesimi = yerlesimKur(durumKutu.durum.eller[INSAN_OYUNCUSU]);
  durumKutu.secilenTasId = null;
  durumKutu.mesajAnahtari = null;
}

// Sonuç ekranındaki "Yeni el": aynı zorlukla hemen yeni el (R-010, kabuk `sonuc → masa`).
function yeniElBaslat() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.YENI_EL);
  elDurumunuSifirla(tohumuBelirle());
  ciz();
  botSirasiniBaslat();
}

// Başlangıç ekranındaki "Yeni oyun": seçilen kademeyle yeni el dağıtılır (kabuk `baslangic → masa`).
// Dağıtımı buradan yapmak elin **seçimden sonra** kurulmasını da garanti eder.
function yeniOyunBaslat() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.YENI_OYUN);
  elDurumunuSifirla(tohumuBelirle());
  ciz();
  botSirasiniBaslat();
}

// Sonuç ekranından başlangıç ekranına dönüş (kabuk `sonuc → baslangic`): oyuncu zorluğu
// değiştirebilir. Masadaki el olduğu gibi kalır; "Yeni oyun"a basılınca yenisi dağıtılır.
function baslangicaDon() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.BASLANGICA_DON);
  botSirasiniDurdur();
  ciz();
}

// Üst çubuktaki "Oyunu bitir" (tasokey#43): el sürerken doğrudan bitirmez, kabuğa soruyu açtırır.
function oyunuBitirIste() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.OYUNU_BITIR);
  ciz();
}

// Onay: kabuk `baslangic`e döner. El durumu burada SIFIRLANMAZ — masadaki el, oyuncu "Yeni oyun"a
// basıp yenisi dağıtılana kadar olduğu gibi kalır (sonuç ekranından dönüşle aynı davranış).
function oyunuBitirOnayla() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.ONAY_EVET);
  // Masadan çıkıldı: bekleyen bot turu burada iptal edilir, "Yeni oyun"u beklemez.
  botSirasiniDurdur();
  ciz();
}

// Vazgeçme: yalnız pencere kapanır; el durumuna (durumKutu.durum, raf yerleşimi, seçili taş)
// hiç dokunulmaz, bu yüzden oyun soru sorulmamış gibi sürer.
function oyunuBitirVazgec() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.ONAY_HAYIR);
  ciz();
}

// Bilgilendirme penceresinin tek düğmesi (tasokey#50): yalnız pencereyi kapatır ve duran bot
// sırasını devam ettirir. El durumuna dokunulmaz — atılan taş masada kalır, ceza yoktur.
function bilgiyiKapat() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.BILGI_KAPAT);
  ciz();
  botSirasiniBaslat();
}

// Sonuç penceresindeki döküm bölümünü aç/kapat (Sahip ek bilgisi, tasokey#50): kabuk bayrağını
// çevirir, pencere yeniden çizilir. Kapalıyken kutu içeriğiyle birlikte küçülür.
function dokumAcKapa() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.DOKUM_AC_KAPA);
  ciz();
}

// Sonuç penceresini küçült/büyüt (tasokey#65): pencere kapanmaz, yalnız geri büyüten düğmeye iner —
// el durumuna ve döküm bölümüne dokunulmaz, büyütünce pencere bırakıldığı gibi geri gelir.
function kucultAcKapa() {
  durumKutu.kabuk = gecis(durumKutu.kabuk, OLAY.SONUC_KUCULT_AC_KAPA);
  ciz();
}

// Zorluk seçimi: karar kabukta (yalnız başlangıç ekranında geçerli), kalıcılığı kayıtta
// (ADR-006 şema sürüm 2 — seçim bir sonraki açılışta geri okunur).
function zorlukSec(zorluk) {
  const yeniKabuk = gecis(durumKutu.kabuk, OLAY.ZORLUK_SEC, { zorluk });
  if (yeniKabuk === durumKutu.kabuk) return;
  durumKutu.kabuk = yeniKabuk;
  kayitYaz(kayitAlanlari(yeniKabuk));
  ciz();
}

function elemanlariTopla() {
  const idler = [
    'baslikMetni', 'dilDugmesi', 'oyunuBitirButonu', 'durumSatiri', 'masa',
    'yerDestesiBaslik', 'yerDestesi', 'yerDestesiSayac', 'yerDestesiIpucu',
    'gostergeBaslik', 'gosterge',
    'kenarUst', 'kenarUstAd', 'kenarUstTaslar',
    'kenarSol', 'kenarSolAd', 'kenarSolTaslar',
    'kenarSag', 'kenarSagAd', 'kenarSagTaslar',
    'telefonUyarisiMetni',
    'koseSolUst', 'koseSolUstYigin', 'koseSolUstSayac',
    'koseSagUst', 'koseSagUstYigin', 'koseSagUstSayac',
    'koseSolAlt', 'koseSolAltYigin', 'koseSolAltSayac',
    'koseSagAlt', 'koseSagAltYigin', 'koseSagAltSayac',
    'rafBaslik', 'raf',
    'sonucPaneli', 'sonucMetni', 'kucultAcKapaButonu', 'dokumAcKapaButonu', 'sonucKalanTaslar',
    'yeniElButonu', 'baslangicaDonButonu',
    'baslangicPaneli', 'baslangicBaslik', 'zorlukBaslik', 'yeniOyunButonu',
    'onayPaneli', 'onayMetni', 'onayEvetButonu', 'onayHayirButonu',
    'bilgiPaneli', 'bilgiMetni', 'bilgiTamamButonu',
    ...Object.values(ZORLUK_DUGME_ADLARI),
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
  eleman.oyunuBitirButonu.addEventListener('click', oyunuBitirIste);
  eleman.onayEvetButonu.addEventListener('click', oyunuBitirOnayla);
  eleman.onayHayirButonu.addEventListener('click', oyunuBitirVazgec);
  eleman.bilgiTamamButonu.addEventListener('click', bilgiyiKapat);
  eleman.dokumAcKapaButonu.addEventListener('click', dokumAcKapa);
  eleman.kucultAcKapaButonu.addEventListener('click', kucultAcKapa);
  eleman.yeniElButonu.addEventListener('click', yeniElBaslat);
  eleman.baslangicaDonButonu.addEventListener('click', baslangicaDon);
  eleman.yeniOyunButonu.addEventListener('click', yeniOyunBaslat);
  for (const zorluk of ZORLUKLAR) {
    eleman[ZORLUK_DUGME_ADLARI[zorluk]].addEventListener('click', () => zorlukSec(zorluk));
  }
  surukleBagla(eleman.raf, hedefeBirakUygula, suruklemeDurumunuYaz);
  cekmeSurukleBagla(eleman.masa, eleman.raf, kaynaktanCekUygula);
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
  // Kayıt bir kez okunur: dil ve zorluk aynı kayıttan gelir (ADR-006 şema sürüm 2). Eski/bozuk
  // kayıt sürüm denetiminde atılır, zorluk da `kabuk.js`te varsayılana düşer.
  const kayit = kayitOku();
  durumKutu.dilKodu = kayit.dilKodu;
  // İlk açılış `baslangic` ekranındadır (ADR-016). El yine de dağıtılır: masa pencerenin arkasında
  // çizilir ve çizim işlevleri boş durumla uğraşmaz; botlar `botSirasiniBaslat` ile yalnız masa
  // ekranında, yani "Yeni oyun"dan sonra oynamaya başlar.
  durumKutu.kabuk = kabukBaslat(kayit);
  elDurumunuSifirla(tohumuBelirle());
  olaylariBagla();
  ciz();
}

baslat();
