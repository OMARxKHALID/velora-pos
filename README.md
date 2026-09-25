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

- **POS**: barcode scanning (USB scanner or "Test scan"), size and colour picker, discounts with supervisor approval, cash, card and split payment (change of Rs 5,000 or more is refused as a likely typo), 80mm receipt with barcode, `F2` to charge
- **Held sales**: hold a sale (optionally named), serve someone else, resume later. Held carts survive a refresh and are trimmed to available stock on resume. A shift cannot be closed while carts are held
- **Shifts**: open with a cash float, close with a blind count, shortage and overage report. A second cashier can take over a busy counter by counting and closing the first shift
- **Sales and refunds**: finished sales are locked. Refunds are requested by cashiers and approved by supervisors. They include the tax that was charged, go back the way the sale was paid, and cash refunds leave the drawer that is open when they are approved, so a cash refund waits until a cashier has a shift open
- **Size exchanges**: from any sale, swap a pair for another size or colour of the same shoe at no charge. Stock moves both ways and is logged; swapped pairs cannot be refunded later
- **Z-reports**: any of the last closed shifts, printable and exportable to CSV. A closed shift's report never changes: refunds (cash and card) are booked to the shift that is open when they are approved
- **Products**: add, edit, archive, CSV import and export, barcode labels. **Categories** (Products → Categories) are your own: each has an icon, a default PCT code and a size type (EU shoe sizes, clothing sizes XS–XXL, or one size), so socks, polish and brushes sell next to shoes. CSV import creates missing categories
- **Stock**: per size and colour, receive deliveries, adjustments with reasons, append-only movement history
- **Size run**: stock as a size-by-shoe heatmap, or what sold in the last 30 days with sold-out sizes ringed in red
- **Stock count**: scan the shelf (system numbers stay hidden while counting), review differences, save them as "Stock count" fixes
- **Staff** (owner): profile photo, phone, email, CNIC, city, address and emergency contact, all optional except the name, editable later
- **Receipt design** (Settings → Receipt): shop name, address, phone, return policy, closing message, 58 or 80 mm paper and which details print, with a live preview
- **Shops and counters** (Settings → Shops): add, edit, close or delete shops (only an empty shop can be deleted), each with its own address, NTN and STRN, and counters with their own FBR POSID, receipt numbers, auto-print and copies, and cash drawer rules. Staff, products, stock, sales and returns belong to a shop; the owner switches between shops or sees all of them. Staff of a closed shop cannot sign in, and discounts are approved by a supervisor from the same shop (or the owner)
- **Group and shop settings**: with All shops selected, Settings edits the defaults every shop uses. With one shop selected, each tab edits that shop only, marked "Custom for this shop", with a button to go back to the group settings
- **Payments**: cash, card, JazzCash, Easypaisa and bank transfer (wallets and bank need a transaction ID), split payments, and optional cash rounding down to Rs 5 or Rs 10
- **Staff leave**: mark someone on leave with dates; they cannot sign in or approve until it ends
- **Settings** (owner, in tabs): sales tax (added on top or included in the price), discounts, supervisor PIN, low-stock threshold, products per row at the till, customer details at checkout
- **FBR reporting (simulated)**: turn on in Settings with an NTN and the counter's POSID. Every sale, approved return (credit note) and size exchange (credit note + new invoice) gets an FBR record: a fiscal number, a QR code and the NTN/STRN on the receipt, the optional Rs 1 FBR POS fee, per-item PCT codes, and "FBR pending" while offline until the counter syncs. Each sale's detail shows the exact PostData JSON a live build would send. Numbers are generated in the browser; nothing is sent to FBR
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

FBR invoice data is built by pure functions in `features/fbr/lib/fbr.js` (sale invoice, credit note, exchange), ready for a server-side client to post to the FBR endpoint.

Business rules (sales, refunds, shifts, stock movements, catalog, analytics) are pure functions in `features/*/lib` with tests, so they can move to a server unchanged. Reducers take an optional shop and register, and default to the first shop.

## Deploy on Vercel

Import the repository in Vercel. It detects Next.js and Bun automatically; no environment variables are needed for the demo. Commit your lockfile so installs are repeatable.

## Production roadmap

A real database (the ledger, stock movements and unique receipt numbers suit a relational store with transactions), real authentication, server-side validation of every sale and approval, server-issued receipt numbers, price change audit log, FBR invoicing, receipt printer and cash drawer integration, per-shop stock and transfers, and product attributes beyond size and colour.
