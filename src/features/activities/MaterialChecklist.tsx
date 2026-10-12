import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, iconSize, lineHeight, radius, size, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { MaterialKey } from './materials';

// „Das braucht ihr“ als Liste zum Abhaken (DESIGN.md, Entscheidung 13 und 17).
// - Jede Zeile ist ein Abhak-Feld und mindestens `size.checkbox` (56) hoch: Die ganze Zeile ist die Tippfläche, das Kästchen darin ist kleiner.
// - Der Rand des Kästchens ist `icon` aus der Palette (mindestens 3:1 zu Karte und Papier, im Test geprüft). Abgehakt ist Tinte (`selected`)
//   mit Häkchen, wie bei den gewählten Chips (Entscheidung 11, 23: Terrakotta ist nur dem Hauptknopf vorbehalten).
// - Der Zustand liegt NUR im Speicher dieses Bildschirms (`useState`). Er wird nirgends gespeichert und beginnt bei jedem Öffnen leer.
export function MaterialChecklist({ materials }: { materials: readonly MaterialKey[] }) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  // Das Häkchen ist ein Schrift-Zeichen und würde mit der Systemschrift mitwachsen: Es soll im Kästchen bleiben (wie bei den Karten-Symbolen).
  const scale = Math.max(1, useWindowDimensions().fontScale);
  const [checked, setChecked] = useState<readonly MaterialKey[]>([]);

  function toggle(material: MaterialKey) {
    setChecked((current) =>
      current.includes(material) ? current.filter((key) => key !== material) : [...current, material],
    );
  }

  return (
    <Section title={t('detail.materialsTitle')} large>
      {materials.length === 0 ? (
        <Text style={styles.empty}>{t('detail.noMaterials')}</Text>
      ) : (
        <View style={styles.list} accessibilityRole="list">
          {materials.map((material, index) => {
            const isChecked = checked.includes(material);
            const name = t(`materials.${material}`);
            return (
              <Pressable
                key={material}
                onPress={() => toggle(material)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={name}
                style={[styles.row, index < materials.length - 1 && styles.rowDivider]}
              >
                <View style={[styles.box, isChecked && styles.boxChecked]}>
                  {isChecked && (
                    <Ionicons
                      name="checkmark-outline"
                      size={iconSize.md / scale}
                      color={colors.onSelected}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  )}
                </View>
                <Text style={[styles.rowText, isChecked && styles.rowTextChecked]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Section>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    // Weiße Karte mit feinem Rand, die Zeilen sind durch dünne Linien getrennt.
    list: {
      paddingHorizontal: spacing.md,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    row: {
      minHeight: size.checkbox, // Abhak-Feld 56 px hoch (DESIGN.md)
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border, // `border` gliedert nur (1,7:1), das Kästchen selbst hat einen kräftigeren Rand
    },
    // Das sichtbare Kästchen: 32 px (wie im PDF), Rand aus der Palette mit mindestens 3:1 zu Karte und Papier (Entscheidung 17).
    box: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.icon,
      backgroundColor: colors.card,
    },
    boxChecked: {
      borderColor: colors.selected,
      backgroundColor: colors.selected,
    },
    rowText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    rowTextChecked: {
      color: colors.textMuted,
    },
    empty: {
      fontFamily: fonts.body,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
  }),
});
