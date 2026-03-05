export type ThemeColors = {
  primary: string;
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textSecondary: string;
  border: string;
  inactive: string;
  card: string;
};

export const LightTheme: ThemeColors = {
  primary: '#e8313a',
  background: '#ffffff',
  surface: '#fafafa',
  surface2: '#f0f0f0',
  text: '#000000',
  textSecondary: '#737373',
  border: '#efefef',
  inactive: '#999999',
  card: '#f9f9f9',
};

export const DarkTheme: ThemeColors = {
  primary: '#e8313a',
  background: '#000000',
  surface: '#111111',
  surface2: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a8a8a8',
  border: '#262626',
  inactive: '#666666',
  card: '#111111',
};

/** @deprecated Use useTheme().colors instead */
export const Colors = LightTheme;
