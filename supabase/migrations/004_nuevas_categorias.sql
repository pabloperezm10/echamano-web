-- Nuevas especialidades de profesionales
alter table public.profesionales drop constraint if exists profesionales_especialidad_check;
alter table public.profesionales add constraint profesionales_especialidad_check
  check (especialidad in ('Fontanería','Electricidad','Reformas','Pintura','Climatización',
    'Soldadura y montaje de estructuras','Jardinería','Albañilería y tejados','Mudanzas y portes','Persianas y ventanas','Otros'));
