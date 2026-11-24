// Arayüz kabuğu: hangi ekranın açık olduğunu, hangi zorluk kademesinin oynandığını ve bekleyen bir
// onay sorusu olup olmadığını tutan **tek durum makinesi**
// (MIMARI.md §3 `arayuz/kabuk.js`; ADR-016; R-006/R-010; tasokey#42, tasokey#43).
//
// Saf mantık, DOM yok: `arayuz/ekran.js` yalnız bu makinenin döndürdüğü durumu çizer ve olayları
// buraya iletir. Üç ekran vardır — `baslangic` (Yeni oyun + zorluk seçimi), `masa` (el sürüyor),
// `sonuc` (el bitti) — ve geçişler yalnız burada tanımlıdır; ekran.js'te "şu düğme açıksa şu panel
// görünür" biçiminde ikinci bir kural yazılmaz (ADR-016/1). Üst çubuktaki "Oyunu bitir" düğmesinin
// onay sorusu da ayrı bir ekran değil, aynı makinenin `onay` alanıdır (tasokey#43); okey/sahte okey
// atıldığında gösterilen bilgilendirme penceresi de `bilgi` alanıdır (tasokey#50, ADR-016/8).
// Kabuk bugün `{ ekran, zorluk, onay, bilgi, dokumAcik, sonucKucuk }` tutar; `zorluk` dışındaki
// hiçbiri kayda yazılmaz (`kayitAlanlari`).
//
// Kademe adlarının tek kaynağı `bot/bot.js` (`KADEME`, ADR-013): kabuk kendi zorluk listesini
// yazmaz, botun tanımını okur. Kayıt katmanı (`kayit/depo.js`) zorluğu **opak dize** olarak saklar;
// geçerli olup olmadığına burada karar verilir (bozuk/eski kayıtta `VARSAYILAN_KADEME`'ye düşülür).

import { KADEME, VARSAYILAN_KADEME, botTurOyna } from '../bot/bot.js';
import { EL_SONUCU } from '../cekirdek/el.js';

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
  BILGI_GOSTER: 'bilgiGoster',
  BILGI_KAPAT: 'bilgiKapat',
  DOKUM_AC_KAPA: 'dokumAcKapa',
  SONUC_KUCULT_AC_KAPA: 'sonucKucultAcKapa',
});

// Bekleyen onay sorusu (tasokey#43): ekran değişmeden önce sorulan "emin misin?". Kabuğun bir
// ALANIDIR, ayrı ekran değildir — masa arkada durmayı sürdürür, iptal edilince hiçbir şey olmamış
// gibi devam edilir. Şimdilik tek soru var; yeni bir onay eklenirse buraya bir değer girer.
export const ONAY = Object.freeze({
  OYUNU_BITIR: 'oyunuBitir',
});

