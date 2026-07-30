-- Ruta /demo (harta publica de demonstratie) devine segment de sistem, deci
-- niciun restaurant nu are voie sa o revendice ca slug.
insert into public.slug_rezervate (slug)
values ('demo')
on conflict (slug) do nothing;
