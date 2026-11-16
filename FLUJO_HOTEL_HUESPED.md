# YucaPass 4.1 — Flujos principales

## Hotel → huésped
1. Personal owner/manager/reception entra al portal privado.
2. Registra el folio original del hotel.
3. Supabase crea una reservación y un código de activación de un solo uso.
4. El huésped crea/usa una cuenta YucaPass y reclama el folio.
5. El hotel marca check-in y check-out. La estancia completada acredita puntos una sola vez.

## Participante → huésped (sello por enlace)
1. Participante verificado entra en su panel.
2. Selecciona el lugar/experiencia, puntos, vigencia y, opcionalmente, límite de usos.
3. YucaPass emite un enlace con token aleatorio; el panel lo muestra para copiar/compartir.
4. El visitante abre el enlace. Si no ha iniciado sesión, el token queda pendiente en ese dispositivo.
5. Al autenticarse o crear cuenta, reclama el token.
6. Supabase valida vigencia, límite, estado del participante y duplicados; agrega el sello y los puntos a la cuenta.

## Analítica y contabilidad
- Navegación: solo se registra con consentimiento.
- Reservaciones, activaciones, sellos y canjes: se registran desde las operaciones protegidas, sin almacenar PII en las métricas.
- El dashboard ofrece vistas por día, horarios de Yucatán, dispositivos, destinos, conversión y métricas de cuentas/sellos.
- Ingresos y gastos se capturan manualmente; no se importan automáticamente de bancos o terminales.
