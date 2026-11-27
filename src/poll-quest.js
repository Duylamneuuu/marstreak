import { questNames } from './quest-names.js';
import { checkInDay, parseResetTime } from './checkins.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

const pollMessageUrl = /^https:\/\/discord\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})\/?$/;
const timestampWithZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const snowflake = /^\d{17,20}$/;

export function readPollTarget(guildId, messageUrl, closesAt, questKinds) {
  const url = messageUrl?.trim();
  const cutoff = closesAt?.trim();
  if (!url && !cutoff && !questKinds?.split(',').some(kind => kind.trim() === 'poll')) return undefined;

  const match = pollMessageUrl.exec(url ?? '');
  if (!match || match[1] !== guildId) {
    throw new Error('LAB_POLL_MESSAGE_URL cần là link tin nhắn Poll trong đúng server Discord đã cấu hình.');
  }
  const deadline = Date.parse(cutoff);
  if (!timestampWithZone.test(cutoff ?? '') || !Number.isFinite(deadline)) {
    throw new Error('LAB_POLL_CLOSES_AT cần là giờ đóng có múi giờ, ví dụ 2026-12-01T00:00:00+07:00.');
  }
  return { guildId, channelId: match[2], messageId: match[3], url, deadline };
}

export function createPollQuest(target, resetTime = '00:00') {
  const resetMinutes = parseResetTime(resetTime);
  const deadlineDay = target && checkInDay(new Date(target.deadline), resetMinutes);
  const permissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
  const visibleDeadline = target && new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
  }).format(target.deadline);
  return {
    kind: 'poll',
    name: questNames['poll'].name,
    defaultEnabled: false,
    eligible({ channels, member, botMember, at = new Date() }) {
      if (!target || checkInDay(at, resetMinutes) >= deadlineDay) return false;
      const room = channels.get(target.channelId);
      return room?.type === ChannelType.GuildText
        && Boolean(botMember && room.permissionsFor(botMember)?.has(permissions))
        && Boolean(member && room.permissionsFor(member)?.has(permissions));
    },
    instruction(_assignment, context) {
      if (!target || +(context?.at ?? new Date()) >= target.deadline) return 'Bình chọn này đã đóng.';
      return 'Mở [bình chọn này](<' + target.url + '>), chọn một đáp án rồi bấm **Vote**. Hạn ' + visibleDeadline + ' (giờ Việt Nam).';
    },
    verify(packet, observedAt) {
      if (!target || packet.t !== 'MESSAGE_POLL_VOTE_ADD' || +observedAt >= target.deadline) return null;
      const vote = packet.d;
      if (vote?.guild_id !== target.guildId || vote.channel_id !== target.channelId
        || vote.message_id !== target.messageId || !snowflake.test(vote.user_id ?? '')
        || !Number.isInteger(vote.answer_id) || vote.answer_id < 1) return null;
      return { userId: vote.user_id, at: observedAt };
    },
  };
}
