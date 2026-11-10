# OpenPay — Data policy (Layer 0)

> Author: Sebastián Murcia Sánchez
> Version: 0.1 — 2026-09-16
> Related: [`VISION_OPENPAY.md`](./VISION_OPENPAY.md) · [`MODELO_AMENAZA.md`](./MODELO_AMENAZA.md)
>
> **This policy rules over the code.** Every new table, column, endpoint, on-chain event or screen
> must have a level assigned here before it is implemented. If a piece of data is not in the inventory, it is treated as **N3 — Private**.
>
> Legal references are Colombian: Law 1581 (personal data protection), Law 1712 (transparency and access to public information), SARLAFT (anti-money-laundering regime), SECOP II (public procurement platform), NIT (tax ID).

---

## 1. The golden rule

Every piece of data must answer five questions:

| Question | What it defines |
|---|---|
| **Who sees it?** | Authorized role or actor |
| **What exactly do they see?** | Full value, aggregate, proof or nothing |
| **What for?** | Legitimate purpose (Law 1581: purpose principle) |
| **When?** | Moment or event that enables access |
| **For how long?** | Retention and expiry of the access |

> "Record what is necessary and reveal the minimum necessary."

---

## 2. Classification levels

| Level | Name | Who has access | Form of access | Example |
|---|---|---|---|---|
| **N0** | **Public** | Anyone, without an account | Full value | Name of a fund, Merkle root, ZK proof |
| **N1** | **Public aggregate** | Anyone, without an account | Only aggregates that follow the rules of section 4 | "92% of the fund executed in health" |
| **N2** | **Auditor** | Auditor, statutory auditor, authority, donor with a right to it | Key with a purpose and an expiry; every access is logged | Individual payments of a contract |
| **N3** | **Private** | The data subject and the organization that manages it (specific roles) | RLS + per-field encryption | A vendor's contact details, a person's own money |
| **N4** | **Restricted** | The minimum number of people with a strict need; **never** public nor in small aggregates | RLS + encryption + dual approval + logging | Vulnerable beneficiaries, health data, victims' data |

### Fixed rules (not configurable by any organization)

1. **N4 never moves up a level.** No administrator can publish N4 data, not even aggregated if the group is small.
2. **Nothing N2, N3 or N4 goes on-chain.** On-chain, only what section 5 lists is allowed.
3. **People's own money = N3 by default.** Only the owner decides to reveal it.
4. **Other people's money = verifiable.** Claims about how it is managed must be provable (N0 through a ZK proof) and its detail must be available for audit (N2).
5. **Safety before transparency.** If publishing something puts a person at risk, it moves down a level, even if another rule says otherwise. That exception is recorded with its justification.

---

## 3. Data inventory

### 3.1 Data that exists in the code today

| Data | Table / origin | Level | Who sees it | What for | Retention | Notes |
|---|---|---|---|---|---|---|
| Email, full name | `Profile` / Supabase Auth | N3 | Data subject; platform admin | Identification and contact | While the account exists + legal period | |
| Phone | `Profile.phone` | N3 | Data subject; admin | Contact, 2FA | Same | |
| ID document number | KYC form (`IdentityVerification.tsx`) | N3 (→ per-field encryption) | Data subject; KYC verification | Legal identification | SARLAFT period | Check where it is stored; if it is persisted, **encrypt it** |
| KYC documents (images) | Storage | N4 | KYC verifier only | Compliance | SARLAFT period, then delete | Never expose in the web app |
| 2FA secret (TOTP) | Auth | N4 (technical secret) | Nobody (only the system) | Authentication | While active | Never returned to the client after enrollment |
| Balance | `Account.balance` | N3 | Data subject | Operation | — | Becomes a mirror reconciled with the bank |
| P2P transaction (amount, counterparty, description) | `Transaction` | N3 | Both parties | Operation | Accounting period | Own money → private |
| Payment to an entity | `Transaction` + `EntityReceiver` | N3 | Payer | Operation | Accounting period | Frozen feature |
| Entity directory | `EntityReceiver` | N0 | Anyone | Show recipients | Indefinite | Institutional data |
| Audit log | `AuditLog` | N2 | Security auditor; admin | Watching the watchers | At least 5 years | Append-only |
| User IP | `AuditLog.ipAddress` | N3 | Security | Fraud detection | 12 months | Minimize |
| Per-transaction hash on-chain | `TransactionRegistry` (Base) | **❌ Non-compliant** | — | — | Permanent | Its events publish the **amount and exact timestamp** (and `metadata` = description for entity payments); the hash has no salt → replace with `CommitmentRegistry` |

