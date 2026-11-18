-- 006 · Defensa en profundidad: ningún permiso directo de tabla para anon/authenticated.
-- Todo el acceso a datos pasa por la edge function "solicitudes" (service_role).
revoke all on public.profesionales, public.solicitudes, public.envios from anon, authenticated;
