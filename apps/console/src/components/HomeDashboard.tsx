import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileOutput,
  FolderKanban,
  ListChecks,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Pill } from './Pill';

export interface HomeDashboardProps {
  runs: number;
  onNewTask: () => void;
  onOpenTasks: () => void;
  onOpenProjects: () => void;
}

const QUICK_ACTIONS = [
  { label: 'مهمة جديدة', icon: Plus, tone: 'accent' as const },
  { label: 'بحث عميق', icon: Sparkles, tone: 'neutral' as const },
  { label: 'تحليل مشروع', icon: FolderKanban, tone: 'neutral' as const },
];

export function HomeDashboard({ runs, onNewTask, onOpenTasks, onOpenProjects }: HomeDashboardProps) {
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero glow">
        <div>
          <Pill tone="ok">
            <ShieldCheck size={12} style={{ verticalAlign: -2 }} />
            مساحة عمل آمنة · تشغيل محلي
          </Pill>
          <h1>ماذا نبني اليوم؟</h1>
          <p>
            حوّل فكرتك إلى خطة قابلة للتنفيذ، مع رؤية واضحة للأدوات والسياسات
            والأدلة الناتجة عن كل خطوة.
          </p>
          <div className="dashboard-actions">
            {QUICK_ACTIONS.map(({ label, icon: Icon, tone }) => (
              <button
                key={label}
                className={`dashboard-action ${tone}`}
                onClick={label === 'مهمة جديدة' ? onNewTask : onOpenProjects}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-orbit" aria-hidden="true">
          <Bot size={46} />
          <span />
        </div>
      </section>

      <div className="dashboard-section-heading">
        <div>
          <h2>نظرة عامة</h2>
          <span>كل ما تحتاجه لمتابعة العمل من مكان واحد</span>
        </div>
        <button className="text-button" onClick={onOpenTasks}>
          عرض المهام <ArrowLeft size={14} />
        </button>
      </div>

      <section className="dashboard-grid">
        <DashboardCard icon={<ListChecks size={17} />} label="عمليات هذه الجلسة" value={runs} tone="accent" />
        <DashboardCard icon={<CheckCircle2 size={17} />} label="عمليات موثقة" value="غير متاح" tone="ok" />
        <DashboardCard icon={<FileOutput size={17} />} label="Artifacts" value="غير متاح" tone="violet" />
      </section>

      <section className="dashboard-lower-grid">
        <div className="surface-card">
          <div className="card-heading">
            <div>
              <h3>متابعة العمل</h3>
              <span>المشاريع والمهام الأخيرة</span>
            </div>
            <FolderKanban size={18} color="var(--accent)" />
          </div>
          <button className="work-item" onClick={onOpenProjects}>
            <span className="status-dot active" />
            <span>
              <strong>elazamey/chat.ai</strong>
              <small>مساحة المشروع · جاهزة للتنفيذ</small>
            </span>
            <ArrowLeft size={15} />
          </button>
          <button className="work-item" onClick={onOpenTasks}>
            <span className="status-dot" />
            <span>
              <strong>{runs ? `${runs} مهمة في هذه الجلسة` : 'لا توجد مهام بعد'}</strong>
              <small>ابدأ من المحادثة أو أنشئ مهمة جديدة</small>
            </span>
            <ArrowLeft size={15} />
          </button>
        </div>

        <div className="surface-card">
          <div className="card-heading">
            <div>
              <h3>حالة النظام</h3>
              <span>الحدود الأمنية والتشغيلية</span>
            </div>
            <ShieldCheck size={18} color="var(--ok)" />
          </div>
          <div className="health-row"><span>Runtime Execution</span><Pill tone="ok">PASS</Pill></div>
          <div className="health-row"><span>Policy Engine</span><Pill tone="ok">ACTIVE</Pill></div>
          <div className="health-row"><span>Model Provider</span><Pill tone="accent">Mock · $0</Pill></div>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: 'accent' | 'ok' | 'violet';
}) {
  return (
    <div className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
