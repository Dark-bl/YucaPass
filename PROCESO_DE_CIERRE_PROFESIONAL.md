# Proceso de cierre profesional de YucaPass 5.0

## 1. Congelar una base única

La carpeta GitHub contiene la fuente canónica. El paquete web se construye desde la misma carpeta con `npm run build:web`. No se deben mantener dos copias editables de `main.js`, `dashboards.js`, `reservations.js`, `events.js` o `pages.js`.

La anterior entrega `Standalone PWA` tenía diferencias de lógica frente a la edición Profesional derivada de 4.3.1. Para evitar divergencias, esta entrega conserva la lógica profesional y solo incorpora de la rama PWA su capa instalable: manifest, icono de 192 px, botón, service worker y caché estático.

## 2. Validación local

```powershell
npm install
npm run check
npm run build:web
```

`npm run check` comprueba las reglas de reservaciones, Auth, roles, analítica, incorporación de hoteles, configuración pública de Supabase, sintaxis, versión Android y PWA. `npm run build:web` debe crear `dist/` sin errores.

## 3. Vista previa web

Abre `index.html` con Live Server o publica el contenido de `dist/` en HTTPS. La instalación PWA depende del navegador; en Safari iOS normalmente se usa Compartir > Añadir a pantalla de inicio. La caché PWA solo almacena recursos estáticos propios; no almacena tokens, credenciales ni respuestas de Supabase. La aplicación no es completamente offline.

## 4. Publicación web en GitHub Pages

Sube esta carpeta completa a la raíz de un repositorio. En GitHub, configura Settings > Pages > Build and deployment > GitHub Actions. El workflow `deploy-pages.yml` valida, construye y publica `dist/`.

## 5. Validación funcional con Supabase

Las pruebas locales no validan RLS ni las funciones del proyecto remoto. Antes de abrir al público, con cuentas de prueba por rol, verificar:

- registro, confirmación de correo, login, logout y recuperación;
- altas de hoteles, estados de solicitud y aprobación por superadministración;
- invitaciones y activación del acceso de hotel;
- creación y vinculación de reservaciones, folios y códigos de un solo uso;
- entrega de sellos y puntos, recompensas y movimientos contables;
- aislamiento de hoteles y participantes;
- bloqueo real de operaciones no autorizadas directamente en Supabase.

No ejecutar otra vez migraciones históricas. Revisar primero el estado actual del proyecto Supabase y aplicar solo migraciones incrementales pendientes en una base de pruebas.

## 6. Criterios de salida a producción

No declarar la plataforma terminada hasta tener pruebas reales en móvil y escritorio, política de privacidad pública, procedimiento de eliminación de cuentas, revisión de Data Safety, respaldos y verificación de seguridad/RLS. Para Google Play también se necesita llave de carga propia y el checklist de `PLAY_STORE_READINESS.md`.

## 7. Regla para evitar un prototipo mal presentado

No se entrega a usuarios finales mientras haya pantallas de demostración sin distinguir, errores sin manejo, registros duplicables, flujos sin terminar o datos inventados. Cada cambio se incorpora a la fuente canónica, pasa `npm run check`, se prueba en navegador y después se vuelve a generar el paquete web/Android.
