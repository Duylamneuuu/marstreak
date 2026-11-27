import { createSlashCommandQuest } from './slash-command-quest.js';
import { createWheatTarotQuest } from './wheat-tarot.js';
import { createZodiacLikesQuest } from './zodiac-likes.js';

const zodiacAppId = '950251264095162418';

export const commandQuestChannels = [
  ['wheatTarotChannel', 'LAB_WHEAT_TAROT_CHANNEL_ID', ['wheat-tarot']],
  ['wheatCoinflipChannel', 'LAB_WHEAT_COINFLIP_CHANNEL_ID', ['wheat-coinflip']],
  ['zodiacLikesChannel', 'LAB_ZODIAC_LIKES_CHANNEL_ID', ['zodiac-likes']],
  ['zodiacExtrasChannel', 'LAB_ZODIAC_QUEST_CHANNEL_ID', ['zodiac-compatibility', 'zodiac-crystal', 'zodiac-coinflip']],
  ['dynoRollChannel', 'LAB_DYNO_ROLL_CHANNEL_ID', ['dyno-roll']],
  ['asterieChannel', 'LAB_ASTERIE_QUEST_CHANNEL_ID', ['asterie-astrology', 'asterie-astromeme']],
];

export function createLabCommandQuests(config) {
  const quests = [];
  const { guildId } = config;
  if (config.wheatTarotChannel) quests.push(createWheatTarotQuest(config));
  if (config.zodiacLikesChannel) quests.push(createZodiacLikesQuest(config));
  if (config.zodiacExtrasChannel) {
    const source = { guildId, channelId: config.zodiacExtrasChannel, appId: zodiacAppId, appName: 'Zodiac' };
    quests.push(
      createSlashCommandQuest({ ...source, kind: 'zodiac-compatibility', command: 'compatibility', option: 'Chọn hai cung bất kỳ.' }),
      createSlashCommandQuest({ ...source, kind: 'zodiac-crystal', command: 'crystal', option: 'Nhập một câu hỏi.' }),
      createSlashCommandQuest({ ...source, kind: 'zodiac-coinflip', command: 'coinflip' }),
    );
  }
  if (config.wheatCoinflipChannel) {
    quests.push(createSlashCommandQuest({
      guildId, channelId: config.wheatCoinflipChannel, appId: '786234973308715008',
      kind: 'wheat-coinflip', command: 'coinflip',
      appName: 'Wheat',
    }));
  }
  if (config.dynoRollChannel) {
    quests.push(createSlashCommandQuest({
      guildId, channelId: config.dynoRollChannel, appId: '161660517914509312', authorId: '155149108183695360',
      kind: 'dyno-roll', command: 'roll',
      appName: 'Dyno', option: 'Chọn loại xúc xắc, ví dụ `d6`.',
    }));
  }
  if (config.asterieChannel) {
    const source = { guildId, channelId: config.asterieChannel, appId: '795063486988156958', appName: 'AsterieBot' };
    quests.push(
      createSlashCommandQuest({ ...source, kind: 'asterie-astrology', command: 'astrology', option: 'Chọn một cung.' }),
      createSlashCommandQuest({ ...source, kind: 'asterie-astromeme', command: 'astromeme' }),
    );
  }
  return quests;
}
