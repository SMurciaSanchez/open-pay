# OpenPay — Threat model and acceptance tests (MVP)

> Author: Sebastián Murcia Sánchez
> Version: 0.2 — 2026-09-23 (0.1: 2026-09-16). Version 0.2 adjusts the model to what was built in Phase 3 (Circom + Groth16, not a zkVM) and records the result of the acceptance tests (§7).
> Related: [`VISION_OPENPAY.md`](./VISION_OPENPAY.md) (section 6) · [`POLITICA_DATOS.md`](./POLITICA_DATOS.md)
>
> Without a threat model, "it is private" and "it is verifiable" are marketing phrases.
> This document defines **against whom**, **under which assumptions** and **with which test** they hold.

---

## 1. Scope of the MVP

Flow covered:

```
Organization records: Fund → Contract (budget) → Authorized vendors
                                     ↓
                    Payments (recorded / imported from the bank)
                                     ↓
      Salted leaves → Merkle tree per batch → root in CommitmentRegistry (Base)
                                     ↓
   Circom circuit (Groth16) proves X → public portal verifies in the browser
             with the key whose fingerprint is anchored in CommitmentRegistry
```

Out of scope for the MVP: actual movement of money, conflicts of interest, overpricing, delivery certificates, CUFE (the Colombian e-invoice identifier), full selective disclosure, mobile app.

---

## 2. The claims

### X — what must be verifiable (transparency)

> **X(F, C, P):** "During period P, every recorded payment of contract C of fund F went to vendors authorized for C, and their sum does not exceed C's budget."

Broken down:
- **X1** — Each payment in the batch belongs to C and its recipient is on C's authorized vendor list (committed in a root of its own).
- **X2** — Σ amounts of C's payments in P ≤ budget(C).
- **X3** — The payments used in the proof are exactly those committed in the roots anchored for P (none was omitted or invented *with respect to what was recorded*).

### Y — what must remain private

> **Y1:** The amount of any individual payment.
> **Y2:** The identity of the vendor who received a specific payment.
> **Y3:** That a specific person or vendor took part in the fund (when their level is N2 or higher).
> **Y4:** The exact number of payments and their rhythm (individual dates).
> **Y5:** Any N4 data (vulnerable beneficiaries), even by inference.

---

## 3. What is public (what the adversary has)

The adversary knows **all** of this:

| Source | Content |
|---|---|
| Chain (Base) | Merkle roots, opaque fund and batch ID, batch timestamp (rounded), ZK proofs and their public inputs, hashes of `AccessGrant`/`AccessLog`, signer address |
| Public portal | Fund name and purpose, organization, rules (N0), N1 aggregates, verification result ✓/✗ |
| External sources | SECOP II (public procurement), RUES (business registry), news, social media, leaked statements, sector knowledge |
| Code | All of OpenPay's code (open source, Kerckhoffs's principle) |

**Public inputs of the ZK proof (and nothing else)** — implemented in `packages/circuits/circuits/authorized_within_budget.circom`:
- `batchRoot`: root of the payment batch (64 leaves, zero-padded)
- `vendorSetRoot`: root of the authorized vendors
- `budgetLimit`: budget line limit (N1, public by policy)
- the proof itself has no `ok` output: either it exists and verifies, or it does not exist

The fund and the period are not circuit inputs: they go in the `subject` and the anchoring date in `CommitmentRegistry`. Differences from design 0.1, pending for when there are several batches per period: the circuit covers **one** batch (not `raiz_pagos[]`), and the limit is public (there is no `commitment(budget)` for N2+ contracts).

---

## 4. Trust assumptions

