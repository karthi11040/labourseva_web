# LabourSeva Design System (design.md)

## Public portal reference shell

Match the supplied LabourSeva portal reference across public routes: a slim deep-navy utility bar with Tamil motto, A−/A+ text sizing, contrast toggle and live IST date; the supplied Tamil letterhead displayed at full available width; a full-width navy navigation bar with a saffron active marker; a white breadcrumb strip; and route content on a pale slate canvas. Do not add a separate duplicate logo row above the letterhead. The home page begins with a wide, left-aligned white welcome panel and two prominent actions, with portal and service content below it. Keep all content and actions responsive and preserve existing route behavior.

**Product:** LabourSeva, a multi-portal e-service delivery platform (citizen, guest, retailer, distributor, employee, admin)
**Audience:** Citizens and Kendra operators, mostly on mid-range Android phones, reading English or Tamil
**Default theme:** White (light). Black (dark) is an opt-in option.
**Stack:** Next.js, Tailwind CSS, TypeScript. All visual values below are exposed as CSS variables and mapped into the Tailwind theme.

## 0. Principles

1. **Clarity over decoration.** Forms, payments and documents must be unmistakable. Content leads, chrome fades back.
2. **Mobile first.** Design at 360px wide first. Touch targets are at least 44px.
3. **Bilingual by default.** Every screen must work in English and Tamil. Tamil text is longer, taller and needs more line height.
4. **Trust and safety visible.** Show clear status, masked personal data, and an obvious portal identity so users never confuse portals.
5. **Accessible.** WCAG 2.2 AA minimum. Color is never the only signal.
6. **Tokens only.** Components use the tokens in this file. No hard-coded hex, px or font values in components.

> **Branding note.** Keep LabourSeva's own wordmark, wording, routes, and supplied local letterhead. The user-provided portal HTML is the visual reference for layout and style. Adapt it to the existing Next.js app; do not copy its PHP routes, stale notice text, inline scripts, or runtime CDN setup.

### Visual direction from the supplied portal reference

- Public shell order: skip link, dark navy utility bar, full-width supplied local letterhead directly below it (no duplicate brand row), navy navigation, breadcrumbs, route content, slate footer with saffron top rule.
- Palette: navy `#1e3a8a`, hover navy `#1e40af`, saffron `#ea580c`, light saffron `#fb923c`, link blue `#2563eb`, canvas `#f8fafc`, surface `#ffffff`, text `#0f172a`, border `#cbd5e1`.
- Cards use a white surface, slate border and 4px navy top rule; hover shifts the rule to saffron with a restrained shadow. Use gentle 8–12px corners, clear spacing and square-corner primary actions.
- The citizen portal keeps its sidebar and mobile navigation while sharing this palette, typography, card treatment and focus style.
- The reusable page workflow is in `.agents/skills/labourseva-web-design/SKILL.md`; use that skill for all LabourSeva UI work.

---

## 1. Typography

### 1.1 Font families

| Script | Family | Source | Weights |
|---|---|---|---|
| English / Latin / numerals | **Inter** | `next/font/google`, subset `latin`, `latin-ext` | 400, 500, 600, 700 |
| Tamil | **Noto Sans Tamil** | `next/font/google`, subset `tamil` | 400, 500, 600, 700 |
| Monospace (IDs, reference numbers, OTP) | **Noto Sans Mono** | `next/font/google`, subset `latin` | 400, 500 |

Self-host through `next/font` (no runtime request to Google) and use `display: swap`.

```css
:root {
  --font-sans: "Inter", "Noto Sans Tamil", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-sans-ta: "Noto Sans Tamil", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
html[lang="en"] { font-family: var(--font-sans); }
html[lang="ta"] { font-family: var(--font-sans-ta); }
```

Set `<html lang="en">` or `<html lang="ta">` from the active locale. Mark any inline text in the other language with its own `lang` attribute.

### 1.2 Type scale

| Token | Size | Line height (English) | Line height (Tamil) | Weight | Use |
|---|---|---|---|---|---|
| `text-xs` | 12px | 16px | 20px | 400 | Captions, metadata |
| `text-sm` | 14px | 20px | 24px | 400 / 500 | Labels, helper text, table cells |
| `text-base` | 16px | 24px | 28px | 400 | Body text (default) |
| `text-lg` | 18px | 28px | 32px | 400 / 500 | Lead text, emphasis |
| `text-xl` | 20px | 28px | 34px | 600 | Section headings (h4) |
| `text-2xl` | 24px | 32px | 40px | 600 | Page sections (h3) |
| `text-3xl` | 30px | 38px | 48px | 600 | Page titles (h2) |
| `text-4xl` | 36px | 44px | 56px | 700 | Hero and main titles (h1) |
| `text-5xl` | 48px | 56px | 68px | 700 | Landing hero only, desktop |

