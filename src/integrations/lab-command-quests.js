import { createSlashCommandQuest } from './slash-command-quest.js';
import { createWheatTarotQuest } from './wheat-tarot.js';
import { createZodiacLikesQuest } from './zodiac-likes.js';

const zodiacAppId = '950251264095162418';

export function createLabCommandQuests(config) {
  const quests = [];
  const { guildId } = config;
  if (config.wheatTarotChannel) quests.push(createWheatTarotQuest(config));
  if (config.zodiacLikesChannel) quests.push(createZodiacLikesQuest(config));
  if (config.zodiacExtrasChannel) {
    const source = { guildId, channelId: config.zodiacExtrasChannel, appId: zodiacAppId, appName: 'Zodiac' };
    quests.push(
      createSlashCommandQuest({ ...source, kind: 'zodiac-compatibility', command: 'compatibility',
        name: 'So độ hợp hai cung', option: 'Chọn hai cung bất kỳ.' }),
      createSlashCommandQuest({ ...source, kind: 'zodiac-crystal', command: 'crystal',
        name: 'Hỏi quả cầu pha lê', option: 'Nhập một câu hỏi.' }),
      createSlashCommandQuest({ ...source, kind: 'zodiac-coinflip', command: 'coinflip',
        name: 'Tung xu cùng Zodiac' }),
    );
  }
  if (config.wheatCoinflipChannel) {
    quests.push(createSlashCommandQuest({
      guildId, channelId: config.wheatCoinflipChannel, appId: '786234973308715008',
      kind: 'wheat-coinflip', command: 'coinflip', name: 'Tung xu cùng Wheat',
      appName: 'Wheat',
    }));
  }
  if (config.dynoRollChannel) {
    quests.push(createSlashCommandQuest({
      guildId, channelId: config.dynoRollChannel, appId: '161660517914509312', authorId: '155149108183695360',
      kind: 'dyno-roll', command: 'roll', name: 'Tung xúc xắc cùng Dyno',
      appName: 'Dyno', option: 'Chọn loại xúc xắc, ví dụ `d6`.',
    }));
  }
  if (config.asterieChannel) {
    const source = { guildId, channelId: config.asterieChannel, appId: '795063486988156958', appName: 'AsterieBot' };
    quests.push(
      createSlashCommandQuest({ ...source, kind: 'asterie-astrology', command: 'astrology',
        name: 'Xem tử vi cùng Asterie', option: 'Chọn một cung.' }),
      createSlashCommandQuest({ ...source, kind: 'asterie-astromeme', command: 'astromeme',
        name: 'Xem meme cung hoàng đạo' }),
    );
  }
  return quests;
}
