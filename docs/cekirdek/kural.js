// K1'in (Sahip, 2026-11-19) dört kural kararı tek nesnede (MIMARI.md ADR-008, GDD.md §1 kural 6/10-12).
// Motorun başka hiçbir yerinde bu kurallar yeniden yazılmaz; değişirse tek satır burada değişir.

export const KURAL_VARSAYILAN = Object.freeze({
  // 1) "12-13-1" geçişi per DEĞİLDİR; per 1→13 düz sıradır, tur yapmaz.
  onUcBirGecisiPerSayilir: false,
  // 2) Okey ve sahte okey taşının atılması yasaktır; motor bu hamleyi baştan engeller.
  okeyVeSahteOkeyAtmaYasak: true,
  // 3) Gösterge taşı sahte okey çıkarsa taş desteye karışır ve gösterge yeniden açılır.
  gostergeSahteOkeyIseYenidenAcilir: true,
  // 4) Yerdeki taşlar kimse bitirmeden tükenirse el berabere sayılır ve yeni el başlar.
  desteTukenirseElBerabereSayilir: true,
});
