export type TransitionTable<S extends string, E extends string> = Partial<
  Record<S, Partial<Record<E, S>>>
>;

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly event: string,
  ) {
    super(`Illegal state transition: event '${event}' is not allowed from state '${from}'`);
    this.name = 'IllegalTransitionError';
  }
}

/**
 * آلة الانتقال الفعلية (C12 / ADR-0007): كود وليس توثيقًا.
 * الجدول هو المصدر الوحيد للقانونية؛ الانتقال غير المسموح يرمي خطأ.
 */
export class StateMachine<S extends string, E extends string> {
  constructor(readonly transitions: TransitionTable<S, E>) {}

  canTransition(from: S, event: E): boolean {
    return this.transitions[from]?.[event] !== undefined;
  }

  transition(from: S, event: E): S {
    const next = this.transitions[from]?.[event];
    if (next === undefined) {
      throw new IllegalTransitionError(from, event);
    }
    return next;
  }
}
