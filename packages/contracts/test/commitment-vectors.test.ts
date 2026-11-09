/**
 * src/commitment.ts contra los vectores fijos de test/vectors/commitment.json.
 * La copia de la web se prueba contra el mismo archivo: si este test o el de la
 * web falla, las dos implementaciones dejaron de coincidir.
 */
import { expect } from 'chai';
import vectors from './vectors/commitment.json';
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  paymentCommitment,
  toBytes32,
  vendorLeaf,
} from '../src/commitment';

describe('commitment: vectores compartidos con la web', () => {
  it('alturas', () => {
    expect(DEFAULT_TREE_HEIGHT).to.equal(vectors.batchHeight);
    expect(VENDOR_TREE_HEIGHT).to.equal(vectors.vendorHeight);
  });

  it('hojas y raíz del conjunto de proveedores', () => {
    expect(vectors.vendorIds.map((v) => toBytes32(vendorLeaf(v)))).to.deep.equal(vectors.vendorLeaves);
    expect(toBytes32(buildVendorSet(vectors.vendorIds).root)).to.equal(vectors.vendorSetRoot);
  });

  it('compromisos y raíz del lote', () => {
    const commitments = vectors.payments.map((p) =>
      paymentCommitment({ ...p, amountMinorUnits: BigInt(p.amountMinor) }),
    );
    expect(commitments.map(toBytes32)).to.deep.equal(vectors.payments.map((p) => p.commitment));
    expect(toBytes32(buildMerkleTree(commitments).root)).to.equal(vectors.batchRoot);
    expect(toBytes32(buildMerkleTree([]).root)).to.equal(vectors.emptyBatchRoot);
  });
});
