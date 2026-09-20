# Velora POS

Point of sale demo for **Velora Group** (Fashion · Footwear · Lifestyle), built for the first shop, **Velora Shoes**, and designed to grow to more shops.

> Demo build: no database or real login yet. All data lives in the browser (local storage) and is seeded with 30 days of realistic history. Use **Reset demo data** in the user menu before a presentation.

## Try it

Pick a role on the start page:

| Role | Sees |
| --- | --- |
| Owner | Overview (analytics), Sales, Stock, Stock history, Staff access. No POS; stock is read-only |
| Supervisor | Sell, Sales, Returns, Products, Stock, Stock history (their own shop only) |
| Cashier | Sell and their own sales only |

Supervisor PIN for discounts above 5%: `1234`.

## What is in the demo

- **POS**: barcode scanning (USB scanner or "Test scan"), size and colour picker, discounts with manager approval, cash and card payment, 80mm receipt with barcode, `F2` to charge
- **Shifts**: open with a cash float, close with a blind count, shortage and overage report
- **Sales and refunds**: finished sales are locked; refunds are requested by cashiers and approved by supervisors
- **Products**: add, edit, archive, CSV import and export, barcode labels
- **Stock**: per size and colour, receive deliveries, adjustments with reasons, append-only movement history
- **Settings**: switchable sales tax (rate + name) and discounts — per-product offers and whole-cart %, applied on the cart, receipt, history and reports
- **Dashboard**: revenue, profit, busiest hours, top and slow sellers, low stock, cashier watch (discounts, refunds, cash differences)
- **Offline**: sales keep working without internet and sync once when the connection returns
- Dark and light mode, responsive down to phone width

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui (Base UI) · Zustand · React Hook Form + Zod · Recharts · Bun

## Develop

```bash
bun install
bun dev
```

```bash
bun test
bun run lint
bun run build
```

## Structure

```
app/                 routes (thin pages)
features/<name>/     components, lib (pure logic), schemas, store per feature
components/ui/       shadcn and shared UI
components/layout/   app shell: sidebar, header, theme
lib/                 money, dates, csv, download helpers
```

Business rules (sales, refunds, shifts, stock movements, catalog, analytics) are pure functions in `features/*/lib` with tests, so they move to the server unchanged when MongoDB is added.

## Deploy on Vercel

Import the repository in Vercel. It detects Next.js and Bun (`bun.lock`) automatically; no environment variables are needed for the demo.

## Production Roadmap

MongoDB with Mongoose, Better Auth, server-side validation of every sale and approval, price change audit log, FBR invoicing, receipt printer and cash drawer integration, more shops.