### 3.2 Data of the mandate model (Phase 2)

| Data | Table | Level | Who sees it | What for | Retention |
|---|---|---|---|---|---|
| Name, tax ID and type of the organization | `Organization` | N0 | Anyone | Knowing who is accountable | Indefinite |
| Members and their role (one role per person per organization) | `OrgMember` | N3 | Members of the organization | Separation of duties | While a member + legal period |
| Name and purpose of the fund | `Fund` | N0 | Anyone | Accountability | Indefinite |
| Managing organization | `Fund` | N0 | Anyone | Knowing who is accountable | Indefinite |
| Total amount of the fund | `Fund` | N0 (N2 if the organization is private and has agreed so with its donors) | Anyone / donors | Accountability | Indefinite |
| Budget per line | `Budget` | N1 | Anyone | Compare execution against plan | Indefinite |
| Object and value of the contract | `Contract` | N0 if it is a public contract (already public in SECOP II); N2 if private | Depends on the case | Verify payments | Accounting period |
| SECOP II link | `Contract` | N0 | Anyone | External source | Indefinite |
| Name / tax ID of the authorized vendor | `AuthorizedVendor` | N2 (N0 if already public in SECOP) | Auditor | Verify where payments go | Accounting period |
| Vendor bank details | `VendorBankAccount` (separate table) | N3 (encrypted by the application) | The organization's treasury | Paying | While a vendor |
| Fund rules (parameters) | `FundRule` | N0 | Anyone | Knowing what is being proven | Indefinite |
| Individual payment (amount, date, vendor, concept) | `Payment` | N2 | Auditor with a valid key | Audit | Accounting period |
| Salt of each payment | `Payment.salt` | N4 (technical secret) | Nobody (only the system and the proof generator) | Commitments | Until erasure (see 6) |
| Imported bank statement | `BankStatement` | N3 | Treasury | Reconciliation | Accounting period |
| Final beneficiary of a program | `Beneficiary` | **N4** | Program operator | Delivering the aid | Minimum necessary |
| Aggregate execution of the fund | view | N1 | Anyone | Accountability | Indefinite |
| Audit key (who, which fund, purpose, expiry) | `AccessGrant` | N2 | Auditor, admin, and **the public sees that it exists** (without detail) | Watching the watchers | At least 5 years |
| Log of access to N2-N4 data | `AccessLog` | N2 | Access auditor | Watching the watchers | At least 5 years |

---

## 4. Rules for public aggregates (N1)

An aggregate is published only if:

1. **Minimum group size (k ≥ 10).** If a cell groups fewer than 10 records or people, it is suppressed or merged with another ("Other").
2. **No dominant cells.** If a single record represents more than 80% of a cell, it is suppressed (it would reveal the amount of that payment).
3. **No exploitable differences.** Two aggregates whose subtraction isolates an individual are not published (e.g. "fund total" and "total without vendor X").
4. **Rounding.** Amounts to millions or to whole percentages, depending on the size of the fund.
5. **Periodic publication, not real time.** Aggregates are updated per period (monthly by default) so that individual payments cannot be deduced by comparing before and after.
6. **N4 data only with k ≥ 50** and after manual review.

---

## 5. What can go on-chain (closed list)

