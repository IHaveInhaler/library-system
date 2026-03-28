# Library Portal — Design Guidelines

This document defines the visual language for every page and component in the Library Portal frontend. All new UI work and refactors must follow these rules. **Dark mode is the priority** — design for dark first, then ensure light looks good too.

---

## Core Principles

1. **Dark-first** — Every color choice, shadow, and border is tuned for `dark:bg-gray-950` / `dark:bg-gray-900` backgrounds first. Light mode is the secondary target.
2. **Consistent, not identical** — Pages share the same tokens (colors, spacing, radii) but each page can have its own layout character.
3. **Intentional density** — Use generous spacing (`space-y-4`, `gap-4`, `p-6`) for settings/admin pages. Use tighter spacing for data tables and dashboards.
4. **No decoration without purpose** — Every shadow, border, icon, and animation must serve information hierarchy or interactivity feedback.

---

## Color Palette

### Backgrounds
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Page | `bg-gray-50` | `dark:bg-gray-950` | Full-page backgrounds (auth pages, setup wizard) |
| Surface | `bg-white` | `dark:bg-gray-800` | Cards, modals, sections, drawers |
| Inset | `bg-gray-50` | `dark:bg-gray-800/50` | Nested containers inside surfaces (info boxes, sub-forms) |
| Navbar | `bg-white` | `dark:bg-gray-900` | Sticky top bar |
| Table header | `bg-gray-50` | `dark:bg-gray-700/60` | Thead rows |

### Borders
| Token | Light | Dark |
|-------|-------|------|
| Default | `border-gray-200` | `dark:border-gray-700` |
| Subtle | `border-gray-100` | `dark:border-gray-700` |
| Input | `border-gray-300` | `dark:border-gray-600` |
| Dashed | `border-dashed border-gray-300` | `dark:border-gray-600` |

### Text
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | `text-gray-900` | `dark:text-white` | Headings, names, primary data |
| Secondary | `text-gray-600` | `dark:text-gray-400` | Body text, descriptions |
| Muted | `text-gray-500` | `dark:text-gray-400` | Labels, helper text |
| Faint | `text-gray-400` | `dark:text-gray-500` | Timestamps, IDs, placeholders |

### Accent Colors
| Color | Light bg | Dark bg | Light text | Dark text | Semantic use |
|-------|----------|---------|------------|-----------|-------------|
| Blue | `bg-blue-100` | `dark:bg-blue-900/40` | `text-blue-700` | `dark:text-blue-400` | Primary action, selected state, links, info |
| Green | `bg-green-100` | `dark:bg-green-900/40` | `text-green-700` | `dark:text-green-400` | Success, active, available |
| Red | `bg-red-100` | `dark:bg-red-900/40` | `text-red-700` | `dark:text-red-400` | Danger, error, overdue, delete |
| Amber | `bg-amber-100` | `dark:bg-amber-900/40` | `text-amber-700` | `dark:text-amber-400` | Warning, pending, locked |
| Purple | `bg-purple-100` | `dark:bg-purple-900/40` | `text-purple-700` | `dark:text-purple-400` | Roles, developer, special |
| Yellow | `bg-yellow-100` | `dark:bg-yellow-900/40` | `text-yellow-700` | `dark:text-yellow-400` | Reserved, caution |

---

## Spacing & Layout

### Page containers
- **Narrow**: `mx-auto max-w-3xl px-4 py-8` — Settings, groups, single-entity pages
- **Medium**: `mx-auto max-w-4xl px-4 py-8` — Dashboard, detail pages
- **Wide**: `mx-auto max-w-5xl px-4 py-8` — Data tables, manage pages, audit log

### Section spacing
- Between major sections: `space-y-8`
- Between items in a list: `space-y-3`
- Between form fields: `space-y-4`
- Grid gaps: `gap-3` (compact) / `gap-4` (standard)

### Grid patterns
- Stats cards: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- Quick links: `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`
- Form fields side-by-side: `grid grid-cols-2 gap-3` or `gap-4`

---

## Components

### Cards
```
rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800
```
- Hover on clickable cards: `hover:shadow-md transition`
- Section cards (settings): add `border-b border-gray-100 dark:border-gray-700` header divider

