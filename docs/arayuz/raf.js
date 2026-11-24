// Istaka (raf) yerleşiminin bütün kuralları (MIMARI.md §3 `arayuz/raf.js`; ADR-019, tasokey#48).
// Saf mantık: DOM yok, başka modüle bağlı değil — yuva sayıları ve bırakma kuralları yalnız burada
// durur, `ekran.js` yalnız dönen yerleşimi çizer. Hiçbir işlev girdisini değiştirmez; değişiklik
// her zaman YENİ bir dizi olarak döner (değişiklik yoksa aynı dizi geri döner).
//
// Yerleşim: `RAF_SLOT_SAYISI` uzunluğunda dizi; her yuvada bir taş kimliği ya da `null` (boş yuva).
// Oyuncu taşlarını aralıklı dizebilir — boş yuva yerleşimin bir parçasıdır, sıkıştırma yapılmaz.

// Oyuncunun ıstakası gerçek okey ıstakası gibi 2 sıra (tasokey#13 ek bilgi); bir sıra 12 taş alır
// (Sahip ek bilgisi, 2026-11-20 — gerçek ıstaka ölçüsü), taşlar arasında boşluk yoktur
// (stil.css --raf-yuva-bosluk: 0). Yuva sayısı en yüksek el boyutundan (15, dagitim.js
// BASLAYAN_OYUNCU_EL_BOYUTU) fazladır ki aralıklı dizmeye yer kalsın.
// Tek kaynak: CSS `--raf-sutun-sayisi` bu sabitten okunur (ekran.js baslat()).
export const RAF_SATIR_SAYISI = 2;
export const RAF_SUTUN_SAYISI = 12;
export const RAF_SLOT_SAYISI = RAF_SATIR_SAYISI * RAF_SUTUN_SAYISI;

export function bosYerlesim() {
  return new Array(RAF_SLOT_SAYISI).fill(null);
}

function satirIndeksi(index) {
  return Math.floor(index / RAF_SUTUN_SAYISI);
}

function satirBasi(satir) {
  return satir * RAF_SUTUN_SAYISI;
}

function satirSonu(satir) {
  return satirBasi(satir) + RAF_SUTUN_SAYISI - 1;
}

// Hedefe en yakın boş yuva, YALNIZ hedefin kendi sırasında; eşit uzaklıkta iki boşluk varsa sağdaki
// (ADR-019: eşitlikte sağa). Boşluk yoksa -1.
function satirdakiEnYakinBosluk(yerlesim, satir, hedefIndex) {
  let enIyi = -1;
  let enIyiUzaklik = Infinity;
  for (let index = satirBasi(satir); index <= satirSonu(satir) && index < yerlesim.length; index++) {
    if (yerlesim[index] !== null) continue;
    const uzaklik = Math.abs(index - hedefIndex);
    // `<=` eşitlikte sağdakini (sonra gelen, daha büyük indeksi) seçer.
    if (uzaklik <= enIyiUzaklik) {
      enIyi = index;
      enIyiUzaklik = uzaklik;
    }
  }
  return enIyi;
}

function satirdakiIlkBosluk(yerlesim, satir) {
  for (let index = satirBasi(satir); index <= satirSonu(satir) && index < yerlesim.length; index++) {
    if (yerlesim[index] === null) return index;
  }
  return -1;
}

// Hedef ile boşluk arasındaki taşları boşluğa doğru bir yuva kaydırır ve hedefi boşaltır.
// `yerlesim` yerinde değiştirilir (yalnız bu dosyanın kendi kopyası üzerinde çağrılır).
function kaydir(yerlesim, hedefIndex, boslukIndex) {
  if (boslukIndex > hedefIndex) {
    for (let index = boslukIndex; index > hedefIndex; index--) yerlesim[index] = yerlesim[index - 1];
  } else {
    for (let index = boslukIndex; index < hedefIndex; index++) yerlesim[index] = yerlesim[index + 1];
  }
  yerlesim[hedefIndex] = null;
}

/**
 * ADR-019 — bırakma kuralının TEK yeri. Sürüklenen ya da yeni çekilen taşı hedef yuvaya koyar:
 * taş yerleşimdeyse önce çıkarılır (eski yuvası boşalır), hedef boşsa oraya girer; hedef doluysa
 * o sıradaki taşlar en yakın boşluğa doğru itilir (eşitlikte sağa); sıra tamamen doluysa sağ uçtan
 * taşan taş diğer sıranın İLK boş yuvasına geçer; hiç boş yuva yoksa yerleşim değişmez.
 * Yer değiştirme (iki taşın yer takası) YOKTUR — taş kendine yer açar.
 * @returns {Array<string|null>} yeni yerleşim; değişiklik olmadıysa `yerlesim`in kendisi.
 */
export function tasiYuvayaTasi(yerlesim, tasId, hedefIndex) {
  if (!tasId) return yerlesim;
  if (!Number.isInteger(hedefIndex) || hedefIndex < 0 || hedefIndex >= yerlesim.length) return yerlesim;

  const yeni = yerlesim.slice();
  const kaynakIndex = yeni.indexOf(tasId);
  if (kaynakIndex === hedefIndex) return yerlesim;
  if (kaynakIndex !== -1) yeni[kaynakIndex] = null;

  if (yeni[hedefIndex] === null) {
    yeni[hedefIndex] = tasId;
    return yeni;
  }

  const satir = satirIndeksi(hedefIndex);
  const bosluk = satirdakiEnYakinBosluk(yeni, satir, hedefIndex);
  if (bosluk !== -1) {
    kaydir(yeni, hedefIndex, bosluk);
    yeni[hedefIndex] = tasId;
    return yeni;
  }

  // Hedef sıra tamamen dolu: sıranın sağ ucundaki taş taşar ve diğer sıranın ilk boş yuvasına geçer
  // (sıranın görünen soldan-sağa düzeni bozulmasın diye itme sağa doğrudur). İki sıra da doluysa
  // yapılacak bir şey yok — yerleşim değişmez.
  const digerSatir = (satir + 1) % RAF_SATIR_SAYISI;
  const digerBosluk = satirdakiIlkBosluk(yeni, digerSatir);
  if (digerBosluk === -1) return yerlesim;
  const son = Math.min(satirSonu(satir), yeni.length - 1);
  const tasanId = yeni[son];
  kaydir(yeni, hedefIndex, son);
  yeni[hedefIndex] = tasId;
  yeni[digerBosluk] = tasanId;
  return yeni;
}

