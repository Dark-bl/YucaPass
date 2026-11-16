# YucaPass 4.1 — Cambios y límites

## Teléfono y navegación
- Menú lateral interactivo con fondo de cierre.
- Barra inferior adaptada al perfil de acceso.
- Botón volver y soporte para historial del navegador/Android.
- Controles con áreas táctiles y espacios de pantalla segura.
- Paleta azul petróleo y dorado aplicada a la interfaz.

## Sellos compartibles
- El participante autenticado genera un enlace seguro con puntos, vigencia y límite de usos opcional.
- El enlace contiene un token aleatorio que se muestra una sola vez; la base conserva su hash.
- El visitante inicia sesión o crea cuenta para reclamarlo.
- Se impide reclamar dos veces la misma experiencia del mismo participante.
- Las operaciones de creación y reclamo se registran desde funciones protegidas.

## Métricas
- Vistas, experiencias, navegadores únicos con consentimiento, cuentas de huéspedes, reservaciones, activaciones, enlaces de sello, sellos, canjes y tasas de aprobación.
- Gráficas diarias, horarias (America/Merida), dispositivos y destinos.
- Los navegadores únicos son una aproximación basada en cookies/localStorage con consentimiento; no equivalen a personas identificadas.
- Los movimientos contables se capturan manualmente y no representan datos bancarios, facturación fiscal ni ventas de TPV automáticas.

## Seguridad
- RLS activa; operaciones sensibles mediante RPC con comprobación de rol.
- La RPC pública de analítica solo admite eventos de navegación. Los eventos de reservación, activación, sello y canje se escriben desde funciones internas para evitar falsificación desde el cliente.
- No se guardan datos de contacto en las métricas.

## Aún requiere configuración real
- Ejecutar migración v4.1 en Supabase.
- Crear/asignar cuentas Auth y membresías a hoteles/participantes.
- Probar sellos y dashboards con cuentas distintas en dos dispositivos.
- Compilar y probar el APK en un teléfono Android.
