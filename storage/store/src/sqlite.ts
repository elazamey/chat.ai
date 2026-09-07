import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * node:sqlite أُضيف في Node 22، ولا يعرفه Vite 5 (الـresolver الخاص بالاختبارات).
 * نحمّله عبر createRequire لتجاوز الـresolver، وأنواعه معرّفة محليًا هنا
 * (وليست ambient) حتى تعمل عبر حدود الحزم دون الحاجة إلى types@node>=22.
 */

export interface SqliteStatementSync {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface SqliteDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatementSync;
  close(): void;
}

interface SqliteModule {
  DatabaseSync: new (path: string, options?: { open?: boolean }) => SqliteDatabaseSync;
}

const sqlite = require('node:sqlite') as SqliteModule;

export const DatabaseSync = sqlite.DatabaseSync;
export type DatabaseSync = SqliteDatabaseSync;
