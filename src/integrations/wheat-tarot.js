import { createSlashCommandQuest } from './slash-command-quest.js';

export function createWheatTarotQuest(config) {
  return createSlashCommandQuest({
    kind: 'wheat-tarot',
    name: 'Tarot cùng Wheat',
    guildId: config.guildId,
    channelId: config.wheatTarotChannel,
    appId: '786234973308715008',
    command: 'tarot',
    appName: 'Wheat',
  });
}
