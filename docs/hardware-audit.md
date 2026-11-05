# Velora POS: hardware integration audit

Audit date: 2026-11-06. No app code was changed. Evidence is `file:line` from the code at this date. Browser checks ran against a production build with sample data on a throwaway in-memory database, using agent-browser with Helium.

Screenshots: [receipt-80mm.png](receipt-80mm.png) (receipt after a card sale), [receipt-58mm.png](receipt-58mm.png) (58 mm receipt preview in Settings).

## Summary

| Device | Verdict | How it works today | Key evidence |
| --- | --- | --- | --- |
| Barcode scanner (HID) | **Partly supported** | Keyboard-wedge only. A global key listener builds a code from fast keystrokes and needs an Enter suffix. No Web HID, Web Serial or camera scanning. Scanners with gaps over 35 ms or a Tab suffix are silently ignored. | `src/features/pos/hooks/use-barcode-scanner.js:3,13,15,25` |
| Thermal receipt printer | **Partly supported** | Browser print only (a hidden iframe plus `window.print()`), with `@page` sizes for 80 mm and 58 mm. No ESC/POS, no cutter or logo commands, no status feedback. Each print opens a print dialog unless Chrome runs in kiosk-printing mode. | `src/features/pos/lib/print-node.js:2-3,20-38` |
| Cash drawer | **Not supported** | Opening the drawer only writes a log entry. The "drawer on cash sale" setting is stored but nothing reads it. | `src/features/pos/server/drawer.js:28`, `src/features/pos/components/drawer-dialog.jsx:24` |
| Card terminal | **Not supported (manual entry)** | The cashier takes payment on the bank machine, then taps "Card approved". The approval code is optional free text. There is no link to the terminal. | `src/features/pos/components/payment-dialog.jsx:112-148` |

## 1. Barcode scanner

### What works
- Keyboard-wedge scanners work in the sell, stock count and sales lookup screens. `useBarcodeScanner` is used at `pos-screen.jsx:222`, `stock-count-screen.jsx:54` and `sales-screen.jsx:113`. Receive delivery has its own scan field (`receive-stock-dialog.jsx:46,120`).
- The listener does not need a focused field, so a Bluetooth scanner on an Android tablet or iPad should not open the soft keyboard. This is unverified on real devices.
- Codes are kept as strings, so leading zeros survive (`catalog.js:215`). Generated codes are valid EAN-13 with a check digit (`catalog/lib/barcode.js:6-12`). Labels use EAN-13 when valid, otherwise Code 128 (`labels-dialog.jsx:20`). Receipt numbers are printed as Code 128 (`receipt.jsx:49`).
- An unknown code beeps and shows a "Barcode not found" toast (`pos-screen.jsx:117-119`). Verified in the browser.
- A repeated scan of the same item adds one more each time. There is no debounce, so a scanner that double-fires would add two.

### Measured (browser simulation of keystrokes, then Enter)
| Test | Result |
| --- | --- |
| 10 ms between keys, Enter suffix | Item added |
| 30 ms between keys, Enter suffix | Item added |
| 60 ms between keys, Enter suffix | **Ignored, no beep, no message** |
| 100 ms between keys, Enter suffix | **Ignored, no beep, no message** |
| 10 ms between keys, Tab suffix | **Ignored, no beep, no message** |
| Unknown code | "Barcode not found" toast |

### Gaps and risks
1. **Timing is hard-coded.** The 35 ms gap and 6-character minimum are defaults (`use-barcode-scanner.js:3`). No caller overrides them and there is no setting per counter. A slow Bluetooth scanner (50 to 100 ms gaps) makes the buffer reset on every key, so every scan is lost without any feedback.
2. **Only Enter ends a scan** (`use-barcode-scanner.js:15`). Tab is ignored (`:25`) and the code stays in the buffer. A CR/LF suffix is unverified: LF may arrive as Ctrl+J, which would add a letter.
3. **Typed codes are digits only.** The sell scan field strips non-digits (`cart-panel.jsx:44`) and catalog search treats only 6 or more digits as a barcode. CSV import accepts only 8 to 14 digit barcodes (`catalog/server/service.js`, import row schema). Alphanumeric Code 128 product codes work only through the global listener, and are unverified for products created in the form.
4. **Focus.** If a text field has focus, the listener steps aside and the scan is typed into the field (`use-barcode-scanner.js:11`). If a dialog is open and no field is focused, the scan is refused with a "Close this window to scan" toast. The receipt dialog and the cart sheet let scans through. Scanning while the customer-name field is focused in the payment dialog is unverified.
5. **Keyboard layout.** The code uses `event.key`, which is the character the OS layout produces. A scanner set up for a US layout on a non-US OS can send wrong characters. Unverified.