| # | Assumption | What happens if it fails |
|---|---|---|
| S1 | The cryptographic primitives (keccak/SHA-256, Groth16) are secure | Everything breaks |
| S2 | The Circom circuit is correct and the Groth16 ceremony was honest. **Today the ceremony has a single participant** ([`CEREMONIA.md`](./CEREMONIA.md)): whoever ran it could forge proofs | False claims could be "proven" |
| S3 | Base does not rewrite its history beyond finality | Anchored roots could be changed |
| S4 | Salts are random (CSPRNG, 32 bytes) and never leave the private database | Hashes guessable by brute force → Y1/Y2 break |
| S5 | **The organization records the real payments** (the MVP has no verified bank connection) | X is true about what was recorded, not necessarily about reality |
| S6 | Postgres/Supabase applies RLS correctly and credentials are not compromised | Leak of N2-N4 (see `SEGURIDAD_INCIDENTES.md`: INC-001 and INC-002, closed) |

> ⚠️ **Honest limit of the MVP (S5):** the proof guarantees that *what was recorded* follows the rule and that *what was recorded was not altered after being anchored*. It does not guarantee that what was recorded matches the bank. That is closed in later phases with signed statements, bank confirmations and CUFE. **It has to be said this way when presenting.**

---

## 5. Adversaries

| Adversary | Capabilities | Goal | Property threatened |
|---|---|---|---|
| **A1 — Curious public / chain analyst** | Everything public (section 3), analysis tools, reasonable brute force | Reconstruct amounts, vendors, patterns | Y1-Y5 |
| **A2 — Extortionist / armed group** | A1 + local knowledge (who is a contractor in which municipality) | Identify who receives money and how much | Y2, Y3, Y5 |
| **A3 — Commercial competitor** | A1 + their own prices | Deduce the vendor's prices and margins | Y1, Y2 |
| **A4 — Corrupt administrator** | Write access to their organization's data | Pay someone they should not, or above budget, and get a ✓ | X1, X2, X3 |
| **A5 — Malicious or compromised OpenPay operator** | Access to the infrastructure, can generate proofs and sign anchorings | Issue false ✓ or alter records already anchored | X1-X3 |
| **A6 — Abusive auditor** | Legitimate N2 key | Use the access outside its purpose or after it expires | Y1-Y3 |
| **A7 — External attacker** | Stolen credentials, web vulnerabilities | Read or modify the private database | Y1-Y5, X3 |

---

## 6. Attacks and mitigations

### Against privacy (Y)

| Attack | Against | Mitigation | Status |
|---|---|---|---|
| Brute force of an unsalted hash (few possible amounts/vendors) | Y1, Y2 | 32-byte salt per leaf (S4), `gen_random_bytes(32)` in the database | Implemented — PP |
| Counting tree leaves → number of payments | Y4 | Batches padded to a fixed size (64 leaves, zero-padded; the root does not give away how many are real) | Implemented — PP |
| Correlating anchoring timestamps with known payment dates | Y4, Y2 | One root per batch, anchored after the period closes. The block timestamp is exact (it cannot be rounded on-chain): what protects is anchoring on dates that do not depend on the payments | Partial — PP checks the demo batch; anchoring on a fixed date is not automated yet |
| Subtracting published aggregates | Y1 | Aggregate rules (POLITICA_DATOS §4): k ≥ 10, no dominant cells, no exploitable differences, periodic publication | Design |
| Deducing a payment from the change in an aggregate between two publications | Y1 | Periodic publication + rounding | Design |
| Public budget − executed aggregate with a single payment in the period | Y1 | Do not publish execution of a contract with fewer than k payments in the period | Design |
| Public inputs of the proof leak data | Y1-Y4 | Closed list of public inputs (§3); review of every circuit | Implemented — PP |
| On-chain addresses linkable to the organization | Y3 | The signer belongs to OpenPay, not to each organization; opaque fund IDs | Design |
| Auditor uses the key outside its purpose | Y1-Y3 | Keys with scope and expiry; anchored `AccessLog`; approval by a different person | Phase 5 |
| Theft of the private database | Y1-Y5 | RLS, per-field encryption, credential rotation, secret scanning | Partial (INC-001/002 closed; external audit missing) |

### Against transparency (X)

