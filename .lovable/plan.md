# Système de Publicités Dynamiques

Remplacer la section "Catégories populaires" sur la homepage par un carrousel de bannières publicitaires gérées par l'admin, avec stats d'impressions/clics.

## 1. Base de données

Nouvelle table `advertisements` :
- `id` (uuid), `title`, `subtitle`, `description`
- `image_url` (R2), `discount` (int %), `button_text`, `redirect_url`
- `theme_color` (hex), `animation_type` (fade|slide|zoom|glow)
- `start_date`, `end_date`, `is_active` (bool)
- `position` (int — ordre d'affichage)
- `impressions` (int), `clicks` (int)
- `created_by` (uuid → auth.users), `created_at`, `updated_at`

RLS :
- SELECT public : seulement `is_active = true` ET `now() BETWEEN start_date AND end_date`
- INSERT/UPDATE/DELETE : admin uniquement (via `has_role`)
- Fonction RPC `increment_ad_metric(ad_id, metric)` (SECURITY DEFINER) pour incrémenter impressions/clics sans exposer UPDATE.

## 2. Composant homepage

`src/components/AdCarousel.tsx` — remplace `<Categories />` dans `src/pages/Index.tsx` :
- Fetch des pubs actives (triées par `position`)
- Carrousel Embla avec autoplay 5s, pagination, swipe mobile
- Cartes premium noir/or :
  - Image en background avec gradient overlay
  - Badge réduction animé (pulse) en haut à droite
  - Titre display, sous-titre, CTA avec hover gold glow
  - Animation d'entrée selon `animation_type` (framer-motion)
- Track impression au mount, click au CTA via RPC
- Lazy loading images + `loading="lazy"`
- Fallback : si aucune pub active, on garde l'ancienne section Catégories

## 3. Admin

Nouvel onglet "Publicités" dans `src/pages/Admin.tsx` :
- Composant `AdsAdminTab.tsx` :
  - Table liste : titre, période, actif, vues, clics, CTR
  - Bouton "Nouvelle publicité" → dialog formulaire
  - Actions par ligne : éditer, activer/désactiver, supprimer
- Composant `AdFormDialog.tsx` :
  - Tous les champs (titre, sous-titre, description, image upload R2, %, CTA, lien, couleur picker, type animation select, dates, position, actif)
  - Upload image via `uploadToR2({ folder: "ads" })` (avec barre de progression existante)
  - Validation Zod

## 4. Détails techniques

- Tracking impressions : 1 par session par pub (sessionStorage guard) pour éviter inflation
- Notifications push à la création d'une pub (optionnel via trigger DB → existing `push_hook`)
- Pas de table séparée pour analytics : compteurs sur la pub suffisent pour MVP
- Pas de changement R2 (réutilise `r2-upload` existant avec folder `ads`)

## Fichiers
**Créés** : `src/components/AdCarousel.tsx`, `src/components/admin/AdsAdminTab.tsx`, `src/components/admin/AdFormDialog.tsx`, migration SQL
**Édités** : `src/pages/Index.tsx`, `src/pages/Admin.tsx`
