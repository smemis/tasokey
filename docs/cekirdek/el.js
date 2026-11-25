// El durumu, sıra, hamle doğrulama (çek/at), el sonu koşulları
// (MIMARI.md §3 `cekirdek/el.js`; GDD.md §1 kural 5, 10, 12, §2 "Taş çekme/atma"; R-003, R-006, R-007).
// tasokey#8: sıra denetimi, çek-at akışı, okey/sahte okey atma yasağı (ADR-008/2), deste tükenmesi
// (ADR-008/4) ve sonsuz döngüye karşı tanımlı tur sınırı.

import { dagit, OYUNCU_SAYISI, tasOzelMi } from './dagitim.js';
import { elBitirilebilirMi } from './cozucu.js';
import { KURAL_VARSAYILAN } from './kural.js';

export const KAYNAK = Object.freeze({ YER: 'yer', ATILAN: 'atilan' });

export const REDDEDILME_SEBEBI = Object.freeze({
  SIRA_DEGIL: 'siraDegil',
  ZATEN_CEKILDI: 'zatenCekildi',
  HENUZ_CEKILMEDI: 'henuzCekilmedi',
  YER_DESTESI_BOS: 'yerDestesiBos',
  ATILAN_YOK: 'atilanYok',
  TAS_ELDE_YOK: 'tasEldeYok',
  OKEY_ATILAMAZ: 'okeyAtilamaz',
  EL_BITTI: 'elBitti',
  // tasokey#87 (Sahip kararı, GDD §1 kural 14): önceki oyuncunun köşesinden çekilen taş, HENÜZ
  // atmadan aynı köşeye geri bırakılabilir. Bu sebep o geri bırakmanın mümkün OLMADIĞI her
  // durumu anlatır: bu turda hiç çekilmedi, taş desteden çekildi, oyuncu zaten attı ya da kural
  // kapatma anahtarı kapalı. (Sıra ve el sonu kısıtları kendi sebeplerini korur.)
  GERI_BIRAKILAMAZ: 'geriBirakilamaz',
  // tasokey#89 (Sahip kararı, GDD §1 kural 15): bitirme AÇIK bir hamledir (`bitir`) ve yalnız o
  // taş atıldığında kalan el gerçekten bitiyorsa kabul edilir. Anahtar arayüzün kendi ret
  // sebebiyle (etkilesim.js `BITIRILEMEZ`) ve `reddedilme.bitirilemez` dil anahtarıyla aynıdır.
  BITIRILEMEZ: 'bitirilemez',
});

export const EL_SONUCU = Object.freeze({
  SUREN: 'suren',
  BITTI: 'bitti',
  BERABERE: 'berabere',
  TUR_SINIRI: 'turSiniri',
});

// Bot koşusunda hiç pes etmeyen, yer destesine hiç dokunmayan bir döngü teorik olarak sonsuz
// sürebilir (ör. her tur atılandan çekip geri atmak); bu, o döngüye karşı son çare güvenlik sınırı.
export const VARSAYILAN_MAKSIMUM_TUR = 500;

// Sıra her zaman bu iki fonksiyondan geçer (ADR-010): el.js içindeki ileri/geri sıra hesabı
// ve bot/bot.js'in "önceki oyuncunun yığını" seçimi aynı tek kaynağı kullanır.
export function sonrakiOyuncu(oyuncu) {
  return (oyuncu + 1) % OYUNCU_SAYISI;
}

export function oncekiOyuncu(oyuncu) {
  return (oyuncu - 1 + OYUNCU_SAYISI) % OYUNCU_SAYISI;
}

