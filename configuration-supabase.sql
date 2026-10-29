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
-- paiements = privé ; l'ancienne lecture publique est conservée pendant
-- le déploiement, puis retirée avec la commande commentée en fin de script.
insert into storage.buckets (id, name, public)
values ('portfolio','portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('paiements','paiements', false)
on conflict (id) do update set public = false;

-- 3) AUTORISATIONS DE STOCKAGE ------------------------------------
drop policy if exists "portfolio_lecture" on storage.objects;
create policy "portfolio_lecture"
  on storage.objects for select to anon
  using (bucket_id = 'portfolio');

drop policy if exists "paiements_depot" on storage.objects;
create policy "paiements_depot"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'paiements'
    and (storage.foldername(name))[1] = 'reservations'
  );

drop policy if exists "paiements_lecture_admin" on storage.objects;
create policy "paiements_lecture_admin"
  on storage.objects for select to authenticated
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

-- 6) PHOTOS DES CILS POUR LES REMPLISSAGES ------------------------
-- Le bucket reste privé : seules les personnes connectées à l'admin
-- peuvent lire les photos. Les clientes peuvent uniquement en déposer.
alter table public.reservations
  add column if not exists photo_remplissage_path text,
  add column if not exists capture_paiement_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos-remplissage',
  'photos-remplissage',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

drop policy if exists "photos_remplissage_depot" on storage.objects;
create policy "photos_remplissage_depot"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'photos-remplissage'
    and (storage.foldername(name))[1] = 'remplissages'
  );

drop policy if exists "photos_remplissage_lecture_admin" on storage.objects;
create policy "photos_remplissage_lecture_admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos-remplissage');

-- Une seule demande active par créneau, même si plusieurs clientes
-- valident exactement au même moment. Les demandes refusées libèrent le créneau.
-- En cas d'échec, vérifier et traiter les doublons avant de relancer :
-- select date_rdv, heure_rdv, count(*) from public.reservations
-- where statut is distinct from 'refusé'
-- group by date_rdv, heure_rdv having count(*) > 1;
create unique index if not exists reservations_creneau_actif_unique
  on public.reservations (date_rdv, heure_rdv)
  where statut is distinct from 'refusé'
    and date_rdv is not null
    and heure_rdv is not null;

-- Retourne uniquement les heures occupées, sans exposer les données clientes.
-- Les demandes en attente bloquent immédiatement leur créneau.
create or replace function public.get_unavailable_booking_times(p_date date)
returns table (heure_rdv text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select occupied.heure_rdv::text
  from (
    select cb.heure_rdv
    from public.creneaux_bloques cb
    where cb.date_rdv = p_date
    union
    select r.heure_rdv
    from public.reservations r
    where r.date_rdv = p_date
      and r.statut is distinct from 'refusé'
  ) occupied
  where occupied.heure_rdv is not null;
$$;

revoke all on function public.get_unavailable_booking_times(date) from public;
grant execute on function public.get_unavailable_booking_times(date) to anon, authenticated;

create or replace function public.cleanup_unattached_booking_uploads(
  p_capture_path text,
  p_refill_path text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
begin
  if p_capture_path like 'reservations/%'
    and not exists (
      select 1 from public.reservations
      where capture_paiement_path = p_capture_path
    ) then
    delete from storage.objects
    where bucket_id = 'paiements' and name = p_capture_path;
  end if;

  if p_refill_path like 'remplissages/%'
    and not exists (
      select 1 from public.reservations
      where photo_remplissage_path = p_refill_path
    ) then
    delete from storage.objects
    where bucket_id = 'photos-remplissage' and name = p_refill_path;
  end if;
end;
$$;

revoke all on function public.cleanup_unattached_booking_uploads(text, text) from public;
grant execute on function public.cleanup_unattached_booking_uploads(text, text) to anon, authenticated;

-- Après la mise en ligne et le test du nouveau site, exécuter séparément :
-- drop policy if exists "paiements_lecture" on storage.objects;
-- Cette étape retire l'ancien accès public aux captures de paiement.

-- ✅ Terminé. Tu peux fermer cet éditeur.
