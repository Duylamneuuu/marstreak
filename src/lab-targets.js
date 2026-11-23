import { ChannelType, PermissionFlagsBits } from 'discord.js';

const snowflake = /^\d{17,20}$/;

export async function verifyTargets(guild, config) {
  const me = await guild.members.fetchMe();
  async function channel(id, type, key, permissions) {
    try {
      const target = await guild.channels.fetch(id, { force: true });
      if (target?.type !== type || !target.permissionsFor(me)?.has(permissions)) throw new Error('Channel');
      return target;
    } catch {
      throw new Error('Kiểm tra kênh và quyền của bot cho ' + key + '.');
    }
  }

  const view = PermissionFlagsBits.ViewChannel;
  const room = await channel(config.reactionChannel, ChannelType.GuildText, 'LAB_REACTION_CHANNEL_ID',
    [view, PermissionFlagsBits.ReadMessageHistory]);
  try {
    await room.messages.fetch(config.reactionMessage);
  } catch {
    throw new Error('Bot không đọc được LAB_REACTION_MESSAGE_ID trong kênh reaction đã cấu hình.');
  }
  if (snowflake.test(config.reactionEmoji)) {
    try {
      const emoji = await guild.emojis.fetch(config.reactionEmoji);
      if (!emoji.available) throw new Error('Emoji unavailable');
    } catch {
      throw new Error('Bot không tìm thấy emoji Lab trong LAB_REACTION_EMOJI.');
    }
  }
  const thread = await channel(config.threadId, ChannelType.PublicThread, 'LAB_COMMUNITY_THREAD_ID', [view]);
  if (thread.archived || thread.locked) throw new Error('Thread Community cần mở và không bị khóa.');
  const rooms = await Promise.all(config.voiceIds.map(id =>
    channel(id, ChannelType.GuildVoice, 'LAB_VOICE_CHANNEL_IDS', [view])));
  return rooms.map(room => room.name);
}