// Başlayan oyuncu 15 taşla başlar (dagitim.js); bu, elindeki "fazla" taşı zaten çekmiş gibi
// sayılmasına karşılık gelir — ilk hamlesi doğrudan atma olur, çekme adımı atlanır.
export function elBaslat(tohum, kural = KURAL_VARSAYILAN) {
  const { eller, yerDestesi, gosterge, okeyTasi } = dagit(tohum, kural);
  return {
    eller: eller.map((el) => el.slice()),
    yerDestesi: yerDestesi.slice(),
    // ADR-010: her oyuncunun kendi önüne attığı ayrı yığın (gerçek okeyde köşe yığınları);
    // yalnız önceki oyuncunun yığınının üstünden çekilebilir (bkz. cek() KAYNAK.ATILAN).
    atilanYiginlar: Array.from({ length: OYUNCU_SAYISI }, () => []),
    gosterge,
    okeyTasi,
    sira: 0,
    cekildiMi: true,
    // Bu turda çekilen taş: `{ tasId, kaynak }` ya da null (tasokey#87). Geri bırakmanın TEK
    // dayanağıdır — "hangi taş, nereden" sorusunu arayüz kendi defterinde tutmaz. Başlayan
    // oyuncunun 15 taşı gerçek bir çekme DEĞİLDİR, bu yüzden null: o el geri bırakılamaz.
    sonCekilen: null,
    turSayaci: 0,
    sonuc: EL_SONUCU.SUREN,
    kazanan: null,
  };
}

function reddet(durum, sebep) {
  return { basarili: false, sebep, durum };
}

function elleriGuncelle(eller, oyuncu, donustur) {
  return eller.map((el, i) => (i === oyuncu ? donustur(el) : el));
}

// GDD.md §2 "Taş çekme": yerden ya da atılan taştan birini seçer; sırası olmayan ya da bu turda
// zaten çekmiş oyuncu çekemez (R-003 kabul b).
export function cek(durum, oyuncu, kaynak) {
  if (durum.sonuc !== EL_SONUCU.SUREN) return reddet(durum, REDDEDILME_SEBEBI.EL_BITTI);
  if (oyuncu !== durum.sira) return reddet(durum, REDDEDILME_SEBEBI.SIRA_DEGIL);
  if (durum.cekildiMi) return reddet(durum, REDDEDILME_SEBEBI.ZATEN_CEKILDI);

  if (kaynak === KAYNAK.YER) {
    if (durum.yerDestesi.length === 0) return reddet(durum, REDDEDILME_SEBEBI.YER_DESTESI_BOS);
    const yerDestesi = durum.yerDestesi.slice();
    const tas = yerDestesi.shift();
    const eller = elleriGuncelle(durum.eller, oyuncu, (el) => [...el, tas]);
    const sonCekilen = { tasId: tas.id, kaynak: KAYNAK.YER };
    return { basarili: true, durum: { ...durum, eller, yerDestesi, cekildiMi: true, sonCekilen } };
  }

  if (kaynak === KAYNAK.ATILAN) {
    // ADR-010 / R-012: yalnız önceki oyuncunun yığınının üstünden çekilebilir; kendi ya da
    // başka bir oyuncunun yığını dolu olsa da bu kaynaktan sayılmaz (kabul b).
    const oncekiYigin = durum.atilanYiginlar[oncekiOyuncu(oyuncu)];
    if (oncekiYigin.length === 0) return reddet(durum, REDDEDILME_SEBEBI.ATILAN_YOK);
    const yeniYigin = oncekiYigin.slice();
    const tas = yeniYigin.pop();
    const atilanYiginlar = durum.atilanYiginlar.map((yigin, i) => (i === oncekiOyuncu(oyuncu) ? yeniYigin : yigin));
    const eller = elleriGuncelle(durum.eller, oyuncu, (el) => [...el, tas]);
    const sonCekilen = { tasId: tas.id, kaynak: KAYNAK.ATILAN };
    return { basarili: true, durum: { ...durum, eller, atilanYiginlar, cekildiMi: true, sonCekilen } };
  }

  throw new Error(`bilinmeyen çekme kaynağı: ${kaynak}`);
}

// --- Çekmeyi geri alma (tasokey#87, GDD §1 kural 14 — Sahip kararı) --------------------------

