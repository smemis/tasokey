// Küçük zip okuyucu/yazıcı (tasokey#56) — yalnız öz-testler ve sahte araçlar için.
//
// Niçin var: `android/derle.ps1`in zinciri gerçek APK dosyaları üretir; sahte araç zinciriyle
// ölçerken de ortada GERÇEK bir zip olmak zorunda, çünkü betiğin kendi adımları (`aapt add`,
// .NET ZipArchive ile dex ekleme, APK içeriğinin ölçülmesi) zip'i açıp okuyor. Dış paket
// kullanılmaz (ADR-001: sıfır bağımlılık) — PNG kodlayıcısının kendi elle yazılması (tasokey#55)
// ile aynı gerekçe.
//
// Kapsam: tek diskli, Zip64 olmayan arşivler. Yazarken sıkıştırma yoktur (yöntem 0 "stored");
// okurken 0 ve 8 (deflate) çözülür — çünkü .NET ZipArchive eklediği girdiyi deflate ediyor.
//
// Bu dosya `*.test.js` kalıbına uymaz → `npm test` onu ayrı bir test dosyası olarak koşmaz.

import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, inflateRawSync } from 'node:zlib';

const YEREL_IMZA = 0x04034b50;
const MERKEZ_IMZA = 0x02014b50;
const SON_IMZA = 0x06054b50;
const YEREL_BOY = 30;
const MERKEZ_BOY = 46;
const SON_BOY = 22;
const DOS_TARIH = 0x0021; // 1980-01-01 (sabit: üretilen zip baytı yineleyebilir olsun)

/**
 * Girdileri sıkıştırmadan tek bir zip dosyasına yazar.
 * @param {string} yol hedef dosya
 * @param {{ad: string, veri: Buffer}[]} girdiler
 */
export function zipYaz(yol, girdiler) {
  const govde = [];
  const merkez = [];
  let ofset = 0;
  for (const { ad, veri } of girdiler) {
    const adB = Buffer.from(ad, 'utf8');
    const ozet = crc32(veri) >>> 0;

    const yerel = Buffer.alloc(YEREL_BOY);
    yerel.writeUInt32LE(YEREL_IMZA, 0);
    yerel.writeUInt16LE(20, 4);           // gereken sürüm
    yerel.writeUInt16LE(0, 6);            // bayraklar
    yerel.writeUInt16LE(0, 8);            // yöntem: stored
    yerel.writeUInt16LE(0, 10);           // saat
    yerel.writeUInt16LE(DOS_TARIH, 12);   // tarih
    yerel.writeUInt32LE(ozet, 14);
    yerel.writeUInt32LE(veri.length, 18);
    yerel.writeUInt32LE(veri.length, 22);
    yerel.writeUInt16LE(adB.length, 26);
    yerel.writeUInt16LE(0, 28);
    govde.push(yerel, adB, veri);

    const md = Buffer.alloc(MERKEZ_BOY);
    md.writeUInt32LE(MERKEZ_IMZA, 0);
    md.writeUInt16LE(20, 4);              // yazan sürüm
    md.writeUInt16LE(20, 6);              // gereken sürüm
    md.writeUInt16LE(0, 8);
    md.writeUInt16LE(0, 10);              // yöntem: stored
    md.writeUInt16LE(0, 12);
    md.writeUInt16LE(DOS_TARIH, 14);
    md.writeUInt32LE(ozet, 16);
    md.writeUInt32LE(veri.length, 20);
    md.writeUInt32LE(veri.length, 24);
    md.writeUInt16LE(adB.length, 28);
    md.writeUInt16LE(0, 30);
    md.writeUInt16LE(0, 32);
    md.writeUInt16LE(0, 34);
    md.writeUInt16LE(0, 36);
    md.writeUInt32LE(0, 38);
    md.writeUInt32LE(ofset, 42);
    merkez.push(md, adB);

    ofset += YEREL_BOY + adB.length + veri.length;
  }

  const merkezB = Buffer.concat(merkez);
  const son = Buffer.alloc(SON_BOY);
  son.writeUInt32LE(SON_IMZA, 0);
  son.writeUInt16LE(0, 4);
  son.writeUInt16LE(0, 6);
  son.writeUInt16LE(girdiler.length, 8);
  son.writeUInt16LE(girdiler.length, 10);
  son.writeUInt32LE(merkezB.length, 12);
  son.writeUInt32LE(ofset, 16);
  son.writeUInt16LE(0, 20);

  writeFileSync(yol, Buffer.concat([...govde, merkezB, son]));
}

/** Son kayıt (EOCD) konumunu sondan geriye arar; yorum alanı olabilir. */
function sonKayit(bayt) {
  for (let i = bayt.length - SON_BOY; i >= 0; i--) {
    if (bayt.readUInt32LE(i) === SON_IMZA) return i;
  }
  throw new Error('zip son kaydı (EOCD) bulunamadı');
}

/**
 * Zip'i okur. Boyut ve konum bilgisi MERKEZ dizinden alınır (yerel başlıkta boyut alanları
 * veri tanımlayıcısına bırakılmış olabilir).
 * @param {string} yol
 * @returns {{ad: string, veri: Buffer}[]}
 */
export function zipOku(yol) {
  const bayt = readFileSync(yol);
  const son = sonKayit(bayt);
  const sayi = bayt.readUInt16LE(son + 10);
  let p = bayt.readUInt32LE(son + 16);

  const girdiler = [];
  for (let i = 0; i < sayi; i++) {
    if (bayt.readUInt32LE(p) !== MERKEZ_IMZA) throw new Error(`merkez dizin kaydı bozuk (${i})`);
    const yontem = bayt.readUInt16LE(p + 10);
    const sikisikBoy = bayt.readUInt32LE(p + 20);
    const adBoy = bayt.readUInt16LE(p + 28);
    const ekBoy = bayt.readUInt16LE(p + 30);
    const yorumBoy = bayt.readUInt16LE(p + 32);
    const yerelOfset = bayt.readUInt32LE(p + 42);
    const ad = bayt.slice(p + MERKEZ_BOY, p + MERKEZ_BOY + adBoy).toString('utf8');

    if (bayt.readUInt32LE(yerelOfset) !== YEREL_IMZA) throw new Error(`yerel başlık bozuk: ${ad}`);
    const yerelAdBoy = bayt.readUInt16LE(yerelOfset + 26);
    const yerelEkBoy = bayt.readUInt16LE(yerelOfset + 28);
    const veriBas = yerelOfset + YEREL_BOY + yerelAdBoy + yerelEkBoy;
    const ham = bayt.slice(veriBas, veriBas + sikisikBoy);

    let veri;
    if (yontem === 0) veri = ham;
    else if (yontem === 8) veri = inflateRawSync(ham);
    else throw new Error(`desteklenmeyen sıkıştırma yöntemi ${yontem}: ${ad}`);

    girdiler.push({ ad, veri });
    p += MERKEZ_BOY + adBoy + ekBoy + yorumBoy;
  }
  return girdiler;
}

/** Zip içindeki girdi adları. */
export function zipAdlari(yol) {
  return zipOku(yol).map(({ ad }) => ad);
}
