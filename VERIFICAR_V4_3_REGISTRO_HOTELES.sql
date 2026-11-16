-- Consulta de solo lectura para comprobar YucaPass 4.3.
SELECT
  to_regclass('public.hotel_applications') IS NOT NULL AS tabla_solicitudes,
  to_regclass('public.hotel_onboarding_invites') IS NOT NULL AS tabla_invitaciones,
  to_regprocedure('public.submit_hotel_application(text,text,text,text)') IS NOT NULL AS rpc_solicitar_hotel,
  to_regprocedure('public.my_hotel_applications()') IS NOT NULL AS rpc_mis_solicitudes,
  to_regprocedure('public.superadmin_list_hotel_applications()') IS NOT NULL AS rpc_listar_solicitudes_superadmin,
  to_regprocedure('public.superadmin_review_hotel_application(uuid,text,text,integer)') IS NOT NULL AS rpc_revisar_solicitud,
  to_regprocedure('public.superadmin_reissue_hotel_invite(uuid,integer)') IS NOT NULL AS rpc_reemitir_codigo,
  to_regprocedure('public.claim_hotel_onboarding_invite(text)') IS NOT NULL AS rpc_reclamar_codigo,
  to_regprocedure('private.is_superadmin()') IS NOT NULL AS helper_superadmin;

SELECT
  c.relname AS tabla,
  c.relrowsecurity AS rls_activo,
  c.relforcerowsecurity AS rls_forzado
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('hotel_applications','hotel_onboarding_invites')
ORDER BY c.relname;

SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema='public'
  AND routine_name IN (
    'submit_hotel_application',
    'my_hotel_applications',
    'superadmin_list_hotel_applications',
    'superadmin_review_hotel_application',
    'claim_hotel_onboarding_invite',
    'admin_create_hotel'
  )
ORDER BY routine_name, grantee;


-- Comprueba que la cuenta principal tenga el nivel esperado.
SELECT
  u.email,
  pa.admin_role,
  (pa.admin_role = 'superadmin') AS superadmin_activo
FROM auth.users u
LEFT JOIN public.platform_admins pa ON pa.user_id = u.id
WHERE pg_catalog.lower(u.email) = pg_catalog.lower('leonardocima9@gmail.com');
