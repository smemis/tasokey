// Bot: `bot/` katmanının **tek girişi** — kademe adı alan tur fonksiyonu
// (MIMARI.md ADR-002 + ADR-018 + ADR-013, GDD.md §4 ve §7 Soru 3, tasokey#9/#37/#41).
//
// Bot kural bilgisini kendi içine kopyalamaz (ADR-018/1): "bu taşlar geçerli per mi / çift mi"
// sorusunu `cekirdek/dizilim.js`'in saf işlevlerine, "hangi taşı atarsam el biter" ve "bu el neye
// bölünüyor" sorularını `cekirdek/cozucu.js`'e sorar. Geçerliliğe son kararı hâlâ `cekirdek/el.js`
// verir; bot yalnız hamle önerir. Kural değişince (ör. ADR-017) bot kendiliğinden hizalanır.
//
// Elin sonlanması sezgisel kalibrasyonuna bırakılmaz (ADR-018/3): atılandan çekme yalnız kuralla
// doğrulanmış gerçek bir tamamlamada (zor kademede: kuralla doğrulanmış bir bitiriş fırsatında)
// yapılır, kalan her durumda yerden çekilir. Böylece yer destesi monoton azalır ve el ya `BITTI`
// ya da (deste tükenince, GDD kural 12) `BERABERE` olur — her üç kademede de.
//
// ADR-013: üç zorluk kademesi (kolay / orta / zor) **aynı** sezgiselin üç ayarıdır; kademeler
// kuralı değiştirmez, yalnız botun kendi önerisini ne kadar iyi seçtiğini değiştirir.

import { cek, at, bitir, KAYNAK, VARSAYILAN_MAKSIMUM_TUR, oncekiOyuncu } from '../cekirdek/el.js';
import { tasOkeyMi, tasOzelMi, sorguJokeriOlustur } from '../cekirdek/dagitim.js';
import { perGecerliMi, ciftGecerliMi } from '../cekirdek/dizilim.js';
import { elBitirenTaslar, elDokumu } from '../cekirdek/cozucu.js';
import { KURAL_VARSAYILAN } from '../cekirdek/kural.js';
import { tohumluUretec } from '../cekirdek/karma.js';

// ADR-017/ADR-018: bitiş ya tamamen per ya tam 7 birebir çifttir; karışık dizilim bitiş değildir.
// Bu yüzden bot el başına tek yola yönelir, iki yolu birlikte toplamaz.
export const YOL = Object.freeze({ PER: 'per', CIFT: 'cift' });

// ADR-013 / GDD §7 Soru 3-B: M1'den itibaren üç kademe. Ad dışarıya bu sabitle verilir.
export const KADEME = Object.freeze({ KOLAY: 'kolay', ORTA: 'orta', ZOR: 'zor' });

// Arayüzün bugün oynattığı kademe (tasokey#41'de kademe seçici arayüz işi değildi): orta —
// `tasokey#37`'nin ADR-018 sezgiselinin birebir karşılığı.
export const VARSAYILAN_KADEME = KADEME.ORTA;

// Kademelerin tek kaynağı. Oranlar "bu kararı doğru verme olasılığı"dır: 1 = her zaman doğru karar
// (zar hiç atılmaz). Bunlar kural değil **öneri ayrıntısı**dır, `kural.js`'e ayar olarak girmez
// (ADR-018/5). Kolay kademenin oranları zayıflatma ölçüsüdür; ölçüm `testler/bot-zorluk.olcum.js`.
export const KADEME_AYARI = Object.freeze({
  [KADEME.KOLAY]: Object.freeze({
    bitirmeyiGormeOrani: 0.6, // bitirme fırsatını kaçırabilir: çözücüye her turda sormaz
    koseyiKullanmaOrani: 0.25, // köşeden (atılandan) çekmeyi çoğunlukla kullanmaz
    enIzoleSecmeOrani: 0.5, // en izole taşı her zaman seçmez; tutmazsa havuzdan rastgele atar
    cozucuIleCekim: false,
    dokumleAtma: false,
  }),
  [KADEME.ORTA]: Object.freeze({
    bitirmeyiGormeOrani: 1,
    koseyiKullanmaOrani: 1,
    enIzoleSecmeOrani: 1,
    cozucuIleCekim: false,
    dokumleAtma: false,
  }),
  [KADEME.ZOR]: Object.freeze({
    bitirmeyiGormeOrani: 1,
    koseyiKullanmaOrani: 1,
    enIzoleSecmeOrani: 1,
    cozucuIleCekim: true, // köşedeki taş eli bitiriyorsa `elBitirenTaslar` ile görür ve alır
    dokumleAtma: true, // atacağı taşı `elDokumu`nun gerçek bölümüne göre seçer
  }),
});

