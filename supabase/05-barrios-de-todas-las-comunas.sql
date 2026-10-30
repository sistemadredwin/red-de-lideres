-- Habilita el registro de votantes en cualquier barrio de Buenaventura.
-- Ejecutar una vez en proyectos que ya tengan aplicado 01-esquema.sql.
-- Si el catálogo aún no está cargado, ejecutar antes 02-datos_iniciales.sql.

create or replace function public._insertar_votante(
  p_lider uuid, p_cedula text, p_nombre text, p_telefono text,
  p_barrio_id int, p_puesto_id int, p_mesa text,
  p_origen public.origen_registro, p_autorizo boolean
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ced text := public._normalizar_cedula(p_cedula);
  v_lider public.perfiles;
  v_comuna_id int;
  v_id bigint;
  v_orig public.votantes;
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
  select comuna_id into v_comuna_id from public.barrios where id = p_barrio_id;
  if not found then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Barrio no válido');
  end if;
  if not exists (select 1 from public.puestos_votacion where id = p_puesto_id) then
    return jsonb_build_object('resultado', 'error', 'motivo', 'Puesto de votación no válido');
  end if;

  insert into public.votantes (cedula, nombre_completo, telefono, comuna_id, barrio_id,
                               puesto_id, mesa, origen, verificado, autorizo_datos, registrado_por)
  values (v_ced, btrim(p_nombre), nullif(btrim(coalesce(p_telefono, '')), ''), v_comuna_id,
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

create or replace function public.importar_votantes(p_lider uuid, p_filas jsonb, p_autorizo boolean)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_yo uuid := public.mi_id(); f jsonb; r jsonb;
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
  if not exists (select 1 from public.perfiles
                  where id = p_lider and activo and rol in ('lider_comuna', 'lider_barrio')) then
    raise exception 'Líder no válido';
  end if;

  for f in select * from jsonb_array_elements(p_filas) loop
    select id into v_barrio from public.barrios
     where public._clave(nombre) = public._clave(f->>'barrio') limit 1;
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

create or replace function public.qr_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.perfiles; v_comuna text;
begin
  select * into v from public.perfiles
   where token_qr = p_token and activo and qr_activo and rol in ('lider_comuna', 'lider_barrio');
  if not found then return jsonb_build_object('resultado', 'codigo_invalido'); end if;
  select nombre into v_comuna from public.comunas where id = v.comuna_id;
  return jsonb_build_object(
    'resultado', 'ok', 'lider', v.nombre_completo, 'comuna', v_comuna,
    'barrios', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre, 'detalle', c.nombre)
                                            order by c.id, b.nombre)
                           from public.barrios b
                           join public.comunas c on c.id = b.comuna_id), '[]'),
    'puestos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'detalle', p.direccion) order by p.nombre)
                           from public.puestos_votacion p), '[]'));
end $$;
