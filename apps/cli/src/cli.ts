#!/usr/bin/env node
/**
 * celia — واجهة CLI من الدرجة الأولى (ADR-0014).
 * MVP: mode / run / ledger / tools / models — بدون أي تبعية خارجية.
 */
import { LocalRunner } from './local-runner';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const runner = new LocalRunner();

  switch (command) {
    case 'mode':
      console.log(`CELIA_MODE=${process.env.CELIA_MODE === 'cloud' ? 'cloud' : 'local'}`);
      return;

    case 'models':
      console.log(runner.router.discover().map((m) => `${m.providerId}/${m.id} ($${m.costPer1kInputUsd}/1k)`).join('\n'));
      return;

    case 'tools':
      console.log(runner.executors.list().join('\n') || '(no executors registered)');
      return;

    case 'run': {
      const intent = args.join(' ') || 'demo task';
      const outcome = await runner.run(intent);
      console.log(`verdict: ${outcome.verdict}`);
      console.log(`usage: ${JSON.stringify(outcome.usage.total)}`);
      console.log(`evidence: ${outcome.verification.evidence.length} item(s)`);
      return;
    }

    case 'ledger': {
      for (const e of runner.ledger.all) {
        console.log(`${e.seq}\t${e.type}\t${e.hash.slice(0, 8)}`);
      }
      return;
    }

    case 'runner':
      if (args[0] === 'start') {
        console.log('celia runner started (local) — $0');
        return;
      }
      console.log('celia runner install | connect | start');
      return;

    default:
      console.log('usage: celia <mode|run|ledger|tools|models|runner>');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