// Bilgilendirme penceresi (tasokey#50, ADR-016/8): oyuncuya bir şey SORMAZ, yalnız olup biteni
// anlatır ve tek düğmeyle kapanır. Onay gibi kabuğun bir ALANIDIR (`bilgi`), ayrı ekran değildir:
// masa arkada durmayı sürdürür, pencere kapanınca el aynı yerden devam eder. Hamleyi engellemez —
// pencere açıldığında hamle motora çoktan işlenmiştir (ceza/geri alma yok).
// ADR-027 (tasokey#82): metin ikiye ayrıldı — gerçek okey (joker) atmakla sahte okey atmak artık
// aynı şey değil, pencere de aynı cümleyi kurmaz. Hangisinin açılacağına `dagitim.js` karar verir.
export const BILGI = Object.freeze({
  OKEY_ATILDI: 'okeyAtildi',
  SAHTE_OKEY_ATILDI: 'sahteOkeyAtildi',
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

// İlk açılış her zaman `baslangic` ekranındadır (iş isteği); zorluk kayıttan okunur. Bekleyen onay,
// bilgilendirme penceresi, sonuç penceresinin açılır döküm bölümü ve küçültülmüşlüğü kayıttan
// GELMEZ: dördü de oturum içi durumdur, açılışta hiçbir pencere açık, döküm bölümü kapalı ve sonuç
// penceresi tam boydur (Sahip ek bilgisi, #50; tasokey#65).
export function kabukBaslat(kayit = null) {
  return Object.freeze({
    ekran: EKRAN.BASLANGIC,
    zorluk: zorlukCozumle(kayit?.zorluk),
    onay: null,
    bilgi: null,
    dokumAcik: false,
    sonucKucuk: false,
  });
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

export function bilgiBekliyorMu(kabuk) {
  return kabuk.bilgi !== null;
}

export function bilgiGecerliMi(deger) {
  return Object.values(BILGI).includes(deger);
}

// Sonuç penceresindeki "oyuncuların kalan taşları" bölümü açık mı? (Sahip ek bilgisi, tasokey#50:
// bölüm açılıp kapanabilir olsun, pencere ilk açıldığında KAPALI olsun.) Bayrağı kabuk tutar,
// `ekran.js` kendi ikinci bayrağını açmaz (ADR-016/1) — ve ekran değiştiren her geçiş kapatır,
// böylece pencere her açılışında kapalı başlar.
export function dokumAcikMi(kabuk) {
  return kabuk.dokumAcik === true;
}

// Sonuç penceresi küçültülmüş mü? (tasokey#65) Pencere masanın ortasında durduğu için üst kenardaki
// rakibin (Bot 2) ıstakasını örtüyordu — Sahip el bittiğinde taşları görmek istiyor. Küçültülmüş
// pencere yalnız geri büyüten düğmeyi gösterir, masanın üstünü açar ve kapanmaz: oyuncu "Yeni el" /
// "Başlangıç ekranı" seçimini kaybetmez. Döküm bölümünden BAĞIMSIZ bir bayraktır (ikisi aynı anda
// açık olabilir); döküm gibi o da yalnız sonuç ekranında anlamlıdır ve her ekran değişiminde düşer,
// böylece pencere her açılışında tam boy başlar.
export function sonucKucukMu(kabuk) {
  return kabuk.sonucKucuk === true;
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
    return Object.freeze({
      ...kabuk, ekran: EKRAN.BASLANGIC, onay: null, bilgi: null, dokumAcik: false, sonucKucuk: false,
    });
  }
  // Bilgilendirme (tasokey#50, ADR-016/8): yalnız masa ekranında açılır — insan oyuncunun kendi
  // hamlesini anlatır, başka ekranda anlatacak hamle yoktur. Bilinmeyen bilgi türü ve pencere
  // zaten açıkken gelen ikinci istek yok sayılır (tek kapı, ADR-016/1).
  if (olay === OLAY.BILGI_GOSTER) {
    if (kabuk.ekran !== EKRAN.MASA || bilgiBekliyorMu(kabuk) || !bilgiGecerliMi(veri.bilgi)) return kabuk;
    return Object.freeze({ ...kabuk, bilgi: veri.bilgi });
  }
  if (olay === OLAY.BILGI_KAPAT) {
    if (!bilgiBekliyorMu(kabuk)) return kabuk;
    return Object.freeze({ ...kabuk, bilgi: null });
  }
  // Sonuç penceresindeki döküm bölümünü aç/kapat: yalnız o pencere açıkken anlamlı, ekranı
  // değiştirmez ve el durumuna dokunmaz.
  if (olay === OLAY.DOKUM_AC_KAPA) {
    if (kabuk.ekran !== EKRAN.SONUC) return kabuk;
    return Object.freeze({ ...kabuk, dokumAcik: !dokumAcikMi(kabuk) });
  }
  // Sonuç penceresini küçült/büyüt (tasokey#65): döküm bölümü gibi yalnız o pencere açıkken
  // anlamlıdır, ekranı ve el durumunu değiştirmez. Döküm bayrağına DOKUNMAZ — büyütülünce pencere
  // bırakıldığı gibi geri gelir.
  if (olay === OLAY.SONUC_KUCULT_AC_KAPA) {
    if (kabuk.ekran !== EKRAN.SONUC) return kabuk;
    return Object.freeze({ ...kabuk, sonucKucuk: !sonucKucukMu(kabuk) });
  }
  const hedef = GECISLER[kabuk.ekran]?.[olay];
  if (!hedef) return kabuk;
  // Ekran değişince bekleyen soru ve bilgilendirme düşer, döküm bölümü kapanır ve küçültülmüş sonuç
  // penceresi tam boya döner: dördü de yalnız açıldıkları ekranda anlamlıdır (ör. botlar soru
  // açıkken oynamayı sürdürür ve el biterse `masa → sonuc` geçişi soruyu kapatır — iki pencere
  // birden açılmaz; sonuç penceresi de her açılışında tam boy ve kapalı dökümle başlar).
  return Object.freeze({
    ...kabuk, ekran: hedef, onay: null, bilgi: null, dokumAcik: false, sonucKucuk: false,
  });
}

// Botun sırası mı? (ADR-016) Dört koşul birlikte sorulur: masa ekranı açık, bilgilendirme penceresi
// kapalı, el hâlâ sürüyor ve sıra insanda değil. Tek kapı: `ekran.js` hem bot sırasını başlatırken
// hem bekleyen bir tur ateşlendiğinde buradan geçer — koşul iki yerde ayrı ayrı yazılmaz
// (ADR-016/1). Bilgilendirme açıkken bot oynamaz (ADR-016/8): oyuncu pencereyi okurken masa
// değişmesin; pencere kapanınca `ekran.js` sırayı yeniden başlatır. (Onay sorusu bundan AYRIDIR —
// orada botlar oynamayı sürdürür, bkz. tasokey#43.)
export function botSirasiMi(kabuk, elDurumu, insanOyuncusu) {
  if (kabuk.ekran !== EKRAN.MASA) return false;
  if (bilgiBekliyorMu(kabuk)) return false;
  if (!elDurumu || elDurumu.sonuc !== EL_SONUCU.SUREN) return false;
  return elDurumu.sira !== insanOyuncusu;
}

// Zamanlayıcıyla sıraya girmiş bir bot turu ateşlendiğinde hâlâ geçerli mi? (tasokey#43)
// `bekleyen.nesil` turun sıraya girdiği elin kimliği, `bekleyen.elNesli` o anda masada olan elin
// kimliğidir: "oyunu bitir → evet → yeni oyun" sırası bekleyen tur ateşlenmeden tamamlanırsa ekran
// yine `masa` olur, bu yüzden ekrana bakmak yetmez — eski el için hesaplanmış tur YENİ elin üstünde
// işlenir ve yeni el insanın sırasıyla başladığından bot oyuncunun yerine oynardı.
// `bekleyen.botCalisiyor` bot sırasının hâlâ sürdüğünü söyler (durdurulmuş sıra yeniden başlamaz).
export function bekleyenBotTuruGecerliMi(kabuk, elDurumu, insanOyuncusu, bekleyen) {
  if (!bekleyen.botCalisiyor) return false;
  if (bekleyen.nesil !== bekleyen.elNesli) return false;
  return botSirasiMi(kabuk, elDurumu, insanOyuncusu);
}

// Üst çubuk başlığının hangi dil anahtarlarından kurulacağına karar veren TEK yer (tasokey#45):
// `masa` ve `sonuc` ekranında oynanan kademe de başlıkta okunur ("Taş Okey — Kolay"), `baslangic`
// ekranında düz ürün adı kalır (orada kademe zaten düğmelerde seçilidir). İki kural birden
// yazılmasın diye karar ekran.js'te değil burada durur (ADR-016/2-3): `ekran.js` kademe adını hiç
// yazmaz, bu tarifi çeviriciye verir.
//
// Ayırıcı ve sıra **koda gömülmez**: biçim `baslik.zorluklu` anahtarındadır ({0} ürün adı,
// {1} kademe adı), kademe adı da `zorluk.<kademe>` anahtarından gelir (R-008). Burada yalnız
// anahtar ADLARI durur — metin yok, birleştirme yok (`dil/cevir.js` işi).
export function ustCubukBaslikTarifi(kabuk) {
  if (kabuk.ekran === EKRAN.BASLANGIC) return { anahtar: 'baslik', degerAnahtarlari: [] };
  return { anahtar: 'baslik.zorluklu', degerAnahtarlari: ['baslik', `zorluk.${kabuk.zorluk}`] };
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
