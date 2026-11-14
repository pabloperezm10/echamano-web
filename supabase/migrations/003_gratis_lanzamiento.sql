-- Lanzamiento 100 % gratuito para profesionales: sin límite de solicitudes.
-- Las columnas solicitudes_gratis / ilimitado se conservan por si más adelante se introduce un plan de pago.

alter table public.profesionales alter column ilimitado set default true;
update public.profesionales set ilimitado = true where ilimitado = false;

-- Registrar un envío ya no descuenta saldo.
create or replace function public.registrar_envio(p_solicitud uuid, p_profesional uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.envios (solicitud_id, profesional_id) values (p_solicitud, p_profesional)
  on conflict do nothing;
end;
$$;

revoke all on function public.registrar_envio(uuid, uuid) from public, anon, authenticated;
