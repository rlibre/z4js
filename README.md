# y4js

Framework backend : TypeScript, sources publiées telles quelles (build par x4build), Postgres ou SQLite, sécurité by design.

## Contenu actuel

- `src/config.ts` : `Config`, la classe est le schéma du fichier JSON passé par `--config=<fichier>`. Le dossier du fichier sert de référence pour les chemins relatifs. Erreurs cumulées, clés inconnues refusées, secrets dans des fichiers à part, config figée.
- `src/sqlite.ts` : accès SQLite (`node:sqlite`, sans dépendance) dans le style de postgres.js : templates étiquetés, transactions, conversions des types.
- `src/model.ts` : `Model`. Migrations de tous les modèles dans une seule transaction, avec Postgres comme avec SQLite. `onMigrate( db, version )` inspecte l'état réel de la base et renvoie la nouvelle version (stockée dans `y4_versions`). `checkAll` rejoue tout puis annule. `validateAll` bloque le démarrage en cas d'écart.
- `src/controller.ts` : `Controller` (note les routes, ne touche ni Express ni la config) et `RouteGroup` (`guarded` ou `unprotected`, montés dans le main).
- `src/ws.ts` : `WSController` (endpoints WebSocket `onOpen` / `onMessage` / `onClose`, montés dans un `RouteGroup`), tickets à usage unique de 1 s dans les groupes protégés, `createUpgradeHandler` (écouteur `upgrade` unique, `ws` en mode `noServer`).
- `src/server.ts` : `serve()`, l'assemblage du serveur à partir de la config et des groupes (HTTPS, délais, taille des corps, CORS, en-têtes de sécurité, identifiant et journal de chaque requête, fichiers statiques, WebSockets, arrêt propre).
- `src/access.ts` : utilisateurs, groupes et droits (`ressource/action`, `ressource/*`, `*`) ; `userHasAccess` avec cache de 5 s, `noAccessCheck`, `ungrantableGroups` (on ne donne pas ce qu'on n'a pas) ; contrôle en mode debug des handlers qui oublient le contrôle d'accès.
- `src/session.ts` : sessions à jetons opaques (accès 15 min dans `Authorization: Bearer`, rafraîchissement 1 h avec rotation et détection de réutilisation), garde des groupes protégés, routes `/login` (mot de passe local), `/refresh`, `/logout` et `/stepup` ; filtre `sessions.stepUp` pour les routes sensibles (identité confirmée depuis moins de 5 min, preuves extensibles).
- `src/password.ts` : hachage des mots de passe (PBKDF2-SHA256, 600 000 itérations), vérification en temps constant, rehachage quand le réglage change.
- `src/ratelimit.ts` : limiteur de débit en mémoire (fenêtre fixe, par IP ou par clé), utilisé sur `/login`, `/refresh`, les échecs par login et l'ensemble des routes de l'API.
- `src/workers.ts` : workers (`worker_threads`) enregistrés par nom dans un fichier d'entrée `workers.js`, instances multiples en option, messages dans les deux sens (`post`, `broadcast`, `call`), liste, arrêt propre.
- `src/mutex.ts` : mutex nommés partagés entre les threads (`withLock`, `tryLock`), libérés à la mort d'un worker, fermés à l'arrêt.
- `src/params.ts` : lecture d'une valeur nommée (`paramValue`, `bodyValue`, `queryValue` du `Controller`), conversion tolérante, validation stricte, type de retour déduit du type demandé.
- `src/tools.ts` : outils généraux (tests de type, chaînes, chemins d'objet, dates, UUID).
- `src/shared/` : `schema.ts` (validation des données, exposé en `y4js/schema`) et `tools.ts`, sans dépendance à Node ni au navigateur : utilisables côté serveur et côté client.
- `src/http-error.ts` : `HttpError` (statut, message par défaut, cause interne jamais envoyée).
- `src/http-handlers.ts` : 404 uniforme et gestionnaire d'erreurs central (jamais de détail interne dans la réponse).
- `src/logger.ts` : `Logger` (niveaux, une ligne par événement, destination stdout ou fichier avec `${date}`) et `SecurityLog` (même format, niveau fixe `SEC`, liste fermée d'événements, jamais filtré).

## Format des lignes de log

    <date heure UTC> <NIVEAU> <id requête ou -> <événement> [<données JSON>]

Tout ce qui précède le JSON est produit par y4js. Toute valeur venue d'un client va dans le JSON : retours à la ligne échappés, chaînes tronquées à 256 caractères.

## Vérifications

    npm install
    npm run typecheck

Le second contrôle de type compile `src/shared` sans types Node ni DOM : si un fichier partagé en dépend, il échoue.

## Principes

1. Le meilleur rapport simplicité / maintenabilité (le fil à couper le beurre).
2. Sécurité by design : refus par défaut, rien de dangereux par accident.
3. La mémoire coûte cher : on ne duplique que si c'est nécessaire.
4. On optimise, sans bourrinage ni spéculation.
5. Pas d'état global sans réflexion.
6. Toute dépendance passe par une vraie discussion (aujourd'hui en production : express 5, postgres et ws).

Ce sont des défauts, pas des interdits : on y déroge après réflexion, avec un commentaire en anglais à l'endroit concerné.
