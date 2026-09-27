-- =====================================================================
-- Fase 1 (fotos): permiso para "ver" mis propios archivos del bucket recipe-photos.
-- Supabase lo necesita para poder BORRAR fotos (al cambiarlas, quitarlas o borrar la receta).
-- Las fotos ya se ven por su URL pública; esto solo afecta a las operaciones de la app.
-- Cómo aplicarla: Supabase → SQL Editor → pegar → Run. Ejecutar una sola vez.
-- =====================================================================

create policy "ver fotos de mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
