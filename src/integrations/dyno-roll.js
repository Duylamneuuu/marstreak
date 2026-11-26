import { ChannelType, InteractionType, MessageFlags, PermissionFlagsBits } from 'discord.js';

const dynoAppId = '161660517914509312';
const dynoBotId = '155149108183695360';
const snowflake = /^\d{17,20}$/;
const discordEpoch = 1420070400000n;

export function readDynoRollText(content) {
  if (typeof content !== 'string' || content.length > 96) return null;
  const match = /^\s*<@!?(\d{17,20})>\s+(?:[^\d\w\n]*\s*)?You rolled\s+([1-9]\d{0,2})\s*[.!]?\s*$/i.exec(content);
  if (!match || Number(match[2]) > 100) return null;
  return { userId: match[1], number: Number(match[2]) };
}

function verifyDynoRoll(config, packet, observedAt) {
  if (packet.t !== 'MESSAGE_CREATE') return null;
  const d = packet.d;
  if (d.guild_id !== config.guildId || d.channel_id !== config.dynoRollChannel
    || d.application_id !== dynoAppId || d.webhook_id !== dynoAppId
    || d.author?.id !== dynoBotId || d.author.bot !== true || !snowflake.test(d.id ?? '')
    || (d.flags & (MessageFlags.Ephemeral | MessageFlags.Loading))) return null;

  const meta = d.interaction_metadata;
  const legacy = d.interaction;
  const result = readDynoRollText(d.content);
  if (!meta || meta.type !== InteractionType.ApplicationCommand || !snowflake.test(meta.id ?? '')
    || meta.original_response_message_id || (meta.name ?? legacy?.name) !== 'roll' || !result
    || result.userId !== meta.user?.id || meta.user.bot
    || d.mentions?.length !== 1 || d.mentions[0]?.id !== result.userId) return null;
  if (legacy && (legacy.id !== meta.id || legacy.name !== 'roll' || legacy.user?.id !== result.userId)) return null;

  const at = new Date(d.timestamp);
  const startedAt = new Date(Number((BigInt(meta.id) >> 22n) + discordEpoch));
  if (!Number.isFinite(+at) || startedAt > at || at > observedAt) return null;
  return { userId: result.userId, at, startedAt };
}

export function createDynoRollQuest(config) {
  return {
    kind: 'dyno-roll',
    name: 'Tung xúc xắc cùng Dyno',
    defaultEnabled: false,
    eligible: ({ channels, member }) => {
      const channel = channels.get(config.dynoRollChannel);
      return channel?.type === ChannelType.GuildText && Boolean(member && channel.permissionsFor(member)?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.UseApplicationCommands,
      ]));
    },
    instruction: () => 'Mở <#' + config.dynoRollChannel + '> rồi chọn `/roll` của **Dyno**. Chọn loại xúc xắc, ví dụ `d6`.',
    verify: (packet, observedAt) => verifyDynoRoll(config, packet, observedAt),
  };
}
