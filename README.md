# Velora POS

The point of sale for Velora Group's shops, starting with **Velora Shoes**. It runs the counter, stock, returns, shifts and staff. All data lives in MongoDB, and the server checks every sale. When the internet drops, the till keeps selling.

## What it does

| Area | What you can do |
| --- | --- |
| **Sell** | Scan barcodes or pick shoes by size and colour. Take cash, card or split payments. Apply a supervisor-approved discount. Print an 80mm receipt. `F2` opens payment |
| **Held sales** | Put a sale on hold, serve the next customer, and resume it later from any screen at the same counter |
| **Offline selling** | Keep selling without internet. Sales are saved on the device and upload once each when the connection returns |
| **Shifts** | Open a shift with a cash float and close it with a blind cash count. The Z-report shows any shortage or overage |
| **Returns** | Cashiers request returns and supervisors approve them. Money goes back the way it was paid, tax included |
| **Products** | Add and edit shoes; every colour and size gets its own SKU and barcode. Archive items, print labels, import and export CSV |
| **Stock** | See stock per size and colour, receive deliveries, and correct stock with a reason. Every change is recorded in a history that can't be edited |
| **Overview** | Sales, profit, busiest hours, best and slow sellers, low stock, cash shortages and staff signals, in the shop's time zone |
| **Staff** | Add supervisors and cashiers, change roles, set passwords and supervisor PINs, turn access off |
| **Settings** | Sales tax, product offers, cart discounts, customer details at checkout, low-stock threshold |

Card payments are recorded, not charged: take the card on the bank's terminal and type the slip's approval code. There is no FBR integration yet, so receipts and Z-reports say they are not tax invoices.

### Who sees what

| Role | Screens |
| --- | --- |
| Owner | Overview, Sales and Z-reports, Stock, Stock history, Staff, Settings |
| Supervisor | Sales, Returns, Products, Stock, Stock history for their shop. Approves returns and discounts |
| Cashier | Sell, and their own sales |

Cashiers can give discounts of up to 5% on their own. A bigger discount needs a supervisor's 4-digit PIN; the approval is only valid for that cashier and that discount, for five minutes, and is recorded against the supervisor. Five wrong PINs lock that supervisor for five minutes, and ten wrong passwords lock a username for fifteen minutes.

Only the owner manages staff. Turning someone's access off signs them out everywhere at once. Nobody can sign themselves up.

## Getting started

