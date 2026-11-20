// Bitirilebilirlik çözücüsü: elin tamamını geçerli per/çift gruplarına tam bölmeye çalışan saf
// geri izlemeli arama (MIMARI.md §3 `cekirdek/cozucu.js`; GDD.md §1 "Kazanma/bitiş koşulu"; R-005).
//
// Joker önceliği: bir boşlukta gerçek taş varsa joker yerine önce gerçek taş denenir, joker başka
// bir gruba saklanır. Bu asla çözüm kaçırmaz: bir çözümde joker bu boşlukta kullanılmış ve uyan
// gerçek taş başka bir grupta duruyorsa, ikisini yer değiştirmek (joker evrensel taş olduğundan)
// her iki grubu da geçerli tutar — yani "gerçek taş önce" tercihiyle bulunan bir çözüm her zaman
// vardır, aranan uzayı küçültür.

import { EN_DUSUK_SAYI, EN_YUKSEK_SAYI } from './tas.js';
import { tasOkeyMi } from './dagitim.js';
import { perGecerliMi, ciftGecerliMi, ardisikPencereUret } from './dizilim.js';
import { KURAL_VARSAYILAN } from './kural.js';

const MAKSIMUM_PER_UZUNLUGU = EN_YUKSEK_SAYI - EN_DUSUK_SAYI + 1;

// GDD.md §1 "Kazanma/bitiş koşulu": elin tamamı (joker dahil) geçerli per/çift gruplarına tam
// bölünebiliyor mu? Deterministik: aynı taş listesi (sırası ne olursa olsun) aynı sonucu verir.
export function elBitirilebilirMi(taslar, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  if (!Array.isArray(taslar)) return false;
  return cozAra(taslar, okeyTasi, kural, gosterge, new Map());
}

function cozAra(kalan, okeyTasi, kural, gosterge, onbellek) {
  if (kalan.length === 0) return true;
  if (kalan.length === 1) return false;
  if (kalan.every((tas) => tasOkeyMi(tas, okeyTasi))) return true;

  const imza = tasImzasi(kalan);
  if (onbellek.has(imza)) return onbellek.get(imza);

  const ankor = kalan.find((tas) => !tasOkeyMi(tas, okeyTasi));
  const adaylar = grupAdaylariUret(kalan, ankor, okeyTasi, kural, gosterge);

  let sonuc = false;
  for (const aday of adaylar) {
    if (cozAra(kalanCikar(kalan, aday), okeyTasi, kural, gosterge, onbellek)) {
      sonuc = true;
      break;
    }
  }
  onbellek.set(imza, sonuc);
  return sonuc;
}

// Ankoru içeren bütün geçerli çift ve per adaylarını üretir; aynı sonuca varan tekrar eden
// bileşimler (ör. birden çok joker arasından seçim) tek adaya indirilir.
function grupAdaylariUret(kalan, ankor, okeyTasi, kural, gosterge) {
  const adaylar = [];
  const gorulenImzalar = new Set();
  const ekle = (grup) => {
    const imza = tasImzasi(grup);
    if (gorulenImzalar.has(imza)) return;
    gorulenImzalar.add(imza);
    adaylar.push(grup);
  };

  const gorulenCiftSinifi = new Set();
  for (const tas of kalan) {
    if (tas.id === ankor.id) continue;
    const sinif = tasOkeyMi(tas, okeyTasi) ? 'joker' : `${tas.renk}-${tas.sayi}`;
    if (gorulenCiftSinifi.has(sinif)) continue;
    if (ciftGecerliMi(ankor, tas, okeyTasi, kural, gosterge)) {
      gorulenCiftSinifi.add(sinif);
      ekle([ankor, tas]);
    }
  }

  const jokerHavuzu = kalan.filter((tas) => tas.id !== ankor.id && tasOkeyMi(tas, okeyTasi));
  const maksimumUzunluk = Math.min(MAKSIMUM_PER_UZUNLUGU, kalan.length);
  for (let uzunluk = 3; uzunluk <= maksimumUzunluk; uzunluk++) {
    for (const pencere of ardisikPencereUret(uzunluk, kural.onUcBirGecisiPerSayilir)) {
      if (!pencere.includes(ankor.sayi)) continue;
      const grup = perAdayiOlustur(kalan, ankor, pencere, jokerHavuzu, okeyTasi);
      if (grup && perGecerliMi(grup, okeyTasi, kural)) ekle(grup);
    }
  }

  return adaylar;
}

// Pencerenin her sayı boşluğunu, varsa ankorla aynı renkte gerçek taşla, yoksa bir jokerle doldurur.
function perAdayiOlustur(kalan, ankor, pencere, jokerHavuzu, okeyTasi) {
  const grup = [ankor];
  const kullanilanJokerIdleri = new Set();
  for (const sayi of pencere) {
    if (sayi === ankor.sayi) continue;
    const gercek = kalan.find(
      (tas) => !tasOkeyMi(tas, okeyTasi) && tas.renk === ankor.renk && tas.sayi === sayi
        && !grup.some((g) => g.id === tas.id),
    );
    if (gercek) {
      grup.push(gercek);
      continue;
    }
    const joker = jokerHavuzu.find((tas) => !kullanilanJokerIdleri.has(tas.id));
    if (!joker) return null;
    kullanilanJokerIdleri.add(joker.id);
    grup.push(joker);
  }
  return grup;
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
