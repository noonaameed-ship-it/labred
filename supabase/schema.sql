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
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
drop policy if exists "progreso: instructor lee todo" on public.progress;
create policy "progreso: instructor lee todo" on public.progress for select to authenticated using (public.is_admin());
drop policy if exists "feedback: instructor lee" on public.feedback;
create policy "feedback: instructor lee" on public.feedback for select to authenticated using (public.is_admin());
-- Tu cuenta como instructor (agrega más correos separados por coma si hay otros instructores):
insert into public.admins (user_id)
  select id from auth.users where lower(email) in ('noonaameed@gmail.com')
  on conflict do nothing;

-- 5. Vista para el instructor: avance, explicaciones y señales de cada alumno
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
