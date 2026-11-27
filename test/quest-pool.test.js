import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChannelType, MessageType, PermissionFlagsBits as Permissions } from 'discord.js';
import { openCheckInStore } from '../src/checkins.js';
import { createNativeQuests } from '../src/native-quests.js';
import { createLabCommandQuests } from '../src/integrations/lab-command-quests.js';
import { createQuestPool } from '../src/quest-pool.js';

const at = new Date('2026-11-23T06:00:00Z');
const config = {
  guildId: 'lab', voiceIds: ['voice-room'], voiceSeconds: 120,
  threadId: 'thread',
};

function nativePool() {
  return createQuestPool(createNativeQuests(config, () => ['General']));
}

function targets() {
  function channel(type, ...flags) {
    return {
      type, permissionsFor: member => ({
        has: requested => [requested].flat().every(flag => flags.includes(flag) && !member.denied.has(flag)),
      }),
    };
  }
  const thread = channel(ChannelType.PublicThread, Permissions.ViewChannel, Permissions.SendMessagesInThreads);
  return new Map([
    ['voice-room', channel(ChannelType.GuildVoice, Permissions.ViewChannel, Permissions.Connect)],
    ['thread', thread],
    ['sample', channel(ChannelType.GuildText, Permissions.ViewChannel, Permissions.ReadMessageHistory, Permissions.AddReactions)],
  ]);
}

function reaction(userId) {
  return {
    t: 'MESSAGE_REACTION_ADD',
    d: {
      guild_id: 'lab', channel_id: 'text', message_id: 'post', emoji: { name: '⭐' },
      user_id: userId, member: { user: { id: userId, bot: false } },
    },
  };
}

function post(userId, createdTimestamp = Number(at)) {
  return {
    guildId: 'lab', channelId: 'thread', type: MessageType.Default,
    author: { id: userId, bot: false }, channel: { archived: false, locked: false }, createdTimestamp,
  };
}

test('pool mặc định bật đúng ba quest native, từ chối tên chưa đăng ký và cấu hình lặp', () => {
  const definitions = createNativeQuests(config, () => []);
  const context = { channels: targets(), botMember: { denied: new Set() }, member: { denied: new Set() } };
  assert.deepEqual(createQuestPool(definitions).eligibleKinds(context), ['voice', 'reaction', 'community']);
  assert.throws(() => createQuestPool(definitions, 'voice,community,tarot'), /chưa đăng ký/);
  assert.throws(() => createQuestPool(definitions, 'voice,community,voice'), /trùng/);
  assert.throws(() => createQuestPool(definitions, 'voice,community'), /ít nhất 3/);
});

test('lọc theo quyền thật của thành viên và đích còn dùng được trước khi giao', () => {
  const pool = nativePool();
  const channels = targets();
  const context = { channels, botMember: { denied: new Set() }, member: { denied: new Set([Permissions.Connect]) } };
  assert.deepEqual(pool.eligibleKinds(context), ['reaction', 'community']);
  channels.get('thread').archived = true;
  assert.deepEqual(pool.eligibleKinds(context), ['reaction']);
});

test('có thể bật lại Reaction để chỉ tính đúng tin và emoji cấu hình', () => {
  const definitions = createNativeQuests({ ...config, reactionTarget: { channelId: 'text', messageId: 'post', emoji: '⭐' } }, () => []);
  const target = definitions.find(quest => quest.kind === 'reaction');
  const packet = reaction('a');
  assert.deepEqual(target.verify(packet, at), { userId: 'a', at });
  for (const change of [{ channel_id: 'other' }, { message_id: 'other' }, { emoji: { name: '❤️' } }]) {
    assert.equal(target.verify({ ...packet, d: { ...packet.d, ...change } }, at), null);
  }
  assert.match(target.instruction(), /⭐.*channels\/lab\/text\/post/);
});

