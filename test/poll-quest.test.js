import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { openCheckInStore } from '../src/checkins.js';
import { createQuestPool } from '../src/quest-pool.js';
import { createPollQuest, readPollTarget } from '../src/poll-quest.js';
import { verifyTargets } from '../src/lab-targets.js';

const guild = '100000000000000001';
const channel = '100000000000000002';
const message = '100000000000000003';
const a = '100000000000000004';
const b = '100000000000000005';
const url = `https://discord.com/channels/${guild}/${channel}/${message}`;
const cutoff = '2026-11-27T00:00:00+07:00';
const target = readPollTarget(guild, url, cutoff, 'voice,reaction,poll');
const checkIn = new Date('2026-11-26T04:00:00Z');
const after = new Date('2026-11-26T04:01:00Z');
const otherKinds = ['voice', 'reaction', 'community'];
const otherQuests = otherKinds.map(kind => ({ kind, defaultEnabled: true, eligible: () => true }));

test('Poll nằm ngoài danh sách mặc định và chỉ giao trước hạn, cho người mở được kênh', () => {
  assert.equal(readPollTarget(guild, '', '', 'voice,reaction,community'), undefined);
  assert.throws(() => readPollTarget(guild, '', '', 'voice,reaction,poll'), /LAB_POLL_MESSAGE_URL/);
  assert.throws(() => readPollTarget('100000000000000009', url, cutoff, 'poll'), /đúng server Discord/);
  assert.throws(() => readPollTarget(guild, url, '2026-11-26T23:59:00', 'poll'), /LAB_POLL_CLOSES_AT/);
  const quest = createPollQuest(target);
  const room = { type: ChannelType.GuildText, permissionsFor: () => ({
    has: flags => flags.includes(PermissionFlagsBits.ViewChannel) && flags.includes(PermissionFlagsBits.ReadMessageHistory),
  }) };
  const context = { channels: new Map([[channel, room]]), member: {}, botMember: {}, at: checkIn };
  const definitions = [...otherQuests, quest];
  assert.deepEqual(createQuestPool(definitions).eligibleKinds(context), otherKinds);
  const enabled = createQuestPool(definitions, 'voice,reaction,community,poll');
  assert.ok(enabled.eligibleKinds(context).includes('poll'));
  assert.equal(createPollQuest(target, '05:30').eligible(context), false);
  assert.match(enabled.instruction({ kind: 'poll' }, context), new RegExp(`<${url}>`));
  assert.ok(!enabled.eligibleKinds({ ...context, member: undefined }).includes('poll'));
  assert.ok(!enabled.eligibleKinds({ ...context, at: new Date(cutoff) }).includes('poll'));
  assert.match(enabled.instruction({ kind: 'poll' }, { at: new Date(cutoff) }), /đã đóng/);
});

test('Poll chỉ ghi một lần cho đúng người nhận nhiệm vụ, đúng tin và đúng ngày', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const pool = createQuestPool([...otherQuests, createPollQuest(target)]);
  const day = store.currentDay(checkIn);
  const vote = (user = a, overrides = {}, event = 'MESSAGE_POLL_VOTE_ADD', at = after) =>
    pool.completeFromEvent(store, guild, 'poll', {
      t: event, d: { guild_id: guild, channel_id: channel, message_id: message, user_id: user, answer_id: 1, ...overrides },
    }, at);
  assert.equal(vote(), null);
  store.recordCheckIn(guild, a, checkIn, ['voice', 'reaction', 'poll']);
  store.recordCheckIn(guild, b, checkIn, otherKinds);
  assert.equal(vote(a, {}, 'MESSAGE_POLL_VOTE_ADD', new Date(+checkIn - 1)), null);
  assert.equal(vote(b), null);
  assert.equal(vote(a, { guild_id: b }), null);
  assert.equal(vote(a, { channel_id: b }), null);
  assert.equal(vote(a, { message_id: b }), null);
  assert.equal(vote(a, { answer_id: 0 }), null);
  assert.equal(vote(a, {}, 'MESSAGE_POLL_VOTE_REMOVE'), null);
  assert.equal(vote(a, {}, 'MESSAGE_POLL_VOTE_ADD', new Date(cutoff)), null);
  assert.deepEqual(vote(a), { userId: a, day });
  assert.equal(vote(a, { answer_id: 2 }), null);
  assert.equal(vote(a, {}, 'MESSAGE_POLL_VOTE_REMOVE'), null);
  assert.equal(store.getQuests(guild, a, day).filter(q => q.completed_at).length, 1);
  assert.equal(store.getQuests(guild, b, day).filter(q => q.completed_at).length, 0);
});

test('preflight đọc tin Poll khi bật và vẫn cho phép Discord ẩn dữ liệu Poll', async () => {
  const armed = { ...target, deadline: Date.now() + 10 * 60 * 1000 };
  const cfg = { voiceIds: [], pollTarget: armed, questKinds: 'voice,reaction,poll' };
  const view = { has: () => true };
  let reply = { poll: null };
  let seen;
  const room = {
    type: ChannelType.GuildText,
    permissionsFor: () => view,
    messages: { fetch: async args => { seen = args.message; return reply; } },
  };
  const lab = { members: { fetchMe: async () => ({}) }, channels: { fetch: async () => room } };
  await verifyTargets(lab, cfg);
  assert.equal(seen, message);
  reply = { poll: { expiresTimestamp: armed.deadline - 1 } };
  await assert.rejects(verifyTargets(lab, cfg), /LAB_POLL_CLOSES_AT/);
  seen = undefined;
  await verifyTargets(lab, { ...cfg, questKinds: 'voice,reaction,wheat-tarot' });
  assert.equal(seen, undefined);
});
