# Sindbad — Project Documentation

This folder is the single written record of how Sindbad is being built — every decision, in order.

| Doc | Purpose | Status |
|---|---|---|
| [01-technology-decisions.md](01-technology-decisions.md) | Approved technology stack + rationale | ✅ Approved |
| [02-domain-blueprint.md](02-domain-blueprint.md) | Entities, state machines, money & ledger, business rules | ✅ Approved |
| [03-ux-information-architecture.md](03-ux-information-architecture.md) | Navigation, site maps, screen inventory, flows | ✅ Approved |
| [04-design-system.md](04-design-system.md) | Brand tokens → theme, components, RTL/dark-mode rules | ✅ Approved |
| [05-build-plan.md](05-build-plan.md) | Programming phases & module sequence | ✅ Executed (web v1 complete) |
| [06-deployment.md](06-deployment.md) | Production topology, first deploy, CI/CD, backups, ops | ✅ Live — reflects production |

## Source materials (inputs)
- `../DOC.docx` — original product specification
- `../Answers.docx` — answers to the Phase-1 discovery questions
- `../sindbad-brand-identity-standalone.html` — **the single source of truth for all design**

## Where we are
- ✅ Discovery / Q&A
- ✅ Technology selection
- ✅ Domain Blueprint
- ✅ UX / Information Architecture
- ✅ Design system + key mockups
- ✅ Build (web v1 — all phases 0–7)
- ✅ Test / harden / **deploy — LIVE at sindbad.app since 2026-07-10**
- ☐ Activate credentials (email/SMS/payment gateways) → open real signups
- ☐ Android (React Native, phase 2) → iOS (phase 3)

Current operational state, waiting list, and how to continue: **[../HANDOFF.md](../HANDOFF.md)**.
