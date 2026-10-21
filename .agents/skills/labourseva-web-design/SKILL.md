---
name: labourseva-web-design
description: >-
  Build and update LabourSeva public and citizen portal pages using the shared
  navy, saffron, white, and slate design system adapted from the project's
  portal reference. Use for all LabourSeva UI, layout, component, and styling work.
---

# LabourSeva interface design skill

Use the provided LabourSeva portal HTML as the visual reference for this project. Recreate its design language in the existing Next.js and Tailwind application; do not copy its PHP routes, inline scripts, stale notices, third-party runtime CDNs, or hard-coded sample data as implementation instructions.

## Visual language

- Use a restrained public-service look: white surfaces, slate-50 page canvas, deep navy navigation and actions, saffron accents, slate text, and clear gray borders.
- Palette: navy `#1e3a8a`, hover navy `#1e40af`, saffron `#ea580c`, saffron light `#fb923c`, white `#ffffff`, canvas `#f8fafc`, text `#0f172a`, border `#cbd5e1`, link blue `#2563eb`.
- Prefer square-to-gentle radii (small 4–8px, cards 8–12px), restrained shadows, and clear section spacing. Avoid oversized pill controls, gradients, glass effects, and decorative animation unless a specific interaction needs them.
- Cards use a white surface, a 1px slate border, and a 4px navy top rule. On hover, shift the rule to saffron and add a light shadow. Do not apply card decoration to form fields, buttons, or non-card content.
- Primary actions are navy with white text. Secondary actions are white/transparent with a navy border and text. Links are blue and visibly underlined on hover. Focus rings are at least 3px and saffron.
- Use Inter/Noto Sans for Latin and Noto Sans Tamil for Tamil. Do not letter-space or italicize Tamil. Allow Tamil labels to wrap and give them relaxed line height.

## Shared public shell

Keep this order on public routes:

1. Skip link.
2. Slim dark-navy utility bar with the Tamil motto, A−/A+ controls, contrast control, and live IST date/time.
3. Supplied Tamil receipt/letterhead image spanning the available page width directly below the utility bar. Do not add a duplicate wordmark row above it.
4. Full-width navy primary navigation below the letterhead, with a saffron active/hover marker.
5. Breadcrumb row for routes below the home page.
6. Route content in a centered, responsive max-width container.
7. Slate-900 footer with a saffron top border.

Keep the actual project routes, component behavior, form state, accessibility semantics, and supplied local assets. Never add stale notice dates or imply official government ownership from the reference markup. Do not replace the LabourSeva identity or invent government seals.

## Citizen portal

Keep the citizen portal's dedicated navigation and workflow structure, but use the same palette, typography, card rule, button hierarchy, focus treatment, and surface contrast. Sidebar active state uses a navy tint and saffron or navy edge marker. Preserve its mobile drawer and bottom navigation.

## Page-level patterns

- Content pages begin with a clear title and, where useful, one short description and breadcrumb. The home page uses a broad, left-aligned white portal welcome panel with concise copy and two clear actions, followed by role portals and services.
- Forms use visible labels, 44px minimum controls, clear required/helper/error text, and a single primary action per step.
- Service, portal, notice, and document cards use consistent top-rule card styling and align their actions to the bottom when arranged in a grid.
- Tables and status-heavy views prioritize readable labels, clear status text plus icon, and compact responsive layouts.
- Keep interactive targets at least 44px high, layouts responsive from 360px upward, and focus visible for keyboard use. Respect reduced motion.

## Workflow

- Read the local `AGENTS.md` and relevant Next.js guide before changing route or layout conventions.
- Inspect the existing shared shell, tokens, and page behavior before styling. Prefer fixing shared components and tokens over duplicating page-specific CSS.
- Apply the shared system to the requested scope and retain route-specific information architecture and functionality.
- Review the rendered pages at mobile and desktop widths when browser access is available. Check English and Tamil wrapping, keyboard focus, and dark mode if that route supports it.
- Do not run tests or builds unless the user requests verification.
