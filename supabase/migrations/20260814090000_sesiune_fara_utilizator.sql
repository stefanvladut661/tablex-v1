-- ═══════════════════════════════════════════════════════════════════════════
-- Un token valid pentru un utilizator sters nu mai da eroare de baza de date
--
-- Simptomul, intalnit exact asa: incerci sa-ti faci un cont de test si primesti
--
--   insert or update on table "admin_users" violates foreign key constraint
--   "admin_users_user_id_fkey"
--
-- Un mesaj de Postgres scapat pana in interfata, din care nu intelege nimeni ce
-- s-a intamplat si, mai ales, ce sa faca.
--
-- Cauza: JWT-ul traieste pana ii expira semnatura, independent de randul din
-- `auth.users`. Daca utilizatorul e sters intre timp — echipa curata conturi de
-- test, cineva isi sterge contul dintr-o alta fereastra — browserul ramane cu
-- un token perfect valid pentru un om care nu mai exista. `auth.uid()` intoarce
-- un uuid, deci verificarea `is null` din functie trece, iar abia FK-ul catre
-- auth.users opreste operatia.
--
-- Nu e un caz teoretic: s-a intamplat pe proiectul asta, dupa ce am sters
-- conturile de test folosite la verificari.
--
-- Verificarea se pune INAINTE de orice scriere. Altfel prima inserare
-- (restaurantul) reuseste, a doua cade, si desi tranzactia se anuleaza corect,
-- mesajul ramane despre o cheie straina in loc sa fie despre sesiune.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.creeaza_restaurant(
  p_nume text,
  p_slug text,
  p_nume_persoana text default null,
  p_plan plan_tip default 'start',
  p_nume_firma text default null,
  p_cui text default null,
  p_oras text default null,
  p_adresa text default null,
  p_telefon text default null,
  p_tip_locatie text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user       uuid := auth.uid();
  v_email      text;
  v_restaurant uuid;
begin
  if v_user is null then
    raise exception 'Trebuie sa fii autentificat.' using errcode = '42501';
  end if;

  -- Sesiune valida pentru un cont care nu mai exista (vezi antetul migratiei).
  select u.email into v_email from auth.users u where u.id = v_user;

  if v_email is null then
    raise exception
      'Sesiunea ta nu mai este valida: contul a fost sters. Iesi din cont si autentifica-te din nou.'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.admin_users a where a.user_id = v_user) then
    raise exception 'Contul tau este deja asociat unui restaurant.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.super_admin_users s where s.user_id = v_user) then
    raise exception 'Un cont din echipa TableX nu poate crea restaurante.' using errcode = 'P0001';
  end if;

  if not public.slug_disponibil(p_slug) then
    raise exception 'Adresa "%" nu este disponibila.', p_slug using errcode = 'P0001';
  end if;

  insert into public.restaurants (
    nume, slug, plan, nume_firma, cui, oras, adresa,
    telefon_contact, tip_locatie, email_contact, persoana_contact
  )
  values (
    p_nume, p_slug, p_plan, p_nume_firma, p_cui, p_oras, p_adresa,
    p_telefon, p_tip_locatie, v_email, p_nume_persoana
  )
  returning id into v_restaurant;

  insert into public.admin_users (restaurant_id, user_id, rol, nume, email)
  values (v_restaurant, v_user, 'manager', p_nume_persoana, v_email);

  insert into public.zones (restaurant_id, nume, ordine_afisare)
  values (v_restaurant, 'Salon', 0);

  insert into public.formular_campuri
    (restaurant_id, cheie, eticheta, tip, obligatoriu, sistem, ordine)
  values
    (v_restaurant, 'nume',        'Nume',              'text',  true,  true, 0),
    (v_restaurant, 'telefon',     'Telefon',           'text',  true,  true, 1),
    (v_restaurant, 'email',       'Email',             'text',  false, true, 2),
    (v_restaurant, 'nr_persoane', 'Numar de persoane', 'numar', true,  true, 3);

  return v_restaurant;
end;
$$;
