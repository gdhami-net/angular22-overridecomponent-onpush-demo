import { Component, inject, signal } from '@angular/core';
import { Pinger } from '../pinger';

// No changeDetection line, but the template reads a signal.
@Component({
  selector: 'app-signal-badge',
  providers: [Pinger],
  template: `<span class="badge">{{ status() }}</span>`,
})
export class SignalBadge {
  status = signal('Checking...');

  constructor() {
    inject(Pinger).ping().then(() => this.status.set('Online'));
  }
}
