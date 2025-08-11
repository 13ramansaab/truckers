import { Appearance } from 'react-native';
import { getTheme } from './prefs';

export type Theme = 'light' | 'dark';

export function resolveTheme(pref: 'system' | 'light' | 'dark'): Theme {
  if (pref === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }
  return pref;
}

export function getThemeColors(theme: Theme) {
  if (theme === 'light') {
    return {
      background: '#FFFFFF',
      surface: '#F3F4F6',
      text: '#111827',
      muted: '#6B7280',
      primary: '#2563EB',
      onPrimary: '#FFFFFF',
      danger: '#DC2626',
      onDanger: '#FFFFFF',
      card: '#E5E7EB',
      border: '#D1D5DB',
    };
  }
  return {
    background: '#111827',
    surface: '#1F2937',
    text: '#FFFFFF',
    muted: '#9CA3AF',
    primary: '#3B82F6',
    onPrimary: '#FFFFFF',
    danger: '#DC2626',
    onDanger: '#FFFFFF',
    card: '#1F2937',
    border: '#374151',
  };
}

// convenience hook-like helper for screens
export async function loadThemeColors() {
  const pref = await getTheme();
  const t = resolveTheme(pref);
  return getThemeColors(t);
}