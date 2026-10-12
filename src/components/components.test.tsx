import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

import { fonts, lightColors, radius, size } from '@/lib/theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Section } from './Section';

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
  it('hat mindestens 44 hohe Tippfläche und Pillenform', () => {
    const root = render(<Chip label="Basteln" selected={false} onPress={() => {}} />);
    expect(flatStyle(root.findByProps({ accessibilityRole: 'checkbox' }))).toMatchObject({
      minHeight: size.touch,
      borderRadius: radius.full,
      backgroundColor: lightColors.surface,
    });
  });

  it('gewählt: Hauptfarbe mit weißem Text in Onest Medium', () => {
    const root = render(<Chip label="Basteln" selected onPress={() => {}} />);
    expect(flatStyle(root.findByProps({ accessibilityRole: 'checkbox' }))).toMatchObject({
      backgroundColor: lightColors.primary,
    });
    expect(flatStyle(root.findByType(Text))).toMatchObject({
      fontFamily: fonts.bodyMedium,
      color: lightColors.onPrimary,
    });
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
