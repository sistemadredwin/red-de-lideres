-- =====================================================================
--  RED DE LÍDERES · Esquema v2 para Supabase (PostgreSQL)
--  Ejecutar UNA sola vez en un proyecto nuevo:
--  Supabase → SQL Editor → pegar todo → Run
--
--  Novedades frente a la v1:
--   · Código de acceso propio (columna "usuario"), distinto de la cédula.
--   · QR fijo: se crea con el líder y NO se puede cambiar (lo impide un trigger).
--     El administrador solo puede pausarlo o reactivarlo.
--   · Contraseña con vencimiento: si vence, la cuenta no puede leer ni escribir
--     nada en la base, aunque llame a la API directamente.
--   · G8 es un grupo (columna "grupo"), no un rol.
--   · Límites de uso (consulta de cédulas, registros, QR público).
--   · QR público: responde igual si la cédula ya existía (no revela quién está).
--   · Registros por QR quedan como "sin verificar".
--   · "actividad" liviana: solo acciones sensibles, sin cédulas, se borra a los 90 días.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum (
  'admin', 'coordinador', 'lider_comuna', 'lider_barrio',
  'logistica', 'administrativo', 'publicidad', 'redes',
  'aspirante_consejo', 'aspirante_edil'
);
create type public.estado_votante as enum ('por_contactar', 'contactado', 'confirmado');
create type public.origen_registro as enum ('manual', 'excel', 'qr');

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS
-- ---------------------------------------------------------------------
create table public.comunas (
  id     int generated always as identity primary key,
  nombre text not null unique
);
create table public.barrios (
  id        int generated always as identity primary key,
  comuna_id int  not null references public.comunas(id),
  nombre    text not null,
  unique (comuna_id, nombre)
);
create table public.puestos_votacion (
  id        int generated always as identity primary key,
  nombre    text not null unique,
  direccion text
);