You need [Bun](https://bun.sh) 1.4 or newer and Docker.

```bash
bun install
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` in `.env.local` to a long random string (`openssl rand -base64 32`), then start the database:

```bash
bun run db:up
```

Then choose one of these.

**Start empty**, as a new shop does:

```bash
OWNER_PASSWORD='a long password' bun run db:create-owner -- --username asif --name "ASIF" --email asif@example.com
bun dev
```

This creates the owner, the shop, its counter and its default settings. Sign in as the owner and add staff; a supervisor then adds products and receives stock.

**Load sample data** to try it out:

```bash
SAMPLE_DATA=true bun run db:seed
SAMPLE_DATA=true bun dev
```

This loads 30 days of sales, stock, shifts and returns, along with a sample team: `asif` (owner), `bilal` (supervisor, PIN `1234`) and `hamza` (cashier). Their password is `SAMPLE_PASSWORD`, which defaults to `velora-sample`. With `SAMPLE_DATA=true`, the sign-in page lists these accounts, and the owner can **Reset sample data** from Settings. `db:seed --reset` replaces everything in the database.

Open http://localhost:3000.

## Settings

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | A `mongodb://` or `mongodb+srv://` connection string. It must point at a replica set, which Atlas always is |
| `MONGODB_DB` | no | Database name. Defaults to `velora` |
| `BETTER_AUTH_SECRET` | yes | At least 32 random characters. Signs sessions and discount approvals |
| `BETTER_AUTH_URL` | in production | The site's own address, for example `https://pos.example.com` |
| `PIN_SECRET` | recommended | At least 32 random characters, used to hash supervisor PINs. Defaults to `BETTER_AUTH_SECRET` |
| `SAMPLE_DATA` | no | `true` allows `db:seed`, lists the sample accounts and shows **Reset sample data**. Keep it off for a real shop |
| `SAMPLE_PASSWORD` | no | Password for the sample accounts. Defaults to `velora-sample` |

`GET /api/health` reports whether the app can reach the database.

## Selling offline

- **Receipt numbers.** Opening a shift sets aside 30 receipt numbers for offline use, in a separate `X` series per counter (`SH1-R1-X00001`), so the normal series has no gaps. While online, the till asks for more when fewer than 10 are left.
- **What happens offline.** A sale made without internet is priced on the till and saved in the browser's database. It uploads to `POST /api/sync/sales` when the connection returns, when the screen regains focus, and every 30 seconds.
- **What the server accepts.**
  - The server stores each sale exactly once and keeps the price paid and the time of sale.
  - It never refuses a sale over stock. Instead it marks sales that need a look: the price changed, the item was oversold, the receipt number clashed, the till's clock was off, or the sale reached the server after its shift closed.
  - It only accepts prices, offers and tax settings the shop actually used during that shift. Anything else is refused and stays on the till for a supervisor to review.
- **Opening without internet.** The service worker keeps the app's pages and code, so the sell screen opens with no connection. It shows what the till last loaded for that person.
- **Before you rely on it.** Sign in on each till once while online and open the sell screen.
- **What still needs internet:** returns, stock, products, settings and supervisor approvals.
- **Closing a shift.** A shift can't be closed while its sales are still on the till.
- **Signing out** clears the saved pages and data from the device, but never sales that haven't uploaded.

The service worker is switched off in `bun dev`. To try offline selling, run `bun run build && bun start`, open the sell screen once, then set the browser to offline in its developer tools.

## Deploying on Vercel with MongoDB Atlas

1. **Database.** Create an Atlas cluster and a database user with a long generated password. Under Network Access, allow Vercel to connect. On the free and shared tiers that means `0.0.0.0/0`, which is why the password must be strong.
2. **App.** Import the repository in Vercel; it detects Next.js and Bun. Add these environment variables for Production, then deploy:
   - `MONGODB_URI`
   - `BETTER_AUTH_SECRET`
   - `PIN_SECRET`
   - `BETTER_AUTH_URL` (your https address)
   - `SAMPLE_DATA=false`
3. **First owner.** From your computer, with the same `MONGODB_URI`, `MONGODB_DB` and `BETTER_AUTH_SECRET` in your shell, run `bun run db:create-owner` as shown above. It also creates the database indexes. After later updates, run `bun run db:indexes` once to add any new indexes.
4. **Tills.** On each till, sign in once while online and open the sell screen. Offline selling needs https, which Vercel provides.

Keep secrets out of the repository: every `.env*` file except `.env.example` is ignored. If a connection string or password is ever shared, change the database user's password in Atlas and update `MONGODB_URI` in Vercel. Changing `BETTER_AUTH_SECRET` signs everyone out. Turn on Atlas backups before the shop relies on the system.

## Development

| Command | What it does |
| --- | --- |
| `bun dev` | Start the app in development mode |
| `bun run build` / `bun start` | Build and run the production app |
| `bun run lint` | ESLint. It fails on unused or undefined names |
| `bun test` | Unit tests and a render of every screen |
| `MONGODB_TEST_URI="mongodb://127.0.0.1:27017/?replicaSet=rs0" bun test` | Also runs the database tests, each in its own throwaway database |
| `bun run test:e2e` | Playwright browser tests against the built app. Run `bun run build` first; install the browser once with `bunx playwright install chromium` |
| `bun run db:up` / `db:down` | Start or stop the local MongoDB replica set |
| `bun run db:indexes` | Create or update the database indexes |
| `bun run db:seed` | Load sample data (needs `SAMPLE_DATA=true`) |
| `bun run db:create-owner` | Create the first owner, shop, counter and settings |

The browser tests start the app on port 3100 against a separate `velora_e2e` database and load sample data into it. They cover:
- sign-in, the password lockout and each role's access
- a sale at the till reaching the supervisor
- selling offline through a reload and back online

CI runs lint, every test and the build on each push to `main` and each pull request.

### How the code is organised

```
app/                   routes, API route handlers, service worker source (sw.js)
features/<area>/       one folder per area:
  components/          screens and dialogs
  lib/                 pure rules, shared by the browser and the server
  server/              database reads and writes
  actions.js           server actions the screens call
  ledger/lib/rules.js  the sale, return, shift and stock rules
  offline/             the till's outbox, saved ledger and service worker setup
  sample-data/         sample team, generated history and the reset
components/            shared UI (shadcn on Base UI) and the app shell
lib/                   money, dates, time zones, CSV, errors, HTTP helpers, env; lib/db/ holds the MongoDB client, indexes and transactions
scripts/               db:indexes, db:seed, db:create-owner
e2e/                   Playwright browser tests
```

- **How screens get data.** Screens read from `GET /api/ledger`: shops, counters, catalog, stock, recent shifts and returns, held carts and settings, trimmed to each role (cashiers never see cost prices). The Overview reads `GET /api/dashboard`. Sales and stock history are paged and searched on the server through `GET /api/sales` and `GET /api/movements`.
- **How changes are saved.** Every change goes through a server action that checks the role and saves in a MongoDB transaction. The server prices every sale itself. Times of day follow the shop's time zone (`Asia/Karachi`).
- **Adding other kinds of shop.** Each kind of shop is a module in `features/catalog/types/`; only `footwear` exists today. Selling, stock and returns only use the shared item fields, so a clothes or cosmetics shop is a new module, not a rewrite.
- **Code style.** The code has no comments, and names carry the meaning.

## Not built yet

- FBR invoicing
- card terminal, receipt printer and cash drawer integration
- more than one counter per shop in the interface
- stock transfers between shops
- product types for the clothing and cosmetics shops
