import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Mic, Camera, ArrowRight, CalendarClock, Repeat2, CreditCard, Sparkles, TrendingUp, TrendingDown, PieChart as PieIcon } from 'lucide-react';
import { Transaction, CardSetting, Installment, Subscription, PaymentMethod } from '../types';
import { getCategoryColor } from '../constants';

interface Props {
  transactions: Transaction[];
  budget: number;
  cardBanks: string[];
  cardSettings: Record<string, CardSetting>;
  installments: Installment[];
  subscriptions: Subscription[];
  onJumpTab: (t: string) => void;
  onQuickAdd: () => void;
}

const NT = (n: number) => 'NT$ ' + Math.round(n).toLocaleString();
const formatBig = (n: number) => Math.round(n).toLocaleString();

const CAT_ICON: Record<string, string> = {
  '食': '🍜', '衣': '👕', '住': '🏠', '行': '🚗', '育': '📚', '樂': '🎮',
  '其他': '✨', '信用卡出帳': '💳', '代買': '🛍️',
};

const Dashboard: React.FC<Props> = ({ transactions, budget, cardBanks, cardSettings, installments, subscriptions, onJumpTab, onQuickAdd }) => {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [yy, mm] = month.split('-').map(Number);
  const monthLabel = `${yy}.${String(mm).padStart(2, '0')}`;
  const today = new Date();
  const isCurrent = month === today.toISOString().slice(0, 7);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = isCurrent ? today.getDate() : daysInMonth;
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth);

  // 過濾本月（不含信用卡出帳虛擬交易，避免重複算）
  const monthTxs = useMemo(() =>
    transactions.filter(t => t.date.startsWith(month) && t.category !== '信用卡出帳'),
    [transactions, month]
  );
  const totalSpent = monthTxs.reduce((s, t) => s + t.amount, 0);

  // 上月比較
  const prevMonth = useMemo(() => {
    const d = new Date(yy, mm - 2, 1);
    return d.toISOString().slice(0, 7);
  }, [yy, mm]);
  const prevTotal = useMemo(() =>
    transactions.filter(t => t.date.startsWith(prevMonth) && t.category !== '信用卡出帳').reduce((s, t) => s + t.amount, 0),
    [transactions, prevMonth]
  );
  const monthDelta = prevTotal ? Math.round(((totalSpent - prevTotal) / prevTotal) * 100) : 0;

  // 預算進度
  const pct = budget > 0 ? Math.min(150, (totalSpent / budget) * 100) : 0;
  const remaining = budget - totalSpent;
  const dailyAllowed = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0;
  const dailyAvg = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;

  // 分類
  const categoryBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    monthTxs.forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name), pct: totalSpent ? (value / totalSpent) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [monthTxs, totalSpent]);

  // 最近交易
  const recent = useMemo(() =>
    [...monthTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [monthTxs]
  );

  // 即將承擔的支出（未來 30 天的訂閱 + 進行中的分期月支出）
  const commitments = useMemo(() => {
    const subActive = subscriptions.filter(s => s.isActive);
    const installActive = installments.filter(i => i.paidPeriods < i.totalPeriods);
    const subMonthly = subActive.reduce((s, sub) => {
      const factor = sub.frequency === 'monthly' ? 1 : sub.frequency === 'yearly' ? 1/12 : sub.frequency === 'quarterly' ? 1/3 : 4.33;
      return s + sub.amount * factor;
    }, 0);
    const instMonthly = installActive.reduce((s, i) => s + i.monthlyAmount, 0);
    return { subActive: subActive.length, installActive: installActive.length, subMonthly, instMonthly };
  }, [subscriptions, installments]);

  // 未對帳信用卡（簡單版：cardBank != '-' && !isReconciled）
  const cardUnreconciled = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.filter(t => t.paymentMethod === PaymentMethod.CREDIT_CARD && !t.isReconciled && t.cardBank !== '-')
      .forEach(t => { m[t.cardBank] = (m[t.cardBank] || 0) + t.amount; });
    return Object.entries(m).map(([bank, amt]) => ({ bank, amt })).sort((a, b) => b.amt - a.amt);
  }, [transactions]);

  const goPrevMonth = () => {
    const d = new Date(yy, mm - 2, 1);
    setMonth(d.toISOString().slice(0, 7));
  };
  const goNextMonth = () => {
    const d = new Date(yy, mm, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-5">
      {/* Header: 月份切換 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: 'var(--ink-faint)' }}>OVERVIEW · {monthLabel}</p>
          <h1 className="text-3xl font-bold font-display" style={{ color: 'var(--ink)' }}>本月概覽</h1>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-full" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <button onClick={goPrevMonth} className="p-1.5 rounded-full hover:opacity-70" style={{ color: 'var(--ink-mute)' }}><ChevronLeft size={16} /></button>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-transparent font-number text-sm font-medium outline-none w-[110px] text-center"
            style={{ color: 'var(--ink)' }} />
          <button onClick={goNextMonth} className="p-1.5 rounded-full hover:opacity-70" style={{ color: 'var(--ink-mute)' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Hero: 已花 大數字 */}
      <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
        <div className="flex items-baseline gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>已花</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-medium" style={{ color: 'var(--ink-mute)' }}>NT$</span>
              <span className="text-6xl md:text-7xl font-bold font-number tracking-tight" style={{ color: 'var(--ink)' }}>
                {formatBig(totalSpent)}
              </span>
            </div>
          </div>
          {prevTotal > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full ml-auto"
              style={{
                background: monthDelta > 0 ? 'var(--rose-soft, #F8E8E2)' : 'var(--olive-soft, #ECEEDA)',
                color: monthDelta > 0 ? 'var(--rose, #B0563A)' : 'var(--olive, #6B6B47)',
              }}>
              {monthDelta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="text-xs font-number font-bold">{monthDelta > 0 ? '+' : ''}{monthDelta}% vs 上月</span>
            </div>
          )}
        </div>

        {/* 預算進度條 */}
        {budget > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-baseline mb-1.5">
              <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>預算 <span className="font-number">{NT(budget)}</span></p>
              <p className="text-xs font-number font-bold" style={{ color: pct > 100 ? 'var(--rose, #B0563A)' : 'var(--ink-soft)' }}>{Math.round(pct)}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-soft)' }}>
              <div style={{
                width: Math.min(100, pct) + '%',
                height: '100%',
                background: pct > 100 ? 'var(--rose, #B0563A)' : pct > 80 ? 'var(--accent)' : 'var(--olive, #94946D)',
                transition: 'width .5s'
              }} />
            </div>
          </div>
        )}

        {/* 每日可花 / 已花平均 */}
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5" style={{ borderTop: '1px solid var(--rule-soft)' }}>
          <div>
            <p className="text-[10px] tracking-wide" style={{ color: 'var(--ink-faint)' }}>每日可花</p>
            <p className="text-xl font-bold font-number mt-1" style={{ color: 'var(--ink)' }}>{NT(dailyAllowed)}</p>
            <p className="text-[10px] mt-0.5 font-number" style={{ color: 'var(--ink-mute)' }}>剩餘 {daysLeft} 天</p>
          </div>
          <div>
            <p className="text-[10px] tracking-wide" style={{ color: 'var(--ink-faint)' }}>目前日均</p>
            <p className="text-xl font-bold font-number mt-1" style={{ color: 'var(--ink)' }}>{NT(dailyAvg)}/日</p>
            <p className="text-[10px] mt-0.5" style={{ color: dailyAvg > dailyAllowed ? 'var(--rose, #B0563A)' : 'var(--olive, #94946D)' }}>
              {dailyAvg > dailyAllowed ? '超出步調' : '節奏剛好'}
            </p>
          </div>
        </div>
      </div>

      {/* 快速記一筆 CTA */}
      <button onClick={onQuickAdd}
        className="w-full p-4 rounded-2xl flex items-center gap-3 active:scale-[0.99] transition-transform"
        style={{ background: 'var(--ink)', color: 'var(--card)', boxShadow: 'var(--shadow-pop)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-raised, rgba(255,255,255,0.12))' }}>
          <Plus size={20} />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold font-display">快速記一筆</p>
          <p className="text-[11px] opacity-70 font-number">按 N 鍵</p>
        </div>
        <Camera size={18} className="opacity-60" />
        <Mic size={18} className="opacity-60" />
      </button>

      {/* 兩欄：本月分類 + 最近紀錄 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 分類 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--ink-faint)' }}>BY CATEGORY</p>
              <h3 className="font-bold font-display" style={{ color: 'var(--ink)' }}>本月分類</h3>
            </div>
            <button onClick={() => onJumpTab('insights')} className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-mute)' }}>
              洞察 <ArrowRight size={12} />
            </button>
          </div>
          {categoryBreakdown.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--ink-mute)' }}>
              <PieIcon size={28} className="mx-auto mb-2 opacity-40" />
              本月還沒有支出
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.slice(0, 5).map(c => (
                <div key={c.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{CAT_ICON[c.name] || '·'}</span>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--ink)' }}>{c.name}</span>
                    <span className="text-[10px] font-number" style={{ color: 'var(--ink-mute)' }}>{Math.round(c.pct)}%</span>
                    <span className="text-sm font-number font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{NT(c.value)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--paper-soft)' }}>
                    <div style={{ width: c.pct + '%', height: '100%', background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近紀錄 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--ink-faint)' }}>RECENT</p>
              <h3 className="font-bold font-display" style={{ color: 'var(--ink)' }}>最近紀錄</h3>
            </div>
            <button onClick={() => onJumpTab('transactions')} className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-mute)' }}>
              全部 <ArrowRight size={12} />
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--ink-mute)' }}>—</div>
          ) : (
            <div className="space-y-1">
              {recent.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--rule-soft)' }}>
                  <span className="text-lg">{CAT_ICON[t.category] || '·'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{t.description || t.category}</p>
                    <p className="text-[10px] font-number" style={{ color: 'var(--ink-faint)' }}>{t.date.slice(5)} · {t.cardBank === '-' ? '現金' : t.cardBank}</p>
                  </div>
                  <span className="text-sm font-number font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{NT(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commitments: 承擔中的支出 */}
      <div>
        <p className="text-[10px] tracking-[0.2em] mb-2" style={{ color: 'var(--ink-faint)' }}>COMMITMENTS · 承擔中</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CommitCard
            title="分期付款"
            count={commitments.installActive}
            monthly={commitments.instMonthly}
            icon={<CalendarClock size={18} />}
            empty="尚無分期"
            onClick={() => onJumpTab('installments')}
          />
          <CommitCard
            title="定期支出"
            count={commitments.subActive}
            monthly={commitments.subMonthly}
            icon={<Repeat2 size={18} />}
            empty="尚無訂閱"
            onClick={() => onJumpTab('subscriptions')}
          />
          <CommitCard
            title="未對帳信用卡"
            count={cardUnreconciled.length}
            monthly={cardUnreconciled.reduce((s, c) => s + c.amt, 0)}
            icon={<CreditCard size={18} />}
            empty="全部對帳完畢"
            onClick={() => onJumpTab('reconciliation')}
            isUnit
          />
        </div>
      </div>

      {/* 洞察跳轉提示 */}
      <button onClick={() => onJumpTab('insights')} className="w-full p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.99]"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent-deep)' }}>
        <Sparkles size={18} />
        <span className="flex-1 text-left font-medium">看看這個月的消費洞察</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

const CommitCard = ({ title, count, monthly, icon, empty, onClick, isUnit }: {
  title: string; count: number; monthly: number; icon: React.ReactNode; empty: string; onClick: () => void; isUnit?: boolean;
}) => (
  <button onClick={onClick}
    className="p-4 rounded-2xl text-left transition-all active:scale-[0.98] hover:shadow-md"
    style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--paper-soft)', color: 'var(--ink-soft)' }}>
        {icon}
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--ink-mute)' }}>{title}</span>
      <ArrowRight size={12} className="ml-auto" style={{ color: 'var(--ink-faint)' }} />
    </div>
    {count === 0 ? (
      <p className="text-sm py-2" style={{ color: 'var(--ink-faint)' }}>{empty}</p>
    ) : (
      <>
        <p className="text-2xl font-bold font-number" style={{ color: 'var(--ink)' }}>{NT(monthly)}</p>
        <p className="text-[10px] mt-0.5 font-number" style={{ color: 'var(--ink-mute)' }}>
          {count} {isUnit ? '張卡' : '項'} · {isUnit ? '未對帳金額' : '本月承擔'}
        </p>
      </>
    )}
  </button>
);

export default Dashboard;
