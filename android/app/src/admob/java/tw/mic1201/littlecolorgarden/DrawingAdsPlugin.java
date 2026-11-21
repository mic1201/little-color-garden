package tw.mic1201.littlecolorgarden;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AgeRestrictedTreatment;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;

@CapacitorPlugin(name = "DrawingAds")
public final class DrawingAdsPlugin extends Plugin {
    private static final String TAG = "LCGAdMobTest";
    private static final long INTERSTITIAL_MAX_AGE_MS = 55 * 60 * 1000L;
    private static final long INTERSTITIAL_INTERVAL_MS = 3 * 60 * 1000L;
    private static final int INTERSTITIAL_PAPER_CHANGES = 3;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable requestTimeout = () -> dismissAd("unavailable");
    private DrawingStorePlugin store;
    private PluginCall request;
    private String drawingFormat;
    private AdView banner;
    private String interstitialTestMode = "store";
    private NativeAd drawingAd;
    private View drawingView;
    private boolean drawingAdReadyToLoad;
    private InterstitialAd paperAd;
    private long paperAdLoadedAt;
    private int paperChangesUntilAd = INTERSTITIAL_PAPER_CHANGES;
    private long nextPaperAdAt;
    private boolean preparingPaperAd;
    private boolean paperAdReadyToLoad;
    private boolean showingPaperAd;
    private boolean initializing;
    private boolean initialized;
    private boolean destroyed;

    @Override
    public void load() {
        var handle = getBridge().getPlugin("DrawingStore");
        if (handle != null && handle.getInstance() instanceof DrawingStorePlugin drawingStore) {
            store = drawingStore;
            store.onAdsBlocked(() -> {
                if (blocksInterstitial()) paperAd = null;
                if (store.blocksBannerAds()) dismissAd("cancelled");
            });
        }
    }

    @PluginMethod
    public void loadDrawingAd(PluginCall call) {
        main.post(() -> {
            String format = call.getString("format", "banner");
            String unitId = switch (format) {
                case "banner" -> getContext().getString(R.string.admob_banner_id);
                case "native" -> getContext().getString(R.string.admob_native_id);
                default -> "";
            };
            boolean testBuild = isTestBuild();
            if (unitId.isEmpty() || !canLoad() || (testBuild && store == null)) {
                call.resolve(result("unavailable"));
                return;
            }
            dismissAd("cancelled");
            drawingFormat = format;
            request = call;
            main.postDelayed(requestTimeout, 15_000);
            if (testBuild) {
                store.checkDrawingTestAdEligibility(simulatesUnpurchased(), eligible -> queueDrawingAd(call, eligible));
            } else {
                queueDrawingAd(call, true);
            }
        });
    }

    private void queueDrawingAd(PluginCall call, boolean eligible) {
        if (request != call) return;
        if (!eligible || !canLoad()) {
            dismissAd("unavailable");
            return;
        }
        drawingAdReadyToLoad = true;
        initializeAds();
    }

    @PluginMethod
    public void getInterstitialTestMode(PluginCall call) {
        main.post(() -> {
            if (isTestBuild()) call.resolve(new JSObject().put("interstitialTestMode", interstitialTestMode));
            else call.resolve(result("unavailable"));
        });
    }

    @PluginMethod
    public void setInterstitialTestMode(PluginCall call) {
        main.post(() -> {
            String mode = call.getString("mode", "");
            if (!isTestBuild() || !("store".equals(mode) || "shown".equals(mode) || "removed".equals(mode))) {
                call.resolve(result("unavailable"));
                return;
            }
            interstitialTestMode = mode;
            if (blocksInterstitial()) paperAd = null;
            call.resolve(new JSObject().put("interstitialTestMode", mode));
        });
    }

    @PluginMethod
    public void preparePaperAd(PluginCall call) {
        main.post(() -> {
            preparePaperInterstitial();
            call.resolve();
        });
    }

