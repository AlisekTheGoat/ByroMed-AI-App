# ByroMed AI – Shared Plan and Next Steps

This document tracks ongoing plans, decisions, and next steps.

## Design System Notes
- Fonts: Inter, Montserrat, Roboto, Public Sans, Tinos (Czech + English). Sensation/Arial optional via system.
- Tailwind utility-first styling with medical-themed palette.
- Components: Buttons (primary/secondary/danger), Cards, Forms, Navigation.
- Accessibility: high contrast, keyboard navigation, ARIA where appropriate.

## Icons
- Using Bootstrap Icons (free).
- Included via CDN in `index.html`.
- Usage example: `<i class="bi bi-plus-lg" />`.

## Calendar
- Storage via Electron IPC with localStorage fallback for dev.
- Views: Day (timeline), Week, Month, Upcoming (next 3).
- Today highlighting: full-cell primary color with hover.
- "DNES" button centers today for all layouts.

## Dashboard
- TODO list widget with priority and optional patient selection.
- Complete action: strike-through + ease-out fade, then auto-remove.
- Persist tasks to localStorage.

## Authentication
- Target: Auth0 integration (`@auth0/auth0-react`).
- Interim: local mock login to unblock UI; header displays user name.
- Next: wire Auth0 domain/clientId via env; protect routes.

## Next Tasks
- [ ] Wire Auth0 Provider and login/logout buttons.
- [ ] Patients data source: stabilize Electron IPC; avoid Prisma in renderer.
- [ ] Global button unification: ensure `.btn.btn-primary` usage across pages.
- [ ] Add unit tests for calendar scheduling edge cases.
