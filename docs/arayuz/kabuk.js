// Arayüz kabuğu: hangi ekranın açık olduğunu, hangi zorluk kademesinin oynandığını ve bekleyen bir
// onay sorusu olup olmadığını tutan **tek durum makinesi**
// (MIMARI.md §3 `arayuz/kabuk.js`; ADR-016; R-006/R-010; tasokey#42, tasokey#43).
//
// Saf mantık, DOM yok: `arayuz/ekran.js` yalnız bu makinenin döndürdüğü durumu çizer ve olayları
// buraya iletir. Üç ekran vardır — `baslangic` (Yeni oyun + zorluk seçimi), `masa` (el sürüyor),
// `sonuc` (el bitti) — ve geçişler yalnız burada tanımlıdır; ekran.js'te "şu düğme açıksa şu panel
// görünür" biçiminde ikinci bir kural yazılmaz (ADR-016/1). Üst çubuktaki "Oyunu bitir" düğmesinin
// onay sorusu da ayrı bir ekran değil, aynı makinenin `onay` alanıdır (tasokey#43).
//
// Kademe adlarının tek kaynağı `bot/bot.js` (`KADEME`, ADR-013): kabuk kendi zorluk listesini
// yazmaz, botun tanımını okur. Kayıt katmanı (`kayit/depo.js`) zorluğu **opak dize** olarak saklar;
// geçerli olup olmadığına burada karar verilir (bozuk/eski kayıtta `VARSAYILAN_KADEME`'ye düşülür).

import { KADEME, VARSAYILAN_KADEME, botTurOyna } from '../bot/bot.js';

export const EKRAN = Object.freeze({
  BASLANGIC: 'baslangic',
  MASA: 'masa',
  SONUC: 'sonuc',
});

export const OLAY = Object.freeze({
  ZORLUK_SEC: 'zorlukSec',
  YENI_OYUN: 'yeniOyun',
  EL_BITTI: 'elBitti',
  YENI_EL: 'yeniEl',
  BASLANGICA_DON: 'baslangicaDon',
  OYUNU_BITIR: 'oyunuBitir',
  ONAY_EVET: 'onayEvet',
  ONAY_HAYIR: 'onayHayir',
});

// Bekleyen onay sorusu (tasokey#43): ekran değişmeden önce sorulan "emin misin?". Kabuğun bir
// ALANIDIR, ayrı ekran değildir — masa arkada durmayı sürdürür, iptal edilince hiçbir şey olmamış
// gibi devam edilir. Şimdilik tek soru var; yeni bir onay eklenirse buraya bir değer girer.
export const ONAY = Object.freeze({
  OYUNU_BITIR: 'oyunuBitir',
});

// Oyuncuya sunulan zorluklar = botun kademeleri (tek kaynak); sıra arayüzdeki düğme sırasıdır.
export const ZORLUKLAR = Object.freeze([KADEME.KOLAY, KADEME.ORTA, KADEME.ZOR]);

// Geçiş tablosu (ADR-016/1): `baslangic → masa → sonuc → baslangic`. `sonuc → masa` (Yeni el) eski
// davranışı korur: oyuncu aynı zorlukla hemen yeni el isteyebilir (R-010).
const GECISLER = Object.freeze({
  [EKRAN.BASLANGIC]: Object.freeze({ [OLAY.YENI_OYUN]: EKRAN.MASA }),
  [EKRAN.MASA]: Object.freeze({ [OLAY.EL_BITTI]: EKRAN.SONUC }),
  [EKRAN.SONUC]: Object.freeze({
    [OLAY.YENI_EL]: EKRAN.MASA,
    [OLAY.BASLANGICA_DON]: EKRAN.BASLANGIC,
  }),
});

export function zorlukGecerliMi(deger) {
  return ZORLUKLAR.includes(deger);
}

// Kayıttan (ya da başka bir dış kaynaktan) gelen değer geçerli bir kademe değilse varsayılana düşer
// — bozuk kayıt, eski şema ve hiç kayıt olmaması aynı yoldan geçer (iş kabul ölçütü).
export function zorlukCozumle(deger) {
  return zorlukGecerliMi(deger) ? deger : VARSAYILAN_KADEME;
}

