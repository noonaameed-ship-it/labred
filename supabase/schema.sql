-- LabRed: tablas y reglas de seguridad.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.

-- 1. Progreso de cada alumno (solo el dueño lo puede leer y modificar)
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  backup jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "progreso propio: leer" on public.progress;
drop policy if exists "progreso propio: crear" on public.progress;
drop policy if exists "progreso propio: actualizar" on public.progress;
create policy "progreso propio: leer" on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "progreso propio: crear" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progreso propio: actualizar" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Ranking (todos los alumnos con cuenta lo ven; cada quien solo escribe su fila)
create table if not exists public.ranking (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  xp integer not null default 0 check (xp between 0 and 100000),
  nivel integer not null default 0 check (nivel between 0 and 50),
  updated_at timestamptz not null default now()
);
alter table public.ranking add column if not exists certs integer not null default 0;
alter table public.ranking add column if not exists stars integer not null default 0;
alter table public.ranking add column if not exists streak integer not null default 0;
alter table public.ranking add column if not exists week text;
alter table public.ranking add column if not exists week_xp integer not null default 0;
alter table public.ranking enable row level security;
drop policy if exists "ranking: ver" on public.ranking;
drop policy if exists "ranking propio: crear" on public.ranking;
drop policy if exists "ranking propio: actualizar" on public.ranking;
drop policy if exists "ranking propio: borrar" on public.ranking;
create policy "ranking: ver" on public.ranking for select to authenticated using (true);
create policy "ranking propio: crear" on public.ranking for insert to authenticated with check (auth.uid() = user_id);
create policy "ranking propio: actualizar" on public.ranking for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ranking propio: borrar" on public.ranking for delete to authenticated using (auth.uid() = user_id);

-- 3. Feedback (cualquiera puede enviar; solo tú lo lees desde el panel de Supabase)
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  page text check (char_length(page) <= 100),
  rating integer check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback: enviar" on public.feedback;
create policy "feedback: enviar" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- 4. Instructores: pueden leer el avance de todos y el feedback
alter table public.progress add column if not exists name text;
alter table public.progress add column if not exists email text;
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
drop policy if exists "admins: ver el propio" on public.admins;
create policy "admins: ver el propio" on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins: instructores ven todos" on public.admins;
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
create policy "admins: instructores ven todos" on public.admins for select to authenticated using (public.is_admin());
drop policy if exists "progreso: instructor lee todo" on public.progress;
create policy "progreso: instructor lee todo" on public.progress for select to authenticated using (public.is_admin());
drop policy if exists "feedback: instructor lee" on public.feedback;
create policy "feedback: instructor lee" on public.feedback for select to authenticated using (public.is_admin());
-- Rellena nombre y correo de los alumnos que ya existían
update public.progress p
   set name = coalesce(nullif(p.name,''), u.raw_user_meta_data->>'name'),
       email = coalesce(nullif(p.email,''), u.email)
  from auth.users u
 where u.id = p.user_id and (p.name is null or p.name = '' or p.email is null or p.email = '');

-- Tu cuenta como instructor (agrega más correos separados por coma si hay otros instructores):
insert into public.admins (user_id)
  select id from auth.users where lower(email) in ('noonaameed@gmail.com')
  on conflict do nothing;

-- 5. Comentarios del instructor a cada alumno, por ticket
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  module text not null check (char_length(module) <= 20),
  comment text not null check (char_length(comment) between 1 and 2000),
  reopen boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.reviews add column if not exists verdict text check (verdict in ('ok','redo'));
alter table public.reviews enable row level security;
drop policy if exists "reviews: instructor crea" on public.reviews;
drop policy if exists "reviews: instructor lee" on public.reviews;
drop policy if exists "reviews: alumno lee las suyas" on public.reviews;
drop policy if exists "reviews: alumno marca leido" on public.reviews;
create policy "reviews: instructor crea" on public.reviews for insert to authenticated with check (public.is_admin());
create policy "reviews: instructor lee" on public.reviews for select to authenticated using (public.is_admin());
create policy "reviews: alumno lee las suyas" on public.reviews for select to authenticated using (student_id = auth.uid());
create policy "reviews: alumno marca leido" on public.reviews for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
-- El alumno solo puede cambiar read_at (marcar como leído)
revoke update on public.reviews from authenticated;
grant update (read_at) on public.reviews to authenticated;

