---
name: design-system-government-of-tamil-nadu
description: >
  Apply the Government of Tamil Nadu design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for dashboard interfaces.
---

# Government of Tamil Nadu — Design System Skill

## When to Use

- Building new UI components for Government of Tamil Nadu.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing for dashboard pages.
- Checking designs against the extracted token set.

## Context

- **Product:** Government of Tamil Nadu — https://www.tn.gov.in/schemes.php
- **Surface:** dashboard
- **Audience:** Business users and internal teams
- **Character:** Data-driven application interface with a rich, diverse color palette and 7 typefaces.

## Tokens

### Colors

| Token | Value | Role |
|-------|-------|------|
| --color-dark-blue-1 | `#1937B2` | Background Dark |
| color-12 | `#ECEEF5` | Background |
| color-13 | `#F0F3F4` | Background |
| color-11 | `#CAD1EC` | Surface |
| color-5 | `#555555` | Text Primary |
| color-9 | `#7A868F` | Text Secondary |
| color-6 | `#0A46ED` | Accent |
| color-7 | `#516BEB` | Accent |
| color-8 | `#E65100` | Accent |
| color-10 | `#6098FF` | Accent |
| color-1 | `#000000` | Background Dark |
| color-3 | `#374781` | Background Dark |
| color-4 | `#025074` | Background Dark |
| color-14 | `#F0F8FF` | Text Light |
| color-15 | `#FFFFFF` | Text Light |

### Typography

**Font stack:** sans-serif, Titillium Web, Roboto, Lato, Open Sans, Font Awesome 6 Free

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 0px | Captions, metadata |
| text-sm | 12px | Labels, secondary text |
| text-base | 14px | Body text (default) |
| text-lg | 16px | Subheadings, emphasis |
| text-xl | 20px | Section headings |
| text-2xl | 23px | Section headings |
| text-3xl | 28px | Section headings |

**Weight scale:** 400 · 500 · 600 · 700 · 900
**Line heights:** 26px · 21.5385px · 16.1px · 14.95px · 0px · 45px · 31px · 25.3846px · 30px · 23.0769px · 20px · 22.217px · 19.88px · 18.4px · 32.2px · 24.6154px · 32.3077px · 18.4615px · 16px · 14px

### Spacing

**Base unit:** 4px

`space-1: 1px` · `space-2: 2px` · `space-3: 3px` · `space-4: 4px` · `space-5: 5px` · `space-6: 7px` · `space-7: 8px` · `space-8: 10px` · `space-9: 12px` · `space-10: 14px` · `space-11: 15px` · `space-12: 16px` · `space-13: 17px` · `space-14: 18px` · `space-15: 20px` · `space-16: 24px` · `space-17: 30px` · `space-18: 31px` · `space-19: 35px` · `space-20: 50px`

### Shapes

**Border radius:** `radius-sm: 5px` · `radius-md: 10px` · `radius-lg: 12px` · `radius-full: 50%` · `radius-full: 70px`

### Elevation

- **shadow-sm:** `rgba(0, 0, 0, 0.2) 1px 0px 3px 0px`
- **shadow-md:** `rgba(0, 0, 0, 0.4) 0px 15px 25px 0px`
- **shadow-lg:** `rgba(0, 0, 0, 0.25) 0px 54px 55px 0px, rgba(0, 0, 0, 0.12) 0px -12px 30px 0px, rgba(0, 0, 0, 0.12) 0px 4px 6px 0px, rgba(0, 0, 0, 0.17) 0px 12px 13px 0px, rgba(0, 0, 0, 0.09) 0px -3px 5px 0px`

### Motion

- **duration-fast:** `all`
- **duration-fast:** `none`
- **duration-fast:** `fadeInUp`
- **duration-fast:** `border-color 0.15s`
- **duration-fast:** `color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out`
- **duration-base:** `0.3s`
- **duration-base:** `0.3s ease-in-out`
- **duration-slow:** `0.4s`
- **duration-slow:** `0.5s`
- **duration-slow:** `1s`
- **duration-slow:** `3s infinite bounce`

## Component Inventory

- **Buttons:** 20 detected
- **Links:** 72 detected
- **Inputs:** 1 detected
- **Navigation:** 1 elements
- **Lists:** 14 detected
- **Images:** 43 detected

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 4px spacing grid.
- Meet WCAG 2.2 AA contrast minimums.

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values. Pin to the detected set (5px, 10px, 12px, 50%, 70px).
- Do not use decorative shadows on data-dense layouts.
- Do not hide critical status information behind interactions.
- Do not ship components without defining hover, focus-visible, and disabled states.

## Tone

Efficient, data-forward, action-oriented. Labels over sentences.

## Authoring Workflow

When creating or documenting a component for this system:

1. State intent — one sentence on purpose.
2. Map tokens — list every token the component uses.
3. Define anatomy — named parts with token assignments.
4. Specify states — default, hover, focus-visible, active, disabled, loading, error, empty.
5. Describe interactions — keyboard, pointer, touch, edge cases.
6. Add a11y criteria — testable pass/fail checks.
7. List anti-patterns — concrete misuse examples.
8. Close with the Definition of Done checklist.

## Output Structure

Component guidelines must contain, in order:

1. Overview (purpose, when to use, when not to use)
2. Tokens and foundations
3. Anatomy, variants, responsive behavior
4. States and interactions
5. Accessibility (ARIA, contrast, focus, screen reader)
6. Content guidelines (copy rules, tone)
7. Anti-patterns with reasoning

## Component Requirements

- Reference only tokens from the tables above.
- Define all states: default, hover, focus-visible, active, disabled, loading, error.
- Handle edge cases: empty, overflow, truncation, max content.
- Include keyboard navigation behavior.
- Document ARIA roles and labels.

## Definition of Done

- Default state renders (smoke test).
- All states visually verified.
- Zero hardcoded visual values — tokens only.
- Keyboard navigation works without pointer.
- No critical a11y violations.
- Tested at min and max breakpoint.
- At least one anti-pattern documented.
- Purpose, usage, and limitations documented.
