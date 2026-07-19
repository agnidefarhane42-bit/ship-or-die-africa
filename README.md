# ship-or-die-africa

Ship ton SaaS en 30 jours ou sors. Communauté de builders africains francophones.

## Avatars (photos de profil)

- Les utilisateurs peuvent uploader une photo de profil (JPEG / PNG / WebP, max 2 Mo).
- Stockage via **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`).
- Priorité d'affichage : upload custom → image OAuth → avatar GitHub (`github.com/{username}.png`) → initiales.
- **Pas de modération automatique** du contenu des avatars pour l'instant : seule la validation format / taille est appliquée côté serveur.
- En cas de photo problématique : signalement manuel, puis suppression directe en base (`User.avatarUrl`) ou via un futur panel admin.
