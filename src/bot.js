import {
  Client, Events, GatewayIntentBits, MessageFlags, MessageType,
  Routes, SlashCommandBuilder,
} from 'discord.js';
import { resolve } from 'node:path';
import { verifyTargets } from './lab-targets.js';
import { deliverQuestUpdate } from './quest-notification.js';
import { makeCheckInReply } from './checkin-reply.js';
import { questVisual } from './quest-visual.js';
import { openCheckInStore, parseResetTime } from './checkins.js';
import { trackVoice, voiceThresholdMs, voiceTickMs } from './voice-quests.js';

const labPool = ['voice', 'reaction', 'community'];
const snowflake = /^\d{17,20}$/;
const commands = [
  new SlashCommandBuilder().setName('checkin').setDescription('Điểm danh hôm nay và xem chuỗi điểm danh của bạn.'),
  new SlashCommandBuilder().setName('quests').setDescription('Xem ba nhiệm vụ hôm nay của Wủy Con.'),
];

function readConfig() {
  const env = process.env;
  const token = env.DISCORD_TOKEN?.trim();
  const appId = env.DISCORD_APPLICATION_ID?.trim();
  const guildId = env.DISCORD_GUILD_ID?.trim();
  const resetTime = env.CHECKIN_RESET_TIME ?? '00:00';
  const voiceSeconds = env.LAB_VOICE_SECONDS === undefined
    ? voiceThresholdMs / 1000 : Number(env.LAB_VOICE_SECONDS);
  if (!token) throw new Error('Điền DISCORD_TOKEN trong .env.');
  if (!snowflake.test(appId ?? '')) throw new Error('DISCORD_APPLICATION_ID không hợp lệ.');
  if (!snowflake.test(guildId ?? '')) throw new Error('DISCORD_GUILD_ID không hợp lệ.');
  parseResetTime(resetTime);
  if (!Number.isInteger(voiceSeconds) || voiceSeconds < 1 || voiceSeconds > 86400) {
    throw new Error('LAB_VOICE_SECONDS cần là số nguyên từ 1 đến 86400.');
  }

  function id(key) {
    const value = env[key]?.trim();
    if (!snowflake.test(value ?? '')) throw new Error('Kiểm tra ID trong ' + key + '.');
    return value;
  }

  const voiceIds = [...new Set((env.LAB_VOICE_CHANNEL_IDS ?? '').split(',').map(value => value.trim()))];
  if (!voiceIds.every(value => snowflake.test(value))) throw new Error('Kiểm tra LAB_VOICE_CHANNEL_IDS.');
  const reactionEmoji = env.LAB_REACTION_EMOJI?.trim();
  if (!reactionEmoji || (!snowflake.test(reactionEmoji) && !/\p{Emoji}/u.test(reactionEmoji))) {
    throw new Error('LAB_REACTION_EMOJI cần là emoji Unicode hoặc ID emoji tùy chỉnh.');
  }
  return {
    token, appId, guildId, resetTime, voiceIds, voiceSeconds, reactionEmoji,
    databasePath: resolve(env.CHECKIN_DB_PATH || 'data/checkins.sqlite'),
    reactionChannel: id('LAB_REACTION_CHANNEL_ID'),
    reactionMessage: id('LAB_REACTION_MESSAGE_ID'),
    threadId: id('LAB_COMMUNITY_THREAD_ID'),
  };
}

function errorLabel(error) {
  return (error?.name || 'Error') + (error?.code ? ' (' + error.code + ')' : '');
}

