# EchaMano (echamano.es)

Sitio web estático (HTML5 + CSS + JS) con funciones serverless de Netlify. Conecta a particulares con profesionales y empresas de servicios del hogar.

## Estructura
- `index.html` — portada (formulario Netlify `presupuestos`); `registro-profesionales.html` — alta de profesionales (formulario `registro-profesionales`)
- `gracias.html`, `gracias-profesionales.html` — confirmaciones (noindex)
- `aviso-legal.html`, `politica-de-privacidad.html`, `cookies.html` — legales (únicas páginas donde aparece el correo del titular)
- `css/styles.css`, `js/main.js`, `sitemap.xml`, `robots.txt`, `favicon.svg`
- `netlify/functions/submission-created.js` — reparto automático de solicitudes
- `supabase/migrations/001_reparto_solicitudes.sql` — tablas `profesionales`, `solicitudes`, `envios`

## Cómo funciona el reparto
1. El profesional se registra en `/registro-profesionales.html` → la función lo guarda en Supabase con `verificado = false`.
2. Tras comprobar sus datos, pones `verificado = true` en el panel de Supabase (tabla `profesionales`).
3. Cuando un particular envía el formulario `presupuestos`, la función guarda la solicitud y la manda por email (máx. 5) a profesionales verificados del mismo sector y misma zona postal (3 primeros dígitos del CP), con `Reply-To` = email del cliente. **El profesional responde directamente al cliente; nadie de EchaMano recibe esos emails.**
4. Cada envío descuenta 1 de `solicitudes_gratis` (3 de bienvenida). Con `ilimitado = true` no hay límite. Sin solicitudes y sin plan, el profesional deja de recibir envíos.

## Puesta en marcha
1. Crear un proyecto Supabase y ejecutar `supabase/migrations/001_reparto_solicitudes.sql`.
2. Crear cuenta en Resend y verificar el dominio `echamano.es` (hasta entonces solo puede enviar a tu propia cuenta).
3. En Netlify → Site settings → Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM` (p. ej. `EchaMano <solicitudes@echamano.es>`).
4. En Netlify → Forms **no** actives notificaciones por email para `presupuestos` ni `registro-profesionales`.
5. Desplegar. Las claves nunca van en el repositorio.

## Pendiente
- Revisar las páginas legales con un profesional jurídico y completar el domicilio fiscal.
- Redactar los «términos para profesionales» (la casilla de registro los menciona).
- Añadir `img/og-image.png` (1200×630).
- Definir y construir el cobro por contacto (hoy solo existe el límite de 3 solicitudes gratis).

## Desarrollo local
Las rutas son absolutas (`/css/...`): sírvelo desde la raíz con `npx serve .`
