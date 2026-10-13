# Sécurité de la session mobile : token chiffré et rôles autorisés

Ce document décrit deux corrections apportées à l'application mobile avant la publication sur le Play Store :

1. **Le token de connexion est maintenant chiffré** sur le téléphone (avant, il était stocké en clair).
2. **Seuls les parents et les enseignants peuvent ouvrir une session.** Avant, un administrateur ou un élève restait bloqué sur un écran figé.

Pour chaque point : ce qui existait, le problème, ce qui a changé (fichiers et code) et le fonctionnement.

---

## 1. Le token de connexion

### 1.1 À quoi sert ce token

À la connexion, le backend vérifie l'email et le mot de passe, puis renvoie un **JWT** (JSON Web Token). C'est une chaîne signée par le serveur qui contient l'identifiant de l'utilisateur, son email et son rôle. Il est valable 7 jours (`JWT_EXPIRES_IN`).

L'application joint ce token à chaque requête, dans l'en-tête `Authorization: Bearer <token>` ([src/services/api.ts](src/services/api.ts)). Le token sert donc de **clé d'accès au compte** : quiconque le possède peut appeler l'API au nom de l'utilisateur jusqu'à son expiration, sans connaître le mot de passe.

C'est pourquoi l'endroit où il est stocké sur le téléphone compte.

### 1.2 Avant : stockage en clair dans AsyncStorage

```ts
// src/utils/storage.ts (avant)
async setToken(token: string): Promise<void> {
  const normalized = normalizeStoredToken(token);
  if (!normalized) return;
  await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, normalized); // '@auth_token'
},
```

Sur Android, AsyncStorage est une petite base SQLite dans le dossier privé de l'application (`/data/data/com.smartvision.mobile/databases/RKStorage`). Le système empêche les autres applications d'y accéder, mais **le contenu n'est pas chiffré** :

- sur un téléphone **rooté**, n'importe quel outil ou logiciel malveillant ayant les droits root peut ouvrir ce fichier et lire le token tel quel ;
- une sauvegarde de l'appareil ou une extraction forensique peut récupérer le fichier, et donc le token, en clair.

Avec ce token, un attaquant accède au compte du parent : enfants, bilans, factures. Ça contredisait aussi l'esprit de ce que l'on déclare à Google dans le formulaire *Data safety*.

### 1.3 Après : stockage chiffré avec expo-secure-store

Le token est maintenant enregistré via [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/), qui s'appuie sur les coffres-forts du système :

| Plateforme | Où est le token | Comment il est protégé |
|---|---|---|
| Android | `SharedPreferences` de l'application | Chiffré (AES-GCM) avec une clé gardée dans l'**Android Keystore** |
| iOS | **Keychain** | Chiffré par le système, lié à l'appareil |
| Web (dev uniquement) | AsyncStorage, soit `localStorage` | Pas de coffre-fort disponible dans un navigateur |

#### Comment fonctionne le chiffrement sur Android

```
            Application SmartVision                         Android Keystore
            ─────────────────────────                       (zone protégée, souvent matérielle :
                                                             TEE ou puce StrongBox)
 setToken("eyJhbGci...")                                    ┌──────────────────────────────┐
        │                                                   │ Clé AES générée À L'INTÉRIEUR│
        │  « chiffre ceci avec ta clé »                     │ du Keystore.                  │
        ├──────────────────────────────────────────────────►│ Elle n'en sort jamais :       │
        │                                                   │ aucune API ne permet de la    │
        │◄────────────────── texte chiffré ─────────────────┤ lire, seulement de l'utiliser.│
        │                                                   └──────────────────────────────┘
        ▼
 SharedPreferences (fichier sur le disque) :
   smartvision_auth_token = "kQ3v9...Zx=="   ← illisible sans la clé
```

1. Au premier enregistrement, SecureStore demande au **Keystore** de créer une clé AES. La clé est générée et stockée **dans** le Keystore. Sur la plupart des téléphones récents, c'est une zone matérielle isolée du reste du système (TEE ou StrongBox).
2. Pour enregistrer le token, SecureStore envoie la valeur au Keystore, qui la chiffre avec cette clé (AES-GCM). Seul le **résultat chiffré** est écrit sur le disque.
3. Pour relire le token, SecureStore renvoie le texte chiffré au Keystore, qui le déchiffre. Le Keystore n'accepte cette demande que de **notre** application, identifiée par son package et sa signature.

Conséquence : si quelqu'un copie le fichier (téléphone rooté, sauvegarde, extraction), il n'obtient qu'un texte chiffré inutilisable, car **la clé ne peut pas être extraite du Keystore**.

#### Ce que ça ne protège pas (à savoir)

- **Un logiciel malveillant qui s'exécute à l'intérieur de notre application** sur un téléphone rooté peut demander le déchiffrement comme le ferait l'application elle-même. Aucun stockage local ne protège contre ce cas. Le chiffrement rend en revanche impossible le simple vol du fichier.
- **Le transport** est protégé séparément, par HTTPS : `usesCleartextTraffic` est désactivé hors du profil `development`.
- **La durée de vie** : un token volé reste valable jusqu'à son expiration (7 jours). La désactivation d'un compte depuis le tableau admin coupe toutefois l'accès immédiatement, puisque le backend vérifie `isActive` à chaque requête.

