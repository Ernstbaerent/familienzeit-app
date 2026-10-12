import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

import { fonts, lightColors, radius, size } from '@/lib/theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Section } from './Section';

// Ionicons lädt seine Schrift asynchron und meldet das im Test als Warnung. Hier genügt der Name des Symbols als Text.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { name: string }) => createElement(Text, props, props.name),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Rendert den Baustein und gibt die zusammengesetzten Styles des ersten Elements mit dieser Rolle zurück.
function render(element: React.ReactElement) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(element);
  });
  return renderer.root;
}

function flatStyle(node: ReactTestInstance) {
  return StyleSheet.flatten(node.props.style) ?? {};
}

describe('Button', () => {
  it('ist eine Pille in der Hauptfarbe mit Onest SemiBold und weißem Text', () => {
    const root = render(<Button label="Was machen wir?" onPress={() => {}} />);
    const button = root.findByProps({ accessibilityRole: 'button' });
    expect(flatStyle(button)).toMatchObject({
      borderRadius: radius.full,
      backgroundColor: lightColors.primary,
    });
    const label = root.findByType(Text);
    expect(flatStyle(label)).toMatchObject({
      fontFamily: fonts.bodyStrong,
      color: lightColors.onPrimary,
    });
    expect(flatStyle(label)).not.toHaveProperty('fontWeight');
  });

  it('Nebenaktion in Flächenfarbe, Löschen mit Rand in der Warnfarbe', () => {
    const secondary = render(<Button label="A" variant="secondary" onPress={() => {}} />);
    expect(flatStyle(secondary.findByProps({ accessibilityRole: 'button' }))).toMatchObject({
      backgroundColor: lightColors.surface,
    });
    const danger = render(<Button label="B" variant="danger" onPress={() => {}} />);
    expect(flatStyle(danger.findByProps({ accessibilityRole: 'button' }))).toMatchObject({
      borderColor: lightColors.danger,
    });
  });
});

describe('Chip', () => {
  it('hat mindestens 44 hohe Tippfläche und Pillenform, nicht gewählt ist er weiß (Karten sind weiß)', () => {
    const root = render(<Chip label="Basteln" selected={false} onPress={() => {}} />);
    expect(flatStyle(root.findByProps({ accessibilityRole: 'checkbox' }))).toMatchObject({
      minHeight: size.touch,
      borderRadius: radius.full,
      backgroundColor: lightColors.card,
    });
  });

  it('gewählt: Tinte mit hellem Text in Onest Medium, nicht Terrakotta (Entscheidung 11)', () => {
    const root = render(<Chip label="Basteln" selected onPress={() => {}} />);
    const chip = flatStyle(root.findByProps({ accessibilityRole: 'checkbox' }));
    expect(chip).toMatchObject({
      backgroundColor: lightColors.selected,
      borderColor: lightColors.selected,
    });
    expect(chip.backgroundColor).not.toBe(lightColors.primary);
    expect(flatStyle(root.findByType(Text))).toMatchObject({
      fontFamily: fonts.bodyMedium,
      color: lightColors.onSelected,
    });
  });

  it('meldet den Zustand der Sprachausgabe und kann einen Hinweis tragen', () => {
    const root = render(
      <Chip label="Normal" role="radio" selected onPress={() => {}} accessibilityHint="Nochmal tippen" />,
    );
    const chip = root.findByProps({ accessibilityRole: 'radio' });
    expect(chip.props.accessibilityState).toMatchObject({ checked: true });
    expect(chip.props.accessibilityHint).toBe('Nochmal tippen');
  });

  it('das Symbol ist Dekoration: Die Sprachausgabe liest nur den Text', () => {
    const root = render(
      <Chip label="Müde" role="radio" icon="battery-dead-outline" selected={false} onPress={() => {}} />,
    );
    const icon = root.findByProps({ accessibilityElementsHidden: true });
    expect(icon.props.importantForAccessibility).toBe('no');
  });

  it('gestapelt: Kachel statt Pille, Symbol über dem Text', () => {
    const root = render(
      <Chip label="Müde" stacked icon="battery-dead-outline" selected={false} onPress={() => {}} />,
    );
    expect(flatStyle(root.findByProps({ accessibilityRole: 'checkbox' }))).toMatchObject({
      flexDirection: 'column',
      borderRadius: radius.tile,
    });
  });

  it('der Text darf bei großer Systemschrift umbrechen (nie abgeschnitten)', () => {
    const root = render(<Chip label="Halber Tag" selected={false} onPress={() => {}} />);
    const label = root.findByType(Text);
    expect(label.props.numberOfLines).toBeUndefined();
    expect(flatStyle(label)).toMatchObject({ flexShrink: 1 });
  });
});

describe('Button (Ergänzungen D2)', () => {
  it('gesperrt: sagt es der Sprachausgabe und hat keinen Schein', () => {
    const root = render(
      <Button label="Was machen wir?" size="large" disabled onPress={() => {}} accessibilityHint="Bitte wähle die Zeit." />,
    );
    const button = root.findByProps({ accessibilityRole: 'button' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(button.props.accessibilityHint).toBe('Bitte wähle die Zeit.');
    expect(flatStyle(button)).not.toHaveProperty('boxShadow');
  });

  it('der große Hauptknopf trägt den warmen Schein, ein normaler nicht', () => {
    const large = render(<Button label="A" size="large" onPress={() => {}} />);
    expect(flatStyle(large.findByProps({ accessibilityRole: 'button' }))).toHaveProperty('boxShadow');
    const regular = render(<Button label="B" onPress={() => {}} />);
    expect(flatStyle(regular.findByProps({ accessibilityRole: 'button' }))).not.toHaveProperty('boxShadow');
  });

  it('das Symbol ist Dekoration und spiegelt sich nur, wenn es eine Richtung hat', () => {
    const arrow = render(
      <Button label="Weiter" icon="arrow-forward-outline" iconFlipsInRTL onPress={() => {}} />,
    );
    const hidden = arrow.findByProps({ accessibilityElementsHidden: true });
    expect(hidden.props.importantForAccessibility).toBe('no');
    expect(hidden.props.style).toBeDefined();
    const plain = render(<Button label="Weiter" icon="add-outline" onPress={() => {}} />);
    expect(plain.findByProps({ accessibilityElementsHidden: true }).props.style).toBeUndefined();
  });
});

describe('Section', () => {
  it('Titel in Literata, Zusatz und Hinweis in Onest', () => {
    const root = render(
      <Section title="Titel" tag="(Pflicht)" hint="Hinweis">
        <Text>Inhalt</Text>
      </Section>,
    );
    const texts = root.findAllByType(Text);
    const title = texts.find((node) => node.props.accessibilityRole === 'header');
    expect(flatStyle(title!)).toMatchObject({ fontFamily: fonts.title, color: lightColors.text });
    const fontFamilies = texts.map((node) => flatStyle(node).fontFamily);
    expect(fontFamilies).toContain(fonts.body);
  });
});
