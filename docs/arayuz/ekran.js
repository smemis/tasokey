// Masa, raf, atılan taş yığını; olay bağlama (MIMARI.md §3 `arayuz/ekran.js`; ADR-002).
// Kural bilgisi burada yok: her çek/at çağrısı `cekirdek/el.js`'e gider; bu dosya yalnız
// sonucu DOM'a yansıtır (R-003, R-005, R-006, R-009; tasokey#10).

import { elBaslat, cek, at, KAYNAK, EL_SONUCU } from '../cekirdek/el.js';
import { tasOkeyMi } from '../cekirdek/dagitim.js';
import { elSonucunuHesapla } from '../cekirdek/puan.js';
import { kolayBotTurOyna } from '../bot/kolay.js';
import { cevir } from '../dil/cevir.js';
import { surukleBagla } from './surukle.js';

const INSAN_OYUNCUSU = 0;
const BOT_GECIKME_MS = 450;

const durumKutu = {
  durum: null,
  diller: {},
  dilKodu: 'tr',
  rafSirasi: [],
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

function rafSirasiniGuncelle(yeniEl) {
  const mevcutIdSeti = new Set(yeniEl.map((tas) => tas.id));
  const korunan = durumKutu.rafSirasi.filter((id) => mevcutIdSeti.has(id));
  for (const tas of yeniEl) {
    if (!korunan.includes(tas.id)) korunan.push(tas.id);
  }
  durumKutu.rafSirasi = korunan;
}

function tasElemaniOlustur(tas, okeyTasi) {
  const div = document.createElement('div');
  div.className = 'tas';
  if (tas.tur === 'sahteOkey') {
    div.classList.add('sahteOkey');
    div.textContent = '★';
  } else {
    div.classList.add(tas.renk);
    div.textContent = String(tas.sayi);
  }
  if (tasOkeyMi(tas, okeyTasi)) div.classList.add('okeyVurgu');
  div.dataset.tasId = tas.id;
  return div;
}

function tersTasElemaniOlustur() {
  const div = document.createElement('div');
  div.className = 'tas-arka';
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
  eleman.baslikMetni.textContent = metinAl('baslik');
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

function masaCiz() {
  const { durum } = durumKutu;

  eleman.yerDestesiBaslik.textContent = metinAl('yerDestesi');
  eleman.atilanYiginBaslik.textContent = metinAl('atilanYigin');

  eleman.yerDestesi.innerHTML = '';
  if (durum.yerDestesi.length > 0) eleman.yerDestesi.appendChild(tersTasElemaniOlustur());
  eleman.yerDestesiSayac.textContent = String(durum.yerDestesi.length);

  eleman.atilanYigin.innerHTML = '';
  const ustTas = durum.atilanYigin[durum.atilanYigin.length - 1];
  if (ustTas) eleman.atilanYigin.appendChild(tasElemaniOlustur(ustTas, durum.okeyTasi));

  for (const oyuncu of [1, 2, 3]) {
    eleman[`rakip${oyuncu}Ad`].textContent = oyuncuAdi(oyuncu);
    eleman[`rakip${oyuncu}`].classList.toggle('aktif', durum.sira === oyuncu && durum.sonuc === EL_SONUCU.SUREN);
    const rafDiv = eleman[`rakip${oyuncu}Raf`];
    rafDiv.innerHTML = '';
    for (let i = 0; i < durum.eller[oyuncu].length; i++) rafDiv.appendChild(tersTasElemaniOlustur());
  }
}

function tasiSec(id) {
  if (durumKutu.durum.sira !== INSAN_OYUNCUSU) return;
  durumKutu.secilenTasId = durumKutu.secilenTasId === id ? null : id;
  ciz();
}

function rafCiz() {
  const { durum, rafSirasi, secilenTasId } = durumKutu;
  eleman.rafBaslik.textContent = metinAl('rafim');
  const elMap = new Map(durum.eller[INSAN_OYUNCUSU].map((tas) => [tas.id, tas]));
  eleman.raf.innerHTML = '';
  for (const id of rafSirasi) {
    const tas = elMap.get(id);
    if (!tas) continue;
    const tasElemani = tasElemaniOlustur(tas, durum.okeyTasi);
    if (id === secilenTasId) tasElemani.classList.add('secili');
    tasElemani.addEventListener('click', () => tasiSec(id));
    eleman.raf.appendChild(tasElemani);
  }
  eleman.atButonu.textContent = metinAl('atButonu');
  eleman.atButonu.disabled = !(
    durum.sira === INSAN_OYUNCUSU
    && durum.cekildiMi
    && secilenTasId
    && durum.sonuc === EL_SONUCU.SUREN
  );
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
}

function ciz() {
  ustCubukCiz();
  durumSatiriCiz();
  masaCiz();
  rafCiz();
  sonucPaneliCiz();
}

function cekSonucunuIsle(sonuc) {
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumKutu.durum = sonuc.durum;
  rafSirasiniGuncelle(sonuc.durum.eller[INSAN_OYUNCUSU]);
  mesajGoster(null);
  ciz();
}

function ataBas() {
  const { durum, secilenTasId } = durumKutu;
  if (!secilenTasId) return;
  const sonuc = at(durum, INSAN_OYUNCUSU, secilenTasId);
  if (!sonuc.basarili) {
    mesajGoster(sonuc.sebep);
    ciz();
    return;
  }
  durumKutu.durum = sonuc.durum;
  durumKutu.secilenTasId = null;
  rafSirasiniGuncelle(sonuc.durum.eller[INSAN_OYUNCUSU]);
  mesajGoster(null);
  ciz();
  botSirasiniBaslat();
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

function yerdenCek() {
  cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.YER));
}

function atilandanCek() {
  cekSonucunuIsle(cek(durumKutu.durum, INSAN_OYUNCUSU, KAYNAK.ATILAN));
}

function dilDegistir() {
  durumKutu.dilKodu = durumKutu.dilKodu === 'tr' ? 'en' : 'tr';
  ciz();
}

function elemanlariTopla() {
  const idler = [
    'baslikMetni', 'dilDugmesi', 'durumSatiri',
    'yerDestesiBaslik', 'yerDestesi', 'yerDestesiSayac',
    'atilanYiginBaslik', 'atilanYigin',
    'rakip1', 'rakip1Ad', 'rakip1Raf',
    'rakip2', 'rakip2Ad', 'rakip2Raf',
    'rakip3', 'rakip3Ad', 'rakip3Raf',
    'rafBaslik', 'raf', 'atButonu',
    'sonucPaneli', 'sonucMetni', 'sonucKalanTaslar',
  ];
  for (const id of idler) eleman[id] = document.getElementById(id);
}

function olaylariBagla() {
  eleman.yerDestesi.addEventListener('click', yerdenCek);
  eleman.atilanYigin.addEventListener('click', atilandanCek);
  eleman.atButonu.addEventListener('click', ataBas);
  eleman.dilDugmesi.addEventListener('click', dilDegistir);
  surukleBagla(eleman.raf, () => durumKutu.rafSirasi, (yeniDizi) => {
    durumKutu.rafSirasi = yeniDizi;
    rafCiz();
  });
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
  durumKutu.diller = await dilleriYukle();
  durumKutu.durum = elBaslat(tohumuBelirle());
  durumKutu.rafSirasi = durumKutu.durum.eller[INSAN_OYUNCUSU].map((tas) => tas.id);
  olaylariBagla();
  ciz();
}

baslat();