| Attack | Against | Mitigation | Status |
|---|---|---|---|
| Proving over an incomplete list of payments | X3 | The circuit recomputes the root from **all** the leaves of the batch; the portal checks that this root is anchored in `CommitmentRegistry` | Implemented for one batch — PT. Several batches per period: pending |
| Changing payments after anchoring them | X3 | Immutable root on Base (S3) | Implemented — PT |
| Adding an authorized vendor "at the last minute" | X1 | The vendor list is also committed and anchored with a date; the change is visible as a new root | Implemented — PT |
| Raising the budget after paying | X2 | Budget committed and anchored when the contract is created; changes show up as a new visible version | Design |
| OpenPay issues a ✓ without a valid proof | X | The portal does **not** show the ✓ from the database: it verifies in the browser with snarkjs and queries the anchoring through a public Base node | Implemented — PT |
| Payments outside the system (never recorded) | X | **Not mitigated in the MVP** (S5). Future: reconciliation with signed statements / bank confirmation | Pending |
| Compromised OpenPay signer anchors false roots | X3 | Multisig for the signer; the organization also signs its roots | Phase 3+ |

---

## 7. Acceptance tests

No phase is considered finished without passing both. They must be **reproducible by a third party** with a script from the repo.

### PT — Transparency test

**Goal:** a third party verifies X without trusting OpenPay.

Procedure:
1. The verifier obtains from the chain, **without using OpenPay's API**, the roots of the batches of period P and the published proof.
2. They run the verifier (snarkjs, on their machine or in the portal) with the verification key whose fingerprint is anchored.
3. They check that the public inputs of the proof match the anchored roots.

Acceptance criteria:
- ✅ A valid proof returns `ok = 1` using public data only.
- ✅ **Negative cases** (with test data): a payment to an unauthorized vendor, a total above the budget, and a payment omitted from the batch → it is **not** possible to generate a proof that verifies as `ok = 1`.
- ✅ Modifying a payment after it is anchored → the new proof does not match the anchored root.
- ✅ The public portal shows the same result as the independent verifier.

Script: `packages/circuits/test/acceptance/transparency.test.ts` (it lives in `circuits` and not in `contracts` because it needs the circuit and snarkjs; it reads the chain with a raw `eth_call`).

### PP — Privacy test

**Goal:** with everything public, Y cannot be deduced any better than before observing it.

Procedure (simplified indistinguishability game):
1. Two data scenarios **A** and **B** are generated that differ only in Y (e.g. the amount of a payment, or which vendor received it), with the same result for X and the same publishable aggregates.
2. Everything OpenPay would publish for A or for B, chosen at random, is published.
3. An "attacker" (a script + manual review by a second person) receives **everything** public and tries to say whether it is A or B.

Acceptance criteria:
- ✅ The attacker is not right more than ~50% of the time over many repetitions.
- ✅ Manual review: no on-chain event, public input, unauthenticated API response or portal page contains N2-N4 data (search for test amounts, names, tax IDs and IDs in everything published).
- ✅ Brute force: with a list of possible amounts and vendors, no leaf of the tree can be reproduced.
- ✅ Counting leaves or comparing timestamps reveals neither the number nor the dates of the payments.
- ✅ Aggregates follow the rules of `POLITICA_DATOS.md` §4 (automated test on the view).

Script: `packages/circuits/test/acceptance/privacy.test.ts`. The aggregate criterion is covered by SQL tests T42-T44 (`30_mandates.sql`) and R42-R45 (`40_reconciliation.sql`) in `packages/web/supabase/tests/`.

### Status — 2026-09-23: both pass

How to reproduce it (anyone, with the repository and an internet connection):

```sh
cd packages/circuits
npm install
sh scripts/setup-tools.sh               # downloads circom and checks its hash
sh scripts/build.sh --solo-compilar     # compiling is deterministic; it touches no keys
npm run aceptacion                      # 95 tests: 42 unit + 25 PT + 28 PP, ~1.5 min
sh ../web/supabase/tests/run.sh         # aggregates (needs Docker)
```

