import assert from 'node:assert/strict';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';
import { verifyTargets } from '../src/lab-targets.js';
import { deliverQuestUpdate } from '../src/quest-notification.js';

const cfg = {
  reactionChannel: 'text', reactionMessage: 'message', reactionEmoji: '⭐',
  threadId: 'thread', voiceIds: ['voice'],
};

function discordGuild() {
  const canRead = { has: () => true };
  const channels = {
    text: {
      type: ChannelType.GuildText,
      permissionsFor: () => canRead,
      messages: { fetch: async () => ({ id: 'message' }) },
    },
    thread: { type: ChannelType.PublicThread, permissionsFor: () => canRead, archived: false, locked: false },
    voice: { type: ChannelType.GuildVoice, permissionsFor: () => canRead, name: 'General' },
  };
  return {
    members: { fetchMe: async () => ({}) },
    channels: { fetch: async id => channels[id] },
    targets: channels,
  };
}

test('preflight kiểm quyền đọc tin, tài nguyên bị xóa, thread đóng và API timeout', async () => {
  const guild = discordGuild();
  assert.deepEqual(await verifyTargets(guild, cfg), ['General']);
  guild.targets.text.permissionsFor = () => ({
    has: flags => !flags.includes(PermissionFlagsBits.ReadMessageHistory),
  });
  await assert.rejects(verifyTargets(guild, cfg), /LAB_REACTION_CHANNEL_ID/);

  guild.targets.text.permissionsFor = () => ({ has: () => true });
  const fetch = guild.targets.text.messages.fetch;
  guild.targets.text.messages.fetch = async () => { throw Object.assign(new Error('Unknown Message'), { code: 10008 }); };
  await assert.rejects(verifyTargets(guild, cfg), /LAB_REACTION_MESSAGE_ID/);

  guild.targets.text.messages.fetch = fetch;
  guild.targets.thread.archived = true;
  await assert.rejects(verifyTargets(guild, cfg), /Thread Community cần mở/);

  guild.targets.thread.archived = false;
  guild.channels.fetch = async () => { throw new DOMException('Discord API timed out', 'TimeoutError'); };
  await assert.rejects(verifyTargets(guild, cfg), /LAB_REACTION_CHANNEL_ID/);
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
