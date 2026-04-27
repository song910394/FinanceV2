
import React, { useState, useEffect } from 'react';
import { Plus, X, Save, CloudDownload, CloudUpload, AlertTriangle, CheckCircle2, RefreshCw, Calendar, Palette, Info, ExternalLink } from 'lucide-react';
import { CardSetting } from '../types';
import { THEMES, ThemeId } from '../hooks/useTheme';

interface SettingsProps {
  categories: string[];
  budget: number;
  cardBanks: string[];
  cardSettings: Record<string, CardSetting>;
  onUpdateCategories: (newCategories: string[]) => void;
  onUpdateBudget: (newBudget: number) => void;
  onUpdateCardBanks: (newCardBanks: string[]) => void;
  onUpdateCardSettings: (newSettings: Record<string, CardSetting>) => void;
  onCloudSync: (url: string, isUpload: boolean) => Promise<void>;
  onResetData: () => void;
  currentTheme: ThemeId;
  onChangeTheme: (t: ThemeId) => void;
  currentUrl: string;
}

const Settings: React.FC<SettingsProps> = ({
  categories, budget, cardBanks, cardSettings,
  onUpdateCategories, onUpdateBudget, onUpdateCardBanks, onUpdateCardSettings,
  onCloudSync, onResetData,
  currentTheme, onChangeTheme, currentUrl
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [newBank, setNewBank] = useState('');
  const [tempBudget, setTempBudget] = useState(budget.toString());
  const [isBudgetSaved, setIsBudgetSaved] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(currentUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { setScriptUrl(currentUrl || ''); }, [currentUrl]);
  useEffect(() => { setTempBudget(budget.toString()); }, [budget]);

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      onUpdateCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };
  const handleAddBank = () => {
    if (newBank && !cardBanks.includes(newBank)) {
      onUpdateCardBanks([...cardBanks, newBank]);
      setNewBank('');
    }
  };
  const handleUpdateStatementDay = (bank: string, day: string) => {
    const v = parseInt(day);
    if (!isNaN(v)) {
      const e = cardSettings[bank] || {} as CardSetting;
      onUpdateCardSettings({ ...cardSettings, [bank]: { ...e, statementDay: v } });
    }
  };
  const handleToggleNextMonth = (bank: string) => {
    const e = cardSettings[bank] || ({ statementDay: 0 } as CardSetting);
    onUpdateCardSettings({ ...cardSettings, [bank]: { ...e, isNextMonth: !e.isNextMonth } });
  };
  const handleSaveBudget = () => {
    const v = parseInt(tempBudget);
    if (!isNaN(v) && v > 0) {
      onUpdateBudget(v);
      setIsBudgetSaved(true);
      setTimeout(() => setIsBudgetSaved(false), 2000);
    }
  };
  const handleSync = async (isUpload: boolean) => {
    if (!scriptUrl) {
      setSyncStatus({ type: 'error', msg: '請先貼上 Google Apps Script URL' });
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await onCloudSync(scriptUrl, isUpload);
      setSyncStatus({
        type: 'success',
        msg: isUpload ? '✓ 已將本機資料備份至雲端' : '✓ 已從雲端載入資料（與原版 Finance 共用同份試算表）'
      });
    } catch {
      setSyncStatus({ type: 'error', msg: '同步失敗 — 請檢查 URL、權限，或試重新部署 Apps Script' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* ── 主題 ── */}
      <section className="theme-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-display title-gradient" style={{ color: 'var(--ink)' }}>
          <Palette size={20} style={{ color: 'var(--accent)' }} />
          外觀主題
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-mute)' }}>
          選擇你喜歡的視覺風格，會記在這台裝置上。
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map(t => {
            const active = t.id === currentTheme;
            return (
              <button key={t.id} onClick={() => onChangeTheme(t.id)}
                className="p-3 rounded-xl text-left pressable transition-all"
                style={{
                  background: active ? 'var(--accent-soft)' : 'var(--paper-soft)',
                  border: `2px solid ${active ? 'var(--accent)' : 'var(--rule)'}`,
                  color: 'var(--ink)',
                }}
                aria-label={t.label}>
                <div className="flex items-center gap-1.5 mb-2">
                  {t.swatches.map((c, i) => (
                    <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: c, border: '1px solid rgba(0,0,0,0.06)' }} />
                  ))}
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{t.subtitle}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 雲端同步（可選） ── */}
      <section className="theme-card p-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2 font-display" style={{ color: 'var(--ink)' }}>
          <CloudUpload size={20} style={{ color: 'var(--accent)' }} />
          Google 試算表同步（選用）
        </h3>
        <div className="rounded-lg p-3 mb-4 flex gap-2 text-xs" style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule-soft)', color: 'var(--ink-soft)' }}>
          <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="mb-1"><strong style={{ color: 'var(--ink)' }}>FinanceV2 預設離線運作</strong> — 你的資料只存在這台手機上。</p>
            <p>若要與原版 Finance 共用同一份試算表（同步舊資料 + 跨裝置備份），把那邊的 Apps Script URL 貼進來即可。資料格式 100% 相容，可雙向同步。</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>Apps Script Web App URL</label>
            <input type="text" value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-3 text-sm font-mono theme-input" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleSync(false)} disabled={isSyncing || !scriptUrl}
              className="flex-1 py-3 px-4 font-bold theme-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
              從雲端載入
            </button>
            <button onClick={() => handleSync(true)} disabled={isSyncing || !scriptUrl}
              className="flex-1 py-3 px-4 font-bold theme-button-ghost flex items-center justify-center gap-2 disabled:opacity-50">
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              備份至雲端
            </button>
          </div>

          {syncStatus && (
            <div className="p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in"
              style={{
                background: syncStatus.type === 'success' ? 'var(--olive-soft)' : 'var(--rose-soft)',
                color: syncStatus.type === 'success' ? 'var(--olive)' : 'var(--rose)',
                border: `1px solid ${syncStatus.type === 'success' ? 'var(--olive)' : 'var(--rose)'}`,
              }}>
              {syncStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {syncStatus.msg}
            </div>
          )}

          <details className="text-xs" style={{ color: 'var(--ink-mute)' }}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--ink-soft)' }}>
              如何取得 URL？
            </summary>
            <ol className="mt-2 space-y-1 pl-4 list-decimal">
              <li>到原版 Finance 的「設定」頁面，複製其 Apps Script URL 貼來這裡</li>
              <li>或自行建立 Google Sheet → 擴充功能 → Apps Script → 部署為 Web App</li>
              <li>權限設「任何人」，部署後拿到的 URL 貼上</li>
            </ol>
          </details>
        </div>
      </section>

      {/* ── 信用卡帳單日 ── */}
      <section className="theme-card p-6">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2 font-display" style={{ color: 'var(--ink)' }}>
          <Calendar size={20} style={{ color: 'var(--accent)' }} />
          信用卡帳單日設定
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-mute)' }}>每張卡每月幾號結帳，影響「對帳」和「本期應繳」計算。</p>

        <div className="space-y-2.5">
          {cardBanks.filter(b => b !== '-' && b !== '其他').map(bank => {
            const s = cardSettings[bank];
            return (
              <div key={bank} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule-soft)' }}>
                <div>
                  <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{bank}</div>
                  <div className="text-[10px] font-number" style={{ color: 'var(--ink-mute)' }}>
                    {s?.isNextMonth ? '次月' : '當月'} {s?.statementDay || '--'} 日結帳
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
                    <input type="checkbox" checked={s?.isNextMonth || false} onChange={() => handleToggleNextMonth(bank)} />
                    次月
                  </label>
                  <select value={s?.statementDay || ''} onChange={(e) => handleUpdateStatementDay(bank, e.target.value)}
                    className="p-1.5 text-sm font-bold font-number theme-input"
                    style={{ color: 'var(--accent)' }}>
                    <option value="">--</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <input type="text" placeholder="新增銀行名稱…" value={newBank} onChange={(e) => setNewBank(e.target.value)}
            className="flex-1 p-2.5 text-sm theme-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAddBank()} />
          <button onClick={handleAddBank} disabled={!newBank}
            className="px-4 theme-button-primary disabled:opacity-50" aria-label="新增銀行">
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* ── 預算與類別 ── */}
      <section className="theme-card p-6">
        <h3 className="text-lg font-bold mb-4 font-display" style={{ color: 'var(--ink)' }}>預算與類別</h3>

        <div className="mb-5">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>每月目標預算</label>
          <div className="flex gap-2">
            <input type="number" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)}
              className="flex-1 p-3 font-bold font-number theme-input" />
            <button onClick={handleSaveBudget}
              className="px-4 font-bold theme-button-primary flex items-center gap-1.5"
              style={{ background: isBudgetSaved ? 'var(--olive)' : undefined }}>
              {isBudgetSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {isBudgetSaved ? '已存' : '儲存'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>消費類別</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.map(cat => (
              <div key={cat} className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule)', color: 'var(--ink-soft)' }}>
                <span className="text-xs font-medium">{cat}</span>
                <button onClick={() => onUpdateCategories(categories.filter(c => c !== cat))}
                  className="opacity-60 hover:opacity-100" aria-label={`刪除 ${cat}`}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="新類別…" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 p-2 text-sm theme-input"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
            <button onClick={handleAddCategory} className="px-3 theme-button-primary" aria-label="新增類別">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 危險區域 ── */}
      <section className="theme-card p-6" style={{ background: 'var(--rose-soft)', borderColor: 'var(--rose)' }}>
        <h3 className="text-base font-bold mb-3 flex items-center gap-2 font-display" style={{ color: 'var(--rose)' }}>
          <AlertTriangle size={18} /> 危險區域
        </h3>
        <div className="flex justify-between items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--rose)' }}>重置後本機資料將清空，無法復原。先備份至雲端再執行。</p>
          {confirmReset ? (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg" style={{ background: 'var(--card)', color: 'var(--ink-soft)', border: '1px solid var(--rule)' }}>取消</button>
              <button onClick={() => { onResetData(); setConfirmReset(false); }} className="px-3 py-1.5 text-xs font-bold rounded-lg" style={{ background: 'var(--rose)', color: 'var(--card-raised)' }}>確定重置</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg" style={{ background: 'var(--card)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>重置資料</button>
          )}
        </div>
      </section>

      <p className="text-center text-[10px]" style={{ color: 'var(--ink-faint)' }}>
        H&amp;S 記帳 V2 · v{__APP_VERSION__} · 離線優先 PWA
      </p>
    </div>
  );
};

export default Settings;
