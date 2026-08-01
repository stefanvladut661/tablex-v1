-- ═══════════════════════════════════════════════════════════════════════════
-- Logoul restaurantului pe widget (§27.6)
--
-- `restaurants.logo_url` exista din migratia tenancy si nu era folosita
-- NICAIERI: nici incarcare, nici afisare. Restaurantul nu-si putea pune sigla
-- pe propria pagina de rezervari, desi spec-ul o promite.
--
-- Bucket PUBLIC, spre deosebire de `schite` (migratia 17), care e privat.
-- Diferenta nu e neglijenta: schita salii e un document intern al unui client,
-- vazut doar de echipa; logoul TREBUIE citit de orice vizitator anonim care
-- deschide /r/[slug], inclusiv din iframe-ul de pe site-ul restaurantului. Un
-- bucket privat ar fi cerut URL-uri semnate, care expira — adica un logo care
-- dispare dupa o ora.
--
-- Scrierea ramane insa strict a restaurantului: prima parte a caii e
-- `restaurant_id`, iar politicile o compara cu restaurantul contului. Public
-- inseamna „oricine poate CITI", nu „oricine poate pune ce vrea".
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists branding_citire_publica on storage.objects;
create policy branding_citire_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'branding');

drop policy if exists branding_scriere_restaurant on storage.objects;
create policy branding_scriere_restaurant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    -- Primul segment al caii e restaurantul: „<uuid>/logo.png".
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
    and public.is_manager()
  );

drop policy if exists branding_actualizare_restaurant on storage.objects;
create policy branding_actualizare_restaurant on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
    and public.is_manager()
  );

drop policy if exists branding_stergere_restaurant on storage.objects;
create policy branding_stergere_restaurant on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
    and public.is_manager()
  );
