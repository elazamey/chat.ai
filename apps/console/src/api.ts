export interface ApiRunResponse {
  run_id: string;
  task_id: string;
  task: string;
  mode: 'local' | 'cloud';
  verdict: 'PASSED' | 'FAILED' | 'BLOCKED';
  usage: unknown;
  evidence: unknown[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export async function runTask(task: string): Promise<ApiRunResponse> {
  const response = await fetch(`${API_BASE_URL}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ task }),
  });

  const body = (await response.json()) as ApiRunResponse | { error?: string };
  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : `API request failed (${response.status})`);
  }
  return body as ApiRunResponse;
}
