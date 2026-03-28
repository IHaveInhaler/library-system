# Barcode System

## Overview

The Library Portal uses two barcode formats:
- **Shelf labels**: Code 128 linear barcodes — scannable with standard barcode readers
- **Book copy labels**: DataMatrix 2D barcodes — compact, high-density, readable by phone cameras

Both formats are configurable via `/admin/settings` → Barcodes.

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

### Rendering

Use Code 128 via [barcodeapi.org](https://www.barcodeapi.org/):
```
https://barcodeapi.org/api/128/{LABEL}
```
Example: `https://barcodeapi.org/api/128/CEN-L08097`

---

## Book Copy Barcodes (DataMatrix)

**Setting**: `barcode.copyFormat`
**Default**: `{PREFIX}-{ISBN}-{SEQ}`
**Example**: `CEN-273565-001`

### Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{PREFIX}` | Library label prefix | `CEN` |
| `{ISBN}` | Last 6 digits of book ISBN | `273565` |
| `{SEQ}` | Sequential copy number (zero-padded) | `001` |
| `{RANDOM}` | 6 random hex chars | `A3F9B2` |

### Generation

Generated automatically when a book copy is created (if no barcode is provided manually).
Sequential numbering is per-book — first copy of a book gets `001`, second gets `002`, etc.
Uniqueness is enforced with retry logic.

### Rendering

Use DataMatrix via [barcodeapi.org](https://www.barcodeapi.org/):
```
https://barcodeapi.org/api/dm/{BARCODE}
```
Example: `https://barcodeapi.org/api/dm/CEN-273565-001`

---

## Position Codes

Positions define where a shelf sits within a library. They're configurable in `/manage/shelves` → Positions.

**Constraints**: 1-3 uppercase letters/digits per code.

**Default positions**:
| Code | Label |
|------|-------|
| `L` | Left |
| `M` | Middle |
| `R` | Right |

Custom positions can be added (e.g. `GF` = Ground Floor, `FL1` = Floor 1, `T` = Top).

### Position Migration

When a position is removed, affected shelves can be migrated to a different position.
This regenerates their labels and sends a migration report (email or console) with:
- Old label → New label for each shelf
- Action required: reprint labels

---

## Printing (Future)

Users with `CREATE_BARCODES` permission will be able to generate printable barcode sheets.
The `CONFIGURE_BARCODES` permission controls format template editing.

Barcode images can be fetched from barcodeapi.org for rendering:
- Shelf labels: `https://barcodeapi.org/api/128/{label}`
- Copy barcodes: `https://barcodeapi.org/api/dm/{barcode}`