// Çift yoluna ancak el oraya gerçekten yakınsa yönelinir (7 çiftin en az 5'i elde). Bu bir sezgisel
// eşiktir, kural değil — `kural.js`'e ayar olarak girmez (ADR-017/4, ADR-018 kapsamı).
const CIFT_YOLU_EN_AZ_CIFT = 5;

function kademeAyari(kademe) {
  const ayar = KADEME_AYARI[kademe];
  if (!ayar) throw new Error(`bilinmeyen bot kademesi: ${kademe}`);
  return ayar;
}

// --- Kademe zarı: tohumlu, enjekte edilebilir, durumdan türetilir (ADR-003 + ADR-013) ---

// Dilin yerleşik rastgele üreteci bot katmanında yasaktır (MIMARI §3 sınır kuralı; tarama o adı
// kaynakta arar, bu yüzden burada adı bile geçmez) ve ADR-003 rastgeleliği tohumlu
// tutar. Kolay kademenin zayıflatma kararları bu yüzden `karma.js`'in tohumlu üretecinden gelir;
// tohum **durumdan** türetilir, böylece karar durumun saf işlevi kalır: aynı el aynı turda hep
// aynı kararı verir, dayanıklılık koşusu tekrar üretilebilir olur. Testler ayrıca kendi `rastgele`
// işlevini enjekte edebilir (`secenekler.rastgele`).
function tohumUretecini(parcalar) {
  let karma = 2166136261;
  for (const parca of parcalar) {
    const metin = String(parca);
    for (let i = 0; i < metin.length; i++) {
      karma = Math.imul(karma ^ metin.charCodeAt(i), 16777619) >>> 0;
    }
  }
  return tohumluUretec(karma);
}

// Taş kimliği burada **opak** kullanılır: ayrıştırılmaz, karşılaştırılmaz — yalnız elin kimliği
// olarak karmaya girer. Kural bilgisi bu yoldan bota sızmaz.
function eldenUretec(el, ekler = []) {
  return tohumUretecini([...ekler, ...el.map((tas) => tas.id)]);
}

// Oran 1 ise zar hiç atılmaz: orta ve zor kademede karar tamamen sezgiseldir (rastgelelik yok).
function kademeZari(rastgele, oran) {
  return oran >= 1 || rastgele() < oran;
}

// --- Kural soruları: cevabı her zaman cekirdek/dizilim.js verir ---

