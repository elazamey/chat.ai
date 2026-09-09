import {
  Activity,
  Bot,
  BookOpen,
  Box,
  CheckSquare,
  FileText,
  FolderKanban,
  MessageSquare,
  Settings,
} from 'lucide-react';
import type { ProjectSection, ProjectState } from '../domain';
import { Pill } from './Pill';

const SECTIONS: { id: ProjectSection; label: string; icon: typeof FolderKanban }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: FolderKanban },
  { id: 'chat', label: 'المحادثة', icon: MessageSquare },
  { id: 'agent', label: 'الوكيل', icon: Bot },
  { id: 'tasks', label: 'المهام', icon: CheckSquare },
  { id: 'files', label: 'الملفات', icon: FileText },
  { id: 'knowledge', label: 'المعرفة', icon: BookOpen },
  { id: 'artifacts', label: 'Artifacts', icon: Box },
  { id: 'activity', label: 'النشاط', icon: Activity },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export function ProjectWorkspace({
  project,
  onSectionChange,
}: {
  project: ProjectState;
  onSectionChange: (section: ProjectSection) => void;
}) {
  const section = SECTIONS.find((item) => item.id === project.section) ?? SECTIONS[0]!;
  const Icon = section.icon;

  return (
    <div className="project-workspace">
      <aside className="project-nav">
        <div className="project-nav-header">
          <div className="project-mark"><FolderKanban size={17} /></div>
          <div><strong>{project.name}</strong><small>{project.repository}</small></div>
        </div>
        <div className="project-nav-list">
          {SECTIONS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                className={project.section === item.id ? 'project-nav-item active' : 'project-nav-item'}
                onClick={() => onSectionChange(item.id)}
              >
                <ItemIcon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>
      <section className="project-main">
        <div className="project-main-header">
          <div><Pill tone="accent">Project Workspace</Pill><h1>{section.label}</h1></div>
          <span className="project-readiness"><span className="status-dot active" /> API متصل</span>
        </div>
        <div className="project-main-content">
          {project.section === 'chat' || project.section === 'agent' ? (
            <div className="project-surface-message"><Icon size={28} color="var(--accent)" /><h2>{section.label}</h2><p>استخدم المحادثة لإرسال مهمة حقيقية إلى `/run`. ستظهر نتيجة التنفيذ في مساحة الوكيل.</p></div>
          ) : (
            <div className="project-surface-message"><Icon size={28} color="var(--text-faint)" /><h2>{section.label}</h2><p>هذه مساحة المشروع جاهزة للربط بالـbackend. لا توجد بيانات runtime متاحة حاليًا.</p><Pill tone="neutral">غير متاح بعد</Pill></div>
          )}
        </div>
      </section>
      <aside className="project-context">
        <h3>السياق</h3>
        <div className="context-item"><strong>الملفات</strong><span>غير متاح بعد</span></div>
        <div className="context-item"><strong>المعرفة</strong><span>غير متاح بعد</span></div>
        <div className="context-item"><strong>النشاط</strong><span>مرتبط بنتيجة التنفيذ فقط</span></div>
      </aside>
    </div>
  );
}
