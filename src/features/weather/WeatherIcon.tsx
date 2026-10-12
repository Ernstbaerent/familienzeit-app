// Symbol für eine Wetterlage. Zentrale Stelle für die Zuordnung Wetter → Symbol.
// Ionicons, nur die Linien-Varianten (Name endet auf "-outline"), wie bei CategoryIcon.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { iconSize, useTheme } from '@/lib/theme';

import type { Weather } from '../suggestions/conditions';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const weatherIcons: Record<Weather, IconName> = {
  sunny: 'sunny-outline',
  cloudy: 'cloudy-outline',
  rain: 'rainy-outline',
  thunderstorm: 'thunderstorm-outline',
  snow: 'snow-outline',
};

type WeatherIconProps = {
  weather: Weather;
  size?: keyof typeof iconSize;
};

// Das Symbol ist Schmuck: Der Wettertext steht daneben, deshalb wird es für Bildschirmleser versteckt.
export function WeatherIcon({ weather, size = 'md' }: WeatherIconProps) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={weatherIcons[weather]}
      size={iconSize[size]}
      color={colors.icon}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
