import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// tasokey#38 (Mimar hakemliği) — tek kaynak: koda yazılmış bir mimari karar belgeye de yazılmış olmalı.
// Belirti: bu işin kendisi denetimde takıldı. Kod ve testler ADR-015'e atıf yapıyordu, MIMARI.md ise
// o numaranın "kullanılmadığını" yazıyordu; Denetçi "güncel mimari karara uyuyor mu" maddesini
// ölçemedi çünkü atıf yapılan karar hiçbir yerde okunamıyordu.
//
// Bu dosya, kaynaklarda geçen her ADR atfı için gerçek bir karar belgesi bulunduğunu kaynak
// taramasıyla ölçer (ADR-002'nin kaynak taraması dilinin aynısı; DOM gerektirmez).
//
// tasokey#76 (ADR-025): karar gövdeleri MIMARI.md §5'ten `adr/ADR-0NN-kisa-ad.md` dosyalarına taşındı.
// Bu yüzden "belgelenen numaralar" artık §5 başlıklarından değil `adr/` dosya kümesinden okunur ve
// `adr/` de taranan dizinlere girdi (ADR'lerin birbirine atfı da ölçülsün). Yukarıdaki tasokey#38 ve
// tasokey#54 dersleri aynen geçerli: testin neden var olduğu buradan silinmez.

const KOK = join(import.meta.dirname, '..');
const MIMARI_MD = readFileSync(join(KOK, 'MIMARI.md'), 'utf8');
const ADR_DIZIN = join(KOK, 'adr');
// tasokey#53: yeni üst düzey `android/` klasörü (belge + PowerShell betiği) koruma kapsamına alındı;
// kaynak türü eklenince tarama sessizce kapsam kaybetmesin diye uzantılar da burada tek yerde durur.
// tasokey#54 (Mimar hakemliği): `.java` ve `.xml` eklendi — Android kabuğu (`android/kabuk/`) ADR
// atfı taşıyan Java ve XML kaynakları getirdi, uzantılar eklenmeden tarama onları hiç okumuyordu
// (ölçüldü: `OyunEtkinligi.java`ya yazılan uydurma bir ADR numarası — 099 — yeşil geçiyordu,
// pass 3/fail 0; günlük `is/tasokey-54/adr-tarama-olcum.txt`). Beklenen hatanın sessizce kaybolduğu
// bu durum tasokey#38'in belirtisinin aynısıdır (bkz. dosya başlığı).
//
// Not: bu dosya kendisi de taranıyor (`testler/` kapsamda). Bu yüzden yorumlarda var olmayan bir
// karar numarası `ADR-xxx` biçiminde yazılamaz — ölçüm günlüğünde geçen numaralar düz yazıyla anılır.
const TARANAN_DIZINLER = ['docs', 'testler', 'android', 'adr'];
const TARANAN_UZANTILAR = ['.js', '.css', '.html', '.md', '.ps1', '.java', '.xml'];

const ATIF_DESENI = /ADR-(\d{3})/g;

function kaynakDosyalari() {
  const dosyalar = [];
  for (const dizin of TARANAN_DIZINLER) {
    const tam = join(KOK, dizin);
    for (const ad of readdirSync(tam, { recursive: true })) {
      if (TARANAN_UZANTILAR.some((uzanti) => ad.endsWith(uzanti))) dosyalar.push(join(tam, ad));
    }
  }
  return dosyalar;
}

/** Kaynaklarda geçen ADR numaralarını numara → [dosya, …] olarak toplar. */
function atiflar() {
  const bulunan = new Map();
  for (const dosya of kaynakDosyalari()) {
    const icerik = readFileSync(dosya, 'utf8');
    for (const [, numara] of icerik.matchAll(ATIF_DESENI)) {
      if (!bulunan.has(numara)) bulunan.set(numara, new Set());
      bulunan.get(numara).add(relative(KOK, dosya).replace(/\\/g, '/'));
    }
  }
  return bulunan;
}

/** Karar belgesi (adr/ADR-0NN-….md) olan ADR numaraları — ADR-025'ten beri tek kaynak budur. */
function belgelenenler() {
  const numaralar = readdirSync(ADR_DIZIN)
    .map((ad) => ad.match(/^ADR-(\d{3})-[a-z0-9-]+\.md$/)?.[1])
    .filter((numara) => numara !== undefined);
  return new Set(numaralar);
}

test('ADR taraması çalışıyor (en az 1 dosya tarandı, en az 1 atıf bulundu)', () => {
  assert.ok(kaynakDosyalari().length > 0, `taranacak kaynak dosyası yok: ${TARANAN_DIZINLER.join(', ')}`);
  assert.ok(atiflar().size > 0, 'kaynaklarda hiç ADR atfı bulunamadı — tarama deseni bozulmuş olabilir');
});

test('ASIL KABUL: kaynaklarda atıf yapılan her ADR numarasının adr/ içinde karar dosyası var', () => {
  const yazilmis = belgelenenler();
  const eksikler = [...atiflar()]
    .filter(([numara]) => !yazilmis.has(numara))
    .map(([numara, dosyalar]) => `ADR-${numara} (atıf: ${[...dosyalar].sort().join(', ')})`);

  assert.deepEqual(
    eksikler.sort(),
    [],
    `kodda/testte/belgede atıf yapılan ama adr/ içinde dosyası olmayan karar(lar):\n${eksikler.sort().join('\n')}`,
  );
});

test('MIMARI.md "kullanılmadı" dediği bir numaraya aynı dosyada karar yazmıyor', () => {
  const yazilmis = belgelenenler();
  const celiskiler = [];
  for (const satir of MIMARI_MD.split('\n')) {
    if (!satir.includes('kullanılmadı')) continue;
    for (const [, numara] of satir.matchAll(ATIF_DESENI)) {
      if (yazilmis.has(numara)) celiskiler.push(`ADR-${numara}: "${satir.trim()}"`);
    }
  }
  assert.deepEqual(celiskiler, [], `MIMARI.md kendisiyle çelişiyor:\n${celiskiler.join('\n')}`);
});
