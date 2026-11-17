package tw.mic1201.littlecolorgarden;

import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.AgeRestrictedTreatment;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.ResponseInfo;

@CapacitorPlugin(name = "ParentTestAds")
public final class ParentTestAdsPlugin extends Plugin {
    private static final String TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable requestTimeout = () -> dismissAd("unavailable");
    private final Runnable displayTimeout = () -> dismissAd("cancelled");
    private DrawingStorePlugin store;
    private PluginCall request;
    private Dialog dialog;
    private AdView banner;
    private boolean initializing;
    private boolean initialized;
    private boolean destroyed;

    @Override
    public void load() {
        var handle = getBridge().getPlugin("DrawingStore");
        if (handle != null && handle.getInstance() instanceof DrawingStorePlugin drawingStore) {
            store = drawingStore;
            store.onTestAdsBlocked(() -> dismissAd("cancelled"));
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        main.post(() -> {
            if (store == null || request != null || dialog != null || !canStart()) {
                call.resolve(result("unavailable"));
                return;
            }
            boolean simulateUnpurchased = "notPurchased".equals(
                getContext().getString(R.string.admob_test_entitlement)
            );
            request = call;
            main.postDelayed(requestTimeout, 15_000);
            store.checkTestAdEligibility(simulateUnpurchased, eligible -> {
                if (request != call) return;
                if (!eligible || !canStart()) {
                    dismissAd("unavailable");
                    return;
                }
                initializeAndLoad();
            });
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        main.post(() -> {
            dismissAd("cancelled");
            call.resolve();
        });
    }

    @Override
    protected void handleOnPause() {
        main.post(() -> dismissAd("cancelled"));
    }

    @Override
    protected void handleOnDestroy() {
        main.post(() -> {
            destroyed = true;
            if (store != null) store.onTestAdsBlocked(null);
            dismissAd("cancelled");
        });
    }

    private boolean canStart() {
        var activity = getActivity();
        return !destroyed && activity != null && !activity.isFinishing() && !activity.isDestroyed()
            && activity.hasWindowFocus() && isOnline();
    }

    private boolean isOnline() {
        var connectivity = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivity == null) return false;
        Network active = connectivity.getActiveNetwork();
        NetworkCapabilities capabilities = connectivity.getNetworkCapabilities(active);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void initializeAndLoad() {
        if (initialized) {
            loadBanner();
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
            if (request != null) loadBanner();
        })), "AdMobTestInit").start();
    }

    private void loadBanner() {
        var activity = getActivity();
        if (store.blocksTestAds() || !canStart() || activity.getResources().getConfiguration().screenWidthDp < 320) {
            dismissAd("unavailable");
            return;
        }
        AdView ad = new AdView(activity);
        ad.setAdUnitId(TEST_BANNER_ID);
        ad.setAdSize(AdSize.BANNER);
        ad.setVisibility(View.GONE);
        banner = ad;

        LinearLayout content = new LinearLayout(activity);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        int padding = Math.round(12 * activity.getResources().getDisplayMetrics().density);
        content.setPadding(0, padding, 0, padding);
        TextView label = new TextView(activity);
        label.setText("家長區・載入測試廣告中…");
        content.addView(label);
        content.addView(ad);
        Button report = new Button(activity);
        report.setText("回報廣告");
        report.setVisibility(View.GONE);
        report.setOnClickListener(view -> reportAd(ad, label));
        content.addView(report);
        Button close = new Button(activity);
        close.setText("關閉");
        close.setOnClickListener(view -> dismissAd("cancelled"));
        content.addView(close);

        Dialog popup = new Dialog(activity);
        popup.setContentView(content);
        popup.setOnDismissListener(ignored -> {
            if (dialog == popup) dismissAd("cancelled");
        });
        dialog = popup;
        popup.show();
        popup.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ad.setAdListener(new AdListener() {
            @Override public void onAdLoaded() {
                if (banner != ad) return;
                if (store.blocksTestAds() || !isOnline()) {
                    dismissAd("unavailable");
                    return;
                }
                label.setText("家長區・Google 測試廣告");
                ad.setVisibility(View.VISIBLE);
                report.setVisibility(View.VISIBLE);
                finishRequest("shown");
                main.postDelayed(displayTimeout, 30_000);
            }

            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (banner == ad) dismissAd("unavailable");
            }
        });
        ad.loadAd(new AdRequest.Builder().build());
    }

    private void reportAd(AdView ad, TextView label) {
        ResponseInfo info = ad.getResponseInfo();
        Intent mail = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:michael1201op@gmail.com"));
        mail.putExtra(Intent.EXTRA_SUBJECT, "小小畫畫花園｜測試廣告回報");
        if (info != null && info.getResponseId() != null) {
            mail.putExtra(Intent.EXTRA_TEXT, "廣告回應 ID：" + info.getResponseId() + "\n\n");
        }
        try {
            getActivity().startActivity(mail);
        } catch (ActivityNotFoundException missingMailApp) {
            label.setText("請來信至 michael1201op@gmail.com 回報。");
        }
    }

    private void dismissAd(String status) {
        main.removeCallbacks(displayTimeout);
        Dialog popup = dialog;
        dialog = null;
        AdView ad = banner;
        banner = null;
        if (ad != null) {
            ad.setAdListener(null);
            if (ad.getParent() instanceof ViewGroup parent) parent.removeView(ad);
            ad.destroy();
        }
        if (popup != null) popup.dismiss();
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
