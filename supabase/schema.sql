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

-- 4. Vista para el instructor: explicaciones de cada alumno (consúltala en el SQL Editor)
create or replace view public.explicaciones with (security_invoker = true) as
select u.email, r.name, m.key as modulo,
       (m.value->>'exp')::int as mejor_puntaje,
       (m.value->>'tries')::int as intentos,
       m.value->>'lastText' as ultima_explicacion,
       p.updated_at
from public.progress p
join auth.users u on u.id = p.user_id
left join public.ranking r on r.user_id = p.user_id
cross join lateral jsonb_each(p.data->'done') m;
revoke all on public.explicaciones from anon, authenticated;
