/**
 * IMMUNE CORE — أنواع الجهاز المناعي.
 *
 * هذه الطبقة ليست جزءًا من الـKernel المنطقي (Atomic Kernel):
 * العلاقة: Atomic Kernel → Immune Interface → Immune Runtime.
 * تعتمد على العقود والأحداث فقط، ولا تعرف Agents/Tools/Models أبدًا.
 *
 * الهدف ليس منع كل خطأ، بل: اكتشاف الانحراف مبكرًا، عزله، إيقاف الامتداد،
 * التعافي، ثم إثبات ما حدث (Detect → Decide → Isolate → Recover → Verify → Learn).
 */

/** مستويات المناعة الخمسة. */
export type ImmunityLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';

/** ترتيب المستويات (الأعلى = أشد). */
export const IMMUNITY_ORDER: Record<ImmunityLevel, number> = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3,
  BLACK: 4,
};

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** أصناف الانحراف التي يلتقطها الـDetector. */
export type RiskReasonKind =
  | 'normal_tool_call'
  | 'unusual_tool_sequence'
  | 'permission_escalation'
  | 'credential_misuse'
  | 'secret_access_anomaly'
  | 'ledger_tampering_attempt'
  | 'kernel_integrity_failure'
  | 'artifact_tampering'
  | 'prompt_injection'
  | 'tool_poisoning'
  | 'memory_poisoning'
  | 'dependency_anomaly'
  | 'resource_exhaustion'
  | 'repeated_failure'
  | 'unexpected_transition'
  | 'runaway_loop'
  | 'usage_velocity'
  | 'blast_radius_exceeded';

/**
 * أوزان الإشارات (قرار تشغيل آلي وليس حكمًا قضائيًا):
 *   Normal tool call          → 5
 *   Unusual tool sequence     → 30
 *   Permission escalation     → 60
 *   Secret access anomaly     → 85
 *   Ledger tampering attempt  → 95
 *   Kernel integrity failure  → 100
 */
export const SIGNAL_WEIGHTS: Record<RiskReasonKind, number> = {
  normal_tool_call: 5,
  unusual_tool_sequence: 30,
  permission_escalation: 60,
  credential_misuse: 80,
  secret_access_anomaly: 85,
  ledger_tampering_attempt: 95,
  kernel_integrity_failure: 100,
  artifact_tampering: 85,
  prompt_injection: 80,
  tool_poisoning: 75,
  memory_poisoning: 70,
  dependency_anomaly: 75,
  resource_exhaustion: 50,
  repeated_failure: 45,
  unexpected_transition: 55,
  runaway_loop: 90,
  usage_velocity: 90,
  blast_radius_exceeded: 70,
};

export interface RiskReason {
  kind: RiskReasonKind;
  detail: string;
  weight: number;
}

export interface RiskScore {
  score: number; // 0..100
  confidence: number; // 0..1
  reasons: RiskReason[];
  severity: RiskSeverity;
}

export type PrincipalType = 'user' | 'agent' | 'runner' | 'plugin' | 'tool' | 'model' | 'service';

export type TrustState = 'UNKNOWN' | 'SUSPICIOUS' | 'VERIFIED' | 'TRUSTED' | 'QUARANTINED' | 'REVOKED';

/** هوية كل فاعل في النظام (IMMUNE §15): لا `unknown → privileged`. */
export interface Principal {
  id: string;
  type: PrincipalType;
  trust: TrustState;
  /** مراجع الاعتمادات (ids) — لا القيم أبدًا. */
  credentials: string[];
}

export const systemPrincipal: Principal = {
  id: 'immune',
  type: 'service',
  trust: 'TRUSTED',
  credentials: [],
};

export type InputSource = 'system' | 'user' | 'tool' | 'repository' | 'web' | 'memory' | 'model';

export interface InputOrigin {
  source: InputSource;
  trustLevel: number; // 0..1
  label?: string;
}

/** المصادر غير الموثوقة افتراضيًا (IMMUNE PRINCIPLE 010). */
export const UNTRUSTED_SOURCES: readonly InputSource[] = ['tool', 'repository', 'web', 'memory', 'model'];

export const systemOrigin: InputOrigin = { source: 'system', trustLevel: 1, label: 'system' };
export const userOrigin: InputOrigin = { source: 'user', trustLevel: 0.9, label: 'user' };

/** نصف قطر الانفجار: ماذا يمكن أن يتلف هذا الفعل؟ (IMMUNE §23) */
export interface BlastRadius {
  repositories: string[];
  paths: string[];
  tools: string[];
  networks: string[];
  secrets: string[];
  environments: string[];
}

