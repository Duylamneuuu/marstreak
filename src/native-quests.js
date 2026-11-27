import { questNames } from './quest-names.js';
import { ChannelType, MessageType, PermissionFlagsBits } from 'discord.js';
import { voiceProgress } from './voice-quests.js';

const view = PermissionFlagsBits.ViewChannel;

function hasPermissions(channel, member, permissions) {
  return Boolean(member && channel?.permissionsFor(member)?.has(permissions));
}

function reactionProof({ guildId, reactionTarget }, packet, observedAt) {
  if (packet.t !== 'MESSAGE_REACTION_ADD') return null;
  const data = packet.d;
  const user = data.member?.user;
  if (data.guild_id !== guildId || !user?.id || user.id !== data.user_id || user.bot) return null;
  if (reactionTarget && (data.channel_id !== reactionTarget.channelId || data.message_id !== reactionTarget.messageId
    || (data.emoji?.id ?? data.emoji?.name) !== reactionTarget.emoji)) return null;
  return { userId: user.id, at: observedAt };
}

function communityProof(config, message) {
  if (!config.threadId || message.guildId !== config.guildId || message.channelId !== config.threadId
    || message.author.bot || message.webhookId || message.system
    || message.channel.archived || message.channel.locked
    || ![MessageType.Default, MessageType.Reply].includes(message.type)) return null;
  const at = new Date(message.createdTimestamp);
  return { userId: message.author.id, at, startedAt: at };
}

export function createNativeQuests(config) {
  const goal = config.voiceSeconds;
  const duration = goal % 60 === 0 ? goal / 60 + ' phút' : goal + ' giây';
  const guildLink = 'https://discord.com/channels/' + config.guildId + '/';
  const threadLink = guildLink + config.threadId;
  const reactionTarget = config.reactionTarget;
  const canJoin = (room, context) => room?.type === ChannelType.GuildVoice
    && hasPermissions(room, context.botMember, view)
    && hasPermissions(room, context.member, [view, PermissionFlagsBits.Connect]);

  function reactionRoom(context) {
    if (!context?.botMember) return undefined;
    for (const [id, room] of context.channels) {
      if (room.type === ChannelType.GuildText && hasPermissions(room, context.botMember, view)
        && hasPermissions(room, context.member, [view, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions])) {
        return id;
      }
    }
  }

  return [
    {
      kind: 'voice',
      name: questNames['voice'].name,
      defaultEnabled: true,
      eligible: context => config.voiceIds.some(id => canJoin(context.channels.get(id), context)),
      instruction: (assignment, context) => {
        const rooms = config.voiceIds.filter(id => !context || canJoin(context.channels.get(id), context));
        if (!rooms.length) return 'Chưa có phòng Voice bạn vào được. Nhờ quản trị viên kiểm tra quyền nha.';
        const links = rooms.map(id => '<#' + id + '>').join(', ');
        return 'Ở trong ' + (rooms.length === 1 ? links : 'một trong các phòng ' + links)
          + ' đủ **' + duration + '**. Đã tính **' + voiceProgress(assignment, goal) + '**.';
      },
    },
    {
      kind: 'reaction',
      name: questNames['reaction'].name,
      defaultEnabled: true,
      eligible: context => {
        if (!reactionTarget) return Boolean(reactionRoom(context));
        const { channels, member, botMember, reactionMessage: message } = context;
        const room = channels.get(reactionTarget.channelId);
        return room?.type === ChannelType.GuildText && Boolean(message)
          && hasPermissions(room, botMember, [view, PermissionFlagsBits.ReadMessageHistory])
          && hasPermissions(room, member, [view, PermissionFlagsBits.ReadMessageHistory])
          && (hasPermissions(room, member, PermissionFlagsBits.AddReactions)
            || message.reactions.cache.has(reactionTarget.emoji));
      },
      instruction: (_assignment, context) => {
        if (!reactionTarget) {
          const example = reactionRoom(context);
          return 'Thả một emoji mới vào một tin ở kênh Wủy nhìn thấy' + (example ? ', ví dụ <#' + example + '>.' : '.');
        }
        const link = guildLink + reactionTarget.channelId + '/' + reactionTarget.messageId;
        const emoji = /^\d{17,20}$/.test(reactionTarget.emoji) ? 'emoji đã chọn' : reactionTarget.emoji;
        return 'Thả ' + emoji + ' vào [tin nhắn này](<' + link + '>).';
      },
      verify: (packet, observedAt) => config.reactionUnavailable ? null : reactionProof(config, packet, observedAt),
    },
    {
      kind: 'community',
      name: questNames['community'].name,
      defaultEnabled: true,
      eligible: ({ channels, member, botMember }) => {
        const thread = channels.get(config.threadId);
        return thread?.type === ChannelType.PublicThread && !thread.archived && !thread.locked
          && hasPermissions(thread, botMember, view)
          && hasPermissions(thread, member, [view, PermissionFlagsBits.SendMessagesInThreads]);
      },
      instruction: () => config.threadId ? 'Gửi một tin trong [chủ đề này](<' + threadLink + '>).'
        : 'Chủ đề này đang tạm đóng.',
      verify: message => communityProof(config, message),
    },
  ];
}