### Required device settings
- Mode: USB HID keyboard (or Bluetooth HID). No serial or SPP mode.
- Suffix: Enter (CR). Remove any prefix. No Tab suffix.
- Layout: match the PC's keyboard layout, or use the scanner's "US layout" option together with a US layout on the PC.
- Speed: keep it on the fastest keystroke setting (10 ms or less between keys).
- Symbologies: enable EAN-13, UPC-A and Code 128. Turn off check-digit stripping.

### Recommended setup for launch
USB HID scanner, Enter suffix, fast keystrokes, on a Windows PC with Chrome. Use Bluetooth only if the scanner can be set to 30 ms or less between keys, and test it with the script below.

## 2. Thermal receipt printer

### What works
- Receipts render in the browser and print through the OS driver (`print-node.js:20-38`). This works offline, because printing is client-side and the app's fonts and styles are cached by the service worker (`src/app/sw.js:20`). The service worker is disabled in development (`service-worker-provider.jsx:7`), so offline printing needs a production build to test.
- Page size is set to `80mm auto` or `58mm auto` with zero margins (`print-node.js:2-3`). The receipt is 302 px wide at 80 mm and 219 px at 58 mm (`receipt.jsx:55`). In the 58 mm preview no line overflowed (measured), and long text wraps (`break-words`, `break-all`).
- Copies are repeated blocks with a page break between them (`print-node.js:29-30`). Copies and auto-print are set per counter (`shops/server/service.js:33-36`, `receipt-dialog.jsx:22`).
- Reprint exists in the sale detail (`sale-detail-sheet.jsx:302`).

### Gaps and risks
1. **No ESC/POS.** There is no raw printing, no auto-cut command, no logo bitmap and no printer status. The cut between copies depends on the Windows driver treating each page as a separate cut.
2. **A print dialog appears on every receipt** unless Chrome runs with `--kiosk-printing`. With auto-print on, the dialog opens 300 ms after the sale (`receipt-dialog.jsx:22-27`).
3. **Paper width is per shop, not per counter** (`receipt-designer.jsx:111` stores it in shop settings). Two counters with different printers cannot differ.
4. **The Z-report always prints at 80 mm** (`shift-report-dialog.jsx:40`), even when the shop's paper is 58 mm.
5. **Printable width.** Many 58 mm printers print only 48 mm. The receipt content is 203 px, about 53.7 mm, so edges may clip. Many 80 mm printers print 72 mm and the content is 270 px, about 71 mm. Hardware check needed.
6. **FBR QR.** It is 84 px (about 22 mm) (`receipt.jsx:27`) and encodes the invoice number. The invoice number is currently generated by a simulated function (`fbr/lib/fbr.js:23`), so the QR is not a real FBR code yet.
7. **Urdu or right-to-left text:** no support found in the code (no Urdu font, no `dir` handling). Currency prints as "Rs".
8. **Failures.** The browser cannot report "printer off" or "out of paper". The only recovery is reprint from the sale detail.
9. **Barcode labels print on a full A4 sheet** (`labels-dialog.jsx:68` calls `printNode` with the default page size), with labels about 190 px wide (`labels-dialog.jsx:24`). There is no label-printer size.

### Cash drawer
- `openDrawer` only inserts a `drawer_events` record (`pos/server/drawer.js:28`). The dialog says so: "No drawer hardware is connected yet" (`drawer-dialog.jsx:24`).
- `drawerOnCash` and `manualDrawer` are saved per counter (`shops/server/shops.js:30-39`) but `drawerOnCash` is not read by the sale flow.
- The drawer can still open if the printer driver is set to "open drawer" when printing. Then it opens on every print (card sales and reprints included), not only for cash.

