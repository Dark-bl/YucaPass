# Publicar YucaPass 5.0 en web y generar Android desde la misma fuente

YucaPass mantiene una única fuente funcional para navegador y Android. Capacitor empaqueta el bundle `dist/`; no se mantienen pantallas duplicadas.

## Web

```powershell
npm install
npm run check
npm run build:web
```

Usa Live Server sobre `index.html` o aloja el contenido de `dist/`.

## Android desde GitHub

1. Sube todo el proyecto a la raíz del repositorio, incluido `.github/workflows/android-release.yml`.
2. Entra a GitHub → Actions → **YucaPass 5.0 · Android y Google Play** → Run workflow.
3. Descarga el APK `YucaPass-5.0-APK-debug` desde Artifacts para pruebas.
4. Para producir el AAB firmado, configura los cuatro secretos descritos en `GUIA_FIRMA_GOOGLE_PLAY.md` y ejecuta el workflow de nuevo.

El APK debug no es el archivo que se sube para la publicación normal de una app nueva. Para Play Store se usa el AAB firmado.

## Supabase

No vuelvas a ejecutar migraciones iniciales ni históricas. Revisa `PLAY_STORE_READINESS.md` y `REVISAR_SUPERADMIN_ANTES_DE_PUBLICAR.md` antes de operar la versión 5.0.