// "Bu taşı geri bırakabilir miyim?" sorusunun TEK kaynağı. Hem motor kapısı (`cekmeyiGeriAl`) hem
// arayüz (vurgu + etkileşim kararı) buradan geçer, kural ikinci bir yerde yazılmaz (ADR-002).
// Döndürdüğü nesne ya `{ tasId }` ya `{ sebep }`dir.
function geriBirakmaDurumu(durum, oyuncu, kural) {
  if (durum.sonuc !== EL_SONUCU.SUREN) return { sebep: REDDEDILME_SEBEBI.EL_BITTI };
  if (oyuncu !== durum.sira) return { sebep: REDDEDILME_SEBEBI.SIRA_DEGIL };
  if (!kural.cekilenTasGeriBirakilabilir) return { sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ };
  const son = durum.sonCekilen;
  // Hiç çekilmedi / zaten atıldı (atma `sonCekilen`i siler) ya da taş DESTEDEN çekildi: geri
  // bırakılacak bir köşe hamlesi yok. Desteden çekileni geri koymak yer destesinin sırasını
  // değiştirirdi — Sahip'in isteği yalnız köşeden çekilen taş içindi.
  if (!son || son.kaynak !== KAYNAK.ATILAN) return { sebep: REDDEDILME_SEBEBI.GERI_BIRAKILAMAZ };
  if (!durum.eller[oyuncu].some((tas) => tas.id === son.tasId)) {
    return { sebep: REDDEDILME_SEBEBI.TAS_ELDE_YOK };
  }
  return { tasId: son.tasId };
}

// Arayüzün sorduğu saf soru: bu durumda geri bırakılabilen taşın kimliği (yoksa null).
export function geriBirakilabilirTasId(durum, oyuncu, kural = KURAL_VARSAYILAN) {
  return geriBirakmaDurumu(durum, oyuncu, kural).tasId ?? null;
}

// Çekmeyi geri alır: taş elden çıkar, çekildiği yığının ÜSTÜNE geri döner ve tur yeniden
// "çekilmedi" olur — yani dönen durum, çekme ÖNCESİ durumun birebir aynısıdır (öz-test derin
// karşılaştırmayla ölçer). Bu bir hamle değil, hamlenin geri alınmasıdır: `turSayaci` ve `sira`
// değişmez, el sonu koşullarına bakılmaz.
export function cekmeyiGeriAl(durum, oyuncu, kural = KURAL_VARSAYILAN) {
  const { tasId, sebep } = geriBirakmaDurumu(durum, oyuncu, kural);
  if (sebep) return reddet(durum, sebep);

  const el = durum.eller[oyuncu];
  const tas = el.find((t) => t.id === tasId);
  const eller = elleriGuncelle(durum.eller, oyuncu, (eldekiler) => eldekiler.filter((t) => t.id !== tasId));
  // Taş yine önceki oyuncunun yığınının üstüne konur — `cek`in aldığı yerin aynısı (ADR-010).
  const kaynakYigin = oncekiOyuncu(oyuncu);
  const atilanYiginlar = durum.atilanYiginlar.map(
    (yigin, i) => (i === kaynakYigin ? [...yigin, tas] : yigin),
  );
  return { basarili: true, durum: { ...durum, eller, atilanYiginlar, cekildiMi: false, sonCekilen: null } };
}

// --- Taş elden çıkarma: atmanın ve bitirmenin paylaşılan kapısı ------------------------------

// İki hamlenin de ÖN koşulları aynıdır (R-003 kabul b/d, ADR-008/2): sıra, bu turda çekmiş olmak,
// taşın elde olması, okey/sahte okey yasağı. Tek doğrulama kaynağı kuralı gereği (ADR-002) bu
// denetim iki yolda da bir kez, burada yazılır. Döndürdüğü nesne ya `{ tas }` ya `{ sebep }`dir.
function atilacakTasiDogrula(durum, oyuncu, tasId, kural) {
  if (durum.sonuc !== EL_SONUCU.SUREN) return { sebep: REDDEDILME_SEBEBI.EL_BITTI };
  if (oyuncu !== durum.sira) return { sebep: REDDEDILME_SEBEBI.SIRA_DEGIL };
  if (!durum.cekildiMi) return { sebep: REDDEDILME_SEBEBI.HENUZ_CEKILMEDI };

  const tas = durum.eller[oyuncu].find((t) => t.id === tasId);
  if (!tas) return { sebep: REDDEDILME_SEBEBI.TAS_ELDE_YOK };
  // ADR-008 sürüm 2 + ADR-027: yasak "joker mi" değil "özel taş mı" sorusudur — sahte okey artık
  // joker olmasa da yasağın kapsamındadır (ayarın adı ve anlamı korunur).
  if (kural.okeyVeSahteOkeyAtmaYasak && tasOzelMi(tas, durum.okeyTasi)) {
    return { sebep: REDDEDILME_SEBEBI.OKEY_ATILAMAZ };
  }
  return { tas };
}

