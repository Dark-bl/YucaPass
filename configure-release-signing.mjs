import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve('android/app/build.gradle');
const required = ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) throw new Error(`Faltan variables de firma: ${missing.join(', ')}`);

let source = await readFile(file, 'utf8');
if (!source.includes('android {')) throw new Error('No se encontró el bloque android en android/app/build.gradle');

const signingConfig = `    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }

`;
if (!source.includes('signingConfigs {')) {
  const androidStart = source.indexOf('android {');
  const buildTypesIndex = source.indexOf('buildTypes {', androidStart);
  if (buildTypesIndex < 0) throw new Error('No se encontró buildTypes dentro de android/app/build.gradle');
  const insertionPoint = source.lastIndexOf('\n', buildTypesIndex) + 1;
  source = source.slice(0, insertionPoint) + signingConfig + source.slice(insertionPoint);
}

const buildTypesIndex = source.indexOf('buildTypes {', source.indexOf('android {'));
if (buildTypesIndex < 0) throw new Error('No se encontró buildTypes en android/app/build.gradle');
const releaseIndex = source.indexOf('release {', buildTypesIndex);
if (releaseIndex < 0) throw new Error('No se encontró el bloque release dentro de buildTypes.');
const releaseOpenEnd = releaseIndex + 'release {'.length;
const nextClosing = source.indexOf('\n        }', releaseOpenEnd);
const existingReleaseBody = source.slice(releaseOpenEnd, nextClosing < 0 ? source.length : nextClosing);
if (!/signingConfig\s+signingConfigs\.release/.test(existingReleaseBody)) {
  source = source.slice(0, releaseOpenEnd) + '\n            signingConfig signingConfigs.release' + source.slice(releaseOpenEnd);
}

const verifyBuildTypes = source.indexOf('buildTypes {', source.indexOf('android {'));
const verifyRelease = source.indexOf('release {', verifyBuildTypes) + 'release {'.length;
const verifyEnd = source.indexOf('\n        }', verifyRelease);
const verifyBody = source.slice(verifyRelease, verifyEnd < 0 ? source.length : verifyEnd);
if (!/signingConfig\s+signingConfigs\.release/.test(verifyBody)) {
  throw new Error('No fue posible vincular signingConfigs.release en el bloque release.');
}

await writeFile(file, source);
console.log('Firma de publicación conectada desde secretos de entorno. No se guardan credenciales en el repositorio.');
