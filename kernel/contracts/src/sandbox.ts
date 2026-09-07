/** حدود الـSandbox (C9): كل execution يمر عبر Sandbox Manager. */
export interface SandboxLimits {
  fsRoot: string; // حدود الـworkspace (path-traversal protection)
  cpuMs?: number;
  ramMb?: number;
  timeoutMs: number;
  maxProcesses?: number;
  networkPolicy: 'none' | 'allowlist' | 'all';
  networkDomains?: string[];
}

export interface Sandbox {
  id: string;
  limits: SandboxLimits;
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export interface SandboxManager {
  allocate(limits: SandboxLimits): Promise<Sandbox>;
  release(id: string): Promise<void>;
}
