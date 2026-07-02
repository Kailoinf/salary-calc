# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (lockfile present). There is **no test framework and no linter**.

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc && vite build`; **tsc runs in strict mode and the build fails on any type error.** This is the de-facto typecheck — run it before considering work done.
- `pnpm preview` — serve the built `dist/`

No test runner exists. To sanity-check calc logic, log inside `recalcSingle`/`recalcMulti` and reload, or drop a throwaway `console.assert` in the calc function.

## Architecture

Pure frontend, **zero backend, no framework** — Vite + TypeScript (strict) driving plain DOM via `innerHTML`. Static structure and element IDs live in `index.html`; everything dynamic is rendered from `src/main.ts`.

**Data flow** (one direction, recalculated on every input change):
`index.html` IDs → `main.ts` (reads DOM, zod-validates, calls calc) → `salary.ts` / `date.ts` → `main.ts` renders result tables back into the DOM.

### Calc pipeline (the core — three files, in dependency order)

1. `holidays.ts` — `getLegalHolidays(year)` returns legal holidays **as a pure algorithm** (`lunar-typescript` computes lunar dates + the 清明 solar term). No hardcoded year tables — it works for any year. Spring Festival = 除夕 + 初一~初三.
2. `date.ts` — `getWorkDaysInMonth(...)` classifies every day of the month into shift types (A/B/C/F) and counts night shifts. **This is the trickiest logic in the repo.**
3. `salary.ts` — `calcMonthlySalary` / `calcMultiMonth` do the money math on top of the day stats.

Two non-obvious rules implemented there:

- **Shift-rotation seam**: the *first rest day (C班) of the month* is the boundary. Days before it use `prevShiftType`; days from it onward use `currShiftType`. This is why `MonthlyInput` carries `prevShiftType` — the month straddles two shift cycles. In single-month mode `prevShiftType` is the inverse of the current shift; in multi-month mode it's inferred from the previous month.
- **Holiday conflict shift**: when a legal holiday lands on a B or C day, the rest day is bumped forward one or two days (`shiftedBDates` / `shiftedCDates` in `getWorkDaysInMonth`), valid only for that week. Pass 1 collects holidays + computes these shifts; pass 2 classifies each day by priority **F (holiday) > C (rest) > B|A (work)**.

### The `ensureX` render pattern (critical to preserve)

`main.ts` dynamically renders several checkbox/select grids (`ensureNoOvertimeDates`, `ensureBDay8hDates`, `ensureRestdayWeekdayInputs`, `ensureShiftInputs`). Each **guards its `innerHTML` rewrite with a `data-sig` signature** and skips the rebuild when the signature is unchanged. This exists so typing in an input or toggling a checkbox doesn't blow away focus / checkbox state on every keystroke. **When editing these functions, keep the signature check — losing it reintroduces focus-loss bugs.** User state (checked dates, per-month selects) is persisted in module-level `Map`/`Set` keyed by `"year-month"` / `"year-month-date"`, not in the DOM.

### Single vs multi module

Two parallel UIs behind a tab switch; element IDs are namespaced `single-*` and `multi-*`, and `readConfig(prefix)` reads the salary inputs for either. Differences:

- **Single month** supports per-date "no overtime" (A班 checkbox grid) and per-date "B班 8h" toggles. Multi-month supports only per-weekday "no overtime".
- **Multi-month** `restDayWeekday` and `shiftType` each accept **either** a single value (uniform / auto-flip every month) **or** an array (per-month). This polymorphism is handled inside `calcMultiMonth` — `main.ts` picks which form to pass based on the radio mode (`uniform`/`individual`, `flip`/`individual`).

### Inverted-checkbox gotcha

In the single-month "按日期 不加班" grid, **checked = overtime (default)**, **unchecked = no overtime** — `readNoOvertimeDates` returns the *unchecked* values. The B班 8h grid is the opposite (checked = 8h). Easy to invert by accident.

### Money

All amounts are rounded to the cent via `round2` (`Math.round(n*100)/100`) at every step to avoid float drift. `baseHourlyRate = baseSalary / 21.75 / 8`. Domain constants (Yichang) are hardcoded in `salary.ts`: social insurance base **4299**, tax threshold **5000** at **3%** — intentionally fixed, not configurable.

## Conventions

- Comments, UI text, and commit messages are in **Chinese**; commits use conventional prefixes (`feat:` / `fix:` / `chore:`).
- `types.ts` is the single source of truth for shapes.
- TypeScript constraints from `tsconfig.json` that affect how you write code: `strict` is on (no `any`), `verbatimModuleSyntax` requires `import type` for type-only imports (used throughout), and `erasableSyntaxOnly` forbids enums / namespaces / constructor parameter properties.
