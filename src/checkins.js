import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomInt } from 'node:crypto';

const vietnamTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function parseResetTime(value) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('CHECKIN_RESET_TIME phải có dạng HH:mm, ví dụ 00:00.');
  }

  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function previousDay(day) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function checkInDay(now, resetMinutes) {
  const parts = Object.fromEntries(
    vietnamTime.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  return localMinutes < resetMinutes ? previousDay(day) : day;
}

export function openCheckInStore(databasePath, resetTime = '00:00') {
  const resetMinutes = parseResetTime(resetTime);
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS checkins (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      checkin_day TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      PRIMARY KEY (guild_id, user_id, checkin_day)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS daily_quests (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      completed_at TEXT,
      voice_ms INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id,user_id,day,kind)
    ) STRICT;
  `);

  const insertCheckIn = db.prepare(`
    INSERT INTO checkins (guild_id, user_id, checkin_day, checked_in_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (guild_id, user_id, checkin_day) DO NOTHING
  `);
  const listDays = db.prepare(`
    SELECT checkin_day
    FROM checkins
    WHERE guild_id = ? AND user_id = ? AND checkin_day <= ?
    ORDER BY checkin_day DESC
  `);
  const listQuests = db.prepare(`
    SELECT kind, completed_at, voice_ms FROM daily_quests
    WHERE guild_id = ? AND user_id = ? AND day = ? ORDER BY rowid
  `);
  const insertQuest = db.prepare(`
    INSERT INTO daily_quests (guild_id, user_id, day, kind) VALUES (?, ?, ?, ?)
  `);
  const complete = db.prepare(`
    UPDATE daily_quests SET completed_at = ?
    WHERE guild_id = ? AND user_id = ? AND day = ? AND kind = ? AND completed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM checkins
      WHERE checkins.guild_id = daily_quests.guild_id
        AND checkins.user_id = daily_quests.user_id
        AND checkin_day = daily_quests.day AND checked_in_at <= ?
    )
  `);
  const creditVoice = db.prepare(`
    UPDATE daily_quests
    SET voice_ms = min(voice_ms + ?, ?),
        completed_at = CASE WHEN voice_ms + ? >= ? THEN ? END
    WHERE guild_id = ? AND user_id = ? AND day = ? AND kind = 'voice' AND completed_at IS NULL
    RETURNING completed_at
  `);

  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function getOrAssignQuests(guildId, userId, day, eligibleKinds) {
    const existing = listQuests.all(guildId, userId, day);
    if (existing.length) return existing;

    const pool = [...new Set(eligibleKinds)];
    if (pool.length < 3) throw new Error('Cần ít nhất 3 nhiệm vụ khác nhau đã xác minh.');
    for (let i = 0; i < 3; i++) {
      const j = i + randomInt(pool.length - i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
      insertQuest.run(guildId, userId, day, pool[i]);
    }
    return listQuests.all(guildId, userId, day);
  }

  return {
    getQuests(guildId, userId, day) {
      return listQuests.all(guildId, userId, day);
    },

    currentDay(now = new Date()) {
      return checkInDay(now, resetMinutes);
    },

    completeQuest(guildId, userId, day, kind, now = new Date()) {
      if (checkInDay(now, resetMinutes) !== day) return false;
      const occurredAt = now.toISOString();
      return complete.run(occurredAt, guildId, userId, day, kind, occurredAt).changes === 1;
    },

    addVoiceTime(guildId, userId, day, milliseconds, threshold, now) {
      const result = creditVoice.get(milliseconds, threshold, milliseconds, threshold,
        now.toISOString(), guildId, userId, day);
      return Boolean(result?.completed_at);
    },
    recordCheckIn(guildId, userId, now = new Date(), eligibleKinds) {
      const day = checkInDay(now, resetMinutes);
      return transaction(() => {
        const result = insertCheckIn.run(guildId, userId, day, now.toISOString());
        let expectedDay = day;
        let streak = 0;

        for (const row of listDays.iterate(guildId, userId, day)) {
          if (row.checkin_day !== expectedDay) break;
          streak += 1;
          expectedDay = previousDay(expectedDay);
        }

        const checkIn = { day, streak, created: result.changes === 1 };
        if (eligibleKinds) checkIn.quests = getOrAssignQuests(guildId, userId, day, eligibleKinds);
        return checkIn;
      });
    },

    close() {
      db.close();
    },
  };
}