// İki taş aynı perde buluşabilir mi? (seri ya da sayı peri — hangisi olduğunu bot bilmez, sormaz.)
// Kural sorusu taşı çekirdekten gelir (`sorguJokeriOlustur`): o elin okey taşının, hiçbir elde
// bulunmayan 0. nüshası — yani gerçek bir joker. Joker eksik taşın yerine geçtiğinden cevabı kural
// verir, bot kendi renk/sayı karşılaştırması yapmaz. (ADR-027'den önce soru taşı sahte okeydi;
// sahte okey artık joker olmadığı için soru taşı o elin okeyinden türetilir.)
function perdeBulusabilirMi(tasA, tasB, okeyTasi, kural) {
  return perGecerliMi([tasA, tasB, sorguJokeriOlustur(okeyTasi)], okeyTasi, kural);
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

// Elden çıkarılabilen ayrık birebir çiftlerin taş kimlikleri; cevabı `ciftGecerliMi` verir. Eşleşme
// ayrık olduğundan her joker en çok bir çift sayılır, önce gerçek eş aranır (joker saklanır).
function ciftEslesmesi(el, okeyTasi, kural, gosterge) {
  const kullanildi = new Set();
  for (const tas of el) {
    if (kullanildi.has(tas.id)) continue;
    const uygun = (diger) => diger.id !== tas.id && !kullanildi.has(diger.id)
      && ciftGecerliMi(tas, diger, okeyTasi, kural, gosterge);
    const es = el.find((diger) => uygun(diger) && !tasOkeyMi(diger, okeyTasi, kural))
      ?? el.find(uygun);
    if (!es) continue;
    kullanildi.add(tas.id);
    kullanildi.add(es.id);
  }
  return kullanildi;
}

// ADR-018/2: el başına tek bitiş yolu. Elde yeterli birebir çift varsa çift yolu, aksi halde per yolu.
export function bitisYolunuSec(el, okeyTasi, kural = KURAL_VARSAYILAN, gosterge = null) {
  const ciftSayisi = ciftEslesmesi(el, okeyTasi, kural, gosterge).size / 2;
  return ciftSayisi >= CIFT_YOLU_EN_AZ_CIFT ? YOL.CIFT : YOL.PER;
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
    ? el.filter((tas) => !tasOzelMi(tas, okeyTasi))
    : el;
  return adaylar.length > 0 ? adaylar : el;
}

// "Hangi taşı atarsam el biter" sorusunu `cozucu.js` yanıtlar; cevap atılabilir havuzla kesiştirilir
// ki kuralın atmayı yasakladığı bir joker "bitiren taş" diye önerilmesin (motor reddederdi).
function bitirenTasiBul(havuz, el, okeyTasi, kural, gosterge) {
  const bitirenIdler = new Set(elBitirenTaslar(el, okeyTasi, kural, gosterge));
  return havuz.find((tas) => bitirenIdler.has(tas.id)) ?? null;
}

// Havuzda en düşük bağlantı puanına sahip taşların hepsi (eşitler dahil), el sırasında.
function enIzoleAdaylar(havuz, el, okeyTasi, kural, yol, gosterge) {
  let enDusukPuan = Infinity;
  let adaylar = [];
  for (const tas of havuz) {
    const puan = baglantiSayisi(tas, el, okeyTasi, kural, yol, gosterge);
    if (puan < enDusukPuan) {
      enDusukPuan = puan;
      adaylar = [tas];
    } else if (puan === enDusukPuan) {
      adaylar.push(tas);
    }
  }
  return adaylar;
}

// Zor kademe (ADR-013/3): atacağı taşı ikili bağlantı puanıyla değil, elin **gerçek bölümüyle**
// seçer — "hangi taşlar bugün hiçbir gruba girmiyor?" sorusunu per yolunda `cozucu.js` `elDokumu`,
// çift yolunda `ciftGecerliMi` eşleşmesi yanıtlar. İkili puan "bir perde buluşabilir" diyebildiği
// hâlde taş hiçbir gerçekleşmiş grupta olmayabilir; bu yüzden zor kademe daha iyi atar.
function grupsuzAdaylar(havuz, el, okeyTasi, kural, yol, gosterge) {
  const grupluIdler = yol === YOL.CIFT
    ? ciftEslesmesi(el, okeyTasi, kural, gosterge)
    : new Set(elDokumu(el, okeyTasi, kural, gosterge).perler.flat().map((tas) => tas.id));
  const grupsuz = havuz.filter((tas) => !grupluIdler.has(tas.id));
  return grupsuz.length > 0 ? grupsuz : havuz;
}

// GDD.md §4 "Karar yöntemi" + ADR-013: (1) kademe bitirme fırsatını görüyorsa el bitiren taşı atar
// (soruyu `cozucu.js` yanıtlar, tur başına en çok bir kez); (2) kolay kademe en izole taşı her zaman
// seçmez, zar tutmazsa havuzdan rastgele atar; (3) zor kademe adayları elin gerçek bölümüne göre
// daraltır; (4) kalan her kademe seçilen yolda en izole taşı atar.
export function atilacakTasiSec(el, okeyTasi, kademe = VARSAYILAN_KADEME, secenekler = {}) {
  const ayar = kademeAyari(kademe);
  const {
    kural = KURAL_VARSAYILAN, gosterge = null, rastgele = eldenUretec(el),
  } = secenekler;
  const havuz = atilabilirHavuz(el, okeyTasi, kural);

  if (kademeZari(rastgele, ayar.bitirmeyiGormeOrani)) {
    const bitiren = bitirenTasiBul(havuz, el, okeyTasi, kural, gosterge);
    if (bitiren) return bitiren;
  }

  if (!kademeZari(rastgele, ayar.enIzoleSecmeOrani)) {
    return havuz[Math.floor(rastgele() * havuz.length)];
  }

  const yol = bitisYolunuSec(el, okeyTasi, kural, gosterge);
  const havuzKademeli = ayar.dokumleAtma
    ? grupsuzAdaylar(havuz, el, okeyTasi, kural, yol, gosterge)
    : havuz;
  return enIzoleAdaylar(havuzKademeli, el, okeyTasi, kural, yol, gosterge)[0];
}

// --- Çekme ---

// ADR-010: atılan taşlar oyuncu başına yığındır; motorun `cek(ATILAN)` ile kabul ettiği tek kaynak
// önceki oyuncunun yığınının üst taşıdır. ADR-018/3: o taş elde kuralla doğrulanmış gerçek bir
// tamamlama yapıyorsa (seçilen yolda per ya da çift) oradan, aksi halde **yerden** çekilir — yer
// destesi böylece monoton azalır, el sonlanması sezgisele bağlı kalmaz. Yer destesi boşsa motorun
// kabul edeceği tek kaynak atılandır.
// ADR-013: kolay kademe köşeyi çoğunlukla kullanmaz (tamamlama olsa da yerden çeker); zor kademe
// ek olarak `elBitirenTaslar` ile "bu taşı alırsam elimi bitirir miyim?" sorusunu sorar ve bitiren
// taşı asla kaçırmaz. Her iki kademede de kaynak motorun kabul ettiği kaynaklardan biridir.
export function cekimKaynaginiSec(durum, oyuncu, kademe = VARSAYILAN_KADEME, secenekler = {}) {
  const ayar = kademeAyari(kademe);
  const { kural = KURAL_VARSAYILAN } = secenekler;
  if (durum.yerDestesi.length === 0) return KAYNAK.ATILAN;
  const oncekiYigin = durum.atilanYiginlar[oncekiOyuncu(oyuncu)];
  if (oncekiYigin.length === 0) return KAYNAK.YER;

  const ustTas = oncekiYigin[oncekiYigin.length - 1];
  const el = durum.eller[oyuncu];
  const gosterge = durum.gosterge ?? null;
  const rastgele = secenekler.rastgele ?? eldenUretec(el, [oyuncu, durum.turSayaci]);

  if (ayar.cozucuIleCekim) {
    const cekilmisEl = [...el, ustTas];
    const bitiren = bitirenTasiBul(
      atilabilirHavuz(cekilmisEl, durum.okeyTasi, kural), cekilmisEl, durum.okeyTasi, kural, gosterge,
    );
    if (bitiren) return KAYNAK.ATILAN;
  }

  const gercekler = el.filter((tas) => !tasOkeyMi(tas, durum.okeyTasi, kural));
  const yol = bitisYolunuSec(el, durum.okeyTasi, kural, gosterge);
  const tamamliyor = yol === YOL.CIFT
    ? ciftTamamliyorMu(ustTas, gercekler, durum.okeyTasi, kural, gosterge)
    : perTamamliyorMu(ustTas, gercekler, durum.okeyTasi, kural);
  if (!tamamliyor) return KAYNAK.YER;

  return kademeZari(rastgele, ayar.koseyiKullanmaOrani) ? KAYNAK.ATILAN : KAYNAK.YER;
}

// `bot/` katmanının tek girişi (ADR-013): bir bot turunu baştan sona oynar — çekim kaynağını seçer,
// cekirdek/el.js'e çektirir, sonra atılacak taşı seçer ve yine cekirdek/el.js'e attırır. Geçerliliğe
// her iki adımda da motor karar verir; bot yalnız öneri sunar (ADR-002). Çekme reddedilirse (ör. sıra
// değilse) o sebeple doğrudan döner, atma denenmez. `durum.cekildiMi` zaten true ise (başlayan
// oyuncunun 15 taşlık ilk hamlesi, bkz. el.js `elBaslat`) çekme adımı atlanır — aksi halde motor
// "zatenCekildi" sebebiyle reddeder.
// Kademe zarı tur başına **tek** üreteçten gelir: çekme ve atma kararı aynı akışın iki çekimidir,
// tohum durumdan türetilir (tekrar üretilebilirlik) ya da `secenekler.rastgele` ile enjekte edilir.
export function botTurOyna(durum, oyuncu, kademe = VARSAYILAN_KADEME, secenekler = {}) {
  kademeAyari(kademe);
  const {
    kural = KURAL_VARSAYILAN, maksimumTur = VARSAYILAN_MAKSIMUM_TUR,
  } = secenekler;
  const rastgele = secenekler.rastgele
    ?? eldenUretec(durum.eller[oyuncu], [oyuncu, durum.turSayaci, durum.yerDestesi.length]);
  const turSecenekleri = { kural, rastgele };

  let calisanDurum = durum;
  if (!calisanDurum.cekildiMi) {
    const kaynak = cekimKaynaginiSec(calisanDurum, oyuncu, kademe, turSecenekleri);
    const cekSonucu = cek(calisanDurum, oyuncu, kaynak);
    if (!cekSonucu.basarili) return cekSonucu;
    calisanDurum = cekSonucu.durum;
  }

  const el = calisanDurum.eller[oyuncu];
  const atilacakTas = atilacakTasiSec(el, calisanDurum.okeyTasi, kademe, {
    ...turSecenekleri, gosterge: calisanDurum.gosterge ?? null,
  });
  // tasokey#89 (GDD §1 kural 15): atma eli artık kendiliğinden bitirmez, bu yüzden bot da bitirme
  // hamlesini AÇIKÇA yapar — seçtiği taşı önce bitirme kapısından geçirmeyi dener. Bot kuralı
  // kendi içine kopyalamaz (ADR-018/1): "bu taş eli bitirir mi" sorusunu `el.js` `bitir` yanıtlar;
  // reddederse (bitirilemez ya da ör. okey atma yasağı) aynı taş sıradan atma olarak atılır ve
  // sebep atmanın kendi ret sebebi olarak döner — bot hiçbir reddi gizlemez.
  const bitirmeDenemesi = bitir(calisanDurum, oyuncu, atilacakTas.id, kural);
  if (bitirmeDenemesi.basarili) return bitirmeDenemesi;
  return at(calisanDurum, oyuncu, atilacakTas.id, kural, maksimumTur);
}
