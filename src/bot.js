import {
  Client, Events, GatewayIntentBits,
  Routes, SlashCommandBuilder,
} from 'discord.js';
import { readConfig } from './config.js';
import { createQuestBotReader, createReactionTargetReader, verifyTargets } from './lab-targets.js';
import { createNotificationQueue, deliverQuestUpdate } from './quest-notification.js';
import { createDailyInteractionHandler } from './daily-interaction.js';
import { makeQuestUpdate } from './quest-reply.js';
import { openCheckInStore } from './checkins.js';
import { trackVoice, voiceTickMs } from './voice-quests.js';
import { createQuestPool, enabledQuestKinds } from './quest-pool.js';
import { createNativeQuests } from './native-quests.js';
import { createPollQuest } from './poll-quest.js';
import { createLabCommandQuests } from './integrations/lab-command-quests.js';

const commands = [
  new SlashCommandBuilder().setName('checkin').setDescription('Điểm danh, giữ chuỗi và nhận ba nhiệm vụ hôm nay.'),
  new SlashCommandBuilder().setName('quests').setDescription('Xem cách làm và tiến độ ba nhiệm vụ hôm nay.'),
];

function errorLabel(error) {
  return (error?.name || 'Error') + (error?.code ? ' (' + error.code + ')' : '');
}

async function start(config) {
  const commandIds = new Map();
  const commandQuests = createLabCommandQuests(config);
  const definitions = [...createNativeQuests(config), createPollQuest(config.pollTarget, config.resetTime), ...commandQuests];
  const pool = createQuestPool(definitions, config.questKinds);
  const enabled = enabledQuestKinds(config.questKinds);
  const sourceIds = [...new Set(commandQuests.filter(quest => enabled.includes(quest.kind)).map(quest => quest.sourceBotId))];
  const readSourceBots = createQuestBotReader(sourceIds);
  const readReactionTarget = createReactionTargetReader(config.reactionTarget);
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
  let disconnectedAt;

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
      for (const [id, member] of await readSourceBots(guild)) {
        if (!member) console.warn('Tạm dừng giao quest từ bot ' + id + '. Kiểm tra app trong server.');
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

  client.on(Events.InteractionCreate, handle('Lỗi lệnh DC1', createDailyInteractionHandler({
    config, store, pool, voice, commandMention, readSourceBots,
    readReactionTarget: enabled.includes('reaction') ? readReactionTarget : undefined,
    isOnline: () => online && !stopping,
  })));

  // One test guild. Clear the clock on both resumable and terminal disconnects.
  function disconnect() {
    if (initialized) disconnectedAt ??= new Date();
    pause();
  }

  function gatewayReady() {
    disconnectedAt = undefined;
    resume();
  }

  client.on(Events.ShardDisconnect, disconnect);
  client.on(Events.ShardReconnecting, disconnect);
  client.on(Events.ShardReady, handle('Lỗi khôi phục Voice', gatewayReady));
  client.on(Events.ShardResume, handle('Lỗi khôi phục Voice', gatewayReady));
  client.on(Events.GuildUnavailable, guild => {
    if (guild.id === config.guildId) pause();
  });
  client.on(Events.GuildAvailable, handle('Lỗi khôi phục Voice', guild => {
    if (guild.id === config.guildId && !disconnectedAt) resume();
  }));

  client.on(Events.VoiceStateUpdate, handle('Lỗi theo dõi Voice', (before, after) => {
    if (online && after.guild.id === config.guildId && before.channelId !== after.channelId) {
      voice.update(after.id, eligible(after));
    }
  }));

  function completeQuestFromEvent(kind, event) {
    if (!initialized || (!online && !disconnectedAt)) return;
    const result = pool.completeFromEvent(store, config.guildId, kind, event, new Date(), disconnectedAt);
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
