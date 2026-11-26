import { mkdir, writeFile } from 'node:fs/promises';
import { renderQuestCard } from '../src/quest-visual.js';

const output = new URL('../previews/', import.meta.url);
await mkdir(output, { recursive: true });
const kinds = ['wheat-tarot', 'reaction', 'voice'];
const voiceSeconds = 120;

for (let done = 0; done <= kinds.length; done++) {
  const quests = kinds.map((kind, index) => ({
    kind,
    completed_at: index < done ? '2026-11-21T05:00:00.000Z' : null,
    voice_ms: kind === 'voice' ? (done === 3 ? voiceSeconds * 1000 : done * 17000) : 0,
  }));
  await writeFile(new URL('quest-' + done + '-of-3.png', output), await renderQuestCard(quests, voiceSeconds));
  if (done === 2) {
    await writeFile(new URL('quest-dm-preview.png', output), await renderQuestCard(quests, voiceSeconds, { compact: true }));
  }
}
