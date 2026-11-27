import { resolve } from 'node:path';
import { parseResetTime } from './checkins.js';
import { voiceThresholdMs } from './voice-quests.js';
import { enabledQuestKinds } from './quest-pool.js';
import { readPollTarget } from './poll-quest.js';
import { commandQuestChannels } from './integrations/lab-command-quests.js';

const snowflake = /^\d{17,20}$/;

export function readConfig(env = process.env, warn = console.warn) {
  const token = env.DISCORD_TOKEN?.trim();
  const appId = env.DISCORD_APPLICATION_ID?.trim();
  const guildId = env.DISCORD_GUILD_ID?.trim();
  const resetTime = env.CHECKIN_RESET_TIME ?? '00:00';
  const completionDm = env.QUEST_COMPLETION_DM?.trim().toLowerCase() || 'false';
  const questKinds = env.LAB_QUEST_POOL;
  const enabled = enabledQuestKinds(questKinds);
  if (!token) throw new Error('Điền DISCORD_TOKEN trong .env.');
  if (!snowflake.test(appId ?? '')) throw new Error('DISCORD_APPLICATION_ID không hợp lệ.');
  if (!snowflake.test(guildId ?? '')) throw new Error('DISCORD_GUILD_ID không hợp lệ.');
  if (completionDm !== 'true' && completionDm !== 'false') {
    throw new Error('QUEST_COMPLETION_DM cần là true hoặc false.');
  }
  parseResetTime(resetTime);

  function id(key) {
    const value = env[key]?.trim();
    if (!snowflake.test(value ?? '')) throw new Error('Điền ID hợp lệ trong ' + key + '.');
    return value;
  }

  function questSetting(kinds, read, fallback) {
    const required = kinds.some(kind => enabled.includes(kind));
    try {
      return read(required);
    } catch (error) {
      if (required) throw error;
      warn('Bỏ qua cấu hình của nhiệm vụ đã tắt. ' + error.message);
      return fallback;
    }
  }

  const voice = questSetting(['voice'], required => {
    const voiceIds = [...new Set((env.LAB_VOICE_CHANNEL_IDS?.trim() || '')
      .split(',').map(value => value.trim()).filter(Boolean))];
    if ((required && !voiceIds.length) || !voiceIds.every(value => snowflake.test(value))) {
      throw new Error('Điền ID phòng Voice hợp lệ trong LAB_VOICE_CHANNEL_IDS.');
    }
    const voiceSeconds = Number(env.LAB_VOICE_SECONDS?.trim() || voiceThresholdMs / 1000);
    if (!Number.isInteger(voiceSeconds) || voiceSeconds < 1 || voiceSeconds > 86400) {
      throw new Error('LAB_VOICE_SECONDS cần là số nguyên từ 1 đến 86400.');
    }
    return { voiceIds, voiceSeconds };
  }, { voiceIds: [], voiceSeconds: voiceThresholdMs / 1000 });

  const reaction = questSetting(['reaction'], () => {
    const targetKeys = ['LAB_REACTION_CHANNEL_ID', 'LAB_REACTION_MESSAGE_ID', 'LAB_REACTION_EMOJI'];
    const mode = env.LAB_REACTION_MODE?.trim() || (targetKeys.every(key => env[key]?.trim()) ? 'target' : 'any');
    if (!['any', 'target'].includes(mode)) throw new Error('LAB_REACTION_MODE cần là any hoặc target.');
    if (mode === 'any') return {};
    const emoji = env.LAB_REACTION_EMOJI?.trim();
    if (!emoji || (!snowflake.test(emoji) && !/\p{Emoji}/u.test(emoji))) {
      throw new Error('LAB_REACTION_EMOJI cần là emoji Unicode hoặc ID emoji tùy chỉnh.');
    }
    return { reactionTarget: { channelId: id(targetKeys[0]), messageId: id(targetKeys[1]), emoji } };
  }, { reactionUnavailable: true });

  return {
    token, appId, guildId, resetTime, questKinds, ...voice, ...reaction,
    completionDm: completionDm === 'true',
    databasePath: resolve(env.CHECKIN_DB_PATH || 'data/checkins.sqlite'),
    threadId: questSetting(['community'], required =>
      required || env.LAB_COMMUNITY_THREAD_ID?.trim() ? id('LAB_COMMUNITY_THREAD_ID') : undefined),
    pollTarget: questSetting(['poll'], () =>
      readPollTarget(guildId, env.LAB_POLL_MESSAGE_URL, env.LAB_POLL_CLOSES_AT, questKinds)),
    ...Object.fromEntries(commandQuestChannels.map(([field, key, kinds]) => [
      field,
      questSetting(kinds, required => required || env[key]?.trim() ? id(key) : undefined),
    ])),
  };
}
