
import { Transaction } from './types';

// FinanceV2: 預設不寫死 Google Apps Script URL — 完全離線優先。
// 使用者要進「設定 → 雲端同步」自行貼上 URL，URL 會存在 localStorage('google_script_url')。
export const GOOGLE_SCRIPT_URL = '';

// V2: 主題色由 CSS variables 控制；getCategoryColor 改讀 :root 上的 --cat-* token，
// 讓所有 6 套主題（earth / macaron / midnight / mint / sunset / mono）的分類色語意一致。
const CATEGORY_VAR_MAP: Record<string, string> = {
  '食': '--cat-food',
  '衣': '--cat-clothes',
  '住': '--cat-home',
  '行': '--cat-transit',
  '育': '--cat-learn',
  '樂': '--cat-fun',
  '其他': '--cat-other',
  '信用卡出帳': '--cat-bill',
};

const FALLBACK_COLORS: Record<string, string> = {
  '食': '#B4552B',
  '衣': '#C89A3C',
  '住': '#7A8F7A',
  '行': '#6B7A3F',
  '育': '#7A4A5C',
  '樂': '#C76A5B',
  '其他': '#8A7862',
  '信用卡出帳': '#4A3D2E',
};

export const getCategoryColor = (category: string): string => {
  // 優先讀目前主題的 CSS variable
  if (typeof window !== 'undefined' && CATEGORY_VAR_MAP[category]) {
    const cssVal = getComputedStyle(document.documentElement)
      .getPropertyValue(CATEGORY_VAR_MAP[category])
      .trim();
    if (cssVal) return cssVal;
  }
  if (FALLBACK_COLORS[category]) return FALLBACK_COLORS[category];

  // 自訂分類：用名稱 hash 出穩定顏色（暖色調）
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 55%, 55%)`;
};

// FinanceV2: 預設無假交易 — 第一次開 APP 是乾淨的。
// 使用者要嘛從原版 Finance 雲端拉資料、要嘛從這裡開始記。
export const INITIAL_TRANSACTIONS: Transaction[] = [];
