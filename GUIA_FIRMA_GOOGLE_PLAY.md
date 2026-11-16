# Firma de YucaPass 5.0 para Google Play

Google Play recibe el Android App Bundle (`.aab`) firmado con una llave de carga. La llave pertenece al titular de YucaPass; no la compartas ni la subas al repositorio.

## 1. Crear la llave una sola vez (Windows PowerShell)

Ejecuta desde una carpeta privada, fuera del repositorio:

```powershell
keytool -genkeypair -v -keystore yucapass-upload.jks -keyalg RSA -keysize 4096 -validity 10000 -alias yucapass
```

Guarda la contraseña, alias y archivo `.jks` en un lugar seguro. Conserva dos respaldos cifrados. No generes una llave nueva para cada versión: las actualizaciones deben conservar la misma identidad de firma de carga.

## 2. Convertir la llave a Base64 para GitHub

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\yucapass-upload.jks")) | Set-Content -NoNewline ".\yucapass-upload.base64"
```

Copia el contenido del archivo Base64 y luego elimina la copia temporal de texto. No publiques el `.jks` ni el Base64 en commits, chats públicos o incidencias.

## 3. Crear cuatro GitHub Secrets

En el repositorio: Settings → Secrets and variables → Actions → New repository secret.

- `ANDROID_KEYSTORE_BASE64`: contenido Base64 de la llave `.jks`.
- `ANDROID_KEYSTORE_PASSWORD`: contraseña de la llave.
- `ANDROID_KEY_ALIAS`: `yucapass` (o el alias elegido al crearla).
- `ANDROID_KEY_PASSWORD`: contraseña de la clave.

El workflow valida que existan los cuatro secretos y después genera `YucaPass-5.0-AAB-Play-Store`. Si falta alguno, solo se genera el APK de pruebas.

## 4. Identidad y versiones

- Application ID conservado: `mx.yucapass.turismo`.
- Nombre visible: `YucaPass`.
- Version name inicial: `5.0.0`.
- Version code inicial: `50000`.

Antes de cada envío posterior aumenta `versionCode` en `app-release.config.json`. No cambies `applicationId` si el objetivo es actualizar la misma aplicación.

## 5. Importante

El AAB firmado es un artefacto de publicación, pero no garantiza aprobación de Google Play. Antes del envío hay que cerrar `PLAY_STORE_READINESS.md`, instalar y probar la app en dispositivos reales, y completar las declaraciones de privacidad y seguridad en Play Console.
