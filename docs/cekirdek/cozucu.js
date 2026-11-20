// Bitirilebilirlik çözücüsü (MIMARI.md §3 `cekirdek/cozucu.js`, ADR-017; GDD.md §1 kural 13
// "Kazanma/bitiş koşulu"; R-005).
//
// Bitiş iki ayrı denetimin VEYA'sıdır; ikisi de elin TAMAMINI tek biçimde kullanır:
//   (a) el tamamen per gruplarına bölünür (her grup seri ya da sayı peri, en az 3 taş),
//   (b) el tam 7 birebir çifttir (14 taş).
// Per ile çift karışık dizilim bitiş sayılmaz — bu yüzden iki arama ayrı ayrı yürür, tek bir
// "grup" aramasında birleştirilmez. Joker (okey/sahte okey) her iki yolda da eksik taşın yerini
// tutar; geçerlilik kararı her iki aramada da tek kapıdan, `dizilim.js`'ten sorulur.
//
// Joker önceliği: bir boşlukta gerçek taş varsa joker yerine önce gerçek taş denenir, joker başka
// bir gruba saklanır. Bu asla çözüm kaçırmaz: bir çözümde joker bu boşlukta kullanılmış ve uyan
// gerçek taş başka bir grupta duruyorsa, ikisini yer değiştirmek (joker evrensel taş olduğundan)
// her iki grubu da geçerli tutar — yani "gerçek taş önce" tercihiyle bulunan bir çözüm her zaman
// vardır, aranan uzayı küçültür.

import { EN_DUSUK_SAYI, EN_YUKSEK_SAYI, RENKLER } from './tas.js';
import { tasOkeyMi } from './dagitim.js';
import { perGecerliMi, ciftGecerliMi, ardisikPencereUret, EN_KISA_PER } from './dizilim.js';
import { KURAL_VARSAYILAN } from './kural.js';

const MAKSIMUM_PER_UZUNLUGU = EN_YUKSEK_SAYI - EN_DUSUK_SAYI + 1;
// GDD.md §1 kural 13: çiftli bitiş tam 7 çifttir, yani atıştan sonra kalan 14 taşın tamamı.
const BITIS_CIFT_SAYISI = 7;
const CIFTLI_BITIS_TAS_SAYISI = BITIS_CIFT_SAYISI * 2;

// GDD.md §1 kural 13: el ya tamamen per'e bölünür ya tam 7 çifttir; karışık dizilim bitiş değildir.
// Deterministik: aynı taş listesi (sırası ne olursa olsun) aynı sonucu verir.
export function elBitirilebilirMi(taslar, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  if (!Array.isArray(taslar)) return false;
  return tamamenPerMi(taslar, okeyTasi, kural)
    || tamYediCiftMi(taslar, okeyTasi, kural, gosterge);
}

// (a) Elin tamamı per gruplarına bölünüyor mu? Çift aday olarak hiç üretilmez.
function tamamenPerMi(taslar, okeyTasi, kural) {
  return perAra(taslar, okeyTasi, kural, new Map());
}

function perAra(kalan, okeyTasi, kural, onbellek) {
  if (kalan.length === 0) return true;
  if (kalan.length < EN_KISA_PER) return false;
  if (kalan.every((tas) => tasOkeyMi(tas, okeyTasi))) {
    return kalan.length <= MAKSIMUM_PER_UZUNLUGU;
  }

  const imza = tasImzasi(kalan);
  if (onbellek.has(imza)) return onbellek.get(imza);

  const ankor = kalan.find((tas) => !tasOkeyMi(tas, okeyTasi));
  const adaylar = perAdaylariUret(kalan, ankor, okeyTasi, kural);

  let sonuc = false;
  for (const aday of adaylar) {
    if (perAra(kalanCikar(kalan, aday), okeyTasi, kural, onbellek)) {
      sonuc = true;
      break;
    }
  }
  onbellek.set(imza, sonuc);
  return sonuc;
}

// (b) El tam 7 birebir çift mi? Per adayı hiç üretilmez.
function tamYediCiftMi(taslar, okeyTasi, kural, gosterge) {
  if (taslar.length !== CIFTLI_BITIS_TAS_SAYISI) return false;
  return ciftAra(taslar, okeyTasi, kural, gosterge, new Map());
}

function ciftAra(kalan, okeyTasi, kural, gosterge, onbellek) {
  if (kalan.length === 0) return true;
  if (kalan.length % 2 !== 0) return false;

  const imza = tasImzasi(kalan);
  if (onbellek.has(imza)) return onbellek.get(imza);

  const ankor = kalan[0];
  let sonuc = false;
  const gorulenSinif = new Set();
  for (const tas of kalan) {
    if (tas.id === ankor.id) continue;
    const sinif = ciftSinifi(tas, okeyTasi);
    if (gorulenSinif.has(sinif)) continue;
    if (!ciftGecerliMi(ankor, tas, okeyTasi, kural, gosterge)) continue;
    gorulenSinif.add(sinif);
    if (ciftAra(kalanCikar(kalan, [ankor, tas]), okeyTasi, kural, gosterge, onbellek)) {
      sonuc = true;
      break;
    }
  }
  onbellek.set(imza, sonuc);
  return sonuc;
}

