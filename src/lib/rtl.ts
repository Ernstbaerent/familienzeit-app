import { I18nManager } from 'react-native';

// true, wenn das Layout gespiegelt ist (Sprache mit Schreibrichtung rechts-nach-links, z. B. Arabisch).
// Die Richtung steht beim App-Start fest und ändert sich erst nach einem Neustart.
export const isRTL = I18nManager.isRTL;

// Für Icons mit Richtung (z. B. Pfeil „weiter“): spiegelt sie bei rechts-nach-links.
// Nutzung: <Image style={[styles.icon, mirrorInRTL]} />
export const mirrorInRTL = { transform: [{ scaleX: isRTL ? -1 : 1 }] };
