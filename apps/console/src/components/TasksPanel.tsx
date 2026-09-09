import { useEffect, useState } from 'react';
import { listRuns, listTasks, type ApiRunSummary, type ApiTaskSummary, RunRequestError } from '../api';

export function TasksPanel() {
  const [tasks, setTasks] = useState<ApiTaskSummary[] | null>(null);
  const [runs, setRuns] = useState<ApiRunSummary[] | null>(null);
  const [taskId, setTaskId] = useState('');
  const [activeTaskId, setActiveTaskId] = useState('');
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

  return (
    <section className="tasks-panel">
      <div className="tasks-panel-header">
        <div><span className="eyebrow">REAL API DATA</span><h1>المهام</h1></div>
        <span className="project-readiness"><span className="status-dot active" /> D1 متصل</span>
      </div>
      <form
        className="task-filter"
        onSubmit={(event) => {
          event.preventDefault();
          const value = taskId.trim();
          setError(null);
          setActiveTaskId(value);
          setRuns(null);
          if (!value) {
            return;
          }
          void listRuns(value).then(setRuns).catch((reason: unknown) => {
            setError(reason instanceof RunRequestError ? reason.message : 'تعذر تحميل تشغيلات المهمة.');
          });
        }}
      >
        <label htmlFor="task-id-filter">فلترة التشغيلات حسب task_id</label>
        <div>
          <input id="task-id-filter" value={taskId} onChange={(event) => setTaskId(event.target.value)} placeholder="task id" />
          <button type="submit">عرض التشغيلات</button>
        </div>
      </form>
      {activeTaskId ? (
        runs?.length ? (
          <div className="tasks-list">
            {runs.map((run) => <RunCard key={run.run_id} run={run} />)}
          </div>
        ) : (
          <TaskMessage title="لا توجد تشغيلات" body={`لا توجد تشغيلات محفوظة للمهمة ${activeTaskId}.`} />
        )
      ) : tasks.length ? (
        <div className="tasks-list">
          {tasks.map((task) => (
            <article className="task-card" key={task.task_id}>
              <div><strong>{task.task}</strong><small>{task.task_id}</small></div>
              <div className="task-card-meta"><span>{task.verdict}</span><time dateTime={task.created_at}>{new Date(task.created_at).toLocaleString('ar-EG')}</time></div>
            </article>
          ))}
        </div>
      ) : (
        <TaskMessage title="المهام" body="لا توجد تشغيلات محفوظة بعد." />
      )}
    </section>
  );
}

function RunCard({ run }: { run: ApiRunSummary }) {
  return (
    <article className="task-card">
      <div><strong>{run.task}</strong><small>{run.run_id}</small></div>
      <div className="task-card-meta"><span>{run.verdict}</span><time dateTime={run.created_at}>{new Date(run.created_at).toLocaleString('ar-EG')}</time></div>
    </article>
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
