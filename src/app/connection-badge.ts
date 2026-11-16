import { Component, inject } from '@angular/core';
import { Pinger } from './pinger';

// No changeDetection line: Angular 22 compiles this as OnPush in an AOT build.
@Component({
  selector: 'app-connection-badge',
  providers: [Pinger],
  template: `<span class="badge">{{ status }}</span>`,
})
export class ConnectionBadge {
  status = 'Checking...';

  constructor() {
    inject(Pinger).ping().then(() => (this.status = 'Online'));
  }
}
