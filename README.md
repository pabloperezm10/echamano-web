# EchaMano (echamano.es)

Sitio web estático (HTML5 + CSS + JS) de la plataforma que conecta particulares con profesionales y empresas de servicios del hogar.

## Estructura
- `index.html` — portada
- `aviso-legal.html`, `politica-de-privacidad.html`, `cookies.html` — páginas legales
- `css/styles.css`, `js/main.js`
- `sitemap.xml`, `robots.txt`, `favicon.svg`

## Pendiente antes de publicar
- Revisar las páginas legales con un profesional jurídico.
- Añadir `img/og-image.png` (1200×630) para las vistas previas en redes.
- Conectar el formulario del buscador (`js/main.js`) a un backend o servicio de formularios.
- Todos los contactos y formularios (contacto, privacidad, alta de profesionales) se centralizan en `iaproyectosppm@gmail.com`; no hace falta crear buzones en echamano.es.

## Desarrollo local
Las rutas son absolutas (`/css/...`), así que sírvelo desde la raíz:

```
npx serve .
```
