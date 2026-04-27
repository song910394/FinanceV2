
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, List, CreditCard, PieChart, Settings as SettingsIcon, Cloud, CheckCircle2, RefreshCw, AlertCircle, Wallet, WifiOff, Sparkles, CalendarClock, Repeat2, Plus } from 'lucide-react';
import TransactionList from './components/TransactionList';
import Dashboard from './components/Dashboard';
import Reconciliation from './components/Reconciliation';
import Settings from './components/Settings';
import BudgetManager from './components/BudgetManager';
import SalaryHistory from './components/SalaryHistory';
import Insights from './components/Insights';
import Installments from './components/Installments';
import Subscriptions from './components/Subscriptions';
import QuickAdd from './components/QuickAdd';
import { Transaction, DEFAULT_CATEGORIES, CardBank, CardSetting, IncomeSource, MonthlyBudget, SalaryAdjustment, BackupData, Installment, Subscription } from './types';
import { INITIAL_TRANSACTIONS } from './constants';
import { saveToGoogleSheet, loadFromGoogleSheet } from './services/googleSheetService';
import { useTheme } from './hooks/useTheme';

enum Tab {
  DASHBOARD = '概覽',
  TRANSACTIONS = '記帳',
  INSIGHTS = '洞察',
  RECONCILIATION = '對帳',
  INSTALLMENTS = '分期',
  SUBSCRIPTIONS = '訂閱',
  SALARY_HISTORY = '薪資',
  BUDGET = '帳務',
  SETTINGS = '設定'
}

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline';

// FinanceV2: 資料 100% 存 localStorage（離線優先）。雲端同步是「選用」備份。
const LS_KEY = 'hs_finance_v2_state';
const LS_URL_KEY = 'google_script_url';
const LS_LAST_SYNC_KEY = 'hs_last_sync_v2';

