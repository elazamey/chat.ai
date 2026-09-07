import { StateMachine } from '@aok/transition';
import type { CircuitBreakerConfig, CircuitBreakerState, CircuitState } from './types';

/**
 * Circuit Breaker (IMMUNE §10) — لكل مورد خارجي:
 *   GitHub / Model Provider / Database / Cloudflare / MCP / Browser
 *   closed →(failure threshold)→ open →(cooldown)→ half-open →(healthy)→ closed
 * إذا انهار GitHub مثلًا، لا تستمر آلاف الـAgents في ضربه.
 */
export const BREAKER_MACHINE = new StateMachine<CircuitBreakerState, string>({
  closed: { trip: 'open' },
  open: { cooldown: 'half-open' },
  'half-open': { success: 'closed', failure: 'open' },
});

export class CircuitBreaker {
  private state: CircuitState;

  constructor(
    resource: string,
    private config: CircuitBreakerConfig,
    private now: () => number = Date.now,
  ) {
    this.state = {
      resource,
      state: 'closed',
      failures: 0,
      openedAt: null,
      halfOpenTrials: 0,
    };
  }

  get resource(): string {
    return this.state.resource;
  }

  snapshot(): CircuitState {
    return { ...this.state };
  }

  /** هل يسمح الممر الآن؟ (open أثناء الـcooldown يرفض، half-open يسمح بمحاولات محدودة). */
  allow(): boolean {
    if (this.state.state === 'closed') return true;
    if (this.state.state === 'open') {
      const elapsed = this.now() - (this.state.openedAt ?? this.now());
      if (elapsed >= this.config.cooldownMs) {
        this.state = { ...this.state, state: BREAKER_MACHINE.transition('open', 'cooldown'), halfOpenTrials: 0 };
        return true;
      }
      return false;
    }
    return this.state.halfOpenTrials < this.config.maxHalfOpenTrials;
  }

  recordSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state = {
        ...this.state,
        state: BREAKER_MACHINE.transition('half-open', 'success'),
        failures: 0,
        openedAt: null,
        halfOpenTrials: 0,
      };
    } else if (this.state.state === 'closed') {
      this.state = { ...this.state, failures: 0 };
    }
  }

  recordFailure(): void {
    if (this.state.state === 'half-open') {
      this.state = {
        ...this.state,
        state: BREAKER_MACHINE.transition('half-open', 'failure'),
        openedAt: this.now(),
        halfOpenTrials: 0,
      };
      return;
    }
    const failures = this.state.failures + 1;
    if (failures >= this.config.failureThreshold) {
      this.state = {
        ...this.state,
        state: BREAKER_MACHINE.transition('closed', 'trip'),
        failures,
        openedAt: this.now(),
      };
    } else {
      this.state = { ...this.state, failures };
    }
  }
}

/** سجل قواطع لكل الموارد الخارجية. */
export class CircuitBreakers {
  private breakers = new Map<string, CircuitBreaker>();

  for(resource: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let b = this.breakers.get(resource);
    if (!b) {
      b = new CircuitBreaker(resource, config ?? { failureThreshold: 5, cooldownMs: 60_000, maxHalfOpenTrials: 1 });
      this.breakers.set(resource, b);
    }
    return b;
  }

  all(): CircuitState[] {
    return [...this.breakers.values()].map((b) => b.snapshot());
  }
}