### Section Cards (Settings pattern)
Header with icon box + title + description, then content body:
```
<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-{color}-100 dark:bg-{color}-900/40">
      <Icon className="h-4 w-4 text-{color}-600 dark:text-{color}-400" />
    </div>
    <div>
      <h2 className="font-semibold text-gray-900 dark:text-white">Title</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
    </div>
  </div>
  <div className="space-y-4 p-6">...</div>
</div>
```

### Icon Boxes
Small: `flex h-8 w-8 items-center justify-center rounded-lg`
Standard: `flex h-9 w-9 items-center justify-center rounded-lg`
Large (hero): `flex h-16 w-16 items-center justify-center rounded-2xl`
Color: `bg-{color}-100 dark:bg-{color}-900/40` with `text-{color}-600 dark:text-{color}-400`

### Stat Cards (Dashboard pattern)
```
<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <div className="inline-flex rounded-lg p-2 bg-{color}-50 dark:bg-{color}-900/30">
    <Icon className="h-5 w-5 text-{color}-600 dark:text-{color}-400" />
  </div>
  <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
</div>
```

### Quick Link Cards (Manage pattern)
```
<Link className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition dark:border-gray-700 dark:bg-gray-800">
  <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition dark:bg-gray-700 dark:group-hover:bg-blue-900/40">
    <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-400" />
  </div>
  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition dark:text-white dark:group-hover:text-blue-400">{label}</span>
</Link>
```

### Expandable Cards (Groups pattern)
- Click header to toggle `expanded` state
- Chevron rotates: `transition-transform ${expanded ? 'rotate-180' : ''}`
- Expanded body: `border-t border-gray-100 dark:border-gray-700` divider
- Drag handle: `GripVertical` icon with `cursor-grab active:cursor-grabbing`
- Rank badge: `rounded-full h-5 w-5 bg-gray-100 dark:bg-gray-700 text-xs font-bold`

---

## Buttons

| Variant | Light | Dark |
|---------|-------|------|
| Primary | `bg-blue-600 text-white hover:bg-blue-700` | Same (works on both) |
| Secondary | `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50` | `dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600` |
| Danger | `bg-red-600 text-white hover:bg-red-700` | Same |
| Ghost | `text-gray-600 hover:bg-gray-100` | `dark:text-gray-400 dark:hover:bg-gray-700` |

Sizes: `sm` (px-3 py-1.5), `md` (px-4 py-2), `lg` (px-6 py-3). All `text-sm` except `lg` which is `text-base`.
Base: `rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
Loading: inline SVG spinner `animate-spin h-4 w-4`

---

## Inputs & Selects

```
rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm
placeholder-gray-400
focus:outline-none focus:ring-2 focus:ring-blue-500
dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500
```
- Error state: `border-red-400 focus:ring-red-400`
- Label: `text-sm font-medium text-gray-700 dark:text-gray-300`
- Error text: `text-xs text-red-600 dark:text-red-400`

---

## Modals

- Overlay: `fixed inset-0 z-50 bg-black/50`
- Container: `rounded-xl bg-white shadow-xl dark:bg-gray-800`
- Header: `border-b border-gray-200 dark:border-gray-700 px-6 py-4`
- Title: `text-lg font-semibold text-gray-900 dark:text-white`
- Close: `rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`
- Body: `p-6`
- Escape to close, click backdrop to close

---

## Badges

Pill shape: `rounded-full px-2.5 py-0.5 text-xs font-medium`
Colors use the accent palette: `bg-{color}-100 text-{color}-800 dark:bg-{color}-900/40 dark:text-{color}-300`

Semantic mappings:
- Active/Available: green
- Pending/Reserved: yellow
- Overdue/Damaged: red
- Info/On Loan: blue
- Inactive/Retired: gray
- Role/Special: purple

---

## Tables

```
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
      <tr>
        <th className="px-4 py-3 text-left">...</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
        <td className="px-4 py-3">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Toggle Switches

```
<button
  type="button" role="switch" aria-checked={checked}
  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
    checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
  }`}
>
  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
