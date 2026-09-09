import { useCallback, useState } from 'react';
import { Bot, FolderKanban, ListChecks, Settings, TerminalSquare } from 'lucide-react';
import type { Activity, ChatMessage, AgentRun, ProjectSection, ProjectState } from './domain';
import { guessType, ulid } from './mock';
import { runTask } from './api';
import { providerStatus, routeTask } from './kernel';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Chat } from './components/Chat';
import { AgentWorkspace } from './components/AgentWorkspace';
import { ProviderPanel } from './components/ProviderPanel';
import { ApiKeys } from './components/ApiKeys';
import { HomeDashboard } from './components/HomeDashboard';
import { ProjectWorkspace } from './components/ProjectWorkspace';

export type View =
  | 'home'
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
  const [view, setView] = useState<View>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [routeNote, setRouteNote] = useState<string | null>(null);
  const [runsCount, setRunsCount] = useState(0);
  const [project, setProject] = useState<ProjectState>({
    id: 'chat-ai',
    name: 'Celia',
    repository: 'elazamey/chat.ai',
    section: 'overview',
  });

  const submitGoal = useCallback(async (goal: string) => {
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
    setRun({
      id: `run_${ulid()}`,
      project: 'elazamey/chat.ai',
      goal: clean,
      state: 'running',
      nodes: [
        { id: 'plan', label: 'تحليل الطلب وإنشاء الخطة', status: 'active' },
        { id: 'execute', label: 'تنفيذ الأدوات المصرّح بها', tool: 'Policy → Executor', status: 'pending' },
        { id: 'verify', label: 'التحقق وتجميع الأدلة', tool: 'VerificationEngine', status: 'pending' },
      ],
      files: [],
    });
    setActivities([{ id: `a_${ulid()}`, kind: 'agent', text: 'بدأت Celia تحليل المهمة', time: nowTime() }]);

    try {
      const outcome = await runTask(clean);
      setRun((current) => current ? {
        ...current,
        state: outcome.verdict === 'PASSED' ? 'completed' : 'failed',
        nodes: current.nodes.map((node, index) => ({ ...node, status: outcome.verdict === 'PASSED' || index === 0 ? 'done' : 'failed' })),
      } : current);
      setActivities((prev) => [
        ...prev,
        { id: `a_${ulid()}`, kind: 'tool', text: `اكتمل التنفيذ: ${outcome.verdict}`, detail: `${outcome.evidence.length} evidence items`, time: nowTime() },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${ulid()}`,
          role: 'assistant',
          content: `اكتمل التنفيذ عبر API: ${outcome.verdict}`,
          time: nowTime(),
          meta: `${outcome.mode} · run ${outcome.run_id}`,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تنفيذ المهمة.';
      setRun((current) => current ? {
        ...current,
        state: 'failed',
        error: message,
        nodes: current.nodes.map((node, index) => ({
          ...node,
          status: index === 0 ? 'done' : 'failed',
        })),
      } : current);
      setActivities((prev) => [
        ...prev,
        { id: `a_${ulid()}`, kind: 'system', text: 'فشل الاتصال بخدمة التنفيذ', detail: message, time: nowTime() },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${ulid()}`,
          role: 'assistant',
          content: `تعذر تنفيذ المهمة عبر API: ${message}`,
          time: nowTime(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar view={view} setView={setView} runs={runsCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar view={view} project="elazamey/chat.ai" />
        <main style={{ flex: 1, minHeight: 0 }}>
          {view === 'workspace' && (
            <AgentWorkspace run={run} activities={activities} />
          )}
          {view === 'home' && (
            <HomeDashboard
              runs={runsCount}
              onNewTask={() => setView('chat')}
              onOpenTasks={() => setView('tasks')}
              onOpenProjects={() => setView('projects')}
            />
          )}
          {view === 'projects' && (
            <ProjectWorkspace
              project={project}
              onSectionChange={(section: ProjectSection) => {
                setProject((current) => ({ ...current, section }));
                if (section === 'chat') setView('chat');
                if (section === 'agent') setView('workspace');
              }}
            />
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
