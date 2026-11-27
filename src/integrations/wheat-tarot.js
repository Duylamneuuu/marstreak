import { createSlashCommandQuest } from './slash-command-quest.js';

export function createWheatTarotQuest(config) {
  return createSlashCommandQuest({
    kind: 'wheat-tarot',
    guildId: config.guildId,
    channelId: config.wheatTarotChannel,
    appId: '786234973308715008',
    command: 'tarot',
    appName: 'Wheat',
    option: 'Có thể giữ tùy chọn mặc định.',
  });
}
