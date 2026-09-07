/**
 * محاكي التنفيذ (Demo Engine) — يحاكي Agent Run فوق النواة:
 *  Task → Plan (عبر ModelRouter حقيقي) → Nodes → أدوات → ملفات → تحقق.
 * هذا مؤقت حتى يُوصَّل الـOrchestrator الحقيقي (@aok/orchestrator) والـAdapters.
 */
import type { AgentRun, Activity, ChatMessage, NodeStatus, TaskTypeHint, WorkspaceFile } from './domain';
import { routeTask } from './kernel';

export const ulid = (n = 10): string =>
  Array.from({ length: n }, () => '0123456789abcdefghjkmnpqrstvwxyz'[(Math.random() * 31) | 0]).join('');

const now = () =>
  new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });

export const MODEL_CAP: Record<TaskTypeHint, string> = {
  planning: 'planning',
  coding: 'coding',
  research: 'research',
  summarization: 'summarization',
  vision: 'vision',
};

export interface DemoPlan {
  activities: Activity[];
  nodes: AgentRun['nodes'];
  files: WorkspaceFile[];
  chat: ChatMessage;
}

const CHAT_FALLBACK = {
  planning: 'سأقسّم الهدف إلى مهام، أخطّطها، وأعرضها عليك للموافقة قبل أي تنفيذ.',
  coding: 'سأبني المكوّن خطوة بخطوة: تحليل، تنفيذ، اختبار، ثم مراجعة أمان. كل كتابة تمر عبر بوابة المناعة.',
  research: 'سأبحث في المصادر، أستخرج الحقائق، وأجمّعها في ملخص موثّق بالمصادر.',
  summarization: 'سأقرأ المحتوى وأعيد صياغته في نقاط موجزة مع الحفاظ على المعنى.',
  vision: 'سأحلّل الصورة وأصف عناصرها وتفاصيلها.',
} as const;

function keyFor(s: string): string {
  return s.toLowerCase();
}

const ROUTED = new Set<string>();
function routeLine(type: TaskTypeHint): string {
  const model = routeTask(type, type === 'coding' || type === 'planning');
  if (model) {
    ROUTED.add(`${model.providerId}/${model.id}`);
    return `${model.providerId} · ${model.id} (${type})`;
  }
  return 'لا نموذج متاح';
}

/* ————— خطط تنفيذ جاهزة لكل نوع مهمة ————— */

const PLAN_SIGNUP = {
  activities: [
    { id: 'a1', kind: 'model', text: 'توجيه المهمة عبر ModelRouter', detail: 'planning → gemini · gemini-2.5-flash', time: '٠٠:٠٤' },
    { id: 'a2', kind: 'agent', text: 'تحليل المتطلبات', detail: 'login + signup + OTP', time: '٠٠:٠٦' },
    { id: 'a3', kind: 'agent', text: 'توليد الخطة (DAG)', detail: '٣ عُقد · ٢ حافة', time: '٠٠:٠٧' },
    { id: 'a4', kind: 'tool', text: 'repo.read', detail: 'apps/console/src', time: '٠٠:٠٨' },
    { id: 'a5', kind: 'agent', text: 'كتابة Login.tsx', detail: 'المكوّن + التحقق من الحقول', time: '٠٠:١٠' },
    { id: 'a6', kind: 'tool', text: 'fs.write', detail: '3 ملفات جديدة', time: '٠٠:١٤' },
    { id: 'a7', kind: 'agent', text: 'كتابة auth.test.ts', detail: 'vitest', time: '٠٠:١٦' },
    { id: 'a8', kind: 'tool', text: 'test.run', detail: '12/12 نجح', time: '٠٠:١٩' },
    { id: 'a9', kind: 'agent', text: 'مراجعة الأمان', detail: 'Validation + XSS + Rate-limit', time: '٠٠:٢١' },
    { id: 'a10', kind: 'system', text: 'VerificationPassed', detail: 'evidence: test_result ×1', time: '٠٠:٢٢' },
  ] as Activity[],
  nodes: [
    { id: 'n1', label: 'تحليل المتطلبات', status: 'done' },
    { id: 'n2', label: 'إنشاء الخطة', tool: 'planner', status: 'done' },
    { id: 'n3', label: 'كتابة React components', tool: 'fs.write', status: 'done' },
    { id: 'n4', label: 'الاختبارات', tool: 'test.run', status: 'done' },
    { id: 'n5', label: 'مراجعة الأمان', tool: 'review', status: 'done' },
  ] as AgentRun['nodes'],
  files: [
    { path: 'src/features/auth/Login.tsx', kind: 'code', status: 'new' },
    { path: 'src/features/auth/auth.ts', kind: 'code', status: 'new' },
    { path: 'src/features/auth/auth.test.ts', kind: 'test', status: 'new' },
  ] as WorkspaceFile[],
  chat: {
    role: 'assistant',
    content:
      'اكتمل بناء صفحة تسجيل المستخدمين: مكوّن Login.tsx، منطق المصادقة auth.ts، واختبارات تغطي التحقق من الحقول (12/12 نجح). مراجعة الأمان سجّلت ملاحظتين وتمّت معالجتهما.',
    meta: 'planning → gemini · gemini-2.5-flash · 5 عُقد · 3 ملفات',
  } as ChatMessage,
};

