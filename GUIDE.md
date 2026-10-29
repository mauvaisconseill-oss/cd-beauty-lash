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

## Étape 2 — Configurer Supabase (avis + portfolio + planning)

1. Va sur **supabase.com** → ton projet → menu **SQL Editor** → **New query**.
2. Ouvre le fichier `configuration-supabase.sql`, copie **tout** son contenu, colle-le.
3. Clique **Run**.

Ça crée la table des avis, les deux casiers de stockage (`portfolio` et `paiements`),
et les tables du planning (`planning_config` et `planning_overrides`). Si le script a
déjà été exécuté, tu peux le relancer : il conserve les horaires existants.

Si le site affiche que la table `planning_config` est introuvable, vérifie que tu as
exécuté ce script dans le projet Supabase relié au site. Si tu viens de le faire,
attends quelques instants puis recharge la page.

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
