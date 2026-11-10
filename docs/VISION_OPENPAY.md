# OpenPay — Vision, philosophy, architecture and roadmap

> Author: Sebastián Murcia Sánchez
> Last updated: 2026-09-16
> Status: **✅ official vision, adopted on 2026-09-16.**
> Replaces the "digital cash" plan (Arbitrum + DAI + Railgun, May 2026).
> Complements [`PLAN_OPENPAY_ZK.md`](./PLAN_OPENPAY_ZK.md) (in Spanish), which keeps the code review and the security checklist.
>
> Legal and institutional references are Colombian: Law 1581 (personal data protection), Law 1712 (transparency and access to public information), SARLAFT (anti-money-laundering regime), SECOP II (public procurement platform), DIAN (tax authority), CUFE (e-invoice identifier), RUB (beneficial ownership registry), SEDPE (licensed e-money institution).

---

## 1. What OpenPay is

### Tagline

> **OpenPay — Private like cash. Verifiable like a ledger.**

Full version:

> **"OpenPay: private like cash for people, verifiable like a ledger for whoever manages other people's money."**

Short product version:

> **"Privacy for your money. Traceability for the money you manage."**

(Replaces the earlier slogan "Clear finances, zero corruption", which promised something absolute.)

### Thesis

> **"Transparency is for power, privacy is for people, and cryptography means we do not have to choose."**

### Definition (for a professor, a reviewer or an investor)

> "OpenPay is a financial infrastructure that aims to make the use of other people's money verifiable without turning one's own money into public information. It uses traceability, access controls, cryptographic commitments and zero-knowledge proofs to show that certain financial rules are followed while revealing as little information as possible."

### The promise (and what it does not promise)

> **"OpenPay does not ask you to trust that it is transparent or private. It designs the system so that you can check both properties."**

OpenPay **does not eliminate corruption**. It reduces the room to hide it along the path of the money and gives auditors, donors and citizens verifiable evidence, without sacrificing people's privacy. Technology does not determine by itself that corruption took place: it makes inconsistencies harder to hide and makes it easier to show what happened.

---

## 2. The fundamental principle: your own money vs. other people's money

> **Privacy over your own money. Transparency over the management of other people's money.**
>
> OpenPay protects the privacy of whoever owns the money and increases the verifiability of whoever manages it.

```
                 OPENPAY
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
      OWN MONEY        OTHER PEOPLE'S MONEY
          ↓                   ↓
       PRIVACY          VERIFIABILITY
          │                   │
          └─────────┬─────────┘
                    ↓
                  TRUST
```

### 🧑 Your own money → privacy
If the money is yours, you decide who knows about your movements. OpenPay does not turn personal finances into public information. The blockchain sits behind the infrastructure, but that does not mean everything is visible to everyone.

### 🏢 Other people's money → accountability
Whoever receives and manages money from others (a person, a company, a foundation, an entity) **must be able to show what they did with it**:

```
Funds received: $100M
        │
  ┌─────┼─────┐
  ↓     ↓     ↓
$40M  $30M  $30M
  ↓     ↓     ↓
  A     B     C
```

How much was received, from whom, when, how much was spent, who was paid, what for, what balance remains and how the movements relate to each other. **That is traceability.**

### The two extremes we avoid
- **Absolute privacy** ("nobody has the right to know anything") → prevents accountability over third parties' resources.
- **Absolute transparency** ("everyone sees all your transactions") → destroys financial privacy.

### The role of the blockchain
Not "we use blockchain because it is innovative", but:
> "We use verifiable-record technologies to build an infrastructure where certain financial movements can be audited without depending exclusively on trust in whoever keeps the record."

---

## 3. The four doors of corruption

OpenPay does not promise to end corruption: it focuses on **closing the four most used doors**.

| Door | What must be provable (without exposing) |
|---|---|
| **Conflict of interest** | That there is no forbidden relationship between the administrator and the vendor |
| **Overpricing** | That the prices paid are reasonable against references |
| **Payment without a contract or authorization** | That each payment corresponds to an authorized contract and respects the budget |
| **Work or service not delivered** | That what was paid for was delivered (signed certificates, evidence) |

