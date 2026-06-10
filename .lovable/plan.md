# Système Top Vendeurs IA

Système de classement automatique des meilleurs vendeurs basé sur un score IA recalculé périodiquement à partir des données Supabase.

## 1. Base de données (migration)

### Nouvelle table `seller_stats`
Stocke les métriques agrégées + score IA par vendeur.
- `user_id` (uuid, PK → auth.users)
- `listings_count`, `active_listings_count` (int)
- `total_views`, `total_phone_clicks`, `total_messages` (int)
- `sales_count` (int) — annonces marquées vendues
- `response_rate` (numeric 0–1) — calculé sur messages reçus/répondus
- `avg_rating` (numeric 0–5), `positive_reviews_count` (int)
- `account_age_days` (int)
- `publish_frequency` (numeric — annonces/mois sur 90j)
- `quality_score` (numeric 0–1) — photos + description + prix présents
- `top_score` (numeric 0–100) — score IA pondéré
- `category_scores` (jsonb) — `{ "immobilier": 82.3, ... }`
- `badge` (enum: gold | silver | bronze | none)
- `rank_global` (int), `rank_category` (jsonb)
- `is_suspended` (bool, admin) — exclu du classement
- `suspension_reason` (text)
- `fraud_flags` (jsonb) — détections anti-fraude
- `last_computed_at` (timestamptz)

RLS : SELECT public (sauf si `is_suspended`), UPDATE admin only, service_role full.

### Nouvelles tables support
- `seller_reviews` : `id, seller_id, reviewer_id, rating (1–5), comment, is_verified, created_at` — RLS : insert auth + reviewer doit avoir messagé/acheté, select public.
- `listing_phone_clicks` : log des clics téléphone (`listing_id, user_id?, ip_hash, ua_hash, created_at`) pour anti-fraude — sinon compteur sur `listings`.
- Ajout sur `listings` : `sold_at timestamptz`, `phone_clicks_count int` (si absent).
- Ajout sur `profiles` : `is_top_seller_suspended bool`.

### RPC / fonctions SQL
- `public.recompute_seller_score(_user_id uuid)` (SECURITY DEFINER) — agrège tout et upsert dans `seller_stats`.
- `public.recompute_all_seller_scores()` — boucle sur les vendeurs actifs.
- `public.assign_top_badges()` — top 10 = gold (1), silver (2-3), bronze (4-10).
- `public.increment_listing_phone_click(_listing_id uuid)` — incrémente avec dédup IP/session.

### Cron (pg_cron + pg_net)
- Toutes les 24h → edge function `recompute-top-sellers`.
- Récompenses mensuelles : 1er du mois → boost gratuit 7j au #1.

## 2. Edge function `recompute-top-sellers`

- Appelle `recompute_all_seller_scores()` puis `assign_top_badges()`.
- Détection anti-fraude :
  - clics téléphone : dédup par (IP hash + UA hash + 1h fenêtre).
  - avis : ignore reviewer sans interaction (message ou achat), max 1 review/reviewer/seller.
  - comptes suspects : ratio vues/clics anormal (>50× médiane), pic d'avis 5★ en <24h, email jetable.
  - flags écrits dans `fraud_flags`, vendeurs flaggés exclus du top.

## 3. Frontend

### Nouveau composant `TopSellersWidget.tsx` (homepage)
Inséré dans `src/pages/Index.tsx` après `Listings`.
- Titre "🏆 Meilleurs vendeurs du moment"
- Fetch top 10 via `seller_stats` joint `profiles`
- Cards : avatar, nom, ville, badge or/argent/bronze, nb annonces actives, note ★, bouton "Voir le profil" → `/vendeur/:id`
- Tabs filtre par catégorie (Tous / Immobilier / Véhicules / Téléphones / Électronique / Mode / Emploi / Services).
- Carrousel embla mobile, grid 4 col desktop.
- Charte noir/or, animations subtiles framer-motion.

### Nouvelle page `/top-vendeurs` (`src/pages/TopSellers.tsx`)
Classement complet (50), filtres catégorie + ville, SEO complet.

### Page profil vendeur (`src/pages/SellerProfile.tsx` ou enrichissement existant)
- Badge IA bien visible, stats détaillées, annonces actives, avis clients.

### Badge composant `SellerBadge.tsx`
Réutilisable (or/argent/bronze) avec tooltip "Top Vendeur IA — calculé sur ventes, avis, réactivité...".

### Tracking clic téléphone
Sur `ListingDetail`, le bouton appel/WhatsApp appelle RPC `increment_listing_phone_click`.

## 4. Admin

Nouvel onglet "Top Vendeurs" dans `src/pages/Admin.tsx` :
- Composant `TopSellersAdminTab.tsx`
- Table : rang, vendeur, score, ventes, vues, note, badge, flags fraude, statut
- Actions : "Recalculer maintenant" (invoke edge fn), "Suspendre du classement" / "Réactiver", voir détail flags

## 5. Récompenses automatiques
- Le 1er de chaque mois, le top #1 reçoit :
  - `is_premium = true` sur ses annonces actives pendant 7j
  - Notification "🏆 Vous êtes Top Vendeur du mois !"
  - Badge exclusif `top_of_month` (champ sur `seller_stats`)

## 6. Formule de score (réf utilisateur)

```
TopScore = 30*sales_norm + 20*rating_norm + 15*response_rate
         + 15*views_norm + 10*age_norm + 10*quality
```
Normalisations percentile sur la cohorte des vendeurs actifs (min 1 annonce, compte > 7j).

## Fichiers

**Créés** :
- migration SQL (tables + RPC + cron)
- `supabase/functions/recompute-top-sellers/index.ts`
- `src/components/TopSellersWidget.tsx`
- `src/components/SellerBadge.tsx`
- `src/pages/TopSellers.tsx`
- `src/components/admin/TopSellersAdminTab.tsx`

**Édités** :
- `src/pages/Index.tsx` (insertion widget)
- `src/pages/Admin.tsx` (nouvel onglet)
- `src/App.tsx` (route `/top-vendeurs`)
- `src/pages/ListingDetail.tsx` (tracking clic téléphone)
- `public/sitemap.xml`

## Notes
- Le score se recalcule via cron 24h ; un bouton admin force le recalcul immédiat.
- L'anti-fraude est heuristique côté SQL/edge, pas de modèle ML externe.
- Les avis nécessitent une interaction préalable (message ou transaction) pour limiter le spam.
