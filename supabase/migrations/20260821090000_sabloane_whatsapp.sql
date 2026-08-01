-- ═══════════════════════════════════════════════════════════════════════════
-- Sabloanele de mesaje WhatsApp ale echipei (§45.2, §48)
--
-- §48 cere explicit tabela whatsapp_templates, chiar daca in v1 nu pleaca
-- niciun mesaj real (§14): e lista de referinta pe care echipa o va trimite
-- spre aprobare Meta cand se conecteaza integrarea. Fara variabile dinamice
-- si fara flow de aprobare simulat — §45.2 le exclude amandoua.
--
-- Modulul Communications e al rolului super_admin deplin (§47.4: designerul
-- n-are ce cauta la date financiare/comunicari, suportul are doar tichete),
-- deci si citirea, si scrierea raman la el.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.whatsapp_templates (
  id         uuid primary key default gen_random_uuid(),
  nume       text not null check (btrim(nume) <> ''),
  continut   text not null check (btrim(continut) <> ''),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index whatsapp_templates_recente_idx
  on public.whatsapp_templates (created_at desc);

alter table public.whatsapp_templates enable row level security;

create policy whatsapp_templates_echipa on public.whatsapp_templates
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());
