import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Pinger } from '../pinger';

// Control: the same badge with Eager written down, to show what Eager does in the build.
@Component({
  selector: 'app-eager-badge',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [Pinger],
  template: `<span class="badge">{{ status }}</span>`,
})
export class EagerBadge {
  status = 'Checking...';

  constructor() {
    inject(Pinger).ping().then(() => (this.status = 'Online'));
  }
}
