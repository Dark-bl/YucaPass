# YucaPass 4.2 — cuentas y autenticación

La cuenta de viajero se crea con correo y contraseña y se mantiene en Supabase Auth. El usuario puede confirmar/re-enviar su correo, iniciar/cerrar sesión, pedir recuperación, cambiar contraseña y editar su perfil.

Las cuentas de servicio no se crean desde el formulario público: administrador/superadministrador, hoteles y participantes se asignan de forma controlada.

La interfaz se abre desde `Mi cuenta` o la ruta `#cuenta`. La restauración de sesión ocurre con Supabase Auth. La cuenta y su perfil no son la misma cosa: Supabase Auth autentica; `guest_profiles` guarda datos de viajero y se inicializa mediante la RPC `ensure_guest_profile`.
