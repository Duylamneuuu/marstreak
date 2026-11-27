import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { enabledQuestKinds } from './quest-pool.js';
import { commandQuestChannels } from './integrations/lab-command-quests.js';

// A single request for overlapping check-ins. The next assignment checks
// Discord again so a deletion or permission change doesn't outlive the cache.
export function createReactionTargetReader(target) {
  let pending;
  return room => {
    if (!room || !target) return;
    pending ??= room.messages.fetch({ message: target.messageId, force: true, cache: false })
      .catch(() => null)
      .finally(() => { pending = undefined; });
    return pending;
  };
}

export function createQuestBotReader(ids) {
  let pending;
  return guild => {
    pending ??= Promise.all(ids.map(async id => {
      const member = await guild.members.fetch({ user: id, force: true }).catch(() => null);
      return [id, member?.user.bot ? member : null];
    })).then(entries => new Map(entries)).finally(() => { pending = undefined; });
    return pending;
  };
}

export async function verifyTargets(guild, config) {
  const me = await guild.members.fetchMe();
  const enabled = enabledQuestKinds(config.questKinds);
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
  if (config.reactionTarget && enabled.includes('reaction')) {
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
  if (enabled.includes('community')) {
    if (!config.threadId) throw new Error('Điền LAB_COMMUNITY_THREAD_ID để bật Community.');
    const thread = await channel(config.threadId, ChannelType.PublicThread, 'LAB_COMMUNITY_THREAD_ID', [view]);
    if (thread.archived || thread.locked) throw new Error('Thread Community cần mở và không bị khóa.');
  }
  const poll = config.pollTarget;
  if (poll && poll.deadline > Date.now() && enabled.includes('poll')) {
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
  for (const [field, key, kinds] of commandQuestChannels) {
    if (config[field] && kinds.some(kind => enabled.includes(kind))) {
      await channel(config[field], ChannelType.GuildText, key, [view]);
    }
  }
  if (!enabled.includes('voice')) return [];
  const rooms = await Promise.all(config.voiceIds.map(id =>
    channel(id, ChannelType.GuildVoice, 'LAB_VOICE_CHANNEL_IDS', [view])));
  return rooms.map(room => room.name);
}