-- 6. Solicitudes de intento extra en certificaciones (el alumno pide, el instructor decide)
create table if not exists public.cert_requests (
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (char_length(module) <= 20),
  reason text not null check (char_length(reason) between 10 and 2000),
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.cert_requests enable row level security;
drop policy if exists "solicitudes: alumno crea" on public.cert_requests;
drop policy if exists "solicitudes: alumno ve las suyas" on public.cert_requests;
drop policy if exists "solicitudes: instructor ve todas" on public.cert_requests;
drop policy if exists "solicitudes: instructor decide" on public.cert_requests;
create policy "solicitudes: alumno crea" on public.cert_requests for insert to authenticated with check (student_id = auth.uid() and status = 'pendiente');
create policy "solicitudes: alumno ve las suyas" on public.cert_requests for select to authenticated using (student_id = auth.uid());
create policy "solicitudes: instructor ve todas" on public.cert_requests for select to authenticated using (public.is_admin());
create policy "solicitudes: instructor decide" on public.cert_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7. Vista para el instructor: avance, explicaciones y señales de cada alumno
--    Consúltala en el SQL Editor:  select * from explicaciones order by updated_at desc;
drop view if exists public.explicaciones;
create view public.explicaciones with (security_invoker = true) as
select u.email, r.name, m.key as modulo,
       (m.value->>'exp')::int as explicacion_mejor,
       (m.value->>'tries')::int as intentos_explicacion,
       m.value->>'lastText' as ultima_explicacion,
       (m.value->'lastMetrics'->>'segundos')::int as segundos_escribiendo,
       (m.value->'lastMetrics'->>'pegados')::int as intentos_de_pegar,
       (m.value->>'labScore')::int as lab_mejor,
       m.value->'labLast' as lab_ultimo_intento,
       (m.value->>'examBest')::int as examen_mejor,
       (m.value->>'attempts')::int as examen_intentos,
       (m.value->>'leaves')::int as examen_salidas_de_pestana,
       p.updated_at
from public.progress p
join auth.users u on u.id = p.user_id
left join public.ranking r on r.user_id = p.user_id
cross join lateral jsonb_each(p.data->'done') m;
revoke all on public.explicaciones from anon, authenticated;

-- 8. Duelos entre becarios (Arena)
create table if not exists public.duels (
  id bigint generated always as identity primary key,
  a uuid not null references auth.users(id) on delete cascade,
  a_name text,
  b uuid not null references auth.users(id) on delete cascade,
  b_name text,
  seed bigint not null,
  zone integer not null default 0,
  a_score integer, a_ms integer,
  b_score integer, b_ms integer,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.duels enable row level security;
drop policy if exists "duelos: ver los míos" on public.duels;
drop policy if exists "duelos: crear" on public.duels;
drop policy if exists "duelos: jugar" on public.duels;
create policy "duelos: ver los míos" on public.duels for select to authenticated using (auth.uid() = a or auth.uid() = b or public.is_admin());
create policy "duelos: crear" on public.duels for insert to authenticated with check (auth.uid() = a and a <> b);
create policy "duelos: jugar" on public.duels for update to authenticated using (auth.uid() = a or auth.uid() = b);
notify pgrst, 'reload schema';

-- 9. Revisión entre compañeros (Arena)
create table if not exists public.peer_pool (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.peer_reviews (
  id bigint generated always as identity primary key,
  pool_id bigint not null references public.peer_pool(id) on delete cascade,
  reviewer uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ideas integer, clarity integer, comment text,
  created_at timestamptz not null default now(),
  unique (pool_id, reviewer)
);
alter table public.peer_pool enable row level security;
alter table public.peer_reviews enable row level security;
drop policy if exists "pares: ver explicaciones" on public.peer_pool;
drop policy if exists "pares: compartir la mía" on public.peer_pool;
drop policy if exists "pares: ver revisiones" on public.peer_reviews;
drop policy if exists "pares: revisar" on public.peer_reviews;
create policy "pares: ver explicaciones" on public.peer_pool for select to authenticated using (true);
create policy "pares: compartir la mía" on public.peer_pool for insert to authenticated with check (auth.uid() = user_id);
create policy "pares: ver revisiones" on public.peer_reviews for select to authenticated using (reviewer = auth.uid() or public.is_admin() or exists (select 1 from public.peer_pool p where p.id = pool_id and p.user_id = auth.uid()));
create policy "pares: revisar" on public.peer_reviews for insert to authenticated with check (reviewer = auth.uid() and exists (select 1 from public.peer_pool p where p.id = pool_id and p.user_id <> auth.uid()));
notify pgrst, 'reload schema';

-- 10. Rellenar el ranking con lo que ya tiene cada becario (certificaciones, racha, semana y zona)
update public.ranking r set
  certs   = (select count(*) from jsonb_each(coalesce(p.data->'done','{}'::jsonb)) e
             where e.key in ('x0','x1','x2','x3','x4','x5','x6')
               and coalesce((e.value->>'examBest')::numeric,0) >= 80 and e.value->>'v' = '2'),
  streak  = coalesce((p.data->>'streak')::int, 0),
  week    = p.data->'wk'->>'id',
  week_xp = coalesce((p.data->'wk'->>'xp')::int, 0),
  nivel   = least(50, coalesce((p.data->>'unlocked')::int, 0))
from public.progress p where p.user_id = r.user_id;

-- 11. Perfiles públicos: avatar y resumen de avance (nunca el correo)
alter table public.ranking add column if not exists avatar text check (avatar is null or char_length(avatar) <= 40);
alter table public.ranking add column if not exists pub jsonb;
notify pgrst, 'reload schema';

-- 12. Rellenar los perfiles con lo que ya está guardado (insignias, récords y frase)
update public.ranking r set pub = coalesce(r.pub, '{}'::jsonb) || jsonb_build_object(
  'badges', coalesce((select jsonb_agg(k) from jsonb_object_keys(coalesce(p.data->'badges','{}'::jsonb)) k), '[]'::jsonb),
  'noc',    coalesce((p.data->'noc'->>'best')::int, 0),
  'duels',  (select count(*) from jsonb_object_keys(coalesce(p.data->'duelWon','{}'::jsonb))),
  'bosses', (select count(*) from jsonb_object_keys(coalesce(p.data->'boss','{}'::jsonb))),
  'rev',    coalesce((p.data->>'revDone')::int, 0),
  'lema',   coalesce(p.data->>'lema', ''))
from public.progress p where p.user_id = r.user_id;

-- 13. Seguridad: alertas para el instructor, validaciones del lado del servidor,
--     moderación y recuperación de contraseña sin correo (la aprueba el instructor)
create table if not exists public.alerts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  detail jsonb,
  day date not null default current_date,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists alerts_una_al_dia on public.alerts (user_id, kind, day);
alter table public.alerts enable row level security;
drop policy if exists "alertas: instructor ve" on public.alerts;
drop policy if exists "alertas: instructor marca" on public.alerts;
drop policy if exists "alertas: instructor borra" on public.alerts;
drop policy if exists "alertas: la página reporta" on public.alerts;
create policy "alertas: instructor ve" on public.alerts for select to authenticated using (public.is_admin());
create policy "alertas: instructor marca" on public.alerts for update to authenticated using (public.is_admin());
create policy "alertas: instructor borra" on public.alerts for delete to authenticated using (public.is_admin());
create policy "alertas: la página reporta" on public.alerts for insert to authenticated
  with check (user_id = auth.uid() and kind like 'cliente:%' and pg_column_size(detail) < 2000);

create or replace function public.raise_alert(p_user uuid, p_kind text, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.alerts (user_id, kind, detail) values (p_user, p_kind, p_detail)
  on conflict (user_id, kind, day) do nothing $$;
revoke all on function public.raise_alert(uuid, text, jsonb) from public, anon, authenticated;

-- Revisa cada guardado de avance: saltos de XP imposibles, certificaciones sin examen, labs inconsistentes
create or replace function public.check_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  oldp int := coalesce((old.data->>'pts')::numeric, 0)::int;
  newp int := coalesce((new.data->>'pts')::numeric, 0)::int;
  k text; e jsonb;
begin
  if pg_column_size(new.data) > 500000 then raise exception 'Progreso demasiado grande'; end if;
  if public.is_admin() then return new; end if;
  if tg_op = 'UPDATE' and newp - oldp > 1500 then
    perform public.raise_alert(new.user_id, 'xp_salto', jsonb_build_object('antes', oldp, 'despues', newp));
  end if;
  if tg_op = 'INSERT' and newp > 3000 then
    perform public.raise_alert(new.user_id, 'xp_inicial', jsonb_build_object('xp', newp));
  end if;
  for k, e in select * from jsonb_each(coalesce(new.data->'done', '{}'::jsonb)) loop
    if jsonb_typeof(e) <> 'object' then continue; end if;
    if k ~ '^x[0-9]$' and coalesce(e->>'v','') = '2' and coalesce((e->>'examBest')::numeric, 0) >= 80
       and coalesce((e->>'attempts')::int, 0) = 0 then
      perform public.raise_alert(new.user_id, 'cert_sin_intento', jsonb_build_object('cert', k, 'calificacion', e->>'examBest'));
    end if;
    if coalesce((e->>'examBest')::numeric, 0) > 100 or coalesce((e->>'labScore')::numeric, 0) > 100 then
      perform public.raise_alert(new.user_id, 'calificacion_imposible', jsonb_build_object('modulo', k));
    end if;
    if coalesce((e->>'labPasses')::int, 0) > coalesce((e->>'labRuns')::int, 0) then
      perform public.raise_alert(new.user_id, 'lab_inconsistente', jsonb_build_object('lab', k));
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists progress_guard on public.progress;
create trigger progress_guard before insert or update on public.progress
  for each row execute function public.check_progress();

-- El ranking ya no confía en lo que manda la página: copia los números del avance guardado
create or replace function public.ranking_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  select data into d from public.progress where user_id = new.user_id;
  if d is not null then
    new.xp := least(100000, greatest(0, coalesce((d->>'pts')::numeric, 0)::int));
    new.certs := (select count(*) from jsonb_each(coalesce(d->'done','{}'::jsonb)) x
                  where x.key ~ '^x[0-9]$' and jsonb_typeof(x.value) = 'object'
                    and coalesce((x.value->>'examBest')::numeric, 0) >= 80 and x.value->>'v' = '2');
    new.streak := least(3650, greatest(0, coalesce((d->>'streak')::int, 0)));
    new.nivel := least(50, greatest(0, coalesce((d->>'unlocked')::int, 0)));
    if d->'wk'->>'id' is not null then
      new.week := d->'wk'->>'id';
      new.week_xp := least(new.xp, greatest(0, coalesce((d->'wk'->>'xp')::numeric, 0)::int));
    end if;
  end if;
  new.stars := least(coalesce(new.stars, 0), 200);
  if new.avatar is not null and new.avatar !~ '^[^|<>"]{1,16}\|#[0-9a-fA-F]{6}$' then new.avatar := null; end if;
  if new.pub is not null and pg_column_size(new.pub) > 8000 then new.pub := null; end if;
  return new;
end $$;
drop trigger if exists ranking_guard on public.ranking;
create trigger ranking_guard before insert or update on public.ranking
  for each row execute function public.ranking_guard();

-- Moderación de la revisión entre compañeros
drop policy if exists "pares: instructor borra explicaciones" on public.peer_pool;
drop policy if exists "pares: instructor borra revisiones" on public.peer_reviews;
create policy "pares: instructor borra explicaciones" on public.peer_pool for delete to authenticated using (public.is_admin());
create policy "pares: instructor borra revisiones" on public.peer_reviews for delete to authenticated using (public.is_admin());
alter table public.peer_reviews add column if not exists reported boolean not null default false;
create or replace function public.report_peer_review(p_id bigint) returns void
language sql security definer set search_path = public as $$
  update public.peer_reviews r set reported = true
   where r.id = p_id and exists (select 1 from public.peer_pool p where p.id = r.pool_id and p.user_id = auth.uid()) $$;
revoke all on function public.report_peer_review(bigint) from public, anon;
grant execute on function public.report_peer_review(bigint) to authenticated;

-- Olvidé mi contraseña: el becario lo pide desde la página, el instructor lo aprueba en su panel
-- y la contraseña temporal aparece en la misma página del becario.
create table if not exists public.pw_requests (
  id bigint generated always as identity primary key,
  email text not null,
  name text,
  token_hash text not null,
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada','entregada')),
  temp_pass text,
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.pw_requests enable row level security;
drop policy if exists "contraseñas: instructor ve" on public.pw_requests;
create policy "contraseñas: instructor ve" on public.pw_requests for select to authenticated using (public.is_admin());

create or replace function public.pw_request_create(p_email text, p_name text)
returns table (req_id bigint, req_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(extensions.gen_random_bytes(18), 'hex'); n int; new_id bigint;
begin
  p_email := lower(trim(p_email));
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 120 then raise exception 'Correo inválido'; end if;
  select count(*) into n from public.pw_requests where email = p_email and created_at > now() - interval '1 hour';
  if n >= 3 then raise exception 'Ya pediste varias veces. Espera a tu instructor.'; end if;
  select count(*) into n from public.pw_requests where created_at > now() - interval '10 minutes';
  if n >= 30 then raise exception 'Demasiadas solicitudes. Intenta en unos minutos.'; end if;
  insert into public.pw_requests (email, name, token_hash)
    values (p_email, left(coalesce(p_name, ''), 60), encode(extensions.digest(t, 'sha256'), 'hex'))
    returning id into new_id;
  return query select new_id, t;
end $$;

create or replace function public.pw_request_status(p_id bigint, p_token text)
returns table (status text, temp_pass text)
language plpgsql security definer set search_path = public, extensions as $$
declare r public.pw_requests;
begin
  select * into r from public.pw_requests
   where id = p_id and token_hash = encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex');
  if not found then return query select 'no_existe'::text, null::text; return; end if;
  if r.status = 'aprobada' then
    update public.pw_requests set status = 'entregada', temp_pass = null where id = r.id;
    return query select 'aprobada'::text, r.temp_pass; return;
  end if;
  return query select r.status, null::text;
end $$;

create or replace function public.admin_pw_approve(p_id bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare r public.pw_requests; u uuid; temp text;
begin
  if not public.is_admin() then raise exception 'Solo el instructor puede hacer esto'; end if;
  select * into r from public.pw_requests where id = p_id and status = 'pendiente';
  if not found then raise exception 'La solicitud ya no está pendiente'; end if;
  select id into u from auth.users where lower(email) = r.email;
  if u is null then
    update public.pw_requests set status = 'rechazada', note = 'No existe una cuenta con ese correo', resolved_at = now() where id = p_id;
    return null;
  end if;
  temp := 'Red' || (10 + floor(random() * 89))::int || '-' || encode(extensions.gen_random_bytes(3), 'hex') || '!';
  update auth.users
     set encrypted_password = extensions.crypt(temp, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"must_change": true}'::jsonb
   where id = u;
  update public.pw_requests set status = 'aprobada', temp_pass = temp, resolved_at = now() where id = p_id;
  return temp;
end $$;

create or replace function public.admin_pw_reject(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el instructor puede hacer esto'; end if;
  update public.pw_requests set status = 'rechazada', resolved_at = now() where id = p_id and status = 'pendiente';
end $$;

revoke all on function public.pw_request_create(text, text) from public;
revoke all on function public.pw_request_status(bigint, text) from public;
revoke all on function public.admin_pw_approve(bigint) from public, anon;
revoke all on function public.admin_pw_reject(bigint) from public, anon;
grant execute on function public.pw_request_create(text, text) to anon, authenticated;
grant execute on function public.pw_request_status(bigint, text) to anon, authenticated;
grant execute on function public.admin_pw_approve(bigint) to authenticated;
grant execute on function public.admin_pw_reject(bigint) to authenticated;

-- Confirma de una vez a quien se registró cuando "Confirm email" estaba encendido
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
notify pgrst, 'reload schema';
