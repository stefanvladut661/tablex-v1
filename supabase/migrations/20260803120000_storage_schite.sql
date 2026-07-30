-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 16. Bucket pentru schitele de sala (§8.4)
--
-- Restaurantul trimite o schita sau o poza a salii, iar echipa construieste
-- planul 2D din ea. Pana acum cererea putea purta doar text.
--
-- Bucket PRIVAT. Izolarea intre restaurante se face prin CALEA fisierului:
-- primul folder e restaurant_id, iar politicile compara acel folder cu
-- current_restaurant_id(). Asa un restaurant nu poate nici citi, nici scrie in
-- folderul altuia, chiar daca ghiceste numele fisierului — calea nu e un
-- secret, accesul e verificat pe server.
--
-- Limitele de dimensiune si de tip sunt pe bucket, deci se aplica pe server;
-- validarea din interfata e doar pentru un mesaj mai bun.
--
-- Verificat pe proiect, cu doua restaurante: managerul incarca doar in folderul
-- lui (200), e refuzat in folderul altuia si in radacina (RLS), citeste doar
-- fisierele lui, iar echipa TableX citeste orice. Anon: refuzat pe tot.
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'schite', 'schite', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
   set public             = false,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- ── Restaurantul: doar in folderul lui ───────────────────────────────────
create policy schite_incarcare_restaurant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'schite'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

create policy schite_citire_restaurant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'schite'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

create policy schite_stergere_restaurant on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'schite'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

-- ── Echipa TableX: citeste tot, ca sa poata desena planul ────────────────
create policy schite_citire_echipa on storage.objects
  for select to authenticated
  using (bucket_id = 'schite' and public.is_super_admin());