async function start(config) {
  const store = openCheckInStore(config.databasePath, config.resetTime);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
    rest: { timeout: 10_000, retries: 2 },
  });
  let voiceRoomNames = [];
  const reactionLink = 'https://discord.com/channels/' + [config.guildId, config.reactionChannel, config.reactionMessage].join('/');
  const threadLink = 'https://discord.com/channels/' + [config.guildId, config.threadId].join('/');
  const emojiLabel = snowflake.test(config.reactionEmoji) ? 'emoji đã chọn' : config.reactionEmoji;
  const names = { voice: 'Voice', reaction: 'Reaction', community: 'Community' };

  function questText(quests) {
    const done = quests.filter(quest => quest.completed_at).length;
    const goal = config.voiceSeconds;
    const duration = goal % 60 === 0 ? goal / 60 + ' phút' : goal + ' giây';
    const instructions = {
      voice: '🎙️ Vào Voice **' + voiceRoomNames.join(', ') + '** đủ ' + duration,
      reaction: '✨ Thả ' + emojiLabel + ' vào [tin nhắn thử nghiệm](<' + reactionLink + '>)',
      community: '💬 Gửi tin trong [thread thử nghiệm](<' + threadLink + '>)',
    };
    const lines = quests.map(quest => {
      const timer = quest.kind === 'voice' && !quest.completed_at
        ? ' · ' + Math.min(goal, Math.floor(quest.voice_ms / 1000)) + '/' + goal + ' giây' : '';
      return (quest.completed_at ? '✅ ' : '⬜ ') + instructions[quest.kind] + timer;
    });
    return ['✨ **Nhiệm vụ hôm nay · ' + done + '/3**', ...lines,
      done === 3 ? '🎉 Wủy Con hoàn thành cả 3 nhiệm vụ rùi!' : 'Cố lên Wủy Con ơi!'].join('\n');
  }

  let initialized = false;
  let online = false;
  let stopping = false;
  let voiceTimer;

  async function notify(userId, kind, day) {
    const progress = store.getQuests(config.guildId, userId, day);
    const content = '✅ Wủy Con hoàn thành nhiệm vụ **' + names[kind] + '** rùi!\n' + questText(progress);
    // Persist first. Discord can reject a DM even when the quest was completed.
    const visual = await questVisual(content, progress, config.voiceSeconds, { compact: true });
    await deliverQuestUpdate(client.users, userId, visual, error => {
      console.log('Không gửi được DM (' + errorLabel(error) + '). Xem /quests để kiểm tra tiến độ.');
    });
  }

  const voice = trackVoice(store, config.guildId, (userId, day) => {
    void notify(userId, 'voice', day).catch(error => console.error('Lỗi thông báo Voice (' + errorLabel(error) + ').'));
  },
    config.voiceSeconds * 1000);

  function pause() {
    online = false;
    voice.pause();
  }

  function eligible(state) {
    return state.member?.user.bot === false && config.voiceIds.includes(state.channelId);
  }

  function resume() {
    const guild = client.guilds.cache.get(config.guildId);
    if (!initialized || stopping || !guild?.available) return;
    pause();
    for (const state of guild.voiceStates.cache.values()) {
      if (eligible(state)) voice.update(state.id, true);
    }
    online = true;
  }

  function handle(label, action) {
    return (...args) => {
      if (stopping) return;
      try {
        const result = action(...args);
        if (result) void Promise.resolve(result).catch(error => console.error(label + ' (' + errorLabel(error) + ').'));
      } catch (error) {
        console.error(label + ' (' + errorLabel(error) + ').');
      }
    };
  }

  async function stop(exitCode) {
    if (stopping) return;
    stopping = true;
    clearInterval(voiceTimer);
    try {
      if (online) voice.tick();
    } catch (error) {
      console.error('Không ghi được Voice khi dừng (' + errorLabel(error) + ').');
      exitCode = 1;
    }
    pause();
    try {
      await client.destroy();
    } finally {
      store.close();
      process.exitCode = exitCode;
    }
  }

  process.once('SIGINT', handle('Lỗi khi dừng', () => stop(0)));
  process.once('SIGTERM', handle('Lỗi khi dừng', () => stop(0)));
  client.on(Events.Error, error => console.error('Lỗi Discord (' + errorLabel(error) + ').'));

  client.once(Events.ClientReady, async readyClient => {
    try {
      if (readyClient.application.id !== config.appId) throw new Error('Token không thuộc app đã cấu hình.');
      const guild = await readyClient.guilds.fetch(config.guildId);
      voiceRoomNames = await verifyTargets(guild, config);
      for (const command of commands) {
        await readyClient.rest.post(Routes.applicationGuildCommands(config.appId, guild.id), {
          body: command.toJSON(),
        });
      }
      if (stopping) return;
      initialized = true;
      resume();
      voiceTimer = setInterval(handle('Lỗi ghi thời gian Voice', () => {
        if (online) voice.tick();
      }), voiceTickMs);
      console.log('MarStreak sẵn sàng. Đã kiểm tra ID/quyền và đăng ký /checkin, /quests.');
    } catch (error) {
      // Discord HTTP errors can carry request details. Log their type and code only.
      console.error('Khởi động thất bại. ' + (error.constructor === Error ? error.message : errorLabel(error)));
      await stop(1);
    }
  });

  client.on(Events.InteractionCreate, handle('Lỗi lệnh DC1', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.guildId !== config.guildId
      || !['checkin', 'quests'].includes(interaction.commandName)) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!online) {
      await interaction.editReply('Bot đang kết nối lại, Wủy Con thử sau một chút nha!');
      return;
    }

    let checkInShown = false;
    try {
      const at = new Date(interaction.createdTimestamp);
      const userId = interaction.user.id;
      if (interaction.commandName === 'quests') {
        const quests = store.getQuests(config.guildId, userId, store.currentDay(at));
        await interaction.editReply(quests.length
          ? await questVisual(questText(quests), quests, config.voiceSeconds)
          : 'Wủy Con dùng /checkin để nhận nhiệm vụ nha!');
        return;
      }
      voice.checkpoint(userId, Date.now());
      const result = store.recordCheckIn(config.guildId, userId, at, labPool);
      await interaction.editReply(makeCheckInReply(result));
      checkInShown = true;
      await interaction.followUp({
        ...await questVisual(questText(result.quests), result.quests, config.voiceSeconds),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Không xử lý được /' + interaction.commandName + ' (' + errorLabel(error) + ').');
      const message = 'Có lỗi khi trả kết quả. Wủy Con thử lại sau nha!';
      if (!checkInShown) await interaction.editReply(message);
    }
  }));

  // One test guild. Clear the clock on both resumable and terminal disconnects.
  client.on(Events.ShardDisconnect, pause);
  client.on(Events.ShardReconnecting, pause);
  client.on(Events.ShardReady, handle('Lỗi khôi phục Voice', resume));
  client.on(Events.ShardResume, handle('Lỗi khôi phục Voice', resume));
  client.on(Events.GuildUnavailable, guild => {
    if (guild.id === config.guildId) pause();
  });
  client.on(Events.GuildAvailable, handle('Lỗi khôi phục Voice', guild => {
    if (guild.id === config.guildId) resume();
  }));

  client.on(Events.VoiceStateUpdate, handle('Lỗi theo dõi Voice', (before, after) => {
    if (online && after.guild.id === config.guildId && before.channelId !== after.channelId) {
      voice.update(after.id, eligible(after));
    }
  }));

  client.on(Events.Raw, handle('Lỗi xử lý reaction', packet => {
    if (!online || packet.t !== 'MESSAGE_REACTION_ADD') return;
    const data = packet.d;
    const user = data.member?.user;
    if (data.guild_id !== config.guildId || data.channel_id !== config.reactionChannel
      || data.message_id !== config.reactionMessage || (data.emoji?.id ?? data.emoji?.name) !== config.reactionEmoji
      || user?.id !== data.user_id || !user || user.bot) return;
    const at = new Date();
    const day = store.currentDay(at);
    if (store.completeQuest(config.guildId, user.id, day, 'reaction', at)) {
      void notify(user.id, 'reaction', day).catch(error => console.error('Lỗi thông báo Reaction (' + errorLabel(error) + ').'));
    }
  }));

  client.on(Events.MessageCreate, handle('Lỗi xử lý Community Quest', message => {
    if (!online || message.guildId !== config.guildId || message.channelId !== config.threadId
      || message.author.bot || message.webhookId
      || message.channel.archived || message.channel.locked
      || ![MessageType.Default, MessageType.Reply].includes(message.type)) return;
    const at = new Date(message.createdTimestamp);
    const day = store.currentDay(at);
    if (store.completeQuest(config.guildId, message.author.id, day, 'community', at)) {
      void notify(message.author.id, 'community', day).catch(error => console.error('Lỗi thông báo Community (' + errorLabel(error) + ').'));
    }
  }));

  try {
    await client.login(config.token);
  } catch (error) {
    console.error('Không kết nối được Discord (' + errorLabel(error) + ').');
    await stop(1);
  }
}

try {
  await start(readConfig());
} catch (error) {
  console.error(error.constructor === Error ? error.message : errorLabel(error));
  process.exitCode = 1;
}