const PLAN_ETL = {
  activities: [
    { id: 'e1', kind: 'model', text: 'توجيه المهمة', detail: 'coding → gemini · gemini-2.5-flash', time: '٠١:٠٢' },
    { id: 'e2', kind: 'agent', text: 'تحليل المتطلبات', detail: 'csv → sqlite', time: '٠١:٠٣' },
    { id: 'e3', kind: 'agent', text: 'توليد الخطة', detail: '٤ عُقد', time: '٠١:٠٤' },
    { id: 'e4', kind: 'tool', text: 'repo.read', detail: 'pipeline/', time: '٠١:٠٥' },
    { id: 'e5', kind: 'agent', text: 'كتابة extract.ts', detail: 'CSV parser', time: '٠١:٠٩' },
    { id: 'e6', kind: 'agent', text: 'كتابة load.ts', detail: 'SQLite batch', time: '٠١:١٣' },
    { id: 'e7', kind: 'tool', text: 'test.run', detail: '8/8 نجح', time: '٠١:١٦' },
    { id: 'e8', kind: 'agent', text: 'توثيق التشغيل', detail: 'README + أمثلة', time: '٠١:١٨' },
  ] as Activity[],
  nodes: [
    { id: 'e-n1', label: 'تحليل المتطلبات', status: 'done' },
    { id: 'e-n2', label: 'إنشاء الخطة', tool: 'planner', status: 'done' },
    { id: 'e-n3', label: 'كتابة extract.ts', tool: 'fs.write', status: 'done' },
    { id: 'e-n4', label: 'كتابة load.ts', tool: 'fs.write', status: 'done' },
    { id: 'e-n5', label: 'الاختبارات', tool: 'test.run', status: 'done' },
    { id: 'e-n6', label: 'التوثيق', tool: 'fs.write', status: 'done' },
  ] as AgentRun['nodes'],
  files: [
    { path: 'pipeline/extract.ts', kind: 'code', status: 'new' },
    { path: 'pipeline/load.ts', kind: 'code', status: 'new' },
    { path: 'pipeline/pipeline.test.ts', kind: 'test', status: 'new' },
    { path: 'pipeline/README.md', kind: 'doc', status: 'new' },
  ] as WorkspaceFile[],
  chat: {
    role: 'assistant',
    content:
      'أُنجز خط أنابيب ETL (CSV → SQLite) مع اختبارات كاملة (8/8) وتوثيق للتشغيل. يمكنك تنفيذه محليًا عبر `pnpm pipeline`.',
    meta: 'coding → gemini · gemini-2.5-flash · 6 عُقد · 4 ملفات',
  } as ChatMessage,
};

