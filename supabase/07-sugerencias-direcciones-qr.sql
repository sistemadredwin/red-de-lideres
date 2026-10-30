-- Incluye las direcciones en las sugerencias del formulario QR público.
-- Ejecutar una vez en proyectos que ya tengan aplicada la migración 05.

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
