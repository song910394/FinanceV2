import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Repeat2, Pause, Play } from 'lucide-react';
import { Subscription, SubscriptionFrequency, PaymentMethod } from '../types';

interface Props {
  subscriptions: Subscription[];
  cardBanks: string[];
  categories: string[];
  onAdd: (s: Omit<Subscription, 'id'>) => void;
  onEdit: (id: string, patch: Partial<Subscription>) => void;
  onDelete: (id: string) => void;
}

const NT = (n: number) => 'NT$ ' + Math.round(n).toLocaleString();

const FREQ_LABEL: Record<SubscriptionFrequency, string> = {
  monthly: '每月', yearly: '每年', quarterly: '每季', weekly: '每週'
};
const yearlyCost = (s: Subscription) => {
  switch (s.frequency) {
    case 'monthly': return s.amount * 12;
    case 'yearly': return s.amount;
    case 'quarterly': return s.amount * 4;
    case 'weekly': return s.amount * 52;
  }
};
const daysUntil = (date: string) => {
  const d = new Date(date).getTime();
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((d - now.getTime()) / 86400000);
};

const Subscriptions: React.FC<Props> = ({ subscriptions, cardBanks, onAdd, onEdit, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Omit<Subscription, 'id'>>({
    name: '', amount: 0, frequency: 'monthly',
    nextChargeDate: new Date(Date.now() + 7*86400000).toISOString().slice(0, 10),
    paymentMethod: PaymentMethod.CREDIT_CARD,
    cardBank: cardBanks.find(b => b !== '-') || '-',
    isActive: true,
  });

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.isActive);
    const monthly = active.reduce((sum, s) => sum + yearlyCost(s) / 12, 0);
    const yearly = active.reduce((sum, s) => sum + yearlyCost(s), 0);
    return { count: active.length, monthly, yearly };
  }, [subscriptions]);

  const submitNew = () => {
    if (!draft.name || draft.amount <= 0) return;
    onAdd(draft);
    setShowForm(false);
    setDraft({ ...draft, name: '', amount: 0 });
  };

  const sorted = [...subscriptions].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: 'var(--ink-faint)' }}>SUBSCRIPTIONS</p>
        <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--ink)' }}>定期支出</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SCard label="啟用中" value={stats.count + ' 項'} />
        <SCard label="月支出" value={NT(stats.monthly)} />
        <SCard label="年支出" value={NT(stats.yearly)} accent />
      </div>

      <button onClick={() => setShowForm(s => !s)}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-medium"
        style={{ background: showForm ? 'var(--paper-soft)' : 'var(--ink)', color: showForm ? 'var(--ink)' : 'var(--card)', border: '1px solid var(--rule)' }}>
        <Plus size={18} />{showForm ? '取消' : '新增訂閱 / 定期支出'}
      </button>

      {showForm && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
          <Field label="名稱"><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Netflix / Spotify / 健身房…" className="sub-in" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="金額"><input type="number" value={draft.amount || ''} onChange={e => setDraft({ ...draft, amount: +e.target.value })} className="sub-in font-number" /></Field>
            <Field label="頻率">
              <select value={draft.frequency} onChange={e => setDraft({ ...draft, frequency: e.target.value as SubscriptionFrequency })} className="sub-in">
                {(['monthly','yearly','quarterly','weekly'] as SubscriptionFrequency[]).map(f => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="下次扣款日"><input type="date" value={draft.nextChargeDate} onChange={e => setDraft({ ...draft, nextChargeDate: e.target.value })} className="sub-in font-number" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="付款方式">
              <select value={draft.paymentMethod} onChange={e => setDraft({ ...draft, paymentMethod: e.target.value as PaymentMethod })} className="sub-in">
                <option>{PaymentMethod.CASH}</option><option>{PaymentMethod.CREDIT_CARD}</option>
              </select>
            </Field>
            {draft.paymentMethod === PaymentMethod.CREDIT_CARD && (
              <Field label="卡別">
                <select value={draft.cardBank} onChange={e => setDraft({ ...draft, cardBank: e.target.value })} className="sub-in">
                  {cardBanks.filter(b => b !== '-').map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
            )}
          </div>
          <button onClick={submitNew} className="w-full py-3 rounded-xl font-medium" style={{ background: 'var(--accent)', color: 'var(--card-raised)' }}>新增</button>
        </div>
      )}

      <div className="space-y-2.5">
        {sorted.length === 0 && (
          <div className="p-10 rounded-2xl text-center" style={{ background: 'var(--card)', border: '1px dashed var(--rule)', color: 'var(--ink-mute)' }}>
            <Repeat2 size={28} className="mx-auto mb-2" />
            <p className="text-sm">還沒有訂閱項目。把 Netflix、健身房月費加進來，看看一年花多少。</p>
          </div>
        )}
        {sorted.map(s => {
          const days = daysUntil(s.nextChargeDate);
          const soon = s.isActive && days <= 7;
          return (
            <div key={s.id} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--card)', border: '1px solid var(--rule)', opacity: s.isActive ? 1 : 0.55 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.isActive ? 'var(--accent-soft)' : 'var(--paper-soft)', color: s.isActive ? 'var(--accent)' : 'var(--ink-mute)' }}>
                <Repeat2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold font-display truncate" style={{ color: 'var(--ink)' }}>{s.name}</h3>
                  {soon && <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--rose-soft, #F8E8E2)', color: 'var(--rose, #B0563A)' }}>{days}天</span>}
                </div>
                <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>{FREQ_LABEL[s.frequency]} · {s.paymentMethod}{s.cardBank && s.cardBank !== '-' ? ' ' + s.cardBank : ''} · {s.nextChargeDate}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold font-number text-lg" style={{ color: 'var(--ink)' }}>{NT(s.amount)}</p>
                <p className="text-[10px] font-number" style={{ color: 'var(--ink-faint)' }}>≈ {NT(yearlyCost(s))}/年</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => onEdit(s.id, { isActive: !s.isActive })} className="p-1.5 rounded-lg" style={{ color: 'var(--ink-mute)' }} title={s.isActive ? '暫停' : '恢復'}>
                  {s.isActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--ink-mute)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .sub-in { width:100%; padding:.7rem 1rem; border-radius:.85rem; background:var(--paper-soft); border:1px solid var(--rule-soft); color:var(--ink); outline:none; }
      `}</style>
    </div>
  );
};

const SCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="p-3 rounded-xl" style={{ background: accent ? 'var(--accent-soft)' : 'var(--card)', border: '1px solid ' + (accent ? 'var(--accent)' : 'var(--rule)') }}>
    <p className="text-[10px] tracking-wide" style={{ color: 'var(--ink-mute)' }}>{label}</p>
    <p className="text-base font-bold font-number mt-0.5" style={{ color: accent ? 'var(--accent-deep)' : 'var(--ink)' }}>{value}</p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="text-xs mb-1 block" style={{ color: 'var(--ink-mute)' }}>{label}</span>{children}</label>
);

export default Subscriptions;