On screens under 640px, step headings down one level (`text-4xl` becomes `text-3xl`, and so on). Body text stays at 16px minimum, because smaller text hurts readability and triggers iOS input zoom.

### 1.3 Tamil-specific rules

- Use the Tamil line heights above. Tamil vowel signs extend above and below the line, and tight leading clips them.
- Never apply `letter-spacing` to Tamil text. It breaks conjunct shaping.
- Never use italic for Tamil. There is no true Tamil italic, and a synthetic slant looks wrong. Use weight or color for emphasis instead.
- Do not use `text-transform: uppercase`. It is meaningless for Tamil. Use sentence case in English too.
- Cap heading weight at 600 in Tamil. Weight 700 can close up counters at small sizes.
- Do not truncate Tamil labels with ellipsis on buttons or form labels. Let them wrap, and let components grow in height. Leave at least 40% extra room for Tamil strings.
- Line length: 45 to 75 characters for English, 35 to 60 for Tamil.

### 1.4 Numbers, currency and dates

- Use Latin digits in both languages, with `font-variant-numeric: tabular-nums` for amounts, tables and OTP.
- Currency: `₹` with Indian grouping, for example `₹1,25,000.00`. Use `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`.
- Dates: `10 Oct 2026` in English, and the locale-formatted month name in Tamil via `Intl.DateTimeFormat("ta-IN")`. Never mix numeric `10/11/2026` formats, which are ambiguous.
- Reference IDs, application numbers and OTP digits use `--font-mono`.

---

## 2. Color

### 2.1 Theme model

| Theme | Value | Notes |
|---|---|---|
| **Light (white)** | `data-theme="light"` | **Default for everyone.** Does not follow the OS setting unless the user chooses "System". |
| **Dark (black)** | `data-theme="dark"` | Opt-in. Near-black background `#0f172a`. |
| **System** | `data-theme="system"` | Opt-in. Follows `prefers-color-scheme`. |

- Store the choice in a cookie (`ls_theme`), not `localStorage`, so the server renders the right theme with no flash. The theme toggle lives in the header and in profile settings.
- Admin and employee portals follow the same toggle.

### 2.2 Light theme tokens (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-subtle` | `#f8fafc` | Alternate sections, table stripes, page canvas behind cards |
| `--surface` | `#FFFFFF` | Cards, modals, menus |
| `--surface-muted` | `#e2e8f0` | Dividers with weight, disabled fills |
| `--border` | `#cbd5e1` | Decorative borders, card outlines |
| `--border-strong` | `#94a3b8` | Input borders, checkbox outlines (3.6:1 on white) |
| `--text` | `#0f172a` | Primary text |
| `--text-secondary` | `#475569` | Secondary text |
| `--text-muted` | `#64748b` | Hints and captions. **Use on white only** (4.8:1). On `--bg-subtle` use `--text-secondary`. |
| `--primary` | `#1e3a8a` | Brand, links, primary buttons |
| `--primary-hover` | `#1e40af` | Hover |
| `--primary-active` | `#172554` | Pressed |
| `--primary-tint` | `#eff6ff` | Selected rows, soft backgrounds, secondary hover |
| `--on-primary` | `#FFFFFF` | Text on primary |
| `--success` / `--success-bg` / `--success-text` | `#15803D` / `#E7F6EC` / `#166534` | Completed, paid |
| `--warning` / `--warning-bg` / `--warning-text` | `#c2410c` / `#fff7ed` / `#9a3412` | Pending, attention |
| `--danger` / `--danger-bg` / `--danger-text` | `#B91C1C` / `#FDECEC` / `#B91C1C` | Errors, rejected, destructive |
| `--info` / `--info-bg` / `--info-text` | `#1e3a8a` / `#eff6ff` / `#1e3a8a` | Informational |
| `--focus-ring` | `#ea580c` | Focus outline |
| `--accent-orange` | `#ea580c` | Saffron accent and hover state |
| `--link` | `#2563eb` | Inline links |

