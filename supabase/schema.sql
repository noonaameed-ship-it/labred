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
