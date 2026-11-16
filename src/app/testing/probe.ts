import { Type } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';

// What the spec really ran. An AOT build puts the component definition on the class as a
// plain static field. The JIT compiler (the Component decorator at run time, or TestBed
// recompiling after an override) defines it as a getter instead.
export function compiledHow(type: Type<unknown>): 'AOT' | 'JIT' {
  const d = Object.getOwnPropertyDescriptor(type, 'ɵcmp');
  if (!d) return 'JIT';
  return 'value' in d ? 'AOT' : 'JIT';
}

// The flag Angular's runtime reads to decide whether a view is checked on every pass.
export function isOnPush(type: Type<unknown>): boolean {
  return (type as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush;
}

export function badgeText(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).querySelector('.badge')!.textContent!.trim();
}

// One line per spec, picked up by check.mjs.
export function report(label: string, type: Type<unknown>, fixture: ComponentFixture<unknown>) {
  const row = { label, compiled: compiledHow(type), onPush: isOnPush(type), view: badgeText(fixture) };
  console.log('RESULT ' + JSON.stringify(row));
  return row;
}
