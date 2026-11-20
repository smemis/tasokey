// Kolay bot: çekme/atma sezgiseli (MIMARI.md ADR-002 + ADR-018, GDD.md §4, tasokey#9/#37).
//
// Bot kural bilgisini kendi içine kopyalamaz (ADR-018/1): "bu taşlar geçerli per mi / çift mi"
// sorusunu `cekirdek/dizilim.js`'in saf işlevlerine, "hangi taşı atarsam el biter" sorusunu
// `cekirdek/cozucu.js`'e sorar. Geçerliliğe son kararı hâlâ `cekirdek/el.js` verir; bot yalnız
// hamle önerir. Kural değişince (ör. ADR-017) bot kendiliğinden hizalanır — tek kaynak.
//
// Elin sonlanması sezgisel kalibrasyonuna bırakılmaz (ADR-018/3): atılandan çekme yalnız kuralla
// doğrulanmış gerçek bir tamamlamada yapılır, kalan her durumda yerden çekilir. Böylece yer
// destesi monoton azalır ve el ya `BITTI` ya da (deste tükenince, GDD kural 12) `BERABERE` olur.

import { cek, at, KAYNAK, VARSAYILAN_MAKSIMUM_TUR, oncekiOyuncu } from '../cekirdek/el.js';
import { tasOkeyMi } from '../cekirdek/dagitim.js';
import { perGecerliMi, ciftGecerliMi } from '../cekirdek/dizilim.js';
import { elBitirenTaslar } from '../cekirdek/cozucu.js';
import { KURAL_VARSAYILAN } from '../cekirdek/kural.js';
import { sahteOkeyOlustur } from '../cekirdek/tas.js';

// ADR-017/ADR-018: bitiş ya tamamen per ya tam 7 birebir çifttir; karışık dizilim bitiş değildir.
// Bu yüzden bot el başına tek yola yönelir, iki yolu birlikte toplamaz.
export const YOL = Object.freeze({ PER: 'per', CIFT: 'cift' });

// Kural sorusu taşı: gerçek set yalnız 1. ve 2. nüshayı üretir, bu nüsha hiçbir elde bulunmaz.
// "a ile b aynı perde buluşabilir mi?" sorusunu dizilim.js'e sormanın yolu araya bir joker koymak:
// joker eksik taşın yerine geçtiğinden cevabı kural verir, bot kendi renk/sayı karşılaştırması yapmaz.
const SORU_JOKERI = sahteOkeyOlustur(0);

// Çift yoluna ancak el oraya gerçekten yakınsa yönelinir (7 çiftin en az 5'i elde). Bu bir sezgisel
// eşiktir, kural değil — `kural.js`'e ayar olarak girmez (ADR-017/4, ADR-018 kapsamı).
const CIFT_YOLU_EN_AZ_CIFT = 5;

// --- Kural soruları: cevabı her zaman cekirdek/dizilim.js verir ---

// İki taş aynı perde buluşabilir mi? (seri ya da sayı peri — hangisi olduğunu bot bilmez, sormaz.)
function perdeBulusabilirMi(tasA, tasB, okeyTasi, kural) {
  return perGecerliMi([tasA, tasB, SORU_JOKERI], okeyTasi, kural);
}

// Hedef taş, elin iki gerçek taşıyla tamamlanmış (jokersiz) geçerli bir per kuruyor mu?
// Joker bot tarafından saklanır: yerini tutabilir ama "gerçek tamamlama" sayılmaz (ADR-018/3).
function perTamamliyorMu(hedef, gercekler, okeyTasi, kural) {
  for (let i = 0; i < gercekler.length; i++) {
    for (let j = i + 1; j < gercekler.length; j++) {
      if (perGecerliMi([hedef, gercekler[i], gercekler[j]], okeyTasi, kural)) return true;
    }
  }
  return false;
}

// Hedef taş, elin gerçek bir taşıyla birebir çift kuruyor mu? (Jokerle kurulan çift geçerlidir ama
// bot jokeri saklar; atılandan çekmeyi tetikleyen "gerçek tamamlama" değildir.)
function ciftTamamliyorMu(hedef, gercekler, okeyTasi, kural, gosterge) {
  return gercekler.some((tas) => ciftGecerliMi(hedef, tas, okeyTasi, kural, gosterge));
}

// --- Yol seçimi ---

// Elden çıkarılabilen ayrık birebir çift sayısı; cevabı `ciftGecerliMi` verir. Eşleşme ayrık
// olduğundan her joker en çok bir çift sayılır, önce gerçek eş aranır (joker saklanır).
function ciftSayisi(el, okeyTasi, kural, gosterge) {
  const kullanildi = new Set();
  let sayi = 0;
  for (const tas of el) {
    if (kullanildi.has(tas.id)) continue;
    const uygun = (diger) => diger.id !== tas.id && !kullanildi.has(diger.id)
      && ciftGecerliMi(tas, diger, okeyTasi, kural, gosterge);
    const es = el.find((diger) => uygun(diger) && !tasOkeyMi(diger, okeyTasi))
      ?? el.find(uygun);
    if (!es) continue;
    kullanildi.add(tas.id);
    kullanildi.add(es.id);
    sayi += 1;
  }
  return sayi;
}

// ADR-018/2: el başına tek bitiş yolu. Elde yeterli birebir çift varsa çift yolu, aksi halde per yolu.
export function bitisYolunuSec(el, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  return ciftSayisi(el, okeyTasi, kural, gosterge) >= CIFT_YOLU_EN_AZ_CIFT ? YOL.CIFT : YOL.PER;
}

