# Sindbad — Domain Blueprint

**Status:** ✅ **COMPLETE — approved 2026-06-25** (domain model · state machines · money & ledger · business rules). Next phase: UX / Information Architecture.

This is the precise specification of *what* Sindbad is — entities, states, rules — and the backbone the database, API, and screens are derived from.

---

## 1. Load-bearing modeling decisions (approved)
1. **User ≠ Account.** `User` = a login (email/phone, password, security). `Account` = the marketplace participant (profile, credibility, wallet, missions). Linked by `AccountMember` with role **Owner / Manager**. Personal = one Owner; Commercial = one Owner + many Managers (full permissions in v1). A user can own a personal account *and* manage commercial ones.
2. **Missions is a supertype** with two specializations, **Trip** and **Shipment** — matching and lists treat them uniformly.
3. **A Deal evolves from a Request** — "Request" and "Negotiation" are early *states* of one `Deal`, not separate entities.
4. **All money is a double-entry ledger.** Balances are derived, never edited; **escrow is a system-owned account**; every movement is an immutable balanced transaction.
5. **Catalogs are admin-configurable, not hard-coded** (countries, categories, fee multipliers, verification types, notification types, settings).
6. **One polymorphic `Attachment` model** is reused everywhere photos appear; single compress/thumbnail pipeline into MinIO; KYC kept private.

## 2. Entities by module

**1 · Identity & Access** — `User` · `Account` (Personal/Commercial) · `AccountMember` (Owner/Manager) · `Session` (multi-device) · `OtpChallenge` · `BlockedIdentity` (phone, national ID, passport, full name).

**2 · Profile & Preferences** — `Profile` (display name [approval + 60-day lock], full name [approval + doc], nationality, national ID, passport…) · `Address` (receiving/pickup, default) · `CategoryPreference` (Accept/Reject/Ask) · `AccountPreferences` (shop countries, box/basket, customs stance, notes) · `ChangeRequest` (the "Edit Approval", before→after).

**3 · Configuration & Catalogs** — `Country` (per-language, states, price param → C) · `Category` + `CategoryGroup` (per-language, multiplier T) · `VerificationType` (price, duration, points, inputs) · `NotificationType` · `FeeConfig` (B, W, F, C, T) + `FeeConfigProposal` (monthly SMART → admin approval) · `StaticPage` (per-language CMS) · `SystemSetting`.

