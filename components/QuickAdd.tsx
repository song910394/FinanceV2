import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Transaction, PaymentMethod } from '../types';

interface Props {
  categories: string[];
  cardBanks: string[];
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
}

const QuickAdd: React.FC<Props> = ({ categories, cardBanks, onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || '食');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cardBank, setCardBank] = useState<string>('-');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    onSubmit({
      date, amount: num, paymentMethod,
      cardBank: paymentMethod === PaymentMethod.CREDIT_CARD ? cardBank : '-',
      category, description: description || category,
      isReconciled: false,
    });
    setAmount(''); setDescription('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} onKeyDown={onKey}
        className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl pb-safe"
        style={{ background: 'var(--card)', border: '1px solid var(--rule)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-5 sticky top-0" style={{ background: 'var(--card)', borderBottom: '1px solid var(--rule-soft)' }}>
          <div>
            <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: 'var(--ink-faint)' }}>QUICK ENTRY</p>
            <h2 className="text-lg font-bold font-display" style={{ color: 'var(--ink)' }}>快速記一筆</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full" style={{ color: 'var(--ink-mute)' }}><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 金額大字 */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display" style={{ color: 'var(--ink-mute)' }}>NT$</span>
            <input ref={inputRef} type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 text-5xl font-bold font-number bg-transparent outline-none"
              style={{ color: 'var(--ink)' }} />
          </div>

          {/* 描述 */}
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="買了什麼？"
            className="w-full px-4 py-3 rounded-2xl outline-none"
            style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule-soft)', color: 'var(--ink)' }} />

          {/* 分類 chips */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--ink-mute)' }}>分類</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className="px-4 py-2 rounded-full text-sm transition-all"
                  style={{
                    background: category === c ? 'var(--ink)' : 'var(--paper-soft)',
                    color: category === c ? 'var(--card)' : 'var(--ink-soft)',
                    border: category === c ? '1px solid var(--ink)' : '1px solid var(--rule-soft)',
                    fontWeight: category === c ? 600 : 500,
                  }}>{c}</button>
              ))}
            </div>
          </div>

          {/* 付款方式 */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--ink-mute)' }}>付款方式</p>
            <div className="grid grid-cols-2 gap-2">
              {[PaymentMethod.CASH, PaymentMethod.CREDIT_CARD].map(p => (
                <button key={p} onClick={() => setPaymentMethod(p)}
                  className="py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: paymentMethod === p ? 'var(--accent-soft)' : 'var(--paper-soft)',
                    color: paymentMethod === p ? 'var(--accent-deep)' : 'var(--ink-soft)',
                    border: paymentMethod === p ? '1px solid var(--accent)' : '1px solid var(--rule-soft)',
                  }}>{p}</button>
              ))}
            </div>
          </div>

          {paymentMethod === PaymentMethod.CREDIT_CARD && (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--ink-mute)' }}>卡別</p>
              <div className="flex flex-wrap gap-2">
                {cardBanks.filter(b => b !== '-').map(b => (
                  <button key={b} onClick={() => setCardBank(b)}
                    className="px-4 py-2 rounded-full text-sm"
                    style={{
                      background: cardBank === b ? 'var(--ink)' : 'var(--paper-soft)',
                      color: cardBank === b ? 'var(--card)' : 'var(--ink-soft)',
                      border: '1px solid ' + (cardBank === b ? 'var(--ink)' : 'var(--rule-soft)'),
                    }}>{b}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--ink-mute)' }}>日期</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl outline-none font-number"
              style={{ background: 'var(--paper-soft)', border: '1px solid var(--rule-soft)', color: 'var(--ink)' }} />
          </div>
        </div>

        <div className="p-5 sticky bottom-0" style={{ background: 'var(--card)', borderTop: '1px solid var(--rule-soft)' }}>
          <button onClick={submit} disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'var(--ink)', color: 'var(--card)', boxShadow: 'var(--shadow-pop)' }}>
            <Check size={18} /> 記下這一筆
          </button>
          <p className="text-[10px] text-center mt-2" style={{ color: 'var(--ink-faint)' }}>⌘/Ctrl + Enter 快速送出　·　Esc 關閉</p>
        </div>
      </div>
    </div>
  );
};

export default QuickAdd;
