# YucaPass 5.0 — Preparación de Google Play

## Ya preparado en el proyecto

- Identificador de aplicación preservado: `mx.yucapass.turismo`.
- Nombre de aplicación: `YucaPass`.
- Icono Android adaptativo y recursos por densidad generados desde la marca existente.
- Pantalla de inicio de marca para Android anterior a 12 y configuración del Splash Screen nativo.
- Objetivo de compilación configurado para Android 16 / API 36.
- Workflow para APK debug; el AAB firmado se crea solo cuando se configuran los secretos de firma.
- Gráfico promocional de 1024 × 500 listo como material inicial.

## Pendiente antes de enviar a revisión

1. **Firma:** crear una llave de carga propiedad del titular, guardar una copia segura fuera de GitHub y registrar los cuatro GitHub Secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`. Nunca subir el archivo `.jks` al repositorio.
2. **Eliminación de cuenta:** el producto permite crear cuentas, pero la entrega base no tiene todavía un flujo probado para eliminar la cuenta y sus datos. Google Play exige que la solicitud se pueda iniciar dentro de la app y desde una página web externa; se debe implementar y probar la eliminación completa y cualquier retención legal.
3. **Privacidad:** redactar y publicar una política de privacidad real en una URL pública, con el responsable, contacto y explicación veraz de Auth, perfiles, reservaciones, analítica, datos compartidos y retención.
4. **Data Safety:** completar las declaraciones de Play Console en función de los datos y SDK que realmente use la versión final.
5. **Pruebas reales:** instalar APK en teléfonos físicos y verificar registro, confirmación de correo, acceso, recuperación, reservas, sellos, roles, conectividad y cierre de sesión.
6. **Accesibilidad y contenido:** verificar que no haya datos de demostración engañosos, enlaces rotos, imágenes sin permiso, ni pantallas incompletas.
7. **Ficha de tienda:** nombre, descripción, categoría, clasificación de contenido, icono, gráfico destacado y capturas reales de la app en funcionamiento.

## Cómo funciona la entrega Android

- Cada ejecución de GitHub Actions genera `YucaPass-5.0-APK-debug` para pruebas.
- Si no existen las cuatro credenciales de firma, el flujo no inventa una llave ni publica un AAB falso; informa que la firma falta.
- Si las cuatro credenciales existen, también compila `app-release.aab` firmado y lo publica como artefacto `YucaPass-5.0-AAB-Play-Store`.
- El `versionCode` inicial es `50000`. Debe incrementarse antes de cada nueva carga en Play Console.

**Estado:** base 5.0 iniciada; no declarar lista para publicación hasta cerrar todos los puntos pendientes y completar pruebas reales.
