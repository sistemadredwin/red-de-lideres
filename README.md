# Red de Líderes

Sistema de registro de equipo y votantes de la campaña (Next.js + Supabase).

## Qué trae
- Entrada con **código de acceso** (no la cédula) y contraseña que **vence cada 7 días** (el administrador no vence).
- Contraseña temporal en cuentas nuevas: se cambia obligatoriamente al entrar.
- 5 fallos seguidos bloquean el código 15 minutos.
- **QR fijo** por líder (no se puede cambiar; el administrador solo lo pausa).
- Una cédula = un votante; los repetidos aparecen en rojo con el líder que la registró primero.
- **La planilla de Excel la genera el sistema** (botón *Descargar planilla*): trae los barrios y puestos reales y, si la baja un líder, ya viene con su nombre. Al importarla se toma el líder y el barrio del encabezado.
- Filtro por **barrio** en las listas de votantes y en la exportación.
- G8 es un grupo, no un rol.

## Instalación (en orden)
1. **Supabase** → SQL Editor: ejecuta `supabase/01_esquema.sql` y luego `supabase/02_comunas_barrios.sql`.
2. Supabase → Authentication → Users → *Add user*: correo `tu-codigo@campana.local` (código en minúsculas), contraseña larga, marca *Auto Confirm User*.
3. Edita y ejecuta `supabase/03_admin.sql` (tu código, tu cédula, tu nombre).
4. Copia `.env.local.example` a `.env.local` y llena las llaves de Supabase (Project Settings → API).
5. `npm install` y `npm run dev` → http://localhost:3000
6. Entra con tu código de acceso. Crea líderes en **Personal** (se genera su código y contraseña temporal).
7. Carga los **puestos de votación** (menú *Puestos de votación*) antes de importar planillas.
8. Producción: sube a GitHub (privado) y conecta con Vercel, pegando las mismas variables de entorno.
   Variable extra en Vercel: `NEXT_PUBLIC_SITE_URL` = la dirección pública (la usa el QR).

## Seguridad
- `SUPABASE_SECRET_KEY` solo en el servidor (Vercel → Environment Variables). Nunca en el código.
- Activa la verificación en dos pasos en tu cuenta de Supabase y de GitHub.
- Supabase Pro: copias de seguridad diarias.
- Opcional: `supabase/04_mantenimiento_opcional.sql` (limpieza diaria).

## Pendiente (no incluido aún)
- Verificación en dos pasos (TOTP) dentro de la aplicación para el administrador.
- Pantalla para marcar como verificados los registros que llegan por QR (la función `verificar_votante` ya existe en la base de datos).
- Aviso legal de tratamiento de datos (Ley 1581): debe revisarlo un abogado.
- No se ha probado contra un Supabase real: haz la primera prueba completa (entrar, crear líder, registrar votante, repetido, QR, importar planilla).
