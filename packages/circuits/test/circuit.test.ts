import { expect } from 'chai';
import {
  DEFAULT_TREE_HEIGHT,
  VENDOR_TREE_HEIGHT,
  buildMerkleTree,
  buildVendorSet,
  paymentCommitment,
} from '../../contracts/src/commitment';
import { buildWitness, type CircuitInput } from '../src/witness';
import { PROVEEDORES, calcularTestigo, esperarRechazo, pago, uuid } from './helpers';

const PRESUPUESTO = 100_000_000n;

/// Hojas por lote. Se deriva de la altura para que bajarla no rompa el test.
const HOJAS = 2 ** DEFAULT_TREE_HEIGHT;

function testigoVálido(): CircuitInput {
  const pagos = [pago(0), pago(1), pago(2)];
  return buildWitness({
    payments: pagos,
    vendorIds: PROVEEDORES,
    budgetLimit: PRESUPUESTO,
  }).input;
}

/** Copia profunda, para alterar un caso sin contaminar los demás. */
function clonar(input: CircuitInput): CircuitInput {
  return JSON.parse(JSON.stringify(input));
}

describe('circuito: pagos autorizados y total dentro del presupuesto', () => {
  describe('el caso que cumple', () => {
    it('acepta un lote correcto', async () => {
      await calcularTestigo(testigoVálido());
    });

    it('acepta un lote de un solo pago', async () => {
      const input = buildWitness({
        payments: [pago(0)],
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      }).input;
      await calcularTestigo(input);
    });

    it(`acepta el lote lleno, con las ${HOJAS} hojas ocupadas`, async () => {
      const pagos = Array.from({ length: HOJAS }, (_, i) => pago(i));
      const total = pagos.reduce((a, p) => a + p.amountMinorUnits, 0n);
      const input = buildWitness({
        payments: pagos,
        vendorIds: PROVEEDORES,
        budgetLimit: total,
      }).input;
      await calcularTestigo(input);
    });

    it('acepta un total exactamente igual al presupuesto', async () => {
      const pagos = [pago(0), pago(1)];
      const total = pagos.reduce((a, p) => a + p.amountMinorUnits, 0n);
      const input = buildWitness({
        payments: pagos,
        vendorIds: PROVEEDORES,
        budgetLimit: total,
      }).input;
      await calcularTestigo(input);
    });
  });

  describe('no se puede esconder un pago', () => {
    // Esta es la razón por la que el circuito recalcula la raíz desde todas las
    // hojas en vez de verificar caminos sueltos.
    it('marcar un pago real como relleno rompe la raíz del lote', async () => {
      const input = clonar(testigoVálido());
      input.isReal[2] = '0';
      input.amount[2] = '0';
      input.paymentId[2] = '0';
      input.vendorId[2] = '0';
      input.paidOn[2] = '0';
      input.salt[2] = '0';
      await esperarRechazo(input, 'un pago escondido');
    });

    it('agregar un pago que no está en el lote rompe la raíz', async () => {
      const input = clonar(testigoVálido());
      const extra = pago(9);
      input.isReal[3] = '1';
      input.amount[3] = extra.amountMinorUnits.toString();
      await esperarRechazo(input, 'un pago agregado');
    });

    it('cambiar el monto de un pago rompe la raíz', async () => {
      const input = clonar(testigoVálido());
      input.amount[0] = (BigInt(input.amount[0]) - 1n).toString();
      await esperarRechazo(input, 'un monto alterado');
    });

    it('no vale afirmar la prueba contra otra raíz de lote', async () => {
      const input = clonar(testigoVálido());
      input.batchRoot = (BigInt(input.batchRoot) + 1n).toString();
      await esperarRechazo(input, 'otra raíz de lote');
    });
  });

  describe('el proveedor tiene que estar autorizado', () => {
    it('rechaza un pago a un proveedor fuera del conjunto', async () => {
      // El lote se arma con el proveedor intruso adentro, así que la raíz del
      // lote cuadra; lo que no cuadra es el conjunto autorizado contra el que
      // se afirma la prueba.
      const intruso = uuid(99);
      const pagos = [pago(0), pago(1, { vendorId: intruso })];
      const conIntruso = buildWitness({
        payments: pagos,
        vendorIds: [...PROVEEDORES, intruso],
        budgetLimit: PRESUPUESTO,
      }).input;

      const input = clonar(conIntruso);
      input.vendorSetRoot = buildVendorSet(PROVEEDORES).root.toString();
      await esperarRechazo(input, 'un proveedor fuera del conjunto');
    });

    it('no vale un camino de proveedor inventado', async () => {
      const input = clonar(testigoVálido());
      input.vendorPathElements[0][0] = '12345';
      await esperarRechazo(input, 'un camino inventado');
    });

    it('no vale afirmar la prueba contra otro conjunto de proveedores', async () => {
      const input = clonar(testigoVálido());
      input.vendorSetRoot = (BigInt(input.vendorSetRoot) + 1n).toString();
      await esperarRechazo(input, 'otro conjunto de proveedores');
    });

    it('invertir el lado del camino rompe la pertenencia', async () => {
      const input = clonar(testigoVálido());
      input.vendorPathIndices[0] = input.vendorPathIndices[0].map((p) => (p === '1' ? '0' : '1'));
      await esperarRechazo(input, 'el camino invertido');
    });

    it('el lado del camino tiene que ser 0 o 1', async () => {
      const input = clonar(testigoVálido());
      input.vendorPathIndices[0][0] = '2';
      await esperarRechazo(input, 'un lado que no es un bit');
    });
  });

  describe('el total tiene que caber en el presupuesto', () => {
    it('rechaza un total por encima del presupuesto', async () => {
      const pagos = [pago(0), pago(1)];
      const total = pagos.reduce((a, p) => a + p.amountMinorUnits, 0n);
      const { input } = buildWitness({
        payments: pagos,
        vendorIds: PROVEEDORES,
        budgetLimit: total,
      });
      const alterado = clonar(input);
      alterado.budgetLimit = (total - 1n).toString();
      await esperarRechazo(alterado, 'un total por encima del presupuesto');
    });

    it('un monto enorme no da la vuelta al campo para parecer chico', async () => {
      // Sin la cota de 64 bits por monto, un valor cercano al orden del campo
      // haría que la suma "diera la vuelta" y quedara por debajo del tope.
      const input = clonar(testigoVálido());
      input.amount[0] =
        '21888242871839275222246405745257275088548364400416034343698204186575808495616';
      await esperarRechazo(input, 'un monto que desborda el campo');
    });
  });

  describe('las banderas de relleno', () => {
    it('isReal tiene que ser 0 o 1', async () => {
      const input = clonar(testigoVálido());
      input.isReal[0] = '2';
      await esperarRechazo(input, 'una bandera que no es un bit');
    });

    it('media bandera no deja contar medio pago', async () => {
      const input = clonar(testigoVálido());
      input.isReal[0] = '0'
        .concat('')
        .padStart(1, '0');
      input.isReal[1] =
        '10944121435919637611123202872628637544274182200208017171849102093287904247809'; // 1/2 en el campo
      await esperarRechazo(input, 'media bandera');
    });
  });

  describe('coherencia con el constructor de lotes', () => {
    it('la raíz que declara el testigo es la que arma commitment.ts', () => {
      const pagos = [pago(0), pago(1), pago(2)];
      const { input, batchRoot } = buildWitness({
        payments: pagos,
        vendorIds: PROVEEDORES,
        budgetLimit: PRESUPUESTO,
      });
      const esperada = buildMerkleTree(pagos.map(paymentCommitment), DEFAULT_TREE_HEIGHT).root;
      expect(batchRoot).to.equal(esperada);
      expect(input.batchRoot).to.equal(esperada.toString());
    });

    it('el conjunto de proveedores usa la altura acordada', () => {
      const conjunto = buildVendorSet(PROVEEDORES);
      expect(conjunto.height).to.equal(VENDOR_TREE_HEIGHT);
      expect(conjunto.layers[0].length).to.equal(64);
    });
  });
});
