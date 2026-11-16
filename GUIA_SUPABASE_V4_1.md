# Supabase — YucaPass 4.1

## Requisitos previos

La base ya debe tener las tablas de YucaPass v3/v4 y estas dependencias: `public.partner_members`, `public.partner_applications`, `public.partner_offer_applications`, `public.platform_admins`, `public.hotel_reservations`, `public.reservation_invites`, `public.guest_profiles`, `public.loyalty_ledger`, `public.passport_stamps`, `public.reward_redemptions`, `public.business_partners`, `public.experiences`, `public.rewards`, y las funciones `private.is_platform_admin()`, `private.is_hotel_member(uuid)` y `private.is_partner_member(uuid)`.

Si todavía no aplicaste la migración base v4 de roles/equipos, ejecútala primero (`MIGRACION_V4_SUPERADMIN_YUCAPASS.sql`). Si ya está aplicada, no la repitas: pasa directamente al SQL v4.1.

## Una migración v4.1

1. En Supabase → Settings → API → Exposed schemas, confirma que `private` NO esté expuesto.
2. Abre SQL Editor → New query.
3. Copia el contenido completo de `MIGRACION_V4_1_ANALYTICS_SELLOS_FINANZAS.sql`.
4. Ejecuta una sola vez. No ejecutes nuevamente el esquema inicial ni los SQL históricos 0.4.x/v3/v4 si ya están instalados.
5. Ejecuta la consulta de verificación `VERIFICAR_YUCAPASS_V4_1.sql`.

## Datos y privacidad

- Los eventos de navegación solo se registran cuando el usuario acepta medición en la interfaz. La clave de navegador es aleatoria y local al dispositivo. No debe presentarse como recuento de personas identificadas.
- Las reservaciones, activaciones, enlaces de sellos, reclamos y canjes se registran como operaciones de servicio desde funciones SQL protegidas; no se guardan correos, teléfonos, nombres o direcciones en `analytics_events`.
- La contabilidad es manual. No hay integración automática con bancos, pasarelas, facturación ni POS.
- El token completo de sello se devuelve al participante solo al crear el enlace; en la base solo se guarda el hash. El huésped debe autenticarse para reclamarlo.

## Pruebas operativas

Después de migrar: crea/carga cuenta de participante, asigna membresía, genera enlace, ábrelo en otro navegador, crea o inicia sesión como huésped y comprueba que el sello aparezca en el pasaporte. Repite el mismo enlace con esa cuenta: la función debe impedir un reclamo duplicado.