### 2.3 Dark (black) theme tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0f172a` | Page background |
| `--bg-subtle` | `#111827` | Alternate sections |
| `--surface` | `#111827` | Cards, modals, menus |
| `--surface-raised` | `#1e293b` | Raised cards, popovers (elevation by lighter surface) |
| `--surface-muted` | `#334155` | Disabled fills |
| `--border` | `#1e293b` | Decorative borders |
| `--border-strong` | `#64748b` | Input borders (4.1:1 on bg) |
| `--text` | `#f8fafc` | Primary text (18.9:1) |
| `--text-secondary` | `#cbd5e1` | Secondary and muted text (7.8:1) |
| `--text-muted` | `#cbd5e1` | Same as secondary in dark |
| `--primary` | `#93c5fd` | Brand, links, primary buttons (7.8:1) |
| `--primary-hover` | `#bfdbfe` | Hover |
| `--primary-active` | `#60a5fa` | Pressed |
| `--primary-tint` | `#1e3a8a` | Selected rows, soft backgrounds |
| `--on-primary` | `#0f172a` | Text on primary (dark text on the light blue) |
| `--success` / `--success-bg` / `--success-text` | `#4ADE80` / `#14281C` / `#4ADE80` | |
| `--warning` / `--warning-bg` / `--warning-text` | `#FBBF24` / `#2E2410` / `#FBBF24` | |
| `--danger` / `--danger-bg` / `--danger-text` | `#F87171` / `#321716` / `#F87171` | |
| `--info` / `--info-bg` / `--info-text` | `#93c5fd` / `#1e3a8a` / `#93c5fd` | |
| `--focus-ring` | `#bfdbfe` | Focus outline |

### 2.4 CSS variables

```css
:root, [data-theme="light"] {
  --bg:#FFFFFF; --bg-subtle:#f8fafc; --surface:#FFFFFF; --surface-muted:#e2e8f0;
  --border:#cbd5e1; --border-strong:#94a3b8;
  --text:#0f172a; --text-secondary:#475569; --text-muted:#64748b;
  --primary:#1e3a8a; --primary-hover:#1e40af; --primary-active:#172554; --primary-tint:#eff6ff; --on-primary:#FFFFFF;
  --success:#15803D; --success-bg:#E7F6EC; --success-text:#166534;
  --warning:#c2410c; --warning-bg:#fff7ed; --warning-text:#9a3412;
  --danger:#B91C1C;  --danger-bg:#FDECEC;  --danger-text:#B91C1C;
  --info:#1e3a8a;    --info-bg:#eff6ff;    --info-text:#1e3a8a;
  --focus-ring:#ea580c; --accent-orange:#ea580c; --link:#2563eb;
  color-scheme: light;
}
[data-theme="dark"] {
  --bg:#0f172a; --bg-subtle:#111827; --surface:#111827; --surface-raised:#1e293b; --surface-muted:#334155;
  --border:#1e293b; --border-strong:#64748b;
  --text:#f8fafc; --text-secondary:#cbd5e1; --text-muted:#cbd5e1;
  --primary:#93c5fd; --primary-hover:#bfdbfe; --primary-active:#60a5fa; --primary-tint:#1e3a8a; --on-primary:#0f172a;
  --success:#4ADE80; --success-bg:#14281C; --success-text:#4ADE80;
  --warning:#FBBF24; --warning-bg:#2E2410; --warning-text:#FBBF24;
  --danger:#F87171;  --danger-bg:#321716;  --danger-text:#F87171;
  --info:#93c5fd;    --info-bg:#1e3a8a;    --info-text:#93c5fd;
  --focus-ring:#fb923c;
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  [data-theme="system"] { /* repeat the dark tokens here */ }
}
```

### 2.5 Portal identity

Each portal shows a persistent label so users and staff always know where they are. This is also a phishing and mix-up defence. Only palette colors are used.

| Portal | Header treatment | Label |
|---|---|---|
| Public / Customer | `--surface` header, primary wordmark | none |
| Guest | Same as customer | "Guest" chip |
| Retailer | `--primary-tint` header strip | "Retailer" chip |
| Distributor | `--primary-tint` header strip | "Distributor" chip |
| Employee | `#0f172a` header with white text | "Staff" chip |
| Admin | `#0f172a` header with white text and a 3px `--danger` top strip | "Admin" chip |

---

## 3. Buttons

**Shape:** gentle corner (`--radius-sm` or `--radius-md`); use full circles only for icon controls, badges, avatars and toggles. **Font:** 500 weight, `text-sm` in `sm`, `text-base` in `md` and `lg`. **Icon gap:** 8px.

### 3.1 Sizes

| Size | Height | Horizontal padding | Use |
|---|---|---|---|
| `sm` | 32px | 16px | Dense tables on desktop only |
| `md` | 40px | 20px | Default on desktop |
| `lg` | 48px | 24px | **Default on mobile**, all primary form actions |

Minimum touch target is 44px. Give `sm` buttons extra hit-area padding on touch devices.

### 3.2 Variants (light theme)

| Variant | Background | Text | Border | Hover | Active | Disabled |
|---|---|---|---|---|---|---|
| **Primary** | `#1e3a8a` | `#FFFFFF` | none | `#1e40af`, `--shadow-primary` | `#172554` | bg `#e2e8f0`, text `#64748b` |
| **Secondary** | transparent | `#1e3a8a` | 1.5px `#1e3a8a` | bg `#eff6ff` | bg `#dbeafe` | border and text `#94a3b8`, 50% opacity |
| **Ghost** | transparent | `#1e3a8a` | none | bg `#f8fafc` | bg `#cbd5e1` | text `#94a3b8` |
| **Danger** | `#B91C1C` | `#FFFFFF` | none | `#991B1B` | `#7F1D1D` | bg `#e2e8f0`, text `#64748b` |
| **Link** | none | `#1e3a8a`, underline | none | underline thickens | text `#172554` | text `#94a3b8` |

