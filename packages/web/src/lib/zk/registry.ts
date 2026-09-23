/**
 * Lectura de CommitmentRegistry desde el navegador, sin librerías: un eth_call
 * por JSON-RPC alcanza para una consulta de solo lectura, y así la página no
 * carga ethers ni viem entero.
 *
 * Se consulta un nodo público de Base, no un servidor de OpenPay: si la página
 * preguntara a nuestro propio backend, quien verifica volvería a tener que
 * creernos.
 */

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
