# Cambios YucaPass 4.3.1

- Añade solicitud pública de registro de hoteles para cuentas de viajero con correo confirmado.
- Añade revisión de solicitudes en el panel superadmin.
- Añade emisión y reemisión de invitaciones de un solo uso y vencimiento.
- Añade reclamación de la invitación por la misma cuenta solicitante.
- La reclamación crea el hotel y la membresía de propietario.
- Mantiene registro manual excepcional de hoteles solo para superadmin.
- Reutiliza la misma fuente modular para web y Capacitor Android.
- Actualiza workflow GitHub Actions para producir `YucaPass-v4.3.1-APK-debug`.

La entrega de códigos de aprobación al solicitante es manual. La migración SQL debe ser ejecutada en el proyecto Supabase antes de usar el flujo remoto.
