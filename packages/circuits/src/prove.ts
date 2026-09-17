/**
 * Generar y verificar la prueba de la regla "pagos autorizados y total dentro
 * del presupuesto".
 *
 * Probar es caro y privado: pide los datos del fondo y la clave de prueba, así
 * que corre del lado de la organización. Verificar es barato y público: le
 * basta la prueba, las tres señales públicas y la clave de verificación, y por
 * eso puede correr en el navegador de cualquiera, sin cuenta.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { groth16 } from 'snarkjs';
import { buildWitness, type BuildWitnessArgs } from './witness';

const BUILD = path.resolve(__dirname, '..', 'build');
const CIRCUITO = 'authorized_within_budget';

export const WASM_PATH = path.join(BUILD, `${CIRCUITO}_js`, `${CIRCUITO}.wasm`);
export const ZKEY_PATH = path.join(BUILD, `${CIRCUITO}_final.zkey`);
export const VKEY_PATH = path.join(BUILD, 'verification_key.json');

/** Lo que se publica junto a la prueba. Nada de esto identifica un pago. */
export interface PublicClaim {
  /** Raíz del lote, anclada en CommitmentRegistry. */
  batchRoot: string;
  /** Raíz del conjunto de proveedores autorizados, también anclada. */
  vendorSetRoot: string;
  /** Tope del rubro, en unidades mínimas. */
  budgetLimit: string;
}

export interface ProofBundle {
  proof: unknown;
  publicSignals: string[];
  claim: PublicClaim;
}

/**
 * Arma la prueba. Si la regla no se cumple —un proveedor fuera del conjunto o
 * un total por encima del presupuesto— falla al construir el testigo, con el
 * motivo. Eso es deliberado: no existe una "prueba de que no se cumple".
 */
export async function prove(args: BuildWitnessArgs): Promise<ProofBundle> {
  const { input } = buildWitness(args);
  const { proof, publicSignals } = await groth16.fullProve(input, WASM_PATH, ZKEY_PATH);

  return {
    proof,
    publicSignals,
    claim: {
      batchRoot: input.batchRoot,
      vendorSetRoot: input.vendorSetRoot,
      budgetLimit: input.budgetLimit,
    },
  };
}

/**
 * Verifica una prueba.
 *
 * Comprueba dos cosas, y las dos importan: que la prueba sea válida, y que las
 * señales públicas sean las que se afirman. Sin lo segundo, una prueba legítima
 * de otro lote pasaría por buena para este.
 */
export async function verify(
  bundle: ProofBundle,
  verificationKey: unknown = loadVerificationKey(),
): Promise<boolean> {
  const esperado = [bundle.claim.batchRoot, bundle.claim.vendorSetRoot, bundle.claim.budgetLimit];

  if (bundle.publicSignals.length !== esperado.length) return false;
  if (!esperado.every((v, i) => v === bundle.publicSignals[i])) return false;

  return groth16.verify(verificationKey, bundle.publicSignals, bundle.proof);
}

export function loadVerificationKey(): unknown {
  return JSON.parse(readFileSync(VKEY_PATH, 'utf8'));
}

/**
 * Huella de la clave de verificación, para anclarla en CommitmentRegistry.
 *
 * Esto es lo que cierra el último agujero del portal: sin ella, quien entra a
 * verificar está confiando en que la página le sirvió la clave correcta. Con la
 * huella en la cadena, puede compararla en Basescan y dejar de confiar.
 *
 * Se hashea el JSON canónico —claves ordenadas, sin espacios— para que el mismo
 * archivo dé siempre la misma huella aunque cambie el formato del texto.
 */
export function verificationKeyHash(verificationKey: unknown = loadVerificationKey()): string {
  const canónico = JSON.stringify(sortKeys(verificationKey));
  return '0x' + createHash('sha256').update(canónico, 'utf8').digest('hex');
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}
