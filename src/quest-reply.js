import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { dailyQuestCount } from './quest-pool.js';
import { questVisual } from './quest-visual.js';

export const questRefreshId = 'dc1:refresh-quests';

const progressCopy = [
  'Chọn việc nào làm trước cũng được. Làm xong, Wủy tự đánh dấu nha.',
  'Xong một việc rồi nè. Còn hai việc nữa.',
  'Còn một việc nữa thôi, Wủy Con ơi!',
  'Xong cả ba việc rồi! Mai ghé Ổ Wủy tiếp nha ✨',
];

export async function makeQuestBoard(quests, { pool, context, voiceSeconds, resetTime, checkInCommand }) {
  if (!quests?.length) {
    return {
      content: Array.isArray(quests) ? 'Đã điểm danh. Wủy đang chờ đủ ba việc bạn có thể làm. Bạn mở lại `/quests` sau nha.' : 'Wủy Con chưa điểm danh hôm nay. Dùng ' + checkInCommand + ' để giữ chuỗi và nhận ba nhiệm vụ nha.',
      embeds: [],
      components: [],
    };
  }

  const done = quests.filter(quest => quest.completed_at).length;
  const lines = quests.map(quest => quest.completed_at
    ? '✅ ' + pool.name(quest.kind) : '⬜ ' + pool.instruction(quest, context));
  const content = [
    '**Nhiệm vụ hôm nay · ' + done + '/' + dailyQuestCount + '**',
    ...lines,
    '',
    progressCopy[done],
    'Làm mới lúc **' + resetTime + '** (giờ Việt Nam).',
  ].join('\n');

  return {
    ...await questVisual(content, quests, voiceSeconds),
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder()
      .setCustomId(questRefreshId)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Xem tiến độ mới'))],
  };
}

export async function makeQuestUpdate(quests, kind, { pool, voiceSeconds }) {
  const done = quests.filter(quest => quest.completed_at).length;
  const heading = done === dailyQuestCount
    ? '🎉 Xong cả ba việc rồi, Wủy Con ơi!'
    : '✅ Đã tính **' + pool.name(kind) + '** nha.';
  const content = heading + '\n**' + done + '/' + dailyQuestCount
    + '** hôm nay. Xem lại bằng `/quests` trong server.';
  return questVisual(content, quests, voiceSeconds, { compact: true, completedKind: kind });
}