### 1.4 Les fichiers modifiés

#### `package.json` : nouvelle dépendance

```json
"expo-secure-store": "~15.0.8",
```

Installée avec `npx expo install expo-secure-store`, qui choisit la version compatible avec le SDK 54.

#### `app.config.js` : plugin

```js
plugins: [
  'expo-router',
  // Token de session chiffré (Android Keystore / iOS Keychain), exclu des sauvegardes Android.
  'expo-secure-store',
  ...
],
```

**Pourquoi un plugin ?** Il configure les règles de sauvegarde Android pour **exclure** les données de SecureStore des sauvegardes Google. La clé du Keystore est liée à l'appareil : un token chiffré restauré sur un autre téléphone serait indéchiffrable. Mieux vaut ne pas le sauvegarder du tout. L'utilisateur se reconnecte simplement sur son nouveau téléphone.

**Ce module est natif**, donc il faut un nouveau build EAS. Une simple mise à jour JavaScript (OTA) ne suffit pas.

#### `src/constants/config.ts` : nom de la clé

```ts
export const STORAGE_KEYS = {
  /** Ancien emplacement du token (AsyncStorage, en clair) : lu une fois pour migration, puis effacé. */
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
} as const;

/**
 * Clé du token dans expo-secure-store (chiffré). SecureStore n'accepte que
 * [A-Za-z0-9._-] dans les clés : d'où une clé distincte de `@auth_token`.
 */
export const SECURE_TOKEN_KEY = 'smartvision_auth_token';
```

**Pourquoi une nouvelle clé ?** SecureStore refuse le caractère `@`.

#### `src/utils/storage.ts` : le cœur du changement

```ts
const useSecureStore = Platform.OS !== 'web';
let cachedToken: string | null | undefined;

async function readLegacyToken(): Promise<string | null> {
  return normalizeStoredToken(await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));
}

async function readSecureToken(): Promise<string | null> {
  try {
    const secure = normalizeStoredToken(await SecureStore.getItemAsync(SECURE_TOKEN_KEY));
    if (secure) return secure;
  } catch (error) {
    // Clé du Keystore devenue illisible (ex. restauration sur un autre appareil) :
    // on efface l'entrée, l'utilisateur devra se reconnecter.
    console.error('Error reading secure auth token:', error);
    await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch(() => undefined);
    return null;
  }

  // Migration : une version précédente stockait le token en clair dans AsyncStorage.
  const legacy = await readLegacyToken();
  if (legacy) {
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacy);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
  return legacy;
}
```

Ce code fait quatre choses :

1. **Il chiffre sur mobile et garde AsyncStorage sur le web.** `useSecureStore` vaut `false` sur le web, parce que SecureStore n'y existe pas. Le web ne sert qu'au développement, pas au Play Store.
2. **Il migre les utilisateurs existants sans les déconnecter.** Quelqu'un qui a installé une version précédente a son token en clair dans AsyncStorage. Au premier lancement de la nouvelle version, `readSecureToken` ne trouve rien dans SecureStore. Il lit alors l'ancien token, le réécrit chiffré, puis **efface la copie en clair**. Ça n'arrive qu'une fois.
3. **Il gère les erreurs.** Si le Keystore ne peut plus déchiffrer (clé invalidée, données restaurées depuis un autre appareil), on efface l'entrée et on renvoie `null`. L'utilisateur arrive sur l'écran de connexion au lieu de voir l'application planter.
4. **Il garde le token en mémoire.** `getToken()` est appelé avant **chaque** requête API par l'intercepteur axios. Passer par le Keystore à chaque fois coûterait quelques millisecondes. `cachedToken` garde la valeur en mémoire vive le temps de la session. Elle disparaît quand l'application est fermée.

```ts
export const authStorage = {
  async getToken(): Promise<string | null> {
    if (cachedToken !== undefined) return cachedToken;   // déjà lu : mémoire
    try {
      cachedToken = useSecureStore ? await readSecureToken() : await readLegacyToken();
      return cachedToken;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    const normalized = normalizeStoredToken(token);
    if (!normalized) return;
    if (useSecureStore) {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, normalized);   // chiffré
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, normalized); // web
    }
    cachedToken = normalized;
  },

  async removeToken(): Promise<void> {
    cachedToken = null;
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch((error) =>
        console.error('Error removing secure auth token:', error)
      );
    }
    // Toujours effacer aussi l'ancien emplacement en clair.
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  // getUserData / setUserData / clearAuth : voir le fichier
};
```

À la déconnexion, `removeToken()` vide **le cache mémoire, SecureStore et l'ancien emplacement**. Sur le web, `clearSessionStorageForLogout()` appelle aussi `authStorage.removeToken()` pour vider le cache mémoire, qui survivrait sinon à `AsyncStorage.clear()`.

#### Ce qui reste dans AsyncStorage, et pourquoi

