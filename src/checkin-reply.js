import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { fileURLToPath } from 'node:url';

const thumbnailName = 'marwuy-discord-icon.png';
const thumbnailPath = fileURLToPath(new URL('../assets/marwuy-discord-icon.png', import.meta.url));

export function makeCheckInReply({ created, day, streak, quests }) {
  const card = new EmbedBuilder()
    .setColor(0xe85e3c)
    .setTitle(created
      ? 'Hí hô Wủy Con, điểm danh xong rùi! ✨'
      : 'Hôm nay Wủy Con điểm danh rùi 👀')
    .setDescription(quests?.length === 0 ? 'Đã giữ chuỗi hôm nay. Dùng `/quests` sau để nhận nhiệm vụ nha.' : created
      ? 'Ba nhiệm vụ hôm nay ở ngay bên dưới nha.'
      : 'Wủy giữ bộ nhiệm vụ hôm nay để bạn làm tiếp nha.')
    .setThumbnail(`attachment://${thumbnailName}`)
    .addFields({ name: 'Chuỗi điểm danh', value: `🔥 **${streak} ngày liên tiếp**` });

  if (day) card.setFooter({ text: 'Ngày điểm danh · ' + day.split('-').reverse().join('/') });

  return {
    embeds: [card],
    files: [new AttachmentBuilder(thumbnailPath, { name: thumbnailName })],
  };
}
