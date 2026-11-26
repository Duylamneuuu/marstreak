import assert from 'node:assert/strict';
import { ChannelType } from 'discord.js';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { verifyTargets } from '../src/lab-targets.js';
import { deliverQuestUpdate } from '../src/quest-notification.js';

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
