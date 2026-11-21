// Arayüz kabuğu: hangi ekranın açık olduğunu ve hangi zorluk kademesinin oynandığını tutan **tek
// durum makinesi** (MIMARI.md §3 `arayuz/kabuk.js`; ADR-016; R-006/R-010; tasokey#42).
//
// Saf mantık, DOM yok: `arayuz/ekran.js` yalnız bu makinenin döndürdüğü durumu çizer ve olayları
// buraya iletir. Üç ekran vardır — `baslangic` (Yeni oyun + zorluk seçimi), `masa` (el sürüyor),
// `sonuc` (el bitti) — ve geçişler yalnız burada tanımlıdır; ekran.js'te "şu düğme açıksa şu panel
// görünür" biçiminde ikinci bir kural yazılmaz (ADR-016/1).
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

// İlk açılış her zaman `baslangic` ekranındadır (iş isteği); zorluk kayıttan okunur.
export function kabukBaslat(kayit = null) {
  return Object.freeze({ ekran: EKRAN.BASLANGIC, zorluk: zorlukCozumle(kayit?.zorluk) });
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
  const hedef = GECISLER[kabuk.ekran]?.[olay];
  if (!hedef) return kabuk;
  return Object.freeze({ ...kabuk, ekran: hedef });
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
