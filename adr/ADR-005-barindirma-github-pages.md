# ADR-005: Barındırma — kraftdcm hesabında ayrı proje deposu + GitHub Pages
| Alan | Değer |
|---|---|
| Tarih | 2026-11-19 · Durum: **kabul** (K1, Sahip onayı 2026-11-19; PRD §9 Soru 5'in karşılığı) |
| Karar veren | Sahip (K1 + yayın kapısı) |
| Bağlam | KraftDcm standardı `https://kraftdcm.github.io/<oyunadi>/` (`D:\KraftDcm\web-sitesi.md`). O adres bugün `kraftdcm/kraftdcm.github.io` deposundaki **yasal sayfalar** için kullanılıyor ve yükleme yalnız `kraftdcm` hesabından, web arayüzünden yapılıyor. `web-sitesi.md` satır 49-50'deki açık nokta ("ikinci oyunda ana sayfanın tek kaynağı neresi") bu projede ilk kez karşımıza çıkıyor. **Ölçüldü** (2026-11-19): `repo\tasokey` deposunun tanımlı uzak adresi **yok** (`git remote -v` boş) |
| Karar | Oyun, `kraftdcm` hesabındaki **kendi deposundan** (`kraftdcm/tasokey`) GitHub Pages ile `docs/` klasöründen yayınlanır. Adres: `https://kraftdcm.github.io/tasokey/`. Site deposuna dokunulmaz; yasal sayfalar da aynı depoda `docs/gizlilik.html`, `docs/sartlar.html` olarak üretilir ve `/tasokey/gizlilik.html` adresinden görünür |
| Seçenekler | **B) Site deposuna (`kraftdcm.github.io`) oyunun dosyalarını yüklemek:** aynı adresi verir ama her sürümde elle çok dosya yüklemek gerekir ve yasal sayfalarla aynı klasörde çakışma riski doğar. **C) Ayrı domain + sunucu:** gerekmez (sunucusuz oyun), ücret ve bakım getirir, K3 açar |
| Sonuçlar | Yayın "ofisin işi değildir": depoyu `kraftdcm` hesabında açmak, Pages'i açmak ve ilk yüklemeyi yapmak **Masa'daki** adımlardır (Sahip). Ofis yalnız `docs/` içeriğini PR olarak üretir. Kaynak düzeni bu karara uyar: oyunun çalışan dosyaları doğrudan `docs/` altında durur (ayrı kopyalama adımı olmasın), `testler/` ve belgeler depo kökünde kalır |
| Etkilenen gereksinimler | R-009 (dağıtım biçimi), PRD §8 (site adresi) |
| Doğrulanmadı | `kraftdcm` hesabında `tasokey` adlı uzak deponun var olup olmadığı ve Pages ayarı ofisten görülemez (ağ yok) |
