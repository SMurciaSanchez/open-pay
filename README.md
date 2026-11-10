# OpenPay

**Verifiable spending for organizations that manage other people's money — without publishing a single payment.**

A foundation or NGO using OpenPay can prove to anyone that, in a given period, *every* payment from a budget line went to an authorized vendor and the total stayed within budget. The verifier sees no amounts, no vendors, no dates and not even how many payments there were. The proof is a zero-knowledge proof checked in the browser against roots anchored on Base.

> Private like cash. Verifiable like a ledger.
> Transparency is for power; privacy is for people.

**Live verifier:** https://open-pay-one.vercel.app/verificar (public, no account needed)
**Status:** working MVP on Base Sepolia testnet, with the full flow driven from the app. Not audited, not for production use — see [Limitations](#limitations).

---

## How it works

```
payment ──► approval ──► bank statement ──► reconciliation ──► batch ──► anchor ──► ZK proof ──► public verifier
            (roles)      (SHA-256, sealed)   (payment ↔ debit)  (Merkle)  (Base)    (Groth16)    (browser)
```

1. **Mandates in Postgres.** An organization defines a fund, its budget lines, its authorized vendors and its contracts. Payments are drafted by the treasurer and approved by a different person. Row-level security and `SECURITY DEFINER` functions enforce who can do what; the budget cap is enforced on approval.
2. **Bank reconciliation.** A bank statement is imported, hashed and sealed (it must balance). A payment only counts once it is matched to a real debit of the same amount posted on or after the approval date.
3. **Commitments.** Each reconciled payment becomes `Poseidon(paymentId, amount, vendorId, date, salt)`. The salt never leaves the server, so the commitment reveals nothing. A month's commitments form a fixed-height Merkle tree padded with zeros, so the root does not leak the batch size.
4. **Anchoring.** The batch root and the root of the authorized-vendor set are published to `CommitmentRegistry` on Base. The contract only accepts `bytes32` values and is append-only: no personal or financial data can reach the chain, even by mistake.
5. **The proof.** A Circom circuit proves that all payments in the batch went to vendors in the anchored set and that their sum is within the budget. Only three values are public: the batch root, the vendor-set root and the budget limit.
6. **Verification.** Anyone opens `/verificar`, the proof is verified locally with snarkjs, and the page queries a public Base node directly to confirm both roots are anchored. Nobody has to trust OpenPay's servers.

### Who can do what

An organization has four roles, one per person: a **legal representative** (manages the team), a **configurator** (fund, budget lines, vendors, contracts), an **approver** (approves or rejects payments) and a **treasurer** (drafts payments, imports bank statements, reconciles, closes batches). Whoever registers a payment cannot approve it.

Two things are deliberately kept away from every client, the treasurer included:

- **Registering and anchoring** vendor lists and batches is done by the server only. The database functions behind it are not executable by any logged-in user, so nobody can mark a month as "anchored" with a made-up root or transaction.
- **A month with a batch is closed.** A payment cannot be reconciled into it, or pulled out of it, afterwards — otherwise it would sit in that month and outside its proof.

### The design decision that matters

The cheap circuit would verify a Merkle path for each payment the prover *chooses to declare*. That proves "these payments are fine" and leaves the real door open: hiding the inconvenient ones.

This circuit instead **recomputes the batch root from all 64 leaves** and compares it with the anchored one. Mark a real payment as an empty slot and the root no longer matches, so the proof cannot be built. That turns "some payments" into "all payments", and it is why the tree is small: the guarantee is paid for in constraints (147,100, Groth16 over BN254). The test for it is `packages/circuits/test/circuit.test.ts`, block *"no se puede esconder un pago"*.

---

## Repository layout

| Package | What it is |
|---|---|
| [`packages/circuits`](packages/circuits) | The ZK rule: `authorized_within_budget.circom`, Poseidon Merkle trees, witness builder, prover, trusted-setup scripts, acceptance tests |
| [`packages/contracts`](packages/contracts) | `CommitmentRegistry.sol` (Solidity 0.8.24, Hardhat) and the off-chain commitment format (`src/commitment.ts`) shared with the circuit |
| [`packages/web`](packages/web) | Next.js 15 app: the public verifier, the organization panel (team, funds, payments, bank reconciliation, batches), the two server routes that encrypt bank data and anchor roots, and the Supabase schema (`supabase/migrations`) with its SQL test suite |
| [`packages/mobile`](packages/mobile) | Expo app from an earlier version of the project. Frozen, not part of the current product |
| [`docs`](docs) | Vision, threat model, data policy, ceremony notes and security incidents, in English. File names and a few internal working notes (project status, plans, interview guide) are in Spanish |

**Stack:** Circom 2.1.9 · snarkjs (Groth16) · Poseidon · Solidity · Hardhat · Base (OP Stack L2) · ethers v6 · Next.js 15 · TypeScript · Supabase (Postgres, RLS, Auth) · Vercel.

**Deployed contract (Base Sepolia):** [`0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B`](https://sepolia.basescan.org/address/0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B#code), source verified on Basescan.

---

## Threat model and tests

The adversary is the organization itself, plus a curious public. Every phase ships with two kinds of acceptance tests, defined in [`docs/MODELO_AMENAZA.md`](docs/MODELO_AMENAZA.md):

- **Transparency:** a third party can verify claim X without trusting OpenPay.
- **Privacy:** with everything that is public, an observer cannot deduce Y.

| Suite | Where | How to run |
|---|---|---|
| Circuit unit tests (42) | `packages/circuits/test` | `npm test` |
| Acceptance: transparency + privacy (95 total with the unit tests; reads Base Sepolia) | `packages/circuits/test/acceptance` | `npm run aceptacion` |
| Contract and commitment-format tests (shared test vectors keep the web copy of the format in sync) | `packages/contracts/test` | `npx hardhat test` |
| Web unit tests: commitment format, bank-statement CSV parser, bank-data encryption, public error messages, registry event decoding | `packages/web/src` | `npx jest` |
| Database: roles, RLS, reconciliation, batches (every migration applied twice in a throwaway Postgres) | `packages/web/supabase/tests` | `sh packages/web/supabase/tests/run.sh` (needs Docker) |

---

## Try it

**Verify a proof (no setup):** open the [live verifier](https://open-pay-one.vercel.app/verificar), paste `packages/circuits/test/acceptance/fixtures/demo-proof.json` and verify. Change one digit and it must say the proof is invalid.

**Build the circuit and generate a proof locally:**

```sh
cd packages/circuits
npm install
sh scripts/setup-tools.sh   # downloads circom and checks its hash
npm run build               # compiles the circuit and runs the (development) ceremony
npm test
npm run demo                # writes build/demo-proof.json
```

**Run the web app:**

```sh
cd packages/web
npm install
cp .env.example .env.local  # fill in your Supabase URL and anon key
npm run dev                 # http://localhost:3000
```

**Run the contract tests:** `cd packages/contracts && npm install && npx hardhat test`

---

## Limitations

Stated plainly, because the project is about not asking for trust:

- **Testnet only.** Everything is anchored on Base Sepolia.
- **Single-party trusted setup.** The Groth16 ceremony was run by one participant, who could forge proofs. A multi-party ceremony is required before any real use ([`docs/CEREMONIA.md`](docs/CEREMONIA.md)).
- **It verifies what was recorded.** The proof covers the payments the organization registered and reconciled against the statement it uploaded. Binding inputs to an external source (signed bank data, electronic invoices) is future work.
- **Per-month proofs.** Each proof covers one budget line and one month. The cumulative cap across months is enforced by the database but not yet proven; the verifier page says so.
- **Unreconciled payments are outside the proof.** A batch commits every *reconciled* payment of the month, and a month cannot be closed while approved payments dated in it are still unreconciled. But a payment that is never recorded, or approved and never reconciled, is not covered by any proof.
- **The organization grades itself.** Today the organization defines its own rules and uploads its own bank statement.
- **Anchoring is by invitation.** Publishing costs gas paid by a shared OpenPay wallet, so only organizations enabled by the operator can anchor, with a daily limit per fund.
- **Proving is done off-server.** The proving key is hundreds of MB, so proofs are generated on the operator's machine, not on Vercel.
- **No external security audit.** An internal differential security review of the organization panel was done on 2026-11-10 and its findings were fixed before merging (commits prefixed `fix(panel)`), but that is not a substitute. Past incidents are documented in [`docs/SEGURIDAD_INCIDENTES.md`](docs/SEGURIDAD_INCIDENTES.md).

## Roadmap

- **Done:** the full flow driven from the app by an organization — team and roles, payments and approvals, encrypted bank data, statement import and reconciliation, anchoring the vendor list, closing and anchoring a month's batch, and `/verificar?lote=<id>` for a published proof.
- **In progress:** the first real monthly batch. A batch can only be closed once its month has ended, so the demo fund's November 2026 batch is closed, proven and published in December.
- **Next:** an external funder who approves the rules, so the organization does not grade itself; inputs with verifiable origin; multi-party ceremony.
- **Research:** selective disclosure with expiring keys for auditors; conflict-of-interest rules in ZK.

More context: [`docs/VISION_OPENPAY.md`](docs/VISION_OPENPAY.md) · [`docs/POLITICA_DATOS.md`](docs/POLITICA_DATOS.md) · [`packages/circuits/README.md`](packages/circuits/README.md)

---

## Author

Designed and built by **Sebastián Murcia Sánchez**.
