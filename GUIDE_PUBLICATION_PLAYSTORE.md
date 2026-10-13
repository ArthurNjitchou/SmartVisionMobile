# Guide : publier SmartVision sur le Google Play Store

Guide de référence pour revenir lire et comprendre **quoi faire, dans quel ordre, et pourquoi**, du compte développeur jusqu'à la mise en production.

Complète [CONNECTIVITE_ET_BUILD.md](CONNECTIVITE_ET_BUILD.md) (connectivité, `eas.json`, APK/AAB).

> Certains chiffres (prix, seuils de testeurs, niveau d'API cible) sont des règles Google qui changent régulièrement. Vérifier sur la Play Console ou la doc officielle avant de s'y fier.

---

## Table des matières

1. [Vue d'ensemble du parcours](#1-vue-densemble-du-parcours)
2. [Le compte Google Play Console](#2-le-compte-google-play-console)
3. [Lexique : les termes qui embrouillent](#3-lexique--les-termes-qui-embrouillent)
4. [Keystore, upload key et Play App Signing](#4-keystore-upload-key-et-play-app-signing)
5. [Créer l'application dans la Play Console](#5-créer-lapplication-dans-la-play-console)
6. [Formulaires obligatoires (App content)](#6-formulaires-obligatoires-app-content)
7. [Fiche du store (Store presence)](#7-fiche-du-store-store-presence)
8. [Générer l'AAB avec EAS](#8-générer-laab-avec-eas)
9. [Upload et Internal testing](#9-upload-et-internal-testing)
10. [Closed testing et exigence des 12 testeurs](#10-closed-testing-et-exigence-des-12-testeurs)
11. [Passage en Production](#11-passage-en-production)
12. [Mises à jour futures et `eas submit`](#12-mises-à-jour-futures-et-eas-submit)
13. [Exigences côté code avant publication](#13-exigences-côté-code-avant-publication)
14. [Trafic HTTP en clair : `usesCleartextTraffic`](#14-trafic-http-en-clair--usescleartexttraffic)
15. [`network_security_config.xml` : protéger le trafic réseau](#15-network_security_configxml--protéger-le-trafic-réseau)
16. [Checklist finale](#16-checklist-finale)
17. [Pièges fréquents](#17-pièges-fréquents)

---

## 1. Vue d'ensemble du parcours

```
Compte développeur (25 $, vérif. identité)
        │
        ▼
Créer l'app dans Play Console
        │
        ▼
Formulaires obligatoires (privacy, data safety, financial, etc.) ─┐
        │                                                          │ en parallèle
        ▼                                                          │
Build AAB avec EAS (keystore généré par EAS) ◄────────────────────┘
        │
        ▼
Upload manuel → Internal testing (sans revue, quelques minutes)
        │
        ▼
Closed testing (si compte personnel : 12 testeurs pendant 14 jours)
        │
        ▼
Demande d'accès Production → revue Google → publication
```

**Pourquoi cet ordre** : Google bloque toute publication tant que la checklist « App content » n'est pas complète, quelle que soit la qualité du code. Les points dont le délai ne dépend pas de nous (revue financière, période de test de 14 jours) doivent être lancés le plus tôt possible.

---

## 2. Le compte Google Play Console

### 2.1 Prix

- **25 USD, paiement unique** (pas d'abonnement annuel), payé par carte bancaire à la création du compte.
- Publier une app gratuite ne coûte rien de plus. Google prélève une commission uniquement si l'app vend des services ou contenus **via Google Play Billing**.
- Les paiements MeSomb (mobile money) de SmartVision sont des paiements de services hors de Google Play Billing : à déclarer correctement dans « Financial features » (voir §6).

### 2.2 Compte personnel ou organisation

| | Personnel | Organisation |
|---|---|---|
| Identité demandée | Pièce d'identité + adresse | Numéro D-U-N-S, documents de l'entreprise |
| Test obligatoire avant Production | **Oui : 12 testeurs pendant 14 jours consécutifs** | Non |
| Nom affiché sur le store | Nom légal de la personne | Nom de l'organisation |

**Pourquoi c'est important** : le type de compte a été choisi par l'ami qui l'a créé. Si c'est un compte personnel créé après novembre 2023, l'étape du §10 est obligatoire et ajoute au minimum 14 jours au calendrier. Il faut le vérifier **dès maintenant**, dans Play Console → **Settings → Account details**.

### 2.3 Création (pour référence)

1. Aller sur `play.google.com/console` avec un compte Google.
2. Choisir le type de compte (personnel / organisation).
3. Payer les 25 USD.
4. Vérifier l'identité (pièce, parfois vidéo, délai de quelques jours) et un numéro de téléphone.
5. Vérifier aussi l'appareil Android via l'app Play Console si demandé.

### 2.4 Notre situation : invité en Administrateur

Le compte a été créé par un ami, qui nous a invité avec le rôle **Administrateur**. Pas besoin de recréer un compte ni de repayer.

- Avec Admin, on a accès à tout : fiche du store, formulaires, releases, testeurs.
- Rester attentif : le propriétaire du compte est responsable légalement de l'app et des paiements Google. Convenir avec lui de qui reçoit les emails de Google (rejets, alertes de conformité).
- Si un jour un rôle limité pose problème, il faut au minimum : **App content, Store presence, Testing, Release**.

---

## 3. Lexique : les termes qui embrouillent

### 3.1 APK vs AAB

| | APK | AAB (Android App Bundle) |
|---|---|---|
| Usage | Installation directe, tests internes | **Format obligatoire pour publier sur Play Store** |
| Profil EAS | `preview` (`buildType: "apk"`) | `production` (défaut EAS) |

### 3.2 Compte de service Google (service account)

Ce n'est **pas** un compte Gmail. C'est un compte technique créé dans Google Cloud, destiné à un programme, qui s'authentifie avec un fichier de clé JSON.

- **Utilité unique** : permettre à `eas submit` d'envoyer l'AAB automatiquement au Play Store depuis le terminal.
- **Pas nécessaire pour la première publication** (on uploade à la main). À configurer plus tard, quand on voudra automatiser les mises à jour.

### 3.3 Les canaux de test et de diffusion

```
Internal testing → Closed testing → Open testing → Production
```

| Canal | Revue Google | Public | Usage |
|---|---|---|---|
| Internal testing | Non (disponible en minutes) | Jusqu'à 100 testeurs listés par email | Vérifier vite que le build signé fonctionne |
| Closed testing | Oui | Testeurs invités (listes/groupes) | Test pré-lancement, **requis pour les comptes personnels** |
| Open testing | Oui | Quiconque rejoint via le store | Bêta publique (optionnel) |
| Production | Oui, complète | Tout le monde | Lancement |

### 3.4 Qui fait quoi pour Internal testing

- **Nous (Admin)** : créons la release, uploadons l'AAB, ajoutons les emails des testeurs.
- **Testeurs** : reçoivent un lien d'opt-in, l'acceptent, installent l'app depuis le Play Store.

---

## 4. Keystore, upload key et Play App Signing

C'est la partie la plus confuse. **Beaucoup de tutoriels (keytool, Android Studio) ne s'appliquent pas à notre projet.**

### 4.1 Pourquoi les tutoriels `keytool` / Android Studio ne nous concernent pas

Ils supposent un dossier `android/` natif dans le projet (« ouvre le dossier android dans Android Studio »). SmartVision est en **Expo Managed Workflow** : ce dossier n'existe pas dans le repo. **EAS Build remplace tout ce processus manuel.** On ne lance jamais `keytool` nous-mêmes.

### 4.2 Les deux clés

| Clé | Qui la génère / garde | Rôle |
|---|---|---|
| **Upload key** (le « keystore » des tutoriels) | **EAS** la génère et la stocke (chiffrée, liée au `projectId` de [app.json](app.json)) | Prouver à Google que c'est bien nous qui envoyons l'AAB |
| **App signing key** | **Google** (via Play App Signing) | Signe ce que les utilisateurs installent réellement |

### 4.3 Play App Signing

Google reçoit l'AAB signé avec notre clé d'upload, puis le **re-signe avec sa propre clé** avant de le distribuer.

- **Obligatoire** pour toute nouvelle app : on ne peut pas le refuser.
- **S'active automatiquement** au premier upload d'AAB (un écran de confirmation apparaît).
- **Avantage concret** : si la clé d'upload EAS est perdue, Google peut en réémettre une. Sans Play App Signing, une clé perdue obligerait à republier sous un nouveau nom de package et à perdre tous les utilisateurs.
- Vérification ensuite : **Release → Setup → App signing**.

### 4.4 Ce qu'on fait concrètement

Au premier `eas build --platform android --profile production`, EAS demande :

```
? Generate a new Android Keystore? (Y/n)
```

→ Répondre **Yes**. C'est tout. La clé est réutilisée automatiquement pour les builds suivants.

**Sauvegarde recommandée** (rassurant, pas obligatoire) :

```bash
eas credentials      # choisir Android → consulter / télécharger le keystore
```

Garder cette copie dans un endroit sûr (gestionnaire de mots de passe, jamais dans Git).

---

## 5. Créer l'application dans la Play Console

Play Console → **Create app** :

| Champ | À renseigner |
|---|---|
| Nom de l'app | Nom affiché sur le store (ex. SmartVision) |
| Langue par défaut | Français |
| App ou jeu | App |
| Gratuite ou payante | Gratuite (⚠️ ce choix est **définitif**) |
| Déclarations | Politique du développeur et lois d'exportation US : cocher |

**Nom de package** : c'est l'identifiant Android défini dans [app.json](app.json) (`android.package`). Il est **définitif** une fois l'app publiée. Le vérifier avant le premier upload.

---

## 6. Formulaires obligatoires (App content)

Tout est dans Play Console → votre app → **Policy and programs → App content** (ou le menu **Dashboard → Set up your app**). La page affiche une checklist : coches vertes = fait.

**Ordre conseillé** : commencer par ceux dont le délai est incertain (Financial features), puis les autres.

| Formulaire | Emplacement dans le menu | Notes pour SmartVision |
|---|---|---|
| **Privacy policy** | Store presence → Main store listing (champ en bas) et App content | Une route `/privacy` existe déjà dans le frontend Angular. Vérifier qu'elle est publique (sans login) sur le domaine de prod, et y ajouter les données collectées par l'app mobile et le partage avec MeSomb |
| **Financial features** | App content → Financial features | L'app fait des paiements mobile money (`/payment/mesomb/collect`). Catégorie sensible pouvant déclencher une revue plus longue et des justificatifs. **À lancer en premier** |
| **Data safety** | App content → Data safety | Déclarer : identité, email/téléphone, données financières ; chiffrement en transit (HTTPS) : oui ; partage avec un tiers : oui (MeSomb). Une déclaration inexacte est un motif de rejet ou de suspension |
| **Suppression de compte** | App content → Account deletion | Obligatoire pour toute app avec comptes. Le web l'a déjà (paramètres parent/enseignant) : renseigner ce lien |
| **Content ratings (IARC)** | App content → Content ratings | Questionnaire, détermine l'âge minimum affiché |
| **Target audience** | App content → Target audience and content | **Décision produit** : si des enfants de moins de 13 ans utilisent directement l'app (rôle élève), la politique « Families » s'ajoute avec des contraintes supplémentaires. À trancher avec le propriétaire du compte avant de remplir |
| **Ads** | App content → Ads | Déclarer si l'app contient des publicités |
| **App access** | App content → App access | L'app n'a qu'un écran de connexion : fournir des comptes de démo à Google, sinon rejet quasi certain. Voir §6.1 |

**Permissions Android** : à la dernière vérification, [package.json](package.json) ne contient aucune dépendance sensible (`expo-camera`, `expo-location`, `expo-contacts`...). Il n'y a donc pas de formulaire de justification de permission à remplir. À revérifier si de telles dépendances sont ajoutées plus tard.

### 6.1 App access : comptes de démo pour les testeurs Google

**Notre modèle** : il n'y a pas d'inscription publique. L'app est réservée aux familles (et enseignants) sous contrat avec SmartVision. Un admin crée le compte avec un mot de passe temporaire, l'utilisateur reçoit un email avec un lien `…/reset-password?token=…` (site web) pour choisir son mot de passe, puis se connecte dans l'app.

**C'est accepté par Google** : beaucoup d'apps (écoles, banques, apps métier) n'ont qu'un écran de connexion. Pas besoin d'ajouter une inscription. En revanche, le testeur Google doit pouvoir entrer dans l'app : c'est le rôle du formulaire **App access**.

**Pas d'« app privée »** : la distribution privée (Managed Google Play) ne fonctionne que sur des appareils gérés par une entreprise (EMM), pas sur les téléphones personnels des parents. On reste sur une fiche publique avec écran de connexion.

#### Préparer les comptes

| Compte | Pourquoi |
|---|---|
| `demo.parent@smartvision.education` | Compte principal de revue |
| `demo.parent2@smartvision.education` | Secours : si le mot de passe du premier est changé ou le compte bloqué pendant une revue |
| `demo.enseignant@smartvision.education` | Si l'espace enseignant est utilisé, Google doit pouvoir le voir aussi |

Pour chaque compte :
1. Le créer depuis l'admin comme un vrai client, idéalement dans une **agence de test** (pour ne pas mélanger avec les vraies données).
2. **Finaliser soi-même le mot de passe** via le lien reçu par email. Le testeur Google ne doit jamais recevoir un mot de passe temporaire ni avoir à ouvrir un email.
3. **Remplir avec des données réalistes** : 1 ou 2 enfants liés, des notes, un rapport, une facture (et des élèves / un rapport pour l'enseignant). Un compte vide donne l'impression d'une app cassée → risque de rejet pour « fonctionnalité limitée ».

#### Remplir le formulaire

Play Console → **App content → App access** → **« All or some functionality in my app is restricted »** → ajouter une instruction par compte (nom, email, mot de passe) et une note, par exemple :

> L'application est réservée aux familles et enseignants ayant un contrat avec SmartVision. Les comptes sont créés par notre équipe : il n'y a pas d'inscription publique. Utilisez les identifiants ci-dessus, aucune vérification par email ou SMS n'est nécessaire.
> Le paiement des factures passe par mobile money (MeSomb, opérateurs camerounais) : il nécessite un numéro mobile money réel au Cameroun et ne peut pas être testé hors de ce pays. Le reste de l'application est entièrement accessible.

#### Après la publication

- **Ne jamais changer le mot de passe ni supprimer ces comptes** : Google refait une revue à chaque mise à jour. Si un compte est supprimé par un testeur, le recréer et mettre à jour le formulaire avant la release suivante.
- Les exclure des statistiques et des relances (emails, factures réelles).

#### Cohérence avec la fiche du store

Annoncer dès la **description courte** que l'app est réservée aux clients, ex. : *« Application réservée aux familles accompagnées par SmartVision. »* Ça évite des avis négatifs (« impossible de créer un compte ») et confirme au testeur que l'écran de connexion seul est voulu. On peut aussi limiter les **pays de distribution** à ceux où SmartVision a des clients.

#### Mot de passe oublié

L'écran de connexion mobile a un lien **« Mot de passe oublié ? »** : il envoie le lien de réinitialisation à l'email saisi (`POST /auth/send-email`, même endpoint que le site web), puis l'utilisateur choisit son nouveau mot de passe sur la page web `/reset-password`. Le message affiché est le même que l'email existe ou non (ne révèle pas quels comptes existent).

#### Suppression de compte et comptes créés par l'organisation

La règle Google sur la suppression de compte vise les apps qui permettent de **créer** un compte depuis l'app. Ce n'est pas notre cas : les comptes sont créés par l'administration. **Décision : pas de bouton de suppression dans l'app mobile** (il a été retiré), pour ne pas effacer factures et paiements d'un parent sous contrat. La suppression se fait sur demande à contact@smartvision.education : l'équipe **désactive** le compte depuis le tableau admin (bouton « Désactiver »). L'utilisateur est déconnecté immédiatement (web et mobile, via Socket.IO) et ne peut plus se reconnecter. Le super admin peut aussi **supprimer définitivement** le compte depuis son tableau (bouton « Supprimer »). Page publique pour la Play Console : `https://www.smartvision.education/suppression-compte`. Dans Play Console → **App content → Account deletion**, indiquer que l'app ne permet pas de créer de compte. La politique de confidentialité doit tout de même expliquer comment demander la suppression (email de contact).

#### Closed testing (§10)

Pour la règle des 12 testeurs pendant 14 jours, inviter **de vrais parents sous contrat** : ils ont déjà un compte, et le test est réaliste.

---

## 7. Fiche du store (Store presence)

Play Console → **Grow users → Store presence → Main store listing**. À préparer :

| Élément | Exigence typique |
|---|---|
| Nom | 30 caractères max |
| Description courte | 80 caractères max |
| Description complète | 4000 caractères max |
| Icône | 512×512 px, PNG |
| Image de présentation (feature graphic) | 1024×500 px |
| Captures d'écran téléphone | Minimum 2 (idéalement 4 à 8) |
| Catégorie et email de contact | Obligatoires |
| URL de la politique de confidentialité | Obligatoire |

Ces dimensions peuvent évoluer : la Play Console affiche les contraintes exactes à côté de chaque champ.

---

## 8. Générer l'AAB avec EAS

Depuis `Smartvision_Mobile/` (eas-cli déjà installé, version 18.1.0, conforme à `cli.version` de [eas.json](eas.json)) :

```bash
eas login                                              # si pas déjà connecté
eas build --platform android --profile production
```

- Le profil `production` n'a pas de `buildType: "apk"` : il produit donc un **AAB** par défaut.
- `autoIncrement: true` + `appVersionSource: "remote"` : le `versionCode` s'incrémente tout seul côté EAS. Google refuse deux uploads avec le même `versionCode`, donc ce réglage évite l'erreur.
- `EXPO_PUBLIC_API_URL` est injectée depuis `eas.json` : l'app pointera vers `https://api.visionsmart.fr`.
- À la fin, EAS affiche un lien pour télécharger le `.aab`.

**Avant de builder**, vérifier :
- [ ] `android.package`, `version` et icônes corrects dans [app.json](app.json)
- [ ] Le backend de production est en ligne et répond
- [ ] Niveau d'API cible : Google impose un minimum pour les nouvelles apps, qui monte chaque année. Expo SDK 54 le respecte normalement, mais la Play Console le signale à l'upload si ce n'est pas le cas

---

## 9. Upload et Internal testing

### 9.1 Pourquoi un upload manuel la première fois

`eas submit` demande un compte de service Google (voir §3.2), donc une configuration Google Cloud qui ne rapporte rien tant que l'app n'a pas été acceptée une première fois. On téléverse donc l'AAB **à la main**.

### 9.2 Étapes

1. Télécharger le `.aab` depuis le lien EAS (ou `expo.dev` → projet → Builds).
2. Play Console → **Testing → Internal testing**.
3. Onglet **Testers** : créer une liste d'emails (les nôtres, celui du propriétaire, un collègue) → enregistrer.
4. **Create new release** → uploader le `.aab`.
5. Accepter l'activation de **Play App Signing** (écran de confirmation, voir §4.3).
6. Renseigner le nom de la release et les notes → **Save → Review release → Start rollout**.
7. Copier le **lien d'opt-in** (onglet Testers) et l'envoyer aux testeurs.

### 9.3 Ce qu'il faut tester

Sur un vrai build signé par Google (différent de notre APK `preview`) :
- [ ] Connexion contre `api.visionsmart.fr`
- [ ] Paiement MeSomb jusqu'au bout, et retour dans l'app (`smartmobile://payments`)
- [ ] Notifications / Socket.IO (statut de paiement en temps réel)
- [ ] Déconnexion

**Pourquoi avant Production** : un bug trouvé ici ne coûte rien. En Production, il ferait perdre un cycle de revue Google (potentiellement plusieurs jours pour du financier).

---

## 10. Closed testing et exigence des 12 testeurs

**S'applique uniquement si le compte est personnel et créé après novembre 2023** (voir §2.2). Un compte organisation en est dispensé.

Règle : avant de pouvoir demander l'accès à la Production, il faut avoir mené un test fermé avec **au moins 12 testeurs inscrits en continu pendant 14 jours consécutifs**.

### Démarche

1. Play Console → **Testing → Closed testing** → créer une release (on peut réutiliser l'AAB déjà uploadé).
2. Constituer un groupe d'**au moins 12 personnes** (avec marge : viser 15 à 20, car certains se désinscrivent), leur envoyer le lien d'opt-in. Ils doivent installer l'app et la garder.
3. Attendre **14 jours** sans descendre sous 12 testeurs.
4. Le tableau de bord affiche ensuite **Apply for production** : répondre au questionnaire (comment le test s'est passé, retours reçus, corrections faites).

**Pourquoi Google impose ça** : réduire les apps publiées sans test réel. Pour nous, c'est un délai incompressible : **prévoir ce calendrier dès maintenant**, sans attendre que le reste soit terminé.

---

## 11. Passage en Production

1. Toute la checklist **App content** en vert, fiche du store complète.
2. (Compte personnel) demande d'accès Production acceptée (§10).
3. **Release → Production → Create new release** : sélectionner l'AAB (déjà dans la bibliothèque) ou en uploader un nouveau.
4. Choisir les pays de distribution.
5. **Review release → Start rollout to Production**.
6. Revue Google : de quelques heures à plusieurs jours (plus long pour le volet financier). Le résultat arrive par email et dans la section **Publishing overview**.

Une fois approuvée, l'app devient visible sur le Play Store, généralement en quelques heures.

**Si rejet** : l'email et **Policy status** donnent le motif exact. On corrige (formulaire, politique, build) et on renvoie. Les rejets les plus courants : politique de confidentialité inaccessible, Data safety inexacte, suppression de compte introuvable.

---

## 12. Mises à jour futures et `eas submit`

Pour chaque nouvelle version : modifier le code → `eas build --platform android --profile production` (le `versionCode` s'incrémente seul) → upload sur Production.

**Automatiser avec `eas submit`** (optionnel, après la première publication) :

1. Google Cloud Console : créer un **compte de service** et télécharger sa clé JSON.
2. Play Console → **Users and permissions** : inviter l'email du compte de service avec les droits de release.
3. Renseigner le chemin de la clé dans [eas.json](eas.json) :

```jsonc
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "production"
    }
  }
}
```

4. Lancer :

```bash
eas submit --platform android --profile production
```

⚠️ Ne jamais commiter le fichier JSON : l'ajouter à `.gitignore`. Cette étape est à faire avec le propriétaire du compte, qui a accès à Google Cloud.

---

## 13. Exigences côté code avant publication

Les formulaires Play Console ne suffisent pas : Google vérifie aussi que le code fait ce que l'on déclare.

| Obligation | Pourquoi c'est côté code |
|---|---|
| Suppression de compte réellement fonctionnelle | Si le formulaire « Account deletion » annonce un mécanisme qui ne fait rien, Google le teste et rejette l'app |
| Pas de trafic HTTP en clair en production | Faille de sécurité réelle dans l'AAB distribué, et contradiction avec « chiffré en transit » dans Data safety |
| Stockage sécurisé des données sensibles | Doit correspondre à ce qui est déclaré dans Data safety |
| Target API récent, 64-bit | Vérifié techniquement à l'upload de l'AAB |
| Permissions minimales | Toute permission sensible du manifest doit être justifiée |
| `versionCode` cohérent | Un doublon est refusé à l'upload |

### 13.1 Déjà bon, rien à faire

- Aucune permission Android sensible (pas de caméra, localisation, contacts).
- Aucun SDK d'analytics, de publicité ou de crash reporting dans le mobile : Data safety ne concerne que nos propres données (identité, paiement) et MeSomb.
- Target API, 64-bit, edge-to-edge : gérés par Expo SDK 54 (`edgeToEdgeEnabled: true` dans [app.json](app.json)).
- `appVersionSource: "remote"` et `autoIncrement: true` dans [eas.json](eas.json) : pas de doublon de `versionCode`.

### 13.2 ✅ Résolu (décision) : pas de suppression de compte dans l'app mobile

Les comptes étant créés par l'administration, le bouton « Supprimer mon compte » a été retiré du mobile. Voir §6.1 « Suppression de compte et comptes créés par l'organisation ». La section ci-dessous est conservée pour l'historique.

#### Historique

État constaté dans les trois dépôts :

| Couche | État |
|---|---|
| Backend | `DELETE /user/:userId` existe, mais protégé par `requireAdminLevel` : seul un admin peut l'appeler, pas l'utilisateur sur son propre compte |
| Web (Angular) | Le bouton « Supprimer mon compte » des paramètres (`settings.component.ts`, `deleteAccount()`) affiche une confirmation puis fait un `console.log` : rien n'est supprimé |
| Mobile | Aucun bouton. [profile.tsx](app/(app)/(parent)/profile.tsx) n'a que la déconnexion |

À implémenter :
1. **Backend** : un endpoint self-service (ex. `DELETE /user/me`) authentifié par le token de l'utilisateur, sans `requireAdminLevel`, qui réutilise `deleteUserService`.
2. **Mobile** : bouton « Supprimer mon compte » dans `profile.tsx` et `teacherprofile.tsx`, avec `Alert.alert` de confirmation, appel du nouvel endpoint, puis déconnexion et retour au login.
3. **Web** : brancher le stub sur ce même endpoint.

Ensuite, renseigner dans Play Console (**App content → Account deletion**) une URL décrivant comment demander la suppression.

### 13.3 🟠 Sécurité à corriger

- **`usesCleartextTraffic: true` s'applique à toutes les builds**, production comprise (voir §14).
- **Le token JWT est stocké dans AsyncStorage** (`src/utils/storage.ts`), non chiffré sur Android (lisible sur un appareil rooté). Migrer au minimum le token vers `expo-secure-store` (Android Keystore / iOS Keychain).

### 13.4 🟡 Mineur

Aucun lien vers la politique de confidentialité dans l'app mobile. Pas obligatoire (l'URL dans Play Console suffit), mais un lien dans le profil renforce la cohérence de la déclaration Data safety.

---

## 14. Trafic HTTP en clair : `usesCleartextTraffic`

### 14.1 Ce que c'est

Attribut de la balise `<application>` du `AndroidManifest.xml` qui indique si l'app peut utiliser du trafic **non chiffré (HTTP)** :

```xml
<application android:usesCleartextTraffic="true" ...>
```

| Valeur | Effet |
|---|---|
| `true` | Les requêtes `http://` sont autorisées |
| `false` | Seul `https://` est autorisé |

Depuis Android 9 (API 28), la valeur par défaut est **`false`**. Une requête HTTP bloquée échoue avec `CLEARTEXT communication to ... not permitted by network security policy`.

### 14.2 Notre situation

Nous n'avons pas de `AndroidManifest.xml` (Managed Workflow, voir [CONNECTIVITE_ET_BUILD.md](CONNECTIVITE_ET_BUILD.md)). Il est généré par EAS à partir de [app.json](app.json), où on a :

```json
["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
```

**Pourquoi il est là** : en développement local, le backend tourne en `http://192.168.x.x:3000` ou `http://10.0.2.2:3000`, ce qui exige d'autoriser le HTTP.

**Pourquoi c'est un problème** : ce réglage s'applique à **toutes** les builds. Le `preview` et le `production` pointent déjà vers `https://api.visionsmart.fr`, mais l'AAB publié autorise quand même le HTTP. Pour une app qui traite des paiements, c'est une porte ouverte inutile (attaque de type interception sur un Wi-Fi public), et cela contredit « données chiffrées en transit » dans Data safety.

### 14.3 Correction : l'activer uniquement en développement

`app.json` est statique et ne sait pas quel profil EAS est en cours. Il faut le convertir en `app.config.js`, qui lit la variable `EAS_BUILD_PROFILE` fournie par EAS :

```js
// app.config.js
const base = require('./app.json').expo;

const isDevBuild =
  process.env.EAS_BUILD_PROFILE === 'development' ||
  !process.env.EAS_BUILD_PROFILE; // expo start en local

module.exports = () => ({
  ...base,
  plugins: [
    ...base.plugins.filter(
      (p) => !(Array.isArray(p) && p[0] === 'expo-build-properties')
    ),
    ['expo-build-properties', { android: { usesCleartextTraffic: isDevBuild } }],
  ],
});
```

Le profil `development` de [eas.json](eas.json) autorise le HTTP local ; `preview` et `production` le bloquent.

**À vérifier après changement** : le `preview` (APK) doit toujours se connecter à `https://api.visionsmart.fr`. Si une requête HTTP subsiste quelque part, elle échouera et révélera le problème avant la publication.

---

## 15. `network_security_config.xml` : protéger le trafic réseau

### 15.1 Ce que c'est

Un fichier XML, placé dans `android/app/src/main/res/xml/`, référencé dans le manifest :

```xml
<application android:networkSecurityConfig="@xml/network_security_config" ...>
```

Il donne une politique réseau **plus fine** que le booléen `usesCleartextTraffic` : par domaine, avec gestion des certificats. Si les deux sont présents, `network_security_config.xml` est prioritaire sur `usesCleartextTraffic` (API 24+).

### 15.2 Exemple recommandé pour SmartVision

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>

  <!-- Règle par défaut : HTTPS uniquement, partout -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>

  <!-- Exception : le backend local de développement -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">192.168.1.42</domain>
  </domain-config>

  <!-- Domaine de production : HTTPS obligatoire + épinglage -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">visionsmart.fr</domain>
    <pin-set expiration="2027-12-31">
      <pin digest="SHA-256">BASE64_DU_PIN_PRINCIPAL=</pin>
      <pin digest="SHA-256">BASE64_DU_PIN_DE_SECOURS=</pin>
    </pin-set>
  </domain-config>

</network-security-config>
```

### 15.3 Explication de chaque élément

| Élément | Rôle |
|---|---|
| `<base-config>` | Politique par défaut pour tous les domaines non listés ailleurs |
| `cleartextTrafficPermitted` | `true` autorise HTTP, `false` l'interdit, pour le domaine (ou la base) concerné |
| `<trust-anchors>` / `<certificates src="system">` | Autorités de certification acceptées : ici celles du système Android. `src="user"` (certificats installés par l'utilisateur) est à réserver au debug, car il permet d'intercepter le trafic avec un proxy |
| `<domain-config>` | Règles spécifiques à un ou plusieurs domaines, prioritaires sur `base-config` |
| `<domain includeSubdomains>` | Le domaine visé ; `true` inclut `api.visionsmart.fr`, `www.visionsmart.fr`, etc. |
| `<pin-set>` / `<pin>` | **Certificate pinning** : l'app n'accepte que les certificats dont l'empreinte SHA-256 correspond, même si un certificat frauduleux est signé par une autorité reconnue |
| `expiration` | Date après laquelle les pins sont ignorés (filet de sécurité contre le blocage de l'app) |
| `<debug-overrides>` | Règles appliquées **uniquement aux builds debuggables** (jamais en production), utile pour faire confiance à un proxy comme Charles ou Burp |

### 15.4 Le certificate pinning : puissant mais risqué

- **Avantage** : bloque les attaques de l'homme du milieu, même avec un faux certificat émis par une autorité compromise.
- **Risque** : si le certificat du serveur change (renouvellement Let's Encrypt avec nouvelle clé, changement d'hébergeur) et que le pin ne correspond plus, **toute l'app cesse de se connecter** jusqu'à publication d'une mise à jour, qui prend des jours via Google.
- **Précautions obligatoires** : épingler la **clé publique** (pas le certificat), toujours ajouter au moins **un pin de secours**, et définir une `expiration`.
- **Recommandation pragmatique** : pour une première publication, le pinning n'est pas requis par Google. Commencer par `base-config` en HTTPS uniquement et l'exception de développement. Ajouter le pinning plus tard, une fois le processus de renouvellement des certificats maîtrisé.

Pour calculer une empreinte de clé publique :

```bash
openssl s_client -connect api.visionsmart.fr:443 -servername api.visionsmart.fr </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | openssl enc -base64
```

### 15.5 Comment l'ajouter dans un projet Expo Managed

On ne peut pas créer le fichier à la main (pas de dossier `android/`). Il faut un **config plugin** qui écrit le XML et modifie le manifest lors du prebuild d'EAS. La version installée d'`expo-build-properties` (`~1.0.10`) n'expose pas d'option `networkSecurityConfig` (vérifié dans `node_modules`) : le plus sûr est donc un plugin local.

```js
// plugins/withNetworkSecurityConfig.js
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors><certificates src="system" /></trust-anchors>
  </base-config>
</network-security-config>
`;

module.exports = (config) => {
  // 1. Écrire res/xml/network_security_config.xml
  config = withDangerousMod(config, ['android', async (cfg) => {
    const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'network_security_config.xml'), XML);
    return cfg;
  }]);

  // 2. Référencer le fichier dans <application>
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
```

Déclaré dans `app.config.js` : `plugins: [..., './plugins/withNetworkSecurityConfig']`.

Ce plugin produit la version **production** (HTTPS uniquement). Pour le développement, on garde `usesCleartextTraffic` activé via §14.3, ou on génère un XML différent selon `EAS_BUILD_PROFILE`.

⚠️ Attention à ne pas combiner un XML strict en production avec un profil `development` qui a besoin du HTTP local : le XML l'emporterait sur `usesCleartextTraffic` et bloquerait le développement.

### 15.6 Que choisir ?

| Option | Effort | Sécurité | Recommandation |
|---|---|---|---|
| `usesCleartextTraffic` limité au profil `development` (§14.3) | Faible | Bonne | **À faire avant la publication** |
| + `network_security_config.xml` HTTPS uniquement (§15.5) | Moyen | Très bonne | Bon complément, optionnel |
| + certificate pinning | Élevé | Maximale | Plus tard, avec un pin de secours |

---

## 16. Checklist finale

**Compte**
- [ ] Invitation acceptée, rôle Admin confirmé
- [ ] Type de compte connu (personnel ou organisation)
- [ ] Vérification d'identité du compte terminée

**Play Console**
- [ ] App créée, nom de package vérifié
- [ ] Privacy policy en ligne et URL renseignée
- [ ] Financial features, Data safety, Account deletion, Content ratings, Target audience, Ads : tous en vert
- [ ] Comptes de démo (parent, secours, enseignant) créés, mot de passe finalisé, remplis de données (§6.1)
- [ ] App access renseigné avec ces identifiants et la note sur MeSomb
- [ ] Fiche du store complète (textes, icône, feature graphic, captures), avec la mention « réservée aux familles sous contrat »

**Code**
- [x] Suppression de compte : retirée du mobile (comptes créés par l'administration, suppression sur demande)
- [ ] Politique de confidentialité : indique comment demander la suppression du compte
- [ ] `usesCleartextTraffic` désactivé hors profil `development` (§14.3)
- [ ] Token d'authentification migré vers `expo-secure-store` (recommandé)

**Build**
- [ ] `eas build --platform android --profile production` réussi
- [ ] Keystore généré par EAS et sauvegardé (`eas credentials`)

**Tests**
- [ ] AAB uploadé en Internal testing, Play App Signing activé
- [ ] Login, paiement MeSomb et Socket.IO validés sur le build Play Store
- [ ] (Compte personnel) Closed testing : 12 testeurs pendant 14 jours, demande de Production envoyée

**Lancement**
- [ ] Release Production soumise
- [ ] Email d'approbation reçu, app visible sur le store

---

## 17. Pièges fréquents

| Piège | Conséquence | Parade |
|---|---|---|
| Suivre un tutoriel `keytool` / Android Studio | Temps perdu, keystore inutile ou en conflit avec celui d'EAS | On est en Managed Workflow : laisser EAS gérer |
| Découvrir la règle des 12 testeurs à la fin | Deux semaines de retard au moment du lancement | Vérifier le type de compte dès le début et lancer le Closed testing tôt |
| Privacy policy protégée par login | Rejet à la revue | Tester l'URL en navigation privée |
| Data safety incomplète (oubli de MeSomb) | Rejet ou suspension | Déclarer le partage avec MeSomb |
| Pas d'identifiants dans App access | Rejet : le testeur ne peut pas dépasser l'écran de connexion | Comptes de démo prêts à l'emploi (§6.1) |
| Compte de démo supprimé ou mot de passe changé | Rejet lors de la revue d'une mise à jour | Compte de secours, ne jamais toucher à ces comptes |
| Même `versionCode` réuploadé | Upload refusé | `autoIncrement: true` déjà actif dans `production` |
| Changer le nom de package après publication | Impossible : c'est une nouvelle app | Le vérifier avant le premier upload |
| Perdre la clé d'upload | Bloqué pour publier des mises à jour | Play App Signing (Google peut réémettre) + sauvegarde `eas credentials` |
| Clé JSON du compte de service commitée dans Git | Fuite d'accès à la Play Console | `.gitignore` et rotation de la clé si fuite |
| Utiliser le profil `preview` pour le store | APK refusé par le Play Store | Toujours `--profile production` pour un AAB |

### Références rapides

| Besoin | Où / Commande |
|---|---|
| Lister/exporter les clés | `eas credentials` |
| Build AAB | `eas build --platform android --profile production` |
| Soumission auto | `eas submit --platform android --profile production` |
| Console Play | `https://play.google.com/console` |
| Suivi des builds EAS | `https://expo.dev` → projet → Builds |