| Allowed on-chain | Forbidden on-chain |
|---|---|
| Merkle root of a batch | Individual amounts |
| Opaque identifier of the batch and the fund (salted hash of the ID) | Names, tax IDs, national ID numbers, emails |
| Batch timestamp (rounded to the period) | Descriptions or concepts |
| ZK proof and its public inputs as defined in `MODELO_AMENAZA.md` | Database IDs in the clear |
| Hash of an `AccessGrant` and of each access event | Unsalted hash of any data with few possible values |
| Public parameters of a rule (N0) | Exact timestamps of individual payments |

**Construction rules:**
- Each leaf of the tree: `H(32_byte_salt ‖ canonical_record)`. The salt is random per record.
- Batches at a **fixed interval** (24 h by default), not per event.
- Batches **padded to a fixed size** (a power of 2) with random leaves, so as not to reveal how many payments there were.

---

## 6. Data subject rights (Law 1581) and blockchain

| Right | How it is honored |
|---|---|
| **Know and access** | "My data" screen with everything N3 about the data subject and who accessed it (from `AccessLog`) |
| **Update and rectify** | Editing in the app; commitments already anchored do not change, a correction record is anchored |
| **Erase** | *Crypto-shredding*: the data **and its salt** are deleted from Postgres. The on-chain hash remains, but can no longer be linked to anyone |
| **Withdraw consent** | Same as erasure, except for what the law requires to be kept (accounting, SARLAFT) |
| **Be informed of the use** | Privacy notice with the purpose of each piece of data (this table) |

Sensitive data (health, victims, minors, articles 5 and 7 of Law 1581) → **always N4**, with explicit consent.

---

## 7. Relation to Law 1712 (transparency)

For public entities, and private ones that manage public resources:

- Contract information, value and execution are public by default → N0/N1.
- The exceptions in the law (information classified because of people's rights, or reserved for security) are implemented by lowering the level (N2-N4) with a **recorded justification**.
- OpenPay does not decide what is reserved: the organization marks it, and the decision is recorded and visible to the auditor.

---

## 8. Access with a purpose (N2)

Every audit key (`AccessGrant`) must have:

| Field | Example |
|---|---|
| Who | Statutory auditor X (verified identity) |
| What | Payments of fund F, contract C |
| What for | 2026 annual audit |
| From / to | 2026-10-01 – 2026-10-31 |
| Who approved it | Legal representative (cannot be the same person who uses it) |

- When it expires, the key stops working automatically.
- Every query creates a record in `AccessLog` and, in batches, its hash goes on-chain.
- Any citizen can see **that there is** an audit in progress on fund F, without seeing who or what was queried.

---

## 9. Separation of duties (roles)

| Role | Can | Cannot |
|---|---|---|
| Configurator | Create funds, contracts, rules | Approve payments |
| Approver | Approve payments | Change rules or authorized vendors |
| Treasurer | Import statements, reconcile | Approve their own payments |
| Auditor | Read N2 with a valid key | Modify anything |
| Platform admin (OpenPay) | Operate the infrastructure | Read N2-N4 without a key; every emergency access is logged |

---

## 10. Pending items to meet this policy in the code

- [ ] Check where the KYC ID document number is stored; encrypt it per field together with bank details.
- [ ] Replace `TransactionRegistry` (it publishes amounts and description) with `CommitmentRegistry`.
- [x] Create `AccessGrant` and `AccessLog` (migration `20260916180000_mandates.sql`).
- [ ] Link `AccessLog` with the existing `AuditLog` and anchor their hashes in batches.
- [x] Aggregates view with k ≥ 10 suppression, no dominant cells, closed months (`PublicBudgetExecution`).
- [ ] Per-field encryption of `VendorBankAccount` (keys per fund, Layer 4).
- [ ] "My data" screen.
- [ ] Privacy notice based on section 3.
- [ ] Review by legal counsel (Law 1581, Law 1712, SARLAFT) before the pilot.
