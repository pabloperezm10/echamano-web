/**
 * Se ejecuta automáticamente cuando Netlify recibe un formulario (evento "submission-created").
 *  - registro-profesionales -> guarda al profesional en Supabase (pendiente de verificar).
 *  - presupuestos           -> guarda la solicitud y la envía por email a los profesionales
 *                              verificados que coinciden en sector y zona. El profesional
 *                              responde directamente al cliente (Reply-To = email del cliente).
 * Nadie del equipo recibe estos emails.
 *
 * Variables de entorno (Netlify > Site settings > Environment variables):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM
 */

const MAX_PROFESIONALES_POR_SOLICITUD = 5;

// Servicio que pide el cliente -> sector del profesional
const SECTOR = {
  'Reformas': 'Reformas',
  'Electricista': 'Electricidad',
  'Fontanero': 'Fontanería',
  'Pintor': 'Pintura',
  'Climatización': 'Climatización',
  'Manitas': 'Otros',
  'Limpieza': 'Otros',
  'Carpintero': 'Otros',
  'Cerrajero': 'Otros',
  'Otro servicio': 'Otros'
};
const ESPECIALIDADES = ['Fontanería', 'Electricidad', 'Reformas', 'Pintura', 'Climatización', 'Otros'];

const env = (k) => process.env[k];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max);
const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

async function sb(path, options = {}) {
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Supabase ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function registrarProfesional(d) {
  const telefono = clean(d.telefono, 30).replace(/[\s.-]/g, '').replace(/^(\+34|0034)/, '');
  const email = clean(d.email, 200).toLowerCase();
  const nombre = clean(d.nombre, 150);
  const zonas = clean(d.zonas, 500);

  if (nombre.length < 2 || !ESPECIALIDADES.includes(d.especialidad) || !/^[67][0-9]{8}$/.test(telefono) || !isEmail(email) || zonas.length < 2) {
    console.warn('Registro de profesional descartado: datos no válidos');
    return;
  }
  const codigos = Array.from(new Set(zonas.match(/\b\d{5}\b/g) || []));
  try {
    await sb('profesionales', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ nombre, especialidad: d.especialidad, telefono, email, zonas_texto: zonas, codigos_postales: codigos })
    });
    console.log('Profesional registrado (pendiente de verificación).');
  } catch (e) {
    if (e.status === 409) { console.log('Profesional ya registrado con ese email.'); return; }
    throw e;
  }
}

function correoParaProfesional(sol, pro) {
  const filas = [
    ['Servicio', sol.servicio],
    ['Código postal', sol.cp],
    ['Email del cliente', sol.email_cliente],
    ['Detalles', sol.descripcion || 'No indicados']
  ].map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6776;vertical-align:top">${esc(k)}</td><td style="padding:6px 0"><strong>${esc(v)}</strong></td></tr>`).join('');
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#1b2430">
    <h2 style="color:#0f2742">Nueva solicitud de presupuesto</h2>
    <p>Hola ${esc(pro.nombre)}, un cliente de tu zona busca un profesional. <strong>Responde a este correo</strong> para contactar directamente con él.</p>
    <table style="border-collapse:collapse">${filas}</table>
    <p style="font-size:12px;color:#5b6776;margin-top:24px">Recibes este mensaje porque estás registrado en EchaMano. El cliente ha aceptado que sus datos se compartan con profesionales para gestionar su solicitud.</p>
  </div>`;
}

async function enviarEmail(to, replyTo, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('MAIL_FROM'), to: [to], reply_to: replyTo, subject, html })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function repartirSolicitud(d) {
  const servicio = clean(d.servicio, 60);
  const cp = clean(d.cp, 5);
  const email = clean(d.email, 200).toLowerCase();
  const descripcion = clean(d.descripcion, 1000);

  if (!SECTOR[servicio] || !/^[0-9]{5}$/.test(cp) || !isEmail(email) || d.privacidad !== 'aceptada') {
    console.warn('Solicitud descartada: datos no válidos');
    return;
  }

  const [solicitud] = await sb('solicitudes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ servicio, cp, email_cliente: email, descripcion: descripcion || null })
  });

  // Profesionales verificados del sector, con solicitudes disponibles
  const candidatos = await sb(
    `profesionales?select=id,nombre,email,codigos_postales,solicitudes_gratis,ilimitado` +
    `&verificado=eq.true&especialidad=eq.${encodeURIComponent(SECTOR[servicio])}` +
    `&or=(ilimitado.eq.true,solicitudes_gratis.gt.0)`
  );

  // Misma zona postal: coinciden los 3 primeros dígitos del código postal
  const zona = cp.slice(0, 3);
  const elegidos = candidatos
    .filter((p) => (p.codigos_postales || []).some((c) => c.slice(0, 3) === zona))
    .slice(0, MAX_PROFESIONALES_POR_SOLICITUD);

  let enviados = 0;
  for (const pro of elegidos) {
    try {
      await enviarEmail(pro.email, email, `Nueva solicitud: ${servicio} en ${cp}`, correoParaProfesional({ servicio, cp, email_cliente: email, descripcion }, pro));
      await sb('rpc/registrar_envio', { method: 'POST', body: JSON.stringify({ p_solicitud: solicitud.id, p_profesional: pro.id }) });
      enviados++;
    } catch (e) {
      console.error('Fallo enviando a un profesional:', e.message);
    }
  }
  console.log(`Solicitud ${solicitud.id}: enviada a ${enviados} profesional(es).`);
}

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body);
    const d = payload.data || {};
    if (d['bot-field']) return { statusCode: 200, body: 'ok' }; // honeypot

    if (payload.form_name === 'registro-profesionales') await registrarProfesional(d);
    else if (payload.form_name === 'presupuestos') await repartirSolicitud(d);
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error(e.message);
    return { statusCode: 500, body: 'error' };
  }
};
