/**
 * PT — Prueba de transparencia (docs/MODELO_AMENAZA.md §7).
 *
 * Pregunta: ¿puede un tercero comprobar X ("los pagos del lote fueron a
 * proveedores autorizados y suman a lo sumo el presupuesto") sin confiar en
 * OpenPay?
 *
 * El tercero solo usa lo que hay en publico.ts: la prueba publicada, la clave
 * que sirve el portal y la cadena leída por un nodo público. Verifica con
 * snarkjs directamente, no con el código de OpenPay, y después comprueba que el
 * portal diga lo mismo.
 *
 * Los casos negativos se plantean desde el lado del tramposo: alguien que
 * conoce TODOS los datos del lote de ejemplo, incluidas las sales, e intenta
 * sacar una prueba de algo que no se cumple. Para cada trampa hay dos salidas y
 * las dos tienen que estar cerradas: o el circuito rechaza el testigo, o las
 * raíces que resultan no son las ancladas (y la cadena lo dice).
 *
 * Límite que hay que decir siempre: la ceremonia actual es de un solo
 * participante (docs/CEREMONIA.md). Quien la corrió podría fabricar pruebas
 * falsas. Esta prueba demuestra que el sistema es sólido suponiendo una
 * ceremonia honesta; quitar ese supuesto exige la ceremonia multiparte.
 */
import { expect } from 'chai';
import { groth16 } from 'snarkjs';
import { buildMerkleTree, buildVendorSet, paymentCommitment } from '../../../contracts/src/commitment';
import type { PaymentInput } from '../../../contracts/src/commitment';
import * as portal from '../../../web/src/lib/zk/verify';
import { PAGOS, PRESUPUESTO, PROVEEDORES, uuid } from '../../src/demo-data';
import { verificationKeyHash, type ProofBundle } from '../../src/prove';
import { buildWitness, type CircuitInput } from '../../src/witness';
import { calcularTestigo } from '../helpers';
import {
  CON_RED,
  HAY_CIRCUITO,
  ancladoEn,
  cargarPruebaDemo,
  cargarVkeyPública,
  todasLasRaíces,
} from './publico';

const vkey = cargarVkeyPública();
const demo = cargarPruebaDemo();

/** Tipos de raíz de CommitmentRegistry.RootKind. */
const PAYMENT_BATCH = 0;
const VENDOR_SET = 1;
const VERIFICATION_KEY = 3;

/** El verificador independiente: snarkjs y nada más. */
async function verificarIndependiente(b: ProofBundle): Promise<boolean> {
  return groth16.verify(vkey, b.publicSignals, b.proof);
}

/** Lo que diría el portal /verificar para el mismo archivo. */
async function verificarComoPortal(b: ProofBundle): Promise<boolean> {
  const parsed = portal.parseBundle(JSON.stringify(b));
  if ('error' in parsed) return false;
  return (await portal.verifyProof(parsed, vkey)).ok;
}

function clonar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/** ¿Acepta el circuito este testigo? Si no, no hay prueba que generar. */
async function circuitoAcepta(input: CircuitInput): Promise<boolean> {
  try {
    await calcularTestigo(input);
    return true;
  } catch {
    return false;
  }
}

/** El testigo honesto del lote de ejemplo, afirmado contra las raíces publicadas. */
function testigoDemo(pagos: PaymentInput[] = PAGOS): CircuitInput {
  return buildWitness({ payments: pagos, vendorIds: PROVEEDORES, budgetLimit: PRESUPUESTO }).input;
}

/** Afirma un testigo contra las raíces y el tope que están publicados. */
function contraLoPublicado(input: CircuitInput): CircuitInput {
  const x = clonar(input);
  x.batchRoot = demo.claim.batchRoot;
  x.vendorSetRoot = demo.claim.vendorSetRoot;
  x.budgetLimit = demo.claim.budgetLimit;
  return x;
}

/** Raíz de lote que resultaría de estos pagos. */
function raízDe(pagos: PaymentInput[]): bigint {
  return buildMerkleTree(pagos.map(paymentCommitment)).root;
}