> "OpenPay protects people's privacy and demands verifiability from whoever manages other people's money: it proves, without exposing, that there are no conflicts of interest, that each payment corresponds to a contract, that prices are reasonable and that what was paid for was delivered."

---

## 4. Philosophy

### 4.1 Privacy and transparency are not opposites

Both are ways of controlling power, from different sides:

- **Privacy protects the weak from the powerful.**
- **Transparency makes the powerful answer to the weak.**

The real question is **who sees what about whom?**

|                          | Transparent powerful                        | Opaque powerful                          |
|--------------------------|---------------------------------------------|------------------------------------------|
| **Private citizens**     | ✅ The ideal: accountability and freedom     | Corruption, but with individual freedom  |
| **Exposed citizens**     | A society of mutual surveillance            | ❌ The worst: authoritarianism            |

**OpenPay pushes towards the good quadrant.**

### 4.2 Privacy is not secrecy: it is appropriate flow

Contextual integrity (Helen Nissenbaum): privacy is violated when information leaves the context where it was appropriate. The auditor seeing a payment is appropriate; that payment showing up on the internet with the vendor's name is not.

### 4.3 The golden rule

> **Every piece of data must answer: who sees it, what exactly they see, what for, when they can see it and for how long.**

It avoids the typical blockchain mistake: *"since we can record everything, let's record everything"*. OpenPay proposes the opposite:

> **"Record what is necessary and reveal the minimum necessary."**

### 4.4 What technology changed

For centuries, verifying required seeing. **Zero-knowledge (ZK) proofs break that link**: they make it possible to prove a claim without showing the data that supports it. That is OpenPay's real opportunity, more than the blockchain.

### 4.5 Harms of transparency done badly
- **Exposing beneficiaries**: victims, displaced people, subsidies, medical donations → stigma or risk.
- **Extortion**: publishing how much a contractor receives and where they operate makes them a target for protection rackets.
- **Trade secrets**: publishing prices and margins destroys a vendor.
- **Façade transparency**: millions of data points nobody understands hide what matters.
- **Permanence**: what is published on a blockchain cannot be erased.
- **Metadata**: schedules, frequencies and relationships between addresses reveal identities.

### 4.6 Harms of privacy done badly
- **Money laundering and illegal financing.**
- **Capture**: using "data protection" as an excuse not to be accountable.
- **Impunity**: without verifiable evidence, it is one word against another.

### 4.7 Privacy the regulator can accept (long horizon)

The problem with Railgun and Tornado Cash is that they do not separate legitimate money from illicit money. **Privacy Pools** (Buterin et al., 2023): with ZK, the user proves that their money does **not** come from a set flagged as illicit, without revealing its exact origin.

Status as of Sep. 2026 (verify before using): 0xbow on Ethereum mainnet since Mar. 2025 (~US$6M, ~1,500 users), US$3.5M seed round (Nov. 2025), integrated into the Ethereum Foundation's Kohaku wallet. Limitations: the *Association Set Provider* is centralized (0xbow) and it works with crypto, not pesos. → **Phase 7.**

---

## 5. The 8 design principles (mandatory)

1. **Private by default, transparent by mandate.** Data is not public just because a blockchain exists; it is revealed when there is a legitimate, defined reason.
2. **Minimal disclosure: proving > showing.** ❌ Showing all the payments. ✅ Proving that "100% of the audited payments went to authorized vendors".
3. **Public aggregates, private individuals.** The citizen sees "92% of the fund executed", not "Juan Pérez received $3,482,000". The authorized auditor sees the detail when appropriate.
4. **Vulnerable beneficiaries are never public.** A structural rule, not a configurable one.
5. **Watch the watchers.** Every access to private data is logged: who + what + purpose + when. Access is auditable too.
6. **Access with a purpose and an expiry.** Not "the auditor sees everything forever", but "this person queries this data, of this fund, for this audit, during this period". Then it expires.
7. **Nothing personal on the blockchain.** `Personal data → private database → hash / commitment / proof → blockchain`.
8. **Safety before transparency.** If revealing a piece of data creates a disproportionate risk, it is not revealed. Transparency is a means to build trust, not an absolute value.

