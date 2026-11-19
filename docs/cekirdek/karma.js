// Tohumlu (deterministik) karıştırıcı (MIMARI.md ADR-003): aynı tohum aynı sırayı verir,
// hata raporunda yazılan tohumla el birebir yeniden oynanabilir.

export function tohumluUretec(tohum) {
  let durum = (tohum >>> 0) || 1;
  return function rastgele() {
    durum ^= durum << 13;
    durum >>>= 0;
    durum ^= durum >>> 17;
    durum ^= durum << 5;
    durum >>>= 0;
    return durum / 4294967296;
  };
}

export function karistir(dizi, tohum) {
  const rastgele = tohumluUretec(tohum);
  const sonuc = dizi.slice();
  for (let i = sonuc.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [sonuc[i], sonuc[j]] = [sonuc[j], sonuc[i]];
  }
  return sonuc;
}
