-- Zonas por provincia: código INE de 2 dígitos (01-52) = 2 primeros dígitos del CP
alter table public.profesionales add column if not exists provincia text
  check (provincia is null or provincia ~ '^(0[1-9]|[1-4][0-9]|5[0-2])$');
-- Profesionales ya registrados: se deduce de su primer código postal
update public.profesionales set provincia = left(codigos_postales[1], 2)
  where provincia is null and codigos_postales[1] ~ '^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$';
create index if not exists profesionales_provincia_idx on public.profesionales (provincia, especialidad) where verificado;