---

## 6. Acceptance tests (avoiding the false guarantee)

"Blockchain + ZK" guarantees nothing by itself. **No phase moves forward without passing these two tests.**

| Property | Question | Required result |
|---|---|---|
| **Transparency** | Can a citizen or auditor verify claim **X** without trusting OpenPay? | **Yes** |
| **Privacy** | Can someone with access to **everything** public deduce **Y** about a person? | **No** |

### Transparency test
A third party receives the commitments + the ZK proof + the public data → runs the verifier on their own → gets valid / not valid. **The result does not depend on OpenPay saying it is true.**

```
Contract → Budget → Rule → Commitment / proof → Verifier → ✓
```

### Privacy test
A third party receives absolutely everything OpenPay publishes (including timestamps, aggregate amounts, identifiers, contracts and patterns) → tries to reconstruct the protected information → cannot, under the defined threat model. "The names are hidden" is not enough: the question is **what can be inferred by combining everything**.

### Correct wording (security, not marketing)
- ❌ "OpenPay guarantees that nobody can learn Y."
- ✅ **Privacy**: "Under the defined threat model, OpenPay's public information must not allow Y to be inferred with a significant advantage over the information available before observing it."
- ✅ **Transparency**: "The validity of X must be cryptographically checkable by an independent third party, without trusting OpenPay as an authority on the result."

### For the MVP
- **X** = "This payment is linked to an authorized contract and is within the budget."
- **Y** = "This citizen/vendor made a given transaction (amount, counterparty)."

### Three conceptual layers
- **Privacy**: you do not need to expose people to hold the system accountable.
- **Transparency**: you do not need to trust the administrator to verify certain claims.
- **Evidence**: both properties must be demonstrated with acceptance tests.

---

## 7. The legal framework as a design constraint

Laws are not a slide: **they are architecture requirements**.

- **Law 1712 of 2014** (Transparency and access to public information): public information must be accessible, with exceptions when it affects people's rights or security.
- **Law 1581 of 2012** (Personal data protection): consent, purpose and protection.

Principle: *transparency must coexist with the applicable access restrictions and data protection.* This translates into: who sees what? for what purpose? for how long? what must remain private? (the golden rule of section 4.3).

Selling point: **OpenPay makes it possible to comply with both laws at once.**

### Mandatory when going for the real solution
- Legal advice on data protection, SARLAFT and a license / regulated partner to move pesos.
- Privacy impact assessment before launching.
- Financial-grade security, starting with the exposed password.

---

## 8. Strategy: traceability first, digital cash later

### Comparison of visions (summary of the decision)
- **A. Digital cash** — ➕ huge market, strong narrative. ➖ very high regulatory risk, starting from scratch, risky own wallet, strong competition.
- **B. Verifiable traceability** — ➕ reuses the code, viable before the regulator, a real Colombian problem, clear buyers. ➖ depends on the quality of the input data, complex ZK, slow B2G sales.

**We chose B and grow towards A**:
- B sells first.
- B gives A its users (vendors, donors and beneficiaries of each foundation).
- The ZK technology is reused: "this fund followed the rules" → "my money is legitimate".

### A traceability layer on top of the banks
We do not start as a wallet. The organization keeps paying from its bank; OpenPay records, reconciles and proves those payments. **We do not hold money → we do not need an e-money (SEDPE) license to start.** The `Account` table becomes a mirror reconciled with the bank.

> ⚠️ The middle ground does not remove the need for a regulated partner to move pesos, nor does it make the private personal mode simple. That is why it goes last.

---

## 9. Architecture

### Conceptual view