/**
 * Yerleşimi yeni ele göre günceller: hâlâ elde olan taş kendi yuvasında kalır (oyuncunun dizilimi
 * ve aralıkları bozulmaz), elden çıkan taşın yuvası boşalır, yeni taş(lar) eklenir.
 * `secenekler.yeniTasYuvasi` verilirse (sürükleyerek çekme, tasokey#48) ilk yeni taş o yuvaya
 * ADR-019 bırakma kuralıyla konur; verilmezse (dokunma/klavye yolu) ilk boş yuvaya girer.
 */
export function rafYerlesimiGuncelle(yerlesim, yeniEl, secenekler = {}) {
  const mevcutIdSeti = new Set(yeniEl.map((tas) => tas.id));
  let yeni = yerlesim.map((id) => (id !== null && mevcutIdSeti.has(id) ? id : null));
  const yerlesimdekiIdSeti = new Set(yeni.filter((id) => id !== null));
  const { yeniTasYuvasi } = secenekler;
  let yuvaKullanildi = false;

  for (const tas of yeniEl) {
    if (yerlesimdekiIdSeti.has(tas.id)) continue;
    if (!yuvaKullanildi && Number.isInteger(yeniTasYuvasi)) {
      yuvaKullanildi = true;
      const konmus = tasiYuvayaTasi(yeni, tas.id, yeniTasYuvasi);
      if (konmus.includes(tas.id)) {
        yeni = konmus;
        continue;
      }
      // Hedefe konamadı (iki sıra da dolu): taş düşürülmez, aşağıdaki ilk boş yuva yoluna gider.
    }
    const bosIndex = yeni.indexOf(null);
    if (bosIndex === -1) yeni.push(tas.id);
    else yeni[bosIndex] = tas.id;
  }
  return yeni;
}

/** Yeni el: taşlar sırayla ilk yuvalardan dizilir (aynı ekleme yolu, boş yerleşimden). */
export function yerlesimKur(el) {
  return rafYerlesimiGuncelle(bosYerlesim(), el);
}

/**
 * Gruplanmış dizme (tasokey#85): grup listesini — her grup bir per, bir çift ya da per dışı
 * kalanların bloğu — ıstaka yerleşimine çevirir. Kurallar YALNIZ burada durur:
 *   · gruplar soldan sağa, iki grup arasında TAM BİR boş yuva,
 *   · bir grup satır içinde bölünmez (kalan satır yetmezse sonraki satırın başından başlar),
 *   · hepsi aralıklı sığmazsa yerleşim boşluksuz paketlenir (taş düşürmek yerine).
 * Grupların İÇERİĞİNE ve SIRASINA karar vermez: onun tek kaynağı `cekirdek/cozucu.js`
 * (`dokumGruplari`) — bu dosya sıralama kuralı yazmaz (ADR-002/ADR-017).
 * Girdiyi değiştirmez; yerleşim her zaman YENİ bir dizi olarak döner.
 * @param {Array<Array<string>>} gruplar taş kimliği dizilerinden oluşan grup listesi
 * @returns {Array<string|null>} `RAF_SLOT_SAYISI` uzunluğunda yeni yerleşim
 */
export function yerlesimDiz(gruplar) {
  const temiz = (Array.isArray(gruplar) ? gruplar : [])
    .map((grup) => (Array.isArray(grup) ? grup.filter((id) => id !== null && id !== undefined) : []))
    .filter((grup) => grup.length > 0);
  // Yerleşim boş yerleşimden kurulur: önceki dizilimde duran ama artık grupta olmayan (elden
  // çıkmış) taş kendiliğinden düşer, ikinci bir "elde mi" denetimi yazılmaz.
  return aralikliDizim(temiz) ?? bosluksuzDizim(temiz);
}

// Gruplar arası bir boş yuvalı dizim; 24 yuvaya sığmazsa null (çağıran boşluksuza düşer).
function aralikliDizim(gruplar) {
  const yerlesim = bosYerlesim();
  let imlec = 0;
  for (const grup of gruplar) {
    if (imlec > 0) imlec += 1;
    // Grup satır içinde bölünmez: kalan satır yetmiyorsa sonraki satırın başına geçilir.
    if ((imlec % RAF_SUTUN_SAYISI) + grup.length > RAF_SUTUN_SAYISI) {
      imlec = satirBasi(satirIndeksi(imlec) + 1);
    }
    if (imlec + grup.length > yerlesim.length) return null;
    for (const id of grup) {
      yerlesim[imlec] = id;
      imlec += 1;
    }
  }
  return yerlesim;
}

// Son çare: bütün taşlar sırayla, boşluk ve satır koruması olmadan ilk yuvalardan dizilir.
function bosluksuzDizim(gruplar) {
  const yerlesim = bosYerlesim();
  const idler = gruplar.flat();
  for (let index = 0; index < idler.length && index < yerlesim.length; index++) {
    yerlesim[index] = idler[index];
  }
  return yerlesim;
}
