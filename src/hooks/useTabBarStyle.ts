import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Style de la barre d'onglets du bas. Sur les téléphones à écran incurvé ou à
 * navigation par gestes, l'inset système peut être nul alors que les coins
 * arrondis rognent quand même les icônes : on impose une marge basse minimale
 * (en plus de l'inset) pour remonter Accueil / Profil et éviter qu'ils soient masqués.
 */
const TAB_CONTENT_HEIGHT = 56;
const MIN_BOTTOM_PADDING = 16;

export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_PADDING);

  return {
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    paddingBottom: bottomPadding,
    height: TAB_CONTENT_HEIGHT + bottomPadding,
  };
}
