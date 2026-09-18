import { expect } from 'chai';
import {
  DEFAULT_TREE_HEIGHT,
  FIELD_SIZE,
  buildMerkleTree,
  dateToDays,
  merkleProof,
  paymentCommitment,
  toBytes32,
  toField,
  uuidToField,
  verifyMerkleProof,
  VENDOR_TREE_HEIGHT,
  buildVendorSet,
  vendorLeaf,
  type PaymentInput,
} from '../src/commitment';

const PAGO: PaymentInput = {
  paymentId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  amountMinorUnits: 1_000_000_000n, // $10.000.000
  vendorId: 'b7e02f1c-9d3a-4a5b-8c6d-1e2f3a4b5c6d',
  paidOn: '2026-08-20',
  saltHex: 'a1'.repeat(32),
};

describe('compromisos con Poseidon', () => {
  describe('conversión de campos', () => {
    it('un UUID entra al campo sin reducirse', () => {
      const f = uuidToField(PAGO.paymentId);
      expect(f).to.be.lessThan(FIELD_SIZE);
      expect(f).to.equal(BigInt('0x3f2504e04f8941d39a0c0305e82c3301'));
    });

    it('rechaza un UUID que no lo es', () => {
      expect(() => uuidToField('no-soy-un-uuid')).to.throw('UUID inválido');
    });

    it('una sal de 32 bytes se reduce al campo', () => {
      const f = toField('ff'.repeat(32));
      expect(f).to.be.lessThan(FIELD_SIZE);
      expect(f).to.be.greaterThan(0n);
    });

    it('acepta el formato BYTEA de Postgres', () => {
      expect(toField('\\xdeadbeef')).to.equal(toField('0xdeadbeef'));
    });

    it('convierte fechas a días desde la época', () => {
      expect(dateToDays('1970-01-01')).to.equal(0n);
      expect(dateToDays('1970-01-02')).to.equal(1n);
      expect(dateToDays('2026-08-20')).to.equal(20685n);
    });

    it('rechaza una fecha mal escrita', () => {
      expect(() => dateToDays('20-08-2026')).to.throw('Fecha inválida');
    });
  });

  describe('compromiso de un pago', () => {
    it('es determinista', () => {
      expect(paymentCommitment(PAGO)).to.equal(paymentCommitment({ ...PAGO }));
    });

    it('cae dentro del campo', () => {
      expect(paymentCommitment(PAGO)).to.be.lessThan(FIELD_SIZE);
    });

    it('cambia si cambia el monto', () => {
      const otro = paymentCommitment({ ...PAGO, amountMinorUnits: 1_000_000_001n });
      expect(otro).to.not.equal(paymentCommitment(PAGO));
    });

    it('cambia si cambia el proveedor', () => {
      const otro = paymentCommitment({
        ...PAGO,
        vendorId: 'c8f13a2d-ae4b-4b6c-9d7e-2f3a4b5c6d7e',
      });
      expect(otro).to.not.equal(paymentCommitment(PAGO));
    });

    it('cambia si cambia la fecha', () => {
      const otro = paymentCommitment({ ...PAGO, paidOn: '2026-08-21' });
      expect(otro).to.not.equal(paymentCommitment(PAGO));
    });

    it('con otra sal, el mismo pago da otro compromiso', () => {
      // Esto es lo que impide adivinar una hoja probando montos:
      // sin la sal (N4), los demás campos no alcanzan.
      const otro = paymentCommitment({ ...PAGO, saltHex: 'b2'.repeat(32) });
      expect(otro).to.not.equal(paymentCommitment(PAGO));
    });

    it('no acepta montos en cero o negativos', () => {
      expect(() => paymentCommitment({ ...PAGO, amountMinorUnits: 0n })).to.throw('mayor a cero');
      expect(() => paymentCommitment({ ...PAGO, amountMinorUnits: -5n })).to.throw('mayor a cero');
    });
  });

  describe('árbol de Merkle', () => {
    const hojas = [1n, 2n, 3n, 4n, 5n];

    it('tiene siempre la misma altura, tenga los pagos que tenga', () => {
      const chico = buildMerkleTree([paymentCommitment(PAGO)], 4);
      const grande = buildMerkleTree(hojas, 4);
      expect(chico.layers[0].length).to.equal(16);
      expect(grande.layers[0].length).to.equal(16);
      // Un lote de 1 y uno de 5 se ven igual desde afuera: la raíz no dice cuántos
      expect(chico.root).to.not.equal(grande.root);
    });

    it(`la altura por defecto da ${2 ** DEFAULT_TREE_HEIGHT} hojas`, () => {
      // No más: el circuito de la Fase 3 recalcula la raíz desde todas las
      // hojas para poder afirmar que ningún pago quedó afuera, y esa cuenta
      // crece con el tamaño del árbol. Se deriva de la constante para que
      // volver a bajar la altura no rompa el test.
      const árbol = buildMerkleTree([1n]);
      expect(árbol.height).to.equal(DEFAULT_TREE_HEIGHT);
      expect(árbol.layers[0].length).to.equal(2 ** DEFAULT_TREE_HEIGHT);
    });

    it('rechaza un lote más grande que el árbol', () => {
      expect(() => buildMerkleTree([1n, 2n, 3n, 4n, 5n], 2)).to.throw('solo admite 4');
    });

    it('la raíz cambia si cambia una hoja', () => {
      const a = buildMerkleTree([1n, 2n, 3n], 4).root;
      const b = buildMerkleTree([1n, 2n, 4n], 4).root;
      expect(a).to.not.equal(b);
    });

    it('la raíz cambia si cambia el orden', () => {
      const a = buildMerkleTree([1n, 2n, 3n], 4).root;
      const b = buildMerkleTree([3n, 2n, 1n], 4).root;
      expect(a).to.not.equal(b);
    });

    it('la raíz cabe en bytes32', () => {
      const árbol = buildMerkleTree(hojas, 4);
      const hex = toBytes32(árbol.root);
      expect(hex).to.match(/^0x[0-9a-f]{64}$/);
    });
  });

  describe('prueba de pertenencia', () => {
    const pagos: PaymentInput[] = Array.from({ length: 7 }, (_, i) => ({
      ...PAGO,
      paymentId: `3f2504e0-4f89-41d3-9a0c-0305e82c33${(10 + i).toString().padStart(2, '0')}`,
      amountMinorUnits: BigInt((i + 1) * 100_000),
    }));
    const hojas = pagos.map(paymentCommitment);
    const árbol = buildMerkleTree(hojas, 4);

    it('cada pago del lote demuestra que está', () => {
      hojas.forEach((hoja, i) => {
        const prueba = merkleProof(árbol, i);
        expect(verifyMerkleProof(hoja, prueba, árbol.root), `hoja ${i}`).to.equal(true);
      });
    });

    it('la prueba tiene un hermano por nivel', () => {
      const prueba = merkleProof(árbol, 0);
      expect(prueba.siblings.length).to.equal(4);
      expect(prueba.pathIndices.length).to.equal(4);
    });

    it('un pago que no está en el lote no se puede probar', () => {
      const ajeno = paymentCommitment({ ...PAGO, paymentId: '00000000-0000-4000-8000-000000000999' });
      const prueba = merkleProof(árbol, 0);
      expect(verifyMerkleProof(ajeno, prueba, árbol.root)).to.equal(false);
    });

    it('una prueba de otro lote no sirve', () => {
      const otroÁrbol = buildMerkleTree(hojas.slice().reverse(), 4);
      const prueba = merkleProof(árbol, 2);
      expect(verifyMerkleProof(hojas[2], prueba, otroÁrbol.root)).to.equal(false);
    });

    it('cambiar un hermano rompe la prueba', () => {
      const prueba = merkleProof(árbol, 3);
      const alterada = { ...prueba, siblings: [...prueba.siblings] };
      alterada.siblings[0] = alterada.siblings[0] + 1n;
      expect(verifyMerkleProof(hojas[3], alterada, árbol.root)).to.equal(false);
    });

    it('invertir el lado del camino rompe la prueba', () => {
      const prueba = merkleProof(árbol, 3);
      const alterada = { ...prueba, pathIndices: prueba.pathIndices.map((p) => (p === 1 ? 0 : 1)) };
      expect(verifyMerkleProof(hojas[3], alterada, árbol.root)).to.equal(false);
    });

    it('pedir una hoja fuera del árbol falla', () => {
      expect(() => merkleProof(árbol, 16)).to.throw('fuera del árbol');
    });
  });
});

