# Checklist de tests manuels — Ship or Die Africa

- [ ] **Login email** — connexion / inscription credentials
- [ ] **Login GitHub** — liaison compte + `githubVerified`
- [ ] **Dashboard protégé** — déconnecté → redirect `/login`
- [ ] **Création mission** — refus sans paiement (402), OK avec PAID
- [ ] **Pause** — max 3 jours, deadline prolongée
- [ ] **Ship** — URL + tagline requis ; anti re-ship / re-abandon
- [ ] **EARLY_BIRD** — un seul trophée global au premier ship
- [ ] **Avatar** — upload, crop, suppression ; fallback GitHub / initiales
- [ ] **Webhook FedaPay (sandbox)** — statut PAID + email / Telegram bienvenue
- [ ] **Cron sync** (`x-vercel-cron` ou Bearer `CRON_SECRET`) — commits / streak
- [ ] **Cron notify** — rappel quotidien + alertes J-7 / J-3 / J-1 (sans doublon)
- [ ] **Streak WAT** — commit tardif (ex. 23h30 Cotonou) compte le bon jour local
- [ ] **Telegram** — liaison `/start CODE`, toggle préférences
- [ ] **La Récolte** — projets publics SHIPPED visibles
