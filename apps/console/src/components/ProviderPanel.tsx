import { Activity, ArrowDownUp, Cpu, ShieldCheck, Zap } from 'lucide-react';
import type { ProviderStatus } from '../domain';
import { Pill, type Tone } from './Pill';

const STATUS_TONE: Record<ProviderStatus['status'], Tone> = {
  healthy: 'ok',
  rate_limited: 'warn',
  quota: 'warn',
  offline: 'err',
};

const STATUS_LABEL: Record<ProviderStatus['status'], string> = {
  healthy: 'يعمل',
  rate_limited: 'محدود المعدل',
  quota: 'استُنفدت الحصة',
  offline: 'غير متصل',
};

const TIER_TONE: Record<ProviderStatus['tier'], Tone> = {
  Free: 'ok',
  'Free tier': 'accent',
  BYOK: 'neutral',
  Local: 'neutral',
};

export function ProviderPanel({ providers }: { providers: ProviderStatus[] }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 18, maxWidth: 880 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>مزوّدو الذكاء</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.7 }}>
        سجلّ المزوّدين الموحّد. النواة لا تعتمد على مزوّد واحد، وتنتقل تلقائيًا عند
        بلوغ الحد أو فشل الخدمة: Gemini → OpenRouter → HuggingFace → نموذج محلي.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {providers.map((p) => (
          <div
            key={p.name}
            className="glow"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--accent-bg)',
                border: '1px solid var(--border)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Cpu size={18} color="var(--accent)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                <Pill tone={TIER_TONE[p.tier]} dot={false}>{p.tier}</Pill>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--mono)', direction: 'ltr', textAlign: 'left' }}>
                {p.models}
              </div>
            </div>
            <div style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-faint)' }}>
              آخر فحص
              <div>{p.last ?? '—'}</div>
            </div>
            <Pill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
        <MiniStat icon={<ArrowDownUp size={16} />} label="انتقالات اليوم" value="3" hint="gemini→openrouter×2" />
        <MiniStat icon={<Zap size={16} />} label="متوسط الزمن" value="0.8s" hint="آخر ١٠٠ طلب" />
        <MiniStat icon={<Activity size={16} />} label="الحصة المجانية" value="٨١٪" hint="من الحد اليومي" />
      </div>

      <div
        style={{
          marginTop: 18,
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
          سياسة الاستخدام: لا نجمع مفاتيح «مجانية» بطرق مخالفة للشروط — النظام يعتمد
          Provider Abstraction + Policy + Router + Quota Manager، ويعرف حالات
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}> rate_limited · quota · invalid_key · down </span>
          ويتصرف تلقائيًا.
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 12 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{hint}</div>
    </div>
  );
}
