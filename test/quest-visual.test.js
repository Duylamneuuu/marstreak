import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { openCheckInStore } from '../src/checkins.js';
import { questVisual, renderQuestCard } from '../src/quest-visual.js';
import { makeQuestBoard, makeQuestHelp, makeQuestUpdate, questHelpId, questRefreshId } from '../src/quest-reply.js';
import { createNativeQuests } from '../src/native-quests.js';
import { createLabCommandQuests } from '../src/integrations/lab-command-quests.js';
import { createQuestPool } from '../src/quest-pool.js';

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

test('bảng nhiệm vụ có đường đi, trạng thái và nút cập nhật, DM chỉ báo kết quả', async () => {
  const config = { guildId: 'lab', voiceIds: ['voice'], wheatTarotChannel: 'tarot', voiceSeconds: 120 };
  const pool = createQuestPool([...createNativeQuests(config), ...createLabCommandQuests(config)]);
  const options = { pool, voiceSeconds: 120, resetTime: '05:30', checkInCommand: '</checkin:123>' };
  const empty = await makeQuestBoard(null, options);
  assert.match(empty.content, /<\/checkin:123>/);
  assert.deepEqual(empty.components, []);
  const pending = await makeQuestBoard([], options);
  assert.match(pending.content, /Đã điểm danh/);
  const quests = [{ kind: 'voice', voice_ms: 18000 }, { kind: 'wheat-tarot' }, { kind: 'reaction' }];
  const openings = [/Wủy tự đánh dấu/, /Còn hai việc/, /Còn một việc/, /Xong cả ba việc/];
  for (let done = 0; done <= quests.length; done++) {
    const board = await makeQuestBoard(quests, options);
    const description = board.embeds[0].data.description;
    assert.ok(description.includes(done + '/3'));
    assert.match(description, openings[done]);
    assert.ok(description.includes('05:30'));
    assert.equal(board.components[0].toJSON().components[0].custom_id, questRefreshId);
    assert.equal(board.components[0].toJSON().components[1].custom_id, questHelpId);
    if (done === 0) {
      assert.ok(description.includes('<#voice>'));
      assert.ok(description.includes('0:18 / 2:00'));
      assert.ok(description.includes('<#tarot> rồi chọn `/tarot` của **Wheat**'));
    }
    if (done === 2) {
      const dm = await makeQuestUpdate(quests, 'wheat-tarot', options);
      assert.match(dm.embeds[0].data.description, /Đã tính.*2\/3/s);
      assert.doesNotMatch(dm.embeds[0].data.description, /<#|⬜/);
    }
    if (done < quests.length) quests[done].completed_at = '2026-11-25T12:00:00Z';
  }
});

test('member instructions remain within Discord limits with a large Voice configuration', async () => {
  const config = {
    guildId: '1572632342768386128',
    voiceIds: Array.from({ length: 100 }, (_, i) => String(1572632342768386100n + BigInt(i))),
    voiceSeconds: 86400,
    reactionTarget: { channelId: '1573008410574589972', messageId: '1574655417928257607', emoji: '1573008410574589973' },
    zodiacExtrasChannel: '1573008410574589972',
  };
  const pool = createQuestPool([...createNativeQuests(config), ...createLabCommandQuests(config)]);
  const options = { pool, voiceSeconds: 86400, resetTime: '04:30', checkInCommand: '</checkin:1573008410574589974>', questsCommand: '</quests:1573008410574589975>' };
  const quests = [{ kind: 'voice', voice_ms: 0 }, { kind: 'reaction' }, { kind: 'zodiac-compatibility' }];
  const board = await makeQuestBoard(quests, options);
  const help = makeQuestHelp(options);
  for (const response of [board, help]) {
    const embed = response.embeds[0].toJSON();
    assert.ok(embed.description.length < 4096);
    assert.ok(response.components[0].toJSON().components.length <= 5);
  }
  const description = board.embeds[0].data.description;
  assert.match(description, /<:quest:1573008410574589973>/);
  assert.equal((description.match(/<#/g) ?? []).length, 4);
  assert.match(description, /1\. Vào phòng Voice.*2\. Thả emoji.*3\. So độ hợp hai cung/s);
});
