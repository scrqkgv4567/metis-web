import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime } from '../app/history/page';

test('formatTime returns 00:00:00 for non-positive values', () => {
  assert.equal(formatTime(0), '00:00:00');
  assert.equal(formatTime(-1000), '00:00:00');
});

test('formatTime formats milliseconds into hh:mm:ss', () => {
  assert.equal(formatTime(5000), '00:00:05');
  assert.equal(formatTime(61000), '00:01:01');
  assert.equal(formatTime(3661000), '01:01:01');
});
