-- Teléfono del cliente (obligatorio en el formulario) para el enlace de WhatsApp del email al profesional
alter table public.solicitudes add column if not exists telefono_cliente text;