// İlk açılış her zaman `baslangic` ekranındadır (iş isteği); zorluk kayıttan okunur. Bekleyen onay
// kayıttan GELMEZ: soru oturum içinde sorulur, açılışta hiçbir pencere açık değildir.
export function kabukBaslat(kayit = null) {
  return Object.freeze({ ekran: EKRAN.BASLANGIC, zorluk: zorlukCozumle(kayit?.zorluk), onay: null });
}

// Üst çubuktaki "Oyunu bitir" düğmesi yalnız el sürerken anlamlıdır: başlangıç ekranında
// bitirilecek bir oyun yoktur, sonuç ekranında el zaten bitmiştir (oradaki çıkış "Başlangıç
// ekranı" düğmesidir). Arayüz düğmeyi bu yanıta göre gösterir — kendi koşulunu yazmaz.
export function oyunuBitirilebilirMi(kabuk) {
  return kabuk.ekran === EKRAN.MASA;
}

export function onayBekliyorMu(kabuk) {
  return kabuk.onay !== null;
}

// Tek geçiş kapısı: tanımsız olay ya da o ekranda geçersiz olay kabuğu **değiştirmez** (aynı nesne
// döner) — arayüz yanlış sırada gelen bir tıklamayla durumu bozamaz.
export function gecis(kabuk, olay, veri = {}) {
  if (olay === OLAY.ZORLUK_SEC) {
    // Zorluk yalnız başlangıç ekranında seçilir: el sürerken değiştirilse botların o eli hangi
    // kademeyle oynadığı belirsizleşirdi. Bilinmeyen değer yok sayılır (mevcut seçim korunur).
    if (kabuk.ekran !== EKRAN.BASLANGIC || !zorlukGecerliMi(veri.zorluk)) return kabuk;
    return Object.freeze({ ...kabuk, zorluk: veri.zorluk });
  }
  // Oyunu bitirme isteği (tasokey#43): el sürerken ekran DEĞİŞMEZ, yalnız soru açılır — bitirme
  // ikinci bir olayla (ONAY_EVET) olur. Başka ekranda ya da soru zaten açıkken yok sayılır.
  if (olay === OLAY.OYUNU_BITIR) {
    if (!oyunuBitirilebilirMi(kabuk) || onayBekliyorMu(kabuk)) return kabuk;
    return Object.freeze({ ...kabuk, onay: ONAY.OYUNU_BITIR });
  }
  // Vazgeçme: yalnız soruyu kapatır. Ekran ve zorluk aynı kalır; el durumuna kabuk hiç dokunmaz,
  // bu yüzden oyun soru hiç sorulmamış gibi sürer.
  if (olay === OLAY.ONAY_HAYIR) {
    if (!onayBekliyorMu(kabuk)) return kabuk;
    return Object.freeze({ ...kabuk, onay: null });
  }
  if (olay === OLAY.ONAY_EVET) {
    if (kabuk.onay !== ONAY.OYUNU_BITIR) return kabuk;
    return Object.freeze({ ...kabuk, ekran: EKRAN.BASLANGIC, onay: null });
  }
  const hedef = GECISLER[kabuk.ekran]?.[olay];
  if (!hedef) return kabuk;
  // Ekran değişince bekleyen soru düşer: onay yalnız sorulduğu ekranda anlamlıdır (ör. botlar soru
  // açıkken oynamayı sürdürür ve el biterse `masa → sonuc` geçişi soruyu kapatır — iki pencere
  // birden açılmaz).
  return Object.freeze({ ...kabuk, ekran: hedef, onay: null });
}

// Kayda yazılacak alan (ADR-006 şema sürüm 2): kabuk neyi sakladığını kendisi söyler, ekran.js
// alan adını ikinci kez yazmaz.
export function kayitAlanlari(kabuk) {
  return { zorluk: kabuk.zorluk };
}

// Bir bot turunu **kabuğun seçtiği kademeyle** oynatır (ADR-016/3): `bot/bot.js`'in tek girişi
// (`botTurOyna`) buradan çağrılır, böylece "oyuncunun seçtiği kademe gerçekten o botları başlatıyor
// mu?" sorusu DOM açmadan ölçülebilir (test `oyna` yerine kendi casusunu geçer). `arayuz/ekran.js`
// kademe adını hiç yazmaz — yalnız bu işlevi çağırır.
export function botTurunuOynat(kabuk, elDurumu, oyuncu, oyna = botTurOyna) {
  return oyna(elDurumu, oyuncu, kabuk.zorluk);
}
