import { useEffect, useState } from 'react';
import { listTasks, type ApiTaskSummary, RunRequestError } from '../api';

export function TasksPanel() {
  const [tasks, setTasks] = useState<ApiTaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listTasks().then((items) => {
      if (active) setTasks(items);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof RunRequestError ? reason.message : 'تعذر تحميل سجل المهام.');
    });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <TaskMessage title="تعذر تحميل المهام" body={error} />;
  if (!tasks) return <TaskMessage title="المهام" body="جارٍ تحميل سجل التنفيذ من backend..." />;
  if (tasks.length === 0) return <TaskMessage title="المهام" body="لا توجد تشغيلات محفوظة بعد." />;

  return (
    <section className="tasks-panel">
      <div className="tasks-panel-header">
        <div><span className="eyebrow">REAL API DATA</span><h1>المهام</h1></div>
        <span className="project-readiness"><span className="status-dot active" /> D1 متصل</span>
      </div>
      <div className="tasks-list">
        {tasks.map((task) => (
          <article className="task-card" key={task.task_id}>
            <div>
              <strong>{task.task}</strong>
              <small>{task.task_id}</small>
            </div>
            <div className="task-card-meta">
              <span>{task.verdict}</span>
              <time dateTime={task.created_at}>{new Date(task.created_at).toLocaleString('ar-EG')}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskMessage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div className="project-surface-message">
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}
