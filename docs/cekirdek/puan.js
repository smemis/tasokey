// El sonucu ve puan: el bittiğinde/berabere/tur sınırında oyuncu başına kalan taş sayısını
// hesaplar (MIMARI.md §3 `cekirdek/puan.js`; R-007). Ceza puanı tablosu YOKTUR — okey ve sahte
// okey atmak motor tarafından baştan engellenir (GDD.md §1 kural 10, K1); bu yüzden sonuç
// ekranının gösterdiği tek ölçü kalan taş sayısıdır.

import { EL_SONUCU } from './el.js';

// El sürüyorsa (henüz bitmediyse) null döner; arayüz bunu "sonuç paneli gösterilmesin" olarak okur.
export function elSonucunuHesapla(durum) {
  if (durum.sonuc === EL_SONUCU.SUREN) return null;
  return {
    sonuc: durum.sonuc,
    kazanan: durum.kazanan,
    kalanTaslar: durum.eller.map((el, oyuncu) => ({ oyuncu, sayi: el.length })),
  };
}
