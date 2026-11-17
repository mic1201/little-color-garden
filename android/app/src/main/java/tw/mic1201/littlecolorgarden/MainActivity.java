package tw.mic1201.littlecolorgarden;

import android.content.pm.ApplicationInfo;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.android.R;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            registerPlugin(LocalTestTools.class);
        }
        WebView webView = findViewById(R.id.webview);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        super.load();
    }

    @CapacitorPlugin(name = "LocalTestTools")
    public static final class LocalTestTools extends Plugin {}
}