// Taşı elden çıkarıp atan oyuncunun KENDİ köşe yığınına koyar (ADR-010 kabul a) ve turu kapatır.
// Bitirme hamlesinde de taş aynı yığına konur: oyuncunun bıraktığı YER masanın ortasındaki bitirme
// alanıdır (R-013, ADR-021/6 — bırakma hedefi arayüz kararıdır), ama durumda taş yine atanın
// yığınında durur; yer destesine eklenmesi destenin monoton azalmasını bozardı (ADR-018/3).
function tasiEldenCikar(durum, oyuncu, tas) {
  const kalanEl = durum.eller[oyuncu].filter((t) => t.id !== tas.id);
  const eller = elleriGuncelle(durum.eller, oyuncu, () => kalanEl);
  const atilanYiginlar = durum.atilanYiginlar.map((yigin, i) => (i === oyuncu ? [...yigin, tas] : yigin));
  const turSayaci = durum.turSayaci + 1;
  // tasokey#87: atmak turu kapatır — artık geri bırakılacak bir çekme yoktur.
  return { kalanEl, ortakAlanlar: { eller, atilanYiginlar, turSayaci, cekildiMi: false, sonCekilen: null } };
}

// GDD.md §2 "Taş atma": elinden bir taş seçip köşesine atar; çekmeden atılamaz (R-003 kabul b),
// okey ve sahte okey ayar açıkken atılamaz (ADR-008/2, R-003 kabul d). Atma eli ASLA kendiliğinden
// bitirmez (tasokey#89, GDD §1 kural 15): burada denetlenen el sonu koşulları yalnız yer destesinin
// tükenmesi (ADR-008/4, R-003 kabul e) ve güvenlik tur sınırıdır; bitirme ayrı kapıdır (`bitir`).
export function at(durum, oyuncu, tasId, kural = KURAL_VARSAYILAN, maksimumTur = VARSAYILAN_MAKSIMUM_TUR) {
  const { tas, sebep } = atilacakTasiDogrula(durum, oyuncu, tasId, kural);
  if (sebep) return reddet(durum, sebep);

  const { ortakAlanlar } = tasiEldenCikar(durum, oyuncu, tas);
  const { turSayaci } = ortakAlanlar;

  if (turSayaci >= maksimumTur) {
    return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.TUR_SINIRI } };
  }

  if (kural.desteTukenirseElBerabereSayilir && durum.yerDestesi.length === 0) {
    return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.BERABERE } };
  }

  const sira = sonrakiOyuncu(durum.sira);
  return { basarili: true, durum: { ...durum, ...ortakAlanlar, sira } };
}

// GDD.md §1 kural 15 + §2 "Bitirme" (Sahip kararı, tasokey#89; R-005/R-013): el YALNIZ oyuncunun
// açık bitirme hamlesiyle biter — son taşını ortadaki bitirme alanına bırakır. Bitirilebilir elle
// köşeye atmak sıradan bir atmadır (`at`), el devam eder; bitirmek oyuncunun SEÇİMİDİR.
// Bu kapı bitiş kuralını kendisi yazmaz: "el bitti mi" sorusunun tek kaynağı `cozucu.js`
// `elBitirilebilirMi`dir (ADR-017). O taş atıldığında kalan el bitmiyorsa hamle `bitirilemez` ile
// reddedilir ve durum HİÇ değişmez. Bitirme turu kapattığı için `maksimumTur`/deste koşullarına
// bakılmaz: el zaten kazananla sonlanır.
export function bitir(durum, oyuncu, tasId, kural = KURAL_VARSAYILAN) {
  const { tas, sebep } = atilacakTasiDogrula(durum, oyuncu, tasId, kural);
  if (sebep) return reddet(durum, sebep);

  const { kalanEl, ortakAlanlar } = tasiEldenCikar(durum, oyuncu, tas);
  if (!elBitirilebilirMi(kalanEl, durum.okeyTasi, kural, durum.gosterge)) {
    return reddet(durum, REDDEDILME_SEBEBI.BITIRILEMEZ);
  }
  return { basarili: true, durum: { ...durum, ...ortakAlanlar, sonuc: EL_SONUCU.BITTI, kazanan: oyuncu } };
}
