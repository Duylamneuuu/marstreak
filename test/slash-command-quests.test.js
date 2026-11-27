import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InteractionType, MessageFlags, MessageType } from 'discord.js';
import { openCheckInStore } from '../src/checkins.js';
import { createZodiacLikesQuest } from '../src/integrations/zodiac-likes.js';
import { createWheatTarotQuest } from '../src/integrations/wheat-tarot.js';
import { createLabCommandQuests } from '../src/integrations/lab-command-quests.js';
import { createMarWuyRankQuest } from '../src/integrations/marwuy-rank.js';
import { createQuestPool } from '../src/quest-pool.js';

const zodiacId = '950251264095162418';
const userA = '100000000000000001';
const userB = '100000000000000002';
const checkInAt = new Date('2026-11-24T08:00:00Z');
const observedAt = new Date(+checkInAt + 2000);
const config = { guildId: 'lab', zodiacLikesChannel: 'zodiac' };
const quest = createZodiacLikesQuest(config);

function invocation(userId, name = 'likes', offset = 1000) {
  const id = ((BigInt(+checkInAt + offset) - 1420070400000n) << 22n).toString();
  const user = { id: userId, bot: false };
  return {
    t: 'MESSAGE_CREATE',
    d: {
      id: '100000000000000003', guild_id: config.guildId, channel_id: config.zodiacLikesChannel,
      application_id: zodiacId, webhook_id: zodiacId, author: { id: zodiacId, bot: true },
      type: MessageType.ChatInputCommand, flags: MessageFlags.Loading,
      timestamp: new Date(+checkInAt + 1500).toISOString(),
      content: '', embeds: [], attachments: [],
      interaction_metadata: { name, id, type: InteractionType.ApplicationCommand, user },
      interaction: { name, id, type: InteractionType.ApplicationCommand, user },
    },
  };
}

test('Zodiac verifies the initial public /likes invocation without message content or embeds', () => {
  const packet = invocation(userA);
  const proof = { userId: userA, at: new Date(+checkInAt + 1500), startedAt: new Date(+checkInAt + 1000) };
  assert.deepEqual(quest.verify(packet, observedAt), proof);
  delete packet.d.interaction_metadata.name;
  assert.deepEqual(quest.verify(packet, observedAt), proof);
  assert.equal(quest.verify(invocation(userA, 'coinflip'), observedAt), null);
  assert.equal(quest.verify({ ...packet, t: 'MESSAGE_UPDATE' }, observedAt), null);
  for (const change of [
    { channel_id: 'wrong' }, { guild_id: 'other' }, { application_id: 'other' },
    { flags: MessageFlags.Loading | MessageFlags.Ephemeral },
    { id: '' },
    { interaction: { ...packet.d.interaction, user: { id: userB } } },
    { interaction_metadata: { ...packet.d.interaction_metadata, original_response_message_id: 'original' } },
  ]) {
    assert.equal(quest.verify({ ...packet, d: { ...packet.d, ...change } }, observedAt), null);
  }
});

test('external commands stay opt-in and match the exact command and app author', () => {
  assert.deepEqual(createLabCommandQuests({ guildId: 'lab' }), []);
  const channel = config.zodiacLikesChannel;
  const quests = createLabCommandQuests({ ...config, zodiacExtrasChannel: channel,
    wheatCoinflipChannel: channel, dynoRollChannel: channel, asterieChannel: channel });
  const byKind = new Map(quests.map(quest => [quest.kind, quest]));
  const wheatId = '786234973308715008';
  const dynoId = '161660517914509312';
  const dynoAuthor = '155149108183695360';
  const zodiacCoin = invocation(userA, 'coinflip');
  const wheatCoin = { ...zodiacCoin, d: { ...zodiacCoin.d, application_id: wheatId,
    webhook_id: wheatId, author: { id: wheatId, bot: true } } };
  for (const [kind, packet, other] of [
    ['wheat-coinflip', wheatCoin, zodiacCoin],
    ['zodiac-coinflip', zodiacCoin, wheatCoin],
    ['zodiac-compatibility', invocation(userA, 'compatibility'), zodiacCoin],
    ['zodiac-crystal', invocation(userA, 'crystal'), zodiacCoin],
  ]) {
    assert.equal(byKind.get(kind).verify(packet, observedAt).userId, userA);
    assert.equal(byKind.get(kind).verify(other, observedAt), null);
    assert.equal(byKind.get(kind).defaultEnabled, false);
  }
  const roll = invocation(userA, 'roll');
  Object.assign(roll.d, { application_id: dynoId, webhook_id: dynoId, author: { id: dynoAuthor, bot: true } });
  const dyno = byKind.get('dyno-roll');
  assert.equal(dyno.verify(roll, observedAt).userId, userA);
  assert.equal(dyno.verify({ ...roll, d: { ...roll.d, author: { id: dynoId, bot: true } } }, observedAt), null);
  const asterieId = '795063486988156958';
  for (const command of ['astrology', 'astromeme']) {
    const asterie = byKind.get('asterie-' + command);
    const response = invocation(userA, command);
    assert.equal(asterie.verify(response, observedAt), null);
    Object.assign(response.d, { application_id: asterieId, webhook_id: asterieId, author: { id: asterieId, bot: true } });
    assert.equal(asterie.verify(response, observedAt).userId, userA);
  }
  assert.equal(byKind.has('asterie-joke'), false);
});

