# The OpenPay ZK rule

A circuit that proves, **without revealing any payment**, that an organization
managing other people's money followed two rules during a period:

1. **Every** payment in the batch went to a vendor on its authorized list.
2. The sum of those payments did not exceed the budget line.

The verifier sees no amounts, no vendors, no dates, no identifiers, not even how
many payments there were. It sees three numbers only: the batch root, the root
of the vendor set and the budget limit.

## Why the circuit walks the whole batch

The cheap option would be to verify the Merkle path of each payment the prover
declares. But that would prove *"these payments are in the batch and are
correct"*, which leaves the big door open: **hiding the inconvenient payments**
by not declaring them.

So the circuit **recomputes the batch root from all the leaves** and compares it
with the anchored one. If someone marks a real payment as an empty slot, the
resulting root is not the anchored one and the proof cannot be built. That is
what turns "some payments" into "all payments".

This is why the tree is small: the computation grows with the size of the tree,
so the guarantee is paid for in constraints. Today it is **64 leaves**
(`DEFAULT_TREE_HEIGHT = 6` in `contracts/src/commitment.ts`): 147,100
constraints and a 2^18 domain.

There was a detour worth not repeating. The tree was lowered to 16 leaves on
2026-09-18 because `groth16 setup` with 64 ran for 15.4 hours without writing
the `.zkey`, and the circuit was assumed to be too large. It was not: the cause
was a livelock in `fastfile` (see `scripts/fastfile-fix.cjs`), and the process
was never going to finish, with 64 leaves or with 16. With that fixed, the
64-leaf setup takes 2-3 minutes and the original height was restored.

Raising the height again is a one-line change, but it **invalidates every root
already anchored**: the tree size is part of the commitment format.

The test for this decision is in `test/circuit.test.ts`, in the block *"no se
puede esconder un pago"* ("a payment cannot be hidden").

## Usage

```sh
npm install
sh scripts/setup-tools.sh   # downloads circom and checks its hash
npm run build               # compiles the circuit and runs the ceremony
npm test                    # 42 unit tests
npm run aceptacion          # + PT and PP acceptance tests (95 in total, reads Base Sepolia)
npm run demo                # writes build/demo-proof.json for the portal
npm run copy-vkey           # copies the verification key to the portal
npm run vkey-hash           # prints the key fingerprint, to anchor it on-chain
```

To try the portal: `npm run demo`, then `cd ../web && npm run dev`, and paste
`build/demo-proof.json` into `/verificar`. Change one digit of the proof and the
page must say it is not valid.

## What is in here

| File | What it does |
|---|---|
| `circuits/authorized_within_budget.circom` | The rule. This is the file to read to know what is being proven |
| `circuits/merkle.circom` | Poseidon Merkle trees, inside the circuit |
| `src/witness.ts` | Builds the circuit inputs from a fund's data |
| `src/prove.ts` | Generates and verifies proofs; computes the key fingerprint |
| `src/demo.ts` | An example proof with made-up data |
| `scripts/build.sh` | Compilation and ceremony |

The commitment computation lives in `packages/contracts/src/commitment.ts` and
is **imported, not copied**: the circuit and the batch builder must use the same
Poseidon, with the same fields in the same order. If they drifted apart, proofs
would stop verifying without anything warning about it.

## Acceptance tests

`test/acceptance/` holds the two tests required by `docs/MODELO_AMENAZA.md` §7,
written from the side of a third party who does not trust OpenPay: they only use
the published proof, the key served by the portal and the chain as read through
a public node.

- `transparency.test.ts` (PT): the proof verifies without OpenPay code, what was
  published is anchored, and a cheater holding all the data cannot prove an
  unauthorized vendor, a total over the limit, an omitted payment or a modified
  one. The portal gives the same verdict.
- `privacy.test.ts` (PP): indistinguishability game over amount, vendor, date
  and number of payments; brute force of leaves; search for private data in
  everything published. Each attack has a control showing that the attack does
  work when the salts are weak.

A third party does not need the ceremony: `sh scripts/build.sh --solo-compilar`
is enough, because compiling is deterministic and the negative tests only
compute witnesses. `OPENPAY_SIN_RED=1` skips the network reads.

## What this circuit does NOT prove

- **That the money actually moved.** That is what bank reconciliation says, and
  the bank remains the source (assumption S5 in `docs/MODELO_AMENAZA.md`).
- **That the vendor list is the right one.** It proves the payments went to that
  list, not that the list is correct. Who can change it, and under what control,
  is a problem for the mandate layer, not for the circuit.
- **That the price paid was reasonable.** That is a different rule and it does
  not exist yet.

## Warning about the ceremony

The ceremony run by `scripts/build.sh` is a **development** ceremony: it is
generated on a single machine, with a single participant. Whoever holds that
randomness could forge proofs — not uncover data, but prove things that did not
happen.

It must be redone before any real use. The steps are in
[`docs/CEREMONIA.md`](../../docs/CEREMONIA.md).

## Circuit numbers

| | |
|---|---|
| Constraints | 147,100 |
| Payments per batch | 64 |
| Vendors per fund | 64 |
| Public signals | 3 |
| Private inputs | 1,152 |
| Proof system | Groth16 over BN254 |
| Hash function | Poseidon (circomlib-compatible) |
