import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  elapsedSessionMinutes,
} from '../session-math.ts';

test('elapsedSessionMinutes rounds a sub-minute session up to 1', () => {
  const now = new Date('2026-03-01T10:00:30.000Z');
  assert.equal(elapsedSessionMinutes('2026-03-01T10:00:00.000Z', now), MIN_SESSION_MINUTES);
});

test('elapsedSessionMinutes converts hours to whole minutes', () => {
  const now = new Date('2026-03-01T10:45:00.000Z');
  assert.equal(elapsedSessionMinutes('2026-03-01T10:00:00.000Z', now), 45);
});

test('elapsedSessionMinutes rounds partial minutes up so a session is never 0', () => {
  const now = new Date('2026-03-01T10:05:01.000Z');
  assert.equal(elapsedSessionMinutes('2026-03-01T10:00:00.000Z', now), 6);
});

test('elapsedSessionMinutes clamps a clock jump to the minimum', () => {
  // A negative span (device clock changed mid-session) must not be sent to the
  // API, which rejects anything below 1 minute.
  const now = new Date('2026-03-01T09:55:00.000Z');
  assert.equal(elapsedSessionMinutes('2026-03-01T10:00:00.000Z', now), MIN_SESSION_MINUTES);
});

test('elapsedSessionMinutes clamps a forgotten session to the API maximum', () => {
  const now = new Date('2026-03-01T18:00:00.000Z');
  assert.equal(elapsedSessionMinutes('2026-03-01T10:00:00.000Z', now), MAX_SESSION_MINUTES);
});

test('elapsedSessionMinutes falls back to the minimum for a missing start time', () => {
  assert.equal(elapsedSessionMinutes(undefined), MIN_SESSION_MINUTES);
  assert.equal(elapsedSessionMinutes(null), MIN_SESSION_MINUTES);
  assert.equal(elapsedSessionMinutes(''), MIN_SESSION_MINUTES);
});

test('elapsedSessionMinutes falls back to the minimum for an unparseable date', () => {
  assert.equal(elapsedSessionMinutes('not-a-date'), MIN_SESSION_MINUTES);
});

test('elapsedSessionMinutes always lands inside the range the API accepts', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');
  const spans = ['2026-03-01T11:59:59.999Z', '2026-03-01T00:00:01.000Z', '2019-01-01T00:00:00.000Z'];
  for (const start of spans) {
    const value = elapsedSessionMinutes(start, now);
    assert.ok(value >= MIN_SESSION_MINUTES && value <= MAX_SESSION_MINUTES, `${start} produced ${value}`);
  }
});
