# Démo z4js

Une petite application de notes : un backend z4js et un frontend x4js.

- `backend/` : serveur z4js (SQLite, sessions, droits, step-up, WebSocket, workers), construit par x4build.
- `frontend/` : interface x4js, construite par x4js, servie par le backend.

## Ce qu'elle montre

- Configuration par un fichier JSON (`backend/env/dev.json`), dont le dossier sert de référence pour les chemins relatifs.
- Base SQLite créée et migrée au démarrage (`users`, `groups`, `sessions`, `notes`), avec deux comptes :
  - `admin` / `admin-demo` : tous les droits (`*`) ;
  - `reader` / `reader-demo` : lecture seule (`notes/read`).
- Connexion par mot de passe, jetons d'accès et de rafraîchissement, droits vérifiés par `userHasAccess`.
- Suppression d'une note protégée par un step-up : le mot de passe est redemandé.
- Notifications en direct (WebSocket avec ticket) quand une note est créée ou supprimée.
- Comptage des mots fait par un worker (`stats`), avec un mutex partagé.
- Sauvegarde périodique de la base par un worker qui tourne jusqu'à l'arrêt (`backup`, `onRun`) : `data/backup/demo.db`, toutes les `backupMinutes` (1 par défaut).

## Installation

    cd demo/backend && npm install
    cd demo/frontend && npm install

## Lancement

    cd demo/frontend && npm run build      # frontend/dist
    cd demo/backend && npm run build       # backend/dist (main.js et workers.js)
    cd demo/backend && npm start           # http://127.0.0.1:4400

Pendant le développement, `npm run dev` dans `backend/` reconstruit et relance le serveur à chaque modification.

## Débogage avec VS Code

Configuration de lancement (`.vscode/launch.json`) :

    {
        "type": "node",
        "request": "launch",
        "name": "démo z4js",
        "cwd": "${workspaceFolder}/demo/backend",
        "program": "${workspaceFolder}/demo/backend/dist/main.js",
        "args": ["--config=env/dev.json"],
        "sourceMaps": true,
        "outFiles": ["${workspaceFolder}/demo/backend/dist/**/*.js"]
    }

La configuration est en mode `debug` : un point d'arrêt dans le worker ne le fait pas passer pour mort, et un handler qui oublie le contrôle d'accès est signalé dans le journal.
