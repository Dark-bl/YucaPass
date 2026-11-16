# YucaPass 4.3.1 — mejoras de experiencia web

- Se habilita la ruta de incorporación de hoteles para la cuenta superadministradora.
- La cuenta superadministradora dispone de alta directa de hotel desde `Registrar un hotel`, reutilizando el RPC administrativo existente.
- Las cuentas autenticadas sin membresía de hotel pueden enviar su solicitud pública desde la web.
- Se simplifican los textos de incorporación, seguimiento, cuenta y experiencia continua.
- Se retiran referencias visibles a prototipo y términos técnicos innecesarios en la experiencia del viajero.
- El formulario evita envíos duplicados y muestra mensajes comprensibles para los errores conocidos de Supabase.
- El test de Android localiza cualquier workflow YAML válido, sin exigir el nombre `build-apk.yml`.
- No se modifica el esquema de Supabase ni se ejecutan migraciones.

## Pruebas

Ejecutar `npm run check` y `npm run build:web`.