```
                 OPENPAY
                    │
          ┌─────────┴─────────┐
       PRIVACY           TRACEABILITY
          │                   │
      Data policy         Mandates
          │               Contracts
       Identity           Budgets
          │                   │
          └──────────→   Money rails
                              │
                          Evidence
                              │
                   ┌──────────┴──────────┐
               Hash/Merkle               ZK
                   └──────────┬──────────┘
                         Verification
                   ┌──────────┼──────────┐
                Auditor     Admin     Citizen
```

### Layers

| Layer | What it does | Principle | MVP? |
|---|---|---|---|
| **0. Data policy** | Classifies every piece of data: public, aggregate, auditor, private or restricted (vulnerable beneficiaries). Decides what each actor can know. | Private by default | ✅ (document) |
| **1. Identity and roles** | Supabase Auth with passkeys; KYC/KYB; separation of duties (whoever configures rules does not approve payments). | Watch the watchers | ✅ (basic roles) |
| **2. Money rails** | To start: import payments from the bank (CSV statements; open-finance APIs in Colombia are not yet reliable) and reconcile them. Future: regulated partner. | No custody without a license | ✅ (CSV / manual entry) |
| **3. Mandates** | Fund, contract (link to SECOP II), budget, authorized vendors, rules and delivery certificates. **The heart of the product.** | Transparency for whoever manages other people's money | ✅ |
| **4. Private data** | Postgres with RLS and per-field encryption with per-fund keys; immutable access log. | Minimal disclosure | ✅ (RLS + log) |
| **5. Commitments** | Salted hash per record → Merkle tree per batch → `CommitmentRegistry` on Base. | Nothing personal on-chain | ✅ |
| **6. ZK proofs** | Circom circuit + Groth16 per rule; the proof is generated by the organization and verified in the browser with the key whose fingerprint is anchored on Base. (Original design: SP1 / RISC Zero zkVM and an on-chain verifier.) | Prove before showing | ✅ (one rule) |
| **7. Selective disclosure** | Keys with a purpose and an expiry for auditors and authorities; every access is anchored. | Access with a purpose | Vision |
| **8. External sources** | DIAN's CUFE, SECOP II, RUB, bank confirmations, each validated separately. | Independence of sources | Vision |
| **9. Interfaces** | Organization app, participants' portal, auditor's portal and the **public verification portal**. | Aggregates in public | ✅ (org + public verifier) |

### Technical decisions
- **Salt = right to be forgotten.** Each on-chain hash uses a salt stored only in Postgres. Deleting the salt makes the hash impossible to link (*crypto-shredding*): it allows the erasure required by Law 1581 even though the blockchain is immutable.
- **Batches at fixed intervals** (e.g. every 24 h), not per event, so as not to leak patterns through metadata.
- **Circom + Groth16 instead of a zkVM (decision of 2026-09-17)**: the first rule is a sum and two Merkle trees, which fit in a circuit of 147,100 constraints; this way the proof is verified for free in the browser and no prover network is needed. The zkVM is left for rules that do not fit comfortably in a circuit. What was said about it: SP1 and RISC Zero are considered production-ready. Verifying a Groth16 proof costs ~300k gas (cheap on Base). Generate proofs with an external network (Succinct Prover Network or Bonsai) rather than own GPUs.
- **Noir** (proofs in the browser): future exploration.
- **Chain**: Base (Sepolia for development). Only Merkle roots and proofs go on-chain; never individual amounts, descriptions or IDs.
- Check the current documentation of each tool before starting.

---

## 10. Scope of the first build (university deliverable)

**Not all layers are built.** The full architecture is presented as the vision; what is built is:

> **Payment → contract → budget → rule → evidence → verification**

That is: the door **"payment without a contract or authorization"** (layers 2 + 3) plus **the first ZK rule** and the public verifier.

### The MVP's ZK rule
> "Prove that the payments belong to an authorized contract and do not exceed the available budget", without revealing the individual payments.

