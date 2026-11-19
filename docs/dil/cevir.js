// Anahtar → metin; eksik anahtarda görünür hata (MIMARI.md §3 `dil/cevir.js`; ADR-007; R-008).
// Saf fonksiyon: tablo dışarıdan verilir, dosya okuma/fetch burada yapılmaz.

export function cevir(diller, dilKodu, anahtar, degerler = []) {
  const tablo = diller[dilKodu] ?? diller.tr;
  const metin = tablo?.[anahtar];
  if (metin === undefined) {
    throw new Error(`eksik dil anahtarı: ${dilKodu}/${anahtar}`);
  }
  return degerler.reduce((metinKismi, deger, i) => metinKismi.replaceAll(`{${i}}`, String(deger)), metin);
}
