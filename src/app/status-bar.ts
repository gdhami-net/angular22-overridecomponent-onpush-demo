import { Component } from '@angular/core';
import { ConnectionBadge } from './connection-badge';

// A parent with a button of its own. A click here makes Angular check this view again,
// and with it every child that is not OnPush.
@Component({
  selector: 'app-status-bar',
  imports: [ConnectionBadge],
  template: `
    <app-connection-badge />
    <button type="button" (click)="open = !open">details</button>
    @if (open) {
      <span class="details">region: eu-west</span>
    }
  `,
})
export class StatusBar {
  open = false;
}
