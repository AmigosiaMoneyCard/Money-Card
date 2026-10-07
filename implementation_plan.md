# Implementation Plan — Mobile Full-Screen QR Scanner Clean Header & Manual Option

Ensure a single, full-screen QR scanner view across Kitchen Staff and Counter Manager, removing the duplicate header, styling the title in white, removing the top-right manual keyboard icon, and keeping the dedicated bottom manual entry button clearly visible.

![Full Screen QR Scanner UI Sketch](file:///C:/Users/damie/.gemini/antigravity-ide/brain/40124c13-8182-4da5-8dae-66d3097486e9/kitchen_fullscreen_qr_clean_header_1791352407318.jpg)

## Proposed Changes

### Mobile POS — Flutter Money card

#### [qr_scanner_view.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/widgets/scanner/qr_scanner_view.dart)
- Remove `IconButton(icon: const Icon(Icons.keyboard_outlined), ...)` from `AppBar.actions`.
- Keep Flash/Torch button and Switch Camera button in `AppBar.actions`.
- Update `AppBar.title` styling to explicit white text (`color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16`).
- Maintain the bottom `Enter Wallet ID Manually` pill button below the QR viewfinder square.

#### [kitchen_orders_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/kitchen/kitchen_orders_screen.dart)
- In `_openQrScanner()`, remove the outer redundant `Scaffold` and outer `AppBar`.
- Return `QrScannerView` directly in `MaterialPageRoute(fullscreenDialog: true, builder: (ctx) => QrScannerView(...))` to eliminate the stacked duplicate header and give full vertical space to the scanner overlay.

#### [live_order_tracker_screen.dart](file:///D:/Money%20Card%20Project/Flutter%20Money%20card/lib/features/orders/live_order_tracker_screen.dart)
- In `_openQrScanner()`, replace modal bottom sheet with direct full-screen `QrScannerView` route for parity.

```
+-------------------------------------------------------------+
|  <-        Scan Wallet QR (White Text)             [⚡] [📷] |
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|                     +-----------------+                     |
|                     | [             ] |                     |
|                     |                 |                     |
|                     |      QR CAM     |                     |
|                     |                 |                     |
|                     | [             ] |                     |
|                     +-----------------+                     |
|                                                             |
|           Point camera at customer wallet QR code           |
|                                                             |
|              ( [⌨] Enter Wallet ID Manually )               |
|                                                             |
+-------------------------------------------------------------+
```

## Verification Plan

### Automated Tests
- `flutter analyze --no-pub`: verify 0 static issues.
- `flutter test`: verify all 186 Flutter tests pass.
