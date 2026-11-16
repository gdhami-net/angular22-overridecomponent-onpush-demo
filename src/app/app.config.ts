import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// Zoneless, as `ng new` sets it up in Angular 22: no zone.js, no zone provider.
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
