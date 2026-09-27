-- =====================================================================
-- Fase 1 — Recetario: tablas de recetas, ingredientes, pasos y fotos.
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo este archivo → Run.
-- Ejecutar una sola vez (si falla a medias, avisa antes de repetir).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Función auxiliar: pone updated_at = ahora cada vez que se modifica una fila.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- RECETAS
-- user_id se rellena solo con el usuario que ha iniciado sesión (auth.uid()).
-- ---------------------------------------------------------------------
create table public.recipes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  description     text,
  servings        integer not null default 2 check (servings > 0),
  prep_minutes    integer check (prep_minutes >= 0),
  cook_minutes    integer check (cook_minutes >= 0),
  tags            text[] not null default '{}',
  is_vegetarian   boolean not null default false,
  main_ingredient text,                -- ej. "garbanzos", "calabacín" (para variar en las sugerencias)
  dish_type       text check (dish_type in (
                    'legumbre', 'pasta', 'arroz', 'verdura', 'huevo',
                    'pescado', 'carne', 'sopa', 'ensalada', 'otro')),
  photo_url       text,                -- URL pública de la foto en Storage
  source_url      text,                -- web de donde viene la receta
  notes           text,
  is_favorite     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- CATÁLOGO DE INGREDIENTES (propio de cada usuario)
-- Se rellena solo al escribir recetas. La sección sirve para agrupar la lista de la compra.
-- ---------------------------------------------------------------------
create table public.ingredients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  default_unit     text check (default_unit in ('g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta', 'pizca')),
  shopping_section text not null default 'otros' check (shopping_section in (
                     'fruteria', 'carniceria', 'pescaderia', 'lacteos',
                     'despensa', 'congelados', 'otros')),
  created_at       timestamptz not null default now()
);

-- Un mismo nombre no se repite para un usuario ("Tomate" y "tomate" cuentan como el mismo).
create unique index ingredients_user_name_idx on public.ingredients (user_id, lower(name));


-- ---------------------------------------------------------------------
-- INGREDIENTES DE CADA RECETA (una fila por línea: "200 g de garbanzos, cocidos")
-- quantity y unit pueden ir vacíos para cosas como "sal al gusto".
-- ---------------------------------------------------------------------
create table public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity      numeric check (quantity > 0),
  unit          text check (unit in ('g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta', 'pizca')),
  note          text,                  -- ej. "picado", "en dados"
  position      integer not null default 0
);

create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);


-- ---------------------------------------------------------------------
-- PASOS DE CADA RECETA, en orden (position).
-- ---------------------------------------------------------------------
create table public.recipe_steps (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position  integer not null default 0,
  text      text not null check (length(trim(text)) > 0)
);

create index recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);


-- ---------------------------------------------------------------------
-- PERMISOS: el usuario con sesión puede leer y escribir estas tablas...
-- ---------------------------------------------------------------------
grant select, insert, update, delete on
  public.recipes, public.ingredients, public.recipe_ingredients, public.recipe_steps
  to authenticated;


-- ---------------------------------------------------------------------
-- ...pero SOLO sus propias filas: Row Level Security (RLS).
-- ---------------------------------------------------------------------
alter table public.recipes            enable row level security;
alter table public.ingredients        enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps       enable row level security;

-- Recetas: solo las mías.
create policy "recetas propias" on public.recipes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ingredientes del catálogo: solo los míos.
create policy "ingredientes propios" on public.ingredients
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Líneas de ingredientes: solo si la receta es mía (y, al escribir, el ingrediente también).
create policy "lineas de ingredientes de mis recetas" on public.recipe_ingredients
  for all to authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.recipes r
            where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.ingredients i
            where i.id = ingredient_id and i.user_id = (select auth.uid())));

-- Pasos: solo si la receta es mía.
create policy "pasos de mis recetas" on public.recipe_steps
  for all to authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.user_id = (select auth.uid())));


-- ---------------------------------------------------------------------
-- FOTOS: bucket "recipe-photos" en Storage.
-- Público para LEER (quien tenga la URL exacta, que no se puede adivinar).
-- Para SUBIR/CAMBIAR/BORRAR: solo dentro de mi carpeta, que se llama como mi user_id
-- (ej. recipe-photos/<mi-id>/<foto>.jpg). Máximo 5 MB y solo imágenes.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "subir fotos a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "cambiar fotos de mi carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "borrar fotos de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