With `OPENPAY_SIN_RED=1` the reads from the chain and from the portal are skipped (that does not count as acceptance).

What the third party uses: the example proof (`test/acceptance/fixtures/demo-proof.json`), the key served by the portal (`packages/web/public/zk/verification_key.json`) and `CommitmentRegistry` on Base Sepolia (`0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B`, source verified on Basescan), read through `https://sepolia.base.org`. Nothing from OpenPay's API or database.

**PT.** The proof verifies with snarkjs directly; the batch root, the vendor root and the key fingerprint are anchored, each with its kind. A cheater who knows **all** the data of the batch, salts included, cannot obtain a valid witness against what was published in any of the four negative cases (unauthorized vendor, total over the limit, omitted payment, modified payment). Each case has a control showing that the same witness does pass against its own roots, which are not anchored. The portal gives the same verdict as the independent verifier in the four cases tested.

**PP.** Indistinguishability game, 400 rounds per game, acceptance ceiling 60% (guessing = 50%, standard deviation 2.5%):

| Y that differs between A and B | Attacker with a salt dictionary | Same attacker with weak salts (control) | Attacker looking for bias in the bits |
|---|---|---|---|
| Y1 — amount of a payment | 48.3% | 100% | 50.5% |
| Y2 — vendor of a payment | 51.0% | 100% | 50.2% |
| Y3 — date of a payment | 46.5% | 100% | 51.5% |
| Y4 — number of payments (7 versus 6) | 51.7% | 100% | 50.5% |

Brute force of leaves, knowing everything but the salt (1,259 candidate salts per payment): 0 of 7 leaves with random salts; 7 of 7 with the demo salts (control). Search for amounts, dates, ids, salts and leaves in the published proof, in everything anchored and in the HTML of `/verificar`: nothing. The batch was anchored once only, and after its month had closed.

**What these tests do not cover** (and it has to be said):
- The **manual review by a second person** that the PP procedure asks for: pending.
- Zero knowledge of Groth16 is assumed (it is a theorem of the scheme), not measured; and since the ceremony has a single participant, the soundness of PT also depends on S2.
- It was tested with **one** example batch, with made-up data. The demo salts are deliberately patterned: the demo is not an example of privacy, and PP shows it.
- Unauthenticated API responses: covered by the RLS tests in SQL, not by these scripts.

### Wording of the guarantees (use this one, no other)

- **Transparency:** "The validity of X can be cryptographically checked by an independent third party, without trusting OpenPay as an authority on the result, **with respect to the payments recorded and anchored**."
- **Privacy:** "Under the defined threat model (adversaries A1-A3 with access to all public information), OpenPay's public information does not allow Y1-Y5 to be inferred with a significant advantage over the information available before observing it."

---

## 8. Known residual risks (always state them)

1. **False input data (S5):** the MVP verifies what was recorded, not banking reality.
2. **Public contracts:** if the contract is already public in SECOP II with its value and its single contractor, Y2 does not apply to that contract (the information is already public by law). Privacy protects the vendors of private contracts and the beneficiaries.
3. **Small organizations:** with very few payments, aggregates are suppressed and there is less to show the public.
4. **Metadata outside OpenPay:** bank statements, emails or conversations can reveal Y without going through the system.
5. **Dependence on the circuit and the ceremony:** a bug in the Circom circuit, in circomlib or in snarkjs affects validity; versions are pinned (circom 2.1.9 with a checked hash). The single-participant ceremony lets whoever ran it forge proofs: before any real use it must be made multi-party ([`CEREMONIA.md`](./CEREMONIA.md)).
6. **Credentials:** INC-001 and INC-002 are closed; there is still no external security audit.

---

## 9. Review

This model is reviewed:
- When any new data is added to the chain or to the portal.
- When a new ZK rule is added (each rule defines its X and its public inputs).
- Before the pilot (Phase 4), with external advice.
