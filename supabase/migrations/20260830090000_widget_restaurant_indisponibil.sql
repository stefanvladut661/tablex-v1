-- ═══════════════════════════════════════════════════════════════════════════
-- Widgetul deosebeste „suspendat" de „inexistent" (§16.4)
--
-- Vederile publice ascund complet un restaurant suspendat — corect pentru
-- date, dar pagina /r/[slug] ajungea sa arate „Restaurantul nu a fost gasit",
-- ca la un slug gresit. §16.4 cere explicit alt mesaj: „Acest restaurant nu
-- este disponibil momentan".
--
-- Vederea de aici divulga STRICT atat cat cere spec-ul: slug-ul, si doar
-- pentru restaurantele ne-active. Niciun nume, niciun motiv, nicio data —
-- cine stie slug-ul afla doar ca exista si ca e inchis temporar.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.restaurante_indisponibile as
  select r.slug
    from public.restaurants r
   where r.status <> 'activ';

grant select on public.restaurante_indisponibile to anon, authenticated;
