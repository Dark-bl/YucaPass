-- =============================================================
-- YUCAPASS 4.3 - REGISTRO AUTONOMO Y APROBACION DE HOTELES
-- MIGRACION INCREMENTAL SOBRE YUCAPASS 4.2.1
-- No recrea ni elimina tablas existentes ni registros.
-- Flujo: propietario con cuenta confirmada -> solicitud ->
-- superadmin aprueba y recibe codigo de un solo uso -> propietario
-- reclama codigo -> se crea hotel y membresia owner.
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS admin_role text NOT NULL DEFAULT 'admin';

DO $role_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'platform_admins_admin_role_check'
      AND conrelid = 'public.platform_admins'::regclass
  ) THEN
    ALTER TABLE public.platform_admins
      ADD CONSTRAINT platform_admins_admin_role_check
      CHECK (admin_role IN ('admin','superadmin'));
  END IF;
END;
$role_constraint$;

-- Si la cuenta principal ya existe en Supabase Auth, la reconoce como
-- superadministrador inicial (el correo fue indicado por el propietario).
-- Si todavía no existe, no bloquea la migración; se puede ejecutar el
-- bloque de alta indicado en GUIA_SUPABASE_V4_3_REGISTRO_HOTELES.md.
INSERT INTO public.platform_admins(user_id, admin_role)
SELECT u.id, 'superadmin'
FROM auth.users u
WHERE pg_catalog.lower(u.email) = pg_catalog.lower('leonardocima9@gmail.com')
ON CONFLICT (user_id)
DO UPDATE SET admin_role = 'superadmin';

