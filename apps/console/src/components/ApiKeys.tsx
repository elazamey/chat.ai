import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Pill } from './Pill';

interface KeyRow {
  id: string;
  provider: string;
  ref: string;
  created: string;
}

export function ApiKeys() {
  const [rows, setRows] = useState<KeyRow[]>([
    { id: 'k1', provider: 'OpenRouter', ref: 'secretRef://in-memory/openrouter', created: 'اليوم ٠١:٢٢' },
  ]);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setRows((r) => [
      { id: `k${Date.now()}`, provider: 'OpenRouter', ref: `secretRef://in-memory/${v.slice(0, 6)}…`, created: 'الآن' },
      ...r,
    ]);
    setDraft('');
    setShow(false);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 18, maxWidth: 880 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>مفاتيح API</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.7 }}>
        ركّب مفاتيحك بنفسك (BYOK). القيمة تُخزَّن في الـVault فقط — الواجهة والنواة
        تحملان <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>SecretRef</span> لا المفتاح الخام (RULE 007).
      </p>

      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pill tone="accent" dot={false}>
            <KeyRound size={11} style={{ verticalAlign: -2 }} />
            byok
          </Pill>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>مفاتيحك · مشفّرة · لا تغادر جهازك</div>
        </div>

        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 4px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <KeyRound size={15} color="var(--text-dim)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.provider}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)', direction: 'ltr', textAlign: 'left' }}>
                {show ? r.ref : '••••••••••••'}
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.created}</span>
            <button
              onClick={() => setShow((s) => !s)}
              style={{ background: 'transparent', border: 0, color: 'var(--text-dim)', padding: 4 }}
              title={show ? 'إخفاء' : 'إظهار'}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}
              style={{ background: 'transparent', border: 0, color: 'var(--err)', padding: 4 }}
              title="حذف"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {rows.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)', padding: '10px 4px' }}>
            لا مفاتيح بعد — أضف أول مفتاح بالأسفل.
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: 'var(--text-dim)' }}>
          إضافة مفتاح (OpenRouter)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setShow(true)}
            type={show ? 'text' : 'password'}
            placeholder="sk-or-v1-…"
            dir="ltr"
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '9px 12px',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'var(--mono)',
            }}
          />
          <button
            onClick={add}
            disabled={!draft.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 0,
              borderRadius: 10,
              background: draft.trim() ? 'var(--accent)' : 'var(--bg-hover)',
              color: draft.trim() ? '#0a0c10' : 'var(--text-faint)',
              fontWeight: 700,
              padding: '0 14px',
              fontSize: 13,
            }}
          >
            <Plus size={15} />
            حفظ في الـVault
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <ShieldCheck size={15} color="var(--ok)" style={{ marginTop: 2 }} />
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          في النسخة الكاملة تتصل هذه الواجهة بـ<code style={{ fontFamily: 'var(--mono)' }}>@aok/vault</code>
          (in-memory / 1Password / AWS KMS / HashiCorp) وتستلم credential قصير العمر وقت التنفيذ فقط.
        </div>
      </div>
    </div>
  );
}
