import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createLocalSmokeRunner, LocalRunner } from '@aok/cli';
import { healthResponse } from './health';
import { parseRunRequest, runTask, sendJson } from './routes/run';

const MAX_BODY_BYTES = 64 * 1024;

export function createApiServer(runner = createLocalSmokeRunner()) {
  return createServer(async (request, response) => {
    try {
      await handleRequest(request, response, runner);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      const status = message.startsWith('request body') || message.startsWith('task ') ? 400 : 500;
      sendJson(response, status, { error: message });
    }
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  runner: LocalRunner,
): Promise<void> {
  const method = request.method ?? 'GET';
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;

  if (path === '/health') {
    if (method !== 'GET') {
      sendJson(response, 405, { error: 'method not allowed' });
      return;
    }
    sendJson(response, 200, healthResponse());
    return;
  }

  if (path === '/run') {
    if (method !== 'POST') {
      sendJson(response, 405, { error: 'method not allowed' });
      return;
    }
    const body = await readJson(request);
    await runTask(request, response, runner, body);
    return;
  }

  sendJson(response, 404, { error: 'not found' });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('request body is too large');
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('request body must be valid JSON');
  }
}
