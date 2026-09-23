/**
 * Lo que tiene a mano un tercero que NO confía en OpenPay.
 *
 * Las pruebas de aceptación (docs/MODELO_AMENAZA.md §7) solo pueden usar lo que
 * está acá: archivos publicados en el repositorio y lecturas de la cadena por un
 * nodo público de Base. Nada de la API ni de la base de datos de OpenPay.
 *
 * - La clave de verificación es la que sirve el portal
 *   (packages/web/public/zk/verification_key.json), no la de build/: esa se
 *   regenera en cada ceremonia local y dejaría de coincidir con la huella
 *   anclada.
 * - La prueba de ejemplo está copiada en fixtures/ porque build/ no se versiona.
 * - La cadena se lee con eth_call crudo, igual que el portal
 *   (packages/web/src/lib/zk/registry.ts), sin ethers ni viem.
 *
 * Las comprobaciones contra la cadena se saltan con OPENPAY_SIN_RED=1, para
 * poder correr el resto sin conexión. Una aceptación de verdad se corre CON red.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ProofBundle } from '../../src/prove';

export const VKEY_PUBLICA = path.resolve(
  __dirname, '..', '..', '..', 'web', 'public', 'zk', 'verification_key.json',
);
export const PRUEBA_DEMO = path.join(__dirname, 'fixtures', 'demo-proof.json');

/** CommitmentRegistry en Base Sepolia, verificado en Basescan. */
export const REGISTRO =
  process.env.OPENPAY_REGISTRY_ADDRESS ?? '0xCde0Eed0E0c4876f1e9A57F49f5b8E4Af06b350B';
export const RPC = process.env.OPENPAY_RPC_URL ?? 'https://sepolia.base.org';
export const PORTAL = process.env.OPENPAY_PORTAL_URL ?? 'https://open-pay-one.vercel.app';

export const CON_RED = process.env.OPENPAY_SIN_RED !== '1';

export function cargarVkeyPública(): unknown {
  return JSON.parse(readFileSync(VKEY_PUBLICA, 'utf8'));
}

export function cargarPruebaDemo(): ProofBundle {
  return JSON.parse(readFileSync(PRUEBA_DEMO, 'utf8'));
}

/**
 * El wasm del circuito sale de compilar, que es determinista: un tercero lo
 * obtiene con `sh scripts/build.sh --solo-compilar`, sin ceremonia.
 */
export const HAY_CIRCUITO = existsSync(
  path.resolve(__dirname, '..', '..', 'build', 'authorized_within_budget_js', 'authorized_within_budget.wasm'),
);

// Selectores: keccak256(firma)[0:4].
const PUBLISHED_AT = '0xf7473ff4'; // publishedAt(bytes32)
const ROOT_COUNT = '0x21111bb4'; // rootCount()
const ROOT_AT = '0xca2869a0'; // rootAt(uint256)

export function aBytes32(valor: bigint | string): string {
  return '0x' + BigInt(valor).toString(16).padStart(64, '0');
}

async function ethCall(data: string): Promise<string> {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: REGISTRO, data }, 'latest'],
    }),
  });
  if (!r.ok) throw new Error(`El nodo ${RPC} respondió ${r.status}`);
  const cuerpo = (await r.json()) as { result?: string; error?: { message?: string } };
  if (cuerpo.error || !cuerpo.result) {
    throw new Error(`eth_call falló: ${cuerpo.error?.message ?? 'respuesta vacía'}`);
  }
  return cuerpo.result;
}

/** Segundos Unix en que se ancló el valor; 0 si nunca se ancló. */
export async function ancladoEn(valor: bigint | string): Promise<number> {
  const r = await ethCall(PUBLISHED_AT + aBytes32(valor).slice(2));
  return Number(BigInt(r));
}

export interface RaízAnclada {
  value: string;
  subject: string;
  kind: number;
  publishedAt: number;
  publisher: string;
}

/** Todo lo que el registro guarda. Es, literalmente, todo lo que OpenPay publicó en la cadena. */
export async function todasLasRaíces(): Promise<RaízAnclada[]> {
  const total = Number(BigInt(await ethCall(ROOT_COUNT)));
  const raíces: RaízAnclada[] = [];
  for (let i = 0; i < total; i++) {
    const r = (await ethCall(ROOT_AT + i.toString(16).padStart(64, '0'))).slice(2);
    const palabra = (n: number) => r.slice(64 * n, 64 * (n + 1));
    raíces.push({
      value: '0x' + palabra(0),
      subject: '0x' + palabra(1),
      kind: Number(BigInt('0x' + palabra(2))),
      publishedAt: Number(BigInt('0x' + palabra(3))),
      publisher: '0x' + palabra(4).slice(24),
    });
  }
  return raíces;
}
