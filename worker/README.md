# Authentification Google — Cloudflare Worker + D1

Backend d'authentification pour TOUT SUITE ANNONCES. Le frontend reste développé sur Lovable ;
seule l'authentification Google passe par Cloudflare.

## 1. Créer la base D1

```bash
wrangler d1 create toutsuite-auth
wrangler d1 create toutsuite-auth-dev
```

Copier les `database_id` dans `wrangler.jsonc` (production et `env.development`).

## 2. Appliquer le schéma

```bash
wrangler d1 execute toutsuite-auth --remote --file=worker/schema.sql
wrangler d1 execute toutsuite-auth-dev --local --file=worker/schema.sql
```

## 3. Google Cloud Console

Créer un identifiant OAuth 2.0 « Application Web » :

- Origine JavaScript autorisée : `https://www.toutsuiteannonces.com`
- URI de redirection autorisée (production) : `https://www.toutsuiteannonces.com/auth/google/callback`
- URI de redirection autorisée (développement) : `http://localhost:8787/auth/google/callback`

## 4. Secrets Cloudflare (jamais dans le frontend)

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put SESSION_SECRET   # openssl rand -hex 32
```

## 5. Déploiement

```bash
wrangler deploy
```

Le Worker sert aussi les fichiers statiques du site (binding `ASSETS`), donc les routes
`/auth/google`, `/auth/google/callback`, `/api/auth/me` et `/auth/logout` sont sur le même
domaine que le site — le cookie de session est `HttpOnly; Secure; SameSite=Lax`.

## 6. Promouvoir un administrateur

```bash
wrangler d1 execute toutsuite-auth --remote \
  --command "UPDATE users SET role='admin' WHERE email='vous@exemple.com'"
```

## Note sur la migration

Les données du site (annonces, favoris, paiements, notifications) restent sur le backend
Lovable actuel, dont les règles de sécurité s'appuient sur l'identité de ce backend.
L'authentification Cloudflare fonctionne donc **en parallèle** : aucun utilisateur existant
n'est supprimé, et le site continue de fonctionner pendant la migration progressive.

## Lien avec les données du site (annonces, favoris, colis)

Le Worker expose `POST /api/auth/supabase-session` : il vérifie le cookie de
session Cloudflare puis appelle la fonction `cloudflare-bridge-session` du
backend, qui retrouve (ou crée) le compte correspondant à l'email Google et
renvoie un jeton à usage unique. Le front l'échange automatiquement contre une
session backend (`src/hooks/useSupabaseBridge.tsx`), donc les règles d'accès
existantes continuent de fonctionner sans migration de données.

Variables à définir côté Cloudflare :

```bash
wrangler secret put CF_BRIDGE_SECRET     # même valeur que côté backend
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```