describe('conjunto de proveedores autorizados', () => {
  const PROVEEDORES = [
    '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    'b7e02f1c-9d3a-4a5b-8c6d-1e2f3a4b5c6d',
    'c8f13a2d-ae4b-4b6c-9d7e-2f3a4b5c6d7e',
  ];

  it('la hoja de un proveedor es determinista', () => {
    expect(vendorLeaf(PROVEEDORES[0])).to.equal(vendorLeaf(PROVEEDORES[0]));
  });

  it('proveedores distintos dan hojas distintas', () => {
    expect(vendorLeaf(PROVEEDORES[0])).to.not.equal(vendorLeaf(PROVEEDORES[1]));
  });

  it('el conjunto usa la altura acordada', () => {
    const conjunto = buildVendorSet(PROVEEDORES);
    expect(conjunto.height).to.equal(VENDOR_TREE_HEIGHT);
  });

  it('cada proveedor del conjunto demuestra que pertenece', () => {
    const conjunto = buildVendorSet(PROVEEDORES);
    PROVEEDORES.forEach((id, i) => {
      const prueba = merkleProof(conjunto, i);
      expect(verifyMerkleProof(vendorLeaf(id), prueba, conjunto.root), id).to.equal(true);
    });
  });

  it('un proveedor ajeno no puede demostrar que pertenece', () => {
    const conjunto = buildVendorSet(PROVEEDORES);
    const ajeno = '00000000-0000-4000-8000-000000000999';
    const prueba = merkleProof(conjunto, 0);
    expect(verifyMerkleProof(vendorLeaf(ajeno), prueba, conjunto.root)).to.equal(false);
  });

  it('quitar un proveedor cambia la raíz del conjunto', () => {
    const antes = buildVendorSet(PROVEEDORES).root;
    const después = buildVendorSet(PROVEEDORES.slice(0, 2)).root;
    expect(antes).to.not.equal(después);
  });
});
