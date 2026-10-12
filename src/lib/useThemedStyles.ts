import { useMemo } from 'react';

import { useTheme, type Theme } from '@/lib/theme';

// Styles, die von hell/dunkel abhängen. `createStyles` steht außerhalb der Komponente und baut die Styles
// mit StyleSheet.create aus dem Theme. Neu gebaut wird nur, wenn sich das Theme ändert.
//
//   const createStyles = ({ colors }: Theme) => StyleSheet.create({ box: { backgroundColor: colors.surface } });
//   const styles = useThemedStyles(createStyles);
export function useThemedStyles<T>(createStyles: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [createStyles, theme]);
}
