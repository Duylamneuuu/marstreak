import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from '../src/config.js';

const room = '100000000000000003';
const env = {
  DISCORD_TOKEN: 'test-only', DISCORD_APPLICATION_ID: '100000000000000001',
  DISCORD_GUILD_ID: '100000000000000002',
  LAB_QUEST_POOL: 'dyno-roll,zodiac-coinflip,asterie-astromeme',
  LAB_DYNO_ROLL_CHANNEL_ID: room, LAB_ZODIAC_QUEST_CHANNEL_ID: room, LAB_ASTERIE_QUEST_CHANNEL_ID: room,
};

test('external-only pool needs no Voice and retains valid config for disabled quests', () => {
  const config = readConfig({ ...env, LAB_WHEAT_TAROT_CHANNEL_ID: room });
  assert.deepEqual(config.voiceIds, []);
  assert.equal(config.wheatTarotChannel, room);
  assert.equal(config.asterieChannel, room);
});

test('missing enabled destination fails with its env key and disabled bad settings are ignored', () => {
  assert.throws(() => readConfig({ ...env, LAB_DYNO_ROLL_CHANNEL_ID: '' }), /LAB_DYNO_ROLL_CHANNEL_ID/);
  assert.throws(() => readConfig({ ...env, LAB_QUEST_POOL: 'wheat-tarot,wheat-coinflip,voice' }), /LAB_VOICE_CHANNEL_IDS/);
  const errors = [];
  const config = readConfig({ ...env, LAB_WHEAT_TAROT_CHANNEL_ID: 'invalid',
    LAB_VOICE_SECONDS: 'invalid', LAB_REACTION_MODE: 'target' }, message => errors.push(message));
  assert.equal(config.wheatTarotChannel, undefined);
  assert.equal(config.reactionUnavailable, true);
  assert.deepEqual(config.voiceIds, []);
  assert.equal(errors.length, 3);
});
