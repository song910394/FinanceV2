import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 'earth' | 'macaron' | 'midnight' | 'mint' | 'sunset' | 'mono';

export const THEMES: { id: ThemeId; label: string; subtitle: string; swatches: [string, string, string] }[] = [
  { id: 'earth',    label: '暖米色',  subtitle: '紙質手感、懷舊',     swatches: ['#B4552B', '#C89A3C', '#7A8F7A'] },
  { id: 'macaron',  label: '馬卡龍',  subtitle: '甜美、柔軟、手繪感', swatches: ['#F4A6B0', '#C5B5D8', '#A8D5BA'] },
  { id: 'midnight', label: '夜幕',    subtitle: '深色、夜間護眼',    swatches: ['#F4B860', '#B199D6', '#1E2434'] },
  { id: 'mint',     label: '薄荷',    subtitle: '清新、極簡、專業',  swatches: ['#2D7A52', '#D4A84A', '#7E9E84'] },
  { id: 'sunset',   label: '夕陽',    subtitle: '熱情、溫暖、有能量', swatches: ['#E8564A', '#F2A840', '#A04878'] },
  { id: 'mono',     label: '極簡',    subtitle: '黑白 + 一點紅',     swatches: ['#0A0A0A', '#E63946', '#888888'] },
];

const STORAGE_KEY = 'hs_theme_v2';
const VALID = new Set<ThemeId>(['earth', 'macaron', 'midnight', 'mint', 'sunset', 'mono']);

const META_BG: Record<ThemeId, string> = {
  earth:    '#F4EDE0',
  macaron:  '#FCFBF8',
  midnight: '#151923',
  mint:     '#FAFBF8',
  sunset:   '#FFF3EC',
  mono:     '#FFFFFF',
};

function readInitial(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && VALID.has(stored)) return stored;
  } catch {}
  return 'earth';
}

function applyTheme(t: ThemeId) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null;
  if (meta) meta.content = META_BG[t];
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(readInitial);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    if (VALID.has(t)) setThemeState(t);
  }, []);

  return { theme, setTheme };
}
