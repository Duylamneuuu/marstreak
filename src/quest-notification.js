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
