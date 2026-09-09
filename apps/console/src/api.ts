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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task }),
    });
  } catch {
    throw new Error('تعذر الوصول إلى خدمة التنفيذ. تحقق من الاتصال وحاول مرة أخرى.');
  }

  let body: ApiRunResponse | { error?: string };
  try {
    body = (await response.json()) as ApiRunResponse | { error?: string };
  } catch {
    throw new Error(`استجابة غير صالحة من خدمة التنفيذ (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : `فشل طلب التنفيذ (${response.status}).`);
  }
  if (!('verdict' in body) || !body.run_id || !body.task_id) {
    throw new Error('استجابة التنفيذ ناقصة أو غير صالحة.');
  }
  return body as ApiRunResponse;
}
