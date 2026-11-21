package com.kraftdcm.tasokey;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.Locale;

/**
 * Varlık sunucusu (tasokey#54): WebView'in {@code https://appassets.androidplatform.net/…}
 * isteklerini APK'nın {@code assets/oyun/} klasöründen karşılar. Google'ın uyumluluk
 * kütüphanesindeki varlık yükleyicisinin yaptığı işi, ek kütüphane olmadan (ADR-001: sıfır
 * bağımlılık) tek sınıfta yapar — kabuk yalnız platform sınıflarını kullanır.
 *
 * <p>Niçin dosya şeması değil: dosya kökeni "opak" sayıldığı için localStorage
 * (kayıt — ADR-006) ve ES modülleri çalışmaz. Gerçek bir https kökeni veren tek yol isteği
 * kesip yerelden cevaplamaktır; bu yüzden adres gerçek bir sunucuya değil, Android'in bu iş
 * için ayırdığı {@code appassets.androidplatform.net} adına bakar.
 *
 * <p><b>Yol güvenliği tek kapıdan:</b> varlık açan tek çağrı {@link #yanit(Uri)} içindedir ve
 * yalnız {@link #varlikYolu(String)}'nın döndürdüğü yolu açar. Kabul edilmeyen her yol için
 * çözücü {@code null} döner: üst klasöre çıkış ({@code ..}), boş segment, ters bölü, şema
 * ayracı, yüzde kaçışlı nokta/bölü ve kök dışına düşen her sonuç. Son kapı olarak çözülen yolun
 * gerçekten {@code oyun/} ile başladığı ayrıca ölçülür.
 *
 * <p>Saf mantık (yol çözme + MIME) Android API'si kullanmaz; cihaz açmadan kaynak taramasıyla
 * ölçülür: {@code testler/android-kabuk.test.js}.
 */
final class VarlikSunucusu {

    /** Kesilen isteklerin sunucu adı; gerçek bir ağ adresi değildir, yereli temsil eder. */
    static final String SUNUCU = "appassets.androidplatform.net";

    /** Varlıkların APK içindeki kökü ({@code assets/oyun/…}); kök dışı her yol reddedilir. */
    static final String KOK = "oyun";

    /** Yol verilmediğinde sunulan sayfa. */
    static final String VARSAYILAN_SAYFA = "index.html";

    /** WebView'in açılışta yüklediği adres (tek kaynak: OyunEtkinligi bu sabiti kullanır). */
    static final String BASLANGIC_ADRESI = "https://" + SUNUCU + "/" + VARSAYILAN_SAYFA;

    /** Uzantı → MIME türü. Tek kaynak: başka yerde uzantı karşılaştırması yapılmaz. */
    private static final String[][] MIME_TABLOSU = {
        { "html", "text/html" },
        { "css", "text/css" },
        { "js", "text/javascript" },
        { "mjs", "text/javascript" },
        { "json", "application/json" },
        { "svg", "image/svg+xml" },
        { "png", "image/png" },
        { "webp", "image/webp" },
        { "ico", "image/x-icon" },
        { "woff2", "font/woff2" },
        { "txt", "text/plain" },
    };

    /** Tabloda olmayan uzantı: tarayıcı içeriği yorumlamaya çalışmasın. */
    static final String MIME_VARSAYILAN = "application/octet-stream";

    /** Metin sayılan türlerde yanıta UTF-8 yazılır (dil dosyaları Türkçe diakritik taşır). */
    private static final String KODLAMA = "utf-8";

    private final AssetManager varliklar;

    VarlikSunucusu(AssetManager varliklar) {
        this.varliklar = varliklar;
    }

    /**
     * İstenen URL yolunu APK içindeki varlık yoluna çevirir.
     *
     * @param istenenYol isteğin yol kısmı (çözülmüş hâli; {@code /index.html} gibi)
     * @return {@code oyun/…} biçiminde varlık yolu, kabul edilmeyen her yol için {@code null}
     */
    static String varlikYolu(String istenenYol) {
        String yol = istenenYol == null ? "" : istenenYol;

        int soru = yol.indexOf('?');
        if (soru >= 0) yol = yol.substring(0, soru);
        int capa = yol.indexOf('#');
        if (capa >= 0) yol = yol.substring(0, capa);

        while (yol.startsWith("/")) yol = yol.substring(1);
        if (yol.isEmpty()) yol = VARSAYILAN_SAYFA;

        // Ters bölü (Windows ayracı) ve şema ayracı yol sayılmaz.
        if (yol.indexOf('\\') >= 0 || yol.indexOf(':') >= 0) return null;

        // Çift kaçışlı nokta/bölü: ".." çözülmeden geçmesin (%2e%2e, %2f, %5c).
        String kucuk = yol.toLowerCase(Locale.ROOT);
        if (kucuk.contains("%2e") || kucuk.contains("%2f") || kucuk.contains("%5c")) return null;

        StringBuilder cozulen = new StringBuilder(KOK);
        for (String parca : yol.split("/", -1)) {
            // Üst klasöre çıkış, bulunduğu yer ve boş segment reddedilir.
            if (parca.isEmpty() || parca.equals(".") || parca.equals("..")) return null;
            cozulen.append('/').append(parca);
        }

        String tam = cozulen.toString();
        // Son kapı: sonuç kökün altında kalmalı.
        if (!tam.startsWith(KOK + "/")) return null;
        return tam;
    }

    /**
     * Dosya uzantısına göre MIME türü.
     *
     * @return tablodaki tür, bilinmeyen uzantıda {@link #MIME_VARSAYILAN}
     */
    static String mimeTuru(String yol) {
        if (yol == null) return MIME_VARSAYILAN;
        int nokta = yol.lastIndexOf('.');
        if (nokta < 0 || nokta == yol.length() - 1) return MIME_VARSAYILAN;
        // Uzantı ASCII bir simgedir: Türkçe kültürde "I" → "ı" dönüşümü olmasın diye Locale.ROOT.
        String uzanti = yol.substring(nokta + 1).toLowerCase(Locale.ROOT);
        for (String[] satir : MIME_TABLOSU) {
            if (satir[0].equals(uzanti)) return satir[1];
        }
        return MIME_VARSAYILAN;
    }

    /** Metin türlerinde kodlama bildirilir, ikili türlerde bildirilmez. */
    private static String kodlama(String mime) {
        boolean metin = mime.startsWith("text/")
            || mime.equals("application/json")
            || mime.equals("image/svg+xml");
        return metin ? KODLAMA : null;
    }

    /**
     * Kesilen isteği karşılar.
     *
     * @return yanıt; istek bu sunucuya ait değilse {@code null} (WebView kendi yolunu izler)
     */
    WebResourceResponse yanit(Uri adres) {
        if (adres == null) return null;
        if (!"https".equals(adres.getScheme()) || !SUNUCU.equals(adres.getHost())) return null;

        String varlik = varlikYolu(adres.getPath());
        if (varlik == null) return bos(403, "Forbidden");

        try {
            InputStream akis = varliklar.open(varlik);
            String mime = mimeTuru(varlik);
            return new WebResourceResponse(mime, kodlama(mime), 200, "OK", Collections.emptyMap(), akis);
        } catch (IOException yok) {
            return bos(404, "Not Found");
        }
    }

    /** Gövdesiz yanıt: reddedilen yol ve bulunamayan varlık durum koduyla cevaplanır. */
    private static WebResourceResponse bos(int kod, String aciklama) {
        return new WebResourceResponse(
            "text/plain", KODLAMA, kod, aciklama,
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
}
