# Sindbad — UX / Information Architecture

**Status:** ✅ **COMPLETE — approved 2026-06-25** (navigation · site maps · screen inventory · key flows).

The navigation model (from the spec): **bottom tabs (mobile) / top nav (desktop) = main divisions**, **top sub-tabs = sections**, plus a **persistent header**.

## 1. User web app (PWA) — ✅ approved 2026-06-25

### Header (always present)
Logo · ☰ Menu · Language EN/AR · Notifications (unread count) · Chat (unread count) · Profile + credibility.
**☰ Menu:** Settings · Appearance (light/dark) · static pages (About, Terms, Privacy, Contact, User Guide, FAQ) · Login/Register (visitors).

### Bottom tabs (5)
1. **Home** — personalized dashboard: My matches · active-deal summary · quick "post" actions · featured. *(Browsing lives in Trips/Shipments — option (a).)*
2. **Trips** — Browse trips · My Trips · Post a trip.
3. **Shipments** — Browse shipments · My Shipments · Post a shipment.
4. **Deals** — Requests · Ongoing · Completed · Cancelled.
5. **Account** — Profile · Credibility · Verification · **Wallet** (Balance · Deposit · Withdraw · Send · Transactions) · Analytics · Settings.

### Rules
- **Interconnection (first-class on every screen):** mission pages show their matches, requests, and accepted deals; deal pages link to trip, shipment, items, and both users; every display name links to that user's profile (with their active missions).
- **Visitors:** browse Home & static pages **view-only**; any action prompts Login/Register.
- **Desktop:** top nav bar + rich marketplace homepage + left sidebar for Account.

## 2. Admin backend — ✅ approved 2026-06-25
**Shell:** left sidebar + top bar; analytics dashboard = home; every module **RBAC-gated**; admin **2FA**; **all actions audit-logged**. Eight sidebar groups:
1. **Dashboard** — analytics home, KPI widgets (editable in v2)
2. **Users & KYC** — Accounts · Verifications · Edit approvals · Commercial approvals · Blocked users
3. **Marketplace** — Trips (+ approvals) · Shipments · Deals · Reviews
4. **Finance** — Deposits · Withdrawals · Ledger & transactions · Adjustments · FX rates · Gateways
5. **Support** — Complaints · Chat monitor · Notifications (send + types)
6. **Pricing & Fees** — Multipliers (B·W·F·C·T) · SMART recalibration (approve before live)
7. **Catalogs & Settings** — Countries · Categories & groups · Verification types · Static pages (CMS) · System settings
8. **Administration** — Staff · Teams · Permissions (RBAC) · Audit log

## 3. Screen inventory — ✅ approved 2026-06-25  (~91 screens, web v1)

### User web app (PWA) — ~54
- **Auth & onboarding (6):** Landing · Register · OTP verify · Login · Forgot/reset · Account-blocked notice
- **Home (2):** Dashboard · Search & filter results
- **Trips (5):** Browse · Trip detail (public) · My Trips · Post/Edit trip (+ verification upload) · Trip verification status
- **Shipments (5):** Browse · Shipment detail (public) · My Shipments · Post/Edit shipment · Item editor
- **Deals (6):** Deals list (Requests/Ongoing/Completed/Cancelled) · Deal detail (+ status actions) · Request & negotiation · Resolution (green-flag) · Cancellation request · Status updates
- **Reviews (2):** Leave review · Review thread & response
- **Chat (3):** Chat list · Conversation · New-message picker (+ floating widget)
- **Notifications (2):** List · Detail
- **Account & profile (8):** Account home · Profile view/edit · Addresses · Traveler/shop preferences · Credibility detail (factors) · Personal analytics · Settings · Notification preferences
- **Verification (3):** Verifiable-details list · Request verification · Request status
- **Wallet (6):** Overview (USD/EGP) · Deposit · Withdraw · Send money · Bank accounts · Transactions (+ detail/PDF export)
- **Social (3):** Public user profile · **Favorites/Contacts** · Flags (Outstanding/Follow/Block)
- **Complaints (3):** Raise · My complaints · Detail
- **Static (1):** Static-page viewer

### Admin backend — ~37
- **Auth (2):** Login + 2FA · Forgot password
- **Dashboard (1):** Analytics home
- **Users & KYC (6):** Accounts list · Account detail · Verifications queue · Verification review · Edit approvals · Commercial approvals
- **Marketplace (6):** Trips list + approval · Trip detail/approve · Shipments · Deals list · Deal detail · Reviews moderation
- **Finance (6):** Deposits · Withdrawals · Ledger/transactions · Adjustments · FX rates · Gateways config
- **Support (4):** Complaints queue · Complaint detail · Chat monitor · Notification composer/log
- **Pricing & Fees (2):** Multipliers editor · SMART recalibration review
- **Catalogs & Settings (6):** Countries · Categories & groups · Verification types · Notification types · Static-pages CMS · System settings
- **Administration (4):** Staff · Teams · Permissions matrix · Audit log

**Seed data to produce:** an initial **Categories list** (shoppable / air-carryable), grouped into Category Groups, each with a default T-multiplier (admin-editable).
**Cross-cutting UX rules:** all lists sortable/filterable (trips/shipments default-sort by credibility, showing the score); photos support upload/drag&drop/paste, show thumbnails, expand on click, and are compressed; every unit cross-links to its related units.

## 4. Key flows — ✅ approved 2026-06-25
1. **Onboarding:** Visitor (view-only) → Register (email/phone + password) → OTP verify → Home → optional profile + verifications.
2. **Post Trip:** New trip (route · optional start / required end receiving dates · private trip date · delivery · weight · categories · fee) → upload flight + passport → admin approval → Active → matched shipments + requests.
3. **Post Shipment:** New shipment (countries · Box/Basket · items · fee) → Active (no approval) → matched trips + requests.
4. **Match → Deal:** match → Request → Negotiation (fee/inquiry/accept/reject) → both accept → escrow funds (Box=fee; Basket=fee+price; Variable=estimate) → Ongoing (Box/Basket steps) → Arrived → Ready for Pickup → Completed → escrow released.
5. **Cancellation:** free while accepted; shopper before Completed (Ordered+ → warn + reason + staff approval); refund.
6. **Disputes:** Partially/Customs → Resolution (green flag) before Completed; or Complaint → staff → decision + punishment.
7. **Review:** 12h after Completed → blind reviews (12-day window) → reveal → weekly credibility recompute.
8. **Wallet:** Deposit (card/Apple Pay instant · Instapay manual) → pay / send (Favorites) → Withdraw (manual, funds held).
9. **Verification:** pick detail → pay fee → submit (incl. 5-sec liveness) → admin review → Verified → credibility.
