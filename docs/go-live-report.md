# Velora POS — go-live readiness report

## Verdict

**Ready with conditions.** The money-critical paths (sales, refunds, swaps, shifts, FBR, concurrency) are well tested and proven correct, including under real concurrency (double-Pay, same-pair races, an Eid-rush-style load test). No blocker or major finding came out of this review. The conditions are below, plus finishing the browser walkthrough this session could not complete (tooling, not app, failure).

## 1. Checks run

- `bun run lint` — clean.
- `bun run test:db` (full suite) — **259/259 pass**, 47 files, 1,556 assertions, ~47s.
- `bun run build` — clean production build, all 29 routes compiled.

## 2. Coverage map

Built by reading every test file's names and tracing the relevant source. Corrected twice during Phase 2 after reading the actual code (noted inline) — three items first marked PARTIAL/GAP turned out to already be COVERED; two were caught before being over-claimed.

| Scenario | Status | Evidence |
|---|---|---|
| **Counter selling** |
| Barcode scan resolves correct size/colour | PARTIAL | logic exists (`catalog-panel.jsx:126`), no dedicated test |
| Unknown barcode, scan during dialog, fast double-scan (the scanner hook itself) | **GAP, untestable without a new dependency** | `use-barcode-scanner.js` drives real `window.keydown` events; no DOM library (jsdom/happy-dom) is installed, so its debounce/dialog-guard logic can't be unit-tested as-is. Not added without asking — see Conditions. |
| Cart lines: separate per size, qty up/down/zero, scan-twice, setCustomer, prune/load | **Fixed** | added 4 tests to `cart-store.test.js` (was 1 test, now 5) |
| Cash/card/wallet/bank/split, under/over payment | COVERED | `rules.test.js`, `pos.db.test.js` — confirmed "Payment is short" and "Change can only be given from cash" are both tested |
| Cash rounding, tax modes, tax on discounted items | COVERED | `pricing.test.js`, `rules.test.js` |
| Discount within/above limit, wrong PIN, expired/reused approval | COVERED | `rules.test.js`, `auth.db.test.js`, `offline-sales.db.test.js` — **and manually verified live** in Phase 3 (wrong PIN rejected, correct PIN approved) |
| Double-Pay, network drop mid-Pay, tab close mid-Pay | COVERED | `pos.db.test.js`, `ledger-store.test.js` |
| Held sale: hold/resume, two screens same cart, stock gone while held | COVERED | `pos.db.test.js`, `cart-fit.test.js` |
| Receipt: 80mm/58mm layout, Urdu/long names, FBR QR on/off | PARTIAL | no automated test; **verified visually in Phase 3** (correct layout, barcode, "NOT A TAX INVOICE" with FBR off) — 58mm/Urdu not checked |
| **Stock** |
| Last pair, two counters at once | COVERED | `catalog.db.test.js`, `pos.db.test.js`, and the new `rush.db.test.js` under volume |
| Selling offline what server thinks is gone | COVERED | `offline-sales.db.test.js` |
| Receive delivery (new/archived variants) | COVERED | `catalog.db.test.js` |
| Adjustments, stock count, blind count diffs | COVERED | `rules.test.js`, `count.db.test.js` |
| History immutable, stock never silently negative | COVERED | `db.test.js` |
| CSV import: bad rows, dup SKU/barcode, missing categories | COVERED | `catalog-csv.test.js`, `categories.db.test.js` |
| CSV import at scale (5,000 rows), formula-prefixed product names | **Fixed** | added to `catalog-csv.test.js` — 5,000 rows parse in well under 2s with no false duplicate flags; a `=`-prefixed name imports as plain text (there is no formula-neutralisation on import, which is correct: the app never evaluates the CSV, only Excel would, and that risk is already handled on *export* via `toCsv`'s `safeText`) |
| **Returns & swaps** |
| Request→approve/reject, concurrent approvals, partial/over-return, split refunded per method | COVERED | `refunds.db.test.js`, `rules.test.js` |
| Return window closed, cash return with no open shift | COVERED | `rules.test.js` |
| Swap moves stock both ways, swapped pair unrefundable, swap fails if new size OOS | COVERED | `rules.test.js`, `exchanges.db.test.js` |
| Returning an unsynced offline sale | **Not a gap** | traced the code: `pending` (queued offline) sales are never merged into `state.sales` — the Sales screen and lookup are server-paged only, so an unsynced sale simply isn't selectable for a return. If a saleId is forced anyway, `requestRefund` already throws "Sale not found" (`refunds.db.test.js:58`). Correct by construction. |
| **Shifts & cash** |
| Open/close, no-sale open, blind close, Z-report math | COVERED | `rules.test.js`, `pos.db.test.js`, `count.db.test.js` — **and live in Phase 3** |
| Shortage/overage over limit needs note | COVERED | `rules.test.js` |
| Offline sales after shift closed land on its Z-report | COVERED | `offline-sales.db.test.js` |
| One shift per register; midnight-spanning shift (Asia/Karachi) | **Not a gap** | the unique-shift-per-register constraint is covered (`db.test.js`); the midnight boundary itself is covered precisely (down to the second) in `zoned.test.js` |
| A shift that keeps asking for more offline numbers exhausts its blocks | **Fixed** | added to `offline-sales.db.test.js` — reserving `MAX_BLOCKS` (10) blocks then one more throws "used all its offline receipt numbers" |
| **Offline / power cuts** |
| Offline selling, no dup numbers across tabs, numbers running out | COVERED | `outbox.test.js` already proves exhaustion (`NO_NUMBERS`) — missed this on first pass, confirmed before writing a duplicate test |
| Sync once, rejected stay visible, hung upload doesn't block | COVERED | `outbox.test.js`, `ledger-store.test.js` |
| Browser killed mid-sale and reopened (real persistence) | **Not independently verified** | persistence logic exists (zustand `persist` to sessionStorage, Dexie outbox) and is unit-tested at the logic level, but a real kill-and-reopen needs the browser walkthrough — not reached (see §4) |
| Price changed on server while offline | COVERED | `offline-sales.db.test.js` |
| Session expires offline, re-signs in | **Not unit-testable with confidence** | the client code path exists (`SessionEnded` handling in `ledger-store.js`) but exercising it correctly needs a real browser session, not a blind unit test — left for a live check |
| **People & access** |
| Role sees only its screens/data, incl. direct API calls | PARTIAL | service-layer role scoping is covered; route-level enforcement is only partly covered (`auth.db.test.js` exercises the `better-auth` handler directly, but the data API routes rely on `next/headers`' request context, which isn't reproducible outside a real request — needs a live/E2E check, not a blind mock) |
| Leave/access-off/closed-shop blocks sign-in + approvals, kills sessions | COVERED | `auth.db.test.js` |
| 10 wrong passwords / 5 wrong PINs lock | COVERED | `sign-in-attempts.db.test.js`, `auth.db.test.js` |
| Owner/last supervisor protected | COVERED | `rules.test.js` (staff), `auth.db.test.js` |
| **FBR & money accuracy** |
| FBR on/off, missing NTN/POSID, per-counter sequence, pending→synced, credit notes | COVERED | `fbr.test.js`, `exchanges.db.test.js` |
| Totals reconcile across sales, Z-report, dashboard, CSV export | **Fixed** | new `reconciliation.db.test.js`: two sales + one approved refund, same shift — `Z-report revenue − its own card-refund line`, `netRevenue` computed from the CSV export rows minus `netRefund`, and the dashboard's `current.revenue` all land on the exact same paisa figure. (Note found along the way: the Z-report's "Total Collected" is gross sales for the shift and does **not** itself subtract refunds — refunds are separate line items on the same report. That's correct design, but worth knowing when reading a Z-report by eye.) |
| **Busy days & scale** |
| Eid-rush concurrency | **Fixed** | new `rush.db.test.js`: 3 counters × 40 sales (120 total) fired concurrently — zero failures, zero duplicate receipt numbers across any counter, and every variant's stock landed exactly right. This proves correctness under concurrency, not throughput/timing — a real load/perf test is separate work this review didn't do. |
| Year of data — list/search/export/dashboard perf | **GAP** | no perf test; untouched |
| Slow 3G, tablet/phone viewport | **Not reached** | needed the browser walkthrough |

## 3. Tests added this review

9 new tests, all passing, full suite still 259/259 → **now 259 → confirm below**: the full run after these additions reported **259 pass** (up from 250), across **47 files** (45 → 47, two new files):

- `src/features/pos/store/cart-store.test.js` — 4 new tests (add/scan-again, setQuantity 0/unknown, setCustomer partial update, prune/load)
- `src/features/catalog/lib/catalog-csv.test.js` — 2 new tests (5,000-row import, formula-prefixed name)
- `src/features/pos/server/offline-sales.db.test.js` — 1 new test (offline receipt-block exhaustion)
- `src/features/pos/server/reconciliation.db.test.js` — new file, 1 test (cross-report reconciliation)
- `src/features/pos/server/rush.db.test.js` — new file, 1 test (concurrent multi-counter rush)

None of these were committed by this session directly — they were swept into the peer session's own commits on `main` (already pushed). The content is safe and in the repo; the commit messages don't reflect it. Worth a follow-up housekeeping commit if that matters to you.

## 4. Browser walkthrough — partial

Could not use the shared dev server or database (`.env.local` points at a live Atlas cluster shared with your other session — deliberately did not run sell/refund/shift actions against it). Spun up an isolated local MongoDB replica set and a separate dev-server copy (to dodge Next 16's per-directory Turbopack lock) on `http://localhost:3100`, seeded with sample data.

Completed, with screenshots/snapshots confirmed:
- Signed in as cashier (Hamza), opened a shift.
- **Sale 1**: scanned Velora Aurum Runner, EU 42, cash, exact change. Receipt rendered correctly — right totals, receipt number `SH1-R1-000039`, barcode, "NOT A TAX INVOICE" (FBR off), correct return-window text.
- **Sale 2**: added Nike Air Max 90, applied a 15% cart discount (above the cashier's 5% limit) → correctly prompted for supervisor PIN. Wrong PIN → rejected with "Wrong PIN", dialog stayed open. Correct PIN (1234) → approved, discount applied (Rs 4,800 off), total Rs 27,200.

Not reached — the `browseros-neo` MCP server disconnected (`ECONNREFUSED`) mid-walkthrough (at the split-payment step of Sale 2's checkout), and the built-in browser pane cannot reach a localhost server this session started itself (confirmed — it's a different machine/process from the browser pane). Still open:
- Completing the split payment and the rest of a shop day (held sale, going offline and selling, return + swap, stock count, shift close, Z-report, dashboard/CSV cross-check in the browser)
- Tablet/phone viewport and slow-network checks
- Session-expiry-while-offline and browser-kill-and-reopen persistence

The isolated server is still running on port 3100 against `mongodb://127.0.0.1:44425/?replicaSet=testset` / db `velora_phase3` for a follow-up session to pick this up (with `neo` reconnected, or the built-in browser via `preview_start` against a `.claude/launch.json` entry instead of a hand-started server).

## 5. Go-live checklist

- [ ] Production env vars set per the README: `MONGODB_URI` (replica set), `MONGODB_DB`, `BETTER_AUTH_SECRET` (32+ random chars), `BETTER_AUTH_URL` (real HTTPS domain), `PIN_SECRET`
- [ ] MongoDB Atlas (or equivalent) replica set, with backups on and a **tested** restore
- [ ] `SAMPLE_DATA` unset/false in production
- [ ] `bun run db:indexes` run against production
- [ ] `bun run db:create-owner` run to create the real owner account
- [ ] Real catalog imported (CSV import now proven to scale to 5,000+ rows)
- [ ] Opening stock counted and entered
- [ ] Supervisor PIN(s) set
- [ ] Counter POSID and receipt numbering set per counter
- [ ] FBR settings confirmed (NTN, POSID) if turning FBR on
- [ ] Receipt printer, barcode scanner, cash drawer tested on the real hardware — see `docs/hardware-audit.md` (already written; covers scanner/printer/card-terminal integration status)
- [ ] Staff trained on offline mode (what "SAVED OFFLINE · SYNCS AUTOMATICALLY" means, that sales upload automatically on reconnect)
- [ ] A fallback plan if the server/internet is down at open (offline selling covers this, but staff should know it's expected to work, not a bug)
- [ ] Finish the Phase 3 browser walkthrough above before trusting the UI end-to-end in production

## 6. Top 5 risks for launch week

1. **Barcode scanner edge cases are genuinely untested** (no test harness can drive it without a DOM library) — the only mitigation available this review is manual testing on the real scanner hardware before go-live. Recommend: test an unknown barcode, a scan while a dialog is open, and a fast double-scan by hand on day one.
2. **Receipt/58mm/Urdu rendering** is visually confirmed only for the happy path (80mm, English). If the shop uses 58mm paper or non-Latin product names, check those by hand.
3. **Role-based API route access** is covered at the service layer but not fully at the HTTP-route layer (that needs a real request context). A quick manual check — log in as a cashier, try to hit `/api/dashboard` directly — is cheap insurance.
4. **Session-expiry-while-offline** and **browser-kill-and-reopen** are unverified live. Both matter in a shop with flaky power/internet. Recommend doing these two checks by hand before trusting offline mode on launch day.
5. **No real load/perf test** — the concurrency test proves correctness under 120 simultaneous sales, not throughput over the simulated 2-hour Eid rush, and there's no test for a year of data's query performance. Low risk for a single shop at launch, worth revisiting before a second shop or a much larger catalog.
