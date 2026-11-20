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
// "Bu el neye bölünüyor?" dökümü (tasokey#39 ek bilgileri, Sahip 2026-11-20): el bittiğinde
// (a) rakip ıstakasındaki taşlar anlamlı sırayla (perler, sonra çiftler, sonra per dışı kalanlar)
// serilsin, (b) sonuç penceresinde per / per dışı / çift / okey sayıları AYRI AYRI yazılsın.
// Bitiş kararı DEĞİLDİR (`elBitirilebilirMi` ayrı durur): burada el bitmemiş de olabilir, bu yüzden
// "en çok taşı kapsayan" bölüm aranır. Kural yeniden yazılmaz — geçerlilik yine `dizilim.js`'ten
// (`perGecerliMi`, `ciftGecerliMi`) sorulur; bu işlev yalnız o kapıyı kullanarak bölümleme yapar.
// Deterministiktir: aynı taş listesi her çağrıda aynı dökümü verir.
export function elDokumu(taslar, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  const el = Array.isArray(taslar) ? taslar : [];
  const { perler } = enIyiPerBolumu(el, okeyTasi, kural, new Map());
  const perTasIdleri = new Set(perler.flat().map((tas) => tas.id));
  const perDisi = el.filter((tas) => !perTasIdleri.has(tas.id));
  const { ciftler, kalanlar } = ciftleriAyir(perDisi, okeyTasi, kural, gosterge);

  const siraliPerler = perler.map((per) => per.slice().sort(tasKarsilastir)).sort(grupKarsilastir);
  const siraliCiftler = ciftler.map((cift) => cift.slice().sort(tasKarsilastir)).sort(grupKarsilastir);
  const siraliKalanlar = kalanlar.slice().sort(tasKarsilastir);

  return {
    perler: siraliPerler,
    ciftler: siraliCiftler,
    kalanlar: siraliKalanlar,
    perSayisi: siraliPerler.length,
    perTasSayisi: perTasIdleri.size,
    ciftSayisi: siraliCiftler.length,
    ciftTasSayisi: siraliCiftler.length * 2,
    // "Per olmayan" = hiçbir pere girmeyen taş (çift kurmuş olanlar dahil); Sahip'in istediği
    // dört sayı bu yüzden toplamda eli iki kez saymaz: perTasSayisi + perDisiSayisi = el boyu.
    perDisiSayisi: perDisi.length,
    kalanSayisi: siraliKalanlar.length,
    okeySayisi: el.filter((tas) => tasOkeyMi(tas, okeyTasi)).length,
  };
}

// Dökümün görüntüleme sırası (ADR-014 ek bilgisi: "ıstakada taşlar dizili olsun"): perler,
// sonra çiftler, sonra per dışı kalanlar. Saf tutulur ki arayüz kendi sıralama kuralı yazmasın.
export function dokumSirasi(dokum) {
  return [...dokum.perler.flat(), ...dokum.ciftler.flat(), ...dokum.kalanlar];
}

// En çok taşı per gruplarına sokan bölüm. `perAra`nın (bitiş kararı) aksine "hepsi kapsanmalı"
// koşulu yoktur: ankor ya bir pere girer ya da hiçbirine girmez, en iyi kapsama seçilir.
function enIyiPerBolumu(kalan, okeyTasi, kural, onbellek) {
  if (kalan.length < EN_KISA_PER) return { perler: [], kapsanan: 0 };

  if (kalan.every((tas) => tasOkeyMi(tas, okeyTasi))) {
    // Yalnız jokerden kurulu grup: geçerlilik yine tek kapıdan sorulur (perGecerliMi, en çok 13).
    if (perGecerliMi(kalan, okeyTasi, kural)) return { perler: [kalan], kapsanan: kalan.length };
    return { perler: [], kapsanan: 0 };
  }

  const imza = tasImzasi(kalan);
  if (onbellek.has(imza)) return onbellek.get(imza);

  const ankor = kalan.find((tas) => !tasOkeyMi(tas, okeyTasi));
  // Uzun adaylar önce denenir: tam kapsama bulunursa arama hemen durur (budama).
  const adaylar = perAdaylariUret(kalan, ankor, okeyTasi, kural).sort((a, b) => b.length - a.length);

  let enIyi = { perler: [], kapsanan: 0 };
  for (const aday of adaylar) {
    const alt = enIyiPerBolumu(kalanCikar(kalan, aday), okeyTasi, kural, onbellek);
    const kapsanan = aday.length + alt.kapsanan;
    if (kapsanan > enIyi.kapsanan) enIyi = { perler: [aday, ...alt.perler], kapsanan };
    if (enIyi.kapsanan === kalan.length) break;
  }

  // Ankoru hiçbir pere koymama dalı: en çok (kalan.length - 1) taş kapsayabilir, bu yüzden
  // ankorlu dal zaten o kadarını kapsadıysa hiç denenmez (budama).
  if (enIyi.kapsanan < kalan.length - 1) {
    const ankorsuz = enIyiPerBolumu(kalanCikar(kalan, [ankor]), okeyTasi, kural, onbellek);
    if (ankorsuz.kapsanan > enIyi.kapsanan) enIyi = ankorsuz;
  }

  onbellek.set(imza, enIyi);
  return enIyi;
}

