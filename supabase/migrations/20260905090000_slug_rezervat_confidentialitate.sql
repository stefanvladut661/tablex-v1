-- Ruta /confidentialitate nu poate fi furata de un restaurant
--
-- §22.1 cere o Politica de Confidentialitate, iar bifele de consimtamant din
-- signup si din widget trimit acum la ea. Ruta e de nivel 1, deci intra sub
-- regula scrisa in capul lui src/lib/rute.ts: orice segment de nivel 1 trebuie
-- sa existe si in slug_rezervate, altfel un restaurant si-ar putea lua slug-ul
-- „confidentialitate" si widgetul lui ar umbri documentul legal al platformei.
--
-- Nu e o problema teoretica: slug-ul si-l alege singur clientul, in onboarding.
insert into public.slug_rezervate (slug)
values ('confidentialitate')
on conflict (slug) do nothing;
