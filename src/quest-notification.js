import { dailyQuestCount } from './quest-pool.js';

export async function deliverQuestUpdate(users, userId, content, onError) {
  try {
    const message = typeof content === 'string' ? { content } : content;
    await users.send(userId, {
      ...message,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    onError(error);
  }
}

export function createNotificationQueue() {
  const pending = new Map();
  return (userId, send) => {
    const previous = pending.get(userId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(send);
    pending.set(userId, next);
    return next.finally(() => {
      if (pending.get(userId) === next) pending.delete(userId);
    });
  };
}

export function createQuestCompletionNotifier({ enabled, getQuests, send }) {
  const enqueue = createNotificationQueue();
  // Called only after SQLite records a new completion.
  return async (userId, kind, day) => {
    if (!enabled) return;
    const quests = getQuests(userId, day);
    if (quests.length !== dailyQuestCount || !quests.every(quest => quest.completed_at)) return;
    await enqueue(userId, () => send(userId, kind, quests));
  };
}