export function emptyBlastRadius(): BlastRadius {
  return { repositories: [], paths: [], tools: [], networks: [], secrets: [], environments: [] };
}

export function blastRadiusScore(radius: BlastRadius | undefined): number {
  if (!radius) return 0;
  const counts = [
    radius.repositories.length,
    radius.paths.length,
    radius.tools.length,
    radius.networks.length,
    radius.secrets.length,
    radius.environments.length,
  ];
  return Math.min(100, counts.reduce((sum, n) => sum + n * 10, 0));
}

export type ImmuneAction =
  | 'allow'
  | 'monitor'
  | 'restrict'
  | 'quarantine'
  | 'kill'
  | 'block'
  | 'approval_required';

export interface ImmuneDecision {
  allowed: boolean;
  action: ImmuneAction;
  level: ImmunityLevel;
  risk: RiskScore;
  reasons: string[];
  approvalRequired: boolean;
  evidenceRequired: boolean;
}

export type KillTargetType = 'run' | 'agent' | 'plugin' | 'runner';

export interface KillRequest {
  targetType: KillTargetType;
  targetId: string;
  reason: string;
  requester: string; // 'agent:<id>' | 'system' | 'immune'
}

export interface KillOutcome {
  approved: boolean;
  applied: boolean;
  reason: string;
}

/** حماية مضادة للتسلسل (Anti-Cascade — IMMUNE §22). */
export interface CascadeConfig {
  maxAgentDepth: number; // 5
  maxChildren: number; // 10
  maxRetry: number; // 3
  /** عتبة موافقة blast-radius: score × radius ≥ هذه القيمة → Approval required. */
  blastRadiusApprovalThreshold: number;
  /** سرعة استدعاء أدوات مشبوهة (استدعاء/ثانية). */
  maxToolCallsPerSecond: number;
  maxModelCallsPerSecond: number;
}

export const DEFAULT_CASCADE: CascadeConfig = {
  maxAgentDepth: 5,
  maxChildren: 10,
  maxRetry: 3,
  blastRadiusApprovalThreshold: 1200,
  maxToolCallsPerSecond: 10,
  maxModelCallsPerSecond: 2,
};

/** حالة الـCircuit Breaker لكل مورد خارجي (IMMUNE §10). */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  maxHalfOpenTrials: number;
}

export interface CircuitState {
  resource: string;
  state: CircuitBreakerState;
  failures: number;
  openedAt: number | null;
  halfOpenTrials: number;
}

/** مستويات التعافي (IMMUNE §9): بدون تهور. */
export type RecoveryLevel = 0 | 1 | 2 | 3 | 4 | 5;
// 0 retry · 1 restart component · 2 rollback transaction · 3 restore checkpoint · 4 isolate environment · 5 human approval

export const RECOVERY_LEVELS: { level: RecoveryLevel; label: string }[] = [
  { level: 0, label: 'retry' },
  { level: 1, label: 'restart component' },
  { level: 2, label: 'rollback transaction' },
  { level: 3, label: 'restore checkpoint' },
  { level: 4, label: 'isolate environment' },
  { level: 5, label: 'require human approval' },
];

export type CheckpointKind =
  | 'migration'
  | 'deployment'
  | 'mass_file_change'
  | 'dependency_upgrade'
  | 'configuration_mutation'
  | 'custom';

export interface Checkpoint {
  id: string;
  label: string;
  kind: CheckpointKind;
  createdAt: string;
  state: Record<string, unknown>;
  hash: string;
}

/** الحالة الجيدة المعروفة (IMMUNE §21): لا إصلاح من حالة فاسدة. */
export interface KnownGoodState {
  lastKnownGoodCommit: string;
  lastKnownGoodBuild: string;
  lastKnownGoodConfig: string;
  lastKnownGoodPluginSet: string[];
  lastKnownGoodPolicy: string;
}

export interface RecoveryResult {
  level: RecoveryLevel;
  applied: boolean;
  restored: boolean;
  verified: boolean;
  note: string;
}

/** حالات الـQuarantine (IMMUNE §7). */
export type QuarantineState =
  | 'ACTIVE'
  | 'SUSPICIOUS'
  | 'QUARANTINED'
  | 'ANALYSIS'
  | 'RECOVERED'
  | 'REVOKED';