interface PersistedState {
  transactions: Transaction[];
  categories: string[];
  cardBanks: string[];
  budget: number;
  cardSettings: Record<string, CardSetting>;
  incomeSources: IncomeSource[];
  budgets: MonthlyBudget[];
  salaryAdjustments: SalaryAdjustment[];
  installments?: Installment[];
  subscriptions?: Subscription[];
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);

  // 初始化：localStorage > INITIAL_TRANSACTIONS（空陣列）
  const persisted = loadPersisted();

  const [transactions, setTransactions] = useState<Transaction[]>(persisted?.transactions || INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<string[]>(persisted?.categories || DEFAULT_CATEGORIES);
  const [cardBanks, setCardBanks] = useState<string[]>(persisted?.cardBanks || Object.values(CardBank));
  const [budget, setBudget] = useState<number>(persisted?.budget ?? 50000);
  const [cardSettings, setCardSettings] = useState<Record<string, CardSetting>>(persisted?.cardSettings || {});
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(persisted?.incomeSources || [
    { id: '1', name: '姑姑給' },
    { id: '2', name: '媽媽給' },
    { id: '3', name: '薪水入帳', defaultDay: 6 },
    { id: '4', name: '哩婆給' },
  ]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>(persisted?.budgets || []);
  const [salaryAdjustments, setSalaryAdjustments] = useState<SalaryAdjustment[]>(persisted?.salaryAdjustments || []);
  const [installments, setInstallments] = useState<Installment[]>((persisted as any)?.installments || []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>((persisted as any)?.subscriptions || []);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // 雲端同步狀態
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => {
    try { return localStorage.getItem(LS_URL_KEY) || ''; } catch { return ''; }
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    try { return localStorage.getItem(LS_LAST_SYNC_KEY) || ''; } catch { return ''; }
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const isFirstMount = useRef(true);

  // 監聽連線狀態
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // 任何狀態變動 → 立即寫 localStorage（離線安全網）
  useEffect(() => {
    savePersisted({
      transactions, categories, cardBanks, budget, cardSettings,
      incomeSources, budgets, salaryAdjustments, installments, subscriptions
    });
  }, [transactions, categories, cardBanks, budget, cardSettings, incomeSources, budgets, salaryAdjustments, installments, subscriptions]);

  // V2 關鍵差異：自動同步只在「使用者已主動設定 URL」後才啟動
  // 第一次開 APP（沒設 URL）= 完全離線、不會跟網路打交道
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!googleScriptUrl) return; // 沒設 URL 就完全不同步
    if (!isOnline) { setSyncStatus('offline'); return; }

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        await saveToGoogleSheet(googleScriptUrl, {
          transactions, categories, budget, cardBanks, cardSettings,
          incomeSources, budgets, salaryAdjustments, installments, subscriptions
        });
        setSyncStatus('saved');
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(t);
        try { localStorage.setItem(LS_LAST_SYNC_KEY, t); } catch {}
      } catch (e) {
        console.error('Auto-save failed', e);
        setSyncStatus('error');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [transactions, categories, budget, cardBanks, cardSettings, incomeSources, budgets, salaryAdjustments, installments, subscriptions, googleScriptUrl, isOnline]);

  // 從雲端載入（手動觸發）
  const handleManualLoad = useCallback(async (url: string) => {
    setSyncStatus('syncing');
    try {
      const data = await loadFromGoogleSheet(url);
      if (data) {
        if (data.transactions) setTransactions(data.transactions);
        if (data.categories) setCategories(data.categories);
        if (typeof data.budget === 'number') setBudget(data.budget);
        if (data.cardBanks) setCardBanks(data.cardBanks);
        if (data.cardSettings) setCardSettings(data.cardSettings);
        if (data.incomeSources) setIncomeSources(data.incomeSources);
        if (data.budgets) setBudgets(data.budgets);
        if (data.salaryAdjustments) setSalaryAdjustments(data.salaryAdjustments);
        if ((data as any).installments) setInstallments((data as any).installments);
        if ((data as any).subscriptions) setSubscriptions((data as any).subscriptions);
        setSyncStatus('saved');
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(t);
        try { localStorage.setItem(LS_LAST_SYNC_KEY, t); } catch {}
      } else {
        setSyncStatus('idle');
      }
    } catch (e) {
      console.error('Manual load failed', e);
      setSyncStatus('error');
      throw e;
    }
  }, []);

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...newTx, id: Math.random().toString(36).substr(2, 9) }, ...prev]);
  };
  const addTransactions = (newTxs: Omit<Transaction, 'id'>[], newCats?: string[], newBanks?: string[]) => {
    if (newCats?.length) setCategories(prev => Array.from(new Set([...prev, ...newCats])));
    if (newBanks?.length) setCardBanks(prev => Array.from(new Set([...prev, ...newBanks])));
    const toAdd = newTxs.map(tx => ({ ...tx, id: Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 5) }));
    setTransactions(prev => [...toAdd, ...prev]);
  };
  const editTransaction = (id: string, updatedTx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTx } : t));
  };
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));
  const toggleReconcile = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const ns = !t.isReconciled;
      return { ...t, isReconciled: ns, reconciledDate: ns ? new Date().toISOString() : undefined };
    }));
  };
  const addSalaryAdjustment = (adj: Omit<SalaryAdjustment, 'id'>) => setSalaryAdjustments(prev => [...prev, { ...adj, id: Math.random().toString(36).substr(2, 9) }]);
  const deleteSalaryAdjustment = (id: string) => setSalaryAdjustments(prev => prev.filter(t => t.id !== id));

  const resetData = () => {
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setCardBanks(Object.values(CardBank));
    setBudget(50000);
    setCardSettings({});
    setIncomeSources([]);
    setBudgets([]);
    setSalaryAdjustments([]);
    setInstallments([]);
    setSubscriptions([]);
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_LAST_SYNC_KEY);
    } catch {}
  };

  // 分期 / 訂閱 actions
  const addInstallment = (it: Omit<Installment, 'id'>) => setInstallments(prev => [...prev, { ...it, id: Math.random().toString(36).slice(2, 11) }]);
  const editInstallment = (id: string, patch: Partial<Installment>) => setInstallments(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const deleteInstallment = (id: string) => setInstallments(prev => prev.filter(i => i.id !== id));
  const addSubscription = (s: Omit<Subscription, 'id'>) => setSubscriptions(prev => [...prev, { ...s, id: Math.random().toString(36).slice(2, 11) }]);
  const editSubscription = (id: string, patch: Partial<Subscription>) => setSubscriptions(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const deleteSubscription = (id: string) => setSubscriptions(prev => prev.filter(i => i.id !== id));

  // N 鍵快捷 → 打開快速記一筆
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setQuickAddOpen(true); }
      if (e.key === 'Escape') setQuickAddOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 設定頁的同步操作
  const handleSettingsSync = async (url: string, isUpload: boolean) => {
    setGoogleScriptUrl(url);
    try { localStorage.setItem(LS_URL_KEY, url); } catch {}
    if (isUpload) {
      await saveToGoogleSheet(url, { transactions, categories, budget, cardBanks, cardSettings, incomeSources, budgets, salaryAdjustments, installments, subscriptions } as BackupData);
      setSyncStatus('saved');
      const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(t);
      try { localStorage.setItem(LS_LAST_SYNC_KEY, t); } catch {}
    } else {
      await handleManualLoad(url);
    }
  };

  const renderSyncIcon = () => {
    if (!isOnline) return <WifiOff size={16} style={{ color: 'var(--ink-mute)' }} />;
    if (!googleScriptUrl) return <Cloud size={16} style={{ color: 'var(--ink-faint)' }} />;
    if (syncStatus === 'syncing') return <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />;
    if (syncStatus === 'saved') return <CheckCircle2 size={16} style={{ color: 'var(--olive)' }} />;
    if (syncStatus === 'error') return <AlertCircle size={16} style={{ color: 'var(--rose)' }} />;
    return <Cloud size={16} style={{ color: 'var(--ink-mute)' }} />;
  };

  const syncLabel =
    !isOnline ? '離線中' :
    !googleScriptUrl ? '未連線' :
    syncStatus === 'syncing' ? '同步中…' :
    syncStatus === 'saved' ? `已同步 ${lastSyncedTime}` :
    syncStatus === 'error' ? '同步失敗' :
    '本機儲存';

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-paper font-sans" style={{ background: 'var(--paper)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col h-full shrink-0 z-20" style={{ background: 'var(--card)', borderRight: '1px solid var(--rule)' }}>
        <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid var(--rule-soft)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--card-raised)', boxShadow: 'var(--shadow-pop)' }}>
            <PieChart size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-display title-gradient" style={{ color: 'var(--ink)' }}>
            H&amp;S 記帳 V2
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20} />} label={Tab.DASHBOARD} isActive={activeTab === Tab.DASHBOARD} onClick={() => setActiveTab(Tab.DASHBOARD)} />
          <NavItem icon={<List size={20} />} label={Tab.TRANSACTIONS} isActive={activeTab === Tab.TRANSACTIONS} onClick={() => setActiveTab(Tab.TRANSACTIONS)} />
          <NavItem icon={<Sparkles size={20} />} label={Tab.INSIGHTS} isActive={activeTab === Tab.INSIGHTS} onClick={() => setActiveTab(Tab.INSIGHTS)} />
          <NavItem icon={<CreditCard size={20} />} label={Tab.RECONCILIATION} isActive={activeTab === Tab.RECONCILIATION} onClick={() => setActiveTab(Tab.RECONCILIATION)} />
          <NavItem icon={<CalendarClock size={20} />} label={Tab.INSTALLMENTS} isActive={activeTab === Tab.INSTALLMENTS} onClick={() => setActiveTab(Tab.INSTALLMENTS)} />
          <NavItem icon={<Repeat2 size={20} />} label={Tab.SUBSCRIPTIONS} isActive={activeTab === Tab.SUBSCRIPTIONS} onClick={() => setActiveTab(Tab.SUBSCRIPTIONS)} />
          <NavItem icon={<Wallet size={20} />} label={Tab.SALARY_HISTORY} isActive={activeTab === Tab.SALARY_HISTORY} onClick={() => setActiveTab(Tab.SALARY_HISTORY)} />
          <NavItem icon={<PieChart size={20} />} label={Tab.BUDGET} isActive={activeTab === Tab.BUDGET} onClick={() => setActiveTab(Tab.BUDGET)} />
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--rule-soft)' }}>
            <NavItem icon={<SettingsIcon size={20} />} label={Tab.SETTINGS} isActive={activeTab === Tab.SETTINGS} onClick={() => setActiveTab(Tab.SETTINGS)} />
          </div>
        </nav>
        <div className="p-4" style={{ background: 'var(--paper-soft)', borderTop: '1px solid var(--rule-soft)' }}>
          <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
            {renderSyncIcon()}
            <span className="font-number">{syncLabel}</span>
          </div>
          <p className="text-[10px] mt-2 font-display" style={{ color: 'var(--ink-faint)' }}>© 2026 H&amp;S V2 · v{__APP_VERSION__}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="lg:hidden pt-safe px-4 py-3 flex justify-between items-center z-10 shrink-0" style={{ background: 'var(--card)', borderBottom: '1px solid var(--rule-soft)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--card-raised)' }}>
              <PieChart size={16} />
            </div>
            <h1 className="text-lg font-bold font-display title-gradient" style={{ color: 'var(--ink)' }}>H&amp;S 記帳 V2</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule-soft)' }}>
            {renderSyncIcon()}
            {syncStatus === 'saved' && <span className="text-[10px] font-number" style={{ color: 'var(--ink-mute)' }}>{lastSyncedTime}</span>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide" style={{ background: 'var(--paper)' }}>
          <div className="p-4 pb-28 md:p-8 md:pb-8 max-w-7xl mx-auto">
            {activeTab === Tab.DASHBOARD && (
              <Dashboard
                transactions={transactions}
                budget={budget}
                cardBanks={cardBanks}
                cardSettings={cardSettings}
                installments={installments}
                subscriptions={subscriptions}
                onJumpTab={(t: string) => {
                  const map: Record<string, Tab> = {
                    transactions: Tab.TRANSACTIONS, insights: Tab.INSIGHTS,
                    reconciliation: Tab.RECONCILIATION, installments: Tab.INSTALLMENTS,
                    subscriptions: Tab.SUBSCRIPTIONS, budget: Tab.BUDGET, salary: Tab.SALARY_HISTORY,
                  };
                  if (map[t]) setActiveTab(map[t]);
                }}
                onQuickAdd={() => setQuickAddOpen(true)}
              />
            )}
            {activeTab === Tab.INSIGHTS && (
              <Insights transactions={transactions} budget={budget} categories={categories} />
            )}
            {activeTab === Tab.INSTALLMENTS && (
              <Installments installments={installments} cardBanks={cardBanks} categories={categories}
                onAdd={addInstallment} onEdit={editInstallment} onDelete={deleteInstallment} />
            )}
            {activeTab === Tab.SUBSCRIPTIONS && (
              <Subscriptions subscriptions={subscriptions} cardBanks={cardBanks} categories={categories}
                onAdd={addSubscription} onEdit={editSubscription} onDelete={deleteSubscription} />
            )}
            {activeTab === Tab.TRANSACTIONS && (
              <TransactionList transactions={transactions} categories={categories} cardBanks={cardBanks}
                onAddTransaction={addTransaction} onAddTransactions={addTransactions}
                onEditTransaction={editTransaction} onDeleteTransaction={deleteTransaction}
                onToggleReconcile={toggleReconcile} />
            )}
            {activeTab === Tab.SALARY_HISTORY && (
              <SalaryHistory adjustments={salaryAdjustments} onAddAdjustment={addSalaryAdjustment} onDeleteAdjustment={deleteSalaryAdjustment} />
            )}
            {activeTab === Tab.RECONCILIATION && (
              <Reconciliation transactions={transactions} cardBanks={cardBanks} cardSettings={cardSettings}
                onToggleReconcile={toggleReconcile} onAddTransaction={addTransaction} onUpdateCardSettings={setCardSettings} />
            )}
            {activeTab === Tab.BUDGET && (
              <BudgetManager transactions={transactions} cardBanks={cardBanks} cardSettings={cardSettings}
                incomeSources={incomeSources} budgets={budgets}
                onUpdateIncomeSources={setIncomeSources} onUpdateBudgets={setBudgets} />
            )}
            {activeTab === Tab.SETTINGS && (
              <Settings categories={categories} budget={budget} cardBanks={cardBanks} cardSettings={cardSettings}
                onUpdateCategories={setCategories} onUpdateBudget={setBudget}
                onUpdateCardBanks={setCardBanks} onUpdateCardSettings={setCardSettings}
                onCloudSync={handleSettingsSync} onResetData={resetData}
                currentTheme={theme} onChangeTheme={setTheme}
                currentUrl={googleScriptUrl} />
            )}
          </div>
        </main>

        {/* 手機 FAB - 快速記一筆 */}
        <button
          className="lg:hidden fixed right-5 z-40 active:scale-95 transition-transform"
          style={{
            bottom: 'calc(var(--bottom-nav-h, 4rem) + env(safe-area-inset-bottom, 0px) + 16px)',
            background: 'var(--ink)', color: 'var(--card)',
            width: 56, height: 56, borderRadius: 18,
            boxShadow: 'var(--shadow-pop)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setQuickAddOpen(true)}
          aria-label="快速記一筆"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {/* Mobile bottom nav (可橫滾) */}
        <nav className="lg:hidden fixed bottom-0 w-full z-50 pb-safe" style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--rule-soft)', '--bottom-nav-h': '4rem' } as any}>
          <div className="flex overflow-x-auto scrollbar-hide h-16" style={{ scrollSnapType: 'x mandatory' }}>
            <MobileNavItem icon={<LayoutDashboard size={18} />} label="概覽" isActive={activeTab === Tab.DASHBOARD} onClick={() => setActiveTab(Tab.DASHBOARD)} />
            <MobileNavItem icon={<List size={18} />} label="記帳" isActive={activeTab === Tab.TRANSACTIONS} onClick={() => setActiveTab(Tab.TRANSACTIONS)} />
            <MobileNavItem icon={<Sparkles size={18} />} label="洞察" isActive={activeTab === Tab.INSIGHTS} onClick={() => setActiveTab(Tab.INSIGHTS)} />
            <MobileNavItem icon={<CreditCard size={18} />} label="對帳" isActive={activeTab === Tab.RECONCILIATION} onClick={() => setActiveTab(Tab.RECONCILIATION)} />
            <MobileNavItem icon={<CalendarClock size={18} />} label="分期" isActive={activeTab === Tab.INSTALLMENTS} onClick={() => setActiveTab(Tab.INSTALLMENTS)} />
            <MobileNavItem icon={<Repeat2 size={18} />} label="訂閱" isActive={activeTab === Tab.SUBSCRIPTIONS} onClick={() => setActiveTab(Tab.SUBSCRIPTIONS)} />
            <MobileNavItem icon={<Wallet size={18} />} label="薪資" isActive={activeTab === Tab.SALARY_HISTORY} onClick={() => setActiveTab(Tab.SALARY_HISTORY)} />
            <MobileNavItem icon={<PieChart size={18} />} label="帳務" isActive={activeTab === Tab.BUDGET} onClick={() => setActiveTab(Tab.BUDGET)} />
            <MobileNavItem icon={<SettingsIcon size={18} />} label="設定" isActive={activeTab === Tab.SETTINGS} onClick={() => setActiveTab(Tab.SETTINGS)} />
          </div>
        </nav>
      </div>

      {/* 全域 QuickAdd 底部彈窗 */}
      {quickAddOpen && (
        <QuickAdd
          categories={categories}
          cardBanks={cardBanks}
          onClose={() => setQuickAddOpen(false)}
          onSubmit={(tx) => { addTransaction(tx); setQuickAddOpen(false); }}
        />
      )}
    </div>
  );
}

const NavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
  <button onClick={onClick}
    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group outline-none pressable"
    style={{
      background: isActive ? 'var(--accent-soft)' : 'transparent',
      color: isActive ? 'var(--accent-deep)' : 'var(--ink-soft)',
      fontWeight: isActive ? 700 : 500,
    }}
    aria-label={label}>
    <span style={{ color: isActive ? 'var(--accent)' : 'var(--ink-mute)' }}>{icon}</span>
    <span>{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
  <button onClick={onClick}
    className="shrink-0 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform outline-none rounded-lg"
    style={{ width: 64, scrollSnapAlign: 'start' }}
    aria-label={label}>
    <div className="p-1.5 rounded-xl transition-all duration-200"
      style={{
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--ink-mute)',
        transform: isActive ? 'translateY(-2px)' : 'none',
      }}>{icon}</div>
    <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--ink-mute)' }}>{label}</span>
  </button>
);

export default App;
