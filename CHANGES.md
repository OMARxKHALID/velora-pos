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
