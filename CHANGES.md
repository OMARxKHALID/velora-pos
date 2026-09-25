# Backend phase 4: returns on the server, and every screen on the server

Lint clean; 135 tests pass with a MongoDB replica set; production build succeeds. Checked in Chromium with the cashier, the supervisor and the owner each in their own browser: a sale at the till lowered the stock the supervisor sees (6 to 5) with a receipt number from the server; the cashier's refund request reached the supervisor, whose approval put the pair back (5 to 6); a newly opened browser saw both; a product added with opening stock appeared at the till without its cost price; the owner turned tax on at 15% and the till's next sale charged exactly Rs 1,875 on Rs 12,500.

- **One shop for everyone.** The browser demo store is gone. Screens load the shop from `GET /api/ledger` and every change goes through a server action; there is nothing left in local storage except the cart being rung up.
- **Returns on the server**: requests (cashiers only for their own sales, same checkout id stored once), approvals (only supervisors; two approving at once, one wins), cash refunds only while a drawer is open, stock back at the cost it was sold at.
- **Settings on the server**, owner only, validated and audited. **Demo reset** now resets the database's sales, stock and settings as well as the team.
- **What each role receives**: cashiers get their own sales and no cost prices, stock history or deliveries; supervisors their shop; the owner every shop.
- A new product and its opening stock are saved together in one transaction.
- **Removed for now**: the simulated "internet drop" and its sync queue. It only ever saved in the browser; real offline selling is phase 6. While offline the header says so and nothing is saved.

# Backend phase 3: selling on the server

Lint clean; 136 tests pass with a MongoDB replica set; production build succeeds; `GET /api/pos` checked over HTTP.

