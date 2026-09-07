import { useCallback, useState } from 'react';
import { Bot, FolderKanban, ListChecks, Settings, TerminalSquare } from 'lucide-react';
import type { Activity, ChatMessage, AgentRun } from './domain';
import { guessType, startDemo, ulid } from './mock';
import { providerStatus, routeTask } from './kernel';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Chat } from './components/Chat';
import { AgentWorkspace } from './components/AgentWorkspace';
import { ProviderPanel } from './components/ProviderPanel';
import { ApiKeys } from './components/ApiKeys';

export type View =
  | 'workspace'
  | 'chat'
  | 'tasks'
  | 'files'
  | 'agents'
  | 'projects'
  | 'providers'
  | 'keys'
  | 'settings';

export default function App() {
  const [view, setView] = useState<View>('workspace');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [routeNote, setRouteNote] = useState<string | null>(null);
  const [runsCount, setRunsCount] = useState(0);

  const submitGoal = useCallback((goal: string) => {
    const clean = goal.trim();
    if (!clean || busy) return;

    setMessages((prev) => [
      ...prev,
      { id: `u_${ulid()}`, role: 'user', content: clean, time: nowTime() },
    ]);

    const type = guessType(clean);
    const model = routeTask(type, type === 'coding' || type === 'planning');
    setRouteNote(model ? `${model.providerId} · ${model.id}` : 'لا نموذج متاح');
    setView('workspace');
    setBusy(true);
    setActivities([]);
    setRunsCount((c) => c + 1);

    startDemo(clean, (partial) => {
      if (partial.run) setRun(partial.run);
      if (partial.activities) setActivities(partial.activities);
      if (partial.chat) {
        if (partial.chat.content !== '…') {
          setMessages((prev) =>
            prev.some((m) => m.id === partial.chat!.id) ? prev : [...prev, partial.chat!],
          );
        }
        if (partial.run?.state === 'completed' || partial.chat.content !== '…') setBusy(false);
      }
      if (partial.run?.state === 'completed') setBusy(false);
    });
  }, [busy]);

  const approve = useCallback(() => {
    setRun((r) => (r ? { ...r, state: 'completed' } : r));
    setBusy(false);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar view={view} setView={setView} runs={runsCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar view={view} project="elazamey/chat.ai" />
        <main style={{ flex: 1, minHeight: 0 }}>
          {view === 'workspace' && (
            <AgentWorkspace run={run} activities={activities} onApprove={approve} />
          )}
          {view === 'chat' && (
            <Chat
              messages={messages}
              busy={busy}
              onSend={submitGoal}
              onSuggest={submitGoal}
              routeNote={routeNote}
            />
          )}
          {view === 'providers' && <ProviderPanel providers={providerStatus()} />}
          {view === 'keys' && <ApiKeys />}
          {view === 'tasks' && (
            <Placeholder icon={<ListChecks size={26} />} title="المهام" body="قائمة المهام المنفّذة (Task → Run → Node → Job) قادمة من @aok/orchestrator." />
          )}
          {view === 'files' && (
            <Placeholder icon={<TerminalSquare size={26} />} title="الملفات" body="مستكشف ملفات مساحة العمل + الـDiff المرئي لأي تعديل أنجزه وكيل." />
          )}
          {view === 'agents' && (
            <Placeholder icon={<Bot size={26} />} title="الوكلاء" body="سجلّ الوكلاء المنشورة (AgentContract) وقدرات كل وكيل." />
          )}
          {view === 'projects' && (
            <Placeholder icon={<FolderKanban size={26} />} title="المشاريع" body="مساحات مشاريع متعددة، كل واحدة بذاكرتها وسياساتها الخاصة." />
          )}
          {view === 'settings' && (
            <Placeholder icon={<Settings size={26} />} title="الإعدادات" body="تفضيلات النظام، السياسات، وبوابة المناعة (Immune Gate)." />
          )}
        </main>
      </div>
    </div>
  );
}

function Placeholder({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, color: 'var(--text-faint)' }}>
        <div style={{ color: 'var(--text-dim)', marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dim)' }}>{title}</div>
        <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>{body}</div>
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            border: '1px dashed var(--border)',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          منطقة ضمن خريطة الطريق — الأسبقية حاليًا للـWorkspace + Provider Router
        </div>
      </div>
    </div>
  );
}

function nowTime(): string {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
}
