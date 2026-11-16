# Subir YucaPass 4.0 a GitHub

1. Extrae el ZIP.
2. En el repositorio `Yucapass`, abre Code → Add file → Upload files.
3. Arrastra los archivos y carpetas del contenido extraído, incluyendo `.github/workflows`.
4. Confirma en la rama principal.
5. Abre Actions → Generar APK YucaPass → ejecuta `Run workflow` o espera al push.
6. Al finalizar, descarga el artefacto `YucaPass-v4-APK-debug`.

No subas `node_modules`, `dist` ni el directorio Android generado previamente. El workflow lo crea desde el código fuente.
