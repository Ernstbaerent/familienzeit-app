// Kontrast nach WCAG 2.x (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio). Nur für Tests und Prüfskripte gedacht,
// die App rechnet nie damit. Farben als Hex-Text mit sechs Zeichen (z. B. "#FAF6F0").

export function luminance(hex: string): number {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

// Kontrastverhältnis zweier Farben, immer mindestens 1 (egal, welche heller ist).
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
