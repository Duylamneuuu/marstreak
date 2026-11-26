import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MessageFlags } from 'discord.js';
import { openCheckInStore } from '../src/checkins.js';
import { createQuestPool } from '../src/quest-pool.js';
import { createDynoRollQuest, readDynoRollText } from '../src/integrations/dyno-roll.js';

const a = '900000000000000001';
const b = '900000000000000002';
const checkedInAt = new Date('2026-11-24T05:00:00Z');
const originalAt = new Date('2026-11-24T05:01:00Z');
const resultAt = new Date('2026-11-24T05:01:01Z');
const receivedAt = new Date('2026-11-24T05:01:02Z');
const config = { guildId: 'lab', dynoRollChannel: 'quest' };
const dyno = createDynoRollQuest(config);
const kind = dyno.kind;

function snowflake(date) {
  return ((BigInt(+date) - 1420070400000n) << 22n).toString();
}

function receipt(userId = a, startedAt = originalAt) {
  return {
    t: 'MESSAGE_CREATE',
    d: {
      id: snowflake(resultAt), guild_id: 'lab', channel_id: 'quest',
      author: { id: '155149108183695360', bot: true },
      application_id: '161660517914509312', webhook_id: '161660517914509312', flags: 0,
      timestamp: resultAt.toISOString(),
      interaction_metadata: { type: 2, id: snowflake(startedAt), name: 'roll', user: { id: userId } },
      content: '<@' + userId + '> You rolled 5',
      mentions: [{ id: userId }],
    },
  };
}

function pool() {
  return createQuestPool([dyno, ...['reaction', 'community', 'voice'].map(kind => ({
    kind, defaultEnabled: true, eligible: () => true,
  }))]);
}

test('Dyno chỉ parse kết quả đơn có dạng đã quan sát, không dùng side hoặc suy từ số', () => {
  assert.deepEqual(readDynoRollText('<@!' + a + '> 🎲 You rolled 5'), { userId: a, number: 5 });
  assert.equal(readDynoRollText('<@' + a + '> You rolled 0'), null);
  assert.equal(readDynoRollText('<@' + a + '> You rolled 5, 4'), null);
  assert.equal(readDynoRollText('<@' + a + '> Could not roll'), null);
  assert.equal(readDynoRollText('You rolled 5'), null);
  assert.equal(readDynoRollText(''), null);
});

test('Dyno từ chối sai nguồn, đích, người, lỗi, loading và follow-up', () => {
  const changes = [
    { guild_id: 'other' }, { channel_id: 'other' }, { id: 'bad' },
    { author: { id: '155149108183695360', bot: false } }, { application_id: 'wrong' }, { webhook_id: 'wrong' },
    { flags: MessageFlags.Loading }, { flags: MessageFlags.Ephemeral },
    { content: '<@' + b + '> You rolled 6' }, { mentions: [{ id: b }] }, { mentions: [null] },
    { content: 'The application did not respond' }, { interaction_metadata: null },
    { interaction_metadata: { ...receipt().d.interaction_metadata, name: 'dice' } },
    { interaction_metadata: { ...receipt().d.interaction_metadata, original_response_message_id: snowflake(resultAt) } },
    { timestamp: '2026-11-24T05:02:00Z' },
  ];
  assert.deepEqual(dyno.verify(receipt(), receivedAt), { userId: a, at: resultAt, startedAt: originalAt });
  for (const patch of changes) {
    assert.equal(dyno.verify({ ...receipt(), d: { ...receipt().d, ...patch } }, receivedAt), null, JSON.stringify(patch));
  }
  assert.equal(dyno.verify({ ...receipt(), t: 'MESSAGE_UPDATE' }, receivedAt), null);
});

test('Dyno ghi SQLite đúng assignment và chỉ hoàn thành một lần mỗi nick', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const quests = pool();
  const day = store.currentDay(checkedInAt);
  const complete = event => quests.completeFromEvent(store, 'lab', kind, event, receivedAt);
  store.recordCheckIn('lab', a, checkedInAt, [kind, 'reaction', 'community']);
  store.recordCheckIn('lab', b, checkedInAt, ['voice', 'reaction', 'community']);
  assert.equal(complete(receipt(b)), null);
  assert.equal(store.getQuests('lab', a, day).find(q => q.kind === kind).completed_at, null);
  assert.deepEqual(complete(receipt()), { userId: a, day });
  assert.equal(complete(receipt()), null);
  assert.equal(store.getQuests('lab', a, day).find(q => q.kind === kind).completed_at, resultAt.toISOString());
  assert.equal(store.getQuests('lab', b, day).some(q => q.completed_at), false);
});

test('Dyno loại lệnh gọi trước check-in và event từ ngày khác', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const quests = pool();
  store.recordCheckIn('lab', a, checkedInAt, [kind, 'reaction', 'community']);
  assert.equal(quests.completeFromEvent(store, 'lab', kind,
    receipt(a, new Date(+checkedInAt - 1)), receivedAt), null);
  assert.equal(quests.completeFromEvent(store, 'lab', kind, receipt(),
    new Date('2026-11-24T17:00:00Z')), null);
  assert.equal(quests.completeFromEvent(store, 'lab', kind,
    receipt(a, new Date('2026-11-23T16:59:59Z')), receivedAt), null);
});
