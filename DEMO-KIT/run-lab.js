import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runId = process.argv[2];
if (!/^[a-f0-9]{32}$/.test(runId ?? '')) {
  throw new Error('Start Lab with START-LAB.cmd.');
}

const request = fileURLToPath(new URL('../data/demo-kit/' + runId + '/stop.request', import.meta.url));
const poll = setInterval(() => {
  if (process.listenerCount('SIGINT') > 0 && existsSync(request)) {
    clearInterval(poll);
    process.emit('SIGINT');
  }
}, 300);
poll.unref();

await import('../src/bot.js');
