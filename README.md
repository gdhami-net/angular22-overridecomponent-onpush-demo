# angular22-overridecomponent-onpush-demo

Companion to the post **"Test Angular 22 components with overrideComponent without
losing OnPush"**.

Angular 22 compiles a component with no `changeDetection` line as OnPush in an AOT
build. The `Component` decorator that runs at run time (JIT) still fills in Eager, and
`TestBed.overrideComponent` recompiles the component through that JIT path. This demo
shows what each spec really runs, and what the built app does with the same component.

## What it proves

`ConnectionBadge` (`src/app/connection-badge.ts`) has no `changeDetection` line. It sets
a plain field, `status`, from `'Checking...'` to `'Online'` when its `Pinger` answers
after one second. `StatusBar` holds the badge and a "details" button.

Each spec waits for the ping with Vitest fake timers, then calls `fixture.detectChanges()`.
"Compiled" is read off the class: an AOT build puts `ɵcmp` on it as a plain static field,
the JIT compiler defines it as a getter. `onPush` is the flag on that definition.

| spec | compiled | `onPush` | the badge shows |
| --- | --- | --- | --- |
| A: badge, plain TestBed | AOT | `true` | `Checking...` |
| B: badge, `overrideComponent` (fake `Pinger`) | JIT | `false` | `Checking...`, and `detectChanges()` throws NG0100 |
| B2: the same, override puts back the real `Pinger` | JIT | `false` | the same as B |
| C: `StatusBar`, plain TestBed, click "details" | AOT | `true` | `Checking...` |
| D: `StatusBar`, badge overridden, click "details" | JIT | `false` | `Online` (the test passes) |
| E: D with `changeDetection: OnPush` in the override | JIT | `true` | `Checking...` |
| fix 1: `changeDetection: OnPush` written on the component, overridden | JIT | `true` | `Checking...` |
| fix 2: `set: { changeDetection: OnPush }` in the override | JIT | `true` | `Checking...` |
| `TestBed.overrideProvider` instead of `overrideComponent` | AOT | `true` | `Checking...` |
| template reads a signal, plain / overridden | AOT / JIT | `true` / `false` | `Online` / `Online` |
| plain field set by a click in its own template, plain / overridden | AOT / JIT | `true` / `false` | `Online` / `Online` |
| control: `changeDetection: Eager` written, plain TestBed | AOT | `false` | `Checking...`, NG0100 |

The error B throws, from the test log:

```
Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'Checking...'. Current value: 'Online'. Expression location: _ConnectionBadge component.
```

The production build (`ng build`): the badge with no line and the badge with
`changeDetection: ChangeDetectionStrategy.OnPush` compile to the same definition, with no
`changeDetection` key. The Eager control gets `changeDetection:1`.

The built app in Edge, from `check.mjs`:

```
after 1.5 s:         no line "Checking..."  OnPush "Checking..."  Eager "Checking..."  signal "Online"
after click details: no line "Checking..."  OnPush "Checking..."  Eager "Online"  signal "Online"
```

So spec D passes on a view the built app never shows.

## Run it

```
npm ci
npm run check      # unit tests, ng build, the bundle, then the built app in Edge; every line must say PASS
npm test           # the unit tests only
npm start          # http://localhost:4200
```

`check.mjs` needs Edge installed. Set `BROWSER_CHANNEL=chrome` to use Chrome. It closes
the browser in `finally`, which removes the temporary profile Playwright made, and checks
that no profile folder was left in the temp folder.

## Versions

| tool | version |
| --- | --- |
| `@angular/core`, `@angular/compiler`, `@angular/compiler-cli` | 22.2.6 |
| `@angular/cli`, `@angular/build` | 22.2.7 |
| TypeScript | 6.0.3 |
| Vitest | 5.1.0 |
| jsdom | 31.0.1 |
| playwright-core | 1.65.1 |
| Node.js | 26.12.1 |
| npm | 11.20.0 |

Run on Windows 11 with Microsoft Edge 157.0.4341.60. The workspace came from `ng new` (zoneless, the
unit-test builder with Vitest), with the scaffold's page and router taken out.

## Where the JIT default comes from

`node_modules/@angular/core/fesm2022/_debug_node-chunk.mjs`, the `Component` decorator:

```js
const Component = makeDecorator('Component', (c = {}) => ({
  changeDetection: ChangeDetectionStrategy.Eager,
  ...c
}), ...
```

TestBed reads the decorator's arguments back through that function, so an override starts
from Eager when the component never wrote the line. The unit-test builder has no `aot`
option; it builds the specs with the build target's options, and the application builder's
`aot` defaults to `true`. Hence spec A runs the AOT definition.

Angular issue 70262 tracks it ("JIT (TestBed) still defaults changeDetection to Eager, AOT
correctly defaults to OnPush"). The fix, pull request 69898, was a draft in the "v23
candidates" milestone on 2026-11-16.

## What the post leaves out

- **NG0100 instead of a pass.** Tests are zoneless in Angular 22. `fixture.detectChanges()`
  then checks only views that something marked, so the overridden Eager badge is not
  refreshed on its own (B). The dev-mode check that follows does look at Eager views, sees
  the new value and throws. The Eager control does the same. The pass shows up once a parent
  is refreshed (D): a refreshed parent checks every Eager child with it.
- **The built app is zoneless too.** After the pings, even the Eager badge still says
  `Checking...`: a timer doesn't tell Angular anything. The click on "details" is what runs
  a pass. With zone.js the timer itself would run one. Not tested here.
- **A parent rendered earlier in the same file wins over a later override.**
  `stale-parent.spec.ts`: once `StatusBar` has rendered in one test, overriding
  `ConnectionBadge` in a later test of the same file does nothing, and the fake `Pinger` is
  called 0 times. That is why C, D and E sit in three files.
- **`overrideProvider` doesn't recompile.** It swaps the component's own provider and the
  definition stays the AOT one, OnPush.
- **After an override test, TestBed puts the AOT definition back** for the next test
  (`A again, after B`).
- **Signals and template events hide the gap.** A signal read in the template marks the view,
  and so does a listener in the component's own template. Both show `Online` either way.
- **`overrideTemplate` goes through `overrideComponent`** (`set: { template }`), so it should
  behave the same. Not tested here.

## License

MIT.
