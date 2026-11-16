import { Component } from '@angular/core';
import { StatusBar } from './status-bar';
import { EagerBadge } from './variants/eager-badge';
import { OnPushBadge } from './variants/onpush-badge';
import { SignalBadge } from './variants/signal-badge';

// The page the browser check opens after `ng build`. The status bar holds the badge
// with no changeDetection line; the list holds the controls. Each badge's ping
// answers after one second.
@Component({
  selector: 'app-root',
  imports: [StatusBar, EagerBadge, OnPushBadge, SignalBadge],
  template: `
    <app-status-bar />
    <ul>
      <li id="onpush">changeDetection: OnPush: <app-onpush-badge /></li>
      <li id="eager">changeDetection: Eager: <app-eager-badge /></li>
      <li id="signal">no line, signal: <app-signal-badge /></li>
    </ul>
  `,
})
export class App {}
