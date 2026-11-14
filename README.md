# EchaMano (echamano.es)

Sitio web estático (HTML5 + CSS + JS) con backend en Supabase. Conecta a particulares con profesionales y empresas de servicios del hogar.

## Estructura
- `index.html` — portada y formulario de solicitud (`presupuestos`); `registro-profesionales.html` — alta de profesionales
- `gracias.html`, `gracias-profesionales.html` — confirmaciones (noindex)
- `aviso-legal.html`, `politica-de-privacidad.html`, `cookies.html` — legales (únicas páginas donde aparece el correo del titular)
- `img/og-image.png` (vista previa 1200×630), `css/styles.css`, `js/main.js`, `sitemap.xml`, `robots.txt`, `favicon.svg`, `netlify.toml`
- `supabase/functions/solicitudes/index.ts` — Edge Function de reparto (desplegada)
- `supabase/migrations/` — tablas `profesionales`, `solicitudes`, `envios` (aplicadas)

## Cómo funciona el reparto
1. El profesional se registra en `/registro-profesionales.html` → queda en Supabase con `verificado = false`.
2. Tras comprobar sus datos, pones `verificado = true` en el panel de Supabase (tabla `profesionales`).
3. Cuando un particular envía el formulario (email, **teléfono móvil obligatorio**, servicio, CP), la función lo guarda y manda un email (máx. 5) a profesionales verificados del mismo sector y zona (3 primeros dígitos del CP). El email incluye un **botón de WhatsApp** (`wa.me/34…` con mensaje pre-rellenado), y `Reply-To` apunta al email del cliente. **El profesional contacta directamente; nadie de EchaMano recibe esos emails.**
4. Lanzamiento 100 % gratuito para profesionales: sin límite de solicitudes ni cobros. Las columnas `solicitudes_gratis` / `ilimitado` se conservan por si más adelante se introduce un plan de pago, pero el reparto ya no las consulta.
5. Anti-abuso: honeypot, validación en servidor y máx. 3 solicitudes por email y día.

## Estado de la puesta en marcha
- Supabase: proyecto `qnqmjsvrclxjfvjigesp` (eu-west-3), tablas con RLS y función desplegada. ✅
- Email: falta el secreto `RESEND_API_KEY` en Supabase (Edge Functions → Secrets) y, para enviar a cualquier destinatario, verificar el dominio `echamano.es` en Resend y fijar `MAIL_FROM` (p. ej. `EchaMano <solicitudes@echamano.es>`). Hasta entonces las solicitudes se guardan pero no se envían emails.
- Hosting: desplegar el sitio en Netlify y apuntar el DNS de `echamano.es` (hoy en STRATO).
- La web envía los formularios por JS a la función de Supabase; sin JS cae al envío estándar de Netlify Forms (`data-netlify`).

## Pendiente
- Revisar las páginas legales con un profesional jurídico y completar el domicilio fiscal.
- Cuando termine el lanzamiento gratuito: decidir el modelo de pago y actualizar la web, los términos y la política de privacidad.

## Desarrollo local
Las rutas son absolutas (`/css/...`): sírvelo desde la raíz con `npx serve .`
