import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const javaDir = 'android/app/src/main/java/ir/fireexecutive/pro';
const drawableDir = 'android/app/src/main/res/drawable-nodpi';
const splashSource = 'assets/android-splash/fep_splash.webp';
const splashTarget = `${drawableDir}/fep_splash.webp`;

await mkdir(javaDir, { recursive: true });
await mkdir(drawableDir, { recursive: true });
await copyFile(splashSource, splashTarget);

let xml = await readFile(manifestPath, 'utf8');

const mainActivityRe = /(<activity\b[^>]*android:name="\.MainActivity"[^>]*>)([\s\S]*?)(<\/activity>)/m;
const match = xml.match(mainActivityRe);
if (!match) throw new Error('MainActivity not found in AndroidManifest.xml');

const cleanedMainBody = match[2].replace(
  /\s*<intent-filter>[\s\S]*?<action android:name="android\.intent\.action\.MAIN"\s*\/>[\s\S]*?<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>[\s\S]*?<\/intent-filter>\s*/m,
  '\n'
);
xml = xml.replace(mainActivityRe, `${match[1]}${cleanedMainBody}${match[3]}`);

if (!xml.includes('android:name=".SplashActivity"')) {
  xml = xml.replace(
    '</application>',
    `        <activity\n            android:name=".SplashActivity"\n            android:exported="true"\n            android:screenOrientation="portrait">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>`
  );
}
await writeFile(manifestPath, xml, 'utf8');

const splashActivity = `package ir.fireexecutive.pro;\n\nimport android.app.Activity;\nimport android.content.Intent;\nimport android.graphics.Color;\nimport android.os.Bundle;\nimport android.view.View;\nimport android.view.Window;\nimport android.view.WindowManager;\nimport android.widget.ImageView;\n\npublic class SplashActivity extends Activity {\n    private static final long SPLASH_DURATION_MS = 1150L;\n\n    @Override\n    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        requestWindowFeature(Window.FEATURE_NO_TITLE);\n        getWindow().setStatusBarColor(Color.BLACK);\n        getWindow().setNavigationBarColor(Color.BLACK);\n        getWindow().setFlags(\n            WindowManager.LayoutParams.FLAG_FULLSCREEN,\n            WindowManager.LayoutParams.FLAG_FULLSCREEN\n        );\n\n        ImageView splash = new ImageView(this);\n        splash.setBackgroundColor(Color.BLACK);\n        splash.setScaleType(ImageView.ScaleType.CENTER_CROP);\n        splash.setImageResource(R.drawable.fep_splash);\n        setContentView(splash);\n\n        splash.postDelayed(() -> {\n            Intent intent = new Intent(SplashActivity.this, MainActivity.class);\n            startActivity(intent);\n            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);\n            finish();\n        }, SPLASH_DURATION_MS);\n    }\n\n    @Override\n    public void onBackPressed() {\n        // Ignore back while the short branded splash is visible.\n    }\n}\n`;

await writeFile(`${javaDir}/SplashActivity.java`, splashActivity, 'utf8');
console.log('Android branded splash patch applied');
