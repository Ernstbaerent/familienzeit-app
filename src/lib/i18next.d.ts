// Macht die Übersetzungsschlüssel für TypeScript bekannt.
// Ein Tippfehler wie t('home.greting') wird dann schon beim Prüfen (npx tsc --noEmit) gemeldet.
import 'i18next';

import type de from '@/locales/de.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof de;
    };
  }
}
