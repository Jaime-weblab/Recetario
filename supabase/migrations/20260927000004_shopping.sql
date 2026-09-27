-- =====================================================================
-- Fase 3 — Lista de la compra: tablas shopping_lists y shopping_list_items.
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo este archivo → Run. Ejecutar una sola vez.
-- =====================================================================

-- Una lista por semana (week_start = lunes de la semana).
create table public.shopping_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Artículos de la lista.
--   · Generados desde el menú: llevan ingredient_id (y la cantidad ya sumada, en g / ml / ud…).
--   · Añadidos a mano: ingredient_id vacío y el texto en custom_name.
create table public.shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  list_id          uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_id    uuid references public.ingredients (id) on delete set null,
  custom_name      text,
  quantity         numeric check (quantity > 0),
  unit             text check (unit in ('g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta', 'pizca')),
  shopping_section text not null default 'otros' check (shopping_section in (
                     'fruteria', 'carniceria', 'pescaderia', 'lacteos',
                     'despensa', 'congelados', 'otros')),
  is_checked       boolean not null default false,
  created_at       timestamptz not null default now(),
  -- Cada artículo es o de un ingrediente del catálogo o un texto escrito a mano.
  check (ingredient_id is not null or length(trim(coalesce(custom_name, ''))) > 0)
);

create index shopping_list_items_list_id_idx on public.shopping_list_items (list_id);
create index shopping_list_items_ingredient_id_idx on public.shopping_list_items (ingredient_id);

grant select, insert, update, delete on public.shopping_lists, public.shopping_list_items to authenticated;

-- RLS: solo mis listas y sus artículos.
alter table public.shopping_lists      enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "listas propias" on public.shopping_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "articulos de mis listas" on public.shopping_list_items
  for all to authenticated
  using (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.shopping_lists l
    where l.id = list_id and l.user_id = (select auth.uid())));
