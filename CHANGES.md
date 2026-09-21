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
