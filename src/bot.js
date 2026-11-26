import {
  Client, Events, GatewayIntentBits, MessageFlags,
  Routes, SlashCommandBuilder,
} from 'discord.js';
import { resolve } from 'node:path';
import { verifyTargets } from './lab-targets.js';
import { createNotificationQueue, deliverQuestUpdate } from './quest-notification.js';
import { makeCheckInReply } from './checkin-reply.js';
import { makeQuestBoard, makeQuestUpdate, questRefreshId } from './quest-reply.js';
import { openCheckInStore, parseResetTime } from './checkins.js';
import { trackVoice, voiceThresholdMs, voiceTickMs } from './voice-quests.js';
import { createQuestPool } from './quest-pool.js';
import { createNativeQuests } from './native-quests.js';
import { createPollQuest, readPollTarget } from './poll-quest.js';
import { createLabCommandQuests } from './integrations/lab-command-quests.js';

const snowflake = /^\d{17,20}$/;
const commands = [
  new SlashCommandBuilder().setName('checkin').setDescription('Điểm danh, giữ chuỗi và nhận ba nhiệm vụ hôm nay.'),
  new SlashCommandBuilder().setName('quests').setDescription('Xem cách làm và tiến độ ba nhiệm vụ hôm nay.'),
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
  const hasLegacyReactionTarget = ['LAB_REACTION_CHANNEL_ID', 'LAB_REACTION_MESSAGE_ID', 'LAB_REACTION_EMOJI']
    .every(key => env[key]?.trim());
  const reactionMode = env.LAB_REACTION_MODE?.trim() || (hasLegacyReactionTarget ? 'target' : 'any');
  if (!['any', 'target'].includes(reactionMode)) throw new Error('LAB_REACTION_MODE cần là any hoặc target.');
  let reactionTarget;
  if (reactionMode === 'target') {
    const emoji = env.LAB_REACTION_EMOJI?.trim();
    if (!emoji || (!snowflake.test(emoji) && !/\p{Emoji}/u.test(emoji))) {
      throw new Error('LAB_REACTION_EMOJI cần là emoji Unicode hoặc ID emoji tùy chỉnh.');
    }
    reactionTarget = { channelId: id('LAB_REACTION_CHANNEL_ID'), messageId: id('LAB_REACTION_MESSAGE_ID'), emoji };
  }
  return {
    token, appId, guildId, resetTime, voiceIds, voiceSeconds, reactionTarget,
    databasePath: resolve(env.CHECKIN_DB_PATH || 'data/checkins.sqlite'),
    threadId: env.LAB_COMMUNITY_THREAD_ID?.trim() ? id('LAB_COMMUNITY_THREAD_ID') : undefined,
    pollTarget: readPollTarget(guildId, env.LAB_POLL_MESSAGE_URL, env.LAB_POLL_CLOSES_AT, env.LAB_QUEST_POOL),
    questKinds: env.LAB_QUEST_POOL,
    dynoRollChannel: env.LAB_DYNO_ROLL_CHANNEL_ID ? id('LAB_DYNO_ROLL_CHANNEL_ID') : undefined,
    zodiacLikesChannel: env.LAB_ZODIAC_LIKES_CHANNEL_ID ? id('LAB_ZODIAC_LIKES_CHANNEL_ID') : undefined,
    wheatTarotChannel: env.LAB_WHEAT_TAROT_CHANNEL_ID ? id('LAB_WHEAT_TAROT_CHANNEL_ID') : undefined,
    zodiacExtrasChannel: env.LAB_ZODIAC_QUEST_CHANNEL_ID ? id('LAB_ZODIAC_QUEST_CHANNEL_ID') : undefined,
    wheatCoinflipChannel: env.LAB_WHEAT_COINFLIP_CHANNEL_ID ? id('LAB_WHEAT_COINFLIP_CHANNEL_ID') : undefined,
    asterieChannel: env.LAB_ASTERIE_QUEST_CHANNEL_ID ? id('LAB_ASTERIE_QUEST_CHANNEL_ID') : undefined,
  };
}

function errorLabel(error) {
  return (error?.name || 'Error') + (error?.code ? ' (' + error.code + ')' : '');
}