test('pool Lab có 11 quest, giao đúng ba loại và giữ lượt cũ khi cất Community', t => {
  const settings = { ...config, dynoRollChannel: 'text', zodiacLikesChannel: 'text', wheatTarotChannel: 'text',
    zodiacExtrasChannel: 'text', wheatCoinflipChannel: 'text', asterieChannel: 'text' };
  const external = createLabCommandQuests(settings);
  const definitions = [...createNativeQuests(settings, () => ['General']), ...external];
  const enabled = ['voice', 'reaction', ...external.map(quest => quest.kind)];
  const pool = createQuestPool(definitions, enabled.join(','));
  const channels = targets();
  channels.set('text', { type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }) });
  const sourceBots = new Map(external.map(quest => [quest.sourceBotId, { denied: new Set() }]));
  assert.equal(external[0].eligible({ channels, member: {} }), false);
  const eligible = pool.eligibleKinds({ channels, sourceBots, botMember: { denied: new Set() }, member: { denied: new Set() } });
  assert.equal(external.length, 9);
  assert.equal(eligible.length, 11);
  assert.deepEqual(eligible, enabled);
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  store.recordCheckIn('lab', 'returning', at, ['voice', 'reaction', 'community']);
  const { day, quests } = store.recordCheckIn('lab', 'new', at, eligible);
  assert.equal(new Set(quests.map(quest => quest.kind)).size, 3);
  assert.ok(quests.every(quest => enabled.includes(quest.kind)));
  assert.deepEqual(store.recordCheckIn('lab', 'new', at, eligible).quests, quests);
  assert.ok(store.recordCheckIn('lab', 'returning', at, eligible).quests.some(quest => quest.kind === 'community'));
  assert.deepEqual(pool.completeFromEvent(store, 'lab', 'community', post('returning'), at), { userId: 'returning', day });
});

test('check-in đang có giữ assignment, kể cả khi quyền thử quest thay đổi', t => {
  const pool = nativePool();
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const allowed = { channels: targets(), botMember: { denied: new Set() }, member: { denied: new Set() } };
  const blocked = { ...allowed, botMember: { denied: new Set() }, member: { denied: new Set([Permissions.Connect]) } };
  const first = store.recordCheckIn('lab', 'a', at, pool.eligibleKinds(allowed));
  assert.deepEqual(store.recordCheckIn('lab', 'a', at, pool.eligibleKinds(blocked)).quests, first.quests);
  assert.deepEqual(store.recordCheckIn('lab', 'b', at, pool.eligibleKinds(blocked)).quests, []);
  assert.equal(store.recordCheckIn('lab', 'b', at, pool.eligibleKinds(allowed)).created, false);
});

test('Reaction nhận emoji mới từ bất kỳ kênh nào trong guild và ghi một lần cho đúng người', t => {
  const pool = nativePool();
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const day = store.currentDay(at);
  store.recordCheckIn('lab', 'a', at, ['voice', 'reaction', 'community']);
  const complete = (event, now = at) => pool.completeFromEvent(store, 'lab', 'reaction', event, now);
  const original = reaction('a');
  const otherChannel = { ...original, d: { ...original.d, channel_id: 'thread', message_id: 'any', emoji: { name: '❤️' } } };
  assert.equal(complete(original, new Date(+at - 1)), null);
  assert.equal(complete(reaction('b')), null);
  assert.equal(complete({ ...original, t: 'MESSAGE_REACTION_REMOVE' }), null);
  for (const change of [
    { guild_id: 'other-guild' }, { guild_id: undefined }, { user_id: 'b' },
    { member: { user: { id: 'a', bot: true } } },
  ]) {
    assert.equal(complete({ ...original, d: { ...original.d, ...change } }), null);
  }
  assert.deepEqual(complete(otherChannel), { userId: 'a', day });
  assert.equal(complete(original, new Date(+at + 1000)), null);
  assert.equal(store.getQuests('lab', 'a', day).find(q => q.kind === 'reaction').completed_at, at.toISOString());
  assert.deepEqual(store.getQuests('lab', 'b', day), []);
  store.recordCheckIn('lab', 'b', at, ['voice', 'reaction', 'community']);
  const customEmoji = reaction('b');
  customEmoji.d.emoji = { id: 'custom', name: 'custom' };
  assert.deepEqual(complete(customEmoji), { userId: 'b', day });
});

