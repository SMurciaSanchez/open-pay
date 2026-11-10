/**
 * Lectura de CommitmentRegistry desde el navegador, sin librerías: un eth_call
 * por JSON-RPC alcanza para una consulta de solo lectura, y así la página no
 * carga ethers ni viem entero.
 *
 * Se consulta un nodo público de Base, no un servidor de OpenPay: si la página
 * preguntara a nuestro propio backend, quien verifica volvería a tener que
 * creernos.
 */

import { keccak_256 } from '@noble/hashes/sha3';

export const REGISTRY = process.env.NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS;
export const EXPLORER = process.env.NEXT_PUBLIC_COMMITMENT_REGISTRY_EXPLORER;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org';

/** keccak256("publishedAt(bytes32)")[0:4]. Devuelve 0 si la raíz nunca se ancló. */
const PUBLISHED_AT = '0xf7473ff4';

export type Anclaje =
  | { estado: 'anclada'; fecha: Date }
  | { estado: 'no-anclada' }
  | { estado: 'error'; mensaje: string };

/** Dice si un valor de 32 bytes está anclado en el registro, y desde cuándo. */
export async function consultarAnclaje(valorHex: string): Promise<Anclaje> {
  if (!REGISTRY) return { estado: 'error', mensaje: 'el registro no está configurado' };

  const valor = valorHex.replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(valor)) {
    return { estado: 'error', mensaje: 'no es un valor de 32 bytes' };
  }

  try {
    const r = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: REGISTRY, data: PUBLISHED_AT + valor }, 'latest'],
      }),
    });
    if (!r.ok) throw new Error(`el nodo respondió ${r.status}`);
    const cuerpo = (await r.json()) as { result?: string; error?: { message?: string } };
    if (cuerpo.error || !cuerpo.result) {
      throw new Error(cuerpo.error?.message ?? 'respuesta vacía del nodo');
    }

    // Un uint64 en segundos cabe de sobra en un Number.
    const segundos = Number(BigInt(cuerpo.result));
    if (segundos === 0) return { estado: 'no-anclada' };
    return { estado: 'anclada', fecha: new Date(segundos * 1000) };
  } catch (e) {
    return { estado: 'error', mensaje: String((e as Error).message ?? e) };
  }
}

// ── Qué se publicó exactamente: tipo de raíz y fondo ───────────

/** Los tipos de raíz del contrato (enum RootKind). */
export const ROOT_KIND = { PaymentBatch: 0, VendorSet: 1, RuleSet: 2, VerificationKey: 3 } as const;

const aHex = (bytes: Uint8Array) =>
  '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const keccakTexto = (texto: string) => aHex(keccak_256(new TextEncoder().encode(texto)));

/** topic0 del evento RootPublished del contrato. */
export const ROOT_PUBLISHED_TOPIC = keccakTexto('RootPublished(uint256,bytes32,bytes32,uint8,uint64,address)');

/**
 * Identificador público de un fondo en el contrato. Es el mismo cálculo que
 * hace el servidor al anclar (lib/server/chain.ts): con el id del fondo
 * cualquiera puede rehacerlo y comprobar a qué fondo pertenece una raíz.
 */
export function fundSubject(fundId: string): string {
  return keccakTexto(`openpay:fondo:${fundId}`);
}

export interface RootPublication {
  value: string;
  subject: string;
  kind: number;
}

interface RegistroDeEvento {
  address: string;
  topics: string[];
  data: string;
}

/** Lee un evento RootPublished. Devuelve null si no es de ese contrato o no es ese evento. */
export function decodeRootPublished(log: RegistroDeEvento, registry: string): RootPublication | null {
  if (log.address.toLowerCase() !== registry.toLowerCase()) return null;
  if (log.topics.length !== 4 || log.topics[0].toLowerCase() !== ROOT_PUBLISHED_TOPIC) return null;
  const datos = log.data.replace(/^0x/, '');
  if (datos.length < 64) return null;
  return {
    value: log.topics[2].toLowerCase(),
    subject: log.topics[3].toLowerCase(),
    // Primer campo no indexado: el tipo (uint8), en una palabra de 32 bytes.
    kind: Number(BigInt('0x' + datos.slice(0, 64))),
  };
}

export type Publicacion =
  | { estado: 'encontrada'; publicacion: RootPublication }
  | { estado: 'no-encontrada' }
  | { estado: 'error'; mensaje: string };

/**
 * Busca, en el recibo de una transacción, la publicación de una raíz. El hash
 * de la transacción lo da la organización; lo que dice el recibo lo responde un
 * nodo público, así que un hash equivocado o ajeno simplemente no la encuentra.
 */
export async function consultarPublicacion(txHash: string, valorHex: string): Promise<Publicacion> {
  if (!REGISTRY) return { estado: 'error', mensaje: 'el registro no está configurado' };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { estado: 'error', mensaje: 'la transacción no es válida' };
  try {
    const r = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [txHash] }),
    });
    if (!r.ok) throw new Error(`el nodo respondió ${r.status}`);
    const cuerpo = (await r.json()) as {
      result?: { status?: string; logs?: RegistroDeEvento[] } | null;
      error?: { message?: string };
    };
    if (cuerpo.error) throw new Error(cuerpo.error.message ?? 'error del nodo');
    if (!cuerpo.result || cuerpo.result.status !== '0x1') return { estado: 'no-encontrada' };

    const valor = valorHex.toLowerCase();
    for (const log of cuerpo.result.logs ?? []) {
      const p = decodeRootPublished(log, REGISTRY);
      if (p && p.value === valor) return { estado: 'encontrada', publicacion: p };
    }
    return { estado: 'no-encontrada' };
  } catch (e) {
    return { estado: 'error', mensaje: String((e as Error).message ?? e) };
  }
}
