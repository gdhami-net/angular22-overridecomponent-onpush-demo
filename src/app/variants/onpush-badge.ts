import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Pinger } from '../pinger';

// The same badge with the default written down.
@Component({
  selector: 'app-onpush-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [Pinger],
  template: `<span class="badge">{{ status }}</span>`,
})
export class OnPushBadge {
  status = 'Checking...';

  constructor() {
    inject(Pinger).ping().then(() => (this.status = 'Online'));
  }
}
