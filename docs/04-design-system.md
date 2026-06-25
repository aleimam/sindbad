# Sindbad — Design System

**Status:** ✅ **approved 2026-06-25.** Single source of truth: `../sindbad-brand-identity-standalone.html`.

## Colours (with UI roles)
| Token | Hex | Role |
|---|---|---|
| Royal Blue | `#2563EB` | Primary actions, links, active nav |
| Sky Blue | `#38BDF8` | Highlights, illustration accents |
| Navy | `#0F172A` | Text, headers, dark-mode surfaces |
| Teal | `#14B8A6` | Positive / trust (verified, completed) |
| Amber | `#F59E0B` | Attention (negotiating, pending, Gold tier) |
| Logo gradient | `#0A57FF → #05215B` | Logo art only |
| Neutrals | `#334155 #64748B #94A3B8 #E2E8F0 #F8FAFC #FFFFFF` | Text, borders, surfaces |
| Tints | `#EAF3FF #E8EEF8 #F7FAFF` | Ghost buttons, subtle fills |
| Error | `#EF4444` | Danger / destructive |

## Typography
- **Display / headings / wordmark:** Sora (600–700).
- **UI / body:** Inter (400 / 500 / 600).
- **Campaign / marketing:** Montserrat.
- **Arabic (RTL):** a companion Arabic face (e.g. IBM Plex Sans Arabic / Cairo). **Latin/Western numerals everywhere**, both languages.
- **Lockup rule:** the slogan "Powered by Travelers" is justified to the exact width of the "Sindbad" wordmark — same start and end points.

## Shape & elevation
- **Radii:** pill `999px` · button/input `14px` · panel `18px` · card `20px`.
- Flat, clean surfaces; soft subtle shadows in-app; 1px light-grey borders for structure.

## Components
Buttons (primary royal · secondary outline · ghost tint) · inputs · **deal-status pills** (Negotiating amber · Ongoing blue · Completed teal · Cancelled red) · **credibility tier badges** (New · Bronze · Silver · Gold · Platinum) · **category chips** (icon + label) · cards (trip / shipment / deal) · avatars (initials) · top header · bottom tab bar.

## Theming & i18n
- **Dark mode at launch** — same tokens, Navy surfaces, lightened text.
- **RTL** — full layout mirror for Arabic (alignment, icons, card direction).
- Outline icon set throughout.

## Accessibility
- **WCAG AA** contrast; minimum 11px text; visible focus rings; tap targets ≥ 44px; semantic roles/labels.
