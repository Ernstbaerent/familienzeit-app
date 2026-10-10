// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const themeMessage =
  'Farben, Schriftgrößen, Abstände und Eckenradien nur aus src/lib/theme.ts nehmen (fehlt ein Wert, dort ergänzen).';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Bildschirme und Bausteine: keine festen Farben, Schriftgrößen, Abstände oder Eckenradien (siehe CLAUDE.md).
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // z. B. color: '#333', backgroundColor: 'white'
        { selector: 'Property[key.name=/[cC]olor$/] > Literal', message: themeMessage },
        // z. B. <TextInput placeholderTextColor="#999" />
        { selector: 'JSXAttribute[name.name=/[cC]olor$/] Literal', message: themeMessage },
        // z. B. fontSize: 18, marginTop: 8, gap: 12, borderRadius: 8 (0 ist erlaubt)
        {
          selector:
            'Property[key.name=/^(fontSize|lineHeight|margin|padding|gap|rowGap|columnGap)|^border[A-Za-z]*Radius$/] > Literal[value!=0]',
          message: themeMessage,
        },
      ],
    },
  },
]);
