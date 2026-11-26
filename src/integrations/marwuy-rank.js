import { MessageFlags } from 'discord.js';
import { createSlashCommandQuest } from './slash-command-quest.js';

// Kept outside the live registry until a successful Lab response establishes
// how the source identifies the member whose rank card was returned.
export function createMarWuyRankQuest({ guildId, channelId, appId, authorId = appId }, readRankCardOwnerId) {
  for (const id of [guildId, channelId, appId, authorId]) {
    if (typeof id !== 'string' || !/^\d{17,20}$/.test(id)) {
      throw new Error('Rank requires verified guild, channel, application and bot IDs.');
    }
  }
  const commandQuest = createSlashCommandQuest({
    guildId, channelId, appId, authorId, kind: 'marwuy-rank',
    name: 'Xem hạng của mình', appName: 'Mar Wuỷ', command: 'rank',
    option: 'Để trống ô thành viên để xem hạng của bạn.',
  });
  const canReadResult = typeof readRankCardOwnerId === 'function';
  return {
    ...commandQuest,
    eligible: context => canReadResult && commandQuest.eligible(context),
    verify(packet, observedAt) {
      if (!canReadResult || !packet?.d || (packet.d.flags & MessageFlags.Loading)) return null;
      const invocation = commandQuest.verify(packet, observedAt);
      if (!invocation || readRankCardOwnerId(packet.d) !== invocation.userId) return null;
      return invocation;
    },
  };
}
