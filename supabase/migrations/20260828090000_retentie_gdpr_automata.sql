-- ═══════════════════════════════════════════════════════════════════════════
-- Retentia GDPR ruleaza singura (§22.1)
--
-- Politica exista de la inceput: restaurants.data_retentie_ani (implicitul
-- global sta in app_settings.retentie_ani_default si se copiaza la creare).
-- Anonimizarea exista si ea (anonimizeaza_client, migratia 25) — dar DOAR
-- manuala, per client, la cerere. Spec-ul cere un job automat: clientii
-- INACTIVI de peste N ani se anonimizeaza fara sa-i ceara nimeni.
--
-- anonimizeaza_client nu se poate refolosi direct: e SECURITY INVOKER, legata
-- de current_restaurant_id() — un cron nu are cont si nu are restaurant.
-- Functia de aici e perechea ei de sistem: SECURITY DEFINER, umbla prin toate
-- restaurantele, aplica ACEEASI transformare (aceleasi coloane, aceeasi
-- ordine: intai rezervarile, apoi fisa), si nu e apelabila prin REST.
--
-- „Inactiv" = data_ultima_vizita (sau, in lipsa ei, created_at) mai veche de
-- data_retentie_ani ai restaurantului. Ruleaza zilnic la 04:30 — noaptea,
-- cand nu sta nimeni in panou.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.ruleaza_retentia_gdpr()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client record;
  v_anonimizati integer := 0;
begin
  for v_client in
    select c.id, c.restaurant_id
      from public.customers c
      join public.restaurants r on r.id = c.restaurant_id
     where coalesce(c.data_ultima_vizita, c.created_at)
           < now() - make_interval(years => r.data_retentie_ani)
       -- Garda: oricat de veche i-ar fi ultima vizita, un client cu o
       -- rezervare VIITOARE activa nu se anonimizeaza sub ea.
       and not exists (
         select 1 from public.reservations res
          where res.customer_id = c.id
            and res.data_ora > now()
            and res.status in ('pending', 'confirmata', 'sosita')
       )
  loop
    -- Aceeasi ordine ca in anonimizeaza_client: intai copiile din rezervari,
    -- abia apoi fisa — un esec la mijloc nu lasa date identificabile orfane.
    update public.reservations
       set client_nume   = 'Client anonimizat',
           telefon       = null,
           email         = null,
           note_client   = null,
           anonimizat_la = now()
     where customer_id = v_client.id
       and restaurant_id = v_client.restaurant_id
       and anonimizat_la is null;

    delete from public.customers
     where id = v_client.id and restaurant_id = v_client.restaurant_id;

    v_anonimizati := v_anonimizati + 1;
  end loop;

  return v_anonimizati;
end;
$$;

revoke execute on function public.ruleaza_retentia_gdpr() from public, anon, authenticated;

select cron.schedule(
  'retentie-gdpr',
  '30 4 * * *',
  $$select public.ruleaza_retentia_gdpr()$$
);
