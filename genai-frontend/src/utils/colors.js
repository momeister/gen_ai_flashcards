// Material You inspired color system
// Generates tonal palette and complementary colors from a hue and applies CSS variables site-wide

export function generatePalette(hue) {
  // Primary (base hue)
  const primary = {
    50: `${hue} 90% 95%`,
    100: `${hue} 90% 90%`,
    200: `${hue} 90% 80%`,
    300: `${hue} 90% 70%`,
    400: `${hue} 90% 60%`,
    500: `${hue} 90% 50%`, // main
    600: `${hue} 90% 40%`,
    700: `${hue} 90% 30%`,
    800: `${hue} 90% 20%`,
    900: `${hue} 90% 10%`,
  };

  // Complementary (opposite on color wheel)
  const compHue = (hue + 180) % 360;
  const secondary = {
    50: `${compHue} 70% 95%`,
    100: `${compHue} 70% 90%`,
    200: `${compHue} 70% 80%`,
    300: `${compHue} 70% 70%`,
    400: `${compHue} 70% 60%`,
    500: `${compHue} 70% 50%`,
    600: `${compHue} 70% 40%`,
    700: `${compHue} 70% 30%`,
    800: `${compHue} 70% 20%`,
    900: `${compHue} 70% 10%`,
  };

  // Tertiary (triadic)
  const tertHue = (hue + 120) % 360;
  const tertiary = {
    500: `${tertHue} 60% 50%`,
  };

  // Utility tones for status
  const success = { 500: `150 65% 45%` };
  const warning = { 500: `40 90% 50%` };
  const danger = { 500: `0 80% 50%` };

  return { primary, secondary, tertiary, success, warning, danger, hue, compHue, tertHue };
}

export function applyPalette(hue) {
  const palette = generatePalette(hue);
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  // Core brand tokens
  root.style.setProperty('--accent', palette.primary[500]);
  root.style.setProperty('--accent-50', palette.primary[50]);
  root.style.setProperty('--accent-100', palette.primary[100]);
  root.style.setProperty('--accent-300', palette.primary[300]);
  root.style.setProperty('--accent-700', palette.primary[700]);
  root.style.setProperty('--secondary', palette.secondary[500]);
  root.style.setProperty('--secondary-300', palette.secondary[300]);
  root.style.setProperty('--tertiary', palette.tertiary[500]);

  // Semantic tokens derived by tone mapping for light/dark
  // Surfaces and cards
  const surface = isDark ? '0 0% 6%' : '0 0% 100%';
  const surfaceVariant = isDark ? '0 0% 10%' : '0 0% 96%';
  const card = isDark ? '0 0% 12%' : '0 0% 100%';
  const border = isDark ? '0 0% 25%' : '0 0% 85%';

  // Text on surfaces
  const onSurface = isDark ? '0 0% 92%' : '0 0% 12%';
  const onMuted = isDark ? '0 0% 70%' : '0 0% 35%';

  // On-color text
  // Choose light/dark foreground automatically based on lightness threshold
  const parseL = (hsl) => {
    try { return parseFloat(String(hsl).split(' ')[2].replace('%','')); } catch { return 50; }
  };
  const onPrimary = parseL(palette.primary[500]) > 55 ? '0 0% 10%' : '0 0% 100%';
  const onSecondary = parseL(palette.secondary[500]) > 55 ? '0 0% 10%' : '0 0% 100%';

  root.style.setProperty('--surface', surface);
  root.style.setProperty('--surface-variant', surfaceVariant);
  root.style.setProperty('--card', card);
  root.style.setProperty('--border', border);
  root.style.setProperty('--on-surface', onSurface);
  root.style.setProperty('--on-muted', onMuted);
  root.style.setProperty('--on-primary', onPrimary);
  root.style.setProperty('--on-secondary', onSecondary);

  // Status colors
  root.style.setProperty('--success', palette.success[500]);
  root.style.setProperty('--warning', palette.warning[500]);
  root.style.setProperty('--danger', palette.danger[500]);

  return palette;
}
