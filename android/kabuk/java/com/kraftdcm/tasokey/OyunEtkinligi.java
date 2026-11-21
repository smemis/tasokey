package com.kraftdcm.tasokey;

import android.app.Activity;
import android.app.AlertDialog;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Taş Okey Android kabuğunun tek etkinliği (tasokey#54, üst iş tasokey#52).
 *
 * <p>Yaptığı iş: tam ekran bir WebView açar, varlıkları {@link VarlikSunucusu} üzerinden yerelden
 * sunar, ekranın kapanmasını engeller ve geri tuşunda çıkışı sorar. Oyun kuralı, arayüzü ve dili
 * web katmanındadır (docs/); kabuk oyun hakkında hiçbir karar vermez — yön kararı bile web
 * katmanındadır (ADR-012), bu yüzden manifestte {@code screenOrientation} yoktur.
 *
 * <p>Dış kütüphane yoktur (ADR-001): yalnız platform sınıfları; uyumluluk/destek kütüphanesi
 * kullanılmaz (derleme sınıf yolunda yalnız android.jar durur).
 */
public final class OyunEtkinligi extends Activity {

    private WebView oyunGorunumu;
    private AlertDialog cikisSorusu;

    @Override
    protected void onCreate(Bundle kayitliDurum) {
        super.onCreate(kayitliDurum);

        // Oyun sırası botu beklerken ekran kararmasın/kilitlenmesin.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        oyunGorunumu = new WebView(this);
        ayarla(oyunGorunumu.getSettings());
        oyunGorunumu.setWebViewClient(new KabukIstemcisi(new VarlikSunucusu(getAssets())));
        // Masa koyu zemin üzerinde durur; açılışta beyaz parlama olmasın (STIL).
        oyunGorunumu.setBackgroundColor(0xFF000000);
        // Sayfa kendi düzenini kurar; kabuk kaydırma/esneme hareketi eklemez.
        oyunGorunumu.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(oyunGorunumu);

        tamEkran();

        // Her açılışta başlangıç adresi yüklenir: oyuncunun durumu localStorage'dadır (ADR-006),
        // WebView gezinti geçmişinden kurtarılmaya çalışılmaz.
        oyunGorunumu.loadUrl(VarlikSunucusu.BASLANGIC_ADRESI);
    }

    /** WebView ayarlarının tek yeri (kaynak taramasıyla ölçülür: testler/android-kabuk.test.js). */
    private static void ayarla(WebSettings ayar) {
        ayar.setJavaScriptEnabled(true);                  // oyun ES2022 modülleriyle çalışır (ADR-001)
        ayar.setDomStorageEnabled(true);                  // kayıt localStorage'da (ADR-006)
        ayar.setMediaPlaybackRequiresUserGesture(false);  // ses/efekt dokunma beklemeden çalabilsin
        ayar.setSupportZoom(false);                       // masa düzeni ızgaradır, yakınlaştırma düzeni bozar
        ayar.setBuiltInZoomControls(false);
        ayar.setDisplayZoomControls(false);
        ayar.setTextZoom(100);                            // sistem yazı ölçeği taşmaya yol açmasın; ölçek CSS'te
        ayar.setAllowFileAccess(false);                   // varlıklar yalnız VarlikSunucusu'ndan gelir
        ayar.setAllowContentAccess(false);
        ayar.setAllowFileAccessFromFileURLs(false);
        ayar.setAllowUniversalAccessFromFileURLs(false);
        ayar.setGeolocationEnabled(false);                // oyun konum sormaz; izin de istenmez
        ayar.setCacheMode(WebSettings.LOAD_NO_CACHE);     // varlıklar APK'dan okunur, eski kopya kalmasın
    }

    /** Çentikli ekranda da kenardan kenara: çubuklar gizlenir, kaydırmayla geçici gelir. */
    private void tamEkran() {
        View kapak = getWindow().getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController denetci = kapak.getWindowInsetsController();
            if (denetci != null) {
                denetci.hide(WindowInsets.Type.systemBars());
                denetci.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            kapak.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean odakta) {
        super.onWindowFocusChanged(odakta);
        if (odakta) tamEkran();
    }

    /**
     * Geri tuşu oyundan çıkmak demektir: tek sayfalık oyunun kendi ekran geçişleri web
     * katmanındaki durum makinesindedir (ADR-016), WebView gezinti geçmişi değildir. Bu yüzden
     * geri tuşu sayfada gezinmez, çıkışı sorar.
     */
    @Override
    public void onBackPressed() {
        if (cikisSorusu != null && cikisSorusu.isShowing()) return;
        cikisSorusu = new AlertDialog.Builder(this)
            .setTitle(R.string.cikis_basligi)
            .setMessage(R.string.cikis_sorusu)
            .setPositiveButton(R.string.cikis_evet, (pencere, dugme) -> finish())
            .setNegativeButton(R.string.cikis_hayir, (pencere, dugme) -> pencere.dismiss())
            .create();
        cikisSorusu.show();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (oyunGorunumu != null) oyunGorunumu.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (oyunGorunumu != null) oyunGorunumu.onResume();
    }

    @Override
    protected void onDestroy() {
        if (cikisSorusu != null) {
            cikisSorusu.dismiss();
            cikisSorusu = null;
        }
        if (oyunGorunumu != null) {
            oyunGorunumu.destroy();
            oyunGorunumu = null;
        }
        super.onDestroy();
    }

    /**
     * WebView istemcisi: her isteği varlık sunucusuna verir, kabuğun dışına gezinmeye izin vermez.
     * INTERNET izni olmadığı için dış adres zaten yüklenemez; burada sessizce yutulur (ADR-007).
     */
    private static final class KabukIstemcisi extends WebViewClient {

        private final VarlikSunucusu sunucu;

        KabukIstemcisi(VarlikSunucusu sunucu) {
            this.sunucu = sunucu;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView gorunum, WebResourceRequest istek) {
            return sunucu.yanit(istek.getUrl());
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView gorunum, String adres) {
            return sunucu.yanit(Uri.parse(adres));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView gorunum, WebResourceRequest istek) {
            return !bizim(istek.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView gorunum, String adres) {
            return !bizim(Uri.parse(adres));
        }

        private static boolean bizim(Uri adres) {
            return adres != null && VarlikSunucusu.SUNUCU.equals(adres.getHost());
        }
    }
}