describe('PT — prueba de transparencia', function () {
  this.timeout(300_000);

  describe('un tercero verifica con datos públicos y sin código de OpenPay', () => {
    it('la prueba publicada verifica con snarkjs y la clave del portal', async () => {
      expect(await verificarIndependiente(demo)).to.equal(true);
    });

    it('las señales públicas son exactamente lo que el archivo afirma', () => {
      expect(demo.publicSignals).to.deep.equal([
        demo.claim.batchRoot,
        demo.claim.vendorSetRoot,
        demo.claim.budgetLimit,
      ]);
    });

    it('la prueba corresponde al lote de ejemplo (control de que el fixture no es otro)', () => {
      expect(raízDe(PAGOS).toString()).to.equal(demo.claim.batchRoot);
      expect(buildVendorSet(PROVEEDORES).root.toString()).to.equal(demo.claim.vendorSetRoot);
      expect(PRESUPUESTO.toString()).to.equal(demo.claim.budgetLimit);
    });
  });

  (CON_RED ? describe : describe.skip)('lo publicado está anclado en Base Sepolia', () => {
    let raíces: Awaited<ReturnType<typeof todasLasRaíces>>;
    const buscar = (v: bigint | string) =>
      raíces.find((r) => BigInt(r.value) === BigInt(v));

    before(async () => {
      raíces = await todasLasRaíces();
    });

    it('la raíz del lote está anclada, y como lote', () => {
      const r = buscar(demo.claim.batchRoot);
      expect(r, 'la raíz del lote no está en el registro').to.not.equal(undefined);
      expect(r!.kind).to.equal(PAYMENT_BATCH);
    });

    it('la raíz de proveedores está anclada, y como conjunto de proveedores', () => {
      const r = buscar(demo.claim.vendorSetRoot);
      expect(r, 'la raíz de proveedores no está en el registro').to.not.equal(undefined);
      expect(r!.kind).to.equal(VENDOR_SET);
    });

    it('la huella de la clave que sirve el portal está anclada, y como clave', () => {
      const r = buscar(verificationKeyHash(vkey));
      expect(r, 'la huella de la clave no está en el registro').to.not.equal(undefined);
      expect(r!.kind).to.equal(VERIFICATION_KEY);
    });

    it('una raíz inventada no aparece como anclada', async () => {
      expect(await ancladoEn(BigInt(demo.claim.batchRoot) + 1n)).to.equal(0);
    });
  });

  (HAY_CIRCUITO ? describe : describe.skip)('el tramposo, con todos los datos del lote, no puede probar lo que no se cumple', () => {
    it('control: el lote de ejemplo, contra lo publicado, sí se acepta', async () => {
      expect(await circuitoAcepta(contraLoPublicado(testigoDemo()))).to.equal(true);
    });

    describe('pago a un proveedor no autorizado', () => {
      const intruso = uuid(999);
      const pagos = PAGOS.map((p, i) => (i === 3 ? { ...p, vendorId: intruso } : p));

      it('contra la lista publicada: el circuito lo rechaza', async () => {
        // El peor caso: el lote con el pago al intruso sí se ancló (su raíz
        // cuadra), y el tramposo arma los caminos como si el intruso estuviera
        // en la lista. Solo cambia la lista contra la que se afirma: la
        // publicada, que no lo tiene. Lo único que puede fallar es la
        // pertenencia del proveedor.
        const input = buildWitness({
          payments: pagos,
          vendorIds: [...PROVEEDORES, intruso],
          budgetLimit: PRESUPUESTO,
        }).input;
        expect(await circuitoAcepta(input), 'control: con su propia lista sí pasa').to.equal(true);
        input.vendorSetRoot = demo.claim.vendorSetRoot;
        expect(await circuitoAcepta(input)).to.equal(false);
      });

      it('agregando el intruso a la lista: la lista resultante no es la publicada', async () => {
        const lista = buildVendorSet([...PROVEEDORES, intruso]).root;
        expect(lista.toString()).to.not.equal(demo.claim.vendorSetRoot);
        if (CON_RED) expect(await ancladoEn(lista)).to.equal(0);
      });
    });

    describe('total por encima del presupuesto', () => {
      const extra: PaymentInput = {
        paymentId: uuid(108),
        amountMinorUnits: PRESUPUESTO, // solo este ya llena el rubro
        vendorId: PROVEEDORES[0],
        paidOn: '2026-08-30',
        saltHex: '88'.repeat(32),
      };
      const pagos = [...PAGOS, extra];

      it('con el tope publicado: el circuito lo rechaza', async () => {
        // buildWitness se niega; el tramposo arma el testigo con un tope falso
        // y después lo cambia por el publicado. El lote y la lista cuadran:
        // lo único que puede fallar es la suma.
        const input = buildWitness({
          payments: pagos,
          vendorIds: PROVEEDORES,
          budgetLimit: PRESUPUESTO * 2n,
        }).input;
        expect(await circuitoAcepta(input), 'control: con el tope inflado sí pasa').to.equal(true);
        input.budgetLimit = demo.claim.budgetLimit;
        expect(await circuitoAcepta(input)).to.equal(false);
      });

      it('subiendo el tope: la prueba sale, pero dice otro tope y no se puede hacer pasar por la publicada', async () => {
        const input = buildWitness({
          payments: pagos,
          vendorIds: PROVEEDORES,
          budgetLimit: PRESUPUESTO * 2n,
        }).input;
        expect(await circuitoAcepta(input)).to.equal(true);
        expect(input.budgetLimit).to.not.equal(demo.claim.budgetLimit);
        expect(input.batchRoot).to.not.equal(demo.claim.batchRoot);
      });
    });

    describe('pago omitido del lote', () => {
      const sinUno = PAGOS.filter((_, i) => i !== 4);

      it('declarando menos pagos contra la raíz publicada: el circuito lo rechaza', async () => {
        expect(await circuitoAcepta(contraLoPublicado(testigoDemo(sinUno)))).to.equal(false);
      });

      it('marcando el pago como relleno: el circuito lo rechaza', async () => {
        const input = contraLoPublicado(testigoDemo());
        for (const campo of ['isReal', 'amount', 'paymentId', 'vendorId', 'paidOn', 'salt'] as const) {
          input[campo][4] = '0';
        }
        expect(await circuitoAcepta(input)).to.equal(false);
      });

      it('el lote sin ese pago tiene otra raíz, y no está anclada', async () => {
        const r = raízDe(sinUno);
        expect(r.toString()).to.not.equal(demo.claim.batchRoot);
        if (CON_RED) expect(await ancladoEn(r)).to.equal(0);
      });
    });

    describe('pago modificado después de anclado', () => {
      const alterados = PAGOS.map((p, i) =>
        i === 2 ? { ...p, amountMinorUnits: p.amountMinorUnits - 1_000_000_00n } : p,
      );

      it('contra la raíz publicada: el circuito lo rechaza', async () => {
        expect(await circuitoAcepta(contraLoPublicado(testigoDemo(alterados)))).to.equal(false);
      });

      it('la prueba honesta del lote alterado lleva otra raíz, que no está anclada', async () => {
        const input = testigoDemo(alterados);
        expect(await circuitoAcepta(input)).to.equal(true);
        expect(input.batchRoot).to.not.equal(demo.claim.batchRoot);
        if (CON_RED) expect(await ancladoEn(input.batchRoot)).to.equal(0);
      });

      for (const [campo, cambio] of [
        ['la fecha', { paidOn: '2026-08-13' }],
        ['el proveedor', { vendorId: PROVEEDORES[1] }],
        ['la sal', { saltHex: '34'.repeat(32) }],
      ] as const) {
        it(`cambiar ${campo} también cambia la raíz`, () => {
          const otros = PAGOS.map((p, i) => (i === 2 ? { ...p, ...cambio } : p));
          expect(raízDe(otros).toString()).to.not.equal(demo.claim.batchRoot);
        });
      }
    });
  });

  describe('el portal dice lo mismo que el verificador independiente', () => {
    const casos: [string, () => ProofBundle][] = [
      ['la prueba publicada', () => demo],
      ['la prueba con un número alterado', () => {
        const b = clonar(demo);
        (b.proof as { pi_a: string[] }).pi_a[0] = (BigInt((b.proof as { pi_a: string[] }).pi_a[0]) + 1n).toString();
        return b;
      }],
      ['las señales cambiadas por otro tope', () => {
        const b = clonar(demo);
        b.publicSignals[2] = '1';
        b.claim.budgetLimit = '1';
        return b;
      }],
      ['la raíz de lote afirmada no es la de la prueba', () => {
        const b = clonar(demo);
        b.claim.batchRoot = (BigInt(b.claim.batchRoot) + 1n).toString();
        return b;
      }],
    ];

    for (const [nombre, armar] of casos) {
      it(nombre, async () => {
        const b = armar();
        // El independiente también exige que lo afirmado coincida con lo probado.
        const independiente =
          (await verificarIndependiente(b)) &&
          [b.claim.batchRoot, b.claim.vendorSetRoot, b.claim.budgetLimit].every(
            (v, i) => v === b.publicSignals[i],
          );
        expect(await verificarComoPortal(b)).to.equal(independiente);
      });
    }

    it('los dos calculan la misma huella de la clave', async () => {
      expect(await portal.verificationKeyHash(vkey)).to.equal(verificationKeyHash(vkey));
    });
  });
});
