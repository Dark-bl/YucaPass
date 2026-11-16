# YucaPass 4.2 — Cuentas y autenticación

**Nació en Yucatán. Te lleva más allá.**

## Qué incluye
- Registro público de cuentas de viajero con correo y contraseña.
- Confirmación y reenvío de correo.
- Inicio y cierre de sesión con Supabase Auth.
- Recuperación de contraseña mediante enlace de correo.
- Cambio de contraseña desde la cuenta.
- Edición del nombre visible, idioma y preferencia de recomendaciones.
- Creación protegida del perfil `guest_profiles` mediante `ensure_guest_profile`.
- Paneles de servicio con acceso privado para personal autorizado.

## Antes de probar
La base debe ser la base YucaPass existente. La tabla `guest_profiles` debe contener `user_id`, `display_name`, `login_folio_display`, `preferred_language`, `recommendations_enabled`, `created_at` y `updated_at`, y conservar sus políticas RLS de lectura/actualización por propietario.

## Migración SQL (una sola vez)
1. Abre Supabase Dashboard → SQL Editor → New query.
2. Copia el contenido completo de `MIGRACION_V4_2_CUENTAS_AUTH.sql`.
3. Ejecuta una sola vez. No ejecutes de nuevo el esquema inicial de 13 tablas ni las migraciones históricas ya instaladas.
4. Ejecuta `VERIFICAR_V4_2_CUENTAS_AUTH.sql` (solo lectura).

La migración instala la RPC `ensure_guest_profile`, restringe los privilegios directos de `guest_profiles`, y hace que PostgreSQL actualice `updated_at` mediante trigger. No elimina datos ni recrea tablas.

## Configurar Supabase Auth
En Authentication → Providers → Email:
- Mantén habilitado Email.
- Decide si exigirás confirmación del correo. Para producción se recomienda confirmación y un proveedor SMTP propio/configurado.

En Authentication → URL Configuration:
- Configura Site URL con el dominio de producción real de YucaPass.
- Agrega ese dominio a Redirect URLs.
- Agrega la URL local que realmente uses. Ejemplo si Live Server está en el puerto 5500: `http://127.0.0.1:5500/**`; añade `http://localhost:5500/**` solo si también lo utilizas.
- No copies los ejemplos literalmente si tu host o puerto son distintos.

## Cómo probar las cuentas
1. Abre `Mi cuenta` o la ruta `#cuenta` desde YucaPass.
2. Crea una cuenta de viajero: nombre, correo, contraseña de al menos 8 caracteres y confirmación de contraseña.
3. Si la confirmación está activa, abre el correo y confirma la cuenta.
4. Vuelve al sitio y entra con correo y contraseña.
5. Revisa el perfil, guarda el nombre/idioma/preferencias.
6. Cierra sesión y vuelve a entrar.
7. Prueba “¿Olvidaste tu contraseña?” y establece una contraseña nueva desde el enlace recibido.
8. Si un hotel te entregó un folio de prueba, vincúlalo desde Mi cuenta o Mi pasaporte.

## Cuentas de personal
El formulario público solo crea viajeros. No permite convertirse en administrador, superadministrador, hotel o participante. Las cuentas de servicio deben crearse/invitarse de forma controlada en Supabase Auth y después recibir el rol o membresía correspondiente mediante las funciones administrativas.

## Android
El registro, inicio y cierre de sesión requieren Internet y utilizan Supabase Auth. La confirmación y recuperación por correo redirigen a la URL web configurada. Para abrir esos enlaces directamente dentro de la aplicación Android habrá que configurar App Links/Deep Links nativos y probarlos en dispositivo; no se considera validado por la compilación por sí sola.

## Seguridad
- Nunca coloques `service_role` ni claves `secret` en JavaScript.
- No habilites INSERT anónimo/directo en `guest_profiles`; el perfil se crea con la RPC autenticada.
- RLS debe permanecer activado.
- No compartas contraseñas ni códigos de recuperación.
