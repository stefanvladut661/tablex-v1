-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 07. Drepturi de execuție pe funcții (corectie)
--
-- Migratiile 05 si 06 au facut "revoke execute ... from anon", ceea ce NU
-- are efectul dorit: Postgres acorda implicit EXECUTE catre PUBLIC, iar rolul
-- anon moștenește acel grant. Verificat pe proiect: un apel anonim la
-- creeaza_restaurant ajungea in corpul functiei (era respins doar de
-- verificarea interna auth.uid(), adica prin noroc de implementare).
--
-- Forma corecta: revoke de la PUBLIC, apoi grant explicit rolurilor care au
-- nevoie. Politicile RLS se evalueaza cu rolul care interogheaza, deci
-- "authenticated" TREBUIE sa pastreze EXECUTE pe functiile helper — altfel
-- toate politicile ar cadea.
--
-- Functiile de trigger nu primesc niciun grant: privilegiul de execuție se
-- verifica la crearea triggerului, nu la fiecare declanșare.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Helper-ele folosite in politici ──────────────────────────────────────
revoke execute on function public.current_restaurant_id()  from public;
revoke execute on function public.is_manager()             from public;
revoke execute on function public.is_super_admin()         from public;
revoke execute on function public.is_super_admin_deplin()  from public;

grant execute on function public.current_restaurant_id()   to authenticated;
grant execute on function public.is_manager()              to authenticated;
grant execute on function public.is_super_admin()          to authenticated;
grant execute on function public.is_super_admin_deplin()   to authenticated;

-- ── Functii de trigger: nimeni nu le apeleaza prin API ───────────────────
revoke execute on function public.set_updated_at()                  from public;
revoke execute on function public.verifica_slug_rezervat()          from public;
revoke execute on function public.verifica_apartenenta_unica()      from public;
revoke execute on function public.verifica_capacitate_masa()        from public;
revoke execute on function public.protejeaza_camp_telefon()         from public;
revoke execute on function public.rezervare_calculeaza_interval()   from public;
revoke execute on function public.sincronizeaza_alocari_rezervare() from public;

-- ── Onboarding ───────────────────────────────────────────────────────────
revoke execute on function public.creeaza_restaurant(
  text, text, text, public.plan_tip, text, text, text, text, text, text
) from public;
revoke execute on function public.accepta_invitatie(text) from public;

grant execute on function public.creeaza_restaurant(
  text, text, text, public.plan_tip, text, text, text, text, text, text
) to authenticated;
grant execute on function public.accepta_invitatie(text) to authenticated;

-- Verificarea slug-ului si detaliile invitatiei sunt necesare inainte de
-- autentificare (formular de signup, respectiv pagina de invitatie).
revoke execute on function public.slug_disponibil(text)   from public;
revoke execute on function public.detalii_invitatie(text) from public;

grant execute on function public.slug_disponibil(text)    to anon, authenticated;
grant execute on function public.detalii_invitatie(text)  to anon, authenticated;

-- ── Rapoarte ─────────────────────────────────────────────────────────────
-- disponibilitate_mese ramane publica: widgetul anonim arata mesele libere.
revoke execute on function public.disponibilitate_mese(uuid, uuid, timestamptz, integer) from public;
grant  execute on function public.disponibilitate_mese(uuid, uuid, timestamptz, integer) to anon, authenticated;

-- Diagnosticul de conflicte e pentru manager, nu pentru public.
revoke execute on function public.verifica_conflicte_buffer(uuid, integer) from public;
grant  execute on function public.verifica_conflicte_buffer(uuid, integer) to authenticated;
