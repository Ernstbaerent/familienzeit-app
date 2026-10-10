import { I18nManager } from 'react-native';

// true, wenn das Layout gespiegelt ist. Gespiegelt wird nur, wenn die angezeigte Sprache
// rechts-nach-links ist (z. B. Arabisch). Solange es keine solche Übersetzung gibt, ist das
// Spiegeln in app.json ausgeschaltet und isRTL in der fertigen App immer false (siehe docs/i18n.md).
export const isRTL = I18nManager.isRTL;

// Für Icons mit Richtung (z. B. Pfeil „weiter“): spiegelt sie bei rechts-nach-links.
// Nutzung: <Image style={[styles.icon, mirrorInRTL]} />
export const mirrorInRTL = { transform: [{ scaleX: isRTL ? -1 : 1 }] };
