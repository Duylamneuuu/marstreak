import { mkdirSync, mkdtempSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

async function createBackup() {
  const source = resolve(process.env.CHECKIN_DB_PATH || 'data/checkins.sqlite');
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    const backupRoot = join(dirname(source), 'backups');
    mkdirSync(backupRoot, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = join(mkdtempSync(join(backupRoot, timestamp + '-')), basename(source));
    await backup(db, destination);

    const copy = new DatabaseSync(destination, { readOnly: true });
    try {
      const checks = copy.prepare('PRAGMA quick_check').all();
      if (checks.length !== 1 || checks[0].quick_check !== 'ok') {
        throw new Error('SQLite quick_check không đạt. Không dùng bản sao này để khôi phục.');
      }
    } finally {
      copy.close();
    }
    console.log('Backup SQLite hợp lệ: ' + destination);
  } finally {
    db.close();
  }
}

try {
  await createBackup();
} catch (error) {
  console.error('Backup thất bại. ' + error.message);
  process.exitCode = 1;
}
