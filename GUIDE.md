# 💅 CD Beauty Lash — Guide de mise en ligne

Ton nouveau site en **une seule page**, pensé pour le téléphone : présentation, portfolio,
avis clientes et réservation. Voici comment le mettre en ligne, dans l'ordre.

---

## 📦 Ce que contient le dossier

- `index.html` → ton site (page unique)
- `logo-circle.png` → ton logo
- `admin/` → ton espace de gestion des réservations (comme avant)
- `configuration-supabase.sql` → à coller dans Supabase (étape 2)

---

## Étape 1 — Mettre les fichiers sur GitHub

> Conseil : crée un **NOUVEAU dépôt** (ex. `cd-beauty-lash-v2`) pour garder ton site
> actuel intact tant que le nouveau n'est pas validé.

1. Sur GitHub → **New repository** → nom `cd-beauty-lash-v2` → **Public** → Create.
2. **Add file → Upload files**.
3. Glisse **`index.html`**, **`logo-circle.png`** et le dossier **`admin`**.
   (Pas besoin d'uploader le fichier `.sql`.)
4. **Commit changes**.

---

## Étape 2 — Configurer Supabase (avis + portfolio + planning + réservations)

1. Va sur **supabase.com** → ton projet → menu **SQL Editor** → **New query**.
2. Ouvre le fichier `configuration-supabase.sql`, copie **tout** son contenu, colle-le.
3. Clique **Run**.

Ça crée la table des avis, les casiers de stockage (`portfolio`, `paiements` et les
photos privées des remplissages), ainsi que les tables du planning (`planning_config`
et `planning_overrides`). Les créneaux occupés comprennent les rendez-vous bloqués et
toutes les demandes qui ne sont pas refusées : dès qu'une réservation est enregistrée,
son heure disparaît des disponibilités. Le site actualise aussi les heures ouvertes
pendant qu'une cliente remplit le formulaire, et la base empêche les doubles demandes
simultanées sur le même créneau. Après la dernière étape de déploiement ci-dessous, seuls
les comptes admin connectés peuvent lire les captures de paiement.
Si le script a déjà été exécuté, tu peux le relancer : il conserve les horaires existants
et met à jour la policy d'envoi des photos de remplissage.

La table `reservations` et la table `creneaux_bloques` doivent déjà exister dans ce
projet Supabase. Si la création de l'index unique signale des doublons, vérifie les
demandes qui ont le même jour et la même heure avant de relancer le script : ne supprime
pas de demande sans confirmer qu'elle est réellement en double.

Pour éviter une interruption pendant la mise à jour : exécute d'abord le SQL, publie
ensuite le nouveau site, puis vérifie qu'une réservation test fonctionne. Enfin,
retourne dans Supabase et exécute séparément la dernière commande commentée de la section
6 (`drop policy ... "paiements_lecture"`). Elle retire l'ancien accès public aux captures
de paiement ; ne l'exécute pas avant que le nouveau site soit publié.

Si le site affiche que la table `planning_config` est introuvable, vérifie que tu as
exécuté ce script dans le projet Supabase relié au site. Si tu viens de le faire,
attends quelques instants puis recharge la page.

Si l'envoi d'une photo de remplissage affiche « new row violates row-level security
policy », relance le script SQL complet sur le bon projet Supabase afin de recréer la
policy de dépôt. Les policies autorisent les dépôts des rôles anon et authenticated,
ce qui évite l'échec si une session admin est déjà ouverte dans le navigateur. Si
l'erreur persiste, vérifie les policies Storage de `storage.objects` dans l'éditeur
SQL et assure-toi qu'aucune policy restrictive préexistante ne bloque les dépôts.
Vérifie aussi que le bucket `photos-remplissage` existe et que les tables `reservations`
et `creneaux_bloques` utilisées par ce projet sont bien celles du site.

Le lien « Mentions légales » du pied de page ouvre `mentions-legales.html`. Le statut
est indiqué comme micro-entrepreneuse (entreprise individuelle) et l'adresse
professionnelle communiquée y figure. Vérifie l'adresse officielle de Vercel dans ses
conditions et sa page de contact liées sur la page légale. Ne publie pas de numéro de
sécurité sociale : il ne doit pas figurer dans les mentions légales publiques.

---

## Étape 3 — Ajouter tes photos de portfolio

1. Dans Supabase → menu **Storage** → clique sur le casier **`portfolio`**.
2. **Upload** → sélectionne tes photos.
3. Elles apparaîtront **automatiquement** sur ton site, sans rien retoucher. ✨

(Pour en ajouter/supprimer plus tard : tu reviens juste ici.)

---

## Étape 4 — Mettre en ligne avec Vercel

1. **vercel.com** → **Add New… → Project**.
2. Importe le dépôt **`cd-beauty-lash-v2`**.
3. **Framework Preset : Other** → **Deploy**.
4. Ton site sera sur une adresse type `https://cd-beauty-lash-v2.vercel.app`.
   L'espace admin : `.../admin/admin.html`.

---

## Étape 5 — Créer le compte de connexion admin (pour ta sœur)

Dans Supabase → **Authentication → Users → Add user → Create new user** :
mets son email + un mot de passe, et **coche “Auto Confirm User”**.
C'est ce couple email/mot de passe qu'elle tapera sur la page admin.

Dans **Espace gestion → Gérer mon planning**, elle peut consulter les rendez-vous du
mois et leurs heures, définir ses horaires habituels, fermer un jour de la semaine,
ou modifier une date précise puis rétablir son horaire habituel. Les horaires enregistrés
sont appliqués au formulaire public : seuls les créneaux disponibles sont proposés.
Les heures de rendez-vous proposées sont 11 h, 12 h 30, 14 h, 16 h, 17 h 30,
19 h et 20 h. Pour proposer toute cette liste, règle les horaires du jour de 11 h à
21 h dans les horaires habituels ou l'exception du jour. Le formulaire masque les
heures dont la durée dépasse l'heure de fermeture définie.

Les horaires de départ reprennent l'exemple fourni : lundi, mardi, jeudi et vendredi
de 15 h 30 à 18 h, mercredi de 12 h à 18 h, samedi de 13 h à 18 h et dimanche de
11 h à 18 h. Le script actualise uniquement l'ancien planning de démonstration ; un
planning déjà personnalisé reste inchangé.

---

## ✏️ Personnaliser (facultatif)

Dans `index.html`, cherche le mot **MODIFIER** :
- le **nom** de la marque (variable `BRAND`)
- le texte **À propos**
- tes liens **Instagram / TikTok / Snapchat** (cherche `instagram.com`, etc.)

---

## 💡 Bon à savoir

- Les avis sont publiés **directement**. Pour en cacher un : Supabase → Table `avis` →
  mets `approuve` sur **false** pour la ligne concernée.
- La clé Supabase dans le site est une clé **publique** (`sb_publishable_…`), c'est
  normal et sans danger. Ce qui protège tes données, ce sont les autorisations
  qu'on vient de mettre en place.
