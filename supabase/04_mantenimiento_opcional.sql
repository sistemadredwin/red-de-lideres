-- Limpieza diaria automática (límites de uso, intentos de login, actividad > 90 días).
-- Antes: Supabase → Database → Extensions → activar "pg_cron".
select cron.schedule('mantenimiento-diario', '0 8 * * *', $$select public.mantenimiento()$$);
