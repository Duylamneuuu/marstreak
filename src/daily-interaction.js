import { MessageFlags } from 'discord.js';
import { makeCheckInReply } from './checkin-reply.js';
import { makeQuestBoard, makeQuestHelp, questHelpId, questRefreshId } from './quest-reply.js';

function displayDay(day) {
  return day.split('-').reverse().join('/');
}

export function createDailyInteractionHandler({
  config, store, pool, voice, isOnline, commandMention, readSourceBots, readReactionTarget,
}) {
  return async interaction => {
    if (interaction.guildId !== config.guildId) return;
    if (interaction.isButton() && interaction.customId === questHelpId) {
      return await interaction.reply({
        ...makeQuestHelp({ checkInCommand: commandMention('checkin'), questsCommand: commandMention('quests'), resetTime: config.resetTime }),
        flags: MessageFlags.Ephemeral,
      });
    }
    const refresh = interaction.isButton() && interaction.customId === questRefreshId;
    const command = interaction.isChatInputCommand() && interaction.commandName;
    if (!refresh && command !== 'checkin' && command !== 'quests') return;

    const accepted = isOnline();
    const acknowledgement = interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const reconnect = 'Wủy đang kết nối lại. Bạn thử sau một chút nha.';

    const at = new Date(interaction.createdTimestamp);
    const { guildId } = config;
    const userId = interaction.user.id;
    const day = store.currentDay(at);
    let checkIn;
    const saved = () => 'Đã ghi điểm danh ngày **' + displayDay(day) + '**.';
    const resetReply = () => (checkIn ? saved() + ' Chuỗi **' + checkIn.streak + ' ngày**. ' : '')
      + 'Đã sang ngày mới. Dùng ' + commandMention('checkin') + ' để nhận nhiệm vụ hôm nay.';

    try {
      // Persist Discord's receipt date independently of quest availability and API latency.
      try {
        if (accepted && command === 'checkin') checkIn = store.recordCheckIn(guildId, userId, at);
      } finally {
        await acknowledgement;
      }
      if (!accepted) return await interaction.editReply(reconnect);
      if (day !== store.currentDay()) return await interaction.editReply(resetReply());
      const context = interaction.inCachedGuild() ? {
        channels: interaction.guild.channels.cache, emojis: interaction.guild.emojis?.cache, member: interaction.member,
        botMember: interaction.guild.members.me, at,
      } : undefined;
      const needsTargets = context && !store.getQuests(guildId, userId, day).length;
      if (needsTargets && isOnline()) {
        const room = context.channels.get(config.reactionTarget?.channelId);
        [context.sourceBots, context.reactionMessage] = await Promise.all([
          readSourceBots(interaction.guild), readReactionTarget?.(room),
        ]);
        context.botMember = interaction.guild.members.me;
      }
      if (day !== store.currentDay()) return await interaction.editReply(resetReply());
      if (!isOnline()) return await interaction.editReply(checkIn ? saved() + ' ' + reconnect : reconnect);

      // Flush pre-assignment Voice time and use the grant time as the event-credit boundary.
      voice.checkpoint(userId, Date.now());
      const grantTime = new Date();
      if (store.currentDay(grantTime) !== day) return await interaction.editReply(resetReply());
      if (context) context.at = grantTime;
      const eligible = needsTargets ? pool.eligibleKinds(context) : [];
      const quests = store.questsAfterCheckIn(guildId, userId, grantTime, eligible, () => new Date());
      if (day !== store.currentDay()) return await interaction.editReply(resetReply());
      const board = await makeQuestBoard(quests, {
        pool, context, voiceSeconds: config.voiceSeconds, resetTime: config.resetTime,
        checkInCommand: commandMention('checkin'),
      });
      if (day !== store.currentDay()) return await interaction.editReply(resetReply());
      if (!checkIn) return await interaction.editReply(board);
      await interaction.editReply(makeCheckInReply({ ...checkIn, quests }));
      return await interaction.followUp(day === store.currentDay()
        ? { ...board, flags: MessageFlags.Ephemeral }
        : { content: resetReply(), flags: MessageFlags.Ephemeral });
    } catch (error) {
      const retry = day !== store.currentDay() ? resetReply()
        : checkIn ? saved() + ' Dùng ' + commandMention('quests') + ' để mở nhiệm vụ nha.'
        : 'Wủy chưa hiện được kết quả. Bạn thử lại ' + commandMention(command || 'quests') + ' sau một chút nha.';
      await interaction.editReply({ content: retry });
      throw error;
    }
  };
}