### Required device settings
- Windows driver for the printer model, set to the exact paper (58 or 80 mm), margins 0, scale 100%, "cut after each page" if offered.
- Set the printer as the Windows default.
- Chrome kiosk printing: `chrome --kiosk-printing --app=<shop URL>` (add `--user-data-dir` for a dedicated profile).
- Drawer on the printer's RJ11 port: set "Open drawer: before/after printing" in the driver.

### Recommended setup for launch
80 mm USB thermal printer with a Windows driver and RJ11 drawer port, Chrome in kiosk-printing mode, auto-print on. Treat the drawer as opening on every receipt.

## 3. Card payment terminal

### What works
- The cashier sees "Amount on terminal", takes the payment on the bank machine, then taps "Card approved, complete sale" (`payment-dialog.jsx:112-148`).
- The approval code field is optional and checks only length, up to 30 characters (`card-reference.js:1-3`). It warns if the code was used on another receipt (`card-reference-field.jsx:19,44`).
- Wallet and bank payments require a transaction ID (`ledger/lib/rules.js:135`). Card does not.
- Card totals and card refunds appear in the Z-report (`ledger/lib/rules.js:463,469`; `z-report.js:39,44`). Split payments are supported.

### Verified walk-through (browser)
Charge, Card tab, then "Card approved, complete sale" **with no approval code**. The sale was recorded as paid by card and the receipt shows only "Paid · Card". Nothing in the app checked the terminal.

### Risks at the counter
1. **No link to the terminal.** The app cannot confirm the amount, the approval or a decline. A cashier can tap "Card approved" without a payment.
2. **Wrong amount on the terminal.** Nothing compares the terminal amount with the sale total.
3. **Approval code is optional and free text.** Typos and blanks are accepted.
4. **Duplicate-code warning is partial.** The lookup is online only and, for cashiers, searches only their own sales (`sales/server/queries.js:63-71`). It warns but does not block.
5. **Card refunds** are recorded in the app as "Card reversal" with no code and no link to the terminal. The reversal must be done by hand on the terminal.
6. **Data model.** A payment is only `{ method, amount, reference }` (`pos/server/sales.js` payment schema). There is no terminal id, masked card number, authorisation code field, batch number or status. A semi-integrated terminal would need these.
7. **End of day.** The Z-report shows card sales and refunds as totals only, with no count of card transactions, so there is little to match against the terminal's settlement slip.
8. **PCI scope.** A search of `src/` found no card number, CVV, track data or PAN fields. Only the free-text approval code is stored. Staff should be told never to type a card number there.

### Required device settings
Terminal settlement report printed daily and kept with the Z-report. Terminal in manual-amount mode.

### Recommended setup for launch
Keep manual entry but make the approval code mandatory for card (a small change), and reconcile the terminal settlement slip against the Z-report card total every night.

## 4. Integration options

Effort: S under 1 day, M 1 to 3 days, L over 3 days. Nothing below needs approval to be installed until you choose it; new dependencies are listed for you to approve.

### Scanner
| Option | Effort | Touches | Browser support | Offline | New dependencies |
| --- | --- | --- | --- | --- | --- |
| Per-counter scanner timing (max gap, minimum length, suffix keys Enter/Tab) | S | `pos` hook, `shops` (counter settings, schema, UI) | All | Yes | None |
| Beep and a toast when a fast burst of keys ends without a valid scan | S | `pos` hook | All | Yes | None |
| Camera scanning for phones | M | `pos`, `inventory` | Chrome and Safari (BarcodeDetector is limited on Safari) | Yes | A scanning library (ask first) |

### Receipt printer
| Option | Effort | Touches | Browser support | Offline | New dependencies |
| --- | --- | --- | --- | --- | --- |
| Keep browser print with `--kiosk-printing` (documented above) | S | None | Chrome | Yes | None |
| ESC/POS over Web Serial or WebUSB: raw commands, auto-cut, drawer kick, status | L | `pos/lib` (new printer module), `shops` (counter printer settings), receipt rendering rewritten as ESC/POS | Chrome and Edge on desktop and Android; not Safari or iPad | Yes | An ESC/POS encoder (ask first) |
| Local print bridge such as QZ Tray | M | `pos/lib/print-node.js`, `shops` | Any browser; needs an installed helper app and certificate setup | Yes (local) | QZ client library, a paid licence for silent signed printing (ask first) |
| Network (LAN) printer through a small local print server | L | New service, `pos/lib` | Any browser | Needs the LAN, not the internet | A server component (ask first) |