// --- Atma ---

// Seçilen yolda bir taşın elin kaç taşıyla bağlantılı olduğu; düşük puan = izole = atmaya aday.
function baglantiSayisi(hedef, el, okeyTasi, kural, yol, gosterge) {
  let puan = 0;
  for (const diger of el) {
    if (diger.id === hedef.id) continue;
    const bagli = yol === YOL.CIFT
      ? ciftGecerliMi(hedef, diger, okeyTasi, kural, gosterge)
      : perdeBulusabilirMi(hedef, diger, okeyTasi, kural);
    if (bagli) puan += 1;
  }
  return puan;
}

// Kural okey/sahte okey atmayı yasaklıyorsa joker hiç aday olmaz — motora reddedilecek bir hamle
// baştan önerilmez. Havuz boşalırsa (el tamamen jokerse) hâlâ elden bir taş döner.
function atilabilirHavuz(el, okeyTasi, kural) {
  const adaylar = kural.okeyVeSahteOkeyAtmaYasak
    ? el.filter((tas) => !tasOkeyMi(tas, okeyTasi))
    : el;
  return adaylar.length > 0 ? adaylar : el;
}

// GDD.md §4 "Karar yöntemi": (1) el bitiren bir taş varsa onu atar — bu soruyu cozucu.js yanıtlar,
// tur başına yalnız bir kez (ADR-018 ölçüm önlemi); (2) yoksa seçilen yolda en izole taşı atar.
export function atilacakTasiSec(el, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  const havuz = atilabilirHavuz(el, okeyTasi, kural);

  const bitirenIdler = new Set(elBitirenTaslar(el, okeyTasi, kural, gosterge));
  const bitiren = havuz.find((tas) => bitirenIdler.has(tas.id));
  if (bitiren) return bitiren;

  const yol = bitisYolunuSec(el, okeyTasi, kural, gosterge);
  let secilen = havuz[0];
  let enDusukPuan = baglantiSayisi(secilen, el, okeyTasi, kural, yol, gosterge);
  for (const tas of havuz.slice(1)) {
    const puan = baglantiSayisi(tas, el, okeyTasi, kural, yol, gosterge);
    if (puan < enDusukPuan) {
      secilen = tas;
      enDusukPuan = puan;
    }
  }
  return secilen;
}

// --- Çekme ---

// ADR-010: atılan taşlar oyuncu başına yığındır; motorun `cek(ATILAN)` ile kabul ettiği tek kaynak
// önceki oyuncunun yığınının üst taşıdır. ADR-018/3: o taş elde kuralla doğrulanmış gerçek bir
// tamamlama yapıyorsa (seçilen yolda per ya da çift) oradan, aksi halde **yerden** çekilir — yer
// destesi böylece monoton azalır, el sonlanması sezgisele bağlı kalmaz. Yer destesi boşsa motorun
// kabul edeceği tek kaynak atılandır.
export function cekimKaynaginiSec(durum, oyuncu, kural = KURAL_VARSAYILAN) {
  if (durum.yerDestesi.length === 0) return KAYNAK.ATILAN;
  const oncekiYigin = durum.atilanYiginlar[oncekiOyuncu(oyuncu)];
  if (oncekiYigin.length === 0) return KAYNAK.YER;

  const ustTas = oncekiYigin[oncekiYigin.length - 1];
  const el = durum.eller[oyuncu];
  const gosterge = durum.gosterge ?? null;
  const gercekler = el.filter((tas) => !tasOkeyMi(tas, durum.okeyTasi));
  const yol = bitisYolunuSec(el, durum.okeyTasi, kural, gosterge);

  const tamamliyor = yol === YOL.CIFT
    ? ciftTamamliyorMu(ustTas, gercekler, durum.okeyTasi, kural, gosterge)
    : perTamamliyorMu(ustTas, gercekler, durum.okeyTasi, kural);
  return tamamliyor ? KAYNAK.ATILAN : KAYNAK.YER;
}

// Bir bot turunu baştan sona oynar: çekim kaynağını seçer, cekirdek/el.js'e çektirir, sonra
// atılacak taşı seçer ve yine cekirdek/el.js'e attırır. Geçerliliğe her iki adımda da motor karar
// verir; bot yalnız öneri sunar (ADR-002). Çekme reddedilirse (ör. sıra değilse) o sebeple doğrudan
// döner, atma denenmez. `durum.cekildiMi` zaten true ise (başlayan oyuncunun 15 taşlık ilk hamlesi,
// bkz. el.js `elBaslat`) çekme adımı atlanır — aksi halde motor "zatenCekildi" sebebiyle reddeder.
export function kolayBotTurOyna(durum, oyuncu, kural = KURAL_VARSAYILAN, maksimumTur = VARSAYILAN_MAKSIMUM_TUR) {
  let calisanDurum = durum;
  if (!calisanDurum.cekildiMi) {
    const kaynak = cekimKaynaginiSec(calisanDurum, oyuncu, kural);
    const cekSonucu = cek(calisanDurum, oyuncu, kaynak);
    if (!cekSonucu.basarili) return cekSonucu;
    calisanDurum = cekSonucu.durum;
  }

  const el = calisanDurum.eller[oyuncu];
  const atilacakTas = atilacakTasiSec(el, calisanDurum.okeyTasi, kural, calisanDurum.gosterge ?? null);
  return at(calisanDurum, oyuncu, atilacakTas.id, kural, maksimumTur);
}
