import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConnectionBadge } from './connection-badge';
import { Pinger } from './pinger';
import { StatusBar } from './status-bar';
import { badgeText } from './testing/probe';

// Not in the post: once StatusBar has rendered in one test, overriding its child in a
// later test of the same file does nothing. The fake is never called.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function run(override: boolean) {
  let calls = 0;
  if (override) {
    TestBed.overrideComponent(ConnectionBadge, {
      set: { providers: [{ provide: Pinger, useValue: { ping: () => (calls++, Promise.resolve()) } }] },
    });
  }
  const fixture = TestBed.createComponent(StatusBar);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(1000);
  fixture.nativeElement.querySelector('button').click();
  fixture.detectChanges();
  return { calls, view: badgeText(fixture) };
}

it('first test renders StatusBar with no override', async () => {
  expect(await run(false)).toEqual({ calls: 0, view: 'Checking...' });
});

it('a later override of the badge is ignored', async () => {
  const r = await run(true);
  console.log('RESULT ' + JSON.stringify({ label: 'stale parent: override after an earlier render', ...r }));
  expect(r).toEqual({ calls: 0, view: 'Checking...' });
});
