package tw.mic1201.littlecolorgarden;

final class AdMobTest {
    static void register(MainActivity activity) {
        if (activity.getResources().getBoolean(R.bool.admob_debug_ads)
                || !activity.getString(R.string.admob_interstitial_id).isEmpty()) {
            activity.registerPlugin(DrawingStorePlugin.class);
        }
        activity.registerPlugin(DrawingAdsPlugin.class);
    }
}
