import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { openCheckInStore } from '../src/checkins.js';

function testStore(t, resetTime = '00:00') {
  const store = openCheckInStore(':memory:', resetTime);
  t.after(() => store.close());
  return store;
}

test('mỗi người chỉ ghi một lượt mỗi ngày và dữ liệu của hai người độc lập', t => {
  const store = testStore(t);
  const now = new Date('2026-11-18T02:00:00Z');

  assert.deepEqual(store.recordCheckIn('lab', 'duy', now), {
    day: '2026-11-18', streak: 1, created: true,
  });
  assert.deepEqual(store.recordCheckIn('lab', 'duy', now), {
    day: '2026-11-18', streak: 1, created: false,
  });
  assert.deepEqual(store.recordCheckIn('lab', 'nick-phu', now), {
    day: '2026-11-18', streak: 1, created: true,
  });
  assert.equal(store.recordCheckIn('another-server', 'duy', now).created, true);
});

test('qua 00:00 giờ Việt Nam tăng streak và bỏ một ngày bắt đầu lại từ một', t => {
  const store = testStore(t);

  assert.equal(store.recordCheckIn('lab', 'duy', new Date('2026-11-18T16:59:59Z')).day, '2026-11-18');
  assert.deepEqual(store.recordCheckIn('lab', 'duy', new Date('2026-11-18T17:00:00Z')), {
    day: '2026-11-19', streak: 2, created: true,
  });
  assert.deepEqual(store.recordCheckIn('lab', 'duy', new Date('2026-11-21T00:00:00Z')), {
    day: '2026-11-21', streak: 1, created: true,
  });
});

test('giờ reset thay đổi được và tính đúng khi lượt điểm danh đi qua năm mới', t => {
  const store = testStore(t, '04:30');

  assert.deepEqual(store.recordCheckIn('lab', 'duy', new Date('2026-12-31T21:29:59Z')), {
    day: '2026-12-31', streak: 1, created: true,
  });
  assert.deepEqual(store.recordCheckIn('lab', 'duy', new Date('2026-12-31T21:30:00Z')), {
    day: '2027-01-01', streak: 2, created: true,
  });
  assert.throws(() => openCheckInStore(':memory:', '24:00'), /CHECKIN_RESET_TIME/);
});

test('hai kết nối cùng dùng một file và đóng mở lại vẫn giữ lịch sử', t => {
  const dataDir = resolve('data');
  mkdirSync(dataDir, { recursive: true });
  const tempDir = mkdtempSync(join(dataDir, 'checkin-test-'));
  const databasePath = join(tempDir, 'test.sqlite');
  t.after(() => {
    rmSync(databasePath, { force: true });
    rmdirSync(tempDir);
  });

  const dayOne = new Date('2026-11-18T00:00:00Z');
  const dayTwo = new Date('2026-11-19T00:00:00Z');
  const first = openCheckInStore(databasePath);
  const second = openCheckInStore(databasePath);

  try {
    assert.equal(first.recordCheckIn('lab', 'duy', dayOne).created, true);
    assert.equal(second.recordCheckIn('lab', 'duy', dayOne).created, false);
    assert.equal(second.recordCheckIn('lab', 'duy', dayTwo).streak, 2);
  } finally {
    second.close();
    first.close();
  }

  const restarted = openCheckInStore(databasePath);
  try {
    assert.deepEqual(restarted.recordCheckIn('lab', 'duy', dayTwo), {
      day: '2026-11-19', streak: 2, created: false,
    });
  } finally {
    restarted.close();
  }
});
