import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionBadge } from './connection-badge';
import { StatusBar } from './status-bar';
import { badgeText, compiledHow, isOnPush } from './testing/probe';

// One scenario per file: once StatusBar has rendered in a test, a later override of
// ConnectionBadge in the same file is ignored (see stale-parent.spec.ts).
// The parent's spec swaps the badge's own provider. The same steps as the browser check:
// wait for the ping, click "details", look at the badge.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function waitThenClickDetails() {
  const fixture = TestBed.createComponent(StatusBar);
  fixture.detectChanges();

  await vi.advanceTimersByTimeAsync(1000);
  fixture.nativeElement.querySelector('button').click();
  fixture.detectChanges();
  return fixture;
}

function log(label: string, view: string) {
  const row = { label, compiled: compiledHow(ConnectionBadge), onPush: isOnPush(ConnectionBadge), view };
  console.log('RESULT ' + JSON.stringify(row));
  return row;
}

describe('StatusBar, plain TestBed', () => {
  it('the badge keeps "Checking..." after the click, like the built app', async () => {
    const fixture = await waitThenClickDetails();
    const row = log('C StatusBar, plain TestBed', badgeText(fixture));
    expect(row).toMatchObject({ compiled: 'AOT', onPush: true, view: 'Checking...' });
  });
});
