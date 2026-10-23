-- =====================================================================
--  RED DE LÍDERES · Primer administrador (después de 01 y 02)
--
--  1) Elige tu código de acceso (4 a 20 letras mayúsculas, números o guion,
--     que NO sea tu cédula). Ejemplo: ADM-K7Q2X9
--  2) En Supabase: Authentication → Users → Add user → Create new user
--       Email:    el código en minúsculas + @campana.local   (adm-k7q2x9@campana.local)
--       Password: una contraseña larga y única (mínimo 16 caracteres)
--       Marca "Auto Confirm User".
--  3) Reemplaza los textos entre < > y ejecuta esto:
-- =====================================================================
insert into public.perfiles (auth_id, usuario, cedula, nombre_completo, rol, debe_cambiar_clave, clave_vence_at)
select u.id, '<ADM-K7Q2X9>', '<tu cédula, solo números>', '<Tu nombre completo>', 'admin', false, null
  from auth.users u
 where lower(u.email) = lower('<ADM-K7Q2X9>') || '@campana.local';

-- COMPROBACIÓN: debe devolver 1 fila con rol admin
select usuario, nombre_completo, rol, activo from public.perfiles where rol = 'admin';

-- La clave del administrador no vence; se protege con verificación en dos pasos (TOTP),
-- que se activa desde la aplicación en la fase del login.