-- ---------------------------------------------------------------------
-- 3. PERFILES
--    "usuario" es el código con el que la persona entra (el correo interno de
--    Supabase Auth será usuario@campana.local). La cédula es solo un dato.
--    clave_vence_at nulo = la clave no vence (se usa para el administrador,
--    que se protege con verificación en dos pasos).
-- ---------------------------------------------------------------------
create table public.perfiles (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique references auth.users(id) on delete set null,
  usuario         text not null unique check (usuario ~ '^[A-Z0-9][A-Z0-9-]{3,19}$'),
  cedula          text not null unique check (cedula ~ '^[0-9]{6,10}$'),
  nombre_completo text not null check (btrim(nombre_completo) <> ''),
  telefono        text,
  correo          text,
  area            text,
  rol             public.rol_usuario not null,
  grupo           text check (grupo in ('G8')),
  comuna_id       int  references public.comunas(id),
  barrio_id       int  references public.barrios(id),
  supervisor_id   uuid references public.perfiles(id),
  meta            int  not null default 20 check (meta between 0 and 100000),
  token_qr        text unique,
  qr_activo       boolean not null default true,
  debe_cambiar_clave boolean not null default true,
  clave_vence_at  timestamptz,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index perfiles_supervisor_idx on public.perfiles (supervisor_id);
create index perfiles_comuna_rol_idx on public.perfiles (comuna_id, rol);

-- ---------------------------------------------------------------------
-- 4. VOTANTES
-- ---------------------------------------------------------------------
create table public.votantes (
  id              bigint generated always as identity primary key,
  cedula          text not null unique check (cedula ~ '^[0-9]{6,10}$'),
  nombre_completo text not null check (btrim(nombre_completo) <> ''),
  telefono        text,
  comuna_id       int not null references public.comunas(id),
  barrio_id       int not null references public.barrios(id),
  puesto_id       int not null references public.puestos_votacion(id),
  mesa            text,
  estado          public.estado_votante not null default 'por_contactar',
  origen          public.origen_registro not null default 'manual',
  verificado      boolean not null default true,        -- false = vino del QR público y nadie lo ha confirmado
  autorizo_datos  boolean not null check (autorizo_datos),
  autorizo_fecha  timestamptz not null default now(),
  registrado_por  uuid not null references public.perfiles(id),
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index votantes_lider_idx   on public.votantes (registrado_por, id desc) where activo;
create index votantes_comuna_idx  on public.votantes (comuna_id, id desc)      where activo;
create index votantes_barrio_idx  on public.votantes (barrio_id);
create index votantes_puesto_idx  on public.votantes (puesto_id, mesa);
create index votantes_estado_idx  on public.votantes (estado) where activo;
create index votantes_nombre_trgm on public.votantes using gin (nombre_completo extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 5. DUPLICADOS, ACTIVIDAD, LÍMITES Y CONTROL DE ACCESO
-- ---------------------------------------------------------------------
create table public.intentos_duplicados (
  id             bigint generated always as identity primary key,
  cedula         text not null,
  votante_id     bigint not null references public.votantes(id),
  lider_original uuid   not null references public.perfiles(id),
  lider_intento  uuid   not null references public.perfiles(id),
  origen         public.origen_registro not null,
  created_at     timestamptz not null default now(),
  revisado       boolean not null default false,
  revisado_por   uuid references public.perfiles(id),
  revisado_at    timestamptz
);
create index duplicados_pendientes_idx on public.intentos_duplicados (created_at desc) where not revisado;

-- Solo acciones sensibles. Sin cédulas en el detalle. Se limpia a los 90 días.
create table public.actividad (
  id         bigint generated always as identity primary key,
  usuario_id uuid references public.perfiles(id) on delete set null,
  accion     text not null,
  detalle    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index actividad_fecha_idx on public.actividad (created_at desc);

-- Límites de uso (registro, consulta de cédula, QR público)
create table public.limite_uso (
  id         bigint generated always as identity primary key,
  perfil_id  uuid not null references public.perfiles(id) on delete cascade,
  tipo       text not null,
  created_at timestamptz not null default now()
);
create index limite_uso_idx on public.limite_uso (perfil_id, tipo, created_at desc);

-- Intentos de inicio de sesión (los escribe y lee solo el servidor con service_role)
create table public.intentos_login (
  id         bigint generated always as identity primary key,
  usuario    text not null,
  ip         text,
  ok         boolean not null,
  created_at timestamptz not null default now()
);
create index intentos_login_usuario_idx on public.intentos_login (usuario, created_at desc);
create index intentos_login_ip_idx      on public.intentos_login (ip, created_at desc);

-- ---------------------------------------------------------------------
-- 6. FUNCIONES AUXILIARES (quién soy yo)
--    Si la clave venció o falta cambiarla, estas funciones devuelven nulo y
--    TODAS las políticas y funciones de abajo quedan cerradas para esa cuenta.
-- ---------------------------------------------------------------------
create function public.mi_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.perfiles
   where auth_id = auth.uid() and activo and not debe_cambiar_clave
     and (clave_vence_at is null or clave_vence_at > now())
   limit 1
$$;
create function public.mi_rol() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select rol from public.perfiles
   where auth_id = auth.uid() and activo and not debe_cambiar_clave
     and (clave_vence_at is null or clave_vence_at > now())
   limit 1
$$;
create function public.mi_comuna() returns int
language sql stable security definer set search_path = '' as $$
  select comuna_id from public.perfiles
   where auth_id = auth.uid() and activo and not debe_cambiar_clave
     and (clave_vence_at is null or clave_vence_at > now())
   limit 1
$$;
create function public.mis_subordinados() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.perfiles where supervisor_id = public.mi_id() and activo
$$;

create function public._nuevo_token() returns text   -- 40 caracteres hexadecimales
language sql volatile set search_path = '' as $$
  select left(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 40)
$$;
create function public._normalizar_cedula(t text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(t, ''), '\D', '', 'g')
$$;
create function public._clave(t text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(translate(coalesce(t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;
create function public._log(p_usuario uuid, p_accion text, p_detalle jsonb default '{}')
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.actividad (usuario_id, accion, detalle) values (p_usuario, p_accion, p_detalle)
$$;

-- true = puede seguir; false = superó el límite en esa ventana de tiempo
create function public._limitar(p_perfil uuid, p_tipo text, p_max int, p_segundos int) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  select count(*) into n from public.limite_uso
   where perfil_id = p_perfil and tipo = p_tipo
     and created_at > now() - make_interval(secs => p_segundos);
  if n >= p_max then return false; end if;
  insert into public.limite_uso (perfil_id, tipo) values (p_perfil, p_tipo);
  return true;
end $$;

-- ---------------------------------------------------------------------
-- 7. REGLAS DE PERFILES
-- ---------------------------------------------------------------------
create function public._perfiles_validar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_sup public.perfiles;
begin
  new.updated_at := now();

  -- El QR es fijo: una vez asignado no se puede cambiar ni borrar
  if tg_op = 'UPDATE' and old.token_qr is not null and new.token_qr is distinct from old.token_qr then
    raise exception 'El código QR es fijo y no se puede cambiar';
  end if;

  if new.rol in ('lider_comuna', 'lider_barrio') and new.token_qr is null then
    new.token_qr := public._nuevo_token();
  end if;
  if new.rol = 'lider_barrio' then
    if new.supervisor_id is null then
      raise exception 'Un líder de barrio debe depender de un líder de comuna';
    end if;
    select * into v_sup from public.perfiles where id = new.supervisor_id;
    if not found or v_sup.rol <> 'lider_comuna' then
      raise exception 'El supervisor de un líder de barrio debe ser un líder de comuna';
    end if;
    new.comuna_id := v_sup.comuna_id;
  else
    new.supervisor_id := null;
  end if;
  if new.rol in ('coordinador', 'lider_comuna') and new.comuna_id is null then
    raise exception 'Este rol requiere una comuna';
  end if;
  return new;
end $$;
create trigger perfiles_validar before insert or update on public.perfiles
for each row execute function public._perfiles_validar();

create function public._touch_updated() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger votantes_touch before update on public.votantes
for each row execute function public._touch_updated();

-- ---------------------------------------------------------------------
-- 8. NÚCLEO DEL REGISTRO (formulario, Excel y QR pasan por aquí)
-- ---------------------------------------------------------------------
create function public._insertar_votante(
  p_lider uuid, p_cedula text, p_nombre text, p_telefono text,
  p_barrio_id int, p_puesto_id int, p_mesa text,
  p_origen public.origen_registro, p_autorizo boolean
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ced    text := public._normalizar_cedula(p_cedula);
  v_lider  public.perfiles;
  v_id     bigint;
  v_orig   public.votantes;
begin
  if v_ced !~ '^[0-9]{6,10}$' then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Cédula inválida');
  end if;
  if btrim(coalesce(p_nombre, '')) = '' then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Falta el nombre');
  end if;
  if p_barrio_id is null then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Falta el barrio');
  end if;
  if p_puesto_id is null then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Falta el puesto de votación');
  end if;
  if p_autorizo is not true then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Falta la autorización de datos');
  end if;

  select * into v_lider from public.perfiles
   where id = p_lider and activo and rol in ('lider_comuna', 'lider_barrio');
  if not found then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Líder no válido');
  end if;
  if not exists (select 1 from public.barrios where id = p_barrio_id and comuna_id = v_lider.comuna_id) then
    return jsonb_build_object('resultado', 'error', 'motivo', 'El barrio no pertenece a la comuna del líder');
  end if;
  if not exists (select 1 from public.puestos_votacion where id = p_puesto_id) then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Puesto de votación no válido');
  end if;

  insert into public.votantes (cedula, nombre_completo, telefono, comuna_id, barrio_id,
                               puesto_id, mesa, origen, verificado, autorizo_datos, registrado_por)
  values (v_ced, btrim(p_nombre), nullif(btrim(coalesce(p_telefono, '')), ''), v_lider.comuna_id,
          p_barrio_id, p_puesto_id, nullif(btrim(coalesce(p_mesa, '')), ''), p_origen,
          (p_origen <> 'qr'), true, v_lider.id)
  on conflict (cedula) do nothing
  returning id into v_id;

  if v_id is not null then
    return jsonb_build_object('resultado', 'ok', 'id', v_id);
  end if;

  select * into v_orig from public.votantes where cedula = v_ced;
  if v_orig.registrado_por <> v_lider.id then
    insert into public.intentos_duplicados (cedula, votante_id, lider_original, lider_intento, origen)
    values (v_ced, v_orig.id, v_orig.registrado_por, v_lider.id, p_origen);
  end if;
  return jsonb_build_object('resultado', 'duplicado');
end $$;

-- ---------------------------------------------------------------------
-- 9. FUNCIONES PARA LA APLICACIÓN
-- ---------------------------------------------------------------------

-- 9.1 Formulario del líder (o del admin a nombre de un líder)
create function public.registrar_votante(
  p_cedula text, p_nombre text, p_telefono text, p_barrio_id int, p_puesto_id int,
  p_mesa text, p_autorizo boolean, p_lider_id uuid default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_yo uuid := public.mi_id(); v_rol public.rol_usuario := public.mi_rol(); v_lider uuid;
begin
  if v_yo is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  if v_rol = 'admin' and p_lider_id is not null then v_lider := p_lider_id;
  elsif v_rol in ('lider_comuna', 'lider_barrio') then v_lider := v_yo;
  else raise exception 'Tu rol no puede registrar votantes' using errcode = '42501';
  end if;
  if not public._limitar(v_yo, 'registro', 60, 60) then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Demasiados intentos, espera un minuto');
  end if;
  return public._insertar_votante(v_lider, p_cedula, p_nombre, p_telefono, p_barrio_id, p_puesto_id,
                                  p_mesa, 'manual', p_autorizo);
end $$;

-- 9.2 Aviso en vivo al escribir la cédula (con límite para que nadie la use de buscador)
create function public.cedula_existe(p_cedula text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare v_yo uuid := public.mi_id();
begin
  if v_yo is null or public.mi_rol() not in ('admin', 'lider_comuna', 'lider_barrio') then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  if not public._limitar(v_yo, 'cedula', 30, 60) then
    raise exception 'Demasiadas consultas, espera un minuto' using errcode = '54000';
  end if;
  return exists (select 1 from public.votantes where cedula = public._normalizar_cedula(p_cedula));
end $$;

-- 9.3 Importar Excel (solo administrador); se llama por lotes desde la aplicación
create function public.importar_votantes(p_lider uuid, p_filas jsonb, p_autorizo boolean)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_yo uuid := public.mi_id(); v_comuna int; f jsonb; r jsonb;
  v_barrio int; v_puesto int;
  n_ok int := 0; n_dup int := 0; n_err int := 0; v_errs jsonb := '[]';
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador puede importar' using errcode = '42501';
  end if;
  if p_autorizo is not true then
    raise exception 'Debes confirmar la autorización de datos';
  end if;
  if jsonb_typeof(p_filas) <> 'array' then raise exception 'Formato de filas inválido'; end if;
  if jsonb_array_length(p_filas) > 2000 then raise exception 'Máximo 2000 filas por lote'; end if;
  select comuna_id into v_comuna from public.perfiles
   where id = p_lider and activo and rol in ('lider_comuna', 'lider_barrio');
  if not found then raise exception 'Líder no válido'; end if;

  for f in select * from jsonb_array_elements(p_filas) loop
    select id into v_barrio from public.barrios
     where comuna_id = v_comuna and public._clave(nombre) = public._clave(f->>'barrio') limit 1;
    select id into v_puesto from public.puestos_votacion
     where public._clave(nombre) = public._clave(f->>'puesto') limit 1;
    if v_barrio is null and btrim(coalesce(f->>'barrio', '')) <> '' then
      r := jsonb_build_object('resultado', 'error', 'motivo', 'Barrio no encontrado: ' || (f->>'barrio'));
    elsif v_puesto is null and btrim(coalesce(f->>'puesto', '')) <> '' then
      r := jsonb_build_object('resultado', 'error', 'motivo', 'Puesto no encontrado: ' || (f->>'puesto'));
    else
      r := public._insertar_votante(p_lider, f->>'cedula', f->>'nombre', f->>'telefono',
                                    v_barrio, v_puesto, f->>'mesa', 'excel', true);
    end if;
    case r->>'resultado'
      when 'ok' then n_ok := n_ok + 1;
      when 'duplicado' then n_dup := n_dup + 1;
      else n_err := n_err + 1;
           v_errs := v_errs || jsonb_build_array(jsonb_build_object('fila', f->'fila', 'motivo', r->>'motivo'));
    end case;
    v_barrio := null; v_puesto := null;
  end loop;

  perform public._log(v_yo, 'Importó un Excel',
    jsonb_build_object('lider', p_lider, 'nuevos', n_ok, 'repetidos', n_dup, 'errores', n_err));
  return jsonb_build_object('nuevos', n_ok, 'repetidos', n_dup, 'errores', n_err, 'filas_con_error', v_errs);
end $$;

-- 9.4 QR público: datos para mostrar el formulario
create function public.qr_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.perfiles; v_comuna text;
begin
  select * into v from public.perfiles
   where token_qr = p_token and activo and qr_activo and rol in ('lider_comuna', 'lider_barrio');
  if not found then return jsonb_build_object('resultado', 'codigo_invalido'); end if;
  select nombre into v_comuna from public.comunas where id = v.comuna_id;
  return jsonb_build_object(
    'resultado', 'ok', 'lider', v.nombre_completo, 'comuna', v_comuna,
    'barrios', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre) order by b.nombre)
                           from public.barrios b where b.comuna_id = v.comuna_id), '[]'),
    'puestos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre) order by p.nombre)
                           from public.puestos_votacion p), '[]'));
end $$;

-- 9.5 QR público: el votante se registra solo. Si la cédula ya existía responde
--     igual que si fuera nueva ('recibido'), para que nadie pueda averiguar quién está.
create function public.registrar_votante_qr(
  p_token text, p_cedula text, p_nombre text, p_telefono text,
  p_barrio_id int, p_puesto_id int, p_mesa text, p_autorizo boolean
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_lider uuid; r jsonb;
begin
  select id into v_lider from public.perfiles
   where token_qr = p_token and activo and qr_activo and rol in ('lider_comuna', 'lider_barrio');
  if v_lider is null then return jsonb_build_object('resultado', 'codigo_invalido'); end if;

  if not public._limitar(v_lider, 'qr', 20, 60) then
    return jsonb_build_object('resultado', 'demasiados_intentos');
  end if;

  r := public._insertar_votante(v_lider, p_cedula, p_nombre, p_telefono, p_barrio_id, p_puesto_id,
                                p_mesa, 'qr', p_autorizo);
  if r->>'resultado' in ('ok', 'duplicado') then
    return jsonb_build_object('resultado', 'recibido');
  end if;
  return r;
end $$;

-- 9.6 Estado del votante (administrador o líder dueño)
create function public.cambiar_estado_votante(p_votante bigint, p_estado public.estado_votante)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_yo uuid := public.mi_id(); v_n int;
begin
  if v_yo is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  update public.votantes set estado = p_estado
   where id = p_votante and activo
     and (public.mi_rol() = 'admin' or registrado_por = v_yo);
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'No puedes modificar este votante' using errcode = '42501'; end if;
end $$;

-- 9.7 Dar de baja / reactivar un votante (solo administrador; nunca se borra)
create function public.cambiar_activo_votante(p_votante bigint, p_activo boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  update public.votantes set activo = p_activo where id = p_votante;
  perform public._log(public.mi_id(), case when p_activo then 'Reactivó un votante' else 'Dio de baja un votante' end,
                      jsonb_build_object('votante', p_votante));
end $$;

-- 9.8 Marcar un registro del QR como verificado (solo administrador)
create function public.verificar_votante(p_votante bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  update public.votantes set verificado = true where id = p_votante;
end $$;

-- 9.9 Meta: la pone el administrador o el propio líder
create function public.cambiar_meta(p_perfil uuid, p_meta int) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_yo uuid := public.mi_id();
begin
  if v_yo is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  if p_meta is null or p_meta < 1 or p_meta > 100000 then
    raise exception 'La meta debe estar entre 1 y 100000';
  end if;
  if not (public.mi_rol() = 'admin' or p_perfil = v_yo) then
    raise exception 'Solo puedes cambiar tu propia meta' using errcode = '42501';
  end if;
  update public.perfiles set meta = p_meta
   where id = p_perfil and rol in ('lider_comuna', 'lider_barrio');
  if not found then raise exception 'La meta aplica solo a líderes'; end if;
end $$;

-- 9.10 QR: pausar o reactivar (NO existe función para generar uno nuevo)
create function public.cambiar_qr_activo(p_perfil uuid, p_activo boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  update public.perfiles set qr_activo = p_activo
   where id = p_perfil and rol in ('lider_comuna', 'lider_barrio');
  if not found then raise exception 'Solo los líderes tienen código QR'; end if;
  perform public._log(public.mi_id(), case when p_activo then 'Reactivó un QR' else 'Pausó un QR' end,
                      jsonb_build_object('perfil', p_perfil));
end $$;

-- 9.11 Leer el token del QR: cada líder el suyo, el administrador el de cualquiera.
--      (La columna token_qr no se puede consultar directamente.)
create function public.mi_qr() returns text
language sql stable security definer set search_path = '' as $$
  select token_qr from public.perfiles
   where id = public.mi_id() and rol in ('lider_comuna', 'lider_barrio')
$$;
create function public.qr_de(p_perfil uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  return (select token_qr from public.perfiles where id = p_perfil);
end $$;

-- 9.12 Duplicados: marcar como revisado (solo administrador)
create function public.revisar_duplicado(p_id bigint, p_revisado boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  update public.intentos_duplicados
     set revisado = p_revisado,
         revisado_por = case when p_revisado then public.mi_id() end,
         revisado_at  = case when p_revisado then now() end
   where id = p_id;
end $$;

-- 9.13 Activar / desactivar a una persona del equipo (solo administrador)
create function public.cambiar_activo_perfil(p_perfil uuid, p_activo boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  if p_perfil = public.mi_id() then raise exception 'No puedes desactivarte a ti mismo'; end if;
  update public.perfiles set activo = p_activo where id = p_perfil;
  perform public._log(public.mi_id(), case when p_activo then 'Activó a una persona' else 'Desactivó a una persona' end,
                      jsonb_build_object('perfil', p_perfil));
end $$;

-- 9.14 Constancia de acciones que hace el servidor en nombre del administrador
--      (crear personas, restablecer claves). Sin datos personales en el detalle.
create function public.anotar_actividad(p_accion text, p_detalle jsonb default '{}') returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'Solo el administrador' using errcode = '42501';
  end if;
  perform public._log(public.mi_id(), left(p_accion, 200), coalesce(p_detalle, '{}'));
end $$;

-- 9.15 Mantenimiento: limpia datos viejos. Lo ejecuta el servidor (service_role) o pg_cron.
create function public.mantenimiento() returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.limite_uso     where created_at < now() - interval '1 day';
  delete from public.intentos_login where created_at < now() - interval '7 days';
  delete from public.actividad      where created_at < now() - interval '90 days';
end $$;

-- ---------------------------------------------------------------------
-- 10. VISTAS
-- ---------------------------------------------------------------------
create view public.avance_lideres with (security_invoker = true) as
select p.id, p.nombre_completo, p.rol, p.comuna_id, p.meta,
       count(v.id) filter (where v.activo)                             as registrados,
       count(v.id) filter (where v.activo and v.estado = 'confirmado') as confirmados
  from public.perfiles p
  left join public.votantes v on v.registrado_por = p.id
 where p.rol in ('lider_comuna', 'lider_barrio') and p.activo
 group by p.id;

create view public.resumen_puestos with (security_invoker = true) as
select pv.id as puesto_id, pv.nombre as puesto,
       count(*)                                        as votantes,
       count(distinct v.mesa)                          as mesas,
       count(*) filter (where v.estado = 'confirmado') as confirmados
  from public.votantes v
  join public.puestos_votacion pv on pv.id = v.puesto_id
 where v.activo
 group by pv.id, pv.nombre;

create view public.duplicados_detalle with (security_invoker = true) as
select d.id, d.cedula, vt.nombre_completo as votante,
       po.nombre_completo as registro_primero, pi.nombre_completo as intento_registrar,
       d.origen, d.created_at, d.revisado
  from public.intentos_duplicados d
  join public.votantes vt on vt.id = d.votante_id
  join public.perfiles po on po.id = d.lider_original
  join public.perfiles pi on pi.id = d.lider_intento;

-- ---------------------------------------------------------------------
-- 11. SEGURIDAD POR FILA (RLS)
-- ---------------------------------------------------------------------
alter table public.comunas             enable row level security;
alter table public.barrios             enable row level security;
alter table public.puestos_votacion    enable row level security;
alter table public.perfiles            enable row level security;
alter table public.votantes            enable row level security;
alter table public.intentos_duplicados enable row level security;
alter table public.actividad           enable row level security;
alter table public.limite_uso          enable row level security;   -- sin políticas: nadie la lee
alter table public.intentos_login      enable row level security;   -- sin políticas: solo service_role

create policy comunas_leer on public.comunas for select to authenticated using (true);
create policy comunas_admin on public.comunas for all to authenticated
  using ((select public.mi_rol()) = 'admin') with check ((select public.mi_rol()) = 'admin');
create policy barrios_leer on public.barrios for select to authenticated using (true);
create policy barrios_admin on public.barrios for all to authenticated
  using ((select public.mi_rol()) = 'admin') with check ((select public.mi_rol()) = 'admin');
create policy puestos_leer on public.puestos_votacion for select to authenticated using (true);
create policy puestos_admin on public.puestos_votacion for all to authenticated
  using ((select public.mi_rol()) = 'admin') with check ((select public.mi_rol()) = 'admin');

create policy perfiles_leer on public.perfiles for select to authenticated using (
     (select public.mi_rol()) = 'admin'
  or id = (select public.mi_id())
  or ((select public.mi_rol()) = 'coordinador' and comuna_id = (select public.mi_comuna()))
  or supervisor_id = (select public.mi_id())
);

create policy votantes_leer on public.votantes for select to authenticated using (
     (select public.mi_rol()) = 'admin'
  or ( activo and (
        registrado_por = (select public.mi_id())
     or registrado_por in (select public.mis_subordinados())
     or ((select public.mi_rol()) = 'coordinador' and comuna_id = (select public.mi_comuna()))
  ))
);

create policy duplicados_leer on public.intentos_duplicados for select to authenticated
  using ((select public.mi_rol()) = 'admin');
create policy actividad_leer on public.actividad for select to authenticated
  using ((select public.mi_rol()) = 'admin');

-- ---------------------------------------------------------------------
-- 12. PERMISOS
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant select on public.comunas, public.barrios, public.puestos_votacion,
                public.votantes, public.intentos_duplicados, public.actividad,
                public.avance_lideres, public.resumen_puestos, public.duplicados_detalle
  to authenticated;
-- perfiles: se listan las columnas permitidas; token_qr queda fuera a propósito
grant select (id, auth_id, usuario, cedula, nombre_completo, telefono, correo, area, rol, grupo,
              comuna_id, barrio_id, supervisor_id, meta, qr_activo, debe_cambiar_clave,
              clave_vence_at, activo, created_at, updated_at)
  on public.perfiles to authenticated;
grant insert, update, delete on public.comunas, public.barrios, public.puestos_votacion to authenticated;

grant execute on function
  public.mi_id(), public.mi_rol(), public.mi_comuna(), public.mis_subordinados()
  to authenticated;
grant execute on function
  public.registrar_votante(text, text, text, int, int, text, boolean, uuid),
  public.cedula_existe(text),
  public.importar_votantes(uuid, jsonb, boolean),
  public.cambiar_estado_votante(bigint, public.estado_votante),
  public.cambiar_activo_votante(bigint, boolean),
  public.verificar_votante(bigint),
  public.cambiar_meta(uuid, int),
  public.cambiar_qr_activo(uuid, boolean),
  public.mi_qr(),
  public.qr_de(uuid),
  public.revisar_duplicado(bigint, boolean),
  public.cambiar_activo_perfil(uuid, boolean),
  public.anotar_actividad(text, jsonb)
  to authenticated;
grant execute on function
  public.qr_info(text),
  public.registrar_votante_qr(text, text, text, text, int, int, text, boolean)
  to anon, authenticated;
-- public.mantenimiento() no se concede a nadie: la ejecuta service_role o pg_cron.