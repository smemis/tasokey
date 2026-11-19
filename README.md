# Taş Okey

KraftDcm · tarayıcıda çalışan web oyunu. Bu depo KraftOfis tarafından açıldı (ofis klonu). PRD v1 / GDD v1 / MIMARI v1
K1'de onaylandı (2026-11-19); kod işleri bu sürümlere göre ilerler.

## Belgeler
- `PRD.md` — ürün gereksinimleri (R-001…R-010), onaylı
- `GDD.md` — kural ve mekanik ayrıntısı
- `MIMARI.md` — teknoloji yığını, modüller, ADR'ler
- `STIL.md` — görsel yön (taslak, Sahip onayı bekliyor)
- `ARASTIRMA.md` — kaynak araştırması

## Klasör düzeni (`MIMARI.md` §1, §2)
```
cekirdek/   saf kural motoru (DOM yok, rastgelelik dışarıdan verilir)
bot/        bot karar vericisi (cekirdek'i kullanır)
arayuz/     DOM + CSS: masa, raf, sürükleme, dil, kayıt
diller/     dil anahtarı dosyaları (tr.json, en.json)
testler/    öz-testler (node --test burayı çalıştırır)
docs/       GitHub Pages'ten yayınlanan statik site (ADR-005); oyun dosyaları doğrudan burada durur
```

## Test komutu
```
node --test testler/
```
Node'un yerleşik test koşucusu; ek paket kurulumu gerekmez (`MIMARI.md` ADR-004).

## Yerel çalıştırma
```
python -m http.server 8777
```
ES modülleri `file://` üzerinden çalışmadığı için yerel statik sunucu gerekir (`MIMARI.md` ADR-004).
