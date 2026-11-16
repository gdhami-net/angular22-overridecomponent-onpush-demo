import { ChangeDetectionStrategy, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionBadge } from './connection-badge';
import { Pinger } from './pinger';
import { report } from './testing/probe';
import { ClickBadge } from './variants/click-badge';
import { EagerBadge } from './variants/eager-badge';
import { OnPushBadge } from './variants/onpush-badge';
import { SignalBadge } from './variants/signal-badge';

const fakePinger = { provide: Pinger, useValue: { ping: () => Promise.resolve() } };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function afterTimer<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await vi.advanceTimersByTimeAsync(1000);
  fixture.detectChanges();
  return fixture;
}

describe('fix 1: write OnPush on the component', () => {
  it('the overridden spec now keeps "Checking...", like the build', async () => {
    TestBed.overrideComponent(OnPushBadge, { set: { providers: [fakePinger] } });
    const fixture = await afterTimer(OnPushBadge);
    const row = report('fix 1 OnPush on the component, overridden', OnPushBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: true, view: 'Checking...' });
  });
});

describe('fix 2: set changeDetection inside the override', () => {
  it('also keeps "Checking..."', async () => {
    TestBed.overrideComponent(ConnectionBadge, {
      set: {
        providers: [fakePinger],
        changeDetection: ChangeDetectionStrategy.OnPush,
      },
    });
    const fixture = await afterTimer(ConnectionBadge);
    const row = report('fix 2 changeDetection in the override', ConnectionBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: true, view: 'Checking...' });
  });
});

describe('overrideProvider instead of overrideComponent', () => {
  it('swaps the component-level provider without recompiling, so OnPush stays', async () => {
    let calls = 0;
    TestBed.configureTestingModule({ imports: [ConnectionBadge] });
    TestBed.overrideProvider(Pinger, { useValue: { ping: () => (calls++, Promise.resolve()) } });
    const fixture = await afterTimer(ConnectionBadge);
    const row = report('overrideProvider, fake Pinger', ConnectionBadge, fixture);
    expect(calls).toBe(1);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true, view: 'Checking...' });
  });
});

describe('a template that reads a signal', () => {
  it('shows "Online" with plain TestBed', async () => {
    const fixture = await afterTimer(SignalBadge);
    const row = report('signal, plain TestBed', SignalBadge, fixture);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true, view: 'Online' });
  });

  it('shows "Online" with overrideComponent too, so the gap is hidden', async () => {
    TestBed.overrideComponent(SignalBadge, { set: { providers: [fakePinger] } });
    const fixture = await afterTimer(SignalBadge);
    const row = report('signal, overrideComponent', SignalBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: false, view: 'Online' });
  });
});

describe('a plain field changed by a click in its own template', () => {
  async function clickThenCheck() {
    const fixture = TestBed.createComponent(ClickBadge);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    return fixture;
  }

  it('shows "Online" with plain TestBed', async () => {
    const fixture = await clickThenCheck();
    const row = report('click, plain TestBed', ClickBadge, fixture);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true, view: 'Online' });
  });

  it('shows "Online" with overrideComponent too', async () => {
    TestBed.overrideComponent(ClickBadge, { set: { providers: [] } });
    const fixture = await clickThenCheck();
    const row = report('click, overrideComponent', ClickBadge, fixture);
    expect(row).toMatchObject({ compiled: 'JIT', onPush: false, view: 'Online' });
  });
});

describe('control: Eager written on the component', () => {
  it('throws NG0100 like the overridden spec, so the override really means Eager', async () => {
    const fixture = TestBed.createComponent(EagerBadge);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    expect(() => fixture.detectChanges()).toThrow(/NG0100/);
    const row = report('Eager on the component, plain TestBed', EagerBadge, fixture);
    expect(row).toMatchObject({ compiled: 'AOT', onPush: false, view: 'Checking...' });
  });
});