test('Zodiac credits the assigned person once and rejects a command invoked before check-in', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const kinds = ['voice', 'reaction', quest.kind];
  const pool = createQuestPool([
    { kind: 'voice', defaultEnabled: true },
    { kind: 'reaction', defaultEnabled: true },
    quest,
  ], kinds.join(','));
  const fromEvent = packet => pool.completeFromEvent(store, config.guildId, quest.kind, packet, observedAt);
  const { day } = store.recordCheckIn(config.guildId, userA, checkInAt, kinds);
  assert.equal(fromEvent(invocation(userB)), null);
  assert.equal(fromEvent(invocation(userA, 'likes', -1)), null);
  assert.deepEqual(fromEvent(invocation(userA)), { userId: userA, day });
  assert.equal(fromEvent(invocation(userA)), null);
  assert.equal(store.getQuests(config.guildId, userA, day).filter(item => item.completed_at).length, 1);
  assert.deepEqual(store.getQuests(config.guildId, userB, day), []);
});

test('Wheat accepts /tarot from its app without needing spread and rejects the same command from another app', () => {
  const wheat = createWheatTarotQuest({ guildId: config.guildId, wheatTarotChannel: config.zodiacLikesChannel });
  const sameNameFromOtherApp = invocation(userA, 'tarot');
  const wheatId = '786234973308715008';
  const packet = {
    ...sameNameFromOtherApp,
    d: {
      ...sameNameFromOtherApp.d, application_id: wheatId, webhook_id: wheatId,
      author: { id: wheatId, bot: true },
    },
  };
  assert.equal(wheat.verify(packet, observedAt).userId, userA);
  assert.equal(wheat.verify(sameNameFromOtherApp, observedAt), null);
  assert.equal(quest.verify(packet, observedAt), null);
});

test('Wheat replay uses the call timestamp and still credits an assigned, retired quest just once', t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const wheat = createWheatTarotQuest({ guildId: config.guildId, wheatTarotChannel: config.zodiacLikesChannel });
  const packet = invocation(userA, 'tarot');
  const wheatId = '786234973308715008';
  Object.assign(packet.d, { application_id: wheatId, webhook_id: wheatId, author: { id: wheatId, bot: true } });
  const others = ['voice', 'community', 'reaction'];
  const pool = createQuestPool([...others.map(kind => ({ kind, defaultEnabled: true, eligible: () => true })), wheat]);
  const { day } = store.recordCheckIn(config.guildId, userA, checkInAt, [wheat.kind, 'voice', 'reaction']);
  const disconnectedAt = new Date(+checkInAt + 1200);
  assert.deepEqual(pool.completeFromEvent(store, config.guildId, wheat.kind, packet, observedAt, disconnectedAt), { userId: userA, day });
  assert.equal(pool.completeFromEvent(store, config.guildId, wheat.kind, packet, observedAt, disconnectedAt), null);
  const nextDay = new Date(+observedAt + 86_400_000);
  store.recordCheckIn(config.guildId, userA, nextDay, [wheat.kind, 'voice', 'reaction']);
  assert.equal(pool.completeFromEvent(store, config.guildId, wheat.kind, packet, nextDay, disconnectedAt), null);
});

const rankSource = {
  guildId: '100000000000000011', channelId: '100000000000000012',
  appId: '100000000000000013', authorId: '100000000000000014',
};

test('Mar Wuỷ Rank stays unregistered and requires a verified source and a result reader', () => {
  const dormant = createMarWuyRankQuest(rankSource);
  assert.equal(dormant.defaultEnabled, false);
  assert.equal(dormant.eligible({}), false);
  assert.equal(dormant.verify(invocation(userA, 'rank'), observedAt), null);
  assert.equal(createLabCommandQuests(config).some(q => q.kind === dormant.kind), false);
  assert.throws(() => createMarWuyRankQuest({ ...rankSource, appId: undefined }), /verified/);
});

test('Rank requires a public result for the caller and rejects loading, wrong bot and other targets', () => {
  const packet = invocation(userA, 'rank');
  Object.assign(packet.d, {
    guild_id: rankSource.guildId, channel_id: rankSource.channelId,
    application_id: rankSource.appId, webhook_id: rankSource.appId,
    author: { id: rankSource.authorId, bot: true }, flags: 0,
  });
  // Stub the future result reader. No assumptions about Mar Wuỷ's payload.
  const rank = createMarWuyRankQuest(rankSource, () => userA);
  assert.equal(rank.verify(packet, observedAt)?.userId, userA);
  for (const owner of [null, userB]) {
    assert.equal(createMarWuyRankQuest(rankSource, () => owner).verify(packet, observedAt), null);
  }
  for (const change of [
    { flags: MessageFlags.Loading }, { flags: MessageFlags.Ephemeral },
    { application_id: zodiacId }, { author: { id: zodiacId, bot: true } },
    { interaction_metadata: { ...packet.d.interaction_metadata, name: 'other' } },
    { channel_id: 'another-channel' },
  ]) {
    assert.equal(rank.verify({ ...packet, d: { ...packet.d, ...change } }, observedAt), null);
  }
});
