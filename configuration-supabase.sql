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

-- ✅ Terminé. Tu peux fermer cet éditeur.
