# YucaPass 5.0.0 — Edición Profesional Unificada

**Nació en Yucatán. Te lleva más allá.**

La plataforma usa una sola fuente funcional para web, PWA y Android. Esta entrega une la lógica de la edición Profesional con la capa instalable PWA, evitando mantener dos variantes funcionales.

YucaPass 5.0 inicia una nueva línea a partir del código 4.3.1. Conserva la aplicación existente y añade preparación nativa Android, identidad visual de instalación y un flujo de empaquetado que distingue pruebas de publicación.

## Funciones conservadas de 4.3.1

- Experiencia pública para descubrir Yucatán, consultar experiencias, guardar favoritos y mantener el pasaporte digital.
- Cuentas de viajeros con Supabase Auth: registro, confirmación de correo, inicio/cierre de sesión y recuperación/cambio de contraseña.
- Sellos y visitas, puntos, recompensas y reservaciones con folio y código de activación.
- Solicitud autónoma de incorporación de hoteles, revisión de superadministración e invitación de activación de un solo uso.
- Paneles de administración, hotel y participante; analítica y contabilidad.
- Diseño azul petróleo y dorado, navegación adaptable a escritorio y móvil.

## Requisitos de desarrollo

- Node.js 22 o superior.
- Para Android: Android Studio compatible con Capacitor 8, JDK 21 y Android SDK API 36.

## Desarrollo web

```powershell
npm install
npm run check
npm run build:web
```

Abre `index.html` con Live Server. El bundle para Capacitor se genera en `dist/`.

## Android

Primera creación del proyecto nativo:

```powershell
npm run android:add
```

Cambios posteriores:

```powershell
npm run android:sync
```

Prueba local:

```powershell
npm run android:debug
```

El script `android:prepare` aplica el nombre visible, iconos adaptativos, splash y metadatos de versión. El `applicationId` se mantiene como `mx.yucapass.turismo` para que la futura publicación sea la misma app y no una app distinta.

## Publicar la web en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` valida el proyecto, construye `dist/` y lo publica. En GitHub configura Settings > Pages > Build and deployment > GitHub Actions.

## GitHub Actions

El workflow `.github/workflows/android-release.yml` ejecuta las pruebas y genera el APK `YucaPass-5.0-APK-debug`. Cuando se configuran los cuatro secretos de firma, también genera el AAB `YucaPass-5.0-AAB-Play-Store`. Consulta `GUIA_FIRMA_GOOGLE_PLAY.md`.

## PWA y modo sin conexión

La PWA se instala desde HTTPS cuando el navegador lo permite. El service worker guarda archivos estáticos de la aplicación; no almacena sesiones ni respuestas de Supabase. Reservas, cuentas, sellos y permisos necesitan conexión.

## Supabase

Esta entrega no modifica ni ejecuta SQL remoto. Las migraciones históricas se conservan como referencia; no las vuelvas a ejecutar si ya están aplicadas. Cualquier migración 5.0 deberá ser incremental y verificarse primero en un entorno de pruebas.

## Estado real de publicación

La aplicación ya tiene el pipeline y los recursos básicos de marca preparados, pero aún no debe considerarse lista para enviar a Play Store. Faltan llave de carga, política de privacidad publicada, solicitud/eliminación completa de cuentas desde la app y web, Data Safety y pruebas reales. Revisa `PLAY_STORE_READINESS.md`.


Consulta `PROCESO_DE_CIERRE_PROFESIONAL.md` para el orden de validación y los criterios de salida.
