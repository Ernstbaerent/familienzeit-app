// Symbol für die Kategorie einer Aktivität. Zentrale Stelle für die Zuordnung Kategorie → Symbol.
//
// Symbole: Ionicons aus @expo/vector-icons, nur die Linien-Varianten (Name endet auf "-outline"),
// damit der Stil einheitlich bleibt. Alle Symbole: https://icons.expo.fyi (Filter „Ionicons“).
//
// Eigene Symbole (z. B. von Ani) einbauen: nur diese Datei ändern. Die Bildschirme nutzen
// ausschließlich <CategoryIcon category=… />.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, iconSize } from '@/lib/theme';

import { placeVisualKeys, type PlaceVisualKey } from '../places/placeKinds';
import type { ActivityCategory } from './activities';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const categoryIcons: Record<ActivityCategory, IconName> = {
  craft: 'color-palette-outline',
  game: 'dice-outline',
  movement: 'body-outline',
  experiment: 'flask-outline',
  nature: 'leaf-outline',
  cooking: 'restaurant-outline',
  outing: 'map-outline',
};

// Orte (M10b): Symbole der sieben eigenen Bildgruppen. Die übrigen Unterarten nehmen das Symbol einer Aktivitäts-Kategorie
// (src/features/places/placeKinds.ts, `visual`). Spielplatz (Luftballon) und Burg (Fahne) sind Platzhalter:
// Ionicons hat dafür kein passendes Symbol (docs/theme.md).
export const placeVisualIcons: Record<PlaceVisualKey, IconName> = {
  playground: 'balloon-outline', // Platzhalter
  pool: 'water-outline',
  museum: 'library-outline', // Gebäude mit Säulen
  zoo: 'paw-outline',
  castle: 'flag-outline', // Platzhalter
  cinema: 'film-outline',
  library: 'book-outline',
};

// Was der Bildbereich einer Karte zeigt: eine Aktivitäts-Kategorie oder eine Bildgruppe der Orte.
export type CardVisual = ActivityCategory | PlaceVisualKey;

export function isPlaceVisualKey(value: CardVisual): value is PlaceVisualKey {
  return (placeVisualKeys as readonly string[]).includes(value);
}

export function cardVisualIcon(visual: CardVisual): IconName {
  return isPlaceVisualKey(visual) ? placeVisualIcons[visual] : categoryIcons[visual];
}

type CategoryIconProps = {
  category: ActivityCategory;
  size?: keyof typeof iconSize;
};

// Der Name der Kategorie wird für Bildschirmleser vorgelesen.
export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const { t } = useTranslation();
  return (
    <Ionicons
      name={categoryIcons[category]}
      size={iconSize[size]}
      color={colors.icon}
      accessibilityRole="image"
      accessibilityLabel={t(`categories.${category}`)}
    />
  );
}
