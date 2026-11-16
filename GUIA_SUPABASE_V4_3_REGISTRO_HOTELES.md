# Guía Supabase — YucaPass 4.3: registro y aprobación de hoteles

## Antes de ejecutar

Esta migración es para la base YucaPass que ya tiene:
- Las 13 tablas originales.
- `platform_admins` con el rol superadmin ya configurado.
- `hotels` y `hotel_members`.
- Supabase Auth y el perfil de viajero v4.2.

No ejecutes el esquema inicial de nuevo. No borres tablas ni registros.

## Aplicación de migración

1. Abre el proyecto `razuzgaulxkknnwqadau` en Supabase.
2. En **Project Settings → API → Exposed schemas**, confirma que `private` no esté expuesto. No lo agregues.
3. Abre **SQL Editor → New query**.
4. Copia y ejecuta el contenido de `supabase/MIGRACION_V4_3_REGISTRO_HOTELES.sql` una sola vez.
5. Ejecuta `supabase/VERIFICAR_V4_3_REGISTRO_HOTELES.sql` y revisa que las tablas y RPC indiquen `true`.

Si el SQL arroja un error, detente y comparte el error completo. No repitas el script a ciegas: la transacción debería revertirse si falla, pero primero hay que verificar el estado.

## Preparar superadministrador

La migración requiere `platform_admins.admin_role = 'superadmin'` para que el panel pueda aprobar solicitudes. Comprueba:

```sql
SELECT u.email, pa.admin_role
FROM public.platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE lower(u.email) = lower('leonardocima9@gmail.com');
```

Debe mostrar `superadmin`. Si no aparece, no intentes aprobar desde la interfaz; primero termina el alta de superadministrador con el SQL de esa versión.

## Flujo para el propietario

1. En Authentication, el propietario crea una cuenta YucaPass y confirma su correo.
2. En la web o APK, inicia sesión y abre **Mi cuenta → Registrar mi hotel**.
3. Envía nombre, municipio, descripción (mín. 20 caracteres) y URL oficial opcional.
4. La solicitud queda como `pending`; el propietario puede consultar su propio estado.

## Flujo del superadministrador

1. Abre **Administración** en el panel.
2. Revisa la tabla **Solicitudes de nuevos establecimientos**.
3. Pulsa **Aprobar y generar código** o **Rechazar**.
4. Al aprobar, el código se muestra una sola vez en el panel. Cópialo inmediatamente y envíalo al correo del solicitante desde tu canal de contacto. Esta entrega no implementa un proveedor de correo transaccional.
5. Si se pierde o vence, pulsa **Reemitir código**. El código anterior deja de ser válido.

## Activación del propietario

1. El propietario vuelve a iniciar sesión con la misma cuenta que envió la solicitud.
2. Abre **Registrar mi hotel**, pega el código y pulsa **Activar mi hotel**.
3. El RPC valida la cuenta solicitante, el hash, vencimiento y uso único.
4. Se crea el hotel y una membresía `owner`. La cuenta obtiene acceso al panel del hotel.

## Prueba de aislamiento recomendada

- Cuenta A solicita Hotel A; cuenta B no debe poder reclamar el código de A.
- El superadmin aprueba A y recibe el código una sola vez.
- A reclama el código; un segundo intento debe fallar.
- Un visitante sin sesión no puede enviar solicitud ni consultar aplicaciones privadas.
- Una cuenta de hotel no puede listar solicitudes de otros hoteles; la lista global solo es superadmin.

## Notas

- La aprobación no publica un hotel si no se ha reclamado la invitación; el hotel se crea al reclamar.
- El código no se almacena en claro, solo su hash.
- No agregues `private` a los esquemas expuestos.
- No pongas `service_role` ni claves secretas en JavaScript, HTML, GitHub Pages o el APK.

### Si el superadministrador aún no aparece

La migración intenta asignar automáticamente `leonardocima9@gmail.com` si esa cuenta ya existe en `auth.users`. Si la cuenta se crea después de ejecutar la migración, ejecuta una sola vez:

```sql
INSERT INTO public.platform_admins(user_id, admin_role)
SELECT id, 'superadmin'
FROM auth.users
WHERE lower(email) = lower('leonardocima9@gmail.com')
ON CONFLICT (user_id)
DO UPDATE SET admin_role = 'superadmin';
```

Comprueba el resultado con la consulta de superadmin que aparece en `supabase/VERIFICAR_V4_3_REGISTRO_HOTELES.sql`.
