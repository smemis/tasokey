// SVG varlıklarını (docs/gorsel/, tasokey#15) tek seferde getirir ve DOM düğümüne çevirir.
// Inline basılır (dosyadan <img> değil) ki SVG içindeki currentColor ve CSS değişkenleri
// (--tas-govde vb.) sayfanın geri kalanından miras alınabilsin (MIMARI.md §3 arayuz katmanı;
// tasokey#16 bağlama işi).

const ayirici = new DOMParser();
const onbellek = new Map();

async function tekGorseliGetir(ad) {
  const yanit = await fetch(`gorsel/${ad}`);
  const metin = await yanit.text();
  const belge = ayirici.parseFromString(metin, 'image/svg+xml');
  onbellek.set(ad, belge.documentElement);
}

export async function gorselleriOnYukle(adlar) {
  await Promise.all(adlar.map(tekGorseliGetir));
}

export function gorselOlustur(ad, sinif) {
  const kaynak = onbellek.get(ad);
  if (!kaynak) throw new Error(`gorsel onceden yuklenmedi: ${ad}`);
  const dugum = document.importNode(kaynak, true);
  if (sinif) dugum.classList.add(sinif);
  return dugum;
}
