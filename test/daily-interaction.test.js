import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { createDailyInteractionHandler } from '../src/daily-interaction.js';
import { questRefreshId } from '../src/quest-reply.js';

const before = Date.parse('2026-11-27T23:59:59+07:00');
const after = before + 2000;
const kinds = ['voice', 'reaction', 'community'];

function setup(t, now = before, resetTime = '00:00') {
  t.mock.timers.enable({ apis: ['Date'], now });
  const store = openCheckInStore(':memory:', resetTime);
  t.after(() => store.close());
  const options = {
    config: { guildId: 'lab', resetTime, voiceSeconds: 120 }, store,
    pool: { eligibleKinds: () => kinds, instruction: q => q.kind },
    voice: { checkpoint() {} }, isOnline: () => true,
    commandMention: name => '/' + name, readSourceBots: async () => new Map(),
  };
  function invoke(command, stamp, overrides = {}) {
    const replies = [];
    const guild = { channels: { cache: new Map() }, members: { me: {} } };
    const interaction = {
      guildId: 'lab', guild, user: { id: 'member' }, member: {}, createdTimestamp: stamp,
      commandName: command, isButton: () => command === 'refresh', customId: questRefreshId,
      isChatInputCommand: () => command !== 'refresh', inCachedGuild: () => true,
      deferReply: async () => {}, editReply: async reply => replies.push(reply),
      followUp: async reply => replies.push(reply), ...overrides,
    };
    return createDailyInteractionHandler(options)(interaction).then(() => replies);
  }
  return { store, options, invoke };
}

test('23:59:59 check-in survives a target lookup ending at 00:00:01; repeats and the next day stay separate', async t => {
  const { store, options, invoke } = setup(t);
  store.recordCheckIn('lab', 'member', new Date(before - 86400000));
  let lookups = 0;
  options.readSourceBots = async () => {
    lookups++;
    t.mock.timers.setTime(after);
    return new Map();
  };
  for (let i = 0; i < 2; i++) {
    const replies = await invoke('checkin', before);
    assert.equal(replies.length, 1);
    assert.match(replies[0], /27\/11\/2026.*2 ngày.*\/checkin/u);
  }
  assert.equal(lookups, 1);
  assert.deepEqual(store.getQuests('lab', 'member', '2026-11-27'), []);
  assert.equal(store.questsAfterCheckIn('lab', 'member', new Date(after), []), null);
  const [card, board] = await invoke('checkin', after);
  assert.match(card.embeds[0].data.fields[0].value, /3 ngày/);
  assert.equal(card.embeds[0].data.footer.text, 'Ngày điểm danh · 28/11/2026');
  assert.match(board.embeds[0].data.description, /0\/3/);
  const list = store.getQuests('lab', 'member', '2026-11-28');
  assert.equal(list.length, 3);
  assert.equal(store.completeQuest('lab', 'member', '2026-11-28', 'reaction', new Date(after), new Date(before)), false);
  assert.equal(store.completeQuest('lab', 'member', '2026-11-27', 'reaction', new Date(after)), false);
  const [duplicate] = await invoke('checkin', after);
  assert.match(duplicate.embeds[0].data.title, /điểm danh rùi/);
  assert.deepEqual(store.getQuests('lab', 'member', '2026-11-28'), list);
});

test('a slow acknowledgement and a concurrent new-day command use the configured 04:30 reset', async t => {
  const stamp = Date.parse('2026-11-28T04:29:59+07:00');
  const { store, invoke } = setup(t, stamp, '04:30');
  store.recordCheckIn('lab', 'member', new Date(stamp - 86400000));
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const delayed = invoke('checkin', stamp, { deferReply: () => wait });
  t.mock.timers.setTime(stamp + 2000);
  const [card] = await invoke('checkin', stamp + 2000);
  assert.match(card.embeds[0].data.fields[0].value, /3 ngày/);
  release();
  assert.match((await delayed)[0], /27\/11\/2026.*2 ngày/);
  assert.deepEqual(store.getQuests('lab', 'member', '2026-11-27'), []);
});

test('stale /quests and refresh cannot assign either day, even when both days have check-ins', async t => {
  const { store, options, invoke } = setup(t);
  store.recordCheckIn('lab', 'member', new Date(before));
  store.recordCheckIn('lab', 'member', new Date(after));
  options.readSourceBots = async () => { t.mock.timers.setTime(after); };
  for (const cmd of ['quests', 'refresh']) {
    t.mock.timers.setTime(before);
    assert.match((await invoke(cmd, before))[0], /sang ngày mới.*\/checkin/i);
  }
  for (const day of ['2026-11-27', '2026-11-28']) assert.deepEqual(store.getQuests('lab', 'member', day), []);
});

test('the assignment transaction checks the grant day after acquiring the SQLite write lock', t => {
  const { store } = setup(t);
  store.recordCheckIn('lab', 'member', new Date(before));
  assert.equal(store.questsAfterCheckIn('lab', 'member', new Date(before), kinds, () => new Date(after)), null);
  assert.deepEqual(store.getQuests('lab', 'member', '2026-11-27'), []);
});

test('same-day target lookup delay does not backdate eligibility or roll back attendance on lookup failure', async t => {
  const start = before - 10000;
  const { store, options, invoke } = setup(t, start);
  options.readSourceBots = async () => { throw new Error('lookup failed'); };
  await assert.rejects(invoke('checkin', start), /lookup failed/);
  assert.deepEqual(store.questsAfterCheckIn('lab', 'member', new Date(start), []), []);
  options.readSourceBots = async () => { t.mock.timers.setTime(before); };
  const [board] = await invoke('quests', start);
  assert.match(board.embeds[0].data.description, /0\/3/);
  assert.equal(store.completeQuest('lab', 'member', '2026-11-27', 'community', new Date(before), new Date(start)), false);
  assert.equal(store.completeQuest('lab', 'member', '2026-11-27', 'community', new Date(before)), true);
});
