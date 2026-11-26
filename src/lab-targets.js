import { ChannelType, PermissionFlagsBits } from 'discord.js';

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
  if (config.reactionTarget) {
    const { channelId, messageId, emoji } = config.reactionTarget;
    const room = await channel(channelId, ChannelType.GuildText, 'LAB_REACTION_CHANNEL_ID',
      [view, PermissionFlagsBits.ReadMessageHistory]);
    try {
      await room.messages.fetch(messageId);
    } catch {
      throw new Error('Bot không đọc được LAB_REACTION_MESSAGE_ID trong kênh Reaction.');
    }
    if (/^\d{17,20}$/.test(emoji)) {
      try {
        if (!(await guild.emojis.fetch(emoji)).available) throw new Error('Emoji unavailable');
      } catch {
        throw new Error('Bot không tìm thấy emoji Lab trong LAB_REACTION_EMOJI.');
      }
    }
  }
  if (config.questKinds === undefined || config.questKinds.split(',').some(kind => kind.trim() === 'community')) {
    if (!config.threadId) throw new Error('Điền LAB_COMMUNITY_THREAD_ID để bật Community.');
    const thread = await channel(config.threadId, ChannelType.PublicThread, 'LAB_COMMUNITY_THREAD_ID', [view]);
    if (thread.archived || thread.locked) throw new Error('Thread Community cần mở và không bị khóa.');
  }
  const poll = config.pollTarget;
  if (poll && poll.deadline > Date.now() && config.questKinds?.split(',').some(kind => kind.trim() === 'poll')) {
    const room = await channel(poll.channelId, ChannelType.GuildText, 'LAB_POLL_MESSAGE_URL',
      [view, PermissionFlagsBits.ReadMessageHistory]);
    let message;
    try {
      message = await room.messages.fetch({ message: poll.messageId, force: true });
    } catch {
      throw new Error('Bot không mở được tin nhắn ở LAB_POLL_MESSAGE_URL.');
    }
    // Poll data can be unavailable for member-authored messages without Message Content.
    const discordExpiry = message.poll?.expiresTimestamp;
    if (discordExpiry && discordExpiry < poll.deadline) {
      throw new Error('LAB_POLL_CLOSES_AT phải bằng hoặc sớm hơn giờ đóng trên Discord.');
    }
  }
  for (const [id, key] of [
    [config.dynoRollChannel, 'LAB_DYNO_ROLL_CHANNEL_ID'],
    [config.zodiacLikesChannel, 'LAB_ZODIAC_LIKES_CHANNEL_ID'],
    [config.wheatTarotChannel, 'LAB_WHEAT_TAROT_CHANNEL_ID'],
    [config.zodiacExtrasChannel, 'LAB_ZODIAC_QUEST_CHANNEL_ID'],
    [config.wheatCoinflipChannel, 'LAB_WHEAT_COINFLIP_CHANNEL_ID'],
    [config.asterieChannel, 'LAB_ASTERIE_QUEST_CHANNEL_ID'],
  ]) {
    if (id) await channel(id, ChannelType.GuildText, key, [view]);
  }
  const rooms = await Promise.all(config.voiceIds.map(id =>
    channel(id, ChannelType.GuildVoice, 'LAB_VOICE_CHANNEL_IDS', [view])));
  return rooms.map(room => room.name);
}
