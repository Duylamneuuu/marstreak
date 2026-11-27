import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { questNames } from './quest-names.js';
import { voiceProgress } from './voice-quests.js';

const guide = fileURLToPath(new URL('../assets/quest-guide-temp.png', import.meta.url));
const celebration = fileURLToPath(new URL('../assets/quest-celebration-temp.png', import.meta.url));
const forest = fileURLToPath(new URL('../assets/forest-poster-crop-temp.png', import.meta.url));
const cache = new Map();

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function labelFor(kind) {
  const copy = questNames[kind];
  return copy?.shortLabel ?? copy?.name.toUpperCase();
}

function notificationLayout(quests, completedKind) {
  const count = quests.filter(quest => quest.completed_at).length;
  const title = count === 3 ? 'XONG CẢ BA VIỆC!' : 'XONG THÊM MỘT VIỆC!';
  const label = labelFor(completedKind) ?? 'NHIỆM VỤ HÔM NAY';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="460">
    <rect x="38" y="42" width="636" height="376" rx="24" fill="#fff3ce" stroke="#965e26" stroke-width="12"/>
    <g font-family="Be Vietnam Pro,Arial,sans-serif" font-weight="bold">
      <text x="76" y="132" font-size="42" fill="#99441c">${title}</text>
      <text x="72" y="267" font-size="120" fill="#365924">${count}/3</text>
      <text x="76" y="357" font-size="36" fill="#365924">${escapeXml(label)}</text>
    </g></svg>`;
}

function layout(quests, voiceSeconds) {
  const count = quests.filter(quest => quest.completed_at).length;
  const complete = count === 3;
  const height = 740;
  const title = complete ? 'XONG CẢ 3 VIỆC!' : 'NHIỆM VỤ HÔM NAY';
  const boardTop = 133;
  const boardHeight = 551;
  const rowTop = 363;
  const rowGap = 83;
  const rows = quests.map((quest, index) => {
    const y = rowTop + index * rowGap;
    const done = Boolean(quest.completed_at);
    const detail = quest.kind === 'voice' ? voiceProgress(quest, voiceSeconds) : '';
    return `
      <rect x="77" y="${y - 33}" width="570" height="66" rx="33" fill="#fff8e4" stroke="#d0a45c" stroke-width="3"/>
      <circle cx="111" cy="${y - 1}" r="23" fill="${done ? '#456627' : '#fff8e4'}" stroke="#6c7848" stroke-width="3"/>
      ${done ? `<path d="M102 ${y - 1} l7 7 l13 -16" fill="none" stroke="#fff8e4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      <text x="146" y="${y + 8}" class="quest">${escapeXml(labelFor(quest.kind) ?? 'NHIỆM VỤ')}</text>
      ${detail ? `<text x="624" y="${y + 8}" text-anchor="end" class="detail">${escapeXml(detail)}</text>` : ''}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}">
  <defs>
    <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#bd7b2d"/><stop offset=".5" stop-color="#8b4f1d"/><stop offset="1" stop-color="#c48839"/></linearGradient>
    <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fff3c9"/><stop offset=".6" stop-color="#fff8df"/><stop offset="1" stop-color="#f4dca6"/></linearGradient>
  </defs>
  <style>
    text{font-family:'Be Vietnam Pro','Arial',sans-serif}
    .title{font-size:52px;font-weight:900;fill:#dd2c10;stroke:#fff8e8;stroke-width:10;paint-order:stroke;stroke-linejoin:round}
    .count{font-size:44px;font-weight:900;fill:#dc2c14}
    .small{font-size:23px;font-weight:800;fill:#456627}
    .quest{font-size:36px;font-weight:900;fill:#385b24}
    .detail{font-size:27px;font-weight:800;fill:#765024}
  </style>
  <rect width="1000" height="${height}" fill="#163c12" opacity=".12"/>
  <text x="62" y="87" class="title">${title}</text>
  <rect x="42" y="${boardTop}" width="648" height="${boardHeight}" rx="20" fill="#593313" opacity=".35" transform="translate(8 10)"/>
  <rect x="42" y="${boardTop}" width="648" height="${boardHeight}" rx="20" fill="url(#wood)" stroke="#734112" stroke-width="7"/>
  <rect x="60" y="${boardTop + 17}" width="612" height="${boardHeight - 34}" rx="12" fill="url(#paper)" stroke="#e0be79" stroke-width="4"/>
  <circle cx="54" cy="${boardTop + 12}" r="5" fill="#e4bc74"/><circle cx="678" cy="${boardTop + 12}" r="5" fill="#e4bc74"/>
  <circle cx="54" cy="${boardTop + boardHeight - 12}" r="5" fill="#e4bc74"/><circle cx="678" cy="${boardTop + boardHeight - 12}" r="5" fill="#e4bc74"/>
  <text x="82" y="207" class="small">ĐÃ HOÀN THÀNH</text>
  <text x="82" y="267" class="count">${count}/3</text>
  <rect x="180" y="237" width="420" height="23" rx="12" fill="#e6d3a7" stroke="#c59a57" stroke-width="2"/>
  <rect x="183" y="240" width="${414 * count / 3}" height="17" rx="8" fill="#456627"/>
  ${rows}
  ${complete ? '<text x="82" y="640" class="small">MAI GHÉ Ổ WỦY TIẾP NHA!</text>' : ''}
  </svg>`;
}

export async function renderQuestCard(quests, voiceSeconds, { compact = false, completedKind } = {}) {
  const key = JSON.stringify([compact, completedKind, voiceSeconds, quests.map(({ kind, completed_at, voice_ms }) =>
    [kind, Boolean(completed_at), Math.floor((voice_ms ?? 0) / 1000)])]);
  if (cache.has(key)) return cache.get(key);
  // Keep text replies available if the host cannot load Sharp's native binary.
  const { default: sharp } = await import('sharp');
  const complete = quests.filter(quest => quest.completed_at).length === 3;
  const height = compact ? 460 : 740;
  const backdrop = await sharp(await readFile(forest)).resize(1000, height, { fit: 'cover' }).png().toBuffer();
  const mascot = await sharp(await readFile(complete ? celebration : guide))
    .resize({ width: compact ? 310 : 400, height: compact ? 350 : 520, fit: 'inside' })
    .png().toBuffer();
  const metadata = await sharp(mascot).metadata();
  const image = await sharp(backdrop)
    .composite([
      { input: Buffer.from(compact ? notificationLayout(quests, completedKind) : layout(quests, voiceSeconds)) },
      { input: mascot, left: Math.round(820 - metadata.width / 2),
        top: Math.round((compact ? 270 : 442) - metadata.height / 2) },
    ])
    .png().toBuffer();
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(key, image);
  return image;
}

export async function questVisual(content, quests, voiceSeconds, options) {
  const embed = new EmbedBuilder().setColor(0xe11d2e).setDescription(content);
  try {
    const image = await renderQuestCard(quests, voiceSeconds, options);
    embed.setImage('attachment://daily-quest.png');
    return { embeds: [embed], files: [new AttachmentBuilder(image, {
      name: 'daily-quest.png',
      description: 'Thẻ minh họa tiến độ nhiệm vụ. Hướng dẫn và tiến độ dạng chữ ở phía trên.',
    })] };
  } catch (error) {
    console.error('Không dựng được ảnh nhiệm vụ (' + (error?.name || 'Error') + ').');
    return { embeds: [embed] };
  }
}
