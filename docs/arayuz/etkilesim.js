// Seçili taş + hedef türü + el durumundan eylem kararı (MIMARI.md §3 `arayuz/etkilesim.js`;
// ADR-010/ADR-012; PRD.md R-012/R-013; tasokey#30). Saf mantık, DOM yok — sürükleme (surukle.js),
// dokunma ve klavye yolu aynı bu fonksiyona varır. Doğrulama burada YAPILMAZ: motor hamlesini
// (çek/at) yalnız `cekirdek/el.js` onaylar (ADR-002, tek doğrulama kaynağı); bu modül sadece
// hangi motor çağrısının denenmesi gerektiğine ve ondan önceki (motora varmadan anlaşılan) açık
// uyuşmazlıklara karar verir.

import { EL_SONUCU, sonrakiOyuncu, oncekiOyuncu } from '../cekirdek/el.js';
import { elBitirenTaslar } from '../cekirdek/cozucu.js';
import { oyuncununAtilanKosesi } from './yerlesim.js';

export const HEDEF_TURU = Object.freeze({
  YER_DESTESI: 'yerDestesi',
  KOSE: 'kose',
  RAF_YUVA: 'rafYuva',
});

export const EYLEM = Object.freeze({
  CEK_DESTE: 'cekDeste',
  CEK_KOSE: 'cekKose',
  AT: 'at',
  BITIR: 'bitir',
  RAFTA_TASI: 'raftaTasi',
  GECERSIZ: 'gecersiz',
});

// Motorun kendi REDDEDILME_SEBEBI'yle (el.js) aynı anahtar havuzunu paylaşır — ikisi de arayüzde
// `reddedilme.<sebep>` dil anahtarıyla gösterilir (ekran.js mesajGoster); burada yalnız motora
// varmadan anlaşılan, hedef/taş uyuşmazlığından doğan ek sebepler tanımlanır.
export const ETKILESIM_RET_SEBEBI = Object.freeze({
  EL_BITTI: 'elBitti',
  SIRA_DEGIL: 'siraDegil',
  ZATEN_CEKILDI: 'zatenCekildi',
  HENUZ_CEKILMEDI: 'henuzCekilmedi',
  TAS_SECILMEDI: 'tasSecilmedi',
  YANLIS_KOSE: 'yanlisKose',
  BITIRILEMEZ: 'bitirilemez',
});

function gecersiz(sebep) {
  return { eylem: EYLEM.GECERSIZ, sebep };
}

// El sürerken rakip taşı HİÇ görünmez (Sahip ek bilgisi, 2026-11-20: rakip ıstakasının yalnız
// ahşap sırtı); el bittiğinde (kazanan, berabere ya da tur sınırı — hepsi "el bitti") rakiplerin
// ıstakası açılır (Sahip ek bilgisi, 2026-11-20). Karar burada saf tutulur, `ekran.js` uygular.
export function rakipEliAcikMi(elDurumu) {
  return elDurumu.sonuc !== EL_SONUCU.SUREN;
}

// `oyuncu`: etkileşimi başlatan oyuncu (insan oyuncunun index'i). `hedef`: ek bilgi — köşe
// hedefinde `{ kose }` (index.html `data-kose` adı), raf yuvası hedefinde `{ slotIndex }`.
export function eylemKararVer(secilenTasId, hedefTuru, elDurumu, oyuncu, hedef = {}) {
  // Rafta yeniden dizme kural motoruna hiç gitmez (GDD.md §2 "Dizme/deneme"): sıra/el sonu
  // kısıtı yok, tek şart taşımak istediğin bir taşın seçili olması.
  if (hedefTuru === HEDEF_TURU.RAF_YUVA) {
    if (!secilenTasId) return gecersiz(ETKILESIM_RET_SEBEBI.TAS_SECILMEDI);
    return { eylem: EYLEM.RAFTA_TASI, tasId: secilenTasId, slotIndex: hedef.slotIndex };
  }

  if (elDurumu.sonuc !== EL_SONUCU.SUREN) return gecersiz(ETKILESIM_RET_SEBEBI.EL_BITTI);
  if (oyuncu !== elDurumu.sira) return gecersiz(ETKILESIM_RET_SEBEBI.SIRA_DEGIL);

  if (hedefTuru === HEDEF_TURU.YER_DESTESI) {
    if (secilenTasId) {
      // Taş seçiliyken ortadaki desteye bırakma = bitirme denemesi (R-013): yalnız o taş atılırsa
      // el biter mi diye iş 3'ün sorgusuna (`elBitirenTaslar`) bakılır, kural burada tekrar yazılmaz.
      if (!elDurumu.cekildiMi) return gecersiz(ETKILESIM_RET_SEBEBI.HENUZ_CEKILMEDI);
      const bitirenler = elBitirenTaslar(elDurumu.eller[oyuncu], elDurumu.okeyTasi, undefined, elDurumu.gosterge);
      if (!bitirenler.includes(secilenTasId)) return gecersiz(ETKILESIM_RET_SEBEBI.BITIRILEMEZ);
      return { eylem: EYLEM.BITIR, tasId: secilenTasId };
    }
    if (elDurumu.cekildiMi) return gecersiz(ETKILESIM_RET_SEBEBI.ZATEN_CEKILDI);
    return { eylem: EYLEM.CEK_DESTE };
  }

  if (hedefTuru === HEDEF_TURU.KOSE) {
    // R-011/R-012: atma yalnız kendi atılan köşene (atan oyuncu ile sıradaki oyuncu arasındaki
    // köşe — ADR-010), çekme yalnız önceki oyuncunun köşesinden; yön `cekirdek/el.js`'in
    // sonrakiOyuncu'suyla `yerlesim.js`e verilir (tek kaynak, burada yeniden tanımlanmaz).
    const kendiAtilanKosesi = oyuncununAtilanKosesi(oyuncu, sonrakiOyuncu);
    const cekilebilirKose = oyuncununAtilanKosesi(oncekiOyuncu(oyuncu), sonrakiOyuncu);

    if (secilenTasId) {
      if (!elDurumu.cekildiMi) return gecersiz(ETKILESIM_RET_SEBEBI.HENUZ_CEKILMEDI);
      if (hedef.kose !== kendiAtilanKosesi) return gecersiz(ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
      return { eylem: EYLEM.AT, tasId: secilenTasId };
    }
    if (elDurumu.cekildiMi) return gecersiz(ETKILESIM_RET_SEBEBI.ZATEN_CEKILDI);
    if (hedef.kose !== cekilebilirKose) return gecersiz(ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
    return { eylem: EYLEM.CEK_KOSE };
  }

  return gecersiz(ETKILESIM_RET_SEBEBI.YANLIS_KOSE);
}
