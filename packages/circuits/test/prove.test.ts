import { expect } from 'chai';
import { existsSync } from 'node:fs';
import { ZKEY_PATH, loadVerificationKey, prove, verify, verificationKeyHash } from '../src/prove';
import { PROVEEDORES, pago } from './helpers';

const PRESUPUESTO = 100_000_000n;

/**
 * Estas pruebas necesitan la clave de prueba, que la genera `npm run build` y
 * pesa cientos de megas, así que no está en el repositorio. Si falta, se
 * saltan con un aviso en vez de fallar.
 */
const hayClaves = existsSync(ZKEY_PATH);

(hayClaves ? describe : describe.skip)('prueba completa (probar y verificar)', function () {
  this.timeout(900_000);

  let bundle: Awaited<ReturnType<typeof prove>>;

  before(async () => {
    bundle = await prove({
      payments: [pago(0), pago(1), pago(2)],
      vendorIds: PROVEEDORES,
      budgetLimit: PRESUPUESTO,
    });
  });

  it('una prueba honesta verifica', async () => {
    expect(await verify(bundle)).to.equal(true);
  });

  it('la prueba publica exactamente tres señales', () => {
    expect(bundle.publicSignals).to.have.length(3);
    expect(bundle.publicSignals[0]).to.equal(bundle.claim.batchRoot);
    expect(bundle.publicSignals[1]).to.equal(bundle.claim.vendorSetRoot);
    expect(bundle.publicSignals[2]).to.equal(bundle.claim.budgetLimit);
  });

  it('no se puede reclamar otra raíz de lote con la misma prueba', async () => {
    // Sin comparar las señales públicas contra lo que se afirma, una prueba
    // legítima de un lote pasaría por buena para otro.
    const mentiroso = {
      ...bundle,
      claim: { ...bundle.claim, batchRoot: (BigInt(bundle.claim.batchRoot) + 1n).toString() },
    };
    expect(await verify(mentiroso)).to.equal(false);
  });

  it('no se puede reclamar otro presupuesto', async () => {
    const mentiroso = {
      ...bundle,
      claim: { ...bundle.claim, budgetLimit: '1' },
    };
    expect(await verify(mentiroso)).to.equal(false);
  });

  it('una prueba alterada no verifica', async () => {
    const proof = JSON.parse(JSON.stringify(bundle.proof)) as { pi_a: string[] };
    proof.pi_a[0] = (BigInt(proof.pi_a[0]) + 1n).toString();
    expect(await verify({ ...bundle, proof })).to.equal(false);
  });

  it('señales públicas cambiadas no verifican', async () => {
    const publicSignals = [...bundle.publicSignals];
    publicSignals[2] = '1';
    expect(await verify({ ...bundle, publicSignals, claim: { ...bundle.claim, budgetLimit: '1' } }))
      .to.equal(false);
  });

  it('un lote que incumple la regla ni siquiera llega a generar prueba', async () => {
    try {
      await prove({
        payments: [pago(0), pago(1)],
        vendorIds: PROVEEDORES,
        budgetLimit: 1n,
      });
      throw new Error('generó una prueba de algo que no se cumple');
    } catch (e) {
      expect((e as Error).message).to.include('La regla no se cumple');
    }
  });
});

describe('huella de la clave de verificación', () => {
  const hayVkey = existsSync(require('node:path').resolve(__dirname, '..', 'build', 'verification_key.json'));

  (hayVkey ? it : it.skip)('es estable y con forma de bytes32', () => {
    const a = verificationKeyHash();
    const b = verificationKeyHash(loadVerificationKey());
    expect(a).to.equal(b);
    expect(a).to.match(/^0x[0-9a-f]{64}$/);
  });

  it('no depende del orden de las claves del JSON', () => {
    const vkey = { protocol: 'groth16', nPublic: 3, curve: 'bn128' };
    const revuelta = { curve: 'bn128', nPublic: 3, protocol: 'groth16' };
    expect(verificationKeyHash(vkey)).to.equal(verificationKeyHash(revuelta));
  });

  it('cambia si cambia la clave', () => {
    const a = verificationKeyHash({ protocol: 'groth16', nPublic: 3 });
    const b = verificationKeyHash({ protocol: 'groth16', nPublic: 4 });
    expect(a).to.not.equal(b);
  });
});
