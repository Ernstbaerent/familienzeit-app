// Symbol für eine Bewertung. Zentrale Stelle für die Zuordnung Bewertung → Symbol.
// Ionicons, nur die Linien-Varianten (Name endet auf "-outline"), wie bei CategoryIcon.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { colors, iconSize } from '@/lib/theme';

import type { Rating } from './history';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const ratingIcons: Record<Rating, IconName> = {
  up: 'thumbs-up-outline',
  down: 'thumbs-down-outline',
};

type RatingIconProps = {
  rating: Rating;
  size?: keyof typeof iconSize;
  color?: string;
};

// Das Symbol ist Schmuck: Den Namen („Daumen hoch“) liest der Knopf oder die Zeile daneben vor.
export function RatingIcon({ rating, size = 'md', color = colors.icon }: RatingIconProps) {
  return (
    <Ionicons
      name={ratingIcons[rating]}
      size={iconSize[size]}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
