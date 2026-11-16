package tw.mic1201.littlecolorgarden;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.android.R;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        WebView webView = findViewById(R.id.webview);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        super.load();
    }
}
