# Velora POS

Point of sale demo for **Velora Group** (Fashion · Footwear · Lifestyle), built for the first shop, **Velora Shoes**.

> **This is a demo build.** There is no database, server-side ledger or real login. Everything you do is stored in this browser (local storage) on top of 30 days of generated history. Card payment, offline sync and the FBR/tax documents are simulated. Nothing here is a real tax invoice.

## Before a presentation

1. Sign in as the owner, then **Reset demo data** (user menu or Settings). Do this the same day: the sample history is generated relative to now, so "Today" has sales from mid-morning onwards. A reset also restores staff, settings, and turns everyone's access back on.
2. Present from **one browser**. Data and sign-in live in that browser, so an owner on a laptop and a cashier on a phone will not see each other's sales. Use **Switch user** to move between roles.
3. Use the https link when showing it on a phone or tablet.
4. Print once on the demo machine (**Print receipt**) to make sure the browser's print preview looks right. Receipts are sized for 80mm thermal paper; choose that paper size (or a PDF) in the print dialog.

## Try it

Pick someone on the start page. The list is the team, so people you add in **Staff** appear there too.

| Role | Sees |
| --- | --- |
| Owner | Overview, Sales (with Z-reports), Stock, Stock history, Staff, Settings. Does not sell; stock is read-only |
| Supervisor | Sales, Returns, Products, Stock, Stock history (their own shop only). Approves returns and discounts. Does not sell |
| Cashier | Sell, and their own sales |

Supervisor PIN for discounts above 5%: `1234`. It is not shown on screen. The owner can change it in Settings.

## What is in the demo

- **POS**: barcode scanning (USB scanner or "Test scan"), size and colour picker, discounts with supervisor approval, cash, card and split payment, 80mm receipt with barcode, `F2` to charge
- **Held sales**: hold a sale (optionally named), serve someone else, resume later. Held carts survive a refresh and are trimmed to available stock on resume. A shift cannot be closed while carts are held
- **Shifts**: open with a cash float, close with a blind count, shortage and overage report. A second cashier can take over a busy counter by counting and closing the first shift
- **Sales and refunds**: finished sales are locked. Refunds are requested by cashiers and approved by supervisors. They include the tax that was charged, go back the way the sale was paid, and cash refunds leave the drawer that is open when they are approved, so a cash refund waits until a cashier has a shift open
- **Z-reports**: any of the last closed shifts, printable and exportable to CSV
- **Products**: add, edit, archive, CSV import and export, barcode labels
- **Stock**: per size and colour, receive deliveries, adjustments with reasons, append-only movement history
- **Settings** (owner): sales tax, discounts, supervisor PIN, low-stock threshold, customer details at checkout
- **Dashboard**: sales, profit, busiest hours, top and slow sellers, low stock, cashier watch. Charts add up to the headline numbers
- **Offline (simulated)**: turn on "Simulate internet drop" in the header. Sales are queued and synced once when you reconnect. There is no server behind the demo, so a real browser reload while offline will not work
- Dark and light mode, responsive down to phone width

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui (Base UI) · Zustand · React Hook Form + Zod · Recharts · Bun

## Develop

```bash
bun install
bun dev
```

```bash
bun test          # unit tests and a server-render check of every screen
bun run lint
bun run build     # downloads Google Fonts, so it needs internet
```

## Structure

```
app/                 routes (thin pages)
features/<name>/     components, lib (pure logic), schemas, store per feature
components/ui/       shadcn and shared UI
components/layout/   app shell: sidebar, header, theme
lib/                 money, dates, csv, ids, download helpers
```

Business rules (sales, refunds, shifts, stock movements, catalog, analytics) are pure functions in `features/*/lib` with tests, so they can move to a server unchanged. Reducers take an optional shop and register, and default to the first shop.

## Deploy on Vercel

Import the repository in Vercel. It detects Next.js and Bun automatically; no environment variables are needed for the demo. Commit your lockfile so installs are repeatable.

## Production roadmap

A real database (the ledger, stock movements and unique receipt numbers suit a relational store with transactions), real authentication, server-side validation of every sale and approval, server-issued receipt numbers, price change audit log, FBR invoicing, receipt printer and cash drawer integration, per-shop stock and transfers, and shop-type specific product attributes for the clothing and cosmetics shops.
