import { expect } from 'chai';
import {
  buildVendorSet,
  merkleProof,
  vendorLeaf,
  verifyMerkleProof,
} from '../../contracts/src/commitment';
import { buildWitness } from '../src/witness';
import { PROVEEDORES, pago, uuid } from './helpers';

const PRESUPUESTO = 100_000_000n;

describe('constructor del testigo', () => {
  describe('forma de las entradas', () => {
    it('rellena hasta las 64 hojas del árbol', () => {
      const { input } = buildWitness({
        payments: [pago(0), pago(1)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });

      expect(input.amount).to.have.length(64);
      expect(input.isReal).to.have.length(64);
      expect(input.vendorPathElements).to.have.length(64);
      expect(input.vendorPathElements[0]).to.have.length(6);
    });

    it('marca como reales solo las posiciones con pago', () => {
      const { input } = buildWitness({
        payments: [pago(0), pago(1)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });

      expect(input.isReal.slice(0, 2)).to.deep.equal(['1', '1']);
      expect(input.isReal.slice(2).every((v) => v === '0')).to.equal(true);
    });

    it('las posiciones de relleno van en cero', () => {
      const { input } = buildWitness({
        payments: [pago(0)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });

      expect(input.amount[5]).to.equal('0');
      expect(input.salt[5]).to.equal('0');
      expect(input.vendorPathElements[5]).to.deep.equal(['0', '0', '0', '0', '0', '0']);
    });

    it('todo sale como cadenas decimales, que es lo que espera snarkjs', () => {
      const { input } = buildWitness({
        payments: [pago(0)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });

      expect(input.batchRoot).to.match(/^\d+$/);
      expect(input.vendorSetRoot).to.match(/^\d+$/);
      expect(input.amount[0]).to.match(/^\d+$/);
    });
  });

  describe('los caminos de proveedor son correctos', () => {
    it('cada camino lleva de la hoja del proveedor a la raíz del conjunto', () => {
      const pagos = [pago(0), pago(1), pago(2)];
      const { input } = buildWitness({
        payments: pagos,
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });
      const conjunto = buildVendorSet(PROVEEDORES);

      pagos.forEach((p, i) => {
        const prueba = {
          siblings: input.vendorPathElements[i].map(BigInt),
          pathIndices: input.vendorPathIndices[i].map(Number),
        };
        expect(verifyMerkleProof(vendorLeaf(p.vendorId), prueba, conjunto.root), `pago ${i}`)
          .to.equal(true);
      });
    });

    it('usa la posición del proveedor en el conjunto, no la del pago', () => {
      // El pago 2 va al proveedor uuid(3), que está en la posición 2 del conjunto
      const { input } = buildWitness({
        payments: [pago(2)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });
      const esperado = merkleProof(buildVendorSet(PROVEEDORES), 2);
      expect(input.vendorPathElements[0]).to.deep.equal(esperado.siblings.map(String));
    });
  });

  describe('se niega a construir lo que no se puede probar', () => {
    it('un proveedor fuera del conjunto autorizado', () => {
      expect(() =>
        buildWitness({
          payments: [pago(0, { vendorId: uuid(99) })],
          vendorIds: PROVEEDORES,
          budgetLimit: PRESUPUESTO,
        }),
      ).to.throw('no está en el conjunto autorizado');
    });

    it('un total por encima del presupuesto', () => {
      expect(() =>
        buildWitness({
          payments: [pago(0), pago(1)],
          vendorIds: PROVEEDORES,
          budgetLimit: 1n,
        }),
      ).to.throw('La regla no se cumple');
    });

    it('un lote vacío', () => {
      expect(() =>
        buildWitness({ payments: [], vendorIds: PROVEEDORES, budgetLimit: PRESUPUESTO }),
      ).to.throw('sin pagos');
    });

    it('más pagos de los que caben en el árbol', () => {
      const pagos = Array.from({ length: 65 }, (_, i) => pago(i));
      expect(() =>
        buildWitness({ payments: pagos, vendorIds: PROVEEDORES, budgetLimit: 10n ** 12n }),
      ).to.throw('admite 64');
    });

    it('más proveedores de los que caben en el conjunto', () => {
      const muchos = Array.from({ length: 65 }, (_, i) => uuid(500 + i));
      expect(() =>
        buildWitness({
          payments: [pago(0, { vendorId: muchos[0] })],
          vendorIds: muchos,
          budgetLimit: PRESUPUESTO,
        }),
      ).to.throw('admite 64');
    });
  });

  describe('lo que se hace público', () => {
    it('solo salen tres señales, y ninguna es un dato de un pago', () => {
      const { input } = buildWitness({
        payments: [pago(0), pago(1)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });

      const públicas = [input.batchRoot, input.vendorSetRoot, input.budgetLimit];
      const montos = input.amount.filter((a) => a !== '0');
      const proveedores = input.vendorId.filter((v) => v !== '0');

      expect(públicas).to.have.length(3);
      montos.forEach((m) => expect(públicas).to.not.include(m));
      proveedores.forEach((v) => expect(públicas).to.not.include(v));
    });

    it('dos lotes distintos dan raíces distintas', () => {
      const a = buildWitness({
        payments: [pago(0)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });
      const b = buildWitness({
        payments: [pago(1)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });
      expect(a.batchRoot).to.not.equal(b.batchRoot);
    });
  });
});
