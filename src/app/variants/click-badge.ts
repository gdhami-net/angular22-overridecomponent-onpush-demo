import { Component } from '@angular/core';

// No changeDetection line, plain field, but the change comes from a click in its own template.
@Component({
  selector: 'app-click-badge',
  template: `<button type="button" (click)="status = 'Online'">check</button>
    <span class="badge">{{ status }}</span>`,
})
export class ClickBadge {
  status = 'Checking...';
}
