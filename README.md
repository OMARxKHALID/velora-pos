# Velora POS

Point of sale for **Velora Group** (Fashion · Footwear · Lifestyle), running the first shop, **Velora Shoes**. Sales, stock, shifts, returns and staff are stored in MongoDB and checked on the server. The till keeps selling when the internet drops.

A new install starts empty: create the owner, then add staff and products. For trying it out or showing it to someone, the database can instead be loaded with 30 days of sample data (a sample team, catalog, sales, shifts and returns).

Card payments are recorded, not charged: take the card on the bank's terminal and type the slip's approval code. There is no FBR integration yet, so receipts and Z-reports say they are not tax invoices.

## What it does

- **Sell**: barcode scanning (USB scanner or "Test scan"), size and colour picker, discounts with supervisor approval, cash, card and split payment, 80mm receipt with barcode, `F2` to charge
- **Held sales**: hold a sale (optionally named), serve someone else, resume later. Held carts belong to the counter, so every tab sees the same list and each cart can be resumed only once. They are trimmed to available stock on resume. A shift cannot be closed while carts are held
- **Selling offline**: when the internet drops, the till keeps selling. Sales are saved on the device with receipt numbers set aside for that shift (`SH1-R1-X00001`) and upload once each when the connection is back. The sell screen opens with no connection, from what the till last loaded. Returns, stock, settings and supervisor approvals wait for the connection
- **Shifts**: open with a cash float, close with a blind count, shortage and overage report. A second cashier can take over a busy counter by counting and closing the first shift
- **Sales and returns**: finished sales are locked. Returns are requested by cashiers and approved by supervisors. They include the tax that was charged, go back the way the sale was paid, and cash returns leave the drawer that is open when they are approved
- **Z-reports**: any closed shift, printable and exportable to CSV
- **Products**: add, edit, archive, CSV import and export, barcode labels
- **Stock**: per size and colour, receive deliveries, adjustments with reasons, append-only movement history
- **Settings** (owner): sales tax, discounts, a PIN per supervisor, low-stock threshold, customer details at checkout
- **Overview** (owner): sales, profit, busiest hours, best and slow sellers, low stock, cash shortages and staff signals, in the shop's time zone
- Dark and light mode, responsive down to phone width

## Roles

| Role | Sees |
| --- | --- |
| Owner | Overview, Sales (with Z-reports), Stock, Stock history, Staff, Settings. Does not sell; stock is read-only |
| Supervisor | Sales, Returns, Products, Stock, Stock history (their own shop only). Approves returns and discounts. Does not sell |
| Cashier | Sell, and their own sales |

Discounts above 5% need a supervisor's PIN. Each supervisor has their own, set by the owner in Settings, and the approval is recorded against whoever typed it. PINs are stored hashed and checked on the server; five wrong tries lock that supervisor for five minutes. A correct PIN gives a signed approval valid only for that cashier and that discount, for five minutes.

Only the owner can add staff, change roles, set passwords and PINs, or turn access off. Turning access off or removing someone signs them out everywhere at once, and a role change applies on their next click. Nobody can sign themselves up.

## Run it locally

Needs Bun 1.4 or newer and Docker for the local database.

```bash
bun install
cp .env.example .env.local      # then set BETTER_AUTH_SECRET: openssl rand -base64 32
bun run db:up                   # MongoDB 8 as a one-node replica set, so transactions work
```

Then either load sample data:

```bash
bun run db:seed                 # needs SAMPLE_DATA=true; --reset replaces everything
bun dev
```

Sign in as `asif` (owner), `bilal` (supervisor, PIN `1234`) or `hamza` (cashier) with `SAMPLE_PASSWORD`. With `SAMPLE_DATA=true` the sign-in page lists these accounts, and the owner can **Reset sample data** from the user menu or Settings. The sample history is generated up to the moment it is loaded, so reset it on the day you show it.

Or start empty, the way a shop does:

```bash
OWNER_PASSWORD='a long password' bun run db:create-owner -- --username asif --name "ASIF" --email asif@example.com
bun dev
```

This creates the owner and the shop's counter and settings. The owner adds supervisors and cashiers in **Staff**; a supervisor adds products and receives stock.

### Checks

```bash
bun test                        # unit tests and a server render of every screen
MONGODB_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" bun test   # also the database tests
bun run lint
bun run build                   # downloads Google Fonts, so it needs internet
bun run test:e2e                # browser tests against the built app (run build first)
```

Database tests each use their own throwaway database. The browser tests (Playwright, in `e2e/`) start the built app on port 3100 against a separate `velora_e2e` database, load sample data into it, and cover signing in, each role's access, a sale at the till reaching the supervisor, and selling offline. Install the browser once with `bunx playwright install chromium`. CI runs all of these on every push and pull request.

The service worker is off in `bun dev`. To try selling offline, run `bun run build && bun start`, open the sell screen once, then switch the browser to offline in its developer tools.

