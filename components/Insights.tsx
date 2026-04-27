import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  budget: number;
  categories: string[];
}

const NT = (n: number) => 'NT$ ' + Math.round(n).toLocaleString();

const Insights: React.FC<Props> = ({ transactions, budget }) => {
  // 過去 6 個月趨勢
  const trend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const total = transactions
        .filter(t => t.date.startsWith(key) && t.category !== '信用卡出帳')
        .reduce((s, t) => s + t.amount, 0);
      months.push({ key, label: (d.getMonth() + 1) + '月', total });
    }
    return months;
  }, [transactions]);

  const maxTrend = Math.max(...trend.map(m => m.total), 1);
  const thisMonth = trend[trend.length - 1]?.total || 0;
  const lastMonth = trend[trend.length - 2]?.total || 0;
  const monthDelta = lastMonth ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  // 本月分類 + 對比上月
  const catCompare = useMemo(() => {
    const thisKey = trend[trend.length - 1]?.key;
    const lastKey = trend[trend.length - 2]?.key;
    const accumulate = (key: string) => {
      const m: Record<string, number> = {};
      transactions
        .filter(t => t.date.startsWith(key || '__') && t.category !== '信用卡出帳')
        .forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
      return m;
    };
    const tn = accumulate(thisKey || ''); const ln = accumulate(lastKey || '');
    const cats = Array.from(new Set([...Object.keys(tn), ...Object.keys(ln)]));
    return cats.map(c => ({ cat: c, now: tn[c] || 0, prev: ln[c] || 0, delta: (tn[c] || 0) - (ln[c] || 0) }))
      .sort((a, b) => b.now - a.now);
  }, [transactions, trend]);

  // Top 商家 (依 description)
  const topVendors = useMemo(() => {
    const thisKey = trend[trend.length - 1]?.key;
    const m: Record<string, { count: number; total: number }> = {};
    transactions.filter(t => t.date.startsWith(thisKey || '__') && t.category !== '信用卡出帳' && t.description)
      .forEach(t => {
        const k = t.description.slice(0, 16);
        if (!m[k]) m[k] = { count: 0, total: 0 };
        m[k].count++; m[k].total += t.amount;
      });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [transactions, trend]);

  // 平日 vs 週末
  const weekdayWeekend = useMemo(() => {
    const thisKey = trend[trend.length - 1]?.key;
    let wd = 0, we = 0;
    transactions.filter(t => t.date.startsWith(thisKey || '__') && t.category !== '信用卡出帳').forEach(t => {
      const day = new Date(t.date).getDay();
      if (day === 0 || day === 6) we += t.amount; else wd += t.amount;
    });
    return { weekday: wd, weekend: we };
  }, [transactions, trend]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: 'var(--ink-faint)' }}>INSIGHTS</p>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          消費洞察 <Sparkles size={22} style={{ color: 'var(--accent)' }} />
        </h1>
      </div>

      {/* 月對月 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>本月已花</p>
          <p className="text-[10px] font-number" style={{ color: 'var(--ink-faint)' }}>vs 上月</p>
        </div>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-bold font-number" style={{ color: 'var(--ink)' }}>{NT(thisMonth)}</p>
          {lastMonth > 0 && (
            <span className="text-sm font-number flex items-center gap-1"
              style={{ color: monthDelta > 0 ? 'var(--rose, #B0563A)' : 'var(--olive, #94946D)' }}>
              {monthDelta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {monthDelta > 0 ? '多' : '少'}{Math.abs(Math.round(monthDelta))}%
            </span>
          )}
        </div>

        {/* 6 個月趨勢柱 */}
        <div className="mt-5 flex items-end gap-2 h-28">
          {trend.map((m, i) => {
            const h = Math.max(3, (m.total / maxTrend) * 100);
            const isThis = i === trend.length - 1;
            return (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-number" style={{ color: isThis ? 'var(--ink)' : 'var(--ink-faint)' }}>{m.total ? Math.round(m.total / 1000) + 'k' : '—'}</span>
                <div className="w-full rounded-t-md transition-all" style={{
                  height: h + '%',
                  background: isThis ? 'var(--accent)' : 'var(--paper-deep, var(--paper-soft))',
                  border: isThis ? 'none' : '1px solid var(--rule-soft)',
                  borderBottom: 'none'
                }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-mute)', fontWeight: isThis ? 700 : 400 }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 分類對比 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
        <h2 className="font-display font-bold mb-3" style={{ color: 'var(--ink)' }}>分類變化</h2>
        <div className="space-y-2">
          {catCompare.slice(0, 6).map(c => {
            const pctOfNow = thisMonth ? (c.now / thisMonth) * 100 : 0;
            const up = c.delta > 0;
            return (
              <div key={c.cat} className="py-2">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.cat}</span>
                  <span className="font-number text-sm" style={{ color: 'var(--ink-soft)' }}>
                    {NT(c.now)}{c.prev > 0 && (
                      <span className="ml-2 text-[11px]" style={{ color: up ? 'var(--rose, #B0563A)' : 'var(--olive, #94946D)' }}>
                        {up ? '+' : ''}{NT(c.delta)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--paper-soft)' }}>
                  <div style={{ width: pctOfNow + '%', height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
            );
          })}
          {catCompare.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--ink-mute)' }}>本月還沒有支出紀錄。</p>}
        </div>
      </div>

      {/* 平日 vs 週末 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>平日花費</p>
          <p className="text-xl font-bold font-number mt-1" style={{ color: 'var(--ink)' }}>{NT(weekdayWeekend.weekday)}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-deep)' }}>週末花費</p>
          <p className="text-xl font-bold font-number mt-1" style={{ color: 'var(--accent-deep)' }}>{NT(weekdayWeekend.weekend)}</p>
        </div>
      </div>

      {/* Top 商家 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
        <h2 className="font-display font-bold mb-3" style={{ color: 'var(--ink)' }}>本月最常出現</h2>
        <div className="space-y-1.5">
          {topVendors.length === 0 && <p className="text-sm py-2" style={{ color: 'var(--ink-mute)' }}>—</p>}
          {topVendors.map(([name, v], i) => (
            <div key={name} className="flex items-center gap-3 py-1.5">
              <span className="w-5 text-center text-xs font-number" style={{ color: 'var(--ink-faint)' }}>{i + 1}</span>
              <span className="flex-1 truncate text-sm" style={{ color: 'var(--ink)' }}>{name}</span>
              <span className="text-xs" style={{ color: 'var(--ink-mute)' }}>{v.count} 次</span>
              <span className="font-number text-sm font-bold" style={{ color: 'var(--ink)' }}>{NT(v.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 預算狀態提示 */}
      {budget > 0 && (
        <div className="p-4 rounded-2xl text-sm" style={{
          background: thisMonth > budget ? 'var(--rose-soft, #F8E8E2)' : 'var(--olive-soft, #ECEEDA)',
          color: thisMonth > budget ? 'var(--rose, #B0563A)' : 'var(--olive, #6B6B47)',
          border: '1px solid var(--rule-soft)'
        }}>
          {thisMonth > budget
            ? `已超過本月預算 ${NT(thisMonth - budget)}，要踩煞車了。`
            : `距離本月預算還有 ${NT(budget - thisMonth)} 的空間，繼續保持。`}
        </div>
      )}
    </div>
  );
};

export default Insights;