```
Contract
   ├── Budget: $100M
   └── Payments
         ├── $20M ✓
         ├── $30M ✓
         ├── $25M ✓
         └── $25M ✓
                 ↓
      ZK: "budget respected" ✓
```

The auditor or citizen verifies the claim without receiving the underlying data. It must pass both acceptance tests (section 6).

### Research line (thesis / publication)
**ZK for conflicts of interest**: prove that "this administrator has no forbidden conflict of interest with this vendor" without revealing personal or business relationships.

```
Administrator's identity + Beneficial ownership registry (RUB) + Vendor
                              ↓
                              ZK
                              ↓
             "Complies with the independence rule"
```

It is original and connects cryptography + privacy + public procurement + corporate governance + Colombia. It is treated as future work and is not implemented in the MVP.

---

## 11. What happens to the existing code

| Stays | Frozen | Replaced / removed |
|---|---|---|
| Next.js web app (`packages/web`) | Mobile app (`packages/mobile`) | `TransactionRegistry.sol` → `CommitmentRegistry` (batches, no amounts) |
| Supabase (Auth, RLS) | Admin panel with simulated data | `Account` as source of truth → reconciled mirror |
| Edge Function + Database Webhook pattern | Payment to entities (`/pay-entity`) | Unsalted hash → salted hash |
| Hardhat in `packages/contracts` (**restore**) | Support chatbot | "Digital cash" plan |
| `EntityReceiver` → basis for `AuthorizedVendor` | `transfer_funds` / `pay_to_entity` (secured and not touched again) | `OnChainBadge` → verification portal |

> ⚠️ The `pivot/efectivo-digital` branch has **uncommitted** changes that implemented the tear-down of the previous plan (they delete contracts, the `anchor-transaction` edge function, on-chain migrations, `OnChainBadge`, payment to entities). With this vision several of those pieces are reused: set those changes aside (stash) before creating the new branch.

---

## 12. Roadmap

### Phase 0 — This week: putting out fires
- [x] Incident recorded in [`SEGURIDAD_INCIDENTES.md`](./SEGURIDAD_INCIDENTES.md) (INC-001).
- [x] ~~Rotate the Postgres password~~ of Supabase project `bmfiotbutuslsaxeumik`. Solved another way: project decommissioned and replaced by a new one (INC-001 closed, 2026-09-16).
- [x] The old repo was made private (`open-pay-mvp`); the public `open-pay` started with a clean history.
- [x] Save the uncommitted tear-down (`stash@{0}`), create the `pivot/trazabilidad` branch and restore `packages/contracts`.
- [x] Apply the fixes from the zip: scripts read `DB_URL` from the environment, `.gitignore` in UTF-8, `.env.example`.
- [x] Remove the second leaked password (project `garzwhnenhtmpfvfntmk`) from `packages/web/VERCEL_DEPLOYMENT.md`. Project decommissioned (INC-002 closed).
- [x] Fix `20260916120000_security_fixes.sql` (validated on local Postgres 16: it blocks the theft, forces a 0 balance, idempotent).
- [x] **Apply it** in the Supabase SQL Editor (new project, 2026-09-16). Changes made:
  - `DROP FUNCTION` of the old version of `transfer_funds` (signature with emails); otherwise an overload that does not validate `auth.uid()` remains.
  - Rename `v_*` variables to `l_*` (SQL Editor bug, error 42P01).
  - `SET search_path = public` in the `SECURITY DEFINER` functions.
  - Unique index on `Account("profileId", type)`.
- [ ] Test: a normal transfer works; the RPC with another user's `p_sender_id` returns "No autorizado".
- [x] ~~Confirm which Supabase project Vercel uses~~: neither of the two; Vercel uses the new project (2026-09-23).
- [x] Decide on the vision (2026-09-16).
- [x] README rewritten in English around the current product (2026-11-10).