const PLAN_API = {
  activities: [
    { id: 'p1', kind: 'model', text: 'توجيه المهمة', detail: 'coding → openrouter · deepseek-chat', time: '٠٠:٥٢' },
    { id: 'p2', kind: 'agent', text: 'تحليل المتطلبات', detail: 'REST · auth', time: '٠٠:٥٣' },
    { id: 'p3', kind: 'agent', text: 'توليد الخطة', detail: '٤ عُقد', time: '٠٠:٥٤' },
    { id: 'p4', kind: 'agent', text: 'كتابة server.ts', detail: 'Express-like + middleware', time: '٠٠:٥٩' },
    { id: 'p5', kind: 'agent', text: 'كتابة auth middleware', detail: 'JWT', time: '٠١:٠٣' },
    { id: 'p6', kind: 'tool', text: 'test.run', detail: '15/15 نجح', time: '٠١:٠٦' },
    { id: 'p7', kind: 'system', text: 'VerificationPassed', detail: 'evidence: test_result ×1', time: '٠١:٠٧' },
  ] as Activity[],
  nodes: [
    { id: 'p-n1', label: 'تحليل المتطلبات', status: 'done' },
    { id: 'p-n2', label: 'إنشاء الخطة', tool: 'planner', status: 'done' },
    { id: 'p-n3', label: 'كتابة server.ts', tool: 'fs.write', status: 'done' },
    { id: 'p-n4', label: 'auth middleware', tool: 'fs.write', status: 'done' },
    { id: 'p-n5', label: 'الاختبارات', tool: 'test.run', status: 'done' },
  ] as AgentRun['nodes'],
  files: [
    { path: 'api/server.ts', kind: 'code', status: 'new' },
    { path: 'api/auth.ts', kind: 'code', status: 'new' },
    { path: 'api/server.test.ts', kind: 'test', status: 'new' },
  ] as WorkspaceFile[],
  chat: {
    role: 'assistant',
    content:
      'جاهز: REST API مع مصادقة JWT واختبارات (15/15). الملفات في api/server.ts وapi/auth.ts، مع توثيق نقاط النهاية في التعليقات.',
    meta: 'coding → openrouter · deepseek-chat · 5 عُقد · 3 ملفات',
  } as ChatMessage,
};

const PLAN_WEB = {
  activities: [
    { id: 'w1', kind: 'model', text: 'توجيه المهمة', detail: 'research → openrouter · deepseek-chat', time: '٠٢:١٢' },
    { id: 'w2', kind: 'agent', text: 'بحث المصادر', detail: 'browser.navigate ×٤', time: '٠٢:١٣' },
    { id: 'w3', kind: 'agent', text: 'استخراج الأرقام', detail: 'extraction', time: '٠٢:١٥' },
    { id: 'w4', kind: 'agent', text: 'صياغة الملخص', detail: 'نقاط + مصادر', time: '٠٢:١٦' },
  ] as Activity[],
  nodes: [
    { id: 'w-n1', label: 'بحث المصادر', tool: 'browser.navigate', status: 'done' },
    { id: 'w-n2', label: 'استخراج الأرقام', tool: 'extraction', status: 'done' },
    { id: 'w-n3', label: 'صياغة الملخص', status: 'done' },
  ] as AgentRun['nodes'],
  files: [
    { path: 'research/adoption-2026.md', kind: 'doc', status: 'new' },
  ] as WorkspaceFile[],
  chat: {
    role: 'assistant',
    content:
      'ملخص البحث جاهز في research/adoption-2026.md: أرقام التبني + ٤ مصادر. ملوّن بحسب المزوّد المستخدم في التوجيه.',
    meta: 'research → openrouter · deepseek-chat · 3 عُقد · 1 ملف',
  } as ChatMessage,
};

const PLAN_VISION = {
  activities: [
    { id: 'v1', kind: 'model', text: 'توجيه المهمة', detail: 'vision → gemini · gemini-2.5-flash', time: '٠٠:٤٥' },
    { id: 'v2', kind: 'agent', text: 'تحليل الصورة', detail: 'vision', time: '٠٠:٤٦' },
  ] as Activity[],
  nodes: [
    { id: 'v-n1', label: 'تحليل الصورة', tool: 'vision', status: 'done' },
  ] as AgentRun['nodes'],
  files: [] as WorkspaceFile[],
  chat: {
    role: 'assistant',
    content: 'وصف الصورة جاهز — المهمة المعتمدة على الرؤية تمرّ عبر gemini-2.5-flash (مجاني، يدعم vision).',
    meta: 'vision → gemini · gemini-2.5-flash',
  } as ChatMessage,
};

/** خريطة: كلمة مفتاحية في الهدف → خطة جاهزة (بديل الـPlanner الحقيقي مؤقتًا). */
const PLAN_TABLE: Array<{ key: string; plan: DemoPlan }> = [
  { key: 'تسجيل', plan: { ...PLAN_SIGNUP } },
  { key: 'etl', plan: { ...PLAN_ETL } },
  { key: 'api', plan: { ...PLAN_API } },
  { key: 'بحث', plan: { ...PLAN_WEB } },
  { key: 'صورة', plan: { ...PLAN_VISION } },
];

function matchPlan(goal: string): DemoPlan | null {
  const g = keyFor(goal);
  const hit = PLAN_TABLE.find((p) => g.includes(p.key));
  return hit ? hit.plan : null;
}

export interface DemoState {
  run: AgentRun;
  activities: Activity[];
  chat: ChatMessage;
}

/**
 * بدء مهمة تجريبية: يبني Task حقيقي الشكل ويشغّل خط أنابيب
 * (Plan → Route → Execute) في بضع خطوات متحركة.
 */
