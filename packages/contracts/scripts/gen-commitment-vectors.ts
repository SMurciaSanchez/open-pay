/**
 * Genera test/vectors/commitment.json a partir de src/commitment.ts.
 *
 * La web tiene una copia de ese archivo (packages/web/src/lib/zk/commitment.ts)
 * porque su despliegue no puede importar de este paquete. Estos vectores son lo
 * que las mantiene iguales: las dos implementaciones se prueban contra ellos.
 *
 * Solo se regenera si el formato cambia a propósito, y eso invalida toda raíz
 * ya anclada:  npx hardhat run scripts/gen-commitment-vectors.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  paymentCommitment,
  toBytes32,
  vendorLeaf,
} from '../src/commitment';

const vendorIds = [
  '5d58c5c2-323c-4c1c-8889-6603f6658f17',
  '0b1e7a52-9d3f-4c61-a2b4-7f0c8e9d1a23',
  'ffffffff-ffff-4fff-bfff-ffffffffffff',
];

const payments = [
  { paymentId: '11111111-2222-4333-8444-555555555555', amountMinor: '500000000', vendorId: vendorIds[0], paidOn: '2026-11-09', saltHex: '\\x' + '01'.repeat(32) },
  { paymentId: 'a3c1f0de-7b42-4e19-9c55-0d2f6a8b9c10', amountMinor: '1250050', vendorId: vendorIds[1], paidOn: '2026-11-30', saltHex: '0x' + 'ab'.repeat(32) },
  // Sal mayor que el orden del campo: tiene que reducirse igual en las dos copias
  { paymentId: '00000000-0000-4000-8000-000000000001', amountMinor: '1', vendorId: vendorIds[2], paidOn: '1970-01-01', saltHex: 'ff'.repeat(32) },
];

const commitments = payments.map((p) =>
  paymentCommitment({ ...p, amountMinorUnits: BigInt(p.amountMinor) }),
);

const out = {
  nota: 'Generado por scripts/gen-commitment-vectors.ts desde src/commitment.ts. No editar a mano.',
  batchHeight: DEFAULT_TREE_HEIGHT,
  vendorHeight: VENDOR_TREE_HEIGHT,
  vendorIds,
  vendorLeaves: vendorIds.map((v) => toBytes32(vendorLeaf(v))),
  vendorSetRoot: toBytes32(buildVendorSet(vendorIds).root),
  payments: payments.map((p, i) => ({ ...p, commitment: toBytes32(commitments[i]) })),
  batchRoot: toBytes32(buildMerkleTree(commitments).root),
  emptyBatchRoot: toBytes32(buildMerkleTree([]).root),
};

const destino = join(__dirname, '..', 'test', 'vectors', 'commitment.json');
writeFileSync(destino, JSON.stringify(out, null, 2) + '\n');
console.log('Escrito', destino);