- **Sales are priced by the server.** The till only sends which items, how many, the discount percentage and the payments; prices, costs, shop offers, tax and totals come from the database and the existing, tested sale rules. The receipt number, stock change, stock history entry and the sale are saved in one transaction.
- **Pay pressed twice sells once**, even when the requests arrive together (the checkout id is unique in the database). **Two counters selling the last pair**: one sale goes through, the other is told how many are left. Online sales never take stock below zero.
- **Discounts above 5% need the signed supervisor approval** from phase 1, checked here: it must be for this cashier and this exact discount, less than five minutes old, and from a supervisor who is still active.
- **Shifts**: one open shift per counter (enforced by the database, so a double tap opens one), opening and counted cash validated, and the Z-report frozen at close from what the server recorded. A second cashier can still take over and close a busy counter.
- **Held carts** are stored per counter, at most 20; taking one is a single atomic step, so two screens can never resume the same cart.
- Server actions for all of this and `GET /api/pos` (the counter's open shift, held carts and settings, cashiers only). The till screen switches to them together with the other screens after phase 4.

# Backend phase 2: products and stock on the server

Lint clean; 127 tests pass with a MongoDB replica set, including races; production build succeeds. The new read endpoints were checked over HTTP with real sessions, and the phase 1 browser run still passes.

- **Product types**: `features/catalog/types/` with a `footwear` module (fields, colour × EU size items, SKUs, labels). The browser demo and the server build items with the same shared planner, so they cannot drift.
- **Catalog service** (one transaction each): add and edit products with opening stock, archive, delete (refused once there is stock history), CSV import (all or nothing, colours matched regardless of case). Product numbers and barcodes come from counters in the database.
- **Stock service**: deliveries and adjustments. Stock changes with one conditional update, so two people can never take the same last pair and every history entry carries the exact running balance.
- **Audit log** of product creation, deletion and every change to name, brand, price, cost, discount or status, with who and when.
- **Read endpoints**: `GET /api/catalog` (cost prices removed for cashiers) and `GET /api/movements` (paged, filterable, supervisors and owner only). Every query is limited to the signed-in person's shop.
- **Plan change**: stock is shared by selling, returns and the dashboard, so the screens move to the server together after phases 3 and 4 instead of one by one; switching them earlier would show two different stock counts.

# Backend phase 1: sign-in and staff on the server

Lint clean; 114 tests pass with a MongoDB replica set; production build succeeds. Checked in Chromium against a seeded database: wrong password rejected, demo sign-in, a cashier kept out of owner pages, the owner adding a cashier and a supervisor, setting a PIN, turning access off (the person is signed out at once and cannot sign back in), a discount credited to the supervisor whose PIN was used, demo reset, and sign-out.

- **Real accounts with Better Auth** (username + password, sessions in MongoDB, 12-hour sessions). Public sign-up is off; only the owner creates accounts. The demo team keeps the ids old records use (`u-admin`, `u-manager`, `u-cashier`).
- **Every page and action checks the session on the server.** `proxy.js` sends signed-out visitors to the sign-in page; each page and server action then checks the role itself.
- **Staff management on the server**: add (with username and password), change role, set a new password, turn access off or on, remove. The owner and the last supervisor are protected. Turning access off, removing someone or changing their password signs them out everywhere.
- **Supervisor PINs live in the database** as salted scrypt hashes, never sent to the browser. Wrong tries are counted in the database, so the five-try lock holds across servers. A correct PIN returns a signed five-minute approval tied to the cashier and the discount; the sale checks it once sales move to the server (phase 3).
- **Demo mode**: the demo accounts list, `db:seed` and Reset demo data only work with `DEMO_MODE=true`. `db:create-owner` creates the first owner for a real shop.
- Unique indexes on usernames, emails, session tokens and accounts (the auth adapter creates none), and expiry indexes that clear old sessions and PIN failures.
- **Fixed**: changes made while the page was still loading (such as the staff list arriving) overwrote this browser's saved sales and shifts with an empty store, which then looked like a fresh install and reset the demo. Nothing is written to browser storage until it has been read.
- Removed the unsigned session cookie, the access-off cookie, the PIN cookie and the pick-a-person sign-in list.

# Backend phase 0: MongoDB foundations

Lint clean; 109 tests pass with a MongoDB 8 replica set (101 without one, the database tests skip); production build succeeds. The screens still use browser demo data.

- **Database layer** in `lib/db/`: one reused `MongoClient` (attached to Vercel's pool handling), a `withTransaction` helper with snapshot reads and majority writes, and collection names.
- **Indexes enforce the rules**: one open shift per counter, a checkout stored once (`clientId`), receipt numbers unique per counter, barcodes unique everywhere, SKUs unique per shop, product names unique per shop regardless of case.
- **Seed**: `bun run db:seed` loads the 30-day demo into MongoDB, with the shop typed as `footwear` for the future clothes and cosmetics shops. It refuses to run without `DEMO_MODE=true` and will not overwrite data without `--reset`.
- **Environment variables are validated** with Zod (`lib/env.js`), the only place that reads `process.env`.
- `GET /api/health` answers 200 when the database is reachable and 503 when not, without error details.
- Local MongoDB via `compose.yaml`; CI (GitHub Actions) runs lint, all tests against a real replica set, and a build.

# Offline queue, shared held carts, per-supervisor PINs

Lint clean, all 99 tests pass, production build succeeds. Checked in Chromium: the owner sets a second supervisor's PIN; a cashier's 10% discount is rejected with the wrong PIN and credited to the chosen supervisor with the right one; a cart held in one tab is resumed in another; a sale and a shift close made offline sync after reconnecting.

- **Offline queue covers every change to money or stock**: sales, refund requests and decisions, shift openings and closings, deliveries (including CSV import stock) and adjustments. Each record carries `syncedAt` and syncs once. Refunds show "Not synced" while they wait.
- **Held carts are shared by the counter.** They live with the rest of the counter's data instead of in one tab, so every tab sees them, the close-shift check sees them all, and a cart can be resumed only once. Carts held in the old per-tab storage are moved over the first time the Sell screen opens.
- **Each supervisor has their own PIN**, and a discount approval is recorded against the supervisor who typed it. The cashier picks the approving supervisor when there is more than one. A supervisor without a PIN cannot approve until the owner sets one in Settings.
- **PINs are no longer readable in the browser.** They are stored as salted scrypt hashes in an httpOnly cookie and checked by a server action. Five wrong tries lock that supervisor for five minutes. Set `PIN_SECRET` when deploying. Reset demo data restores the default PIN.
- Discount approval needs the connection, since the server checks the PIN.
- Stored data moves to version 8: waiting offline sales stay queued, and the old shop-wide PIN is removed from browser storage.

# Correctness and hardening pass

Lint clean, all 88 tests pass, production build succeeds. Checked in Chromium: a cashier sale, closing a shift from a second tab, and upgrading data saved by the previous version.

## Bugs fixed
- **Colours sharing their first three letters became one item.** Brown and Bronze (also Blue and Blush, Navy and Navy Blue) got the same id and SKU and shared one stock count. Ids and SKUs now carry the whole colour name, and the same colour entered twice (`Navy Blue` / `navy-blue`) is refused.
- **Sales could be booked to a closed or unknown shift**, or to someone else's shift. A sale now needs an open shift on this counter, run by the cashier making the sale, and the seller must be an active cashier.
- **Closed Z-reports changed afterwards.** A shift's report is now frozen when it closes. Card refunds count in the shift that is open when they are approved, the same rule as cash.
- **CSV import failed on `black` for an existing `Black`.** Colours now match regardless of case.
- **A full or blocked browser storage lost sales silently.** The app now shows an error when a change cannot be saved.
- **Two tabs could overwrite each other.** Every change now starts from the latest saved data, so a second tab cannot double-open a shift or reuse a receipt number.
- Opening cash, counted cash, purchases and adjustments reject NaN, fractions, negative costs and unknown items with a clear message. Opening a shift twice from one form opens it once.
- Returned stock is booked at the cost it was sold at.

## Other
- Data saved by the previous version is migrated (item ids, SKUs, frozen shift reports) instead of wiped. Items in a cart that was open during the upgrade are dropped from that cart.
- Security headers (`nosniff`, `SAMEORIGIN`, referrer and permissions policy); `X-Powered-By` removed.
- `package.json` declares Bun 1.4 or newer.
- New tests for the migration, the store, stock rows, sale status and the Z-report CSV.
- Comments removed from the codebase.

# Responsive + consistency pass

Verified in headless Chromium at 360, 390, 430, 768, 820, 1024, 1180 and 1366 px (plus 844x390 landscape phone).
Lint clean, all 65 tests pass.

- Owner renamed to **ASIF** (was Ayesha Khan). Browsers that already ran the demo keep the old name in local storage until the demo is reset.

## Bugs fixed
- **Payment dialog overflow** (screenshots): long non-wrapping CTA labels no longer stretch the dialog. `DialogContent` is now a bounded flex column with a single `min-w-0` grid column that scrolls; the close button no longer scrolls away.
- **Payment dialog**: one width for Cash / Card / Split (no resize or re-centre when switching tabs), sticky primary button, Split is a single column with the amounts shown once, big "Cash received" amount is no longer forced down to 16px on touch, quick-tender buttons wrap instead of leaving empty grid slots, keyboard is not auto-opened on touch screens.
- **Sticky header** never stuck (`overflow-x: hidden` on html and body made body a scroll container). Now `overflow-x: clip` on body only.
- **Tablet clipping**: Sales / Stock / Staff / Products toolbars and primary buttons (e.g. *Add product* at 1024 px) were pushed off-screen and silently clipped. Toolbars now wrap and use container queries.
- **Nested `<main>`** removed; broken empty class in `sidebar.jsx` removed.
- **"Zoomed in" look**: pinch-zoom lock (`maximum-scale=1`, `user-scalable=no`) removed; `interactive-widget=resizes-content` added so dialogs shrink with the on-screen keyboard.
- **Landscape phone**: POS product grid was 0px tall. Height now derives from shell tokens with a minimum, and the page scrolls when the screen is short.
- Header vertical separator sat at the top instead of being centred; Open-shift card lost its spacing inside the `<form>` (now `display: contents`).
- Toasts no longer cover the header; sign-in role descriptions wrap instead of being cut off.

## Layout / responsiveness
- Sidebar docks at 1280 px and up; phones and tablets (portrait and landscape) get the full width with an off-canvas menu.
- POS shows the cart beside the products from 1024 px.
- Page content is a container (`@container`); toolbars, columns and grids react to the space they really have, not the window width.
- **Every table** (`Sales, Products, Stock, Stock history, Staff, Dashboard shops, Import preview`) fits without sideways scrolling on phones: columns hide by container width, hidden data moves into the row's sub-line, denser padding on narrow containers. Clickable rows are keyboard reachable (Tab + Enter/Space).

## Consistency
- Dialog: one padding/gap/max-height/overlay convention (removed per-dialog overrides); sheets match.
- Label tracking unified into a `tracking-label` token; heading sizes, count badges (all square), destructive text token (`text-destructive-foreground`), button touch sizes (`lg`, `icon-lg`), pressed-state scale, search-field heights.
- `prefers-reduced-motion` respected.