Les **informations de profil** affichées dans l'application (prénom, nom, email, rôle : clé `@user_data`) restent dans AsyncStorage. Elles ne donnent **aucun accès** au compte. Sans token, impossible d'appeler l'API. Les chiffrer n'apporterait rien et ralentirait le démarrage.

### 1.5 Tester

1. **Nouvelle installation** : se connecter, fermer l'application, la rouvrir. La session doit être conservée.
2. **Mise à jour depuis l'ancienne version** : installer l'ancien build, se connecter, puis installer le nouveau build par-dessus. L'utilisateur doit rester connecté, grâce à la migration.
3. **Déconnexion** : se déconnecter, puis rouvrir l'application. L'écran de connexion doit s'afficher.
4. **Vérification technique** (émulateur avec accès root) :
   ```sh
   adb shell run-as com.smartvision.mobile cat shared_prefs/SecureStore.xml
   ```
   La valeur de `smartvision_auth_token` doit être illisible. Le nom exact du fichier peut varier selon la version du module.

---

## 2. Rôles autorisés dans l'application mobile

### 2.1 Avant

Après une connexion réussie, l'écran de login et l'écran de démarrage ne savaient router que deux rôles :

```ts
// app/(auth)/login.tsx et app/index.tsx (avant)
if (user.role === 'teacher') {
  router.replace('/(app)/(teacher)');
} else if (user.role === 'parent') {
  router.replace('/(app)/(parent)');
}
// administrator, superAdministrator, student, moderator : rien
```

Un administrateur ou un élève saisissant **des identifiants corrects** restait sur un écran qui ne réagissait plus, sans aucun message. Sa session était pourtant enregistrée. Un testeur de Google aurait conclu à un bug.

### 2.2 Après

| Situation | Message affiché |
|---|---|
| Email ou mot de passe incorrect | **Inchangé** : « Email ou mot de passe incorrect. », renvoyé par le backend |
| Identifiants corrects, rôle `parent` ou `teacher` | Connexion normale |
| Identifiants corrects, autre rôle | « Cette application est réservée aux parents et aux enseignants. Les autres comptes se connectent sur le site web SmartVision. » La session **n'est pas enregistrée** |
| Compte désactivé par un admin | « Votre compte a été désactivé… », renvoyé par le backend |

#### `src/constants/config.ts`

```ts
/** Rôles qui ont un espace dans l'application mobile. */
export const MOBILE_ROLES = ['parent', 'teacher'] as const;

/** Affiché quand un compte valide n'a pas d'espace mobile (admin, élève, etc.). */
export const UNSUPPORTED_ROLE_MESSAGE =
  'Cette application est réservée aux parents et aux enseignants. Les autres comptes se connectent sur le site web SmartVision.';
```

#### `src/stores/authStore.ts`

```ts
/** Seuls les parents et enseignants ont un espace dans l'application mobile. */
function isMobileRole(role: string | undefined): boolean {
  return (MOBILE_ROLES as readonly string[]).includes(role ?? '');
}

login: async (credentials) => {
  set({ isLoading: true, error: null });
  try {
    const response = await authService.signIn(credentials);

    // Identifiants valides mais rôle sans espace mobile (admin, élève…) : on ne garde
    // pas la session et on explique pourquoi (les erreurs d'identifiants restent inchangées).
    if (!isMobileRole(response.user?.role)) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false,
            error: UNSUPPORTED_ROLE_MESSAGE });
      return;            // ← le token n'est jamais écrit sur le téléphone
    }

    await authStorage.setToken(response.token);
    ...
```

**Pourquoi la vérification est faite ici, après la réponse du serveur ?** Il faut d'abord que le backend valide email et mot de passe : un identifiant faux donne donc toujours l'erreur habituelle. Le rôle n'est connu qu'une fois la connexion acceptée. On refuse alors simplement d'enregistrer la session.

Le même contrôle existe dans `initializeAuth()`, qui s'exécute au démarrage de l'application. Si une session d'un autre rôle avait été enregistrée par une version précédente, elle est effacée et le même message s'affiche.

#### `app/index.tsx`

Une branche `else` renvoie vers l'écran de connexion pour tout rôle inconnu. Ça garantit que l'application ne reste jamais sur un écran vide.

L'écran de connexion n'a pas été modifié : il affiche déjà le champ `error` du store, et ce champ contient maintenant le nouveau message.

---

## 3. Récapitulatif des fichiers

| Fichier | Modification |
|---|---|
| `package.json`, `package-lock.json` | Ajout de `expo-secure-store` |
| `app.config.js` | Plugin `expo-secure-store` |
| `src/constants/config.ts` | `SECURE_TOKEN_KEY`, `MOBILE_ROLES`, `UNSUPPORTED_ROLE_MESSAGE` |
| `src/utils/storage.ts` | Token chiffré, migration, cache mémoire, nettoyage à la déconnexion |
| `src/stores/authStore.ts` | Refus des rôles non mobiles à la connexion et au démarrage |
| `app/index.tsx` | Retour au login pour un rôle inconnu |

**À retenir pour le déploiement :** `expo-secure-store` est un module natif, donc il faut un **nouveau build EAS** (`eas build --platform android --profile production`).
