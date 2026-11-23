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
