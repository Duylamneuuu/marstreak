export const voiceThresholdMs = 120_000;
export const voiceTickMs = 5_000;

export function voiceProgress(assignment, goalSeconds) {
  const elapsed = assignment.completed_at ? goalSeconds
    : Math.min(goalSeconds, Math.floor((assignment.voice_ms ?? 0) / 1000));
  const clock = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  return clock(elapsed) + ' / ' + clock(goalSeconds);
}

export function trackVoice(store, guildId, onComplete, thresholdMs = voiceThresholdMs) {
  const active = new Map();

  function observedTime(previous, now, day) {
    const elapsed = now - previous;
    // Skip clock jumps, suspend gaps, and intervals straddling the reset.
    return elapsed > 0 && elapsed <= 3 * voiceTickMs
      && day === store.currentDay(new Date(previous)) ? elapsed : 0;
  }

  function checkpoint(userId, now) {
    const previous = active.get(userId);
    if (previous === undefined) return;
    const at = new Date(now);
    const day = store.currentDay(at);
    const elapsed = observedTime(previous, now, day);
    const completed = elapsed > 0 && store.addVoiceTime(guildId, userId, day, elapsed, thresholdMs, at);
    active.set(userId, now);
    if (completed) onComplete(userId, day);
  }

  return {
    checkpoint,
    update(userId, eligible, now = Date.now()) {
      try {
        checkpoint(userId, now);
      } finally {
        if (eligible) active.set(userId, now);
        else active.delete(userId);
      }
    },
    tick(now = Date.now()) {
      if (active.size === 0) return;
      const at = new Date(now);
      const day = store.currentDay(at);
      const intervals = [];
      for (const [userId, previous] of active) {
        const elapsed = observedTime(previous, now, day);
        if (elapsed > 0) intervals.push({ userId, elapsed });
      }
      const completed = intervals.length ? store.addVoiceBatch(guildId, day, intervals, thresholdMs, at) : [];
      for (const userId of active.keys()) active.set(userId, now);
      for (const userId of completed) onComplete(userId, day);
    },
    pause() {
      active.clear();
    },
  };
}
