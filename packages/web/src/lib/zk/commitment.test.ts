/**
 * La copia de la web contra los mismos vectores que la fuente
 * (packages/contracts/test/vectors/commitment.json). Si esto falla, las raíces
 * que ancla la web ya no son las que prueba el circuito.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  paymentCommitment,
  pesosToMinorUnits,
  toBytes32,
  vendorLeaf,
} from './commitment';

const vectors = JSON.parse(
  readFileSync(join(__dirname, '../../../../contracts/test/vectors/commitment.json'), 'utf8'),
);

describe('commitment (copia de la web) contra los vectores de contracts', () => {
  it('alturas', () => {
    expect(DEFAULT_TREE_HEIGHT).toBe(vectors.batchHeight);
    expect(VENDOR_TREE_HEIGHT).toBe(vectors.vendorHeight);
  });

  it('hojas y raíz del conjunto de proveedores', () => {
    expect(vectors.vendorIds.map((v: string) => toBytes32(vendorLeaf(v)))).toEqual(vectors.vendorLeaves);
    expect(toBytes32(buildVendorSet(vectors.vendorIds).root)).toBe(vectors.vendorSetRoot);
  });

  it('compromisos y raíz del lote', () => {
    const commitments = vectors.payments.map((p: any) =>
      paymentCommitment({ ...p, amountMinorUnits: BigInt(p.amountMinor) }),
    );
    expect(commitments.map(toBytes32)).toEqual(vectors.payments.map((p: any) => p.commitment));
    expect(toBytes32(buildMerkleTree(commitments).root)).toBe(vectors.batchRoot);
    expect(toBytes32(buildMerkleTree([]).root)).toBe(vectors.emptyBatchRoot);
  });
});

describe('pesosToMinorUnits', () => {
  it('convierte sin pasar por decimales flotantes', () => {
    expect(pesosToMinorUnits('5000000.00')).toBe(BigInt(500000000));
    expect(pesosToMinorUnits('12500.5')).toBe(BigInt(1250050));
    expect(pesosToMinorUnits('7')).toBe(BigInt(700));
    expect(pesosToMinorUnits(5000000)).toBe(BigInt(500000000));
    expect(pesosToMinorUnits('9007199254740993.01')).toBe(BigInt('900719925474099301'));
  });
  it('rechaza lo que no es un monto', () => {
    expect(() => pesosToMinorUnits('1.234')).toThrow();
    expect(() => pesosToMinorUnits('-5')).toThrow();
  });
});