### Settings

| Variable | Needed for | Notes |
| --- | --- | --- |
| `MONGODB_URI` | database | `mongodb://` or `mongodb+srv://`; must be a replica set (Atlas always is) |
| `MONGODB_DB` | database | defaults to `velora` |
| `BETTER_AUTH_SECRET` | sign-in | at least 32 random characters; also signs discount approvals |
| `BETTER_AUTH_URL` | sign-in | the site's own address, e.g. `https://pos.example.com` |
| `PIN_SECRET` | supervisor PINs | at least 32 random characters; defaults to `BETTER_AUTH_SECRET` |
| `SAMPLE_DATA` | sample data | `true` allows `db:seed`, lists the sample accounts on the sign-in page and shows **Reset sample data**. Leave it off for a real shop |
| `SAMPLE_PASSWORD` | sample data | password of the sample accounts; defaults to `velora-sample` |

`GET /api/health` reports whether the app can reach the database.

## Deploy (Vercel and MongoDB Atlas)

1. **Database.** Create an Atlas cluster (every tier is a replica set, so transactions work) and a database user with a long generated password. Under Network Access, allow Vercel to connect: on the free and shared tiers that means `0.0.0.0/0`, which is why the password must be strong.
2. **App.** Import the repository in Vercel; it detects Next.js and Bun. Add the settings above for Production: `MONGODB_URI` (the Atlas connection string with the password filled in), `BETTER_AUTH_SECRET` and `PIN_SECRET` (each from `openssl rand -base64 32`), `BETTER_AUTH_URL` (your https address), and `SAMPLE_DATA=false`. Deploy.
3. **First owner.** From your computer, with the same `MONGODB_URI`, `MONGODB_DB` and `BETTER_AUTH_SECRET` in the shell, run `bun run db:create-owner` as shown above. It creates the indexes, the owner, and the shop's counter and settings. To show the app to someone instead, point it at a separate database (`MONGODB_DB=velora_sample`) and run `SAMPLE_DATA=true bun run db:seed` there.
4. **Tills.** On each till, sign in once while online and open the sell screen, so it can open again without internet. Selling offline needs https, which Vercel provides.

Keep secrets out of the repository: `.env*` files are ignored, apart from `.env.example`. If a connection string or password is ever shared or pasted anywhere, change the database user's password in Atlas and update `MONGODB_URI` in Vercel. Changing `BETTER_AUTH_SECRET` signs everyone out. Turn on Atlas backups (or schedule `mongodump`) before the shop relies on it.

## How it is built

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui (Base UI) · Zustand · TanStack Query · React Hook Form + Zod · Recharts · MongoDB · Better Auth · Dexie (IndexedDB) · Serwist (service worker) · Playwright · Bun

```
app/                    routes, API route handlers, service worker source (sw.js)
features/<name>/        components, hooks, lib (pure rules), server (database), actions per feature
  ledger/lib/rules.js   the sale, return, shift and stock rules, shared by the till and the server
  offline/              the till's outbox, saved ledger and service worker setup
  sample-data/          sample team, generated history, and the reset
components/             shared UI and the app shell
lib/                    money, dates, time zones, CSV, ids, env; lib/db/ has the MongoDB client, indexes and transactions
scripts/                db:indexes, db:seed, db:create-owner
e2e/                    Playwright browser tests
```

Screens read the shop from the server: `GET /api/ledger` (catalog, stock, recent shifts and returns, held carts, settings, trimmed to the role), `GET /api/dashboard` (finished figures only), and paged, searchable `GET /api/sales` and `GET /api/movements`. Every change goes through a server action that checks the role and saves in a MongoDB transaction; the server prices every sale itself. The screens use the same rules (`features/ledger/lib/rules.js`) for previews such as cart totals, refund quotes and shift summaries. Days and hours follow the shop's time zone (`Asia/Karachi`), not the server's.

Opening a shift sets aside 30 offline receipt numbers for it, in a separate `X` series per counter so normal numbers have no gaps; the till asks for more while online when fewer than 10 are left. A sale made offline is priced on the till, stored in IndexedDB, and sent to `POST /api/sync/sales` when the connection returns. The server stores it once, keeps the price paid and the time it was sold, and never refuses it for stock; instead it marks what needs a look (price changed since, oversold, number clash, till clock off, sold after the shift closed). Signing out clears the saved pages and data from the device, but never sales that have not been uploaded.

Each shop type is a module in `features/catalog/types/` (only `footwear` today) that defines its product fields, how its items are built (colour × EU size), SKUs and labels. Selling, stock and returns only use the shared item fields, so a clothes or cosmetics shop is a new module rather than a rewrite.

## Still to do

FBR invoicing, card terminal, receipt printer and cash drawer integration, more than one counter per shop in the UI, stock transfers between shops, and product types for the clothing and cosmetics shops.
