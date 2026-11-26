import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { trackVoice } from '../src/voice-quests.js';

const pool = ['voice', 'reaction', 'community'];
const now = new Date('2026-11-21T04:00:00Z');
const day = '2026-11-21';

test('sự kiện cũ trước check-in và quest hết hạn không được cộng', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  store.recordCheckIn('lab', 'a', now, pool);
  assert.equal(store.completeQuest('lab', 'a', day, 'community', new Date(now - 1)), false);
  assert.equal(store.completeQuest('lab', 'a', day, 'community', new Date('2026-11-21T17:00:00Z')), false);
  assert.equal(store.completeQuest('lab', 'b', day, 'community', now), false);
  assert.equal(store.completeQuest('lab', 'a', day, 'community', now), true);
  assert.equal(store.completeQuest('lab', 'a', day, 'community', now), false);
});

test('qua cuối tháng theo giờ Việt Nam giữ lịch sử và tăng streak', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const last = store.recordCheckIn('lab', 'a', new Date('2026-11-30T16:59:59Z'), pool);
  const next = store.recordCheckIn('lab', 'a', new Date('2026-11-30T17:00:00Z'), pool);
  assert.equal(last.day, '2026-11-30');
  assert.equal(next.day, '2026-12-01');
  assert.equal(next.streak, 2);
  assert.deepEqual(store.getQuests('lab', 'a', last.day), last.quests);
});

test('Voice đổi sang phòng không hợp lệ rồi trở lại giữ tiến độ và không cộng trùng', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  store.recordCheckIn('lab', 'a', now, pool);
  const completions = [];
  const voice = trackVoice(store, 'lab', (...args) => completions.push(args), 10_000);
  const start = now.getTime();
  const progress = () => store.getQuests('lab', 'a', day).find(q => q.kind === 'voice');
  voice.update('a', true, start);
  voice.update('a', false, start + 4000);
  voice.tick(start + 30_000);
  assert.equal(progress().voice_ms, 4000);
  voice.update('a', true, start + 31_000);
  voice.tick(start + 37_000);
  voice.tick(start + 37_000);
  assert.equal(progress().voice_ms, 10_000);
  assert.deepEqual(completions, [['a', day]]);
});

test('Voice ghi cả tick cùng lúc, báo hoàn thành sau commit và giữ riêng từng người', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  for (const user of ['a', 'b']) store.recordCheckIn('lab', user, now, pool);
  const completed = [];
  const voice = trackVoice(store, 'lab', (user, completedDay) => {
    assert.ok(store.getQuests('lab', user, completedDay).find(q => q.kind === 'voice').completed_at);
    completed.push(user);
  }, 10_000);
  const start = now.getTime();
  for (const user of ['a', 'b', 'without-checkin']) voice.update(user, true, start);
  voice.tick(start + 5000);
  const progress = user => store.getQuests('lab', user, day).find(q => q.kind === 'voice').voice_ms;
  assert.equal(progress('a'), 5000);
  assert.equal(progress('b'), 5000);
  assert.deepEqual(store.getQuests('lab', 'without-checkin', day), []);
  assert.deepEqual(completed, []);

  assert.throws(() => store.addVoiceBatch('lab', day, [
    { userId: 'a', elapsed: 5000 }, { userId: 'b', elapsed: null },
  ], 10_000, new Date(start + 10_000)), /NOT NULL/);
  assert.equal(progress('a'), 5000);
  assert.equal(progress('b'), 5000);

  voice.tick(start + 10_000);
  voice.tick(start + 15_000);
  assert.equal(progress('a'), 10_000);
  assert.equal(progress('b'), 10_000);
  assert.deepEqual(completed, ['a', 'b']);
});

test('nhiều kết nối check-in và hoàn thành đồng thời, khôi phục bản backup trên file riêng', async t => {
  const root = resolve('data');
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'final-qa-'));
  const path = join(dir, 'race.sqlite');
  const store = openCheckInStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const workerSrc = `
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      const { openCheckInStore } = await import(workerData.module);
      const store = openCheckInStore(workerData.path);
      const stamp = new Date(workerData.now);
      const results = [];
      for (let i = 0; i < 8; i++) {
        const first = store.recordCheckIn('lab', 'a', stamp, workerData.pool).created;
        const done = store.completeQuest('lab', 'a', '2026-11-21', 'reaction', stamp);
        results.push({ first, done });
      }
      store.close();
      parentPort.postMessage(results);
    })().catch(error => { throw error; });`;

  const workers = Array.from({ length: 4 }, () => new Promise((done, reject) => {
    const worker = new Worker(workerSrc, {
      eval: true,
      workerData: { path, now, pool, module: new URL('../src/checkins.js', import.meta.url).href },
    });
    worker.once('message', done);
    worker.once('error', reject);
  }));
  const results = (await Promise.all(workers)).flat();
  assert.equal(results.filter(result => result.first).length, 1);
  assert.equal(results.filter(result => result.done).length, 1);
  assert.equal(store.getQuests('lab', 'a', day).length, 3);

  const copy = join(dir, 'restore.sqlite');
  const reader = new DatabaseSync(path, { readOnly: true });
  try { await backup(reader, copy); } finally { reader.close(); }
  const reopened = openCheckInStore(copy);
  try {
    assert.deepEqual(reopened.getQuests('lab', 'a', day), store.getQuests('lab', 'a', day));
    assert.equal(reopened.recordCheckIn('lab', 'a', now, pool).created, false);
    assert.equal(reopened.recordCheckIn('lab', 'b', now, pool).created, true);
    assert.deepEqual(store.getQuests('lab', 'b', day), []);
  } finally { reopened.close(); }
});
