import type { JobQueue, WorkflowJob } from './types';

/**
 * M4.2 — Scheduler مستقل (FIFO داخل العملية للـMVP/local).
 *
 * الـOrchestrator لا يعرف هل النقل in-process أو SQLite queue أو Postgres queue
 * أو Redis أو cloud queue — كلها خلف نفس العقد `Scheduler`/`JobQueue`.
 * (نفس فلسفة ADR-0004/0013: الواجهة ثابتة، والـbackend يتبدل بالنشر.)
 */
export class InProcessScheduler implements JobQueue {
  private queue: WorkflowJob[] = [];

  async enqueue(job: WorkflowJob): Promise<void> {
    this.queue.push(job);
  }

  async cancel(jobId: string): Promise<void> {
    this.queue = this.queue.filter((j) => j.id !== jobId);
  }

  async retry(jobId: string): Promise<void> {
    const job = this.queue.find((j) => j.id === jobId);
    if (job) {
      this.queue.push({ ...job, attempt: job.attempt + 1 });
    }
  }

  dequeue(): WorkflowJob | undefined {
    return this.queue.shift();
  }

  get size(): number {
    return this.queue.length;
  }
}
