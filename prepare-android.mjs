import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const cap = JSON.parse(await readFile(path.join(root, 'capacitor.config.json'), 'utf8'));
const release = JSON.parse(await readFile(path.join(root, 'app-release.config.json'), 'utf8'));
const assetRoot = path.join(root, 'assets', 'android');

async function assertExists(file, message) {
  try { await access(file); } catch { throw new Error(message); }
}

await assertExists(
  path.join(android, 'app', 'build.gradle'),
  'No existe android/app/build.gradle. Ejecuta primero: npx cap add android'
);
const app = path.join(android, 'app');
const res = path.join(app, 'src', 'main', 'res');
const launcherRoot = path.join(assetRoot, 'launcher');
const splashRoot = path.join(assetRoot, 'splash');

for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const target = path.join(res, `mipmap-${density}`);
  await mkdir(target, { recursive: true });
  await copyFile(path.join(launcherRoot, `mipmap-${density}`, 'ic_launcher.png'), path.join(target, 'ic_launcher.png'));
  await copyFile(path.join(launcherRoot, `mipmap-${density}`, 'ic_launcher_foreground.png'), path.join(target, 'ic_launcher_foreground.png'));
}

const adaptiveDir = path.join(res, 'mipmap-anydpi-v26');
await mkdir(adaptiveDir, { recursive: true });
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/yucapass_icon_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
await writeFile(path.join(adaptiveDir, 'ic_launcher.xml'), adaptive);
await writeFile(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptive);

const valuesDir = path.join(res, 'values');
await mkdir(valuesDir, { recursive: true });
await writeFile(path.join(valuesDir, 'yucapass_colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="yucapass_icon_background">#062D46</color>
    <color name="yucapass_splash_background">#062D46</color>
</resources>
`);
const stringsPath = path.join(valuesDir, 'strings.xml');
let strings = await readFile(stringsPath, 'utf8').catch(() => '<resources>\n</resources>');
if (/<string name="app_name">[\s\S]*?<\/string>/.test(strings)) {
  strings = strings.replace(/<string name="app_name">[\s\S]*?<\/string>/, `<string name="app_name">${cap.appName}</string>`);
} else {
  strings = strings.replace('</resources>', `    <string name="app_name">${cap.appName}</string>\n</resources>`);
}
await writeFile(stringsPath, strings);

const drawableDir = path.join(res, 'drawable');
await mkdir(drawableDir, { recursive: true });
await copyFile(path.join(splashRoot, 'splash.png'), path.join(drawableDir, 'splash.png'));
for (const themeDir of ['values', 'values-v31']) {
  const stylePath = path.join(res, themeDir, 'styles.xml');
  let styles = await readFile(stylePath, 'utf8').catch(() => '');
  if (!styles) continue;
  styles = styles.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)([\s\S]*?)(<\/style>)/, (_all, open, body, close) => {
    const filtered = body.replace(/<item name="android:background">[\s\S]*?<\/item>/g, '');
    return `${open}${filtered}    <item name="android:background">@drawable/splash</item>\n${close}`;
  });
  await writeFile(stylePath, styles);
}

const manifestPath = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let manifest = await readFile(manifestPath, 'utf8');
manifest = manifest.replace(/android:icon="[^"]+"/, 'android:icon="@mipmap/ic_launcher"');
if (/android:roundIcon="[^"]+"/.test(manifest)) {
  manifest = manifest.replace(/android:roundIcon="[^"]+"/, 'android:roundIcon="@mipmap/ic_launcher_round"');
} else {
  manifest = manifest.replace(/android:icon="@mipmap\/ic_launcher"/, 'android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"');
}
await writeFile(manifestPath, manifest);

const variablesPath = path.join(android, 'variables.gradle');
let variables = await readFile(variablesPath, 'utf8');
variables = variables.replace(/targetSdkVersion\s*=\s*\d+/, `targetSdkVersion = ${release.targetSdkVersion}`);
variables = variables.replace(/compileSdkVersion\s*=\s*\d+/, `compileSdkVersion = ${release.compileSdkVersion}`);
variables = variables.replace(/minSdkVersion\s*=\s*\d+/, `minSdkVersion = ${release.minSdkVersion}`);
if (!new RegExp(`targetSdkVersion\\s*=\\s*${release.targetSdkVersion}`).test(variables)) {
  throw new Error('No se pudo fijar targetSdkVersion. Revisa la compatibilidad de Capacitor y variables.gradle.');
}
await writeFile(variablesPath, variables);

const gradlePath = path.join(app, 'build.gradle');
let gradle = await readFile(gradlePath, 'utf8');
if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+"[^"]+"/.test(gradle)) {
  throw new Error('No se reconoció versionCode/versionName en android/app/build.gradle.');
}
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${release.versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${packageJson.version}"`);
await writeFile(gradlePath, gradle);
console.log(`Android preparado: ${cap.appName} ${packageJson.version}, versionCode ${release.versionCode}, target API ${release.targetSdkVersion}.`);
