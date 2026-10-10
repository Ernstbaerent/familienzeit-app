import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

// Alle Sprachen der App. Neue Sprache: JSON-Datei in src/locales anlegen und hier eintragen.
// Rechts-nach-links-Sprache (z. B. Arabisch)? Dann zusätzlich docs/i18n.md beachten.
// `satisfies typeof de` sorgt dafür, dass TypeScript fehlende Texte in en.json meldet.
const resources = {
  de: { translation: de },
  en: { translation: en satisfies typeof de },
};

type AppLanguage = keyof typeof resources;

const supportedLanguages = Object.keys(resources) as AppLanguage[];

// Wird genommen, wenn keine Handysprache zur App passt.
const fallbackLanguage: AppLanguage = 'en';

function isSupportedLanguage(code: string | null): code is AppLanguage {
  return supportedLanguages.includes(code as AppLanguage);
}

// Geht die Sprachen in der Reihenfolge der Handy-Einstellungen durch und nimmt die erste,
// die die App kennt. Beispiel: Handy auf Türkisch, dann Englisch -> App auf Englisch.
function detectLanguage(): AppLanguage {
  for (const locale of getLocales()) {
    if (isSupportedLanguage(locale.languageCode)) {
      return locale.languageCode;
    }
  }
  return fallbackLanguage;
}

const i18n = createInstance();

// i18next mit React verbinden und starten.
i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: fallbackLanguage,
  interpolation: {
    // React schützt Texte schon selbst, doppeltes Escapen würde z. B. "&amp;" anzeigen.
    escapeValue: false,
  },
});

export default i18n;
