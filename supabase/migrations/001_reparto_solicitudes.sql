-- EchaMano · reparto automático de solicitudes a profesionales
-- Acceso solo desde la función serverless (service role). RLS activado y SIN políticas
-- para anon/authenticated: ninguna clave pública puede leer ni escribir estas tablas.

create table if not exists public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  especialidad text not null check (especialidad in ('Fontanería','Electricidad','Reformas','Pintura','Climatización','Otros')),
  telefono text not null,
  email text not null,
  zonas_texto text not null,
  codigos_postales text[] not null default '{}',
  verificado boolean not null default false,          -- lo activas tú tras verificar al profesional
  ilimitado boolean not null default false,           -- true = sin límite de solicitudes (plan de pago futuro)
  solicitudes_gratis int not null default 3 check (solicitudes_gratis >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists profesionales_email_uq on public.profesionales (lower(email));

create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  servicio text not null,
  cp text not null,
  email_cliente text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  profesional_id uuid not null references public.profesionales(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (solicitud_id, profesional_id)
);
create index if not exists envios_profesional_idx on public.envios (profesional_id);

alter table public.profesionales enable row level security;
alter table public.solicitudes enable row level security;
alter table public.envios enable row level security;

-- Registra un envío y descuenta una solicitud gratis de forma atómica.
create or replace function public.registrar_envio(p_solicitud uuid, p_profesional uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.envios (solicitud_id, profesional_id) values (p_solicitud, p_profesional)
  on conflict do nothing;
  if found then
    update public.profesionales
       set solicitudes_gratis = greatest(solicitudes_gratis - 1, 0)
     where id = p_profesional and not ilimitado;
  end if;
end;
$$;

revoke all on function public.registrar_envio(uuid, uuid) from public, anon, authenticated;