// Ankoru içeren bütün geçerli per adaylarını (seri + sayı peri) üretir; aynı taş kümesine varan
// tekrar eden bileşimler (ör. birden çok joker arasından seçim) tek adaya indirilir.
function perAdaylariUret(kalan, ankor, okeyTasi, kural) {
  const adaylar = [];
  const gorulenImzalar = new Set();
  const ekle = (grup) => {
    if (!grup || !perGecerliMi(grup, okeyTasi, kural)) return;
    const imza = tasImzasi(grup);
    if (gorulenImzalar.has(imza)) return;
    gorulenImzalar.add(imza);
    adaylar.push(grup);
  };

  const jokerHavuzu = kalan.filter((tas) => tas.id !== ankor.id && tasOkeyMi(tas, okeyTasi));

  // Seri adayları: ankorun sayısını içeren her ardışık pencere.
  const maksimumUzunluk = Math.min(MAKSIMUM_PER_UZUNLUGU, kalan.length);
  for (let uzunluk = EN_KISA_PER; uzunluk <= maksimumUzunluk; uzunluk++) {
    for (const pencere of ardisikPencereUret(uzunluk, kural.onUcBirGecisiPerSayilir)) {
      if (!pencere.includes(ankor.sayi)) continue;
      ekle(seriAdayiOlustur(kalan, ankor, pencere, jokerHavuzu, okeyTasi));
    }
  }

  // Sayı peri adayları: ankorun rengini içeren, 3 ya da 4 renklik her renk kümesi.
  for (const renkKumesi of renkKumeleriUret(ankor.renk)) {
    ekle(sayiPeriAdayiOlustur(kalan, ankor, renkKumesi, jokerHavuzu, okeyTasi));
  }

  return adaylar;
}

// Pencerenin her sayı boşluğunu, varsa ankorla aynı renkte gerçek taşla, yoksa bir jokerle doldurur.
function seriAdayiOlustur(kalan, ankor, pencere, jokerHavuzu, okeyTasi) {
  const bosluklar = pencere.filter((sayi) => sayi !== ankor.sayi);
  return grupKur(bosluklar, ankor, jokerHavuzu, (sayi, kullanilanIdler) => kalan.find((tas) => (
    !tasOkeyMi(tas, okeyTasi) && tas.renk === ankor.renk && tas.sayi === sayi
      && !kullanilanIdler.has(tas.id)
  )));
}

// Renk kümesinin her rengini, varsa ankorla aynı sayıda gerçek taşla, yoksa bir jokerle doldurur.
function sayiPeriAdayiOlustur(kalan, ankor, renkKumesi, jokerHavuzu, okeyTasi) {
  const bosluklar = renkKumesi.filter((renk) => renk !== ankor.renk);
  return grupKur(bosluklar, ankor, jokerHavuzu, (renk, kullanilanIdler) => kalan.find((tas) => (
    !tasOkeyMi(tas, okeyTasi) && tas.sayi === ankor.sayi && tas.renk === renk
      && !kullanilanIdler.has(tas.id)
  )));
}

// Ortak grup kurucu: her boşluk için önce gerçek taş (grupta kullanılmamış olanı), yoksa joker.
// Boşluk jokerle de dolmuyorsa aday yoktur (null).
function grupKur(bosluklar, ankor, jokerHavuzu, gercekBul) {
  const grup = [ankor];
  const kullanilanIdler = new Set([ankor.id]);
  for (const bosluk of bosluklar) {
    const secilen = gercekBul(bosluk, kullanilanIdler)
      ?? jokerHavuzu.find((tas) => !kullanilanIdler.has(tas.id));
    if (!secilen) return null;
    kullanilanIdler.add(secilen.id);
    grup.push(secilen);
  }
  return grup;
}

// Ankorun rengini içeren 3 ve 4 renklik bütün renk kümeleri (sayı peri boyutları).
function renkKumeleriUret(ankorRengi) {
  const digerRenkler = RENKLER.filter((renk) => renk !== ankorRengi);
  const kumeler = [];
  for (let maske = 0; maske < (1 << digerRenkler.length); maske++) {
    const secilenler = digerRenkler.filter((_, i) => (maske & (1 << i)) !== 0);
    const boyut = secilenler.length + 1;
    if (boyut < EN_KISA_PER || boyut > RENKLER.length) continue;
    kumeler.push([ankorRengi, ...secilenler]);
  }
  return kumeler;
}

function ciftSinifi(tas, okeyTasi) {
  return tasOkeyMi(tas, okeyTasi) ? 'joker' : `${tas.renk}-${tas.sayi}`;
}

// "Hangi taşı atarsa el biter?" sorgusu (tasokey#26; GDD.md §1 "Kazanma/bitiş koşulu", R-013).
// Elindeki her taşı sırayla "atılmış" sayıp kalanın `elBitirilebilirMi` ile bitip bitmediğine
// bakar; okey ve sahte okey hiçbir zaman aday olmaz (ADR-008/2, `kural.okeyVeSahteOkeyAtmaYasak`
// açıksa) — arayüz bu listeyi deste vurgusu ve bırakma denetimi için kullanır, kuralı
// kendisi tekrar yazmaz.
export function elBitirenTaslar(taslar, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  if (!Array.isArray(taslar) || taslar.length === 0) return [];

  const adaylar = kural.okeyVeSahteOkeyAtmaYasak
    ? taslar.filter((tas) => !tasOkeyMi(tas, okeyTasi))
    : taslar;

  const sonuc = [];
  for (const tas of adaylar) {
    const kalan = taslar.filter((t) => t.id !== tas.id);
    if (elBitirilebilirMi(kalan, okeyTasi, kural, gosterge)) sonuc.push(tas.id);
  }
  return sonuc;
}

function tasImzasi(taslar) {
  return taslar.map((tas) => tas.id).sort().join(',');
}

function kalanCikar(kalan, aday) {
  const cikarilanIdler = new Set(aday.map((tas) => tas.id));
  return kalan.filter((tas) => !cikarilanIdler.has(tas.id));
}
