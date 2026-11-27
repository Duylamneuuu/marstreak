import assert from 'node:assert/strict';
import { ChannelType } from 'discord.js';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { createQuestBotReader, createReactionTargetReader, verifyTargets } from '../src/lab-targets.js';
import { deliverQuestUpdate } from '../src/quest-notification.js';
import { trackVoice } from '../src/voice-quests.js';

const cfg = {
  threadId: 'thread', voiceIds: ['voice'],
};

function discordGuild() {
  const canRead = { has: () => true };
  const channels = {
    thread: { type: ChannelType.PublicThread, permissionsFor: () => canRead, archived: false, locked: false },
    voice: { type: ChannelType.GuildVoice, permissionsFor: () => canRead, name: 'General' },
  };
  return {
    members: { fetchMe: async () => ({}) },
    channels: { fetch: async id => channels[id] },
    targets: channels,
  };
}

test('preflight khởi động không cần tin Reaction và báo lỗi đích Voice hoặc Community', async () => {
  const guild = discordGuild();
  assert.deepEqual(await verifyTargets(guild, cfg), ['General']);
  const voicePermissions = guild.targets.voice.permissionsFor;
  guild.targets.voice.permissionsFor = () => ({ has: () => false });
  await assert.rejects(verifyTargets(guild, cfg), /LAB_VOICE_CHANNEL_IDS/);
  guild.targets.voice.permissionsFor = voicePermissions;

  guild.targets.thread.archived = true;
  await assert.rejects(verifyTargets(guild, cfg), /Thread Community cần mở/);
  assert.deepEqual(await verifyTargets(guild, { ...cfg, questKinds: 'voice,reaction,wheat-tarot' }), ['General']);
  await assert.rejects(verifyTargets(guild, { ...cfg, threadId: undefined }), /LAB_COMMUNITY_THREAD_ID/);

  guild.targets.thread.archived = false;
  guild.channels.fetch = async () => { throw new DOMException('Discord API timed out', 'TimeoutError'); };
  await assert.rejects(verifyTargets(guild, cfg), /LAB_COMMUNITY_THREAD_ID/);
});

test('DM bị Discord từ chối hoặc timeout không thay đổi quest đã ghi', async t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const when = new Date('2026-11-21T04:00:00Z');
  const day = store.currentDay(when);
  store.recordCheckIn('lab', 'user', when, ['reaction', 'community', 'voice']);
  assert.equal(store.completeQuest('lab', 'user', day, 'reaction', when), true);
  const errors = [];
  for (const fault of [
    Object.assign(new Error('Cannot send messages to this user'), { code: 50007 }),
    new DOMException('Request timed out', 'TimeoutError'),
  ]) {
    await deliverQuestUpdate({ send: async () => { throw fault; } }, 'user', 'Done', error => errors.push(error));
  }
  assert.equal(errors.length, 2);
  assert.equal(errors[0].code, 50007);
  assert.equal(errors[1].name, 'TimeoutError');
  assert.equal(store.getQuests('lab', 'user', day).find(q => q.kind === 'reaction').completed_at, when.toISOString());
  assert.equal(store.completeQuest('lab', 'user', day, 'reaction', when), false);
});

test('DM đợi lượt trước, lỗi gửi không chặn lượt sau hay người khác', async () => {
  const { createNotificationQueue } = await import('../src/quest-notification.js');
  const enqueue = createNotificationQueue();
  const order = [];
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const first = enqueue('a', async () => { await waiting; order.push(1); throw new Error('DM'); });
  const second = enqueue('a', () => order.push(2));
  await enqueue('b', () => order.push('b'));
  release();
  await assert.rejects(first, /DM/);
  await second;
  assert.deepEqual(order, ['b', 1, 2]);
});

test('preflight ignores deleted Voice and Wheat destinations when those quests are disabled', async () => {
  const guild = discordGuild();
  const visited = [];
  guild.channels.fetch = async id => {
    visited.push(id);
    return guild.targets[id];
  };
  await verifyTargets(guild, { ...cfg, questKinds: 'community,reaction,poll',
    voiceIds: ['deleted-room'], wheatTarotChannel: 'deleted-wheat-channel' });
  assert.deepEqual(visited, ['thread']);
});

test('fetches the exact reaction message without cache and retries after a deletion or failure', async () => {
  const post = { reactions: { cache: new Map() } };
  const read = createReactionTargetReader({ messageId: 'target' });
  let requests = 0;
  const room = { messages: { fetch: async options => {
    assert.deepEqual(options, { message: 'target', force: true, cache: false });
    if (++requests === 2) throw new Error('Unknown Message');
    return post;
  } } };
  assert.deepEqual(await Promise.all([read(room), read(room)]), [post, post]);
  assert.equal(requests, 1);
  assert.equal(await read(room), null);
  assert.equal(await read(room), post);
});

test('source bot lookup refreshes Discord roles and does not reuse a departed member', async () => {
  const bot = { user: { bot: true } };
  let calls = 0;
  const guild = { members: { fetch: async options => {
    assert.deepEqual(options, { user: 'source', force: true });
    if (++calls === 2) throw new Error('Unknown Member');
    return bot;
  } } };
  const read = createQuestBotReader(['source']);
  const [a, b] = await Promise.all([read(guild), read(guild)]);
  assert.equal(a.get('source'), bot);
  assert.equal(b, a);
  assert.equal((await read(guild)).get('source'), null);
});

test('failed SQLite checkpoint on Voice leave cannot carry that session into a later tick', () => {
  const intervals = [];
  const store = {
    currentDay: () => 'today',
    addVoiceTime: () => { throw new Error('SQLite unavailable'); },
    addVoiceBatch: (_guild, _day, entries) => { intervals.push(...entries); return []; },
  };
  const voice = trackVoice(store, 'lab', () => assert.fail('Unexpected credit'), 10_000);
  voice.update('a', true, 0);
  assert.throws(() => voice.update('a', false, 4_000), /SQLite/);
  voice.tick(10_000);
  assert.deepEqual(intervals, []);
  voice.update('a', true, 11_000);
  voice.tick(13_000);
  assert.deepEqual(intervals, [{ userId: 'a', elapsed: 2_000 }]);
});