test('Community chỉ ghi đúng người, thread và thời điểm', t => {
  const pool = nativePool();
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const day = store.currentDay(at);
  store.recordCheckIn('lab', 'a', at, ['voice', 'reaction', 'community']);
  const complete = (kind, event, now = at) => pool.completeFromEvent(store, 'lab', kind, event, now);
  assert.equal(complete('community', { ...post('a'), webhookId: 'webhook' }), null);
  assert.equal(complete('community', { ...post('a'), channelId: 'wrong' }), null);
  assert.equal(complete('community', { ...post('a'), author: { id: 'a', bot: true } }), null);
  assert.equal(complete('community', post('a', Number(at) - 1)), null);
  assert.equal(complete('community', post('a'), new Date('2026-11-23T17:00:00Z')), null);
  assert.deepEqual(complete('community', post('a')), { userId: 'a', day });
  assert.equal(complete('community', post('a')), null);
  assert.equal(store.getQuests('lab', 'a', day).filter(q => q.completed_at).length, 1);
  assert.deepEqual(store.getQuests('lab', 'b', day), []);
});

test('gỡ một quest khỏi giao mới vẫn cho phép xử lý assignment đang mở', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const definitions = createNativeQuests(config, () => []);
  const pool = createQuestPool([
    ...definitions, { kind: 'fixture', eligible: () => true },
  ], 'voice,community,fixture');
  const context = { channels: targets(), botMember: { denied: new Set() }, member: { denied: new Set() } };
  assert.deepEqual(pool.eligibleKinds(context), ['voice', 'community', 'fixture']);
  store.recordCheckIn('lab', 'a', at, ['voice', 'reaction', 'community']);
  assert.equal(pool.completeFromEvent(store, 'lab', 'reaction', reaction('a'), at).userId, 'a');
  const newCheckin = store.recordCheckIn('lab', 'b', at, pool.eligibleKinds(context));
  assert.equal(newCheckin.quests.some(q => q.kind === 'reaction'), false);
  assert.equal(pool.completeFromEvent(store, 'lab', 'reaction', reaction('b'), at), null);
});

test('Reaction chỉ gợi ý phòng cả thành viên và bot cùng nhìn thấy', () => {
  const quest = nativePool();
  const context = { channels: targets(), member: { denied: new Set() }, botMember: { denied: new Set() } };
  assert.match(quest.instruction({kind:'reaction'}, context), /<#sample>/);
  context.botMember.denied.add(Permissions.ViewChannel);
  assert.ok(!quest.eligibleKinds(context).includes('reaction'));
  assert.ok(!quest.eligibleKinds({...context, channels:new Map()}).includes('reaction'));
});

test('only offers targeted Reaction while both people can see the fetched message', () => {
  const channelId = 'sample';
  const target = { channelId, messageId: 'post', emoji: '⭐' };
  const pool = createQuestPool(createNativeQuests({ ...config, reactionTarget: target }));
  const botMember = { denied: new Set() };
  const context = { channels: targets(), member: { denied: new Set() }, botMember };
  assert.deepEqual(pool.eligibleKinds(context), ['voice', 'community']);
  context.reactionMessage = { id: target.messageId, reactions: { cache: new Map() } };
  assert.deepEqual(pool.eligibleKinds(context), ['voice', 'reaction', 'community']);
  botMember.denied.add(Permissions.ViewChannel);
  assert.deepEqual(pool.eligibleKinds(context), []);
});

test('a replayed reaction can finish an existing quest but cannot satisfy a later assignment or day', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const pool = nativePool();
  const kinds = ['voice', 'reaction', 'community'];
  const outage = new Date(+at + 10);
  const receivedAt = new Date(+at + 20);
  const day = store.currentDay(at);
  store.recordCheckIn('lab', 'a', at, kinds);
  store.recordCheckIn('lab', 'b', at, []);
  store.questsAfterCheckIn('lab', 'b', new Date(+outage + 1), kinds);
  assert.equal(pool.completeFromEvent(store, 'lab', 'reaction', reaction('b'), receivedAt, outage), null);
  assert.deepEqual(pool.completeFromEvent(store, 'lab', 'reaction', reaction('a'), receivedAt, outage), { userId: 'a', day });
  assert.equal(pool.completeFromEvent(store, 'lab', 'reaction', reaction('a'), receivedAt, outage), null);
  const tomorrow = new Date('2026-11-24T06:00:00Z');
  store.recordCheckIn('lab', 'a', tomorrow, kinds);
  assert.equal(pool.completeFromEvent(store, 'lab', 'reaction', reaction('a'), tomorrow, outage), null);
});
