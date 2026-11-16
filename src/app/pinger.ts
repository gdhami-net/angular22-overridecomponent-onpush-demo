import { Injectable } from '@angular/core';

// Stands in for a real "is the server there?" call: it answers after one second.
@Injectable()
export class Pinger {
  ping(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
