# Velora POS

Point of sale demo for **Velora Group** (Fashion · Footwear · Lifestyle), built for the first shop, **Velora Shoes**.

> **This is a demo build.** There is no database, server-side ledger or real login. Everything you do is stored in this browser (local storage) on top of 30 days of generated history. Card payment, offline sync and the FBR/tax documents are simulated. Nothing here is a real tax invoice.

## Before a presentation

1. Sign in as the owner, then **Reset demo data** (user menu or Settings; only shown when `DEMO_MODE=true`). Do this the same day: the sample history is generated relative to now, so "Today" has sales from mid-morning onwards. A reset also deletes staff you added, restores the demo team's passwords, roles and PIN, and turns everyone's access back on.
2. Present from **one browser**. Accounts live in the database, but sales, stock and shifts still live in the browser until the next phases move them, so an owner on a laptop and a cashier on a phone will not see each other's sales yet. Use **Sign out** to move between roles.
3. Use the https link when showing it on a phone or tablet.
4. Print once on the demo machine (**Print receipt**) to make sure the browser's print preview looks right. Receipts are sized for 80mm thermal paper; choose that paper size (or a PDF) in the print dialog.

## Try it

Sign in with a username and password. In demo mode the start page lists the demo team (`asif` owner, `bilal` supervisor, `hamza` cashier) with the `DEMO_PASSWORD`; tap one to sign in. People you add in **Staff** sign in with the username and password you give them.

| Role | Sees |
| --- | --- |
| Owner | Overview, Sales (with Z-reports), Stock, Stock history, Staff, Settings. Does not sell; stock is read-only |
| Supervisor | Sales, Returns, Products, Stock, Stock history (their own shop only). Approves returns and discounts. Does not sell |
| Cashier | Sell, and their own sales |

Discounts above 5% need a supervisor PIN. Each supervisor has their own, and the approval is recorded against whoever typed it. Bilal Ahmed starts with `1234`; the owner sets or changes PINs in Settings. PINs are stored hashed in the database and checked on the server, and five wrong tries lock that supervisor for five minutes. A correct PIN returns a signed approval that is only valid for that cashier and that discount, for five minutes.

Only the owner can add staff, change roles, set passwords and PINs, or turn access off. Turning access off or removing someone signs them out everywhere at once, and a role change applies on their next click. Nobody can sign themselves up.

## What is in the demo

- **POS**: barcode scanning (USB scanner or "Test scan"), size and colour picker, discounts with supervisor approval, cash, card and split payment, 80mm receipt with barcode, `F2` to charge
- **Held sales**: hold a sale (optionally named), serve someone else, resume later. Held carts belong to the counter, so every tab sees the same list and each cart can be resumed only once. They survive a refresh and are trimmed to available stock on resume. A shift cannot be closed while carts are held
- **Shifts**: open with a cash float, close with a blind count, shortage and overage report. A second cashier can take over a busy counter by counting and closing the first shift
- **Sales and refunds**: finished sales are locked. Refunds are requested by cashiers and approved by supervisors. They include the tax that was charged, go back the way the sale was paid, and cash refunds leave the drawer that is open when they are approved, so a cash refund waits until a cashier has a shift open
- **Z-reports**: any of the last closed shifts, printable and exportable to CSV
- **Products**: add, edit, archive, CSV import and export, barcode labels
- **Stock**: per size and colour, receive deliveries, adjustments with reasons, append-only movement history
- **Settings** (owner): sales tax, discounts, a PIN per supervisor, low-stock threshold, customer details at checkout
- **Dashboard**: sales, profit, busiest hours, top and slow sellers, low stock, cashier watch. Charts add up to the headline numbers
- **Offline (simulated)**: turn on "Simulate internet drop" in the header. Sales, refund requests and decisions, shift openings and closings, deliveries and stock adjustments are queued and each syncs once when you reconnect. Discount approvals need the connection, because PINs are checked on the server. There is no server behind the demo, so a real browser reload while offline will not work
- Dark and light mode, responsive down to phone width

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui (Base UI) · Zustand · React Hook Form + Zod · Recharts · Bun

## Develop

Needs Bun 1.4 or newer (older versions cannot read `bun.lock` or load the MongoDB driver) and Docker for the local database.

```bash
bun install
cp .env.example .env.local
bun run db:up       # MongoDB 8 as a one-node replica set, so transactions work
bun run db:seed     # 30 days of demo data and the demo team (needs DEMO_MODE=true; --reset replaces it)
bun dev
```

```bash
bun test          # unit tests and a server-render check of every screen
bun run lint
bun run build     # downloads Google Fonts, so it needs internet
MONGODB_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" bun test   # also runs the database tests
```

Database tests each use their own throwaway database and are skipped when `MONGODB_TEST_URI` is not set. `GET /api/health` reports whether the app can reach the database.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `MONGODB_URI` | database | `mongodb://` or `mongodb+srv://`; must be a replica set (Atlas always is) |
| `MONGODB_DB` | database | defaults to `velora` |
| `BETTER_AUTH_SECRET` | sign-in | at least 32 random characters; also signs discount approvals |
| `BETTER_AUTH_URL` | sign-in | the site's own URL, e.g. `https://pos.example.com` |
| `DEMO_MODE` | demo | `true` allows `db:seed`, the demo accounts list and Reset demo data |
| `DEMO_PASSWORD` | demo | password of the demo accounts; defaults to `velora-demo` |
| `PIN_SECRET` | supervisor PINs | optional, at least 32 characters; defaults to `BETTER_AUTH_SECRET` |

## Structure

```
app/                 routes (thin pages)
features/<name>/     components, lib (pure logic), schemas, store per feature
components/ui/       shadcn and shared UI
components/layout/   app shell: sidebar, header, theme
lib/                 money, dates, csv, ids, download helpers, env
lib/db/              MongoDB client, collections, indexes, transactions
scripts/             db:indexes and db:seed
```

The move to MongoDB is in progress. Phase 0 (database foundations) is done; the screens still run on this browser's demo data until their phase moves them to the server.

Business rules (sales, refunds, shifts, stock movements, catalog, analytics) are pure functions in `features/*/lib` with tests, so they can move to a server unchanged. Reducers take an optional shop and register, and default to the first shop.

## Deploy on Vercel

Import the repository in Vercel. It detects Next.js and Bun automatically; no environment variables are needed for the demo. Commit your lockfile so installs are repeatable.

Set `PIN_SECRET` to a long random string. Without it the supervisor PIN hashes use a built-in demo key, which is fine for a demo but lets someone holding the cookie guess a PIN offline.

For a real shop, set `DEMO_MODE=false` and create the first owner once:

```bash
OWNER_PASSWORD='a long password' bun run db:create-owner -- --username asif --name "ASIF" --email asif@example.com
```

The owner then adds everyone else in **Staff**.

## Production roadmap

A real database (the ledger, stock movements and unique receipt numbers suit a relational store with transactions), real authentication, server-side validation of every sale and approval, server-issued receipt numbers, price change audit log, FBR invoicing, receipt printer and cash drawer integration, per-shop stock and transfers, and shop-type specific product attributes for the clothing and cosmetics shops.
