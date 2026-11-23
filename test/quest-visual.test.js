import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { openCheckInStore } from '../src/checkins.js';
import { questVisual, renderQuestCard } from '../src/quest-visual.js';

test('card đổi theo trạng thái SQLite, thời lượng Voice và biến thể DM', async t => {
  const store = openCheckInStore(':memory:');
  t.after(() => store.close());
  const at = new Date('2026-11-21T05:00:00Z');
  const day = store.currentDay(at);
  const readQuests = () => store.getQuests('lab', 'test-user', day);
  store.recordCheckIn('lab', 'test-user', at, ['voice', 'reaction', 'community']);
  const first = await renderQuestCard(readQuests(), 120);
  assert.deepEqual(await renderQuestCard(readQuests(), 120), first);
  assert.equal((await sharp(first).metadata()).height, 740);

  store.addVoiceTime('lab', 'test-user', day, 18000, 120000, at);
  const withVoice = await renderQuestCard(readQuests(), 120);
  assert.notDeepEqual(withVoice, first);

  assert.equal(store.completeQuest('lab', 'test-user', day, 'reaction', at), true);
  assert.equal(store.completeQuest('lab', 'test-user', day, 'reaction', at), false);
  const withReaction = await renderQuestCard(readQuests(), 120);
  assert.notDeepEqual(withReaction, withVoice);

  const text = 'Tiến độ 1/3. [Tin nhiệm vụ](https://discord.com/channels/1/2/3)';
  const payload = await questVisual(text, readQuests(), 120, { compact: true });
  assert.equal(payload.embeds[0].data.description, text);
  assert.equal(payload.embeds[0].data.image.url, 'attachment://daily-quest.png');
  assert.equal((await sharp(payload.files[0].attachment).metadata()).height, 460);
});
