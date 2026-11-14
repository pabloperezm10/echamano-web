// EchaMano · Edge Function "solicitudes"
// Recibe los formularios de la web (JSON) y:
//  - registro-profesionales -> guarda al profesional (pendiente de verificar).
//  - presupuestos           -> guarda la solicitud y la envía por email a los profesionales
//                              verificados del mismo sector y zona. El profesional responde
//                              directamente al cliente (Reply-To). Nadie de EchaMano recibe estos emails.
// Secretos: RESEND_API_KEY (obligatorio para enviar), MAIL_FROM (opcional).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

const MAX_PROFESIONALES = 5;
const MAX_SOLICITUDES_POR_EMAIL_Y_DIA = 3;

const SECTOR: Record<string, string> = {
  "Reformas": "Reformas",
  "Electricista": "Electricidad",
  "Fontanero": "Fontanería",
  "Pintor": "Pintura",
  "Climatización": "Climatización",
  "Manitas": "Otros",
  "Limpieza": "Otros",
  "Carpintero": "Otros",
  "Cerrajero": "Otros",
  "Soldadura y montaje de estructuras": "Soldadura y montaje de estructuras",
  "Jardinería": "Jardinería",
  "Albañilería y tejados": "Albañilería y tejados",
  "Mudanzas y portes": "Mudanzas y portes",
  "Persianas y ventanas": "Persianas y ventanas",
  "Otro servicio": "Otros",
};
const ESPECIALIDADES = ["Fontanería", "Electricidad", "Reformas", "Pintura", "Climatización", "Soldadura y montaje de estructuras", "Jardinería", "Albañilería y tejados", "Mudanzas y portes", "Persianas y ventanas", "Otros"];

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ORIGIN_OK = /^https:\/\/((www\.)?echamano\.es|[a-z0-9-]+\.netlify\.app)$/;

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGIN_OK.test(origin) ? origin : "https://echamano.es",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

async function sb(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Supabase ${res.status}: ${text}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

async function registrarProfesional(d: Record<string, unknown>) {
  const telefono = normalizarTelefono(d.telefono);
  const email = clean(d.email, 200).toLowerCase();
  const nombre = clean(d.nombre, 150);
  const zonas = clean(d.zonas, 500);
  const especialidad = clean(d.especialidad, 40);
  if (nombre.length < 2 || !ESPECIALIDADES.includes(especialidad) || !/^[67][0-9]{8}$/.test(telefono) || !isEmail(email) || zonas.length < 2) {
    return { status: 400, error: "datos_no_validos" };
  }
  const codigos = Array.from(new Set(zonas.match(/\b\d{5}\b/g) ?? []));
  try {
    await sb("profesionales", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ nombre, especialidad, telefono, email, zonas_texto: zonas, codigos_postales: codigos }),
    });
  } catch (e) {
    if ((e as { status?: number }).status !== 409) throw e; // ya registrado: se trata como éxito
  }
  return { status: 200 };
}

// Teléfono móvil español: quita espacios/guiones y el prefijo (+34, 0034 o 34) -> 9 dígitos
const normalizarTelefono = (s: unknown) =>
  clean(s, 30).replace(/[\s.-]/g, "").replace(/^(\+34|0034|34(?=[67][0-9]{8}$))/, "");

