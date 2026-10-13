# Connectivité App Mobile ↔ Backend & Guide de Build (EAS)

Ce document explique :
1. Comment l'app mobile (Expo/React Native) trouve et contacte le backend, en local comme en ligne.
2. Ce que fait chaque bloc du fichier `eas.json`.
3. Dans quel mode Expo nous sommes (Managed vs Prebuild).
4. Comment lancer l'app en développement.
5. Comment on génère un **APK** (déjà en place) et comment générer un **AAB** (nouveau).

---

## 1. Dans quel mode Expo sommes-nous ?

**→ Expo Managed Workflow** (pas de `expo prebuild` exécuté / pas de dossiers `android/` ou `ios/` commités).

Preuves dans le projet :
- Il n'y a **aucun dossier `android/` ni `ios/`** à la racine de [Smartvision_Mobile](.) — ce sont ces dossiers que `expo prebuild` générerait.
- [app.json](app.json) est la seule source de config native (icônes, package name, plugins...). En workflow "bare"/prebuild, cette config serait dupliquée/gérée dans du code natif (`AndroidManifest.xml`, `Info.plist`, etc.).
- La personnalisation native nécessaire (ex. autoriser le trafic HTTP en clair pour le dev local) passe par le **plugin de config** `expo-build-properties` dans [app.json:31-38](app.json#L31-L38), et non par un fichier natif édité à la main — c'est la marque du Managed Workflow.
- EAS Build effectue un **prebuild éphémère dans le cloud** à chaque build (il génère `android/`/`ios/` temporairement sur les machines EAS, compile, puis jette ces dossiers). C'est le fonctionnement normal du Managed Workflow avec EAS — ça ne veut pas dire que le projet est "prebuild" localement.

**Conséquence pratique** : pour changer quoi que ce soit de natif (permissions, nom de package, plugin natif...), on modifie [app.json](app.json) (ou on ajoute un config plugin) — on n'édite jamais de fichier natif à la main, puisqu'il n'existe pas dans le repo.

Si un jour on a besoin de code natif custom non gérable par un plugin, il faudrait lancer `npx expo prebuild` et bascule vers un workflow "bare" — ce n'est pas le cas aujourd'hui.

---

## 2. Connectivité App Mobile ↔ Backend

Toute la logique de résolution d'URL est centralisée dans un seul fichier :
[src/constants/config.ts](src/constants/config.ts) → fonction `getBaseURL()`.

### 2.1 Ordre de résolution (priorité)

```
1. process.env.EXPO_PUBLIC_API_URL   (si défini)
2. Sinon, si __DEV__ (mode dev) :
     a. IP du poste Expo (Metro) si dispo   → http://<ip-metro>:3000
     b. Sinon Web                            → http://localhost:3000
     c. Sinon Android (émulateur)            → http://10.0.2.2:3000
     d. Sinon (iOS simulateur, etc.)         → http://localhost:3000
3. Sinon (release, hors EAS)  → ONLINE_BACKEND_URL = https://api.visionsmart.fr
```

Cette fonction est appelée par :
- [src/services/api.ts](src/services/api.ts) — client Axios (REST), `baseURL` recalculée à **chaque requête** via l'intercepteur (`config.baseURL = getBaseURL();`), donc même sans redémarrer l'app le bon backend est toujours utilisé.
- [src/services/payment-socket.service.ts](src/services/payment-socket.service.ts) — client Socket.IO (temps réel, statut des paiements).

### 2.2 Connectivité en local (développement)

**Cas A — Téléphone physique via Expo Go / dev client, sur le même Wi‑Fi que le PC**

L'app détecte automatiquement l'IP du PC (`Constants.expoGoConfig?.debuggerHost` ou `Constants.expoConfig?.hostUri`, exposée par Metro, ex. `192.168.1.42:8081`) et construit `http://192.168.1.42:3000` (port backend fixe = `DEV_BACKEND_PORT = 3000`).

Prérequis :
- Backend démarré et à l'écoute sur `0.0.0.0:3000` (c'est le cas par défaut : `Smartvision_backend/src/server.ts` fait `httpServer.listen(PORT, ...)` sans restreindre l'interface, donc il écoute sur toutes les interfaces réseau, y compris l'IP Wi‑Fi du PC).
- Téléphone et PC sur le **même réseau Wi‑Fi**.
- Pare-feu Windows autorisant les connexions entrantes sur le port 3000.

**Cas B — Émulateur Android**

`10.0.2.2` est l'alias spécial de l'émulateur Android qui pointe vers `localhost` du PC hôte → `http://10.0.2.2:3000`.

**Cas C — Simulateur iOS / Web**

`localhost:3000` fonctionne directement car le simulateur/navigateur partage le réseau du Mac/PC.

