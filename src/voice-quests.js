export const voiceThresholdMs = 120_000;
export const voiceTickMs = 5_000;

export function trackVoice(store, guildId, onComplete, thresholdMs = voiceThresholdMs) {
  const active = new Map();

  function checkpoint(userId, now) {
    const previous = active.get(userId);
    if (previous === undefined) return;
    const elapsed = now - previous;
    const at = new Date(now);
    const day = store.currentDay(at);
    // Skip clock jumps, suspend gaps, and intervals straddling the reset.
    const observed = elapsed > 0 && elapsed <= 3 * voiceTickMs
      && day === store.currentDay(new Date(previous));
    const completed = observed && store.addVoiceTime(guildId, userId, day, elapsed, thresholdMs, at);
    active.set(userId, now);
    if (completed) onComplete(userId, day);
  }

  return {
    checkpoint,
    update(userId, eligible, now = Date.now()) {
      checkpoint(userId, now);
      if (eligible) active.set(userId, now);
      else active.delete(userId);
    },
    tick(now = Date.now()) {
      for (const userId of active.keys()) checkpoint(userId, now);
    },
    pause() {
      active.clear();
    },
  };
}