</button>
```
Compact variant: `h-5 w-9` with `h-4 w-4` thumb and `translate-x-4`.

---

## Navbar

- `sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900`
- Height: `h-14`
- Container: `mx-auto max-w-7xl px-4`
- Active link: `text-blue-600 dark:text-blue-400`
- Inactive link: `text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white`
- User badge: `rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300`

---

## Step Indicators (Wizard)

- Circle icons: `h-9 w-9 rounded-full`
- Done: `bg-blue-600 text-white`
- Active: `bg-blue-100 text-blue-600 ring-2 ring-blue-600 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-400`
- Inactive: `bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500`
- Connecting lines: `h-0.5 w-8` with `bg-blue-600` (done) or `bg-gray-200 dark:bg-gray-700` (pending)

---

## Auth Pages (Login, Register, Forgot Password, etc.)

- Centered layout: `flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950`
- Card width: `max-w-sm`
- Hero icon: `rounded-xl bg-blue-600 p-3` with white BookOpen icon
- Heading: `text-2xl font-bold`
- Form card: `rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800`

---

## Drawer List Items (User Manage pattern)

All list items in drawers (memberships, loans, reservations, activity) follow this pattern:

```
<div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-{status-color}-50 dark:bg-{status-color}-900/30">
      <Icon className="h-4 w-4 text-{status-color}-500" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{detail}</span> <span>·</span> <span>{detail2}</span>
      </div>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Badge />
    {/* Optional action button */}
  </div>
</div>
```

Icon box color reflects status:
- Active/On loan: blue (`bg-blue-50 dark:bg-blue-900/30`)
- Overdue/Danger: red (`bg-red-50 dark:bg-red-900/30`)
- Pending: amber (`bg-amber-50 dark:bg-amber-900/30`)
- Fulfilled/Success: green (`bg-green-50 dark:bg-green-900/30`)
- Inactive/Returned: gray (`bg-gray-100 dark:bg-gray-700`)

Empty state uses dashed border container with centered icon + text.
Action buttons (Issue Loan, Make Reservation) go BELOW the list, not above.

---

## Empty States

- Centered icon + text inside a dashed border container
- Icon: `mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600`
- Text: `text-sm text-gray-500 dark:text-gray-400`
- Container: `rounded-lg border border-dashed border-gray-200 py-8 text-center dark:border-gray-700`

---

## Alert / Info Boxes

- Info: `rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/20 dark:text-blue-400`
- Warning: `rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400`
- Danger: `rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400`
- Success: `rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-700/50 dark:bg-green-900/20 dark:text-green-400`

---

## Icons

Use **Lucide React** exclusively. Icon sizing:
- Inline with text: `h-4 w-4`
- In icon boxes: `h-4 w-4` (small box) or `h-5 w-5` (standard box)
- Hero/feature: `h-7 w-7` to `h-8 w-8`

Common mappings:
- Books: `BookOpen`
- Libraries: `Building2`, `Library`
- Users: `Users`, `Users2`
- Admin: `ShieldCheck`
- Settings: `Settings`
- Loans: `BookOpen`, `Clock`
- Reservations: `Bookmark`
- Search: `Search`
- Add: `Plus`
- Delete: `Trash2`
- Edit: `Pencil`
- Navigation: `ArrowLeft`, `ChevronRight`, `ChevronDown`, `ChevronLeft`
- Status: `CheckCircle2`, `AlertTriangle`, `Lock`
- Drag: `GripVertical`

---

## Responsive Breakpoints

- `sm:` (640px) — Side-by-side form fields, 2-col grids
- `lg:` (1024px) — 3-col or 4-col grids
- Mobile-first: single column by default, grid on larger screens

---

## Transitions

- Color/background changes: `transition-colors` or `transition`
- Shadows on hover: `hover:shadow-md transition`
- Expand/collapse: `transition-transform` on chevron rotation
- Toggle switch thumb: `transition-transform`
- Keep transitions subtle — no bouncing, no delays

---

## Anti-Patterns (Do NOT)

- No `Inter`, `Roboto`, `Arial`, or system font declarations — use Tailwind defaults
- No purple gradients on white backgrounds
- No heavy box shadows on dark mode (dark surfaces already have depth from borders)
- No inconsistent border radii — use `rounded-lg` for inputs/buttons, `rounded-xl` for cards, `rounded-full` for badges/avatars
- No orphaned hover states — if something looks clickable, it must be
- No color without a dark variant — every `bg-*`, `text-*`, `border-*` must have a `dark:` pair
- No inline styles or arbitrary Tailwind values unless truly one-off
