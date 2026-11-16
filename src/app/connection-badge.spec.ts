import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionBadge } from './connection-badge';
import { Pinger } from './pinger';
import { badgeText, report } from './testing/probe';

// Spec A and spec B are the same test. B adds one overrideComponent call,
// the usual way to swap a provider that the component declares itself.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('A: plain TestBed', () => {
  it('keeps "Checking..." after the timer, like the built app', async () => {
    const fixture = TestBed.createComponent(ConnectionBadge);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();

    const row = report('A plain TestBed', ConnectionBadge, fixture);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true });
    expect(badgeText(fixture)).toBe('Checking...');
  });
});

describe('B: the same test with overrideComponent', () => {
  it('throws NG0100 on the second detectChanges()', async () => {
    TestBed.overrideComponent(ConnectionBadge, {
      set: { providers: [{ provide: Pinger, useValue: { ping: () => Promise.resolve() } }] },
    });
    const fixture = TestBed.createComponent(ConnectionBadge);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(1000);
    expect(() => fixture.detectChanges()).toThrow(/NG0100/);

    const row = report('B overrideComponent, fake Pinger', ConnectionBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: false });
    expect(badgeText(fixture)).toBe('Checking...');
  });

  it('does the same when the override puts back the real Pinger, so the fake is not the cause', async () => {
    TestBed.overrideComponent(ConnectionBadge, { set: { providers: [Pinger] } });
    const fixture = TestBed.createComponent(ConnectionBadge);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(1000);
    expect(() => fixture.detectChanges()).toThrow(/NG0100/);

    const row = report('B2 overrideComponent, real Pinger', ConnectionBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: false, view: 'Checking...' });
  });
});

describe('after an override test', () => {
  it('TestBed puts the AOT definition back for the next test', async () => {
    const fixture = TestBed.createComponent(ConnectionBadge);
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();

    const row = report('A again, after B', ConnectionBadge, fixture);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true, view: 'Checking...' });
  });
});