export interface QuarantineRestrictions {
  filesystem: 'readonly' | 'blocked' | 'normal';
  network: 'blocked' | 'allowlist' | 'normal';
  credentials: 'revoked' | 'normal';
  newProcesses: 'blocked' | 'normal';
  plugin: 'disabled' | 'normal';
}

export const FULL_QUARANTINE: QuarantineRestrictions = {
  filesystem: 'readonly',
  network: 'blocked',
  credentials: 'revoked',
  newProcesses: 'blocked',
  plugin: 'disabled',
};

export const NORMAL_RESTRICTIONS: QuarantineRestrictions = {
  filesystem: 'normal',
  network: 'normal',
  credentials: 'normal',
  newProcesses: 'normal',
  plugin: 'normal',
};

export interface QuarantineRecord {
  entityId: string;
  state: QuarantineState;
  reason: string;
  restrictions: QuarantineRestrictions;
  enteredAt: string;
  evidence: string[];
}

/** حالات الاستجابة للحوادث (IMMUNE §20). */
export type IncidentState =
  | 'DETECTED'
  | 'CLASSIFIED'
  | 'CONTAINED'
  | 'RECOVERING'
  | 'VERIFIED'
  | 'CLOSED';

export interface IncidentRecord {
  id: string;
  state: IncidentState;
  severity: RiskSeverity;
  title: string;
  detections: string[];
  evidenceHashes: string[];
  timeline: { at: string; note: string }[];
}

/** مراقبة النظام (IMMUNE §27). */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'locked';
  kernel: 'healthy' | 'degraded';
  immune: 'watch' | 'active' | 'quarantined' | 'locked';
  ledger: 'healthy' | 'degraded';
  storage: 'healthy' | 'degraded';
  runners: { healthy: number; quarantined: number };
  incidents: number;
  level: ImmunityLevel;
}

/** مقاييس المناعة (IMMUNE §28). */
export interface ImmunityMetrics {
  mttdMs: number; // Mean Time To Detect
  mttcMs: number; // Mean Time To Contain
  mttrMs: number; // Mean Time To Recover
  incidentCount: number;
  falsePositiveRate: number;
  policyViolations: number;
  quarantineCount: number;
  recoverySuccess: number;
  recoveryAttempts: number;
  integrityFailures: number;
  credentialRevocations: number;
  kills: number;
}

/** ميزانيات الموارد (IMMUNE §11) — تتكامل مع الـEconomic Kernel. */
export interface UsageBudgetSpec {
  cpuMs: number;
  ramMb: number;
  diskMb: number;
  networkRequests: number;
  processCount: number;
  toolCalls: number;
  modelCalls: number;
  executionMs: number;
}

/** ملاحظة يفحصها الـDetector. */
export interface Observation {
  principal?: Principal;
  capability?: string;
  scope?: string;
  /** دفاع حقن التعليمات (IMMUNE §12): فصل instruction عن data. */
  input?: { origin: InputOrigin; text: string };
  /** دفاع تسميم الأداة (IMMUNE §13). */
  toolResult?: { origin: InputOrigin; text: string; toolId: string };
  /** دفاع تسميم الذاكرة (IMMUNE §14). */
  memoryWrite?: { origin: InputOrigin; content: string; actor: string };
  artifact?: { id: string; expectedHash: string; actualHash: string };
  dependency?: {
    name: string;
    drift?: DependencyDrift;
    knownVulnerability?: boolean;
    hasInstallScript?: boolean;
    version?: string;
  };
  usage?: { toolCalls: number; modelCalls: number; windowMs: number };
  runStats?: { depth: number; children: number; retries: number };
  integrity?: { target: string; expectedHash: string; runtimeHash: string };
  repeatedFailures?: number;
  toolSequence?: string[];
  unexpectedTransition?: { from: string; event: string };
}

export type DependencyDrift =
  | 'new_transitive'
  | 'version_drift'
  | 'install_script'
  | 'known_vulnerability'
  | 'license_change'
  | 'maintainer_change'
  | 'network_dependency';

export interface Detection {
  id: string;
  kind: RiskReasonKind;
  detail: string;
  weight: number;
  at: number;
  actorId?: string;
}

/** تقييم سياسة — نفس شكل PolicyEngine.evaluate (structural). */
export interface PolicyView {
  evaluate(
    principal: string,
    capability: string,
    scope?: string,
  ): { allowed: boolean; approvalRequired: boolean; reason: string };
}

export interface ImmuneRequest {
  principal: Principal;
  capability: string;
  scope?: string;
  origin?: InputOrigin;
  blastRadius?: BlastRadius;
  observation?: Observation;
}
