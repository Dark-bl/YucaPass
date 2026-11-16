# Verificación de superadministración

La migración histórica de incorporación de hoteles contiene una asignación inicial de superadministrador basada en un correo escrito directamente en el SQL. Antes de entregar la plataforma, confirma en Supabase que la cuenta correcta tenga `admin_role = 'superadmin'` en `public.platform_admins`.

No ejecutes de nuevo migraciones históricas para corregir roles. Verifica la fila actual desde una sesión con permisos adecuados y, si se necesita ajustar el rol, usa el procedimiento de administración que ya exista en el proyecto. No expongas el esquema `private` ni compartas claves `service_role`.
