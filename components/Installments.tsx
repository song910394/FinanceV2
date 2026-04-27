import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Installment } from '../types';

interface Props {
  installments: Installment[];
  cardBanks: string[];
  categories: string[];
  onAdd: (it: Omit<Installment, 'id'>) => void;
  onEdit: (id: string, patch: Partial<Installment>) => void;
  onDelete: (id: string) => void;
}

const formatNT = (n: number) => 'NT$ ' + n.toLocaleString();

const Installments: React.FC<Props> = ({ installments, cardBanks, categories, onAdd, onEdit, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Omit<Installment, 'id'>>({
    description: '', totalAmount: 0, monthlyAmount: 0, totalPeriods: 12, paidPeriods: 0,
    startDate: new Date().toISOString().slice(0, 10),
    cardBank: cardBanks.find(b => b !== '-') || '-',
    category: categories[0],
  });

  const stats = useMemo(() => {
    const active = installments.filter(i => i.paidPeriods < i.totalPeriods);
    const monthlyTotal = active.reduce((s, i) => s + i.monthlyAmount, 0);
    const remaining = active.reduce((s, i) => s + (i.totalPeriods - i.paidPeriods) * i.monthlyAmount, 0);
    return { activeCount: active.length, monthlyTotal, remaining };
  }, [installments]);

  const submitNew = () => {
    if (!draft.description || draft.monthlyAmount <= 0) return;
    onAdd({ ...draft, totalAmount: draft.totalAmount || draft.monthlyAmount * draft.totalPeriods });
    setShowForm(false);
    setDraft({ ...draft, description: '', totalAmount: 0, monthlyAmount: 0, paidPeriods: 0 });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: 'var(--ink-faint)' }}>INSTALLMENTS</p>
        <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--ink)' }}>分期付款</h1>
      </div>

      {/* 摘要 */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="進行中" value={stats.activeCount + ' 項'} />
        <SummaryCard label="本月分期" value={formatNT(stats.monthlyTotal)} />
        <SummaryCard label="剩餘總額" value={formatNT(stats.remaining)} accent />
      </div>

      <button onClick={() => setShowForm(s => !s)}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium"
        style={{ background: showForm ? 'var(--paper-soft)' : 'var(--ink)', color: showForm ? 'var(--ink)' : 'var(--card)', border: '1px solid var(--rule)' }}>
        <Plus size={18} />{showForm ? '取消' : '新增分期項目'}
      </button>

      {showForm && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <Field label="商品名稱"><input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="iPhone 15 Pro" className="form-in" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="每期金額"><input type="number" value={draft.monthlyAmount || ''} onChange={e => setDraft({ ...draft, monthlyAmount: +e.target.value })} className="form-in font-number" /></Field>
            <Field label="總期數"><input type="number" value={draft.totalPeriods} onChange={e => setDraft({ ...draft, totalPeriods: +e.target.value })} className="form-in font-number" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="已繳期數"><input type="number" value={draft.paidPeriods} onChange={e => setDraft({ ...draft, paidPeriods: +e.target.value })} className="form-in font-number" /></Field>
            <Field label="第一期扣款日"><input type="date" value={draft.startDate} onChange={e => setDraft({ ...draft, startDate: e.target.value })} className="form-in font-number" /></Field>
          </div>
          <Field label="信用卡">
            <select value={draft.cardBank} onChange={e => setDraft({ ...draft, cardBank: e.target.value })} className="form-in">
              {cardBanks.filter(b => b !== '-').map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <button onClick={submitNew} className="w-full py-3 rounded-xl font-medium" style={{ background: 'var(--accent)', color: 'var(--card-raised)' }}>新增</button>
        </div>
      )}

      {/* 清單 */}
      <div className="space-y-3">
        {installments.length === 0 && (
          <div className="p-10 rounded-2xl text-center" style={{ background: 'var(--card)', border: '1px dashed var(--rule)', color: 'var(--ink-mute)' }}>
            <CalendarClock size={28} className="mx-auto mb-2" />
            <p className="text-sm">尚無分期項目，點上方按鈕新增。</p>
          </div>
        )}
        {installments.map(it => {
          const pct = Math.min(100, Math.round((it.paidPeriods / it.totalPeriods) * 100));
          const done = it.paidPeriods >= it.totalPeriods;
          const remainAmt = (it.totalPeriods - it.paidPeriods) * it.monthlyAmount;
          return (
            <div key={it.id} className="p-5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold font-display text-lg" style={{ color: 'var(--ink)' }}>{it.description}</h3>
                    {done && <span className="px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1" style={{ background: 'var(--olive-soft, #ECEEDA)', color: 'var(--olive)' }}><CheckCircle2 size={10} /> 已結清</span>}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-mute)' }}>{it.cardBank} · 每期 <span className="font-number">{formatNT(it.monthlyAmount)}</span> · 起 {it.startDate}</p>
                </div>
                <button onClick={() => onDelete(it.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--ink-mute)' }}><Trash2 size={16} /></button>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--ink-mute)' }}>進度 {it.paidPeriods}/{it.totalPeriods} 期</span>
                  <span className="font-number" style={{ color: 'var(--ink-soft)' }}>剩 {formatNT(remainAmt)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--paper-soft)' }}>
                  <div style={{ width: pct + '%', height: '100%', background: done ? 'var(--olive, #94946D)' : 'var(--accent)', transition: 'width .3s' }} />
                </div>
              </div>

              {!done && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => onEdit(it.id, { paidPeriods: it.paidPeriods + 1 })}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--paper-soft)', color: 'var(--ink-soft)', border: '1px solid var(--rule-soft)' }}>
                    記為下一期已繳
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .form-in { width:100%; padding:.7rem 1rem; border-radius:.85rem; background:var(--paper-soft); border:1px solid var(--rule-soft); color:var(--ink); outline:none; }
      `}</style>
    </div>
  );
};

const SummaryCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="p-3 rounded-xl" style={{ background: accent ? 'var(--accent-soft)' : 'var(--card)', border: '1px solid ' + (accent ? 'var(--accent)' : 'var(--rule)') }}>
    <p className="text-[10px] tracking-wide" style={{ color: 'var(--ink-mute)' }}>{label}</p>
    <p className="text-base font-bold font-number mt-0.5" style={{ color: accent ? 'var(--accent-deep)' : 'var(--ink)' }}>{value}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs mb-1 block" style={{ color: 'var(--ink-mute)' }}>{label}</span>
    {children}
  </label>
);

export default Installments;
