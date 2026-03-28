# Barcode System

## Overview

The Library Portal uses two barcode formats:
- **Shelf labels**: Code 128 linear barcodes — scannable with standard barcode readers
- **Book copy labels**: DataMatrix 2D barcodes — compact, high-density, readable by phone cameras

Both formats are configurable via `/admin/settings` → Barcodes.
Barcode images are generated locally using **bwip-js** (no external API dependency).

---

## Barcode Rendering (bwip-js)

All barcode images are generated server-side using [bwip-js](https://github.com/metafloor/bwip-js) — a pure JavaScript barcode writer supporting 100+ symbologies. Runs entirely locally, no external API calls.

**npm package**: `bwip-js`

### API Endpoints

```
GET /api/barcodes/shelf/:label       → PNG image (Code 128)
GET /api/barcodes/copy/:barcode      → PNG image (DataMatrix)
GET /api/barcodes/shelf/:label.svg   → SVG image (Code 128)
GET /api/barcodes/copy/:barcode.svg  → SVG image (DataMatrix)
```

### bwip-js Usage

```typescript
import bwipjs from 'bwip-js'

// Code 128 for shelf labels
const shelfPng = await bwipjs.toBuffer({
  bcid: 'code128',
  text: 'CEN-L08097',
  scale: 3,
  height: 10,
  includetext: true,
  textxalign: 'center',
})

// DataMatrix for copy barcodes
const copyPng = await bwipjs.toBuffer({
  bcid: 'datamatrix',
  text: 'CEN-273565-001',
  scale: 4,
  padding: 2,
})
```

---

## Shelf Labels (Code 128)

**Setting**: `barcode.shelfFormat`
**Default**: `{PREFIX}-{POSITION}{DIGITS}{CHECK}`
**Example**: `CEN-L08097`

### Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{PREFIX}` | Library label prefix (3 chars) | `CEN` |
| `{POSITION}` | Shelf position code (1-3 chars) | `L`, `GF`, `FL1` |
| `{DIGITS}` | 4 random digits | `0809` |
| `{CHECK}` | Checksum: sum of DIGITS mod 10 | `7` |
| `{RANDOM}` | 4 random alphanumeric chars | `A3K9` |
| `{SEQ}` | Sequential number (placeholder) | `001` |

### Generation

Generated automatically when a shelf is created. The label must be unique across all shelves.
If a generated label collides, it retries up to 10 times with new random values.

---

## Book Copy Barcodes (DataMatrix)

**Setting**: `barcode.copyFormat`
**Default**: `{ISBN}-{DIGITS}-{CHECK}`
**Example**: `9780140449136-0001-7`

### Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{ISBN}` | Full ISBN with dashes/spaces stripped | `9780140449136` |
| `{DIGITS}` | Sequential copy number (zero-padded, 4 digits) | `0001` |
| `{CHECK}` | Luhn mod-10 check digit computed from all numeric chars | `7` |
| `{PREFIX}` | Library label prefix | `CEN` |
| `{SEQ}` | Sequential copy number (zero-padded, 3 digits) | `001` |
| `{RANDOM}` | 6 random hex chars | `A3F9B2` |

### Generation

Generated automatically when a book copy is created — barcodes cannot be set manually.
Sequential numbering is per-book — first copy gets `0001`, second gets `0002`, etc.
The `{CHECK}` digit is a Luhn mod-10 checksum over all numeric characters in the barcode (excluding the check digit itself), ensuring scanner-readability and error detection.
Uniqueness is enforced with retry logic.

---

## Position Codes

Positions define where a shelf sits within a library. Configurable in `/manage/shelves` → Positions.

**Constraints**: 1-3 uppercase letters/digits per code. Minimum one position must exist.

**Default positions**:
| Code | Label |
|------|-------|
| `L` | Left |
| `M` | Middle |
| `R` | Right |

Custom positions: `GF` = Ground Floor, `FL1` = Floor 1, `T` = Top, etc.

### Position Migration

When a position is removed, affected shelves can be migrated to a different position.
Labels are regenerated. A migration report is sent via email (or logged to console) with old → new labels and a "reprint required" action.

---

## Scanning

### How Scanning Works

Barcode scanners (USB, Bluetooth, or phone camera) act as keyboard input — they "type" the barcode value into the active text field.

### Scanner Types Supported

| Type | How it works | Setup |
|------|-------------|-------|
| USB barcode gun | Appears as keyboard — types the code + Enter | Plug and play |
| Bluetooth scanner | Pairs like a keyboard | Standard BT pairing |
| Phone camera | Uses browser `BarcodeDetector` API or zxing-js | No hardware needed |

### Scan Workflows

#### Issuing a Loan
1. Navigate to `/manage/loans` → "Issue Loan"
2. Scan **book copy barcode** (DataMatrix) → copy identified automatically
3. Search or scan member → confirm due date → loan issued

#### Returning a Loan
1. Navigate to `/manage/loans`
2. Scan **book copy barcode** → system finds the active loan → one-click return

#### Shelf Audit
1. Open shelf detail page
2. Scan each copy barcode on the physical shelf
3. System flags: copies missing from shelf, copies that belong elsewhere

#### Quick Lookup
1. Scan any barcode from any page with a search field
2. System detects format and routes to the correct entity

### Scan Detection (Frontend)

The frontend detects scanner vs. keyboard input by keystroke timing:
- Scanners type at ~50-100 chars/sec (< 50ms between keystrokes)
- Humans type at ~5-10 chars/sec (> 100ms between keystrokes)
- On Enter key or 200ms idle after fast input → treat as scan → lookup

### Scan API

```
GET /api/scan/:code
```
Returns: `{ type: 'shelf' | 'copy' | 'unknown', entity: Shelf | BookCopy | null }`

Checks shelf labels first, then copy barcodes. Returns quick-action links.

### Dedicated Scan Page

```
/manage/scan — Full-screen scan mode

Components:
- ScanInput: focused text field with scanner speed detection
- ScanResult: shows found entity with quick actions
  - Copy → "Issue Loan", "Return", "View Book"
  - Shelf → "View Shelf", "Audit"
  - Unknown → "Not found" with manual search fallback
- CameraScanner (Phase 5): viewfinder overlay using BarcodeDetector API
```

---

## Printing

### Approach 1: Browser Print (No Special Hardware)

Uses `window.print()` with print-optimised CSS.

**Pages**:
```
/manage/print/shelves?ids=id1,id2,id3 — Shelf label sheet
/manage/print/copies?ids=id1,id2,id3  — Copy barcode sheet
```

**Label sheets** render barcode images (from `/api/barcodes/` endpoint) formatted for standard label paper:

| Format | Labels/Sheet | Label Size | Use |
|--------|-------------|-----------|-----|
| Avery 5160 | 30 | 1" × 2⅝" | Copy barcodes |
| Avery 5163 | 10 | 2" × 4" | Shelf labels |
| Custom | Configurable | Configurable | Any |

**Each label contains**:
- Barcode image (Code 128 or DataMatrix)
- Human-readable text below
- Optional: library name, shelf code, book title (truncated)

### Approach 2: ZPL (Zebra Thermal Printer)

For high-volume printing with Zebra thermal label printers. The server generates ZPL commands and sends them directly to the printer over TCP (port 9100).

**Settings** (`/admin/settings` → Printing):
| Setting | Default | Description |
|---------|---------|-------------|
| `print.method` | `browser` | `browser`, `zpl`, or `ipp` |
| `print.zpl.host` | — | Printer IP address or hostname |
| `print.zpl.port` | `9100` | Raw TCP port |
| `print.zpl.labelWidth` | `50` | Label width in mm |
| `print.zpl.labelHeight` | `25` | Label height in mm |

### Approach 3: IPP (Network Printer)

Sends barcode images to any IPP-compatible network printer (most modern printers).

**Settings** (`/admin/settings` → Printing):
| Setting | Default | Description |
|---------|---------|-------------|
| `print.ipp.printerUrl` | — | Full IPP URL, e.g. `http://192.168.1.50:631/ipp/print` |

### Print API

```
POST /api/barcodes/print
Body: { type: 'shelf' | 'copy', code: 'barcode-string' }
```

Sends a print job using the configured method. Returns `{ success, method, message }`.
For `browser` method, returns error — frontend handles browser printing directly.

### Print Queue

Users can queue barcodes during workflow:
1. Adding copies → "Add to print queue" button
2. Creating shelves → "Add to print queue"
3. After migration → "Print affected labels"

**Queue page** (`/manage/print-queue`):
- List of queued labels with barcode preview
- Select paper format
- Print all / selected / clear

### Permissions

| Permission | Description | Librarian Default |
|------------|-------------|:-:|
| `CREATE_BARCODES` | Generate and print barcodes | ✓ |
| `CONFIGURE_BARCODES` | Edit format templates and printer settings | ✗ |

---

## Implementation Order

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Format templates + auto-generation | ✅ Done |
| 2 | bwip-js barcode image endpoints | Planned |
| 3 | `/manage/scan` page with scanner detection | Planned |
| 4 | Browser printing with label sheets | Planned |
| 5 | Print queue system | Planned |
| 6 | Thermal printer support (ZPL) | Planned |
| 7 | Camera scanning (BarcodeDetector / zxing-js) | Planned |