-- La ficha pública del hotel puede incluir descripción y web oficial.
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- 1. Solicitudes privadas de incorporación de hoteles.
CREATE TABLE IF NOT EXISTS public.hotel_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_name text NOT NULL CHECK (char_length(trim(hotel_name)) BETWEEN 2 AND 120),
  municipality text NOT NULL CHECK (char_length(trim(municipality)) BETWEEN 2 AND 90),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 20 AND 1200),
  website_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','activated')),
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  hotel_id uuid UNIQUE REFERENCES public.hotels(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yucapass_hotel_applications_status
  ON public.hotel_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_yucapass_hotel_applications_user
  ON public.hotel_applications(applicant_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_yucapass_hotel_application_open_user
  ON public.hotel_applications(applicant_user_id)
  WHERE status IN ('pending','approved');

ALTER TABLE public.hotel_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hotel_applications FROM PUBLIC, anon, authenticated, service_role;

-- 2. Invitaciones de activación. El código plano nunca se almacena.
CREATE TABLE IF NOT EXISTS public.hotel_onboarding_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE
    REFERENCES public.hotel_applications(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  issued_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_yucapass_hotel_invites_expiry
  ON public.hotel_onboarding_invites(expires_at);
ALTER TABLE public.hotel_onboarding_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hotel_onboarding_invites FROM PUBLIC, anon, authenticated, service_role;

-- 3. Helper privado de superadministración (idempotente).
CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
      AND pa.admin_role = 'superadmin'
  );
$$;
REVOKE ALL ON FUNCTION private.is_superadmin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated;

-- 4. El propietario autenticado solicita incorporar su hotel.
CREATE OR REPLACE FUNCTION public.submit_hotel_application(
  p_hotel_name text,
  p_municipality text,
  p_description text,
  p_website_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_email_confirmed timestamptz;
  v_id uuid;
  v_url text := NULLIF(trim(coalesce(p_website_url,'')), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'; END IF;

  SELECT u.email_confirmed_at INTO v_email_confirmed
  FROM auth.users u WHERE u.id = v_uid;
  IF v_email_confirmed IS NULL THEN
    RAISE EXCEPTION 'EMAIL_CONFIRMATION_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hotel_members hm WHERE hm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_ALREADY_HAS_HOTEL_ACCESS';
  END IF;

  IF NULLIF(trim(coalesce(p_hotel_name,'')),'') IS NULL
     OR char_length(trim(p_hotel_name)) < 2
     OR NULLIF(trim(coalesce(p_municipality,'')),'') IS NULL
     OR char_length(trim(coalesce(p_description,''))) < 20 THEN
    RAISE EXCEPTION 'INVALID_HOTEL_APPLICATION_DATA';
  END IF;

  IF v_url IS NOT NULL AND v_url !~* '^https?://' THEN
    RAISE EXCEPTION 'WEBSITE_URL_MUST_USE_HTTP_OR_HTTPS';
  END IF;

  INSERT INTO public.hotel_applications(
    applicant_user_id, hotel_name, municipality, description, website_url
  ) VALUES (
    v_uid,
    trim(p_hotel_name),
    trim(p_municipality),
    trim(p_description),
    v_url
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'HOTEL_APPLICATION_ALREADY_PENDING_OR_APPROVED';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_hotel_application(text,text,text,text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_hotel_application(text,text,text,text)
  TO authenticated;

-- 5. El solicitante consulta exclusivamente sus propias solicitudes.
CREATE OR REPLACE FUNCTION public.my_hotel_applications()
RETURNS TABLE(
  application_id uuid,
  hotel_name text,
  municipality text,
  status text,
  review_notes text,
  created_at timestamptz,
  reviewed_at timestamptz,
  hotel_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'; END IF;
  RETURN QUERY
  SELECT a.id, a.hotel_name, a.municipality, a.status,
         a.review_notes, a.created_at, a.reviewed_at, a.hotel_id
  FROM public.hotel_applications a
  WHERE a.applicant_user_id = (SELECT auth.uid())
  ORDER BY a.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.my_hotel_applications()
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.my_hotel_applications() TO authenticated;

-- 6. Solo superadmin ve todas las solicitudes y correos de solicitantes.
CREATE OR REPLACE FUNCTION public.superadmin_list_hotel_applications()
RETURNS TABLE(
  application_id uuid,
  hotel_name text,
  municipality text,
  description text,
  website_url text,
  applicant_email text,
  applicant_name text,
  status text,
  review_notes text,
  created_at timestamptz,
  reviewed_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_superadmin() THEN RAISE EXCEPTION 'SUPERADMIN_ONLY'; END IF;
  RETURN QUERY
  SELECT a.id, a.hotel_name, a.municipality, a.description, a.website_url,
         u.email::text,
         COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''), u.email)::text,
         a.status, a.review_notes, a.created_at, a.reviewed_at
  FROM public.hotel_applications a
  JOIN auth.users u ON u.id = a.applicant_user_id
  ORDER BY CASE WHEN a.status='pending' THEN 0 ELSE 1 END, a.created_at DESC
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.superadmin_list_hotel_applications()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_list_hotel_applications() TO authenticated;

-- 7. Superadmin aprueba/rechaza. Al aprobar devuelve un código una sola vez.
CREATE OR REPLACE FUNCTION public.superadmin_review_hotel_application(
  p_application_id uuid,
  p_decision text,
  p_review_notes text DEFAULT NULL,
  p_expiry_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_app public.hotel_applications;
  v_code text;
  v_expiry timestamptz;
BEGIN
  IF NOT private.is_superadmin() THEN RAISE EXCEPTION 'SUPERADMIN_ONLY'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_DECISION';
  END IF;
  IF p_expiry_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'INVITE_EXPIRY_MUST_BE_1_TO_30_DAYS';
  END IF;

  SELECT * INTO v_app
  FROM public.hotel_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_APPLICATION_NOT_FOUND'; END IF;
  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'HOTEL_APPLICATION_ALREADY_REVIEWED';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.hotel_applications
    SET status='rejected', review_notes=NULLIF(trim(coalesce(p_review_notes,'')),''),
        reviewed_by=(SELECT auth.uid()), reviewed_at=pg_catalog.now(),
        updated_at=pg_catalog.now()
    WHERE id=p_application_id;
    RETURN pg_catalog.jsonb_build_object(
      'application_id',p_application_id,'status','rejected'
    );
  END IF;

  v_code := 'YH-' || pg_catalog.upper(
    pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,12)
  ) || pg_catalog.upper(
    pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,8)
  );
  v_expiry := pg_catalog.now() + pg_catalog.make_interval(days => p_expiry_days);

  INSERT INTO public.hotel_onboarding_invites(
    application_id, code_hash, expires_at, issued_by
  ) VALUES (
    p_application_id, pg_catalog.md5(v_code), v_expiry, (SELECT auth.uid())
  );

  UPDATE public.hotel_applications
  SET status='approved', review_notes=NULLIF(trim(coalesce(p_review_notes,'')),''),
      reviewed_by=(SELECT auth.uid()), reviewed_at=pg_catalog.now(),
      updated_at=pg_catalog.now()
  WHERE id=p_application_id;

  RETURN pg_catalog.jsonb_build_object(
    'application_id',p_application_id,
    'status','approved',
    'invite_code',v_code,
    'expires_at',v_expiry,
    'instructions','Comparte este código con el correo solicitante. Solo esa cuenta puede reclamarlo.'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.superadmin_review_hotel_application(uuid,text,text,integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_review_hotel_application(uuid,text,text,integer)
  TO authenticated;

-- 7B. Reemitir un código si se perdió o venció; invalida el anterior.
CREATE OR REPLACE FUNCTION public.superadmin_reissue_hotel_invite(
  p_application_id uuid,
  p_expiry_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_app public.hotel_applications;
  v_inv public.hotel_onboarding_invites;
  v_code text;
  v_expiry timestamptz;
BEGIN
  IF NOT private.is_superadmin() THEN RAISE EXCEPTION 'SUPERADMIN_ONLY'; END IF;
  IF p_expiry_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'INVITE_EXPIRY_MUST_BE_1_TO_30_DAYS';
  END IF;
  SELECT * INTO v_app FROM public.hotel_applications
  WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_APPLICATION_NOT_FOUND'; END IF;
  IF v_app.status <> 'approved' THEN
    RAISE EXCEPTION 'HOTEL_APPLICATION_NOT_WAITING_FOR_ACTIVATION';
  END IF;
  SELECT * INTO v_inv FROM public.hotel_onboarding_invites
  WHERE application_id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_INVITE_NOT_FOUND'; END IF;
  IF v_inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'HOTEL_INVITE_ALREADY_USED'; END IF;

  v_code := 'YH-' || pg_catalog.upper(
    pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,12)
  ) || pg_catalog.upper(
    pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,8)
  );
  v_expiry := pg_catalog.now() + pg_catalog.make_interval(days => p_expiry_days);
  UPDATE public.hotel_onboarding_invites
  SET code_hash=pg_catalog.md5(v_code), expires_at=v_expiry,
      issued_by=(SELECT auth.uid()), created_at=pg_catalog.now()
  WHERE id=v_inv.id;

  RETURN pg_catalog.jsonb_build_object(
    'application_id',p_application_id,
    'status','approved',
    'invite_code',v_code,
    'expires_at',v_expiry,
    'instructions','El código anterior quedó invalidado. Comparte solo este nuevo código con el propietario.'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.superadmin_reissue_hotel_invite(uuid,integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.superadmin_reissue_hotel_invite(uuid,integer)
  TO authenticated;

-- 8. El propietario reclama el código y el sistema crea su hotel/membresía.
CREATE OR REPLACE FUNCTION public.claim_hotel_onboarding_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_inv public.hotel_onboarding_invites;
  v_app public.hotel_applications;
  v_hotel_id uuid;
  v_slug text;
  v_code text := pg_catalog.upper(trim(coalesce(p_code,'')));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'; END IF;
  IF v_code !~ '^YH-[A-F0-9]{20}$' THEN RAISE EXCEPTION 'INVALID_HOTEL_INVITE_CODE'; END IF;

  SELECT * INTO v_inv
  FROM public.hotel_onboarding_invites
  WHERE code_hash = pg_catalog.md5(v_code)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_INVITE_NOT_FOUND'; END IF;
  IF v_inv.used_at IS NOT NULL THEN RAISE EXCEPTION 'HOTEL_INVITE_ALREADY_USED'; END IF;
  IF v_inv.expires_at <= pg_catalog.now() THEN RAISE EXCEPTION 'HOTEL_INVITE_EXPIRED'; END IF;

  SELECT * INTO v_app
  FROM public.hotel_applications
  WHERE id = v_inv.application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_APPLICATION_NOT_FOUND'; END IF;
  IF v_app.applicant_user_id <> v_uid THEN
    RAISE EXCEPTION 'HOTEL_INVITE_ACCOUNT_MISMATCH';
  END IF;
  IF v_app.status <> 'approved' THEN RAISE EXCEPTION 'HOTEL_APPLICATION_NOT_APPROVED'; END IF;
  IF EXISTS (SELECT 1 FROM public.hotel_members hm WHERE hm.user_id=v_uid) THEN
    RAISE EXCEPTION 'ACCOUNT_ALREADY_HAS_HOTEL_ACCESS';
  END IF;

  v_slug := pg_catalog.trim(both '-' from pg_catalog.regexp_replace(
    pg_catalog.lower(v_app.hotel_name), '[^a-z0-9]+', '-', 'g'
  )) || '-' || pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO public.hotels(
    name, slug, municipality, is_active, description, website_url
  ) VALUES (
    v_app.hotel_name, v_slug, v_app.municipality, true,
    v_app.description, v_app.website_url
  ) RETURNING id INTO v_hotel_id;

  INSERT INTO public.hotel_members(hotel_id,user_id,role)
  VALUES (v_hotel_id,v_uid,'owner');

  UPDATE public.hotel_onboarding_invites
  SET used_at=pg_catalog.now()
  WHERE id=v_inv.id;

  UPDATE public.hotel_applications
  SET status='activated', hotel_id=v_hotel_id, updated_at=pg_catalog.now()
  WHERE id=v_app.id;

  RETURN pg_catalog.jsonb_build_object(
    'hotel_id',v_hotel_id,
    'hotel_name',v_app.hotel_name,
    'status','activated',
    'role','owner'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_hotel_onboarding_invite(text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.claim_hotel_onboarding_invite(text) TO authenticated;

-- 9. Las altas manuales existentes quedan reservadas al superadministrador.
CREATE OR REPLACE FUNCTION public.admin_create_hotel(
  p_name text,
  p_slug text,
  p_municipality text,
  p_owner_email text
)
RETURNS TABLE(hotel_id uuid, owner_assigned boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hotel uuid;
  v_owner uuid;
  v_slug text;
BEGIN
  IF NOT private.is_superadmin() THEN RAISE EXCEPTION 'SUPERADMIN_ONLY'; END IF;
  v_slug := COALESCE(NULLIF(trim(p_slug),''),
    pg_catalog.trim(both '-' from pg_catalog.regexp_replace(pg_catalog.lower(trim(p_name)),'[^a-z0-9]+','-','g'))
    || '-' || pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.hotels(name,slug,municipality,is_active)
  VALUES (trim(p_name),v_slug,trim(p_municipality),true)
  RETURNING id INTO v_hotel;
  SELECT u.id INTO v_owner FROM auth.users u
  WHERE pg_catalog.lower(u.email)=pg_catalog.lower(trim(p_owner_email)) LIMIT 1;
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.hotel_members(hotel_id,user_id,role)
    VALUES (v_hotel,v_owner,'owner')
    ON CONFLICT (hotel_id,user_id) DO UPDATE SET role='owner';
  END IF;
  RETURN QUERY SELECT v_hotel,(v_owner IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_hotel(text,text,text,text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_hotel(text,text,text,text)
  TO authenticated;

-- No se concede acceso directo a las tablas privadas. Solo RPC con identidad validada.
REVOKE ALL ON TABLE public.hotel_applications FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.hotel_onboarding_invites FROM PUBLIC, anon, authenticated, service_role;

COMMIT;

-- FIN: ejecutar luego 02_VERIFICAR_V4_3_REGISTRO_HOTELES.sql
-- El superadmin entrega el código manualmente por un canal externo.
-- El código de aprobación no se puede volver a consultar: se muestra solo al aprobar.