async function start(config) {
  const commandIds = new Map();
  const sourceBots = new Map();
  const commandQuests = createLabCommandQuests(config);
  const definitions = [...createNativeQuests(config), createPollQuest(config.pollTarget, config.resetTime), ...commandQuests];
  const pool = createQuestPool(definitions, config.questKinds);
  const store = openCheckInStore(config.databasePath, config.resetTime);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
      ...(config.pollTarget ? [GatewayIntentBits.GuildMessagePolls] : [])],
    rest: { timeout: 10_000, retries: 2 },
  });
  function commandMention(name) {
    const id = commandIds.get(name);
    return id ? '</' + name + ':' + id + '>' : '`/' + name + '`';
  }

  let initialized = false;
  let online = false;
  let stopping = false;
  let voiceTimer;

  const enqueue = createNotificationQueue();
  function notify(userId, kind, day) {
    const progress = store.getQuests(config.guildId, userId, day);
    return enqueue(userId, async () => {
      const visual = await makeQuestUpdate(progress, kind, { pool, voiceSeconds: config.voiceSeconds });
      await deliverQuestUpdate(client.users, userId, visual, error => {
        console.log('Không gửi được DM (' + errorLabel(error) + '). Xem /quests để kiểm tra tiến độ.');
      });
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
      await verifyTargets(guild, config);
      for (const id of new Set(commandQuests.map(quest => quest.sourceBotId))) {
        try {
          const bot = await guild.members.fetch(id);
          if (bot.user.bot) sourceBots.set(id, bot);
        } catch (error) {
          console.warn('Tạm dừng giao quest từ bot ' + id + ' (' + errorLabel(error) + ').');
        }
      }
      for (const command of commands) {
        const registered = await readyClient.rest.post(Routes.applicationGuildCommands(config.appId, guild.id), {
          body: command.toJSON(),
        });
        commandIds.set(command.name, registered.id);
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
    if (interaction.guildId !== config.guildId) return;
    const refresh = interaction.isButton() && interaction.customId === questRefreshId;
    const command = interaction.isChatInputCommand() && ['checkin', 'quests'].includes(interaction.commandName);
    if (!refresh && !command) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!online) {
      await interaction.editReply('Wủy đang kết nối lại. Bạn thử sau một chút nha.');
      return;
    }

    let checkInShown = false;
    try {
      const at = new Date(interaction.createdTimestamp);
      const userId = interaction.user.id;
      const context = interaction.inCachedGuild() ? {
        channels: interaction.guild.channels.cache,
        member: interaction.member,
        botMember: interaction.guild.members.me,
        sourceBots,
        at,
      } : undefined;
      const boardOptions = {
        pool, context, voiceSeconds: config.voiceSeconds, resetTime: config.resetTime,
        checkInCommand: commandMention('checkin'),
      };
      voice.checkpoint(userId, Date.now());
      const eligibleKinds = context ? pool.eligibleKinds(context) : [];
      if (refresh || interaction.commandName === 'quests') {
        const quests = store.questsAfterCheckIn(config.guildId, userId, at, eligibleKinds);
        await interaction.editReply(await makeQuestBoard(quests, boardOptions));
        return;
      }
      const result = store.recordCheckIn(config.guildId, userId, at, eligibleKinds);
      await interaction.editReply(makeCheckInReply(result));
      checkInShown = true;
      await interaction.followUp({
        ...await makeQuestBoard(result.quests, boardOptions),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Không trả được ' + (refresh ? 'tiến độ' : '/' + interaction.commandName) + ' (' + errorLabel(error) + ').');
      if (checkInShown) {
        await interaction.editReply({ content: 'Điểm danh đã lưu. Dùng ' + commandMention('quests') + ' để mở nhiệm vụ nha.' });
      } else if (refresh) {
        await interaction.editReply('Wủy chưa mở được tiến độ. Bạn thử lại sau một chút nha.');
      } else {
        await interaction.editReply('Wủy chưa hiện được kết quả. Bạn thử lại ' + commandMention(interaction.commandName) + ' sau một chút nha.');
      }
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

  function completeQuestFromEvent(kind, event) {
    if (!online) return;
    const result = pool.completeFromEvent(store, config.guildId, kind, event);
    if (result) return notify(result.userId, kind, result.day);
  }

  client.on(Events.Raw, handle('Lỗi Reaction', packet => completeQuestFromEvent('reaction', packet)));
  if (config.pollTarget) {
    client.on(Events.Raw, handle('Lỗi Bình chọn', packet => completeQuestFromEvent('poll', packet)));
  }
  client.on(Events.Raw, handle('Lỗi quest slash command', packet => {
    if (packet.t !== 'MESSAGE_CREATE') return;
    for (const quest of commandQuests) {
      const notification = completeQuestFromEvent(quest.kind, packet);
      if (notification) return notification;
    }
  }));
  client.on(Events.MessageCreate, handle('Lỗi Community', message => completeQuestFromEvent('community', message)));

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