Per-counter paper width and printing the Z-report at the shop's paper width are both S changes in `shops` and `pos`.

### Cash drawer
Easiest is the driver's "open drawer" setting. A real ESC/POS pulse (`ESC p`) arrives only with one of the ESC/POS options above and could then honour `drawerOnCash`.

### Card terminal
| Option | Effort | Touches | Browser support | Offline | New dependencies |
| --- | --- | --- | --- | --- | --- |
| Manual entry, approval code required for card, daily reconciliation | S | `pos` (payment dialog, rules), `ledger` | All | Yes | None |
| Extra card fields (terminal id, batch, last 4 digits, status) | M | `pos`, `ledger`, `refunds`, `reports` | All | Yes | None |
| Semi-integrated terminal or bank gateway | L | New `payments` feature, `pos`, `refunds` | Depends on the bank SDK | Usually needs internet | A bank SDK or API (the bank and model are not decided; ask first) |

## 5. Manual hardware test script

Run on the real devices before go-live. Mark each Pass or Fail.

### Scanner
1. Scan a product label with the sell screen open. Pass if the item is added and the beep sounds.
2. Scan an unknown barcode. Pass if "Barcode not found" shows.
3. Scan 10 different items quickly. Pass if all 10 are added.
4. Scan the same box twice quickly. Pass if the quantity is 2, not 3.
5. Scan with the customer-name field focused in the payment dialog. Note what happens (field gets text, sale not completed).
6. Bluetooth scanner only: scan ten times and note any that are ignored. If any are, the gap is over 35 ms and the scanner needs a faster setting.
7. Tablet only: confirm the on-screen keyboard does not open when scanning.
8. Scan a receipt barcode on the Sales screen. Pass if the sale opens.
9. Scan on Stock count and Receive delivery. Pass if items are added.

### Printer
1. Complete a cash sale and print. Pass if the paper is cut and nothing is cropped on the left or right.
2. Print at 58 mm and at 80 mm. Pass if the width fits the roll with all text visible.
3. Print with the longest product name in the catalog. Pass if it wraps and stays readable.
4. Print a receipt with the FBR QR. Pass if a phone camera reads it.
5. Set copies to 2. Pass if two receipts come out, each cut.
6. Turn the printer off and print. Note what the cashier sees, then turn it on and reprint from the sale detail.
7. Disconnect the internet, make a sale and print. Pass if it prints.
8. Print the Z-report. Pass if the width is right for the roll in use.
9. Print a barcode label sheet and scan a printed label. Pass if the scanner reads it.

### Cash drawer
1. With the driver's "open drawer" setting on, print a receipt. Pass if the drawer opens.
2. Press "Open drawer" in the app. Note that it only logs (expected).
3. Print a card-sale receipt. Note whether the drawer opens (expected, with the driver setting on).

### Card terminal
1. Take a card payment on the terminal and complete the sale with the approval code. Pass if the code shows in the sale detail.
2. Complete a card sale with the code left blank. Note that it is accepted.
3. Re-use the same approval code on a second sale. Pass if a warning shows.
4. Do a card refund in the app and by hand on the terminal. Pass if both match.
5. At end of day compare the terminal settlement slip with the Z-report card total. Pass if they match.

## 6. Shopping checklist

- **Scanner:** USB HID keyboard-wedge scanner (1D, reads EAN-13 and Code 128), configurable suffix set to Enter, fast keystroke speed. For wireless, one that can be set to HID mode with 30 ms or less between keys.
- **Receipt printer:** 80 mm thermal, USB, with a Windows driver, auto-cutter and an RJ11 cash-drawer port. 58 mm only if the printable width is 48 mm or more and tested.
- **Cash drawer:** 12 V or 24 V RJ11 drawer matching the printer's drawer port.
- **Card terminal:** any bank terminal that prints a settlement slip. Integrated terminals only after you pick a bank and an option from section 4.
- **PC:** Windows with Chrome, set up in kiosk-printing mode; keyboard layout matching the scanner.
- **Label printing (optional):** a 40 x 30 mm thermal label printer is not supported today; labels print on A4.
