# Matériosol — site éditable

Réplique fidèle de la structure visuelle du site de référence, adaptée à **Lydia Charpentier**, chargée de développement **Matériosol**. Le logo Déchèt’Lab de l’accueil est remplacé par le logo Matériosol fourni.

## Fonctionnalités

- Site public avec la CSS originale : accueil, présentation, carrousel du réseau, galerie, albums, lightbox, horaires, mentions légales, formulaire de contact.
- Toutes les données viennent de PostgreSQL via Drizzle ORM : textes, couleurs, navigation, images, albums, entreprises, contact, libellés et pages privées.
- Administration sécurisée à `/admin` : mot de passe serveur, session HMAC signée et cookie `httpOnly`.
- **Le site public ne change qu’en cliquant sur « Enregistrer ».** L’éditeur travaille sur un brouillon local. Un bouton distinct permet d’enregistrer uniquement le brouillon sans publier.
- Édition structurée de toutes les sections + éditeur **JSON avancé** pour les moindres propriétés.
- Galerie média et téléversement d’images JPG/PNG/WebP/GIF/AVIF et de PDF. Les fichiers sont enregistrés **dans PostgreSQL** et servis par `/api/media/<id>` : pas de lien externe, pas de stockage objet payant.
- Pages privées à `/p/<slug>` : absentes du menu, absentes du `robots.txt` et `noindex`. Chaque section de navigation peut aussi être retirée du menu et transformée en page privée.
- Messages du formulaire visibles et gérables dans l’administration.
- Sauvegarde/import JSON du contenu.

## Démarrage local

```bash
npm install
npx drizzle-kit push   # facultatif : les tables sont aussi créées automatiquement au premier accès
npm run dev
```

Variables dans `.env` :

```env
DATABASE_URL=postgresql://...
ADMIN_PASSWORD="un-mot-de-passe-long"
ADMIN_SESSION_SECRET="une-cle-aleatoire-d-au-moins-24-caracteres"
```

Le mot de passe et la clé de session ne sont jamais écrits dans le code client. Pour l’aperçu local, `.env.local` contient des identifiants de démonstration : changez-les avant toute mise en ligne. Sur Vercel, les variables définies dans *Project Settings* prennent le dessus sur les fichiers `.env*` et `.env.local` n’est pas publié grâce à `.gitignore`.

## Publication gratuite sur Vercel — une seule fois

1. Créez une base PostgreSQL gratuite chez **Neon** (ou Supabase) et copiez sa chaîne de connexion. Elle doit être **externe et persistante** : c’est elle qui permet d’enregistrer en direct sans redéploiement.
2. Poussez ce projet sur GitHub. Le fichier `.env` est exclu par `.gitignore` : ne le publiez jamais. Utilisez `.env.example` comme modèle.
3. Dans Vercel : *Add New → Project*, importez le dépôt, laissez Next.js être détecté.
4. Dans *Project Settings → Environment Variables*, ajoutez pour **Production** :
   - `DATABASE_URL` : l’URL Neon (avec `?sslmode=require` si demandé)
   - `ADMIN_PASSWORD` : une phrase longue et unique
   - `ADMIN_SESSION_SECRET` : générée avec `openssl rand -hex 32`
5. Cliquez sur **Deploy**. Les tables et le contenu initial sont créés automatiquement au premier accès. Aucune migration manuelle n’est obligatoire.
6. Vérifiez `/api/health`, puis ouvrez `/admin` et connectez-vous.

L’onglet **Publication & Vercel** de l’administration contient ce pas-à-pas, un bouton pour copier les variables et un diagnostic de la configuration.

## Modifier le site en direct, sans redéployer

Une fois le site déployé, **ne touchez plus au déploiement pour le contenu** :

1. Ouvrez `https://votre-site.vercel.app/admin`.
2. Modifiez textes, couleurs, navigation, galerie, photos ou PDF.
3. Téléversez les nouveaux fichiers depuis l’admin : ils sont enregistrés dans PostgreSQL, pas sur le disque éphémère de Vercel.
4. Cliquez sur **Enregistrer** (ou « Enregistrer et publier » dans l’onglet Publication & Vercel).
5. C’est en ligne : les pages sont rendues dynamiquement depuis la base. Les pages déjà ouvertes détectent la nouvelle version en moins de 12 secondes et se rafraîchissent seules ; les autres visiteurs voient immédiatement la nouvelle version.

`Enregistrer le brouillon` garde le travail sur le serveur **sans modifier le site public**. `Restaurer la version publiée` annule les modifications non publiées.

**Sans redéploiement** : tous les textes, thèmes, boutons de navigation, horaires, entreprises, galeries, albums, contacts, pages privées, photos et PDF téléversés, messages.

**Redéploiement nécessaire uniquement pour le code** : modifier un composant React, la CSS, ajouter un fichier directement dans `/public`, changer les variables d’environnement ou mettre à jour le projet. Dans ce cas : `git push` → Vercel redéploie automatiquement.

Aucune API payante ni service de stockage d’images n’est nécessaire. Les fichiers intégrés sont dans `public/media` ; les nouveaux téléversements sont dans la table `media_assets`.

## Sécurité

- Tous les endpoints `/api/admin/*` vérifient la session signée côté serveur.
- Le mot de passe est comparé en temps constant après hachage.
- Les téléversements sont limités à 15 Mo, filtrés par type MIME/extension et par signature binaire.
- Les fichiers servis depuis la base utilisent `X-Content-Type-Options: nosniff`.
- `/admin`, `/p/*` et `/api/*` sont exclus des robots ; l’administration et les pages privées sont en `noindex`.
- Le formulaire public comprend un honeypot anti-spam et des validations serveur.

## Pages cachées

Dans *Identité & thème → Navigation & sections masquables*, décochez « Afficher dans le menu » et cochez « Page privée » pour retirer une section de la page principale. Le bouton « Lien privé » copie son URL `/p/<slug>`.

Dans *Pages masquées*, créez des pages de documents avec PDF et choisissez si leur bouton apparaît ou non dans la navigation. Une page d’exemple est disponible à `/p/espace-pro` avec une plaquette PDF locale.
