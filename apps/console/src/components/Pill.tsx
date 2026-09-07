import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'err' | 'accent' | 'neutral';

const TONES: Record<Tone, { bg: string; color: string; dot: string }> = {
  ok: { bg: 'var(--ok-bg)', color: 'var(--ok)', dot: 'var(--ok)' },
  warn: { bg: 'var(--warn-bg)', color: 'var(--warn)', dot: 'var(--warn)' },
  err: { bg: 'var(--err-bg)', color: 'var(--err)', dot: 'var(--err)' },
  accent: { bg: 'var(--accent-bg)', color: 'var(--accent)', dot: 'var(--accent)' },
  neutral: { bg: 'rgba(152,162,184,0.08)', color: 'var(--text-dim)', dot: 'var(--text-faint)' },
};

export function Pill({
  tone = 'neutral',
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        background: t.bg,
        color: t.color,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: t.dot,
            boxShadow: `0 0 8px ${t.dot}`,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
