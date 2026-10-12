import { readFile, writeFile, mkdir } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(manifestPath, 'utf8');
const permissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.CAMERA'
];

for (const permission of permissions) {
  if (!xml.includes(permission)) {
    xml = xml.replace('<application', `    <uses-permission android:name="${permission}" />\n\n    <application`);
  }
}

if (!xml.includes('android:name=".ReportPrintActivity"')) {
  xml = xml.replace(
    '</application>',
    `        <activity\n            android:name=".ReportPrintActivity"\n            android:exported="false" />\n    </application>`
  );
}
await writeFile(manifestPath, xml, 'utf8');

const javaDir='android/app/src/main/java/ir/fireexecutive/pro';
await mkdir(javaDir,{recursive:true});

const plugin=`package ir.fireexecutive.pro;

import android.content.Intent;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FepPrint")
public class FepPrintPlugin extends Plugin {
    @PluginMethod
    public void printHtml(PluginCall call) {
        final String html = call.getString("html");
        final String title = call.getString("title", "Fire Executive Pro Report");
        if (html == null || html.trim().isEmpty()) {
            call.reject("HTML report is empty");
            return;
        }

        try {
            File reportFile = new File(
                getActivity().getCacheDir(),
                "fep-report-" + System.currentTimeMillis() + ".html"
            );
            try (FileOutputStream out = new FileOutputStream(reportFile)) {
                out.write(html.getBytes(StandardCharsets.UTF_8));
                out.flush();
            }

            Intent intent = new Intent(getActivity(), ReportPrintActivity.class);
            intent.putExtra("reportPath", reportFile.getAbsolutePath());
            intent.putExtra("title", title);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Android print setup failed", ex);
        }
    }
}
`;
await writeFile(`${javaDir}/FepPrintPlugin.java`,plugin,'utf8');

const activity=`package ir.fireexecutive.pro;

// FEP-ANDROID-PDF-VECTOR-v1
// Print the report through Chromium/WebView's PrintDocumentAdapter.
// This preserves normal HTML print pagination and avoids rasterizing every page with Canvas.

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class ReportPrintActivity extends Activity {
    private WebView webView;
    private File reportFile;
    private String title = "Fire Executive Pro Report";
    private boolean renderReady = false;
    private boolean autoPrintStarted = false;
    private TextView statusLabel;
    private Button printButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String path = getIntent().getStringExtra("reportPath");
        String incomingTitle = getIntent().getStringExtra("title");
        if (incomingTitle != null && !incomingTitle.trim().isEmpty()) title = incomingTitle;
        if (path == null || path.trim().isEmpty()) {
            finish();
            return;
        }

        reportFile = new File(path);
        final String html;
        try {
            html = readUtf8(reportFile);
        } catch (Exception ex) {
            finish();
            return;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(10), dp(8), dp(10), dp(8));
        bar.setBackgroundColor(Color.rgb(17, 24, 39));

        Button back = new Button(this);
        back.setText("بازگشت");
        back.setOnClickListener(v -> finish());
        bar.addView(back, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        statusLabel = new TextView(this);
        statusLabel.setText("پیش‌نمایش گزارش");
        statusLabel.setTextColor(Color.WHITE);
        statusLabel.setTextSize(16f);
        statusLabel.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1f
        );
        labelParams.setMargins(dp(8), 0, dp(8), 0);
        bar.addView(statusLabel, labelParams);

        printButton = new Button(this);
        printButton.setText("چاپ / PDF");
        printButton.setEnabled(false);
        printButton.setOnClickListener(v -> launchSystemPrint());
        bar.addView(printButton, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        root.addView(bar, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setLoadsImagesAutomatically(true);
        webView.getSettings().setBuiltInZoomControls(true);
        webView.getSettings().setDisplayZoomControls(false);
        root.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        setContentView(root);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                view.postVisualStateCallback(613L, new WebView.VisualStateCallback() {
                    @Override
                    public void onComplete(long requestId) {
                        view.postDelayed(() -> {
                            renderReady = true;
                            printButton.setEnabled(true);
                            statusLabel.setText("گزارش آماده است");
                            if (!autoPrintStarted) {
                                autoPrintStarted = true;
                                launchSystemPrint();
                            }
                        }, 700);
                    }
                });
            }
        });

        webView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String readUtf8(File file) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8)
        )) {
            char[] buffer = new char[8192];
            int count;
            while ((count = reader.read(buffer)) != -1) sb.append(buffer, 0, count);
        }
        return sb.toString();
    }

    private void launchSystemPrint() {
        if (!renderReady || webView == null) return;
        try {
            printButton.setEnabled(false);
            statusLabel.setText("در حال آماده‌سازی چاپ / PDF…");

            PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            PrintAttributes attributes = new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                .build();

            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title);
            printManager.print(title, adapter, attributes);

            statusLabel.setText("پنجره چاپ باز شد");
        } catch (Exception ex) {
            statusLabel.setText("خطا در آماده‌سازی چاپ");
        } finally {
            printButton.setEnabled(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        if (reportFile != null && reportFile.exists()) reportFile.delete();
        super.onDestroy();
    }
}
`;
await writeFile(`${javaDir}/ReportPrintActivity.java`,activity,'utf8');

