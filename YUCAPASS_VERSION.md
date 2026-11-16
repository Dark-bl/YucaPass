# YucaPass 5.0.0 — Edición Profesional Unificada

**Nació en Yucatán. Te lleva más allá.**

Esta es la nueva línea de desarrollo a partir de la fuente 4.3.1. La versión anterior se conserva como respaldo independiente.

## Base funcional preservada

- Experiencia pública, exploración de Yucatán, pasaporte digital, sellos, favoritos, recompensas e historial.
- Cuentas de viajero mediante Supabase Auth, confirmación de correo, recuperación y cambio de contraseña.
- Reservaciones hoteleras, folios, códigos de activación, huéspedes y puntos.
- Solicitudes autónomas de hoteles, revisión de superadministración e invitaciones de un solo uso.
- Paneles de administración, hotel y participante, analítica y contabilidad.

## Primer bloque de 5.0

- Se conserva el identificador Android `mx.yucapass.turismo` para que futuras actualizaciones pertenezcan a la misma aplicación instalada.
- Nombre Android configurado como `YucaPass`.
- Icono adaptativo Android, icono heredado por densidad y splash de marca.
- Capacitor Splash Screen 8; objetivo Android 16 / API 36.
- Workflow que genera APK de pruebas y, cuando se configuren las credenciales de firma en GitHub, un AAB firmado para Google Play.
- Pruebas nuevas para versionado, branding y configuración de publicación.

## Límites que no se ocultan

Esta es una base profesional inicial, no una certificación de publicación. Todavía se requiere: llave de carga propia, probar el APK en teléfonos reales, configurar y probar la eliminación íntegra de cuentas, publicar política de privacidad y recurso web de eliminación, revisar Data Safety, y validar los flujos con cuentas reales de Supabase. Consulta `PLAY_STORE_READINESS.md`.

## Base de datos

No se ejecuta SQL ni se altera la base remota. Las migraciones anteriores se conservan; no vuelvas a ejecutar migraciones históricas. Cualquier nueva migración de 5.0 será incremental y se entregará por separado.


## Capa web/PWA unificada

- Manifest ampliado y conjunto de iconos 192/512 px.
- Botón de instalación compatible con el evento `beforeinstallprompt`.
- Service worker limitado a recursos estáticos del mismo origen.
- Workflow de GitHub Pages para desplegar `dist/` desde la misma fuente funcional.