    @PluginMethod
    public void showPaperAd(PluginCall call) {
        main.post(() -> {
            if (!paperInterstitialEnabled() || !canStart() || showingPaperAd || blocksInterstitial()) {
                call.resolve(result("skipped"));
                return;
            }
            long now = SystemClock.elapsedRealtime();
            if (paperChangesUntilAd > 0) paperChangesUntilAd--;
            if (paperAd == null || now - paperAdLoadedAt >= INTERSTITIAL_MAX_AGE_MS) {
                paperAd = null;
                preparePaperInterstitial();
                call.resolve(result("skipped"));
                return;
            }
            if (paperChangesUntilAd > 0 || now < nextPaperAdAt) {
                call.resolve(result("skipped"));
                return;
            }
            InterstitialAd ad = paperAd;
            paperAd = null;
            showingPaperAd = true;
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdShowedFullScreenContent() {
                    paperChangesUntilAd = INTERSTITIAL_PAPER_CHANGES;
                    nextPaperAdAt = SystemClock.elapsedRealtime() + INTERSTITIAL_INTERVAL_MS;
                    Log.i(TAG, "Google interstitial shown between drawing boards");
                }

                @Override public void onAdDismissedFullScreenContent() {
                    finishPaperAd(call, "dismissed");
                }

                @Override public void onAdFailedToShowFullScreenContent(AdError error) {
                    Log.w(TAG, "Google interstitial show failed: " + error.getCode());
                    finishPaperAd(call, "skipped");
                }
            });
            try {
                ad.show(getActivity());
            } catch (RuntimeException error) {
                Log.w(TAG, "Google interstitial could not open", error);
                finishPaperAd(call, "skipped");
            }
        });
    }

    private void finishPaperAd(PluginCall call, String status) {
        if (!showingPaperAd) return;
        showingPaperAd = false;
        call.resolve(result(status));
        preparePaperInterstitial();
    }

    @PluginMethod
    public void hideDrawingAd(PluginCall call) {
        main.post(() -> {
            dismissAd("cancelled");
            call.resolve();
        });
    }

    @PluginMethod
    public void positionDrawingAd(PluginCall call) {
        main.post(() -> {
            try {
                if (drawingView != null) positionAd(call);
            } finally {
                call.resolve();
            }
        });
    }

    private void positionAd(PluginCall call) {
        var webView = getBridge().getWebView();
        int viewportWidth = call.getInt("viewportWidth", 0);
        if (viewportWidth <= 0 || !canLoad() || showingPaperAd || blocksDrawingAds()) {
            drawingView.setVisibility(View.GONE);
            return;
        }
        float scale = (float) webView.getWidth() / viewportWidth;
        int width = pixels(call, "width", scale);
        int height = pixels(call, "height", scale);
        if (width <= 0 || height <= 0) {
            drawingView.setVisibility(View.GONE);
            return;
        }
        var host = (FrameLayout) getActivity().findViewById(android.R.id.content);
        int[] origin = new int[2];
        int[] hostOrigin = new int[2];
        webView.getLocationInWindow(origin);
        host.getLocationInWindow(hostOrigin);
        int adWidth = banner == null ? width : banner.getAdSize().getWidthInPixels(getContext());
        int adHeight = banner == null ? height : banner.getAdSize().getHeightInPixels(getContext());
        if (adWidth > width || adHeight > height) {
            drawingView.setVisibility(View.GONE);
            return;
        }
        FrameLayout.LayoutParams layout = new FrameLayout.LayoutParams(adWidth, adHeight, Gravity.TOP | Gravity.LEFT);
        layout.leftMargin = origin[0] - hostOrigin[0] + pixels(call, "x", scale) + (width - adWidth) / 2;
        layout.topMargin = origin[1] - hostOrigin[1] + pixels(call, "y", scale) + (height - adHeight) / 2;
        if (drawingView.getParent() == null) host.addView(drawingView, layout);
        else drawingView.setLayoutParams(layout);
        drawingView.setVisibility(View.VISIBLE);
    }

    private static int pixels(PluginCall call, String name, float scale) {
        return (int) Math.round(call.getDouble(name, 0.0) * scale);
    }

    @Override
    protected void handleOnPause() {
        main.post(() -> dismissAd("cancelled"));
    }

    @Override
    protected void handleOnDestroy() {
        main.post(() -> {
            destroyed = true;
            paperAd = null;
            paperAdReadyToLoad = false;
            if (store != null) store.onAdsBlocked(null);
            dismissAd("cancelled");
        });
    }

    private boolean canStart() {
        return canLoad() && getActivity().hasWindowFocus();
    }

    private boolean canLoad() {
        var activity = getActivity();
        return !destroyed && activity != null && !activity.isFinishing() && !activity.isDestroyed()
            && isOnline();
    }

    private boolean simulatesUnpurchased() {
        return "notPurchased".equals(getContext().getString(R.string.admob_test_entitlement));
    }

    private boolean isTestBuild() {
        return getContext().getResources().getBoolean(R.bool.admob_debug_ads);
    }

    private boolean paperInterstitialEnabled() {
        return !getContext().getString(R.string.admob_interstitial_id).isEmpty();
    }

    private boolean blocksDrawingAds() {
        return store != null && store.blocksBannerAds();
    }

    private boolean blocksInterstitial() {
        if (isTestBuild()) {
            if ("removed".equals(interstitialTestMode)) return true;
            if ("shown".equals(interstitialTestMode)) return false;
            if (store == null) return true;
        }
        return store != null && store.blocksInterstitialAds();
    }

    private boolean isOnline() {
        var connectivity = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivity == null) return false;
        Network active = connectivity.getActiveNetwork();
        NetworkCapabilities capabilities = connectivity.getNetworkCapabilities(active);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void preparePaperInterstitial() {
        if (!paperInterstitialEnabled() || !canLoad() || blocksInterstitial()
            || preparingPaperAd || showingPaperAd || paperAd != null) return;
        preparingPaperAd = true;
        if (store == null || (isTestBuild() && "shown".equals(interstitialTestMode))) {
            queueInterstitial(true);
        } else {
            store.checkInterstitialAdEligibility(!isTestBuild() || simulatesUnpurchased(), this::queueInterstitial);
        }
    }

    private void queueInterstitial(boolean eligible) {
        if (!eligible || !canLoad() || blocksInterstitial()) {
            preparingPaperAd = false;
            return;
        }
        paperAdReadyToLoad = true;
        initializeAds();
    }

    private void loadPaperInterstitial() {
        if (!canLoad() || blocksInterstitial()) {
            preparingPaperAd = false;
            return;
        }
        InterstitialAd.load(getContext(), getContext().getString(R.string.admob_interstitial_id),
            new AdRequest.Builder().build(),
            new InterstitialAdLoadCallback() {
                @Override public void onAdLoaded(InterstitialAd loaded) {
                    preparingPaperAd = false;
                    if (!canLoad() || blocksInterstitial()) return;
                    paperAd = loaded;
                    paperAdLoadedAt = SystemClock.elapsedRealtime();
                    Log.i(TAG, "Google interstitial loaded");
                }

                @Override public void onAdFailedToLoad(LoadAdError error) {
                    preparingPaperAd = false;
                    Log.w(TAG, "Google interstitial load failed: " + error.getCode());
                }
            });
    }

    private void initializeAds() {
        if (initialized) {
            loadQueuedAds();
            return;
        }
        if (initializing) return;
        initializing = true;
        Context context = getContext().getApplicationContext();
        MobileAds.setRequestConfiguration(MobileAds.getRequestConfiguration().toBuilder()
            .setAgeRestrictedTreatment(AgeRestrictedTreatment.CHILD)
            .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G)
            .build());
        new Thread(() -> MobileAds.initialize(context, status -> main.post(() -> {
            initializing = false;
            initialized = true;
            if (!destroyed) loadQueuedAds();
        })), "AdMobTestInit").start();
    }

    private void loadQueuedAds() {
        if (drawingAdReadyToLoad) {
            drawingAdReadyToLoad = false;
            if (request != null) {
                if ("banner".equals(drawingFormat)) loadBanner(request);
                else loadDrawingCard(request);
            }
        }
        if (paperAdReadyToLoad) {
            paperAdReadyToLoad = false;
            loadPaperInterstitial();
        }
    }

    private boolean canDisplayDrawingAd(PluginCall call) {
        return request == call && canLoad() && !blocksDrawingAds();
    }

    private void loadBanner(PluginCall call) {
        if (!canDisplayDrawingAd(call)) {
            dismissAd("unavailable");
            return;
        }
        AdView view = new AdView(getActivity());
        banner = view;
        view.setAdSize(AdSize.BANNER);
        view.setAdUnitId(getContext().getString(R.string.admob_banner_id));
        view.setAdListener(new AdListener() {
            @Override public void onAdLoaded() {
                if (banner != view || request != call) return;
                if (!canDisplayDrawingAd(call)) {
                    dismissAd("unavailable");
                    return;
                }
                drawingView = view;
                Log.i(TAG, "Google above-board banner ad loaded");
                finishRequest("loaded");
            }

            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (banner != view || request != call) return;
                Log.w(TAG, "Google above-board banner ad load failed: " + error.getCode());
                dismissAd("unavailable");
            }
        });
        view.loadAd(new AdRequest.Builder().build());
    }

    private void loadDrawingCard(PluginCall call) {
        if (blocksDrawingAds() || !canLoad()) {
            dismissAd("unavailable");
            return;
        }
        new AdLoader.Builder(getContext(), getContext().getString(R.string.admob_native_id))
            .forNativeAd(ad -> {
                if (!canDisplayDrawingAd(call)) {
                    ad.destroy();
                    if (request == call) dismissAd("unavailable");
                    return;
                }
                drawingAd = ad;
                drawingView = makeDrawingCard(ad);
                Log.i(TAG, "Google above-board native test ad loaded");
                finishRequest("loaded");
            })
            .withAdListener(new AdListener() {
                @Override public void onAdFailedToLoad(LoadAdError error) {
                    Log.w(TAG, "Google above-board native test ad load failed: " + error.getCode());
                    if (request == call) dismissAd("unavailable");
                }
            })
            .build()
            .loadAd(new AdRequest.Builder().build());
    }

    private NativeAdView makeDrawingCard(NativeAd ad) {
        var activity = getActivity();
        NativeAdView card = new NativeAdView(activity);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(247, 245, 235));
        background.setCornerRadius(dp(14));
        card.setBackground(background);
        card.setClipToOutline(true);

        LinearLayout row = new LinearLayout(activity);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(8), 0, dp(10), 0);
        card.addView(row, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        MediaView media = new MediaView(activity);
        media.setImageScaleType(ImageView.ScaleType.FIT_CENTER);
        row.addView(media, new LinearLayout.LayoutParams(dp(50), dp(50)));

        LinearLayout copy = new LinearLayout(activity);
        copy.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams copyLayout = new LinearLayout.LayoutParams(0, -2, 1);
        copyLayout.leftMargin = dp(8);
        copyLayout.rightMargin = dp(8);
        row.addView(copy, copyLayout);
        copy.addView(label("廣告 · Google 測試", 10, 1, true));

        LinearLayout title = new LinearLayout(activity);
        title.setGravity(Gravity.CENTER_VERTICAL);
        copy.addView(title);
        if (ad.getIcon() != null) {
            ImageView icon = new ImageView(activity);
            icon.setImageDrawable(ad.getIcon().getDrawable());
            LinearLayout.LayoutParams iconLayout = new LinearLayout.LayoutParams(dp(16), dp(16));
            iconLayout.rightMargin = dp(5);
            title.addView(icon, iconLayout);
            card.setIconView(icon);
        }
        TextView headline = label(ad.getHeadline(), 14, 1, true);
        title.addView(headline, new LinearLayout.LayoutParams(0, -2, 1));
        TextView body = label(ad.getBody(), 11, 1, false);
        copy.addView(body);
        TextView action = label(ad.getCallToAction(), 12, 2, true);
        action.setGravity(Gravity.CENTER);
        action.setMaxWidth(dp(90));
        action.setTextColor(Color.rgb(10, 84, 74));
        row.addView(action);
        card.setMediaView(media);
        media.setMediaContent(ad.getMediaContent());
        card.setHeadlineView(headline);
        card.setBodyView(body);
        card.setCallToActionView(action);
        card.setNativeAd(ad);
        return card;
    }

    private int dp(int value) {
        return Math.round(value * getContext().getResources().getDisplayMetrics().density);
    }

    private TextView label(String text, int size, int lines, boolean bold) {
        TextView view = new TextView(getActivity());
        view.setText(text);
        view.setTextSize(size);
        view.setMaxLines(lines);
        view.setEllipsize(TextUtils.TruncateAt.END);
        view.setTextColor(Color.rgb(41, 56, 54));
        if (bold) view.setTypeface(null, Typeface.BOLD);
        if (TextUtils.isEmpty(text)) view.setVisibility(View.GONE);
        return view;
    }

    private void dismissAd(String status) {
        drawingAdReadyToLoad = false;
        if (drawingView != null && drawingView.getParent() instanceof ViewGroup host) {
            host.removeView(drawingView);
        }
        if (drawingView instanceof NativeAdView card) card.destroy();
        if (banner != null) {
            banner.setAdListener(null);
            banner.destroy();
        }
        if (drawingAd != null) drawingAd.destroy();
        drawingAd = null;
        banner = null;
        drawingView = null;
        finishRequest(status);
    }

    private void finishRequest(String status) {
        main.removeCallbacks(requestTimeout);
        PluginCall call = request;
        request = null;
        if (call != null) call.resolve(result(status));
    }

    private static JSObject result(String status) {
        return new JSObject().put("status", status);
    }
}
