-- Añade el campo de zona o área que muestra el módulo de personal.
-- Ejecutar una vez en proyectos que ya tengan aplicada la versión anterior del esquema.
alter table public.perfiles add column if not exists area text;
grant select (area) on public.perfiles to authenticated;
