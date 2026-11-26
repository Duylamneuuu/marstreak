export const dailyQuestCount = 3;

export function createQuestPool(definitions, configuredKinds) {
  const quests = new Map(definitions.map(quest => [quest.kind, quest]));
  if (quests.size !== definitions.length) throw new Error('Quest kind phải duy nhất.');

  const enabled = configuredKinds === undefined
    ? definitions.filter(quest => quest.defaultEnabled).map(quest => quest.kind)
    : configuredKinds.split(',').map(kind => kind.trim());
  if (new Set(enabled).size !== enabled.length || enabled.some(kind => !quests.has(kind))) {
    throw new Error('LAB_QUEST_POOL chứa quest chưa đăng ký hoặc trùng nhau.');
  }
  if (enabled.length < dailyQuestCount) throw new Error('LAB_QUEST_POOL cần ít nhất 3 quest.');

  return {
    eligibleKinds(context) {
      return enabled.filter(kind => quests.get(kind).eligible(context));
    },
    name(kind) {
      return quests.get(kind)?.name ?? kind;
    },
    instruction(assignment, context) {
      return quests.get(assignment.kind)?.instruction(assignment, context) ?? 'Nhiệm vụ này đang tạm đóng.';
    },
    completeFromEvent(store, guildId, kind, event, observedAt = new Date()) {
      // Keep accepting verified completions for today's assignments when a kind
      // has been removed from the pool for new assignments.
      const proof = quests.get(kind)?.verify?.(event, observedAt);
      if (!proof) return null;
      const day = store.currentDay(proof.at);
      if (day !== store.currentDay(observedAt)) return null;
      return store.completeQuest(guildId, proof.userId, day, kind, proof.at, proof.startedAt)
        ? { userId: proof.userId, day } : null;
    },
  };
}
