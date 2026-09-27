-- =====================================================================
-- Fase 2 — Planificación semanal: tabla meal_plan_entries.
-- Cada fila = una receta asignada a un hueco (día + comida/cena).
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo este archivo → Run. Ejecutar una sola vez.
-- =====================================================================

create table public.meal_plan_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  -- Hueco del día. Para añadir más adelante otros (ej. 'desayuno'), basta con ampliar esta lista.
  meal       text not null check (meal in ('comida', 'cena')),
  -- Si se borra la receta, desaparece también de los menús.
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  servings   integer not null check (servings > 0),
  created_at timestamptz not null default now(),
  -- Un solo plato por hueco.
  unique (user_id, date, meal)
);

create index meal_plan_entries_user_date_idx on public.meal_plan_entries (user_id, date);
create index meal_plan_entries_recipe_id_idx on public.meal_plan_entries (recipe_id);

grant select, insert, update, delete on public.meal_plan_entries to authenticated;

-- RLS: solo mi menú, y solo con mis recetas.
alter table public.meal_plan_entries enable row level security;

create policy "menu propio" on public.meal_plan_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r
                where r.id = recipe_id and r.user_id = (select auth.uid())));
