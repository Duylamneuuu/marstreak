import { createSlashCommandQuest } from './slash-command-quest.js';

export function createZodiacLikesQuest(config) {
  return createSlashCommandQuest({
    kind: 'zodiac-likes',
    name: 'Xem sở thích của một cung',
    guildId: config.guildId,
    channelId: config.zodiacLikesChannel,
    appId: '950251264095162418',
    command: 'likes',
    appName: 'Zodiac',
    option: 'Chọn một cung bất kỳ.',
  });
}
