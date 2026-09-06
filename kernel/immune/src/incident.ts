import { randomUUID } from 'node:crypto';
import type { Ledger } from '@aok/events';
import { StateMachine } from '@aok/transition';
import { systemActor } from '@aok/contracts';
import type { IncidentRecord, IncidentState, RiskSeverity } from './types';

/**
 * الـIncident Response Engine (IMMUNE §20):
 *   detect → classify → contain → preserve → recover → verify
 *   DETECTED → CLASSIFIED → CONTAINED → RECOVERING → VERIFIED → CLOSED
 *
 * كل مرحلة تُثبَّت في الـLedger append-only (IMMUNE §19: immutable evidence)
 * — المهاجم لا يستطيع محو أثره بنفس النظام.
 */
export const INCIDENT_MACHINE = new StateMachine<IncidentState, string>({
  DETECTED: { classify: 'CLASSIFIED' },
  CLASSIFIED: { contain: 'CONTAINED' },
  CONTAINED: { recover: 'RECOVERING' },
  RECOVERING: { verify: 'VERIFIED' },
  VERIFIED: { close: 'CLOSED' },
});

export class IncidentEngine {
  private incidents = new Map<string, IncidentRecord>();

  constructor(private ledger?: Ledger) {}

  detect(title: string, severity: RiskSeverity, detections: string[] = []): IncidentRecord {
    const incident: IncidentRecord = {
      id: randomUUID(),
      state: 'DETECTED',
      severity,
      title,
      detections,
      evidenceHashes: [],
      timeline: [{ at: new Date().toISOString(), note: `detected: ${title}` }],
    };
    this.incidents.set(incident.id, incident);
    this.record(incident, 'detected', { title, severity, detections });
    return { ...incident };
  }

  classify(id: string, severity: RiskSeverity): IncidentRecord {
    const next = this.step(id, 'classify', `classified as ${severity}`);
    next.severity = severity;
    this.incidents.set(id, { ...next });
    return { ...next };
  }

  contain(id: string, note: string): IncidentRecord {
    return this.step(id, 'contain', note);
  }

  recover(id: string, note: string): IncidentRecord {
    return this.step(id, 'recover', note);
  }

  verify(id: string, note: string): IncidentRecord {
    return this.step(id, 'verify', note);
  }

  close(id: string, note: string): IncidentRecord {
    return this.step(id, 'close', note);
  }

  get(id: string): IncidentRecord | undefined {
    const i = this.incidents.get(id);
    return i ? { ...i, timeline: [...i.timeline], evidenceHashes: [...i.evidenceHashes], detections: [...i.detections] } : undefined;
  }

  list(): IncidentRecord[] {
    return [...this.incidents.values()].map((i) => ({
      ...i,
      timeline: [...i.timeline],
      evidenceHashes: [...i.evidenceHashes],
      detections: [...i.detections],
    }));
  }

  get count(): number {
    return this.incidents.size;
  }

  private step(id: string, event: string, note: string): IncidentRecord {
    const current = this.incidents.get(id);
    if (!current) throw new Error(`incident: unknown incident '${id}'`);
    const state = INCIDENT_MACHINE.transition(current.state, event);
    const record: IncidentRecord = {
      ...current,
      state,
      timeline: [...current.timeline, { at: new Date().toISOString(), note }],
    };
    this.incidents.set(id, record);
    this.record(record, event, { note });
    return { ...record };
  }

  private record(incident: IncidentRecord, phase: string, payload: unknown): void {
    if (!this.ledger) return;
    const ev = this.ledger.append({
      actor: systemActor,
      type: `immune.incident.${phase}`,
      taskId: 'immune',
      runId: incident.id,
      payload: { incidentId: incident.id, phase, ...(payload as object) },
    });
    incident.evidenceHashes.push(ev.hash);
  }
}
