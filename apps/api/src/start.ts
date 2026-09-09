import { createApiServer } from './server';

const port = Number.parseInt(process.env.PORT ?? '10000', 10);

createApiServer().listen(port, '0.0.0.0', () => {
  console.log(`celia-api listening on 0.0.0.0:${port}`);
});
