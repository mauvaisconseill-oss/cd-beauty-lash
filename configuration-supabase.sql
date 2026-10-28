-- ============================================================
--  Configuration Supabase — nouveau site CD Beauty Lash
--  À coller dans : Supabase > SQL Editor > New query > puis "Run"
--  (tu peux tout coller d'un coup, sans risque pour ton site actuel)
-- ============================================================

-- 1) TABLE DES AVIS -----------------------------------------------
create table if not exists public.avis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nom text not null,
  note int not null check (note between 1 and 5),
  commentaire text,
  approuve boolean default true      -- mets false ici pour cacher un avis
);

alter table public.avis enable row level security;

drop policy if exists "avis_lecture_publique" on public.avis;
create policy "avis_lecture_publique"
  on public.avis for select to anon
  using (approuve = true);

drop policy if exists "avis_ajout_public" on public.avis;
create policy "avis_ajout_public"
  on public.avis for insert to anon
  with check (true);

-- 2) LES DEUX "CASIERS" DE STOCKAGE -------------------------------
-- portfolio = public (les photos s'affichent sur le site)
-- paiements = privé (captures de paiement, liens sécurisés)
insert into storage.buckets (id, name, public)
values ('portfolio','portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('paiements','paiements', false)
on conflict (id) do nothing;

-- 3) AUTORISATIONS DE STOCKAGE ------------------------------------
drop policy if exists "portfolio_lecture" on storage.objects;
create policy "portfolio_lecture"
  on storage.objects for select to anon
  using (bucket_id = 'portfolio');

drop policy if exists "paiements_depot" on storage.objects;
create policy "paiements_depot"
  on storage.objects for insert to anon
  with check (bucket_id = 'paiements');

drop policy if exists "paiements_lecture" on storage.objects;
create policy "paiements_lecture"
  on storage.objects for select to anon
  using (bucket_id = 'paiements');

-- 4) AUTORISER L'ENVOI D'UNE RÉSERVATION --------------------------
drop policy if exists "reservations_ajout_public" on public.reservations;
create policy "reservations_ajout_public"
  on public.reservations for insert to anon
  with check (true);

-- 5) PLANNING ADMINISTRABLE ---------------------------------------
create table if not exists public.planning_config (
  id integer primary key check (id = 1),
  jours jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.planning_config (id, jours)
values (
  1,
  '{
    "lundi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
    "mardi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
    "mercredi": {"ouvert": true, "debut": "12:00", "fin": "18:00"},
    "jeudi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
    "vendredi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
    "samedi": {"ouvert": true, "debut": "13:00", "fin": "18:00"},
    "dimanche": {"ouvert": true, "debut": "11:00", "fin": "18:00"}
  }'::jsonb
)
on conflict (id) do nothing;

update public.planning_config
set jours = '{
  "lundi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
  "mardi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
  "mercredi": {"ouvert": true, "debut": "12:00", "fin": "18:00"},
  "jeudi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
  "vendredi": {"ouvert": true, "debut": "15:30", "fin": "18:00"},
  "samedi": {"ouvert": true, "debut": "13:00", "fin": "18:00"},
  "dimanche": {"ouvert": true, "debut": "11:00", "fin": "18:00"}
}'::jsonb,
updated_at = now()
where id = 1
  and jours = '{
    "lundi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "mardi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "mercredi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "jeudi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "vendredi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "samedi": {"ouvert": true, "debut": "08:00", "fin": "22:00"},
    "dimanche": {"ouvert": true, "debut": "08:00", "fin": "22:00"}
  }'::jsonb;

alter table public.planning_config enable row level security;
grant select on public.planning_config to anon, authenticated;
grant insert, update, delete on public.planning_config to authenticated;

drop policy if exists "planning_config_lecture_publique" on public.planning_config;
create policy "planning_config_lecture_publique"
  on public.planning_config for select to anon, authenticated
  using (true);

drop policy if exists "planning_config_gestion_admin" on public.planning_config;
create policy "planning_config_gestion_admin"
  on public.planning_config for all to authenticated
  using (true)
  with check (true);

create table if not exists public.planning_overrides (
  date date primary key,
  ouvert boolean not null,
  debut time,
  fin time,
  updated_at timestamptz not null default now(),
  constraint planning_overrides_horaires_valides
    check (not ouvert or (debut is not null and fin is not null and fin > debut))
);

alter table public.planning_overrides enable row level security;
grant select on public.planning_overrides to anon, authenticated;
grant insert, update, delete on public.planning_overrides to authenticated;

drop policy if exists "planning_overrides_lecture_publique" on public.planning_overrides;
create policy "planning_overrides_lecture_publique"
  on public.planning_overrides for select to anon, authenticated
  using (true);

drop policy if exists "planning_overrides_gestion_admin" on public.planning_overrides;
create policy "planning_overrides_gestion_admin"
  on public.planning_overrides for all to authenticated
  using (true)
  with check (true);

-- ✅ Terminé. Tu peux fermer cet éditeur.
