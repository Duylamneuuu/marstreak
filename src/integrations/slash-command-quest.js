import { questNames } from '../quest-names.js';
import { ChannelType, InteractionType, MessageFlags, MessageType, PermissionFlagsBits } from 'discord.js';

const snowflake = /^\d{17,20}$/;
const discordEpoch = 1420070400000n;

function verifyInvocation({ guildId, channelId, appId, authorId = appId, command }, packet, observedAt) {
  // The initial public acknowledgement identifies the call even while it is loading.
  if (packet.t !== 'MESSAGE_CREATE') return null;
  const message = packet.d;
  if (message.guild_id !== guildId || message.channel_id !== channelId
    || message.application_id !== appId || message.webhook_id !== appId
    || message.author?.id !== authorId || message.author.bot !== true || !snowflake.test(message.id ?? '')
    || message.type !== MessageType.ChatInputCommand || (message.flags & MessageFlags.Ephemeral)) return null;

  const metadata = message.interaction_metadata;
  const legacy = message.interaction;
  const user = metadata?.user;
  if (metadata?.type !== InteractionType.ApplicationCommand || metadata.original_response_message_id
    || !snowflake.test(metadata.id ?? '') || !snowflake.test(user?.id ?? '') || user.bot
    || (metadata.name ?? legacy?.name) !== command) return null;
  if (legacy && (legacy.id !== metadata.id || legacy.name !== command || legacy.user?.id !== user.id)) return null;

  const at = new Date(message.timestamp);
  const startedAt = new Date(Number((BigInt(metadata.id) >> 22n) + discordEpoch));
  if (!Number.isFinite(+at) || startedAt > at || at > observedAt) return null;
  return { userId: user.id, at, startedAt };
}

export function createSlashCommandQuest(definition) {
  const { kind, name, channelId, command, appName, option } = definition;
  return {
    kind,
    name: name ?? questNames[kind]?.name ?? kind,
    sourceBotId: definition.authorId ?? definition.appId,
    defaultEnabled: false,
    eligible: ({ channels, member, botMember, sourceBots }) => {
      const channel = channels.get(channelId);
      const bot = sourceBots?.get(definition.authorId ?? definition.appId);
      return channel?.type === ChannelType.GuildText
        && Boolean(botMember && channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ViewChannel))
        && Boolean(bot && channel.permissionsFor(bot)?.has(PermissionFlagsBits.ViewChannel))
        && Boolean(member && channel.permissionsFor(member)?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.UseApplicationCommands,
      ]));
    },
    instruction: () => 'Mở <#' + channelId + '> rồi chọn `/' + command + '` của **' + appName + '**'
      + (option ? '. ' + option : '.'),
    verify: (packet, observedAt) => verifyInvocation(definition, packet, observedAt),
  };
}