**Forcer une URL précise (utile si l'auto-détection échoue, VPN, réseau complexe, etc.)**

Créer un fichier `.env` à la racine de `Smartvision_Mobile` :

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

puis relancer `npx expo start` (obligatoire : les variables `EXPO_PUBLIC_*` sont injectées au démarrage du bundler, pas à chaud).

> ⚠️ Toute variable préfixée `EXPO_PUBLIC_` est **injectée en clair dans le bundle JS** (accessible en clair dans l'APK/IPA). Ne jamais y mettre de secret — uniquement des valeurs publiques comme une URL d'API.

### 2.3 Connectivité en ligne (preview / production)

En build EAS (`preview` et `production`), `EXPO_PUBLIC_API_URL` est injectée **au moment du build** directement depuis [eas.json](eas.json) (voir §3) avec la valeur `https://api.visionsmart.fr`. Comme cette variable a la priorité n°1 dans `getBaseURL()`, l'app pointera toujours vers le backend en ligne dans ces builds, quel que soit le réseau du téléphone.

Le backend en ligne (Render ou équivalent) doit avoir le même contrat d'API (`/auth/signin`, `/payment/mesomb/collect`, etc. — voir [src/constants/config.ts](src/constants/config.ts) `API_ENDPOINTS`) et exposer Socket.IO sur le même host (`io(getBaseURL(), ...)` réutilise la même URL de base pour REST et WebSocket).

### 2.4 Authentification & session

- Le token JWT est stocké via `authStorage` ([src/utils/storage.ts](src/utils/storage.ts)) et rattaché automatiquement à chaque requête REST (`Authorization: Bearer <token>`) et au handshake Socket.IO (`auth: { token }`), vérifié côté backend dans [Smartvision_backend/src/lib/socket.io.ts](../Smartvision_backend/src/lib/socket.io.ts).
- Un `401`, ou un `403` avec message `"invalid token"`/`"token not present"`, sur une requête qui portait un Bearer déclenche une **déconnexion automatique** + redirection vers `/(auth)/login` (voir [src/services/api.ts:58-77](src/services/api.ts#L58-L77)). C'est la cause de l'avertissement dans le README : après une mise à jour du backend qui change la validation du token, il faut se déconnecter/reconnecter.
- Un `403` "métier" (ex. `/payment/mesomb/collect` refusé pour raison fonctionnelle, pas d'auth) n'entraîne **pas** de déconnexion — c'est volontairement filtré (`isBusinessForbidden`).

### 2.5 CORS (backend)

CORS ne concerne que les clients **navigateur** (le frontend Angular sur `http://localhost:4200`, ou web Expo). L'app mobile native (iOS/Android) n'est pas soumise à CORS — les requêtes Axios/Socket.IO natives ne passent pas par le moteur de restriction CORS d'un navigateur. C'est pourquoi `CORS_ORIGIN` dans le backend ([Smartvision_backend/.env.example](../Smartvision_backend/.env.example)) ne liste que des origines web (`http://localhost:4200`, `http://localhost:8081`) et n'a pas besoin de connaître l'IP du téléphone.

---

## 3. Le fichier `eas.json` expliqué

```json
{
  "cli": {
    "version": ">= 18.1.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": { ... },
    "preview": { ... },
    "production": { ... }
  },
  "submit": {
    "production": {}
  }
}
```

- **`cli.version`** : exige au moins la version 18.1.0 de `eas-cli` pour lancer un build — évite les incompatibilités de format.
- **`cli.appVersionSource: "remote"`** : le numéro de version/build (`versionCode` Android, `buildNumber` iOS) est **géré et incrémenté par les serveurs EAS**, pas lu localement depuis `app.json`. C'est ce qui permet `autoIncrement` (voir plus bas) de fonctionner de façon fiable même si plusieurs personnes buildent depuis des postes différents.
- **`build`** : définit des **profils de build** nommés, utilisés avec `eas build --profile <nom>`.

  - **`development`** :
    - `developmentClient: true` → génère un build avec le **dev client** Expo intégré (permet de se connecter à un serveur Metro local pendant le développement, contrairement à une build classique figée).
    - `distribution: "internal"` → distribution interne (lien de téléchargement direct / QR code EAS), pas sur les stores.
    - Pas de `env` défini ici → au runtime, comme c'est un build de dev, `getBaseURL()` retombera sur la logique `__DEV__` (détection IP Metro, etc.) décrite en §2.2 — normal, puisque ce profil sert justement à se connecter au backend local.

  - **`preview`** :
    - `distribution: "internal"` → même chose, pour tester en interne (QA, démo client) sans passer par le Play Store/App Store.
    - `env.EXPO_PUBLIC_API_URL: "https://api.visionsmart.fr"` → force l'app à pointer vers le **backend en ligne**, même si c'est un build de test. Utile pour tester "comme en prod" sans dépendre du réseau local.
    - `android.buildType: "apk"` → **c'est ce qui génère un `.apk`** au lieu d'un `.aab`. C'est le réglage actuellement utilisé pour vos builds APK.

  - **`production`** :
    - `autoIncrement: true` → incrémente automatiquement le `versionCode` (Android) / `buildNumber` (iOS) à chaque build de ce profil (géré côté serveur grâce à `appVersionSource: "remote"`).
    - `env.EXPO_PUBLIC_API_URL: "https://api.visionsmart.fr"` → backend en ligne, comme en preview.
    - **Pas de `android.buildType` défini** → EAS utilise le **défaut du profil production, qui est `app-bundle` (AAB)**. C'est le point important : *aujourd'hui votre profil `production` génère donc déjà un AAB si vous l'utilisez* — c'est le profil `preview` qui est configuré pour sortir un APK.

- **`submit.production`** : profil de soumission (upload automatique vers Play Store/App Store via `eas submit`), vide ici donc utilise les valeurs par défaut/credentials configurés côté compte EAS.

---

## 4. Commandes de lancement (développement)

Depuis `Smartvision_Mobile/` :

```bash
npm install              # installer les dépendances

npx expo start           # démarrer Metro (scanner le QR code avec Expo Go, ou dev client)
npm run android           # = expo start --android (ouvre sur émulateur/périphérique Android connecté)
npm run ios                # = expo start --ios (macOS uniquement)
npm run web                 # = expo start --web
```

Backend (depuis `Smartvision_backend/`), pour que le téléphone/émulateur puisse l'atteindre en local :

```bash
npm run start:dev        # ts-node-dev src/server.ts, écoute sur 0.0.0.0:3000 par défaut
```

Ou via Docker (image identique à la prod) :

```bash
docker compose -f docker-compose.local.yml up --build   # backend accessible sur http://localhost:3000
```

---

## 5. Générer un build — APK (déjà en place) vs AAB (nouveau)

### 5.1 APK (ce qui est déjà fait aujourd'hui)

Le profil `preview` a `android.buildType: "apk"` → commande :

```bash
eas build --platform android --profile preview
```

Résultat : un fichier `.apk` téléchargeable, installable directement sur un téléphone Android (`adb install`, lien direct, QR code) — pratique pour les tests internes/démos, mais **non accepté par le Google Play Store** pour une publication.

### 5.2 AAB — comment le générer maintenant

Un `.aab` (Android App Bundle) est le format **obligatoire pour publier sur le Google Play Store**. Deux façons de l'obtenir avec la config actuelle :

**Option recommandée — utiliser le profil `production` tel quel**, puisqu'il n'a pas de `buildType` défini et retombe donc sur le défaut EAS pour `production`, qui est `app-bundle` :

```bash
eas build --platform android --profile production
```

**Option alternative — créer un profil dédié explicite**, si on veut un AAB pointant vers un environnement différent (ex. AAB vers backend en ligne pour test Play Console interne, sans toucher au profil `production`). Ajouter dans [eas.json](eas.json) :

```jsonc
"build": {
  // ...profils existants...
  "preview-aab": {
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_API_URL": "https://api.visionsmart.fr"
    },
    "android": {
      "buildType": "app-bundle"
    }
  }
}
```

puis :

```bash
eas build --platform android --profile preview-aab
```

> `app-bundle` est explicitement la valeur à donner à `android.buildType` pour forcer un AAB (à l'opposé de `apk`). Sans ce champ, EAS applique son défaut par profil : `apk` pour `development`/`preview` selon la config, `app-bundle` pour `production` — c'est pourquoi le profil `production` actuel produit déjà un AAB sans modification.

### 5.3 Envoyer directement au Play Store après le build AAB

```bash
eas submit --platform android --profile production
```

Utilise le profil `submit.production` de [eas.json](eas.json) et upload le dernier AAB généré (ou un artefact spécifié) vers Google Play, en s'appuyant sur les credentials EAS déjà configurés pour ce projet (`projectId` dans [app.json:59](app.json#L59)).

---

## 6. Résumé rapide

| Besoin | Commande |
|---|---|
| Dev local (Wi‑Fi / Expo Go) | `npx expo start` (+ backend en local sur `0.0.0.0:3000`) |
| Build de test interne, backend en ligne, format APK | `eas build --platform android --profile preview` |
| Build production Play Store (AAB) | `eas build --platform android --profile production` |
| Build AAB de test explicite (si profil dédié ajouté) | `eas build --platform android --profile preview-aab` |
| Soumission au Play Store | `eas submit --platform android --profile production` |
| Forcer une URL backend précise en dev | créer `.env` avec `EXPO_PUBLIC_API_URL=http://<ip>:3000` |

**Mode Expo actuel : Managed Workflow** (pas de `android/`/`ios/` locaux, config 100% via `app.json` + plugins, prebuild géré par EAS Build en interne).
