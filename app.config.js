// EAS_BUILD_PROFILE est injectée automatiquement par EAS Build (development/preview/production).
// Absente hors EAS Build (ex. npx expo start) → cleartext désactivé par défaut (comportement le plus sûr).
const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === 'development';

module.exports = {
  expo: {
    name: 'SmartVision',
    slug: 'smartmobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/smartvisionbrain1024.png',
    scheme: 'smartmobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
        foregroundImage: './assets/images/smartvisionbrain1024.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.smartvision.mobile',
    },
    web: {
      output: 'static',
      favicon: './assets/images/smartlogo48x48.png',
      themeColor: '#274e2b',
      backgroundColor: '#ffffff',
    },
    plugins: [
      'expo-router',
      // Token de session chiffré (Android Keystore / iOS Keychain), exclu des sauvegardes Android.
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            // HTTP en clair uniquement pour le profil "development" (test contre un backend
            // local en http://<ip>:3000 ou http://10.0.2.2:3000). preview/production pointent
            // déjà vers https://api.visionsmart.fr : pas besoin d'autoriser le cleartext,
            // et le laisser ouvert en prod serait un risque pour une app qui traite des paiements.
            usesCleartextTraffic: isDevelopmentBuild,
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/smartvisionbrain1024.png',
          imageWidth: 120,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#ffffff',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'f56134da-a689-4541-b82d-3cf7c919cf4a',
      },
    },
  },
};