### 3.3 Variants (dark theme)

| Variant | Background | Text | Border | Hover | Active |
|---|---|---|---|---|---|
| **Primary** | `#93c5fd` | `#0f172a` | none | `#bfdbfe` | `#60a5fa` |
| **Secondary** | transparent | `#93c5fd` | 1.5px `#93c5fd` | bg `#1e3a8a` | bg `#1e40af` |
| **Ghost** | transparent | `#93c5fd` | none | bg `#1e293b` | bg `#334155` |
| **Danger** | `#F87171` | `#0f172a` | none | `#FCA5A5` | `#EF4444` |

### 3.4 States and behavior

- **Focus-visible:** 2px outline in `--focus-ring`, 2px offset. Never remove it.
- **Loading:** show an inline spinner before the label, set `aria-busy="true"` and `disabled`, keep the button width fixed, and keep the label visible. Do not swap the label for a bare spinner.
- **Disabled:** use `aria-disabled` with a visible reason near the button when the cause is not obvious (for example, "Upload a document to continue").
- **Destructive and irreversible actions** (reject, suspend, revoke, delete) always open a confirm dialog and require a reason. The confirm button uses the Danger variant.
- One primary button per view or form step.
- Icon-only buttons need an `aria-label` and a tooltip.

---

## 4. Icons