**4 · Missions** — `Mission` (owner, origin+dest country, kind, isCyclic, status) · `Trip` (**receivingStart [optional → open/now]**, receivingEnd, **tripDate [private — hidden from other users]**, deliveryDate, **receivingAddress [chosen from the traveler's saved Addresses; full address PRIVATE — revealed to the shopper once a deal is dual-agreed; used for Box shipments]**, **deliveryLocation [destination city/neighbourhood only, no details — PUBLIC on trip detail]**, traveler count, allowed categories, **available weight [depletes for one-time trips; NOT depleted for cyclic]**, fee, notes, `TripVerification`) · `Shipment` (Box/Basket, fee) · `Item` (details, URL, volumetric weight, count, category, notes, photos, declared value).

**5 · Matching** — `Match` (Trip↔Shipment satisfying countries + receiving-window dates + categories + available weight; Ask-flagged marker).

**6 · Deals** — `Deal` (Trip+Shipment+two accounts; Box/Basket; Basket pricingMode Fixed/Variable; Cash/In-app; agreed fee; product price; status; escrow link) · `DealEvent` (append-only history + negotiation log) · `DealFlag` (Delayed, Customs [trip-level], Partially, Lost/Damaged) · `DealResolution` (dual-approval green flag).

**7 · Wallet & Payments** — `Wallet` (USD base, may hold EGP) · `Transaction` + `LedgerEntry` (double-entry) · `EscrowHold` · `DepositRequest` · `WithdrawalRequest` · `BankAccount` · `GatewayTransaction` · `FxRate`.

**8 · Trust** — `Verification` · `CredibilityEvent` (weekly recompute, time-weighted) · `Review` (blind, +12h…+12d, response, delete-yes/edit-no) · `UserFlag` (Outstanding/Follow/Block).

**9 · Communication** — `ChatThread` · `ChatMessage` (status, 15-min edit, unsend, reply, offline-sync) · `Notification` (in-app/email/SMS; push v2) · `NotificationPreference`.

**10 · Moderation** — `Complaint` (vs Request/Deal/Chat) · `ModerationAction` (deduct/hold/block).

**11 · Staff & RBAC + Audit** — `Staff` · `Team` · `Permission` (granular CRUD, TOTP 2FA) · `AuditLog` (immutable).

**12 · Media** — `Attachment` (polymorphic; original + compressed + thumbnail; KYC private).

## 3. State machines

### Deal lifecycle (Box & Basket) — ✅ approved 2026-06-25
**Path:** Request → Negotiation → Ongoing → Arrived → Ready for Pickup → Completed. *Cancelled* is reachable per the rules below.
- **Ongoing sub-steps** — Box: Ordered (shopper) → Shipped (shopper) → Delivered-to-traveler (shopper) → Received (traveler). Basket: Ordered (traveler) → Shipped (traveler) → Received (traveler).
- **Negotiation:** either party may change fee / send inquiry; both must accept to enter Ongoing. In-app payment is escrowed on acceptance.
- **Arrived:** traveler marks the trip arrived; each deal is classified Arrived / Partially arrived / Missed behind.
- **Ready for Pickup:** a bulk action over the traveler's deals on that trip — **excludes deals flagged Partially/Missed**, which are handled individually. *(decision adopted 2026-06-25)*
- **Completed:** shopper confirms receipt; in-app escrow releases to the traveler.
- **Cancellation:** both may cancel while only *accepted*; the shopper may cancel before Completed, but at *Ordered or later* the system warns, requires a written reason, and needs **staff approval**; all funds are refunded on cancel; not accepted by the receiving-window close → auto-cancel + cancel all negotiations on that trip.
- **Auto-flags:** Delayed (removed at destination/pickup), Customs (trip-level, inherited except "traveler pays all customs"; sharing negotiated in chat), Partially (Lost/Damaged or Delayed).
- **Resolution (green flag):** deals flagged Partially/Customs require a dual-approved resolution before Completed.
- **Money hooks:** escrow funded on acceptance (Box = fee; Basket = fee + price; Variable = estimate → reconcile); released on Completed; refunded on Cancelled; cash deals are status-only.

### Trip approval — ✅ 2026-06-25  *(Shipments require no approval)*
Draft → Pending approval → Active / Rejected (with reason). Editing a locked field or a date on an Active trip raises a **ChangeRequest** → admin re-approval (Edit Approvals, before→after). Cyclic trips stay Active; others Expire at the receiving-window close.

### Verification — ✅ 2026-06-25
New (fee paid from wallet) → Studying → Verified (points applied at the weekly recompute) / Needs review (back to user) / Rejected. **The fee is kept (non-refundable) even on rejection.**

### Deposit — ✅ 2026-06-25
Card / Apple Pay: Initiated → Succeeded / Failed (gateway, instant). Instapay / bank: Requested (show transfer details + order no.) → user transfers → Pending review (amount + reference) → Confirmed (staff match) / Rejected.

### Withdrawal — ✅ 2026-06-25
Requested (amount, currency, bank account) → **funds held immediately** → Under review → Approved → Paid (staff executes, funds debited) / Rejected (hold released).

### Review window — ✅ 2026-06-25
Locked (until Completed + 12h) → Open (12 days, blind) → Revealed (both submit, or the window closes) → Closed. Response allowed after reveal; delete yes / edit no.

### Complaint — ✅ 2026-06-25
New (vs Request / Deal / Chat) → Under review (staff contacts both) → Resolved (decision + ModerationAction: deduct / hold / block) / Dismissed.

## 4. Money & ledger model — ✅ approved 2026-06-25
**Principles:** integer minor units (no floats); **USD base**; wallet holds USD + EGP as separate balances (no direct conversion; EGP may pay a USD obligation at the daily rate + admin spread); every movement is a balanced, **immutable** double-entry transaction (corrections = reversing entries).

**Chart of accounts:** User wallet (per user, per currency — liability) · Escrow (liability) · Gateway clearing (asset) · Company bank (asset) · Withdrawals payable (liability) · Platform revenue (income; **0 at launch**).

**Money movements (debit → credit):**
- Card/Apple Pay deposit: Gateway clearing → User wallet
- Instapay/bank deposit (staff-confirmed): Company bank → User wallet
- Deal accepted (in-app): Shopper wallet → Escrow
- Completed: Escrow → Traveler wallet (+ Platform revenue for commission)
- Cancelled: Escrow → Shopper wallet
- Withdrawal requested: User wallet → Withdrawals payable (hold)
- Withdrawal Paid: Withdrawals payable → Company bank · Rejected: → User wallet (release)
- P2P transfer (same currency): Sender wallet → Recipient wallet

**Fee formula:** `Fee/item = B × T × (W × volumetricWeight) × C`; `Fee/deal = F + Σ item fees`. B = basket multiplier (Box = 1), T = category, W = weight $/kg, C = country-pair, F = floor — all admin-set. Worked: Box USA→Egypt (F=5, W=3, C=1.2), electronics 2 kg + clothes 1.5 kg → **$21.20**; same items as Basket (B=1.3) → **$26.06**.

**Escrow:** in-app Box escrows the fee; Basket escrows fee + price; **Variable price** escrows an estimate and **reconciles (top-up / refund) at completion**. Release on Completed; refund on Cancelled; cash deals are status-only.

**FX:** paying a USD obligation from EGP converts at the daily rate + admin spread; spread → Platform FX revenue (0 at launch).

**Limits:** per-transaction min 500 EGP (~$10) / max 50,000 EGP (~$1,000), admin-editable. Transfers: OTP + AML caps, no fee. Withdrawals: manual, funds held at request.

**SMART recalibration:** a monthly job back-fits F, W, C, T, B from executed deals → **admin approves** before the formula updates.

## 5. Business rules — Credibility & Matching — ✅ approved 2026-06-25

### Credibility Score
Starts 0, no cap, **never displays below 0** (raw negative → auto-flag for block), recomputed **weekly**, shown as number + tier badge.
**Score = Σ verification points + Σ(trip pts × age-weight) + Σ(shipment pts × age-weight) + Σ(review pts × age-weight) + Σ admin adjustments.**
- Verification points: per VerificationType, while verified — **not** time-weighted.
- Trips / Shipments / Reviews: admin point values, **time-weighted**.
- Review points: admin star→± map (default 5★ +10, 4★ +5, 3★ 0, 2★ −5, 1★ −10).
- Admin adjustments: manual ±, not time-weighted.
- **Time-weighting:** 0–12 mo ×1.0; **13–36 mo ×0.5**; >36 mo = 0 (all admin-set).
- Tiers (admin-editable thresholds): New 0–9 · Bronze 10–29 · Silver 30–59 · Gold 60–89 · Platinum 90+.

### Matching
Trip matches Shipment when **all** hold: (1) exact origin + destination countries; (2) trip receiving window still open (today ≤ Receiving End); (3) every item category allowed — Reject ⇒ no match, all Accept ⇒ match, any Ask (none Reject) ⇒ match but flagged for traveler confirmation; (4) shipment total volumetric weight ≤ trip remaining available weight (cyclic trips do **not** deplete weight, so capacity stays full while active).
- Two-way; computed on mission create/update + periodic sweep; new matches notify; default sort by credibility.
- Shop-country / customs preferences are **not** part of matching.
- **Shipments have no dates in v1** (no "needed-by" date) — decision 2026-06-25.
