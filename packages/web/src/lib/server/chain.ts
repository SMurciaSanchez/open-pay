/**
 * Publicar raíces en CommitmentRegistry desde el servidor.
 *
 * Solo se importa desde rutas de API: usa PUBLISHER_PRIVATE_KEY, que nunca debe
 * llegar al navegador. Al contrato solo suben valores de 32 bytes.
 */
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import { publicChainMessage } from './errors';

export const CHAIN_ID = 84532; // Base Sepolia

export const RootKind = { PaymentBatch: 0, VendorSet: 1 } as const;
export type RootKindValue = (typeof RootKind)[keyof typeof RootKind];

const ABI = [
  'function publishRoot(uint8 kind, bytes32 subject, bytes32 value) returns (uint256)',
  'function publishedAt(bytes32 value) view returns (uint64)',
  'event RootPublished(uint256 indexed index, bytes32 indexed value, bytes32 indexed subject, uint8 kind, uint64 publishedAt, address publisher)',
];

// Cuánto se mira hacia atrás para recuperar una transacción ya enviada: unas
// 22 horas de bloques de 2 s, en tramos que acepta un nodo público.
const BLOQUES_ATRAS = 40_000;
const TRAMO = 10_000;

export class ChainError extends Error {}

export function registryAddress(): string {
  const a = process.env.NEXT_PUBLIC_COMMITMENT_REGISTRY_ADDRESS ?? '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new ChainError('El servidor no tiene la dirección del registro.');
  return a;
}

function contrato(): Contract {
  const llave = (process.env.PUBLISHER_PRIVATE_KEY ?? '').replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(llave)) throw new ChainError('El servidor no tiene la llave del publicador.');
  const provider = new JsonRpcProvider(
    process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    CHAIN_ID,
    { staticNetwork: true },
  );
  return new Contract(registryAddress(), ABI, new Wallet('0x' + llave, provider));
}

/** Identificador público de un fondo en el contrato. */
export function fundSubject(fundId: string): string {
  return keccak256(toUtf8Bytes(`openpay:fondo:${fundId}`));
}

export async function isPublished(rootHex: string): Promise<boolean> {
  return (await contrato().publishedAt(rootHex)) !== BigInt(0);
}

/** Busca la transacción que publicó una raíz, en los bloques recientes. */
async function buscarTransaccion(c: Contract, rootHex: string): Promise<string | null> {
  const provider = c.runner!.provider!;
  const ultimo = await provider.getBlockNumber();
  const filtro = c.filters.RootPublished(null, rootHex);
  for (let hasta = ultimo; hasta > ultimo - BLOQUES_ATRAS && hasta > 0; hasta -= TRAMO) {
    const eventos = await c.queryFilter(filtro, Math.max(hasta - TRAMO + 1, 0), hasta);
    if (eventos.length > 0) return eventos[0].transactionHash;
  }
  return null;
}

/**
 * Publica la raíz y devuelve el hash de la transacción.
 *
 * Si la raíz ya está en la cadena (un intento anterior la publicó pero no
 * alcanzó a quedar registrado en la base), no la vuelve a enviar —el contrato
 * la rechazaría—: recupera la transacción original.
 */
export async function publishRoot(kind: RootKindValue, subjectHex: string, rootHex: string): Promise<string> {
  const c = contrato();
  try {
    if ((await c.publishedAt(rootHex)) !== BigInt(0)) {
      const tx = await buscarTransaccion(c, rootHex);
      if (!tx) {
        throw new ChainError(
          'La raíz ya está en la cadena pero no se encontró su transacción en los bloques recientes. Hay que registrarla a mano.',
        );
      }
      return tx;
    }
    const tx = await c.publishRoot(kind, subjectHex, rootHex);
    const recibo = await tx.wait(1);
    if (!recibo || recibo.status !== 1) throw new ChainError('La transacción no se confirmó.');
    return recibo.hash;
  } catch (e) {
    if (e instanceof ChainError) throw e;
    // El mensaje completo puede traer la dirección del nodo (y su clave): solo al registro.
    console.error('[chain] publishRoot:', (e as Error).message);
    throw new ChainError(publicChainMessage(e as { shortMessage?: string; message?: string }));
  }
}