**Library:** [Lucide](https://lucide.dev) (`lucide-react`), ISC license. One library only. Do not mix icon sets.

| Property | Value |
|---|---|
| Style | Outline, rounded caps and joins |
| Sizes | 16px (inline, in buttons `sm`), 20px (default), 24px (nav, headers), 32 to 48px (empty states) |
| Stroke width | 1.75 at 20px, 2 at 24px and above |
| Color | `currentColor`, so icons follow text and theme |
| Accessibility | Decorative icons get `aria-hidden="true"`. Meaningful icon-only controls get `aria-label`. |

Always pair status icons with text. Icons never carry meaning alone.

| Area | Icon names |
|---|---|
| Navigation | `LayoutDashboard`, `Home`, `Menu`, `X`, `ChevronRight`, `ChevronDown`, `ArrowLeft` |
| Account and security | `UserRound`, `Users`, `UserCog`, `Lock`, `KeyRound`, `ShieldCheck`, `Fingerprint`, `Eye`, `EyeOff`, `LogOut` |
| OTP and contact | `Smartphone`, `Mail`, `MessageSquare`, `Bell` |
| Applications and documents | `FileText`, `FileCheck`, `ClipboardCheck`, `Upload`, `Download`, `Paperclip`, `Stamp` (signing), `BadgeCheck` (verified) |
| Money | `Wallet`, `IndianRupee`, `CreditCard`, `ReceiptText`, `History` |
| Roles and network | `Store` (retailer), `Network` (distributor), `Gift` (referral), `Share2` |
| Support | `LifeBuoy`, `MessageSquareWarning` (grievance), `CircleHelp` |
| Status | `CheckCircle2`, `Clock`, `AlertTriangle`, `XCircle`, `Info`, `Loader2` (spinner) |
| Utility | `Search`, `Filter`, `Languages`, `Sun`, `Moon`, `Settings`, `MapPin`, `Trash2`, `Pencil`, `Plus` |

---

## 5. Spacing and layout

### 5.1 Spacing scale (4px base)

| Token | Value | Typical use |
|---|---|---|
| `space-0` | 0 | |
| `space-1` | 4px | Icon to text in tight chips |
| `space-2` | 8px | Between icon and label, tight stacks |
| `space-3` | 12px | Input inner padding, list item gaps |
| `space-4` | 16px | **Default gap**, page gutter on mobile, card padding on mobile |
| `space-5` | 20px | Card padding on desktop |
| `space-6` | 24px | Section inner spacing, desktop gutter |
| `space-8` | 32px | Between content groups |
| `space-10` | 40px | Between sections on mobile |
| `space-12` | 48px | |
| `space-16` | 64px | Between sections on desktop |
| `space-24` | 96px | Landing page sections |

Use only these values for padding, margin and gap.

### 5.2 Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 6px | Inputs, chips, small controls |
| `radius-md` | 8px | Menus, tooltips, toasts |
| `radius-lg` | 10–12px | Cards, modals, dropzones |
| `radius-full` | 9999px | Buttons, badges, avatars, toggles |

Do not introduce other radius values.

### 5.3 Breakpoints and grid

| Name | Min width | Columns | Gutter | Page margin |
|---|---|---|---|---|
| `xs` (base) | 0 (design at 360) | 4 | 16px | 16px |
| `sm` | 640px | 8 | 16px | 24px |
| `md` | 768px | 8 | 24px | 32px |
| `lg` | 1024px | 12 | 24px | 32px |
| `xl` | 1280px | 12 | 24px | auto, content max width 1200px |

- Forms are a single column, max width 560px, and centered.
- Dashboards: sidebar 256px on `lg` and up, collapsing to a top bar and drawer below `lg`. Retailer and customer portals may use a bottom navigation bar (4 to 5 items) on mobile.
- Test every screen at 360px and 1440px at minimum.

---

## 6. Shadows and elevation

Light theme uses soft neutral shadows. Dark theme uses lighter surfaces plus a border for elevation, with stronger shadows only on overlays.

| Token | Light theme value | Dark theme value | Use |
|---|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(12,10,9,0.06)` | `none` | Inputs, small controls |
| `--shadow-sm` | `0 1px 3px rgba(12,10,9,0.10), 0 1px 2px rgba(12,10,9,0.06)` | `0 1px 2px rgba(0,0,0,0.4)` | Cards at rest |
| `--shadow-md` | `0 4px 14px rgba(12,10,9,0.12)` | `0 4px 14px rgba(0,0,0,0.5)` | Hovered cards, dropdowns |
| `--shadow-lg` | `0 10px 30px rgba(12,10,9,0.14)` | `0 10px 30px rgba(0,0,0,0.6)` | Popovers, sticky headers |
| `--shadow-xl` | `0 20px 50px rgba(12,10,9,0.18)` | `0 20px 50px rgba(0,0,0,0.7)` | Modals, drawers |
| `--shadow-primary` | `0 4px 14px rgba(29,63,143,0.35)` | `0 4px 14px rgba(127,162,240,0.25)` | Primary button hover |
| `--shadow-focus` | `0 0 0 2px #FFFFFF, 0 0 0 4px #1e3a8a` | `0 0 0 2px #0f172a, 0 0 0 4px #bfdbfe` | Alternative focus ring |

Dark theme cards also get `1px solid var(--border)`. A scrim sits behind modals: `rgba(12,10,9,0.5)` in light, `rgba(0,0,0,0.7)` in dark.

---

## 7. Motion

### 7.1 Timing

| Token | Duration | Use |
|---|---|---|
| `--dur-instant` | 100ms | Press feedback, toggles |
| `--dur-fast` | 150ms | Hover, color and border changes |
| `--dur-base` | 200ms | Menus, accordions, tabs |
| `--dur-slow` | 300ms | Modals, drawers, toasts |
| `--dur-slower` | 500ms | Success check, page-level transitions |

| Easing token | Value | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |

Animate only `opacity`, `transform` and colors. Never animate `width`, `height`, `top` or `left` except accordion height.

### 7.2 Effects

| Interaction | Effect |
|---|---|
| Button hover | Background color change in 150ms, plus `--shadow-primary` on primary |
| Button press | `scale(0.98)` in 100ms |
| Card hover (clickable only) | `translateY(-2px)` plus `--shadow-md` in 200ms |
| Link hover | Underline thickness grows from 1px to 2px |
| Modal and dialog enter | Scrim fades in, panel fades and scales from 0.96 to 1 in 300ms (`--ease-out`). Exit in 200ms (`--ease-in`). |
| Drawer | Slides in from the edge in 300ms |
| Dropdown and popover | Fade and `translateY(-4px)` to 0 in 150ms |
| Toast | Slides in from the top (mobile) or bottom-right (desktop) in 300ms, auto-dismisses after 6s (errors persist until closed) |
| Accordion and expand | Height transition in 200ms |
| Tab change | Content cross-fades in 150ms |
| Page route change | Content fades in over 150ms, with the top progress bar (see section 8) |
| Success confirmation | Checkmark stroke draws over 500ms |
| Form error | Field border color change in 150ms plus a one-time 4px horizontal shake in 200ms (skipped with reduced motion) |
| Skeleton shimmer | 1.4s linear loop |
| Number change (wallet balance) | Quick fade, not a count-up, so amounts are never misread mid-animation |

### 7.3 Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- No auto-advancing carousel without a visible pause button. Do not auto-rotate faster than every 6 seconds.
- No flashing content (more than 3 flashes per second).
- Spinners stay (they communicate status) but become a slow, non-rotating pulse under reduced motion.

---

## 8. Page loaders

| Loader | When to use | Notes |
|---|---|---|
| **1. Top progress bar** | Route changes and form navigations | Always shown on navigation |
| **2. Skeleton screens** | Lists, tables, cards and dashboards that load data | Preferred over spinners for content |
| **3. Brand loader (full page)** | First load of a portal, or an app shell that takes more than 300ms | Show only after a 300ms delay, and keep it up for at least 400ms once shown, to avoid flicker |
| **4. Button spinner** | Submit, pay, verify actions | Inline, keeps button width |
| **5. Payment processing overlay** | After the user pays, while the server confirms | Blocks interaction, calm message, no timeout shown to the user |
| **6. Upload progress** | Document uploads | Determinate bar with percent and cancel |

### 8.1 Top progress bar

- 3px tall, fixed to the top of the viewport, color `--primary`, `z-index` above the header.
- Starts instantly on navigation, trickles to 80%, and completes with a fade when the route is ready.
- Marked `role="progressbar"` with `aria-busy` set on the main region.

### 8.2 Skeleton screens

- Shapes match the final layout (same card and row sizes) to prevent layout shift.
- Base color `--bg-subtle`, shimmer highlight `--surface` (light) or `--surface-raised` (dark).
- Mark the region `aria-busy="true"` with a visually hidden "Loading" text.

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--border) 37%, var(--bg-subtle) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
```

### 8.3 Brand loader

- Centered on `--bg`: the LabourSeva wordmark (or a simple mark) above a 40px ring spinner in `--primary`, with a short line of text underneath ("Loading..." / Tamil equivalent).
- Reduced motion: the ring becomes a gentle opacity pulse.
- Include `role="status"` and `aria-live="polite"`.

```css
.spinner {
  width: 40px; height: 40px; border-radius: 9999px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### 8.4 Button spinner

16px ring in `currentColor` with a 2px stroke, shown to the left of the label. Same `spin` animation.

### 8.5 Payment processing overlay

- A modal-style overlay with the ring spinner, the heading "Confirming your payment" and the body "Please do not close or refresh this page. This can take up to a minute." (provide the Tamil string too).
- Never show "failed" because of a slow response. When the wait runs long, show a calm second message and a "Check payment status" action. The server webhook is the source of truth for the final result.

### 8.6 Upload progress

- A 6px determinate bar (`--primary` on `--border`) with the file name, size and percent. A cancel icon button sits at the right.
- On completion, show `CheckCircle2` in `--success` with the text "Uploaded". On failure, show `XCircle` in `--danger` with the reason and a retry button.

---

## 9. Components

Every component must define: default, hover, focus-visible, active, disabled, loading and error states where they apply, and handle empty, long-content and Tamil-length cases.

### 9.1 Text input

- Height 48px on mobile and 40px on desktop. Padding 12px 16px. Radius `--radius-sm`. Border 1px `--border-strong`. Background `--surface`.
- **Label always visible** above the field (`text-sm`, 500). Placeholder text is never the only label.
- Helper text below in `text-sm` `--text-muted`. Required fields marked with text "(required)", not color alone.
- **Hover:** border `--text-secondary`. **Focus:** border `--primary` plus 2px focus ring. **Disabled:** background `--bg-subtle`, text `--text-muted`. **Error:** border `--danger`, error text below with an `AlertTriangle` icon, `aria-invalid="true"`, linked with `aria-describedby`.
- Mobile keyboards: set `inputmode`, `type` and `autocomplete` correctly (`tel`, `email`, `numeric`, `one-time-code`).

### 9.2 Phone input

Fixed `+91` prefix segment, then a 10-digit field (`inputmode="tel"`, `autocomplete="tel-national"`). Validate on blur. Show masked numbers in confirmations (`+91 98XXXXXX21`).

### 9.3 OTP input

- 6 boxes, each 48 x 56px, mono font, `text-2xl`, centered. Auto-advance on entry, backspace moves back, paste fills all boxes. Single hidden-semantics input pattern with `autocomplete="one-time-code"` and `inputmode="numeric"`.
- Show a countdown ("Resend in 0:45"), the resend button disabled until it ends, and a clear expiry note ("Valid for 5 minutes").
- Error state shakes once and shows "That code is not correct. 3 attempts left."
- Never reveal whether a phone number is registered in the messages.

### 9.4 Select, checkbox, radio, switch

- Select uses a native element on mobile, a styled listbox on desktop. Option rows are 44px minimum.
- Checkbox and radio are 20px, with 44px touch targets. Border `--border-strong`, checked fill `--primary` with white (`--on-primary`) mark.
- Switch is 44 x 24px pill, on-state `--primary`. Always paired with a text label.

### 9.5 File upload (document vault)

- Dropzone: 16px radius, dashed 2px `--border-strong`, `--bg-subtle` fill. Hover and drag-over: border `--primary`, fill `--primary-tint`.
- Contents: `Upload` icon, "Choose a file or drag it here", accepted types and max size ("PDF, JPG or PNG, up to 5 MB").
- On mobile, offer "Take photo" and "Choose file".
- After upload: file card with name, size, status, replace and remove. Previews are generated server-side and shown watermarked.
- Errors: wrong type, too large, unreadable, with a clear fix.

### 9.6 Cards

- Radius `--radius-lg`, background `--surface`, border 1px `--border`, `--shadow-sm`, padding 16px (mobile) or 20px (desktop).
- **Service card:** icon in a 40px `--primary-tint` circle, title, one-line description, fee, and an "Apply" action. The whole card is the link target when it is a single action.
- **Stat card:** label, large value (`text-3xl`, tabular), a delta or caption.
- **Wallet card:** `Wallet` icon, "Wallet balance", amount in `text-3xl` tabular, and "Add money" (Primary) and "View ledger" (Secondary) actions.

### 9.7 Status badges

Pill, `text-xs` or `text-sm` 500 weight, 4px 10px padding, always icon plus text.

| Status | Colors | Icon |
|---|---|---|
| Draft | `--bg-subtle` / `--text-secondary` | `FileText` |
| Paid, pending verification | `--warning-bg` / `--warning-text` | `Clock` |
| In review | `--info-bg` / `--info-text` | `ClipboardCheck` |
| Returned for correction | `--warning-bg` / `--warning-text` | `AlertTriangle` |
| Rejected | `--danger-bg` / `--danger-text` | `XCircle` |
| Approved | `--success-bg` / `--success-text` | `CheckCircle2` |
| Completed | `--success-bg` / `--success-text` | `BadgeCheck` |

### 9.8 Tables

- Header row `--bg-subtle`, `text-sm` 600. Row height 48px (desktop), 1px `--border` separators, hover `--primary-tint`. Numeric columns right-aligned and tabular.
- Sticky header on scroll. Sortable columns have a button with `aria-sort`.
- **On mobile, tables become stacked cards** (label and value pairs). No horizontal scrolling for primary data.
- Include empty, loading (skeleton rows), error and "no results for this filter" states. Pagination shows "Showing 1 to 20 of 134".

### 9.9 Alerts, toasts and inline messages

- Alert: radius 12px, tinted background (`--*-bg`), 1px border in the status color, icon at left, title (600) and body. Variants: info, success, warning, danger.
- Toasts: `role="status"` (or `role="alert"` for errors), max 2 visible, include a close button. Never use a toast as the only place for a critical error. Put it inline too.

### 9.10 Modal and dialog

- Max width 480px (confirm) or 640px (form), radius 16px, `--shadow-xl`, scrim as in section 6.
- Focus moves into the dialog on open and is trapped. `Escape` closes (unless it is a blocking confirm). Focus returns to the trigger on close.
- On mobile, dialogs become bottom sheets with a drag handle.
- Reason fields are mandatory for suspend, reject and revoke actions (employee and admin).

### 9.11 Navigation

- **Header:** logo, primary links, language switcher (`EN | தமிழ்`), theme toggle (`Sun`/`Moon`), account menu. Height 64px desktop, 56px mobile.
- **Sidebar (portals):** 256px, icon plus label items at 44px height, active item `--primary-tint` background with a 3px `--primary` left bar and `aria-current="page"`.
- **Bottom navigation (mobile, citizen and retailer):** 4 to 5 items, 56px tall, icon (24px) plus label (`text-xs`).
- **Breadcrumbs** on pages deeper than two levels. **Skip link** ("Skip to main content") as the first focusable element.

### 9.12 Language switcher and theme toggle

- Segmented control with `EN` and `தமிழ்`, each at least 44px wide, `aria-label` "Language". The choice persists in a cookie and sets `lang` on `<html>`.
- Theme toggle is a three-option menu: Light (default), Dark, System. The icon shows the current state.

### 9.13 Stepper and multi-step forms

- Registration and application flows use a stepper: numbered circles (24px) connected by lines. Completed steps show a check, the current step is filled with `--primary`, and future steps are outlined.
- On mobile, collapse to "Step 2 of 5: Documents" with a thin progress bar.
- Save progress automatically. Back never loses data. Validate per step, and move focus to the first error.

### 9.14 Tabs and accordion

- Tabs: underline style, active 2px `--primary` underline and `--text` color. Keyboard: arrow keys move, `Home`/`End` jump. Scroll horizontally on mobile with visible edge fade.
- Accordion: full-width header button with `ChevronDown` that rotates 180 degrees in 200ms, `aria-expanded`, and content that animates height.

### 9.15 Masked personal data field

- Sensitive values (phone, ID numbers, address) show masked by default (`XXXX XXXX 4821`).
- A "Reveal" icon button (`Eye`) shows the full value for 30 seconds, then re-masks. In staff portals, each reveal is a logged action and requires no extra typing but shows a small "This view is recorded" note.
- Never place full values in URLs, page titles or toasts.

### 9.16 Document viewer

- Inline preview pane beside the form data on desktop, and tabbed (Data | Document) on mobile. Controls: zoom, rotate, full screen.
- Previews carry a diagonal faint watermark with the viewer's role and timestamp. The download action is separate and logged. Files open through short-lived tokens, never direct URLs.

### 9.17 Receipts and certificates (print and PDF)

- A4, white background always (ignore dark theme), 24mm margins, Noto Sans and Noto Sans Tamil embedded.
- Header with the LabourSeva wordmark, document title, reference number (mono), date, line items with right-aligned amounts, a total row, and footer notes. Include a QR code linking to a verification page.

### 9.18 Empty, error and offline states

- **Empty:** 48px icon in `--text-muted`, a one-line explanation, and one clear action ("No applications yet. Start your first application.").
- **Error page:** generic message, an incident reference ID, and a safe "Go home" action. No stack traces or internal details.
- **Offline:** a banner "You are offline. Your changes will be saved when you reconnect."

### 9.19 Session timeout warning

A modal 2 minutes before expiry in staff and partner portals: "Your session will end in 2:00. Stay signed in?" with Primary "Stay signed in" and Secondary "Sign out". Announced with `role="alertdialog"`.

---

## 10. Accessibility checklist

- [ ] Text contrast at least 4.5:1, large text and UI boundaries at least 3:1 (the tokens above are pre-checked).
- [ ] Visible focus on every interactive element, never removed.
- [ ] Full keyboard operation: `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, arrow keys in menus, tabs and listboxes.
- [ ] Every input has a visible label, and errors are linked with `aria-describedby`.
- [ ] Status never conveyed by color alone.
- [ ] `lang` set correctly, with `lang` on mixed-language snippets.
- [ ] Touch targets 44px or larger. No hover-only functionality.
- [ ] Reduced-motion respected. No auto-playing motion without a pause control.
- [ ] Live regions (`role="status"` or `role="alert"`) for loaders, toasts and async results.
- [ ] Tested with a screen reader (TalkBack on Android, NVDA on desktop) for the registration, payment and application flows.

## 11. Content guidelines

- Sentence case everywhere. Reserve all caps for acronyms (OTP, KYC, PAN).
- Plain words, short sentences. Write for readers with limited digital experience.
- Every user-facing string lives in the i18n files as a complete sentence. Never build sentences by joining fragments, because Tamil word order differs.
- Tamil copy is written or reviewed by a native speaker. Do not ship machine translation unreviewed.
- Button labels are verbs ("Pay fee", "Upload document", "Send OTP").
- Errors say what happened and what to do next. They never blame the user and never expose system detail.
- Never reveal whether an account exists in login or OTP messages.

## 12. Anti-patterns

- Hard-coded hex, px or font values in components.
- Placeholder-only labels, or error text in color only.
- Italic or letter-spaced Tamil text, or uppercase transforms.
- Truncating Tamil button labels instead of letting them wrap.
- More than one primary button per view.
- Copying official seals or asserting government ownership without authorization. The supplied visual reference does not change LabourSeva's identity.
- Dark mode by simple color inversion. Use the tokens above.
- Count-up animations on money amounts.
- Spinner-only loading for content that could use a skeleton.
- Direct, guessable file URLs in the document viewer.

## 13. QA checklist (definition of done)

- [ ] Renders correctly in light (default) and dark themes.
- [ ] Renders correctly in English and Tamil, with no clipping at Tamil line heights.
- [ ] All states implemented: default, hover, focus-visible, active, disabled, loading, error, empty.
- [ ] Uses tokens only. No stray hex, px or font values.
- [ ] Verified at 360px and 1440px.
- [ ] Keyboard and screen-reader pass done.
- [ ] Reduced-motion behaviour verified.
- [ ] Loading, empty, error and offline states designed.
- [ ] Sensitive data masked by default and never logged or placed in URLs.

## 14. Implementation notes for the build agent

1. Create `packages/ui/tokens.css` with the variables from sections 2.4, 5, 6 and 7, and map them in `tailwind.config` (`colors`, `spacing`, `borderRadius`, `boxShadow`, `transitionDuration`, `transitionTimingFunction`).
2. Load fonts with `next/font/google` (Noto Sans, Noto Sans Tamil, Noto Sans Mono) and apply `lang`-based font stacks.
3. Implement the theme with a server-readable cookie (`ls_theme`) so there is no flash, defaulting to `light`.
4. Build components in `packages/ui` in this order: Button, Input, OTP input, Select, Checkbox/Radio/Switch, Card, Badge, Alert/Toast, Modal, Table, Tabs, Stepper, Navigation, Loaders, File upload, Masked field, Document viewer.
5. Add Storybook (or a `/design` route behind admin access) showing each component in light, dark, English and Tamil.