// Enlace wa.me con el prefijo 34 y un mensaje pre-rellenado
function enlaceWhatsApp(telefono: string, nombrePro: string, servicio: string, cp: string) {
  const numero = "34" + telefono;
  const mensaje = `Hola, soy ${nombrePro} (profesional en EchaMano). He recibido tu solicitud de ${servicio} en ${cp} y me gustaría ayudarte. ¿Podemos hablar?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function correoParaProfesional(sol: Record<string, string>, nombre: string) {
  const wa = enlaceWhatsApp(sol.telefono_cliente, nombre, sol.servicio, sol.cp);
  const filas = [
    ["Servicio", sol.servicio],
    ["Código postal", sol.cp],
    ["Teléfono del cliente", sol.telefono_cliente],
    ["Email del cliente", sol.email_cliente],
    ["Detalles", sol.descripcion || "No indicados"],
  ].map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#5b6776;vertical-align:top">${esc(k)}</td><td style="padding:6px 0"><strong>${esc(v)}</strong></td></tr>`
  ).join("");
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#1b2430">
    <h2 style="color:#0f2742">Nueva solicitud de presupuesto</h2>
    <p>Hola ${esc(nombre)}, un cliente de tu zona busca un profesional. Contáctalo directamente por WhatsApp o <strong>responde a este correo</strong>.</p>
    <p style="margin:20px 0"><a href="${esc(wa)}" style="background:#25d366;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;display:inline-block">Escribir por WhatsApp</a></p>
    <table style="border-collapse:collapse">${filas}</table>
    <p style="font-size:12px;color:#5b6776;margin-top:24px">Recibes este mensaje porque estás registrado en EchaMano. El cliente ha aceptado que sus datos se compartan con profesionales para gestionar su solicitud.</p>
  </div>`;
}

async function enviarEmail(to: string, replyTo: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  const from = Deno.env.get("MAIL_FROM") ?? "EchaMano <hola@echamano.es>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function repartirSolicitud(d: Record<string, unknown>) {
  const servicio = clean(d.servicio, 60);
  const cp = clean(d.cp, 5);
  const email = clean(d.email, 200).toLowerCase();
  const descripcion = clean(d.descripcion, 1000);
  const telefono = normalizarTelefono(d.telefono);
  if (!SECTOR[servicio] || !/^[0-9]{5}$/.test(cp) || !isEmail(email) || !/^[67][0-9]{8}$/.test(telefono) || d.privacidad !== "aceptada") {
    return { status: 400, error: "datos_no_validos" };
  }

  // Límite anti-abuso: pocas solicitudes por email y día
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const previas = await sb(`solicitudes?select=id&email_cliente=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(desde)}`);
  if (previas.length >= MAX_SOLICITUDES_POR_EMAIL_Y_DIA) return { status: 429, error: "demasiadas_solicitudes" };

  const [solicitud] = await sb("solicitudes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ servicio, cp, email_cliente: email, telefono_cliente: telefono, descripcion: descripcion || null }),
  });

  const candidatos = await sb(
    `profesionales?select=id,nombre,email,codigos_postales&verificado=eq.true` +
      `&especialidad=eq.${encodeURIComponent(SECTOR[servicio])}` +
      `&order=created_at.asc`,
  );
  const zona = cp.slice(0, 3);
  const elegidos = (candidatos as Array<{ id: string; nombre: string; email: string; codigos_postales: string[] }>)
    .filter((p) => (p.codigos_postales ?? []).some((c) => c.slice(0, 3) === zona))
    .slice(0, MAX_PROFESIONALES);

  let enviados = 0;
  for (const pro of elegidos) {
    try {
      await enviarEmail(pro.email, email, `Nueva solicitud: ${servicio} en ${cp}`,
        correoParaProfesional({ servicio, cp, email_cliente: email, telefono_cliente: telefono, descripcion }, pro.nombre));
      await sb("rpc/registrar_envio", { method: "POST", body: JSON.stringify({ p_solicitud: solicitud.id, p_profesional: pro.id }) });
      enviados++;
    } catch (e) {
      console.error("Fallo enviando a un profesional:", (e as Error).message);
    }
  }
  console.log(`Solicitud ${solicitud.id}: ${enviados}/${elegidos.length} envíos`);
  return { status: 200 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { ok: false });
  try {
    const d = await req.json();
    if (d["bot-field"]) return json(req, 200, { ok: true }); // honeypot: se ignora en silencio
    let r: { status: number; error?: string };
    if (d.form === "registro-profesionales") r = await registrarProfesional(d);
    else if (d.form === "presupuestos") r = await repartirSolicitud(d);
    else r = { status: 400, error: "formulario_desconocido" };
    return json(req, r.status, { ok: r.status === 200, error: r.error });
  } catch (e) {
    console.error((e as Error).message);
    return json(req, 500, { ok: false });
  }
});
