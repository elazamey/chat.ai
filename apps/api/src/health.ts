export interface HealthResponse {
  status: 'ok';
  service: 'celia-api';
  mode: 'local' | 'cloud';
}

export function healthResponse(): HealthResponse {
  return {
    status: 'ok',
    service: 'celia-api',
    mode: process.env.CELIA_MODE === 'cloud' ? 'cloud' : 'local',
  };
}