// Per dışı kalan taşlardan birebir çiftleri ayırır. İki aşama (greedy tek aşama en iyi değildir:
// [joker, kirmizi-5 x2, kirmizi-6] elinde joker önce 5'i kaparsa 1 çift çıkar, iki aşamada 2):
// (1) gerçek taşlar kendi sınıfı içinde eşleşir, (2) artan tek taşlar jokerlerle, sonra jokerler
// birbiriyle. Geçerlilik her eşleşmede `ciftGecerliMi`ye sorulur (gösterge taşı çift kurmaz).
function ciftleriAyir(taslar, okeyTasi, kural, gosterge) {
  const jokerler = taslar.filter((tas) => tasOkeyMi(tas, okeyTasi));
  const siniflar = new Map();
  for (const tas of taslar) {
    if (tasOkeyMi(tas, okeyTasi)) continue;
    const sinif = ciftSinifi(tas, okeyTasi);
    if (!siniflar.has(sinif)) siniflar.set(sinif, []);
    siniflar.get(sinif).push(tas);
  }

  const ciftler = [];
  const tekler = [];
  for (const grup of siniflar.values()) {
    let bekleyen = null;
    for (const tas of grup) {
      if (bekleyen === null) {
        bekleyen = tas;
      } else if (ciftGecerliMi(bekleyen, tas, okeyTasi, kural, gosterge)) {
        ciftler.push([bekleyen, tas]);
        bekleyen = null;
      } else {
        tekler.push(bekleyen);
        bekleyen = tas;
      }
    }
    if (bekleyen !== null) tekler.push(bekleyen);
  }

  const kalanlar = [];
  let jokerIndex = 0;
  for (const tek of tekler) {
    if (jokerIndex < jokerler.length && ciftGecerliMi(tek, jokerler[jokerIndex], okeyTasi, kural, gosterge)) {
      ciftler.push([tek, jokerler[jokerIndex]]);
      jokerIndex += 1;
    } else {
      kalanlar.push(tek);
    }
  }
  while (jokerIndex + 1 < jokerler.length
    && ciftGecerliMi(jokerler[jokerIndex], jokerler[jokerIndex + 1], okeyTasi, kural, gosterge)) {
    ciftler.push([jokerler[jokerIndex], jokerler[jokerIndex + 1]]);
    jokerIndex += 2;
  }
  kalanlar.push(...jokerler.slice(jokerIndex));

  return { ciftler, kalanlar };
}

// Görüntüleme sırası (tek kaynak): renk sırası `tas.js` RENKLER, sonra sayı; joker/sahte okey sona.
function tasKarsilastir(a, b) {
  // Rengi olmayan taş (sahte okey) sona: RENKLER.indexOf(undefined) -1 verir, bu da onu başa alırdı.
  const renkSirasi = (tas) => (tas.renk === undefined ? RENKLER.length : RENKLER.indexOf(tas.renk));
  const renkA = renkSirasi(a);
  const renkB = renkSirasi(b);
  if (renkA !== renkB) return renkA - renkB;
  return (a.sayi ?? EN_YUKSEK_SAYI + 1) - (b.sayi ?? EN_YUKSEK_SAYI + 1);
}

function grupKarsilastir(a, b) {
  return tasKarsilastir(a[0], b[0]);
}

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
