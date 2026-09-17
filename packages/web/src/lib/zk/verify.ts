/**
 * Verificación de pruebas en el navegador.
 *
 * Verificar es barato: le basta la prueba, las tres señales públicas y la clave
 * de verificación. Por eso puede correr del lado de quien mira, sin cuenta y
 * sin pedirle nada a OpenPay. Generar la prueba es lo caro, y eso ocurre del
 * lado de la organización.
 */

/** Lo único que la prueba hace público. Nada de esto identifica un pago. */
export interface PublicClaim {
  batchRoot: string;
  vendorSetRoot: string;
  budgetLimit: string;
}

export interface ProofBundle {
  proof: unknown;
  publicSignals: string[];
  claim: PublicClaim;
}

export type VerifyOutcome =
  | { ok: true; claim: PublicClaim }
  | { ok: false; reason: string };

/**
 * Estrecha el resultado a su rama válida.
 *
 * Hace falta un predicado explícito porque este paquete compila con
 * `strict: false`, y sin strictNullChecks TypeScript no estrecha una unión por
 * su campo discriminante: `if (r.ok)` no alcanza.
 */
export function esVálido(r: VerifyOutcome): r is { ok: true; claim: PublicClaim } {
  return r.ok;
}

/** Convierte el decimal del circuito al hexadecimal con el que se ancla. */
export function toHexRoot(decimal: string): string {
  try {
    return '0x' + BigInt(decimal).toString(16).padStart(64, '0');
  } catch {
    return decimal;
  }
}

/** Formatea unidades mínimas como pesos. */
export function formatMinorUnits(minor: string): string {
  try {
    const pesos = Number(BigInt(minor) / BigInt(100));
    return pesos.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  } catch {
    return minor;
  }
}

/** Revisa que el texto pegado tenga la forma de un paquete de prueba. */
export function parseBundle(text: string): ProofBundle | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Eso no es un JSON válido.' };
  }

  const b = data as Partial<ProofBundle>;
  if (!b || typeof b !== 'object') return { error: 'El archivo no tiene la forma esperada.' };
  if (!b.proof) return { error: 'Al archivo le falta el campo "proof".' };
  if (!Array.isArray(b.publicSignals)) return { error: 'Al archivo le falta "publicSignals".' };
  if (b.publicSignals.length !== 3) {
    return { error: `La prueba trae ${b.publicSignals.length} señales públicas y este circuito usa 3.` };
  }

  const claim: PublicClaim = b.claim ?? {
    batchRoot: b.publicSignals[0],
    vendorSetRoot: b.publicSignals[1],
    budgetLimit: b.publicSignals[2],
  };

  return { proof: b.proof, publicSignals: b.publicSignals as string[], claim };
}

/**
 * Verifica la prueba.
 *
 * Comprueba dos cosas por separado, y las dos importan: que la prueba sea
 * criptográficamente válida, y que las señales públicas sean las que el
 * paquete afirma. Sin lo segundo, una prueba legítima de otro lote se podría
 * presentar como si fuera de este.
 */
export async function verifyProof(
  bundle: ProofBundle,
  verificationKey: unknown,
): Promise<VerifyOutcome> {
  const esperado = [bundle.claim.batchRoot, bundle.claim.vendorSetRoot, bundle.claim.budgetLimit];

  if (!esperado.every((v, i) => v === bundle.publicSignals[i])) {
    return {
      ok: false,
      reason:
        'Las señales públicas de la prueba no coinciden con lo que el archivo afirma. ' +
        'Es una prueba real pero de otro lote, otro conjunto de proveedores u otro presupuesto.',
    };
  }

  // snarkjs pesa cerca de un mega: se carga solo cuando hace falta.
  const { groth16 } = await import('snarkjs');

  let válida: boolean;
  try {
    válida = await groth16.verify(verificationKey, bundle.publicSignals, bundle.proof);
  } catch (e) {
    return { ok: false, reason: `La prueba está mal formada: ${(e as Error).message}` };
  }

  if (!válida) {
    return {
      ok: false,
      reason: 'La prueba no es válida para esta clave de verificación.',
    };
  }

  return { ok: true, claim: bundle.claim };
}

/** Huella SHA-256 del JSON canónico de la clave, igual que en packages/circuits. */
export async function verificationKeyHash(verificationKey: unknown): Promise<string> {
  const canónico = JSON.stringify(sortKeys(verificationKey));
  const bytes = new TextEncoder().encode(canónico);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return (
    '0x' +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
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
