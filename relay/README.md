# Relais de signalement Truchement

Petit serveur qui reçoit les signalements de traduction envoyés par le module (captures FR et EN de la fiche, textes, versions) et les dépose dans le dépôt privé `quill-and-seal/truchement-reports` :

- captures enregistrées dans `reports/<date>/` ;
- issue intitulée `[Traduction] <Nom> — <Type>` ;
- si une issue ouverte porte déjà ce titre, le signalement y est ajouté en **commentaire**.

Le jeton GitHub reste sur le serveur : les MJ n'ont besoin ni de compte GitHub ni de jeton.

## Installation (Docker)

1. Créer un jeton GitHub à accès fin, limité au dépôt `truchement-reports`, avec les droits **Issues** et **Contents** en lecture/écriture.
2. Copier `.env.example` en `.env` et y mettre le jeton.
3. Lancer :

   ```sh
   docker compose up -d --build
   ```

4. Exposer le port 8787 en HTTPS derrière le reverse proxy (Foundry refuse d'appeler une adresse HTTP depuis une page HTTPS), par exemple `https://truchement.mon-domaine.fr`.
5. Vérifier : `https://truchement.mon-domaine.fr/health` doit répondre `{"ok":true}`.
6. Mettre cette adresse dans le module (`REPORT_URL` dans `src/report.js`, puis publier une version), ou dans le réglage « Adresse du relais de signalement ».

## Protection

- 10 signalements par adresse IP et par heure (`RATE_LIMIT`) ;
- 12 Mo maximum par signalement, 5 Mo par capture, images PNG/JPEG/WebP uniquement ;
- seule la route `POST /report` est ouverte (plus `GET /health`).