### Phase 1 — Validation with users (⏸️ POSTPONED, decision of 2026-09-16)
> Skipped for now in order to move forward with the university MVP (phases 2 and 3). **It is mandatory before Phase 4 (real pilot)**:
> without it there is no way to know whether anyone would pay or what really hurts them.
>
> Material ready (2026-09-23): [`VALIDACION_FASE1.md`](./VALIDACION_FASE1.md) (in Spanish) — hypotheses with thresholds, segments, script, notes template and legal questions.

- [ ] Interview 15-20 people: foundations and NGOs, statutory auditors, international cooperation, citizen oversight groups.
- [ ] How they report today, how much it costs them, what hurts, who would pay.
- [ ] Legal advice: Law 1581, Law 1712, SARLAFT, license. Look into innovasfc (the financial regulator's innovation hub) and university legal clinics.
- [ ] **Goal**: 2-3 organizations willing to run a pilot.

### Phase 2 — Foundations
- [x] `docs/POLITICA_DATOS.md`: data classification (layer 0) with the golden rule.
- [x] `docs/MODELO_AMENAZA.md`: definition of X, Y, adversary and public data for the acceptance tests.
- [x] Mandate model: `Fund`, `Contract`, `Budget`, `AuthorizedVendor`, `FundRule` with RLS + access log.
- [x] Payment recording and bank reconciliation (schema + SQL tests). The CSV import screen is still pending.
- [x] `CommitmentRegistry` with batches, replacing the contract that published amounts (deployed on Base Sepolia and verified on Basescan).

### Phase 3 — First end-to-end proof (university deliverable)
- [x] ZK rule: "the contract's payments are authorized and total ≤ budget" — Circom circuit + Groth16 (not a zkVM, see §9); roots and key fingerprint anchored on Base Sepolia.
- [x] Public verification portal (no account): https://open-pay-one.vercel.app/verificar
- [x] ✅ Pass the transparency test and the privacy test (2026-09-23; result in `MODELO_AMENAZA.md` §7). The manual review of PP by a second person is still missing.
- [ ] First security audit, even if by a known third party.

### Phase 4 — Real pilot
- [ ] One organization, real data, **without moving money**.
- [ ] Measure: does it reduce audit time? does the donor use it?

### Phase 5 — The other three doors
- [ ] Overpricing: price alerts against references (SECOP II).
- [ ] Work not delivered: signed delivery certificates.
- [ ] CUFE validation and link with SECOP II.
- [ ] Selective disclosure with expiring keys.
- [ ] Conflicts of interest with ZK (research line).

### Phase 6 — Moving money with a regulated partner
- [ ] Smart wallet with passkeys for vendors and beneficiaries.

### Phase 7 — Private personal mode
- [ ] Privacy Pools-style legitimacy proofs, **only with solid legal backing**.

---

## 13. Success criterion

The proof that we are on the right track **is not having ZK working**, but a real organization saying:
*"This saves me the audit and gives my donors confidence."*
Advanced technology is only worth it if it gets there.

---

## Sources

- [0xbow Closes $3.5M Round (GlobeNewswire)](https://www.globenewswire.com/news-release/2025/11/18/3190435/0/en/0xbow-Closes-3-5M-Round-for-Compliant-Crypto-Privacy-Technology-Following-Ethereum-Foundation-Integration.html)
- [0xbow Raises $3.5M (The Defiant)](https://thedefiant.io/news/defi/0xbow-raises-usd3-5-million-to-expand-privacy-pools)
- [Association Sets — 0xbow blog](https://0xbow.io/blog/unlocking-privacy-preserving-compliance-with-association-sets)
- [0xbow Privacy Pools (The Block)](https://www.theblock.co/post/348959/0xbow-privacy-pools-new-cypherpunk-tool-inspired-research-ethereum-founder-vitalik-buterin)
- [ZK Proofs in 2026: What Is Production-Ready (Wavect)](https://wavect.io/blog/zero-knowledge-proofs-production-2026/)
- [SP1 — Succinct Docs](https://docs.succinct.xyz/docs/sp1/introduction)
- [RISC Zero production zkVM (The Block)](https://www.theblock.co/post/300554/risc-zero-rolls-out-production-ready-zkvm)