const mainActivityPath=`${javaDir}/MainActivity.java`;
let main=await readFile(mainActivityPath,'utf8');
if(!main.includes('registerPlugin(FepPrintPlugin.class);')){
  main=main.replace(
    'public class MainActivity extends BridgeActivity {}',
    `public class MainActivity extends BridgeActivity {\n    private static final String FEP_CACHE_MIGRATION_KEY = "fep_native_cache_migration_106";\n\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        android.webkit.WebView.enableSlowWholeDocumentDraw();\n        registerPlugin(FepPrintPlugin.class);\n        super.onCreate(savedInstanceState);\n        runFireExecutiveCacheMigration();\n    }\n\n    private void runFireExecutiveCacheMigration() {\n        final android.content.SharedPreferences prefs = getSharedPreferences("fep_native_migrations", MODE_PRIVATE);\n        if (prefs.getBoolean(FEP_CACHE_MIGRATION_KEY, false)) return;\n        final android.webkit.WebView webView = getBridge() != null ? getBridge().getWebView() : null;\n        if (webView == null) return;\n        webView.clearCache(true);\n        webView.postDelayed(() -> {\n            final String js = "(function(){try{" +\n                "var jobs=[];" +\n                "if('serviceWorker' in navigator){jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}).catch(function(){}));}" +\n                "if('caches' in window){jobs.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k);}));}).catch(function(){}));}" +\n                "Promise.all(jobs).then(function(){setTimeout(function(){location.reload();},120);});" +\n                "}catch(e){setTimeout(function(){location.reload();},120);}return 'started';})()";\n            webView.evaluateJavascript(js, value -> {\n                webView.postDelayed(() -> prefs.edit().putBoolean(FEP_CACHE_MIGRATION_KEY, true).apply(), 1800);\n            });\n        }, 900);\n    }\n}`
  );
  if(!main.includes('registerPlugin(FepPrintPlugin.class);')) throw new Error('Could not register FepPrintPlugin in MainActivity');
  await writeFile(mainActivityPath,main,'utf8');
} else {
  if(!main.includes('enableSlowWholeDocumentDraw')) {
    main=main.replace(
      'registerPlugin(FepPrintPlugin.class);',
      'android.webkit.WebView.enableSlowWholeDocumentDraw();\n        registerPlugin(FepPrintPlugin.class);'
    );
  }
  if(!main.includes('FEP_CACHE_MIGRATION_KEY')) {
    main=main.replace(
      'public class MainActivity extends BridgeActivity {',
      'public class MainActivity extends BridgeActivity {\n    private static final String FEP_CACHE_MIGRATION_KEY = "fep_native_cache_migration_106";'
    );
    main=main.replace(
      'super.onCreate(savedInstanceState);',
      'super.onCreate(savedInstanceState);\n        runFireExecutiveCacheMigration();'
    );
    main=main.replace(
      '\n}',
      `\n\n    private void runFireExecutiveCacheMigration() {\n        final android.content.SharedPreferences prefs = getSharedPreferences("fep_native_migrations", MODE_PRIVATE);\n        if (prefs.getBoolean(FEP_CACHE_MIGRATION_KEY, false)) return;\n        final android.webkit.WebView webView = getBridge() != null ? getBridge().getWebView() : null;\n        if (webView == null) return;\n        webView.clearCache(true);\n        webView.postDelayed(() -> {\n            final String js = "(function(){try{" +\n                "var jobs=[];" +\n                "if('serviceWorker' in navigator){jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}).catch(function(){}));}" +\n                "if('caches' in window){jobs.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k);}));}).catch(function(){}));}" +\n                "Promise.all(jobs).then(function(){setTimeout(function(){location.reload();},120);});" +\n                "}catch(e){setTimeout(function(){location.reload();},120);}return 'started';})()";\n            webView.evaluateJavascript(js, value -> {\n                webView.postDelayed(() -> prefs.edit().putBoolean(FEP_CACHE_MIGRATION_KEY, true).apply(), 1800);\n            });\n        }, 900);\n    }\n}`
    );
  }
  await writeFile(mainActivityPath,main,'utf8');
}

console.log('Android manifest patched; structure-aware native PDF pagination registered.');
