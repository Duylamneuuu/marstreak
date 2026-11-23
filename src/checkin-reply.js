import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { fileURLToPath } from 'node:url';

const thumbnailName = 'marwuy-discord-icon.png';
const thumbnailPath = fileURLToPath(new URL('../assets/marwuy-discord-icon.png', import.meta.url));

export function makeCheckInReply({ created, streak }) {
  const card = new EmbedBuilder()
    .setColor(0xe85e3c)
    .setTitle(created
      ? 'Hí hô Wủy Con, điểm danh xong rùi! ✨'
      : 'Hôm nay Wủy Con điểm danh rùi 👀')
    .setDescription('Mai ghé lại giữ chuỗi nha!')
    .setThumbnail(`attachment://${thumbnailName}`)
    .addFields({ name: 'Chuỗi điểm danh', value: `🔥 **${streak} ngày liên tiếp**` });

  return {
    embeds: [card],
    files: [new AttachmentBuilder(thumbnailPath, { name: thumbnailName })],
  };
}
