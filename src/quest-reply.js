import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { dailyQuestCount } from './quest-pool.js';
import { questVisual } from './quest-visual.js';

export const questRefreshId = 'dc1:refresh-quests';
export const questHelpId = 'dc1:quest-help';

function questActions({ includeHelp = true } = {}) {
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
    .setCustomId(questRefreshId)
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Xem tiến độ mới'));
  if (includeHelp) row.addComponents(new ButtonBuilder()
    .setCustomId(questHelpId)
    .setStyle(ButtonStyle.Secondary)
    .setLabel('Cách làm nhiệm vụ'));
  return [row];
}

export function makeQuestHelp({ checkInCommand, questsCommand, resetTime }) {
  const content = [
    '**1. Nhận nhiệm vụ**\nDùng ' + checkInCommand + '. Wủy gửi thẻ điểm danh và ba nhiệm vụ ngay sau đó.',
    '**2. Làm theo từng dòng**\nBấm tên kênh hoặc link trong nhiệm vụ để đến đúng chỗ. Làm sau khi nhận nhiệm vụ nha.',
    '• **Voice:** vào phòng trên bảng, ở đủ thời lượng được ghi. Rời rồi vào lại vẫn cộng dồn trong ngày.',
    '• **Thả emoji:** làm theo tin và emoji trên bảng. Nếu đã thả từ trước, gỡ rồi thả lại.',
    '• **Chủ đề / bình chọn:** gửi tin mới trong đúng chủ đề, hoặc chọn đáp án rồi bấm **Vote** ở bài được giao.',
    '• **Lệnh bot khác:** mở đúng kênh, chọn đúng lệnh và tên bot, điền tùy chọn nếu có rồi **gửi lệnh**. Chỉ cần dùng lệnh được giao một lần.',
    '**3. Xem kết quả**\nWủy tự ghi nhận, bạn không cần nộp ảnh. Bấm **Xem tiến độ mới** hoặc dùng ' + questsCommand + ' để cập nhật bảng.',
    '**Chưa thấy tick?**\nKiểm tra đúng nhiệm vụ được giao, đúng kênh và đúng bot. Nếu thiếu quyền hoặc không thấy lệnh, nhờ quản trị viên kiểm tra. Không nhận được tin nhắn riêng vẫn xem tiến độ bằng ' + questsCommand + ' nha.',
    '**Giữ chuỗi**\nĐiểm danh và ba nhiệm vụ được tính riêng. Điểm danh mỗi ngày vẫn giữ chuỗi dù chưa xong 3/3. Ngày mới bắt đầu lúc **' + resetTime + '** (giờ Việt Nam).',
  ].join('\n\n');
  return {
    embeds: [new EmbedBuilder().setColor(0xe85e3c).setTitle('Làm nhiệm vụ trong 3 bước').setDescription(content)],
    components: questActions({ includeHelp: false }),
  };
}

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
  const lines = quests.map((quest, index) => {
    const heading = (quest.completed_at ? '✅ ' : '⬜ ') + '**' + (index + 1) + '. ' + pool.name(quest.kind) + '**';
    return quest.completed_at ? heading : heading + '\n' + pool.instruction(quest, context);
  });
  const content = [
    '**Nhiệm vụ hôm nay · ' + done + '/' + dailyQuestCount + '**',
    '',
    lines.join('\n\n'),
    '',
    progressCopy[done],
    'Bấm **Xem tiến độ mới** để cập nhật bảng nha.',
    'Làm mới lúc **' + resetTime + '** (giờ Việt Nam).',
  ].join('\n');

  return {
    ...await questVisual(content, quests, voiceSeconds),
    components: questActions(),
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
