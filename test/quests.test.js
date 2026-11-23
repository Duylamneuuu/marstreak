import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { trackVoice } from '../src/voice-quests.js';

const pool = ['voice', 'reaction', 'community'];
const now = new Date('2026-11-21T03:00:00Z');
const day = '2026-11-21';

test('pool 6 quest chọn đúng 3 khác nhau, lưu thứ tự và giữ kết quả sau khi đổi pool hoặc restart', t => {
  mkdirSync('data', { recursive: true });
  const dir = mkdtempSync(join(resolve('data'), 'quests-test-'));
  const path = join(dir, 'quest.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fullPool = [...pool, 'fixture-a', 'fixture-b', 'fixture-c'];
  const first = openCheckInStore(path);
  let initial;
  try {
    const combinations = new Set();
    for (let user = 0; user < 48; user++) {
      const kinds = first.recordCheckIn('lab', String(user), now, fullPool).quests.map(quest => quest.kind);
      assert.equal(kinds.length, 3);
      assert.equal(new Set(kinds).size, 3);
      assert.ok(kinds.every(kind => fullPool.includes(kind)));
      combinations.add([...kinds].sort().join());
    }
    assert.ok(combinations.size > 1);
    initial = first.getQuests('lab', '0', day);
    assert.deepEqual(first.recordCheckIn('lab', '0', now, pool).quests, initial);
    assert.equal(first.completeQuest('lab', '0', day, initial[0].kind, now), true);
    assert.equal(first.completeQuest('lab', '0', day, initial[0].kind, now), false);
    assert.equal(first.getQuests('lab', '1', day).filter(quest => quest.completed_at).length, 0);
    assert.equal(first.completeQuest('other', '0', day, initial[0].kind, now), false);
  } finally {
    first.close();
  }

  const reopened = openCheckInStore(path);
  try {
    const repeated = reopened.recordCheckIn('lab', '0', now, pool);
    assert.equal(repeated.created, false);
    assert.deepEqual(repeated.quests.map(quest => quest.kind), initial.map(quest => quest.kind));
    assert.equal(repeated.quests.filter(quest => quest.completed_at).length, 1);
  } finally {
    reopened.close();
  }
});

test('pool dưới 3 quest hủy cả lần ghi điểm danh, lần thử lại vẫn ghi lần đầu', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  assert.throws(() => store.recordCheckIn('lab', 'one', now, ['voice', 'voice', 'reaction']), /ít nhất 3/);
  assert.deepEqual(store.getQuests('lab', 'one', day), []);
  assert.equal(store.recordCheckIn('lab', 'one', now, pool).created, true);
});

test('Voice cộng từng đoạn, bỏ thời gian giữa hai lần kết nối và chỉ hoàn thành một lần', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const completions = [];
  const voice = trackVoice(store, 'lab', (id, date) => completions.push([id, date]));
  store.recordCheckIn('lab', 'one', now, pool);
  store.recordCheckIn('lab', 'two', now, pool);
  const start = now.getTime();
  voice.update('one', true, start);
  for (let seconds = 5; seconds <= 55; seconds += 5) voice.tick(start + seconds * 1000);
  voice.update('one', false, start + 60_000);
  voice.tick(start + 75_000);
  voice.update('one', true, start + 80_000);
  voice.tick(start + 90_000);
  voice.pause();
  voice.tick(start + 150_000);
  voice.update('one', true, start + 150_000);
  for (let seconds = 155; seconds <= 195; seconds += 5) voice.tick(start + seconds * 1000);
  const progress = () => store.getQuests('lab', 'one', day).find(q => q.kind === 'voice');
  assert.equal(progress().voice_ms, 115_000);
  assert.equal(progress().completed_at, null);
  voice.tick(start + 200_000);
  voice.tick(start + 205_000);
  assert.equal(progress().voice_ms, 120_000);
  assert.deepEqual(completions, [['one', day]]);
  assert.equal(store.getQuests('lab', 'two', day).find(q => q.kind === 'voice').voice_ms, 0);
});

test('reset 00:00 VN tách lịch sử và Voice không backfill qua ngày hoặc khi máy ngủ', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const voice = trackVoice(store, 'lab', () => assert.fail('Voice chưa đủ thời gian'));
  const midnight = Date.parse('2026-11-21T17:00:00Z');
  const before = new Date(midnight - 5000);
  store.recordCheckIn('lab', 'one', before, pool);
  store.completeQuest('lab', 'one', day, 'reaction', before);
  voice.update('one', true, midnight - 5000);
  voice.tick(midnight);
  assert.deepEqual(store.getQuests('lab', 'one', '2026-11-22'), []);
  assert.equal(store.completeQuest('lab', 'one', '2026-11-22', 'reaction', new Date(midnight)), false);
  const next = store.recordCheckIn('lab', 'one', new Date(midnight), pool);
  assert.equal(next.streak, 2);
  assert.ok(next.quests.every(q => !q.completed_at && q.voice_ms === 0));
  voice.tick(midnight + 60_000);
  voice.tick(midnight + 65_000);
  assert.equal(store.getQuests('lab', 'one', '2026-11-22').find(q => q.kind === 'voice').voice_ms, 5000);
  assert.ok(store.getQuests('lab', 'one', day).find(q => q.kind === 'reaction').completed_at);
});
