/**
 * Deterministic IDs — معرفات تسلسلية قابلة للتكرار (بدل randomUUID غير الحتمي)
 * لضمان قابلية إعادة التشغيل (Replay) في الاختبارات.
 */
export class DeterministicIds {
  private n = 0;

  constructor(private prefix = 'id') {}

  next(label?: string): string {
    this.n += 1;
    return `${label ?? this.prefix}-${String(this.n).padStart(4, '0')}`;
  }

  reset(): void {
    this.n = 0;
  }

  get count(): number {
    return this.n;
  }
}