export function startDemo(goal: string, onProgress: (s: Partial<DemoState>) => void): void {
  const type: TaskTypeHint = guessType(goal);
  const routed = routeLine(type);
  const plan = matchPlan(goal);

  const run: AgentRun = {
    id: `task_${ulid()}`,
    project: 'canyou',
    goal,
    state: 'running',
    nodes: [
      { id: `g_${ulid()}`, label: 'توليد الخطة', tool: 'planner', status: 'active' },
    ],
    files: [],
  };
  onProgress({ run, activities: [], chat: { id: 'preview', role: 'assistant', content: '…', time: now() } });

  let step = 0;
  const total = plan ? plan.activities.length : 3;

  const pump = () => {
    step += 1;
    const runLabel = `${goal.slice(0, 26)}${goal.length > 26 ? '…' : ''}`;
    if (plan) {
      const visible = plan.activities.slice(0, step);
      onProgress({
        run: {
          ...run,
          goal,
          nodes: plan.nodes.map((n, i) => ({
            ...n,
            status: i < Math.ceil((step / total) * plan.nodes.length) ? n.status : ('pending' as NodeStatus),
          })),
          files: step >= total ? plan.files : plan.files.slice(0, Math.max(0, step - 3)),
          state: step >= total ? 'completed' : 'running',
        },
        activities: visible,
        chat: step >= total ? { ...plan.chat, id: `m_${ulid()}` } : { id: 'preview', role: 'assistant', content: '…', time: now() },
      });
    } else {
      onProgress({
        run: {
          ...run,
          goal,
          nodes: [
            { id: 'n1', label: 'تحليل المتطلبات', status: step > 1 ? 'done' : 'active' },
            { id: 'n2', label: 'توليد الخطة', status: step > 1 ? 'done' : 'pending' },
          ],
          files: [{ path: `notes/${runLabel.replace(/\s+/g, '-')}.md`, kind: 'doc', status: 'new' }],
          state: 'completed',
        },
        activities: [
          { id: 'x1', kind: 'model', text: 'توجيه المهمة', detail: routed, time: now() },
          { id: 'x2', kind: 'agent', text: 'تحليل المتطلبات', detail: goal.slice(0, 40), time: now() },
          { id: 'x3', kind: 'agent', text: 'توليد الخطة', detail: 'عمود فقري أولي', time: now() },
          { id: 'x4', kind: 'system', text: 'TaskCompleted', detail: `state=${'COMPLETED'}`, time: now() },
        ],
        chat: {
          id: `m_${ulid()}`,
          role: 'assistant',
          content:
            CHAT_FALLBACK[type] +
            '\n\nهذا عرض تجريبي (Mock) — عند ربط الـAdapters والـOrchestrator سينفّذ نفس الخط الأنابيب فعليًا.',
          time: now(),
          meta: routed,
        },
      });
    }
  };

  // نبضات سريعة لمحاكاة التقدم، ثم توقف.
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (let i = 1; i <= total; i++) timers.push(setTimeout(pump, 700 * i));
  timers.push(setTimeout(() => timers.forEach(clearTimeout), 700 * (total + 1)));
}

export function guessType(goal: string): TaskTypeHint {
  const g = keyFor(goal);
  if (/(تسجيل|register|login|signup|auth|etl|api|pipeline|مكوّن|component|ابن|build|اكتب|code)/.test(g)) return 'coding';
  if (/(بحث|search|research|سوق|اتجاه)/.test(g)) return 'research';
  if (/(صورة|image|لقطة|vision)/.test(g)) return 'vision';
  if (/(لخص|summarize|اختصر)/.test(g)) return 'summarization';
  return 'planning';
}

/** أوراق مفتاحية جاهزة للتجربة السريعة. */
export const SUGGESTIONS: Array<{ title: string; prompt: string }> = [
  { title: 'صفحة تسجيل', prompt: 'ابنِ صفحة تسجيل المستخدمين مع تحقق الحقول واختبارات' },
  { title: 'خط ETL', prompt: 'اكتب خط أنابيب ETL من CSV إلى SQLite مع اختبارات' },
  { title: 'REST API', prompt: 'ابنِ REST API مع مصادقة JWT واختبارات' },
  { title: 'بحث سوق', prompt: 'ابحث عن أرقام تبني الذكاء الاصطناعي 2026 واعمل ملخصًا' },
  { title: 'تحليل صورة', prompt: 'حلّل هذه الصورة وصف لي ما ترى' },
];
