import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuration centrale de l'URL backend.
 *
 * - Priorité : `EXPO_PUBLIC_API_URL` (injectée par EAS dans preview/production via
 *   `eas.json`, ou fichier `.env` local pour tests).
 * - Sinon en dev : IP du poste Expo (appareil physique / même réseau), puis émulateur Android.
 * - Sinon en release : `ONLINE_BACKEND_URL`.
 */

/** Utilisé en release si `EXPO_PUBLIC_API_URL` n’est pas défini (ex. build hors EAS). */
const ONLINE_BACKEND_URL = 'https://api.visionsmart.fr';
/** Politique de confidentialité (site web public), affichée depuis Profil/Aide. */
export const PRIVACY_POLICY_URL = 'https://www.smartvision.education/privacy';
/** Page publique décrivant la procédure de suppression de compte (aussi déclarée sur le Play Store). */
export const ACCOUNT_DELETION_URL = 'https://www.smartvision.education/suppression-compte';
/** Adresse de contact SmartVision (demandes de suppression de compte, support). */
export const CONTACT_EMAIL = 'contact@smartvision.education';
/** Affiché sur l'écran de connexion quand un administrateur a désactivé le compte. */
export const ACCOUNT_DISABLED_MESSAGE = `Votre compte a été désactivé. Pour toute question, contactez ${CONTACT_EMAIL}.`;
/** Port d’écoute de ton API locale (adapter si ton backend n’écoute pas sur 3000). */
const DEV_BACKEND_PORT = 3000;

const trimSlash = (url: string) => url.replace(/\/$/, '');

/** IP du poste de dev (Expo Go) — ex. 192.168.x.x depuis un téléphone sur le même Wi‑Fi. */
function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } } | null)?.extra?.expoGo
      ?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  return host;
}

/**
 * Ordre : `EXPO_PUBLIC_API_URL` (EAS `eas.json` → preview/production, ou `.env` local) ;
 * sinon en dev : IP Expo / localhost / 10.0.2.2 ; sinon URL prod par défaut.
 */
const getDevBaseURLWithoutEnv = (): string => {
  const expoHost = getExpoDevHost();
  if (expoHost) {
    return `http://${expoHost}:${DEV_BACKEND_PORT}`;
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${DEV_BACKEND_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_BACKEND_PORT}`;
  }

  return `http://localhost:${DEV_BACKEND_PORT}`;
};

export const getBaseURL = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return trimSlash(fromEnv);
  }
  if (__DEV__) {
    return getDevBaseURLWithoutEnv();
  }
  return ONLINE_BACKEND_URL;
};

export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/auth/signin',
    REFRESH: '/auth/refresh',
    /** Envoie le lien de réinitialisation (page web `/reset-password`). */
    SEND_RESET_EMAIL: '/auth/send-email',
  },
  TEACHER: {
    CLASSES: '/teacher/classes',
    STUDENTS: '/teacher/students',
    STUDENTS_OF_TEACHER: '/courseassign/get-teacher/students',
    COURSE_OFFERING: '/courseoffer/get-teacher-course-offering',
  },
  /** Bilan hebdomadaire cours (aligné Angular coursereport) */
  COURSE_REPORT: {
    CURRENT_WEEK_UPSERT: '/coursereport/reports/current-week',
    currentWeekGet: (teacherId: string, studentId: string) =>
      `/coursereport/reports/current-week/${teacherId}/${studentId}`,
    HISTORY: '/coursereport/reports/history',
  },
  POSTULATION: {
    FOR_TEACHER: '/postulation/get-postulation-for-teacher',
    CREATE: '/postulation/create-postulation',
    DELETE: '/postulation/delete-postulation',
  },
  /** Anciennes routes — préférer USER.PARENT_CHILDREN si le backend les expose */
  PARENT: {
    CHILDREN: '/parent/children',
    GRADES: '/parent/grades',
  },
  /** Aligné sur l’app Angular (userdetail) */
  USER_DETAIL: {
    sharedDetails: (userId: string) =>
      `/userdetail/shared-user/${userId}/details`,
  },
  USER: {
    parentChildren: (parentId: string) =>
      `/user/parents/${parentId}/children`,
  },
  AGENCY: {
    getUserAgenciesWithDetails: '/agency/get-user-agencies',
  },
  REPORT: {
    list: '/report/',
  },
  NOTIFICATION: {
    byRecipient: (recipientId: string) =>
      `/notification/notifications/recipient/${recipientId}`,
  },
  ANNOUNCEMENT: {
    publishedParent: '/announcement/announcements/published/parent',
    publishedByRole: (role: string) =>
      `/announcement/announcements/published/${role}`,
    publishedByRoleAndAgency: (role: string) =>
      `/announcement/announcements/published/${role}/agency`,
  },
  INVOICE: {
    parentInvoices: (parentId: string) => `/invoice/${parentId}/invoices`,
    teacherInvoices: (teacherId: string) => `/invoice/teacher/${teacherId}`,
  },
  PAYMENT: {
    parentPayments: (parentId: string) => `/payment/${parentId}/payments`,
    teacherPayments: (teacherId: string) => `/payment/teacher/${teacherId}/payments`,
    FILTER: '/payment/filter',
    MESOMB_COLLECT: '/payment/mesomb/collect',
  },
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
} as const;

/** Couleurs principales SmartVision (UI + splash) */
export const BRAND = {
  green: '#274e2b',
  orange: '#c45221',
} as const;

/**
 * En-tête natif (Tabs / Stack) : bandeau vert, titre et boutons retour en blanc.
 * À combiner avec `headerTitleAlign: 'center'` sur les Tabs si tu veux le titre centré.
 */
export const navHeaderGreen = {
  headerStyle: {
    backgroundColor: BRAND.green,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    color: '#FFFFFF',
    fontWeight: '800' as const,
    fontSize: 20,
  },
  headerShadowVisible: false,
};
