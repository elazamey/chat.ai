import type { Job } from '@aok/contracts';

/**
 * جدولة داخل العملية (C23): FIFO بسيطة للـMVP.
 * عند التوسع: Redis/Postgres queues + pub/sub.
 */
export class InProcessScheduler {
  private queue: Job[] = [];

  enqueue(job: Job): void {
    this.queue.push(job);
  }

  dequeue(): Job | undefined {
    return this.queue.shift();
  }

  peek(): Job | undefined {
    return this.queue[0];
  }

  get size(): number {
    return this.queue.length;
  }

  /** قيد التزامن: لا تتجاوز عدد الوظائف قيد التشغيل الحد الأقصى. */
  canDispatch(concurrency: number, running: number): boolean {
    return running < concurrency;
  }
}
